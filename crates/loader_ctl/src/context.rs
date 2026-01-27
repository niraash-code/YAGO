use crate::error::{LoaderError, Result};
use ini_forge::{IniDocument, IniPatcher};
use std::path::Path;

pub struct LoaderContext;

#[derive(Debug, Clone)]
pub struct InstallOptions {
    pub game_id: String,
    pub install_reshade: bool,
    pub injection_method: Option<String>, // "Proxy" or "Loader"
}

impl LoaderContext {
    pub async fn install_loader(
        game_dir: &Path,
        library_root: &Path,
        options: InstallOptions,
    ) -> Result<()> {
        let game_lib = library_root.join(&options.game_id);
        let method = options.injection_method.as_deref().unwrap_or("Proxy");

        if method == "ReShadeOnly" {
            // ReShade Only Strategy:
            // Install ReShade as 'dxgi.dll'.
            // We do NOT install GIMI (d3d11.dll).
            // Wine/Proton will use the 'dxgi=n,b' override to load our local dxgi.dll.

            println!("Loader: ReShadeOnly method active. Installing ReShade as dxgi.dll...");

            let common_lib = library_root.join("common");
            let reshade_source = if common_lib.join("ReShade.dll").exists() {
                common_lib.join("ReShade.dll")
            } else {
                common_lib.join("reshade.dll")
            };

            let target_dxgi = game_dir.join("dxgi.dll");

            if reshade_source.exists() {
                println!(
                    "Loader: Copying ReShade to Game Root as dxgi.dll: {:?}",
                    target_dxgi
                );
                std::fs::copy(&reshade_source, &target_dxgi).map_err(LoaderError::Io)?;
            } else {
                println!("Loader: ReShade requested but not found in common loaders.");
            }

            // Clean up d3d11.dll (GIMI) if present
            let d3d11 = game_dir.join("d3d11.dll");
            if d3d11.exists() {
                let _ = std::fs::remove_file(d3d11);
            }

            // We are done for ReShadeOnly.
            return Ok(());
        }

        // 1. Base Loader
        if method == "Proxy" {
            Self::install_proxy(game_dir, &game_lib, &options.game_id).await?;
        } else if method == "Loader" {
            // In Loader mode, we don't copy the proxy DLLs to game root.
            // But we might need to ensure the loader folder itself is ready (handled by quartermaster/download_loader)
            // d3dx.ini patching for ReShade happens below.
        }

        // Determine ini path: Proxy -> GameDir/d3dx.ini, Loader -> Library/Game/d3dx.ini ?
        let ini_path = if method == "Loader" {
            game_lib.join("d3dx.ini")
        } else {
            game_dir.join("d3dx.ini")
        };

        // 2. ReShade / Chaining
        // Strategy: We install ReShade as "dxgi.dll" (Dual Proxy).
        // This allows independent loading alongside GIMI (d3d11.dll).
        let target_reshade = game_dir.join("dxgi.dll");

        if options.install_reshade {
            let common_lib = library_root.join("common");
            // Look for "ReShade.dll" or "reshade.dll" in common
            let reshade_source = if common_lib.join("ReShade.dll").exists() {
                common_lib.join("ReShade.dll")
            } else {
                common_lib.join("reshade.dll")
            };

            if reshade_source.exists() {
                println!(
                    "Loader: Copying ReShade to Game Root as dxgi.dll: {:?}",
                    target_reshade
                );
                // Always overwrite to ensure version match
                std::fs::copy(&reshade_source, &target_reshade).map_err(LoaderError::Io)?;

                // No d3dx.ini patching required for Dual Proxy method.
            } else {
                println!("Loader: ReShade requested but not found in common loaders.");
            }
        } else {
            // Cleanup Logic
            if target_reshade.exists() {
                println!("Loader: Removing ReShade (dxgi.dll) from game root.");
                let _ = std::fs::remove_file(&target_reshade);
            }

            // Legacy Cleanup: Check for iphlpapi.dll and ReShade.dll just in case
            for legacy in &["iphlpapi.dll", "ReShade.dll"] {
                let legacy_path = game_dir.join(legacy);
                if legacy_path.exists() {
                    let _ = std::fs::remove_file(legacy_path);
                }
            }

            // Unpatch d3dx.ini (Legacy Cleanup)
            if ini_path.exists() {
                println!("Loader: Unpatching d3dx.ini ReShade Proxy (Legacy)...");
                let compiler = ini_forge::IniCompiler::default();
                if let Ok(mut doc) = compiler.compile(&ini_path) {
                    if let Some(sec) = doc.sections.iter_mut().find(|s| s.name == "System") {
                        sec.items.retain(|i| {
                            if let ini_forge::IniItem::Pair { key, .. } = i {
                                key != "proxy_d3d11" && key != "proxy_dxgi"
                            } else {
                                true
                            }
                        });
                    }

                    // Cleanup [Import] sections
                    doc.sections
                        .retain(|s| s.name != "Import" && s.name != "Import.ReShade");

                    let output = compiler.serialize(&doc);
                    let _ = std::fs::write(&ini_path, output);
                }
            }
        }
        Ok(())
    }

