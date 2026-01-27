#!/bin/bash

# YAGO AppImage Build Script

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

PROJECT_NAME="yago"
VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/')
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Make build paths absolute
BUILD_ROOT="$PROJECT_ROOT/$RELEASE_DIR/build"
TEMP_BUILD_DIR="$BUILD_ROOT/temp"
APPIMAGE_BUILD_DIR="$BUILD_ROOT/appimage"
FLATPAK_BUILD_DIR="$BUILD_ROOT/flatpak"
DEB_BUILD_DIR="$BUILD_ROOT/deb"
RPM_BUILD_DIR="$BUILD_ROOT/rpm"
PKGBUILD_BUILD_DIR="$BUILD_ROOT/pkgbuild"
WINDOWS_BUILD_DIR="$BUILD_ROOT/windows"

BUILD_DIR="$APPIMAGE_BUILD_DIR"
APP_DIR="$APPIMAGE_BUILD_DIR/AppDir"

# Ensure build directories exist
ensure_build_dirs

echo -e "${BLUE}Building AppImage for YAGO v$VERSION${NC}"

# Build frontend first
echo "Building frontend..."
cd "$PROJECT_ROOT/src-ui"
npm install --include=dev
npm run build
cd "$PROJECT_ROOT"

# Build base Tauri application first (disable bundling to avoid conflicts)
echo "Building base Tauri application..."
cargo build --release --features custom-protocol

# Verify the binary exists
if [ ! -f "target/release/yago" ]; then
    echo -e "${RED}❌ Base Tauri build failed - binary not found${NC}"
    exit 1
fi

# Create build directory
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/usr/bin" "$APP_DIR/usr/share/applications" "$APP_DIR/usr/share/icons/hicolor/256x256/apps" "$TEMP_BUILD_DIR"

# Copy binary
cp "target/release/yago" "$APP_DIR/usr/bin/"

