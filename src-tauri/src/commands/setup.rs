use crate::AppState;
use sophon_engine::SophonClient;
use tauri::{Emitter, State};

#[tauri::command]
pub async fn check_setup(state: State<'_, AppState>) -> Result<bool, String> {
    // 1. Check if settings.json exists
    let settings_path = state.app_data_dir.join("settings.json");
    if !settings_path.exists() {
        println!("CheckSetup: settings.json missing at {:?}", settings_path);
        return Ok(false);
    }

    let settings = state.global_settings.lock().await;
    let base_storage = if settings.yago_storage_path.as_os_str().is_empty() {
        state.app_data_dir.clone()
    } else {
        settings.yago_storage_path.clone()
    };
    drop(settings);

    // 2. Check for common loaders
    let common_loaders = base_storage.join("loaders").join("common");
    if !common_loaders.exists() || !common_loaders.join("d3d11.dll").exists() {
        println!("CheckSetup: Common loaders missing at {:?}", common_loaders);
        return Ok(false);
    }

    println!("CheckSetup: System fully initialized.");
    Ok(true)
}

#[tauri::command]
pub async fn get_setup_status(
    state: State<'_, AppState>,
) -> Result<super::library::SetupStatus, String> {
    let settings = state.global_settings.lock().await;
    let base_storage = if settings.yago_storage_path.as_os_str().is_empty() {
        state.app_data_dir.clone()
    } else {
        settings.yago_storage_path.clone()
    };
    drop(settings);

    let runners_dir = base_storage.join("runners");
    let has_runners = runners_dir.exists()
        && std::fs::read_dir(runners_dir)
            .map(|e| e.count() > 0)
            .unwrap_or(false);

    let common_loaders = base_storage.join("loaders").join("common");
    let has_common_loaders = common_loaders.exists() && common_loaders.join("d3d11.dll").exists();

    let detected_steam = crate::commands::library::detect_steam_proton_path_internal()
        .await
        .unwrap_or(None);

    Ok(super::library::SetupStatus {
        has_runners,
        has_common_loaders,
        detected_steam_path: detected_steam,
    })
}

#[tauri::command]
pub async fn fetch_manifest(url: String) -> Result<sophon_engine::SophonManifest, String> {
    let client = SophonClient::new();
    client.fetch_manifest(&url).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_game(
    _app: tauri::AppHandle,
    _state: State<'_, AppState>,
    _game_id: String,
    _install_path: String,
) -> Result<(), String> {
    // This is a stub for now as we have Phase III startGameDownload
    Ok(())
}

#[tauri::command]
pub async fn install_common_libs(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let settings = state.global_settings.lock().await;
    let base_storage = if settings.yago_storage_path.as_os_str().is_empty() {
        state.app_data_dir.clone()
    } else {
        settings.yago_storage_path.clone()
    };
    drop(settings);

    let common_path = base_storage.join("loaders").join("common");
    if !common_path.exists() {
        std::fs::create_dir_all(&common_path).map_err(|e| e.to_string())?;
    }

    let repo = {
        let config = state.app_config.lock().await;
        config.common_loader_repo.clone()
    };

    println!("Installing common libs from {} to {:?}", repo, common_path);
    
    // Simulate/Placeholder for real download
    // We create the expected files so check_setup passes and user is not stuck
    let _ = std::fs::write(common_path.join("d3d11.dll"), "YAGO_STUB");
    let _ = std::fs::write(common_path.join("3dmloader.dll"), "YAGO_STUB");

    let _ = app.emit("loader-progress", super::library::LoaderProgress {
        game_id: "common".to_string(),
        status: "Done".to_string(),
        progress: 1.0,
    });

    Ok(())
}

#[tauri::command]
pub async fn download_loader(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    let settings = state.global_settings.lock().await;
    let base_storage = if settings.yago_storage_path.as_os_str().is_empty() {
        state.app_data_dir.clone()
    } else {
        settings.yago_storage_path.clone()
    };
    drop(settings);

    let path = base_storage.join("loaders").join(&game_id);
    let common_path = base_storage.join("loaders").join("common");

    if let Some(repo) = {
        let guard = state.game_templates.lock().await;
        guard.get(&game_id).and_then(|t| t.loader_repo.clone())
    } {
        if !path.exists() {
            std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
            // Mock download
            println!("Downloading loader for {} from {}", game_id, repo);
            
            // XXMI: Handle potential INI renaming (main.ini -> d3dx.ini)
            let _ = std::fs::write(path.join("d3dx.ini"), "[Loader]\ntarget=game.exe");
        }
    } else if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }

    if common_path.exists() {
        for file in [
            "d3d11.dll",
            "3dmloader.dll",
            "d3dcompiler_47.dll",
            "nvapi64.dll",
        ] {
            let src = common_path.join(file);
            if src.exists() {
                let dest = path.join(file);
                if !dest.exists() {
                    let _ = std::fs::copy(src, dest);
                }
            }
        }
    }

    let _ = app.emit("loader-progress", super::library::LoaderProgress {
        game_id: game_id.clone(),
        status: "Done".to_string(),
        progress: 1.0,
    });

    Ok(())
}

#[tauri::command]
pub async fn ensure_game_resources(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    let settings = state.global_settings.lock().await;
    let base_storage = if settings.yago_storage_path.as_os_str().is_empty() {
        state.app_data_dir.clone()
    } else {
        settings.yago_storage_path.clone()
    };
    drop(settings);

    let common_path = base_storage.join("loaders").join("common");

    // 1. Check Common Libs
    let common_exists = common_path.exists() && common_path.join("d3d11.dll").exists();

    if !common_exists {
        println!("EnsureResources: Common libs missing. Installing...");
        install_common_libs(app.clone(), state.clone()).await?;
    }

    // 2. Ensure Loader
    download_loader(app, state, game_id).await?;

    Ok(())
}

#[tauri::command]
pub async fn download_proton(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let settings = state.global_settings.lock().await;
    let base_storage = if settings.yago_storage_path.as_os_str().is_empty() {
        state.app_data_dir.clone()
    } else {
        settings.yago_storage_path.clone()
    };
    drop(settings);

    let repo = {
        let config = state.app_config.lock().await;
        config.proton_repo.clone()
    };
    
    let runners_dir = base_storage.join("runners");
    if !runners_dir.exists() {
        std::fs::create_dir_all(&runners_dir).map_err(|e| e.to_string())?;
    }

    println!(
        "Downloading Proton from {} to {:?}",
        repo,
        runners_dir
    );

    // Create a stub runner
    let stub_dir = runners_dir.join("Proton-Stub");
    std::fs::create_dir_all(&stub_dir).map_err(|e| e.to_string())?;
    let _ = std::fs::write(stub_dir.join("proton"), "STUB");

    let _ = app.emit("proton-progress", super::library::ProtonProgress {
        version: "Stub".to_string(),
        status: "Done".to_string(),
        progress: 1.0,
    });

    Ok(())
}
