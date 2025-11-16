# CreatorCrafter Windows Installer Guide

This guide explains how to build the Windows installer for CreatorCrafter.

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/

2. **NSIS** (Nullsoft Scriptable Install System)
   - Download: https://nsis.sourceforge.io/Download
   - Install and make sure `makensis.exe` is in your PATH

3. **Git** (for cloning the repository)
   - Download: https://git-scm.com/download/win

## Building the Installer

### Method 1: Using the Build Script (Recommended)

1. Open Command Prompt or PowerShell as Administrator

2. Navigate to the project directory:
   ```cmd
   cd C:\path\to\CreatorCrafter
   ```

3. Install dependencies (first time only):
   ```cmd
   npm install
   ```

4. Run the build script:
   ```cmd
   build-windows-installer.bat
   ```

The script will:
- Clean previous builds
- Build the Electron application
- Create the NSIS installer (`CreatorCrafter-Setup.exe`)

### Method 2: Manual Build Steps

1. Build the Electron app:
   ```cmd
   npm run build:win
   ```

2. Create the NSIS installer:
   ```cmd
   makensis installer.nsi
   ```

## Installer Features

The generated `CreatorCrafter-Setup.exe` will:

### Automatic Python Installation
- Checks if Python 3.9 is installed
- If not found, downloads and installs Python 3.9.13
- Adds Python to system PATH
- Installs pip package manager

### Python Dependencies
- Automatically installs all required Python packages:
  - openai-whisper (for audio transcription)
  - transformers (for BLIP vision model)
  - opencv-python (for video processing)
  - librosa, soundfile (for audio processing)
  - numpy, scipy, Pillow (utilities)
  - scenedetect (for scene analysis)

### Application Installation
- Copies CreatorCrafter application files
- Creates desktop shortcut
- Creates Start Menu shortcuts
- Registers uninstaller

### Clean Uninstallation
- Removes all application files
- Removes shortcuts
- Cleans registry entries
- Preserves Python installation (may be used by other apps)

## What's NOT Included (Removed in This Release)

The following heavy dependencies have been removed to reduce installer size and installation time:

- **torch, torchaudio, audiocraft** (~4GB)
  - Reason: Using ElevenLabs API for sound effects instead
  - Saves: ~4GB disk space and ~10 minutes installation time

- **rembg, onnxruntime** (~500MB)
  - Reason: Thumbnail generation feature disabled for this release
  - Saves: ~500MB disk space

## Installer Size and Installation Time

- **Installer Size:** ~15-20MB (without Python bundled)
- **With Python Download:** ~25-30MB additional
- **Installation Time:**
  - With Python already installed: ~2-3 minutes
  - With Python installation: ~5-7 minutes

## Troubleshooting

### NSIS Not Found

If you get "makensis: command not found" error:

1. Install NSIS from https://nsis.sourceforge.io/Download
2. Add NSIS to your PATH:
   - Right-click "This PC" → Properties → Advanced system settings
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Add: `C:\Program Files (x86)\NSIS` (or wherever NSIS is installed)
   - Click OK and restart Command Prompt

### Build Fails

If `npm run build:win` fails:

1. Make sure all dependencies are installed:
   ```cmd
   npm install
   ```

2. Clear the build cache:
   ```cmd
   rmdir /s /q dist
   rmdir /s /q dist-electron
   ```

3. Try again:
   ```cmd
   npm run build:win
   ```

### Python Installation Fails

If Python installation fails during setup:

The installer will show an error but continue. Users can:
1. Manually install Python 3.9 from https://www.python.org/downloads/release/python-3913/
2. Run the installer again
3. Or manually install Python packages using:
   ```cmd
   pip install -r requirements.txt
   ```

## Distribution

After building, you'll have:
- `CreatorCrafter-Setup.exe` - The installer to distribute

You can distribute this single file to Windows users. They only need to:
1. Download `CreatorCrafter-Setup.exe`
2. Run it (may require administrator privileges)
3. Follow the installation wizard

## System Requirements

- **OS:** Windows 10/11 (64-bit)
- **RAM:** 4GB minimum, 8GB recommended
- **Disk Space:** 2GB free space
- **Internet:** Required for initial setup (Python & package downloads)

## Notes

- The installer requires administrator privileges to install Python system-wide
- Python packages are installed globally (not in a virtual environment)
- FFmpeg is bundled with the application (no separate installation needed)
- All AI models (Whisper, BLIP) are downloaded automatically on first use

## Support

If users encounter issues:
1. Check the installation log in the installer
2. Verify Python 3.9 is installed: `python --version`
3. Manually install packages: `pip install -r requirements.txt`
4. Check FFmpeg is accessible from the app directory
