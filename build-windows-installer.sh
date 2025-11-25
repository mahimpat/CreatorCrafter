#!/bin/bash
# Build Windows Installer for CreatorCrafter
# This script prepares all dependencies and builds the Windows installer
# Run from Linux/WSL or Windows with Git Bash

set -e

echo "========================================"
echo "CreatorCrafter Windows Installer Builder"
echo "========================================"
echo ""

# Configuration
PYTHON_VERSION="3.11.9"
FFMPEG_VERSION="7.0.2"
BUILD_DIR="$(pwd)/build-temp"
RESOURCES_DIR="$(pwd)/resources"

# Clean previous build
echo "[1/6] Cleaning previous build..."
rm -rf "$BUILD_DIR"
rm -rf "$RESOURCES_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$RESOURCES_DIR"
echo "✓ Clean complete"
echo ""

# ==========================================
# Step 2: Download and prepare FFmpeg
# ==========================================
echo "[2/6] Downloading FFmpeg for Windows..."
cd "$BUILD_DIR"

if [ ! -f "ffmpeg-${FFMPEG_VERSION}-full_build.zip" ]; then
  wget "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-full.7z" -O "ffmpeg.7z"
  echo "✓ FFmpeg downloaded"
else
  echo "✓ FFmpeg already downloaded"
fi

echo "Extracting FFmpeg..."
7z x ffmpeg.7z -o"ffmpeg-temp" -y > /dev/null

# Copy FFmpeg binaries to resources
mkdir -p "$RESOURCES_DIR/ffmpeg"
find ffmpeg-temp -name "ffmpeg.exe" -exec cp {} "$RESOURCES_DIR/ffmpeg/" \;
find ffmpeg-temp -name "ffprobe.exe" -exec cp {} "$RESOURCES_DIR/ffmpeg/" \;

if [ -f "$RESOURCES_DIR/ffmpeg/ffmpeg.exe" ]; then
  echo "✓ FFmpeg binaries extracted"
  echo "  - ffmpeg.exe: $(du -h $RESOURCES_DIR/ffmpeg/ffmpeg.exe | cut -f1)"
  echo "  - ffprobe.exe: $(du -h $RESOURCES_DIR/ffmpeg/ffprobe.exe | cut -f1)"
else
  echo "✗ Failed to extract FFmpeg binaries"
  exit 1
fi
echo ""

# ==========================================
# Step 3: Build Python environment
# ==========================================
echo "[3/6] Building Python environment..."
echo "This step creates a portable Python environment with all dependencies"
echo ""

cd "$(dirname "$0")"

# Check if we're on Windows or Linux
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  PYTHON_CMD="python"
  PIP_CMD="pip"
  VENV_PYTHON="venv_windows/Scripts/python.exe"
  VENV_PIP="venv_windows/Scripts/pip.exe"
else
  # Cross-compile for Windows from Linux (not recommended, better to build on Windows)
  echo "WARNING: Building Windows installer from Linux"
  echo "For best results, build on Windows machine"
  echo ""
  PYTHON_CMD="python3"
  PIP_CMD="pip3"
  VENV_PYTHON="venv_windows/bin/python"
  VENV_PIP="venv_windows/bin/pip"
fi

# Create fresh virtual environment
rm -rf venv_windows
$PYTHON_CMD -m venv venv_windows

echo "Installing Python dependencies..."
$VENV_PIP install --upgrade pip
$VENV_PIP install -r requirements.txt

# Verify critical packages
echo ""
echo "Verifying installations..."
$VENV_PYTHON -c "import torch; print(f'✓ PyTorch {torch.__version__}')"
$VENV_PYTHON -c "import whisper; print('✓ Whisper')"
$VENV_PYTHON -c "import audiocraft; print('✓ AudioCraft')"
$VENV_PYTHON -c "import transformers; print('✓ Transformers')"
$VENV_PYTHON -c "import cv2; print(f'✓ OpenCV {cv2.__version__}')"
echo ""

# ==========================================
# Step 4: Package Python environment
# ==========================================
echo "[4/6] Packaging Python environment..."

cd "$BUILD_DIR"
echo "Creating python-env.zip (this may take 5-10 minutes)..."
cd "$(dirname "$0")"

# Create ZIP of venv_windows
zip -r "$BUILD_DIR/python-env.zip" venv_windows -q

if [ -f "$BUILD_DIR/python-env.zip" ]; then
  SIZE=$(du -h "$BUILD_DIR/python-env.zip" | cut -f1)
  echo "✓ Python environment packaged: $SIZE"

  # Move to resources for bundling
  mv "$BUILD_DIR/python-env.zip" "$RESOURCES_DIR/python-env.zip"
else
  echo "✗ Failed to package Python environment"
  exit 1
fi
echo ""

# ==========================================
# Step 5: Build Electron app
# ==========================================
echo "[5/6] Building Electron application..."
npm run build

if [ ! -d "dist" ] || [ ! -d "dist-electron" ]; then
  echo "✗ Electron build failed"
  exit 1
fi
echo "✓ Electron build complete"
echo ""

# ==========================================
# Step 6: Create Windows installer
# ==========================================
echo "[6/6] Creating Windows installer with electron-builder..."
echo ""

# Update package.json to include bundled resources
# electron-builder will package python-env.zip and FFmpeg into the installer

electron-builder --win --x64 --config.extraResources="[
  {
    \"from\": \"python\",
    \"to\": \"python\",
    \"filter\": [\"*.py\", \"!compile_scripts.py\", \"!build_executables.py\"]
  },
  {
    \"from\": \"requirements.txt\",
    \"to\": \"requirements.txt\"
  },
  {
    \"from\": \"resources/python-env.zip\",
    \"to\": \"python-env.zip\"
  },
  {
    \"from\": \"resources/ffmpeg\",
    \"to\": \"ffmpeg\",
    \"filter\": [\"*.exe\"]
  }
]"

echo ""
echo "========================================"
echo "Build Complete!"
echo "========================================"
echo ""
echo "Installer location:"
find release -name "*.exe" -type f
echo ""
echo "Installer includes:"
echo "  ✓ CreatorCrafter application"
echo "  ✓ Python environment (~1.5GB)"
echo "  ✓ FFmpeg binaries"
echo "  ✓ All Python dependencies"
echo ""
echo "Installer size: ~2GB (bundled with all dependencies)"
echo "No internet required for installation!"
echo "AI models will download on first use (~2GB additional)"
echo ""
