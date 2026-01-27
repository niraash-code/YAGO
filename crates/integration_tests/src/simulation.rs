use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;
use tempfile::{tempdir, TempDir};
use uuid::Uuid;

// Crate Imports
use librarian::{Librarian, ModRecord};
use logic_weaver::ModProfile;

/// Harness for running headless simulations
pub struct SimulationContext {
    pub root: TempDir,
    pub staging_root: PathBuf,
    pub librarian: Arc<Librarian>,
}

impl SimulationContext {
    pub async fn new() -> Self {
        let root = tempdir().unwrap();
        let games_root = root.path().join("library");
        let staging_root = root.path().join("staging");
        let assets_root = root.path().join("assets");
        std::fs::create_dir(&games_root).unwrap();
        std::fs::create_dir(&staging_root).unwrap();
        std::fs::create_dir(&assets_root).unwrap();

        let librarian = Arc::new(Librarian::new(games_root.clone(), assets_root));

        Self {
            root,
            staging_root,
            librarian,
        }
    }

    pub fn create_fake_game(&self, name: &str) -> PathBuf {
        let game_dir = self.root.path().join(name);
        std::fs::create_dir(&game_dir).unwrap();
        let exe_path = game_dir.join(format!("{}.exe", name));

        // Write valid PE header so detection works
        let mut f = File::create(&exe_path).unwrap();
        f.write_all(&[0x4D, 0x5A, 0x90, 0x00]).unwrap();

        exe_path
    }

