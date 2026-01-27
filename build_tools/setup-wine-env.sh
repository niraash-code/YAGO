#!/bin/bash

# YAGO Wine Environment Setup Script

set -e

# --- Constants ---
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TESTING_DIR="$PROJECT_ROOT/build_tools/wine-test-env" # Testing folder inside the project
WINEPREFIX_DIR="$TESTING_DIR/yago-wine-prefix" # Dedicated Wine prefix within the testing folder
WEBVIEW2_INSTALLER_URL="https://go.microsoft.com/fwlink/p/?LinkId=2124703" # Evergreen Standalone Installer x64
WEBVIEW2_INSTALLER_NAME="MicrosoftEdgeWebView2RuntimeInstallerX64.exe"
WEBVIEW2_INSTALLER_PATH="$TESTING_DIR/$WEBVIEW2_INSTALLER_NAME"
# Placeholder for SHA256 checksum - REPLACE WITH ACTUAL CHECKSUM
WEBVIEW2_INSTALLER_CHECKSUM="<REPLACE_WITH_ACTUAL_SHA256_CHECKSUM>" 

# --- Functions ---

# Function for graceful exit on script interruption
cleanup() {
    echo -e "\n${RED}Script interrupted or failed. Exiting.${NC}"
    # Add any specific cleanup logic here if needed
}

# Source utilities (for colored output)
# SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# source "$SCRIPT_DIR/utils.sh" # Assuming utils.sh exists and has color codes. If not, define them here or remove.
# For now, manually define color codes if utils.sh is not guaranteed
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color


# --- Main Script Logic ---
echo -e "${BLUE}--- YAGO Wine Environment Setup ---${NC}"

# Set trap for cleanup
trap cleanup EXIT

# --- Wine Prefix Management ---

# Check if wine is installed
if ! command -v wine &> /dev/null; then
    echo -e "${RED}Error: 'wine' command not found. Please install Wine to proceed.${NC}"
    exit 1
fi

echo -e "${BLUE}Ensuring testing directory exists...${NC}"
mkdir -p "$TESTING_DIR"

if [ -d "$WINEPREFIX_DIR" ]; then
    echo -e "${YELLOW}Wine prefix already exists at: $WINEPREFIX_DIR${NC}"
    read -p "Do you want to (r)euse it or (d)elete and recreate it? (r/d): " choice
    case "$choice" in
        d|D )
            echo -e "${YELLOW}Deleting existing Wine prefix...${NC}"
            rm -rf "$WINEPREFIX_DIR"
            ;;
        r|R )
            echo -e "${GREEN}Reusing existing Wine prefix.${NC}"
            # Ensure it's initialized (e.g. if it was just an empty dir)
            WINEPREFIX="$WINEPREFIX_DIR" wineboot -u || true # wineboot -u returns non-zero if no changes, so ignore error
            ;;
        * )
            echo -e "${RED}Invalid choice. Exiting.${NC}"
            exit 1
            ;;
    esac
fi

if [ ! -d "$WINEPREFIX_DIR" ]; then
    echo -e "${BLUE}Creating new Wine prefix at: $WINEPREFIX_DIR${NC}"
    WINEPREFIX="$WINEPREFIX_DIR" winecfg # This initializes the prefix
    echo -e "${GREEN}Wine prefix initialized.${NC}"
else
    echo -e "${GREEN}Wine prefix confirmed at: $WINEPREFIX_DIR${NC}"
fi

# --- Download WebView2 Installer ---
echo -e "${BLUE}Checking for WebView2 installer...${NC}"
if [ -f "$WEBVIEW2_INSTALLER_PATH" ]; then
    echo -e "${GREEN}WebView2 installer found: $WEBVIEW2_INSTALLER_PATH${NC}"
else
    echo -e "${BLUE}Downloading WebView2 installer...${NC}"
    if command -v curl &> /dev/null; then
        curl -L "$WEBVIEW2_INSTALLER_URL" -o "$WEBVIEW2_INSTALLER_PATH"
    elif command -v wget &> /dev/null; then
        wget -O "$WEBVIEW2_INSTALLER_PATH" "$WEBVIEW2_INSTALLER_URL"
    else
        echo -e "${RED}Error: Neither curl nor wget found. Please install one to download the WebView2 installer.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Download complete.${NC}"
fi

# Verify checksum (requires user to manually update WEBVIEW2_INSTALLER_CHECKSUM in script)
if [ "$WEBVIEW2_INSTALLER_CHECKSUM" != "<REPLACE_WITH_ACTUAL_SHA256_CHECKSUM>" ]; then
    echo -e "${BLUE}Verifying WebView2 installer checksum...${NC}"
    CALCULATED_CHECKSUM=$(sha256sum "$WEBVIEW2_INSTALLER_PATH" | awk '{print $1}')
    if [ "$CALCULATED_CHECKSUM" == "$WEBVIEW2_INSTALLER_CHECKSUM" ]; then
        echo -e "${GREEN}Checksum verified successfully.${NC}"
    else
        echo -e "${RED}Error: Checksum mismatch for WebView2 installer.${NC}"
        echo -e "${RED}Expected: $WEBVIEW2_INSTALLER_CHECKSUM${NC}"
        echo -e "${RED}Got:      $CALCULATED_CHECKSUM${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Warning: WebView2 installer checksum not set. Skipping verification.${NC}"
    echo -e "${YELLOW}Please update 'WEBVIEW2_INSTALLER_CHECKSUM' in the script for security.${NC}"
fi

# --- Install WebView2 ---
echo -e "${BLUE}Checking WebView2 installation in Wine prefix...${NC}"

# Heuristic check: look for msedge.exe in a common WebView2 install path within the Wine prefix
WEBVIEW2_INSTALLED_CHECK_PATH="$WINEPREFIX_DIR/drive_c/Program Files (x86)/Microsoft/EdgeWebView/Application"
if find "$WEBVIEW2_INSTALLED_CHECK_PATH" -type f -name "msedge.exe" -print -quit | grep -q .; then
    echo -e "${GREEN}WebView2 appears to be installed in the Wine prefix.${NC}"
else
    echo -e "${YELLOW}WebView2 not found in Wine prefix. Installing...${NC}"
    WINEPREFIX="$WINEPREFIX_DIR" wine "$WEBVIEW2_INSTALLER_PATH"
    echo -e "${GREEN}WebView2 installation initiated. Please follow the installer prompts.${NC}"
    # Note: The installer might not finish immediately,
    # so we can't reliably check for installation completion here programmatically.
    # User interaction is required.
fi

# --- Instructions for running YAGO ---
echo -e "\n${GREEN}Wine environment setup is complete!${NC}"
echo -e "You can now try running your YAGO portable executable using this Wine prefix."
echo -e "Example (replace with your actual YAGO executable path):"
echo -e "${YELLOW}WINEPREFIX=$WINEPREFIX_DIR wine /path/to/your/yago.exe${NC}"
echo -e "Remember to unzip your portable YAGO build (e.g., 'yago-0.1.0-windows-portable.zip') and use the 'yago.exe' inside."

# --- Optional Cleanup Function ---
# This function is not called automatically, but can be added if needed
# to remove the testing directory and wine prefix.
#
# cleanup_testing_env() {
#     echo -e "${YELLOW}Cleaning up testing environment (removing $TESTING_DIR)...${NC}"
#     rm -rf "$TESTING_DIR"
#     echo -e "${GREEN}Testing environment cleaned.${NC}"
# }
