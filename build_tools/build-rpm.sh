#!/bin/bash

# YAGO RPM Build Script

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

PROJECT_NAME="yago"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/')
BUILD_DIR="$RPM_BUILD_DIR"
TEMP_BUILD_DIR="$TEMP_BUILD_DIR"
RPM_BUILD_DIR="$RPM_BUILD_DIR/rpmbuild"
SOURCES_DIR="$RPM_BUILD_DIR/SOURCES"
SPECS_DIR="$RPM_BUILD_DIR/SPECS"

# Ensure build directories exist
ensure_build_dirs

echo -e "${BLUE}Building RPM package for YAGO v$VERSION${NC}"

# Build base Tauri application first
echo "Building base Tauri application..."

# Function to build on host
build_on_host() {
    echo "🏗️  Building on host..."
    cargo tauri build --no-bundle
}

# Try to build in container for better compatibility (Fedora glibc)
CONTAINER_NAME="yago-rpm"
HAS_CONTAINER=false
if command -v distrobox &> /dev/null && distrobox list --no-color | grep -q "\b$CONTAINER_NAME\b"; then
    HAS_CONTAINER=true
fi

if [ "$HAS_CONTAINER" = true ]; then
    echo -e "${YELLOW}⚠️  Detected '$CONTAINER_NAME' container. Attempting to build inside it for GLIBC compatibility...${NC}"
    
    # Check if cargo is available
    if ! distrobox-enter -n $CONTAINER_NAME -- command -v cargo &> /dev/null && \
       ! distrobox-enter -n $CONTAINER_NAME -- test -f "$HOME/.cargo/bin/cargo"; then
        echo -e "${RED}❌ Cargo not found in '$CONTAINER_NAME'.${NC}"
        echo -e "${YELLOW}👉 Please run './build_tools/setup-build-containers.sh' to setup the build environment.${NC}"
        echo "Falling back to host build..."
        build_on_host
        BINARY_SOURCE="target/release/yago"
    else
        echo "✅ Cargo found in container. Starting containerized build..."
    
        # Use explicit path source to ensure cargo is found
        # Use separate target directory to avoid GLIBC mismatch with host artifacts
        CONTAINER_TARGET="$BUILD_DIR/target"
        CONTAINER_CMD="export PATH=\$HOME/.cargo/bin:\$PATH && cd '$PROJECT_ROOT' && CARGO_TARGET_DIR='$CONTAINER_TARGET' cargo build --release --features custom-protocol"
        
        if distrobox-enter -n $CONTAINER_NAME -- bash -c "$CONTAINER_CMD"; then
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

# Create RPM build directories
mkdir -p "$SOURCES_DIR" "$SPECS_DIR" "$RPM_BUILD_DIR/BUILD" "$RPM_BUILD_DIR/BUILDROOT" "$RPM_BUILD_DIR/RPMS" "$RPM_BUILD_DIR/SRPMS" "$TEMP_BUILD_DIR"

# Create source archive (using correct binary location)
# Note: RPM build typically expects sources to build from scratch, but we are doing pre-compiled binary injection
# for simplicity in this script. However, standard RPM spec runs %build.
# Since we already built the binary, we should modify the SPEC to just copy our binary?
# Or we can just copy our binary into the build root in %install.
# Let's adjust the tarball creation to include our binary if we want to use it, OR
# relying on the spec file commands. The current spec runs 'cargo tauri build' again!
# We must update the spec file to NOT rebuild if we already built it, OR
# update the spec to just install the binary we just built.

# Let's Modify the logic:
# If we built in container, we want to use THAT binary.
# The current spec file runs 'npm install' and 'cargo tauri build'.
# We should change the spec file to skip building and just install the provided binary.

echo "Creating source archive..."
# We will create a tarball with the binary we just built to trick the spec file?
# Or simpler: COPY the binary to a location the spec file can find, and change spec to install it.
# Actually, the 'tar -czf' includes '.' which implies re-bundling the whole source.
# If we assume the container build is correct, we should update the spec file to `install` the pre-built binary.

# Copy binary to a staging area
cp "$BINARY_SOURCE" "$SOURCES_DIR/yago"

# Create desktop file
cat > "$SOURCES_DIR/yago.desktop" << EOF
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

