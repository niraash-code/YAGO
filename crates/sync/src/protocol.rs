use crate::proto;
use prost::Message;
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

impl SophonManifest {
    pub fn parse_binary(data: &[u8]) -> Result<Self, String> {
        let proto_manifest = proto::SophonManifest::decode(data)
            .map_err(|e| format!("Protobuf decode failed: {}", e))?;

        let mut files = Vec::new();
        let mut total_size = 0u64;

        for f in proto_manifest.files {
            let mut chunks = Vec::new();
            for c in f.chunks {
                // For local verification, we MUST use chunk_decompressed_md5 and chunk_decompressed_size.
                // chunk_md5 and chunk_size refer to the compressed data as stored on the CDN.
                let decomp_md5 = if !c.chunk_decompressed_md5.is_empty() {
                    c.chunk_decompressed_md5.clone()
                } else if !c.chunk_md5.is_empty() {
                    c.chunk_md5.clone() // Fallback if decompressed md5 is missing
                } else {
                    c.chunk_name.clone()
                };

                let decomp_size = if c.chunk_decompressed_size > 0 {
                    c.chunk_decompressed_size as u64
                } else {
                    c.chunk_size as u64 // Fallback
                };

                chunks.push(FileChunkReference {
                    chunk_id: decomp_md5,
                    chunk_name: c.chunk_name.clone(),
                    offset: c.chunk_on_file_offset as u64,
                    size: decomp_size,
                    compressed_md5: Some(c.chunk_md5.clone()),
                    compressed_size: Some(c.chunk_size as u64),
                });
            }

            files.push(ManifestFile {
                name: f.name,
                size: f.size as u64,
                md5: f.md5,
                chunks,
                category_id: None,
            });
            total_size += f.size as u64;
        }

        Ok(SophonManifest {
            manifest_id: "".to_string(), // Set by client
            game_id: "".to_string(),
            version: "".to_string(),
            categories: Vec::new(),
            files,
            stats: ManifestStats {
                total_size,
                chunk_count: 0,
                file_count: 0,
            },
            diff_packages: Vec::new(),
        })
    }
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
    pub size: u64,
    pub is_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestFile {
    pub name: String,
    pub size: u64,
    pub md5: String,
    pub chunks: Vec<FileChunkReference>,
    pub category_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChunkReference {
    pub chunk_id: String,   // The DECOMPRESSED MD5 for local verification
    pub chunk_name: String, // The actual filename on CDN (Compressed MD5)
    pub offset: u64,
    pub size: u64, // The DECOMPRESSED size
    pub compressed_md5: Option<String>,
    pub compressed_size: Option<u64>,
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
