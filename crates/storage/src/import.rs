use crate::error::{LibrarianError, Result};
use crate::gamedata::hash_db::HashIndex;
use crate::models::{
    ImportCandidate, ImportWarning, Keybind, ModCompatibility, ModConfig, ModMetadata, ModRecord,
};
use crate::Librarian;
use chrono::Utc;
use vfs::{extract_and_sanitize, is_allowed, ExtractionReport};
use ini::IniCompiler;
use std::collections::HashMap;
use std::io;
use std::io::BufRead;
use std::path::{Path, PathBuf};
use std::process::Command;
use uuid::Uuid;

pub struct Importer;

impl Importer {
    /// Scans a directory for potential mods to import.
    pub fn scan_directory(
        target_dir: &Path,
        assets_root: &Path,
        game_id: &str,
    ) -> Result<Vec<ImportCandidate>> {
        let mut candidates = Vec::new();

        if !target_dir.exists() {
            return Err(LibrarianError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Target directory does not exist",
            )));
        }

        // 1. Identify Candidate Folders and Archives
        let walker = walkdir::WalkDir::new(target_dir).max_depth(4);
        for entry in walker.into_iter().filter_map(|e| e.ok()) {
            let path = entry.path().to_path_buf();

            // Skip internal yago directories
            if path.components().any(|c| {
                c.as_os_str()
                    .to_string_lossy()
                    .to_lowercase()
                    .starts_with(".yago")
            }) {
                continue;
            }

            if path.is_dir() {
                let has_ini = std::fs::read_dir(&path)
                    .map(|rd| {
                        rd.flatten().any(|e| {
                            let is_ini = e.path().is_file()
                                && e.path()
                                    .extension()
                                    .and_then(|s| s.to_str())
                                    .map(|s| s.to_lowercase())
                                    == Some("ini".to_string());
                            is_ini
                        })
                    })
                    .unwrap_or(false);

                if has_ini {
                    // Avoid adding subfolders of an already identified mod
                    if candidates
                        .iter()
                        .any(|c: &ImportCandidate| path.starts_with(&c.original_path))
                    {
                        continue;
                    }

                    let file_name = path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("Unknown");

                    let mut suggested_name = file_name.to_string();
                    let mut initial_state = true;

                    if suggested_name.to_lowercase().starts_with("disabled") {
                        initial_state = false;
                        suggested_name = suggested_name
                            .strip_prefix("DISABLED_")
                            .or_else(|| suggested_name.strip_prefix("disabled_"))
                            .or_else(|| suggested_name.strip_prefix("DISABLED"))
                            .or_else(|| suggested_name.strip_prefix("disabled"))
                            .unwrap_or(&suggested_name)
                            .to_string();
                    }

                    let (topology, entry_ini) = Self::identify_topology(&path);
                    let preview_image = Self::find_thumbnail(&path);

                    // Identity Crisis: Perform early character identification
                    let (character, _, _) =
                        Self::identify_character_and_type(&path, assets_root, game_id);
                    let identified_character = if character != "Unknown" {
                        Some(character)
                    } else {
                        None
                    };

                    let mut warnings = Vec::new();
                    if entry_ini.is_none() {
                        warnings.push(ImportWarning {
                            level: "Warning".to_string(),
                            message: "No configuration file (.ini) found in folder.".to_string(),
                        });
                    }

                    if topology == "Standard" {
                        let loose_files = std::fs::read_dir(&path)
                            .map(|rd| {
                                rd.flatten()
                                    .filter(|e| e.path().is_file())
                                    .collect::<Vec<_>>()
                            })
                            .unwrap_or_default();

                        if loose_files.len() > 20 {
                            warnings.push(ImportWarning {
                                level: "Info".to_string(),
                                message:
                                    "Many loose files detected in root. Recommended to check structure."
                                        .to_string(),
                            });
                        }
                    }

                    candidates.push(ImportCandidate {
                        original_path: path,
                        suggested_name,
                        identified_character,
                        detected_topology: topology,
                        preview_image,
                        initial_state,
                        warnings,
                    });
                }
            } else if path.is_file() {
                // Support Archive Files
                let ext = path
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_lowercase());
                if ext == Some("zip".to_string())
                    || ext == Some("7z".to_string())
                    || ext == Some("rar".to_string())
                {
                    let file_name = path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("Unknown Archive");

                    let mut suggested_name = path
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or(file_name)
                        .to_string();
                    let mut initial_state = true;

                    if suggested_name.to_lowercase().starts_with("disabled") {
                        initial_state = false;
                        suggested_name = suggested_name
                            .strip_prefix("DISABLED_")
                            .or_else(|| suggested_name.strip_prefix("disabled_"))
                            .or_else(|| suggested_name.strip_prefix("DISABLED"))
                            .or_else(|| suggested_name.strip_prefix("disabled"))
                            .unwrap_or(&suggested_name)
                            .to_string();
                    }

                    // Alchemy: Peek into archive to identify character
                    let mut identified_character = None;
                    if let Ok(temp_dir) = tempfile::tempdir() {
                        // Just extract the first .ini we can find to save time
                        let _ = Command::new("7z")
                            .arg("e")
                            .arg(&path)
                            .arg("-o")
                            .arg(temp_dir.path())
                            .arg("*.ini")
                            .arg("-r")
                            .arg("-y")
                            .output();

                        let (character, _, _) = Self::identify_character_and_type(
                            temp_dir.path(),
                            assets_root,
                            game_id,
                        );
                        if character != "Unknown" {
                            identified_character = Some(character);
                        }
                    }

                    candidates.push(ImportCandidate {
                        original_path: path,
                        suggested_name,
                        identified_character,
                        detected_topology: "Archive".to_string(),
                        preview_image: None,
                        initial_state,
                        warnings: Vec::new(),
                    });
                }
            }
        }

        Ok(candidates)
    }

    /// Imports a mod archive (zip/7z) or folder into the library transactionally.
    pub async fn import_mod(
        librarian: &Librarian,
        archive_path: PathBuf,
        game_id: String,
    ) -> Result<ModRecord> {
        let mut file_name = archive_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown Mod")
            .to_string();

        let mut initial_enabled = true;
        if file_name.to_lowercase().starts_with("disabled") {
            initial_enabled = false;
            file_name = file_name
                .strip_prefix("DISABLED_")
                .or_else(|| file_name.strip_prefix("disabled_"))
                .or_else(|| file_name.strip_prefix("DISABLED"))
                .or_else(|| file_name.strip_prefix("disabled"))
                .unwrap_or(&file_name)
                .to_string();
        }

        // Step A: Staging
        let staging_root = librarian.games_root.join(".yago_staging");
        if !staging_root.exists() {
            std::fs::create_dir_all(&staging_root)?;
        }

        let staging_uuid = Uuid::new_v4();
        let staging_dir = staging_root.join(staging_uuid.to_string());
        std::fs::create_dir_all(&staging_dir)?;

        let extraction_report = if archive_path.is_dir() {
            vfs::Safety::copy_recursive_sync(&archive_path, &staging_dir).map_err(|e| {
                let _ = std::fs::remove_dir_all(&staging_dir);
                LibrarianError::Io(std::io::Error::other(e.to_string()))
            })?;
            Self::sanitize_staging_in_place(&staging_dir)?
        } else {
            extract_and_sanitize(&archive_path, &staging_dir).map_err(|e| {
                let _ = std::fs::remove_dir_all(&staging_dir);
                LibrarianError::Io(std::io::Error::other(e.to_string()))
            })?
        };

        // Step A.5: Preset Detection (ReShade)
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
            let game_paths = librarian.game_paths(&game_id);
            let presets_dir = game_paths.root.join("reshade_presets");
            if !presets_dir.exists() {
                std::fs::create_dir_all(&presets_dir)?;
            }

            let dest_name = archive_path
                .file_stem()
                .and_then(|s| s.to_str())
                .map(|s| format!("{}.ini", s))
                .unwrap_or_else(|| "preset.ini".to_string());

            std::fs::copy(&preset_path, presets_dir.join(&dest_name))?;
            let _ = std::fs::remove_dir_all(&staging_dir);
            return Err(LibrarianError::ImportedPreset(dest_name));
        }

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
            (meta, Utc::now())
        };

        let mod_id = Uuid::new_v4();
        let game_paths = librarian.game_paths(&game_id);
        let target_path = game_paths.mods.join(mod_id.to_string());

        vfs::Safety::atomic_import(&staging_dir, &target_path).await?;

        // 1. Transcode non-DDS assets to DDS for bit-perfect compatibility on Linux/Proton
        // 2. Cloak INI files to prevent double-loading by 3dmigoto
        let walker = walkdir::WalkDir::new(&target_path).max_depth(4);
        for entry in walker.into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if ext_lower == "ini" {
                        let new_name = format!(
                            "{}.yago_source",
                            path.file_name().unwrap().to_string_lossy()
                        );
                        let new_path = path.with_file_name(new_name);
                        let _ = std::fs::rename(path, new_path);
                    } else if matches!(ext_lower.as_str(), "png" | "jpg" | "jpeg" | "tga" | "webp")
                    {
                        // Attempt to transcode to DDS
                        if let Ok(Some(_)) = vfs::Transcoder::to_dds(path) {
                            // If successful, we can optionally delete the original?
                            // For now, keep both, but the Namespacer will prioritize the .dds
                        }
                    }
                }
            }
        }

        let size_bytes = vfs::Safety::get_dir_size(&target_path).unwrap_or(0);
        let size_str = if size_bytes > 1024 * 1024 {
            format!("{:.1} MB", size_bytes as f64 / 1024.0 / 1024.0)
        } else {
            format!("{:.1} KB", size_bytes as f64 / 1024.0)
        };

        let mut db = librarian.load_game_db(&game_id).await?;

        let (character, mod_type, hashes) =
            Self::identify_character_and_type(&target_path, &librarian.assets_root, &game_id);
        let (topology, _entry_point) = Self::identify_topology(&target_path);
        let thumbnail = Self::find_thumbnail(&target_path);

        let mut config = ModConfig {
            mod_type: Some(mod_type.clone()),
            tags: vec![mod_type.clone(), topology],
            keybinds: Self::harvest_keybinds(&target_path),
        };

        if character != "Unknown" && !config.tags.contains(&character) {
            config.tags.push(character.clone());
        }

        let mut metadata_final = metadata;
        if character != "Unknown"
            && !metadata_final
                .name
                .to_lowercase()
                .contains(&character.to_lowercase())
        {
            metadata_final.name = format!("[{}] {}", character, metadata_final.name);
        }

        if let Some(t) = thumbnail {
            metadata_final.preview_image = Some(t);
        }

        Self::scan_for_nsfw(&mut metadata_final, &mut config, &file_name);

        let record = ModRecord {
            id: mod_id,
            owner_game_id: game_id.clone(),
            path: target_path,
            size: size_str,
            meta: metadata_final,
            compatibility: ModCompatibility {
                game: "Unknown".to_string(),
                character,
                hashes,
                fingerprint: "".to_string(),
            },
            config,
            enabled: initial_enabled,
            added_at,
        };

        db.mods.insert(mod_id, record.clone());

        if let Some(game_config) = db.games.get(&game_id) {
            if let Ok(p_uuid) = Uuid::parse_str(&game_config.active_profile_id) {
                if let Some(profile) = db.profiles.get_mut(&p_uuid) {
                    profile.load_order.push(mod_id);
                    if initial_enabled {
                        profile.enabled_mod_ids.push(mod_id);
                    }
                }
            }
        }

        librarian.save_game_db(&game_id, &db).await?;

        Ok(record)
    }

    fn sanitize_staging_in_place(staging_dir: &Path) -> Result<ExtractionReport> {
        let mut report = ExtractionReport {
            files_ignored: Vec::new(),
            has_mod_json: false,
            has_modinfo_json: false,
        };

        // 1. First Pass: Delete disallowed files
        let walker = walkdir::WalkDir::new(staging_dir).contents_first(true);
        for entry in walker.into_iter().filter_map(|e| e.ok()) {
            if entry.path().is_file() {
                let name = entry.file_name().to_string_lossy();
                if !is_allowed(&name) {
                    report.files_ignored.push(name.to_string());
                    let _ = std::fs::remove_file(entry.path());
                    continue;
                }

                if name == "mod.json" {
                    report.has_mod_json = true;
                } else if name == "modinfo.json" {
                    report.has_modinfo_json = true;
                }
            }
        }

        // 2. The Matryoshka Test: Hoist content from nested directories
        let mut entries = Vec::new();
        for entry in walkdir::WalkDir::new(staging_dir)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.path().is_file() {
                entries.push(entry.path().to_path_buf());
            }
        }

        if !entries.is_empty() {
            let mut prefix = entries[0].parent().unwrap().to_path_buf();
            for entry in &entries[1..] {
                while !entry.starts_with(&prefix) {
                    if let Some(parent) = prefix.parent() {
                        prefix = parent.to_path_buf();
                    } else {
                        break;
                    }
                }
            }

            if prefix.starts_with(staging_dir) && prefix != staging_dir {
                println!("MATRYOSHKA: Hoisting content from {:?}", prefix);
                // Create a temporary staging for hoisting
                let temp_hoist = staging_dir.parent().unwrap().join(".yago_hoist");
                let _ = std::fs::remove_dir_all(&temp_hoist);
                std::fs::create_dir_all(&temp_hoist)?;

                for entry in entries {
                    let rel = entry.strip_prefix(&prefix).unwrap();
                    let dest = temp_hoist.join(rel);
                    if let Some(p) = dest.parent() {
                        std::fs::create_dir_all(p)?;
                    }
                    std::fs::copy(&entry, &dest)?;
                }

                // Wipe staging and move hoisted back
                std::fs::remove_dir_all(staging_dir)?;
                std::fs::create_dir_all(staging_dir)?;
                for e in walkdir::WalkDir::new(&temp_hoist)
                    .min_depth(1)
                    .max_depth(1)
                    .into_iter()
                    .flatten()
                {
                    let dest = staging_dir.join(e.file_name());
                    if e.path().is_dir() {
                        vfs::Safety::copy_recursive_sync(e.path(), &dest)
                            .map_err(|e| LibrarianError::Io(io::Error::other(e.to_string())))?;
                    } else {
                        std::fs::copy(e.path(), &dest)?;
                    }
                }
                let _ = std::fs::remove_dir_all(&temp_hoist);
            }
        }

        Ok(report)
    }

    fn identify_topology(staging_dir: &Path) -> (String, Option<PathBuf>) {
        let mut root_inis = Vec::new();
        if let Ok(entries) = std::fs::read_dir(staging_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name_str = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                let is_ini = path
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_lowercase())
                    == Some("ini".to_string());
                let is_source = name_str.to_lowercase().ends_with(".ini.yago_source");

                if (is_ini || is_source) && path.is_file() {
                    let name = name_str;
                    if !name.to_lowercase().starts_with("disabled") {
                        root_inis.push(path);
                    }
                }
            }
        }

        if !root_inis.is_empty() {
            let entry_point = root_inis
                .iter()
                .find(|p| {
                    let n = p
                        .file_name()
                        .and_then(|s| s.to_str())
                        .unwrap_or("")
                        .to_lowercase();
                    n == "merged.ini" || n == "merged.ini.yago_source"
                })
                .cloned()
                .or_else(|| root_inis.first().cloned());

            ("Merged".to_string(), entry_point)
        } else {
            let mut first_ini = None;
            let walker = walkdir::WalkDir::new(staging_dir).max_depth(4);
            for entry in walker.into_iter().flatten() {
                let path = entry.path();
                let name_str = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                let is_ini = path
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_lowercase())
                    == Some("ini".to_string());
                let is_source = name_str.to_lowercase().ends_with(".ini.yago_source");

                if (is_ini || is_source) && path.is_file() {
                    first_ini = Some(path.to_path_buf());
                    break;
                }
            }
            ("Standard".to_string(), first_ini)
        }
    }

    fn find_thumbnail(staging_dir: &Path) -> Option<String> {
        let common_names = [
            "preview.jpg",
            "preview.png",
            "thumbnail.jpg",
            "thumbnail.png",
        ];
        for name in common_names {
            let path = staging_dir.join(name);
            if path.exists() {
                return Some(name.to_string());
            }
        }
        None
    }

    fn identify_character_and_type(
        staging_dir: &Path,
        assets_root: &Path,
        game_id: &str,
    ) -> (String, String, Vec<String>) {
        let mut character = "Unknown".to_string();
        let mut mod_type = "global".to_string();
        let mut hashes = Vec::new();

        let game_hash_path = assets_root.join("hashes").join(format!("{}.json", game_id));
        let global_hash_path = assets_root.join("hashes.json");

        let hash_index = if game_hash_path.exists() {
            HashIndex::load(&game_hash_path).unwrap_or_default()
        } else {
            HashIndex::load(&global_hash_path).unwrap_or_default()
        };

        let mut inis_to_scan = Vec::new();
        if let Ok(entries) = std::fs::read_dir(staging_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name_str = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                let is_ini = path
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_lowercase())
                    == Some("ini".to_string());
                let is_source = name_str.to_lowercase().ends_with(".ini.yago_source");

                if (is_ini || is_source) && path.is_file() {
                    let name = name_str;
                    if name.to_lowercase().starts_with("merged.ini") {
                        inis_to_scan.insert(0, path);
                    } else if !name.to_lowercase().starts_with("disabled") {
                        inis_to_scan.push(path);
                    }
                }
            }
        }

        if inis_to_scan.is_empty() {
            let walker = walkdir::WalkDir::new(staging_dir).max_depth(3);
            for entry in walker.into_iter().filter_map(|e| e.ok()) {
                let path = entry.path();
                let name_str = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                let is_ini = path
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_lowercase())
                    == Some("ini".to_string());
                let is_source = name_str.to_lowercase().ends_with(".ini.yago_source");

                if is_ini || is_source {
                    inis_to_scan.push(entry.path().to_path_buf());
                }
            }
        }

        for ini_path in inis_to_scan {
            if let Ok(file) = std::fs::File::open(&ini_path) {
                let reader = std::io::BufReader::new(file);
                for line in reader.lines().map_while(|l| l.ok()) {
                    let lower = line.to_lowercase();
                    if lower.contains("hash") && lower.contains('=') {
                        if let Some(hash_val) = lower.split('=').nth(1) {
                            let hash = hash_val.trim().trim_matches('"');
                            if !hash.is_empty() {
                                hashes.push(hash.to_string());
                                if character == "Unknown" {
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
            if character != "Unknown" {
                break;
            }
        }

        (character, mod_type, hashes)
    }

    fn harvest_keybinds(staging_dir: &Path) -> HashMap<String, Keybind> {
        let mut keybinds = HashMap::new();
        let compiler = IniCompiler::default();

        let walker = walkdir::WalkDir::new(staging_dir).max_depth(3);
        for entry in walker.into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            let name_str = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
            let is_ini = path
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| s.to_lowercase())
                == Some("ini".to_string());
            let is_source = name_str.to_lowercase().ends_with(".ini.yago_source");

            if is_ini || is_source {
                if let Ok(doc) = compiler.compile(entry.path()) {
                    for section in doc.sections {
                        let name_lower = section.name.to_lowercase();
                        if name_lower.contains("key") {
                            let mut key = String::new();
                            let mut variable = String::new();
                            let mut values = Vec::new();
                            let mut condition = None;

                            for item in section.items {
                                if let ini::ast::IniItem::Pair { key: k, value: v } = item {
                                    let k_lower = k.to_lowercase();
                                    match k_lower.as_str() {
                                        "key" => key = v,
                                        "condition" => condition = Some(v),
                                        _ if k.starts_with('$') => {
                                            variable = k;
                                            values = v
                                                .split(',')
                                                .map(|s: &str| s.trim().to_string())
                                                .collect();
                                        }
                                        _ => {}
                                    }
                                }
                            }

                            if !key.is_empty() && !variable.is_empty() {
                                let label = variable.trim_start_matches('$').to_string();
                                keybinds.insert(
                                    label.clone(),
                                    Keybind {
                                        label,
                                        key,
                                        variable,
                                        values,
                                        condition,
                                    },
                                );
                            }
                        }
                    }
                }
            }
        }
        keybinds
    }

    pub fn scan_for_nsfw(metadata: &mut ModMetadata, config: &mut ModConfig, filename: &str) {
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

    pub fn generate_default_metadata(filename: &str) -> ModMetadata {
        let stem = Path::new(filename)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(filename);

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
