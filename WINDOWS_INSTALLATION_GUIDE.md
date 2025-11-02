# Windows Installation Guide - CreatorCrafter

## Quick Start (Recommended Method)

**Having installation issues?** Use the improved hotfix script:

```batch
windows-hotfix-v2.bat
```

Right-click and select **"Run as Administrator"** for best results.

---

## Common Installation Error

### "No module named 'torch'" or "Failed to build 'xformers'"

**This is the #1 most common error on Windows - and it's completely OK!**

#### What's Happening:
- xformers is an **optional** dependency of audiocraft
- It requires C++ compilation tools (Visual Studio Build Tools)
- Most Windows systems don't have these tools installed
- The app works **perfectly fine** without xformers (only 10-15% slower)

#### Quick Fix:
Run the new hotfix script:
```batch
windows-hotfix-v2.bat
```

This script:
- ✅ Installs PyTorch CPU version first (avoids xformers dependency issues)
- ✅ Installs other dependencies individually with binary wheels
- ✅ Handles xformers failures gracefully
- ✅ Provides clear progress messages

**Expected Time:** 10-20 minutes (downloads ~2GB of packages)

---

## What the Hotfix Does Differently

### Old Script Issues:
- ❌ Installed all packages at once
- ❌ Let xformers try to compile from source
- ❌ Failed with confusing error messages

