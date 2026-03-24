use crate::error::Result;
use ini::ast::{IniDocument, IniItem, Section};
use std::collections::{HashMap, HashSet};

pub struct Merger;

impl Merger {
    /// Wraps a specific section in a logic gate.
    /// Used for [TextureOverride] blocks to ensure they only activate under specific conditions.
    pub fn wrap_in_logic_gate(section: &mut Section, condition_arg: &str) -> Result<()> {
        let name_lower = section.name.to_lowercase();
        if !name_lower.starts_with("textureoverride") && !name_lower.starts_with("shaderoverride") {
            return Ok(()); // Only wrap overrides
        }

        let endif = "endif".to_string();

        let mut new_items = Vec::new();
        new_items.push(IniItem::Command {
            command: "if".to_string(),
            args: vec![condition_arg.to_string()],
        });
        new_items.extend(section.items.clone());
        new_items.push(IniItem::Command {
            command: endif,
            args: vec![],
        });

        section.items = new_items;
        Ok(())
    }

    /// Injects a condition into a section (e.g. for Keybinds).
    /// If a condition exists, it appends " && new_condition".
    /// If not, it creates "condition = new_condition".
    pub fn inject_condition(section: &mut Section, new_condition: &str) {
        let mut found = false;
        for item in &mut section.items {
            if let IniItem::Pair { key, value } = item {
                if key.eq_ignore_ascii_case("condition") {
                    // Append
                    *value = format!("{} && {}", value, new_condition);
                    found = true;
                    break;
                }
            }
        }

        if !found {
            // Insert at the top (usually better for readability/parsing)
            section.items.insert(
                0,
                IniItem::Pair {
                    key: "condition".to_string(),
                    value: new_condition.to_string(),
                },
            );
        }
    }

    /// Wraps a section in a Wardrobe logic gate.
    pub fn wrap_in_wardrobe_gate(
        section: &mut Section,
        var_name: &str,
        index: usize,
    ) -> Result<()> {
        let name_lower = section.name.to_lowercase();
        if !name_lower.starts_with("textureoverride") && !name_lower.starts_with("shaderoverride") {
            return Ok(());
        }

        let condition_arg = format!("${} == {}", var_name, index);
        let endif = "endif".to_string();

        let mut new_items = Vec::new();
        new_items.push(IniItem::Command {
            command: "if".to_string(),
            args: vec![condition_arg],
        });
        new_items.extend(section.items.clone());
        new_items.push(IniItem::Command {
            command: endif,
            args: vec![],
        });

        section.items = new_items;
        Ok(())
    }

    /// Merges multiple INI documents into one.
    /// Consolidates sections with the same name and removes duplicate non-command keys.
    pub fn merge_documents(docs: Vec<IniDocument>) -> Result<IniDocument> {
        let mut section_map: HashMap<String, Vec<IniItem>> = HashMap::new();
        let mut section_order: Vec<String> = Vec::new();

        for doc in docs {
            for section in doc.sections {
                if !section_map.contains_key(&section.name) {
                    section_order.push(section.name.clone());
                }
                section_map
                    .entry(section.name)
                    .or_default()
                    .extend(section.items);
            }
        }

        let mut combined_sections = Vec::new();
        for name in section_order {
            if let Some(items) = section_map.remove(&name) {
                let name_lower = name.to_lowercase();
                let is_dedupe_section = name_lower == "constants" || name_lower == "global";

                // Aggressive Deduplication within sections
                let mut deduped_items = Vec::new();
                let mut seen_keys = HashSet::new();

                for item in items {
                    match &item {
                        IniItem::Pair { key, .. } => {
                            let key_lower = key.to_lowercase();

                            // Commands/Special keys that ARE allowed to repeat:
                            // run, draw, handling, this, checktextureoverride, ps-t*, vs-t*, o*
                            let can_repeat = key_lower == "run"
                                || key_lower == "draw"
                                || key_lower == "ps-t"
                                || key_lower == "vs-t"
                                || key_lower.starts_with("ps-t")
                                || key_lower.starts_with("vs-t")
                                || key_lower.starts_with("o");

                            if !is_dedupe_section || can_repeat {
                                deduped_items.push(item);
                            } else {
                                // For globals, we deduplicate by the variable name part
                                let dedupe_key = if key_lower.starts_with("global persist ") {
                                    key_lower
                                        .strip_prefix("global persist ")
                                        .unwrap_or(&key_lower)
                                        .trim()
                                        .to_string()
                                } else if key_lower.starts_with("global ") {
                                    key_lower
                                        .strip_prefix("global ")
                                        .unwrap_or(&key_lower)
                                        .trim()
                                        .to_string()
                                } else {
                                    key_lower.trim().to_string()
                                };

                                if !seen_keys.contains(&dedupe_key) {
                                    seen_keys.insert(dedupe_key);
                                    deduped_items.push(item);
                                }
                            }
                        }
                        _ => deduped_items.push(item),
                    }
                }
                combined_sections.push(Section {
                    name,
                    items: deduped_items,
                });
            }
        }

        Ok(IniDocument {
            sections: combined_sections,
        })
    }
}
