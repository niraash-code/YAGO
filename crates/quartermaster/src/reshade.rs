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

    let temp_dir = tempfile::tempdir()?;
    let installer_path = temp_dir.path().join("ReShade_Setup.exe");

    download_file(url, &installer_path, on_progress).await?;

    println!("Reshade: Extracting DLLs...");
    // 7-zip (sevenz-rust) can often open PE files if they are archives.
    // ReShade setup is a ZIP-compatible SFX usually.
    // We try to extract "ReShade64.dll" or "ReShade32.dll".

    // We use a temporary extraction target
    let extract_target = temp_dir.path().join("extracted");
    std::fs::create_dir(&extract_target)?;

    // Use fs_engine to extract (assuming it handles the format)
    // Note: fs_engine::extract_and_sanitize handles .zip and .7z via extension.
    // We start by trying .zip (standard for ReShade SFX)
    let zip_path = temp_dir.path().join("setup.zip");
    std::fs::rename(&installer_path, &zip_path)?;

    // We use extract_and_sanitize but allow all files temporarily
    // If .zip fails, we try renaming to .7z and trying that engine
    if let Err(e_zip) = fs_engine::Safety::extract_archive(&zip_path, &extract_target) {
        println!(
            "Reshade: Zip extraction failed ({}), trying 7z engine...",
            e_zip
        );
        let sz_path = temp_dir.path().join("setup.7z");
        std::fs::rename(&zip_path, &sz_path)?;

        fs_engine::Safety::extract_archive(&sz_path, &extract_target).map_err(|e| {
            anyhow!(
                "Failed to extract ReShade installer (Zip and 7z failed): {}",
                e
            )
        })?;
    }

    // Find ReShade64.dll
    let possible_names = ["ReShade64.dll", "ReShade64.json", "ReShade32.dll"];
    // ReShade 5.x+ setup often contains them directly.

    let mut found = false;
    for name in possible_names {
        let src = extract_target.join(name);
        if src.exists() && name.ends_with(".dll") {
            let target = dest_dir.join("ReShade.dll"); // Rename to generic ReShade.dll
            if let Some(p) = target.parent() {
                std::fs::create_dir_all(p)?;
            }
            std::fs::copy(&src, &target)?;
            println!("Reshade: Installed {} as ReShade.dll", name);
            found = true;
            break;
        }
    }

    if !found {
        return Err(anyhow!(
            "Could not find ReShade DLLs in the installer. Structure may have changed."
        ));
    }

    Ok(())
}
