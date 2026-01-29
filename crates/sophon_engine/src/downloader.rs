use crate::error::Result;
use crate::protocol::SophonManifest;
use reqwest::header::RANGE;
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;

#[derive(Clone, Debug, PartialEq)]
pub enum DownloadStatus {
    Idle,
    Downloading,
    Paused,
    Error,
    Completed,
}

pub struct DownloadTask {
    pub url: String,
    pub target_path: PathBuf,
    pub total_size: u64,
    pub downloaded_size: u64,
    pub status: DownloadStatus,
}

pub struct Downloader {
    client: reqwest::Client,
}

#[derive(serde::Serialize, Clone)]
pub struct DownloadProgress {
    pub chunk_id: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub overall_progress: f64,
}

impl Default for Downloader {
    fn default() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }
}

impl Downloader {
    pub async fn download_manifest(&self, url: &str) -> Result<SophonManifest> {
        let resp: reqwest::Response = self.client.get(url).send().await?;
        let manifest = resp.json::<SophonManifest>().await?;
        Ok(manifest)
    }

    /// Downloads a single large file with resume capability.
    pub async fn download_file<F>(
        &self,
        url: &str,
        target_path: &Path,
        on_progress: F,
    ) -> Result<()>
    where
        F: Fn(DownloadProgress) + Send + Sync + 'static,
    {
        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        // Check for existing partial file
        let mut file;
        let mut downloaded: u64 = 0;

        if target_path.exists() {
            let metadata = fs::metadata(target_path).await?;
            downloaded = metadata.len();
            file = fs::OpenOptions::new()
                .append(true)
                .open(target_path)
                .await?;
        } else {
            file = fs::File::create(target_path).await?;
        }

        // Get Content-Length
        let head_resp = self.client.head(url).send().await?;
        let total_size = head_resp.content_length().unwrap_or(0);

        if downloaded >= total_size && total_size > 0 {
            println!("File already downloaded.");
            return Ok(());
        }

        println!("Resuming download from byte {}", downloaded);

        let mut request = self.client.get(url);
        if downloaded > 0 {
            request = request.header(RANGE, format!("bytes={}-", downloaded));
        }

        let mut resp = request.send().await?;
        if !resp.status().is_success() {
            return Err(crate::error::SophonError::Network(
                resp.error_for_status().unwrap_err(),
            ));
        }
        let task_id = target_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        while let Some(chunk) = resp.chunk().await? {
            file.write_all(&chunk).await?;
            downloaded += chunk.len() as u64;

            (on_progress)(DownloadProgress {
                chunk_id: task_id.clone(),
                bytes_downloaded: downloaded,
                total_bytes: total_size,
                overall_progress: if total_size > 0 {
                    (downloaded as f64 / total_size as f64) * 100.0
                } else {
                    0.0
                },
            });
        }

        file.flush().await?;

        Ok(())
    }

    // TODO: Implement install logic using ChunkOrchestrator
    /*
    pub async fn install<F>(
        &self,
        manifest: SophonManifest,
        target_dir: &Path,
        on_progress: F,
    ) -> Result<()>
    where
        F: Fn(DownloadProgress) + Send + Sync + 'static,
    {
       // ...
    }
    */
}
