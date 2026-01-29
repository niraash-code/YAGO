use crate::error::{LibrarianError, Result};
use crate::models::{LibraryDatabase, Profile};
use crate::template::GameTemplate;
use chrono::Utc;
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use uuid::Uuid;

pub struct Librarian {
    pub games_root: PathBuf,
    pub assets_root: PathBuf,
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

impl Librarian {
    pub fn new(games_root: PathBuf, assets_root: PathBuf) -> Self {
        Self {
            games_root,
            assets_root,
        }
    }

    /// Resolves the path to a specific game's directory
    pub fn get_game_dir(&self, game_id: &str) -> PathBuf {
        self.games_root.join(game_id)
    }

    /// Resolves the path to a specific game's JSON database
    pub fn get_db_path(&self, game_id: &str) -> PathBuf {
        self.get_game_dir(game_id).join("game.json")
    }

    /// Resolves the path to a specific game's mods directory
    pub fn get_mods_dir(&self, game_id: &str) -> PathBuf {
        self.get_game_dir(game_id).join("mods")
    }

    /// Resolves the path to a specific game's profiles JSON
    pub fn get_profiles_path(&self, game_id: &str) -> PathBuf {
        self.get_game_dir(game_id).join("profiles.json")
    }

    /// Resolves the path to a specific profile's data directory (for sandboxing)
    pub fn get_profile_data_dir(&self, game_id: &str, profile_id: &Uuid) -> PathBuf {
        self.get_game_dir(game_id)
            .join("profiles")
            .join(profile_id.to_string())
    }

    pub async fn load_game_db(&self, game_id: &str) -> Result<LibraryDatabase> {
        let path = self.get_db_path(game_id);
        let profiles_path = self.get_profiles_path(game_id);

        println!("Librarian: Loading database for {}", game_id);

        let mut db = if path.exists() {
            let content = fs::read_to_string(&path).await?;
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
        if profiles_path.exists() {
            let content = fs::read_to_string(&profiles_path).await?;
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
        let game_dir = self.get_game_dir(game_id);
        if !game_dir.exists() {
            fs::create_dir_all(&game_dir).await?;
        }

        // 1. Save game.json (Games + Mods)
        let path = self.get_db_path(game_id);
        let mut db_clone = db.clone();
        db_clone.profiles = HashMap::new(); // Don't save profiles in game.json

        let content = serde_json::to_string_pretty(&db_clone)?;
        fs::write(&path, content).await?;

        // 2. Save profiles.json
        if !db.profiles.is_empty() {
            let profiles_path = self.get_profiles_path(game_id);
            let p_content = serde_json::to_string_pretty(&db.profiles)?;
            fs::write(&profiles_path, p_content).await?;
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
