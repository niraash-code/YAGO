use crate::download_file;
use anyhow::Result;
use std::path::PathBuf;

pub struct AssetCache {
    cache_dir: PathBuf,
}

impl AssetCache {
    pub fn new(cache_dir: PathBuf) -> Self {
        if !cache_dir.exists() {
            let _ = std::fs::create_dir_all(&cache_dir);
        }
        Self { cache_dir }
    }

    /// Resolves a URL to a local cached file path.
    /// If the file is not in the cache, it downloads it.
    pub async fn resolve(&self, url: &str) -> Result<PathBuf> {
        // Create a safe filename from the URL hash
        let hash = md5::compute(url.as_bytes());
        let filename = format!("{:x}", hash);

        // Determine extension (optional, but good for some image loaders)
        // Simple heuristic based on URL ending
        let ext = if url.ends_with(".png") {
            ".png"
        } else if url.ends_with(".jpg") || url.ends_with(".jpeg") {
            ".jpg"
        } else if url.ends_with(".webp") {
            ".webp"
        } else if url.ends_with(".svg") {
            ".svg"
        } else {
            "" // No extension or unknown
        };

        let file_path = self.cache_dir.join(format!("{}{}", filename, ext));

        if file_path.exists() {
            return Ok(file_path);
        }

        // Download if missing
        println!("AssetCache: Downloading missing asset from {}...", url);
        download_file(url, &file_path, |_, _| {}).await?;

        Ok(file_path)
    }
}
