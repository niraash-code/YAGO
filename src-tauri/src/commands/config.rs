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
    state
        .settings_manager
        .save(&settings)
        .await
        .map_err(|e| e.to_string())?;
    let mut current = state.global_settings.lock().await;
    *current = settings.clone();
    let _ = app.emit("settings-updated", settings);
    Ok(())
}
