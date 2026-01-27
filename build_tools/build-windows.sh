#!/bin/bash

# YAGO Windows Build Script (Cross-compilation)

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/utils.sh"

PROJECT_NAME="yago"
VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/')
BUILD_DIR="$WINDOWS_BUILD_DIR"
SETUP_OUTPUT_DIR="$LATEST_DIR"
PORTABLE_OUTPUT_DIR="$LATEST_DIR"
TEMP_PORTABLE_DIR="$TEMP_BUILD_DIR"

# Ensure build directories exist
ensure_build_dirs

echo -e "${BLUE}Building Windows EXE for YAGO v$VERSION${NC}"

# Clear previous Windows builds from latest directory
rm -f "$SETUP_OUTPUT_DIR/yago-$VERSION-windows-setup.exe"
rm -f "$PORTABLE_OUTPUT_DIR/yago-$VERSION-windows-portable.zip"

# Check if mingw-w64 is available
if ! command -v x86_64-w64-mingw32-gcc &> /dev/null; then
    echo -e "${YELLOW}⚠️  mingw-w64 not found. Installing...${NC}"

    # Try to install mingw-w64 (works on Ubuntu/Debian/Arch)
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y gcc-mingw-w64-x86-64
    elif command -v pacman &> /dev/null; then
        sudo pacman -S --noconfirm mingw-w64-gcc
    else
        echo -e "${RED}❌ Please install mingw-w64 manually${NC}"
        echo "Ubuntu/Debian: sudo apt install gcc-mingw-w64-x86-64"
        echo "Arch Linux: sudo pacman -S mingw-w64-gcc"
        echo "Fedora: sudo dnf install mingw64-gcc"
        exit 1
    fi
fi

# Set up cross-compilation environment
export CC=x86_64-w64-mingw32-gcc
export CXX=x86_64-w64-mingw32-g++
export AR=x86_64-w64-mingw32-ar
export RANLIB=x86_64-w64-mingw32-ranlib


# Configure cargo for Windows target
rustup target add x86_64-pc-windows-gnu


# Function to build the NSIS installer
build_setup_exe() {
    echo -e "${BLUE}Building NSIS Installer for Windows...${NC}"
    cargo tauri build --target x86_64-pc-windows-gnu

    # Verify NSIS build was successful
    SETUP_FILE_SRC="target/x86_64-pc-windows-gnu/release/bundle/nsis/yago_${VERSION}_x64-setup.exe"
    if [ -f "$SETUP_FILE_SRC" ]; then
        mkdir -p "$BUILD_DIR"
        cp "$SETUP_FILE_SRC" "$BUILD_DIR/yago-$VERSION-windows-setup.exe"
        echo -e "${GREEN}✓ NSIS Installer built: $BUILD_DIR/yago-$VERSION-windows-setup.exe${NC}"
    else
        echo -e "${RED}❌ NSIS Installer build failed: $SETUP_FILE_SRC not found${NC}"
        exit 1
    fi
}

# Function to build the portable executable and zip it
build_portable_zip() {
    echo -e "${BLUE}Building Portable Executable for Windows...${NC}"
    cargo tauri build --target x86_64-pc-windows-gnu --no-bundle

    # Verify Portable build was successful
    PORTABLE_EXE="target/x86_64-pc-windows-gnu/release/yago.exe"
    if [ -f "$PORTABLE_EXE" ]; then
        mkdir -p "$TEMP_PORTABLE_DIR"
        cp "$PORTABLE_EXE" "$TEMP_PORTABLE_DIR/"

        # Copy necessary DLLs for portability
        find "target/x86_64-pc-windows-gnu/release/" -maxdepth 1 -name "*.dll" -exec cp {} "$TEMP_PORTABLE_DIR/" \;

        # Create zip archive
        mkdir -p "$BUILD_DIR"
        ZIP_FILE="$PROJECT_ROOT/$BUILD_DIR/yago-$VERSION-windows-portable.zip"
        # Use absolute path for zip creation to avoid directory confusion
        (cd "$TEMP_PORTABLE_DIR" && zip -r "$ZIP_FILE" *)
        echo -e "${GREEN}✓ Portable Executable built: $ZIP_FILE${NC}"
    else
        echo -e "${RED}❌ Portable Executable build failed: $PORTABLE_EXE not found${NC}"
        exit 1
    fi

    # Clean up temp directory
    rm -rf "$TEMP_PORTABLE_DIR"
}

# Call the functions to perform the builds
build_setup_exe
build_portable_zip

# Organize the builds (after successful builds)
echo -e "${BLUE}Organizing Windows builds...${NC}"

# Go back to project root to run organize_build correctly
cd "$PROJECT_ROOT"

# Organize setup exe
# Use PROJECT_ROOT to ensure we find the file created in the previous step
SETUP_FILE="$PROJECT_ROOT/$BUILD_DIR/yago-$VERSION-windows-setup.exe"
if [ -f "$SETUP_FILE" ]; then
    organize_build "windows" "$SETUP_FILE"
fi

# Organize portable zip
PORTABLE_FILE="$PROJECT_ROOT/$BUILD_DIR/yago-$VERSION-windows-portable.zip"
if [ -f "$PORTABLE_FILE" ]; then
    organize_build "windows" "$PORTABLE_FILE"
fi
