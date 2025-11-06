# CreatorCrafter Windows Installer - User Guide

## 📦 Installation Package

**File:** `CreatorCrafter Setup 1.0.0.exe`
**Size:** 521 MB
**Type:** NSIS installer with bundled dependencies

## ✨ What's Included

The installer bundles everything needed for CreatorCrafter to work:

### Bundled in Installer (No Internet Required)
- ✅ **CreatorCrafter Application** - Main Electron app
- ✅ **Python 3.11.9 Environment** - Pre-built with all dependencies
  - PyTorch 2.1.0 (CPU version)
  - AudioCraft 1.3.0 (for SFX generation)
  - OpenAI Whisper (for transcription)
  - Transformers, OpenCV, and all AI libraries
- ✅ **FFmpeg** - For video processing

### Downloads on First Use (Internet Required)
- ⬇️ **AI Models** (~500MB-2GB total)
  - Whisper model: Downloads when you first analyze a video
  - BLIP vision model: Downloads when you first analyze a video
  - AudioCraft MusicGen: Downloads when you first generate SFX
  - Models cache to: `C:\Users\YourName\.cache\huggingface\`

## 🚀 Installation Steps

### For End Users

1. **Download Installer**
   - Get `CreatorCrafter Setup 1.0.0.exe` (521 MB)
   - No need to download anything else!

2. **Run Installer**
   - Double-click `CreatorCrafter Setup 1.0.0.exe`
   - Windows might show SmartScreen warning (expected for unsigned apps)
   - Click "More info" → "Run anyway"

3. **Installation Process** (~3-5 minutes)
   ```
   [1/3] Preparing Python environment... (validates bundled package)
   [2/3] Extracting Python environment... (unpacks 393MB to C:\Program Files\CreatorCrafter\venv)
   [3/3] Setting up FFmpeg... (configures video processing)
   ```

4. **First Launch**
   - Application launches immediately after installation
   - No additional setup required!

5. **First Use of AI Features** (requires internet)
   - **First Video Analysis:** ~5 min (downloads Whisper + BLIP models)
   - **First SFX Generation:** ~10 min (downloads AudioCraft model)
   - **All Subsequent Uses:** Instant! (models are cached)

## 📋 System Requirements

### Minimum Requirements
- **OS:** Windows 10 (64-bit) or Windows 11
- **RAM:** 8 GB
- **Disk Space:**
  - Installation: ~2 GB
  - After first use (with AI models): ~4 GB
  - Working space for projects: 5+ GB recommended
- **Internet:** Required for AI model downloads on first use only

### Recommended
- **RAM:** 16 GB or more
- **CPU:** Multi-core processor (4+ cores)
- **Disk:** SSD for faster AI model loading

### NOT Required ❌
- ❌ Python installation
- ❌ Visual Studio / C++ compiler
- ❌ Manual dependency installation
- ❌ Technical knowledge

## 📂 Installation Locations

After installation, files will be at:

```
C:\Program Files\CreatorCrafter\
├── CreatorCrafter.exe          # Main application
├── resources\
│   ├── python-env.zip          # Bundled Python (extracted during install)
│   ├── python\                 # Python scripts
│   └── ffmpeg\                 # FFmpeg binaries
├── venv\                       # Extracted Python environment
│   ├── python.exe              # Python 3.11.9
│   ├── Lib\                    # All dependencies (PyTorch, AudioCraft, etc.)
│   └── Scripts\
└── INSTALLATION_NOTES.txt      # Quick reference guide
```

**AI Models Cache:**
```
C:\Users\YourName\.cache\huggingface\
└── hub\                        # Whisper, BLIP, AudioCraft models
```

## 🎯 First-Time Usage

### 1. Launch CreatorCrafter
- Desktop shortcut: `CreatorCrafter`
- Start menu: `CreatorCrafter`
- Application launches instantly!

### 2. First Video Analysis
When you click "Analyze Video" for the first time:
```
📥 Downloading AI models...
   ⏳ Whisper model: ~2 minutes (250MB)
   ⏳ BLIP model: ~3 minutes (250MB)
✅ Models downloaded! Analysis starting...
⏱️ Analysis: 2-5 minutes (depends on video length)
```

### 3. First SFX Generation
When you generate your first sound effect:
```
📥 Downloading AudioCraft model...
   ⏳ MusicGen model: ~10 minutes (1.5GB)
