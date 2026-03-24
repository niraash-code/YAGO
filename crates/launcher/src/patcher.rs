use crate::error::Result;

#[cfg(windows)]
use std::ffi::OsStr;
#[cfg(windows)]
use windows_sys::Win32::{
    Foundation::{CloseHandle, HANDLE},
    System::Threading::{OpenProcess, PROCESS_ALL_ACCESS},
};

pub struct MemoryPatcher;

impl MemoryPatcher {
    /// Unlocks the FPS for the target process.
    ///
    /// # Arguments
    /// * `process_name` - The name of the process (e.g. "GenshinImpact.exe").
    /// * `target_fps` - The desired FPS limit.
    /// * `search_pattern` - AOB pattern to find the FPS delimiter.
    pub async fn unlock_fps(
        _process_name: &str,
        _target_fps: u32,
        _search_pattern: Vec<u8>,
    ) -> Result<()> {
        #[cfg(windows)]
        {
            // ... (PID lookup logic unchanged)
            let sys = sysinfo::System::new_all();
            let mut pid = None;
            for _ in 0..10 {
                let sys = sysinfo::System::new_all();
                if let Some(process) = sys.processes_by_name(OsStr::new(_process_name)).next() {
                    pid = Some(process.pid().as_u32());
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }

            let pid =
                pid.ok_or_else(|| MarshalError::ProcessNotFound(_process_name.to_string()))?;

            unsafe {
                let handle = OpenProcess(PROCESS_ALL_ACCESS, 0, pid);
                if handle == 0 {
                    return Err(MarshalError::AccessDenied("OpenProcess failed".to_string()));
                }

                let res = Self::patch_impl(handle, _target_fps, _search_pattern);
                CloseHandle(handle);
                res
            }
        }
        #[cfg(not(windows))]
        {
            // ... (Linux stub unchanged)
            Ok(())
        }
    }

    /// Finds a process ID by name.
    pub fn find_process_by_name(name: &str) -> Option<u32> {
        use sysinfo::System;
        let sys = System::new_all();
        // Naive containment check for test purposes
        sys.processes()
            .values()
            .find(|p| p.name().to_string_lossy().contains(name))
            .map(|p| p.pid().as_u32())
    }

    #[cfg(windows)]
    unsafe fn patch_impl(handle: HANDLE, target_fps: u32, pattern: Vec<u8>) -> Result<()> {
        // Use the passed pattern
        if pattern.is_empty() {
            return Err(MarshalError::AccessDenied(
                "Empty search pattern".to_string(),
            ));
        }

        // Scan logic stub
        println!(
            "Stub: Scanning for pattern {:?} and patching to {}",
            pattern, target_fps
        );

        Ok(())
    }
}
