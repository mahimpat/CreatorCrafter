# CreatorCrafter - Build Guide

## Quick Build

```bash
# Clean previous builds
sudo rm -rf dist dist-electron release

# Build Windows installer
./build.sh win
```

The installer will be at: `release/CreatorCrafter-Setup-*.exe`

---

## What's New in This Build

### 1. **Fixed Python Path Detection (Windows)**
   - ✅ Now uses `venv\Scripts\python.exe` on Windows
   - ✅ Uses `venv/bin/python` on Linux/Mac
   - ✅ Platform detection in `electron/main.ts` lines 269-271, 357-359

### 2. **Improved Build Script**
   - ✅ Automatic requirements.txt copying
   - ✅ Python bytecode compilation (.pyc files)
   - ✅ Hotfix package bundled in `release/hotfix/`
   - ✅ Better error messages and warnings
   - ✅ Wine detection for cross-platform builds

### 3. **Enhanced NSIS Installer**
   - ✅ **Shows detailed installation logs** (no more silent installer!)
   - ✅ Creates Python virtual environment during install
   - ✅ Installs all Python packages (~500MB download)
   - ✅ Downloads AI models (~500MB more)
   - ✅ Error handling with user-friendly messages
   - ✅ Creates `FIRST_RUN_INSTRUCTIONS.txt` in install directory
   - ✅ Continues installation even if Python setup fails (with warnings)

### 4. **Hotfix Package**
   - ✅ Bundled with every build in `release/hotfix/`
   - ✅ Users can fix issues post-installation
   - ✅ Includes diagnostic tools

---

## Understanding the Installer

### Installation Flow

When users run `CreatorCrafter-Setup-*.exe`:

```
[1/5] Check Python Installation
      ↓
      If not found → Show error, abort
      ↓
[2/5] Create Virtual Environment
      ↓
      Command: python -m venv "C:\Program Files\CreatorCrafter\venv"
      ↓
      If fails → Warn user, continue (they'll need hotfix)
      ↓
[3/5] Upgrade Pip
      ↓
      Command: venv\Scripts\pip.exe install --upgrade pip
      ↓
[4/5] Install Python Dependencies (5-10 minutes)
      ↓
      Command: venv\Scripts\pip.exe install -r requirements.txt
      Downloads: PyTorch, Whisper, AudioCraft, OpenCV (~500MB)
      ↓
      If fails → Warn user, continue (they'll need hotfix)
      ↓
[5/5] Download AI Models (5-10 minutes)
      ↓
      Command: venv\Scripts\python.exe download_models.pyc
      Downloads: Whisper models, AudioCraft models (~500MB)
      ↓
      If fails → Warn user, models will download on first use
      ↓
[Done] Installation Complete!
```

**Total Time:** 10-20 minutes (mostly downloads)
**Total Download:** ~1GB
**Total Disk Space:** ~2GB after installation

### Installer Logs

The installer now shows detailed output! Users will see:

```
==========================================
CreatorCrafter Installation
==========================================

[1/5] Checking Python installation...
Python found: Python 3.11.0

[2/5] Creating Python virtual environment...
Location: C:\Program Files\CreatorCrafter\venv
This may take a minute...

Virtual environment created successfully!

[3/5] Upgrading pip...

Pip upgraded successfully!

[4/5] Installing Python dependencies...
This will download ~500MB and may take 5-10 minutes...
Please be patient - the installer may appear frozen but is working!

Installing packages:
  - PyTorch (deep learning)
  - Whisper (speech recognition)
  - AudioCraft (sound generation)
  - OpenCV (video processing)
  - And more...

[actual pip output shown here...]

Python dependencies installed successfully!

[5/5] Downloading AI models...
This will download ~500MB more and may take 5-10 minutes...
Models being downloaded:
  - Whisper (speech recognition) ~150MB
  - AudioCraft (sound effects) ~300MB
  - BLIP (image understanding) ~50MB

[actual download output shown here...]

AI models downloaded successfully!

==========================================
Installation Complete!
==========================================

CreatorCrafter is now installed at:
C:\Program Files\CreatorCrafter

Python virtual environment: OK
Location: C:\Program Files\CreatorCrafter\venv

You can now close this window and launch CreatorCrafter!
```

