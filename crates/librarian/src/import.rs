use crate::error::{LibrarianError, Result};
use crate::gamedata::hash_db::HashIndex;
use crate::models::{ModCompatibility, ModConfig, ModMetadata, ModRecord};
use crate::Librarian;
use chrono::Utc;
use fs_engine::{extract_and_sanitize, Safety};
use std::collections::HashMap;
use std::io::BufRead;
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub struct Importer;

impl Importer {
    /// Imports a mod archive (zip/7z) into the library transactionally.
    pub async fn import_mod(
        librarian: &Librarian,
        archive_path: PathBuf,
        game_id: String,
    ) -> Result<ModRecord> {
        let file_name = archive_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown Mod")
            .to_string();

        // Step A: Staging
        // We use the system temp dir, or a dedicated cache dir if we had access to app handle.
        // For Librarian, we might prefer a temp folder inside our library root to ensure atomic moves work (same filesystem).
        let staging_root = librarian.games_root.join(".yago_staging");
        if !staging_root.exists() {
            std::fs::create_dir_all(&staging_root)?;
        }

        let staging_uuid = Uuid::new_v4();
        let staging_dir = staging_root.join(staging_uuid.to_string());
        std::fs::create_dir_all(&staging_dir)?;

        // Extract using strict sanitization
        let extraction_report = extract_and_sanitize(&archive_path, &staging_dir).map_err(|e| {
            let _ = std::fs::remove_dir_all(&staging_dir);
            LibrarianError::Io(std::io::Error::other(e.to_string()))
        })?;

        // Step A.5: Preset Detection (ReShade)
        // Heuristic: If it's a single .ini file (or main file is .ini) containing "[Technique]"
        let mut potential_preset = None;
        let walker = walkdir::WalkDir::new(&staging_dir).max_depth(2);
        for entry in walker.into_iter().filter_map(|e| e.ok()) {
            if entry.path().extension().and_then(|s| s.to_str()) == Some("ini") {
                if let Ok(content) = std::fs::read_to_string(entry.path()) {
                    if content.contains("[Technique]")
                        || content.contains("PreprocessorDefinitions=")
                    {
                        potential_preset = Some(entry.path().to_path_buf());
                        break;
                    }
                }
            }
        }

        if let Some(preset_path) = potential_preset {
            // It's a preset!
            let game_dir = librarian.get_game_dir(&game_id);
            let presets_dir = game_dir.join("reshade_presets");
            if !presets_dir.exists() {
                std::fs::create_dir_all(&presets_dir)?;
            }

            let dest_name = archive_path
                .file_stem()
                .and_then(|s| s.to_str())
                .map(|s| format!("{}.ini", s))
                .unwrap_or_else(|| "preset.ini".to_string());

            std::fs::copy(&preset_path, presets_dir.join(&dest_name))?;

            // Cleanup staging
            let _ = std::fs::remove_dir_all(&staging_dir);

            return Err(LibrarianError::ImportedPreset(dest_name));
        }

        // Step B: Metadata Logic
        let mod_json_path = staging_dir.join("mod.json");
        let modinfo_json_path = staging_dir.join("modinfo.json");

        let (metadata, added_at) = if extraction_report.has_mod_json && mod_json_path.exists() {
            let content = std::fs::read_to_string(&mod_json_path)?;
            (
                serde_json::from_str::<ModMetadata>(&content)
                    .unwrap_or_else(|_| Self::generate_default_metadata(&file_name)),
                Utc::now(),
            )
        } else if extraction_report.has_modinfo_json && modinfo_json_path.exists() {
            let content = std::fs::read_to_string(&modinfo_json_path)?;
            (
                serde_json::from_str::<ModMetadata>(&content)
                    .unwrap_or_else(|_| Self::generate_default_metadata(&file_name)),
                Utc::now(),
            )
        } else {
            let meta = Self::generate_default_metadata(&file_name);
            // Write it to disk so the deployed mod has it (normalize to mod.json)
            let content = serde_json::to_string_pretty(&meta).unwrap();
            std::fs::write(&mod_json_path, content)?;

            // Get source file date
            let source_date = std::fs::metadata(&archive_path)
                .and_then(|m| m.modified())
                .map(chrono::DateTime::<Utc>::from)
                .unwrap_or_else(|_| Utc::now());

            (meta, source_date)
        };

        // Step D: Commit (skipping nested root handling for now as sanitize handles paths)
        // If we want nested root stripping, we'd do it here, but let's stick to the prompt's logic.

        let mod_id = Uuid::new_v4();
        let game_mods_dir = librarian.get_mods_dir(&game_id);
        if !game_mods_dir.exists() {
            std::fs::create_dir_all(&game_mods_dir)?;
        }
        let target_path = game_mods_dir.join(mod_id.to_string());

        // Rename/Move
        // Try atomic rename first
        if std::fs::rename(&staging_dir, &target_path).is_err() {
            // If cross-device link error, copy and delete
            if let Err(e) = Safety::copy_recursive_sync(&staging_dir, &target_path) {
                let _ = std::fs::remove_dir_all(&staging_dir);
                return Err(LibrarianError::Io(std::io::Error::other(e.to_string())));
            }
            let _ = std::fs::remove_dir_all(&staging_dir);
        }

        // Calculate Size
        let size_bytes = Safety::get_dir_size(&target_path).unwrap_or(0);
        let size_str = if size_bytes > 1024 * 1024 * 1024 {
            format!("{:.1} GB", size_bytes as f64 / 1024.0 / 1024.0 / 1024.0)
        } else if size_bytes > 1024 * 1024 {
            format!("{:.1} MB", size_bytes as f64 / 1024.0 / 1024.0)
        } else {
            format!("{:.1} KB", size_bytes as f64 / 1024.0)
        };

        // Update DB
        let mut db = librarian.load_game_db(&game_id).await?;

        let (character, mod_type, hashes) =
            Self::identify_character_and_type(&target_path, &librarian.assets_root, &game_id);
        let mut config = ModConfig {
            tags: vec![mod_type],
            keybinds: HashMap::new(),
        };
        let mut metadata_final = metadata;
        Self::scan_for_nsfw(&mut metadata_final, &mut config, &file_name);

        let record = ModRecord {
            id: mod_id,
            owner_game_id: game_id.clone(),
            path: target_path,
            size: size_str,
            meta: metadata_final,
            compatibility: ModCompatibility {
                game: "Unknown".to_string(), // Inferred later?
                character,
                hashes,
                fingerprint: "".to_string(),
            },
            config,
            enabled: true,
            added_at,
        };

        db.mods.insert(mod_id, record.clone());

        // Update Active Profile (Append to Load Order & Enable by default)
        if let Some(game_config) = db.games.get(&game_id) {
            if let Ok(p_uuid) = Uuid::parse_str(&game_config.active_profile_id) {
                if let Some(profile) = db.profiles.get_mut(&p_uuid) {
                    profile.load_order.push(mod_id);
                    profile.enabled_mod_ids.push(mod_id);
                }
            }
        }

        librarian.save_game_db(&game_id, &db).await?;

        Ok(record)
    }

