use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

// Backend Imports
use librarian::{
    GameTemplate, GlobalSettings, Librarian, LibraryDatabase, SettingsManager, TemplateRegistry,
};

use include_dir::{include_dir, Dir};

static ASSETS_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../resources");

mod commands;
mod config;
mod safety;

#[cfg(test)]
mod init_tests;

use config::AppConfig;
use safety::Emergency;

// State Container - Public so commands can access it
pub struct AppState {
    pub app_data_dir: PathBuf,
    pub librarian: Arc<Librarian>,
    pub game_templates: Arc<Mutex<HashMap<String, GameTemplate>>>,
    pub game_dbs: Arc<Mutex<HashMap<String, LibraryDatabase>>>,
    pub running_game_name: Arc<Mutex<Option<String>>>,
    pub is_launching: Arc<Mutex<bool>>,
    pub settings_manager: Arc<SettingsManager>,
    pub global_settings: Arc<Mutex<GlobalSettings>>,
    pub app_config: Arc<Mutex<AppConfig>>,
    pub download_controls: Arc<Mutex<HashMap<String, tokio::sync::watch::Sender<bool>>>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["Alt+F12"])
                .unwrap()
                .with_handler(|app, shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed
                        && shortcut.matches(
                            tauri_plugin_global_shortcut::Modifiers::ALT,
                            tauri_plugin_global_shortcut::Code::F12,
                        )
                    {
                        let app_handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            Emergency::trigger(&app_handle).await;
                        });
                    }
                })
                .build(),
        )
        .register_uri_scheme_protocol("yago-asset", |_ctx, request| {
            let url = request.uri().to_string();

            // Robust parsing: strip protocol and host
            let mut path_str = url.replace("yago-asset://localhost/", "");
            path_str = path_str.replace("yago-asset://localhost", "");
            path_str = path_str.replace("yago-asset://", "");

            let decoded =
                urlencoding::decode(&path_str).unwrap_or(std::borrow::Cow::Borrowed(&path_str));
            let mut path = std::path::PathBuf::from(decoded.as_ref());

            // Check if we need to prepend a slash (Linux absolute paths)
            #[cfg(unix)]
            if !path.is_absolute() && path_str.starts_with("%2F") {
                path = std::path::PathBuf::from(format!("/{}", decoded));
            }

            let is_safe = path.components().any(|c| {
                let s = c.as_os_str().to_string_lossy();
                s == "games" || s == "cache" || s == "templates"
            });

            if is_safe && path.exists() && path.is_file() {
                let content = std::fs::read(&path).unwrap_or_default();
                let extension = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                let mime = match extension.to_lowercase().as_str() {
                    "png" => "image/png",
                    "svg" => "image/svg+xml",
                    "webp" => "image/webp",
                    "jpg" | "jpeg" => "image/jpeg",
                    _ => "application/octet-stream",
                };

                tauri::http::Response::builder()
                    .header("Access-Control-Allow-Origin", "*")
                    .header("Content-Type", mime)
                    .body(content)
                    .unwrap()
            } else {
                eprintln!(
                    "Asset Access Denied or Not Found: {:?} (Safe: {})",
                    path, is_safe
                );
                tauri::http::Response::builder()
                    .status(403)
                    .body(vec![])
                    .unwrap()
            }
        })
        .setup(|app| {
            // ...
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Register Panic Switch (F12)
            // Handled in Builder

            // Paths
            let app_handle = app.handle();
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");

            // Initialize Settings
            let settings_manager = Arc::new(SettingsManager::new(app_data_dir.clone()));
            let settings = tauri::async_runtime::block_on(async {
                settings_manager.load().await.unwrap_or_default()
            });

            // Initialize Librarian
            let games_root = app_data_dir.join("games");
            let assets_root = app_data_dir.join("assets");
            let templates_root = app_data_dir.join("templates");

            if !games_root.exists() {
                std::fs::create_dir_all(&games_root).expect("failed to create games directory");
            }
            if !assets_root.exists() {
                std::fs::create_dir_all(&assets_root).expect("failed to create assets directory");
            }
            if !templates_root.exists() {
                std::fs::create_dir_all(&templates_root)
                    .expect("failed to create templates directory");
            }

            // EXTRACT BUNDLED ASSETS
            // 1. App Config (to root)
            let config_path = app_data_dir.join("app_config.json");
            if !config_path.exists() {
                if let Some(file) = ASSETS_DIR.get_file("app_config.json") {
                    let _ = std::fs::write(&config_path, file.contents());
                }
            }

            // 2. Hashes (to assets/)
            let hashes_path = assets_root.join("hashes.json");
            if !hashes_path.exists() {
                if let Some(file) = ASSETS_DIR.get_file("hashes.json") {
                    let _ = std::fs::write(&hashes_path, file.contents());
                }
            }

            // 3. Templates (to templates/ - Always sync from bundled)
            if let Some(dir) = ASSETS_DIR.get_dir("templates") {
                println!("Extracting {} templates and assets...", dir.entries().len());
                for file in dir.files() {
                    let dest = templates_root.join(file.path().file_name().unwrap());
                    if let Err(e) = std::fs::write(&dest, file.contents()) {
                        eprintln!("Failed to extract {:?}: {}", dest, e);
                    }
                }
            }

            // Load Config
            let app_config = Arc::new(Mutex::new(AppConfig::load(config_path)));

            let librarian = Arc::new(Librarian::new(games_root, assets_root));

            let registry = TemplateRegistry::new(templates_root.clone());
            let templates: HashMap<String, GameTemplate> = tauri::async_runtime::block_on(async {
                registry.load_all().await.unwrap_or_default()
            });
            println!(
                "Loaded {} game templates from {:?}.",
                templates.len(),
                templates_root
            );

            if let Some(t) = templates.get("genshin") {
                println!("Genshin cover: {}", t.cover_image);
            }

            // Load all game DBs
            let game_dbs = tauri::async_runtime::block_on(async {
                let mut dbs = HashMap::new();
                if let Ok(ids) = librarian.discover_game_ids().await {
                    for id in ids {
                        if let Ok(db) = librarian.load_game_db(&id).await {
                            dbs.insert(id, db);
                        }
                    }
                }
                dbs
            });

            app.manage(AppState {
                app_data_dir: app_data_dir.clone(),
                librarian,
                game_templates: Arc::new(Mutex::new(templates)),
                game_dbs: Arc::new(Mutex::new(game_dbs)),
                running_game_name: Arc::new(Mutex::new(None)),
                is_launching: Arc::new(Mutex::new(false)),
                settings_manager,
                global_settings: Arc::new(Mutex::new(settings)),
                app_config,
                download_controls: Arc::new(Mutex::new(HashMap::new())),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::library::get_library,
            commands::library::sync_game_assets,
            commands::library::identify_game,
            commands::setup::fetch_manifest,
            commands::setup::download_game,
            commands::library::add_game,
            commands::library::remove_game,
            commands::mods::import_mod,
            commands::mods::add_mod,
            commands::mods::validate_mod,
            commands::mods::delete_mod,
            commands::mods::toggle_mod,
            commands::launcher::deploy_mods,
            commands::launcher::launch_game,
            commands::launcher::kill_game,
            commands::config::get_settings,
            commands::config::update_settings,
            commands::profiles::set_load_order,
            commands::mods::update_mod_tags,
            commands::library::get_skin_inventory,
            commands::profiles::switch_profile,
            commands::profiles::create_profile,
            commands::profiles::duplicate_profile,
            commands::profiles::update_profile,
            commands::profiles::delete_profile,
            commands::profiles::rename_profile,
            commands::launcher::update_game_config,
            commands::library::list_runners,
            commands::library::open_path,
            commands::mods::get_mod_files,
            commands::mods::read_mod_file,
            commands::mods::write_mod_file,
            commands::library::scan_for_games,
            commands::library::sync_templates,
            commands::setup::install_common_libs,
            commands::setup::download_loader,
            commands::setup::ensure_game_resources,
            commands::setup::download_proton,
            commands::setup::check_setup,
            commands::setup::get_setup_status,
            commands::library::detect_steam_proton_path,
            commands::library::remove_runner,
            commands::library::get_remote_catalog,
            commands::library::initialize_remote_game,
            commands::library::get_install_options,
            commands::download::start_game_download,
            commands::download::pause_game_download,
            commands::download::resume_game_download,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
