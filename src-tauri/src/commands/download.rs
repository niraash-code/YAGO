use crate::AppState;
use librarian::models::InstallStatus;
use sophon_engine::{ChunkOrchestrator, OrchestratorEvent, SophonClient};
use tauri::{Emitter, Manager, State};
use tokio::sync::mpsc;

#[tauri::command]
pub async fn start_game_download(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    selected_category_ids: Vec<String>,
) -> Result<(), String> {
    // 1. Validation & Initialization
    let dbs = state.game_dbs.lock().await;
    let db = dbs
        .get(&game_id)
        .ok_or_else(|| format!("Game {} not found", game_id))?;
    let config = db
        .games
        .get(&game_id)
        .ok_or_else(|| format!("Config for {} missing", game_id))?;

    if config.install_status == InstallStatus::Downloading {
        return Err("Download already in progress".to_string());
    }

    let install_path = config.install_path.clone();
    if install_path.as_os_str().is_empty() {
        return Err("Installation path not set".to_string());
    }

    let templates = state.game_templates.lock().await;
    let template = templates.get(&game_id).ok_or("Template not found")?;

    // 2. Fetch Manifest & Build Info
    let client = SophonClient::new();
    let build = client
        .get_build(
            &template.sophon_branch,
            &template.sophon_package_id,
            &template.sophon_password,
            &template.sophon_plat_app,
        )
        .await
        .map_err(|e| e.to_string())?;

    let mut manifest = client
        .fetch_manifest(&build.manifest_url)
        .await
        .map_err(|e| e.to_string())?;

    // 3. Filter Manifest Categories
    // Keep only selected categories
    manifest.files.retain(|file| {
        if let Some(cat_id) = &file.category_id {
            selected_category_ids.contains(cat_id)
        } else {
            true // Keep mandatory files
        }
    });

    // 4. Setup Control Channel
    let (tx_pause, rx_pause) = tokio::sync::watch::channel(false);
    let mut controls = state.download_controls.lock().await;
    controls.insert(game_id.clone(), tx_pause);

    // 5. Update Status
    drop(controls);
    drop(templates);
    drop(dbs);

    update_game_status(&state, &game_id, InstallStatus::Downloading).await?;
    let _ = app.emit("library-updated", state.game_dbs.lock().await.clone());

    // 6. Spawn Orchestrator
    let orchestrator = ChunkOrchestrator::new(
        game_id.clone(),
        client,
        manifest,
        install_path,
        build.chunk_base_url,
        8, // TODO: Configurable worker count
    );

    let app_clone = app.clone();
    let game_id_clone = game_id.clone();

    tauri::async_runtime::spawn(async move {
        let (tx_events, mut rx_events) = mpsc::channel(100);

        let orchestrator_handle =
            tokio::spawn(async move { orchestrator.run(tx_events, rx_pause).await });

        while let Some(event) = rx_events.recv().await {
            match event {
                OrchestratorEvent::Progress(progress) => {
                    let _ = app_clone.emit("download-progress", progress);
                }
                OrchestratorEvent::Error { chunk_id, error } => {
                    eprintln!("Download Error for {}: {}", chunk_id, error);
                    let _ = app_clone.emit("download-error", format!("{}: {}", chunk_id, error));
                }
                OrchestratorEvent::Completed => {
                    println!("Download completed for {}", game_id_clone);
                    let _ = update_game_status_internal(
                        &app_clone,
                        &game_id_clone,
                        InstallStatus::Installed,
                    )
                    .await;
                    let _ = app_clone.emit("download-complete", game_id_clone.clone());
                }
                _ => {}
            }
        }

        let _ = orchestrator_handle.await;
    });

    Ok(())
}

#[tauri::command]
pub async fn pause_game_download(
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    let controls = state.download_controls.lock().await;
    if let Some(tx) = controls.get(&game_id) {
        let _ = tx.send(true);
        Ok(())
    } else {
        Err("No active download found for this game".to_string())
    }
}

#[tauri::command]
pub async fn resume_game_download(
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    let controls = state.download_controls.lock().await;
    if let Some(tx) = controls.get(&game_id) {
        let _ = tx.send(false);
        Ok(())
    } else {
        Err("No active download found for this game".to_string())
    }
}

async fn update_game_status(
    state: &State<'_, AppState>,
    game_id: &str,
    status: InstallStatus,
) -> Result<(), String> {
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(game_id) {
        if let Some(config) = db.games.get_mut(game_id) {
            config.install_status = status;
            state
                .librarian
                .save_game_db(game_id, db)
                .await
                .map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    Err("Game not found in library".to_string())
}

async fn update_game_status_internal(
    app: &tauri::AppHandle,
    game_id: &str,
    status: InstallStatus,
) -> Result<(), String> {
    let state: State<'_, AppState> = app.state();
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(game_id) {
        if let Some(config) = db.games.get_mut(game_id) {
            config.install_status = status;
            state
                .librarian
                .save_game_db(game_id, db)
                .await
                .map_err(|e| e.to_string())?;
            let _ = app.emit("library-updated", dbs.clone());
            return Ok(());
        }
    }
    Err("Game not found in library".to_string())
}
