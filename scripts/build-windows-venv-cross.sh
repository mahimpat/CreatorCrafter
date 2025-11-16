#!/bin/bash
# CreatorCrafter - Cross-platform Windows Python Environment Builder
# Downloads Windows wheels directly without Wine
# Works on Linux, macOS, or WSL

set -e

VERSION="${1:-1.0.0}"
OUTPUT_DIR="./dist"
VENV_NAME="venv_windows"
PACKAGE_NAME="python-env-windows-x64-v${VERSION}.zip"

echo "=========================================="
echo "Windows Python Environment Builder"
echo "Cross-platform build (no Wine needed)"
echo "=========================================="
echo ""

# Create directories
mkdir -p "$VENV_NAME/Lib/site-packages"
mkdir -p "$VENV_NAME/Scripts"
mkdir -p "$OUTPUT_DIR"

SITE_PACKAGES="$VENV_NAME/Lib/site-packages"

# Download Windows Python 3.9 embeddable
echo "[1/12] Downloading Windows Python 3.9..."
PYTHON_URL="https://www.python.org/ftp/python/3.9.13/python-3.9.13-embed-amd64.zip"
wget -q --show-progress "$PYTHON_URL" -O python-embed.zip

echo "Extracting Python..."
unzip -q python-embed.zip -d "$VENV_NAME"
rm python-embed.zip

# Download pip for Windows
echo ""
echo "[2/12] Setting up pip..."
wget -q https://bootstrap.pypa.io/get-pip.py -O "$VENV_NAME/get-pip.py"

# Create pip wrapper script
cat > "$VENV_NAME/install_package.py" << 'PYEOF'
import sys
import subprocess
import os

# Use the embedded Python
python_exe = os.path.join(os.path.dirname(__file__), 'python.exe')
pip_script = os.path.join(os.path.dirname(__file__), 'get-pip.py')

# Install pip first
if not os.path.exists(os.path.join(os.path.dirname(__file__), 'Scripts', 'pip.exe')):
    subprocess.run([python_exe, pip_script, '--no-warn-script-location'], check=True)

# Install requested package
site_packages = os.path.join(os.path.dirname(__file__), 'Lib', 'site-packages')
pip_exe = os.path.join(os.path.dirname(__file__), 'Scripts', 'pip.exe')

args = [pip_exe, 'install', '--target', site_packages, '--only-binary=:all:'] + sys.argv[1:]
subprocess.run(args, check=True)
PYEOF

# Function to download Windows wheels using pip download
download_package() {
    local package=$1
    local temp_dir="temp_wheels"

    echo "Downloading $package..."

    mkdir -p "$temp_dir"

    # Download Windows wheels for Python 3.9
    pip download \
        --only-binary=:all: \
        --platform win_amd64 \
        --python-version 39 \
        --implementation cp \
        --abi cp39 \
        "$package" \
        -d "$temp_dir" \
        2>/dev/null || true

    # Extract wheels to site-packages
    for wheel in "$temp_dir"/*.whl; do
        if [ -f "$wheel" ]; then
            echo "  Extracting $(basename $wheel)..."
            unzip -q -o "$wheel" -d "$SITE_PACKAGES"
        fi
    done

    rm -rf "$temp_dir"
}

echo ""
echo "[3/12] Installing NumPy 1.26.4..."
download_package "numpy==1.26.4"

echo ""
echo "[4/12] Installing PyTorch 2.1.0 (CPU)..."
echo "This is ~2GB and may take 10-20 minutes..."

# Download PyTorch from official source
TORCH_URL="https://download.pytorch.org/whl/cpu/torch-2.1.0%2Bcpu-cp311-cp311-win_amd64.whl"
TORCHAUDIO_URL="https://download.pytorch.org/whl/cpu/torchaudio-2.1.0%2Bcpu-cp311-cp311-win_amd64.whl"

wget -q --show-progress "$TORCH_URL" -O torch.whl
unzip -q -o torch.whl -d "$SITE_PACKAGES"
rm torch.whl

wget -q --show-progress "$TORCHAUDIO_URL" -O torchaudio.whl
unzip -q -o torchaudio.whl -d "$SITE_PACKAGES"
rm torchaudio.whl

echo ""
echo "[5/12] Installing AudioCraft dependencies..."
download_package "einops==0.8.1"
download_package "hydra-core==1.3.2"
download_package "omegaconf==2.3.0"
download_package "julius==0.2.7"
download_package "encodec==0.1.1"

echo ""
echo "[6/12] Installing AudioCraft 1.3.0..."
download_package "audiocraft==1.3.0"

echo ""
echo "[7/12] Installing Transformers..."
download_package "transformers==4.35.0"
download_package "tokenizers==0.22.1"
download_package "huggingface-hub==0.36.0"
download_package "safetensors==0.6.2"

echo ""
echo "[8/12] Installing audio processing..."
download_package "librosa==0.11.0"
download_package "soundfile==0.13.1"
download_package "audioread==3.0.1"

echo ""
echo "[9/12] Installing video processing..."
download_package "opencv-python==4.8.1.78"
download_package "scenedetect==0.6.7.1"

echo ""
echo "[10/12] Installing Whisper..."
download_package "openai-whisper==20250625"

echo ""
echo "[11/12] Installing utilities..."
download_package "Pillow==11.3.0"
download_package "scipy==1.16.2"
download_package "requests==2.32.5"
download_package "tqdm==4.67.1"
download_package "PyYAML==6.0.3"
download_package "packaging==25.0"
download_package "filelock==3.20.0"
download_package "regex==2025.10.23"

# Try PyAV (optional)
echo ""
echo "Installing PyAV (optional)..."
download_package "av==16.0.1" || echo "PyAV skipped (optional)"

echo ""
echo "[12/12] Cleaning and packaging..."

# Remove unnecessary files
find "$VENV_NAME" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$VENV_NAME" -type f -name "*.pyc" -delete 2>/dev/null || true
find "$VENV_NAME" -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find "$VENV_NAME" -type d -name "testing" -exec rm -rf {} + 2>/dev/null || true
rm -f "$VENV_NAME/get-pip.py" "$VENV_NAME/install_package.py"

# Remove .dist-info directories to reduce size
find "$SITE_PACKAGES" -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true

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
  "built_on": "$(uname -s)",
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
  "file": "$PACKAGE_NAME",
  "build_method": "cross-platform"
}
EOF

# Generate checksum
sha256sum "$OUTPUT_DIR/$PACKAGE_NAME" | tee "$OUTPUT_DIR/SHA256SUMS-v${VERSION}.txt"
CHECKSUM=$(sha256sum "$OUTPUT_DIR/$PACKAGE_NAME" | cut -d' ' -f1)

# Cleanup
rm -rf "$VENV_NAME"

echo ""
echo "=========================================="
echo "✅ Build Complete!"
echo "=========================================="
echo ""
echo "Package: $OUTPUT_DIR/$PACKAGE_NAME"
echo "Size: ${SIZE_MB} MB"
echo "Checksum: $CHECKSUM"
echo ""
echo "Next steps:"
echo "1. Test on Windows machine"
echo "2. Upload to GitHub/CDN"
echo "3. Update installer configuration"
echo ""
