#[cfg(test)]
mod tests {

    #[tokio::test]
    #[ignore]
    async fn test_sim_official_gallery_fetch() {
        let repo = "UIGF-org/HoYoPlay-Launcher-Background";
        let url = format!(
            "https://api.github.com/repos/{}/git/trees/main?recursive=1",
            repo
        );

        let client = reqwest::Client::builder()
            .user_agent("YAGO-Simulation")
            .build()
            .unwrap();

        let response = client.get(url).send().await.unwrap();
        let contents: serde_json::Value = response.json().await.unwrap();

        let mut wallpapers = Vec::new();
        let search_token = "/hk4e_global/";

        if let Some(tree) = contents.get("tree").and_then(|t| t.as_array()) {
            for entry in tree {
                if let (Some(path_str), Some(kind)) = (
                    entry.get("path").and_then(|p| p.as_str()),
                    entry.get("type"),
                ) {
                    if kind.as_str().unwrap() == "blob"
                        && path_str.starts_with("output/")
                        && path_str.contains(search_token)
                        && path_str.contains("_pure")
                        && (path_str.ends_with(".webp") || path_str.ends_with(".png"))
                    {
                        wallpapers.push(path_str.to_string());
                    }
                }
            }
        }

        assert!(!wallpapers.is_empty());
    }
}
