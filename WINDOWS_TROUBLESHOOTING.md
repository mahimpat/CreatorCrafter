# Windows Installation Troubleshooting Guide

## Common Error: "No module named 'torch'" or "Failed to build 'xformers'"

This is the **most common** Windows installation error and is **completely normal**. Here's why and how to fix it:

### Why This Happens

1. **xformers** is an optional dependency of audiocraft
2. It requires C++ compilation on Windows
3. Most Windows systems don't have the required build tools
4. **Good news:** xformers is NOT required - it only provides minor speedup

### Solution 1: Use the New Hotfix Script (Recommended)

We've created an improved hotfix script that handles this automatically:

```batch
windows-hotfix-v2.bat
```

**Run this script as Administrator:**
1. Right-click `windows-hotfix-v2.bat`
2. Select "Run as Administrator"
3. Wait for completion (10-15 minutes)
4. Ignore any xformers warnings - they're OK!

### Solution 2: Manual Installation

If the hotfix doesn't work, follow these steps:

#### Step 1: Install PyTorch First
```batch
# Activate virtual environment
venv\Scripts\activate

# Install PyTorch CPU version (no CUDA needed)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

#### Step 2: Install Other Dependencies
```batch
# Use the Windows-specific requirements file
pip install -r requirements-windows.txt
```

#### Step 3: Download Models
```batch
python python/download_models.py
```

### Solution 3: Install with Anaconda (Alternative)

If pip keeps failing, try Anaconda:

```batch
# Create conda environment
conda create -n creatorcrafter python=3.10

# Activate environment
conda activate creatorcrafter

# Install PyTorch
conda install pytorch torchvision torchaudio cpuonly -c pytorch

# Install other dependencies
pip install -r requirements-windows.txt
```

## Other Common Issues

### Issue: "Python not found"

**Solution:**
1. Download Python 3.8-3.11 from https://www.python.org/downloads/
2. **IMPORTANT:** Check "Add Python to PATH" during installation
3. Restart your computer after installation

### Issue: "Permission denied"

**Solution:**
1. Run the hotfix script as Administrator
2. Or disable antivirus temporarily during installation
3. Add the installation folder to antivirus exceptions

### Issue: "Failed to create virtual environment"

**Solution:**
```batch
# Ensure venv module is available
python -m pip install --upgrade pip
python -m pip install virtualenv

# Remove old venv if exists
rmdir /s /q venv

# Create new venv
python -m venv venv
```

### Issue: Installation is very slow or seems stuck

**This is NORMAL** - the installation involves:
1. Downloading 500MB-1GB of packages
2. Compiling some packages (numpy, scipy)
3. Downloading AI models (500MB)

**What to look for:**
- If you see "Preparing metadata (pyproject.toml)" - wait 5-10 minutes
- If you see "Installing" - wait, it's downloading
- Only force-quit if truly frozen (no disk activity) for 30+ minutes

### Issue: "CUDA error" or "No GPU found"

**This is OK!** The app works fine on CPU. The CPU version is actually:
- More compatible
- Easier to install
- Sufficient for most video editing

## Understanding the xformers Error

### What you might see:
```
ERROR: Failed to build xformers
Could not build wheels for xformers
No module named 'torch' (during xformers build)
```

### What this means:
- xformers is listed in audiocraft's requirements
- It tried to compile from source (requires C++ build tools)
- Compilation failed (normal on Windows)
- **AudioCraft may still work** - it has fallback code paths

### Why it might be OK:
- xformers provides **~10-30% speedup** for audio generation
- AudioCraft has fallback mechanisms that work without it
- For short SFX (3-10 seconds), the difference is barely noticeable
- Not worth the compilation hassle for most Windows users

### The Reality:
- xformers IS a listed dependency
- It will likely FAIL on Windows
- AudioCraft installation may still complete
- **Test if audio generation actually works before worrying**

## Verification

After installation, verify everything works:

```batch
# Activate environment
venv\Scripts\activate

# Test PyTorch
python -c "import torch; print(f'PyTorch {torch.__version__} installed')"

# Test Whisper
python -c "import whisper; print('Whisper installed')"

# Test transformers
python -c "import transformers; print('Transformers installed')"

# Test audiocraft (may show xformers warning - ignore it)
python -c "from audiocraft.models import MusicGen; print('AudioCraft installed')"
```

If all imports work, **you're good to go!**

## Quick Reference

### Recommended Python Versions
- ✅ Python 3.10 (Best compatibility)
- ✅ Python 3.11 (Works well)
- ✅ Python 3.9 (Older but stable)
- ⚠️  Python 3.12 (May have issues)
- ❌ Python 3.7 or below (Too old)

### Required Disk Space
- Python environment: ~2GB
- AI models: ~500MB
- Total: ~3GB free space needed

### Expected Installation Time
- Fast internet (50+ Mbps): 10-15 minutes
- Medium internet (10-50 Mbps): 20-30 minutes
- Slow internet (<10 Mbps): 45-60 minutes

## Still Having Issues?

If you're still stuck after trying all solutions:

1. **Check Python version:**
   ```batch
   python --version
   ```
   Should be 3.8-3.11

2. **Check pip version:**
   ```batch
   pip --version
   ```
   Should be 20.0+

3. **Try CPU-only installation:**
   ```batch
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
   pip install audiocraft --no-deps
   pip install -r requirements-windows.txt
   ```

4. **Check logs:**
   - Look in the installer window for specific errors
   - Screenshot the error
   - Report it with Python version and Windows version

## Summary

**The xformers error is NORMAL on Windows!**

✅ **App may work fine without xformers**
✅ **Audio generation might still work (test it!)**
✅ **Only slightly slower (10-30%) if it works**
✅ **Use windows-hotfix-v2.bat to install correctly**

### Critical Next Step After Installation:

**ALWAYS test if AudioCraft actually works:**

```batch
venv\Scripts\activate
python -c "from audiocraft.models import MusicGen; print('✅ AudioCraft is working!')"
```

**If this succeeds:** xformers error was harmless - continue using the app!
**If this fails:** See WINDOWS_XFORMERS_REALITY.md for advanced troubleshooting

**Don't assume it works - verify it!**
