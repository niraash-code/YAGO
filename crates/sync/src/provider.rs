use crate::error::Result;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct GameInfo {
    pub id: String,
    pub name: String,
    pub display_version: String,
    pub diff_package: Option<GamePackage>,
    pub main_package: GamePackage,
}

#[derive(Debug, Deserialize)]
pub struct GamePackage {
    pub url: String,
    pub md5: String,
    pub size: String,
    pub decompressed_size: String,
}

pub struct Provider;

impl Provider {
    /// Fetches the latest game info from the HoYoverse launcher API.
    /// This is a mock implementation for the MVP using a static URL or logic.
    pub async fn fetch_game_info(game_id: &str) -> Result<GameInfo> {
        // Stub implementation
        Ok(GameInfo {
            id: game_id.to_string(),
            name: "Genshin Impact".to_string(),
            display_version: "4.5.0".to_string(),
            diff_package: None,
            main_package: GamePackage {
                url: "https://autopatchhk.yuanshen.com/client_app/download/20240313_4.5.0_ck3/GenshinImpact_4.5.0.zip".to_string(),
                md5: "mock_md5_hash".to_string(),
                size: "50000000000".to_string(),
                decompressed_size: "60000000000".to_string(),
            }
        })
    }
}
