use fs_engine;
use logic_weaver;
use tempfile::tempdir;

#[test]
fn test_deployment_flow() {
    let dir = tempdir().unwrap();
    let game_root = dir.path().join("Game");
    let mods_store = dir.path().join("Library/Mods");

    std::fs::create_dir_all(&game_root).unwrap();
    std::fs::create_dir_all(&mods_store).unwrap();

    // Setup Mod A
    let mod_a_root = mods_store.join("ModA");
    std::fs::create_dir(&mod_a_root).unwrap();
    std::fs::write(mod_a_root.join("mod.ini"), "[TextureOverride]\nhash=A").unwrap();
    std::fs::write(mod_a_root.join("a.dds"), "texture_data").unwrap();

    // Setup Mod B
    let mod_b_root = mods_store.join("ModB");
    std::fs::create_dir(&mod_b_root).unwrap();
    std::fs::write(mod_b_root.join("mod.ini"), "[TextureOverride]\nhash=B").unwrap();
    std::fs::write(mod_b_root.join("b.dds"), "texture_data").unwrap();

    let profiles = vec![
        logic_weaver::ModProfile {
            uuid: "UUID_A".to_string(),
            mod_root: mod_a_root.clone(),
            ini_path: mod_a_root.join("mod.ini"),
            deploy_path: "YAGO/UUID_A/".to_string(),
            character: "Global/Other".to_string(),
            nsfw: false,
        },
        logic_weaver::ModProfile {
            uuid: "UUID_B".to_string(),
            mod_root: mod_b_root.clone(),
            ini_path: mod_b_root.join("mod.ini"),
            deploy_path: "YAGO/UUID_B/".to_string(),
            character: "Global/Other".to_string(),
            nsfw: false,
        },
    ];

    let (plan, _report) = logic_weaver::generate_deployment_plan(profiles).unwrap();
    fs_engine::execute_deployment(&game_root, &plan, None).unwrap();

    let mods_dir = game_root.join("Mods");
    assert!(mods_dir.exists());
    assert!(mods_dir.join("merged.ini").exists());

    assert!(mods_dir.join("YAGO/UUID_A").exists());
    assert!(mods_dir.join("YAGO/UUID_B").exists());
    assert!(mods_dir.join("YAGO/UUID_A/a.dds").exists());
    assert!(mods_dir.join("YAGO/UUID_B/b.dds").exists());

    let merged_content = std::fs::read_to_string(mods_dir.join("merged.ini")).unwrap();
    assert!(merged_content.contains("hash = A"));
    assert!(merged_content.contains("hash = B"));
}
