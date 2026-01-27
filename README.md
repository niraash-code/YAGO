# YAGO - Yet Another Game Organizer

[![Status](https://img.shields.io/badge/status-production--ready-green)](https://github.com/your-org/yago)
[![Rust](https://img.shields.io/badge/rust-1.75+-000000)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/tauri-2.0-24c8db)](https://tauri.app/)
[![React](https://img.shields.io/badge/react-19.0-61dafb)](https://reactjs.org/)

YAGO is a high-performance, next-generation modding platform that bridges the gap between a user-friendly Game Manager and a technical Integrated Development Environment (IDE) for modders.

## 🌟 The Vision

YAGO provides a clean, safe, and powerful environment for both players and modders:

- **For Players**: Zero-copy mod deployment via a Virtual File System (Symlinks), context-aware profile management, and global "Streamer Mode" safety features.
- **For Modders**: A specialized IDE featuring a logic-aware INI editor, shader (DXBC) patching, and automated mod merging.

## 🧩 Architecture: The 8 Pillars

The core logic is distributed across 8 specialized Rust crates, ensuring maximum isolation and testability.

| Crate | Responsibility | Key Tech |
| :--- | :--- | :--- |
| **`fs_engine`** | VFS (Symlinks), Archive extraction, Atomic operations. | `zip`, `sevenz-rust` |
| **`librarian`** | Decentralized databases, Mod metadata, Game discovery. | `serde`, `chrono` |
| **`proc_marshal`** | Process execution, FPS Unlocking, Sandbox snapshots. | `sysinfo`, `tokio` |
| **`logic_weaver`** | Deployment planning, INI merging, DXBC patching. | (Pure Rust) |
| **`ini_forge`** | Logic-aware .ini parsing with `if/endif` support. | `nom` |
| **`loader_ctl`** | 3DMigoto/ReShade installation & dual-proxy chaining. | (Pure Rust) |
| **`quartermaster`** | High-perf asset caching and GitHub update resolution. | `reqwest`, `md5` |
| **`sophon_engine`** | Delta update protocol and checksum verification. | `tokio`, `md5` |

---

## 📂 Project Structure

The project follows a modern, modular structure designed for large-scale engineering:

```text
├── docs/                      # Technical and user documentation
├── crates/                    # Core logic crates (independent & testable)
├── src-tauri/                 # Rust Tauri host & modular IPC commands
│   └── src/commands/          # Logic-specific command modules
├── src-ui/                    # React Frontend
│   └── src/                   # Standardized source directory
│       ├── components/        # Modular dashboard & inspector sub-components
│       ├── store/             # Zustand state management (mapped models)
│       └── tests/             # Vitest suite
├── assets/                    # Centralized app config & presets
└── build_tools/               # Multi-platform packaging system
```

---

## 🛠 Developer Quickstart

For detailed architectural insights, please read **`STRUCTURE.md`**.

### Development Workflow
1.  **Environment Setup**: `./setup_yago.sh`
2.  **Run Dev Mode**: `make dev`
3.  **Execute Tests**: `make test` (Runs all 8 crates + Integration flows)
4.  **Lint & Format**: `make lint`

### Documentation Map
- **Technical Overview**: [Architecture](docs/dev/architecture.md)
- **Testing Protocol**: [Testing Guide](docs/dev/testing.md)
- **Mod Specification**: [mod.json Spec](docs/dev/mod-json-spec.md)
- **Contribution**: [Contributing to YAGO](docs/dev/contribution.md)

---

## 📝 License & Ethical Use

Licensed under **MIT**. 

YAGO is a non-destructive research project. It does not modify game binaries. Use at your own risk; modding can lead to account termination. This project is not affiliated with or endorsed by any game developer.

---

**Happy Modding!** 🎮✨