# Copy frontend assets
if [ -d "src-ui/dist" ]; then
    # For bundled Tauri, copy assets to a simple location
    mkdir -p "$APP_DIR/assets"
    cp -r "src-ui/dist"/* "$APP_DIR/assets/"
    echo "✅ Frontend assets copied to AppDir/assets/"
else
    echo "❌ Frontend assets not found in src-ui/dist"
    exit 1
fi

# Create desktop file (both in standard location and AppDir root for linuxdeploy)
cat > "$APP_DIR/usr/share/applications/yago.desktop" << EOF
[Desktop Entry]
Name=YAGO
Exec=yago
Icon=yago
Type=Application
Categories=Game;
Comment=Yet Another Game Organizer for 3DMigoto ecosystem
EOF

# Also create in AppDir root for linuxdeploy (with correct name)
rm -f "$APP_DIR/yago.desktop"
cp "$APP_DIR/usr/share/applications/yago.desktop" "$APP_DIR/yago.desktop"

# Copy icon (create a simple one if not exists)
if [ -f "src-tauri/icons/icon.png" ]; then
    cp "src-tauri/icons/icon.png" "$APP_DIR/usr/share/icons/hicolor/256x256/apps/yago.png"
    # Also copy to AppDir root for linuxdeploy BEFORE it runs
    rm -f "$APP_DIR/yago.png"
    cp "src-tauri/icons/icon.png" "$APP_DIR/yago.png"
    echo "✅ Using existing icon from src-tauri/icons/icon.png"
else
    # Create a simple placeholder icon (1x1 transparent PNG)
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > "$APP_DIR/usr/share/icons/hicolor/256x256/apps/yago.png" 2>/dev/null || echo "⚠️  Failed to create icon file"
    # Also create in AppDir root for linuxdeploy BEFORE it runs
    rm -f "$APP_DIR/yago.png"
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > "$APP_DIR/yago.png" 2>/dev/null || echo "⚠️  Failed to create root icon file"
    echo "⚠️  Using placeholder icon (no src-tauri/icons/icon.png found)"
fi

# Create AppRun script
cat > "$APP_DIR/AppRun" << 'EOF'
#!/bin/bash
HERE="$(dirname "$(readlink -f "${0}")")"
export PATH="${HERE}/usr/bin/:${PATH}"
export LD_LIBRARY_PATH="${HERE}/usr/lib/:${LD_LIBRARY_PATH}"
export XDG_DATA_DIRS="${HERE}/usr/share/:${XDG_DATA_DIRS}"
export GDK_PIXBUF_MODULE_FILE="${HERE}/usr/lib/gdk-pixbuf-2.0/loaders.cache"
export GSETTINGS_SCHEMA_DIR="${HERE}/usr/share/glib-2.0/schemas/"
# Fix for WebKitGTK/GDK OpenGL crash in AppImages
export WEBKIT_DISABLE_DMABUF_RENDERER=1

# Filter out noisy GTK warnings and resulting empty lines
exec "${HERE}/usr/bin/yago" "$@" 2> >(sed -u '/Gtk-CRITICAL/d; /^\s*$/d' >&2)
EOF
chmod +x "$APP_DIR/AppRun"

# Copy the canonical appimage-builder.yml recipe to the build directory
cp "$BUILD_TOOLS_DIR/appimage-builder.yml" "$BUILD_DIR/appimage-builder.yml"

# Build AppImage
echo "Building AppImage..."
cd "$BUILD_DIR"

# Check for available AppImage tools
USE_APPIMAGE_BUILDER=false
USE_LINUXDEPLOY=false

if command -v linuxdeploy &> /dev/null; then
    USE_LINUXDEPLOY=true
    echo "Using linuxdeploy for AppImage creation"
elif command -v appimage-builder &> /dev/null; then
    USE_APPIMAGE_BUILDER=true
    echo "Using appimage-builder for AppImage creation"
else
    echo -e "${YELLOW}⚠️  No AppImage building tool found${NC}"
    echo ""
    echo "Install one of the following tools:"
    echo ""
    if command -v pacman &> /dev/null; then
        echo "Arch Linux:"
        echo "  yay -S linuxdeploy-appimage    # Recommended"
        echo "  sudo pacman -S appimage-builder"
    elif command -v apt &> /dev/null; then
        echo "Ubuntu/Debian:"
        echo "  # linuxdeploy (manual installation):"
        echo "  wget https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage"
        echo "  chmod +x linuxdeploy-x86_64.AppImage && sudo mv linuxdeploy-x86_64.AppImage /usr/local/bin/linuxdeploy"
        echo "  # appimage-builder:"
        echo "  wget -O appimage-builder.deb https://github.com/AppImageCrafters/appimage-builder/releases/download/v1.1.0/appimage-builder_1.1.0_amd64.deb"
        echo "  sudo dpkg -i appimage-builder.deb && sudo apt install -f"
    else
        echo "Manual installation:"
        echo "  linuxdeploy: https://github.com/linuxdeploy/linuxdeploy/releases"
        echo "  appimage-builder: https://github.com/AppImageCrafters/appimage-builder/releases"
    fi
    echo ""
    echo -e "${RED}❌ Cannot build AppImage without a building tool${NC}"
    exit 1
fi

# Build with the available tool
if [ "$USE_LINUXDEPLOY" = true ]; then
    # linuxdeploy recreates the AppDir structure, so we need to copy files after it creates the structure
    # First, let linuxdeploy create the basic structure and deploy dependencies (without appimage output)
    linuxdeploy --appdir "$APP_DIR" 2>/dev/null || true

    # Now restore our files into the structure linuxdeploy created
    # (linuxdeploy overwrote the structure, so we need to restore our files)
    cp "../../../target/release/yago" "$APP_DIR/usr/bin/"

    # Restore icon to standard location after linuxdeploy recreated structure
    if [ -f "../../../src-tauri/icons/icon.png" ]; then
        cp "../../../src-tauri/icons/icon.png" "$APP_DIR/usr/share/icons/hicolor/256x256/apps/yago.png"
    fi

    # Recreate desktop file in AppDir root since linuxdeploy overwrote the structure
    cat > "$APP_DIR/yago.desktop" << EOF
[Desktop Entry]
Name=YAGO
Exec=yago
Icon=yago
Type=Application
Categories=Game;
Comment=Yet Another Game Organizer for 3DMigoto ecosystem
EOF

    # Copy icon to AppDir root
    cp "$APP_DIR/usr/share/icons/hicolor/256x256/apps/yago.png" "$APP_DIR/" 2>/dev/null || true

    # Manually create the AppImage using our working appimagetool
    "$PROJECT_ROOT/$BUILD_TOOLS_DIR/appimagetool-x86_64.AppImage" "$APP_DIR"

elif [ "$USE_APPIMAGE_BUILDER" = true ]; then
    # Use appimage-builder
    appimage-builder --recipe appimage-builder.yml
fi

# Move to temp directory first, then organize
mkdir -p "$TEMP_BUILD_DIR"
mv *.AppImage "$TEMP_BUILD_DIR/"

# Go back to project root to run organize_build correctly
cd "$PROJECT_ROOT"

# Organize the build
APPIMAGE_FILE=$(ls "$TEMP_BUILD_DIR"/*.AppImage | head -1)
if [ -f "$APPIMAGE_FILE" ]; then
    organize_build "appimage" "$APPIMAGE_FILE"
fi

# Clean up temporary build artifacts while preserving caches
echo "Cleaning up temporary build artifacts..."
rm -rf "$TEMP_BUILD_DIR"
rm -rf "$APP_DIR"
rm -f "$BUILD_DIR/appimage-builder.yml"  # Copied file, not needed after build

# Note: Preserving build caches:
# - target/release/ (Rust build artifacts for incremental builds)
# - src-ui/dist/ (frontend build for incremental builds)
# - npm cache (in node_modules/.cache or global cache)
# - cargo registry/cache (for dependency reuse)