    /// Installs the loader as a Proxy (using d3d11.dll hijacking).
    pub async fn install_proxy(
        game_dir: &Path,
        loader_source: &Path,
        game_exe: &str,
    ) -> Result<()> {
        let source_dll = loader_source.join("d3d11.dll");
        if !source_dll.exists() {
            return Err(LoaderError::NotFound(format!(
                "d3d11.dll not found in {:?}",
                loader_source
            )));
        }

        let target_dll = game_dir.join("d3d11.dll");
        println!("Proxy: Copying loader to {:?}", target_dll);
        std::fs::copy(&source_dll, &target_dll).map_err(LoaderError::Io)?;

        // Copy d3dx.ini
        let source_ini = loader_source.join("d3dx.ini");
        if source_ini.exists() {
            let target_ini = game_dir.join("d3dx.ini");
            println!("Proxy: Copying d3dx.ini to {:?}", target_ini);
            std::fs::copy(&source_ini, &target_ini).map_err(LoaderError::Io)?;

            // Patch d3dx.ini for Proxy Mode
            println!(
                "Proxy: Patching d3dx.ini (target={}, module=d3d11.dll)",
                game_exe
            );
            // Ensure target refers to the game executable
            IniDocument::patch_file(&target_ini, "Loader", "target", game_exe)?;
            // Ensure module is set to d3d11.dll (Passive Mode)
            IniDocument::patch_file(&target_ini, "Loader", "module", "d3d11.dll")?;
        }

        // Symlink support directories
        let support_dirs = ["Core", "ShaderFixes"];
        for dir_name in support_dirs {
            let source_dir = loader_source.join(dir_name);
            if source_dir.exists() {
                let target_dir = game_dir.join(dir_name);
                println!(
                    "Proxy: Linking support directory {} -> {:?}",
                    dir_name, target_dir
                );
                #[cfg(unix)]
                {
                    let _ = std::fs::remove_file(&target_dir);
                    let _ = std::fs::remove_dir_all(&target_dir);
                    let _ = std::os::unix::fs::symlink(&source_dir, &target_dir);
                }
                #[cfg(windows)]
                {
                    let _ = std::fs::remove_dir_all(&target_dir);
                    let _ = std::os::windows::fs::symlink_dir(&source_dir, &target_dir);
                }
            }
        }

        // Copy Compiler DLLs
        let compilers = ["d3dcompiler_47.dll", "d3dcompiler_46.dll"];
        for comp in compilers {
            let compiler_path = loader_source.join(comp);
            if compiler_path.exists() {
                let target_compiler = game_dir.join(comp);
                println!("Proxy: Copying {} to {:?}", comp, target_compiler);
                let _ = std::fs::copy(&compiler_path, target_compiler);
            }
        }

        Ok(())
    }

    /// Uninstalls the loader files (removes them from game directory).
    pub async fn uninstall_loader(game_dir: &Path, prefix_path: Option<&Path>) -> Result<()> {
        let files = &[
            "d3d11.dll",
            "dxgi.dll",
            "version.dll",
            "winmm.dll",
            "d3dcompiler_47.dll",
            "d3dcompiler_46.dll",
            "ReShade.dll",
            "d3dx.ini",
            "ReShade.ini",
            "3dmloader.dll",
            "3dmloader.exe",
        ];

        for file in files {
            let path = game_dir.join(file);
            if path.exists() {
                let _ = std::fs::remove_file(&path);
            }
        }

        // Cleanup Stealth DLL in Prefix (Legacy)
        if let Some(pfx) = prefix_path {
            let stealth_dll = pfx.join("pfx/drive_c/windows/system32/d3d11.dll");
            if stealth_dll.exists() {
                let _ = std::fs::remove_file(stealth_dll);
            }
        }

        // Cleanup support directories
        let dirs = &["Core", "ShaderFixes", "Mods"];
        for dir in dirs {
            let path = game_dir.join(dir);
            if path.exists() {
                #[cfg(unix)]
                let _ = std::fs::remove_file(&path);
                #[cfg(windows)]
                let _ = std::fs::remove_dir_all(&path);
            }
        }

        Ok(())
    }

    /// Legacy support function
    pub async fn remove_loader(game_path: &Path) -> Result<()> {
        Self::uninstall_loader(game_path, None).await
    }
}
