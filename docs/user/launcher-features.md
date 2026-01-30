# Launcher Features

YAGO is a community-driven mod manager and game organizer designed to simplify the modding experience.

## 🐧 Linux Support

YAGO is built with Linux users in mind, helping to manage the command chain required for a smooth experience:

- **Proton/Wine**: Simple management of environment variables.
- **Gamemode**: Integration with Feral GameMode for process priorities.
- **Gamescope**: Compatibility with the Gamescope micro-compositor.
- **MangoHud**: Support for displaying performance overlays.

## 🚀 Environment Optimizations

- **FPS Unlock**: Provides tools to adjust frame rate limits beyond the default 60 FPS.
- **GPU Selection**: Helps ensure the system utilizes the appropriate GPU for rendering.
- **Unity Arguments**: Automatically applies common flags like borderless windowed mode.

## 💉 Injection Methods

YAGO supports standard community methods for 3DMigoto and ReShade injection:

1.  **Proxy DLL (Default)**: Follows the standard "Dual Proxy" strategy on Linux, loading mod loaders and ReShade automatically.
2.  **ReShade Only**: Installs ReShade as a local proxy for users who only need post-processing.
3.  **Loader (Memory Injection)**: Support for external loader executables where required for compatibility.

## 🛠️ Maintenance & Integrity

### Verify & Repair (Manifest-Based)
YAGO includes verification logic that mimics the behavior of official recovery tools by checking game files against official manifests:
- **Chunk-Level Checking**: Compares your local files against the manifest hash tree to find inconsistencies.
- **Incremental Repair**: Only missing or corrupted data blocks are processed, helping to restore the installation efficiently.
- **Visual Feedback**: Provides basic progress indicators during the file scanning phase.

## 💾 Flexible Storage (Decentralized)

YAGO features a unique decentralized storage model designed for power users and library sharing:

- **Granular Path Overrides**: You can independently set the paths for **Mods**, **Runners** (Proton/Wine), and **WINE Prefixes**.
- **SSD Optimization**: Move your heavy mod directories to a fast NVMe SSD while keeping the lightweight application metadata on your system drive.
- **Cross-Tool Sharing**: Point YAGO to your existing `compatibilitytools.d` folder to share Proton versions with Steam, or use existing Lutris prefixes to avoid redundant disk usage.
- **Portability**: Your game databases (`game.json`) are stored within your Games Root. If you reinstall YAGO, simply point it to your Games Root again, and your entire configuration is instantly restored.

---
[Next: Safety & Streamer Mode](safety.md) | [Documentation Home](../index.md)
