#!/bin/bash

# YAGO DEB Build Script

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

PROJECT_NAME="yago"
VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/')
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$DEB_BUILD_DIR"
TEMP_BUILD_DIR="$TEMP_BUILD_DIR"
DEB_DIR="$DEB_BUILD_DIR/yago-$VERSION"

# Ensure build directories exist
ensure_build_dirs

echo -e "${BLUE}Building DEB package for YAGO v$VERSION${NC}"

# Build frontend first
echo "Building frontend..."
cd "$PROJECT_ROOT/src-ui"
npm install --include=dev
npm run build
cd "$PROJECT_ROOT"

# Build base Tauri application first
echo "Building base Tauri application..."

# Function to build on host
build_on_host() {
    echo "🏗️  Building on host..."
    if command -v cargo-tauri &> /dev/null; then
        cargo tauri build --no-bundle
    else
        cargo build --release --features custom-protocol
    fi
}

# Try to build in container for better compatibility (Debian Stable glibc)
if command -v distrobox &> /dev/null && distrobox list --no-color | grep -q "\byago-deb\b"; then
    echo -e "${YELLOW}⚠️  Detected 'yago-deb' container. Attempting to build inside it for GLIBC compatibility...${NC}"
    
    # Check if cargo is available (in path or ~/.cargo/bin)
    if ! distrobox-enter -n yago-deb -- command -v cargo &> /dev/null && \
       ! distrobox-enter -n yago-deb -- test -f "$HOME/.cargo/bin/cargo"; then
        echo -e "${RED}❌ Cargo not found in 'yago-deb'.${NC}"
        echo -e "${YELLOW}👉 Please run './build_tools/setup-build-containers.sh' to setup the build environment.${NC}"
        echo "Falling back to host build (may have GLIBC issues)..."
        build_on_host
    else
        echo "✅ Cargo found in container. Starting containerized build..."
    
        # Use explicit path source to ensure cargo is found
        # Use separate target directory to avoid GLIBC mismatch with host artifacts
        CONTAINER_TARGET="$BUILD_DIR/target"
        CONTAINER_CMD="export PATH=\$HOME/.cargo/bin:\$PATH && cd '$PROJECT_ROOT' && CARGO_TARGET_DIR='$CONTAINER_TARGET' cargo build --release --features custom-protocol"
        
        if distrobox-enter -n yago-deb -- bash -c "$CONTAINER_CMD"; then
            echo -e "${GREEN}✅ Container build successful!${NC}"
            BINARY_SOURCE="$CONTAINER_TARGET/release/yago"
        else
            echo -e "${RED}❌ Container build failed. Falling back to host build...${NC}"
            build_on_host
            BINARY_SOURCE="target/release/yago"
        fi
    fi
else
    build_on_host
    BINARY_SOURCE="target/release/yago"
fi

# Verify the binary exists
if [ ! -f "$BINARY_SOURCE" ]; then
    echo -e "${RED}❌ Base Tauri build failed - binary not found at $BINARY_SOURCE${NC}"
    exit 1
fi

# Create build directory
mkdir -p "$DEB_DIR/DEBIAN" "$DEB_DIR/usr/bin" "$DEB_DIR/usr/share/applications" "$DEB_DIR/usr/share/icons/hicolor/256x256/apps" "$DEB_DIR/usr/share/doc/yago" "$TEMP_BUILD_DIR"

# Copy binary
cp "$BINARY_SOURCE" "$DEB_DIR/usr/bin/"

# Create control file
cat > "$DEB_DIR/DEBIAN/control" << EOF
Package: yago
Version: $VERSION
Section: games
Priority: optional
Architecture: amd64
Depends: libgtk-3-0 (>= 3.24), libwebkit2gtk-4.1-0 (>= 2.36), libglib2.0-0 (>= 2.66), libgdk-pixbuf-2.0-0 (>= 2.42), libcairo-gobject2 (>= 1.16), libpango-1.0-0 (>= 1.50), libatk1.0-0 (>= 2.36), libcairo2 (>= 1.16)
Maintainer: YAGO Team <info@yago.dev>
Description: Yet Another Game Organizer for 3DMigoto ecosystem
 YAGO is a high-performance modding platform that bridges the gap between
 a user-friendly Game Manager and a technical IDE for modders targeting
 the 3DMigoto ecosystem (Genshin Impact, Honkai: Star Rail, etc.).
