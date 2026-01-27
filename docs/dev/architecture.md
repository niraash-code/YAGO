# Architecture Overview

YAGO is built as a highly modular Cargo Workspace consisting of 8 specialized Rust crates and a modern React frontend.

## 🏗️ The 8 Pillars

| Crate | Responsibility |
| :--- | :--- |
| **`fs_engine`** | VFS (Symlinks), Archive Extraction (.zip/.7z), and cross-platform sanitization. |
| **`ini_forge`** | High-performance, `nom`-based parser/compiler for logic-aware `.ini` files. |
| **`logic_weaver`** | The "IDE" crate. Handles merging logic, variable namespacing, and DXBC patching. |
| **`librarian`** | Manages decentralized game DBs (`game.json`) and the `TemplateRegistry`. |
| **`proc_marshal`** | Manages the game lifecycle, FPS Unlocking, and Sandbox snapshots. |
| **`loader_ctl`** | Handles 3DMigoto/ReShade installation, proxy chaining, and injection modes. |
| **`quartermaster`** | High-performance asset caching and automated GitHub release resolution. |
| **`sophon_engine`** | Implements delta update protocols and checksum verification. |

## 🧩 Decentralized Storage System

YAGO avoids a single monolithic database to prevent data corruption and orphaned mod entries. 

- **Games Root**: Located in the application's `app_data` directory.
- **Game Directory**: Identified by executable name (e.g., `GenshinImpact.exe/`).
- **Game Databases**: Each directory contains an isolated database with settings and mod indices.
- **Mod Isolation**: Mods are stored in a dedicated directory within each game's home.

## 📡 Modular IPC Commands

Backend logic is exposed to the frontend via a modular command system in `src-tauri/src/commands/`. Each domain (Library, Mods, Launcher, etc.) has its own module, ensuring clear boundaries and easier maintenance.

## 🎨 Modular Frontend

The frontend follows a "Clean Layout" architecture:
- **State Management**: Zustand handles library and process state, mapping complex backend models to streamlined frontend types.
- **Component Decomposition**: Bulky components are split into domain-specific sub-folders (e.g., `components/mod-manager/inspector/`), minimizing cognitive load.

## 🛠️ Technical Stack

- **Backend**: Rust (Edition 2021) + Tauri v2.
- **Frontend**: React 19 + TypeScript + Vite.
- **Testing**: Crate-level unit tests, functional "flow" integration tests, and full simulation.

---
[Next: Project Structure](../../STRUCTURE.md) | [Documentation Home](../index.md)