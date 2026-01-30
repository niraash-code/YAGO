use crate::error::{Result, SophonError};
use crate::protocol::SophonManifest;
use reqwest::Client;
use serde::Deserialize;
use std::time::{SystemTime, UNIX_EPOCH};

const SOPHON_API_BASE: &str = "https://sg-public-api.hoyoverse.com/downloader/sophon_chunk/api";

#[derive(Debug, Clone)]
pub struct SophonClient {
    http: Client,
    base_url: String,
}

#[derive(Debug, Deserialize)]
struct GetBuildResponse {
    retcode: i32,
    message: String,
    data: Option<GetBuildData>,
}

#[derive(Debug, Deserialize)]
struct GetBuildData {
    tag: String,
    manifests: Vec<SophonManifestEntry>,
}

#[derive(Debug, Deserialize)]
struct SophonManifestEntry {
    category_id: String,
    category_name: String,
    matching_field: String,
    manifest: SophonManifestId,
    manifest_download: SophonDownloadInfo,
    chunk_download: SophonDownloadInfo,
    stats: SophonManifestStats,
}

#[derive(Debug, Deserialize)]
struct SophonManifestStats {
    uncompressed_size: String,
}

#[derive(Debug, Deserialize)]
struct SophonManifestId {
    id: String,
}

#[derive(Debug, Deserialize)]
struct SophonDownloadInfo {
    url_prefix: String,
}

#[derive(Debug, Clone)]
pub struct SophonBuildInfo {
    pub version: String,
    pub total_size: u64,
    pub manifest_url: String,
    pub chunk_base_url: String,
    pub manifests: Vec<SophonManifestMetadata>,
}

#[derive(Debug, Clone)]
pub struct SophonManifestMetadata {
    pub category_id: String,
    pub category_name: String,
    pub matching_field: String,
    pub manifest_id: String,
    pub url_prefix: String,
    pub uncompressed_size: u64,
}

impl Default for SophonClient {
    fn default() -> Self {
        Self::new()
    }
}

impl SophonClient {
    pub fn new() -> Self {
        Self {
            http: Client::builder()
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .build()
                .unwrap_or_default(),
            base_url: SOPHON_API_BASE.to_string(),
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn get_build(
        &self,
        branch: &str,
        package_id: &str,
        password: &str,
        plat_app: &str,
        game_biz: &str,
        launcher_id: &str,
        channel_id: &str,
        sub_channel_id: &str,
    ) -> Result<SophonBuildInfo> {
        let url = format!("{}/getBuild", self.base_url);

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        // Map plat_app to x-rpc-app_id (Mandatory for Global)
        let app_id = match plat_app {
            "4ziysqXOQ8" => "b9637h60032V", // HSR
            "gopR6Cufr3" => "gc09z866v0cg", // Genshin
            "U5hbdsT9W7" => "v298166v0ccg", // ZZZ
            "5TIVvvcwtM" => "gc09z866v0cg", // HI3 GLB (Often shares with Genshin/Hub)
            _ => "",
        };

        println!("Sophon: getBuild Request -> branch: {}, package_id: {}, plat_app: {}, game_biz: {}, launcher_id: {}", 
            branch, package_id, plat_app, game_biz, launcher_id);

        let mut request = self.http.get(&url).query(&[
            ("branch", branch),
            ("package_id", package_id),
            ("password", password),
            ("plat_app", plat_app),
            ("game_biz", game_biz),
            ("launcher_id", launcher_id),
            ("channel_id", channel_id),
            ("sub_channel_id", sub_channel_id),
            ("is_oversea", "true"),
            ("is_beta", "false"),
            ("language", "en-us"),
            ("t", &now.to_string()),
        ]);

        if !app_id.is_empty() {
            request = request.header("x-rpc-app_id", app_id);
        }

        let resp = request.send().await.map_err(SophonError::Network)?;

        let body: GetBuildResponse = resp.json().await.map_err(SophonError::Network)?;

        if body.retcode != 0 {
            return Err(SophonError::Api(format!(
                "API Error {}: {}",
                body.retcode, body.message
            )));
        }

        let data = body
            .data
            .ok_or_else(|| SophonError::Api("No data in response".to_string()))?;

        // Find the "game" manifest
        let game_entry = data
            .manifests
            .iter()
            .find(|m| m.matching_field == "game")
            .ok_or_else(|| {
                SophonError::Api("No 'game' manifest found in build data".to_string())
            })?;

        let total_size: u64 = data
            .manifests
            .iter()
            .map(|m| m.stats.uncompressed_size.parse::<u64>().unwrap_or_default())
            .sum();

        Ok(SophonBuildInfo {
            version: data.tag.clone(),
            total_size,
            manifest_url: format!(
                "{}/{}",
                game_entry.manifest_download.url_prefix, game_entry.manifest.id
            ),
            chunk_base_url: game_entry.chunk_download.url_prefix.clone(),
            manifests: data
                .manifests
                .into_iter()
                .map(|m| {
                    let size = m.stats.uncompressed_size.parse::<u64>().unwrap_or_default();
                    SophonManifestMetadata {
                        category_id: m.category_id,
                        category_name: m.category_name,
                        matching_field: m.matching_field,
                        manifest_id: m.manifest.id,
                        url_prefix: m.manifest_download.url_prefix,
                        uncompressed_size: size,
                    }
                })
                .collect(),
        })
    }

    pub async fn fetch_manifest(&self, url: &str) -> Result<SophonManifest> {
        let resp = self
            .http
            .get(url)
            .send()
            .await
            .map_err(SophonError::Network)?;

        let bytes = resp.bytes().await.map_err(SophonError::Network)?;

        // Decompress Zstd
        let decompressed = zstd::decode_all(&bytes[..])
            .map_err(|e| SophonError::Api(format!("Failed to decompress manifest: {}", e)))?;

        // Parse Protobuf
        let mut manifest = SophonManifest::parse_binary(&decompressed)
            .map_err(|e| SophonError::Api(format!("Failed to parse manifest protobuf: {}", e)))?;

        // Enrich with ID from URL
        if let Some(id) = url.split('/').next_back() {
            manifest.manifest_id = id.to_string();
        }

        Ok(manifest)
    }

    pub async fn download_raw(&self, url: &str) -> Result<Vec<u8>> {
        let resp = self
            .http
            .get(url)
            .send()
            .await
            .map_err(SophonError::Network)?;

        let bytes = resp.bytes().await.map_err(SophonError::Network)?;

        Ok(bytes.to_vec())
    }
}
