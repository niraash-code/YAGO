use crate::AppState;
use librarian::models::Profile;
use tauri::{Emitter, State};
use uuid::Uuid;

#[tauri::command]
pub async fn switch_profile(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    profile_id: String,
) -> Result<(), String> {
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(&game_id) {
        if let Some(config) = db.games.get_mut(&game_id) {
            let p_uuid = Uuid::parse_str(&profile_id).map_err(|e| e.to_string())?;
            if db.profiles.contains_key(&p_uuid) {
                config.active_profile_id = profile_id;
                state
                    .librarian
                    .lock()
                    .await
                    .save_game_db(&game_id, db)
                    .await
                    .map_err(|e: librarian::LibrarianError| e.to_string())?;
                let _ = app.emit("library-updated", dbs.clone());
                return Ok(());
            }
        }
    }
    Err("Profile or Game not found".to_string())
}

#[tauri::command]
pub async fn create_profile(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    name: String,
) -> Result<Profile, String> {
    let profile = state
        .librarian
        .lock()
        .await
        .create_profile(&game_id, name)
        .await
        .map_err(|e: librarian::LibrarianError| e.to_string())?;
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(&game_id) {
        db.profiles.insert(profile.id, profile.clone());
    }
    let _ = app.emit("library-updated", dbs.clone());
    Ok(profile)
}

#[tauri::command]
pub async fn duplicate_profile(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    profile_id: Uuid,
    name: String,
) -> Result<Profile, String> {
    let profile = state
        .librarian
        .lock()
        .await
        .duplicate_profile(&game_id, profile_id, name)
        .await
        .map_err(|e: librarian::LibrarianError| e.to_string())?;
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(&game_id) {
        db.profiles.insert(profile.id, profile.clone());
    }
    let _ = app.emit("library-updated", dbs.clone());
    Ok(profile)
}

#[tauri::command]
pub async fn update_profile(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    profile_id: String,
    update: super::library::ProfileUpdate,
) -> Result<(), String> {
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(&game_id) {
        let p_uuid = Uuid::parse_str(&profile_id).map_err(|e| e.to_string())?;
        if let Some(profile) = db.profiles.get_mut(&p_uuid) {
            if let Some(n) = update.name {
                profile.name = n;
            }
            if let Some(d) = update.description {
                profile.description = d;
            }
            if let Some(gs) = update.use_gamescope {
                profile.use_gamescope = gs;
            }
            if let Some(gm) = update.use_gamemode {
                profile.use_gamemode = gm;
            }
            if let Some(mh) = update.use_mangohud {
                profile.use_mangohud = mh;
            }
            if let Some(rs) = update.use_reshade {
                profile.use_reshade = rs;
            }
            if let Some(res) = update.resolution {
                profile.resolution = Some(res);
            }
            if let Some(args) = update.launch_args {
                profile.launch_args = args;
            }
            if let Some(path) = update.save_data_path {
                profile.save_data_path = Some(path);
            }
            if let Some(mods) = update.enabled_mod_ids {
                profile.enabled_mod_ids = mods;
            }
            if let Some(order) = update.load_order {
                profile.load_order = order;
            }
            state
                .librarian
                .lock()
                .await
                .save_game_db(&game_id, db)
                .await
                .map_err(|e: librarian::LibrarianError| e.to_string())?;
            let _ = app.emit("library-updated", dbs.clone());
            return Ok(());
        }
    }
    Err("Game or Profile not found".to_string())
}

#[tauri::command]
pub async fn delete_profile(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    profile_id: String,
) -> Result<(), String> {
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(&game_id) {
        let p_uuid = Uuid::parse_str(&profile_id).map_err(|e| e.to_string())?;
        if db.profiles.len() <= 1 {
            return Err("Cannot delete the last remaining profile.".to_string());
        }
        if let Some(config) = db.games.get(&game_id) {
            if config.active_profile_id == profile_id {
                return Err("Cannot delete active profile".into());
            }
        }
        if db.profiles.remove(&p_uuid).is_some() {
            state
                .librarian
                .lock()
                .await
                .save_game_db(&game_id, db)
                .await
                .map_err(|e: librarian::LibrarianError| e.to_string())?;
            let _ = app.emit("library-updated", dbs.clone());
            return Ok(());
        }
    }
    Err("Game or Profile not found".to_string())
}

#[tauri::command]
pub async fn rename_profile(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    profile_id: String,
    new_name: String,
) -> Result<(), String> {
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(&game_id) {
        let p_uuid = Uuid::parse_str(&profile_id).map_err(|e| e.to_string())?;
        if let Some(profile) = db.profiles.get_mut(&p_uuid) {
            profile.name = new_name;
            state
                .librarian
                .lock()
                .await
                .save_game_db(&game_id, db)
                .await
                .map_err(|e: librarian::LibrarianError| e.to_string())?;
            let _ = app.emit("library-updated", dbs.clone());
            return Ok(());
        }
    }
    Err("Game or Profile not found".to_string())
}

#[tauri::command]
pub async fn set_load_order(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    order: Vec<Uuid>,
) -> Result<(), String> {
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(&game_id) {
        if let Some(config) = db.games.get_mut(&game_id) {
            let p_uuid = Uuid::parse_str(&config.active_profile_id).map_err(|e| e.to_string())?;
            if let Some(profile) = db.profiles.get_mut(&p_uuid) {
                profile.load_order = order;
                state
                    .librarian
                    .lock()
                    .await
                    .save_game_db(&game_id, db)
                    .await
                    .map_err(|e: librarian::LibrarianError| e.to_string())?;
                let _ = app.emit("library-updated", dbs.clone());
                return Ok(());
            }
        }
    }
    Err("Profile or Game not found".to_string())
}