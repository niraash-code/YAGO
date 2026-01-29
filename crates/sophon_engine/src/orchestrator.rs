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
    Progress {
        downloaded_bytes: u64,
    },
    Error {
        chunk_id: String,
        error: String,
    },
    Completed,
}

pub struct ChunkOrchestrator {
    client: SophonClient,
    manifest: SophonManifest,
    target_dir: PathBuf,
    worker_count: usize,
    chunk_base_url: String,
}

impl ChunkOrchestrator {
    pub fn new(
        client: SophonClient,
        manifest: SophonManifest,
        target_dir: PathBuf,
        chunk_base_url: String,
        worker_count: usize,
    ) -> Self {
        Self {
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

    pub async fn run(self, tx_events: mpsc::Sender<OrchestratorEvent>) -> Result<()> {
        let (work_items, total_bytes) = self.deduplicate_work();
        let total_chunks = work_items.len();

        tx_events
            .send(OrchestratorEvent::Started {
                total_chunks,
                total_bytes,
            })
            .await
            .map_err(|_| SophonError::Interrupted)?;

        let (tx_work, rx_work) = async_channel::bounded::<ChunkWork>(self.worker_count * 2);
        let rx_work = Arc::new(rx_work);
        let client = Arc::new(self.client.clone());
        let target_dir = Arc::new(self.target_dir.clone());
        let base_url = Arc::new(self.chunk_base_url.clone());
        
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
            let rx = rx_work.clone();
            let client = client.clone();
            let target_dir = target_dir.clone();
            let base_url = base_url.clone();
            let tx_events = tx_events.clone();

            let handle = tokio::spawn(async move {
                Self::worker_loop(i, rx, client, target_dir, base_url, tx_events).await
            });
            worker_handles.push(handle);
        }

        // Wait for feeder
        let _ = work_feeder.await;
        
        // Wait for workers
        for handle in worker_handles {
            if let Err(e) = handle.await {
                eprintln!("Worker panic: {}", e);
            }
        }

        tx_events
            .send(OrchestratorEvent::Completed)
            .await
            .map_err(|_| SophonError::Interrupted)?;

        Ok(())
    }

    async fn worker_loop(
        _id: usize,
        rx: Arc<async_channel::Receiver<ChunkWork>>,
        client: Arc<SophonClient>,
        target_dir: Arc<PathBuf>,
        base_url: Arc<String>,
        tx_events: mpsc::Sender<OrchestratorEvent>,
    ) {
        while let Ok(work) = rx.recv().await {
            match Self::process_chunk(&client, &work, &target_dir, &base_url).await {
                Ok(_) => {
                    let _ = tx_events
                        .send(OrchestratorEvent::ChunkVerified {
                            chunk_id: work.chunk_id.clone(),
                            size: work.size,
                        })
                        .await;
                    
                    let _ = tx_events
                        .send(OrchestratorEvent::ChunkWritten {
                            chunk_id: work.chunk_id.clone(),
                            file_count: work.targets.len(),
                        })
                        .await;

                    let _ = tx_events
                        .send(OrchestratorEvent::Progress {
                            downloaded_bytes: work.size,
                        })
                        .await;
                }
                Err(e) => {
                    let _ = tx_events
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
        let url = format!("{}/{}", base_url.trim_end_matches('/'), work.chunk_id);
        
        let max_attempts = 2;
        let mut last_error = None;

        for attempt in 1..=max_attempts {
            // 1. Download with internal network retry
            let data_res = Self::download_with_retry(client, &url).await;
            
            match data_res {
                Ok(data) => {
                    // 2. Verify
                    let mut hasher = Md5::new();
                    hasher.update(&data);
                    let hash_result = hasher.finalize();
                    let hash_hex = hex::encode(&hash_result);

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

                                let mut file = fs::OpenOptions::new()
                                    .write(true)
                                    .create(true)
                                    .open(&full_path)?;

                                file.seek(SeekFrom::Start(target.offset))?;
                                file.write_all(&data_owned)?;
                            }
                            Ok(())
                        })
                        .await
                        .map_err(|e| SophonError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))??;

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
                     eprintln!("Chunk {} download failed: {} (Attempt {}/{})", work.chunk_id, err, attempt, max_attempts);
                     last_error = Some(err);
                }
            }

            if attempt < max_attempts {
                tokio::time::sleep(tokio::time::Duration::from_millis(500 * attempt as u64)).await;
            }
        }

        Err(last_error.unwrap_or_else(|| SophonError::Interrupted))
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
