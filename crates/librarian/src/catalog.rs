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
        let mut processed_template_ids = std::collections::HashSet::new();

        for (id, template) in templates {
            // Deduplicate: If we already processed this template ID, skip
            if !processed_template_ids.insert(template.id.clone()) {
                continue;
            }

            // Filter out already installed games
            if installed_ids.contains(id) || installed_ids.contains(&template.id) {
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
            let remote_info = match client
                .get_build(
                    &template.sophon_branch,
                    &template.sophon_package_id,
                    &template.sophon_password,
                    &template.sophon_plat_app,
                    &template.sophon_game_biz,
                    &template.sophon_launcher_id,
                    &template.sophon_channel_id,
                    &template.sophon_sub_channel_id,
                )
                .await
            {
                Ok(build) => Some(RemoteInfo {
                    manifest_url: build.manifest_url,
                    chunk_base_url: build.chunk_base_url,
                    total_size: build.total_size,
                    version: build.version,
                    branch: template.sophon_branch.clone(),
                    package_id: template.sophon_package_id.clone(),
                    password: template.sophon_password.clone(),
                    plat_app: template.sophon_plat_app.clone(),
                    game_biz: template.sophon_game_biz.clone(),
                }),
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
        templates.insert(
            "genshin".to_string(),
            GameTemplate {
                id: "genshin".to_string(),
                name: "Genshin Impact".to_string(),
                ..Default::default()
            },
        );
        templates.insert(
            "hsr".to_string(),
            GameTemplate {
                id: "hsr".to_string(),
                name: "Star Rail".to_string(),
                ..Default::default()
            },
        );

        let installed = vec!["genshin".to_string()];

        let catalog = CatalogManager::get_remote_catalog(&templates, &installed)
            .await
            .unwrap();

        assert_eq!(catalog.len(), 1);
        assert_eq!(catalog[0].template.id, "hsr");
    }
}
