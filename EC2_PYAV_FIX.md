# EC2 PyAV Installation Fix

**Quick fix for "pkg-config is required for building PyAV" error on EC2**

---

## The Error

When running `pip install -r requirements.txt` on EC2, you get:

```
ERROR: Could not build wheels for av, which is required to install pyproject.toml-based projects
pkg-config is required for building PyAV
```

---

## The Problem

PyAV (the `av` package) requires:
1. **pkg-config** - Build configuration tool
2. **FFmpeg development libraries** - Video/audio codec libraries
3. **Python development headers** - For building C extensions

These are **NOT** included in a standard Ubuntu EC2 instance.

---

## Quick Fix (Manual)

Run these commands on your EC2 instance:

```bash
# Install pkg-config
sudo apt install -y pkg-config

# Install FFmpeg development libraries
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
    portaudio19-dev

# Install Python development headers
sudo apt install -y python3.11-dev

# Now retry pip install
pip install -r requirements.txt
```

---

## Automated Fix (Recommended)

Use the provided setup script:

```bash
# Navigate to project directory
cd ~/CreatorCrafter

# Make script executable
chmod +x setup-ec2-dependencies.sh

# Run the script (it will ask for sudo password)
./setup-ec2-dependencies.sh

# After script completes, set up venv and install
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Verification

After installing dependencies, verify they're available:

```bash
# Check pkg-config
pkg-config --version
# Should output: 0.29.2 (or similar)

# Check FFmpeg libraries
pkg-config --list-all | grep libav
# Should show: libavcodec, libavformat, libavutil, etc.

# Check Python headers
dpkg -l | grep python3.11-dev
# Should show: python3.11-dev installed

# Test PyAV installation specifically
pip install av
# Should complete without errors
```

---

## Why This Happens

### On Windows (User Machines)
- PyPI provides **pre-built wheels** for PyAV
- Wheels include all necessary FFmpeg libraries
- Installation is simple: `pip install av` ✅

### On Linux (EC2)
- PyPI has **limited pre-built wheels** for Linux
- pip must **compile PyAV from source**
- Requires FFmpeg development libraries
- Requires build tools (pkg-config, gcc)
- Without these: Installation fails ❌

---

## Complete System Dependencies List

For reference, here's everything needed on EC2:

### Build Tools
```bash
sudo apt install -y \
    build-essential \
    pkg-config \
    cmake \
    git
```

### FFmpeg (Runtime + Development)
```bash
sudo apt install -y \
    ffmpeg \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev
```

### Audio Libraries
```bash
sudo apt install -y \
    libsndfile1-dev \
    libsamplerate0-dev \
    libasound2-dev \
    portaudio19-dev \
    libportaudio2
```

### Python Development
```bash
sudo apt install -y \
    python3.11-dev \
    python3-dev \
    python3-pip
```

### Image Processing (for Pillow, OpenCV)
```bash
sudo apt install -y \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev
```

### Scientific Computing (for numpy, scipy)
```bash
sudo apt install -y \
    libopenblas-dev \
    liblapack-dev \
    gfortran
```

---

## Alternative: Use Conda (Advanced)

If you continue having issues with pip, consider using Conda:

```bash
# Install Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh -b
~/miniconda3/bin/conda init bash
source ~/.bashrc

# Create conda environment
conda create -n creatorcrafter python=3.11 -y
conda activate creatorcrafter

# Install PyAV via conda-forge (has pre-built binaries)
conda install -c conda-forge av ffmpeg -y

# Install other requirements
pip install -r requirements.txt
```

**Advantage:** Conda handles system dependencies automatically
**Disadvantage:** Larger environment size (~2GB vs ~1GB with pip)

---

## Troubleshooting

### Error: "libavcodec.so: cannot open shared object file"

**Fix:** Install runtime libraries:
```bash
sudo apt install -y libavcodec-extra libavformat-dev
sudo ldconfig
```

---

### Error: "fatal error: portaudio.h: No such file or directory"

**Fix:** Install portaudio development files:
```bash
sudo apt install -y portaudio19-dev
pip install pyaudio  # May be needed
```

---

### Error: "gcc: command not found"

**Fix:** Install build tools:
```bash
sudo apt install -y build-essential
```

---

### Still Failing?

Try installing PyAV separately first:
```bash
# Activate venv
source venv/bin/activate

# Install PyAV with verbose output
pip install av -v

# If it succeeds, continue with requirements
pip install -r requirements.txt
```

---

## Summary

**Problem:** PyAV requires system libraries not included in EC2
**Solution:** Install FFmpeg dev libraries + pkg-config
**Script:** Use `setup-ec2-dependencies.sh` for automated setup
**Verification:** Run `pkg-config --list-all | grep libav`

After installing system dependencies, `pip install -r requirements.txt` should work! ✅
