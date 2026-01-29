use proc_marshal::*;
use std::path::PathBuf;

#[test]
fn test_command_generation_vanilla() {
    let launcher = Launcher;
    let options = LaunchOptions {
        exe_path: PathBuf::from("game.exe"),
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

    let cmd = launcher.build_command(&options).unwrap();
    let std_cmd = cmd.as_std();

    #[cfg(unix)]
    assert_eq!(std_cmd.get_program(), "game.exe");
    #[cfg(windows)]
    assert_eq!(std_cmd.get_program(), "game.exe");

    let envs: Vec<_> = std_cmd.get_envs().collect();
    assert!(!envs
        .iter()
        .any(|(k, _)| k == &std::ffi::OsStr::new("WINEDLLOVERRIDES")));
}

#[test]
#[cfg(target_os = "linux")]
fn test_command_generation_wine_prefix() {
    let launcher = Launcher;
    let options = LaunchOptions {
        exe_path: PathBuf::from("test.exe"),
        args: vec![],
        current_dir: None,
        runner: RunnerConfig {
            runner_type: RunnerType::Wine,
            path: PathBuf::from("wine"),
        },
        prefix_path: PathBuf::from("/tmp/prefix"),
        use_gamescope: false,
        use_gamemode: false,
        use_mangohud: false,
        injection_method: InjectionMethod::Proxy,
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

    let cmd = launcher.build_command(&options).unwrap();
    let std_cmd = cmd.as_std();

    assert_eq!(std_cmd.get_program(), "wine");
    let envs: Vec<_> = std_cmd.get_envs().collect();
    assert!(envs
        .iter()
        .any(|(k, v)| k == &std::ffi::OsStr::new("WINEPREFIX")
            && v == &Some(std::ffi::OsStr::new("/tmp/prefix/pfx"))));
}

#[test]
fn test_command_generation_native_args() {
    let launcher = Launcher;
    let options = LaunchOptions {
        exe_path: PathBuf::from("game.exe"),
        args: vec!["--test".to_string()],
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

    let cmd = launcher.build_command(&options).unwrap();
    let std_cmd = cmd.as_std();

    let args: Vec<_> = std_cmd
        .get_args()
        .map(|s| s.to_string_lossy().to_string())
        .collect();
    assert!(args.contains(&"--test".to_string()));
}

#[test]
#[cfg(target_os = "linux")]
fn test_command_generation_proton_advanced() {
    let launcher = Launcher;
    let options = LaunchOptions {
        exe_path: PathBuf::from("/games/game.exe"),
        args: vec!["--arg".to_string()],
        current_dir: None,
        runner: RunnerConfig {
            runner_type: RunnerType::Proton,
            path: PathBuf::from("/tools/proton"),
        },
        prefix_path: PathBuf::from("/prefixes/game"),
        use_gamescope: true,
        use_gamemode: true,
        use_mangohud: true,
        injection_method: InjectionMethod::Proxy,
        loader_path: None,
        injected_dlls: vec![],
        resolution: (2560, 1440),
        fps_target: None,
        sandbox_config: None,
        sandbox_data_dir: None,
        enable_linux_shield: true,
        shield_path: None,
        helper_path: None,
    };

    let cmd = launcher.build_command(&options).unwrap();
    let std_cmd = cmd.as_std();

    // Verify outer wrapper
    assert_eq!(std_cmd.get_program(), "gamemoderun");

    let args: Vec<_> = std_cmd
        .get_args()
        .map(|s| s.to_string_lossy().to_string())
        .collect();

    // Check nested wrappers and args
    assert!(args.contains(&"gamescope".to_string()));
    assert!(args.contains(&"2560".to_string()));
    assert!(args.contains(&"mangohud".to_string()));
    assert!(args.contains(&"/tools/proton".to_string()));
    assert!(args.contains(&"run".to_string()));
    assert!(args.contains(&"/games/game.exe".to_string()));
    assert!(args.contains(&"--arg".to_string()));

    // Verify Env
    let envs: Vec<_> = std_cmd.get_envs().collect();
    let has_compat = envs.iter().any(|(k, v)| {
        k == &std::ffi::OsStr::new("STEAM_COMPAT_DATA_PATH")
            && v == &Some(std::ffi::OsStr::new("/prefixes/game"))
    });
    let has_override = envs.iter().any(|(k, v)| {
        k == &std::ffi::OsStr::new("WINEDLLOVERRIDES")
            && v == &Some(std::ffi::OsStr::new("d3d11,dxgi=n,b"))
    });
    assert!(has_compat);
    assert!(has_override);
}

#[tokio::test]
async fn test_launcher_env_vars() {
    let launcher = Launcher;

    #[cfg(unix)]
    let exe = PathBuf::from("env");
    #[cfg(windows)]
    let exe = PathBuf::from("cmd.exe");

    let options = LaunchOptions {
        exe_path: exe,
        args: vec![],
        current_dir: None,
        runner: RunnerConfig {
            runner_type: RunnerType::Wine,
            path: PathBuf::from("wine"),
        },
        prefix_path: PathBuf::from("/tmp/test_prefix"),
        use_gamescope: false,
        use_gamemode: false,
        use_mangohud: false,
        injection_method: InjectionMethod::Proxy,
        loader_path: None,
        injected_dlls: vec![],
        resolution: (1280, 720),
        fps_target: None,
        sandbox_config: None,
        sandbox_data_dir: None,
        enable_linux_shield: true,
        shield_path: None,
        helper_path: None,
    };

    let result = launcher.launch(options).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_strategy_selection() {
    let launcher = Launcher;
    let options_proxy = LaunchOptions {
        exe_path: PathBuf::from("game.exe"),
        args: vec![],
        current_dir: None,
        runner: RunnerConfig {
            runner_type: RunnerType::Wine,
            path: PathBuf::from("wine"),
        },
        prefix_path: PathBuf::new(),
        use_gamescope: false,
        use_gamemode: false,
        use_mangohud: false,
        injection_method: InjectionMethod::Proxy,
        loader_path: Some(PathBuf::from("/tmp/loader")),
        injected_dlls: vec![],
        resolution: (0, 0),
        fps_target: None,
        sandbox_config: None,
        sandbox_data_dir: None,
        enable_linux_shield: true,
        shield_path: None,
        helper_path: None,
    };

    #[cfg(target_os = "linux")]
    {
        let cmd = launcher.build_command(&options_proxy).unwrap();
        let envs: Vec<_> = cmd.as_std().get_envs().collect();
        assert!(envs
            .iter()
            .any(|(k, v)| k == &std::ffi::OsStr::new("WINEDLLOVERRIDES")
                && v == &Some(std::ffi::OsStr::new("d3d11,dxgi=n,b"))));
    }

    let options_remote = LaunchOptions {
        injection_method: InjectionMethod::RemoteThread,
        loader_path: Some(PathBuf::from("/tmp/loader.dll")),
        ..options_proxy
    };

    #[cfg(not(target_os = "windows"))]
    {
        let result = launcher.launch(options_remote).await;
        assert!(result.is_err());
    }
}

#[test]
fn test_command_generation_loader_method() {
    let launcher = Launcher;
    let options = LaunchOptions {
        exe_path: PathBuf::from("game.exe"),
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
        injection_method: InjectionMethod::Loader,
        loader_path: Some(PathBuf::from("/tmp/loader")),
        injected_dlls: vec![],
        resolution: (0, 0),
        fps_target: None,
        sandbox_config: None,
        sandbox_data_dir: None,
        enable_linux_shield: true,
        shield_path: None,
        helper_path: None,
    };

    // This should succeed.
    // On Windows, it would prepare the hook (runtime) but build_command is pure logic.
    // On Linux, it builds a standard command (Proxy logic is upstream).
    let cmd = launcher.build_command(&options).unwrap();
    let std_cmd = cmd.as_std();

    // Just verify it produced a command for the game exe
    assert_eq!(std_cmd.get_program(), "game.exe");
}
