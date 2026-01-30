use crate::error::{LibrarianError, Result};
use crate::models::{GameConfig, LibraryDatabase};
use crate::storage::Librarian;
use crate::template::GameTemplate;
use chrono::Utc;
use fs_engine::ExeInspector;
use std::collections::HashMap;
use std::path::PathBuf;

pub struct Discovery;

impl Discovery {
    /// Adds a game to the library by its executable path.
    /// Returns the GameID (normalized exe name).
    pub async fn add_game_by_path(
        librarian: &Librarian,
        path: PathBuf,
        templates: &HashMap<String, GameTemplate>,
    ) -> Result<String> {
        if !path.exists() {
            return Err(LibrarianError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Path not found",
            )));
        }

        // 1. Validation
        if !ExeInspector::validate_exe(&path)
            .map_err(|e| LibrarianError::Io(std::io::Error::other(e.to_string())))?
        {
            return Err(LibrarianError::Validation(format!(
                "Not a valid executable (Missing MZ/ELF header). Checked path: {:?}",
                path
            )));
        }

        // 2. Identification
        let exe_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or(LibrarianError::Validation("Invalid filename".to_string()))?
            .to_string();

        // Normalize ID: lowercase filename
        let game_id = exe_name.to_lowercase();

        // 3. Initialization
        let game_dir = librarian.games_root.join(&game_id);
        let mods_dir = game_dir.join("mods");
        let db_path = game_dir.join("game.json");

        if !game_dir.exists() {
            std::fs::create_dir_all(&game_dir)?;
        }
        if !mods_dir.exists() {
            std::fs::create_dir_all(&mods_dir)?;
        }

        if !db_path.exists() {
            let default_profile = crate::models::Profile::default();
            let p_id = default_profile.id;

            // Template Lookup
            // Try exact match (genshinimpact.exe) then stem match (genshinimpact)
            let template = templates.get(&game_id).or_else(|| {
                if game_id.ends_with(".exe") {
                    templates.get(game_id.trim_end_matches(".exe"))
                } else {
                    None
                }
            });

            // Calculate Size
            let install_dir = path.parent().unwrap_or(&path).to_path_buf();
            let size_bytes = fs_engine::Safety::get_dir_size(&install_dir).unwrap_or(0);
            let size_str = format!("{:.1} GB", size_bytes as f64 / 1024.0 / 1024.0 / 1024.0);

            // Create default GameConfig
            let config = GameConfig {
                id: game_id.clone(),
                name: template
                    .map(|t| t.name.clone())
                    .unwrap_or_else(|| game_id.clone()),
                short_name: template
                    .map(|t| t.short_name.clone())
                    .unwrap_or_else(|| game_id.clone()),
                developer: template
                    .map(|t| t.developer.clone())
                    .unwrap_or("Unknown".to_string()),
                description: template
                    .map(|t| t.description.clone())
                    .unwrap_or("Imported by YAGO".to_string()),
                install_path: install_dir,
                exe_path: path.clone(),
                exe_name: exe_name.clone(),
                version: "Unknown".to_string(),
                remote_version: None,
                installed_components: vec![],
                size: size_str,
                color: template
                    .map(|t| t.color.clone())
                    .unwrap_or("slate-400".to_string()),
                accent_color: template
                    .map(|t| t.accent_color.clone())
                    .unwrap_or("#94a3b8".to_string()),
                cover_image: template
                    .map(|t| t.cover_image.clone())
                    .unwrap_or("".to_string()),
                icon: template.map(|t| t.icon.clone()).unwrap_or("".to_string()),
                logo_initial: template
                    .map(|t| t.logo_initial.clone())
                    .unwrap_or_else(|| exe_name.chars().next().unwrap_or('?').to_string()),
                enabled: true,
                added_at: Utc::now(),
                launch_args: template
                    .and_then(|t| t.launch_args.clone())
                    .unwrap_or_default(),
                active_profile_id: p_id.to_string(),
                fps_config: template.and_then(|t| t.fps_config.clone()),
                injection_method: template
                    .and_then(|t| {
                        if cfg!(target_os = "windows") {
                            t.injection_method_windows
                        } else {
                            t.injection_method_linux
                        }
                    })
                    .unwrap_or(crate::models::InjectionMethod::None),
                install_status: crate::models::InstallStatus::Installed,
                auto_update: template.and_then(|t| t.auto_update).unwrap_or(true),
                active_runner_id: None,
                prefix_path: None,
                modloader_enabled: template.and_then(|t| t.modloader_enabled).unwrap_or(true),
                sandbox: crate::models::SandboxConfig::default(),
                loader_repo: template.and_then(|t| t.loader_repo.clone()),
                hash_db_url: template.and_then(|t| t.hash_db_url.clone()),
                patch_logic: template.and_then(|t| t.patch_logic.clone()),
                enable_linux_shield: true,
                supported_injection_methods: template
                    .and_then(|t| t.supported_injection_methods.clone())
                    .unwrap_or_default(),
                remote_info: None,
            };

            let mut db = LibraryDatabase::default();
            db.games.insert(game_id.clone(), config);
            db.profiles.insert(p_id, default_profile);

            // Save initial DB
            librarian.save_game_db(&game_id, &db).await?;
        }

        Ok(game_id)
    }
}
