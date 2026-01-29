# Mod Management

YAGO uses a advanced Virtual File System (VFS) to manage your mods without cluttering your game directory.

## 📦 The Library System

When you add a mod to YAGO, it is imported into a central **Library**.

- **Atomic Import**: YAGO validates the mod files and `mod.json` before moving them to the library.
- **Organization**: Mods are stored by Game and unique UUIDs, ensuring no naming conflicts.

## ⚡ Zero-Copy Deployment

YAGO uses **Symlinks** (Linux) and **Junctions** (Windows) to "deploy" mods.

- **Instant**: Toggling a mod takes 0ms regardless of its size.
- **Clean**: No files are actually copied into your game folder. When you close YAGO or turn off a mod, the game folder returns to its vanilla state.
- **Maintenance Safety**: If a game is in the `Downloading` or `Updating` state, YAGO automatically locks deployment to prevent data corruption.

## 🔄 Toggling and Profiles

- **Global Toggles**: Enable or disable mods with a single click in the UI.
- **Context Awareness**: YAGO knows which character a mod belongs to and ensures logic is correctly merged during deployment.

### Profile Duplication
You can duplicate any existing profile to create variations (e.g., "Safe for Stream" vs "NSFW"). This copies all enabled mods and load order settings.

## 🛠️ Mod Inspector IDE

Every mod in your library can be opened in the **Inspector**, a powerful integrated workspace:

- **Metadata View**: View rich info, author details, and manage custom tags.
- **File Manager**: A built-in tree explorer to navigate mod textures, meshes, and scripts.
- **INI Editor**: A specialized text editor for modifying mod logic directly within YAGO.

---
[Next: Launcher Features](launcher-features.md) | [Documentation Home](../index.md)
