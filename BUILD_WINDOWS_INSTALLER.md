# Building the Windows Installer (from Linux)

## Quick Build Command

```bash
npx electron-builder --win --x64 --config.win.target=squirrel
```

**Output:** `release/squirrel-windows/CreatorCrafter Setup 1.0.0.exe` (247MB)

## What Gets Built

✅ **Squirrel.Windows Installer**
- Self-extracting executable
- Includes application + FFmpeg + Python scripts
- Auto-updates supported
- Built successfully from Ubuntu Linux

## Build Contents

The installer includes:

1. **CreatorCrafter App** (~50MB)
   - Electron application
   - React frontend
   - IPC handlers

2. **FFmpeg Binaries** (~367MB)
   - `ffmpeg.exe` (184MB)
   - `ffprobe.exe` (183MB)

3. **Python Scripts** (~5MB)
   - 29 Python files for AI processing
   - Video analysis, SFX generation, etc.

4. **Setup Scripts**
   - `setup-dependencies.bat` - User launcher
   - `squirrel-setup.ps1` - PowerShell automation
   - `SETUP_README.txt` - User instructions

5. **Configuration**
   - `requirements.txt` - Python dependencies list
   - `.env` template (created by setup)

## Build Requirements

- Node.js 18+
- npm packages installed
- FFmpeg binaries in `resources/ffmpeg/`
- Internet connection (downloads Squirrel tools)

## Build Process

### 1. Clean Previous Build (Optional)

```bash
rm -rf release/squirrel-windows release/win-unpacked
```

### 2. Run Build

```bash
npx electron-builder --win --x64 --config.win.target=squirrel
```

### 3. Build Steps (Automatic)

```
• packaging       platform=win32 arch=x64 electron=28.3.3
• building        target=Squirrel.Windows arch=x64
• downloading     Squirrel.Windows tools
• creating        installer
```

**Time:** ~2-3 minutes

### 4. Output Location

```
release/
├── squirrel-windows/
│   ├── CreatorCrafter Setup 1.0.0.exe    (247MB) ← DISTRIBUTE THIS
│   ├── ai-content-creator-1.0.0-full.nupkg
│   └── RELEASES
└── win-unpacked/                          (for testing)
```

## Configuration (package.json)

The build is configured in `package.json`:

```json
{
  "build": {
    "win": {
      "target": [
        {
          "target": "squirrel",
          "arch": ["x64"]
        }
      ]
    },
    "extraResources": [
      {
        "from": "python",
        "to": "python",
        "filter": ["*.py", "!compile_scripts.py", "!build_executables.py"]
      },
      {
        "from": "requirements.txt",
        "to": "requirements.txt"
      },
      {
        "from": "build/squirrel-setup.ps1",
        "to": "squirrel-setup.ps1"
      },
      {
        "from": "build/setup-dependencies.bat",
        "to": "setup-dependencies.bat"
      },
      {
        "from": "resources/ffmpeg",
        "to": "ffmpeg",
        "filter": ["*.exe"]
      },
      {
        "from": "build/SETUP_README.txt",
        "to": "SETUP_README.txt"
      }
    ]
  }
}
```

## Verification

After build completes, verify:

```bash
# Check installer exists
ls -lh release/squirrel-windows/CreatorCrafter*.exe

# Check setup scripts
ls release/win-unpacked/resources/*.{bat,ps1}

# Check FFmpeg
ls -lh release/win-unpacked/resources/ffmpeg/

# Check Python files
ls release/win-unpacked/resources/python/ | wc -l
```

Expected output:
- ✅ Installer: 247MB
- ✅ Setup scripts: 3 files
- ✅ FFmpeg: 2 files (367MB total)
- ✅ Python: 29 files

## Distribution

Distribute the installer:

```
release/squirrel-windows/CreatorCrafter Setup 1.0.0.exe
```

Users will:
1. Run the installer (30 seconds)
2. Run `setup-dependencies.bat` (10-15 minutes)
3. Launch CreatorCrafter

## Troubleshooting Build Issues

### "FFmpeg not found in build"

**Solution:**
```bash
# Download FFmpeg using the build script
./build-windows-from-linux.sh
# Or manually download to resources/ffmpeg/
```

### "electron-builder fails"

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try again
npx electron-builder --win --x64 --config.win.target=squirrel
```

### "Squirrel download fails"

**Solution:**
- Check internet connection
- Try again (may be temporary)
- Check if behind firewall/proxy

## Build Variants

### Current: Squirrel.Windows
```bash
npx electron-builder --win --x64 --config.win.target=squirrel
```
✅ Works from Linux
✅ Auto-update support
✅ 247MB installer
❌ Requires manual dependency setup

### Alternative: Portable
```bash
npx electron-builder --win --x64 --config.win.target=portable
```
✅ Single .exe file
✅ No installation needed
❌ Larger file (~450MB)
❌ Still needs dependency setup

### Alternative: NSIS (Windows only)
```bash
# On Windows machine:
build-windows.bat
```
✅ Automatic Python installation
✅ Smaller installer (~100MB)
❌ Requires Windows to build
❌ Custom NSIS script doesn't work from Linux

## File Size Breakdown

| Component | Size |
|-----------|------|
| Electron App | ~50MB |
| FFmpeg binaries | ~367MB |
| Python scripts | ~5MB |
| Setup scripts | <1MB |
| Squirrel overhead | ~25MB |
| **Total Installer** | **247MB** |

After installation:
- Installed app: ~450MB
- Python dependencies: ~1.5GB (after setup)
- AI models: ~2GB (on first use)
- **Total**: ~4GB

## Comparison with Other Methods

| Method | Installer Size | Build Platform | Auto-Install Deps |
|--------|----------------|----------------|-------------------|
| Squirrel.Windows (current) | 247MB | Linux ✅ | No ❌ |
| NSIS (custom) | 100MB | Windows only | Yes ✅ |
| Portable + bundled Python | ~500MB | Linux ✅ | Partial |
| Portable (current) | ~450MB | Linux ✅ | No ❌ |

## Notes

- Built on Ubuntu 22.04 LTS
- Uses electron-builder 24.13.3
- Squirrel.Windows 1.9.0
- Electron 28.3.3
- Node.js 20.13.1

## Next Steps After Build

1. ✅ Test installer on Windows VM/machine
2. ✅ Verify setup-dependencies.bat works
3. ✅ Test first launch and AI features
4. ✅ Upload to GitHub Releases or hosting
5. ✅ Create release notes
6. ✅ Share with users

## Quick Rebuild Script

Create `build-squirrel.sh`:

```bash
#!/bin/bash
echo "Building Windows installer..."
rm -rf release/squirrel-windows release/win-unpacked
npx electron-builder --win --x64 --config.win.target=squirrel
echo "Build complete!"
ls -lh release/squirrel-windows/CreatorCrafter*.exe
```

Then just run:
```bash
./build-squirrel.sh
```

## Support

See also:
- `INSTALLATION_GUIDE.md` - User installation instructions
- `WINDOWS_INSTALLER_INSTRUCTIONS.md` - Detailed installer info
- `BUILD_INSTALLER.md` - Original NSIS build docs
