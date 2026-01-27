#!/bin/bash

# YAGO PKGBUILD Build Script

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/utils.sh"

PROJECT_NAME="yago"
VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/')
BUILD_DIR="$PKGBUILD_BUILD_DIR"
TEMP_BUILD_DIR="$TEMP_BUILD_DIR"

# Ensure build directories exist
ensure_build_dirs

echo -e "${BLUE}Building PKGBUILD package for YAGO v$VERSION${NC}"

# Build base Tauri application first
echo "Building base Tauri application..."
cargo tauri build --no-bundle

# Verify the binary exists
if [ ! -f "target/release/yago" ]; then
    echo -e "${RED}❌ Base Tauri build failed - binary not found${NC}"
    exit 1
fi

# Create build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$TEMP_BUILD_DIR"

# Copy artifacts to build directory
echo "Copying artifacts..."
cp "target/release/yago" "$BUILD_DIR/"
cp "src-tauri/icons/icon.png" "$BUILD_DIR/"
cp "README.md" "$BUILD_DIR/"

# Create desktop file
cat > "$BUILD_DIR/yago.desktop" << EOF
[Desktop Entry]
Name=YAGO
Comment=Yet Another Game Organizer for 3DMigoto ecosystem
Exec=yago
Icon=yago
Terminal=false
Type=Application
Categories=Game;Utility;
StartupWMClass=yago
EOF

# Generate PKGBUILD
# Note: We are packaging the pre-built binary (bin package style)
cat > "$BUILD_DIR/PKGBUILD" << EOF
# Maintainer: YAGO Team <info@yago.dev>
pkgname=yago
pkgver=$VERSION
pkgrel=1
pkgdesc="Yet Another Game Organizer for 3DMigoto ecosystem"
arch=('x86_64')
url="https://github.com/your-org/yago"
license=('MIT')
depends=(
    'gtk3'
    'webkit2gtk'
    'glib2'
    'cairo'
    'pango'
    'atk'
    'gdk-pixbuf2'
    'glibc'
    'gcc-libs'
)
makedepends=()
source=("yago" "yago.desktop" "icon.png" "README.md")
sha256sums=('SKIP' 'SKIP' 'SKIP' 'SKIP')

package() {
    # Install binary
    install -Dm755 "yago" "\$pkgdir/usr/bin/yago"

    # Install desktop file
    install -Dm644 "yago.desktop" "\$pkgdir/usr/share/applications/yago.desktop"

    # Install icon
    install -Dm644 "icon.png" "\$pkgdir/usr/share/icons/hicolor/256x256/apps/yago.png"

    # Install documentation
    install -Dm644 "README.md" "\$pkgdir/usr/share/doc/\$pkgname/README.md"
}
EOF

# Build package
echo "Building PKGBUILD package..."
cd "$BUILD_DIR"
makepkg -f

# Move package to temp directory first, then organize
mv *.pkg.tar.zst "$PROJECT_ROOT/$TEMP_BUILD_DIR/" 2>/dev/null || true

# Organize the build
PKG_FILE=$(ls "$PROJECT_ROOT/$TEMP_BUILD_DIR"/*.pkg.tar.zst 2>/dev/null | head -1)
if [ -f "$PKG_FILE" ]; then
    # Go back to project root to run organize_build correctly if it relies on relative paths or vars
    cd "$PROJECT_ROOT"
    organize_build "pkgbuild" "$PKG_FILE"
fi

# Clean up temporary build artifacts while preserving caches
echo "Cleaning up temporary build artifacts..."
rm -rf "$TEMP_BUILD_DIR"
rm -rf "$BUILD_DIR"  # PKGBUILD build directory can be recreated

# Note: Preserving build caches:
# - target/release/ (Rust build artifacts for incremental builds)
