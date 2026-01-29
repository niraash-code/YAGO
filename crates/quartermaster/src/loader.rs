use crate::download_file;
use crate::github;
use anyhow::{anyhow, Result};
use fs_engine::archive::extract_and_sanitize;
use std::path::Path;

pub async fn update_loader<F>(
    owner: &str,
    repo: &str,
    dest: &Path,
    mut on_progress: F,
) -> Result<()>
where
    F: FnMut(u64, u64),
{
    let release = github::get_latest_release(owner, repo).await?;

    // 1. Check version
    let tag = &release.tag_name;
    let version_file = dest.join(".yago_version");
    if version_file.exists() {
        if let Ok(current_tag) = std::fs::read_to_string(&version_file) {
            if current_tag.trim() == tag {
                println!(
                    "Loader {}/{} is already at latest version ({}). Skipping.",
                    owner, repo, tag
                );
                // Signal 100% progress
                on_progress(100, 100);
                return Ok(());
            }
        }
    }

    let asset = release
        .assets
        .iter()
        .find(|a| {
            let name = a.name.to_lowercase();
            if repo == "XXMI-Libs-Package" {
                name.contains("xxmi-package") && name.ends_with(".zip")
            } else {
                name.ends_with(".zip")
            }
        })
        .or_else(|| release.assets.iter().find(|a| a.name.ends_with(".zip")))
        .ok_or_else(|| anyhow!("No suitable .zip asset found in latest {} release", repo))?;

    println!("Downloading Loader {}/{}: {}...", owner, repo, asset.name);

    let temp_dir = tempfile::tempdir()?;
    let archive_path = temp_dir.path().join(&asset.name);

    download_file(&asset.browser_download_url, &archive_path, on_progress).await?;

    println!("Extracting Loader...");
    extract_and_sanitize(&archive_path, dest).map_err(|e| anyhow!("Extraction failed: {}", e))?;

    // 2. Save version tag
    if let Some(parent) = version_file.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(&version_file, tag);

    Ok(())
}

/// Downloads a hash database JSON file from a raw URL.
pub async fn download_hash_db(url: &str, dest: &Path) -> Result<()> {
    println!("Quartermaster: Fetching hash database from {}...", url);

    // We don't need progress reporting for a small JSON usually,
    // but we'll use our existing download_file helper.
    crate::download_file(url, dest, |_, _| {}).await?;

    Ok(())
}
