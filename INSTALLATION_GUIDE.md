# CreatorCrafter Installation Guide

## 📦 What You Have

**Installer:** `CreatorCrafter Setup 1.0.0.exe` (247MB)

Built successfully on Ubuntu Linux using Squirrel.Windows!

## 🚀 Installation Steps for End Users

### Step 1: Run the Installer

1. Download `CreatorCrafter Setup 1.0.0.exe`
2. Double-click to run the installer
3. The app will be installed to: `%LOCALAPPDATA%\CreatorCrafter\`
4. Shortcuts will be created automatically

**Installation takes ~30 seconds**

### Step 2: Install Python Dependencies (REQUIRED)

After the installer completes, you **must** run the dependency setup:

#### Method 1: From Start Menu (Easiest)
1. Open Start Menu
2. Find "CreatorCrafter"
3. Right-click → "Open file location"
4. Double-click `setup-dependencies.bat`

#### Method 2: Manual Navigation
1. Press `Win + R`
2. Type: `%LOCALAPPDATA%\CreatorCrafter`
3. Press Enter
4. Double-click `setup-dependencies.bat`

### What the Setup Script Does

The `setup-dependencies.bat` script will:

```
[1/4] Checking Python installation...
      ↓ If Python 3.11+ not found:
        → Downloads Python 3.11.9 (~30MB)
        → Installs silently
        → Adds to PATH
      ↓ If Python found:
        → Continues to next step

[2/4] Creating Python virtual environment...
      → Creates isolated environment in installation folder
      → Takes 1-2 minutes

[3/4] Installing Python dependencies...
      → PyTorch (CPU version) - ~800MB
      → Whisper (speech recognition) - ~150MB
      → AudioCraft (SFX generation) - ~200MB
      → OpenCV, Transformers, etc. - ~350MB
      → Takes 10-15 minutes
      → Total: ~1.5GB

[4/4] Creating configuration...
      → Sets up .env file
      → Configures Python and FFmpeg paths
      → Verifies installations
```

**Total setup time: 10-20 minutes**

### Step 3: Launch CreatorCrafter

Once setup completes:
1. Close the setup window
2. Launch CreatorCrafter from Start Menu or Desktop shortcut

## 📋 System Requirements

- **OS:** Windows 10/11 (64-bit)
- **Python:** 3.11+ (auto-installed if missing)
- **Disk Space:** ~4GB total
  - App + FFmpeg: ~450MB
  - Python dependencies: ~1.5GB
  - AI models: ~2GB (downloaded on first use)
- **Internet:** Required for initial setup and model downloads

## 🎯 First Run Experience

When you first use CreatorCrafter:

- **First video analysis:** ~5 minutes
  - Whisper model downloads (~500MB)
  - After this, analysis is instant

- **First SFX generation:** ~10 minutes
  - AudioCraft model downloads (~1GB)
  - After this, generation is much faster

- **All subsequent uses:** Near-instant!

Models are cached and reused.

## 📁 What's Installed

The installer includes:

✅ **CreatorCrafter Application** (~50MB)
- Electron-based desktop app
- React frontend
- Video editing interface

✅ **FFmpeg Binaries** (~367MB)
- ffmpeg.exe (184MB)
- ffprobe.exe (183MB)
- Used for video processing

✅ **Python Scripts** (~5MB)
- AI/ML processing scripts
- Video analysis
- SFX generation
- Caption generation

✅ **Setup Scripts**
- `setup-dependencies.bat` - User-friendly launcher
- `squirrel-setup.ps1` - PowerShell setup script
- `SETUP_README.txt` - Quick reference guide

✅ **Configuration Files**
- `requirements.txt` - Python dependencies
- `.env` - Environment configuration (created during setup)

## 🔧 Troubleshooting

### "Python not found" Error

**Solution:**
1. The setup script should auto-install Python
2. If it fails, manually download Python from: https://www.python.org/downloads/
3. Install Python 3.11+
4. Make sure to check "Add Python to PATH" during installation
5. Run `setup-dependencies.bat` again

### "Dependency installation failed"

**Solution:**
1. Check your internet connection
2. Run `setup-dependencies.bat` as Administrator
3. If errors persist, manually install:
   ```cmd
   cd %LOCALAPPDATA%\CreatorCrafter
   venv\Scripts\pip install -r resources\requirements.txt
   ```

### "FFmpeg not found"

**Solution:**
1. Check that `%LOCALAPPDATA%\CreatorCrafter\resources\ffmpeg\ffmpeg.exe` exists
2. If missing, reinstall CreatorCrafter
3. Check `.env` file for correct path

### App won't launch after setup

**Solution:**
1. Check Windows Event Viewer for errors
2. Try running as Administrator
3. Reinstall the application
4. Check antivirus isn't blocking the app

## 📊 Installer Details

### File Locations

After installation:
```
%LOCALAPPDATA%\CreatorCrafter\
├── CreatorCrafter.exe          (Main app)
├── resources\
│   ├── ffmpeg\
│   │   ├── ffmpeg.exe
│   │   └── ffprobe.exe
│   ├── python\                 (AI scripts)
│   ├── requirements.txt
│   ├── setup-dependencies.bat
│   ├── squirrel-setup.ps1
│   └── SETUP_README.txt
├── venv\                       (Created by setup)
│   ├── Scripts\
│   │   ├── python.exe
│   │   └── pip.exe
│   └── Lib\
└── .env                        (Created by setup)
```

### Shortcuts Created

- **Start Menu:** Start → CreatorCrafter
- **Desktop:** CreatorCrafter (if selected)

### Uninstallation

To uninstall:
1. Go to: Windows Settings → Apps → Installed Apps
2. Find "CreatorCrafter"
3. Click "Uninstall"

Or use the uninstaller at:
```
%LOCALAPPDATA%\CreatorCrafter\Update.exe --uninstall
```

**Note:** AI models cache (~2GB) in `%USERPROFILE%\.cache` is NOT removed automatically. Delete manually if needed.

## 🏗️ Developer Information

### How This Installer Was Built

- **Platform:** Built on Ubuntu Linux
- **Tool:** electron-builder with Squirrel.Windows
- **Size:** 247MB compressed
- **Includes:** App, FFmpeg, Python scripts, setup tools
- **Does NOT include:** Python runtime (auto-installed), Python packages (installed by setup)

### Why Two-Step Installation?

This approach:
- ✅ Smaller initial download (247MB vs ~2GB)
- ✅ Faster installation (30 seconds vs 15+ minutes)
- ✅ Uses system Python if available
- ✅ User can update Python independently
- ✅ Standard pattern for Python-based apps
- ✅ Can be built from Linux (no Windows machine needed)

### Rebuilding the Installer

From Ubuntu/Linux:
```bash
# Build installer
npx electron-builder --win --x64 --config.win.target=squirrel

# Output location
release/squirrel-windows/CreatorCrafter Setup 1.0.0.exe
```

## 📞 Support

If users encounter issues:

1. Read `SETUP_README.txt` in installation folder
2. Check this guide's troubleshooting section
3. Verify system requirements
4. Check internet connection
5. Try running setup as Administrator
6. Contact support with error messages

## ✨ Summary

**For Users:**
1. ⬇️ Download installer (247MB)
2. 🚀 Run installer (30 seconds)
3. ⚙️ Run setup-dependencies.bat (10-15 minutes)
4. 🎬 Launch CreatorCrafter and start creating!

**Total time to full setup: ~20 minutes**

After initial setup, everything is instant! 🚀
