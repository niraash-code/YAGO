use crate::error::{Result, SophonError};
use crate::protocol::SophonManifest;
use reqwest::Client;
use serde::Deserialize;

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
    manifest_url: String,
    chunk_base_url: String,
}

#[derive(Debug, Clone)]
pub struct SophonBuildInfo {
    pub manifest_url: String,
    pub chunk_base_url: String,
}

impl Default for SophonClient {
    fn default() -> Self {
        Self::new()
    }
}

impl SophonClient {
    pub fn new() -> Self {
        Self {
            http: Client::new(),
            base_url: SOPHON_API_BASE.to_string(),
        }
    }

    pub async fn get_build(
        &self,
        branch: &str,
        package_id: &str,
        password: &str,
        plat_app: &str,
    ) -> Result<SophonBuildInfo> {
        let url = format!("{}/getBuild", self.base_url);
        let resp = self
            .http
            .get(&url)
            .query(&[
                ("branch", branch),
                ("package_id", package_id),
                ("password", password),
                ("plat_app", plat_app),
            ])
            .send()
            .await
            .map_err(SophonError::Network)?;

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

        Ok(SophonBuildInfo {
            manifest_url: data.manifest_url,
            chunk_base_url: data.chunk_base_url,
        })
    }

    pub async fn fetch_manifest(&self, url: &str) -> Result<SophonManifest> {
        let resp = self
            .http
            .get(url)
            .send()
            .await
            .map_err(SophonError::Network)?;

        let manifest: SophonManifest = resp.json().await.map_err(SophonError::Network)?;

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
