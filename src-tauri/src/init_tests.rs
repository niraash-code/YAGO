#[cfg(test)]
mod tests {
    use librarian::GameTemplate;
    use std::collections::HashMap;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_fuzzy_template_matching() {
        let mut templates = HashMap::new();
        templates.insert(
            "genshin".to_string(),
            GameTemplate {
                id: "genshin".into(),
                name: "Genshin Impact".into(),
                short_name: "Genshin".into(),
                ..Default::default()
            },
        );
        templates.insert(
            "hsr".to_string(),
            GameTemplate {
                id: "hsr".into(),
                name: "Honkai: Star Rail".into(),
                short_name: "HSR".into(),
                ..Default::default()
            },
        );

        let normalize = |s: &str| -> String {
            s.to_lowercase()
                .chars()
                .filter(|c| c.is_alphanumeric())
                .collect()
        };

        let find_fuzzy = |id: &str, temps: &HashMap<String, GameTemplate>| -> Option<String> {
            temps
                .get(id)
                .or_else(|| {
                    let base = id.trim_end_matches(".exe");
                    temps.get(base).or_else(|| {
                        let base_norm = normalize(base);
                        temps.values().find(|t| {
                            let name_norm = normalize(&t.name);
                            let short_norm = normalize(&t.short_name);
                            base_norm.contains(&short_norm)
                                || base_norm.contains(&name_norm)
                                || short_norm.contains(&base_norm)
                                || name_norm.contains(&base_norm)
                        })
                    })
                })
                .map(|t| t.id.clone())
        };

        // Exact match
        assert_eq!(find_fuzzy("genshin", &templates).unwrap(), "genshin");
        // Filename match
        assert_eq!(find_fuzzy("genshin.exe", &templates).unwrap(), "genshin");
        // Case-insensitive / partial (HSR)
        assert_eq!(find_fuzzy("starrail.exe", &templates).unwrap(), "hsr");
        // Mixed case
        assert_eq!(
            find_fuzzy("GenshinImpact.exe", &templates).unwrap(),
            "genshin"
        );
    }

    #[test]
    fn test_initialization_logic() {
        let dir = tempdir().unwrap();
        let app_data_dir = dir.path().to_path_buf();

        let assets_root = app_data_dir.join("assets");
        let templates_root = app_data_dir.join("templates");

        fs::create_dir_all(&assets_root).unwrap();

        // 1. Extract Hashes
        let hashes_path = assets_root.join("hashes.json");
        if !hashes_path.exists() {
            let bytes = b"{}";
            fs::write(&hashes_path, bytes).unwrap();
        }

        // 2. Extract AppConfig
        let config_path = app_data_dir.join("app_config.json");
        if !config_path.exists() {
            let bytes = b"{\"proton_repo\": \"test\"}";
            fs::write(&config_path, bytes).unwrap();
        }

        // 3. Extract Templates
        if !templates_root.exists() {
            fs::create_dir_all(&templates_root).unwrap();
            fs::write(templates_root.join("genshin.json"), b"{}").unwrap();
        }

        // Verification
        assert!(hashes_path.exists());
        assert!(config_path.exists());
        assert!(templates_root.join("genshin.json").exists());

        // Verify content of config
        let config_content = fs::read_to_string(config_path).unwrap();
        assert!(config_content.contains("proton_repo"));
    }

    #[tokio::test]
    async fn test_runner_resolution_logic() {
        use std::path::PathBuf;
        let dir = tempdir().unwrap();
        let app_data = dir.path().join("app_data");
        let runners_dir = app_data.join("runners/GE-Proton-1");
        std::fs::create_dir_all(&runners_dir).unwrap();
        std::fs::File::create(runners_dir.join("proton")).unwrap();

        let settings = librarian::GlobalSettings {
            steam_compat_tools_path: PathBuf::from("/tmp/steam_mock"),
            ..Default::default()
        };

        // 1. Local resolution
        let (path, rtype) = crate::commands::launcher::resolve_runner_path(
            Some("GE-Proton-1".to_string()),
            &app_data,
            &settings,
        )
        .await;
        assert_eq!(rtype, proc_marshal::RunnerType::Proton);
        assert!(path
            .to_string_lossy()
            .contains("app_data/runners/GE-Proton-1/proton"));

        // 2. Default fallback to wine
        let (path, rtype) =
            crate::commands::launcher::resolve_runner_path(None, &app_data, &settings).await;
        assert_eq!(rtype, proc_marshal::RunnerType::Wine);
        assert_eq!(path.to_string_lossy(), "wine");
    }
}
