#[cfg(test)]
mod tests {
    use reqwest;
    use serde_json::Value;

    #[tokio::test]
    #[ignore] // Network dependent
    async fn test_sim_official_gallery_fetch() {
        let repo = "UIGF-org/HoYoPlay-Launcher-Background";
        let folder = "hk4e_global"; // Genshin
        
        let client = reqwest::Client::builder()
            .user_agent("YAGO-Simulation")
            .build()
            .unwrap();

        let tree_url = format!(
            "https://api.github.com/repos/{}/git/trees/main?recursive=1",
            repo
        );

        let response = client.get(&tree_url).send().await.unwrap();
        assert!(response.status().is_success());

        let contents: Value = response.json().await.unwrap();
        let mut wallpapers = Vec::new();

        if let Some(tree) = contents.get("tree").and_then(|t| t.as_array()) {
            let search_token = format!("/{}/", folder);
            for entry in tree {
                if let (Some(path), Some(kind)) = (entry.get("path"), entry.get("type")) {
                    let path_str = path.as_str().unwrap();
                    if kind.as_str().unwrap() == "blob" 
                        && path_str.starts_with("output/")
                        && path_str.contains(&search_token)
                        && path_str.contains("_pure")
                    {
                        if path_str.ends_with(".webp") || path_str.ends_with(".png") {
                            wallpapers.push(path_str.to_string());
                        }
                    }
                }
            }
        }

        println!("Simulation: Found {} official wallpapers for {}", wallpapers.len(), folder);
        assert!(!wallpapers.is_empty());
    }
}
