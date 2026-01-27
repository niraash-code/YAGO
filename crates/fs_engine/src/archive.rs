use crate::error::{FsError, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractionReport {
    pub files_ignored: Vec<String>,
    pub has_mod_json: bool,
    pub has_modinfo_json: bool,
}

pub fn extract_and_sanitize(archive_path: &Path, destination: &Path) -> Result<ExtractionReport> {
    let file = fs::File::open(archive_path).map_err(FsError::Io)?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| FsError::Io(io::Error::other(e)))?;

    let mut report = ExtractionReport {
        files_ignored: Vec::new(),
        has_mod_json: false,
        has_modinfo_json: false,
    };

    // 1. Detect if there is a single common root directory to strip (common in GitHub zips)
    let mut common_root: Option<String> = None;
    let mut all_in_root = true;

    for i in 0..archive.len() {
        let file = archive
            .by_index(i)
            .map_err(|e| FsError::Io(io::Error::other(e)))?;
        let name = file.name();

        if name.ends_with('/') && name.chars().filter(|&c| c == '/').count() == 1 {
            if let Some(root) = &common_root {
                if root != name {
                    all_in_root = false;
                    break;
                }
            } else {
                common_root = Some(name.to_string());
            }
            continue;
        }

        if let Some(root) = &common_root {
            if !name.starts_with(root) {
                all_in_root = false;
                break;
            }
        } else {
            let parts: Vec<&str> = name.split('/').collect();
            if parts.len() > 1 {
                common_root = Some(format!("{}/", parts[0]));
            } else {
                all_in_root = false;
                break;
            }
        }
    }

    let root_to_strip = if all_in_root { common_root } else { None };

    // 2. Extract
    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| FsError::Io(io::Error::other(e)))?;
        let original_name = file.name();

        let stripped_name = if let Some(root) = &root_to_strip {
            if original_name == root {
                continue;
            }
            original_name.strip_prefix(root).unwrap_or(original_name)
        } else {
            original_name
        };

        if file.is_dir() {
            continue;
        }

        // Sanitization & Validation (Only for mods, loaders might have different rules)
        // Check if we are in a 'loader' mode vs 'mod' mode?
        // Actually, let's keep sanitization flexible or add a flag.
        // For now, if it's a DLL/EXE and we are NOT in a 'loader' named path, ignore it.
        let is_loader_import = destination.to_string_lossy().contains("loaders");

        if !is_loader_import && !is_allowed(stripped_name) {
            report.files_ignored.push(stripped_name.to_string());
            continue;
        }

        let safe_path = sanitize_path(destination, stripped_name)?;

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

        let mut outfile = fs::File::create(&safe_path).map_err(FsError::Io)?;
        io::copy(&mut file, &mut outfile).map_err(FsError::Io)?;
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
            "ini" | "ib" | "vb" | "fmt" | "txt" | "dds" | "png" | "jpg" | "json"
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
