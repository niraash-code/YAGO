use crate::error::{FsError, Result};
use std::fs::File;
use std::io;
use std::path::Path;
use tokio::fs;
use trash;
use walkdir::WalkDir;

pub struct Safety;

impl Safety {
    /// Extracts a .zip or .7z archive to the target directory.
    pub fn extract_archive(source: &Path, target: &Path) -> Result<()> {
        if !source.exists() {
            return Err(FsError::NotFound(source.to_path_buf()));
        }

        let extension = source
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        match extension.as_str() {
            "zip" => {
                let file = File::open(source).map_err(FsError::Io)?;
                let mut archive =
                    zip::ZipArchive::new(file).map_err(|e| FsError::Io(io::Error::other(e)))?;

                for i in 0..archive.len() {
                    let mut file = archive
                        .by_index(i)
                        .map_err(|e| FsError::Io(io::Error::other(e)))?;
                    let outpath = match file.enclosed_name() {
                        Some(path) => target.join(path),
                        None => continue,
                    };

                    if (*file.name()).ends_with('/') {
                        std::fs::create_dir_all(&outpath).map_err(FsError::Io)?;
                    } else {
                        if let Some(p) = outpath.parent() {
                            if !p.exists() {
                                std::fs::create_dir_all(p).map_err(FsError::Io)?;
                            }
                        }
                        let mut outfile = File::create(&outpath).map_err(FsError::Io)?;
                        io::copy(&mut file, &mut outfile).map_err(FsError::Io)?;
                    }
                }
                Ok(())
            }
            "7z" => {
                sevenz_rust::decompress_file(source, target)
                    .map_err(|e| FsError::Io(io::Error::other(e)))?;
                Ok(())
            }
            _ => Err(FsError::Io(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("Unsupported archive format: .{}", extension),
            ))),
        }
    }

    /// Moves a file or directory to the system trash.
    pub fn move_to_trash(path: &Path) -> Result<()> {
        if !path.exists() {
            return Err(FsError::NotFound(path.to_path_buf()));
        }
        trash::delete(path).map_err(|e| FsError::Trash(e.to_string()))
    }

    /// Recursively renames files to lowercase.
    pub fn sanitize_filenames(root: &Path) -> Result<u64> {
        if !root.exists() {
            return Err(FsError::NotFound(root.to_path_buf()));
        }

        let mut count = 0;
        let walker = WalkDir::new(root).contents_first(true);

        for entry in walker {
            let entry = entry.map_err(|e| FsError::Io(e.into()))?;
            let path = entry.path();
            if path == root {
                continue;
            }

            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                // Skip if any part of the path (relative to root) is hidden
                let is_hidden = path
                    .strip_prefix(root)
                    .ok()
                    .map(|rel| {
                        rel.components().any(|c| {
                            c.as_os_str()
                                .to_str()
                                .map(|s| s.starts_with('.'))
                                .unwrap_or(false)
                        })
                    })
                    .unwrap_or(false);

                if is_hidden {
                    continue;
                }

                let lower_name = file_name.to_lowercase();
                if file_name != lower_name {
                    let mut new_path = path.to_path_buf();
                    new_path.set_file_name(lower_name);

                    if new_path.exists() {
                        continue;
                    }

                    std::fs::rename(path, new_path).map_err(FsError::Io)?;
                    count += 1;
                }
            }
        }
        Ok(count)
    }

    /// Atomic Import: Moves content from staging to library.
    pub async fn atomic_import(staging_path: &Path, library_path: &Path) -> Result<()> {
        if !staging_path.exists() {
            return Err(FsError::NotFound(staging_path.to_path_buf()));
        }

        if let Some(parent) = library_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        fs::rename(staging_path, library_path).await?;
        Ok(())
    }

    /// Recursively copies a directory (Sync).
    pub fn copy_recursive_sync(source: &Path, dest: &Path) -> Result<()> {
        if !source.exists() {
            return Err(FsError::NotFound(source.to_path_buf()));
        }

        for entry in WalkDir::new(source) {
            let entry = entry.map_err(|e| FsError::Io(e.into()))?;
            let path = entry.path();

            let rel_path = path
                .strip_prefix(source)
                .map_err(|e| FsError::Io(std::io::Error::other(e)))?;
            let target_path = dest.join(rel_path);

            if path.is_dir() {
                std::fs::create_dir_all(&target_path)?;
            } else {
                if let Some(parent) = target_path.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                std::fs::copy(path, &target_path)?;
            }
        }
        Ok(())
    }

    /// Calculates the total size of a directory in bytes.
    pub fn get_dir_size(path: &Path) -> Result<u64> {
        let mut total_size = 0;
        for entry in WalkDir::new(path)
            .min_depth(1)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let metadata = entry.metadata().map_err(|e| FsError::Io(e.into()))?;
            if metadata.is_file() {
                total_size += metadata.len();
            }
        }
        Ok(total_size)
    }
}
