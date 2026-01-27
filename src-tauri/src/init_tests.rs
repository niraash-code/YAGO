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
            let bytes = include_bytes!("../../assets/hashes.json");
            fs::write(&hashes_path, bytes).unwrap();
        }

        // 2. Extract AppConfig
        let config_path = app_data_dir.join("app_config.json");
        if !config_path.exists() {
            let bytes = include_bytes!("../../assets/app_config.json");
            fs::write(&config_path, bytes).unwrap();
        }

        // 3. Extract Templates
        if !templates_root.exists() {
            fs::create_dir_all(&templates_root).unwrap();

            let bundled: [(&str, &[u8]); 5] = [
                (
                    "genshin.json",
                    include_bytes!("../../templates/genshin.json"),
                ),
                ("hi3.json", include_bytes!("../../templates/hi3.json")),
                ("hsr.json", include_bytes!("../../templates/hsr.json")),
                ("wuwa.json", include_bytes!("../../templates/wuwa.json")),
                ("zzz.json", include_bytes!("../../templates/zzz.json")),
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
}
