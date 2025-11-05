#!/bin/bash
# EC2 System Dependencies Installation Script
# Run this BEFORE pip install -r requirements.txt

set -e  # Exit on error

echo "=========================================="
echo "CreatorCrafter - EC2 Dependencies Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "Please run without sudo (script will ask for sudo when needed)"
    exit 1
fi

echo "[1/6] Updating system packages..."
sudo apt update
sudo apt upgrade -y

echo ""
echo "[2/6] Installing build essentials and compilation tools..."
sudo apt install -y \
    build-essential \
    pkg-config \
    cmake \
    git \
    wget \
    curl \
    unzip

echo ""
echo "[3/6] Installing FFmpeg development libraries (required for PyAV)..."
sudo apt install -y \
    ffmpeg \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev

echo ""
echo "[4/6] Installing audio/video processing libraries..."
sudo apt install -y \
    libsndfile1-dev \
    libsamplerate0-dev \
    libasound2-dev \
    portaudio19-dev \
    libportaudio2 \
    libportaudiocpp0

echo ""
echo "[5/6] Installing Python development headers and tools..."
sudo apt install -y \
    python3.11-dev \
    python3-dev \
    python3-pip \
    python3.11-venv

echo ""
echo "[6/6] Installing additional dependencies for ML libraries..."
sudo apt install -y \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libopenblas-dev \
    liblapack-dev \
    gfortran

echo ""
echo "=========================================="
echo "Verifying installations..."
echo "=========================================="
echo ""

# Verify pkg-config
echo -n "pkg-config: "
if command -v pkg-config &> /dev/null; then
    pkg-config --version
else
    echo "FAILED"
    exit 1
fi

# Verify FFmpeg libraries
echo -n "FFmpeg libraries: "
if pkg-config --exists libavformat libavcodec; then
    echo "OK"
else
    echo "FAILED"
    exit 1
fi

# Verify Python
echo -n "Python 3.11: "
python3.11 --version

# Verify pip
echo -n "pip: "
pip3 --version

echo ""
echo "=========================================="
echo "SUCCESS! All system dependencies installed"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. cd ~/CreatorCrafter"
echo "2. python3.11 -m venv venv"
echo "3. source venv/bin/activate"
echo "4. pip install -r requirements.txt"
echo ""
