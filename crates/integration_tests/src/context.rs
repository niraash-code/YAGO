use librarian::Librarian;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;
use tempfile::{tempdir, TempDir};

/// Harness for running headless simulations
pub struct SimulationContext {
    pub root: TempDir,
    pub staging_root: PathBuf,
    pub librarian: Arc<Librarian>,
}

impl SimulationContext {
    pub async fn new() -> Self {
        let root = tempdir().unwrap();
        let games_root = root.path().join("library");
        let staging_root = root.path().join("staging");
        let assets_root = root.path().join("assets");
        std::fs::create_dir(&games_root).unwrap();
        std::fs::create_dir(&staging_root).unwrap();
        std::fs::create_dir(&assets_root).unwrap();

        let librarian = Arc::new(Librarian::new(games_root.clone(), assets_root));

        Self {
            root,
            staging_root,
            librarian,
        }
    }

    pub fn create_fake_game(&self, name: &str) -> PathBuf {
        let game_dir = self.root.path().join(name);
        std::fs::create_dir(&game_dir).unwrap();
        let exe_path = game_dir.join(format!("{}.exe", name));

        // Write valid PE header so detection works
        let mut f = File::create(&exe_path).unwrap();
        f.write_all(&[0x4D, 0x5A, 0x90, 0x00]).unwrap();
        drop(f); // Flush and close

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&exe_path).unwrap().permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&exe_path, perms).unwrap();
        }

        exe_path
    }

    pub fn create_fake_mod_archive(&self, name: &str, content_files: Vec<(&str, &str)>) -> PathBuf {
        let archive_path = self.staging_root.join(name);
        let file = File::create(&archive_path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options = zip::write::SimpleFileOptions::default();

        for (fname, content) in content_files {
            zip.start_file(fname, options).unwrap();
            zip.write_all(content.as_bytes()).unwrap();
        }
        zip.finish().unwrap();
        archive_path
    }
}
