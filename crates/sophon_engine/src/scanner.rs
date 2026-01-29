use crate::error::Result;
use crate::protocol::SophonManifest;
use std::path::{Path, PathBuf};
use tokio::fs;

#[derive(Debug, Clone)]
pub enum ScanMode {
    MetadataOnly,
    FullHash,
}

#[derive(Debug, Clone)]
pub struct DivergenceMap {
    pub missing_chunks: Vec<String>, // List of chunk IDs to download
    pub corrupted_files: Vec<PathBuf>,
}

pub struct Scanner;

impl Scanner {
    pub async fn scan(
        target_dir: &Path,
        manifest: &SophonManifest,
        mode: ScanMode,
    ) -> Result<DivergenceMap> {
        let mut missing_chunks = Vec::new();
        let mut corrupted_files = Vec::new();

        // 1. Map all files from manifest
        for file_entry in &manifest.files {
            let full_path = target_dir.join(&file_entry.name);

            if !full_path.exists() {
                // If file doesn't exist, all its chunks are missing
                for chunk_ref in &file_entry.chunks {
                    if !missing_chunks.contains(&chunk_ref.chunk_id) {
                        missing_chunks.push(chunk_ref.chunk_id.clone());
                    }
                }
                corrupted_files.push(PathBuf::from(&file_entry.name));
                continue;
            }

            let metadata = fs::metadata(&full_path).await?;
            
            // Fast Check: Size mismatch
            if metadata.len() != file_entry.size {
                // If size mismatch, we need to deep scan or just redownload all chunks for this file
                // For now, let's mark it for deep scan or just assume all chunks need checking
                match mode {
                    ScanMode::MetadataOnly => {
                         // Mark all chunks as missing for simplicity in MetadataOnly mode if size differs
                         for chunk_ref in &file_entry.chunks {
                            if !missing_chunks.contains(&chunk_ref.chunk_id) {
                                missing_chunks.push(chunk_ref.chunk_id.clone());
                            }
                        }
                        corrupted_files.push(PathBuf::from(&file_entry.name));
                    }
                    ScanMode::FullHash => {
                        // We'll handle this in the deep scan loop
                    }
                }
            }
        }

        // 2. Deep Scan: Hash individual chunks if requested or if size matched but we want to be sure
        if matches!(mode, ScanMode::FullHash) {
            // This is computationally expensive.
            // Ideally we read the file in chunks and verify.
            // For MVP, we can reuse the Verifier logic but at a chunk level.
            for file_entry in &manifest.files {
                let full_path = target_dir.join(&file_entry.name);
                if !full_path.exists() { continue; }

                // Check chunk by chunk
                // Note: Sophon manifest chunk_id is the MD5 of the chunk data.
                for chunk_ref in &file_entry.chunks {
                    if missing_chunks.contains(&chunk_ref.chunk_id) { continue; }

                    if let Err(_) = Self::verify_chunk(&full_path, chunk_ref.offset, chunk_ref.size, &chunk_ref.chunk_id).await {
                        missing_chunks.push(chunk_ref.chunk_id.clone());
                        if !corrupted_files.contains(&PathBuf::from(&file_entry.name)) {
                            corrupted_files.push(PathBuf::from(&file_entry.name));
                        }
                    }
                }
            }
        }

        Ok(DivergenceMap {
            missing_chunks,
            corrupted_files,
        })
    }

    async fn verify_chunk(path: &Path, offset: u64, size: u64, expected_md5: &str) -> Result<()> {
        use md5::{Digest, Md5};
        use tokio::io::{AsyncReadExt, AsyncSeekExt, SeekFrom};

        let mut file = tokio::fs::File::open(path).await?;
        file.seek(SeekFrom::Start(offset)).await?;

        let mut hasher = Md5::new();
        let mut remaining = size;
        let mut buffer = [0u8; 8192];

        while remaining > 0 {
            let to_read = std::cmp::min(remaining, buffer.len() as u64);
            let n = file.read(&mut buffer[..to_read as usize]).await?;
            if n == 0 { break; }
            hasher.update(&buffer[..n]);
            remaining -= n as u64;
        }

        let hash = hex::encode(hasher.finalize());
        if hash.to_lowercase() != expected_md5.to_lowercase() {
            return Err(crate::error::SophonError::ChecksumMismatch(format!("{}:{}", path.display(), offset)));
        }

        Ok(())
    }
}
