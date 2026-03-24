use crate::AppState;
use storage::models::{ImportCandidate, ModRecord};
use std::path::PathBuf;
use tauri::{Emitter, State};
use uuid::Uuid;

#[tauri::command]
pub async fn scan_mod_directory(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
    path: String,
    game_id: String,
) -> Result<Vec<ImportCandidate>, String> {
    let path_buf = PathBuf::from(path);
    let librarian = state.librarian.lock().await;
    storage::import::Importer::scan_directory(&path_buf, &librarian.assets_root, &game_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_mod(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    path: String,
) -> Result<ModRecord, String> {
    let path_buf = PathBuf::from(path);
    let record = {
        let librarian: tokio::sync::MutexGuard<'_, storage::Librarian> =
            state.librarian.lock().await;
        storage::import::Importer::import_mod(&librarian, path_buf, game_id.clone())
            .await
            .map_err(|e| e.to_string())?
    };

    let mut dbs: tokio::sync::MutexGuard<
        '_,
        std::collections::HashMap<String, storage::LibraryDatabase>,
    > = state.game_dbs.lock().await;

    let librarian = state.librarian.lock().await;
    if let Ok(new_db) = librarian.load_game_db(&game_id).await {
        dbs.insert(game_id.clone(), new_db.clone());
        let _ = app.emit("library-updated", dbs.clone());
    }

    Ok(record)
}

#[tauri::command]
pub async fn add_mod(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    path: String,
) -> Result<ModRecord, String> {
    import_mod(app, state, game_id, path).await
}

#[tauri::command]
pub async fn validate_mod(_state: State<'_, AppState>, _mod_id: String) -> Result<bool, String> {
    Ok(true)
}

#[tauri::command]
pub async fn delete_mod(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    mod_id: String,
) -> Result<(), String> {
    let mod_uuid = Uuid::parse_str(&mod_id).map_err(|e| e.to_string())?;
    let mut dbs: tokio::sync::MutexGuard<
        '_,
        std::collections::HashMap<String, storage::LibraryDatabase>,
    > = state.game_dbs.lock().await;

    for (game_id, db) in dbs.iter_mut() {
        if let Some(record) = db.mods.remove(&mod_uuid) {
            // Remove from filesystem
            if record.path.exists() {
                let _ = std::fs::remove_dir_all(&record.path);
            }

            // Remove from profiles
            for profile in db.profiles.values_mut() {
                profile.enabled_mod_ids.retain(|id| *id != mod_uuid);
                profile.load_order.retain(|id| *id != mod_uuid);
            }

            state
                .librarian
                .lock()
                .await
                .save_game_db(game_id, db)
                .await
                .map_err(|e: storage::LibrarianError| e.to_string())?;
            let _ = app.emit("library-updated", dbs.clone());
            return Ok(());
        }
    }

    Err("Mod not found".to_string())
}

#[tauri::command]
pub async fn toggle_mod(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    mod_id: String,
    enabled: bool,
) -> Result<(), String> {
    let mod_uuid = Uuid::parse_str(&mod_id).map_err(|e| e.to_string())?;
    let mut dbs: tokio::sync::MutexGuard<
        '_,
        std::collections::HashMap<String, storage::LibraryDatabase>,
    > = state.game_dbs.lock().await;

    if let Some(db) = dbs.get_mut(&game_id) {
        if let Some(game_config) = db.games.get(&game_id) {
            let p_uuid =
                Uuid::parse_str(&game_config.active_profile_id).map_err(|e| e.to_string())?;
            if let Some(profile) = db.profiles.get_mut(&p_uuid) {
                if enabled {
                    if !profile.enabled_mod_ids.contains(&mod_uuid) {
                        profile.enabled_mod_ids.push(mod_uuid);
                    }
                } else {
                    profile.enabled_mod_ids.retain(|id| *id != mod_uuid);
                }

                state
                    .librarian
                    .lock()
                    .await
                    .save_game_db(&game_id, db)
                    .await
                    .map_err(|e: storage::LibrarianError| e.to_string())?;
                let _ = app.emit("library-updated", dbs.clone());
                return Ok(());
            }
        }
    }

    Err("Game or Profile not found".to_string())
}

#[tauri::command]
pub async fn update_mod_tags(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    mod_id: String,
    tags: Vec<String>,
) -> Result<(), String> {
    let mod_uuid = Uuid::parse_str(&mod_id).map_err(|e| e.to_string())?;
    let mut dbs: tokio::sync::MutexGuard<
        '_,
        std::collections::HashMap<String, storage::LibraryDatabase>,
    > = state.game_dbs.lock().await;

    if let Some(db) = dbs.get_mut(&game_id) {
        if let Some(record) = db.mods.get_mut(&mod_uuid) {
            record.config.tags = tags;
            state
                .librarian
                .lock()
                .await
                .save_game_db(&game_id, db)
                .await
                .map_err(|e: storage::LibrarianError| e.to_string())?;
            let _ = app.emit("library-updated", dbs.clone());
            return Ok(());
        }
    }

    Err("Mod not found".to_string())
}

#[tauri::command]
pub async fn get_mod_files(
    _state: State<'_, AppState>,
    _mod_id: String,
) -> Result<Vec<super::library::FileNode>, String> {
    Ok(vec![])
}

#[tauri::command]
pub async fn read_mod_file(
    _state: State<'_, AppState>,
    _mod_id: String,
    _file_path: String,
) -> Result<String, String> {
    Ok("".to_string())
}

#[tauri::command]
pub async fn write_mod_file(
    _state: State<'_, AppState>,
    _mod_id: String,
    _file_path: String,
    _content: String,
) -> Result<(), String> {
    Ok(())
}