### New Script (v2) Improvements:
- ✅ Installs PyTorch **first** (before other packages)
- ✅ Uses CPU-only PyTorch (no CUDA complications)
- ✅ Installs packages individually for better error handling
- ✅ Suppresses xformers errors (they're harmless)
- ✅ Clear messaging that xformers is optional

---

## Installation Steps

### 1. Prerequisites

Before running the script, ensure you have:

- **Python 3.8, 3.9, 3.10, or 3.11** (3.10 recommended)
  - Download from: https://www.python.org/downloads/
  - ⚠️ **IMPORTANT:** Check "Add Python to PATH" during installation!

- **~3GB free disk space**
  - Python packages: ~2GB
  - AI models: ~500MB

- **Stable internet connection**
  - Will download 1-2GB of packages

### 2. Run the Hotfix Script

1. Open the CreatorCrafter folder
2. Right-click `windows-hotfix-v2.bat`
3. Select **"Run as Administrator"**
4. Wait for completion (10-20 minutes)

### 3. What to Expect

The script will:
```
[1/7] Checking Python installation...
[2/7] Checking Python version compatibility...
[3/7] Creating Python virtual environment...
[4/7] Upgrading pip, setuptools, wheel...
[5/7] Installing PyTorch (CPU version)...
[6/7] Installing other dependencies...
[7/7] Downloading AI models...
```

### 4. Expected Warnings (Normal)

You may see these - **they're OK**:
- ⚠️ "Failed to build xformers" - **IGNORE THIS**
- ⚠️ "No module named 'torch' (during xformers build)" - **IGNORE THIS**
- ⚠️ "Could not build wheels for xformers" - **IGNORE THIS**

**Why these are OK:**
- xformers is optional
- audiocraft works fine without it
- Only provides minor speedup (~10-15%)
- Not worth the compilation hassle on Windows

---

## Verification

After installation completes, verify everything works:

```batch
# Activate the virtual environment
venv\Scripts\activate

# Test PyTorch
python -c "import torch; print(f'PyTorch {torch.__version__} installed')"

# Test Whisper (speech recognition)
python -c "import whisper; print('Whisper installed')"

# Test Transformers (BLIP vision model)
python -c "import transformers; print('Transformers installed')"

# Test AudioCraft (may show xformers warning - ignore it)
python -c "from audiocraft.models import MusicGen; print('AudioCraft installed')"
```

If all imports succeed, **you're ready to use the app!**

---

## Alternative Installation Methods

If the hotfix script doesn't work, try these alternatives:

### Method 2: Manual Installation

```batch
# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Upgrade pip
python -m pip install --upgrade pip setuptools wheel

# Install PyTorch FIRST
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install Windows-specific requirements
pip install -r requirements-windows.txt

# Download AI models
python python/download_models.py
```

### Method 3: Anaconda (Most Reliable)

```batch
# Download Anaconda from: https://www.anaconda.com/download

# Create environment
conda create -n creatorcrafter python=3.10
conda activate creatorcrafter

# Install PyTorch
conda install pytorch torchvision torchaudio cpuonly -c pytorch

# Install other dependencies
pip install -r requirements-windows.txt

# Download models
python python/download_models.py
```

---

## Troubleshooting

### Issue: "Python not found"

**Solution:**
1. Download Python from https://www.python.org/downloads/
2. During installation, **check "Add Python to PATH"**
3. Restart your computer
4. Verify: Open Command Prompt and type `python --version`

### Issue: "Permission denied"

**Solution:**
1. Run the hotfix script as Administrator (right-click → Run as Administrator)
2. Temporarily disable antivirus during installation
3. Add CreatorCrafter folder to antivirus exceptions

### Issue: Installation seems stuck

**This is NORMAL** - the installation involves:
- Downloading 1-2GB of packages
- Installing large libraries (PyTorch, scipy, librosa)
- Downloading AI models (~500MB)

**What to look for:**
- If you see "Preparing metadata" - wait 5-10 minutes
- If you see "Installing" or "Downloading" - wait, it's working
- Only force-quit if truly frozen (no disk activity) for 30+ minutes

### Issue: "CUDA error" or "No GPU found"

**This is OK!** The CPU version works fine and is actually:
- ✅ More compatible
- ✅ Easier to install
- ✅ Sufficient for most video editing tasks

---

## Understanding xformers

### What is xformers?
- Memory-efficient attention library
- Optional dependency of audiocraft
- Provides minor speedup (~10-15%)

### Why it fails on Windows:
1. Requires C++ compilation (Visual Studio Build Tools)
2. Most users don't have build tools installed
3. Installing build tools takes ~6GB and 30+ minutes
4. Not worth it for such small speedup

### Why you don't need it:
- ✅ AudioCraft works perfectly without xformers
- ✅ SFX generation still works
- ✅ Only slightly slower (barely noticeable)
- ✅ Saves installation headaches

**Bottom line:** xformers errors are NORMAL and HARMLESS on Windows!

---

## Expected Installation Time

- **Fast internet (50+ Mbps):** 10-15 minutes
- **Medium internet (10-50 Mbps):** 20-30 minutes
- **Slow internet (<10 Mbps):** 45-60 minutes

**First-time downloads:**
- Python packages: 1-2GB
- AI models: ~500MB
- Total: ~2-3GB

---

## After Installation

### Starting the App

```batch
# Development mode (with hot reload)
npm run electron:dev

# Production build
npm run electron:build
```

### Verify AI Features Work

1. Create a new project
2. Import a video
3. Click "Analyze Video" (tests Whisper + BLIP)
4. Click "Generate SFX" (tests AudioCraft)

If both work, your installation is complete!

---

## Quick Reference

### ✅ Recommended Python Versions
- Python 3.10 (Best compatibility)
- Python 3.11 (Works well)
- Python 3.9 (Older but stable)

### ⚠️ Avoid
- Python 3.12 (May have compatibility issues)
- Python 3.7 or below (Too old)

### 📦 Required Disk Space
- Python environment: ~2GB
- AI models: ~500MB
- App files: ~200MB
- **Total: ~3GB free space needed**

### ⏱️ Installation Time
- Script execution: 10-20 minutes
- Model downloads: 5-10 minutes (first run only)
- **Total: 15-30 minutes**

---

## Still Having Issues?

If you've tried all methods and still can't install:

1. **Check your Python version:**
   ```batch
   python --version
   ```
   Should be 3.8-3.11

2. **Check your pip version:**
   ```batch
   pip --version
   ```
   Should be 20.0+

3. **Try the nuclear option:**
   ```batch
   # Remove old environment
   rmdir /s /q venv

   # Install PyTorch only
   python -m venv venv
   venv\Scripts\activate
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

   # Test PyTorch
   python -c "import torch; print('PyTorch works!')"

   # Then continue with other packages
   ```

4. **Check the detailed troubleshooting guide:**
   See `WINDOWS_TROUBLESHOOTING.md` for comprehensive solutions

---

## Summary

✅ **Use `windows-hotfix-v2.bat` for easiest installation**
✅ **xformers errors are NORMAL and HARMLESS**
✅ **App works perfectly without xformers**
✅ **Expected time: 15-30 minutes**
✅ **Run as Administrator for best results**

**Don't panic if you see xformers errors - just continue!**

The app is production-ready and will work great on your Windows system. 🚀

---

## Need More Help?

- **Detailed troubleshooting:** `WINDOWS_TROUBLESHOOTING.md`
- **Alternative hotfix:** `windows-hotfix.bat` (older version)
- **Report issues:** Check the project repository for issue tracker

**Happy editing!** 🎬
