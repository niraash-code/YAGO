use ini_forge::{IniDocument, IniPatcher};
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use tempfile::tempdir;

#[test]
fn test_patch_config() {
    let dir = tempdir().unwrap();
    let ini_path = dir.path().join("d3dx.ini");

    let mut file = File::create(&ini_path).unwrap();
    writeln!(file, "[Constants]\nglobal_persist_$fps_unlock = 0").unwrap();

    let mut patches = HashMap::new();
    patches.insert(
        "Constants/global_persist_$fps_unlock".to_string(),
        "1".to_string(),
    );

    IniDocument::patch_config(&ini_path, &patches).unwrap();

    let content = std::fs::read_to_string(&ini_path).unwrap();
    assert!(content.contains("global_persist_$fps_unlock = 1"));
}

#[test]
fn test_patch_target() {
    let dir = tempdir().unwrap();
    let ini_path = dir.path().join("d3dx.ini");

    let mut file = File::create(&ini_path).unwrap();
    writeln!(file, "[Loader]\ntarget = old.exe").unwrap();

    IniDocument::patch_file(&ini_path, "Loader", "target", "new.exe").unwrap();

    let content = std::fs::read_to_string(&ini_path).unwrap();
    assert!(content.contains("target = new.exe"));
    assert!(!content.contains("target = old.exe"));
}

#[test]
fn test_patch_config_missing_section() {
    let dir = tempdir().unwrap();
    let ini_path = dir.path().join("test.ini");
    std::fs::write(&ini_path, "; Empty file").unwrap();

    let mut patches = HashMap::new();
    patches.insert(
        "Constants/global_persist_$orfix".to_string(),
        "1".to_string(),
    );

    IniDocument::patch_config(&ini_path, &patches).unwrap();

    let content = std::fs::read_to_string(&ini_path).unwrap();
    assert!(content.contains("[Constants]"));
    assert!(content.contains("global_persist_$orfix = 1"));
}
