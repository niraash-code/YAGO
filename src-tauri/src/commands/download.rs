use crate::AppState;
use librarian::models::InstallStatus;
use sophon_engine::orchestrator::ProgressDetailed;
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
    // 1. Validation & Initialization (Scoped lock)
    let (install_path, template) = {
        let templates = state.game_templates.lock().await;
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

        let template = templates.get(&game_id).ok_or("Template not found")?.clone();
        (install_path, template)
    };

    // 2. Fetch Manifest & Build Info (No lock held)
    let client = SophonClient::new();
    let build = client
        .get_build(
            &template.sophon_branch,
            &template.sophon_package_id,
            &template.sophon_password,
            &template.sophon_plat_app,
            &template.sophon_game_biz,
            &template.sophon_launcher_id,
            &template.sophon_channel_id,
            &template.sophon_sub_channel_id,
        )
        .await
        .map_err(|e| e.to_string())?;

    // 3. Fetch All Selected Manifests
    let mut selected_manifests = Vec::new();
    for manifest_meta in build.manifests {
        if manifest_meta.matching_field == "game"
            || selected_category_ids.contains(&manifest_meta.category_id)
        {
            println!(
                "Sophon: Fetching manifest for component: {}",
                manifest_meta.matching_field
            );
            let url = format!("{}/{}", manifest_meta.url_prefix, manifest_meta.manifest_id);
            let manifest = client
                .fetch_manifest(&url)
                .await
                .map_err(|e| e.to_string())?;
            selected_manifests.push(manifest);
        }
    }

    if selected_manifests.is_empty() {
        return Err("No manifests selected for download".to_string());
    }

    // 4. Setup Control Channel
    let (tx_pause, rx_pause) = tokio::sync::watch::channel(false);
    state
        .download_controls
        .lock()
        .await
        .insert(game_id.clone(), tx_pause);

    // 5. Update Status (Helper locks internally)
    {
        let mut dbs = state.game_dbs.lock().await;
        if let Some(db) = dbs.get_mut(&game_id) {
            if let Some(config) = db.games.get_mut(&game_id) {
                config.install_status = InstallStatus::Downloading;
                config.installed_components = selected_category_ids.clone();
                let _ = state
                    .librarian
                    .lock()
                    .await
                    .save_game_db(&game_id, db)
                    .await;
            }
        }
        let _ = app.emit("library-updated", dbs.clone());
    }

    // 6. Spawn Orchestrator
    let orchestrator = ChunkOrchestrator::new(
        game_id.clone(),
        client,
        selected_manifests,
        install_path,
        build.chunk_base_url,
        8,
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
                        Some(build.version.clone()),
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
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    let controls = state.download_controls.lock().await;
    if let Some(tx) = controls.get(&game_id) {
        let _ = tx.send(true);
        drop(controls);
        update_game_status_internal(&app, &game_id, InstallStatus::Queued, None).await?;
        Ok(())
    } else {
        Err("No active download found for this game".to_string())
    }
}

#[tauri::command]
pub async fn resume_game_download(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    let controls = state.download_controls.lock().await;
    if let Some(tx) = controls.get(&game_id) {
        let _ = tx.send(false);
        drop(controls);
        update_game_status_internal(&app, &game_id, InstallStatus::Downloading, None).await?;
        Ok(())
    } else {
        drop(controls);
        // Session missing from memory (likely app restart).
        // Restart it using stored component list.
        let dbs = state.game_dbs.lock().await;
        let db = dbs.get(&game_id).ok_or("Game not found")?;
        let config = db.games.get(&game_id).ok_or("Config missing")?;
        let components = config.installed_components.clone();
        drop(dbs);

        start_game_download(app, state, game_id, components).await
    }
}

