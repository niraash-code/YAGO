# Getting Started

This guide will help you install and set up YAGO for the first time.

## Installation

### Linux

**Arch Linux:**
```bash
sudo pacman -U yago-*.pkg.tar.zst
```

**Debian/Ubuntu:**
```bash
sudo apt install ./yago_*.deb
```

**Fedora/RHEL:**
```bash
sudo dnf install ./yago-*.rpm
```

**AppImage:**
```bash
chmod +x YAGO-x86_64.AppImage
./YAGO-x86_64.AppImage
```

### Windows

1. Download the installer or portable zip from the releases page
2. Run the installer, or extract the zip and run `yago.exe`

## Initial Setup

### 1. Adding Your Games

1. Launch YAGO
2. Click "Add Game" in the sidebar
3. Choose "Scan for Games" to auto-detect, or "Locate Manually" to browse
4. YAGO will identify the game and load its metadata

### 2. Importing Mods

1. Select your game from the sidebar
2. Switch to the **Mod Manager** view
3. Drag and drop mod folders or archives (`.zip`, `.7z`) onto the window
4. YAGO will extract, validate, and import them

### 3. Launching

Click "Launch Game" to start with your enabled mods. YAGO handles deployment and injection automatically.

## Supported Games

- **HoYoverse**: Genshin Impact, Honkai: Star Rail, Zenless Zone Zero
- **Wuthering Waves**

More games will be added in the future.

## Next Steps

- [Mod Management](mod-management.md) - Learn about organizing mods
- [Launcher Features](launcher-features.md) - Game launching options
