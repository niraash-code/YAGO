use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SophonManifest {
    pub manifest_id: String,
    pub game_id: String,
    pub version: String,
    pub categories: Vec<ManifestCategory>,
    pub files: Vec<ManifestFile>,
    pub stats: ManifestStats,
    #[serde(default)]
    pub diff_packages: Vec<DiffPackage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffPackage {
    pub from_version: String,
    pub manifest_url: String,
    pub patch_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestCategory {
    pub id: String,
    pub name: String,
    // e.g., "Audio", "Core"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestFile {
    pub name: String, // Relative path
    pub size: u64,
    pub md5: String,
    pub chunks: Vec<FileChunkReference>,
    pub category_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChunkReference {
    pub chunk_id: String, // The hash of the chunk
    pub offset: u64,      // Offset in the file
    pub size: u64,        // Size of this chunk in this file context
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestStats {
    pub total_size: u64,
    pub chunk_count: usize,
    pub file_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkInfo {
    pub id: String,
    pub size: u64,
    pub md5: String,
}

pub struct SophonProtocol;

impl SophonProtocol {
    pub fn is_delta_needed(current_version: &str, target_version: &str) -> bool {
        current_version != target_version
    }
}
