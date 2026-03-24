use crate::protocol::SophonManifest;
use std::fs;
use std::path::Path;

pub struct Verifier;

impl Verifier {
    /// Finalizes the version by writing config.ini and component pkg_version files.
    pub fn commit_version(
        game_dir: &Path,
        version: &str,
        manifests: &[SophonManifest],
    ) -> Result<(), std::io::Error> {
        // 1. Update config.ini
        let ini_path = game_dir.join("config.ini");
        let mut content = if ini_path.exists() {
            fs::read_to_string(&ini_path).unwrap_or_default()
        } else {
            "[General]\n".to_string()
        };

        // Replace or add game_version
        if content.contains("game_version=") {
            content = content
                .lines()
                .map(|line| {
                    if line.trim().starts_with("game_version=") {
                        format!("game_version={}", version)
                    } else {
                        line.to_string()
                    }
                })
                .collect::<Vec<_>>()
                .join("\n");
        } else {
            content.push_str(&format!("game_version={}\n", version));
        }

        fs::write(&ini_path, content)?;

        // 2. Create pkg_version files for components
        for manifest in manifests {
            let mut pkg_content = String::new();
            for file in &manifest.files {
                let line = format!(
                    "{{\"remoteName\": \"{}\", \"md5\": \"{}\", \"fileSize\": {}}}\n",
                    file.name, file.md5, file.size
                );
                pkg_content.push_str(&line);
            }

            // Heuristic for pkg_version filename
            let pkg_filename = if manifests.len() == 1 {
                "pkg_version".to_string()
            } else {
                // If it looks like audio, name it accordingly
                if pkg_content.contains("AudioAssets") {
                    // Try to extract language from file paths
                    if pkg_content.contains("English(US)") {
                        "Audio_English(US)_pkg_version".to_string()
                    } else if pkg_content.contains("Chinese") {
                        "Audio_Chinese_pkg_version".to_string()
                    } else {
                        "pkg_version".to_string()
                    }
                } else {
                    "pkg_version".to_string()
                }
            };

            let pkg_path = game_dir.join(pkg_filename);
            fs::write(pkg_path, pkg_content)?;
        }

        Ok(())
    }
}
