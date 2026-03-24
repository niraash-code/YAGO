use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tokio::sync::Mutex;

// Backend Imports
use storage::{
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
    pub librarian: Arc<Mutex<Librarian>>,
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
                .with_handler(
                    |app: &tauri::AppHandle,
                     shortcut: &tauri_plugin_global_shortcut::Shortcut,
                     event: tauri_plugin_global_shortcut::ShortcutEvent| {
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
                    },
                )
                .build(),
        )
        .register_uri_scheme_protocol(
            "yago-asset",
            |_ctx, request: tauri::http::Request<Vec<u8>>| {
                let path_raw = request.uri().path();

                // Strip leading slash if it exists (Tauri path() usually starts with /)
                let path_str = if let Some(stripped) = path_raw.strip_prefix('/') {
                    stripped
                } else {
                    path_raw
                };

                let decoded =
                    urlencoding::decode(path_str).unwrap_or(std::borrow::Cow::Borrowed(path_str));
                let mut path = std::path::PathBuf::from(decoded.as_ref());

                // Cleanup potential double slashes or malformed relative paths
                if let Ok(p) = path.strip_prefix("//") {
                    path = std::path::PathBuf::from(format!("/{}", p.display()));
                }

                // Ensure absolute path on Unix if it was decoded but lost its root status due to URI parsing
                #[cfg(unix)]
                if !path.is_absolute() && decoded.starts_with('/') {
                    path = std::path::PathBuf::from(decoded.as_ref());
                }

                let is_safe = path.components().any(|c| {
                    let s = c.as_os_str().to_string_lossy();
                    s == "games" || s == "cache" || s == "templates" || s == "loaders"
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
                    if !path.exists() || !path.is_file() {
                        eprintln!("Asset Not Found: {:?}", path);
                    } else {
                        eprintln!("Asset Access Denied: {:?} (Safe: {})", path, is_safe);
                    }

                    tauri::http::Response::builder()
                        .status(403)
                        .body(vec![])
                        .unwrap()
                }
            },
        )
        .setup(|app: &mut tauri::App| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Paths
            let app_handle = app.handle();
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");

            // Initialize Settings (Sync/Immediate load for AppState)
            let settings_manager = Arc::new(SettingsManager::new(app_data_dir.clone()));

            // We use standard fs for the initial settings load to avoid block_on runtime panics
            let settings_path = app_data_dir.join("settings.json");
            let settings = if settings_path.exists() {
                let content = std::fs::read_to_string(&settings_path).unwrap_or_default();
                serde_json::from_str::<GlobalSettings>(&content).unwrap_or_default()
            } else {
                GlobalSettings::default()
            };

            // Determine Roots
            let base_storage = if settings.yago_storage_path.as_os_str().is_empty() {
                app_data_dir.clone()
            } else {
                settings.yago_storage_path.clone()
            };

            // Initialize Librarian Config
            let lib_config = storage::storage::LibrarianConfig {
                base_path: base_storage,
                games_install_path: if settings.default_games_path.as_os_str().is_empty() {
                    None
                } else {
                    Some(settings.default_games_path.clone())
                },
                mods_path: if settings.mods_path.as_os_str().is_empty() {
                    None
                } else {
                    Some(settings.mods_path.clone())
                },
                runners_path: if settings.runners_path.as_os_str().is_empty() {
                    None
                } else {
                    Some(settings.runners_path.clone())
                },
                prefixes_path: if settings.prefixes_path.as_os_str().is_empty() {
                    None
                } else {
                    Some(settings.prefixes_path.clone())
                },
                cache_path: if settings.cache_path.as_os_str().is_empty() {
                    None
                } else {
                    Some(settings.cache_path.clone())
                },
            };

            // Initialize Librarian
            let librarian = Librarian::new(lib_config);
            librarian
                .ensure_core_dirs()
                .expect("failed to ensure core directories");

            // EXTRACT BUNDLED ASSETS
            // 1. App Config (to root)
            let config_path = app_data_dir.join("app_config.json");
            if !config_path.exists() {
                if let Some(file) = ASSETS_DIR.get_file("app_config.json") {
                    let _ = std::fs::write(&config_path, file.contents());
                }
            }

            // 2. Hashes (Global & Per-Game)
            let hashes_path = librarian.assets_root.join("hashes.json");
            if !hashes_path.exists() {
                if let Some(file) = ASSETS_DIR.get_file("hashes.json") {
                    let _ = std::fs::write(&hashes_path, file.contents());
                }
            }
            let hashes_root = librarian.assets_root.join("hashes");
            if !hashes_root.exists() {
                let _ = std::fs::create_dir_all(&hashes_root);
            }
            if let Some(dir) = ASSETS_DIR.get_dir("hashes") {
                for file in dir.files() {
                    let dest = hashes_root.join(file.path().file_name().unwrap());
                    let _ = std::fs::write(&dest, file.contents());
                }
            }

            // 3. Templates (to templates/ - Always sync from bundled)
            if let Some(dir) = ASSETS_DIR.get_dir("templates") {
                println!("Extracting {} templates and assets...", dir.entries().len());
                for file in dir.files() {
                    let dest = librarian
                        .templates_root
                        .join(file.path().file_name().unwrap());
                    if let Err(e) = std::fs::write(&dest, file.contents()) {
                        eprintln!("Failed to extract {:?}: {}", dest, e);
                    }
                }
            }

            // 4. Extract Binaries/Libs to app_data/libs for stable paths
            let libs_dir = app_data_dir.join("libs");
            if !libs_dir.exists() {
                let _ = std::fs::create_dir_all(&libs_dir);
            }

            for lib_file in ["libshield.so", "win_helper.exe"] {
                let dest = libs_dir.join(lib_file);
                if let Ok(src) = app_handle.path().resolve(
                    format!("libs/{}", lib_file),
                    tauri::path::BaseDirectory::Resource,
                ) {
                    if src.exists() {
                        if let Err(e) = std::fs::copy(&src, &dest) {
                            eprintln!("Failed to extract resource {:?} to {:?}: {}", src, dest, e);
                        } else {
                            #[cfg(unix)]
                            {
                                use std::os::unix::fs::PermissionsExt;
                                let _ = std::fs::set_permissions(
                                    &dest,
                                    std::fs::Permissions::from_mode(0o755),
                                );
                            }
                            println!("Extracted stable resource: {:?}", dest);
                        }
                    }
                }
            }

            // State Initialization
            let app_config = Arc::new(Mutex::new(AppConfig::load(config_path)));
            let librarian_mutex = Arc::new(Mutex::new(librarian.clone()));
            let templates_mutex = Arc::new(Mutex::new(HashMap::new()));
            let dbs_mutex = Arc::new(Mutex::new(HashMap::new()));

            // Background Async Initialization
            let app_handle_clone = app_handle.clone();
            let librarian_clone = librarian.clone();
            let templates_arc = templates_mutex.clone();
            let dbs_arc = dbs_mutex.clone();

            tauri::async_runtime::spawn(async move {
                // Load Templates
                let registry = TemplateRegistry::new(librarian_clone.templates_root.clone());
                if let Ok(templates) = registry.load_all().await {
                    let mut guard = templates_arc.lock().await;
                    *guard = templates;
                }

                // Load all game DBs
                if let Ok(ids) = librarian_clone.discover_game_ids().await {
                    let mut dbs_guard = dbs_arc.lock().await;
                    for id in ids {
                        if let Ok(db) = librarian_clone.load_game_db(&id).await {
                            dbs_guard.insert(id, db);
                        }
                    }
                }

                println!("Background Initialization Complete.");
                let _ = app_handle_clone.emit("library-updated", dbs_arc.lock().await.clone());
            });

            app.manage(AppState {
                app_data_dir: app_data_dir.clone(),
                librarian: librarian_mutex,
                game_templates: templates_mutex,
                game_dbs: dbs_mutex,
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
            commands::assets::resolve_asset,
            commands::assets::get_community_backgrounds,
            commands::library::get_library,
            commands::library::sync_game_assets,
            commands::library::identify_game,
            commands::setup::fetch_manifest,
            commands::setup::download_game,
            commands::library::add_game,
            commands::library::remove_game,
            commands::mods::import_mod,
            commands::mods::scan_mod_directory,
            commands::mods::add_mod,
            commands::mods::validate_mod,
            commands::mods::delete_mod,
            commands::mods::toggle_mod,
            commands::launcher::deploy_mods,
            commands::launcher::redeploy_mods,
            commands::launcher::launch_game,
            commands::launcher::kill_game,
            commands::config::get_settings,
            commands::config::update_settings,
            commands::config::get_app_config,
            commands::config::update_app_config,
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
            commands::library::recursive_scan_path,
            commands::library::sync_templates,
            commands::setup::install_common_libs,
            commands::setup::download_loader,
            commands::setup::ensure_game_resources,
            commands::setup::download_proton,
            commands::setup::check_setup,
            commands::setup::get_setup_status,
            commands::library::detect_steam_proton_path,
            commands::library::remove_runner,
            commands::library::force_reset_state,
            commands::library::get_remote_catalog,
            commands::library::initialize_remote_game,
            commands::library::get_install_options,
            commands::download::start_game_download,
            commands::download::pause_game_download,
            commands::download::resume_game_download,
            commands::download::repair_game,
            commands::library::wipe_game_mods,
            commands::library::reset_game_profiles,
            commands::library::remove_game_prefix,
            commands::library::uninstall_game_files,
            commands::library::trust_game_installation,
            commands::setup::install_reshade,
            commands::launcher::trigger_panic,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
