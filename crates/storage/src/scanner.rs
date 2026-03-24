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

/// Scans a specific directory recursively for supported games.
pub fn recursive_scan(
    root: &Path,
    templates: &[GameTemplate],
    max_depth: usize,
) -> Vec<DiscoveredGame> {
    scan_roots(templates, vec![root.to_path_buf()], max_depth)
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

#[doc(hidden)]
pub fn scan_roots(
    templates: &[GameTemplate],
    roots: Vec<PathBuf>,
    max_depth: usize,
) -> Vec<DiscoveredGame> {
    use std::collections::HashSet;
    let mut found = Vec::new();
    let mut seen_paths = HashSet::new();

    for root in roots {
        if root.exists() {
            // Walk directories looking for executables
            for entry in walkdir::WalkDir::new(&root)
                .max_depth(max_depth)
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

#[cfg(target_os = "linux")]
fn scan_linux(templates: &[GameTemplate]) -> Vec<DiscoveredGame> {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/home"));
    let candidates = vec![
        home.join("Games"),
        home.join(".steam/steam/steamapps/common"),
        home.join(".local/share/steam/steamapps/common"),
        home.join(".local/share/lutris/runners/wine"),
    ];

    scan_roots(templates, candidates, 5)
}

#[doc(hidden)]
pub fn check_path(path: &Path, templates: &[GameTemplate], results: &mut Vec<DiscoveredGame>) {
    for t in templates {
        for exe in &t.executables {
            let exe_path = path.join(exe);
            if exe_path.exists() && exe_path.is_file() {
                results.push(DiscoveredGame {
                    template_id: t.id.clone(),
                    path: exe_path,
                });
                break;
            }

            // Linux fallback: try without .exe if not present
            #[cfg(target_os = "linux")]
            if exe.to_lowercase().ends_with(".exe") {
                let stem = exe.trim_end_matches(".exe");
                let stem_path = path.join(stem);
                if stem_path.exists() && stem_path.is_file() {
                    results.push(DiscoveredGame {
                        template_id: t.id.clone(),
                        path: stem_path,
                    });
                    break;
                }
            }
        }
    }
}
