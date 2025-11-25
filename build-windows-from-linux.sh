#!/bin/bash
# Build Windows Installer from Linux
# Uses electron-builder with Wine

set -e

echo "========================================"
echo "CreatorCrafter Windows Build (from Linux)"
echo "========================================"
echo ""

# Check dependencies
echo "Checking dependencies..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found"
    echo "Install: sudo apt install nodejs npm"
    exit 1
fi

if ! command -v wine &> /dev/null; then
    echo "WARNING: Wine not found (optional, but recommended)"
    echo "Install: sudo apt install wine64"
    echo ""
fi

echo "✓ Node.js found: $(node --version)"
echo "✓ npm found: $(npm --version)"
echo ""

# Install npm dependencies
echo "[1/5] Installing npm dependencies..."
npm install
echo "✓ npm dependencies installed"
echo ""

# Download FFmpeg for Windows
echo "[2/5] Downloading FFmpeg for Windows..."
mkdir -p resources/ffmpeg

if [ ! -f "resources/ffmpeg/ffmpeg.exe" ]; then
    echo "Downloading FFmpeg binaries..."
    cd resources/ffmpeg
    wget -q --show-progress "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -O ffmpeg-win.zip

    echo "Extracting FFmpeg..."
    unzip -j ffmpeg-win.zip "*/bin/ffmpeg.exe" "*/bin/ffprobe.exe"
    rm ffmpeg-win.zip

    cd ../..
    echo "✓ FFmpeg downloaded and extracted"
else
    echo "✓ FFmpeg already present"
fi

ls -lh resources/ffmpeg/
echo ""

# Build Electron app
echo "[3/5] Building Electron application..."
npm run build

if [ ! -d "dist" ] || [ ! -d "dist-electron" ]; then
    echo "✗ Electron build failed"
    exit 1
fi
echo "✓ Electron build complete"
echo ""

# Create portable Python environment instructions
echo "[4/5] Creating Python environment setup script..."

cat > resources/setup-python.bat << 'EOFBAT'
@echo off
REM CreatorCrafter Python Setup
REM Run this after installation to setup Python dependencies

echo ========================================
echo CreatorCrafter Python Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.11+ is required
    echo.
    echo Please install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo Python found!
echo.

REM Get the installation directory
set INSTALL_DIR=%~dp0..

echo Creating virtual environment...
python -m venv "%INSTALL_DIR%\venv"

echo.
echo Installing dependencies (this takes 10-15 minutes)...
echo Please be patient...
echo.

"%INSTALL_DIR%\venv\Scripts\python.exe" -m pip install --upgrade pip
"%INSTALL_DIR%\venv\Scripts\pip.exe" install -r "%INSTALL_DIR%\resources\requirements.txt"

if errorlevel 1 (
    echo.
    echo WARNING: Some dependencies may have failed
    echo Application might not work correctly
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Python environment created at:
echo %INSTALL_DIR%\venv
echo.
echo You can now launch CreatorCrafter
echo.
pause
EOFBAT

echo "✓ Python setup script created"
echo ""

# Build Windows installer
echo "[5/5] Building Windows installer..."
echo ""
echo "This will create a Windows .exe installer"
echo "Wine will be used for Windows-specific parts"
echo ""

# Use electron-builder to create Windows installer
npx electron-builder --win --x64

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Build Complete!"
    echo "========================================"
    echo ""
    echo "Installer location:"
    find release -name "*.exe" -type f
    echo ""
    echo "Installer contents:"
    echo "  ✓ CreatorCrafter application"
    echo "  ✓ FFmpeg binaries"
    echo "  ✓ Python scripts"
    echo "  ✓ Python setup script (resources/setup-python.bat)"
    echo ""
    echo "Installation process for users:"
    echo "  1. Run the installer (.exe)"
    echo "  2. Install CreatorCrafter"
    echo "  3. Run setup-python.bat from installation folder"
    echo "  4. Wait for Python dependencies to install"
    echo "  5. Launch CreatorCrafter"
    echo ""
    echo "Note: This installer requires users to have Python 3.11+ installed"
    echo "Or use build-windows.bat on actual Windows for auto-Python-install"
    echo ""
else
    echo ""
    echo "========================================"
    echo "Build Failed"
    echo "========================================"
    echo ""
    echo "Possible issues:"
    echo "  - Wine not installed (install: sudo apt install wine64)"
    echo "  - Insufficient disk space"
    echo "  - Missing dependencies"
    echo ""
    echo "Try running on actual Windows machine for best results"
    echo ""
    exit 1
fi
