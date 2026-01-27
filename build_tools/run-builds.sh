#!/bin/bash

# YAGO Test Script
# Tests generated release in different environments

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LATEST_DIR="$PROJECT_ROOT/release/latest"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Helper to run a command and wait for it to close (manual testing)
# Usage: run_and_wait <command> [args...]
run_and_wait() {
    local cmd="$@"
    
    echo -e "${BLUE}🚀 Launching: $cmd${NC}"
    
    # Run in background to get PID
    $cmd &
    local pid=$!
    
    # Short wait to detect immediate crashes
    sleep 2
    
    if ! ps -p $pid > /dev/null; then
        # Process already gone
        wait $pid
        local exit_code=$?
        if [ $exit_code -ne 0 ]; then
             echo -e "${RED}❌ App crashed at startup with code $exit_code${NC}"
             return 1
        else
             echo -e "${YELLOW}⚠️  App exited immediately with 0 (Did it just print help?).${NC}"
             return 0
        fi
    fi

    echo -e "${GREEN}✅ App started successfully (pid $pid).${NC}"
    echo "   Waiting for application to close (Close the window to finish test)..."
    
    wait $pid
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ App closed normally.${NC}"
    else
        echo -e "${YELLOW}⚠️  App closed with code $exit_code.${NC}"
    fi
}

# Cleanup function to kill stuck processes
cleanup_tests() {
    echo -e "${YELLOW}🧹 Cleaning up stuck test processes...${NC}"

    echo "Killing local yago instances..."
    pkill -f "yago" || echo "No local yago found."

    echo "Killing AppImage processes..."
    pkill -f "\.AppImage" || echo "No AppImage processes found."

    echo "Killing Flatpak processes..."
    pkill -f "flatpak" || echo "No Flatpak processes found."

    echo "Killing yago in yago-deb..."
    distrobox-enter -n yago-deb -- sudo pkill -f "yago" 2>/dev/null || echo "No yago in yago-deb."

    echo "Killing yago in yago-rpm..."
    distrobox-enter -n yago-rpm -- sudo pkill -f "yago" 2>/dev/null || echo "No yago in yago-rpm."

    echo "Killing yago in yago-arch..."
    distrobox-enter -n yago-arch -- sudo pkill -f "yago" 2>/dev/null || echo "No yago in yago-arch."

    echo "Cleaning up wine..."
    pkill -f "wine" || echo "No wine processes found."
    pkill -f "yago.exe" || echo "No yago.exe found."
    if command -v wineserver &> /dev/null; then
        wineserver -k || true
    fi

    echo -e "${GREEN}✅ Cleanup completed.${NC}"
}

