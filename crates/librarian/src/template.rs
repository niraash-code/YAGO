use crate::error::Result;
use crate::models::{FpsConfig, InjectionMethod};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GameTemplate {
    #[serde(default)]
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub short_name: String,
    #[serde(default)]
    pub developer: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub color: String,
    #[serde(default)]
    pub accent_color: String,
    #[serde(default)]
    pub cover_image: String,
    #[serde(default)]
    pub icon: String,
    #[serde(default)]
    pub logo_initial: String,
    #[serde(default)]
    pub regions: u32,
    #[serde(default)]
    pub executables: Vec<String>,
    #[serde(default)]
    pub logic_type: String,

    // External Resources
    #[serde(default)]
    pub loader_repo: Option<String>, // e.g., "SpectrumQT/WWMI-Package"

    #[serde(default)]
    pub hash_db_url: Option<String>, // New: Raw GitHub URL for character hash map

    // Logic/Patching Config
    #[serde(default)]
    pub patch_logic: Option<HashMap<String, String>>, // e.g., {"Constants/global_persist_$orfix": "1"}

    // Configuration Presets
    #[serde(default)]
    pub injection_method_linux: Option<InjectionMethod>,
    #[serde(default)]
    pub injection_method_windows: Option<InjectionMethod>,
    #[serde(default)]
    pub modloader_enabled: Option<bool>,
    #[serde(default)]
    pub supported_injection_methods: Option<Vec<InjectionMethod>>,
    #[serde(default)]
    pub launch_args: Option<Vec<String>>,
    #[serde(default)]
    pub fps_config: Option<FpsConfig>,
    #[serde(default)]
    pub auto_update: Option<bool>,
    #[serde(default)]
    pub community_folder: Option<String>,
}

pub fn load_templates(dir: &Path) -> Result<Vec<GameTemplate>> {
    let mut templates = Vec::new();
    if !dir.exists() {
        return Ok(templates);
    }

    for entry in walkdir::WalkDir::new(dir).min_depth(1).max_depth(1) {
        let entry = entry.map_err(|e| std::io::Error::other(e.to_string()))?; // Basic mapping
        if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
            let content = std::fs::read_to_string(entry.path())?;
            let mut template: GameTemplate = serde_json::from_str(&content)
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string()))?;

            // Auto-fill ID from filename if missing
            if template.id.is_empty() {
                if let Some(stem) = entry.path().file_stem().and_then(|s| s.to_str()) {
                    template.id = stem.to_string();
                }
            }

            // Resolve local assets to full yago-asset:// paths
            let resolve_local = |url: &str| -> String {
                if url.is_empty() || url.starts_with("http") || url.starts_with("yago-asset://") {
                    url.to_string()
                } else {
                    // Assume local file relative to templates directory
                    // Strip any redundant prefixes if they exist
                    let file_name = url.strip_prefix("local://").unwrap_or(url);
                    let file_name = file_name.strip_prefix("templates/").unwrap_or(file_name);

                    let full_path = dir.join(file_name);
                    let path_lossy = full_path.to_string_lossy();
                    let encoded = urlencoding::encode(&path_lossy);
                    format!("yago-asset://localhost/{}", encoded)
                }
            };

            template.cover_image = resolve_local(&template.cover_image);
            template.icon = resolve_local(&template.icon);

            templates.push(template);
        }
    }
    Ok(templates)
}