---

## Does Windows Use Virtual Environment?

**YES!** The Windows installer:

1. ✅ Creates a Python virtual environment at `C:\Program Files\CreatorCrafter\venv`
2. ✅ Installs all packages in this isolated environment
3. ✅ The app uses this venv (NOT system Python)
4. ✅ Path: `venv\Scripts\python.exe` (Windows-specific)

**Why Virtual Environment?**
- Isolates dependencies from system Python
- Prevents version conflicts
- Easy to uninstall (just delete venv folder)
- Users can have different Python versions without issues

**What the App Uses:**

In production (after installation):
```javascript
// electron/main.ts line 269-271 and 357-359
const pythonPath = process.platform === 'win32'
  ? join(appRoot, 'venv', 'Scripts', 'python.exe')  // Windows: venv\Scripts\python.exe
  : join(appRoot, 'venv', 'bin', 'python')          // Linux/Mac: venv/bin/python
```

So yes, Windows uses `venv\Scripts\python.exe` inside the virtual environment!

---

## Building the Installer

### Prerequisites

**On Linux (for cross-platform build):**
```bash
# Install Wine for Windows builds
sudo apt-get install wine64 wine32 mono-devel

# Or skip and build on Windows directly
```

**On Windows:**
- Just need Node.js, Python, and FFmpeg

### Build Commands

```bash
# Clean everything first (important!)
sudo rm -rf dist dist-electron release

# Build Windows installer
./build.sh win

# Build for other platforms
./build.sh mac      # macOS .dmg
./build.sh linux    # Linux AppImage & .deb
./build.sh all      # All platforms
```

### What Gets Built

After running `./build.sh win`:

```
release/
├── CreatorCrafter-Setup-1.0.0.exe     ← Main installer (distribute this!)
├── win-unpacked/                       ← Unpacked app files (for debugging)
│   ├── CreatorCrafter.exe
│   ├── resources/
│   │   ├── python/                     ← Python .pyc scripts
│   │   │   ├── video_analyzer.pyc
│   │   │   ├── audiocraft_generator.pyc
│   │   │   └── download_models.pyc
│   │   └── requirements.txt
│   └── [Electron files...]
├── hotfix/                             ← Hotfix package (include if needed)
│   ├── windows-hotfix.bat
│   ├── windows-diagnostic.bat
│   ├── windows-path-fix.js
│   └── HOTFIX_README.md
└── [other build files...]
```

---

## Testing the Installer

### On a Clean Windows Machine

1. **Copy the installer:**
   ```
   release/CreatorCrafter-Setup-1.0.0.exe
   ```

2. **Prerequisites on Windows:**
   - Python 3.8+ installed from python.org
   - "Add Python to PATH" must be checked during Python install
   - FFmpeg installed and in PATH (optional, but recommended)

3. **Run the installer:**
   - Double-click the .exe
   - Follow the installation wizard
   - Watch the detailed logs (should show all 5 steps)
   - Wait 10-20 minutes for downloads

4. **Verify installation:**
   ```cmd
   cd "C:\Program Files\CreatorCrafter"
   dir venv\Scripts\python.exe
   ```
   Should show the Python executable.

5. **Test the app:**
   - Launch CreatorCrafter
   - Import a video
   - Click "Analyze Video" → Should work!
   - Try "Generate SFX" → Should work!

---

## If Installation Fails

The installer is designed to continue even if Python setup fails. It will:

1. Show a warning message
2. Continue with app installation
3. Create `FIRST_RUN_INSTRUCTIONS.txt` with fix steps

**User can then:**
1. Navigate to `C:\Program Files\CreatorCrafter`
2. Copy the hotfix files from `release/hotfix/` to this directory
3. Run `windows-hotfix.bat` as Administrator
4. Wait 10-15 minutes
5. Restart CreatorCrafter

---

## Distribution Checklist

When distributing to users:

- [ ] Build with latest code: `./build.sh win`
- [ ] Test on clean Windows VM/machine
- [ ] Verify Python venv is created during install
- [ ] Test video analysis and SFX generation
- [ ] Include hotfix package (optional but recommended):
  - Copy `release/hotfix/` folder
  - Zip it as `CreatorCrafter-Hotfix.zip`
  - Provide link if users have issues

