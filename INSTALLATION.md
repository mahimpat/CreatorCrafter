# CreatorCrafter - Installation Guide

This guide covers building and distributing installers for CreatorCrafter.

## Prerequisites

### For Building Installers

- **Node.js** 18+ and npm
- **Python** 3.8 or higher
- **FFmpeg** (must be in system PATH)

### Platform-Specific Requirements

#### Windows
- Python 3.8+ from [python.org](https://python.org)
- Visual Studio Build Tools (for some Python packages)

#### macOS
- Xcode Command Line Tools: `xcode-select --install`
- Homebrew (recommended): `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv ffmpeg build-essential
```

## Building the Installer

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Python Environment (Development)

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Linux/macOS
# OR
venv\Scripts\activate      # Windows

# Install Python dependencies
pip install -r requirements.txt

# Download AI models (optional for development)
python python/download_models.py
```

### 3. Build the Application

Choose one of the following based on your target platform:

#### Build for Current Platform
```bash
npm run electron:build
```

This creates installers in the `release/` directory:
- **Windows**: `.exe` installer
- **macOS**: `.dmg` and `.zip`
- **Linux**: `.AppImage` and `.deb`

#### Build Directory Only (Faster, No Installer)
```bash
npm run build:dir
```

#### Build for Specific Platform
```bash
# Windows
npm run electron:build -- --win

# macOS
npm run electron:build -- --mac

# Linux
npm run electron:build -- --linux
```

## What Gets Included in the Installer

The installer packages include:

1. **Application Code**
   - React frontend (compiled)
   - Electron main process
   - All Node.js dependencies

2. **Python Scripts**
   - Video analysis (`video_analyzer.py`)
   - AudioCraft generator (`audiocraft_generator.py`)
   - Model downloader (`download_models.py`)
   - Environment setup script

3. **Configuration Files**
   - `requirements.txt` (Python dependencies)
   - `.env.example` (for API keys)

## Post-Installation Setup

### Automatic Setup (Windows NSIS Installer)

The Windows installer automatically:
1. Checks for Python 3
2. Creates a virtual environment
3. Installs Python dependencies
4. Downloads AI models

### Manual Setup (All Platforms)

If you need to set up manually after installation:

1. **Navigate to installation directory**
   - Windows: `C:\Program Files\CreatorCrafter`
   - macOS: `/Applications/CreatorCrafter.app/Contents/Resources/app`
   - Linux: `/opt/CreatorCrafter` or `~/.local/share/CreatorCrafter`

2. **Run setup script**
   ```bash
   python python/setup_environment.py
   ```

3. **Configure API Keys** (Optional - for FreeSound)
   - Copy `.env.example` to `.env`
   - Add your FreeSound API key:
     ```
     FREESOUND_CLIENT_ID=your_api_key_here
     ```

## Installer Sizes

Expected installer sizes (approximate):

- **Base Installer**: ~100-200 MB
- **After Python Dependencies**: +500-800 MB
- **After AI Models**: +500 MB
- **Total First Install**: ~1.5-2 GB

The large size is due to PyTorch and AI models required for audio/video analysis.

## Distribution

### Windows

**NSIS Installer** (`CreatorCrafter-Setup-1.0.0.exe`):
- User can choose installation directory
- Creates desktop and start menu shortcuts
- Automatically sets up Python environment
- Includes uninstaller

### macOS

**DMG Image** (`CreatorCrafter-1.0.0.dmg`):
- Drag-to-Applications installer
- Signed and notarized (requires developer certificate)
- First run may require manual Python setup

**ZIP Archive** (`CreatorCrafter-1.0.0-mac.zip`):
- Portable version
- Requires manual Python setup

### Linux

**AppImage** (`CreatorCrafter-1.0.0.AppImage`):
- Portable, runs on most distributions
- Make executable: `chmod +x CreatorCrafter-1.0.0.AppImage`
- Requires FFmpeg and Python 3.8+ installed on system

**DEB Package** (`CreatorCrafter-1.0.0.deb`):
- For Debian/Ubuntu-based systems
- Automatically installs FFmpeg and Python dependencies
- Install: `sudo dpkg -i CreatorCrafter-1.0.0.deb`

## System Requirements

### Minimum Requirements
- **OS**: Windows 10, macOS 10.15+, or Ubuntu 20.04+
- **RAM**: 8 GB
- **Storage**: 3 GB free space
- **CPU**: Intel i5 or equivalent (4 cores)

### Recommended Requirements
- **RAM**: 16 GB or more
- **GPU**: NVIDIA GPU with CUDA support (for faster AI processing)
- **Storage**: 5 GB free space (SSD preferred)
- **CPU**: Intel i7 or equivalent (8+ cores)

## Troubleshooting

### "Python not found" Error
- Install Python 3.8+ from [python.org](https://python.org)
- Ensure Python is added to system PATH

### "FFmpeg not found" Error
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt-get install ffmpeg`

### AI Model Download Fails
- Check internet connection
- Ensure ~500MB free space
- Manually run: `python python/download_models.py`

### Application Won't Start
1. Check logs in:
   - Windows: `%APPDATA%\CreatorCrafter\logs`
   - macOS: `~/Library/Logs/CreatorCrafter`
   - Linux: `~/.config/CreatorCrafter/logs`

2. Try running setup script manually:
   ```bash
   python python/setup_environment.py
   ```

## Code Signing (For Official Releases)

### Windows
```bash
# Requires code signing certificate
npm run electron:build -- --win --publish never
```

### macOS
```bash
# Requires Apple Developer account and certificate
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
npm run electron:build -- --mac --publish never
```

## Support

For issues or questions:
- GitHub Issues: [github.com/yourrepo/CreatorCrafter/issues]
- Documentation: [docs.creatorcrafter.com]
- Email: support@creatorcrafter.com
