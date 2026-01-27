use std::env;
use std::fs::OpenOptions;
use std::io::Write;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use std::path::PathBuf;

fn main() {
    let args: Vec<String> = env::args().collect();
    let exe_path = env::current_exe().unwrap_or_else(|_| PathBuf::from("unknown"));
    let exe_name = exe_path.file_name().unwrap_or_default();
    let cwd = env::current_dir().unwrap_or_default();

    // Log file in the same directory as the executable
    let mut log_path = cwd.clone();
    log_path.push("yago_test_log.txt");

    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .expect("Failed to open log file");

    let log_entry = format!(
        "[{:?}]: PROCESS STARTED\n  Path: {:?}\n  CWD: {:?}\n  Args: {:?}\n",
        now,
        exe_name,
        cwd,
        args
    );

    println!("{}", log_entry); 
    if let Err(e) = write!(file, "{}", log_entry) {
        eprintln!("Failed to write to log: {}", e);
    }

    // Simulate running
    println!("Simulating running process...");
    thread::sleep(Duration::from_secs(10));

    let end_msg = format!("[{:?}]: PROCESS STOPPED\n----------------------------------------\n", now);
    let _ = write!(file, "{}", end_msg);
}
