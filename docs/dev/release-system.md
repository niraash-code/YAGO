# YAGO Release System

This directory contains scripts and configurations for building YAGO releases across multiple platforms and package formats.

## Supported Package Formats

| Format | Platforms | Description |
| ------- | ----------- | ------------- |
| **AppImage** | Linux | Portable application bundle |
| **Flatpak** | Linux | Universal package format |
| **DEB** | Debian/Ubuntu | Debian package format |
| **RPM** | Fedora/RHEL | Red Hat package format |
| **PKGBUILD** | Arch Linux | Arch Linux package format |
| **Windows EXE** | Windows | Cross-compiled Windows executable |

## Quick Start

### 1. Setup Build Environment (One-time)

To ensure DEB and RPM packages are compatible with older distributions (Stable Debian/Fedora), we use **Distrobox** containers (`yago-deb`, `yago-rpm`) to build them against older GLIBC versions.

```bash
# Setup build containers (requires Distrobox)
./build_tools/setup-build-containers.sh
```

### 2. Build Packages

```bash
# Build everything
make release-all

# Build specific package
make release-appimage    # Build AppImage
make release-flatpak     # Build Flatpak
make release-deb         # Build DEB package (uses yago-deb container if available)
make release-rpm         # Build RPM package (uses yago-rpm container if available)
make release-pkgbuild    # Build PKGBUILD package
make release-windows     # Build Windows EXE
```

### 3. Test Builds

You can test generated builds in isolated environments using the test script:

```bash
# Test DEB (installs inside yago-deb container)
./release/scripts/test-builds.sh deb

# Test RPM (installs inside yago-rpm container)
./release/scripts/test-builds.sh rpm

# Test AppImage/Flatpak (runs on host)
./release/scripts/test-builds.sh appimage
./release/scripts/test-builds.sh flatpak
```

#### Manual Verification Commands

**Arch Linux (PKGBUILD):**
```bash
sudo pacman -U release/latest/yago-*.pkg.tar.zst
```

**Debian/Ubuntu (DEB):**
```bash
sudo apt install ./release/latest/yago_*.deb
```

**Fedora (RPM):**
```bash
sudo dnf install ./release/latest/yago-*.rpm
```

## Prerequisites

### General
- **Distrobox**: Recommended for building compatible DEB/RPM packages.
- **Podman** or **Docker**: Required backend for Distrobox.

### Linux Packages (Arch Linux)

```bash
# Core tools
sudo pacman -S distrobox docker    # or podman

# AppImage (recommended)
yay -S linuxdeploy-appimage

# Flatpak
sudo pacman -S flatpak-builder

# Windows cross-compilation
sudo pacman -S mingw-w64-gcc
```

### Linux Packages (Ubuntu/Debian)

```bash
# Core tools
sudo apt install distrobox podman

# Flatpak
sudo apt install flatpak-builder

# Windows cross-compilation
sudo apt install gcc-mingw-w64-x86-64
```

## Build Organization

YAGO uses a two-tier release system with clean separation:

### Latest Builds (`release/latest/`)
Contains the most recent build for each package type:
```
release/latest/
├── yago-0.1.0.AppImage
├── yago-0.1.0.flatpak
├── yago-0.1.0.deb
├── yago-0.1.0.rpm
├── yago-0.1.0-windows.exe
...
```

### Older Builds (`release/older/`)
Contains timestamped builds organized by package type for history.

## Troubleshooting

### GLIBC Errors (version `GLIBC_2.39` not found)
This happens if you build a DEB/RPM package on a rolling release distro (like Arch) and try to run it on a stable distro (like Debian/Ubuntu).

**Fix:** Use the containerized build system.
1. Install Distrobox.
2. Run `./build_tools/setup-build-containers.sh`.
3. Rebuild: `make release-deb` or `make release-rpm`.
   The script will automatically detect the `yago-deb`/`yago-rpm` container and build inside it using the correct GLIBC version.

### AppImage Build Issues

**appimagetool fails but linuxdeploy succeeds:**
If linuxdeploy creates the AppDir successfully but appimagetool fails to create the final AppImage:

```bash
# Complete the AppImage manually
./release/scripts/finish-appimage.sh
```

This script downloads the latest appimagetool and creates the AppImage from an existing AppDir.

### Build Fails inside Container
Ensure the container is up-to-date:
```bash
./build_tools/setup-build-containers.sh
```
This script handles updates and dependency installation automatically.
## Technical Build Notes

### Native Dependencies (HDiffZ)
YAGO's maintenance engine requires `hpatchz` for delta updates. This is compiled from source during the Rust build process via the `cc` crate.
- **Prerequisites**: A C compiler (`gcc` or `clang`) must be available on the build host.
- **Cross-compilation**: For Windows releases (`x86_64-pc-windows-gnu`), `mingw-w64-gcc` is required to compile the native C components.

---

## CI/CD Integration

These scripts can be integrated into CI/CD pipelines. Example GitHub Actions:

```yaml
- name: Build releases
  run: make release-all
- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    path: release/builds/
```
