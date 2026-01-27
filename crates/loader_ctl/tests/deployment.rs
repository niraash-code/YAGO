use loader_ctl::*;
use std::fs::File;
use std::path::Path;
use tempfile::tempdir;

#[tokio::test]
async fn test_loader_deployment() {
    let dir = tempdir().unwrap();
    let game_dir = dir.path().join("game");
    let loader_source_dir = dir.path().join("loader_src");

    std::fs::create_dir(&game_dir).unwrap();
    std::fs::create_dir(&loader_source_dir).unwrap();
    File::create(loader_source_dir.join("d3d11.dll")).unwrap();

    LoaderContext::install_proxy(&game_dir, &loader_source_dir, "game.exe")
        .await
        .unwrap();

    assert!(game_dir.join("d3d11.dll").exists());

    // Cleanup
    LoaderContext::uninstall_loader(&game_dir, None)
        .await
        .unwrap();
    assert!(!game_dir.join("d3d11.dll").exists());
}

#[tokio::test]
async fn test_ensure_loader_non_existent_source() {
    let res = LoaderContext::install_proxy(
        Path::new("game"),
        Path::new("non_existent_loader"),
        "game.exe",
    )
    .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_loader_chaining() {
    let dir = tempdir().unwrap();
    let game_dir = dir.path().join("game");
    let library_root = dir.path().join("library");

    let game_lib = library_root.join("test_game");
    let common_lib = library_root.join("common");
    std::fs::create_dir_all(&game_lib).unwrap();
    std::fs::create_dir_all(&common_lib).unwrap();
    std::fs::create_dir_all(&game_dir).unwrap();

    File::create(game_lib.join("d3d11.dll")).unwrap();
    std::fs::write(game_lib.join("d3dx.ini"), "[Loader]\ntarget=game.exe").unwrap();
    File::create(common_lib.join("ReShade.dll")).unwrap();

    let options = InstallOptions {
        game_id: "test_game".to_string(),
        install_reshade: true,
        injection_method: None,
    };

    LoaderContext::install_loader(&game_dir, &library_root, options)
        .await
        .unwrap();

    assert!(game_dir.join("d3d11.dll").exists());
    assert!(game_dir.join("dxgi.dll").exists());
}

#[tokio::test]
async fn test_reshade_dual_proxy_reproduction() {
    let dir = tempdir().unwrap();
    let game_dir = dir.path().join("game");
    let library_root = dir.path().join("library");
    let game_lib = library_root.join("test_game");
    let common_lib = library_root.join("common");

    std::fs::create_dir_all(&game_lib).unwrap();
    std::fs::create_dir_all(&common_lib).unwrap();
    std::fs::create_dir_all(&game_dir).unwrap();

    File::create(game_lib.join("d3d11.dll")).unwrap();
    std::fs::write(game_lib.join("d3dx.ini"), "[Loader]\ntarget=game.exe").unwrap();
    File::create(common_lib.join("ReShade.dll")).unwrap();

    let options = InstallOptions {
        game_id: "test_game".to_string(),
        install_reshade: true,
        injection_method: None,
    };

    LoaderContext::install_loader(&game_dir, &library_root, options.clone())
        .await
        .unwrap();

    let ini_path = game_dir.join("d3dx.ini");
    assert!(game_dir.join("dxgi.dll").exists());

    let options_disable = InstallOptions {
        game_id: "test_game".to_string(),
        install_reshade: false,
        injection_method: None,
    };
    LoaderContext::install_loader(&game_dir, &library_root, options_disable)
        .await
        .unwrap();

    let content_after = std::fs::read_to_string(&ini_path).unwrap();
    assert!(!content_after.contains("proxy_d3d11 = ReShade.dll"));
    assert!(!game_dir.join("dxgi.dll").exists());
}

#[tokio::test]
async fn test_reshade_only_strategy() {
    let dir = tempdir().unwrap();
    let game_dir = dir.path().join("game");
    let library_root = dir.path().join("library");
    let common_lib = library_root.join("common");

    std::fs::create_dir_all(&game_dir).unwrap();
    std::fs::create_dir_all(&common_lib).unwrap();

    File::create(common_lib.join("ReShade.dll")).unwrap();
    File::create(game_dir.join("dxgi.dll")).unwrap();

    let options = InstallOptions {
        game_id: "test_game".to_string(),
        install_reshade: true,
        injection_method: Some("ReShadeOnly".to_string()),
    };

    LoaderContext::install_loader(&game_dir, &library_root, options)
        .await
        .unwrap();

    assert!(game_dir.join("dxgi.dll").exists());
    assert!(!game_dir.join("d3d11.dll").exists());
}

#[tokio::test]
async fn test_uninstall_loader() {
    let dir = tempdir().unwrap();
    let game_dir = dir.path().join("game");
    std::fs::create_dir(&game_dir).unwrap();

    File::create(game_dir.join("d3d11.dll")).unwrap();
    File::create(game_dir.join("d3dx.ini")).unwrap();
    File::create(game_dir.join("dxgi.dll")).unwrap();
    File::create(game_dir.join("random_file.txt")).unwrap();

    LoaderContext::uninstall_loader(&game_dir, None)
        .await
        .unwrap();

    assert!(!game_dir.join("d3d11.dll").exists());
    assert!(!game_dir.join("d3dx.ini").exists());
    assert!(!game_dir.join("dxgi.dll").exists());
    assert!(game_dir.join("random_file.txt").exists());
}
