use ini_forge::*;
use tempfile::tempdir;

#[test]
fn test_compilation_failure() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("invalid.ini");
    let compiler = IniCompiler::default();
    let result = compiler.compile(&path);
    assert!(result.is_err());
}

#[test]
fn test_serialization_roundtrip_complex() {
    let doc = IniDocument {
        sections: vec![
            Section {
                name: "GLOBAL".to_string(),
                items: vec![IniItem::Comment("Test".to_string())],
            },
            Section {
                name: "Constants".to_string(),
                items: vec![IniItem::Pair {
                    key: "$var".to_string(),
                    value: "1".to_string(),
                }],
            },
        ],
    };

    let compiler = IniCompiler::default();
    let output = compiler.serialize(&doc);

    assert!(output.contains("; Test\n\n[Constants]"));

    let (_, parsed) = parser::parse_ini(&output).unwrap();
    assert_eq!(parsed.sections.len(), 2);
    assert_eq!(parsed.sections[1].name, "Constants");
}

#[test]
fn test_compiler_max_depth() {
    let dir = tempdir().unwrap();
    let file = dir.path().join("test.ini");
    std::fs::write(&file, "[Section]\nkey=value").unwrap();

    let compiler = IniCompiler::new(0);
    let res = compiler.compile(&file);
    assert!(res.is_ok());
}
