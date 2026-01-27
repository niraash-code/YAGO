use crate::download_file;
use crate::github;
use anyhow::{anyhow, Result};
use fs_engine::archive::extract_targz;
use std::path::Path;

pub async fn update_ge_proton<F>(
    owner: &str,
    repo_name: &str,
    dest: &Path,
    mut on_progress: F,
) -> Result<()>
where
    F: FnMut(u64, u64),
{
    let release = github::get_latest_release(owner, repo_name).await?;

    // 1. Check if already installed
    // GE-Proton releases usually have a folder inside named after the tag
    let tag = &release.tag_name;
    let expected_dir = dest.join(tag);
    if expected_dir.exists() && expected_dir.is_dir() {
        println!("Proton {} is already installed. Skipping download.", tag);
        // Signal 100% progress
        on_progress(100, 100);
        return Ok(());
    }

    let asset = release
        .assets
        .iter()
        .find(|a| a.name.ends_with(".tar.gz"))
        .ok_or_else(|| anyhow!("No .tar.gz asset found in latest {} release", repo_name))?;

    println!("Downloading Proton: {}...", asset.name);

    let temp_dir = tempfile::tempdir()?;
    let archive_path = temp_dir.path().join(&asset.name);

    download_file(&asset.browser_download_url, &archive_path, on_progress).await?;

    println!("Extracting Proton...");
    extract_targz(&archive_path, dest).map_err(|e| anyhow!("Extraction failed: {}", e))?;

    Ok(())
}
