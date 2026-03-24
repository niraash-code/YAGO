use crate::error::Result;
use ini::ast::{IniDocument, IniItem};
use regex::Regex;
use std::collections::HashMap;
use std::path::Path;

pub struct Namespacer;

impl Namespacer {
    /// Renames all local variables and sections in an INI document to be unique.
    pub fn namespace_variables(
        doc: &mut IniDocument,
        uuid: &str,
        stripped_namespaces: &[String],
    ) -> Result<()> {
        let suffix = uuid.replace('-', "_");

        // 1. Collect all names to namespace
        let mut section_rename_map = HashMap::new();
        let reserved_sections = [
            "constants",
            "present",
            "loader",
            "include",
            "hunting",
            "system",
            "device",
            "stereo",
            "rendering",
            "profile",
            "global",
        ];

        for section in &doc.sections {
            let name_lower = section.name.to_lowercase();

            // Rename if not reserved
            if !reserved_sections.contains(&name_lower.as_str()) {
                section_rename_map
                    .insert(section.name.clone(), format!("{}_{}", section.name, suffix));
            }
        }

        let mut discovered_vars = Vec::new();

        for section in &mut doc.sections {
            let sec_name_lower = section.name.to_lowercase();
            // Rename the section itself if it's in our map
            if let Some(new_name) = section_rename_map.get(&section.name) {
                section.name = new_name.clone();
            }

            for item in &mut section.items {
                match item {
                    IniItem::Pair { key, value } => {
                        // a. Rename variables in keys (including global declarations)
                        if key.contains('$') {
                            *key = Self::apply_namespacing(key, &suffix, stripped_namespaces);

                            // Collect variables that are being assigned value outside of Constants
                            if !sec_name_lower.contains("constants")
                                && !sec_name_lower.contains("global")
                                && key.trim().starts_with('$')
                            {
                                discovered_vars.push(key.trim().to_string());
                            }

                            // If this is a global declaration and value is empty, enforce = 0
                            if key.to_lowercase().starts_with("global") && value.is_empty() {
                                *value = "0".to_string();
                            }
                        }

                        // b. Rename variable usage or section reference in values
                        if value.contains('$') {
                            *value = Self::apply_namespacing(value, &suffix, stripped_namespaces);
                        } else if let Some(new_val) = section_rename_map.get(value) {
                            *value = new_val.clone();
                        }
                    }
                    IniItem::Command { command: _, args } => {
                        for arg in args {
                            if arg.contains('$') {
                                *arg = Self::apply_namespacing(arg, &suffix, stripped_namespaces);
                            } else if let Some(new_arg) = section_rename_map.get(arg) {
                                *arg = new_arg.clone();
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        // 2. Ensure all discovered variables are declared in Constants
        if !discovered_vars.is_empty() {
            let constants_sec = if let Some(sec) = doc
                .sections
                .iter_mut()
                .find(|s| s.name.eq_ignore_ascii_case("Constants"))
            {
                sec
            } else {
                doc.sections.insert(
                    0,
                    ini::ast::Section {
                        name: "Constants".to_string(),
                        items: Vec::new(),
                    },
                );
                &mut doc.sections[0]
            };

            for var in discovered_vars {
                let global_key = format!("global persist {}", var);
                if !constants_sec.items.iter().any(|item| {
                    if let IniItem::Pair { key, .. } = item {
                        key.to_lowercase().contains(&var.to_lowercase())
                    } else {
                        false
                    }
                }) {
                    constants_sec.items.push(IniItem::Pair {
                        key: global_key,
                        value: "0".to_string(),
                    });
                }
            }
        }

        Ok(())
    }

    /// Helper to collect all namespaces defined in a document.
    pub fn collect_namespaces(doc: &IniDocument) -> Vec<String> {
        let mut stripped_namespaces = Vec::new();
        for section in &doc.sections {
            for item in &section.items {
                if let IniItem::Pair { key, value } = item {
                    if key.to_lowercase() == "namespace" {
                        stripped_namespaces.push(value.clone());
                    }
                }
            }
        }
        stripped_namespaces
    }

    /// Strips all 'namespace' declarations from the document.
    pub fn strip_namespaces(doc: &mut IniDocument) {
        for section in &mut doc.sections {
            section.items.retain(|item| {
                if let IniItem::Pair { key, .. } = item {
                    key.to_lowercase() != "namespace"
                } else {
                    true
                }
            });
        }
    }

    /// Injects a single unified 'namespace' into the GLOBAL section.
    pub fn inject_namespace(doc: &mut IniDocument, namespace: &str) {
        // Find or create GLOBAL section
        let global_sec = if let Some(sec) = doc.sections.iter_mut().find(|s| s.name == "GLOBAL") {
            sec
        } else {
            doc.sections.insert(
                0,
                ini::ast::Section {
                    name: "GLOBAL".to_string(),
                    items: Vec::new(),
                },
            );
            &mut doc.sections[0]
        };

        // Insert at the beginning
        global_sec.items.insert(
            0,
            IniItem::Pair {
                key: "namespace".to_string(),
                value: namespace.to_string(),
            },
        );
    }

    fn is_protected(var: &str) -> bool {
        let v = var.to_lowercase();
        // 1. External/Cross-mod namespaces are protected
        if v.starts_with("$\\") {
            return true;
        }
        // 2. Common GIMI shared indicators are protected
        matches!(
            v.as_str(),
            "$paimon" | "$namecard" | "$menu" | "$profile" | "$final_id"
        )
    }

    fn apply_namespacing(input: &str, suffix: &str, stripped_namespaces: &[String]) -> String {
        let re = Regex::new(r"(\$[a-zA-Z0-9_.\\]+)").unwrap();
        re.replace_all(input, |caps: &regex::Captures| {
            let var = &caps[1];

            // Handle absolute namespace references: $\Namespace\Var
            if var.starts_with("$\\") {
                for ns in stripped_namespaces {
                    let prefix = format!("$\\{}\\", ns);
                    if var.to_lowercase().starts_with(&prefix.to_lowercase()) {
                        // Found internal reference to a stripped namespace!
                        // Convert to local namespaced variable
                        let var_name = &var[prefix.len()..];
                        return format!("${}_{}", var_name, suffix);
                    }
                }
                return var.to_string(); // Other external namespaces are protected
            }

            if Self::is_protected(var) || var.ends_with(suffix) {
                var.to_string()
            } else {
                format!("{}_{}", var, suffix)
            }
        })
        .to_string()
    }

    /// Rewrites file paths in the INI to point to the new deployed location.
    pub fn rewrite_paths(doc: &mut IniDocument, prefix: &str) -> Result<()> {
        let path_keys = ["filename", "model", "vs", "ps", "vb0", "vb1", "vb2", "ib"];
        let asset_extensions = [
            ".dds", ".buf", ".ib", ".txt", ".ini", ".hlsl", ".tga", ".png", ".jpg", ".jpeg",
            ".webp", ".h", ".cu", ".cl",
        ];

        // Ensure prefix uses single backslashes and ends with one
        let prefix = prefix.replace('/', "\\").trim_end_matches('\\').to_string() + "\\";

        for section in &mut doc.sections {
            for item in &mut section.items {
                if let IniItem::Pair { key, value } = item {
                    let k = key.to_lowercase();
                    let v_lower = value.to_lowercase();

                    let is_path_key = path_keys.contains(&k.as_str());
                    let has_asset_ext = asset_extensions.iter().any(|ext| v_lower.ends_with(ext));

                    if (is_path_key || has_asset_ext) && !value.starts_with('$') {
                        // 1. Strip pre-existing quotes
                        let mut clean_value =
                            value.trim_matches('"').trim_matches('\'').to_string();

                        // 2. Strip pre-existing relative indicators
                        if clean_value.starts_with("./") || clean_value.starts_with(".\\") {
                            clean_value = clean_value[2..].to_string();
                        }

                        // 3. Normalize slashes to single backslash
                        let mut normalized_val = clean_value.replace('/', "\\");

                        // 3.5 Prioritize transcoded DDS version if original was non-DDS image
                        let val_lower = normalized_val.to_lowercase();
                        if matches!(
                            Path::new(&val_lower)
                                .extension()
                                .and_then(|s| s.to_str())
                                .unwrap_or(""),
                            "png" | "jpg" | "jpeg" | "tga" | "webp"
                        ) {
                            normalized_val = Path::new(&normalized_val)
                                .with_extension("dds")
                                .to_string_lossy()
                                .to_string();
                        }

                        // 4. Prepend prefix if not already present
                        if !normalized_val
                            .to_lowercase()
                            .starts_with(&prefix.to_lowercase())
                        {
                            *value = format!("{}{}", prefix, normalized_val);
                        } else {
                            *value = normalized_val;
                        }
                    }
                }
            }
        }
        Ok(())
    }
}
