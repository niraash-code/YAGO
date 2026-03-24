use crate::commands::library::detect_steam_proton_path_internal;
use crate::{AppState, Emergency};
use ini::{IniDocument, IniPatcher};
use loader::LoaderContext;
use mod_patches::ConflictReport;
use launcher::{LaunchOptions, Launcher, Monitor, RunnerConfig, RunnerType};
use std::path::{Path, PathBuf};
use tauri::{Emitter, Manager, State};
use uuid::Uuid;

pub async fn resolve_runner_path(
    rid_opt: Option<String>,
    app_data_dir: &Path,
    settings: &storage::settings::GlobalSettings,
) -> (PathBuf, RunnerType) {
    println!("Marshal: Resolving runner for ID: {:?}", rid_opt);

    let base_storage = if settings.yago_storage_path.as_os_str().is_empty() {
        app_data_dir.to_path_buf()
    } else {
        settings.yago_storage_path.clone()
    };

    let find_proton = |dir: PathBuf| -> Option<PathBuf> {
        let possible = ["proton", "proton.sh", "files/bin/proton"];
        for p in possible {
            let path = dir.join(p);
            if path.exists() {
                return Some(path);
            }
        }
        None
    };

    if let Some(rid) = rid_opt {
        let local_dir = base_storage.join("runners").join(&rid);
        let settings_dir = settings.steam_compat_tools_path.join(&rid);

        if let Some(p) = find_proton(local_dir.clone()) {
            println!("Marshal: Using local Proton at {:?}", p);
            (p, RunnerType::Proton)
        } else if let Some(p) = find_proton(settings_dir.clone()) {
            println!("Marshal: Using Steam Proton (Config) at {:?}", p);
            (p, RunnerType::Proton)
        } else {
            // Try auto-detection
            let mut detected_p = None;
            if cfg!(target_os = "linux") {
                if let Ok(Some(detected)) = detect_steam_proton_path_internal().await {
                    let detected_dir = PathBuf::from(detected).join(&rid);
                    detected_p = find_proton(detected_dir);
                }
            }

            if let Some(p) = detected_p {
                println!("Marshal: Using Steam Proton (Auto-detected) at {:?}", p);
                (p, RunnerType::Proton)
            } else {
                println!(
                    "Marshal Warning: Runner {} not found in {:?}, {:?} or auto-detected paths. Falling back to wine.",
                    rid, local_dir, settings_dir
                );
                (PathBuf::from("wine"), RunnerType::Wine)
            }
        }
    } else {
        println!("Marshal: No runner selected, using system wine.");
        (PathBuf::from("wine"), RunnerType::Wine)
    }
}

#[tauri::command]
pub async fn trigger_panic(app: tauri::AppHandle) -> Result<(), String> {
    Emergency::trigger(&app).await;
    Ok(())
}

#[tauri::command]
pub async fn kill_game(state: State<'_, AppState>) -> Result<(), String> {
    let mut running: tokio::sync::MutexGuard<'_, Option<String>> =
        state.running_game_name.lock().await;
    if let Some(exe_name) = running.as_ref() {
        if Monitor::kill_by_name(exe_name) {
            *running = None;
            Ok(())
        } else {
            Err("Could not find process to kill".to_string())
        }
    } else {
        let mut launching: tokio::sync::MutexGuard<'_, bool> = state.is_launching.lock().await;
        if *launching {
            *launching = false;
            Ok(())
        } else {
            Err("No game running".into())
        }
    }
}