# Create a minimal source archive with only what the spec file needs
tar -czf "$SOURCES_DIR/yago-$VERSION.tar.gz" README.md src-tauri/icons/

# Create spec file
cat > "$SPECS_DIR/yago.spec" << EOF
%global debug_package %{nil}
Name:           yago
Version:        $VERSION
Release:        1%{?dist}
Summary:        Yet Another Game Organizer for 3DMigoto ecosystem

License:        MIT
URL:            https://github.com/your-org/yago
Source0:        %{name}-%{version}.tar.gz
Source1:        yago
Source2:        yago.desktop

Requires:       gtk3
Requires:       webkit2gtk4.1
Requires:       glib2
Requires:       cairo
Requires:       pango
Requires:       atk
Requires:       gdk-pixbuf2
Requires:       glibc
Requires:       libgcc

%description
YAGO is a high-performance modding platform that bridges the gap between
a user-friendly Game Manager and a technical IDE for modders targeting
the 3DMigoto ecosystem (Genshin Impact, Honkai: Star Rail, etc.).

%prep
%setup -q -c

%build
# Application is already built

%install
rm -rf \$RPM_BUILD_ROOT

# Install binary
install -D -m 755 %{SOURCE1} \$RPM_BUILD_ROOT%{_bindir}/%{name}

# Install desktop file
install -D -m 644 %{SOURCE2} \$RPM_BUILD_ROOT%{_datadir}/applications/yago.desktop

# Install icon
install -D -m 644 src-tauri/icons/icon.png \$RPM_BUILD_ROOT%{_datadir}/icons/hicolor/256x256/apps/yago.png

%files
%doc README.md
%{_bindir}/%{name}
%{_datadir}/applications/yago.desktop
%{_datadir}/icons/hicolor/256x256/apps/yago.png

%changelog
* $(date '+%a %b %d %Y') YAGO Team <info@yago.dev> - $VERSION-1
- Initial package
EOF



# Set up RPM macros if needed
cat > ~/.rpmmacros << EOF
%_topdir $RPM_BUILD_DIR
EOF

# Build RPM package
echo "Building RPM package..."
if [ "$HAS_CONTAINER" = true ]; then
    echo "📦 Running rpmbuild inside '$CONTAINER_NAME' container..."
    distrobox-enter -n $CONTAINER_NAME -- bash -c "mkdir -p /tmp/rpmbuild/{SOURCES,SPECS,BUILD,BUILDROOT,RPMS,SRPMS} && cp '$SOURCES_DIR'/* /tmp/rpmbuild/SOURCES/ && cp '$SPECS_DIR'/* /tmp/rpmbuild/SPECS/ && echo '%_topdir /tmp/rpmbuild' > ~/.rpmmacros && rpmbuild -ba /tmp/rpmbuild/SPECS/yago.spec"
else
    rpmbuild -ba "$SPECS_DIR/yago.spec"
fi

# Move package to temp directory first, then organize
if [ "$HAS_CONTAINER" = true ]; then
    find /tmp/rpmbuild/RPMS -name "*.rpm" -exec mv {} "$PROJECT_ROOT/$TEMP_BUILD_DIR/" \;
else
    find "$RPM_BUILD_DIR/RPMS" -name "*.rpm" -exec mv {} "$PROJECT_ROOT/$TEMP_BUILD_DIR/" \;
fi

# Organize the build
RPM_FILE=$(ls "$PROJECT_ROOT/$TEMP_BUILD_DIR"/*.rpm 2>/dev/null | head -1)
if [ -f "$RPM_FILE" ]; then
    organize_build "rpm" "$RPM_FILE"
fi

# Clean up temporary build artifacts while preserving caches
echo "Cleaning up temporary build artifacts..."
rm -rf "$TEMP_BUILD_DIR"
rm -rf "$RPM_BUILD_DIR"  # RPM build directory structure can be recreated

# Stop distrobox container if it was used
if command -v distrobox &> /dev/null && distrobox list --no-color | grep -q "\byago-rpm\b"; then
    echo "Stopping yago-rpm container..."
    distrobox-stop -Y yago-rpm
fi

# Note: Preserving build caches:
# - target/release/ (Rust build artifacts for incremental builds)
# - Container target directory (for GLIBC-compatible builds)
# - RPM macros in ~/.rpmmacros (can be regenerated)
