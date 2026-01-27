use crate::AppState;
use ini_forge::IniCompiler;
use librarian::{Importer, ModRecord};
use logic_weaver::Validator;
use std::path::{Path, PathBuf};
use tauri::{Emitter, State};
use uuid::Uuid;

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
pub async fn import_mod(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    path: String,
) -> Result<ModRecord, String> {
    let path_buf = PathBuf::from(&path);
    let record = Importer::import_mod(&state.librarian, path_buf, game_id.clone())
        .await
        .map_err(|e| e.to_string())?;
    if let Ok(db) = state.librarian.load_game_db(&game_id).await {
        let mut dbs = state.game_dbs.lock().await;
        dbs.insert(game_id, db);
        let _ = app.emit("library-updated", dbs.clone());
    }
    Ok(record)
}

#[tauri::command]
pub async fn update_mod_tags(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    mod_id: String,
    tags: Vec<String>,
) -> Result<(), String> {
    let id = Uuid::parse_str(&mod_id).map_err(|e| e.to_string())?;
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(&game_id) {
        if let Some(record) = db.mods.get_mut(&id) {
            record.config.tags = tags;
            state
                .librarian
                .save_game_db(&game_id, db)
                .await
                .map_err(|e| e.to_string())?;
            let _ = app.emit("library-updated", dbs.clone());
            return Ok(());
        }
    }
    Err("Mod not found".to_string())
}

#[tauri::command]
pub async fn validate_mod(state: State<'_, AppState>, mod_id: String) -> Result<bool, String> {
    let id = Uuid::parse_str(&mod_id).map_err(|e| e.to_string())?;
    let dbs = state.game_dbs.lock().await;
    for db in dbs.values() {
        if let Some(record) = db.mods.get(&id) {
            let compiler = IniCompiler::default();
            for entry in walkdir::WalkDir::new(&record.path)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if entry.path().extension().and_then(|s| s.to_str()) == Some("ini") {
                    let doc = compiler.compile(entry.path()).map_err(|e| e.to_string())?;
                    Validator::validate_logic(&doc).map_err(|e| e.to_string())?;
                }
            }
            return Ok(true);
        }
    }
    Err("Mod not found".to_string())
}

#[tauri::command]
pub async fn delete_mod(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    mod_id: String,
) -> Result<(), String> {
    let id = Uuid::parse_str(&mod_id).map_err(|e| e.to_string())?;
    let mut dbs = state.game_dbs.lock().await;
    for (game_id, db) in dbs.iter_mut() {
        if let Some(record) = db.mods.remove(&id) {
            let _ = fs_engine::Safety::move_to_trash(&record.path);
            for profile in db.profiles.values_mut() {
                profile.enabled_mod_ids.retain(|mid| *mid != id);
                profile.load_order.retain(|mid| *mid != id);
            }
            state
                .librarian
                .save_game_db(game_id, db)
                .await
                .map_err(|e| e.to_string())?;
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
    let id = Uuid::parse_str(&mod_id).map_err(|e| e.to_string())?;
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(&game_id) {
        if let Some(config) = db.games.get(&game_id) {
            let p_uuid = Uuid::parse_str(&config.active_profile_id).map_err(|e| e.to_string())?;
            if let Some(profile) = db.profiles.get_mut(&p_uuid) {
                if enabled {
                    if !profile.enabled_mod_ids.contains(&id) {
                        profile.enabled_mod_ids.push(id);
                    }
                } else {
                    profile.enabled_mod_ids.retain(|mid| *mid != id);
                }
                state
                    .librarian
                    .save_game_db(&game_id, db)
                    .await
                    .map_err(|e| e.to_string())?;
                let _ = app.emit("library-updated", dbs.clone());
                return Ok(());
            }
        }
    }
    Err("Mod or Profile not found".to_string())
}

#[tauri::command]
pub async fn get_mod_files(
    state: State<'_, AppState>,
    mod_id: String,
) -> Result<Vec<super::library::FileNode>, String> {
    let id = Uuid::parse_str(&mod_id).map_err(|e| e.to_string())?;
    let dbs = state.game_dbs.lock().await;
    let record = dbs
        .values()
        .find_map(|db| db.mods.get(&id))
        .ok_or("Mod not found")?;

    fn build_tree(path: &Path, root: &Path) -> Vec<super::library::FileNode> {
        let mut nodes = Vec::new();
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.filter_map(|e| e.ok()) {
                let p = entry.path();
                let name = p
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let rel_path = p
                    .strip_prefix(root)
                    .unwrap_or(&p)
                    .to_string_lossy()
                    .to_string();
                if p.is_dir() {
                    nodes.push(super::library::FileNode {
                        id: rel_path,
                        name,
                        kind: "folder".into(),
                        size: None,
                        children: Some(build_tree(&p, root)),
                    });
                } else {
                    let size = std::fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
                    let size_str = if size > 1024 * 1024 {
                        format!("{:.1} MB", size as f64 / 1048576.0)
                    } else {
                        format!("{:.1} KB", size as f64 / 1024.0)
                    };
                    nodes.push(super::library::FileNode {
                        id: rel_path,
                        name,
                        kind: "file".into(),
                        size: Some(size_str),
                        children: None,
                    });
                }
            }
        }
        nodes.sort_by(|a, b| {
            if a.kind == b.kind {
                a.name.cmp(&b.name)
            } else if a.kind == "folder" {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            }
        });
        nodes
    }
    Ok(build_tree(&record.path, &record.path))
}

#[tauri::command]
pub async fn read_mod_file(
    state: State<'_, AppState>,
    mod_id: String,
    file_path: String,
) -> Result<String, String> {
    let id = Uuid::parse_str(&mod_id).map_err(|e| e.to_string())?;
    let dbs = state.game_dbs.lock().await;
    let record = dbs
        .values()
        .find_map(|db| db.mods.get(&id))
        .ok_or("Mod not found")?;
    let full_path = record.path.join(&file_path);
    let c_root = record.path.canonicalize().map_err(|e| e.to_string())?;
    let c_target = full_path.canonicalize().map_err(|e| e.to_string())?;
    if !c_target.starts_with(&c_root) {
        return Err("Access denied".to_string());
    }
    if std::fs::metadata(&c_target)
        .map_err(|e| e.to_string())?
        .len()
        > 1048576
    {
        return Err("File too large".to_string());
    }
    std::fs::read_to_string(c_target).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_mod_file(
    state: State<'_, AppState>,
    mod_id: String,
    file_path: String,
    content: String,
) -> Result<(), String> {
    let id = Uuid::parse_str(&mod_id).map_err(|e| e.to_string())?;
    let dbs = state.game_dbs.lock().await;
    let record = dbs
        .values()
        .find_map(|db| db.mods.get(&id))
        .ok_or("Mod not found")?;
    let full_path = record.path.join(&file_path);
    let c_root = record.path.canonicalize().map_err(|e| e.to_string())?;
    if full_path.exists() {
        let c_target = full_path.canonicalize().map_err(|e| e.to_string())?;
        if !c_target.starts_with(&c_root) {
            return Err("Access denied".to_string());
        }
    }
    std::fs::write(full_path, content).map_err(|e| e.to_string())
}
