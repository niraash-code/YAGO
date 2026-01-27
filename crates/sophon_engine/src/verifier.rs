use crate::error::{Result, SophonError};
use md5::{Digest, Md5};
use std::path::Path;
use tokio::io::AsyncReadExt;

pub struct Verifier;

impl Verifier {
    /// Verifies the MD5 checksum of a file.
    pub async fn verify_file(path: &Path, expected_md5: &str) -> Result<()> {
        let mut file = tokio::fs::File::open(path).await?;
        let mut hasher = Md5::new();
        let mut buffer = [0u8; 8192];

        loop {
            let n = file.read(&mut buffer).await?;
            if n == 0 {
                break;
            }
            hasher.update(&buffer[..n]);
        }

        let hash = format!("{:x}", hasher.finalize());
        let expected = expected_md5.to_lowercase();

        if hash != expected {
            println!(
                "Hash mismatch for {:?}: Expected {}, Got {}",
                path, expected, hash
            );
            return Err(SophonError::ChecksumMismatch(
                path.to_string_lossy().to_string(),
            ));
        }

        Ok(())
    }
}
