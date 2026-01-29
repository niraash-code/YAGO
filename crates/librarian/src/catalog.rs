use crate::error::Result;
use crate::models::RemoteInfo;
use crate::template::GameTemplate;
use sophon_engine::SophonClient;
use std::collections::HashMap;

#[derive(serde::Serialize, Clone, Debug)]
pub struct RemoteCatalogEntry {
    pub template: GameTemplate,
    pub remote_info: Option<RemoteInfo>,
}

pub struct CatalogManager;

impl CatalogManager {
    pub async fn get_remote_catalog(
        templates: &HashMap<String, GameTemplate>,
        installed_ids: &[String],
    ) -> Result<Vec<RemoteCatalogEntry>> {
        let client = SophonClient::new();
        let mut entries = Vec::new();

        for (id, template) in templates {
            // Filter out already installed games
            if installed_ids.contains(id) {
                continue;
            }

            // Skip templates without Sophon info
            if template.sophon_package_id.is_empty() {
                entries.push(RemoteCatalogEntry {
                    template: template.clone(),
                    remote_info: None,
                });
                continue;
            }

            // Enrich with Sophon data
            let remote_info = match client.get_build(
                &template.sophon_branch,
                &template.sophon_package_id,
                &template.sophon_password,
                &template.sophon_plat_app,
            ).await {
                Ok(build) => {
                    // We also need version and total_size which getBuild might not return directly in its basic form
                    // Actually, SophonClient::get_build returns manifest_url.
                    // We might need to fetch the manifest to get the version and size.
                    
                    match client.fetch_manifest(&build.manifest_url).await {
                        Ok(manifest) => Some(RemoteInfo {
                            manifest_url: build.manifest_url,
                            chunk_base_url: build.chunk_base_url,
                            total_size: manifest.stats.total_size,
                            version: manifest.version,
                            branch: template.sophon_branch.clone(),
                            package_id: template.sophon_package_id.clone(),
                            password: template.sophon_password.clone(),
                            plat_app: template.sophon_plat_app.clone(),
                        }),
                        Err(_) => None,
                    }
                },
                Err(_) => None,
            };

            entries.push(RemoteCatalogEntry {
                template: template.clone(),
                remote_info,
            });
        }

        Ok(entries)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::template::GameTemplate;

    #[tokio::test]
    async fn test_catalog_filtering() {
        let mut templates = HashMap::new();
        templates.insert("genshin".to_string(), GameTemplate {
            id: "genshin".to_string(),
            name: "Genshin Impact".to_string(),
            ..Default::default()
        });
        templates.insert("hsr".to_string(), GameTemplate {
            id: "hsr".to_string(),
            name: "Star Rail".to_string(),
            ..Default::default()
        });

        let installed = vec!["genshin".to_string()];
        
        let catalog = CatalogManager::get_remote_catalog(&templates, &installed).await.unwrap();
        
        assert_eq!(catalog.len(), 1);
        assert_eq!(catalog[0].template.id, "hsr");
    }
}
