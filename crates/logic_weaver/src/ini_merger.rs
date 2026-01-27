use crate::error::{Result, WeaverError};
use regex::Regex;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

pub struct SkinMetadata {
    pub index: usize,
    pub uuid: String,
}

pub struct IniMerger;

impl IniMerger {
    /// Merges multiple skin INIs into a single master INI with cycle logic.
    /// This function operates on the deployed files in character_dir.
    pub fn merge_skins(character_dir: PathBuf, skins: Vec<SkinMetadata>) -> Result<()> {
        let mut master_overrides: HashMap<String, Vec<String>> = HashMap::new(); // Hash -> [LogicBody]
        let mut master_resources: Vec<String> = Vec::new();

        let filename_regex = Regex::new(r"(?i)^filename\s*=\s*(.*)").unwrap();
        let ref_regex = Regex::new(r"(?i)((?:ps|vs)-t[0-9]+\s*=\s*)([a-zA-Z0-9_]+)").unwrap();
        let hash_regex = Regex::new(r"(?i)hash\s*=\s*([a-fA-F0-9]+)").unwrap();

        for skin in &skins {
            let skin_dir = character_dir.join(format!("Skin_{}", skin.index));
            if !skin_dir.exists() {
                continue;
            }

            let walker = walkdir::WalkDir::new(&skin_dir).max_depth(1);
            for entry in walker.into_iter().filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("ini") {
                    let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                    if filename.starts_with("DISABLED_") {
                        continue;
                    }

                    let content = fs::read_to_string(path).map_err(WeaverError::Io)?;

                    // 1. Disable original INI
                    let new_path = path.with_file_name(format!("DISABLED_{}", filename));
                    fs::rename(path, new_path).map_err(WeaverError::Io)?;

                    // 2. Process Content
                    Self::process_ini_content(
                        &content,
                        skin.index,
                        &filename_regex,
                        &ref_regex,
                        &hash_regex,
                        &mut master_overrides,
                        &mut master_resources,
                    );
                }
            }
        }

        // 3. Generate merged.ini
        let merged_content =
            Self::generate_master_ini(skins.len(), master_overrides, master_resources);
        fs::write(character_dir.join("merged.ini"), merged_content).map_err(WeaverError::Io)?;

        Ok(())
    }

    fn process_ini_content(
        content: &str,
        index: usize,
        filename_regex: &Regex,
        ref_regex: &Regex,
        hash_regex: &Regex,
        master_overrides: &mut HashMap<String, Vec<String>>,
        master_resources: &mut Vec<String>,
    ) {
        let mut current_hash: Option<String> = None;
        let mut current_body = Vec::new();
        let mut is_override = false;

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with(';') {
                continue;
            }

            if trimmed.starts_with('[') && trimmed.ends_with(']') {
                // Flush previous override if exists
                if is_override {
                    if let Some(hash) = current_hash.take() {
                        master_overrides
                            .entry(hash)
                            .or_default()
                            .push(current_body.join("\n"));
                    }
                }
                current_body.clear();

                let section_name = trimmed[1..trimmed.len() - 1].to_string();
                let lower_section = section_name.to_lowercase();

                is_override = lower_section.starts_with("textureoverride");

                if !is_override {
                    // Resource section - Namespace it
                    let namespaced_name = format!("Skin{}_{}", index, section_name);
                    master_resources.push(format!("[{}]", namespaced_name));
                }
            } else {
                // Process Line
                let mut processed_line = line.to_string();

                if is_override {
                    if let Some(caps) = hash_regex.captures(trimmed) {
                        current_hash = Some(caps.get(1).unwrap().as_str().to_string());
                    } else {
                        // Rewrite references in override body
                        processed_line = ref_regex
                            .replace_all(&processed_line, |c: &regex::Captures| {
                                format!("{}{}{}_{}", &c[1], "Skin", index, &c[2])
                            })
                            .to_string();
                        current_body.push(processed_line);
                    }
                } else {
                    // Rewrite filename in resource
                    processed_line = filename_regex
                        .replace_all(&processed_line, |c: &regex::Captures| {
                            format!("filename = Skin_{}/{}", index, &c[1])
                        })
                        .to_string();
                    master_resources.push(processed_line);
                }
            }
        }

        // Flush last
        if is_override {
            if let Some(hash) = current_hash {
                master_overrides
                    .entry(hash)
                    .or_default()
                    .push(current_body.join("\n"));
            }
        }
    }

    fn generate_master_ini(
        count: usize,
        overrides: HashMap<String, Vec<String>>,
        resources: Vec<String>,
    ) -> String {
        let mut out = String::new();

        // Header
        out.push_str("[Constants]\n");
        out.push_str("global $active_skin = 0\n\n");

        out.push_str("[KeyCycle]\n");
        out.push_str("key = F6\n");
        out.push_str("type = cycle\n");
        let indices: Vec<String> = (0..count).map(|i| i.to_string()).collect();
        out.push_str(&format!("$active_skin = {}\n\n", indices.join(",")));

        // Overrides
        for (hash, bodies) in overrides {
            out.push_str(&format!("[TextureOverride_Master_{}]\n", hash));
            out.push_str(&format!("hash = {}\n", hash));

            for (i, body) in bodies.iter().enumerate() {
                if i == 0 {
                    out.push_str(&format!("if $active_skin == {}\n", i));
                } else {
                    out.push_str(&format!("else if $active_skin == {}\n", i));
                }
                out.push_str(body);
                out.push('\n');
            }
            out.push_str("endif\n\n");
        }

        // Resources
        for line in resources {
            out.push_str(&line);
            out.push('\n');
        }

        out
    }
}
