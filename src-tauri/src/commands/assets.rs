#![allow(dead_code)]
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

#[tauri::command]
pub async fn get_community_backgrounds(
    state: State<'_, AppState>,
    game_id: String,
) -> Result<Vec<String>, String> {
    let (repo, base_url) = {
        let config = state.app_config.lock().await;
        (
            config.community_backgrounds_repo.clone(),
            config.community_backgrounds_base_url.clone(),
        )
    };

    let folder = {
        let templates = state.game_templates.lock().await;
        templates
            .get(&game_id)
            .and_then(|t| t.community_folder.clone())
            .ok_or_else(|| format!("No community folder defined for game: {}", game_id))?
    };

    let client = reqwest::Client::builder()
        .user_agent("YAGO-Organizer")
        .build()
        .map_err(|e| e.to_string())?;

    // Use recursive tree API to get ALL files in the repo at once
    // This is much faster than crawling folders one by one
    let tree_url = format!(
        "https://api.github.com/repos/{}/git/trees/main?recursive=1",
        repo
    );

    let response = client
        .get(&tree_url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch repo tree: {}", response.status()));
    }

    let contents: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let mut urls = Vec::new();

    // The GitHub Tree API returns an object with a "tree" array
    if let Some(tree) = contents.get("tree").and_then(|t| t.as_array()) {
        // Filter criteria:
        // 1. Must be inside the "output/" path
        // 2. Must contain "/{folder}/" anywhere in the path (e.g., output/hoyoplay_global_pure/hk4e_global/...)
        // 3. Must be a blob (file)
        // 4. Must have an image extension
        let search_token = format!("/{}/", folder);

        for entry in tree {
            if let (Some(path), Some(entry_type)) = (
                entry.get("path").and_then(|p| p.as_str()),
                entry.get("type").and_then(|t| t.as_str()),
            ) {
                // Filter criteria:
                // 1. Must be inside the "output/" path
                // 2. Must contain "/{folder}/" anywhere in the path
                // 3. Must be in a "pure" category (textless/clean)
                // 4. Must be a blob (file)
                // 5. Must have an image extension
                if entry_type == "blob"
                    && path.starts_with("output/")
                    && path.contains(&search_token)
                    && path.contains("_pure")
                    && (path.ends_with(".png")
                        || path.ends_with(".webp")
                        || path.ends_with(".jpg")
                        || path.ends_with(".jpeg"))
                {
                    // The path already includes "output/",
                    // but our base_url already includes "output".
                    // So we strip "output/" from the start of the path to join with base_url.
                    let relative_path = &path[7..]; // Strip "output/"
                    urls.push(format!("{}/{}", base_url, relative_path));
                }
            }
        }
    }

    Ok(urls)
}
