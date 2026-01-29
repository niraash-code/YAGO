use crate::AppState;
use fs_engine::{ExeInspector, Safety};
use librarian::scanner::DiscoveredGame;
use librarian::{Discovery, FpsConfig, LibraryDatabase};
use proc_marshal::InjectionMethod;
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{Emitter, Manager, State};
use uuid::Uuid;

#[derive(serde::Serialize)]
pub struct IdentifiedGame {
    pub id: String,
    pub name: String,
    pub short_name: String,
    pub developer: String,
    pub description: String,
    pub version: String,
    pub size: String,
    pub regions: u32,
    pub color: String,
    pub accent_color: String,
    pub cover_image: String,
    pub icon: String,
    pub logo_initial: String,
    pub install_path: String,
    pub exe_name: String,
    pub supported_injection_methods: Vec<InjectionMethod>,
    pub injection_method: InjectionMethod,
    pub modloader_enabled: bool,
}

#[derive(serde::Serialize, Clone)]
pub struct FileNode {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub kind: String, // "file" or "folder"
    pub size: Option<String>,
    pub children: Option<Vec<FileNode>>,
}

#[derive(serde::Serialize)]
pub struct SetupStatus {
    pub has_runners: bool,
    pub has_common_loaders: bool,
    pub detected_steam_path: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameConfigUpdate {
    pub name: Option<String>,
    pub cover_image: Option<String>,
    pub icon: Option<String>,
    pub developer: Option<String>,
    pub description: Option<String>,
    pub install_path: Option<String>,
    pub exe_name: Option<String>,
    pub launch_args: Option<Vec<String>>,
    pub fps_config: Option<FpsConfig>,
    pub short_name: Option<String>,
    pub regions: Option<u32>,
    pub color: Option<String>,
    pub accent_color: Option<String>,
    pub logo_initial: Option<String>,
    pub injection_method: Option<InjectionMethod>,
    pub modloader_enabled: Option<bool>,
    pub auto_update: Option<bool>,
    pub active_profile_id: Option<String>,
    pub active_runner_id: Option<Option<String>>,
    pub prefix_path: Option<Option<String>>,
    pub enable_linux_shield: Option<bool>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub use_gamescope: Option<bool>,
    pub use_gamemode: Option<bool>,
    pub use_mangohud: Option<bool>,
    pub use_reshade: Option<bool>,
    pub resolution: Option<(u32, u32)>,
    pub launch_args: Option<Vec<String>>,
    pub save_data_path: Option<PathBuf>,
    pub enabled_mod_ids: Option<Vec<Uuid>>,
    pub load_order: Option<Vec<Uuid>>,
}

#[tauri::command]
pub async fn force_reset_state(state: State<'_, AppState>) -> Result<(), String> {
    let mut running = state.running_game_name.lock().await;
    *running = None;

    let mut launching = state.is_launching.lock().await;
    *launching = false;

    Ok(())
}

#[tauri::command]
pub async fn get_library(
    state: State<'_, AppState>,
) -> Result<HashMap<String, LibraryDatabase>, String> {
    let dbs = state.game_dbs.lock().await;
    Ok(dbs.clone())
}

#[tauri::command]
pub async fn get_skin_inventory(
    state: State<'_, AppState>,
    game_id: String,
) -> Result<HashMap<String, librarian::queries::CharacterGroup>, String> {
    let dbs = state.game_dbs.lock().await;
    let db = dbs
        .get(&game_id)
        .ok_or_else(|| format!("Game {} not found", game_id))?;

    Ok(librarian::queries::Queries::get_character_roster(
        db, &game_id,
    ))
}

#[tauri::command]
pub async fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn identify_game(
    state: State<'_, AppState>,
    path: String,
) -> Result<IdentifiedGame, String> {
    let mut install_path = PathBuf::from(&path);
    if !install_path.exists() {
        return Err("Path does not exist".to_string());
    }
    let mut exe_path = PathBuf::new();
    let mut exe_name = String::new();
    if install_path.is_file() {
        exe_path = install_path.clone();
        exe_name = exe_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        if let Some(parent) = install_path.parent() {
            install_path = parent.to_path_buf();
        }
    } else {
        let walker = walkdir::WalkDir::new(&install_path).max_depth(1);
        for entry in walker.into_iter().filter_map(|e| e.ok()) {
            if entry.path().is_file() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.ends_with(".exe")
                    || name
                        == install_path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                {
                    exe_path = entry.path().to_path_buf();
                    exe_name = name;
                    break;
                }
            }
        }
    }
    if exe_name.is_empty() {
        return Err("Could not identify game executable".to_string());
    }
    let game_id = exe_name.to_lowercase();
    let templates_guard = state.game_templates.lock().await;
    let template = templates_guard.get(&game_id).or_else(|| {
        if game_id.ends_with(".exe") {
            templates_guard.get(game_id.trim_end_matches(".exe"))
        } else {
            None
        }
    });
    let size_bytes = Safety::get_dir_size(&install_path).map_err(|e| e.to_string())?;
    let size_str = format!("{:.1} GB", size_bytes as f64 / 1024.0 / 1024.0 / 1024.0);
    let mut version = "Unknown".to_string();
    if exe_path.exists() {
        let path_clone = exe_path.clone();
        if let Ok(Ok(v)) =
            tauri::async_runtime::spawn_blocking(move || ExeInspector::get_version(&path_clone))
                .await
        {
            version = v;
        }
    }
    if let Some(t) = template {
        let t_cloned = t.clone();
        drop(templates_guard);
        Ok(IdentifiedGame {
            id: game_id,
            name: t_cloned.name,
            short_name: t_cloned.short_name,
            developer: t_cloned.developer,
            description: t_cloned.description,
            version,
            size: size_str,
            regions: t_cloned.regions,
            color: t_cloned.color,
            accent_color: t_cloned.accent_color,
            cover_image: t_cloned.cover_image,
            icon: t_cloned.icon,
            logo_initial: t_cloned.logo_initial,
            install_path: install_path.to_string_lossy().to_string(),
            exe_name,
            supported_injection_methods: t_cloned
                .supported_injection_methods
                .unwrap_or_default()
                .into_iter()
                .map(|m| match m {
                    librarian::InjectionMethod::None => InjectionMethod::None,
                    librarian::InjectionMethod::Proxy => InjectionMethod::Proxy,
                    librarian::InjectionMethod::Loader => InjectionMethod::Loader,
                    librarian::InjectionMethod::RemoteThread => InjectionMethod::RemoteThread,
                    librarian::InjectionMethod::ManualMap => InjectionMethod::ManualMap,
                })
                .collect(),
            injection_method: {
                let method = if cfg!(target_os = "windows") {
                    t_cloned.injection_method_windows
                } else {
                    t_cloned.injection_method_linux
                };
                match method.unwrap_or(librarian::InjectionMethod::None) {
                    librarian::InjectionMethod::None => InjectionMethod::None,
                    librarian::InjectionMethod::Proxy => InjectionMethod::Proxy,
                    librarian::InjectionMethod::Loader => InjectionMethod::Loader,
                    librarian::InjectionMethod::RemoteThread => InjectionMethod::RemoteThread,
                    librarian::InjectionMethod::ManualMap => InjectionMethod::ManualMap,
                }
            },
            modloader_enabled: t_cloned.modloader_enabled.unwrap_or(true),
        })
    } else {
        drop(templates_guard);
        let app_config = state.app_config.lock().await;
        let name = install_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        Ok(IdentifiedGame {
            id: game_id,
            name: name.clone(),
            short_name: name.clone(),
            developer: "Unknown".to_string(),
            description: "A custom added game.".to_string(),
            version,
            size: size_str,
            regions: 1,
            color: "slate-400".to_string(),
            accent_color: "#94a3b8".to_string(),
            cover_image: app_config.default_cover_image.clone(),
            icon: app_config.default_icon_image.clone(),
            logo_initial: name.chars().next().unwrap_or('?').to_string(),
            install_path: install_path.to_string_lossy().to_string(),
            exe_name,
            supported_injection_methods: vec![InjectionMethod::Proxy],
            injection_method: InjectionMethod::Proxy,
            modloader_enabled: true,
        })
    }
}