#[tauri::command]
pub async fn repair_game(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    println!("Sophon: [REPAIR] requested for game: {}", game_id);

    // 1. Robust Template Lookup (Fuzzy) - Scoped lock
    let (install_path, selected_categories, template) = {
        println!("Sophon: [REPAIR] Locking game_templates...");
        let templates = state.game_templates.lock().await;
        println!("Sophon: [REPAIR] Locking game_dbs...");
        let dbs = state.game_dbs.lock().await;

        let db = dbs.get(&game_id).ok_or("Game not found")?;
        let config = db.games.get(&game_id).ok_or("Config missing")?;

        let install_path = config.install_path.clone();
        let selected_categories = config.installed_components.clone();

        let template = templates
            .get(&game_id)
            .or_else(|| {
                // Try stripping .exe
                let base = game_id.trim_end_matches(".exe");
                templates.get(base).or_else(|| {
                    // Try finding a template where the short_name or name matches partially
                    templates.values().find(|t| {
                        let name_low = t.name.to_lowercase();
                        let short_low = t.short_name.to_lowercase();
                        base.contains(&short_low)
                            || base.contains(&name_low)
                            || short_low.contains(base)
                            || name_low.contains(base)
                    })
                })
            })
            .ok_or_else(|| format!("Template not found for game ID: {}", game_id))?
            .clone();

        (install_path, selected_categories, template)
    };
    println!("Sophon: [REPAIR] Metadata retrieved, locks released.");

    // 2. Fetch Build Info
    println!("Sophon: [REPAIR] Fetching build info...");
    let client = SophonClient::new();
    let build = client
        .get_build(
            &template.sophon_branch,
            &template.sophon_package_id,
            &template.sophon_password,
            &template.sophon_plat_app,
            &template.sophon_game_biz,
            &template.sophon_launcher_id,
            &template.sophon_channel_id,
            &template.sophon_sub_channel_id,
        )
        .await
        .map_err(|e| format!("Sophon getBuild failed: {}", e))?;
    println!("Sophon: [REPAIR] Build info fetched successfully.");

    // 3. Select Manifests (Improved matching)
    let mut manifests = Vec::new();
    println!(
        "Sophon: [REPAIR] Build fetched (v{}). Selected categories: {:?}",
        build.version, selected_categories
    );

    for m_meta in build.manifests {
        let is_core = m_meta.matching_field == "game";
        let is_selected = selected_categories.contains(&m_meta.category_id);
        let is_english = m_meta.matching_field == "en-us"; // Default fallback for manual installs

        if is_core || is_selected || (selected_categories.is_empty() && is_english) {
            println!(
                "Sophon: [REPAIR] Fetching manifest for component: {} (id: {})",
                m_meta.matching_field, m_meta.category_id
            );
            let url = format!("{}/{}", m_meta.url_prefix, m_meta.manifest_id);
            let manifest = client
                .fetch_manifest(&url)
                .await
                .map_err(|e| e.to_string())?;
            manifests.push(manifest);
        }
    }

    if manifests.is_empty() {
        return Err(
            "No manifests identified for repair. Ensure game components are valid.".to_string(),
        );
    }

    // 4. Setup Control Channel
    println!("Sophon: [REPAIR] Initializing download control channel...");
    let (tx_pause, rx_pause) = tokio::sync::watch::channel(false);
    state
        .download_controls
        .lock()
        .await
        .insert(game_id.clone(), tx_pause);

    // 5. Initial UI Feedback
    println!("Sophon: [REPAIR] Sending initial UI progress event...");
    update_game_status_internal(&app, &game_id, InstallStatus::Updating, None).await?;
    let _ = app.emit(
        "download-progress",
        ProgressDetailed {
            game_id: game_id.clone(),
            percentage: 0.0,
            speed_bps: 0,
            eta_secs: 0,
            downloaded_bytes: 0,
            total_bytes: 100, // Placeholder
        },
    );

    // 6. Run Orchestrator
    println!("Sophon: [REPAIR] Starting background repair task...");
    let orchestrator = ChunkOrchestrator::new(
        game_id.clone(),
        client,
        manifests,
        install_path,
        build.chunk_base_url,
        8,
    );

    let app_clone = app.clone();
    let game_id_clone = game_id.clone();
    let target_version = build.version.clone();

    tauri::async_runtime::spawn(async move {
        let (tx_events, mut rx_events) = mpsc::channel(100);
        let orchestrator_handle =
            tokio::spawn(async move { orchestrator.verify_and_repair(tx_events, rx_pause).await });

        while let Some(event) = rx_events.recv().await {
            match event {
                OrchestratorEvent::Progress(progress) => {
                    let _ = app_clone.emit("download-progress", progress);
                }
                OrchestratorEvent::Error { chunk_id, error } => {
                    eprintln!("Sophon Repair Error [{}]: {}", chunk_id, error);
                    let _ = app_clone.emit("download-error", format!("{}: {}", chunk_id, error));
                }
                OrchestratorEvent::Completed => {
                    println!("Sophon: Repair completed for {}", game_id_clone);
                    let _ = update_game_status_internal(
                        &app_clone,
                        &game_id_clone,
                        InstallStatus::Installed,
                        Some(target_version.clone()),
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

async fn update_game_status_internal(
    app: &tauri::AppHandle,
    game_id: &str,
    status: InstallStatus,
    version: Option<String>,
) -> Result<(), String> {
    let state: State<'_, AppState> = app.state();
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(game_id) {
        if let Some(config) = db.games.get_mut(game_id) {
            config.install_status = status;
            if let Some(v) = version {
                config.version = v;
            }
            state
                .librarian
                .lock()
                .await
                .save_game_db(game_id, db)
                .await
                .map_err(|e| e.to_string())?;
            let _ = app.emit("library-updated", dbs.clone());
            return Ok(());
        }
    }
    Err("Game not found in library".to_string())
}
