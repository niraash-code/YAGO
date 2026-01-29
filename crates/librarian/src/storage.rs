use crate::error::{LibrarianError, Result};
use crate::models::{LibraryDatabase, Profile};
use crate::template::GameTemplate;
use chrono::Utc;
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use uuid::Uuid;

pub struct GamePaths {
    pub root: PathBuf,
    pub mods: PathBuf,
    pub db: PathBuf,
    pub profiles: PathBuf,
    pub loader: PathBuf,
    pub prefix: PathBuf,
}

pub struct LibrarianConfig {
    pub base_path: PathBuf,
    pub games_install_path: Option<PathBuf>,
    pub mods_path: Option<PathBuf>,
    pub runners_path: Option<PathBuf>,
    pub prefixes_path: Option<PathBuf>,
    pub cache_path: Option<PathBuf>,
}

#[derive(Clone)]
pub struct Librarian {
    pub base_path: PathBuf,
    pub games_root: PathBuf,
    pub games_install_root: PathBuf,
    pub assets_root: PathBuf,
    pub templates_root: PathBuf,
    pub runners_root: PathBuf,
    pub loaders_root: PathBuf,
    pub prefixes_root: PathBuf,
    pub cache_root: PathBuf,
    pub mods_root: PathBuf,
}

impl Librarian {
    pub fn new(config: LibrarianConfig) -> Self {
        let mut s = Self {
            base_path: config.base_path.clone(),
            games_root: config.base_path.join("games"),
            games_install_root: config
                .games_install_path
                .as_ref()
                .cloned()
                .unwrap_or_else(|| config.base_path.join("Library")),
            assets_root: config.base_path.join("assets"),
            templates_root: config.base_path.join("templates"),
            runners_root: config
                .runners_path
                .as_ref()
                .cloned()
                .unwrap_or_else(|| config.base_path.join("runners")),
            loaders_root: config.base_path.join("loaders"),
            prefixes_root: config
                .prefixes_path
                .as_ref()
                .cloned()
                .unwrap_or_else(|| config.base_path.join("prefixes")),
            cache_root: config
                .cache_path
                .as_ref()
                .cloned()
                .unwrap_or_else(|| config.base_path.join("cache")),
            mods_root: config
                .mods_path
                .as_ref()
                .cloned()
                .unwrap_or_else(|| config.base_path.join("mods")),
        };
        s.update_roots(config);
        s
    }

    pub fn update_roots(&mut self, config: LibrarianConfig) {
        let base = config.base_path;
        self.base_path = base.clone();
        self.games_root = base.join("games");
        self.assets_root = base.join("assets");
        self.templates_root = base.join("templates");
        self.loaders_root = base.join("loaders");

        self.games_install_root = config
            .games_install_path
            .unwrap_or_else(|| base.join("Library"));
        self.runners_root = config.runners_path.unwrap_or_else(|| base.join("runners"));
        self.prefixes_root = config
            .prefixes_path
            .unwrap_or_else(|| base.join("prefixes"));
        self.cache_root = config.cache_path.unwrap_or_else(|| base.join("cache"));
        self.mods_root = config.mods_path.unwrap_or_else(|| base.join("mods"));
    }

    pub fn ensure_core_dirs(&self) -> Result<()> {
        let dirs = [
            &self.games_root,
            &self.games_install_root,
            &self.assets_root,
            &self.templates_root,
            &self.runners_root,
            &self.loaders_root,
            &self.prefixes_root,
            &self.cache_root,
            &self.mods_root,
        ];
        for dir in dirs {
            if !dir.exists() && !dir.as_os_str().is_empty() {
                std::fs::create_dir_all(dir)?;
            }
        }
        Ok(())
    }

    pub fn game_paths(&self, game_id: &str) -> GamePaths {
        let root = self.games_root.join(game_id);
        GamePaths {
            root: root.clone(),
            mods: self.mods_root.join(game_id),
            db: root.join("game.json"),
            profiles: root.join("profiles.json"),
            loader: self.loaders_root.join(game_id),
            prefix: self.prefixes_root.join(game_id),
        }
    }

    pub fn get_profile_data_dir(&self, game_id: &str, profile_id: &Uuid) -> PathBuf {
        self.games_root
            .join(game_id)
            .join("profiles")
            .join(profile_id.to_string())
    }

    pub async fn load_game_db(&self, game_id: &str) -> Result<LibraryDatabase> {
        let paths = self.game_paths(game_id);

        println!("Librarian: Loading database for {}", game_id);

        let mut db = if paths.db.exists() {
            let content = fs::read_to_string(&paths.db).await?;
            serde_json::from_str::<LibraryDatabase>(&content).map_err(|e| {
                eprintln!(
                    "Librarian ERROR: Failed to parse game.json for {}: {}",
                    game_id, e
                );
                LibrarianError::Io(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    e.to_string(),
                ))
            })?
        } else {
            LibraryDatabase {
                version: "1.0".to_string(),
                ..Default::default()
            }
        };