#[tauri::command]
pub async fn sync_game_assets(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    let mut dbs = state.game_dbs.lock().await;
    let templates = state.game_templates.lock().await;

    if let (Some(db), Some(template)) = (dbs.get_mut(&game_id), templates.get(&game_id)) {
        if let Some(config) = db.games.get_mut(&game_id) {
            println!("Syncing assets for {}: using local templates", game_id);
            config.cover_image = template.cover_image.clone();
            config.icon = template.icon.clone();
            config.accent_color = template.accent_color.clone();
            config.color = template.color.clone();
            config.logo_initial = template.logo_initial.clone();

            state
                .librarian
                .save_game_db(&game_id, db)
                .await
                .map_err(|e| e.to_string())?;

            let _ = app.emit("library-updated", dbs.clone());
            return Ok(());
        }
    }

    Err("Game or Template not found".to_string())
}

#[tauri::command]
pub async fn add_game(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<String, String> {
    let path_buf = PathBuf::from(&path);
    let templates_guard = state.game_templates.lock().await;
    let game_id = Discovery::add_game_by_path(&state.librarian, path_buf, &templates_guard)
        .await
        .map_err(|e| e.to_string())?;
    drop(templates_guard);
    #[cfg(target_os = "linux")]
    {
        let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let prefix_path = app_data_dir.join("prefixes").join(&game_id);
        if !prefix_path.exists() {
            std::fs::create_dir_all(prefix_path.join("pfx")).map_err(|e| e.to_string())?;
        }
        let mut dbs = state.game_dbs.lock().await;
        if let Some(db) = dbs.get_mut(&game_id) {
            if let Some(config) = db.games.get_mut(&game_id) {
                config.prefix_path = Some(prefix_path);
                state
                    .librarian
                    .save_game_db(&game_id, db)
                    .await
                    .map_err(|e| e.to_string())?;
            }
        }
    }
    if let Ok(db) = state.librarian.load_game_db(&game_id).await {
        let mut dbs = state.game_dbs.lock().await;
        dbs.insert(game_id.clone(), db);
        let _ = app.emit("library-updated", dbs.clone());
    }
    Ok(game_id)
}

#[tauri::command]
pub async fn remove_game(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    let mut dbs = state.game_dbs.lock().await;
    if let Some(db) = dbs.remove(&game_id) {
        let game_dir = state.librarian.games_root.join(&game_id);
        if game_dir.exists() {
            std::fs::remove_dir_all(game_dir).map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "linux")]
        {
            if let Some(config) = db.games.get(&game_id) {
                if let Some(prefix_path) = &config.prefix_path {
                    if prefix_path.exists() {
                        let _ = std::fs::remove_dir_all(prefix_path);
                    }
                }
            }
        }
        let _ = app.emit("library-updated", dbs.clone());
        return Ok(());
    }
    Err("Game not found".to_string())
}