test_appimage() {
    echo -e "\n${BLUE}🧪 Testing AppImage...${NC}"
    local appimage=$(ls "$LATEST_DIR"/*.AppImage 2>/dev/null | head -1)

    if [ -z "$appimage" ]; then
        echo -e "${RED}❌ No AppImage found in $LATEST_DIR${NC}"
        return 1
    fi

    # Clean up any existing AppImage processes
    echo "Cleaning up existing AppImage processes..."
    pkill -f "\.AppImage" || true

    chmod +x "$appimage"
    run_and_wait "$appimage"

    # Clean up after test
    cleanup_tests
}

test_flatpak() {
    echo -e "\n${BLUE}🧪 Testing Flatpak...${NC}"
    local flatpak=$(ls "$LATEST_DIR"/*.flatpak 2>/dev/null | head -1)
    local app_id="com.yago.GameOrganizer"

    if [ -z "$flatpak" ]; then
        echo -e "${RED}❌ No Flatpak bundle found in $LATEST_DIR${NC}"
        return 1
    fi

    # Remove existing installation if any
    echo "Removing existing Flatpak installation..."
    flatpak uninstall --user -y "$app_id" 2>/dev/null || true

    # Install
    echo "Installing Flatpak..."
    flatpak install --user --reinstall -y "$flatpak"

    # Run
    run_and_wait flatpak run "$app_id"

    # Clean up after test
    cleanup_tests
}

test_deb() {
    echo -e "\n${BLUE}🧪 Testing DEB (in distrobox: yago-deb)...${NC}"
    local deb=$(ls "$LATEST_DIR"/*.deb 2>/dev/null | head -1)

    if [ -z "$deb" ]; then
        echo -e "${RED}❌ No DEB package found in $LATEST_DIR${NC}"
        return 1
    fi

    # We need the absolute path for distrobox
    local abs_deb=$(readlink -f "$deb")

    echo "Installing in container..."
    distrobox-enter -n yago-deb -- sudo apt-get update
    distrobox-enter -n yago-deb -- sudo apt-get remove -y yago || true
    distrobox-enter -n yago-deb -- sudo apt-get install -y "$abs_deb"

    echo "Running in container..."
    run_and_wait distrobox-enter -n yago-deb -- yago

    # Clean up after test
    cleanup_tests
}

test_rpm() {
    echo -e "\n${BLUE}🧪 Testing RPM (in distrobox: yago-rpm)...${NC}"
    local rpm=$(ls "$LATEST_DIR"/*.rpm 2>/dev/null | head -1)

    if [ -z "$rpm" ]; then
        echo -e "${RED}❌ No RPM package found in $LATEST_DIR${NC}"
        return 1
    fi

    local abs_rpm=$(readlink -f "$rpm")

    echo "Installing in container..."
    distrobox-enter -n yago-rpm -- sudo dnf remove -y yago || true
    distrobox-enter -n yago-rpm -- sudo dnf install -y "$abs_rpm"

    echo "Running in container..."
    run_and_wait distrobox-enter -n yago-rpm -- yago

    # Clean up after test
    cleanup_tests
}

test_windows() {
    echo -e "\n${BLUE}🧪 Testing Windows (Wine)...${NC}"
    local exe=$(ls "$LATEST_DIR"/*setup.exe 2>/dev/null | head -1)
    if [ -z "$exe" ]; then
        exe=$(ls "$LATEST_DIR"/*.msi 2>/dev/null | head -1)
    fi

    if [ -z "$exe" ]; then
        echo -e "${RED}❌ No Windows installer found in $LATEST_DIR${NC}"
        return 1
    fi

    if ! command -v wine &> /dev/null; then
        echo -e "${RED}❌ Wine is not installed${NC}"
        return 1
    fi

    # Clean up any existing Wine processes
    echo "Cleaning up existing Wine processes..."
    pkill -f "wine" || true
    pkill -f "yago.exe" || true
    if command -v wineserver &> /dev/null; then
        wineserver -k || true
    fi

    # Use custom Wine prefix set up by setup-wine-env.sh
    local WINEPREFIX="$PROJECT_ROOT/build_tools/wine-test-env/yago-wine-prefix"

    if [ ! -d "$WINEPREFIX" ]; then
        echo -e "${YELLOW}⚠️  Custom Wine prefix not found at: $WINEPREFIX${NC}"
        echo -e "${YELLOW}Run './build_tools/setup-wine-env.sh' to set it up${NC}"
        echo -e "${YELLOW}Falling back to default Wine prefix...${NC}"
        WINEPREFIX=""
    else
        echo -e "${GREEN}✅ Using custom Wine prefix: $WINEPREFIX${NC}"
    fi

    echo "Launching installer with Wine..."
    if [ -n "$WINEPREFIX" ]; then
        run_and_wait env WINEPREFIX="$WINEPREFIX" wine "$exe"
    else
        run_and_wait wine "$exe"
    fi

    # Clean up after test
    cleanup_tests
}

test_pkgbuild() {
    echo -e "\n${BLUE}🧪 Testing PKGBUILD (in distrobox: yago-arch)...${NC}"
    local pkgbuild=$(ls "$LATEST_DIR"/*.pkg.tar.zst 2>/dev/null | head -1)

    if [ -z "$pkgbuild" ]; then
        echo -e "${RED}❌ No PKGBUILD package found in $LATEST_DIR${NC}"
        return 1
    fi

    local abs_pkgbuild=$(readlink -f "$pkgbuild")

    echo "Installing in container..."
    distrobox-enter -n yago-arch -- sudo pacman -Syu --noconfirm
    distrobox-enter -n yago-arch -- sudo pacman -R --noconfirm yago || true
    distrobox-enter -n yago-arch -- sudo pacman -U --noconfirm "$abs_pkgbuild"

    echo "Running in container..."
    run_and_wait distrobox-enter -n yago-arch -- yago

    # Clean up after test
    cleanup_tests
}

usage() {
    echo "Usage: $0 [target]"
    echo "Targets:"
    echo "  all       Test all available builds"
    echo "  appimage  Test AppImage (Host)"
    echo "  flatpak   Test Flatpak (Host)"
    echo "  deb       Test DEB (Distrobox: yago-deb)"
    echo "  rpm       Test RPM (Distrobox: yago-rpm)"
    echo "  pkgbuild  Test PKGBUILD (Distrobox: yago-arch)"
    echo "  win       Test Windows exe (Wine)"
    echo "  cleanup   Kill stuck test processes"
    exit 1
}

# Main execution
if [ $# -eq 0 ]; then
    usage
fi

case "$1" in
    all)
        test_appimage
        test_flatpak
        test_deb
        test_rpm
        test_pkgbuild
        test_windows
        ;;
    appimage)
        test_appimage
        ;;
    flatpak)
        test_flatpak
        ;;
    deb)
        test_deb
        ;;
    rpm)
        test_rpm
        ;;
    pkgbuild)
        test_pkgbuild
        ;;
    win|windows)
        test_windows
        ;;
    cleanup)
        cleanup_tests
        ;;
    *)
        usage
        ;;
esac

# Stop distrobox containers after testing
if command -v distrobox &> /dev/null; then
    echo "Stopping distrobox containers..."
    distrobox list --no-color | grep -q "\byago-deb\b" && distrobox-stop -Y yago-deb
    distrobox list --no-color | grep -q "\byago-rpm\b" && distrobox-stop -Y yago-rpm
    distrobox list --no-color | grep -q "\byago-arch\b" && distrobox-stop -Y yago-arch
fi
