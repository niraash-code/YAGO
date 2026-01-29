pub mod archive;
pub mod error;
pub mod inspector;
pub mod safety;
pub mod transcoder;
pub mod vfs;

pub use archive::{extract_and_sanitize, extract_targz, ExtractionReport};
pub use error::{FsError, Result};
pub use inspector::ExeInspector;
pub use safety::Safety;
pub use transcoder::Transcoder;
pub use vfs::Vfs;

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeploymentPlan {
    // Map<SourcePath, RelativeTargetPath>
    // SourcePath: Absolute path to the file/folder in the mod storage
    // RelativeTargetPath: Path relative to the game's "Mods/YAGO" directory
    pub symlink_map: Vec<(PathBuf, PathBuf)>,
    // Generated file content (e.g., d3dx.ini, merged.ini)
    // Path is relative to the game's "Mods" directory (or specific target)
    pub generated_files: Vec<(PathBuf, String)>,
}

pub fn execute_deployment(
    target_root: &std::path::Path,
    plan: &DeploymentPlan,
    mods_folder_name: Option<&str>,
) -> Result<()> {
    if !target_root.exists() {
        return Err(FsError::NotFound(target_root.to_path_buf()));
    }

    let folder_name = mods_folder_name.unwrap_or("Mods");
    let mods_dir = target_root.join(folder_name);

    // 1. Ensure Mods directory exists
    if !mods_dir.exists() {
        std::fs::create_dir_all(&mods_dir).map_err(FsError::Io)?;
    }

    // 2. Clean Target (Mods/YAGO)
    let yago_dir = mods_dir.join("YAGO");
    if yago_dir.exists() {
        // We must be careful not to follow symlinks when deleting!
        // Standard remove_dir_all is fine for the YAGO managed dir
        std::fs::remove_dir_all(&yago_dir).map_err(FsError::Io)?;
    }
    std::fs::create_dir_all(&yago_dir).map_err(FsError::Io)?;

    // 3. Create Symlinks
    for (source, relative_target) in &plan.symlink_map {
        let target = mods_dir.join(relative_target);

        // Ensure parent directory exists
        if let Some(parent) = target.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(FsError::Io)?;
            }
        }

        make_symlink(source, &target)?;
    }

    // 4. Write Generated Files
    for (relative_path, content) in &plan.generated_files {
        let target = mods_dir.join(relative_path);
        std::fs::write(&target, content).map_err(FsError::Io)?;
    }

    Ok(())
}

#[cfg(unix)]
pub fn make_symlink(original: &std::path::Path, link: &std::path::Path) -> Result<()> {
    // If link already exists, remove it first to avoid "File exists" errors
    if link.exists() {
        let _ = std::fs::remove_file(link);
    }
    std::os::unix::fs::symlink(original, link).map_err(FsError::Io)?;
    Ok(())
}

#[cfg(windows)]
pub fn make_symlink(original: &std::path::Path, link: &std::path::Path) -> Result<()> {
    // On Windows, we prefer directory junctions for folders as they don't require Admin privileges usually
    if link.exists() {
        if link.is_dir() {
            let _ = std::fs::remove_dir_all(link);
        } else {
            let _ = std::fs::remove_file(link);
        }
    }

    if original.is_dir() {
        std::os::windows::fs::symlink_dir(original, link).map_err(FsError::Io)?;
    } else {
        std::os::windows::fs::symlink_file(original, link).map_err(FsError::Io)?;
    }
    Ok(())
}
