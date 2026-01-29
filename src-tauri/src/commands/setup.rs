use crate::AppState;
use sophon_engine::SophonClient;
use tauri::State;

#[tauri::command]
pub async fn check_setup(state: State<'_, AppState>) -> Result<bool, String> {
    // 1. Check if settings.json exists
    let settings_path = state.app_data_dir.join("settings.json");
    if !settings_path.exists() {
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
        return Ok(false);
    }

    Ok(true)
}

#[tauri::command]
pub async fn get_setup_status(state: State<'_, AppState>) -> Result<super::library::SetupStatus, String> {
    let settings = state.global_settings.lock().await;
    let base_storage = if settings.yago_storage_path.as_os_str().is_empty() {
        state.app_data_dir.clone()
    } else {
        settings.yago_storage_path.clone()
    };
    drop(settings);

    let runners_dir = base_storage.join("runners");
    let has_runners = runners_dir.exists() && std::fs::read_dir(runners_dir).map(|e| e.count() > 0).unwrap_or(false);

    let common_loaders = base_storage.join("loaders").join("common");
    let has_common_loaders = common_loaders.exists()
        && common_loaders.join("d3d11.dll").exists();

    let detected_steam = crate::commands::library::detect_steam_proton_path_internal().await.unwrap_or(None);

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
    _app: tauri::AppHandle,
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
    // Logic to download from GitHub
    Ok(())
}

#[tauri::command]
pub async fn download_loader(
    _app: tauri::AppHandle,
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
            let main_ini = path.join("main.ini");
            let d3dx_ini = path.join("d3dx.ini");
            if main_ini.exists() && !d3dx_ini.exists() {
                let _ = std::fs::rename(main_ini, d3dx_ini);
            }
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
                    std::fs::copy(src, dest).map_err(|e| e.to_string())?;
                }
            }
        }
    }

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
    let common_exists = common_path.exists()
        && common_path.join("d3d11.dll").exists();

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
    _app: tauri::AppHandle,
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
    println!("Downloading Proton from {} to {:?}", repo, base_storage.join("runners"));
    Ok(())
}
