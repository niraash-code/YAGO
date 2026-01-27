pub mod compiler;
pub mod dxbc;
pub mod error;
pub mod ini_merger;
pub mod merger;
pub mod namespacer;
pub mod validator;

pub use compiler::CycleCompiler;
pub use dxbc::DxbcPatcher;
pub use error::{Result, WeaverError};
pub use merger::Merger;
pub use namespacer::Namespacer;
pub use validator::Validator;

use fs_engine::DeploymentPlan;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

pub struct ModProfile {
    pub uuid: String,
    pub mod_root: PathBuf,   // Root directory of the mod
    pub ini_path: PathBuf,   // Path to the main INI file
    pub deploy_path: String, // Relative path from Game/Mods to the deployed mod folder (e.g. "YAGO/{UUID}/")
    pub character: String,   // Identified character name
    pub nsfw: bool,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ConflictReport {
    pub overwritten_hashes: HashMap<String, Vec<String>>, // Hash -> List of Mod UUIDs that provided it (last one won)
}

/// Generates a deployment plan from a list of mod profiles.
pub fn generate_deployment_plan(mods: Vec<ModProfile>) -> Result<(DeploymentPlan, ConflictReport)> {
    let mut total_plan = DeploymentPlan {
        symlink_map: Vec::new(),
        generated_files: Vec::new(),
    };

    let mut character_groups: HashMap<String, Vec<ModProfile>> = HashMap::new();
    let mut global_mods = Vec::new();

    for m in mods {
        if m.character == "Unknown" || m.character == "Global/Other" {
            global_mods.push(m);
        } else {
            character_groups
                .entry(m.character.clone())
                .or_default()
                .push(m);
        }
    }

    // 1. Compile Character Groups (Cycle Logic)
    for (name, group_mods) in character_groups {
        if group_mods.len() > 1 {
            let compiled = CycleCompiler::compile_character_group(&name, group_mods)?;
            total_plan.symlink_map.extend(compiled.plan.symlink_map);
            total_plan
                .generated_files
                .extend(compiled.plan.generated_files);
        } else {
            // Single mod for character - treat as global for now
            global_mods.extend(group_mods);
        }
    }

    // 2. Process Global/Simple Mods (Legacy path)
    let mut profiles_for_merging = Vec::new();
    for mod_profile in &global_mods {
        let target_dir = PathBuf::from(format!("YAGO/{}", mod_profile.uuid));
        total_plan
            .symlink_map
            .push((mod_profile.mod_root.clone(), target_dir));

        if mod_profile.ini_path.exists() {
            profiles_for_merging.push(mod_profile);
        }
    }

    // 3. Compile Merged INI for Globals
    let (merged_ini, report) = compile_profile(profiles_for_merging)?;
    total_plan
        .generated_files
        .push((PathBuf::from("merged.ini"), merged_ini));

    Ok((total_plan, report))
}

/// Compiles a list of ModProfiles into a single Merged INI string.
/// This performs:
/// 1. Parsing
/// 2. Variable Namespacing (collision avoidance)
/// 3. Logic Gate Wrapping (conditional activation)
/// 4. Path Rewriting (pointing to symlinked assets)
/// 5. Merging & Conflict Detection
pub fn compile_profile(mods: Vec<&ModProfile>) -> Result<(String, ConflictReport)> {
    let compiler = ini_forge::IniCompiler::default();
    let mut docs = Vec::new();
    let mut hash_tracker: HashMap<String, Vec<String>> = HashMap::new(); // Hash -> [ModUUIDs]

    for profile in mods {
        if !profile.ini_path.exists() {
            continue;
        }

        let mut doc = compiler.compile(&profile.ini_path)?;

        // Conflict Detection: Scan for hashes
        for section in &doc.sections {
            if section.name.to_lowercase().starts_with("textureoverride") {
                for item in &section.items {
                    if let ini_forge::ast::IniItem::Pair { key, value } = item {
                        if key.eq_ignore_ascii_case("hash") {
                            let hash = value.clone();
                            hash_tracker
                                .entry(hash)
                                .or_default()
                                .push(profile.uuid.clone());
                        }
                    }
                }
            }
        }

        // 1. Namespace Variables
        Namespacer::namespace_variables(&mut doc, &profile.uuid)?;

        // 2. Rewrite Paths
        Namespacer::rewrite_paths(&mut doc, &profile.deploy_path)?;

        // 3. Wrap Logic Gates (specifically TextureOverrides)
        for section in &mut doc.sections {
            Merger::wrap_in_logic_gate(section, &profile.uuid)?;
        }

        docs.push(doc);
    }

    // Generate Report
    let mut report = ConflictReport::default();
    for (hash, sources) in hash_tracker {
        if sources.len() > 1 {
            report.overwritten_hashes.insert(hash, sources);
        }
    }

    // 4. Merge
    let merged_doc = Merger::merge_documents(docs, &[])?;
    let output = compiler.serialize(&merged_doc);

    Ok((output, report))
}
