use librarian::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_load_templates_invalid_json() {
    let dir = tempdir().unwrap();
    let file = dir.path().join("invalid.json");
    fs::write(&file, "{ invalid }").unwrap();
    let res = template::load_templates(dir.path());
    assert!(res.is_err());
}

#[test]
fn test_template_deserialization_full() {
    let json = r#"{"name": "Full Test", "executables": ["game.exe"], "injection_method_windows": "Proxy", "injection_method_linux": "Proxy"}"#;
    let template: GameTemplate = serde_json::from_str(json).unwrap();
    assert_eq!(template.name, "Full Test");
    assert_eq!(template.injection_method_windows, Some(InjectionMethod::Proxy));
}

#[tokio::test]
async fn test_template_loading() {
    let dir = tempdir().unwrap();
    let templates_dir = dir.path().join("templates");
    std::fs::create_dir(&templates_dir).unwrap();

    let json = r#"{"name": "Test", "executables": ["test.exe"]}"#;
    fs::write(templates_dir.join("test.json"), json).unwrap();

    let registry = TemplateRegistry::new(templates_dir);
    let templates = registry.load_all().await.unwrap();
    assert!(templates.contains_key("test.exe"));
}
