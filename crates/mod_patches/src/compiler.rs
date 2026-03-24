use crate::error::Result;
use crate::key_allocator::KeyAllocator;
use crate::merger::Merger;
use crate::namespacer::Namespacer;
use crate::ModProfile;
use vfs::DeploymentPlan;
use ini::ast::{IniItem, Section};
use std::path::PathBuf;

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
            state_hash: "".to_string(),
        };

        let compiler = ini::IniCompiler::default();
        let mut all_sections = Vec::new();
        let var_name = format!(
            "wardrobe_{}",
            character_name.to_lowercase().replace(' ', "_")
        );

        let universal_slots = KeyAllocator::get_universal_slots();
        let mut next_slot_idx = 0;

        // 1. Unified Character Constants
        let constants = Section {
            name: "Constants".to_string(),
            items: vec![IniItem::Pair {
                key: format!("global persist ${}", var_name),
                value: "0".to_string(), // 0 is Vanilla
            }],
        };
        all_sections.push(constants);

        for (i, mod_profile) in mods.iter().enumerate() {
            let skin_namespace = format!("Skin_{}", i);
            let skin_index = i + 1; // Start from 1, 0 is Vanilla

            // 1. Asset Isolation (Virtual)
            let target_subfolder = PathBuf::from(format!(
                "22_Characters/{}/{}",
                character_name, skin_namespace
            ));
            plan.symlink_map
                .push((mod_profile.mod_root.clone(), target_subfolder.clone()));

            // 2. Pre-Merge: Parse all mod INIs and combine into a single Mod AST
            let mut internal_docs = Vec::new();
            let mut all_namespaces = Vec::new();

            for ini_path in &mod_profile.ini_paths {
                if ini_path.exists() {
                    if let Ok(doc) = compiler.compile(ini_path) {
                        all_namespaces.extend(Namespacer::collect_namespaces(&doc));
                        internal_docs.push((ini_path.clone(), doc));
                    }
                }
            }

            if internal_docs.is_empty() {
                continue;
            }

            let mut processed_docs = Vec::new();
            for (path, mut doc) in internal_docs {
                let mut prefix = format!("{}/", skin_namespace);
                if let Ok(rel_path) = path.parent().unwrap().strip_prefix(&mod_profile.mod_root) {
                    if !rel_path.as_os_str().is_empty() {
                        prefix.push_str(&rel_path.to_string_lossy());
                        prefix.push('/');
                    }
                }

                Namespacer::namespace_variables(&mut doc, &mod_profile.uuid, &all_namespaces)?;
                Namespacer::rewrite_paths(&mut doc, &prefix)?;
                Namespacer::strip_namespaces(&mut doc);

                processed_docs.push(doc);
            }

            let mut unified_doc = Merger::merge_documents(processed_docs)?;

            // 3. Process Sections
            for section in &mut unified_doc.sections {
                let name_lower = section.name.to_lowercase();

                if name_lower.contains("key") && next_slot_idx < universal_slots.len() {
                    let slot = &universal_slots[next_slot_idx];
                    let key_str = KeyAllocator::format_slot(slot);

                    let mut key_found = false;
                    for item in &mut section.items {
                        if let IniItem::Pair { key, value } = item {
                            if key.to_lowercase() == "key" {
                                *value = key_str.clone();
                                key_found = true;
                            }
                        }
                    }
                    if !key_found {
                        section.items.insert(
                            0,
                            IniItem::Pair {
                                key: "key".to_string(),
                                value: key_str,
                            },
                        );
                    }
                    next_slot_idx += 1;

                    // Inject Wardrobe Gate for this Key Section
                    Merger::inject_condition(section, &format!("${} == {}", var_name, skin_index));
                }

                // Wrap Overrides in Wardrobe Gates (Router Protocol)
                let _ = Merger::wrap_in_wardrobe_gate(section, &var_name, skin_index);
                all_sections.push(section.clone());
            }
        }

        // 3. Inject Cycle Logic (Symmetrical Keys: [ and ] )
        let cycle_vals = (0..=mods.len())
            .map(|i| i.to_string())
            .collect::<Vec<_>>()
            .join(", ");

        let cycle = Section {
            name: format!("KeyCycle{}", character_name.replace(' ', "")),
            items: vec![
                IniItem::Pair {
                    key: "key".to_string(),
                    value: "]".to_string(), // Forward
                },
                IniItem::Pair {
                    key: "back".to_string(),
                    value: "[".to_string(), // Backward
                },
                IniItem::Pair {
                    key: "type".to_string(),
                    value: "cycle".to_string(),
                },
                IniItem::Pair {
                    key: "val".to_string(),
                    value: format!("${}", var_name),
                },
                IniItem::Pair {
                    key: "curr_val".to_string(),
                    value: cycle_vals,
                },
            ],
        };
        all_sections.push(cycle);

        // 4. Generate the Final Merged Character INI
        let final_doc = Merger::merge_documents(vec![ini::ast::IniDocument {
            sections: all_sections,
        }])?;

        let output = compiler.serialize(&final_doc);

        plan.generated_files.push((
            PathBuf::from(format!("22_Characters/{}/merged.ini", character_name)),
            output,
        ));

        Ok(CompiledGroup {
            character_name: character_name.to_string(),
            plan,
        })
    }
}
