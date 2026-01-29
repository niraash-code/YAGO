use chrono::Utc;
use fs_engine::Safety;
use ini_forge::{IniCompiler, IniDocument, IniItem, Section};
use librarian::{Librarian, ModCompatibility, ModConfig, ModMetadata, ModRecord};
use logic_weaver::{Merger, Namespacer, Validator};
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use tempfile::tempdir;
use uuid::Uuid;

#[tokio::test]
async fn test_full_mod_import_flow() {
    let root = tempdir().unwrap();
    let staging_dir = root.path().join("staging");
    let games_root = root.path().join("games");

    let game_id = "GenshinImpact.exe".to_string();
    let mod_id = Uuid::new_v4();

    std::fs::create_dir(&staging_dir).unwrap();
    std::fs::create_dir(&games_root).unwrap();

    let mod_ini = staging_dir.join("mod.ini");
    let mut f = File::create(&mod_ini).unwrap();
    writeln!(
        f,
        "[Constants]\nglobal $var = 0\n[TextureOverride]\nhash = 123"
    )
    .unwrap();

    File::create(staging_dir.join("texture.dds")).unwrap();

    let assets_root = root.path().join("assets");
    std::fs::create_dir(&assets_root).unwrap();
    let librarian = Librarian::new(games_root.clone(), assets_root);
    let game_mods_dir = librarian.get_mods_dir(&game_id);
    std::fs::create_dir_all(&game_mods_dir).unwrap();

    let target_path = game_mods_dir.join(mod_id.to_string());

    Safety::copy_recursive_sync(&staging_dir, &target_path).unwrap();
    Safety::sanitize_filenames(&target_path).unwrap();

    let compiler = IniCompiler::default();
    let mut doc = compiler.compile(&target_path.join("mod.ini")).unwrap();
    Validator::validate_logic(&doc).expect("Mod logic should be valid");

    Namespacer::namespace_variables(&mut doc, &mod_id.to_string()).unwrap();

    let mut db = librarian.load_game_db(&game_id).await.unwrap();

    let record = ModRecord {
        id: mod_id,
        owner_game_id: game_id.clone(),
        path: target_path.clone(),
        size: "1.2 MB".into(),
        meta: ModMetadata {
            name: "Test Mod".to_string(),
            version: "1.0".to_string(),
            author: "Author".to_string(),
            url: None,
            preview_image: None,
            description: Some("Test".to_string()),
        },
        compatibility: ModCompatibility {
            game: "Genshin".to_string(),
            character: "Unknown".to_string(),
            hashes: vec![],
            fingerprint: "123".to_string(),
        },
        config: ModConfig {
            tags: vec![],
            keybinds: HashMap::new(),
        },
        enabled: true,
        added_at: Utc::now(),
    };

    let p_id = Uuid::new_v4();
    db.games.insert(
        game_id.clone(),
        librarian::GameConfig {
            id: game_id.clone(),
            name: "Test Game".to_string(),
            short_name: "Test".to_string(),
            developer: "HoYoverse".to_string(),
            description: "Test description".to_string(),
            install_path: "/tmp".into(),
            exe_path: "/tmp/GenshinImpact.exe".into(),
            exe_name: "GenshinImpact.exe".to_string(),
            version: "1.0".to_string(),
            size: "1GB".to_string(),
            regions: 4,
            color: "teal-400".to_string(),
            accent_color: "#2dd4bf".to_string(),
            cover_image: "https://...".to_string(),
            icon: "https://...".to_string(),
            logo_initial: "G".to_string(),
            enabled: true,
            added_at: Utc::now(),
            launch_args: vec![],
            active_profile_id: p_id.to_string(),
            fps_config: None,
            injection_method: librarian::InjectionMethod::None,
            install_status: librarian::InstallStatus::Installed,
            auto_update: false,
            active_runner_id: None,
            prefix_path: None,
            sandbox: librarian::SandboxConfig::default(),
            loader_repo: None,
            hash_db_url: None,
            patch_logic: None,
            enable_linux_shield: true,
            supported_injection_methods: vec![],
            modloader_enabled: true,
            remote_info: None,
        },
    );

    db.profiles.insert(
        p_id,
        librarian::Profile {
            id: p_id,
            name: "Default".to_string(),
            launch_args: vec![],
            save_data_path: None,
            ..Default::default()
        },
    );

    db.mods.insert(mod_id, record);
    librarian.save_game_db(&game_id, &db).await.unwrap();

    assert!(target_path.exists());
    assert!(target_path.join("mod.ini").exists());

    let loaded_db = librarian.load_game_db(&game_id).await.unwrap();
    assert!(loaded_db.mods.contains_key(&mod_id));
}

#[test]
fn test_logic_merging() {
    let doc1 = IniDocument {
        sections: vec![Section {
            name: "TextureOverrideA".to_string(),
            items: vec![IniItem::Pair {
                key: "hash".to_string(),
                value: "A".to_string(),
            }],
        }],
    };
    let doc2 = IniDocument {
        sections: vec![Section {
            name: "TextureOverrideB".to_string(),
            items: vec![IniItem::Pair {
                key: "hash".to_string(),
                value: "B".to_string(),
            }],
        }],
    };

    let mut d1 = doc1.clone();
    let mut d2 = doc2.clone();

    Merger::wrap_in_logic_gate(&mut d1.sections[0], "UUID_A").unwrap();
    Merger::wrap_in_logic_gate(&mut d2.sections[0], "UUID_B").unwrap();

    let merged = Merger::merge_documents(vec![d1, d2], &[]).unwrap();

    assert_eq!(merged.sections.len(), 2);

    let s1 = &merged.sections[0];
    if let IniItem::Command { command, args } = &s1.items[0] {
        assert_eq!(command, "if");
        assert!(args.join(" ").contains("$final_id == UUID_A"));
    } else {
        panic!("Missing logic gate A");
    }

    let s2 = &merged.sections[1];
    if let IniItem::Command { command, args } = &s2.items[0] {
        assert_eq!(command, "if");
        assert!(args.join(" ").contains("$final_id == UUID_B"));
    } else {
        panic!("Missing logic gate B");
    }
}
