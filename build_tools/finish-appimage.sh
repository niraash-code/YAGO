#!/bin/bash

# YAGO - Manual AppImage Completion Script
# Run this after linuxdeploy succeeds but appimagetool fails

set -e

BUILD_DIR="release/build/appimage"
APP_DIR="$BUILD_DIR/AppDir"
OUTPUT_DIR="release/latest"

echo "🔧 Completing YAGO AppImage build manually..."

# Check if AppDir exists and has content
if [ ! -d "$APP_DIR" ]; then
    echo "❌ AppDir not found at $APP_DIR"
    echo "Run 'make release-appimage' first to let linuxdeploy create the AppDir"
    exit 1
fi

if [ ! -f "$APP_DIR/usr/bin/yago" ]; then
    echo "❌ Binary not found in AppDir"
    echo "Run 'make release-appimage' first to let linuxdeploy process files"
    exit 1
fi

echo "✅ AppDir structure verified"

# Download a working appimagetool
echo "📦 Downloading working appimagetool..."
if [ ! -f "appimagetool-x86_64.AppImage" ]; then
    wget -q https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage
    chmod +x appimagetool-x86_64.AppImage
fi

# Create the AppImage
echo "🏗️  Creating AppImage..."
./appimagetool-x86_64.AppImage "$APP_DIR"

# Find the created AppImage
APPIMAGE_FILE=$(ls -t *.AppImage | head -1)
if [ -z "$APPIMAGE_FILE" ]; then
    echo "❌ No AppImage file found"
    exit 1
fi

echo "✅ AppImage created: $APPIMAGE_FILE"

# Move to latest releases
mkdir -p "$OUTPUT_DIR"
mv "$APPIMAGE_FILE" "$OUTPUT_DIR/"

echo "🎉 AppImage moved to: $OUTPUT_DIR/"
ls -la "$OUTPUT_DIR/"*.AppImage

echo ""
echo "🚀 YAGO AppImage is ready!"
echo "Run: chmod +x $OUTPUT_DIR/$APPIMAGE_FILE && ./$OUTPUT_DIR/$APPIMAGE_FILE"
