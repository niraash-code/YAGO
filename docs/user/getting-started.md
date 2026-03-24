# Getting Started

This guide covers installation and initial setup.

## Supported Games

- **HoYoverse**: Genshin Impact, Honkai: Star Rail, Zenless Zone Zero
- **Wuthering Waves**

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

1. Download the installer or portable zip from releases
2. Run the installer, or extract and run `yago.exe`

## Initial Setup

### 1. Add Your Games

1. Launch YAGO
2. Click **"Add Game"** in the sidebar
3. Choose **"Scan for Games"** to auto-detect, or **"Locate Manually"** to browse
4. YAGO will identify the game and load its metadata

### 2. Import Mods

1. Select your game from the sidebar
2. Switch to the **Mod Manager** view
3. Drag and drop mod folders or archives (`.zip`, `.7z`) onto the window
4. YAGO will extract, validate, and import them

### 3. Launch

Click **"Launch Game"** to start with your enabled mods. YAGO handles deployment and injection automatically.

## Next Steps

- [Mod Management](mod-management.md) - Organizing your mods
- [Launcher Features](launcher-features.md) - Game launching options
