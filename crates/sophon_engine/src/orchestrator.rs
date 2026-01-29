use crate::client::SophonClient;
use crate::error::{Result, SophonError};
use crate::protocol::SophonManifest;
use md5::{Digest, Md5};
use std::collections::HashMap;
use std::fs;
use std::io::{Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::task;

#[derive(Debug, Clone)]
pub struct TargetLocation {
    pub relative_path: PathBuf,
    pub offset: u64,
}

#[derive(Debug, Clone)]
pub struct ChunkWork {
    pub chunk_id: String,
    pub size: u64,
    pub targets: Vec<TargetLocation>,
    pub patch_source: Option<PatchSource>,
}

#[derive(Debug, Clone)]
pub struct PatchSource {
    pub old_chunk_id: String,
    pub diff_url: String,
}

use std::time::Instant;

#[derive(Debug, Clone, serde::Serialize)]
pub struct ProgressDetailed {
    pub game_id: String,
    pub percentage: f64,
    pub speed_bps: u64,
    pub eta_secs: u64,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

#[derive(Debug, Clone)]
pub enum OrchestratorEvent {
    Started {
        total_chunks: usize,
        total_bytes: u64,
    },
    ChunkVerified {
        chunk_id: String,
        size: u64,
    },
    ChunkWritten {
        chunk_id: String,
        file_count: usize,
    },
    Progress(ProgressDetailed),
    Error {
        chunk_id: String,
        error: String,
    },
    Completed,
}

pub struct ChunkOrchestrator {
    game_id: String,
    client: SophonClient,
    manifest: SophonManifest,
    target_dir: PathBuf,
    worker_count: usize,
    chunk_base_url: String,
}

struct WorkerContext {
    rx: Arc<async_channel::Receiver<ChunkWork>>,
    client: Arc<SophonClient>,
    target_dir: Arc<PathBuf>,
    base_url: Arc<String>,
    tx_events: mpsc::Sender<OrchestratorEvent>,
    tx_raw_progress: mpsc::Sender<u64>,
    rx_pause: tokio::sync::watch::Receiver<bool>,
}

impl ChunkOrchestrator {
    pub fn new(
        game_id: String,
        client: SophonClient,
        manifest: SophonManifest,
        target_dir: PathBuf,
        chunk_base_url: String,
        worker_count: usize,
    ) -> Self {
        Self {
            game_id,
            client,
            manifest,
            target_dir,
            worker_count,
            chunk_base_url,
        }
    }

    pub fn deduplicate_work(&self) -> (Vec<ChunkWork>, u64) {
        let mut work_map: HashMap<String, ChunkWork> = HashMap::new();

        for file in &self.manifest.files {
            for chunk_ref in &file.chunks {
                let entry = work_map
                    .entry(chunk_ref.chunk_id.clone())
                    .or_insert_with(|| ChunkWork {
                        chunk_id: chunk_ref.chunk_id.clone(),
                        size: chunk_ref.size,
                        targets: Vec::new(),
                        patch_source: None,
                    });

                entry.targets.push(TargetLocation {
                    relative_path: PathBuf::from(&file.name),
                    offset: chunk_ref.offset,
                });
            }
        }

        let works: Vec<ChunkWork> = work_map.into_values().collect();
        let total_bytes = works.iter().map(|w| w.size).sum();

        (works, total_bytes)
    }

    pub async fn run(
        self,
        tx_events: mpsc::Sender<OrchestratorEvent>,
        rx_pause: tokio::sync::watch::Receiver<bool>,
    ) -> Result<()> {
        let (work_items, total_bytes) = self.deduplicate_work();
        let total_chunks = work_items.len();

        tx_events
            .send(OrchestratorEvent::Started {
                total_chunks,
                total_bytes,
            })
            .await
            .map_err(|_| SophonError::Interrupted)?;

        // Pre-allocate files
        self.allocate_files().await?;

        let (tx_work, rx_work) = async_channel::bounded::<ChunkWork>(self.worker_count * 2);
        let rx_work = Arc::new(rx_work);
        let client = Arc::new(self.client.clone());
        let target_dir = Arc::new(self.target_dir.clone());
        let base_url = Arc::new(self.chunk_base_url.clone());

        // Internal channel for workers to report raw progress to the orchestrator monitor
        let (tx_raw_progress, mut rx_raw_progress) = mpsc::channel::<u64>(100);

        // Feed the work queue
        let work_feeder = tokio::spawn(async move {
            for work in work_items {
                if tx_work.send(work).await.is_err() {
                    break;
                }
            }
        });

        let mut worker_handles = Vec::new();

        for i in 0..self.worker_count {
            let ctx = WorkerContext {
                rx: rx_work.clone(),
                client: client.clone(),
                target_dir: target_dir.clone(),
                base_url: base_url.clone(),
                tx_events: tx_events.clone(),
                tx_raw_progress: tx_raw_progress.clone(),
                rx_pause: rx_pause.clone(),
            };

            let handle = tokio::spawn(async move { Self::worker_loop(i, ctx).await });
            worker_handles.push(handle);
        }

        // Progress Monitor Loop
        let monitor_tx_events = tx_events.clone();
        let monitor_game_id = self.game_id.clone();
        let monitor_total_bytes = total_bytes;

        let monitor_handle = tokio::spawn(async move {
            let mut total_downloaded = 0u64;
            let mut last_emit = Instant::now();
            let mut samples: Vec<(Instant, u64)> = Vec::new();

            while let Some(bytes) = rx_raw_progress.recv().await {
                total_downloaded += bytes;
                let now = Instant::now();
                samples.push((now, bytes));

                // Cleanup samples older than 5 seconds
                samples.retain(|(t, _)| now.duration_since(*t).as_secs() < 5);

                if now.duration_since(last_emit).as_millis() >= 500 {
                    let interval_bytes: u64 = samples.iter().map(|(_, b)| b).sum();
                    let interval_secs = 5.0; // Over 5 second window
                    let speed_bps = (interval_bytes as f64 / interval_secs) as u64;

                    let eta_secs = if speed_bps > 0 {
                        (monitor_total_bytes.saturating_sub(total_downloaded)) / speed_bps
                    } else {
                        0
                    };

                    let progress = ProgressDetailed {
                        game_id: monitor_game_id.clone(),
                        percentage: (total_downloaded as f64 / monitor_total_bytes as f64) * 100.0,
                        speed_bps,
                        eta_secs,
                        downloaded_bytes: total_downloaded,
                        total_bytes: monitor_total_bytes,
                    };

                    let _ = monitor_tx_events
                        .send(OrchestratorEvent::Progress(progress))
                        .await;
                    last_emit = now;
                }
            }
        });

        // Wait for feeder
        let _ = work_feeder.await;

        // Wait for workers
        for handle in worker_handles {
            if let Err(e) = handle.await {
                eprintln!("Worker panic: {}", e);
            }
        }

        // Cleanup monitor
        drop(tx_raw_progress);
        let _ = monitor_handle.await;

        tx_events
            .send(OrchestratorEvent::Completed)
            .await
            .map_err(|_| SophonError::Interrupted)?;

        Ok(())
    }

    async fn allocate_files(&self) -> Result<()> {
        let files = self.manifest.files.clone();
        let target_dir = self.target_dir.clone();

        task::spawn_blocking(move || -> Result<()> {
            for file_entry in files {
                let full_path = target_dir.join(&file_entry.name);
                if let Some(parent) = full_path.parent() {
                    fs::create_dir_all(parent)?;
                }

                // Open for write/create and set length
                let file = fs::OpenOptions::new()
                    .write(true)
                    .create(true)
                    .truncate(false)
                    .open(&full_path)?;

                file.set_len(file_entry.size)?;
            }
            Ok(())
        })
        .await
        .map_err(|e| SophonError::Io(std::io::Error::other(e.to_string())))??;

        Ok(())
    }

    async fn worker_loop(_id: usize, mut ctx: WorkerContext) {
        while let Ok(work) = ctx.rx.recv().await {
            // Check pause state
            while *ctx.rx_pause.borrow() {
                if ctx.rx_pause.changed().await.is_err() {
                    return; // Channel closed
                }
            }

            match Self::process_chunk(&ctx.client, &work, &ctx.target_dir, &ctx.base_url).await {
                Ok(_) => {
                    let _ = ctx
                        .tx_events
                        .send(OrchestratorEvent::ChunkVerified {
                            chunk_id: work.chunk_id.clone(),
                            size: work.size,
                        })
                        .await;

                    let _ = ctx
                        .tx_events
                        .send(OrchestratorEvent::ChunkWritten {
                            chunk_id: work.chunk_id.clone(),
                            file_count: work.targets.len(),
                        })
                        .await;

                    let _ = ctx.tx_raw_progress.send(work.size).await;
                }
                Err(e) => {
                    let _ = ctx
                        .tx_events
                        .send(OrchestratorEvent::Error {
                            chunk_id: work.chunk_id,
                            error: e.to_string(),
                        })
                        .await;
                }
            }
        }
    }

    async fn process_chunk(
        client: &SophonClient,
        work: &ChunkWork,
        target_dir: &Path,
        base_url: &str,
    ) -> Result<()> {
        let max_attempts = 2;
        let mut last_error = None;

        for attempt in 1..=max_attempts {
            let data_res = if let Some(patch) = &work.patch_source {
                Self::process_patch(client, work, patch, target_dir).await
            } else {
                let url = format!("{}/{}", base_url.trim_end_matches('/'), work.chunk_id);
                Self::download_with_retry(client, &url).await
            };

            match data_res {
                Ok(data) => {
                    // 2. Verify
                    let mut hasher = Md5::new();
                    hasher.update(&data);
                    let hash_result = hasher.finalize();
                    let hash_hex = hex::encode(hash_result);

                    if hash_hex.to_lowercase() == work.chunk_id.to_lowercase() {
                        // 3. Write
                        let targets = work.targets.clone();
                        let target_dir_owned = target_dir.to_path_buf();
                        let data_owned = data;

                        task::spawn_blocking(move || -> Result<()> {
                            for target in targets {
                                let full_path = target_dir_owned.join(&target.relative_path);

                                if let Some(parent) = full_path.parent() {
                                    fs::create_dir_all(parent)?;
                                }

                                let mut file =
                                    fs::OpenOptions::new().write(true).open(&full_path)?;

                                file.seek(SeekFrom::Start(target.offset))?;
                                file.write_all(&data_owned)?;
                            }
                            Ok(())
                        })
                        .await
                        .map_err(|e| SophonError::Io(std::io::Error::other(e.to_string())))??;

                        return Ok(());
                    } else {
                        let err = SophonError::ChecksumMismatch(format!(
                            "Expected {}, got {} (Attempt {}/{})",
                            work.chunk_id, hash_hex, attempt, max_attempts
                        ));
                        eprintln!("Chunk {} verification failed: {}", work.chunk_id, err);
                        last_error = Some(err);
                    }
                }
                Err(e) => {
                    let err = e;
                    eprintln!(
                        "Chunk {} processing failed: {} (Attempt {}/{})",
                        work.chunk_id, err, attempt, max_attempts
                    );
                    last_error = Some(err);
                }
            }

            if attempt < max_attempts {
                tokio::time::sleep(tokio::time::Duration::from_millis(500 * attempt as u64)).await;
            }
        }

        Err(last_error.unwrap_or_else(|| SophonError::Interrupted))
    }

    async fn process_patch(
        client: &SophonClient,
        _work: &ChunkWork,
        patch: &PatchSource,
        _target_dir: &Path,
    ) -> Result<Vec<u8>> {
        // 1. Download Diff
        let diff_data = client.download_raw(&patch.diff_url).await?;

        // 2. Get Old Data
        // For Sophon, chunks might be inside existing files or in a chunk cache.
        // If it's a "Repair" or "Delta", we assume the old chunk is on disk somewhere.
        // For MVP, we'll try to find any target that already exists and has the old chunk.
        // Actually, Sophon patching usually happens at the chunk level.

        let old_chunk_data = vec![0u8];

        // 3. Apply Patch
        let mut new_chunk_data = Vec::new();
        crate::patcher::Patcher::apply_patch(
            &mut std::io::Cursor::new(old_chunk_data),
            &mut std::io::Cursor::new(diff_data),
            &mut std::io::Cursor::new(&mut new_chunk_data),
        )?;

        Ok(new_chunk_data)
    }

    async fn download_with_retry(client: &SophonClient, url: &str) -> Result<Vec<u8>> {
        let mut attempts = 0;
        loop {
            match client.download_raw(url).await {
                Ok(data) => return Ok(data),
                Err(e) => {
                    attempts += 1;
                    if attempts >= 3 {
                        return Err(e);
                    }
                    tokio::time::sleep(tokio::time::Duration::from_millis(500 * attempts)).await;
                }
            }
        }
    }
}
