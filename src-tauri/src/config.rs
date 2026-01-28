use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub common_loader_repo: String,
    pub reshade_url: String,
    pub proton_repo: String,
    pub default_cover_image: String,
    pub default_icon_image: String,
    pub community_backgrounds_repo: String,
    pub community_backgrounds_base_url: String,
    pub preset_covers: Vec<String>,
    pub yago_update_url: String,
}

impl AppConfig {
    pub fn load(path: std::path::PathBuf) -> Self {
        if let Ok(content) = std::fs::read_to_string(path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
        Self::default()
    }
}

#[allow(clippy::derivable_impls)]
impl Default for AppConfig {
    fn default() -> Self {
        Self {
            common_loader_repo: "SilentNightSound/GIMI-Package".to_string(),
            reshade_url: "https://reshade.me/downloads/latest/standard".to_string(),
            proton_repo: "GloriousEggroll/proton-ge-custom".to_string(),
            default_cover_image:
                "https://raw.githubusercontent.com/YAGO-Project/Assets/main/default_cover.jpg"
                    .to_string(),
            default_icon_image:
                "https://raw.githubusercontent.com/YAGO-Project/Assets/main/default_icon.png"
                    .to_string(),
            community_backgrounds_repo: "UIGF-org/HoYoPlay-Launcher-Background".to_string(),
            community_backgrounds_base_url: "https://raw.githubusercontent.com/UIGF-org/HoYoPlay-Launcher-Background/main/output".to_string(),
            preset_covers: vec![],
            yago_update_url: "https://api.yago.app/updates/latest.json".to_string(),
        }
    }
}
