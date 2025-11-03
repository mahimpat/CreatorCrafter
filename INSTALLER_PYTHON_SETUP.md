# CreatorCrafter Installer - Automatic Python Setup

**Date:** November 2, 2025
**Status:** ✅ Configured for automatic Python environment setup

---

## Problem Solved

**Issue:** After installing CreatorCrafter, clicking "Analyze Video" button fails because:
1. Python virtual environment doesn't exist
2. Dependencies aren't installed
3. AI models aren't downloaded

**Solution:** The NSIS installer now automatically handles Python setup during installation.

---

## How the Installer Works

### Installation Steps (Automatic)

The installer performs these steps automatically:

1. **Check Python Installation**
   - Verifies Python 3.8+ is installed
   - If not found, shows helpful error message with download link

2. **Create Virtual Environment**
   - Creates `venv` folder in installation directory
   - Configures isolated Python environment

3. **Upgrade Pip**
   - Ensures latest pip version for reliable installs

4. **Install PyTorch First** (NEW!)
   - Installs PyTorch CPU version (~2GB)
   - Uses CPU-only to avoid CUDA complications
   - Installed BEFORE other packages (critical for xformers)

5. **Install Other Dependencies**
   - numpy, scipy, Pillow, opencv-python
   - transformers, librosa, soundfile, scenedetect
   - openai-whisper
   - audiocraft (xformers warnings expected and OK)

6. **Download AI Models**
   - Whisper (speech recognition) ~150MB
   - BLIP (image captioning) ~50MB
   - AudioCraft (sound generation) ~300MB

### Expected Installation Time

- **Fast Internet (50+ Mbps):** 15-25 minutes
- **Medium Internet (10-50 Mbps):** 25-40 minutes
- **Slow Internet (<10 Mbps):** 45-60 minutes

### Expected Downloads

- **Python Dependencies:** ~2GB
- **AI Models:** ~500MB
- **Total:** ~2.5GB

---

## What's Different from Before

### Old Approach (Manual)
❌ User had to run `windows-hotfix.bat` manually after install
❌ Confusing errors if user forgot this step
❌ Extra manual step required

### New Approach (Automatic)
✅ Installer handles Python setup automatically
✅ User can start using the app immediately
✅ Backup hotfix script (`windows-hotfix-v3.bat`) included if needed

---

## Files Included in Installer

The NSIS installer now includes:

1. **Application Files**
   - Compiled Electron app
   - React frontend (dist/)
   - Python scripts (.pyc files)
   - FFmpeg binaries

2. **Setup Files**
   - `requirements.txt` - Python dependencies
   - `requirements-windows.txt` - Windows-specific deps
   - `windows-hotfix-v3.bat` - Manual setup fallback

3. **Documentation**
   - `FIRST_RUN_INSTRUCTIONS.txt` - Created during install
   - All README and guide files

---

## Installer Configuration

### package.json Updates

```json
{
  "build": {
    "extraResources": [
      {
        "from": "requirements-windows.txt",
        "to": "requirements-windows.txt"
      },
      {
        "from": "windows-hotfix-v3.bat",
        "to": "../windows-hotfix-v3.bat"
      }
    ],
    "nsis": {
      "include": "build/installer.nsh"
    }
  }
}
```

### build/installer.nsh Updates

The NSIS script now:
- Installs PyTorch FIRST (before other packages)
- Uses CPU-only PyTorch (avoids CUDA issues)
- Installs dependencies individually (more reliable)
- Handles xformers failures gracefully
- Provides detailed progress messages
- Creates fallback instructions

---

## User Experience

### What Users See

```
=========================================
CreatorCrafter Installation
=========================================

[1/5] Checking Python installation...
Python found: Python 3.11.9

[2/5] Creating Python virtual environment...
Location: C:\Program Files\CreatorCrafter\venv
Virtual environment created successfully!

[3/5] Upgrading pip...
Pip upgraded successfully!

[4/5] Installing Python dependencies...
This will download ~2GB and may take 10-20 minutes...

Step 1/2: Installing PyTorch (CPU version)...
✓ PyTorch installed successfully!

Step 2/2: Installing other dependencies...
Installing: numpy, scipy, Pillow, opencv-python...
Installing: transformers, librosa, soundfile, scenedetect...
Installing: openai-whisper...
Installing: audiocraft (xformers warnings are NORMAL)...
✓ All dependencies installed successfully!

[5/5] Downloading AI models...
✓ AI models downloaded!

==========================================
Installation Complete!
==========================================

Python virtual environment: OK
You can now close this window and launch CreatorCrafter!
```

---

## Fallback Options

### If Installer Fails

If Python setup fails during installation, users have options:

**Option 1: Run the Hotfix Script**
```batch
# Navigate to installation folder
cd "C:\Program Files\CreatorCrafter"

# Right-click and "Run as Administrator"
windows-hotfix-v3.bat
```