#[tauri::command]
pub async fn deploy_mods(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_path: String,
    force: bool,
) -> Result<ConflictReport, String> {
    let exe_path = PathBuf::from(&game_path);
    let exe_name = exe_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or_default();
    let game_id = exe_name.to_lowercase();
    let game_root = exe_path.parent().ok_or("Invalid path")?.to_path_buf();
    let dbs: tokio::sync::MutexGuard<
        '_,
        std::collections::HashMap<String, storage::LibraryDatabase>,
    > = state.game_dbs.lock().await;
    let db = dbs.get(&game_id).ok_or("Game not found")?;
    let config = db.games.get(&game_id).ok_or("Config missing")?;
    let p_uuid = Uuid::parse_str(&config.active_profile_id).map_err(|e| e.to_string())?;
    let profile = db.profiles.get(&p_uuid).ok_or("Profile missing")?;

    if !config.modloader_enabled {
        if !profile.use_reshade {
            let _ =
                LoaderContext::uninstall_loader(&game_root, config.prefix_path.as_deref(), true)
                    .await;
        }
        return Ok(ConflictReport::default());
    }

    let mut profiles_for_weaver = Vec::new();
    let mut add_to_list = |mod_id: &Uuid| {
        if let Some(record) = db.mods.get(mod_id) {
            let mut ini_paths = Vec::new();
            for entry in walkdir::WalkDir::new(&record.path)
                .max_depth(3)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                let path = entry.path();
                let name_str = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                let is_ini = path
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_lowercase())
                    == Some("ini".to_string());
                let is_source = name_str.to_lowercase().ends_with(".ini.yago_source");

                if path.is_file() && (is_ini || is_source) {
                    ini_paths.push(entry.path().to_path_buf());
                }
            }

            let mod_type = record.config.mod_type.clone().unwrap_or_else(|| {
                if record.compatibility.character != "Unknown"
                    && record.compatibility.character != "Global/Other"
                {
                    "character".to_string()
                } else {
                    "global".to_string()
                }
            });

            profiles_for_weaver.push(mod_patches::ModProfile {
                uuid: record.id.to_string(),
                mod_root: record.path.clone(),
                ini_paths,
                deploy_path: "".to_string(), // LogicWeaver calculates category-based path
                character: record.compatibility.character.clone(),
                mod_type,
                nsfw: record
                    .config
                    .tags
                    .iter()
                    .any(|t| t.to_lowercase() == "nsfw"),
                tags: record.config.tags.clone(),
            });
        }
    };
    for mid in &profile.load_order {
        if profile.enabled_mod_ids.contains(mid) {
            add_to_list(mid);
        }
    }
    for mid in db.mods.keys() {
        if !profile.load_order.contains(mid) && profile.enabled_mod_ids.contains(mid) {
            add_to_list(mid);
        }
    }
    let (plan, report) =
        mod_patches::generate_deployment_plan(profiles_for_weaver).map_err(|e| e.to_string())?;

    let lib_guard = state.librarian.lock().await;
    let paths = lib_guard.game_paths(&game_id);
    let loaders_root = lib_guard.loaders_root.clone();

    // 2. Deploy to Profile Folder (The Source of Truth)
    // We pass profile_data_dir as root, and "Mods" as the folder name
    let profile_dir = paths.profile_mods.parent().ok_or("Invalid profile path")?;
    if !profile_dir.exists() {
        std::fs::create_dir_all(profile_dir).map_err(|e| e.to_string())?;
    }

    vfs::execute_deployment(profile_dir, &plan, Some("Mods"), force)
        .map_err(|e| e.to_string())?;

    let game_mods_dir = game_root.join("Mods");
    let is_proxy = config.injection_method == storage::InjectionMethod::Proxy
        || (cfg!(target_os = "linux")
            && config.injection_method == storage::InjectionMethod::Loader);

    // 3. Link Profile Mods to Game
    if is_proxy {
        println!(
            "Linking Profile Area: {:?} -> {:?}",
            paths.profile_mods, game_mods_dir
        );
        vfs::make_symlink(&paths.profile_mods, &game_mods_dir).map_err(|e| e.to_string())?;
    } else if game_mods_dir.exists() {
        #[cfg(unix)]
        let _ = std::fs::remove_file(&game_mods_dir);
        #[cfg(windows)]
        let _ = std::fs::remove_dir_all(&game_mods_dir);
    }
    let target_ini = if !is_proxy {
        loaders_root.join("d3dx.ini")
    } else {
        game_root.join("d3dx.ini")
    };
    if target_ini.exists() {
        <IniDocument as IniPatcher>::patch_file(&target_ini, "Loader", "target", exe_name)
            .map_err(|e| e.to_string())?;
        if let Some(patches) = &config.patch_logic {
            <IniDocument as IniPatcher>::patch_config(&target_ini, patches)
                .map_err(|e| e.to_string())?;
        } else {
            let guard: tokio::sync::MutexGuard<
                '_,
                std::collections::HashMap<String, storage::GameTemplate>,
            > = state.game_templates.lock().await;
            if let Some(t) = guard.get(&game_id) {
                if let Some(p) = &t.patch_logic {
                    <IniDocument as IniPatcher>::patch_config(&target_ini, p)
                        .map_err(|e| e.to_string())?;
                }
            }
        }
    }
    let _ = app.emit("task-completed", "Deployment successful");
    Ok(report)
}

