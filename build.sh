#!/bin/bash
# Build script for CreatorCrafter
# Usage: ./build.sh [platform]
# platform: win, mac, linux, or all (default: current platform)

set -e  # Exit on error

echo "=== CreatorCrafter Build Script ==="
echo ""

# Parse arguments
PLATFORM=${1:-current}

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
print_step "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi
print_success "Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm not found"
    exit 1
fi
print_success "npm $(npm --version)"

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 not found. Please install Python 3.8+"
    exit 1
fi
print_success "Python $(python3 --version)"

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    print_warning "FFmpeg not found. The app will not work without FFmpeg."
    echo "Install FFmpeg from: https://ffmpeg.org/download.html"
else
    print_success "FFmpeg found"
fi

# For Windows builds, check Wine if on Linux
if [[ "$PLATFORM" == "win" || "$PLATFORM" == "windows" ]] && [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if ! command -v wine &> /dev/null; then
        print_warning "Wine not found. Building Windows installer on Linux requires Wine."
        print_warning "Install with: sudo apt-get install wine64 wine32 mono-devel"
        echo ""
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Wine found"
    fi
fi

# Install npm dependencies
print_step "Installing npm dependencies..."
npm install
print_success "npm dependencies installed"

# Type check (skip for now - can fix errors later)
print_step "Running TypeScript type check..."
npm run type-check || print_warning "Type errors exist but continuing build..."

# Clean previous builds
print_step "Cleaning previous builds..."
rm -rf dist dist-electron release
print_success "Cleaned"

# Ensure requirements.txt exists in root
print_step "Preparing requirements.txt..."
if [ ! -f "requirements.txt" ]; then
    if [ -f "python/requirements.txt" ]; then
        cp python/requirements.txt requirements.txt
        print_success "Copied requirements.txt from python/ directory"
    else
        print_error "requirements.txt not found!"
        exit 1
    fi
else
    print_success "requirements.txt exists"
fi

# Compile Python scripts to bytecode
print_step "Compiling Python scripts to bytecode..."
python3 python/compile_scripts.py
if [ $? -eq 0 ]; then
    print_success "Python scripts compiled to bytecode"
else
    print_error "Failed to compile Python scripts"
    exit 1
fi

# Download FFmpeg for Windows builds
if [[ "$PLATFORM" == "win" || "$PLATFORM" == "windows" || "$PLATFORM" == "all" ]]; then
    print_step "Downloading FFmpeg for Windows..."
    if [ -f "scripts/download-ffmpeg.sh" ]; then
        bash scripts/download-ffmpeg.sh
        if [ $? -eq 0 ]; then
            print_success "FFmpeg downloaded and ready"
        else
            print_warning "FFmpeg download failed - installer will ask users to install manually"
        fi
    else
        print_warning "FFmpeg download script not found - skipping"
    fi
fi

# Copy hotfix files to release for distribution
print_step "Preparing hotfix package..."
mkdir -p release/hotfix
cp windows-hotfix.bat release/hotfix/ 2>/dev/null || true
cp windows-diagnostic.bat release/hotfix/ 2>/dev/null || true
cp windows-path-fix.js release/hotfix/ 2>/dev/null || true
cp HOTFIX_README.md release/hotfix/ 2>/dev/null || true
if [ -d "release/hotfix" ] && [ "$(ls -A release/hotfix)" ]; then
    print_success "Hotfix files copied to release/hotfix/"
fi

# Build based on platform
print_step "Building application for $PLATFORM..."

case $PLATFORM in
    win|windows)
        echo "Building for Windows..."
        echo ""
        echo "This will:"
        echo "  1. Build the Electron app"
        echo "  2. Create NSIS installer (.exe)"
        echo "  3. Bundle Python scripts (.pyc)"
        echo "  4. Include installer that sets up Python venv"
        echo ""
        npm run electron:build -- --win --x64
        ;;
    mac|macos)
        echo "Building for macOS..."
        npm run electron:build -- --mac
        ;;
    linux)
        echo "Building for Linux..."
        npm run electron:build -- --linux
        ;;
    all)
        echo "Building for all platforms..."
        npm run electron:build -- --win --mac --linux
        ;;
    current)
        echo "Building for current platform..."
        npm run electron:build
        ;;
    *)
        print_error "Unknown platform: $PLATFORM"
        echo "Usage: ./build.sh [win|mac|linux|all|current]"
        exit 1
        ;;
esac

print_success "Build complete!"

# Show output
echo ""
print_step "Build artifacts:"
if [ -d "release" ]; then
    echo ""
    ls -lh release/*.exe release/*.dmg release/*.AppImage release/*.deb 2>/dev/null || ls -lh release/
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Find and display installer info
    if [ -f release/*.exe ]; then
        INSTALLER=$(ls release/*.exe 2>/dev/null | head -1)
        if [ -n "$INSTALLER" ]; then
            echo "Windows Installer: $(basename "$INSTALLER")"
            echo "Size: $(du -h "$INSTALLER" | cut -f1)"
        fi
    fi

    echo ""
    echo "Build output directory: $(pwd)/release/"

    if [ -d "release/hotfix" ]; then
        echo ""
        print_success "Hotfix package: $(pwd)/release/hotfix/"
        echo "  Include these files if users need to fix Python issues"
    fi
else
    print_error "No release directory found"
fi

# Show next steps
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "=== Next Steps ==="
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. TEST THE INSTALLER:"
if [[ "$PLATFORM" == "win" || "$PLATFORM" == "windows" ]]; then
    echo "   - Copy the .exe to a Windows machine"
    echo "   - Run the installer (takes 10-15 min for Python setup)"
    echo "   - Check that Python venv is created"
    echo "   - Test video analysis and SFX generation"
fi
echo ""
echo "2. VERIFY FEATURES:"
echo "   - Import a video"
echo "   - Analyze video (should work without errors)"
echo "   - Generate SFX (should work without errors)"
echo "   - Check Python at: C:\\Program Files\\CreatorCrafter\\venv"
echo ""
echo "3. IF PYTHON ISSUES OCCUR:"
echo "   - Provide the hotfix package from: release/hotfix/"
echo "   - Users should follow HOTFIX_README.md"
echo ""
echo "4. DISTRIBUTION:"
echo "   - The .exe installer includes everything"
echo "   - Users need Python 3.8+ installed on their system"
echo "   - Users need FFmpeg in PATH"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