**Option 2: Manual Setup**
```batch
# Create venv
python -m venv venv

# Activate
venv\Scripts\activate

# Install PyTorch first
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install other deps
pip install -r requirements-windows.txt

# Download models
python resources\python\download_models.pyc
```

---

## Error Handling

### Python Not Found

**Error Message:**
```
ERROR: Python not found!

Please install Python 3.8 or higher from:
https://www.python.org/downloads/

Make sure to check 'Add Python to PATH' during installation.
Then run this installer again.
```

**Solution:** User installs Python and reruns installer

---

### Venv Creation Failed

**Error Message:**
```
Failed to create Python virtual environment.

This might happen if:
- Python venv module is not installed
- Disk space is low
- Antivirus is blocking

Click OK to continue (you'll need to run windows-hotfix-v3.bat)
Click Cancel to abort installation
```

**Solution:** User can continue and use hotfix script

---

### PyTorch Installation Failed

**Error Message:**
```
Failed to install PyTorch.

This might happen if:
- Internet connection is slow/interrupted
- Disk space is low (<3GB)
- Antivirus is blocking downloads

Click OK to continue (you'll need to run windows-hotfix-v3.bat)
Click Cancel to abort installation
```

**Solution:** User can continue and use hotfix script

---

### xformers Warnings (Normal)

**Message:**
```
WARNING: AudioCraft installation had warnings (likely xformers)
This is NORMAL on Windows - the app should still work!
```

**Explanation:** xformers is optional, app works fine without it

---

## Testing the Installer

### Prerequisites for Building

```bash
# Ensure all files exist
npm run build                    # Build app
python/compile_scripts.py        # Compile Python to .pyc
npm run electron:build           # Create installer
```

### What to Test

1. **Fresh Windows Install**
   - Run installer on clean Windows system
   - Verify Python setup completes
   - Launch app and test "Analyze Video"

2. **Without Internet**
   - Verify installer shows helpful error
   - Verify hotfix script is available

3. **Python Already Installed**
   - Verify installer detects Python
   - Verify venv creation works

4. **Python Not Installed**
   - Verify clear error message
   - Verify Python download link provided

---

## Known Issues & Limitations

### xformers Compilation

**Issue:** xformers may fail to build on Windows
**Impact:** None - audiocraft works without it
**Solution:** Installer handles this gracefully

### Large Downloads

**Issue:** 2.5GB download takes time
**Impact:** Installation may seem slow
**Solution:** Clear progress messages during install

### Antivirus Interference

**Issue:** Some antivirus software blocks pip installs
**Impact:** Installation may fail
**Solution:** User can disable temporarily or use hotfix

---

## Verification

### How to Verify Setup Worked

After installation, check:

1. **Venv Exists**
   ```
   C:\Program Files\CreatorCrafter\venv\Scripts\python.exe
   ```

2. **Dependencies Installed**
   ```batch
   venv\Scripts\python.exe -c "import torch; print('PyTorch:', torch.__version__)"
   venv\Scripts\python.exe -c "import whisper; print('Whisper: OK')"
   venv\Scripts\python.exe -c "from audiocraft.models import MusicGen; print('AudioCraft: OK')"
   ```

3. **Models Downloaded**
   - Check `%USERPROFILE%\.cache\huggingface` for models

4. **App Works**
   - Launch CreatorCrafter
   - Import a video
   - Click "Analyze Video"
   - Should complete without errors

---

## Maintenance

### Updating the Installer

If Python dependencies change:

1. Update `requirements-windows.txt`
2. Update `build/installer.nsh` if installation steps change
3. Update `windows-hotfix-v3.bat` to match
4. Rebuild and test installer

### Adding New Dependencies

```nsh
; In build/installer.nsh, add to Step 2:
DetailPrint "Installing: your-new-package..."
nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install --prefer-binary your-new-package'
```

---

## Summary

✅ **Installer now handles Python setup automatically**
✅ **PyTorch installed first (critical for Windows)**
✅ **xformers failures handled gracefully**
✅ **Fallback hotfix script included**
✅ **Clear error messages and instructions**
✅ **Detailed progress during installation**

**Result:** Users can install and use CreatorCrafter without manual Python setup!

---

## Building the Installer

### Commands

```bash
# Full build process
npm run type-check          # Verify TypeScript
npm run build               # Build web assets
python python/compile_scripts.py  # Compile Python to .pyc
npm run electron:build      # Create installer

# Output
release/CreatorCrafter Setup 1.0.0.exe
```

### Distribution

The installer can be distributed as:
- Direct download (.exe file)
- Hosted on website
- GitHub releases
- App stores

**Size:** ~300MB (before user data downloads)
**Install Size:** ~3GB (after all downloads)

---

**Status:** ✅ Ready for production use
**Last Updated:** November 2, 2025
