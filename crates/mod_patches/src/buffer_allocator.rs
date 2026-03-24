use crate::error::Result;
use ini::ast::{IniDocument, IniItem};
use std::collections::HashMap;

pub struct BufferAllocator;

impl BufferAllocator {
    /// Detects and resolves vertex buffer slot collisions.
    /// If multiple mods target the same hash and want the same slot (e.g. vb0),
    /// it shifts the second mod to the next available slot.
    pub fn allocate_slots(
        docs: &mut [(String, IniDocument)], // (uuid, doc)
    ) -> Result<HashMap<String, Vec<(String, u32)>>> {
        // Hash -> [(ModUUID, AllocatedSlot)]
        let mut slot_map: HashMap<String, Vec<(String, u32)>> = HashMap::new();

        for (uuid, doc) in docs {
            for section in &mut doc.sections {
                if !section.name.to_lowercase().starts_with("textureoverride") {
                    continue;
                }

                let mut current_hash = None;
                for item in &section.items {
                    if let IniItem::Pair { key, value } = item {
                        if key.eq_ignore_ascii_case("hash") {
                            current_hash = Some(value.clone());
                            break;
                        }
                    }
                }

                if let Some(hash) = current_hash {
                    let overrides = slot_map.entry(hash.clone()).or_default();

                    // Find which slots this mod is ALREADY using in this section
                    let mut used_slots = Vec::new();
                    for item in &section.items {
                        if let IniItem::Pair { key, .. } = item {
                            let k = key.to_lowercase();
                            if let Some(stripped) = k.strip_prefix("vb") {
                                if let Ok(slot) = stripped.parse::<u32>() {
                                    used_slots.push(slot);
                                }
                            }
                        }
                    }

                    // For each slot it wants to use, check if it's already taken by a PREVIOUS mod in this merge
                    // In GIMI, if two overrides target the same hash, they merge.
                    // If both provide 'vb0', one will overwrite the other.
                    // We want to shift the second one's vb0 to an empty slot.

                    for item in &mut section.items {
                        if let IniItem::Pair { key, .. } = item {
                            let k = key.to_lowercase();
                            if let Some(stripped) = k.strip_prefix("vb") {
                                if let Ok(old_slot) = stripped.parse::<u32>() {
                                    // Check if ANY mod has already used this slot for THIS hash
                                    let collision = overrides.iter().any(|(_, s)| *s == old_slot);

                                    if collision {
                                        // Find next free slot for this hash
                                        let mut new_slot = old_slot + 1;
                                        while overrides.iter().any(|(_, s)| *s == new_slot) {
                                            new_slot += 1;
                                        }

                                        // Rewrite the key
                                        *key = format!("vb{}", new_slot);
                                        overrides.push((uuid.clone(), new_slot));
                                    } else {
                                        overrides.push((uuid.clone(), old_slot));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(slot_map)
    }
}