✅ Model downloaded! Generating SFX...
⏱️ Generation: 30-60 seconds per SFX
```

### 4. All Subsequent Uses
- ✅ No more downloads!
- ✅ Instant startup
- ✅ Fast AI processing
- ✅ Works offline (after initial model downloads)

## ⚙️ Verification

The installer automatically verifies everything during installation:

**Python Environment:**
```
✓ Python executable found: OK
✓ Python test successful: Python 3.11.9
✓ Verifying AI dependencies...
✓ torch: 2.1.0
✓ audiocraft: 1.3.0
✓ whisper: OK
✓ transformers: 4.35.0
✓ All Python dependencies verified successfully!
```

**FFmpeg:**
```
✓ FFmpeg binaries found: OK
✓ FFmpeg test successful
✓ FFmpeg added to PATH
```

## 🛠️ Troubleshooting

### Installation Issues

**Problem:** "Python environment package not found"
- **Cause:** Corrupted installer download
- **Solution:** Re-download `CreatorCrafter Setup 1.0.0.exe` and try again

**Problem:** "Failed to extract Python environment"
- **Cause:** Insufficient disk space or antivirus blocking
- **Solution:**
  1. Free up 5+ GB disk space
  2. Temporarily disable antivirus
  3. Re-run installer

**Problem:** Windows SmartScreen blocks installer
- **Cause:** Installer is not code-signed (common for open-source apps)
- **Solution:** Click "More info" → "Run anyway"

### Runtime Issues

**Problem:** "Python not found" error when analyzing video
- **Solution:** Check `C:\Program Files\CreatorCrafter\venv\python.exe` exists
- If missing, reinstall application

**Problem:** FFmpeg errors during video processing
- **Solution:** Check `C:\Program Files\CreatorCrafter\resources\ffmpeg\ffmpeg.exe` exists
- If missing, reinstall application

**Problem:** AI model download fails
- **Cause:** Internet connection or firewall
- **Solution:**
  1. Check internet connection
  2. Check firewall isn't blocking Python
  3. Try again (downloads resume automatically)

**Problem:** Application won't start
- **Solution:**
  1. Check Windows Event Viewer for errors
  2. Run as Administrator
  3. Reinstall application

## 📊 Disk Space Usage

**During Installation:**
- Installer download: 521 MB
- Extraction space needed: 2 GB

**After Installation:**
- Application: ~500 MB
- Python environment: ~1.5 GB
- **Total: ~2 GB**

**After First Use (All AI Models Downloaded):**
- Application + Python: ~2 GB
- AI models: ~2 GB
- **Total: ~4 GB**

**Working Projects:**
- Videos: Varies (user content)
- Generated SFX: ~1-5 MB per sound
- Cache: ~500 MB
- **Recommended free space: 10+ GB for comfortable usage**

## 🔄 Updates

Future updates will:
- Replace application files only
- Keep your Python environment (no re-download)
- Preserve AI model cache
- Maintain your project files

Update process is fast (~1 minute) since Python environment is already installed.

## 🗑️ Uninstallation

**Via Control Panel:**
1. Settings → Apps → CreatorCrafter → Uninstall
2. Follow prompts

**What Gets Removed:**
- ✅ Application files
- ✅ Python environment
- ✅ FFmpeg
- ✅ Desktop shortcuts

**What Stays (Optional Manual Cleanup):**
- AI models cache: `C:\Users\YourName\.cache\huggingface\` (~2 GB)
  - Keep if you use other AI apps
  - Delete to free up space
- Your project files (you choose location)

## 📞 Support

**If you encounter issues:**

1. **Check:** `C:\Program Files\CreatorCrafter\INSTALLATION_NOTES.txt`
2. **Logs:** `%APPDATA%\CreatorCrafter\logs\`
3. **GitHub Issues:** [Report problems here]
4. **Documentation:** See `DEPLOYMENT-READY.md` for technical details

## 🎉 Success Indicators

You'll know everything is working when:

✅ Application launches without errors
✅ Video analysis completes successfully
✅ SFX generation produces audio files
✅ Video rendering creates output files
✅ No Python or FFmpeg errors in console

## 🚦 Installation Checklist

Use this checklist to verify successful installation:

- [ ] Downloaded `CreatorCrafter Setup 1.0.0.exe` (521 MB)
- [ ] Ran installer (accepted Windows SmartScreen warning if shown)
- [ ] Installation completed with "Ready to use!" message
- [ ] Desktop shortcut created
- [ ] Application launches successfully
- [ ] Video analysis works (models download on first use)
- [ ] SFX generation works (model downloads on first use)
- [ ] Video rendering produces output files

## 📝 Version Information

**Installer Version:** 1.0.0
**Build Date:** November 6, 2025
**Build Platform:** Ubuntu 22.04 (cross-compiled for Windows)

**Bundled Versions:**
- Python: 3.11.9
- PyTorch: 2.1.0
- AudioCraft: 1.3.0
- Whisper: 20250625
- Transformers: 4.35.0
- NumPy: 1.26.4
- OpenCV: 4.8.1.78
- FFmpeg: Latest stable

---

**Built with ❤️ for video creators**

No Python knowledge required. No compilation needed. Just install and create!
