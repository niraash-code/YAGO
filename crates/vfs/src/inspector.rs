use crate::error::{FsError, Result};
use pelite::pe64::{Pe, PeFile};
use pelite::FileMap;
use std::path::Path;

pub struct ExeInspector;

impl ExeInspector {
    pub fn validate_exe(path: &Path) -> Result<bool> {
        if !path.exists() || !path.is_file() {
            return Ok(false);
        }

        use std::io::Read;
        let mut file = std::fs::File::open(path).map_err(FsError::Io)?;
        let mut buffer = [0u8; 4]; // Read 4 bytes to cover ELF
        if file.read(&mut buffer).map_err(FsError::Io)? < 2 {
            return Ok(false);
        }

        // Check for MZ (Windows PE) or ELF (Linux) header
        let is_pe = buffer[0] == 0x4D && buffer[1] == 0x5A;
        let is_elf =
            buffer[0] == 0x7F && buffer[1] == 0x45 && buffer[2] == 0x4C && buffer[3] == 0x46;

        Ok(is_pe || is_elf)
    }

    pub fn get_version(path: &Path) -> Result<String> {
        if !path.exists() {
            return Err(FsError::NotFound(path.to_path_buf()));
        }

        // 1. Try config.ini (Primary source for HoYo games)
        // Check current dir and parent dir (in case of nested launchers)
        let mut search_dirs = Vec::new();
        if let Some(p) = path.parent() {
            search_dirs.push(p.to_path_buf());
            if let Some(pp) = p.parent() {
                search_dirs.push(pp.to_path_buf());
            }
        }

        for dir in search_dirs {
            // Check for standard config.ini
            for filename in &["config.ini", "Config.ini", "CONFIG.INI"] {
                let ini_path = dir.join(filename);
                if ini_path.exists() {
                    if let Ok(content) = std::fs::read_to_string(&ini_path) {
                        for line in content.lines() {
                            let trimmed = line.trim();
                            if trimmed.is_empty()
                                || trimmed.starts_with('[')
                                || trimmed.starts_with(';')
                                || trimmed.starts_with('#')
                            {
                                continue;
                            }
                            if let Some((key, val)) = trimmed.split_once('=') {
                                let key = key.trim().to_lowercase();
                                let val = val.trim();
                                if key == "game_version" || key == "version" || key == "pkg_version"
                                {
                                    let clean_val = val.trim_matches('"').trim();
                                    if !clean_val.is_empty() {
                                        return Ok(clean_val.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Check for pkg_version files (common in subdirectories)
            if let Ok(entries) = std::fs::read_dir(&dir) {
                for entry in entries.filter_map(|e| e.ok()) {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.ends_with("pkg_version") {
                        if let Ok(content) = std::fs::read_to_string(entry.path()) {
                            // Look for version like 3.8.0 or 3.8.0_12345
                            for line in content.lines() {
                                let parts: Vec<&str> = line.split('"').collect();
                                for p in parts {
                                    let p = p.trim();
                                    if p.chars()
                                        .next()
                                        .map(|c| c.is_ascii_digit())
                                        .unwrap_or(false)
                                        && p.contains('.')
                                    {
                                        // Standard HoYo version format: X.Y.Z
                                        let dots = p.chars().filter(|c| *c == '.').count();
                                        if dots >= 2 {
                                            return Ok(p.to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Fallback to PE resources
        let file_map_res = FileMap::open(path);
        if let Ok(file_map) = file_map_res {
            if let Ok(pe_file) = PeFile::from_bytes(file_map.as_ref()) {
                if let Ok(resources) = pe_file.resources() {
                    if let Ok(version_info) = resources.version_info() {
                        if let Some(fixed) = version_info.fixed() {
                            let v = fixed.dwFileVersion;
                            let version_str =
                                format!("{}.{}.{}.{}", v.Major, v.Minor, v.Patch, v.Build);

                            if v.Major < 2000 {
                                return Ok(version_str);
                            } else {
                                println!("Sophon: Detected Unity version {} in PE, ignoring as game version.", version_str);
                            }
                        }
                    }
                }
            }
        }

        Ok("Unknown".to_string())
    }
}
