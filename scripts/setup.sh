#!/bin/bash

# YAGO Setup Script
# This script sets up the development environment for YAGO

set -e

# Error handling
trap 'echo -e "\n\033[0;31m❌ Setup failed or interrupted at step: $CURRENT_STEP\033[0m"; exit 1' ERR SIGINT

# Utilities
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'
CURRENT_STEP=""

step() {
    CURRENT_STEP="$1"
    echo -e "\n${BLUE}👉 $1${NC}"
}

echo "🚀 Setting up YAGO development environment..."

# Check for Rust
step "Checking Rust installation"
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust from https://rustup.rs/"
    exit 1
fi
echo "✅ Rust is installed"

# Update Rust
step "Updating Rust toolchain"
rustup update

# Install Tauri CLI
step "Installing Tauri CLI"
if ! command -v cargo-tauri &> /dev/null; then
    cargo install tauri-cli
else
    echo "✅ Tauri CLI is already installed"
fi

# Check for Node.js
step "Checking Node.js version"
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18+"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if ! [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to v18+"
    exit 1
fi
echo "✅ Node.js $NODE_VERSION is installed"

# Install System Development Dependencies
step "Installing system development dependencies"
echo "   Required for 'cargo tauri dev' (GTK, WebKit, etc.)"

if command -v pacman &> /dev/null; then
    echo "Detected Arch Linux - installing dev dependencies..."
    # Based on README.md + Standard Tauri requirements
    sudo pacman -S --needed --noconfirm \
        gtk3 \
        gtk4 \
        webkit2gtk \
        base-devel \
        curl \
        wget \
        file \
        openssl \
        appmenu-gtk-module \
        libappindicator-gtk3 \
        librsvg
elif command -v apt &> /dev/null; then
    echo "Detected Debian/Ubuntu - installing dev dependencies..."
    sudo apt update
    # Standard Tauri build requirements (-dev packages)
    sudo apt install -y \
        build-essential \
        libssl-dev \
        libgtk-3-dev \
        libwebkit2gtk-4.1-dev \
        libayatana-appindicator3-dev \
        librsvg2-dev
else
    echo "⚠️  Unknown package manager. Please ensure you have GTK3/4 and WebKit2GTK installed manually."
fi


# Install release build dependencies (optional)
step "Installing release build tools (Optional)"

if command -v pacman &> /dev/null; then
    echo "Detected Arch Linux - installing release tools..."
    sudo pacman -S --needed --noconfirm \
        flatpak-builder \
        dpkg \
        rpm-tools \
        mingw-w64-gcc \
        || echo "⚠️  Some release tools could not be installed"

    # Try to install linuxdeploy (preferred for AppImage)
    if ! command -v linuxdeploy &> /dev/null; then
        echo "Installing linuxdeploy for AppImage building..."
        if command -v yay &> /dev/null; then
            yay -S linuxdeploy-appimage --noconfirm || echo "⚠️  linuxdeploy installation failed"
        else
            echo "ℹ️  Install linuxdeploy with: yay -S linuxdeploy-appimage"
        fi
    fi

    # Fallback to appimage-builder if linuxdeploy failed
    if ! command -v linuxdeploy &> /dev/null && ! command -v appimage-builder &> /dev/null; then
        sudo pacman -S --needed --noconfirm appimage-builder || echo "⚠️  appimage-builder installation failed"
    fi

elif command -v apt &> /dev/null; then
    echo "Detected Debian/Ubuntu - installing release tools..."
    sudo apt install -y \
        flatpak-builder \
        dpkg-dev \
        rpm \
        gcc-mingw-w64-x86-64 \
        || echo "⚠️  Some release tools could not be installed"

    # Install appimage-builder for Ubuntu/Debian
    if ! command -v appimage-builder &> /dev/null; then
        echo "Installing appimage-builder..."
        if wget -q -O /tmp/appimage-builder.deb \
            https://github.com/AppImageCrafters/appimage-builder/releases/download/v1.1.0/appimage-builder_1.1.0_amd64.deb; then
            if sudo dpkg -i /tmp/appimage-builder.deb; then
                sudo apt install -f -y
                echo "✅ appimage-builder installed successfully"
            else
                echo "⚠️  Failed to install appimage-builder package"
                rm -f /tmp/appimage-builder.deb
            fi
        else
            echo "⚠️  Failed to download appimage-builder"
        fi
    fi
fi

# Install root dependencies
if [ -f "package.json" ]; then
    step "Installing root NPM dependencies"
    npm install
else
    echo -e "\n${YELLOW}⚠️  Root package.json not found. Skipping root npm install.${NC}"
fi

# Install frontend dependencies
step "Installing frontend NPM dependencies"
cd src-ui
npm install
cd ..

# Optional: Setup build containers
step "Checking build containers"
echo "   Required for building compatible DEB (Debian/Ubuntu) and RPM (Fedora) packages."
if command -v distrobox &> /dev/null; then
    read -p "   Do you want to setup build containers (yago-deb, yago-rpm)? [y/N] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./build_tools/setup-build-containers.sh
    else
        echo "   Skipping container setup."
    fi
else
    echo "   Distrobox not found. Install distrobox to enable compatible package builds."
fi

# Optional: Setup Wine Environment
step "Checking Wine Environment"
echo "   Required for testing Windows builds on Linux."
if command -v wine &> /dev/null; then
    read -p "   Do you want to setup the Wine test environment? [y/N] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./release/scripts/setup-wine-env.sh
    else
        echo "   Skipping Wine setup."
    fi
else
    echo "   Wine not found. Install Wine to enable Windows build testing."
fi

# Clear error trap for success
trap - ERR SIGINT
echo -e "\n${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "🚀 YAGO Development:"
echo "  cargo tauri dev                    # Start development mode"
echo "  GDK_BACKEND=wayland cargo tauri dev  # For KDE Plasma Wayland"
echo ""
echo "📦 Release Building:"
echo "  make release-all                  # Build all release packages"
echo "  make release-appimage             # Build AppImage only"
echo "  make release-flatpak              # Build Flatpak only"
echo "  make release-deb                  # Build DEB only"
echo "  make release-rpm                  # Build RPM only"
echo "  make release-pkgbuild             # Build PKGBUILD only"
echo "  make release-windows              # Build Windows EXE"
echo ""
echo "🧹 Release Management:"
echo "  make release-list                 # List all builds"
echo "  make release-cleanup              # Clean up old builds"
echo ""
echo "📖 For detailed release instructions, see: release/README.md"
echo ""
echo "Happy modding! 🎮"