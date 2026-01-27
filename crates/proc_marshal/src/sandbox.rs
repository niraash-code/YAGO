use crate::{MarshalError, Result, RunnerConfig, RunnerType};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct SandboxConfig {
    pub registry_keys: Vec<String>,
    pub files: Vec<String>,
}

pub struct SandboxManager;

impl SandboxManager {
    /// Restores sandboxed data from profile_dir to game_dir
    pub fn restore(
        game_dir: &Path,
        profile_data_dir: &Path,
        config: &SandboxConfig,
        runner: &RunnerConfig,
        prefix_path: &Path,
    ) -> Result<()> {
        // 1. Restore Files
        for rel_path in &config.files {
            let source = profile_data_dir.join(rel_path);
            let dest = game_dir.join(rel_path);

            if source.exists() {
                if let Some(parent) = dest.parent() {
                    fs::create_dir_all(parent).map_err(MarshalError::Io)?;
                }
                fs::copy(&source, &dest).map_err(MarshalError::Io)?;
                println!("Sandbox: Restored file {:?}", rel_path);
            }
        }

        // 2. Restore Registry
        let reg_file = profile_data_dir.join("registry.reg");
        if reg_file.exists() {
            Self::import_registry(&reg_file, runner, prefix_path)?;
            println!("Sandbox: Restored registry from {:?}", reg_file);
        }

        Ok(())
    }

    /// Snapshots current game state back to profile_dir
    pub fn snapshot(
        game_dir: &Path,
        profile_data_dir: &Path,
        config: &SandboxConfig,
        runner: &RunnerConfig,
        prefix_path: &Path,
    ) -> Result<()> {
        if !profile_data_dir.exists() {
            fs::create_dir_all(profile_data_dir).map_err(MarshalError::Io)?;
        }

        // 1. Snapshot Files
        for rel_path in &config.files {
            let source = game_dir.join(rel_path);
            let dest = profile_data_dir.join(rel_path);

            if source.exists() {
                if let Some(parent) = dest.parent() {
                    fs::create_dir_all(parent).map_err(MarshalError::Io)?;
                }
                fs::copy(&source, &dest).map_err(MarshalError::Io)?;
                println!("Sandbox: Snapshotted file {:?}", rel_path);
            }
        }

        // 2. Snapshot Registry
        if !config.registry_keys.is_empty() {
            let reg_file = profile_data_dir.join("registry.reg");
            Self::export_registry(&reg_file, &config.registry_keys, runner, prefix_path)?;
            println!("Sandbox: Snapshotted registry to {:?}", reg_file);
        }

        Ok(())
    }

    fn import_registry(reg_file: &Path, runner: &RunnerConfig, prefix_path: &Path) -> Result<()> {
        match runner.runner_type {
            RunnerType::Native => {
                #[cfg(target_os = "windows")]
                {
                    let status = Command::new("reg")
                        .args(["import", reg_file.to_str().unwrap_or_default()])
                        .status()
                        .map_err(MarshalError::Io)?;
                    if !status.success() {
                        return Err(MarshalError::RegistryError(format!(
                            "Reg import failed with code {:?}",
                            status.code()
                        )));
                    }
                }
            }
            RunnerType::Proton | RunnerType::Wine => {
                let wine_bin = if runner.runner_type == RunnerType::Proton {
                    runner.path.parent().unwrap().join("bin/wine")
                } else {
                    PathBuf::from("wine")
                };

                let status = Command::new(&wine_bin)
                    .env("WINEPREFIX", prefix_path)
                    .args(["regedit", "/s", reg_file.to_str().unwrap_or_default()])
                    .status()
                    .map_err(MarshalError::Io)?;

                if !status.success() {
                    return Err(MarshalError::RegistryError(
                        "Wine regedit import failed".to_string(),
                    ));
                }
            }
        }
        Ok(())
    }

    fn export_registry(
        reg_file: &Path,
        keys: &[String],
        runner: &RunnerConfig,
        prefix_path: &Path,
    ) -> Result<()> {
        // regedit /e only exports one key at a time usually, or we can use reg export
        // For simplicity and compatibility, we'll use 'reg export' if available or 'regedit /e'

        for (i, key) in keys.iter().enumerate() {
            let temp_reg = reg_file.with_extension(format!("part{}.reg", i));

            match runner.runner_type {
                RunnerType::Native => {
                    #[cfg(target_os = "windows")]
                    {
                        Command::new("reg")
                            .args(["export", key, temp_reg.to_str().unwrap_or_default(), "/y"])
                            .status()
                            .map_err(MarshalError::Io)?;
                    }
                }
                RunnerType::Proton | RunnerType::Wine => {
                    let wine_bin = if runner.runner_type == RunnerType::Proton {
                        runner.path.parent().unwrap().join("bin/wine")
                    } else {
                        PathBuf::from("wine")
                    };

                    Command::new(&wine_bin)
                        .env("WINEPREFIX", prefix_path)
                        .args(["regedit", "/e", temp_reg.to_str().unwrap_or_default(), key])
                        .status()
                        .map_err(MarshalError::Io)?;
                }
            }

            // Append to main file (simplified logic: just overwrite with last key for MVP,
            // or concatenate if we want true multi-key support).
            // GI/HSR usually only have ONE main key.
            if i == 0 {
                if temp_reg.exists() {
                    fs::copy(&temp_reg, reg_file).map_err(MarshalError::Io)?;
                }
            } else {
                // TODO: Proper multi-key registry merging
            }
            if temp_reg.exists() {
                let _ = fs::remove_file(temp_reg);
            }
        }
        Ok(())
    }
}
