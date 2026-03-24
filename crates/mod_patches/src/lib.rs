pub mod buffer_allocator;
pub mod compiler;
pub mod dxbc;
pub mod error;
pub mod ini_merger;
pub mod key_allocator;
pub mod merger;
pub mod namespacer;
pub mod validator;

pub use buffer_allocator::BufferAllocator;
pub use compiler::CycleCompiler;
pub use dxbc::DxbcPatcher;
pub use error::{Result, WeaverError};
pub use merger::Merger;
pub use namespacer::Namespacer;
pub use validator::Validator;

use vfs::DeploymentPlan;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::PathBuf;

pub struct ModProfile {
    pub uuid: String,
    pub mod_root: PathBuf,       // Root directory of the mod
    pub ini_paths: Vec<PathBuf>, // Paths to all INI files to weave
    pub deploy_path: String, // Relative path from Game/Mods to the deployed mod folder (e.g. "YAGO/{UUID}/")
    pub character: String,   // Identified character name
    pub mod_type: String,    // "character", "ui", "global", etc.
    pub nsfw: bool,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ConflictReport {
    pub overwritten_hashes: HashMap<String, Vec<String>>, // Hash -> List of Mod UUIDs that provided it (last one won)
}

/// Helper to determine deployment category folder
fn determine_category(m: &ModProfile) -> String {
    // 1. Configs (00) - Tag based
    if m.tags
        .iter()
        .any(|t| t.to_lowercase() == "config" || t.to_lowercase() == "fix")
    {
        return "00_Configs".to_string();
    }

    // 2. Character (22) - Explicit character match
    if m.character != "Unknown" && m.character != "Global/Other" {
        return "22_Characters".to_string();
    }

    // 3. Global UI (11) - Tag based or explicit Global
    if m.character == "Global/Other"
        || m.tags
            .iter()
            .any(|t| t.to_lowercase() == "ui" || t.to_lowercase() == "global")
    {
        return "11_GlobalUI".to_string();
    }

    // 4. Overrides (33) - Tag based
    if m.tags.iter().any(|t| t.to_lowercase() == "override") {
        return "33_Overrides".to_string();
    }

    // 5. Default Unknown (99)
    "99_Unknown".to_string()
}

/// Generates a deployment plan from a list of mod profiles.
pub fn generate_deployment_plan(
    mut mods: Vec<ModProfile>,
) -> Result<(DeploymentPlan, ConflictReport)> {
    // Update deploy_path based on category for Globals (Characters handled by CycleCompiler)
    for m in &mut mods {
        if m.character == "Unknown" || m.character == "Global/Other" {
            let category = determine_category(m);
            // deploy_path used for symlink target relative to Mods/
            m.deploy_path = format!("{}/{}", category, m.uuid);
        }
    }

    let mut hasher = Sha256::new();
    for m in &mods {
        hasher.update(m.uuid.as_bytes());
        hasher.update(m.deploy_path.as_bytes());
    }
    let state_hash = format!("{:x}", hasher.finalize());

    let mut total_plan = DeploymentPlan {
        symlink_map: Vec::new(),
        generated_files: Vec::new(),
        state_hash,
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

    // 1. Compile Character Groups (Cycle Logic) -> 22_Characters
    for (name, group_mods) in character_groups {
        // CycleCompiler needs to be updated to output to 22_Characters/{Name}
        // or we handle it here? CycleCompiler::compile_character_group handles paths internally.
        // We will update CycleCompiler separately.
        let compiled = CycleCompiler::compile_character_group(&name, group_mods)?;
        total_plan.symlink_map.extend(compiled.plan.symlink_map);
        total_plan
            .generated_files
            .extend(compiled.plan.generated_files);
    }

    // 2. Process Global/Simple Mods (Individual Files)
    // We map them to their target category folders
    for mod_profile in &global_mods {
        // Symlink assets to YAGO/{Category}/{UUID} (already set in deploy_path via determine_category logic logic above? No wait)
        // determine_category returns "99_Unknown".
        // deploy_path should be "YAGO/99_Unknown/{UUID}/".
        // Symlink target is mod_patches::PathBuf::from(deploy_path minus trailing slash)

        // Actually, we updated m.deploy_path above.
        let target_dir = PathBuf::from(&mod_profile.deploy_path); // "YAGO/99_Unknown/{UUID}/"

        total_plan
            .symlink_map
            .push((mod_profile.mod_root.clone(), target_dir));
    }

    // 3. Process Global INIs (Individual generation)
    if !global_mods.is_empty() {
        let (files, report) = process_global_mods(global_mods)?;
        total_plan.generated_files.extend(files);
        Ok((total_plan, report))
    } else {
        Ok((total_plan, ConflictReport::default()))
    }
}

/// Compiles global mods into individual INI files.
pub fn process_global_mods(
    mods: Vec<ModProfile>,
) -> Result<(Vec<(PathBuf, String)>, ConflictReport)> {
    let compiler = ini::IniCompiler::default();
    let mut hash_tracker: HashMap<String, Vec<String>> = HashMap::new();
    let mut aggregated_docs: Vec<(&ModProfile, ini::ast::IniDocument)> = Vec::new();

    for profile in &mods {
        let mut internal_docs = Vec::new();
        let mut all_namespaces = Vec::new();

        // 1. Compile and collect all namespaces first
        for ini_path in &profile.ini_paths {
            if !ini_path.exists() {
                continue;
            }
            let doc = compiler.compile(ini_path)?;
            all_namespaces.extend(Namespacer::collect_namespaces(&doc));
            internal_docs.push((ini_path.clone(), doc));
        }

        if !internal_docs.is_empty() {
            let mut processed_docs = Vec::new();

            for (path, mut doc) in internal_docs {
                // a. Calculate relative path of this INI's directory within the mod
                let mut prefix = format!("{}/", profile.uuid);
                // Safe: we know ini_path is inside mod_root or we wouldn't be here,
                // but for safety we use a match or if let.
                if let Some(parent) = path.parent() {
                    if let Ok(rel_path) = parent.strip_prefix(&profile.mod_root) {
                        if !rel_path.as_os_str().is_empty() {
                            prefix.push_str(&rel_path.to_string_lossy());
                            prefix.push('/');
                        }
                    }
                }

                // b. Namespace Variables & Sections (using global namespace list for mod)
                Namespacer::namespace_variables(&mut doc, &profile.uuid, &all_namespaces)?;

                // c. Rewrite Paths using the specific prefix for this file's location
                Namespacer::rewrite_paths(&mut doc, &prefix)?;

                // d. Strip namespaces
                Namespacer::strip_namespaces(&mut doc);

                processed_docs.push(doc);
            }

            let mut merged_doc = Merger::merge_documents(processed_docs)?;

            // 2. Conflict Detection & Key Sanitization (Pre-Allocation)
            for section in &mut merged_doc.sections {
                for item in &mut section.items {
                    crate::key_allocator::KeyAllocator::sanitize_global_item(item);

                    if section.name.to_lowercase().starts_with("textureoverride") {
                        if let ini::ast::IniItem::Pair { key, value } = item {
                            if key.eq_ignore_ascii_case("hash") {
                                let hash = value.clone();
                                let sources = hash_tracker.entry(hash).or_default();
                                if !sources.contains(&profile.uuid) {
                                    sources.push(profile.uuid.clone());
                                }
                            }
                        }
                    }
                }
            }
            aggregated_docs.push((profile, merged_doc));
        }
    }

    // Collect for Buffer Allocation
    let mut docs_vec: Vec<(String, ini::ast::IniDocument)> = aggregated_docs
        .iter()
        .map(|(p, d)| (p.uuid.clone(), d.clone()))
        .collect();

    BufferAllocator::allocate_slots(&mut docs_vec)?;

    let mut generated_files = Vec::new();

    // Re-associate allocated docs with profiles and generate output
    for (i, (profile, _)) in aggregated_docs.iter().enumerate() {
        let (_, mut allocated_doc) = docs_vec[i].clone();

        // 1. Inject Unified Namespace
        let safe_mod_type = profile.mod_type.replace(['/', ' '], "_");
        let unified_namespace =
            format!("YAGO_{}_{}", safe_mod_type, profile.uuid.replace('-', "_"));
        Namespacer::inject_namespace(&mut allocated_doc, &unified_namespace);

        // 2. Wrap Logic Gates & Priority Bumping
        let condition = if profile.mod_type == "character" {
            format!("$final_id == {}", profile.uuid)
        } else {
            // For UI/Global mods, use activation gate
            format!("$Active_{} == 1", unified_namespace)
        };

        // Ensure the activation variable is declared in [Constants] if not character mod
        if profile.mod_type != "character" {
            let constants_sec = if let Some(sec) = allocated_doc
                .sections
                .iter_mut()
                .find(|s| s.name.eq_ignore_ascii_case("Constants"))
            {
                sec
            } else {
                allocated_doc.sections.insert(
                    0,
                    ini::ast::Section {
                        name: "Constants".to_string(),
                        items: Vec::new(),
                    },
                );
                &mut allocated_doc.sections[0]
            };

            constants_sec.items.push(ini::ast::IniItem::Pair {
                key: format!("global $Active_{}", unified_namespace),
                value: "1".to_string(),
            });
        }

        for section in &mut allocated_doc.sections {
            let is_override = section.name.to_lowercase().starts_with("textureoverride")
                || section.name.to_lowercase().starts_with("shaderoverride");

            if is_override {
                // 4a. Priority Bumping (Addressing "Priority Wars")
                let mut current_hash = None;
                for item in &section.items {
                    if let ini::ast::IniItem::Pair { key, value } = item {
                        if key.eq_ignore_ascii_case("hash") {
                            current_hash = Some(value.clone());
                            break;
                        }
                    }
                }

                if let Some(hash) = current_hash {
                    if let Some(sources) = hash_tracker.get(&hash) {
                        if sources.len() > 1 {
                            let mut priority_found = false;
                            for item in &mut section.items {
                                if let ini::ast::IniItem::Pair { key, value } = item {
                                    if key.eq_ignore_ascii_case("match_priority") {
                                        if let Ok(p) = value.parse::<i32>() {
                                            *value = (p + 1).to_string();
                                        }
                                        priority_found = true;
                                        break;
                                    }
                                }
                            }
                            if !priority_found {
                                section.items.push(ini::ast::IniItem::Pair {
                                    key: "match_priority".to_string(),
                                    value: "1".to_string(),
                                });
                            }
                        }
                    }
                }

                Merger::wrap_in_logic_gate(section, &condition)?;
            }
        }

        // 3. Generate Output
        let output = compiler.serialize(&allocated_doc);

        // Output to: {Category}/{UUID}.ini
        let ini_name = format!("{}.ini", profile.deploy_path);

        generated_files.push((PathBuf::from(ini_name), output));
    }

    let mut report = ConflictReport::default();
    for (hash, sources) in hash_tracker {
        if sources.len() > 1 {
            report.overwritten_hashes.insert(hash, sources);
        }
    }

    Ok((generated_files, report))
}
mod snapshots_test;
