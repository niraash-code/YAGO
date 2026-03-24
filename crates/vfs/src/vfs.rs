use crate::error::{FsError, Result};
use std::path::Path;
use tokio::fs;

#[cfg(unix)]
// use std::os::unix::fs::symlink as symlink_dir; // Removed unused import
#[cfg(windows)]
use std::os::windows::fs::symlink_dir;

pub struct Vfs;

impl Vfs {
    /// Creates a zero-copy deployment (symlink/junction) from source to target.
    ///
    /// # Arguments
    /// * `source` - The actual directory containing files (e.g., Library/ModA)
    /// * `target` - The destination path where the link should appear (e.g., Game/Mods/ModA)
    pub async fn deploy_mod(source: &Path, target: &Path) -> Result<()> {
        if !source.exists() {
            return Err(FsError::NotFound(source.to_path_buf()));
        }

        if target.exists() {
            // If target exists, checks if it's a symlink. If so, remove it.
            // If it's a real directory, return error (safety).
            let metadata = fs::symlink_metadata(target).await?;
            if metadata.file_type().is_symlink() {
                // Remove existing symlink
                #[cfg(unix)]
                fs::remove_file(target).await?;
                #[cfg(windows)]
                fs::remove_dir(target).await?; // Windows symlinks to dirs are removed with remove_dir
            } else {
                return Err(FsError::DirectoryNotEmpty(target.to_path_buf()));
            }
        }

        // Ensure parent directory exists
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).await?;
        }

        // Create the link
        // On Windows, strictly speaking, symlink_dir requires admin or Dev Mode.
        // A Junction would be better but requires specific handling.
        // For MVP, we stick to standard symlink_dir.

        match std::fs::canonicalize(source) {
            Ok(canonical_source) => {
                // We use std::fs::symlink logic wrapped in tokio::task::spawn_blocking if strictly needed,
                // but symlink creation is fast.

                // Using std::os ... imports handled at top
                #[cfg(unix)]
                std::os::unix::fs::symlink(&canonical_source, target)?;

                #[cfg(windows)]
                std::os::windows::fs::symlink_dir(&canonical_source, target)?;

                Ok(())
            }
            Err(e) => Err(FsError::Io(e)),
        }
    }

    /// Removes a deployment (symlink) without touching the actual content.
    pub async fn undeploy_mod(target: &Path) -> Result<()> {
        if !target.exists() {
            return Ok(()); // Already gone
        }

        let metadata = fs::symlink_metadata(target).await?;
        if metadata.file_type().is_symlink() {
            #[cfg(unix)]
            fs::remove_file(target).await?;
            #[cfg(windows)]
            fs::remove_dir(target).await?;
            Ok(())
        } else {
            Err(FsError::InvalidPath(target.to_path_buf())) // Not a symlink, refuse to delete
        }
    }

    /// Recursively wipes a deployment directory, removing all symlinks and empty directories.
    /// Safe to use on the `Mods/YAGO` folder.
    pub async fn wipe_deployment(target_root: &Path) -> Result<()> {
        if !target_root.exists() {
            return Ok(());
        }

        // We use walkdir to find all files/symlinks.
        // We do this synchronously because walkdir is sync, but wrapped in spawn_blocking if needed.
        // For MVP, blocking inside async context is "okay" if brief, but better to spawn.

        let root = target_root.to_path_buf();

        tokio::task::spawn_blocking(move || {
            for entry in walkdir::WalkDir::new(&root)
                .contents_first(true)
                .into_iter()
                .flatten()
            {
                let path = entry.path();
                if let Ok(metadata) = std::fs::symlink_metadata(path) {
                    if metadata.file_type().is_symlink() {
                        // It's a symlink, destroy it.
                        #[cfg(unix)]
                        let _ = std::fs::remove_file(path);
                        #[cfg(windows)]
                        let _ = std::fs::remove_dir(path).or_else(|_| std::fs::remove_file(path));
                    }
                }
            }

            // Cleanup empty directories
            for entry in walkdir::WalkDir::new(&root)
                .contents_first(true)
                .into_iter()
                .flatten()
            {
                let path = entry.path();
                if path.is_dir() {
                    let _ = std::fs::remove_dir(path); // Fails if not empty, which is what we want
                }
            }
        })
        .await
        .map_err(|e| FsError::Io(std::io::Error::other(e.to_string())))?;

        Ok(())
    }
}
