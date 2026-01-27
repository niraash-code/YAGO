use std::io;
use std::path::PathBuf;
use tokio::process::{Child, Command};

#[derive(Debug)]
pub struct LaunchConfig {
    pub game_exe: PathBuf,
    pub proton_root: PathBuf,
    pub compat_data_path: PathBuf,
    pub args: Vec<String>,
}

pub fn launch_with_proton(config: &LaunchConfig) -> Result<Child, io::Error> {
    let mut cmd = build_proton_command(config)?;
    cmd.spawn()
}

fn build_proton_command(config: &LaunchConfig) -> Result<Command, io::Error> {
    // Resolve proton executable
    let proton_script = config.proton_root.join("proton");
    if !proton_script.exists() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("Proton script not found at {:?}", proton_script),
        ));
    }

    // Ensure compat data path exists
    if !config.compat_data_path.exists() {
        std::fs::create_dir_all(&config.compat_data_path)?;
    }

    let mut cmd = Command::new(&proton_script);

    cmd.arg("run").arg(&config.game_exe).args(&config.args);

    cmd.env("STEAM_COMPAT_DATA_PATH", &config.compat_data_path);

    if let Some(parent) = config.game_exe.parent() {
        cmd.env("STEAM_COMPAT_CLIENT_INSTALL_PATH", parent);
    }

    Ok(cmd)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use tempfile::tempdir;

    #[test]
    #[cfg(target_os = "linux")] // Only run on linux where we can simulate paths easier or expectations match
    fn test_proton_command_generation() {
        let temp_dir = tempdir().unwrap();
        let root = temp_dir.path();

        let proton_root = root.join("Proton");
        std::fs::create_dir(&proton_root).unwrap();
        File::create(proton_root.join("proton")).unwrap(); // Create dummy proton

        let compat_path = root.join("pfx");
        let game_dir = root.join("Game");
        std::fs::create_dir(&game_dir).unwrap();
        let game_exe = game_dir.join("game.exe");

        let config = LaunchConfig {
            game_exe: game_exe.clone(),
            proton_root: proton_root.clone(),
            compat_data_path: compat_path.clone(),
            args: vec!["--arg1".to_string()],
        };

        let cmd = build_proton_command(&config).expect("Failed to build command");
        let std_cmd = cmd.as_std();

        // Inspect Command
        assert_eq!(std_cmd.get_program(), proton_root.join("proton"));

        let args: Vec<&std::ffi::OsStr> = std_cmd.get_args().collect();
        let expected_run = std::ffi::OsStr::new("run");
        let expected_exe = game_exe.as_os_str();
        let expected_arg = std::ffi::OsStr::new("--arg1");
        assert_eq!(args, vec![expected_run, expected_exe, expected_arg]);

        let envs: Vec<_> = std_cmd.get_envs().collect();

        let has_compat_data = envs.iter().any(|(k, v)| {
            k == &std::ffi::OsStr::new("STEAM_COMPAT_DATA_PATH")
                && v == &Some(compat_path.as_os_str())
        });
        assert!(
            has_compat_data,
            "STEAM_COMPAT_DATA_PATH missing or incorrect"
        );

        let has_install_path = envs.iter().any(|(k, v)| {
            k == &std::ffi::OsStr::new("STEAM_COMPAT_CLIENT_INSTALL_PATH")
                && v == &Some(game_dir.as_os_str())
        });
        assert!(
            has_install_path,
            "STEAM_COMPAT_CLIENT_INSTALL_PATH missing or incorrect"
        );
    }
}
