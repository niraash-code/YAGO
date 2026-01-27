use crate::error::Result;
use crate::protocol::{ChunkInfo, SophonManifest};
use futures_util::StreamExt;
use reqwest::header::RANGE;
use std::path::{Path, PathBuf};
use std::sync::Arc;
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
    max_concurrent_downloads: usize,
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
            max_concurrent_downloads: 4,
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

        Ok(())
    }

    pub async fn install<F>(
        &self,
        manifest: SophonManifest,
        target_dir: &Path,
        on_progress: F,
    ) -> Result<()>
    where
        F: Fn(DownloadProgress) + Send + Sync + 'static,
    {
        let chunks = manifest.chunks;
        let total_size: u64 = chunks.iter().map(|c| c.size).sum();
        let downloaded_accumulator = Arc::new(tokio::sync::Mutex::new(0u64));
        let on_progress = Arc::new(on_progress);

        let download_queue: Vec<_> = chunks.into_iter().filter(|c| !c.is_optional).collect();

        let fetches = futures_util::stream::iter(download_queue)
            .map(|chunk| {
                let client = &self.client;
                let downloaded_acc = downloaded_accumulator.clone();
                let progress_cb = on_progress.clone();
                async move {
                    self.download_chunk(
                        client,
                        chunk,
                        target_dir,
                        total_size,
                        downloaded_acc,
                        progress_cb,
                    )
                    .await
                }
            })
            .buffer_unordered(self.max_concurrent_downloads);

        fetches
            .for_each(|res| async {
                if let Err(e) = res {
                    eprintln!("Chunk download failed: {}", e);
                }
            })
            .await;

        Ok(())
    }

    async fn download_chunk<F>(
        &self,
        client: &reqwest::Client,
        chunk: ChunkInfo,
        target_dir: &Path,
        overall_total: u64,
        downloaded_accumulator: Arc<tokio::sync::Mutex<u64>>,
        on_progress: Arc<F>,
    ) -> Result<()>
    where
        F: Fn(DownloadProgress) + Send + Sync + 'static,
    {
        let chunk_url = format!("https://cdn.example.com/chunks/{}", chunk.id);
        let dest_path = target_dir.join(&chunk.path);

        if let Some(parent) = dest_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let mut resp: reqwest::Response = client.get(chunk_url).send().await?;
        let mut file = fs::File::create(dest_path).await?;

        while let Some(item) = resp.chunk().await? {
            file.write_all(&item).await?;

            let mut acc = downloaded_accumulator.lock().await;
            *acc += item.len() as u64;

            (on_progress)(DownloadProgress {
                chunk_id: chunk.id.clone(),
                bytes_downloaded: *acc,
                total_bytes: overall_total,
                overall_progress: (*acc as f64 / overall_total as f64) * 100.0,
            });
        }

        Ok(())
    }
}