#[tauri::command]
pub async fn scan_for_games(state: State<'_, AppState>) -> Result<Vec<DiscoveredGame>, String> {
    let templates_root = state.app_data_dir.join("templates");
    if !templates_root.exists() {
        return Ok(vec![]);
    }
    let templates_guard = state.game_templates.lock().await;
    let templates_vec: Vec<_> = templates_guard.values().cloned().collect();
    let discovered = librarian::scanner::scan(&templates_vec);
    Ok(discovered)
}

#[tauri::command]
pub async fn sync_templates(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let templates_root = state.app_data_dir.join("templates");
    if !templates_root.exists() {
        std::fs::create_dir_all(&templates_root).map_err(|e| e.to_string())?;
    }
    let registry = librarian::TemplateRegistry::new(templates_root);
    let new_templates = registry.load_all().await.map_err(|e| e.to_string())?;
    let mut templates_guard = state.game_templates.lock().await;
    *templates_guard = new_templates;
    Ok(())
}

#[tauri::command]
pub async fn list_runners(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let mut runners = std::collections::HashSet::new();
    let runners_dir = state.app_data_dir.join("runners");
    if runners_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(runners_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                if entry.path().is_dir() {
                    runners.insert(entry.file_name().to_string_lossy().to_string());
                }
            }
        }
    }
    let settings = state.global_settings.lock().await;
    if !settings.steam_compat_tools_path.as_os_str().is_empty()
        && settings.steam_compat_tools_path.exists()
    {
        if let Ok(entries) = std::fs::read_dir(&settings.steam_compat_tools_path) {
            for entry in entries.filter_map(|e| e.ok()) {
                if entry.path().is_dir() {
                    runners.insert(entry.file_name().to_string_lossy().to_string());
                }
            }
        }
    }
    let mut result: Vec<String> = runners.into_iter().collect();
    result.sort();
    Ok(result)
}

#[tauri::command]
pub async fn remove_runner(state: State<'_, AppState>, runner_id: String) -> Result<(), String> {
    let runners_dir = state.app_data_dir.join("runners").join(&runner_id);
    if !runners_dir.exists() {
        return Err("Runner not found".to_string());
    }
    if runner_id.contains("..") || runner_id.contains('/') || runner_id.contains('\\') {
        return Err("Invalid runner ID".to_string());
    }
    std::fs::remove_dir_all(&runners_dir).map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn detect_steam_proton_path_internal() -> Result<Option<String>, String> {
    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        let paths = [
            format!("{}/.steam/steam/compatibilitytools.d", home),
            format!("{}/.steam/root/compatibilitytools.d", home),
            format!("{}/.local/share/Steam/compatibilitytools.d", home),
            format!(
                "{}/.var/app/com.valvesoftware.Steam/data/Steam/compatibilitytools.d",
                home
            ),
        ];
        for path_str in paths {
            let path = std::path::PathBuf::from(&path_str);
            if path.exists() && path.is_dir() {
                return Ok(Some(path_str));
            }
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn detect_steam_proton_path() -> Result<Option<String>, String> {
    detect_steam_proton_path_internal().await
}
