use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SophonManifest {
    pub version: String,
    pub game_id: String,
    pub chunks: Vec<ChunkInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkInfo {
    pub id: String,
    pub path: String,
    pub size: u64,
    pub md5: String,
    pub is_optional: bool, // For selective Audio Pack installs
}

pub struct SophonProtocol;

impl SophonProtocol {
    pub fn is_delta_needed(current_version: &str, target_version: &str) -> bool {
        current_version != target_version
    }
}
