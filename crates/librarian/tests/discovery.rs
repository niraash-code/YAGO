use librarian::models::InjectionMethod;
use librarian::*;
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use tempfile::tempdir;

#[tokio::test]
async fn test_discovery_with_template_settings() {
    let dir = tempdir().unwrap();
    let games_root = dir.path().join("library");
    let assets_root = dir.path().join("assets");
    std::fs::create_dir_all(&assets_root).unwrap();
    let librarian = Librarian::new(games_root, assets_root);

    let game_dir = dir.path().join("game");
    std::fs::create_dir(&game_dir).unwrap();
    let exe_path = game_dir.join("TestGame.exe");

    let mut f = File::create(&exe_path).unwrap();
    f.write_all(&[0x4D, 0x5A, 0x90, 0x00]).unwrap();

    let mut templates = HashMap::new();
    templates.insert(
        "testgame".to_string(),
        GameTemplate {
            id: "testgame".to_string(),
            name: "Test Game".to_string(),
            executables: vec!["TestGame.exe".to_string()],
            injection_method_windows: Some(InjectionMethod::Proxy),
            injection_method_linux: Some(InjectionMethod::Proxy),
            launch_args: Some(vec!["-custom".to_string()]),
            auto_update: Some(false),
            ..Default::default()
        },
    );

    let id = Discovery::add_game_by_path(&librarian, exe_path, &templates)
        .await
        .unwrap();
    let db = librarian.load_game_db(&id).await.unwrap();
    let config = db.games.get(&id).unwrap();

    assert_eq!(id, "testgame.exe");
    assert_eq!(config.injection_method, InjectionMethod::Proxy);
    assert_eq!(config.launch_args, vec!["-custom".to_string()]);
}

#[test]
#[cfg(target_os = "linux")]
fn test_scan_deep_nesting() {
    let dir = tempdir().unwrap();
    let deep_path = dir.path().join("TwinTail/Hoyoverse/Genshin Impact/UUID");
    std::fs::create_dir_all(&deep_path).unwrap();
    File::create(deep_path.join("game.exe")).unwrap();

    let templates = vec![GameTemplate {
        id: "test".to_string(),
        executables: vec!["game.exe".to_string()],
        ..Default::default()
    }];

    let results = scanner::scan_roots(&templates, vec![dir.path().to_path_buf()]);
    assert_eq!(results.len(), 1);
}

#[test]
#[cfg(target_os = "linux")]
fn test_scan_deduplication() {
    let dir = tempdir().unwrap();
    let shared_file = dir.path().join("game.exe");
    File::create(&shared_file).unwrap();

    let templates = vec![GameTemplate {
        id: "test".to_string(),
        executables: vec!["game.exe".to_string()],
        ..Default::default()
    }];

    let results = scanner::scan_roots(
        &templates,
        vec![dir.path().to_path_buf(), dir.path().to_path_buf()],
    );
    assert_eq!(results.len(), 1);
}

#[test]
fn test_scan_logic_check_path() {
    let dir = tempdir().unwrap();
    let game_dir = dir.path().join("MyGame");
    std::fs::create_dir(&game_dir).unwrap();
    let exe_path = game_dir.join("game.exe");
    File::create(&exe_path).unwrap();

    let templates = vec![GameTemplate {
        id: "test".to_string(),
        executables: vec!["game.exe".to_string()],
        ..Default::default()
    }];

    let mut results = Vec::new();
    scanner::check_path(&game_dir, &templates, &mut results);
    assert_eq!(results.len(), 1);
    assert!(results[0].path.ends_with("game.exe"));
}

#[tokio::test]
async fn test_game_discovery() {
    let dir = tempdir().unwrap();
    let games_root = dir.path().join("games_discovery");
    std::fs::create_dir(&games_root).unwrap();

    let librarian = Librarian::new(games_root.clone(), dir.path().join("assets_discovery"));

    // Create two game dirs
    std::fs::create_dir(games_root.join("game1.exe")).unwrap();
    std::fs::create_dir(games_root.join("game2.exe")).unwrap();
    // Create a non-dir file (should be ignored)
    File::create(games_root.join("random.txt")).unwrap();

    let ids = librarian.discover_game_ids().await.unwrap();
    assert_eq!(ids.len(), 2);
    assert!(ids.contains(&"game1.exe".to_string()));
    assert!(ids.contains(&"game2.exe".to_string()));
}
