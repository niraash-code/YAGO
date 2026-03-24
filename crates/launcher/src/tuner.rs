#[cfg(not(windows))]
use crate::error::Result;
#[cfg(windows)]
use crate::error::{MarshalError, Result};

pub struct Tuner;

impl Tuner {
    /// Boosts the priority of a process to "Above Normal" or "High".
    pub fn boost_process_priority(pid: u32) -> Result<()> {
        #[cfg(windows)]
        {
            use windows_sys::Win32::Foundation::CloseHandle;
            use windows_sys::Win32::System::Threading::{
                OpenProcess, SetPriorityClass, ABOVE_NORMAL_PRIORITY_CLASS, PROCESS_SET_INFORMATION,
            };
            unsafe {
                let handle = OpenProcess(PROCESS_SET_INFORMATION, 0, pid);
                if handle == 0 {
                    return Err(MarshalError::AccessDenied(
                        "OpenProcess failed for priority boost".to_string(),
                    ));
                }
                SetPriorityClass(handle, ABOVE_NORMAL_PRIORITY_CLASS);
                CloseHandle(handle);
            }
        }
        #[cfg(unix)]
        {
            use libc::{setpriority, PRIO_PROCESS};
            unsafe {
                // -10 is higher priority than default 0 (range is usually -20 to 19)
                let res = setpriority(PRIO_PROCESS, pid, -10);
                if res != 0 {
                    // Log error but don't fail hard as priority boost is an optimization
                    #[cfg(not(test))]
                    eprintln!(
                        "Tuner: Failed to set priority for PID {}: {}",
                        pid,
                        std::io::Error::last_os_error()
                    );
                }
            }
        }
        Ok(())
    }

    /// Configures the system to prefer the discrete GPU for the game.
    /// On Windows, this involves writing to the "GpuPreference" registry key.
    pub fn force_discrete_gpu(&self, _exe_path: &str) -> Result<()> {
        #[cfg(windows)]
        {
            use winreg::enums::*;
            use winreg::RegKey;

            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            let path = r"Software\Microsoft\DirectX\UserGpuPreferences";
            let (key, _) = hkcu
                .create_subkey(path)
                .map_err(|e| MarshalError::RegistryError(e.to_string()))?;

            // Value: GpuPreference=2 (High Performance)
            key.set_value(_exe_path, &"GpuPreference=2;")
                .map_err(|e| MarshalError::RegistryError(e.to_string()))?;
        }

        Ok(())
    }
}
