use librarian::storage::LibrarianConfig;
use librarian::*;
use std::collections::HashMap;
use std::fs;
use tempfile::tempdir;

#[tokio::test]
async fn test_corrupted_json_handling() {
    let dir = tempdir().unwrap();
    let config = LibrarianConfig {
        base_path: dir.path().to_path_buf(),
        mods_path: None,
        runners_path: None,
        prefixes_path: None,
        cache_path: None,
        games_install_path: None,
    };
    let librarian = Librarian::new(config);
    librarian.ensure_core_dirs().unwrap();

    let game_id = "test.exe";
    let game_dir = librarian.games_root.join(game_id);
    fs::create_dir(&game_dir).unwrap();

    // Write invalid JSON
    fs::write(game_dir.join("game.json"), "invalid { json").unwrap();

    // Load should fail with an IO/Parse error, but we want to see it caught
    let result = librarian.load_game_db(game_id).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_template_match_by_multiple_exes() {
    let dir = tempdir().unwrap();
    let config = LibrarianConfig {
        base_path: dir.path().to_path_buf(),
        mods_path: None,
        runners_path: None,
        prefixes_path: None,
        cache_path: None,
        games_install_path: None,
    };
    let librarian = Librarian::new(config);
    librarian.ensure_core_dirs().unwrap();

    let mut templates = HashMap::new();
    let t = GameTemplate {
        id: "genshin".to_string(),
        name: "Genshin Impact".to_string(),
        executables: vec!["GenshinImpact.exe".to_string(), "YuanShen.exe".to_string()],
        ..Default::default()
    };

    // Register by both exes
    templates.insert("genshinimpact.exe".to_string(), t.clone());
    templates.insert("yuanshen.exe".to_string(), t.clone());

    // Test first exe
    let path_1 = dir.path().join("GenshinImpact.exe");
    fs::write(&path_1, [0x4D, 0x5A, 0x00, 0x00]).unwrap();
    let id_1 = Discovery::add_game_by_path(&librarian, path_1, &templates)
        .await
        .unwrap();
    assert_eq!(id_1, "genshinimpact.exe");

    // Test second exe
    let path_2 = dir.path().join("YuanShen.exe");
    fs::write(&path_2, [0x4D, 0x5A, 0x00, 0x00]).unwrap();
    let id_2 = Discovery::add_game_by_path(&librarian, path_2, &templates)
        .await
        .unwrap();
    assert_eq!(id_2, "yuanshen.exe");

    let db_2 = librarian.load_game_db(&id_2).await.unwrap();
    assert_eq!(db_2.games.get(&id_2).unwrap().name, "Genshin Impact");
}
