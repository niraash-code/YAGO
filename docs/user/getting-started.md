# Getting Started with YAGO

This guide will help you install and set up YAGO for the first time.

## 📥 Installation

Choose the installation method that matches your operating system.

### 🐧 Linux

#### Arch Linux (Recommended)
Install the pre-compiled package directly using pacman:
```bash
sudo pacman -U yago-*.pkg.tar.zst
```
*Note: This automatically installs required dependencies like `webkit2gtk`.*

#### Debian / Ubuntu / Mint
Download the `.deb` package and install it:
```bash
sudo apt install ./yago_*.deb
```

#### Fedora / RHEL / OpenSUSE
Download the `.rpm` package and install it:
```bash
sudo dnf install ./yago-*.rpm
```

#### Universal (AppImage)
Ideal for portability. Download the `.AppImage` file, make it executable, and run:
```bash
chmod +x YAGO-x86_64.AppImage
./YAGO-x86_64.AppImage
```

#### Universal (Flatpak)
Install the bundle globally or for your user:
```bash
flatpak install --user yago-*.flatpak
```

---

### 🪟 Windows

1.  Download the **Installer** (`yago-windows-setup.exe`) or the **Portable** zip (`yago-windows-portable.zip`).
2.  **Installer**: Run the `.exe` and follow the on-screen prompts.
3.  **Portable**: Extract the `.zip` anywhere and run `yago.exe`. No installation required.

---

## ⚙️ Initial Setup

1.  Launch YAGO.
2.  Click the **"Add Game"** button in the sidebar.
3.  Choose **"Auto Scan"** to automatically find supported titles, or **"Locate Manually"** to select a specific folder.
4.  **New: Cloud Hub**: You can now browse the **Cloud** tab to find games not yet installed on your system.

### 2. Selective Installation
If you choose a game from the **Cloud Hub**, YAGO will launch the **Install Wizard**:
1.  **Select Path**: Choose an installation directory.
2.  **Selective Content**: Choose which language and audio packs to install. Unchecking optional packs can save up to 40% of disk space.
3.  **Real-time Tracking**: Monitor download speed, percentage, and ETA with a stable backend-calculated progress indicator.

### 3. Dependency Setup
If prompted, YAGO will automatically download required dependencies (Mod Loaders, Proton, etc.). You can manually trigger this in the **Global Settings** menu.

### 2. Importing Mods
1.  Select your game from the sidebar.
2.  Switch to the **Mod Manager** view.
3.  Drag and drop your mod folders or archives (`.zip`, `.7z`) directly onto the window.
4.  YAGO will extract, sanitize, and import them into your library.

### 3. Launching
Click **"Launch Game"** to start playing with your enabled mods. YAGO will automatically handle mod deployment and injection.
[Next: Mod Management](mod-management.md) | [Documentation Home](../index.md)
