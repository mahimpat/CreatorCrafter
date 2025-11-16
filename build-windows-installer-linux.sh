#!/bin/bash

# CreatorCrafter Windows Installer Build Script for Linux
# This script builds a Windows installer from Ubuntu/Linux

set -e  # Exit on error

echo "======================================="
echo "CreatorCrafter Windows Installer Build"
echo "Running on: $(uname -s)"
echo "======================================="
echo ""

# Check if NSIS is installed
if ! command -v makensis &> /dev/null; then
    echo "ERROR: NSIS (makensis) not found!"
    echo ""
    echo "Please install NSIS first:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install nsis"
    echo ""
    echo "Or for other Linux distributions, visit:"
    echo "  https://nsis.sourceforge.io/"
    exit 1
fi

echo "✓ NSIS found: $(makensis -VERSION)"
echo ""

# Check if Wine is available (needed for some NSIS plugins)
if ! command -v wine &> /dev/null; then
    echo "WARNING: Wine not found. Some NSIS plugins may not work."
    echo "To install Wine: sudo apt-get install wine"
    echo "Continuing anyway..."
    echo ""
fi

# Clean previous builds
echo "[1/5] Cleaning previous builds..."
rm -rf dist
rm -rf dist-electron
rm -rf release
rm -f CreatorCrafter-Setup.exe
echo "✓ Clean complete"
echo ""

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "[2/5] Installing npm dependencies..."
    npm install
    echo "✓ Dependencies installed"
    echo ""
else
    echo "[2/5] ✓ Dependencies already installed"
    echo ""
fi

# Build the Electron application for Windows
echo "[3/5] Building Electron application for Windows..."
echo "This may take a few minutes..."
npm run build:win

if [ ! -f "release/win-unpacked/CreatorCrafter.exe" ]; then
    echo ""
    echo "ERROR: CreatorCrafter.exe not found in build output!"
    echo "Expected location: release/win-unpacked/CreatorCrafter.exe"
    echo ""
    echo "Build output:"
    ls -la release/win-unpacked/ 2>/dev/null || echo "release/win-unpacked/ directory not found"
    exit 1
fi

echo "✓ Electron build complete"
echo ""

# Verify required files
echo "[4/5] Verifying build output..."
if [ ! -d "release/win-unpacked" ]; then
    echo "ERROR: release/win-unpacked directory not found!"
    exit 1
fi

if [ ! -f "requirements.txt" ]; then
    echo "ERROR: requirements.txt not found!"
    exit 1
fi

if [ ! -d "python" ]; then
    echo "ERROR: python directory not found!"
    exit 1
fi

echo "✓ All required files present"
echo ""

# Create the NSIS installer
echo "[5/5] Creating NSIS installer..."
echo "Running makensis..."
makensis installer.nsi

if [ ! -f "CreatorCrafter-Setup.exe" ]; then
    echo ""
    echo "ERROR: Installer not created!"
    echo "Check the makensis output above for errors."
    exit 1
fi

# Get installer size
INSTALLER_SIZE=$(du -h CreatorCrafter-Setup.exe | cut -f1)

echo ""
echo "======================================="
echo "✓ Build Complete!"
echo "======================================="
echo ""
echo "Installer created: CreatorCrafter-Setup.exe"
echo "Size: $INSTALLER_SIZE"
echo ""
echo "You can now distribute this installer to Windows users."
echo "The installer will:"
echo "  - Check for Python 3.9 (install if missing)"
echo "  - Install Python dependencies"
echo "  - Install CreatorCrafter application"
echo "  - Create desktop and start menu shortcuts"
echo ""
echo "To test on Windows:"
echo "  1. Transfer CreatorCrafter-Setup.exe to a Windows machine"
echo "  2. Run the installer as Administrator"
echo "  3. Follow the installation wizard"
echo ""
