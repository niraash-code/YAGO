use crate::AppState;
use serde_json::json;
use sophon_engine::{Downloader, Provider, SophonManifest, Verifier};
use std::path::PathBuf;
use tauri::{Emitter, State};
use uuid::Uuid;

#[tauri::command]
pub async fn fetch_manifest(url: String) -> Result<SophonManifest, String> {
    let downloader = Downloader::default();
    downloader
        .download_manifest(&url)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_game(
    app: tauri::AppHandle,
    game_id: String,
    install_path: String,
) -> Result<(), String> {
    let info = Provider::fetch_game_info(&game_id)
        .await
        .map_err(|e| e.to_string())?;
    let url = info.main_package.url;
    let expected_md5 = info.main_package.md5;

    let target = PathBuf::from(&install_path);
    let file_name = url.split('/').next_back().unwrap_or("game.zip");
    let target_file = target.join(file_name);

    if !target.exists() {
        std::fs::create_dir_all(&target).map_err(|e| e.to_string())?;
    }

    let downloader = Downloader::default();
    let app_handle = app.clone();
    let error_handle = app.clone(); // Clone for error callback
    let verify_handle = app.clone(); // Clone for verification
    let game_id_clone = game_id.clone();

    tauri::async_runtime::spawn(async move {
        println!("Starting download for {} from {}", game_id_clone, url);

        let res = downloader
            .download_file(&url, &target_file, move |progress| {
                let _ = app_handle.emit(
                    "game-download-progress",
                    serde_json::json!({
                        "task_id": game_id_clone,
                        "progress": progress.overall_progress,
                        "downloaded": progress.bytes_downloaded,
                        "total": progress.total_bytes,
                        "speed": "Calculating...",
                        "eta": "Calculating..."
                    }),
                );
            })
            .await;

        if let Err(e) = res {
            eprintln!("Download failed: {}", e);
            let _ = error_handle.emit("game-download-error", e.to_string());
        } else {
            println!("Download complete. Verifying...");
            let _ = verify_handle.emit("game-download-verifying", ());

            match Verifier::verify_file(&target_file, &expected_md5).await {
                Ok(_) => {
                    println!("Verification successful.");
                    let _ = verify_handle.emit("game-download-complete", target_file);
                }
                Err(e) => {
                    eprintln!("Verification failed: {}", e);
                    let _ = verify_handle
                        .emit("game-download-error", format!("Verification Failed: {}", e));
                }
            }
        }
    });

    Ok(())
}

fn make_loader_progress_handler(window: tauri::Window, game_id: String) -> impl FnMut(u64, u64) {
    move |current, total| {
        let progress = if total > 0 {
            current as f64 / total as f64
        } else {
            0.0
        };
        let _ = window.emit(
            "loader-progress",
            json!({
                "game_id": game_id,
                "status": "Downloading",
                "progress": progress
            }),
        );
    }
}

fn make_proton_progress_handler(window: tauri::Window, version: String) -> impl FnMut(u64, u64) {
    move |current, total| {
        let progress = if total > 0 {
            current as f64 / total as f64
        } else {
            0.0
        };
        let _ = window.emit(
            "proton-progress",
            json!({
                "version": version,
                "status": "Downloading",
                "progress": progress
            }),
        );
    }
}

#[tauri::command]
pub async fn install_common_libs(
    window: tauri::Window,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let common_path = state.app_data_dir.join("loaders").join("common");
    let (common_repo_str, reshade_url) = {
        let app_config = state.app_config.lock().await;
        (
            app_config.common_loader_repo.clone(),
            app_config.reshade_url.clone(),
        )
    };

    let common_parts: Vec<&str> = common_repo_str.split('/').collect();
    if common_parts.len() != 2 {
        return Err(format!("Invalid common_loader_repo: {}", common_repo_str));
    }

    println!(
        "Loader: Installing common binaries from {}...",
        common_repo_str
    );

    let window_clone = window.clone();
    quartermaster::loader::update_loader(
        common_parts[0],
        common_parts[1],
        &common_path,
        move |curr, tot| {
            let progress = if tot > 0 {
                curr as f64 / tot as f64
            } else {
                0.0
            };
            let _ = window_clone.emit("loader-progress", json!({
            "game_id": "common", "status": "Downloading Common Assets...", "progress": progress
        }));
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    if !common_path.join("ReShade.dll").exists() {
        println!("Loader: Downloading ReShade...");
        let window_clone = window.clone();
        match quartermaster::reshade::download_reshade_dll(
            &reshade_url,
            &common_path,
            move |curr, tot| {
                let progress = if tot > 0 {
                    curr as f64 / tot as f64
                } else {
                    0.0
                };
                let _ = window_clone.emit("loader-progress", json!({
                "game_id": "common", "status": "Downloading ReShade...", "progress": progress
            }));
            },
        )
        .await
        {
            Ok(_) => println!("Loader: ReShade installed successfully."),
            Err(e) => return Err(format!("Failed to install ReShade: {}", e)),
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn download_loader(
    window: tauri::Window,
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    let path = state.app_data_dir.join("loaders").join(&game_id);
    let common_path = state.app_data_dir.join("loaders").join("common");

    let (package_repo, hash_db_url, common_repo_str, reshade_url) = {
        let dbs = state.game_dbs.lock().await;
        let db = dbs.get(&game_id);
        let config = db.and_then(|d| d.games.get(&game_id));
        let templates_guard = state.game_templates.lock().await;
        let template = templates_guard.get(&game_id);
        let app_config = state.app_config.lock().await;

        (
            config
                .and_then(|c| c.loader_repo.clone())
                .or(template.and_then(|t| t.loader_repo.clone())),
            config
                .and_then(|c| c.hash_db_url.clone())
                .or(template.and_then(|t| t.hash_db_url.clone())),
            app_config.common_loader_repo.clone(),
            app_config.reshade_url.clone(),
        )
    };

    let common_parts: Vec<&str> = common_repo_str.split('/').collect();
    if common_parts.len() == 2 {
        quartermaster::loader::update_loader(
            common_parts[0],
            common_parts[1],
            &common_path,
            |_, _| {},
        )
        .await
        .map_err(|e| e.to_string())?;
        if !common_path.join("ReShade.dll").exists() {
            let window_clone = window.clone();
            let game_id_clone = game_id.clone();
            let _ = quartermaster::reshade::download_reshade_dll(&reshade_url, &common_path, move |curr, tot| {
                let progress = if tot > 0 { curr as f64 / tot as f64 } else { 0.0 };
                let _ = window_clone.emit("loader-progress", json!({ "game_id": game_id_clone, "status": "Downloading ReShade...", "progress": progress }));
            }).await;
        }
    }

    if let Some(r) = package_repo {
        let parts: Vec<&str> = r.split('/').collect();
        if parts.len() == 2 {
            quartermaster::loader::update_loader(
                parts[0],
                parts[1],
                &path,
                make_loader_progress_handler(window, game_id.clone()),
            )
            .await
            .map_err(|e| e.to_string())?;
        }
    } else if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }

    if common_path.exists() {
        for file in [
            "d3d11.dll",
            "3DMigoto Loader.exe",
            "d3dcompiler_47.dll",
            "d3dcompiler_46.dll",
        ] {
            let src = common_path.join(file);
            if src.exists() {
                let _ = std::fs::copy(src, path.join(file));
            }
        }
    }

    if let Some(hash_url) = hash_db_url {
        let hash_dest = state
            .app_data_dir
            .join("assets/hashes")
            .join(format!("{}.json", game_id));
        let _ = quartermaster::loader::download_hash_db(&hash_url, &hash_dest).await;
    }
    Ok(())
}

#[tauri::command]
pub async fn ensure_game_resources(
    window: tauri::Window,
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    let common_path = state.app_data_dir.join("loaders").join("common");
    let game_loader_path = state.app_data_dir.join("loaders").join(&game_id);

    // 1. Check Common Libs
    let common_exists = common_path.exists()
        && common_path.join("d3d11.dll").exists()
        && common_path.join("3DMigoto Loader.exe").exists();

    if !common_exists {
        println!("EnsureResources: Common libs missing. Installing...");
        install_common_libs(window.clone(), state.clone()).await?;
    }

    // 2. Check ReShade if requested
    let reshade_needed = {
        let dbs = state.game_dbs.lock().await;
        let db = dbs.get(&game_id);
        let config = db.and_then(|d| d.games.get(&game_id));
        if let Some(c) = config {
            let p_uuid = Uuid::parse_str(&c.active_profile_id).unwrap_or_default();
            db.and_then(|d| d.profiles.get(&p_uuid))
                .map(|p| p.use_reshade)
                .unwrap_or(false)
        } else {
            false
        }
    };

    if reshade_needed && !common_path.join("ReShade.dll").exists() {
        println!("EnsureResources: ReShade missing. Downloading...");
        let reshade_url = state.app_config.lock().await.reshade_url.clone();
        let window_clone = window.clone();
        let game_id_clone = game_id.clone();
        quartermaster::reshade::download_reshade_dll(&reshade_url, &common_path, move |curr, tot| {
            let progress = if tot > 0 { curr as f64 / tot as f64 } else { 0.0 };
            let _ = window_clone.emit("loader-progress", json!({ "game_id": game_id_clone, "status": "Downloading ReShade...", "progress": progress }));
        }).await.map_err(|e| e.to_string())?;
    }

    // 3. Check Game Specific Loader
    let loader_exists = game_loader_path.exists() && game_loader_path.join("d3dx.ini").exists();
    if !loader_exists {
        println!("EnsureResources: Game loader missing. Downloading...");
        download_loader(window, state, game_id).await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn download_proton(
    window: tauri::Window,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = state.app_data_dir.join("runners");
    let app_config = state.app_config.lock().await;
    let parts: Vec<&str> = app_config.proton_repo.split('/').collect();
    if parts.len() != 2 {
        return Err("Invalid proton_repo format".to_string());
    }
    quartermaster::proton::update_ge_proton(
        parts[0],
        parts[1],
        &path,
        make_proton_progress_handler(window, "latest".to_string()),
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_setup(state: State<'_, AppState>) -> Result<bool, String> {
    let runners_dir = state.app_data_dir.join("runners");
    let loaders_dir = state.app_data_dir.join("loaders").join("common");
    let settings_path = state.app_data_dir.join("settings.json");
    let settings = state.global_settings.lock().await;
    if !settings_path.exists() {
        return Ok(false);
    }
    let has_runners = if cfg!(target_os = "linux") {
        let has_local = runners_dir.exists()
            && std::fs::read_dir(&runners_dir)
                .map(|mut d| d.next().is_some())
                .unwrap_or(false);
        let has_steam = !settings.steam_compat_tools_path.as_os_str().is_empty()
            && settings.steam_compat_tools_path.exists();
        has_local || has_steam
    } else {
        true
    };
    let has_common_loaders = loaders_dir.exists()
        && std::fs::read_dir(&loaders_dir)
            .map(|mut d| d.next().is_some())
            .unwrap_or(false);
    Ok(has_runners && has_common_loaders)
}

#[tauri::command]
pub async fn get_setup_status(
    state: State<'_, AppState>,
) -> Result<super::library::SetupStatus, String> {
    let runners_dir = state.app_data_dir.join("runners");
    let loaders_dir = state.app_data_dir.join("loaders").join("common");
    let settings = state.global_settings.lock().await;
    let mut detected_steam_path = None;
    let has_runners = if cfg!(target_os = "linux") {
        let has_local = runners_dir.exists()
            && std::fs::read_dir(&runners_dir)
                .map(|mut d| d.next().is_some())
                .unwrap_or(false);
        let steam_path_valid = !settings.steam_compat_tools_path.as_os_str().is_empty()
            && settings.steam_compat_tools_path.exists();
        if !steam_path_valid {
            if let Ok(Some(detected)) = super::library::detect_steam_proton_path_internal().await {
                detected_steam_path = Some(detected);
            }
        }
        has_local || steam_path_valid || detected_steam_path.is_some()
    } else {
        true
    };
    let has_common_loaders = loaders_dir.exists()
        && std::fs::read_dir(&loaders_dir)
            .map(|mut d| d.next().is_some())
            .unwrap_or(false);
    Ok(super::library::SetupStatus {
        has_runners,
        has_common_loaders,
        detected_steam_path,
    })
}
