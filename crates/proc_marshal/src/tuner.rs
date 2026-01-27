#[cfg(not(windows))]
use crate::error::Result;
#[cfg(windows)]
use crate::error::{MarshalError, Result};

pub struct Tuner;

impl Tuner {
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
