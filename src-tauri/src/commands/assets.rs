use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn resolve_asset(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
    url: String,
) -> Result<String, String> {
    let cache_dir = state.app_data_dir.join("cache").join("assets");
    let cache = quartermaster::AssetCache::new(cache_dir);

    match cache.resolve(&url).await {
        Ok(path) => {
            let path_str = path.to_string_lossy().to_string();
            let encoded = urlencoding::encode(&path_str);
            Ok(format!("yago-asset://{}", encoded))
        }
        Err(e) => Err(format!("Failed to resolve asset: {}", e)),
    }
}
