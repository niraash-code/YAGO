#!/bin/bash
set -e

# Build the Windows Helper EXE
echo "Building win_helper.exe for Windows..."
cargo build --target x86_64-pc-windows-gnu --bin win_helper --release

# Ensure libs directory exists
mkdir -p src-tauri/libs

# Copy to resources
cp target/x86_64-pc-windows-gnu/release/win_helper.exe src-tauri/libs/
echo "win_helper.exe placed in src-tauri/libs/"
