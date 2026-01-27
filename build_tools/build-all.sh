#!/bin/bash

# YAGO Release Build Script
# Builds releases for all supported platforms and package formats

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/utils.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="yago"
VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/')

# Ensure build directories exist
ensure_build_dirs

echo -e "${BLUE}🚀 Building YAGO v$VERSION releases${NC}"
echo "=========================================="

# Function to print status
print_status() {
    echo -e "${BLUE}[$1]${NC} $2"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Build AppImage
build_appimage() {
    print_status "APPIMAGE" "Building AppImage..."
    ./build_tools/build-appimage.sh
}

# Build Flatpak
build_flatpak() {
    print_status "FLATPAK" "Building Flatpak..."
    ./build_tools/build-flatpak.sh
}

# Build DEB package
build_deb() {
    print_status "DEB" "Building DEB package..."
    ./build_tools/build-deb.sh
}

# Build RPM package
build_rpm() {
    print_status "RPM" "Building RPM package..."
    ./build_tools/build-rpm.sh
}

# Build PKGBUILD (Arch Linux)
build_pkgbuild() {
    print_status "PKGBUILD" "Building PKGBUILD package..."
    ./build_tools/build-pkgbuild.sh
}

# Build Windows EXE (cross-compilation)
build_windows() {
    print_status "WINDOWS" "Building Windows EXE..."
    ./build_tools/build-windows.sh
}

# Check if we're on the right platform for each build
check_platform() {
    case "$1" in
        "appimage"|"flatpak"|"deb"|"rpm"|"pkgbuild")
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                return 0
            fi
            ;;
        "windows")
            # Can cross-compile from Linux
            return 0
            ;;
    esac
    return 1
}

# Main build process
main() {
    echo "Building YAGO v$VERSION"
    echo "Platform: $OSTYPE"
    echo ""

    # Build platform-specific packages
    if check_platform "appimage"; then
        build_appimage
    fi

    if check_platform "flatpak"; then
        build_flatpak
    fi

    if check_platform "deb"; then
        build_deb
    fi

    if check_platform "rpm"; then
        build_rpm
    fi

    if check_platform "pkgbuild"; then
        build_pkgbuild
    fi

    if check_platform "windows"; then
        build_windows
    fi

    echo ""
    print_success "Release build completed!"
    echo "Latest builds in: $LATEST_DIR"
    ls -la "$LATEST_DIR"
}

# Run main function
main "$@"
