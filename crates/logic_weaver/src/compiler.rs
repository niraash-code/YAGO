use crate::error::Result;
use crate::ModProfile;
use fs_engine::DeploymentPlan;
use regex::Regex;
use std::path::PathBuf;
use walkdir::WalkDir;

pub struct CompiledGroup {
    pub character_name: String,
    pub plan: DeploymentPlan,
}

pub struct CycleCompiler;

impl CycleCompiler {
    /// Compiles a group of mods for a single character into an isolated virtual structure.
    pub fn compile_character_group(
        character_name: &str,
        mods: Vec<ModProfile>,
    ) -> Result<CompiledGroup> {
        let mut plan = DeploymentPlan {
            symlink_map: Vec::new(),
            generated_files: Vec::new(),
        };

        let filename_regex = Regex::new(r"(?i)filename\s*=\s*(.*)").unwrap();

        for (i, mod_profile) in mods.into_iter().enumerate() {
            let skin_namespace = format!("Skin_{}", i);

            // 1. Asset Isolation (Virtual)
            // Map the entire mod root to a namespaced subfolder
            // Target: YAGO/Characters/{name}/Skin_{i}/
            let target_subfolder = PathBuf::from(format!(
                "YAGO/Characters/{}/{}",
                character_name, skin_namespace
            ));
            plan.symlink_map
                .push((mod_profile.mod_root.clone(), target_subfolder.clone()));

            // 2. INI Patching (Asset Redirection)
            // We need to find all .ini files in the mod and rewrite 'filename = ...'
            let walker = WalkDir::new(&mod_profile.mod_root).max_depth(3);
            for entry in walker
                .into_iter()
                .filter_map(|e: std::result::Result<walkdir::DirEntry, walkdir::Error>| e.ok())
            {
                let path = entry.path();
                if path.extension().and_then(|s: &std::ffi::OsStr| s.to_str()) == Some("ini") {
                    if let Ok(content) = std::fs::read_to_string(path) {
                        // Replace 'filename = asset.dds' with 'filename = Skin_{i}/asset.dds'
                        let patched_content =
                            filename_regex.replace_all(&content, |caps: &regex::Captures| {
                                let asset_path =
                                    caps.get(1).map(|m| m.as_str().trim()).unwrap_or("");
                                // Avoid double namespacing if already patched (unlikely in staging)
                                if asset_path.starts_with(&skin_namespace) {
                                    format!("filename = {}", asset_path)
                                } else {
                                    format!("filename = {}/{}", skin_namespace, asset_path)
                                }
                            });

                        // Save the patched INI relative to the character root
                        // Target: YAGO/Characters/{name}/Skin_{i}.ini
                        let ini_name = path
                            .file_name()
                            .and_then(|s: &std::ffi::OsStr| s.to_str())
                            .unwrap_or("mod.ini");
                        let generated_path = PathBuf::from(format!(
                            "Characters/{}/{}_{}",
                            character_name, skin_namespace, ini_name
                        ));
                        plan.generated_files
                            .push((generated_path, patched_content.to_string()));
                    }
                }
            }
        }

        Ok(CompiledGroup {
            character_name: character_name.to_string(),
            plan,
        })
    }
}
