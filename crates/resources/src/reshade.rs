use crate::download_file;
use anyhow::{anyhow, Result};
use std::path::Path;

// Official ReShade Installer URL (often acts as a self-extracting archive)
// NOTE: ReShade.me links can be dynamic. A reliable mirror or specific version is safer.
// For this implementation, we assume the user might provide a URL or we use a known one.
// Since we can't scrape, we'll use a fixed recent version or the "latest" endpoint if available.
// ReShade doesn't have a simple "latest.zip" for just DLLs.
// Strategy: We will try to download the Setup.exe and treat it as a Zip.

pub async fn download_reshade_dll(
    url: &str,
    dest_dir: &Path,
    on_progress: impl FnMut(u64, u64),
) -> Result<()> {
    println!("Reshade: Downloading installer from {}...", url);

    // Extract filename from URL or default to ReShade_Setup.exe
    let filename = url.split('/').next_back().unwrap_or("ReShade_Setup.exe");

    let temp_dir = tempfile::tempdir()?;
    let installer_path = temp_dir.path().join(filename);

    download_file(url, &installer_path, on_progress).await?;

    println!("Reshade: Extracting DLLs...");
    // 7-zip (sevenz-rust) can often open PE files if they are archives.
    // ReShade setup is a ZIP-compatible SFX usually.
    // We try to extract "ReShade64.dll" or "ReShade32.dll".

    // We use a temporary extraction target
    let extract_target = temp_dir.path().join("extracted");
    std::fs::create_dir(&extract_target)?;

    // Use vfs::extract_raw_archive to bypass sanitization
    // ReShade setup is usually a 7z-compatible SFX.
    // We try 7z first as it's more common for SFX.
    let sz_path = temp_dir.path().join("setup.7z");
    std::fs::copy(&installer_path, &sz_path)?;

    if let Err(e_7z) = vfs::extract_raw_archive(&sz_path, &extract_target) {
        println!(
            "Reshade: 7z extraction failed ({}), trying Zip engine...",
            e_7z
        );
        let zip_path = temp_dir.path().join("setup.zip");
        std::fs::rename(&sz_path, &zip_path)?;

        vfs::extract_raw_archive(&zip_path, &extract_target).map_err(|e| {
            anyhow!(
                "Failed to extract ReShade installer (7z and Zip failed): {}",
                e
            )
        })?;
    }

    // Find ReShade64.dll recursively using fs_engine primitives
    let mut found = false;
    println!(
        "Reshade: Searching for ReShade64.dll in {:?}",
        extract_target
    );
    if let Some(src) = vfs::Safety::find_file(&extract_target, "ReShade64.dll") {
        let target = dest_dir.join("ReShade.dll");
        if let Some(p) = target.parent() {
            std::fs::create_dir_all(p)?;
        }
        std::fs::copy(&src, &target)?;
        println!("Reshade: Installed {} as ReShade.dll", src.display());
        found = true;
    } else {
        println!("Reshade: ReShade64.dll NOT found in extracted files.");
        // List extracted files for debugging
        if let Ok(entries) = std::fs::read_dir(&extract_target) {
            for entry in entries.filter_map(|e| e.ok()) {
                println!("Reshade: Extracted item: {:?}", entry.path());
            }
        }
    }

    if !found {
        return Err(anyhow!(
            "Could not find ReShade DLLs in the installer. Structure may have changed."
        ));
    }

    Ok(())
}
