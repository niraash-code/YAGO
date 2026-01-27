#!/bin/bash

# YAGO Flatpak Build Script

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

PROJECT_NAME="yago"
VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/')
APP_ID="com.yago.GameOrganizer"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$FLATPAK_BUILD_DIR"
TEMP_BUILD_DIR="$TEMP_BUILD_DIR"

# Ensure build directories exist
ensure_build_dirs

echo -e "${BLUE}Building Flatpak for YAGO v$VERSION${NC}"

# Check for Flatpak SDK and Platform
echo "Checking for Flatpak runtime..."
if ! flatpak info org.gnome.Sdk//49 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  org.gnome.Sdk//49 not found. Installing...${NC}"
    flatpak install --user -y flathub org.gnome.Sdk//49 || echo -e "${RED}❌ Failed to install SDK${NC}"
fi

if ! flatpak info org.gnome.Platform//49 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  org.gnome.Platform//49 not found. Installing...${NC}"
    flatpak install --user -y flathub org.gnome.Platform//49 || echo -e "${RED}❌ Failed to install Platform${NC}"
fi

# Build base Tauri application first
echo "Building base Tauri application..."
# Check if cargo tauri is available, otherwise use cargo build
if command -v cargo-tauri &> /dev/null; then
    cargo tauri build --no-bundle
else
    # Fallback to cargo build if cargo-tauri is not in path (though it should be for tauri projects)
    # But wait, the user output shows 'Running beforeBuildCommand ... npm run build' which means 'cargo tauri build' was likely used or 'tauri build'.
    # The previous script had 'cargo tauri build --no-bundle'.
    # I'll stick to that but ensure we are in the right dir.
    cargo tauri build --no-bundle
fi

# Verify the binary exists
if [ ! -f "target/release/yago" ]; then
    echo -e "${RED}❌ Base Tauri build failed - binary not found${NC}"
    exit 1
fi

# Create build directory
mkdir -p "$BUILD_DIR" "$TEMP_BUILD_DIR"

# Generate Flatpak manifest
cat > "$BUILD_DIR/$APP_ID.yml" << EOF
app-id: $APP_ID
runtime: org.gnome.Platform
runtime-version: '49'
sdk: org.gnome.Sdk
command: yago

finish-args:
  - --share=network
  - --share=ipc
  - --socket=x11
  - --socket=wayland
  - --device=dri
  - --filesystem=host
  - --filesystem=~/.config/yago:create
  - --filesystem=~/.local/share/yago:create

modules:
  - name: yago
    buildsystem: simple
    build-commands:
      - mkdir -p /app/bin
      - cp yago /app/bin/
      - chmod +x /app/bin/yago
    sources:
      - type: file
        path: $PROJECT_ROOT/target/release/yago
        dest-filename: yago
EOF

# Build Flatpak
echo "Building Flatpak bundle..."
# Ensure repo directory exists or is initialized
if [ ! -d "$BUILD_DIR/repo" ]; then
    ostree init --mode=archive-z2 --repo="$BUILD_DIR/repo"
fi

flatpak-builder --force-clean --ccache --state-dir="$BUILD_DIR/.flatpak-builder" --repo="$BUILD_DIR/repo" "$BUILD_DIR/build" "$BUILD_DIR/$APP_ID.yml"

# Create single-file bundle in temp directory first
echo "Creating single-file bundle..."
flatpak build-bundle "$BUILD_DIR/repo" "$PROJECT_ROOT/$TEMP_BUILD_DIR/yago-$VERSION.flatpak" $APP_ID

# Go back to project root to run organize_build correctly
cd "$PROJECT_ROOT"

# Organize the build
organize_build "flatpak" "$TEMP_BUILD_DIR/yago-$VERSION.flatpak"

# Clean up temporary build artifacts while preserving caches
echo "Cleaning up temporary build artifacts..."
rm -rf "$TEMP_BUILD_DIR"
rm -rf "$BUILD_DIR/build"  # Build directory can be recreated
rm -f "$BUILD_DIR/$APP_ID.yml"  # Manifest can be regenerated

# Note: Preserving build caches:
# - target/release/ (Rust build artifacts for incremental builds)
# - $BUILD_DIR/.flatpak-builder/ (Flatpak build cache/state for incremental builds)
# - $BUILD_DIR/repo/ (Flatpak repository for incremental builds)
