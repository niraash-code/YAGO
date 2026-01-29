#[cfg(windows)]
mod windows_impl {
    use proc_marshal::windows::LoaderHook;
    use std::fs::OpenOptions;
    use std::io::Write;
    use std::path::PathBuf;
    use std::{thread, time};

    fn log(msg: &str) {
        println!("{}", msg);
        std::io::stdout().flush().ok();

        // Try to log to C:\yago_helper.log (which is in the prefix)
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open("C:\\yago_helper.log")
        {
            let _ = writeln!(
                file,
                "[{}] {}",
                time::SystemTime::now()
                    .duration_since(time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                msg
            );
        }
    }

    pub fn main() {
        log("Helper: Process started.");
        let args: Vec<String> = std::env::args().collect();
        if args.len() < 4 {
            log("Helper Error: Insufficient arguments.");
            return;
        }

        let mode = &args[1];
        let target_process = &args[2];
        let dll_path = PathBuf::from(&args[3]);

        if mode == "hook" {
            log(&format!(
                "Helper: Mode=Hook, Target={}, DLL={:?}",
                target_process, dll_path
            ));

            // Wait a bit for filesystem to sync in Wine
            thread::sleep(time::Duration::from_millis(500));

            if !dll_path.exists() {
                log(&format!(
                    "Helper Error: DLL not found at {:?}. Retrying in 1s...",
                    dll_path
                ));
                thread::sleep(time::Duration::from_secs(1));
                if !dll_path.exists() {
                    log("Helper Error: DLL still not found. Exiting.");
                    return;
                }
            }

            match LoaderHook::load(&dll_path) {
                Ok(hook) => {
                    log("Helper: DLL loaded successfully.");
                    if let Err(e) = hook.set_hook(target_process) {
                        log(&format!("Helper Error: Failed to set hook: {}", e));
                        return;
                    }
                    log("Helper: Hook set successfully. Entering message loop.");

                    let hook_ref = std::sync::Arc::new(hook);
                    let hook_clone = hook_ref.clone();
                    std::thread::spawn(move || {
                        log("Helper: Waiting for injection confirmation...");
                        if let Err(e) = hook_clone.wait_for_injection() {
                            log(&format!("Helper Error: WaitForInjection failed: {}", e));
                        } else {
                            log("Helper: Injection confirmed by modloader.");
                        }
                    });

                    unsafe {
                        use windows_sys::Win32::UI::WindowsAndMessaging::{
                            DispatchMessageW, GetMessageW, TranslateMessage, MSG,
                        };
                        let mut msg: MSG = std::mem::zeroed();
                        // This blocks until a message is received
                        while GetMessageW(&mut msg, 0, 0, 0) > 0 {
                            TranslateMessage(&msg);
                            DispatchMessageW(&msg);
                        }
                    }
                }
                Err(e) => log(&format!("Helper Error: Failed to load DLL: {}", e)),
            }
        } else {
            log(&format!("Helper Error: Unknown mode: {}", mode));
        }
    }
}

fn main() {
    #[cfg(windows)]
    windows_impl::main();

    #[cfg(not(windows))]
    println!("This tool must be compiled for Windows.");
}
