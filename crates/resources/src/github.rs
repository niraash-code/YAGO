use anyhow::{anyhow, Result};
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct ReleaseAsset {
    pub name: String,
    pub browser_download_url: String,
}

#[derive(Debug, Deserialize)]
pub struct GithubRelease {
    pub tag_name: String,
    pub assets: Vec<ReleaseAsset>,
}

pub async fn get_latest_release(owner: &str, repo: &str) -> Result<GithubRelease> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/releases/latest",
        owner, repo
    );
    let client = reqwest::Client::builder()
        .user_agent("YAGO-Quartermaster")
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let response = client.get(url).send().await?;

    if !response.status().is_success() {
        return Err(anyhow!("GitHub API request failed: {}", response.status()));
    }

    let mut release: GithubRelease = response.json().await?;

    // Filtering Logic
    if repo == "proton-ge-custom" {
        release.assets.retain(|a| a.name.ends_with(".tar.gz"));
    } else if repo == "WWMI-Package" || repo == "XXMITools" || repo == "GI-Model-Importer" {
        release.assets.retain(|a| a.name.ends_with(".zip"));
    }

    Ok(release)
}
