# Architecture

YAGO is a modular Rust workspace with a React frontend.

## The 8 Crates

| Crate | Purpose |
|-------|---------|
| **ini** | High-performance INI parser with 3DMigoto syntax support |
| **vfs** | Virtual file system for symlink-based mod deployment |
| **storage** | Game library and database management |
| **mod_patches** | INI merging, conflict resolution, DXBC patching |
| **launcher** | Game launching with Wine/Proton support |
| **sync** | Asset synchronization and delta updates |
| **resources** | Resource downloading and GitHub integration |
| **loader** | Mod loader interface and injection |

## Storage System

YAGO uses decentralized storage:
- **Games Root**: Located in app data directory
- **Per-Game DB**: Each game has its own `game.json` database
- **Mod Isolation**: Mods stored with unique UUIDs

## IPC Commands

Backend logic is exposed via modular commands in `src-tauri/src/commands/`:
- `library.rs` - Game library operations
- `mods.rs` - Mod management
- `launcher.rs` - Game launching
- `profiles.rs` - Profile management

## Tech Stack

- **Backend**: Rust (Edition 2021) + Tauri v2
- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Build**: Bun
