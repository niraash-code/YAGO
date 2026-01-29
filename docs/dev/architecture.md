# Architecture Overview

YAGO is built as a highly modular Cargo Workspace consisting of 8 specialized Rust crates and a modern React frontend.

## 🏗️ The 8 Pillars

| Crate | Responsibility |
| :--- | :--- |
| **`fs_engine`** | VFS (Symlinks), Archive Extraction (.zip/.7z), and cross-platform sanitization. |
| **`ini_forge`** | High-performance parser/compiler for logic-aware `.ini` files. |
| **`logic_weaver`** | The "IDE" crate. Handles merging logic, variable namespacing, and DXBC patching. |
| **`librarian`** | Manages decentralized game DBs (`game.json`) and the `TemplateRegistry`. |
| **`proc_marshal`** | Manages the game lifecycle, FPS Unlocking, and Sandbox snapshots. |
| **`loader_ctl`** | Handles mod loader installation, proxy chaining, and injection modes. |
| **`quartermaster`** | High-performance asset caching and network fetching. |
| **`sophon_engine`** | The Maintenance Engine. Handles block-level parallel downloads and HDiffZ patching. |

## 🏗️ The Sophon Maintenance System

YAGO's maintenance engine is designed for bit-perfect reliability and bandwidth efficiency.

### 1. Block-Level Orchestration
Unlike traditional file-based downloaders, YAGO breaks games into **Chunks (1-4MB)**. 
- **Deduplication**: Chunks shared across multiple files or game versions are only downloaded once.
- **Worker Pool**: A multi-threaded MPMC (Multiple Producer, Multiple Consumer) queue ensures 100% CPU and Network utilization.
- **Pre-allocation**: Files are instantly pre-allocated on disk to prevent fragmentation and mid-download disk space failures.

### 2. Delta Patching via HDiffZ
To support game updates with minimal downloads, YAGO integrates the native C library `hpatchz` via an FFI bridge. This allows for:
- **Zero-Copy Streaming**: Data is patched directly through memory pointers without creating massive temporary files.
- **Atomic File Swaps**: Files are only replaced after the new version is fully reconstructed and verified.

### 3. Resilience & Journaling
The `PatchJournal` tracks the state of every chunk during a maintenance operation:
- **`Pending`**: Chunk is queued for work.
- **`Applied`**: Chunk is written to disk but not yet verified.
- **`Verified`**: Chunk MD5 matches the manifest.
If YAGO is closed or crashes, it resumes exactly where it left off by reading the journal.

### 4. Hybrid Scanning
Integrity checks are tiered to balance speed and safety:
- **Fast Pass**: Validates file existence and size metadata.
- **Deep Pass**: Performs block-level MD5 verification of every chunk in the game library.

## 🧩 Decentralized Storage System

YAGO avoids a single monolithic database to prevent data corruption and orphaned mod entries. 

- **Games Root**: Located in the application's `app_data` directory.
- **Game Directory**: Identified by executable name (e.g., `GenshinImpact.exe/`).
- **Game Databases**: Each directory contains an isolated database with settings and mod indices.
- **Mod Isolation**: Mods are stored in a dedicated directory within each game's home.

## 📋 Template-Driven Identification

The `librarian` crate maintains a `TemplateRegistry` that scans the `resources/templates/` directory for game blueprints. This ensures the frontend remains 100% agnostic and display logic is entirely data-driven.

## 🎨 Modular Frontend

The frontend follows a "Clean Layout" architecture:
- **State Management**: Zustand handles library and process state, mapping backend models to streamlined frontend types.
- **Component Decomposition**: Bulky components are split into domain-specific sub-folders (e.g., `components/mod-manager/inspector/`).
- **Standard Types**: All TypeScript interfaces are consolidated in `src-ui/src/types/index.ts`.

---
[Next: Project Structure](../../STRUCTURE.md) | [Documentation Home](../index.md)
