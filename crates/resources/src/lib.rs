pub mod assets;
pub mod github;
pub mod loader;
pub mod proton;
pub mod reshade;

pub use assets::AssetCache;

use anyhow::{anyhow, Result};
use futures_util::StreamExt;
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

#[derive(Debug, Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub current: u64,
    pub total: u64,
    pub percentage: f32,
}

pub async fn download_file<F>(url: &str, dest: &Path, mut on_progress: F) -> Result<()>
where
    F: FnMut(u64, u64),
{
    let client = reqwest::Client::builder()
        .user_agent("YAGO-Quartermaster")
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let response = client.get(url).send().await?;

    if !response.status().is_success() {
        return Err(anyhow!("Request failed with status: {}", response.status()));
    }

    let total_size = response
        .content_length()
        .ok_or_else(|| anyhow!("Failed to get content length"))?;

    // Ensure parent directory exists
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let mut file = File::create(dest).await?;
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(item) = stream.next().await {
        let chunk = item?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;
        on_progress(downloaded, total_size);
    }

    file.flush().await?;
    Ok(())
}
