# CreatorCrafter Windows Installer

## What You've Built

✅ **Squirrel.Windows Installer** - Successfully built from Ubuntu Linux!

Location: `release/squirrel-windows/CreatorCrafter Setup 1.0.0.exe`

## Installer Contents

The installer includes:
- ✅ CreatorCrafter Electron application (~50MB)
- ✅ FFmpeg binaries for Windows (~367MB total)
  - ffmpeg.exe (184MB)
  - ffprobe.exe (183MB)
- ✅ Python scripts for AI processing
- ✅ requirements.txt for Python dependencies
- ✅ PowerShell setup script (squirrel-setup.ps1)
- ✅ Batch launcher (setup-dependencies.bat)

**Total installer size: ~247MB**

## How the Installer Works

### For End Users:

1. **Download and run** `CreatorCrafter Setup 1.0.0.exe`

2. **Squirrel installs** the application to:
   ```
   %LOCALAPPDATA%\CreatorCrafter\
   ```

3. **After installation**, users must run the dependency setup:
   - Navigate to installation folder
   - Run `setup-dependencies.bat`
   - This will:
     - Check for Python 3.11+ (download/install if missing)
     - Create virtual environment
     - Install AI dependencies (~1.5GB)
     - Configure FFmpeg paths

4. **Launch CreatorCrafter** from Start Menu or Desktop

### Installation Process (Detailed)

#### Phase 1: Squirrel Installation
- Extracts application to `%LOCALAPPDATA%\CreatorCrafter\`
- Creates Start Menu shortcut
- Creates Desktop shortcut (optional)
- Extracts all bundled files including FFmpeg

#### Phase 2: Python Setup (Manual)
Users run `setup-dependencies.bat` which:

1. **Python Check**
   - Checks for Python 3.11+
   - If not found, offers to download Python 3.11.9 (~30MB)
   - Installs Python silently with pip

2. **Virtual Environment**
   - Creates `venv` in installation directory
   - Isolated from system Python packages

3. **Dependency Installation** (~10-15 minutes)
   - PyTorch (CPU version) - ~800MB
   - Whisper (speech recognition) - ~150MB
   - AudioCraft (SFX generation) - ~200MB
   - OpenCV, Transformers, etc. - ~350MB
   - **Total: ~1.5GB**

4. **Configuration**
   - Creates `.env` file
   - Sets Python and FFmpeg paths
   - Verifies installations

## Advantages of This Approach

### Squirrel.Windows Benefits:
✅ **Built from Linux** - No Windows machine needed!
✅ **Auto-updates** - Squirrel supports delta updates
✅ **Standard Windows installer** - Familiar user experience
✅ **Fast installation** - No custom NSIS scripts to compile
✅ **Smaller initial download** - 247MB vs 2GB bundled approach

### Two-Phase Installation:
✅ **Fast initial install** - Application installs in ~30 seconds
✅ **User control** - Users can choose when to install heavy dependencies
✅ **System Python** - Uses existing Python if available
✅ **Easy troubleshooting** - Dependencies can be reinstalled separately
✅ **Standard approach** - Common pattern for Python-based apps

## Distribution

You can distribute the installer via:
- Direct download link
- GitHub Releases
- Website
- USB drive
- Cloud storage (Google Drive, Dropbox, etc.)

Users simply:
1. Download `CreatorCrafter Setup 1.0.0.exe` (247MB)
2. Run the installer
3. Run `setup-dependencies.bat`
4. Launch the app

## First Run Experience

After complete setup:
- **First video analysis**: ~5 min (Whisper model downloads ~500MB)
- **First SFX generation**: ~10 min (AudioCraft model downloads ~1GB)
- **Subsequent uses**: Instant (models are cached)

## Rebuilding the Installer

From Ubuntu/Linux:

```bash
# Clean previous build
rm -rf release/squirrel-windows release/win-unpacked

# Build new installer
npx electron-builder --win --x64 --config.win.target=squirrel
```

From Windows (if you need NSIS with custom scripts):

```bash
# Use the build script
build-windows.bat
```

## Troubleshooting

### Build Issues:

**"FFmpeg not found in build"**
- Ensure `resources/ffmpeg/ffmpeg.exe` exists
- Run `./build-windows-from-linux.sh` to download FFmpeg

**"Build fails on Linux"**
- Make sure electron-builder is installed: `npm install`
- Try: `npm install --legacy-peer-deps`

### User Installation Issues:

**"Python not found"**
- Run `setup-dependencies.bat` again
- Manually install Python from python.org
- Rerun setup script

**"Dependency installation fails"**
- Check internet connection
- Try running as Administrator
- Manually run: `venv\Scripts\pip install -r requirements.txt`

**"FFmpeg errors"**
- Check `resources\ffmpeg\ffmpeg.exe` exists
- Verify `.env` file has correct paths

## File Sizes Summary

- **Installer**: 247MB
- **Installed app**: ~450MB (app + FFmpeg)
- **Python dependencies**: ~1.5GB (after setup)
- **AI models**: ~2GB (downloads on first use)
- **Total disk space**: ~4GB

## Comparison with NSIS

| Feature | Squirrel.Windows (Current) | NSIS (Previous) |
|---------|---------------------------|----------------|
| Build from Linux | ✅ Yes | ❌ No (requires Windows) |
| Auto-updates | ✅ Built-in | ❌ Manual implementation |
| Custom install location | ❌ Fixed to AppData | ✅ User choosable |
| Automatic Python install | ⚠️ Manual step | ✅ Fully automatic |
| Build complexity | ✅ Simple | ⚠️ Complex (custom scripts) |
| Installer size | 247MB | ~100MB (without FFmpeg) |

## Next Steps

1. **Test the installer** on Windows machine
2. **Create release notes** for users
3. **Upload to GitHub Releases** or hosting
4. **Create video tutorial** showing installation process
5. **Consider code signing** for trusted publisher status

## Support

If users have installation issues:
1. Check `setup-dependencies.bat` output
2. Verify Python 3.11+ installed
3. Check internet connection for dependency downloads
4. Try running as Administrator
5. Check Windows Event Viewer for errors

## Notes

- This installer was built on **Ubuntu Linux** using **electron-builder** and **Squirrel.Windows**
- No Windows machine was needed for the build
- FFmpeg binaries are for Windows x64
- Python dependencies are installed from PyPI
- AI models download automatically on first use
