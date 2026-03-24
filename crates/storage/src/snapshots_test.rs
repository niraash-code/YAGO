#[cfg(test)]
mod tests {
    use crate::{ModCompatibility, ModConfig, ModMetadata, ModRecord};
    use chrono::Utc;
    use insta::assert_yaml_snapshot;
    use std::collections::HashMap;
    use std::path::PathBuf;
    use uuid::Uuid;

    #[test]
    fn test_librarian_core_snapshot() {
        let meta = ModMetadata {
            name: "Raiden Shogun - Eternal Excellence".to_string(),
            author: "Y'shtola".to_string(),
            version: "1.0.0".to_string(),
            url: None,
            preview_image: None,
            description: Some("A high-fidelity variant for the Sovereign.".to_string()),
        };

        let compatibility = ModCompatibility {
            game: "genshin".to_string(),
            character: "raiden".to_string(),
            hashes: vec!["7f0f8b".to_string()],
            fingerprint: "abc-123".to_string(),
        };

        let config = ModConfig {
            mod_type: Some("character".to_string()),
            tags: vec!["raiden".to_string(), "nsfw".to_string()],
            keybinds: HashMap::new(),
        };

        let record = ModRecord {
            id: Uuid::nil(), // Stable ID for snapshot
            owner_game_id: "genshin".to_string(),
            path: PathBuf::from("/vault/mods/raiden-123"),
            size: "15MB".to_string(),
            meta,
            compatibility,
            config,
            enabled: true,
            added_at: Utc::now(), // We will need to redact this in actual use, or use a fixed date
        };

        // We snapshot the record, redacting the timestamp for stability
        assert_yaml_snapshot!("mod_record_standard", record, {
            ".added_at" => "[timestamp]"
        });
    }
}
