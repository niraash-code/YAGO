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

    let repo_full = {
        let config = state.app_config.lock().await;
        config.common_loader_repo.clone()
    };

    let parts: Vec<&str> = repo_full.split('/').collect();
    if parts.len() != 2 {
        return Err("Invalid common_loader_repo format".to_string());
    }
    let owner = parts[0];
    let repo = parts[1];

    println!(
        "Installing common libs from {} to {:?}",
        repo_full, common_path
    );

    // 1. Get Latest Release
    let release = quartermaster::github::get_latest_release(owner, repo)
        .await
        .map_err(|e| e.to_string())?;

    let asset = release
        .assets
        .iter()
        .find(|a| a.name.ends_with(".zip"))
        .ok_or_else(|| "No zip asset found in latest release".to_string())?;

    // 2. Download to temp
    let temp_zip = state.app_data_dir.join("cache").join("temp_common.zip");
    if let Some(parent) = temp_zip.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let app_clone = app.clone();
    quartermaster::download_file(
        &asset.browser_download_url,
        &temp_zip,
        move |current, total| {
            let progress = current as f64 / total as f64;
            let _ = app_clone.emit(
                "loader-progress",
                super::library::LoaderProgress {
                    game_id: "common".to_string(),
                    status: "Downloading...".to_string(),
                    progress,
                },
            );
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    // 3. Extract
    let extract_dir = common_path.join("_tmp_extract");
    if extract_dir.exists() {
        let _ = std::fs::remove_dir_all(&extract_dir);
    }
    std::fs::create_dir_all(&extract_dir).map_err(|e| e.to_string())?;

    fs_engine::extract_and_sanitize(&temp_zip, &extract_dir).map_err(|e| e.to_string())?;

    // 4. Move required files to common root
    // We look for d3d11.dll, 3dmloader.dll, etc. recursively in extract_dir
    let walker = walkdir::WalkDir::new(&extract_dir);
    for entry in walker.into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let fname = entry.file_name().to_string_lossy().to_lowercase();
            if fname == "d3d11.dll"
                || fname == "3dmloader.dll"
                || fname == "dxgi.dll"
                || fname == "d3dcompiler_47.dll"
            {
                let dest = common_path.join(entry.file_name());
                let _ = std::fs::copy(entry.path(), dest);
            }
        }
    }

    // 5. Cleanup
    let _ = std::fs::remove_dir_all(&extract_dir);
    let _ = std::fs::remove_file(&temp_zip);

    let _ = app.emit(
        "loader-progress",
        super::library::LoaderProgress {
            game_id: "common".to_string(),
            status: "Done".to_string(),
            progress: 1.0,
        },
    );

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

    if let Some(repo_full) = {
        let guard = state.game_templates.lock().await;
        guard.get(&game_id).and_then(|t| t.loader_repo.clone())
    } {
        if !path.exists() {
            std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;

            let parts: Vec<&str> = repo_full.split('/').collect();
            if parts.len() == 2 {
                let owner = parts[0];
                let repo = parts[1];

                println!("Downloading loader for {} from {}", game_id, repo_full);

                if let Ok(release) = quartermaster::github::get_latest_release(owner, repo).await {
                    if let Some(asset) = release.assets.iter().find(|a| a.name.ends_with(".zip")) {
                        let temp_zip = state
                            .app_data_dir
                            .join("cache")
                            .join(format!("temp_{}.zip", game_id));

                        let app_clone = app.clone();
                        let gid_clone = game_id.clone();
                        let _ = quartermaster::download_file(
                            &asset.browser_download_url,
                            &temp_zip,
                            move |current, total| {
                                let progress = current as f64 / total as f64;
                                let _ = app_clone.emit(
                                    "loader-progress",
                                    super::library::LoaderProgress {
                                        game_id: gid_clone.clone(),
                                        status: "Downloading...".to_string(),
                                        progress,
                                    },
                                );
                            },
                        )
                        .await;

                        if temp_zip.exists() {
                            let _ = fs_engine::extract_and_sanitize(&temp_zip, &path);
                            let _ = std::fs::remove_file(temp_zip);
                        }
                    }
                }
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
                    let _ = std::fs::copy(src, dest);
                }
            }
        }
    }

    let _ = app.emit(
        "loader-progress",
        super::library::LoaderProgress {
            game_id: game_id.clone(),
            status: "Done".to_string(),
            progress: 1.0,
        },
    );

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

    let repo_full = {
        let config = state.app_config.lock().await;
        config.proton_repo.clone()
    };

    let parts: Vec<&str> = repo_full.split('/').collect();
    if parts.len() != 2 {
        return Err("Invalid proton_repo format".to_string());
    }
    let owner = parts[0];
    let repo = parts[1];

    let runners_dir = base_storage.join("runners");
    if !runners_dir.exists() {
        std::fs::create_dir_all(&runners_dir).map_err(|e| e.to_string())?;
    }

    println!("Downloading Proton from {} to {:?}", repo_full, runners_dir);

    // 1. Get Latest Release
    let release = quartermaster::github::get_latest_release(owner, repo)
        .await
        .map_err(|e| e.to_string())?;

    let asset = release
        .assets
        .iter()
        .find(|a| a.name.ends_with(".tar.gz"))
        .ok_or_else(|| "No tar.gz asset found in latest release".to_string())?;

    // 2. Download
    let temp_tar = state.app_data_dir.join("cache").join("temp_proton.tar.gz");
    if let Some(parent) = temp_tar.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let app_clone = app.clone();
    quartermaster::download_file(
        &asset.browser_download_url,
        &temp_tar,
        move |current, total| {
            let progress = current as f64 / total as f64;
            let _ = app_clone.emit(
                "proton-progress",
                super::library::ProtonProgress {
                    version: "Latest".to_string(),
                    status: "Downloading...".to_string(),
                    progress,
                },
            );
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    // 3. Extract
    // Note: fs_engine handles tar.gz via extract_targz
    fs_engine::extract_targz(&temp_tar, &runners_dir)
        .map_err(|e: fs_engine::FsError| e.to_string())?;

    // 4. Cleanup
    let _ = std::fs::remove_file(&temp_tar);

    let _ = app.emit(
        "proton-progress",
        super::library::ProtonProgress {
            version: "Latest".to_string(),
            status: "Done".to_string(),
            progress: 1.0,
        },
    );

    Ok(())
}
