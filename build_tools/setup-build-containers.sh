#!/bin/bash

# YAGO Build Container Setup Script
# Sets up Distrobox containers for building compatible DEB and RPM packages

set -e

# Error handling
trap 'echo -e "\n\033[0;31m❌ Container setup failed or interrupted at step: $CURRENT_STEP\033[0m"; exit 1' ERR SIGINT

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh" 2>/dev/null || true

# Colors (if utils.sh failed)
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
CURRENT_STEP=""

step() {
    CURRENT_STEP="$1"
    echo -e "\n${BLUE}👉 $1${NC}"
}

echo -e "${BLUE}🐳 Setting up YAGO build containers...${NC}"

step "Checking Distrobox installation"
if ! command -v distrobox &> /dev/null; then
    echo -e "${RED}❌ Distrobox is not installed. Please install it first.${NC}"
    exit 1
fi

setup_deb_container() {
    local NAME="yago-deb"
    local IMAGE="debian:bookworm"
    
    step "Setting up Debian container ($NAME)"
    
    if distrobox list --no-color | grep -q "\b$NAME\b"; then
        echo "   ✅ Container $NAME already exists."
    else
        echo "   Creating container $NAME from $IMAGE..."
        distrobox create -n "$NAME" -i "$IMAGE" -Y
    fi
    
    step "Installing dependencies in $NAME"
    # Check for sudo access first
    if distrobox-enter -n "$NAME" -- sudo -n true 2>/dev/null; then
        distrobox-enter -n "$NAME" -- sudo apt-get update
        distrobox-enter -n "$NAME" -- sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
        distrobox-enter -n "$NAME" -- sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
            build-essential \
            libgtk-3-dev \
            libwebkit2gtk-4.1-dev \
            libappindicator3-dev \
            librsvg2-dev \
            libssl-dev \
            libsoup-3.0-dev \
            pkg-config \
            curl \
            wget \
            git
    else
        echo -e "${YELLOW}⚠️  Sudo not available in $NAME. Skipping apt install.${NC}"
    fi

    step "Checking Rust in $NAME"
    if ! distrobox-enter -n "$NAME" -- command -v cargo &> /dev/null && \
       ! distrobox-enter -n "$NAME" -- test -f "$HOME/.cargo/bin/cargo"; then
        echo "   Installing Rust..."
        distrobox-enter -n "$NAME" -- bash -c "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
    else
        echo "   ✅ Rust is already installed."
    fi
    
    echo -e "${GREEN}✅ Debian container ready.${NC}"
}

setup_rpm_container() {
    local NAME="yago-rpm"
    local IMAGE="fedora:39"

    step "Setting up Fedora/RPM container ($NAME)"

    if distrobox list --no-color | grep -q "\b$NAME\b"; then
        echo "   ✅ Container $NAME already exists."
    else
        echo "   Creating container $NAME from $IMAGE..."
        distrobox create -n "$NAME" -i "$IMAGE" -Y
    fi

    step "Installing dependencies in $NAME"
    if distrobox-enter -n "$NAME" -- sudo -n true 2>/dev/null; then
        distrobox-enter -n "$NAME" -- sudo dnf upgrade -y
        distrobox-enter -n "$NAME" -- sudo dnf install -y \
            gcc \
            gtk3-devel \
            webkit2gtk4.1-devel \
            openssl-devel \
            libappindicator-gtk3-devel \
            librsvg2-devel \
            libsoup3-devel \
            pkg-config \
            curl \
            wget \
            git \
            rpm-build
    else
         echo -e "${YELLOW}⚠️  Sudo not available in $NAME. Skipping dnf install.${NC}"
    fi

    step "Checking Rust in $NAME"
    if ! distrobox-enter -n "$NAME" -- command -v cargo &> /dev/null && \
       ! distrobox-enter -n "$NAME" -- test -f "$HOME/.cargo/bin/cargo"; then
        echo "   Installing Rust..."
        distrobox-enter -n "$NAME" -- bash -c "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
    else
        echo "   ✅ Rust is already installed."
    fi

    echo -e "${GREEN}✅ RPM container ready.${NC}"
}

setup_arch_container() {
    local NAME="yago-arch"
    local IMAGE="archlinux:latest"

    step "Setting up Arch Linux container ($NAME)"

    if distrobox list --no-color | grep -q "\b$NAME\b"; then
        echo "   ✅ Container $NAME already exists."
    else
        echo "   Creating container $NAME from $IMAGE..."
        distrobox create -n "$NAME" -i "$IMAGE" -Y
    fi

    step "Installing dependencies in $NAME"
    if distrobox-enter -n "$NAME" -- sudo -n true 2>/dev/null; then
        distrobox-enter -n "$NAME" -- sudo pacman -Syu --noconfirm
        distrobox-enter -n "$NAME" -- sudo pacman -S --noconfirm \
            gcc \
            gtk3 \
            webkit2gtk-4.1 \
            glib2 \
            cairo \
            pango \
            atk \
            gdk-pixbuf2 \
            glibc \
            gcc-libs \
            openssl \
            libappindicator-gtk3 \
            librsvg \
            libsoup3 \
            pkg-config \
            curl \
            wget \
            git \
            pacman-contrib
    else
        echo -e "${YELLOW}⚠️  Sudo not available in $NAME. Skipping pacman install.${NC}"
    fi

    step "Checking Rust in $NAME"
    if ! distrobox-enter -n "$NAME" -- command -v cargo &> /dev/null && \
       ! distrobox-enter -n "$NAME" -- test -f "$HOME/.cargo/bin/cargo"; then
        echo "   Installing Rust..."
        distrobox-enter -n "$NAME" -- bash -c "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
    else
        echo "   ✅ Rust is already installed."
    fi

    echo -e "${GREEN}✅ Arch Linux container ready.${NC}"
}

# Run setup
setup_deb_container
setup_rpm_container
setup_arch_container

# Clear trap
trap - ERR SIGINT
echo -e "\n${GREEN}🎉 Build containers setup complete!${NC}"
