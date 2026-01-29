use proc_marshal::*;
use std::path::PathBuf;

#[test]
fn test_sandbox_io() {
    let dir = tempfile::tempdir().unwrap();
    let game_dir = dir.path().join("game");
    let profile_data_dir = dir.path().join("profile_data");
    std::fs::create_dir(&game_dir).unwrap();
    std::fs::create_dir(&profile_data_dir).unwrap();

    let sandbox_config = SandboxConfig {
        registry_keys: vec![],
        files: vec!["settings.ini".to_string(), "config/user.cfg".to_string()],
    };

    let runner = RunnerConfig {
        runner_type: RunnerType::Native,
        path: PathBuf::new(),
    };
    let prefix = PathBuf::new();

    // 1. Create file in game dir
    let game_settings = game_dir.join("settings.ini");
    std::fs::write(&game_settings, "volume=100").unwrap();

    // 2. Create nested file
    let user_cfg = game_dir.join("config/user.cfg");
    std::fs::create_dir(user_cfg.parent().unwrap()).unwrap();
    std::fs::write(&user_cfg, "name=Player").unwrap();

    // 3. Snapshot (Game -> Profile)
    SandboxManager::snapshot(
        &game_dir,
        &profile_data_dir,
        &sandbox_config,
        &runner,
        &prefix,
    )
    .unwrap();

    assert!(profile_data_dir.join("settings.ini").exists());
    assert!(profile_data_dir.join("config/user.cfg").exists());
    assert_eq!(
        std::fs::read_to_string(profile_data_dir.join("settings.ini")).unwrap(),
        "volume=100"
    );

    // 4. Modify and Restore (Profile -> Game)
    std::fs::write(profile_data_dir.join("settings.ini"), "volume=50").unwrap();
    std::fs::remove_file(&game_settings).unwrap();

    SandboxManager::restore(
        &game_dir,
        &profile_data_dir,
        &sandbox_config,
        &runner,
        &prefix,
    )
    .unwrap();

    assert!(game_settings.exists());
    assert_eq!(std::fs::read_to_string(game_settings).unwrap(), "volume=50");
}

#[tokio::test]
async fn test_launch_invalid_exe() {
    let launcher = Launcher;
    let options = LaunchOptions {
        exe_path: PathBuf::from("/non/existent/path/to/game.exe"),
        args: vec![],
        current_dir: None,
        runner: RunnerConfig {
            runner_type: RunnerType::Native,
            path: PathBuf::new(),
        },
        prefix_path: PathBuf::new(),
        use_gamescope: false,
        use_gamemode: false,
        use_mangohud: false,
        injection_method: InjectionMethod::None,
        loader_path: None,
        injected_dlls: vec![],
        resolution: (0, 0),
        fps_target: None,
        sandbox_config: None,
        sandbox_data_dir: None,
        enable_linux_shield: true,
        shield_path: None,
        helper_path: None,
    };

    let result = launcher.launch(options).await;
    assert!(result.is_err());
}
