# Mod Management

YAGO uses a Virtual File System (VFS) to manage mods safely.

## Library System

When you add a mod, it goes into a central **Library**:

- **Atomic Import**: Validates mod files before importing
- **Organization**: Mods are stored by game with unique UUIDs
- **No Conflicts**: No naming conflicts between mods

## Zero-Copy Deployment

YAGO uses **Symlinks** (Linux) and **Junctions** (Windows) to deploy mods:

- **Instant**: Toggling mods takes effect immediately
- **Safe**: No files are copied into your game folder
- **Clean**: Disabling mods returns the game to vanilla state

## Profiles

- **Multiple Profiles**: Create different mod configurations per game
- **Quick Switching**: Change between profiles instantly
- **Profile Duplication**: Clone profiles for variations (e.g., "Streaming" vs "Personal")

## Mod Inspector

Every mod has an integrated Inspector:

- **Metadata View**: Info, author details, and tags
- **File Browser**: Navigate textures, meshes, and scripts
- **INI Editor**: Edit mod logic directly within YAGO

## Importing Mods

YAGO accepts:
- `.zip` archives
- `.7z` archives
- Loose folders

Drag and drop onto the Mod Manager window to import.
