use crate::models::LibraryDatabase;
use serde::Serialize;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Serialize, Clone, Debug)]
pub struct ModSnippet {
    pub id: String,
    pub name: String,
    pub tags: Vec<String>,
    pub enabled: bool,
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct CharacterGroup {
    pub skins: Vec<ModSnippet>,
    pub active_cycle: Vec<String>, // List of enabled mod IDs for this character
}

pub struct Queries;

impl Queries {
    pub fn get_character_roster(
        db: &LibraryDatabase,
        game_id: &str,
    ) -> HashMap<String, CharacterGroup> {
        let mut roster: HashMap<String, CharacterGroup> = HashMap::new();

        // Get active profile to check enabled status
        let active_profile = db
            .games
            .get(game_id)
            .and_then(|g| Uuid::parse_str(&g.active_profile_id).ok())
            .and_then(|id| db.profiles.get(&id));

        for mod_record in db.mods.values() {
            if mod_record.owner_game_id != game_id {
                continue;
            }

            // FILTER: Only show mods explicitly tagged for a character
            if mod_record.compatibility.character == "Unknown" {
                continue;
            }

            let character_name = mod_record.compatibility.character.clone();

            let is_enabled = active_profile
                .map(|p| p.enabled_mod_ids.contains(&mod_record.id))
                .unwrap_or(false);

            let snippet = ModSnippet {
                id: mod_record.id.to_string(),
                name: mod_record.meta.name.clone(),
                tags: mod_record.config.tags.clone(),
                enabled: is_enabled,
            };

            let group = roster.entry(character_name).or_default();
            group.skins.push(snippet);
        }

        // Finalize active cycle order based on profile load order
        if let Some(profile) = active_profile {
            for group in roster.values_mut() {
                // Collect enabled mods for this character
                let enabled_ids: Vec<Uuid> = group
                    .skins
                    .iter()
                    .filter(|s| s.enabled)
                    .filter_map(|s| Uuid::parse_str(&s.id).ok())
                    .collect();

                // Sort based on profile load order
                let mut sorted_cycle = enabled_ids;
                sorted_cycle.sort_by_key(|id| {
                    profile
                        .load_order
                        .iter()
                        .position(|load_id| load_id == id)
                        .unwrap_or(9999)
                });

                group.active_cycle = sorted_cycle.iter().map(|id| id.to_string()).collect();
            }
        }

        roster
    }
}
