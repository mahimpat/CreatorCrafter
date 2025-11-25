# Building Windows Installer for CreatorCrafter

This guide explains how to build the Windows installer with all dependencies bundled.

## Prerequisites

The build must be done on a **Windows machine** with:
- Windows 10/11
- Python 3.11 or newer
- Node.js 18 or newer
- Git (optional)
- Internet connection

## Quick Build (Recommended)

1. **Clone or download** this repository to your Windows machine

2. **Run the build script**:
   ```cmd
   build-windows.bat
   ```

3. **Wait** for completion (5-10 minutes):
   - Downloads FFmpeg (~110MB)
   - Installs npm dependencies
   - Builds Electron app
   - Creates installer with electron-builder

4. **Find your installer** in:
   ```
   release\CreatorCrafter Setup 1.0.0.exe
   ```

## What the Installer Includes

The installer uses a **system Python approach** instead of bundling Python:

### Installer Process:
1. **Checks for Python 3.11+**
   - If not found, downloads and installs Python 3.11.9 automatically
   - Adds Python to PATH
   - Silent installation (no user interaction needed)

2. **Installs CreatorCrafter Application**
   - Electron app (~50MB)
   - Python scripts
   - FFmpeg binaries (~100MB)

3. **Creates Virtual Environment**
   - Creates `venv` in installation directory
   - Isolated from system Python packages

4. **Installs Python Dependencies**
   - PyTorch (CPU version)
   - Whisper (speech recognition)
   - AudioCraft (SFX generation)
   - OpenCV, Transformers, etc.
   - Total: ~1.5GB of dependencies

5. **Configures Environment**
   - Creates .env file
   - Sets up paths
   - Verifies installations

### Installation Requirements:
- **Disk space**: ~2GB (app + dependencies)
- **Internet**: Required for Python dependency installation
- **Time**: 10-15 minutes
- **User interaction**: Minimal (just click Next/Install)

## Installer Advantages

### Why System Python?
- **Smaller installer**: ~100MB instead of ~2GB
- **Faster download**: Users download installer quickly
- **Shared installation**: Uses existing Python if available
- **Easy updates**: User can update Python independently
- **Standard approach**: Follows Windows software conventions

### Automatic Python Installation:
If Python 3.11+ not found, the installer:
1. Downloads Python 3.11.9 from python.org (~30MB)
2. Installs silently with default options
3. Adds to PATH automatically
4. Installs pip
5. Continues with CreatorCrafter installation

## Manual Build Steps

If the automated script fails, you can build manually:

### 1. Install Dependencies
```cmd
npm install
```

### 2. Download FFmpeg
Download from: https://github.com/BtbN/FFmpeg-Builds/releases

Extract `ffmpeg.exe` and `ffprobe.exe` to:
```
resources\ffmpeg\
```

### 3. Build Application
```cmd
npm run build
```

### 4. Create Installer
```cmd
npx electron-builder --win --x64
```

## Configuration Files

### package.json
```json
{
  "build": {
    "win": {
      "target": ["nsis"]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "include": "build/installer-system-python.nsh"
    }
  }
}
```

### installer-system-python.nsh
Custom NSIS script that:
- Checks/installs Python
- Creates virtual environment
- Installs dependencies via pip
- Sets up FFmpeg
- Creates shortcuts

## Installer Features

### For Users:
✅ One-click installation
✅ Automatic Python installation if needed
✅ No manual dependency setup
✅ Choose installation directory
✅ Desktop shortcut created
✅ Start menu shortcut created
✅ Uninstaller included

### For Developers:
✅ Standard NSIS installer
✅ Easy to customize
✅ Detailed progress display
✅ Error handling and recovery
✅ Verification steps
✅ Clean uninstallation

## Troubleshooting

### Build Fails on Linux
- This build must run on Windows
- electron-builder needs Windows to create .exe

### FFmpeg Download Fails
- Check internet connection
- Download manually and place in `resources/ffmpeg/`
- Or update URL in `build-windows.bat`

### npm install Fails
- Try: `npm install --legacy-peer-deps`
- Clear cache: `npm cache clean --force`
- Delete `node_modules` and retry

### electron-builder Fails
- Check disk space (need ~5GB free)
- Try: `npm run build` first
- Check antivirus isn't blocking

## Distribution

The final installer (`CreatorCrafter Setup 1.0.0.exe`) can be distributed to users via:
- Direct download
- GitHub Releases
- Website download link
- USB drive
- etc.

Users simply run the .exe and follow the installer prompts.

## File Sizes

- **Installer**: ~100MB (includes FFmpeg + app, no Python)
- **Python download**: ~30MB (if not installed)
- **Installation size**: ~2GB total after dependencies
- **AI models**: ~2GB additional (downloads on first use)

## First Run

After installation, users can immediately launch the app. On first use:
- AI models download automatically (~2GB)
- First video analysis: ~5 minutes (Whisper model)
- First SFX generation: ~10 minutes (AudioCraft model)
- Subsequent uses: Instant (models cached)

## Support

For build issues:
1. Check this documentation
2. Review build logs in terminal
3. Check GitHub Issues
4. Contact development team