        let mut needs_save = false;

        // Load Profiles separately
        if paths.profiles.exists() {
            let content = fs::read_to_string(&paths.profiles).await?;
            if let Ok(profiles) =
                serde_json::from_str::<HashMap<uuid::Uuid, crate::models::Profile>>(&content)
            {
                db.profiles = profiles;
            } else {
                eprintln!("Librarian WARNING: Failed to parse profiles.json for {}, resetting to default.", game_id);
                needs_save = true;
            }
        }

        // Ensure at least one profile exists and is active
        if db.profiles.is_empty() && !db.games.is_empty() {
            let default_p = crate::models::Profile::default();
            let p_id = default_p.id.to_string();
            db.profiles.insert(default_p.id, default_p);
            if let Some(game) = db.games.get_mut(game_id) {
                game.active_profile_id = p_id;
            }
            needs_save = true;
        }

        // If we fixed the DB structure, save it back
        if needs_save {
            println!(
                "Librarian: DB was fixed/migrated for {}, saving...",
                game_id
            );
            self.save_game_db(game_id, &db).await?;
        }

        Ok(db)
    }

    pub async fn save_game_db(&self, game_id: &str, db: &LibraryDatabase) -> Result<()> {
        let paths = self.game_paths(game_id);
        if !paths.root.exists() {
            fs::create_dir_all(&paths.root).await?;
        }

        // 1. Save game.json (Games + Mods)
        let mut db_clone = db.clone();
        db_clone.profiles = HashMap::new(); // Don't save profiles in game.json

        let content = serde_json::to_string_pretty(&db_clone)?;
        fs::write(&paths.db, content).await?;

        // 2. Save profiles.json
        if !db.profiles.is_empty() {
            let p_content = serde_json::to_string_pretty(&db.profiles)?;
            fs::write(&paths.profiles, p_content).await?;
        }

        Ok(())
    }

    /// Discovers all game IDs by scanning the games_root directory
    pub async fn discover_game_ids(&self) -> Result<Vec<String>> {
        if !self.games_root.exists() {
            return Ok(vec![]);
        }

        let mut ids = vec![];
        let mut entries = fs::read_dir(&self.games_root).await?;

        while let Some(entry) = entries.next_entry().await? {
            if entry.file_type().await?.is_dir() {
                if let Some(id) = entry.file_name().to_str() {
                    if !id.starts_with('.') {
                        ids.push(id.to_string());
                    }
                }
            }
        }
        Ok(ids)
    }

    /// Creates a new profile for a game
    pub async fn create_profile(&self, game_id: &str, name: String) -> Result<Profile> {
        let mut db = self.load_game_db(game_id).await?;
        let profile = Profile {
            id: Uuid::new_v4(),
            name,
            added_at: Utc::now(),
            ..Default::default()
        };
        db.profiles.insert(profile.id, profile.clone());
        self.save_game_db(game_id, &db).await?;
        Ok(profile)
    }

    /// Duplicates an existing profile
    pub async fn duplicate_profile(
        &self,
        game_id: &str,
        source_id: Uuid,
        new_name: String,
    ) -> Result<Profile> {
        let mut db = self.load_game_db(game_id).await?;
        let source = db.profiles.get(&source_id).ok_or_else(|| {
            LibrarianError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Source profile not found",
            ))
        })?;

        let mut new_profile = source.clone();
        new_profile.id = Uuid::new_v4();
        new_profile.name = new_name;
        new_profile.added_at = Utc::now();

        db.profiles.insert(new_profile.id, new_profile.clone());
        self.save_game_db(game_id, &db).await?;
        Ok(new_profile)
    }
}

pub struct TemplateRegistry {
    pub templates_root: PathBuf,
}

impl TemplateRegistry {
    pub fn new(templates_root: PathBuf) -> Self {
        Self { templates_root }
    }

    /// Loads all templates from the templates directory
    pub async fn load_all(&self) -> Result<HashMap<String, GameTemplate>> {
        let mut templates = HashMap::new();
        if !self.templates_root.exists() {
            return Ok(templates);
        }

        let template_vec = crate::template::load_templates(&self.templates_root)?;

        for template in template_vec {
            // Index by executables
            if !template.executables.is_empty() {
                for exe in &template.executables {
                    templates.insert(exe.to_lowercase(), template.clone());
                }
            }

            // Also index by normalized template ID (usually the filename stem)
            templates.insert(template.id.to_lowercase(), template);
        }

        Ok(templates)
    }
}
