use logic_weaver::*;
use tempfile::tempdir;

#[test]
fn test_namespacer_basic() {
    let mut doc = ini_forge::IniDocument {
        sections: vec![ini_forge::ast::Section {
            name: "Constants".to_string(),
            items: vec![ini_forge::ast::IniItem::Pair {
                key: "$var".into(),
                value: "1".into(),
            }],
        }],
    };
    Namespacer::namespace_variables(&mut doc, "UUID").unwrap();
    if let ini_forge::ast::IniItem::Pair { key, .. } = &doc.sections[0].items[0] {
        assert!(key.contains("UUID"));
    }
}

#[test]
fn test_merger_basic() {
    let mut sec = ini_forge::ast::Section {
        name: "TextureOverride".to_string(),
        items: vec![],
    };
    Merger::wrap_in_logic_gate(&mut sec, "UUID").unwrap();
    assert_eq!(sec.items.len(), 2); // if + endif
}

#[test]
fn test_merge_and_disable() {
    let dir = tempdir().unwrap();
    let character_dir = dir.path().join("Raiden");
    let skin_0_dir = character_dir.join("Skin_0");
    std::fs::create_dir_all(&skin_0_dir).unwrap();

    let ini_path = skin_0_dir.join("mod.ini");
    std::fs::write(&ini_path, "[TextureOverrideBody]\nhash = 123\nps-t0 = ResourceBody\n\n[ResourceBody]\nfilename = body.dds").unwrap();

    let skins = vec![ini_merger::SkinMetadata {
        index: 0,
        uuid: "A".to_string(),
    }];

    ini_merger::IniMerger::merge_skins(character_dir.clone(), skins).unwrap();

    // Verify merged.ini
    assert!(character_dir.join("merged.ini").exists());
    let merged_content = std::fs::read_to_string(character_dir.join("merged.ini")).unwrap();
    assert!(merged_content.contains("[TextureOverride_Master_123]"));
    assert!(merged_content.contains("filename = Skin_0/body.dds"));

    // Verify disabling
    assert!(!ini_path.exists());
    assert!(skin_0_dir.join("DISABLED_mod.ini").exists());
}
