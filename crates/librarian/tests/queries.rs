use chrono::Utc;
use librarian::queries::Queries;
use librarian::models::{GameConfig, LibraryDatabase, Profile, InjectionMethod, SandboxConfig, ModRecord, ModCompatibility, ModMetadata, ModConfig, InstallStatus};
use librarian::*;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use tempfile::tempdir;
use uuid::Uuid;

#[tokio::test]
async fn test_queries_filtering() {
    let mut db = LibraryDatabase::default();
    let game_id = "test";

    // Create default profile that enables Mod A
    let profile_id = Uuid::new_v4();
    let mod_a_id = Uuid::new_v4();
    let mut profile = Profile {
        id: profile_id,
        ..Default::default()
    };
    profile.enabled_mod_ids.push(mod_a_id);

    db.profiles.insert(profile_id, profile);
    db.games.insert(
        game_id.to_string(),
        GameConfig {
            id: game_id.to_string(),
            active_profile_id: profile_id.to_string(),
            name: "Test Game".into(),
            short_name: "test".into(),
            developer: "dev".into(),
            description: "desc".into(),
            install_path: PathBuf::new(),
            exe_path: PathBuf::new(),
            exe_name: "test.exe".into(),
            version: "1.0".into(),
            size: "0".into(),
            regions: 1,
            color: "".into(),
            accent_color: "".into(),
            cover_image: "".into(),
            icon: "".into(),
            logo_initial: "".into(),
            enabled: true,
            added_at: Utc::now(),
            launch_args: vec![],
            fps_config: None,
            injection_method: InjectionMethod::None,
            install_status: InstallStatus::Installed,
            auto_update: false,
            active_runner_id: None,
            prefix_path: None,
            sandbox: SandboxConfig::default(),
            loader_repo: None,
            hash_db_url: None,
            patch_logic: None,
            enable_linux_shield: true,
            supported_injection_methods: vec![],
            modloader_enabled: true,
            remote_info: None,
        },
    );

    // Mod A: CharA, Enabled
    db.mods.insert(
        mod_a_id,
        ModRecord {
            id: mod_a_id,
            owner_game_id: game_id.to_string(),
            compatibility: ModCompatibility {
                game: "".into(),
                character: "CharA".into(),
                hashes: vec![],
                fingerprint: "".into(),
            },
            meta: ModMetadata {
                name: "Mod A".into(),
                version: "1.0".into(),
                author: "dev".into(),
                url: None,
                preview_image: None,
                description: None,
            },
            config: ModConfig {
                tags: vec![],
                keybinds: HashMap::new(),
            },
            path: PathBuf::new(),
            size: "0".into(),
            enabled: true,
            added_at: Utc::now(),
        },
    );

    // Mod B: Unknown, Should be filtered
    let mod_b_id = Uuid::new_v4();
    db.mods.insert(
        mod_b_id,
        ModRecord {
            id: mod_b_id,
            owner_game_id: game_id.to_string(),
            compatibility: ModCompatibility {
                game: "".into(),
                character: "Unknown".into(),
                hashes: vec![],
                fingerprint: "".into(),
            },
            meta: ModMetadata {
                name: "Mod B".into(),
                version: "1.0".into(),
                author: "dev".into(),
                url: None,
                preview_image: None,
                description: None,
            },
            config: ModConfig {
                tags: vec![],
                keybinds: HashMap::new(),
            },
            path: PathBuf::new(),
            size: "0".into(),
            enabled: true,
            added_at: Utc::now(),
        },
    );

    let roster = Queries::get_character_roster(&db, game_id);

    assert!(roster.contains_key("CharA"));
    assert!(!roster.contains_key("Unknown"));

    let group_a = roster.get("CharA").unwrap();
    assert_eq!(group_a.skins.len(), 1);
    assert!(group_a.skins[0].enabled); // Should be enabled via profile
    assert!(group_a.active_cycle.contains(&mod_a_id.to_string()));
}

#[tokio::test]
async fn test_character_identification() {
    let dir = tempdir().unwrap();
    let assets = dir.path().join("assets");
    fs::create_dir(&assets).unwrap();
    fs::write(
        assets.join("hashes.json"),
        r#"{"characters":{"123":"Hero"}}"#,
    )
    .unwrap();
    let librarian = Librarian::new(dir.path().join("games"), assets);

    let archive = dir.path().join("mod.zip");
    let mut zip = zip::ZipWriter::new(File::create(&archive).unwrap());
    zip.start_file("mod.ini", zip::write::SimpleFileOptions::default())
        .unwrap();
    zip.write_all(b"[TextureOverride]\nhash=123").unwrap();
    zip.finish().unwrap();

    let record = import::Importer::import_mod(&librarian, archive, "test".into())
        .await
        .unwrap();
    assert_eq!(record.compatibility.character, "Hero");
}
