#!/bin/bash

# YAGO Release Utilities
# Functions for organizing and managing release builds

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/')
RELEASE_DIR="release"
LATEST_DIR="$RELEASE_DIR/latest"
OLDER_DIR="$RELEASE_DIR/older"
BUILD_ROOT="$RELEASE_DIR/build"
BUILD_TOOLS_DIR="build_tools"

# Centralized build paths for all build types
TEMP_BUILD_DIR="$BUILD_ROOT/temp"
APPIMAGE_BUILD_DIR="$BUILD_ROOT/appimage"
FLATPAK_BUILD_DIR="$BUILD_ROOT/flatpak"
DEB_BUILD_DIR="$BUILD_ROOT/deb"
RPM_BUILD_DIR="$BUILD_ROOT/rpm"
PKGBUILD_BUILD_DIR="$BUILD_ROOT/pkgbuild"
WINDOWS_BUILD_DIR="$BUILD_ROOT/windows"

# Ensure centralized directories exist
ensure_build_dirs() {
    mkdir -p "$TEMP_BUILD_DIR" "$APPIMAGE_BUILD_DIR" "$FLATPAK_BUILD_DIR" \
             "$DEB_BUILD_DIR" "$RPM_BUILD_DIR" "$PKGBUILD_BUILD_DIR" "$WINDOWS_BUILD_DIR"
}

# Function to get build timestamp
get_timestamp() {
    date +"%Y%m%d_%H%M%S"
}

# Function to organize builds
# Usage: organize_build <build_type> <source_file>
organize_build() {
    local build_type="$1"
    local source_file="$2"
    local timestamp=$(get_timestamp)

    if [ ! -f "$source_file" ]; then
        echo -e "${RED}❌ Source file not found: $source_file${NC}"
        return 1
    fi

    # Create filename with version and timestamp
    local filename=$(basename "$source_file")
    local name="${filename%.*}"
    local ext="${filename##*.}"

    # Special handling for different extensions
    if [[ "$filename" == *".pkg.tar.zst" ]]; then
        ext="pkg.tar.zst"
        name="${filename%.pkg.tar.zst}"
    elif [[ "$filename" == *".tar.gz" ]]; then
        ext="tar.gz"
        name="${filename%.tar.gz}"
    fi

    local versioned_name="${name}-${timestamp}.${ext}"

    # Move to latest (always overwrite)
    local latest_dest="$LATEST_DIR/$filename"
    cp "$source_file" "$latest_dest"
    echo -e "${GREEN}✅ Latest: $latest_dest${NC}"

    # Move to older with timestamp
    local older_subdir="$OLDER_DIR/$build_type"
    mkdir -p "$older_subdir"
    local older_dest="$older_subdir/$versioned_name"
    mv "$source_file" "$older_dest"
    echo -e "${BLUE}📦 Older: $older_dest${NC}"
}

# Function to clean up old builds
# Usage: cleanup_builds <build_type> <keep_count>
cleanup_builds() {
    local build_type="$1"
    local keep_count="${2:-5}"  # Default to keep 5 builds
    local older_subdir="$OLDER_DIR/$build_type"

    if [ ! -d "$older_subdir" ]; then
        echo -e "${YELLOW}⚠️  No builds directory found: $older_subdir${NC}"
        return 0
    fi

    # Count files
    local file_count=$(ls -1 "$older_subdir" | wc -l)

    if [ "$file_count" -le "$keep_count" ]; then
        echo -e "${BLUE}ℹ️  Only $file_count builds found (keeping $keep_count), no cleanup needed${NC}"
        return 0
    fi

    # Calculate how many to delete
    local delete_count=$((file_count - keep_count))
    echo -e "${YELLOW}🧹 Cleaning up $delete_count old $build_type builds...${NC}"

    # Delete oldest files (sorted by modification time)
    ls -t "$older_subdir" | tail -n "$delete_count" | while read -r file; do
        echo "  Deleting: $older_subdir/$file"
        rm "$older_subdir/$file"
    done

    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to list builds
list_builds() {
    echo -e "${BLUE}📋 Current Builds:${NC}"
    echo ""

    echo -e "${GREEN}Latest Builds:${NC}"
    if [ -d "$LATEST_DIR" ]; then
        ls -la "$LATEST_DIR" | grep -v "^total" | grep -v "^d" | while read -r line; do
            if [ -n "$line" ]; then
                echo "  $line"
            fi
        done
    else
        echo "  No latest builds"
    fi

    echo ""
    echo -e "${YELLOW}Older Builds:${NC}"
    for build_type in appimage flatpak deb rpm pkgbuild windows; do
        local subdir="$OLDER_DIR/$build_type"
        if [ -d "$subdir" ]; then
            local count=$(ls -1 "$subdir" 2>/dev/null | wc -l)
            echo "  $build_type: $count builds"
            ls -la "$subdir" 2>/dev/null | head -6 | tail -5 | while read -r line; do
                if [ -n "$line" ] && [[ ! "$line" =~ ^total ]]; then
                    echo "    $line"
                fi
            done
            if [ "$count" -gt 5 ]; then
                echo "    ... and $((count-5)) more"
            fi
        fi
    done
}

# Function to clean all builds
clean_all_builds() {
    local keep_count="${1:-5}"

    echo -e "${YELLOW}🧹 Cleaning all build types (keeping $keep_count each)...${NC}"

    for build_type in appimage flatpak deb rpm pkgbuild windows; do
        cleanup_builds "$build_type" "$keep_count"
    done

    echo -e "${GREEN}✅ All cleanup completed${NC}"
}
