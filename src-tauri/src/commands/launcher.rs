use crate::commands::library::detect_steam_proton_path_internal;
use crate::AppState;
use ini_forge::{IniDocument, IniPatcher};
use loader_ctl::LoaderContext;
use logic_weaver::ConflictReport;
use proc_marshal::{LaunchOptions, Launcher, Monitor, RunnerConfig, RunnerType};
use std::path::{Path, PathBuf};
use tauri::{Emitter, Manager, State};
use uuid::Uuid;

pub async fn resolve_runner_path(
    rid_opt: Option<String>,
    app_data_dir: &Path,
    settings: &librarian::settings::GlobalSettings,
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
pub async fn kill_game(state: State<'_, AppState>) -> Result<(), String> {
    let mut running = state.running_game_name.lock().await;
    if let Some(exe_name) = running.as_ref() {
        if Monitor::kill_by_name(exe_name) {
            *running = None;
            Ok(())
        } else {
            Err("Could not find process to kill".to_string())
        }
    } else {
        let mut launching = state.is_launching.lock().await;
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
) -> Result<ConflictReport, String> {
    let exe_path = PathBuf::from(&game_path);
    let exe_name = exe_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or_default();
    let game_id = exe_name.to_lowercase();
    let game_root = exe_path.parent().ok_or("Invalid path")?.to_path_buf();
    let dbs = state.game_dbs.lock().await;
    let db = dbs.get(&game_id).ok_or("Game not found")?;
    let config = db.games.get(&game_id).ok_or("Config missing")?;
    let p_uuid = Uuid::parse_str(&config.active_profile_id).map_err(|e| e.to_string())?;
    let profile = db.profiles.get(&p_uuid).ok_or("Profile missing")?;

    if !config.modloader_enabled {
        if !profile.use_reshade {
            let _ =
                LoaderContext::uninstall_loader(&game_root, config.prefix_path.as_deref()).await;
        }
        return Ok(ConflictReport::default());
    }

    let mut profiles_for_weaver = Vec::new();
    let mut add_to_list = |mod_id: &Uuid| {
        if let Some(record) = db.mods.get(mod_id) {
            let mut ini_path = record.path.join("disabled.ini");
            for entry in walkdir::WalkDir::new(&record.path)
                .max_depth(2)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if entry.path().extension().and_then(|s| s.to_str()) == Some("ini") {
                    ini_path = entry.path().to_path_buf();
                    break;
                }
            }
            profiles_for_weaver.push(logic_weaver::ModProfile {
                uuid: record.id.to_string(),
                mod_root: record.path.clone(),
                ini_path,
                deploy_path: format!("YAGO/{}/", record.id),
                character: record.compatibility.character.clone(),
                nsfw: record
                    .config
                    .tags
                    .iter()
                    .any(|t| t.to_lowercase() == "nsfw"),
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
        logic_weaver::generate_deployment_plan(profiles_for_weaver).map_err(|e| e.to_string())?;

    let settings = state.global_settings.lock().await;
    let base_storage = if settings.yago_storage_path.as_os_str().is_empty() {
        state.app_data_dir.clone()
    } else {
        settings.yago_storage_path.clone()
    };
    drop(settings);

    let loaders_root = base_storage.join("loaders").join(&game_id);
    fs_engine::execute_deployment(&loaders_root, &plan, Some("Mods")).map_err(|e| e.to_string())?;
    let game_mods_dir = game_root.join("Mods");
    let virtual_mods_dir = loaders_root.join("Mods");
    let is_proxy = config.injection_method == librarian::InjectionMethod::Proxy
        || (cfg!(target_os = "linux")
            && config.injection_method == librarian::InjectionMethod::Loader);

    if is_proxy {
        if virtual_mods_dir.exists() {
            fs_engine::make_symlink(&virtual_mods_dir, &game_mods_dir)
                .map_err(|e| e.to_string())?;
        }
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
            let guard = state.game_templates.lock().await;
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
pub async fn update_game_config(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    update: super::library::GameConfigUpdate,
) -> Result<(), String> {
    let mut dbs = state.game_dbs.lock().await;
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
                    proc_marshal::InjectionMethod::None => librarian::InjectionMethod::None,
                    proc_marshal::InjectionMethod::Proxy => librarian::InjectionMethod::Proxy,
                    proc_marshal::InjectionMethod::Loader => librarian::InjectionMethod::Loader,
                    proc_marshal::InjectionMethod::RemoteThread => {
                        librarian::InjectionMethod::RemoteThread
                    }
                    proc_marshal::InjectionMethod::ManualMap => {
                        librarian::InjectionMethod::ManualMap
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
                .map_err(|e: librarian::LibrarianError| e.to_string())?;
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
        let mut launching = state.is_launching.lock().await;
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
            sandbox_config,
            profile_data_dir,
            enable_linux_shield,
            modloader_enabled,
            base_storage,
        ) = {
            let dbs = state.game_dbs.lock().await;
            let db = dbs.get(&game_id).ok_or("Game not found")?;
            let config = db.games.get(&game_id).ok_or("Config missing")?;
            let p_uuid = Uuid::parse_str(&config.active_profile_id).map_err(|e| e.to_string())?;
            let profile = db.profiles.get(&p_uuid).ok_or("Profile missing")?.clone();
            let settings = state.global_settings.lock().await.clone();
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
                profile,
                settings,
                config.active_runner_id.clone(),
                config.prefix_path.clone(),
                config.injection_method,
                config.sandbox.clone(),
                profile_data_dir,
                config.enable_linux_shield,
                config.modloader_enabled,
                base_storage,
            )
        };
        let method = if modloader_enabled {
            match config_injection_method {
                librarian::InjectionMethod::None => proc_marshal::InjectionMethod::None,
                librarian::InjectionMethod::Proxy => proc_marshal::InjectionMethod::Proxy,
                librarian::InjectionMethod::Loader => proc_marshal::InjectionMethod::Loader,
                librarian::InjectionMethod::RemoteThread => {
                    proc_marshal::InjectionMethod::RemoteThread
                }
                librarian::InjectionMethod::ManualMap => proc_marshal::InjectionMethod::ManualMap,
            }
        } else {
            proc_marshal::InjectionMethod::None
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
            use_gamemode: profile.use_gamemode,
            use_mangohud: profile.use_mangohud,
            injection_method: method,
            loader_path: Some(base_storage.join("loaders").join(&game_id)),
            injected_dlls: vec![],
            resolution: profile.resolution.unwrap_or((1920, 1080)),
            fps_target: None,
            sandbox_config: Some(proc_marshal::SandboxConfig {
                registry_keys: sandbox_config.registry_keys,
                files: sandbox_config.files,
            }),
            sandbox_data_dir: Some(profile_data_dir),
            enable_linux_shield,
            shield_path: app
                .path()
                .resolve("libs/libshield.so", tauri::path::BaseDirectory::Resource)
                .ok(),
            helper_path: app
                .path()
                .resolve("libs/win_helper.exe", tauri::path::BaseDirectory::Resource)
                .ok(),
        };
        if method == proc_marshal::InjectionMethod::Loader {
            let _ = LoaderContext::uninstall_loader(&game_dir, None).await;
        }
        #[cfg(target_os = "linux")]
        {
            Launcher
                .prepare_prefix(&options)
                .await
                .map_err(|e| e.to_string())?;
        }
        let loaders_root = base_storage.join("loaders");
        if method == proc_marshal::InjectionMethod::Proxy {
            LoaderContext::install_loader(
                &game_dir,
                &loaders_root,
                loader_ctl::InstallOptions {
                    game_id: game_id.clone(),
                    install_reshade: profile.use_reshade,
                    injection_method: Some("Proxy".to_string()),
                },
            )
            .await
            .map_err(|e| e.to_string())?;
        } else if method == proc_marshal::InjectionMethod::None && profile.use_reshade {
            LoaderContext::install_loader(
                &game_dir,
                &loaders_root,
                loader_ctl::InstallOptions {
                    game_id: game_id.clone(),
                    install_reshade: true,
                    injection_method: Some("ReShadeOnly".to_string()),
                },
            )
            .await
            .map_err(|e| e.to_string())?;
            options.injection_method = proc_marshal::InjectionMethod::Proxy;
        }
        deploy_mods(
            app.clone(),
            state.clone(),
            exe_path.to_string_lossy().to_string(),
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
                    if method == proc_marshal::InjectionMethod::Proxy {
                        let _ =
                            LoaderContext::uninstall_loader(&game_dir, Some(&prefix_path)).await;
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