#[tauri::command]
pub async fn redeploy_mods(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_path: String,
) -> Result<(), String> {
    // 1. Force Redeploy
    deploy_mods(app.clone(), state.clone(), game_path, true).await?;

    // 2. Trigger Game Reload (F10)
    // We reuse the logic from Emergency::trigger but without the purge
    match enigo::Enigo::new(&enigo::Settings::default()) {
        Ok(mut enigo) => {
            use enigo::{Direction, Key, Keyboard};
            if let Err(e) = enigo.key(Key::F10, Direction::Click) {
                return Err(format!("Failed to send F10: {}", e));
            }
        }
        Err(e) => return Err(format!("Failed to initialize Enigo: {}", e)),
    }

    let _ = app.emit("task-completed", "Hot Reload successful");
    Ok(())
}

#[tauri::command]
pub async fn update_game_config(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    update: super::library::GameConfigUpdate,
) -> Result<(), String> {
    let mut dbs: tokio::sync::MutexGuard<
        '_,
        std::collections::HashMap<String, storage::LibraryDatabase>,
    > = state.game_dbs.lock().await;
    if let Some(db) = dbs.get_mut(&game_id) {
        if let Some(config) = db.games.get_mut(&game_id) {
            if let Some(n) = update.name {
                config.name = n;
            }
            if let Some(c) = update.cover_image {
                config.cover_image = c;
            }
            if let Some(i) = update.icon {
                config.icon = i;
            }
            if let Some(dev) = update.developer {
                config.developer = dev;
            }
            if let Some(d) = update.description {
                config.description = d;
            }
            if let Some(p) = update.install_path {
                config.install_path = PathBuf::from(p);
                config.exe_path = config.install_path.join(&config.exe_name);
            }
            if let Some(e) = update.exe_name {
                config.exe_name = e;
                config.exe_path = config.install_path.join(&config.exe_name);
            }
            if let Some(a) = update.launch_args {
                config.launch_args = a;
            }
            if let Some(ga) = update.gamescope_args {
                config.gamescope_args = ga;
            }
            if let Some(f) = update.fps_config {
                config.fps_config = Some(f);
            }
            if let Some(sn) = update.short_name {
                config.short_name = sn;
            }
            if let Some(c) = update.color {
                config.color = c;
            }
            if let Some(ac) = update.accent_color {
                config.accent_color = ac;
            }
            if let Some(l) = update.logo_initial {
                config.logo_initial = l;
            }
            if let Some(im) = update.injection_method {
                config.injection_method = match im {
                    launcher::InjectionMethod::None => storage::InjectionMethod::None,
                    launcher::InjectionMethod::Proxy => storage::InjectionMethod::Proxy,
                    launcher::InjectionMethod::Loader => storage::InjectionMethod::Loader,
                    launcher::InjectionMethod::RemoteThread => {
                        storage::InjectionMethod::RemoteThread
                    }
                    launcher::InjectionMethod::ManualMap => {
                        storage::InjectionMethod::ManualMap
                    }
                };
            }
            if let Some(me) = update.modloader_enabled {
                config.modloader_enabled = me;
            }
            if let Some(au) = update.auto_update {
                config.auto_update = au;
            }
            if let Some(pid) = update.active_profile_id {
                config.active_profile_id = pid;
            }
            if let Some(rid) = update.active_runner_id {
                config.active_runner_id = rid;
            }
            if let Some(pp) = update.prefix_path {
                config.prefix_path = pp.map(PathBuf::from);
            }
            if let Some(els) = update.enable_linux_shield {
                config.enable_linux_shield = els;
            }
            state
                .librarian
                .lock()
                .await
                .save_game_db(&game_id, db)
                .await
                .map_err(|e: storage::LibrarianError| e.to_string())?;
            let _ = app.emit("library-updated", dbs.clone());
            return Ok(());
        }
    }
    Err("Game not found".to_string())
}