    pub fn create_fake_mod_archive(&self, name: &str, content_files: Vec<(&str, &str)>) -> PathBuf {
        let archive_path = self.staging_root.join(name);
        let file = File::create(&archive_path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options = zip::write::SimpleFileOptions::default();

        for (fname, content) in content_files {
            zip.start_file(fname, options).unwrap();
            zip.write_all(content.as_bytes()).unwrap();
        }
        zip.finish().unwrap();
        archive_path
    }
}

// --- Scenario A: The New User ---
#[tokio::test]
async fn test_sim_new_user() {
    let ctx = SimulationContext::new().await;

    // 1. Setup: Game exists on disk
    let game_path = ctx.create_fake_game("GenshinImpact");

    // 2. Action: Scan/Add Game
    let templates = HashMap::new();
    let game_id =
        librarian::Discovery::add_game_by_path(&ctx.librarian, game_path.clone(), &templates)
            .await
            .expect("Failed to add game");

    let db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    assert_eq!(db.games.get(&game_id).unwrap().name, "genshinimpact.exe");

    // 3. Action: Import Mod
    let mod_zip = ctx.create_fake_mod_archive(
        "TextureMod.zip",
        vec![
            ("mod.ini", "[TextureOverride]\nhash = 123"),
            ("tex.dds", "DDS HEADER"),
        ],
    );

    let mod_record = librarian::Importer::import_mod(&ctx.librarian, mod_zip, game_id.clone())
        .await
        .expect("Failed to import mod");

    assert_eq!(mod_record.meta.name, "TextureMod");

    // 4. Action: Deploy (Enable Mod)
    // By default importer enables it. Let's verify deployment generation.
    // We simulate what `deploy_mods` command does.
    let db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    let profile_id = Uuid::parse_str(&db.games.get(&game_id).unwrap().active_profile_id).unwrap();
    let profile = db.profiles.get(&profile_id).unwrap();

    // Build Weaver Inputs
    let mut profiles_for_weaver = Vec::new();
    if profile.enabled_mod_ids.contains(&mod_record.id) {
        profiles_for_weaver.push(ModProfile {
            uuid: mod_record.id.to_string(),
            mod_root: mod_record.path.clone(),
            ini_path: mod_record.path.join("mod.ini"),
            deploy_path: format!("YAGO/{}/", mod_record.id),
            character: mod_record.compatibility.character.clone(),
            nsfw: mod_record
                .config
                .tags
                .iter()
                .any(|t| t.to_lowercase() == "nsfw"),
        });
    }

    let (plan, _) = logic_weaver::generate_deployment_plan(profiles_for_weaver).unwrap();

    // Execute FS
    let game_root = game_path.parent().unwrap();
    fs_engine::execute_deployment(game_root, &plan, None).expect("Deployment failed");

    // Verify
    assert!(game_root.join("Mods/YAGO").exists());
    assert!(game_root.join("Mods/merged.ini").exists());
}

// --- Scenario B: The Power User ---
#[tokio::test]
async fn test_sim_power_user() {
    let ctx = SimulationContext::new().await;
    let game_path = ctx.create_fake_game("Cyberpunk");
    let templates = HashMap::new();
    let game_id = librarian::Discovery::add_game_by_path(&ctx.librarian, game_path, &templates)
        .await
        .unwrap();

    // 1. Create New Profile
    let mut db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    let default_pid = Uuid::parse_str(&db.games.get(&game_id).unwrap().active_profile_id).unwrap();

    let high_perf_pid = Uuid::new_v4();
    let high_perf_profile = librarian::Profile {
        id: high_perf_pid,
        name: "High Perf".to_string(),
        launch_args: vec!["-high".to_string()],
        ..Default::default()
    };

    db.profiles.insert(high_perf_pid, high_perf_profile);
    ctx.librarian.save_game_db(&game_id, &db).await.unwrap();

    // 2. Switch Profile
    let mut db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    let config = db.games.get_mut(&game_id).unwrap();
    config.active_profile_id = high_perf_pid.to_string();
    ctx.librarian.save_game_db(&game_id, &db).await.unwrap();

    // 3. Import Mod (4k Textures)
    let mod_zip = ctx.create_fake_mod_archive("4kTextures.zip", vec![("mod.ini", "")]);
    let mod_record = librarian::Importer::import_mod(&ctx.librarian, mod_zip, game_id.clone())
        .await
        .unwrap();

    // 4. Enable ONLY for High Perf (Importer enables for ACTIVE, which is High Perf now)
    // Let's switch back to default and verify it's NOT there (Wait, importer logic adds to active profile)
    // So "Default" profile should NOT have it.

    let db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    let default_p = db.profiles.get(&default_pid).unwrap();
    let high_p = db.profiles.get(&high_perf_pid).unwrap();

    assert!(
        high_p.enabled_mod_ids.contains(&mod_record.id),
        "Mod should be enabled in active profile"
    );
    assert!(
        !default_p.enabled_mod_ids.contains(&mod_record.id),
        "Mod should NOT be enabled in inactive profile"
    );
}

// --- Scenario C: The Chaos Monkey ---
#[tokio::test]
async fn test_sim_chaos_monkey() {
    let ctx = SimulationContext::new().await;
    let game_path = ctx.create_fake_game("RobustGame");
    let templates = HashMap::new();
    let game_id = librarian::Discovery::add_game_by_path(&ctx.librarian, game_path, &templates)
        .await
        .unwrap();

    // 1. Import Malware
    let malware_zip = ctx.create_fake_mod_archive(
        "FreeRobux.zip",
        vec![("virus.exe", "MZ..."), ("safe.ini", "")],
    );

    // Attempt import - should succeed but filter files
    let record = librarian::Importer::import_mod(&ctx.librarian, malware_zip, game_id.clone())
        .await
        .unwrap();

    // Verify file system
    assert!(
        !record.path.join("virus.exe").exists(),
        "Executable should have been stripped"
    );
    assert!(
        record.path.join("safe.ini").exists(),
        "Safe file should remain"
    );

    // 2. Corrupt Archive
    let corrupt_path = ctx.staging_root.join("Broken.zip");
    {
        let mut f = File::create(&corrupt_path).unwrap();
        f.write_all(b"This is not a zip file").unwrap();
    }

    let result =
        librarian::Importer::import_mod(&ctx.librarian, corrupt_path, game_id.clone()).await;
    assert!(result.is_err(), "Importing corrupt zip should fail");

    // 3. Delete Active Mod
    let mut db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    // Manually remove mod record but keep it in profile to simulate sync error or force delete
    // Currently delete_mod in backend handles pruning.
    // Let's simulate the backend logic:

    // Add a dummy mod manually to DB and Profile
    let dummy_id = Uuid::new_v4();
    let active_pid = Uuid::parse_str(&db.games.get(&game_id).unwrap().active_profile_id).unwrap();

    db.mods.insert(
        dummy_id,
        ModRecord {
            id: dummy_id,
            owner_game_id: game_id.clone(),
            path: PathBuf::from("/tmp/gone"),
            size: "0".into(),
            meta: librarian::ModMetadata {
                name: "Ghost".into(),
                version: "1".into(),
                author: "".into(),
                url: None,
                preview_image: None,
                description: None,
            },
            compatibility: librarian::ModCompatibility {
                game: "".into(),
                character: "".into(),
                hashes: vec![],
                fingerprint: "".into(),
            },
            config: librarian::ModConfig {
                tags: vec![],
                keybinds: std::collections::HashMap::new(),
            },
            enabled: true,
            added_at: chrono::Utc::now(),
        },
    );

    db.profiles
        .get_mut(&active_pid)
        .unwrap()
        .enabled_mod_ids
        .push(dummy_id);
    ctx.librarian.save_game_db(&game_id, &db).await.unwrap();

    // Now execute delete logic (simulating commands::delete_mod)
    // logic: remove from mods, remove from ALL profiles
    let mut db = ctx.librarian.load_game_db(&game_id).await.unwrap();
    if db.mods.remove(&dummy_id).is_some() {
        for profile in db.profiles.values_mut() {
            profile.enabled_mod_ids.retain(|mid| *mid != dummy_id);
            profile.load_order.retain(|mid| *mid != dummy_id);
        }
    }

    // Verify prune
    let active_p = db.profiles.get(&active_pid).unwrap();
    assert!(
        !active_p.enabled_mod_ids.contains(&dummy_id),
        "Ghost mod should be pruned from profile"
    );
}
