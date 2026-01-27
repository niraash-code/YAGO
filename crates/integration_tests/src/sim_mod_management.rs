use crate::context::SimulationContext;
use std::collections::HashMap;
use uuid::Uuid;

#[tokio::test]
async fn test_mod_import_duplicate() {
    let ctx = SimulationContext::new().await;
    let game_path = ctx.create_fake_game("TestGame");
    let templates = HashMap::new();
    let game_id = librarian::Discovery::add_game_by_path(&ctx.librarian, game_path, &templates)
        .await
        .unwrap();

    let mod_zip = ctx.create_fake_mod_archive("ModA.zip", vec![("mod.ini", "hash=1")]);

    // Import once
    let rec1 = librarian::Importer::import_mod(&ctx.librarian, mod_zip.clone(), game_id.clone())
        .await
        .unwrap();

    // Import again (same file, same content -> duplicate logic?)
    // Currently importer does NOT deduplicate by content. It creates a new ID.
    let rec2 = librarian::Importer::import_mod(&ctx.librarian, mod_zip, game_id.clone())
        .await
        .unwrap();

    // We expect 2 mods because logic does not deduplicate yet
    assert_ne!(rec1.id, rec2.id);

    let db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    assert_eq!(db.mods.len(), 2);
}

#[tokio::test]
async fn test_mod_lifecycle() {
    let ctx = SimulationContext::new().await;
    let game_path = ctx.create_fake_game("LifecycleGame");
    let templates = HashMap::new();
    let game_id = librarian::Discovery::add_game_by_path(&ctx.librarian, game_path, &templates)
        .await
        .unwrap();

    let mod_zip = ctx.create_fake_mod_archive("CycleMod.zip", vec![("mod.ini", "hash=1")]);
    let mod_record = librarian::Importer::import_mod(&ctx.librarian, mod_zip, game_id.clone())
        .await
        .unwrap();
    let mod_id = mod_record.id;

    // 1. Verify Enabled by Default
    let db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    let config = db.games.get(&game_id).unwrap();
    let active_pid = Uuid::parse_str(&config.active_profile_id).unwrap();
    let profile = db.profiles.get(&active_pid).unwrap();
    assert!(profile.enabled_mod_ids.contains(&mod_id));

    // 2. Toggle Off
    // Simulate API toggle logic
    let mut db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    if let Some(profile) = db.profiles.get_mut(&active_pid) {
        profile.enabled_mod_ids.retain(|id| *id != mod_id);
    }
    ctx.librarian.save_game_db(&game_id, &db).await.unwrap();

    let db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    let profile = db.profiles.get(&active_pid).unwrap();
    assert!(!profile.enabled_mod_ids.contains(&mod_id));

    // 3. Update Tags
    let mut db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    if let Some(record) = db.mods.get_mut(&mod_id) {
        record.config.tags = vec!["Visual".to_string()];
    }
    ctx.librarian.save_game_db(&game_id, &db).await.unwrap();

    let db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    assert_eq!(db.mods.get(&mod_id).unwrap().config.tags[0], "Visual");

    // 4. Delete Mod
    let mut db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    // Simulate delete logic (remove from mods and all profiles)
    db.mods.remove(&mod_id);
    for profile in db.profiles.values_mut() {
        profile.enabled_mod_ids.retain(|id| *id != mod_id);
        profile.load_order.retain(|id| *id != mod_id);
    }
    ctx.librarian.save_game_db(&game_id, &db).await.unwrap();

    let db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    assert!(!db.mods.contains_key(&mod_id));
}

#[tokio::test]
async fn test_mod_import_malformed_metadata() {
    let ctx = SimulationContext::new().await;
    let game_path = ctx.create_fake_game("MetaGame");
    let game_id =
        librarian::Discovery::add_game_by_path(&ctx.librarian, game_path, &HashMap::new())
            .await
            .unwrap();

    // Archive with invalid JSON
    let mod_zip = ctx.create_fake_mod_archive(
        "BadMeta.zip",
        vec![("mod.json", "{ invalid json }"), ("mod.ini", "hash=1")],
    );

    let res = librarian::Importer::import_mod(&ctx.librarian, mod_zip, game_id.clone()).await;
    assert!(res.is_ok()); // Should fallback to default metadata

    let record = res.unwrap();
    assert_eq!(record.meta.name, "BadMeta");
}
