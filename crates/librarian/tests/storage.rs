use librarian::storage::LibrarianConfig;
use librarian::*;
use tempfile::tempdir;
use uuid::Uuid;

#[tokio::test]
async fn test_librarian_flow() {
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

    let db = librarian.load_game_db("test").await.unwrap();
    assert!(db.games.is_empty());
    librarian.save_game_db("test", &db).await.unwrap();

    let paths = librarian.game_paths("test");
    assert!(paths.db.exists());
}

#[tokio::test]
async fn test_settings_persistence() {
    let dir = tempdir().unwrap();
    let manager = SettingsManager::new(dir.path().to_path_buf());
    let mut settings = manager.load().await.unwrap();
    settings.language = "ja-JP".into();
    manager.save(&settings).await.unwrap();
    let loaded = manager.load().await.unwrap();
    assert_eq!(loaded.language, "ja-JP");
}

#[tokio::test]
async fn test_profile_creation() {
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

    let p = librarian
        .create_profile("test", "New".into())
        .await
        .unwrap();
    let db = librarian.load_game_db("test").await.unwrap();
    assert!(db.profiles.contains_key(&p.id));
}

#[tokio::test]
async fn test_load_order_persistence() {
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

    let mut db = LibraryDatabase::default();
    let id = Uuid::new_v4();
    db.profiles.insert(
        id,
        Profile {
            id,
            load_order: vec![Uuid::new_v4()],
            ..Default::default()
        },
    );
    librarian.save_game_db("test", &db).await.unwrap();
    let loaded = librarian.load_game_db("test").await.unwrap();
    assert_eq!(loaded.profiles.get(&id).unwrap().load_order.len(), 1);
}

#[tokio::test]
async fn test_duplicate_profile() {
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

    // Create base profile
    let original = librarian
        .create_profile("test", "Original".into())
        .await
        .unwrap();

    // Duplicate
    let copy = librarian
        .duplicate_profile("test", original.id, "Copy".into())
        .await
        .unwrap();

    assert_ne!(original.id, copy.id);
    assert_eq!(copy.name, "Copy");

    let db = librarian.load_game_db("test").await.unwrap();
    assert!(db.profiles.contains_key(&original.id));
    assert!(db.profiles.contains_key(&copy.id));
}

#[tokio::test]
async fn test_cloud_sync_stub() {
    let sync = cloud::CloudSync;
    let res = sync.sync_game_db("test", &LibraryDatabase::default()).await;
    assert!(res.is_ok());
}