    fn identify_character_and_type(
        staging_dir: &Path,
        assets_root: &Path,
        game_id: &str,
    ) -> (String, String, Vec<String>) {
        let mut character = "Unknown".to_string();
        let mut mod_type = "Unknown/Global".to_string();
        let mut hashes = Vec::new();

        // 1. Try to load Hash DB
        // Priority 1: Game-specific dynamic hash db
        let game_hash_path = assets_root.join("hashes").join(format!("{}.json", game_id));
        // Priority 2: Global fallback
        let global_hash_path = assets_root.join("hashes.json");

        let hash_index = if game_hash_path.exists() {
            HashIndex::load(&game_hash_path).unwrap_or_default()
        } else {
            HashIndex::load(&global_hash_path).unwrap_or_default()
        };

        // 2. Scan for INIs
        let walker = walkdir::WalkDir::new(staging_dir).max_depth(3);
        for entry in walker.into_iter().filter_map(|e| e.ok()) {
            if entry.path().extension().and_then(|s| s.to_str()) == Some("ini") {
                if let Ok(file) = std::fs::File::open(entry.path()) {
                    let reader = std::io::BufReader::new(file);
                    #[allow(clippy::lines_filter_map_ok)]
                    for line in reader.lines().filter_map(|l| l.ok()) {
                        let lower = line.to_lowercase();
                        if lower.contains("hash") && lower.contains('=') {
                            if let Some(hash_val) = lower.split('=').nth(1) {
                                let hash = hash_val.trim().trim_matches('"');
                                if !hash.is_empty() {
                                    hashes.push(hash.to_string());
                                    if let Some(char_name) = hash_index.identify(hash) {
                                        character = char_name;
                                        mod_type = "Skin".to_string();
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        (character, mod_type, hashes)
    }

    fn scan_for_nsfw(metadata: &mut ModMetadata, config: &mut ModConfig, filename: &str) {
        let nsfw_keywords = ["nsfw", "nude", "18+", "explicit", "bikini", "skimpy"];
        let mut is_nsfw = false;

        let content = format!(
            "{} {}",
            filename,
            metadata.description.as_ref().unwrap_or(&"".to_string())
        )
        .to_lowercase();

        for kw in nsfw_keywords {
            if content.contains(kw) {
                is_nsfw = true;
                break;
            }
        }

        if is_nsfw && !config.tags.iter().any(|t| t.to_lowercase() == "nsfw") {
            config.tags.push("NSFW".to_string());
        }
    }

    fn generate_default_metadata(filename: &str) -> ModMetadata {
        // Clever name: lisatoggle.zip -> Lisatoggle
        let stem = Path::new(filename)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(filename);

        // Capitalize words
        let clever_name = stem
            .split([' ', '_', '-'])
            .map(|word| {
                let mut chars = word.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                }
            })
            .collect::<Vec<_>>()
            .join(" ");

        ModMetadata {
            name: clever_name,
            version: "1.0".to_string(),
            author: "Unknown".to_string(),
            url: None,
            preview_image: None,
            description: Some(format!("Generated from {}", filename)),
        }
    }
}
