# EC2 Installation Guide - Tested Versions

**This guide uses the EXACT package versions from your working laptop**

---

## Step-by-Step Installation on EC2

### Step 1: Install System Dependencies

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install build tools
sudo apt install -y build-essential pkg-config cmake git wget

# Install Python 3.11 with dev headers
sudo apt install -y python3.11 python3.11-dev python3.11-venv python3-pip

# Install FFmpeg and development libraries (CRITICAL for PyAV)
sudo apt install -y \
    ffmpeg \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev

# Install audio libraries
sudo apt install -y \
    libsndfile1-dev \
    libsamplerate0-dev \
    libasound2-dev \
    portaudio19-dev

# Install image processing libraries
sudo apt install -y \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libopenblas-dev \
    liblapack-dev \
    gfortran

# Verify installations
pkg-config --version
python3.11 --version
ffmpeg -version
```

---

### Step 2: Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone repository
git clone https://github.com/YOUR_USERNAME/CreatorCrafter.git
cd CreatorCrafter

# Checkout the branch with fixes
git checkout mvp-complete-typescript-fixes
```

---

### Step 3: Set Up Python Environment

```bash
# Create virtual environment with Python 3.11
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Verify Python version
python --version
# Should show: Python 3.11.x

# Upgrade pip
pip install --upgrade pip setuptools wheel
```

---

### Step 4: Install PyTorch FIRST

**CRITICAL: Install PyTorch before other packages to avoid xformers errors**

```bash
# Install PyTorch CPU version (tested: 2.8.0)
pip install torch==2.8.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cpu

# This will download ~2GB and take 5-10 minutes

# Verify PyTorch installation
python -c "import torch; print('PyTorch version:', torch.__version__)"
# Should print: PyTorch version: 2.8.0
```

---

### Step 5: Install Other Dependencies

```bash
# Install using tested versions from working laptop
pip install -r requirements-ec2-tested.txt

# This will take 10-20 minutes
# You may see warnings about xformers - IGNORE THEM (expected and OK)
```

**Expected warnings (SAFE TO IGNORE):**
```
WARNING: Failed building wheel for xformers
ERROR: Could not build wheels for xformers
```

These are normal! AudioCraft works fine without xformers on CPU.

---

### Step 6: Verify Installation

```bash
# Test critical imports
python << 'EOF'
import torch
print(f"✓ PyTorch {torch.__version__}")

import torchaudio
print(f"✓ TorchAudio {torchaudio.__version__}")

import whisper
print("✓ OpenAI Whisper")

import transformers
print(f"✓ Transformers {transformers.__version__}")

import audiocraft
print(f"✓ AudioCraft {audiocraft.__version__}")

import cv2
print(f"✓ OpenCV {cv2.__version__}")

import librosa
print("✓ Librosa")

import av
print(f"✓ PyAV {av.__version__}")

print("\n✅ All packages installed successfully!")
EOF
```

**Expected output:**
```
✓ PyTorch 2.8.0
✓ TorchAudio 2.8.0
✓ OpenAI Whisper
✓ Transformers 4.57.1
✓ AudioCraft 1.3.0
✓ OpenCV 4.8.1.78
✓ Librosa
✓ PyAV 16.0.1

✅ All packages installed successfully!
```

---

### Step 7: Test Python Scripts

```bash
# Test video analyzer
python python/video_analyzer.py --help

# Test audiocraft generator
python python/audiocraft_generator.py --help

# If both show help text, scripts are working!
```

---

## Troubleshooting

### Error: "Python.h: No such file or directory"

**Fix:**
```bash
sudo apt install -y python3.11-dev
```

---

### Error: "pkg-config is required"

**Fix:**
```bash
sudo apt install -y pkg-config
```

---

### Error: "libavcodec not found"

**Fix:**
```bash
sudo apt install -y libavcodec-dev libavformat-dev libavutil-dev
```

---

### Error: "xformers failed to build"

**Not a problem!** This is expected on CPU-only systems. AudioCraft works without xformers.

---

### Error: "av failed to build"

**Fix:**
```bash
# Install all FFmpeg development libraries
sudo apt install -y \
    ffmpeg \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev

# Try installing av separately
pip install av==16.0.1
```

---

### Error: Module import fails

**Check Python version:**
```bash
python --version
```
Must be Python 3.11.x (not 3.12!)

**Recreate venv if needed:**
```bash
deactivate
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
# Reinstall packages
```

---

## Package Versions Summary

**Tested and working on laptop:**

| Package | Version | Notes |
|---------|---------|-------|
| Python | 3.11.x | Must use 3.11, not 3.12 |
| torch | 2.8.0 | Install FIRST with CPU index |
| torchaudio | 2.8.0 | Matches torch version |
| audiocraft | 1.3.0 | Core SFX generation |
| openai-whisper | 20250625 | Video transcription |
| transformers | 4.57.1 | AI models |
| opencv-python | 4.8.1.78 | Video processing |
| numpy | 1.26.4 | Must be < 2.0 |
| scipy | 1.16.2 | Audio analysis |
| librosa | 0.11.0 | Audio processing |
| Pillow | 11.3.0 | Image processing |
| av | 16.0.1 | FFmpeg bindings |

---

## Installation Time Estimates

- **System dependencies:** 5 minutes
- **PyTorch installation:** 5-10 minutes
- **Other packages:** 10-20 minutes
- **Total:** ~20-35 minutes

---

## Disk Space Requirements

- Base Ubuntu: 8 GB
- System packages: 2 GB
- Python packages: 4 GB
- AI models (downloaded on first use): 1.5 GB
- **Total:** ~16 GB minimum
- **Recommended:** 30 GB for builds + models

---

## Next Steps After Installation

### Option A: Build Windows Installer

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Wine (for Windows builds)
sudo dpkg --add-architecture i386
sudo mkdir -pm755 /etc/apt/keyrings
sudo wget -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key
sudo wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/ubuntu/dists/jammy/winehq-jammy.sources
sudo apt update
sudo apt install -y --install-recommends winehq-stable

# Install npm dependencies
npm install

# Build Windows installer
npm run electron:build:win
```

---

### Option B: Set Up Web Server

See `AWS_EC2_DEPLOYMENT_GUIDE.md` for web hosting setup.

---

## Success Criteria

✅ All Python imports work
✅ `python/video_analyzer.py --help` shows help
✅ `python/audiocraft_generator.py --help` shows help
✅ No import errors when testing modules

**You're ready to build or deploy!** 🎉

---

## Quick Reference Commands

```bash
# Activate venv
source ~/CreatorCrafter/venv/bin/activate

# Check installed packages
pip list

# Test specific package
python -c "import audiocraft; print(audiocraft.__version__)"

# Reinstall specific package
pip install --force-reinstall audiocraft==1.3.0

# Clear pip cache (if issues)
pip cache purge

# Deactivate venv
deactivate
```
