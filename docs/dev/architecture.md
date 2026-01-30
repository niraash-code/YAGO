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
- **Pre-allocation**: Files are instantly pre-allocated on disk using `truncate(false)` to preserve existing data during incremental runs.

### 2. Binary Protocol & Discovery
YAGO natively implements the Sophon binary protocol:
- **Manifest Parsing**: Decodes Zstandard-compressed Protobuf files to reconstruct file-to-chunk mappings.
- **HoYoPlay Integration**: Interacts with `getBuild` endpoints using unified identifiers and regional branch passwords.
- **Fuzzy Identification**: Leverages alphanumeric normalization to link manual installs (e.g., `GenshinImpact.exe`) to official metadata templates.

### 3. Smart Incremental Repair
Integrity checks and updates use an incremental "Smart Pass":
- **Size-Based Skipping**: Chunks residing within files that already match the manifest's offset/size requirements are skipped.
- **Atomic Writing**: Chunks are written into pre-allocated files at exact offsets, allowing for bit-perfect repair of partially corrupted games.
- **Interactive Verification**: Provides real-time percentage feedback during the heavy I/O scanning phase.

### 4. Resilience & Journaling
The `PatchJournal` tracks the state of every chunk during a maintenance operation:
- **`Pending`**: Chunk is queued for work.
- **`Applied`**: Chunk is written to disk but not yet verified.
- **`Verified`**: Chunk MD5 matches the manifest.
If YAGO is closed or crashes, it resumes exactly where it left off by reading the journal.

### 5. Hybrid Scanning
Integrity checks are tiered to balance speed and safety:
- **Fast Pass**: Validates file existence and size metadata.
- **Deep Pass**: Performs block-level MD5 verification of every chunk in the game library.

## 🧩 Decentralized Storage System

YAGO avoids a single monolithic database to prevent data corruption and orphaned mod entries. The system is designed for portability and resource sharing.

- **Storage Roots**: Configured via `LibrarianConfig`. Supports a single `base_path` with granular overrides for:
    - **Mods**: Can be stored on external SSDs.
    - **Runners**: Can be shared with Steam or Lutris.
    - **Prefixes**: Isolated per-game environments.
- **Game Paths**: Resolved via the `GamePaths` helper. Each game is identified by its executable name (e.g., `genshinimpact.exe/`).
- **Game Databases**: Each directory contains an isolated `game.json` with settings and mod indices.
- **Resilience**: If the main application data is wiped, games and mods stored in override paths remain intact and can be re-linked via the **Auto-Discovery** system.

## 📋 Template-Driven Identification

The `librarian` crate maintains a `TemplateRegistry` that scans the `resources/templates/` directory for game blueprints.
- **Normalization**: Alphanumeric characters are stripped during template matching to handle variations in directory naming (e.g., `Honkai: Star Rail` vs `hkrpg_global`).
- **Discovery Pipeline**: Manually added games are immediately matched against templates to enable version monitoring and "Verify & Repair" actions.

## 🎨 Modular Frontend

The frontend follows a "Clean Layout" architecture:
- **State Management**: Zustand handles library and process state, mapping backend models to streamlined frontend types.
- **Component Decomposition**: Bulky components are split into domain-specific sub-folders (e.g., `components/mod-manager/inspector/`).
- **Standard Types**: All TypeScript interfaces are consolidated in `src-ui/src/types/index.ts`.

---
[Next: Project Structure](../../STRUCTURE.md) | [Documentation Home](../index.md)
