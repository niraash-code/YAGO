use crate::error::Result;
use std::path::{Path, PathBuf};
use std::process::Command;

pub struct Transcoder;

impl Transcoder {
    /// Converts an image to DDS using ImageMagick (magick convert).
    /// If conversion succeeds, returns the path to the new DDS file.
    pub fn to_dds(path: &Path) -> Result<Option<PathBuf>> {
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        if !matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "tga" | "webp") {
            return Ok(None);
        }

        let dds_path = path.with_extension("dds");

        // Use magick convert to transform to DDS.
        // 3DMigoto/GIMI usually prefers BC7 or DXT5.
        // For simplicity and compatibility, we'll let Magick decide or use a safe default.
        let output = Command::new("magick")
            .arg("convert")
            .arg(path)
            .arg(&dds_path)
            .output();

        match output {
            Ok(out) if out.status.success() => {
                println!("TRANSCODER: Successfully converted {:?} to DDS", path);
                Ok(Some(dds_path))
            }
            _ => {
                eprintln!(
                    "TRANSCODER WARNING: Failed to convert {:?} to DDS. Falling back to original.",
                    path
                );
                Ok(None)
            }
        }
    }

    /// Checks if an image is likely a normal map and re-encodes it if necessary.
    pub fn fix_normal_map(_path: &Path) -> Result<bool> {
        // Implementation for channel swapping if needed
        Ok(false)
    }
}
