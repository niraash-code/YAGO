# Launcher Features

YAGO is more than just a mod manager; it is a high-performance game launcher.

## 🐧 Linux Support

YAGO is built with Linux in mind. It handles the complex command chain required for peak performance:

- **Proton/Wine**: Automatic environment variable management.
- **Gamemode**: Optimizes CPU and I/O priorities.
- **Gamescope**: Provides a high-quality micro-compositor.
- **MangoHud**: Displays performance metrics.

## 🚀 Performance Optimizations

- **FPS Unlock**: Supports unlocking frame rates beyond the official 60 FPS limit (up to 120+ FPS).
- **GPU Forcing**: Ensures your laptop uses its dedicated GPU (`GpuPreference=2`) for maximum performance.
- **Unity Arguments**: Automatically applies borderless windowed mode and custom resolution flags.

## 💉 Injection Methods

YAGO supports multiple methods for 3DMigoto and ReShade injection:

1.  **Proxy DLL (Default)**: The standard and most stable method. It uses a "Dual Proxy" (side-by-side) strategy on Linux, loading both the mod loader (`d3d11.dll`) and ReShade (`dxgi.dll`) automatically.
2.  **ReShade Only**: Installs ReShade as a local proxy without the mod loader.
3.  **Loader (Memory Injection)**: Uses a dedicated loader executable for injection, often preferred for specific compatibility scenarios on Windows.

## 🛠️ Maintenance & Integrity

### Verify & Repair (Bit-Perfect)
YAGO features a high-fidelity verification engine that ensures your game files match the official HoYoverse production manifests:
- **Block-Level Scanning**: Performs a meticulous check of your game files against the official manifest hash tree.
- **Incremental Repair**: Instead of redownloading the entire game, YAGO identifies the exact corrupted or missing blocks and only downloads those specific chunks.
- **Visual Feedback**: Real-time progress percentage during the initial file-system scanning phase.

### Advanced Management Hub
Every game features a dedicated **Management** tab in the settings drawer for administrative tasks:
- **Purge Prefix**: Permanently delete the Wine/Proton prefix. Useful for fixing environment-specific launch crashes. A fresh prefix will be automatically recreated on the next launch.
- **Wipe Mod Library**: Instantly purge every mod file and configuration associated with the game from your disk.
- **Reset Profiles**: Revert the game to a clean slate by removing all custom loadouts and enabled mod states.
- **Delete Entry (Unlink)**: Safely remove the game from your YAGO library while keeping all game and mod files safe on your disk.
- **Full Uninstall**: A multi-step, destructive wipe that removes every byte of the game installation and its associated mods.

## 💾 Customizable Storage (Decentralized)

YAGO features a unique decentralized storage model designed for power users and library sharing:

- **Granular Path Overrides**: You can independently set the paths for **Mods**, **Runners** (Proton/Wine), and **WINE Prefixes**.
- **SSD Optimization**: Move your heavy mod directories to a fast NVMe SSD while keeping the lightweight application metadata on your system drive.
- **Cross-Tool Sharing**: Point YAGO to your existing `compatibilitytools.d` folder to share Proton versions with Steam, or use existing Lutris prefixes to avoid redundant disk usage.
- **Portability**: Your game databases (`game.json`) are stored within your Games Root. If you reinstall YAGO, simply point it to your Games Root again, and your entire configuration is instantly restored.

---
[Next: Safety & Streamer Mode](safety.md) | [Documentation Home](../index.md)