Homepage: https://github.com/your-org/yago
EOF

# Create desktop file
cat > "$DEB_DIR/usr/share/applications/yago.desktop" << EOF
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

# Copy icon
if [ -f "src-tauri/icons/icon.png" ]; then
    cp "src-tauri/icons/icon.png" "$DEB_DIR/usr/share/icons/hicolor/256x256/apps/yago.png"
fi

# Create copyright file
cat > "$DEB_DIR/usr/share/doc/yago/copyright" << EOF
Format: https://www.debian.org/doc/packaging-manuals/copyright-format/1.0/
Upstream-Name: yago
Upstream-Contact: YAGO Team <info@yago.dev>
Source: https://github.com/your-org/yago

Files: *
Copyright: 2024 YAGO Team
License: MIT
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 .
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 .
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
EOF

# Create changelog
cat > "$DEB_DIR/usr/share/doc/yago/changelog.Debian" << EOF
yago ($VERSION) unstable; urgency=medium

  * New upstream release

 -- YAGO Team <info@yago.dev>  $(date -R)
EOF
gzip -9 -n -f "$DEB_DIR/usr/share/doc/yago/changelog.Debian"

# Set permissions
chmod 755 "$DEB_DIR/DEBIAN" "$DEB_DIR/usr/bin/yago"
chmod 644 "$DEB_DIR/DEBIAN/control"

# Build package
echo "Building DEB package..."
cd "$BUILD_DIR"

if command -v dpkg-deb &> /dev/null; then
    dpkg-deb --build --root-owner-group "yago-$VERSION"
elif command -v ar &> /dev/null && command -v tar &> /dev/null; then
    echo -e "${YELLOW}⚠️  dpkg not found. Using 'ar' and 'tar' to build DEB manually...${NC}"

    # Verify DEBIAN directory exists
    if [ ! -d "yago-$VERSION/DEBIAN" ]; then
        echo -e "${RED}❌ DEBIAN directory not found at yago-$VERSION/DEBIAN${NC}"
        exit 1
    fi

    # 1. debian-binary
    echo "2.0" > debian-binary

    # 2. control.tar.gz (Gzip compressed control files)
    # Change to DEBIAN directory and archive from there
    (cd "yago-$VERSION/DEBIAN" && tar --owner=0 --group=0 -czf "../../control.tar.gz" .)

    # 3. data.tar.gz (Gzip compressed data files)
    # Archive usr directory from DEB_DIR
    (cd "yago-$VERSION" && tar --owner=0 --group=0 -czf "../data.tar.gz" usr)

    # 4. Create the .deb archive (Order is critical: debian-binary, control, data)
    ar rcs "yago-$VERSION.deb" debian-binary control.tar.gz data.tar.gz

    # Cleanup
    rm debian-binary control.tar.gz data.tar.gz

    echo -e "${GREEN}✅ DEB package built using native tools.${NC}"
else
    echo -e "${RED}❌ dpkg not found and 'ar'/'tar' missing. Cannot build DEB.${NC}"
    exit 1
fi

# Move to temp directory first, then organize
mv "yago-$VERSION.deb" "$PROJECT_ROOT/$TEMP_BUILD_DIR/"

# Go back to project root to run organize_build correctly
cd "$PROJECT_ROOT"

# Organize the build
organize_build "deb" "$TEMP_BUILD_DIR/yago-$VERSION.deb"

# Clean up temporary build artifacts while preserving caches
echo "Cleaning up temporary build artifacts..."
rm -rf "$TEMP_BUILD_DIR"
rm -rf "$DEB_DIR"  # DEB package directory can be recreated

# Stop distrobox container if it was used
if command -v distrobox &> /dev/null && distrobox list --no-color | grep -q "\byago-deb\b"; then
    echo "Stopping yago-deb container..."
    distrobox-stop -Y yago-deb
fi

# Note: Preserving build caches:
# - target/release/ (Rust build artifacts for incremental builds)
# - src-ui/dist/ (frontend build for incremental builds)
# - npm cache (in node_modules/.cache or global cache)
# - cargo registry/cache (for dependency reuse)
# - Container target directory (for GLIBC-compatible builds)
