use crate::config::AppConfig;
use crate::AppState;
use librarian::settings::GlobalSettings;
use tauri::{Emitter, State};

#[tauri::command]
#[allow(dead_code)]
pub async fn get_app_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    let config = state.app_config.lock().await;
    Ok(config.clone())
}

#[tauri::command]
#[allow(dead_code)]
pub async fn update_app_config(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    config: AppConfig,
) -> Result<(), String> {
    let config_path = state.app_data_dir.join("app_config.json");
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(config_path, content).map_err(|e| e.to_string())?;

    let mut current = state.app_config.lock().await;
    *current = config.clone();

    let _ = app.emit("app-config-updated", config);
    Ok(())
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<GlobalSettings, String> {
    let settings = state.global_settings.lock().await;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn update_settings(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    settings: GlobalSettings,
) -> Result<(), String> {
    let mut current_settings = state.global_settings.lock().await;

    state
        .settings_manager
        .save(&settings)
        .await
        .map_err(|e| e.to_string())?;

    *current_settings = settings.clone();

    // If storage path changed, update Librarian
    let base = if settings.yago_storage_path.as_os_str().is_empty() {
        state.app_data_dir.clone()
    } else {
        settings.yago_storage_path.clone()
    };

    let lib_config = librarian::storage::LibrarianConfig {
        base_path: base,
        games_install_path: if settings.default_games_path.as_os_str().is_empty() {
            None
        } else {
            Some(settings.default_games_path.clone())
        },
        mods_path: if settings.mods_path.as_os_str().is_empty() {
            None
        } else {
            Some(settings.mods_path.clone())
        },
        runners_path: if settings.runners_path.as_os_str().is_empty() {
            None
        } else {
            Some(settings.runners_path.clone())
        },
        prefixes_path: if settings.prefixes_path.as_os_str().is_empty() {
            None
        } else {
            Some(settings.prefixes_path.clone())
        },
        cache_path: if settings.cache_path.as_os_str().is_empty() {
            None
        } else {
            Some(settings.cache_path.clone())
        },
    };

    let mut librarian = state.librarian.lock().await;
    librarian.update_roots(lib_config);
    librarian.ensure_core_dirs().map_err(|e| e.to_string())?;

    // Re-extract templates to the new path
    if let Some(dir) = crate::ASSETS_DIR.get_dir("templates") {
        println!(
            "Re-extracting {} templates to new storage path...",
            dir.entries().len()
        );
        for file in dir.files() {
            let dest = librarian.templates_root.join(file.path().file_name().unwrap());
            if let Err(e) = std::fs::write(&dest, file.contents()) {
                eprintln!("Failed to extract {:?}: {}", dest, e);
            }
        }
    }

    let _ = app.emit("settings-updated", settings);
    Ok(())
}