**What to Distribute:**

**Minimum (required):**
- `CreatorCrafter-Setup-1.0.0.exe`

**Recommended (for support):**
- `CreatorCrafter-Setup-1.0.0.exe`
- `CreatorCrafter-Hotfix.zip` (the hotfix folder)
- `README_USER.md` (user documentation)

---

## Common Issues

### "Python not found during installation"

**Cause:** Python not installed or not in PATH

**Fix:**
1. Install Python from python.org
2. Check "Add Python to PATH"
3. Restart and run installer again

### "Failed to create virtual environment"

**Cause:** Python venv module missing or disk space low

**Fix:**
- Make sure Python venv is included: `python -m venv --help`
- Check disk space (need ~2GB free)
- Try running installer as Administrator

### "Failed to install Python dependencies"

**Cause:** Internet connection issues or firewall blocking

**Fix:**
- Check internet connection
- Disable antivirus/firewall temporarily
- Use hotfix after installation completes

### "App shows Python errors after installation"

**Cause:** Venv wasn't created or is corrupted

**Fix:**
1. Check if venv exists: `C:\Program Files\CreatorCrafter\venv`
2. If not, run `windows-hotfix.bat` as Administrator
3. If yes but still errors, delete venv and run hotfix

---

## Technical Details

### Python Scripts Protection

Python scripts are compiled to bytecode (.pyc) during build:

```bash
# build.sh runs this automatically:
python3 python/compile_scripts.py

# Creates:
python/dist/video_analyzer.pyc
python/dist/audiocraft_generator.pyc
python/dist/download_models.pyc
```

These .pyc files are bundled in the installer at `resources/python/`.

**Security Note:** .pyc files are NOT fully secure. They're harder to read than .py but can still be decompiled. For production, consider:
- PyInstaller (creates executables)
- Nuitka (compiles to C)
- Code obfuscation

### File Locations After Installation

```
C:\Program Files\CreatorCrafter\
├── CreatorCrafter.exe           ← Main app
├── resources\
│   ├── app.asar                 ← Electron app bundle
│   ├── python\                  ← Python scripts (protected)
│   │   ├── video_analyzer.pyc
│   │   ├── audiocraft_generator.pyc
│   │   └── download_models.pyc
│   └── requirements.txt
├── venv\                        ← Virtual environment
│   ├── Scripts\
│   │   ├── python.exe          ← Python interpreter
│   │   ├── pip.exe
│   │   └── activate.bat
│   └── Lib\                     ← Installed packages
│       └── site-packages\
│           ├── torch\
│           ├── whisper\
│           ├── audiocraft\
│           └── [more packages...]
├── FIRST_RUN_INSTRUCTIONS.txt   ← Auto-created by installer
└── [Electron runtime files...]
```

### Model Storage

AI models are downloaded to:
```
C:\Users\<Username>\.cache\
├── whisper\                     ← Whisper models (~150MB)
├── torch\hub\                   ← AudioCraft models (~300MB)
└── huggingface\                 ← BLIP models (~50MB)
```

These are cached globally and reused across reinstalls.

---

## Next Steps

1. **Build the installer:**
   ```bash
   sudo rm -rf dist dist-electron release
   ./build.sh win
   ```

2. **Test on Windows**

3. **If it works → Distribute the .exe!**

4. **If issues occur → Provide hotfix package**

5. **For next version:**
   - Consider adding FFmpeg bundling
   - Add progress bar for downloads
   - Pre-download models and bundle them (increases installer size by ~1GB)

---

## Questions?

**Q: Can I bundle the AI models in the installer?**
A: Yes, but it will increase size by ~1GB. Copy models to `resources/models/` and modify download_models.py to check there first.

**Q: Why does installation take so long?**
A: It downloads ~1GB of Python packages and AI models. This is normal for AI apps.

**Q: Can users skip the Python setup?**
A: No, the app won't work without it. But if setup fails, they can run hotfix later.

**Q: Do I need to include FFmpeg?**
A: No, users must install it separately. But you could bundle it in future versions.

**Q: What if user doesn't have Python?**
A: Installer will detect and show error message with download link.

---

**Build successfully! The installer now shows logs and properly sets up Python venv on Windows. 🎉**
