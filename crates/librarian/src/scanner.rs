use crate::template::GameTemplate;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscoveredGame {
    pub template_id: String,
    pub path: PathBuf,
}

pub fn scan(templates: &[GameTemplate]) -> Vec<DiscoveredGame> {
    let mut results = Vec::new();

    #[cfg(target_os = "windows")]
    {
        results.extend(scan_windows(templates));
    }

    #[cfg(target_os = "linux")]
    {
        results.extend(scan_linux(templates));
    }

    results
}

#[cfg(target_os = "windows")]
fn scan_windows(templates: &[GameTemplate]) -> Vec<DiscoveredGame> {
    use std::collections::HashSet;
    use winreg::enums::*;
    use winreg::RegKey;

    let mut found = Vec::new();
    let mut seen_paths = HashSet::new();
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

    let paths = [
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        "SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    ];

    for path in paths {
        if let Ok(key) = hklm.open_subkey(path) {
            for name in key.enum_keys().map(|x| x.unwrap_or_default()) {
                if let Ok(subkey) = key.open_subkey(&name) {
                    let install_loc: String =
                        subkey.get_value("InstallLocation").unwrap_or_default();
                    if !install_loc.is_empty() {
                        let path = PathBuf::from(install_loc);
                        if path.exists() {
                            // Deduplicate at the check_path level
                            let mut results = Vec::new();
                            check_path(&path, templates, &mut results);
                            for discovery in results {
                                if !seen_paths.contains(&discovery.path) {
                                    seen_paths.insert(discovery.path.clone());
                                    found.push(discovery);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    found
}

#[cfg(target_os = "linux")]
fn scan_linux(templates: &[GameTemplate]) -> Vec<DiscoveredGame> {
    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = vec![
        PathBuf::from(&home).join("Games"),
        PathBuf::from(&home).join(".steam/steam/steamapps/common"),
        PathBuf::from(&home).join(".local/share/steam/steamapps/common"),
        PathBuf::from(&home).join(".local/share/lutris/runners/wine"),
    ];

    scan_roots(templates, candidates)
}

#[cfg(target_os = "linux")]
#[doc(hidden)]
pub fn scan_roots(templates: &[GameTemplate], roots: Vec<PathBuf>) -> Vec<DiscoveredGame> {
    use std::collections::HashSet;
    let mut found = Vec::new();
    let mut seen_paths = HashSet::new();

    for root in roots {
        if root.exists() {
            // Walk directories looking for executables
            // Increased depth to 5 to handle deep nesting (e.g. TwinTail/Hoyoverse/Genshin Impact/UUID/...)
            for entry in walkdir::WalkDir::new(&root)
                .max_depth(5)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if entry.file_type().is_file() {
                    let path = entry.path().to_path_buf();

                    // Skip if we've already found this exact file via another root
                    if seen_paths.contains(&path) {
                        continue;
                    }

                    let fname = entry.file_name().to_string_lossy();
                    for t in templates {
                        if t.executables
                            .iter()
                            .any(|exe| exe.eq_ignore_ascii_case(&fname))
                        {
                            seen_paths.insert(path.clone());
                            found.push(DiscoveredGame {
                                template_id: t.id.clone(),
                                path: path.clone(),
                            });
                        }
                    }
                }
            }
        }
    }
    found
}

#[doc(hidden)]
pub fn check_path(path: &Path, templates: &[GameTemplate], results: &mut Vec<DiscoveredGame>) {
    for t in templates {
        for exe in &t.executables {
            let exe_path = path.join(exe);
            if exe_path.exists() {
                results.push(DiscoveredGame {
                    template_id: t.id.clone(),
                    path: exe_path,
                });
                break;
            }
        }
    }
}
