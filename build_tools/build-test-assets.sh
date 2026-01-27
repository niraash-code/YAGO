#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_FILE="$SCRIPT_DIR/test_assets/fake_process.rs"
OUTPUT_DIR="$SCRIPT_DIR/test_assets/bin"

mkdir -p "$OUTPUT_DIR"

echo "Compiling fake game executables (Windows Cross-Compile)..."

# Compile for Windows
rustc "$SOURCE_FILE" --target x86_64-pc-windows-gnu -o "$OUTPUT_DIR/GenshinImpact.exe"
echo "✅ Created $OUTPUT_DIR/GenshinImpact.exe (Windows binary)"

rustc "$SOURCE_FILE" --target x86_64-pc-windows-gnu -o "$OUTPUT_DIR/3dmloader.exe"
echo "✅ Created $OUTPUT_DIR/3dmloader.exe (Windows binary)"

# Also compile a native Linux version just in case
rustc "$SOURCE_FILE" -o "$OUTPUT_DIR/fake_process_linux"
echo "✅ Created $OUTPUT_DIR/fake_process_linux (Native binary)"

chmod +x "$OUTPUT_DIR/GenshinImpact.exe"
chmod +x "$OUTPUT_DIR/3dmloader.exe"
chmod +x "$OUTPUT_DIR/fake_process_linux"