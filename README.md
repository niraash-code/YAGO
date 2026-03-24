# YAGO - Yet Another Game Organizer

A high-performance game mod manager built with Tauri, React, and Rust.

## Features

- **Multi-Game Support** - Manage mods for multiple games from a single interface
- **Smart INI Handling** - Parse and merge 3DMigoto configurations with conflict resolution
- **Profile System** - Multiple mod configurations per game with easy switching
- **Game Launching** - Launch games with Wine, Proton, or native runners
- **Mod Import** - Drag-and-drop mod import with automatic categorization
- **Modern UI** - Clean glassmorphism design with smooth animations

## Supported Games

- **HoYoverse**: Genshin Impact, Honkai: Star Rail, Zenless Zone Zero
- **Wuthering Waves**

More games will be added in the future.

## Tech Stack

- **Backend**: Rust (Tauri v2)
- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Build**: Bun

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (latest)
- [Rust](https://rustup.rs/) (latest stable)

### Build

```bash
# Install dependencies
bun install

# Run development server
bun run tauri dev

# Build for production
bun run tauri build
```

## Architecture

The core logic is split into 8 Rust crates:

| Crate | Purpose |
|-------|---------|
| **ini** | INI file parser with 3DMigoto syntax support |
| **vfs** | Virtual file system for mod deployment via symlinks |
| **storage** | Game library and database management |
| **mod_patches** | INI patching and conflict resolution |
| **launcher** | Game launching with Wine/Proton support |
| **sync** | Asset synchronization and delta updates |
| **resources** | Resource downloading and management |
| **loader** | Mod loader interface |

## Project Structure

```
yago/
├── crates/           # Rust backend crates
├── src-tauri/        # Tauri backend entry
├── src-ui/           # React frontend
├── resources/        # App resources and game templates
└── scripts/          # Build and utility scripts
```

## Documentation

See the [docs/](docs/) directory for user and developer guides.

## License

Licensed under MIT. See [LICENSE](LICENSE) for details.

YAGO is a non-destructive tool. It does not modify game binaries. Use responsibly.

**Happy Modding!**
