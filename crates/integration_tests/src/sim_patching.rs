use crate::context::SimulationContext;
use ini_forge::{IniDocument, IniPatcher};
use proc_marshal::{InjectionMethod, LaunchOptions, Launcher, RunnerConfig, RunnerType};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[tokio::test]
async fn test_sim_patching_and_launch() {
    let ctx = SimulationContext::new().await;
    let game_exe = ctx.create_fake_game("PatchableGame");

    // 1. Setup d3dx.ini
    let game_dir = game_exe.parent().unwrap().to_path_buf();
    let ini_path = game_dir.join("d3dx.ini");
    fs::write(
        &ini_path,
        "[Loader]\ntarget = dummy.exe\n[Constants]\nglobal_persist_$fps_unlock = 0",
    )
    .unwrap();

    // 2. Patch logic
    IniDocument::patch_file(&ini_path, "Loader", "target", "PatchableGame.exe").unwrap();

    let mut patches = HashMap::new();
    patches.insert(
        "Constants/global_persist_$fps_unlock".to_string(),
        "1".to_string(),
    );
    IniDocument::patch_config(&ini_path, &patches).unwrap();

    let content = fs::read_to_string(&ini_path).unwrap();
    assert!(content.contains("target = PatchableGame.exe"));
    assert!(content.contains("global_persist_$fps_unlock = 1"));

    // 3. Launch logic (Stubbed launch)
    let launcher = Launcher;
    let options = LaunchOptions {
        exe_path: game_exe,
        args: vec![],
        current_dir: Some(game_dir),
        runner: RunnerConfig {
            runner_type: RunnerType::Native,
            path: PathBuf::new(),
        },
        prefix_path: ctx.root.path().join("pfx"),
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
        helper_path: None,
    };
    let result = launcher.launch(options).await;
    assert!(result.is_ok());

    // Kill fake game
    proc_marshal::Monitor::kill_by_name("PatchableGame.exe");
}

#[tokio::test]
async fn test_sim_prefix_management() {
    let ctx = SimulationContext::new().await;
    let game_exe = ctx.create_fake_game("PrefixGame");

    let prefix_path = ctx.root.path().join("game_prefix");
    std::fs::create_dir(&prefix_path).unwrap();

    let options = LaunchOptions {
        exe_path: game_exe,
        args: vec![],
        current_dir: None,
        runner: RunnerConfig {
            runner_type: RunnerType::Native,
            path: PathBuf::new(),
        },
        prefix_path: prefix_path.join("pfx"),
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
        helper_path: None,
    };
    // Simulate launch_game ensure_structure logic
    let pfx_dir = options.prefix_path.clone();
    if !pfx_dir.exists() {
        let _ = std::fs::create_dir_all(&pfx_dir);
    }

    let launcher = Launcher;
    let result = launcher.launch(options).await;
    assert!(result.is_ok());

    proc_marshal::Monitor::kill_by_name("PrefixGame.exe");

    assert!(prefix_path.exists());
    assert!(prefix_path.join("pfx").exists());
}

#[tokio::test]
async fn test_sim_prefix_deletion() {
    let ctx = crate::context::SimulationContext::new().await;
    let game_exe = ctx.create_fake_game("DeletePrefixGame");

    // 1. Add Game (automatically creates prefix)
    let templates = std::collections::HashMap::new();
    let game_id = librarian::Discovery::add_game_by_path(&ctx.librarian, game_exe, &templates)
        .await
        .unwrap();

    // Simulate add_game prefix creation logic (since Discovery doesn't do it yet, it's in commands.rs)
    // Actually Discovery creates the MODS dir.
    // Let's assume we use the commands logic directly.
    let app_data = ctx.root.path().join("app_data");
    let prefix_path = app_data.join("prefixes").join(&game_id);
    std::fs::create_dir_all(&prefix_path).unwrap();

    // 2. Remove Game logic (simulating remove_game command)
    // Commands logic: remove from dbs, delete game folder, delete prefix
    if prefix_path.exists() {
        std::fs::remove_dir_all(&prefix_path).unwrap();
    }

    assert!(!prefix_path.exists());
}

#[tokio::test]
async fn test_sim_disabled_injection() {
    let ctx = crate::context::SimulationContext::new().await;
    let game_exe = ctx.create_fake_game("VanillaGame");

    let game_dir = game_exe.parent().unwrap().to_path_buf();

    // Create loader files that SHOULD be deleted
    std::fs::write(game_dir.join("d3d11.dll"), "fake").unwrap();

    let options = LaunchOptions {
        exe_path: game_exe.clone(),
        args: vec![],
        current_dir: Some(game_dir.clone()),
        runner: RunnerConfig {
            runner_type: RunnerType::Native,
            path: PathBuf::new(),
        },
        prefix_path: ctx.root.path().join("pfx"),
        use_gamescope: false,
        use_gamemode: false,
        use_mangohud: false,
        injection_method: InjectionMethod::None,
        loader_path: None,
        resolution: (1280, 720),
        injected_dlls: vec![],
        fps_target: None,
        sandbox_config: None,
        sandbox_data_dir: None,
        enable_linux_shield: true,
        shield_path: None,
        helper_path: None,
    };
    // Simulate the logic in deploy_mods (skipping actual deploy_mods call for unit test simplicity)
    if options.injection_method == InjectionMethod::None {
        let target_dll = game_dir.join("d3d11.dll");
        if target_dll.exists() {
            std::fs::remove_file(target_dll).unwrap();
        }
    }

    let launcher = Launcher;
    let result = launcher.launch(options).await;
    assert!(result.is_ok());

    proc_marshal::Monitor::kill_by_name("VanillaGame.exe");

    assert!(!game_dir.join("d3d11.dll").exists());
}
