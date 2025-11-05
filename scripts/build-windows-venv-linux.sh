#!/bin/bash
# CreatorCrafter - Build Windows Python Environment on Linux
# Uses Wine to create Windows-compatible Python environment

set -e  # Exit on error

VERSION="${1:-1.0.0}"
OUTPUT_DIR="./dist"
VENV_NAME="venv_dist"
PACKAGE_NAME="python-env-windows-x64-v${VERSION}.zip"

echo "=========================================="
echo "CreatorCrafter Python Environment Builder"
echo "Building Windows package on Linux"
echo "=========================================="
echo ""

# Check if Wine is installed
if ! command -v wine &> /dev/null; then
    echo "ERROR: Wine is not installed"
    echo ""
    echo "Install Wine:"
    echo "  sudo dpkg --add-architecture i386"
    echo "  sudo apt update"
    echo "  sudo apt install -y wine64 wine32 winbind"
    exit 1
fi

echo "Wine version: $(wine --version)"
echo ""

# Download Windows Python 3.11 embeddable
PYTHON_URL="https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip"
PYTHON_ZIP="python-3.11.9-embed-amd64.zip"
PYTHON_DIR="python-embed"

echo "[1/10] Downloading Windows Python 3.11 embeddable..."
if [ ! -f "$PYTHON_ZIP" ]; then
    wget -q --show-progress "$PYTHON_URL" -O "$PYTHON_ZIP"
    echo "Downloaded Python"
else
    echo "Python already downloaded"
fi

# Extract Python
echo ""
echo "[2/10] Extracting Python..."
if [ -d "$PYTHON_DIR" ]; then
    rm -rf "$PYTHON_DIR"
fi
mkdir -p "$PYTHON_DIR"
unzip -q "$PYTHON_ZIP" -d "$PYTHON_DIR"

# Download get-pip.py
echo ""
echo "[3/10] Setting up pip..."
if [ ! -f "get-pip.py" ]; then
    wget -q https://bootstrap.pypa.io/get-pip.py
fi

# Install pip in embedded Python
cd "$PYTHON_DIR"
wine python.exe ../get-pip.py --no-warn-script-location
cd ..

# Set pip path
PIP_EXE="$PYTHON_DIR/Scripts/pip.exe"

# Upgrade pip
echo ""
echo "[4/10] Upgrading pip..."
wine "$PIP_EXE" install --upgrade pip setuptools wheel

# Create packages directory
PACKAGES_DIR="$PYTHON_DIR/Lib/site-packages"

echo ""
echo "[5/10] Installing NumPy..."
wine "$PIP_EXE" install numpy==1.26.4 --target "$PACKAGES_DIR"

echo ""
echo "[6/10] Installing PyTorch (CPU)..."
echo "This is ~2GB and will take 10-20 minutes..."
wine "$PIP_EXE" install torch==2.1.0 torchaudio==2.1.0 \
    --index-url https://download.pytorch.org/whl/cpu \
    --target "$PACKAGES_DIR"

echo ""
echo "[7/10] Installing AudioCraft dependencies..."
wine "$PIP_EXE" install \
    einops==0.8.1 \
    hydra-core==1.3.2 \
    omegaconf==2.3.0 \
    julius==0.2.7 \
    encodec==0.1.1 \
    flashy==0.0.2 \
    --target "$PACKAGES_DIR"

echo ""
echo "[8/10] Installing AudioCraft (without xformers)..."
wine "$PIP_EXE" install audiocraft==1.3.0 --no-deps --target "$PACKAGES_DIR"

echo ""
echo "[9/10] Installing other dependencies..."
wine "$PIP_EXE" install \
    transformers==4.35.0 \
    tokenizers==0.22.1 \
    huggingface-hub==0.36.0 \
    safetensors==0.6.2 \
    librosa==0.11.0 \
    soundfile==0.13.1 \
    opencv-python==4.8.1.78 \
    scenedetect==0.6.7.1 \
    openai-whisper==20250625 \
    Pillow==11.3.0 \
    scipy==1.16.2 \
    requests==2.32.5 \
    tqdm==4.67.1 \
    PyYAML==6.0.3 \
    --target "$PACKAGES_DIR"

# Try PyAV (optional, may fail)
echo ""
echo "Installing PyAV (optional, may fail)..."
wine "$PIP_EXE" install av==16.0.1 --target "$PACKAGES_DIR" || echo "PyAV skipped (optional)"

echo ""
echo "[10/10] Cleaning up and packaging..."

# Remove cache and unnecessary files
find "$PYTHON_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$PYTHON_DIR" -type f -name "*.pyc" -delete
find "$PYTHON_DIR" -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Rename to venv structure
mv "$PYTHON_DIR" "$VENV_NAME"

# Package
echo "Compressing package..."
zip -r -q "$OUTPUT_DIR/$PACKAGE_NAME" "$VENV_NAME"

# Calculate size
SIZE_MB=$(du -m "$OUTPUT_DIR/$PACKAGE_NAME" | cut -f1)

# Generate metadata
cat > "$OUTPUT_DIR/metadata-v${VERSION}.json" <<EOF
{
  "version": "$VERSION",
  "created": "$(date -u +"%Y-%m-%d %H:%M:%S UTC")",
  "platform": "windows-x64",
  "built_on": "linux",
  "python_version": "3.11.9",
  "packages": {
    "torch": "2.1.0",
    "torchaudio": "2.1.0",
    "audiocraft": "1.3.0",
    "whisper": "20250625",
    "transformers": "4.35.0",
    "opencv": "4.8.1.78",
    "numpy": "1.26.4"
  },
  "size_mb": $SIZE_MB,
  "file": "$PACKAGE_NAME"
}
EOF

# Generate checksum
sha256sum "$OUTPUT_DIR/$PACKAGE_NAME" > "$OUTPUT_DIR/SHA256SUMS-v${VERSION}.txt"
CHECKSUM=$(sha256sum "$OUTPUT_DIR/$PACKAGE_NAME" | cut -d' ' -f1)

# Cleanup
rm -rf "$VENV_NAME"
rm -f "$PYTHON_ZIP" "get-pip.py"

echo ""
echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo ""
echo "Package: $OUTPUT_DIR/$PACKAGE_NAME"
echo "Size: ${SIZE_MB} MB"
echo "Checksum: $CHECKSUM"
echo ""
echo "Next steps:"
echo "1. Test the package"
echo "2. Upload to GitHub/CDN"
echo "3. Update installer configuration"
echo ""
