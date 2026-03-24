# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-02-07

### Added
- Multi-game support with automatic detection
- INI parser with support for 3DMigoto syntax
- Mod conflict detection and resolution
- Profile system for multiple mod configurations
- Game launching with Wine/Proton support
- Asset synchronization and hashing
- Glassmorphism UI with Tailwind v4
- Drag-and-drop mod import

### Crates
- **ini**: INI file parsing with nom
- **vfs**: Virtual file system for mod deployment
- **storage**: Game library and database management  
- **mod_patches**: INI patcher and conflict resolution
- **launcher**: Game launching with Wine/Proton
- **sync**: Asset synchronization and hashing
- **resources**: Resource downloading and management
- **loader**: Mod loader interface

### Build
- Tauri v2 with Bun + React 19
- Workspace with 8 Rust crates
- Cross-platform build support (Windows, Linux)