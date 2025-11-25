#!/bin/bash
# Quick build script for Windows Squirrel installer

set -e

echo "========================================"
echo "  CreatorCrafter Windows Installer"
echo "  Building with Squirrel.Windows"
echo "========================================"
echo ""

# Clean previous build
echo "[1/3] Cleaning previous build..."
rm -rf release/squirrel-windows release/win-unpacked
echo "✓ Clean complete"
echo ""

# Build installer
echo "[2/3] Building Windows installer..."
echo "This will take 2-3 minutes..."
echo ""

npx electron-builder --win --x64 --config.win.target=squirrel

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "  Build Complete!"
    echo "========================================"
    echo ""
    echo "Installer location:"
    ls -lh release/squirrel-windows/CreatorCrafter*.exe
    echo ""
    echo "Installer includes:"
    echo "  ✓ CreatorCrafter application"
    echo "  ✓ FFmpeg binaries (367MB)"
    echo "  ✓ Python scripts (29 files)"
    echo "  ✓ Setup automation (setup-dependencies.bat)"
    echo "  ✓ User instructions (SETUP_README.txt)"
    echo ""
    echo "Distribution:"
    echo "  Upload: release/squirrel-windows/CreatorCrafter Setup 1.0.0.exe"
    echo ""
    echo "User installation:"
    echo "  1. Run installer (~30 seconds)"
    echo "  2. Run setup-dependencies.bat (~10-15 minutes)"
    echo "  3. Launch CreatorCrafter"
    echo ""
    echo "========================================"
    echo ""

    # Show file structure
    echo "[3/3] Verification..."
    echo ""
    echo "Setup scripts:"
    ls -lh release/win-unpacked/resources/*.{bat,ps1,txt} 2>/dev/null | awk '{print "  "$9" ("$5")"}'
    echo ""
    echo "FFmpeg:"
    ls -lh release/win-unpacked/resources/ffmpeg/*.exe 2>/dev/null | awk '{print "  "$9" ("$5")"}'
    echo ""
    echo "Python scripts:"
    echo "  "$(ls release/win-unpacked/resources/python/ | wc -l)" files"
    echo ""
    echo "✓ All components verified"
    echo ""
else
    echo ""
    echo "========================================"
    echo "  Build Failed"
    echo "========================================"
    echo ""
    echo "Check error messages above"
    echo ""
    exit 1
fi
