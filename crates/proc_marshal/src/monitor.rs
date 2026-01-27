use std::time::Duration;
use sysinfo::{ProcessesToUpdate, System};

pub struct Monitor;

impl Monitor {
    fn is_match(proc_name: &str, target_name: &str) -> bool {
        if proc_name.len() >= 15 {
            target_name
                .to_lowercase()
                .starts_with(&proc_name.to_lowercase())
        } else {
            proc_name.eq_ignore_ascii_case(target_name)
        }
    }

    pub fn is_running(process_name: &str) -> bool {
        let mut sys = System::new_all();
        sys.refresh_processes(ProcessesToUpdate::All, true);
        for process in sys.processes().values() {
            if Self::is_match(&process.name().to_string_lossy(), process_name) {
                return true;
            }
        }
        false
    }

    pub fn kill_by_name(process_name: &str) -> bool {
        let mut sys = System::new_all();
        sys.refresh_processes(ProcessesToUpdate::All, true);
        let mut killed = false;
        for process in sys.processes().values() {
            if Self::is_match(&process.name().to_string_lossy(), process_name) {
                process.kill();
                killed = true;
            }
        }
        killed
    }

    pub async fn wait_for_exit(process_name: String) {
        let mut sys = System::new_all();

        // 1. Wait for process to appear (Timeout 30s)
        let mut found_once = false;
        println!(
            "Monitor: Waiting for process '{}' to appear...",
            process_name
        );
        for _ in 0..15 {
            tokio::time::sleep(Duration::from_secs(2)).await;
            sys.refresh_processes(ProcessesToUpdate::All, true);

            let found = sys
                .processes()
                .values()
                .any(|p| Self::is_match(&p.name().to_string_lossy(), &process_name));

            if found {
                found_once = true;
                println!(
                    "Monitor: Process '{}' detected. Monitoring for exit.",
                    process_name
                );
                break;
            }
        }

        if !found_once {
            println!(
                "Monitor: Process '{}' never appeared within timeout.",
                process_name
            );
            return;
        }

        // 2. Wait for process to disappear
        loop {
            tokio::time::sleep(Duration::from_secs(2)).await;
            sys.refresh_processes(ProcessesToUpdate::All, true);

            let found = sys
                .processes()
                .values()
                .any(|p| Self::is_match(&p.name().to_string_lossy(), &process_name));

            if !found {
                println!(
                    "Monitor: Process '{}' not found in list. Exiting wait.",
                    process_name
                );
                break;
            }
        }
    }
}
