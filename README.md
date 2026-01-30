# YAGO - Yet Another Game Organizer

[![Status](https://img.shields.io/badge/status-ALPHA-orange)](https://github.com/niraash-code/YAGO)
[![Rust](https://img.shields.io/badge/rust-1.75+-000000)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/tauri-2.0-24c8db)](https://tauri.app/)
[![React](https://img.shields.io/badge/react-19.0-61dafb)](https://reactjs.org/)

YAGO is a high-performance, next-generation modding platform that bridges the gap between a user-friendly Game Manager and a technical Integrated Development Environment (IDE) for modders.

- **Tier 1 (Native Logic Support):** Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, Wuthering Waves (GIMI/SRMI/ZZZMI logic).
- **Tier 2 (Legacy Support):** Dead or Alive 6, SoulCalibur VI.
- **Tier 3 (Future Expansion):** Unreal Engine Gachas (Tower of Fantasy, Snowbreak) via `.pak` logic.

> **⚠️ Project Status: ALPHA**  
> YAGO is currently in active development. There are **no public builds available** at this time. We are focused on architectural stability and core feature completion before an initial public release.

---

## 🌟 The Vision: The "Quad-Lemma" Solution

YAGO solves four critical ecosystem failures simultaneously:

### 1. The Organizer (For Players) - Ease
- **Virtual File System**: Mods stay clean in a Library. YAGO deploys them instantly using zero-copy Symlinks.
- **Context-Aware**: Automatically switches logic based on the game (Genshin Regions vs. Star Rail Planets).
- **Safety First**: Global "Streamer Mode" (NSFW Blur/Kill-switch) and non-destructive file handling.

### 2. The IDE (For Modders) - Power
- **Logic Compiler**: Automatically writes complex .ini logic for Toggles, Region Switching, and Sub-Mods.
- **Static Analysis**: A "Fake Interpreter" that validates mod logic before deployment to prevent game crashes.
- **Standardization**: Implements the `mod.json` manifest standard for cross-tool compatibility.

---

## 🧩 Architecture: The 8 Pillars

The core logic is distributed across 8 specialized Rust crates. For a deep architectural dive, see [**STRUCTURE.md**](STRUCTURE.md).

| Crate | Responsibility | Key Tech |
| :--- | :--- | :--- |
| **`fs_engine`** | VFS (Symlinks), Archive extraction, Atomic operations. | `zip`, `sevenz-rust` |
| **`ini_forge`** | Logic-aware .ini parsing with `if/endif` support. | `nom` |
| **`logic_weaver`** | Deployment planning, INI merging, DXBC patching. | (Pure Rust) |
| **`librarian`** | Decentralized databases, Metadata, Game discovery. | `serde`, `chrono` |
| **`proc_marshal`** | Process execution, FPS Unlocking, Sandbox snapshots. | `sysinfo`, `tokio` |
| **`loader_ctl`** | Mod loader installation & dual-proxy chaining. | (Pure Rust) |
| **`quartermaster`** | High-perf asset caching and network fetching. | `reqwest`, `md5` |
| **`sophon_engine`** | Maintenance Brain: Bit-perfect content delivery, Protobuf/Zstd binary protocol, and incremental repair. | `prost`, `zstd`, `tokio`, `md5` |

---

## 🏗️ Technical Innovations

### Sophon Content Delivery (Pillar 7)
YAGO features a native, bit-perfect implementation of the Sophon binary protocol, allowing it to maintain games completely independently of official launchers:
- **Binary Protocol Decoding**: Native handling of Zstandard-compressed Protobuf manifests used by the latest HoYoPlay unified launcher.
- **Smart Incremental Updates**: Scans existing files up to 3 levels deep. If a chunk is already present and matches the official size/hash, it is skipped automatically—no more redownloading 100GB for a 2GB patch.
- **Selective Component Installation**: A cloud-driven wizard lets you choose exactly which components to install (e.g., Core Assets + English Audio) to save bandwidth and disk space.
- **High-Fidelity Orchestration**: Multi-threaded MPMC worker pool ensures 100% CPU and Network utilization with real-time ETA and speed tracking.
- **Bit-Perfect Repair**: Performs block-level verification against official manifests and only redownloads the exact missing or corrupted chunks.

### Unified Game Lifecycle Management
YAGO is no longer just a mod manager—it is a complete game lifecycle platform:
- **Cloud Discovery**: Query the official HoYoPlay catalog to initialize game entries before a single byte is downloaded.
- **Advanced Management Suite**: A dedicated management hub for administrative tasks:
    - **Purge Prefix**: Delete Wine/Proton environments to fix "corrupt" launch states.
    - **Wipe Mods**: Permanently purge the entire mod library for a specific title.
    - **Delete Entry (Unlink)**: Remove a game from YAGO while keeping all files safe on your disk.
    - **Full Uninstall**: A multi-step, destructive wipe that removes every byte of the game and mods.
- **Recursive Auto-Discovery**: Point YAGO to your primary Games folder (e.g., `~/Games`), and it will perform a deep recursive scan to identify and import all supported titles automatically.

### Sophisticated Version Detection
YAGO identifies game versions with regional precision by combining multiple fallback strategies:
1. **Config.ini Parsing**: A lenient, case-insensitive parser that traverses parent directories to find the definitive version string.
2. **Pkg_version Scanning**: Regex-based extraction from internal language-specific manifest files.
3. **PE Metadata Filtering**: Direct extraction from Windows executables with smart filters to ignore engine-specific versioning (e.g., Unity).
4. **Launch Protection**: Strictly gates game execution—if an update is available or the version is unverified, YAGO replaces "Launch" with a mandatory "Update" or "Verify" action.

---

## 📋 Ecosystem Standards

### `mod.json` Specification v1.3
YAGO implements standardized metadata to ensure mods are portable and self-describing:

```json
{
  "schema_version": 1.3,
  "meta": {
    "name": "Raiden Shogun - Boss Skin",
    "version": "1.0",
    "author": "ModGod"
  },
  "compatibility": {
    "game": "Genshin Impact",
    "character": "Raiden",
    "fingerprint": "A1B2C3D4..."
  },
  "config": {
    "tags": ["NSFW", "INA"],
    "keybinds": {
      "slot_1": { "label": "Toggle Skirt", "variable": "$skirt_state" }
    }
  }
}
```

---

## 📅 Implementation Roadmap (ALPHA)

### Phase 1: The Core (Completed)
- Modular Rust Workspace initialization.
- Virtual File System (Symlinks) implementation.
- Basic Mod Manager & Library synchronization.

### Phase 2: The IDE (Completed)
- DXBC Shader Patching (Buffer re-indexing).
- Integrated File Manager & Logic-aware INI Editor.
- Character Roster & Wardrobe view.

### Phase 3: The Super App (In Progress)
- **Sophon Engine**: Content delivery, delta updates, and selective install. (COMPLETED)
- **Unified Discovery**: Cloud catalog querying and one-click installs. (COMPLETED)
- Advanced Sandbox snapshotting and memory injection. (UP NEXT)

---

## 📂 Project Structure

```text
├── docs/                      # Technical and user documentation
├── crates/                    # Core logic crates (independent & testable)
├── src-tauri/                 # Rust Tauri host & modular IPC commands
│   └── src/commands/          # Logic-specific command modules
├── src-ui/                    # React Frontend (Standard structure)
├── resources/                 # Centralized app config, presets & templates
├── scripts/                   # Development & environment utilities
├── fixtures/                  # Standardized mock data for testing
└── build_tools/               # Multi-platform packaging system
```

---

## 🛠️ Developer Guide

### Quickstart
1. **Setup**: `./scripts/setup.sh`
2. **Dev**: `make dev`
3. **Test**: `make test`

### Detailed Documentation
- [**Architecture Overview**](docs/dev/architecture.md)
- [**Testing Procedures**](docs/dev/testing.md)
- [**mod.json Specification**](docs/dev/mod-json-spec.md)
- [**Contribution Guide**](docs/dev/contribution.md)
- [**Getting Started**](docs/user/getting-started.md)
- [**Launcher Features**](docs/user/launcher-features.md)
- [**Mod Management**](docs/user/mod-management.md)

---

## 📦 Building & Release

### Release Packages
YAGO supports multiple formats via the `Makefile`:
```bash
make release-appimage   # Linux AppImage
make release-flatpak    # Linux Flatpak
make release-deb        # Debian/Ubuntu DEB
make release-rpm        # Fedora/RHEL RPM
make release-pkgbuild   # Arch Linux PKGBUILD
make release-windows    # Windows EXE
```

### Compatibility Building (GLIBC Fix)
To ensure DEB/RPM packages work on older Linux distributions, use the containerized build system:
1. Install **Distrobox**.
2. Run `./build_tools/setup-build-containers.sh`.
3. Build normally (e.g., `make release-deb`). The system will detect the containers automatically.

---

## 🔧 Troubleshooting

### GUI Window Issues (Wayland)
If the window doesn't appear correctly on Wayland (KDE/GNOME), force the GDK backend:
```bash
GDK_BACKEND=wayland cargo tauri dev
```

### Build Dependencies
Ensure your system has the following installed:
- **Arch**: `gtk3 webkit2gtk`
- **Ubuntu/Debian**: `libgtk-3-0 libwebkit2gtk-4.1-0`

---

## 🤝 Acknowledgments
- [Tauri](https://tauri.app/) - High-performance desktop framework.
- [3DMigoto](https://github.com/bo3b/3DMigoto) - The technical foundation for modern modding.
- [Shadcn/UI](https://ui.shadcn.com/) - Modern accessible UI components.

---

## 📝 License & Ethical Use
Licensed under **MIT**. 

YAGO is an independent research project. Modding can lead to account termination. Use at your own risk. This project is not affiliated with or endorsed by any game developer.

**Happy Modding!** 🎮✨
