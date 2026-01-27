use logic_weaver::*;
use std::fs;
use std::path::PathBuf;
use tempfile::tempdir;

#[test]
fn test_cycle_compiler_isolation() {
    let dir = tempdir().unwrap();
    let mod_a_dir = dir.path().join("ModA");
    let mod_b_dir = dir.path().join("ModB");
    fs::create_dir(&mod_a_dir).unwrap();
    fs::create_dir(&mod_b_dir).unwrap();

    fs::write(mod_a_dir.join("mod.ini"), "filename = texture.dds").unwrap();
    fs::write(mod_a_dir.join("texture.dds"), "data_a").unwrap();

    fs::write(mod_b_dir.join("mod.ini"), "filename = texture.dds").unwrap();
    fs::write(mod_b_dir.join("texture.dds"), "data_b").unwrap();

    let mods = vec![
        ModProfile {
            uuid: "A".to_string(),
            mod_root: mod_a_dir.clone(),
            ini_path: mod_a_dir.join("mod.ini"),
            deploy_path: "YAGO/A".to_string(),
            character: "Raiden".to_string(),
            nsfw: false,
        },
        ModProfile {
            uuid: "B".to_string(),
            mod_root: mod_b_dir.clone(),
            ini_path: mod_b_dir.join("mod.ini"),
            deploy_path: "YAGO/B".to_string(),
            character: "Raiden".to_string(),
            nsfw: false,
        },
    ];

    // Access CycleCompiler via internal or pub export
    // Assuming CycleCompiler is exported in crate root or we use the specific path
    // Based on src/lib.rs read earlier (if available) or standard patterns.
    // Let's assume it's available via logic_weaver::compiler::CycleCompiler
    let compiled = compiler::CycleCompiler::compile_character_group("Raiden", mods).unwrap();

    assert_eq!(compiled.plan.symlink_map.len(), 2);
    assert_eq!(
        compiled.plan.symlink_map[0].1,
        PathBuf::from("YAGO/Characters/Raiden/Skin_0")
    );
    assert_eq!(
        compiled.plan.symlink_map[1].1,
        PathBuf::from("YAGO/Characters/Raiden/Skin_1")
    );

    assert_eq!(compiled.plan.generated_files.len(), 2);
    let ini_a = &compiled.plan.generated_files[0].1;
    assert!(ini_a.contains("filename = Skin_0/texture.dds"));
}

#[test]
fn test_deployment_plan_grouping() {
    let dir = tempdir().unwrap();
    let mod_dir = dir.path().join("Mod");
    fs::create_dir(&mod_dir).unwrap();
    fs::write(mod_dir.join("mod.ini"), "[TextureOverride]\nhash=123").unwrap();

    let mods = vec![
        ModProfile {
            uuid: "Global".to_string(),
            mod_root: mod_dir.clone(),
            ini_path: mod_dir.join("mod.ini"),
            deploy_path: "YAGO/Global".to_string(),
            character: "Global/Other".to_string(),
            nsfw: false,
        },
        ModProfile {
            uuid: "S1".to_string(),
            mod_root: mod_dir.clone(),
            ini_path: mod_dir.join("mod.ini"),
            deploy_path: "YAGO/S1".to_string(),
            character: "Character".to_string(),
            nsfw: false,
        },
        ModProfile {
            uuid: "S2".to_string(),
            mod_root: mod_dir.clone(),
            ini_path: mod_dir.join("mod.ini"),
            deploy_path: "YAGO/S2".to_string(),
            character: "Character".to_string(),
            nsfw: false,
        },
    ];

    let (plan, _report) = generate_deployment_plan(mods).unwrap();

    assert_eq!(plan.symlink_map.len(), 3);
    assert!(plan
        .generated_files
        .iter()
        .any(|(p, _): &(PathBuf, String)| p == &PathBuf::from("merged.ini")));
    assert!(plan
        .generated_files
        .iter()
        .any(|(p, _): &(PathBuf, String)| p.to_string_lossy().contains("Skin_0")));
}
