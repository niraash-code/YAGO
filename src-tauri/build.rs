use std::fs;
use std::path::Path;
use std::process::Command;

fn main() {
    #[cfg(target_os = "linux")]
    {
        println!("cargo:rerun-if-changed=../crates/loader_ctl/src/assets/shield.c");

        let out_dir = std::env::var("OUT_DIR").unwrap();
        let shield_out_path = Path::new(&out_dir).join("libshield.so");

        let status = Command::new("gcc")
            .args([
                "-shared",
                "-fPIC",
                "../crates/loader_ctl/src/assets/shield.c",
                "-o",
                shield_out_path.to_str().unwrap(),
                "-ldl",
            ])
            .status()
            .expect("failed to run gcc to compile libshield.so");

        if !status.success() {
            panic!("gcc failed to compile libshield.so");
        }

        // Copy to a location that Tauri can bundle
        // We'll use a 'libs' folder in src-tauri
        let libs_dir = Path::new("libs");
        if !libs_dir.exists() {
            fs::create_dir_all(libs_dir).expect("failed to create libs directory");
        }

        let dest_path = libs_dir.join("libshield.so");

        // Only copy if changed to avoid infinite rebuild loops
        let should_copy = if dest_path.exists() {
            let src_content =
                fs::read(&shield_out_path).expect("failed to read generated libshield.so");
            let dest_content = fs::read(&dest_path).expect("failed to read existing libshield.so");
            src_content != dest_content
        } else {
            true
        };

        if should_copy {
            fs::copy(&shield_out_path, &dest_path)
                .expect("failed to copy libshield.so to libs directory");
        }

        println!("cargo:rustc-env=YAGO_SHIELD_PATH={}", dest_path.display());
    }

    tauri_build::build()
}