#[tauri::command]
pub async fn launch_game(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
) -> Result<(), String> {
    {
        let mut launching: tokio::sync::MutexGuard<'_, bool> = state.is_launching.lock().await;
        if *launching {
            return Err("Already launching".into());
        }
        *launching = true;
    }
    let res = async {
        let (
            exe_path,
            exe_name,
            game_dir,
            profile,
            settings,
            active_runner_id,
            config_prefix_path,
            config_injection_method,
            config_gamescope_args,
            sandbox_config,
            profile_data_dir,
            enable_linux_shield,
            modloader_enabled,
            base_storage,
        ) = {
            let dbs: tokio::sync::MutexGuard<
                '_,
                std::collections::HashMap<String, storage::LibraryDatabase>,
            > = state.game_dbs.lock().await;
            let db = dbs.get(&game_id).ok_or("Game not found")?;
            let config = db.games.get(&game_id).ok_or("Config missing")?;
            let p_uuid = Uuid::parse_str(&config.active_profile_id).map_err(|e| e.to_string())?;
            let profile = db.profiles.get(&p_uuid).ok_or("Profile missing")?.clone();
            let settings: storage::settings::GlobalSettings =
                state.global_settings.lock().await.clone();
            let base_storage = if settings.yago_storage_path.as_os_str().is_empty() {
                state.app_data_dir.clone()
            } else {
                settings.yago_storage_path.clone()
            };
            let profile_data_dir = state
                .librarian
                .lock()
                .await
                .get_profile_data_dir(&game_id, &p_uuid);
            (
                config.exe_path.clone(),
                config.exe_name.clone(),
                config.install_path.clone(),
                profile.clone(),
                settings,
                config.active_runner_id.clone(),
                config.prefix_path.clone(),
                config.injection_method,
                profile.gamescope_args.clone(),
                config.sandbox.clone(),
                profile_data_dir,
                config.enable_linux_shield,
                config.modloader_enabled,
                base_storage,
            )
        };
        let method = if modloader_enabled {
            match config_injection_method {
                storage::InjectionMethod::None => launcher::InjectionMethod::None,
                storage::InjectionMethod::Proxy => launcher::InjectionMethod::Proxy,
                storage::InjectionMethod::Loader => launcher::InjectionMethod::Loader,
                storage::InjectionMethod::RemoteThread => {
                    launcher::InjectionMethod::RemoteThread
                }
                storage::InjectionMethod::ManualMap => launcher::InjectionMethod::ManualMap,
            }
        } else {
            launcher::InjectionMethod::None
        };
        let prefix_path = config_prefix_path.unwrap_or_else(|| {
            if !settings.wine_prefix_path.as_os_str().is_empty() {
                settings.wine_prefix_path.clone()
            } else {
                base_storage.join("prefixes").join(&game_id)
            }
        });

        let rid_opt = active_runner_id
            .as_ref()
            .filter(|s: &&String| !s.is_empty())
            .or(settings
                .default_runner_id
                .as_ref()
                .filter(|s: &&String| !s.is_empty()))
            .cloned();

        let (runner_path, runner_type) =
            resolve_runner_path(rid_opt, &state.app_data_dir, &settings).await;

        let final_args = if profile.launch_args.is_empty() {
            vec![
                "-popupwindow".into(),
                "-screen-fullscreen".into(),
                "0".into(),
            ]
        } else {
            profile.launch_args.clone()
        };
        let mut options = LaunchOptions {
            exe_path: exe_path.clone(),
            args: final_args,
            current_dir: Some(game_dir.clone()),
            runner: RunnerConfig {
                runner_type,
                path: runner_path,
            },
            prefix_path: prefix_path.clone(),
            use_gamescope: profile.use_gamescope,
            gamescope_args: config_gamescope_args,
            use_gamemode: profile.use_gamemode,
            use_mangohud: profile.use_mangohud,
            injection_method: method,
            modloader_enabled,
            loader_path: Some(base_storage.join("loaders").join(&game_id)),
            injected_dlls: vec![],
            resolution: profile.resolution.unwrap_or((1920, 1080)),
            fps_target: None,
            sandbox_config: Some(launcher::SandboxConfig {
                registry_keys: sandbox_config.registry_keys,
                files: sandbox_config.files,
            }),
            sandbox_data_dir: Some(profile_data_dir.clone()),
            enable_linux_shield,
            shield_path: {
                let stable = state.app_data_dir.join("libs/libshield.so");
                if stable.exists() {
                    Some(stable)
                } else {
                    app.path()
                        .resolve("libs/libshield.so", tauri::path::BaseDirectory::Resource)
                        .ok()
                }
            },
            helper_path: {
                let stable = state.app_data_dir.join("libs/win_helper.exe");
                if stable.exists() {
                    Some(stable)
                } else {
                    app.path()
                        .resolve("libs/win_helper.exe", tauri::path::BaseDirectory::Resource)
                        .ok()
                }
            },
        };
        if method == launcher::InjectionMethod::Loader {
            let _ = LoaderContext::uninstall_loader(&game_dir, None, false).await;
        }
        #[cfg(target_os = "linux")]
        {
            Launcher
                .prepare_prefix(&options)
                .await
                .map_err(|e| e.to_string())?;
        }
        let loaders_root = base_storage.join("loaders");
        if method == launcher::InjectionMethod::Proxy {
            LoaderContext::install_loader(
                &game_dir,
                &loaders_root,
                loader::InstallOptions {
                    game_id: game_id.clone(),
                    install_reshade: profile.use_reshade,
                    injection_method: Some("Proxy".to_string()),
                },
            )
            .await
            .map_err(|e| e.to_string())?;
        } else if method == launcher::InjectionMethod::None && profile.use_reshade {
            LoaderContext::install_loader(
                &game_dir,
                &loaders_root,
                loader::InstallOptions {
                    game_id: game_id.clone(),
                    install_reshade: true,
                    injection_method: Some("ReShadeOnly".to_string()),
                },
            )
            .await
            .map_err(|e| e.to_string())?;
            options.injection_method = launcher::InjectionMethod::Proxy;
        }
        deploy_mods(
            app.clone(),
            state.clone(),
            exe_path.to_string_lossy().to_string(),
            false,
        )
        .await?;
        match Launcher.launch(options).await {
            Ok(_) => {
                *state.running_game_name.lock().await = Some(exe_name.clone());
                let _ = app.emit("game-started", 0);
                let state_clone = state.running_game_name.clone();
                let app_handle = app.clone();

                tauri::async_runtime::spawn(async move {
                    Monitor::wait_for_exit(exe_name).await;

                    // 1. Standard Cleanup
                    if method == launcher::InjectionMethod::Proxy {
                        let _ = LoaderContext::uninstall_loader(
                            &game_dir,
                            Some(&prefix_path),
                            profile.use_reshade,
                        )
                        .await;
                    }
                    *state_clone.lock().await = None;
                    let _ = app_handle.emit("game-stopped", ());
                });
                Ok(())
            }
            Err(e) => Err(format!("Launch failed: {}", e)),
        }
    }
    .await;
    *state.is_launching.lock().await = false;
    res
}
