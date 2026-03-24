use crate::error::{FsError, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractionReport {
    pub files_ignored: Vec<String>,
    pub has_mod_json: bool,
    pub has_modinfo_json: bool,
}

pub fn extract_and_sanitize(archive_path: &Path, destination: &Path) -> Result<ExtractionReport> {
    // 1. Create a temporary directory for raw extraction
    let temp_dir = tempfile::tempdir().map_err(FsError::Io)?;
    let temp_path = temp_dir.path();

    // 2. Extract using 7z (robust, handles zip, 7z, rar)
    let output = Command::new("7z")
        .arg("x")
        .arg(format!("-o{}", temp_path.to_string_lossy()))
        .arg(archive_path)
        .arg("-y") // Assume yes
        .output()
        .map_err(|e| FsError::Io(io::Error::other(format!("Failed to execute 7z: {}", e))))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(FsError::Io(io::Error::other(format!(
            "7z extraction failed: {}",
            err_msg
        ))));
    }

    let mut report = ExtractionReport {
        files_ignored: Vec::new(),
        has_mod_json: false,
        has_modinfo_json: false,
    };

    let mut entries = Vec::new();
    for entry in walkdir::WalkDir::new(temp_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.path().is_file() {
            entries.push(entry.path().to_path_buf());
        }
    }

    // 3. Detect deep common root to strip (The Matryoshka Test)
    let mut common_root: Option<PathBuf> = None;
    if !entries.is_empty() {
        // Find the deepest directory that contains all file entries
        let mut prefix = entries[0].parent().unwrap().to_path_buf();
        for entry in &entries[1..] {
            while !entry.starts_with(&prefix) {
                if let Some(parent) = prefix.parent() {
                    prefix = parent.to_path_buf();
                } else {
                    break;
                }
            }
        }

        // Ensure the prefix is at least within temp_path
        if prefix.starts_with(temp_path) && prefix != temp_path {
            common_root = Some(prefix);
        }
    }

    // 4. Sanitize, Transcode, and move files (The Silent Healer)
    let source_base = common_root.as_deref().unwrap_or(temp_path);

    for entry_path in entries {
        let rel_path = entry_path.strip_prefix(source_base).unwrap();
        let stripped_name = rel_path.to_string_lossy();

        if stripped_name.is_empty() {
            continue;
        }

        let is_loader_import = destination.to_string_lossy().contains("loaders");

        if !is_loader_import && !is_allowed(&stripped_name) {
            report.files_ignored.push(stripped_name.to_string());
            continue;
        }

        let safe_path = sanitize_path(destination, &stripped_name)?;

        if let Some(name) = safe_path.file_name().and_then(|n| n.to_str()) {
            if name == "mod.json" {
                report.has_mod_json = true;
            } else if name == "modinfo.json" {
                report.has_modinfo_json = true;
            }
        }

        if let Some(parent) = safe_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(FsError::Io)?;
            }
        }

        // Use copy + remove instead of rename to handle cross-filesystem moves if temp is on different drive
        fs::copy(&entry_path, &safe_path).map_err(FsError::Io)?;

        // The Silent Healer: Auto-Transcode textures if they are non-DDS
        if let Some(ext) = safe_path.extension().and_then(|s| s.to_str()) {
            if matches!(
                ext.to_lowercase().as_str(),
                "png" | "jpg" | "jpeg" | "tga" | "webp"
            ) {
                let _ = crate::Transcoder::to_dds(&safe_path);
            }
        }
    }

    Ok(report)
}

pub fn extract_targz(archive_path: &Path, destination: &Path) -> Result<()> {
    let file = fs::File::open(archive_path).map_err(FsError::Io)?;
    let tar_gz = flate2::read::GzDecoder::new(file);
    let mut archive = tar::Archive::new(tar_gz);
    archive.unpack(destination).map_err(FsError::Io)?;
    Ok(())
}

/// Extracts a .zip or .7z archive without any sanitization filters.
pub fn extract_raw_archive(source: &Path, target: &Path) -> Result<()> {
    let extension = source
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    match extension.as_str() {
        "zip" => extract_zip_raw(source, target),
        "7z" => extract_7z_raw(source, target),
        _ => Err(FsError::Io(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("Unsupported archive format: .{}", extension),
        ))),
    }
}

fn extract_zip_raw(source: &Path, target: &Path) -> Result<()> {
    let file = fs::File::open(source).map_err(FsError::Io)?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| FsError::Io(io::Error::other(e)))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| FsError::Io(io::Error::other(e)))?;
        let outpath = match file.enclosed_name() {
            Some(path) => target.join(path),
            None => continue,
        };

        if (*file.name()).ends_with('/') {
            fs::create_dir_all(&outpath).map_err(FsError::Io)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p).map_err(FsError::Io)?;
                }
            }
            let mut outfile = fs::File::create(&outpath).map_err(FsError::Io)?;
            io::copy(&mut file, &mut outfile).map_err(FsError::Io)?;
        }
    }
    Ok(())
}

fn extract_7z_raw(source: &Path, target: &Path) -> Result<()> {
    sevenz_rust::decompress_file(source, target).map_err(|e| FsError::Io(io::Error::other(e)))?;
    Ok(())
}

#[doc(hidden)]
pub fn is_allowed(filename: &str) -> bool {
    let path = Path::new(filename);
    let name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    // Deny List
    if name == "d3dx.ini"
        || name == "d3d11.dll"
        || name == "dxgi.dll"
        || name == "uninstall.exe"
        || name.ends_with(".exe")
        || name.ends_with(".log")
    {
        return false;
    }

    // Allow List (Extension based)
    if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
        let ext = ext.to_lowercase();
        return matches!(
            ext.as_str(),
            "ini"
                | "ib"
                | "vb"
                | "fmt"
                | "txt"
                | "dds"
                | "png"
                | "jpg"
                | "jpeg"
                | "tga"
                | "webp"
                | "json"
                | "buf"
                | "hlsl"
                | "h"
                | "cu"
                | "cl"
        );
    }

    // Explicit Allow List (Exact matches)
    if name == "mod.json" || name == "modinfo.json" {
        return true;
    }

    false
}

#[doc(hidden)]
pub fn sanitize_path(base: &Path, name: &str) -> Result<PathBuf> {
    // Prevent directory traversal
    // We basically just want to keep the structure but ensure it stays within 'base'
    let path = Path::new(name);
    let mut safe_components = PathBuf::new();

    for component in path.components() {
        if let std::path::Component::Normal(c) = component {
            safe_components.push(c);
        }
    }

    Ok(base.join(safe_components))
}
