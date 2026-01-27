use std::env;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::thread;
use std::time::Duration;

fn main() {
    let mut log_path = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    log_path.push("yago_test_log.txt");

    let mut file = File::create(&log_path).expect("Failed to create log file");

    writeln!(file, "--- YAGO FAKE GAME START ---").unwrap();
    writeln!(file, "CWD: {:?}", env::current_dir().unwrap()).unwrap();
    
    writeln!(file, "ARGS:").unwrap();
    for arg in env::args() {
        writeln!(file, "  - {}", arg).unwrap();
    }

    writeln!(file, "ENV VARS:").unwrap();
    let interesting_vars = [
        "WINEPREFIX", 
        "STEAM_COMPAT_DATA_PATH", 
        "STEAM_COMPAT_CLIENT_INSTALL_PATH", 
        "WINEDLLOVERRIDES",
        "MANGOHUD",
        "GAMEMODERUN"
    ];

    for var in interesting_vars {
        if let Ok(val) = env::var(var) {
            writeln!(file, "  {}={}", var, val).unwrap();
        }
    }

    writeln!(file, "--- STARTING SLEEP (30s) ---").unwrap();
    file.flush().unwrap();

    // Sleep to simulate a running game
    thread::sleep(Duration::from_secs(30));
    
    writeln!(file, "--- YAGO FAKE GAME EXIT ---").unwrap();
}
