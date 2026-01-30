# YAGO - Yet Another Game Organizer

[![Status](https://img.shields.io/badge/status-ALPHA-orange)](https://github.com/niraash-code/YAGO)
[![Rust](https://img.shields.io/badge/rust-1.75+-000000)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/tauri-2.0-24c8db)](https://tauri.app/)
[![React](https://img.shields.io/badge/react-19.0-61dafb)](https://reactjs.org/)

YAGO is a community-driven game organizer and modding companion designed to provide a streamlined experience for both players and modders. It focuses on maintaining a clean modding environment while integrating with official game delivery standards.

- **Tier 1 (Native Logic Support):** Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, Wuthering Waves (GIMI/SRMI/ZZZMI logic).
- **Tier 2 (Legacy Support):** Dead or Alive 6, SoulCalibur VI.
- **Tier 3 (Future Expansion):** Unreal Engine Gachas (Tower of Fantasy, Snowbreak) via `.pak` logic.

> **⚠️ Project Status: ALPHA**  
> YAGO is currently in active development. We are focused on architectural stability and core features before an initial public release.

---

## 🌟 The Vision: A Unified Companion

YAGO aims to simplify several key aspects of the modding workflow:

### 1. Simple Organization (For Players)
- **Virtual File System**: Keeps your game directories clean by using zero-copy Symlinks to deploy mods from a centralized library.
- **Context-Aware**: Switches logic automatically based on the selected game.
- **Safety Features**: Includes "Streamer Mode" options (NSFW Blur) and non-destructive file handling to protect your installation.

### 2. Streamlined Tools (For Modders)
- **Logic Handling**: Simplifies the management of complex .ini files for Toggles and Sub-Mods.
- **Validation**: Provides basic validation of mod structures to help prevent common issues before deployment.
- **Standardization**: Adheres to the `mod.json` manifest standard for better tool compatibility.

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

## 🏗️ Core Innovations

### Mimicking Official Standards
YAGO is designed to be a lightweight, community-driven organizer that respects the infrastructure of the games it supports. By implementing the **Sophon protocol**, YAGO follows the same delivery logic used by official game clients.

- **Integrated Maintenance**: YAGO helps keep your game files in a healthy state by verifying them against official manifests. It can identify and repair specific missing chunks, mimicking the behavior of official recovery tools.
- **Incremental Updates**: Like the official launcher, YAGO supports incremental updates. Our implementation ensures that only changed data is processed, saving time and bandwidth for the user.
- **Resource Efficiency**: Optionally install only the game core and specific audio packs to better manage your disk space.
- **Seamless Discovery**: YAGO can scan your existing folders to identify and link your games to the official update cycle, ensuring you're always using the correct version.

### Organized Storage & Flexibility
YAGO provides simple tools to manage your modding environment:
- **Flexible Paths**: Keep your app data light and store your large mod collections on the drive of your choice.
- **Environment Sharing**: YAGO can be pointed to existing Proton or Wine environments to reduce redundant installations.
- **Portable Settings**: Game-specific configurations are kept with your games, making it easier to maintain your setup across different installations.

### Management Hub
A dedicated space for basic administrative tasks:
- **Environment Reset**: Simple tools to purge and recreate Wine/Proton prefixes if an environment becomes unstable.
- **Cleanup Tools**: Dedicated options to remove mod libraries or uninstall game entries from your local disk.
- **Version Awareness**: YAGO monitors game versions to help ensure you are running a compatible client before launching with mods.

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
