use crate::models::Profile;

pub fn export_profile_for_sharing(profile: &Profile) -> String {
    format!(
        "YAGO_PROFILE_V1|{}|{}|MODS:{}",
        profile.name.to_uppercase(),
        profile.id,
        profile.enabled_mod_ids.len()
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use insta::assert_yaml_snapshot;
    use uuid::Uuid;

    #[test]
    fn test_profile_export_snapshot() {
        let profile = Profile {
            id: Uuid::nil(),
            name: "Raiden's Eternal Storm".to_string(),
            description: "A high-perf mod loadout for the Sovereign.".to_string(),
            enabled_mod_ids: vec![Uuid::nil()],
            load_order: vec![Uuid::nil()],
            added_at: Utc::now(),
            ..Default::default()
        };

        let exported = export_profile_for_sharing(&profile);
        // We snapshot the raw string as YAML for better readability
        assert_yaml_snapshot!("profile_export_output", exported);
    }
}
