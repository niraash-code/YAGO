use loader_ctl::LoaderContext;
use proc_marshal::{InjectionMethod, LaunchOptions, Launcher, RunnerConfig, RunnerType};
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tempfile::tempdir;

#[tokio::test]
async fn test_game_launch_with_real_fake_process() {
    let dir = tempdir().unwrap();
    let game_dir = dir.path().join("GameDir");
    std::fs::create_dir(&game_dir).unwrap();

    let project_root = std::env::current_dir().unwrap();
    let fake_exe_src = project_root.join("../../testing/fake_game/GenshinImpact.exe");
    if !fake_exe_src.exists() {
        panic!("Fake executable not found at {:?}. Run rustc testing/fake_game/main.rs -o testing/fake_game/GenshinImpact.exe first.", fake_exe_src);
    }

    let exe_path = game_dir.join("GenshinImpact.exe");
    std::fs::copy(&fake_exe_src, &exe_path).unwrap();

    let prefix_path = dir.path().join("dummy_prefix");
    std::fs::create_dir_all(prefix_path.join("pfx")).unwrap();

    let loader_dir = dir.path().join("mock_loader");
    std::fs::create_dir(&loader_dir).unwrap();
    File::create(loader_dir.join("d3d11.dll")).unwrap();

    LoaderContext::install_proxy(&game_dir, &loader_dir, "GenshinImpact.exe")
        .await
        .unwrap();

    let options = LaunchOptions {
        exe_path: exe_path.clone(),
        args: vec!["--test-arg".to_string()],
        current_dir: Some(game_dir.clone()),
        runner: RunnerConfig {
            runner_type: RunnerType::Native,
            path: PathBuf::new(),
        },
        prefix_path: prefix_path.clone(),
        use_gamescope: false,
        use_gamemode: false,
        use_mangohud: false,
        injection_method: InjectionMethod::Proxy,
        loader_path: None,
        resolution: (1280, 720),
        injected_dlls: vec![],
        fps_target: None,
        sandbox_config: None,
        sandbox_data_dir: None,
        enable_linux_shield: true,
        shield_path: None,
    };

    let launcher = Launcher;
    launcher
        .launch(options)
        .await
        .expect("Spawning fake process failed");

    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    proc_marshal::Monitor::kill_by_name("GenshinImpact.exe");

    let log_path = game_dir.join("yago_test_log.txt");
    assert!(
        log_path.exists(),
        "Log file was not created by fake process at {:?}",
        log_path
    );

    let log_content = std::fs::read_to_string(log_path).unwrap();
    assert!(log_content.contains("YAGO FAKE GAME START"));
}

#[tokio::test]
async fn test_game_kill_flow() {
    let dir = tempdir().unwrap();
    let game_dir = dir.path().join("GameDirKill");
    std::fs::create_dir(&game_dir).unwrap();

    let project_root = std::env::current_dir().unwrap();
    let fake_exe_src = project_root.join("../../testing/fake_game/GenshinImpact.exe");
    let exe_path = game_dir.join("GenshinImpact.exe");
    std::fs::copy(&fake_exe_src, &exe_path).unwrap();

    let prefix_path = dir.path().join("dummy_prefix_kill");
    std::fs::create_dir_all(prefix_path.join("pfx")).unwrap();

    let options = LaunchOptions {
        exe_path: exe_path.clone(),
        args: vec![],
        current_dir: Some(game_dir.clone()),
        runner: RunnerConfig {
            runner_type: RunnerType::Native,
            path: PathBuf::new(),
        },
        prefix_path: prefix_path.clone(),
        use_gamescope: false,
        use_gamemode: false,
        use_mangohud: false,
        injection_method: InjectionMethod::Proxy,
        loader_path: None,
        resolution: (1280, 720),
        injected_dlls: vec![],
        fps_target: None,
        sandbox_config: None,
        sandbox_data_dir: None,
        enable_linux_shield: true,
        shield_path: None,
    };

    let launcher = Launcher;
    launcher.launch(options).await.expect("Failed to launch");

    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    let killed = proc_marshal::Monitor::kill_by_name("GenshinImpact.exe");
    assert!(killed);
}

#[tokio::test]
#[cfg(unix)]
async fn test_proton_launch_mock() {
    let dir = tempdir().unwrap();
    let game_dir = dir.path().join("Game");
    std::fs::create_dir(&game_dir).unwrap();
    let game_exe = game_dir.join("game.exe");
    File::create(&game_exe).unwrap();

    let tools_dir = dir.path().join("steam_tools");
    std::fs::create_dir(&tools_dir).unwrap();

    let proton_script = tools_dir.join("proton");
    let mut f = std::fs::File::create(&proton_script).unwrap();

    use std::os::unix::fs::PermissionsExt;
    let mut perms = f.metadata().unwrap().permissions();
    perms.set_mode(0o755);
    f.set_permissions(perms).unwrap();

    let output_log = dir.path().join("proton_log.txt");
    let script_content = format!(
        r#"#!/bin/sh
echo "ARGS: $@" > "{}"
echo "COMPAT_DATA: $STEAM_COMPAT_DATA_PATH" >> "{}"
"#,
        output_log.display(),
        output_log.display()
    );

    write!(f, "{}", script_content).unwrap();
    drop(f);

    let options = LaunchOptions {
        exe_path: game_exe.clone(),
        args: vec!["--game-arg".to_string()],
        current_dir: Some(game_dir),
        runner: RunnerConfig {
            runner_type: RunnerType::Proton,
            path: proton_script,
        },
        prefix_path: dir.path().join("pfx"),
        use_gamescope: false,
        use_gamemode: false,
        use_mangohud: false,
        injection_method: InjectionMethod::Proxy,
        loader_path: None,
        resolution: (1280, 720),
        injected_dlls: vec![],
        fps_target: None,
        sandbox_config: None,
        sandbox_data_dir: None,
        enable_linux_shield: true,
        shield_path: None,
    };

    let launcher = Launcher;
    launcher
        .launch(options)
        .await
        .expect("Failed to launch proton mock");

    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    let log = std::fs::read_to_string(&output_log).expect("Proton log not found");
    assert!(log.contains("ARGS: run"));
    assert!(log.contains("game.exe"));
}
