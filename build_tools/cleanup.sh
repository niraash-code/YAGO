#!/bin/bash

# YAGO Release Cleanup Script
# Cleans up old builds based on user preferences

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default values
KEEP_COUNT=5
CLEAN_ALL=false
BUILD_TYPE=""

# Function to show usage
usage() {
    echo "YAGO Release Cleanup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -k, --keep COUNT     Number of builds to keep per type (default: 5)"
    echo "  -t, --type TYPE      Build type to clean (appimage, flatpak, deb, rpm, pkgbuild, windows)"
    echo "  -a, --all            Clean all build types"
    echo "  -l, --list           List current builds without cleaning"
    echo "  -h, --help           Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 --keep 3 --all          # Keep 3 builds of each type"
    echo "  $0 --type deb --keep 2     # Keep 2 DEB builds"
    echo "  $0 --list                  # Just list builds"
    echo "  $0 --all                   # Clean all types (keep 5 each)"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -k|--keep)
            KEEP_COUNT="$2"
            shift 2
            ;;
        -t|--type)
            BUILD_TYPE="$2"
            shift 2
            ;;
        -a|--all)
            CLEAN_ALL=true
            shift
            ;;
        -l|--list)
            list_builds
            exit 0
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Validate arguments
if [ -n "$BUILD_TYPE" ] && [ "$CLEAN_ALL" = true ]; then
    echo -e "${RED}❌ Cannot specify both --type and --all${NC}"
    exit 1
fi

if [ -z "$BUILD_TYPE" ] && [ "$CLEAN_ALL" = false ]; then
    echo -e "${YELLOW}⚠️  No action specified. Use --all, --type, or --list${NC}"
    echo ""
    usage
    exit 1
fi

# Validate build type
if [ -n "$BUILD_TYPE" ]; then
    case "$BUILD_TYPE" in
        appimage|flatpak|deb|rpm|pkgbuild|windows)
            ;;
        *)
            echo -e "${RED}❌ Invalid build type: $BUILD_TYPE${NC}"
            echo "Valid types: appimage, flatpak, deb, rpm, pkgbuild, windows"
            exit 1
            ;;
    esac
fi

# Validate keep count
if ! [[ "$KEEP_COUNT" =~ ^[0-9]+$ ]] || [ "$KEEP_COUNT" -lt 0 ]; then
    echo -e "${RED}❌ Invalid keep count: $KEEP_COUNT${NC}"
    exit 1
fi

# Show current status
echo -e "${BLUE}🧹 YAGO Release Cleanup${NC}"
echo "Keep count: $KEEP_COUNT"

if [ "$CLEAN_ALL" = true ]; then
    echo "Action: Clean all build types"
elif [ -n "$BUILD_TYPE" ]; then
    echo "Action: Clean $BUILD_TYPE builds only"
fi

echo ""

# Show current builds before cleanup
echo -e "${YELLOW}📋 Builds before cleanup:${NC}"
list_builds
echo ""

# Confirm cleanup
if [ "$KEEP_COUNT" -eq 0 ]; then
    echo -e "${RED}⚠️  WARNING: You are about to delete ALL builds!${NC}"
fi

read -p "Continue with cleanup? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

# Perform cleanup
echo ""
if [ "$CLEAN_ALL" = true ]; then
    clean_all_builds "$KEEP_COUNT"
elif [ -n "$BUILD_TYPE" ]; then
    cleanup_builds "$BUILD_TYPE" "$KEEP_COUNT"
fi

# Show final status
echo ""
echo -e "${GREEN}📋 Builds after cleanup:${NC}"
list_builds
