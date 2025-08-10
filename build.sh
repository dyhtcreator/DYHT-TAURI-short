#!/bin/bash

# Build script for Dwight Desktop Agent
# This script builds the Tauri application and creates the executable

echo "Building Dwight Desktop Agent..."

# Build the frontend first
echo "Building frontend assets..."
npm run build

# Build the Tauri application
echo "Building Tauri application..."
npx tauri build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "Executable locations:"
    echo "  - Main binary: src-tauri/target/release/dwight"
    echo "  - Symlink: ./Dwight"
    echo "  - Packages:"
    find src-tauri/target/release/bundle -name "*.deb" -o -name "*.rpm" -o -name "*.AppImage" | while read file; do
        echo "    - $file"
    done
else
    echo "❌ Build failed!"
    exit 1
fi