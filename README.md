# YAGO - Yet Another Game Organizer

[![Status](https://img.shields.io/badge/status-ALPHA-orange)](https://github.com/niraash-code/YAGO)
[![Rust](https://img.shields.io/badge/rust-1.75+-000000)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/tauri-2.0-24c8db)](https://tauri.app/)
[![React](https://img.shields.io/badge/react-19.0-61dafb)](https://reactjs.org/)

YAGO is a high-performance, next-generation modding platform that bridges the gap between a user-friendly Game Manager and a technical Integrated Development Environment (IDE) for modders.

> **⚠️ Project Status: ALPHA**  
> YAGO is currently in active development. There are **no public builds available** at this time. We are focused on architectural stability and core feature completion before an initial public release.

- **Tier 1 (Native Logic Support):** Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, Wuthering Waves (GIMI/SRMI/ZZZMI logic).
- **Tier 2 (Legacy Support):** Dead or Alive 6, SoulCalibur VI.
- **Tier 3 (Future Expansion):** Unreal Engine Gachas (Tower of Fantasy, Snowbreak) via `.pak` logic.

---

## 🌟 The Vision: The "Quad-Lemma" Solution

YAGO solves four critical ecosystem failures simultaneously:

### 1. The Organizer (For Players)
- **Virtual File System**: Mods stay clean in a Library. YAGO deploys them instantly using 0-copy Symlinks.
- **Context-Aware**: Automatically switches logic based on the game (Genshin Regions vs. Star Rail Planets).
- **Safety First**: Global "Streamer Mode" (NSFW Blur/Kill-switch) and non-destructive file handling.

### 2. The IDE (For Modders)
- **Logic Compiler**: Automatically writes complex .ini logic for Toggles, Region Switching, and Sub-Mods.
- **Static Analysis**: A "Fake Interpreter" that validates mod logic before deployment to prevent crashes.
- **Standardization**: Full implementation of the `mod.json` manifest standard.

---

## 🧩 Architecture: The 8 Pillars

The core logic is distributed across 8 specialized Rust crates, ensuring maximum isolation and testability. For a deep dive into the codebase, see [**STRUCTURE.md**](STRUCTURE.md).

| Crate | Responsibility | Key Tech |
| :--- | :--- | :--- |
| **`fs_engine`** | VFS (Symlinks), Archive extraction, Atomic operations. | `zip`, `sevenz-rust` |
| **`ini_forge`** | Logic-aware .ini parsing with `if/endif` support. | `nom` |
| **`logic_weaver`** | Deployment planning, INI merging, DXBC patching. | (Pure Rust) |
| **`librarian`** | Decentralized databases, Mod metadata, Game discovery. | `serde`, `chrono` |
| **`proc_marshal`** | Process execution, FPS Unlocking, Sandbox snapshots. | `sysinfo`, `tokio` |
| **`loader_ctl`** | 3DMigoto/ReShade installation & dual-proxy chaining. | (Pure Rust) |
| **`quartermaster`** | High-perf asset caching and GitHub update resolution. | `reqwest`, `md5` |
| **`sophon_engine`** | Delta update protocol and checksum verification. | `tokio`, `md5` |

---

## 🏗️ Technical Innovations

### Decentralized Storage
YAGO identifies games by executable name. Each game has an isolated home in `app_data/games/` containing its database and mods. This ensures zero "orphaned mods" and simple manual cleanup.

### Template-Driven Metadata
The frontend is 100% agnostic. All game-specific colors, descriptions, and icons are loaded dynamically from `assets/templates/` blueprints.

### Native Archive Support
Support for direct import of `.zip` and `.7z` mod archives with automatic extraction and filename sanitization.

---

## 📅 Implementation Roadmap (ALPHA)

### Phase 1: The Core (Completed)
- Modular Rust Workspace initialization.
- Virtual File System (Symlinks) implementation.
- Basic Mod Manager & Library synchronization.

### Phase 2: The IDE (In Progress)
- DXBC Shader Patching (Buffer re-indexing).
- Integrated File Manager & Logic-aware INI Editor.
- Character Roster & Wardrobe view.

### Phase 3: The Super App (Planned)
- Sophon delta update implementation.
- Game executable patching & memory injection.
- Advanced Sandbox snapshotting.

---

## 📂 Project Structure

```text
├── docs/                      # Technical and user documentation
├── crates/                    # Core logic crates (independent & testable)
├── src-tauri/                 # Rust Tauri host & modular IPC commands
│   └── src/commands/          # Logic-specific command modules
├── src-ui/                    # React Frontend
│   └── src/                   # Standardized source directory
│       ├── components/        # Modular dashboard & inspector components
│       ├── store/             # Zustand state management
│       └── tests/             # Vitest suite
├── assets/                    # Centralized app config & presets
└── build_tools/               # Multi-platform packaging system
```

---

## 🛠️ Developer Guide

Detailed technical documentation is available in the [**docs/**](docs/index.md) folder:

### Technical Specs
- [**Architecture Overview**](docs/dev/architecture.md)
- [**Testing Procedures**](docs/dev/testing.md)
- [**mod.json Specification**](docs/dev/mod-json-spec.md)
- [**Contribution Guide**](docs/dev/contribution.md)

### User Guides
- [**Getting Started**](docs/user/getting-started.md)
- [**Launcher Features**](docs/user/launcher-features.md)
- [**Mod Management**](docs/user/mod-management.md)

---

## 📦 Building & Release

### Standard Build
```bash
cargo tauri build
```

### Release Packages
YAGO supports multiple formats via the `Makefile`:
```bash
make release-appimage   # Linux AppImage
make release-flatpak    # Linux Flatpak
make release-deb        # Debian/Ubuntu DEB (Distrobox recommended)
make release-rpm        # Fedora/RHEL RPM (Distrobox recommended)
make release-pkgbuild   # Arch Linux PKGBUILD
make release-windows    # Windows EXE
```
See [**Release System Docs**](docs/dev/release-system.md) for compatibility building (GLIBC fix).

---

## 🔧 Troubleshooting

### Linux UI Scaling
If the window doesn't appear correctly on Wayland (KDE/GNOME), try:
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
