use logic_weaver::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_conflict_detection_logic() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // Setup two mods with same hash
    let mod_a_dir = root.join("ModA");
    let mod_b_dir = root.join("ModB");
    fs::create_dir(&mod_a_dir).unwrap();
    fs::create_dir(&mod_b_dir).unwrap();

    let ini_a = mod_a_dir.join("mod.ini");
    let ini_b = mod_b_dir.join("mod.ini");

    fs::write(&ini_a, "[TextureOverrideBody]\nhash = deadbeef\n").unwrap();
    fs::write(&ini_b, "[TextureOverrideBody]\nhash = deadbeef\n").unwrap();

    let profiles = vec![
        ModProfile {
            uuid: "UUID_A".to_string(),
            mod_root: mod_a_dir.clone(),
            ini_path: ini_a,
            deploy_path: "YAGO/A/".to_string(),
            character: "Global/Other".to_string(),
            nsfw: false,
        },
        ModProfile {
            uuid: "UUID_B".to_string(),
            mod_root: mod_b_dir.clone(),
            ini_path: ini_b,
            deploy_path: "YAGO/B/".to_string(),
            character: "Global/Other".to_string(),
            nsfw: false,
        },
    ];

    let (_, report) = generate_deployment_plan(profiles).unwrap();

    println!("Report: {:?}", report);

    assert!(report.overwritten_hashes.contains_key("deadbeef"));
}
