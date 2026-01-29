#[cfg(test)]
mod tests {
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_initialization_logic() {
        let dir = tempdir().unwrap();
        let app_data_dir = dir.path().to_path_buf();

        let assets_root = app_data_dir.join("assets");
        let templates_root = app_data_dir.join("templates");

        fs::create_dir_all(&assets_root).unwrap();

        // Simulating the logic from lib.rs

        // 1. Extract Hashes
        let hashes_path = assets_root.join("hashes.json");
        if !hashes_path.exists() {
            let bytes = include_bytes!("../../resources/hashes.json");
            fs::write(&hashes_path, bytes).unwrap();
        }

        // 2. Extract AppConfig
        let config_path = app_data_dir.join("app_config.json");
        if !config_path.exists() {
            let bytes = include_bytes!("../../resources/app_config.json");
            fs::write(&config_path, bytes).unwrap();
        }

        // 3. Extract Templates
        if !templates_root.exists() {
            fs::create_dir_all(&templates_root).unwrap();

            let bundled: [(&str, &[u8]); 5] = [
                (
                    "genshin.json",
                    include_bytes!("../../resources/templates/genshin.json"),
                ),
                (
                    "hi3.json",
                    include_bytes!("../../resources/templates/hi3.json"),
                ),
                (
                    "hsr.json",
                    include_bytes!("../../resources/templates/hsr.json"),
                ),
                (
                    "wuwa.json",
                    include_bytes!("../../resources/templates/wuwa.json"),
                ),
                (
                    "zzz.json",
                    include_bytes!("../../resources/templates/zzz.json"),
                ),
            ];

            for (name, bytes) in bundled {
                fs::write(templates_root.join(name), bytes).unwrap();
            }
        }

        // Verification
        assert!(hashes_path.exists());
        assert!(config_path.exists());
        assert!(templates_root.join("genshin.json").exists());
        assert!(templates_root.join("hi3.json").exists());
        assert!(templates_root.join("hsr.json").exists());
        assert!(templates_root.join("wuwa.json").exists());
        assert!(templates_root.join("zzz.json").exists());

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
