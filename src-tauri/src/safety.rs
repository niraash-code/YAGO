use crate::AppState;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use fs_engine::Vfs;
use tauri::{AppHandle, Emitter, Manager};

pub struct Emergency;

impl Emergency {
    /// The "Panic Option". Removes mods and reloads the modloader without killing the game.
    pub async fn trigger(app: &AppHandle) {
        println!("PANIC SWITCH TRIGGERED! (Alt+F12)");

        let state = app.state::<AppState>();

        // 1. Purge Deployment
        // We iterate ALL known games and purge them to be safe.
        println!("Purging deployments for all known games...");
        let dbs = state.game_dbs.lock().await;
        for (game_id, _db) in dbs.iter() {
            if let Some(game_config) = _db.games.get(game_id) {
                let game_root = game_config
                    .install_path
                    .parent()
                    .unwrap_or(&game_config.install_path);
                let yago_dir = game_root.join("Mods").join("YAGO");
                if yago_dir.exists() {
                    println!("Purging: {:?}", yago_dir);
                    if let Err(e) = Vfs::wipe_deployment(&yago_dir).await {
                        eprintln!("Failed to wipe deployment for {}: {}", game_id, e);
                    }
                }
            }
        }

        // 2. Reload Modloader (Send F10)
        println!("Sending F10 to reload modloader...");
        match Enigo::new(&Settings::default()) {
            Ok(mut enigo) => {
                // Click F10 (Press and Release)
                if let Err(e) = enigo.key(Key::F10, Direction::Click) {
                    eprintln!("Failed to send F10: {}", e);
                } else {
                    println!("F10 sent successfully.");
                }
            }
            Err(e) => eprintln!("Failed to initialize Enigo: {}", e),
        }

        // 3. Notify Frontend
        let _ = app.emit("PANIC_TRIGGERED", ());
    }
}
