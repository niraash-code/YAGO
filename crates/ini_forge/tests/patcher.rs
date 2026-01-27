use ini_forge::*;
use std::collections::HashMap;
use tempfile::tempdir;

#[test]
fn test_ini_patcher_set_value() {
    let mut doc = IniDocument::default();

    // 1. Create new section and key
    doc.set_value("NewSection", "key", "val");
    assert_eq!(doc.sections.len(), 1);
    assert_eq!(doc.sections[0].name, "NewSection");

    // 2. Update existing key
    doc.set_value("NewSection", "key", "updated");
    if let IniItem::Pair { value, .. } = &doc.sections[0].items[0] {
        assert_eq!(value, "updated");
    } else {
        panic!("Wrong item type");
    }

    // 3. Add second key
    doc.set_value("NewSection", "key2", "val2");
    assert_eq!(doc.sections[0].items.len(), 2);
}

#[test]
fn test_ini_patcher_set_proxy_chain() {
    let mut doc = IniDocument::default();
    doc.set_proxy_chain("ReShade.dll");

    let section = doc.sections.iter().find(|s| s.name == "Import").unwrap();
    assert!(section.items.iter().any(
        |i| matches!(i, IniItem::Pair { key, value } if key == "filename" && value == "ReShade.dll")
    ));
    assert!(section
        .items
        .iter()
        .any(|i| matches!(i, IniItem::Pair { key, value } if key == "when" && value == "Proxy")));
}

#[test]
fn test_ini_patcher_patch_file() {
    let dir = tempdir().unwrap();
    let ini_path = dir.path().join("test.ini");
    std::fs::write(&ini_path, "[Section]\nkey = old").unwrap();

    <IniDocument as IniPatcher>::patch_file(&ini_path, "Section", "key", "new").unwrap();

    let content = std::fs::read_to_string(&ini_path).unwrap();
    assert!(content.contains("key = new"));
}

#[test]
fn test_ini_patcher_patch_config() {
    let dir = tempdir().unwrap();
    let ini_path = dir.path().join("test.ini");
    std::fs::write(&ini_path, "[Section]\nkey1 = old").unwrap();

    let mut patches = HashMap::new();
    patches.insert("Section/key1".to_string(), "new1".to_string());
    patches.insert("NewSection/key2".to_string(), "new2".to_string());

    <IniDocument as IniPatcher>::patch_config(&ini_path, &patches).unwrap();

    let content = std::fs::read_to_string(&ini_path).unwrap();
    assert!(content.contains("key1 = new1"));
    assert!(content.contains("[NewSection]"));
    assert!(content.contains("key2 = new2"));
}
