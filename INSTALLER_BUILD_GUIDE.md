# CreatorCrafter Windows Installer - Build Guide

**Status:** Ready to build after Google Drive upload
**Date:** 2025-11-05
**Version:** 1.0.0

---

## What Has Been Done

### 1. New NSIS Installer Script Created

**File:** `/home/mahim/CreatorCrafter/build/installer.nsh`

**Features:**
- Downloads pre-built Python environment from Google Drive (393MB)
- Extracts Python environment to installation directory
- Verifies Python installation with dependency checks
- Sets up FFmpeg with PATH configuration
- Comprehensive error handling with retry logic
- Creates detailed installation notes
- Graceful fallback for failed downloads

**Installation Flow:**
1. Extract CreatorCrafter application files
2. Download Python environment from Google Drive (2-5 minutes)
3. Extract Python environment to `C:\Program Files\CreatorCrafter\venv\`
4. Verify Python and dependencies work
5. Setup FFmpeg
6. Create shortcuts and finish

### 2. Installer Configuration Created

**File:** `/home/mahim/CreatorCrafter/installer-config.json`

Contains:
- Python environment metadata
- SHA256 checksum: `db106dba2bbe10a8c3fd1c907277659726e0a6355ca839ec5978e746d7254d4f`
- Version: 1.0.0
- Size: 393MB
- Instructions for Google Drive setup

### 3. URL Update Script Created

**File:** `/home/mahim/CreatorCrafter/scripts/update-installer-url.sh`

Usage:
```bash
./scripts/update-installer-url.sh "https://drive.google.com/uc?export=download&id=YOUR_FILE_ID"
```

This script:
- Updates the placeholder URL in `build/installer.nsh`
- Creates a backup of the original file
- Makes the installer ready to build

### 4. Package.json Already Configured

Electron-builder is properly configured:
- NSIS target for Windows x64
- FFmpeg binaries included in `extraResources`
- Python scripts included
- Proper file exclusions (venv, dev files)

---

## Next Steps: Upload and Build

### Step 1: Upload Python Environment to Google Drive

**File to upload:** `/home/mahim/CreatorCrafter/scripts/dist/python-env-windows-x64-v1.0.0.zip`
**Size:** 393MB

**Instructions:**

1. **Go to Google Drive:**
   - Navigate to https://drive.google.com
   - Sign in with your Google account

2. **Upload the file:**
   - Click "New" → "File upload"
   - Select: `scripts/dist/python-env-windows-x64-v1.0.0.zip`
   - Wait for upload to complete (2-5 minutes depending on internet speed)

3. **Make it publicly accessible:**
   - Right-click the uploaded file
   - Select "Share"
   - Click "Change to anyone with the link"
   - Ensure "Viewer" access is selected
   - Click "Copy link"

4. **Convert sharing link to direct download URL:**

   **Your sharing link will look like:**
   ```
   https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view?usp=sharing
   ```

   **Extract the FILE_ID (the part between `/d/` and `/view`):**
   ```
   1a2b3c4d5e6f7g8h9i0j
   ```

   **Create direct download URL:**
   ```
   https://drive.google.com/uc?export=download&id=1a2b3c4d5e6f7g8h9i0j
   ```

5. **Important notes:**
   - Keep the FILE_ID safe - you'll need it
   - Do NOT set expiration date
   - Ensure link sharing is set to "Anyone with the link"
   - Google Drive may show virus scan warning for files >100MB (this is normal)

---

### Step 2: Update Installer with Google Drive URL

Once you have the direct download URL, run:

```bash
cd /home/mahim/CreatorCrafter
./scripts/update-installer-url.sh "https://drive.google.com/uc?export=download&id=YOUR_FILE_ID"
```

**Example:**
```bash
./scripts/update-installer-url.sh "https://drive.google.com/uc?export=download&id=1a2b3c4d5e6f7g8h9i0j"
```

This will:
- Update `build/installer.nsh` with your Google Drive URL
- Create a backup at `build/installer.nsh.backup`
- Prepare the installer for building

---

### Step 3: Build Windows Installer

**From the project root:**

```bash
cd /home/mahim/CreatorCrafter
npm run electron:build:win
```

**What this does:**
1. Compiles TypeScript code
2. Builds Vite frontend
3. Packages Electron app with electron-builder
4. Creates NSIS installer with custom script
5. Outputs to: `release/CreatorCrafter Setup 1.0.0.exe`

**Expected build time:** 3-5 minutes

**Build artifacts:**
- `release/CreatorCrafter Setup 1.0.0.exe` - Main installer
- `release/builder-effective-config.yaml` - Build configuration used
- `release/win-unpacked/` - Unpacked application files (for testing)

---

### Step 4: Verify Build Output

**Check that the installer was created:**

```bash
ls -lh /home/mahim/CreatorCrafter/release/
```

**Expected output:**
```
CreatorCrafter Setup 1.0.0.exe  (~250-300MB)
```

**Verify the installer includes:**
- Electron app files
- FFmpeg binaries
- Python scripts
- NSIS installer with Google Drive download logic

---

## Testing the Installer

### Prerequisites for Testing

**Test on a clean Windows machine:**
- Windows 10 or Windows 11
- 5GB free disk space
- Internet connection (for Google Drive download)
- NO Python installed (to verify it's not required)
- NO FFmpeg installed (to verify bundled version works)

### Installation Test Checklist

1. **Download Installer:**
   - [ ] Transfer `CreatorCrafter Setup 1.0.0.exe` to Windows machine
   - [ ] File size is ~250-300MB

2. **Run Installer:**
   - [ ] Double-click installer
   - [ ] Windows SmartScreen may appear (click "More info" → "Run anyway")
   - [ ] Installer window opens and shows installation progress

3. **Monitor Installation Steps:**
   - [ ] Step 1: Downloading Python environment (2-5 minutes)
   - [ ] Shows Google Drive download progress
   - [ ] Download completes successfully
   - [ ] Step 2: Verifying checksum
   - [ ] Step 3: Extracting Python environment (3-5 minutes)
   - [ ] Extraction completes successfully
   - [ ] Python test runs successfully
   - [ ] Dependencies verified (torch, audiocraft, whisper, transformers)
   - [ ] Step 4: FFmpeg setup
   - [ ] Installation complete message

4. **Verify Installation:**
   - [ ] Desktop shortcut created: "CreatorCrafter"
   - [ ] Start menu entry created
   - [ ] Installation folder exists: `C:\Program Files\CreatorCrafter\`
   - [ ] Python environment exists: `C:\Program Files\CreatorCrafter\venv\python.exe`
   - [ ] FFmpeg exists: `C:\Program Files\CreatorCrafter\resources\ffmpeg\ffmpeg.exe`
   - [ ] Installation notes created: `C:\Program Files\CreatorCrafter\INSTALLATION_NOTES.txt`

5. **Launch Application:**
   - [ ] Click desktop shortcut or Start menu entry
   - [ ] Application launches successfully
   - [ ] Main window appears with UI
   - [ ] No Python errors in console

6. **Test Video Import:**
   - [ ] Click "Import Video" or drag-and-drop
   - [ ] Video loads successfully
   - [ ] Video player shows thumbnail and timeline

7. **Test Video Analysis (First Run):**
   - [ ] Click "Analyze Video"
   - [ ] Shows "Downloading AI models (first time only)" message
   - [ ] Whisper model downloads (~150MB, 1-2 minutes)
   - [ ] BLIP model downloads (~500MB, 2-3 minutes)
   - [ ] Progress indicator shows download status
   - [ ] Analysis completes successfully
   - [ ] Subtitles/captions generated

8. **Test Video Analysis (Second Run):**
   - [ ] Import another video
   - [ ] Click "Analyze Video" again
   - [ ] NO model download message (uses cached models)
   - [ ] Analysis completes in seconds
   - [ ] Subtitles/captions generated

9. **Test SFX Generation (First Run):**
   - [ ] Click "Generate SFX" or similar feature
   - [ ] Shows "Downloading AudioCraft model (first time only)"
   - [ ] AudioCraft model downloads (~1.5GB, 5-10 minutes)
   - [ ] Progress indicator shows download status
   - [ ] SFX generation completes successfully
   - [ ] Audio file plays correctly

10. **Test SFX Generation (Second Run):**
    - [ ] Generate another SFX
    - [ ] NO model download (uses cached model)
    - [ ] Generation completes quickly
    - [ ] Audio file plays correctly

11. **Test Video Export:**
    - [ ] Add some edits (captions, SFX, overlays)
    - [ ] Click "Export" or "Render"
    - [ ] FFmpeg processes video successfully
    - [ ] Output video created
    - [ ] Output video plays with all edits applied

### Failure Scenarios to Test

**Test 1: Internet connection lost during Python download**
- Disconnect internet during Step 1
- Installer should show error with retry option
- Reconnect internet and retry
- Should resume or restart download

**Test 2: Insufficient disk space**
- Test on machine with <3GB free space
- Installer should show disk space error
- Clear space and retry

**Test 3: Antivirus interference**
- Enable aggressive antivirus
- Installer may be blocked or extraction may fail
- Verify error messages are clear
- Disable antivirus temporarily and retry

**Test 4: Google Drive rate limit**
- If many users download simultaneously
- Google Drive may rate limit
- Installer should show appropriate error
- Provide manual download instructions

---

## Installation User Experience

### For End Users

**What users download:**
- `CreatorCrafter Setup 1.0.0.exe` (~250-300MB)

**Installation time breakdown:**
- Initial setup: 1-2 minutes
- Python environment download: 2-5 minutes (393MB from Google Drive)
- Python environment extraction: 3-5 minutes
- **Total installation time: 6-12 minutes**

**First launch:**
- Application opens immediately
- All features available
- AI models download on first use only

**First video analysis:**
- Downloads Whisper model: ~150MB (1-2 minutes)
- Downloads BLIP model: ~500MB (2-3 minutes)
- Total first analysis: ~5 minutes
- All subsequent analyses: instant (seconds)

**First SFX generation:**
- Downloads AudioCraft model: ~1.5GB (5-10 minutes)
- Total first SFX: ~10-15 minutes
- All subsequent generations: instant (30-60 seconds)

**Disk space requirements:**
- Application + Python: ~2GB
- AI models (after first use): ~2GB
- **Total: ~4GB**

---

## Troubleshooting Guide for Developers

### Build Issues

**Issue: "electron-builder not found"**
```bash
npm install --save-dev electron-builder
```

**Issue: "NSIS installer failed to build"**
- Check that `build/installer.nsh` exists
- Verify NSIS syntax with: `makensis -HDRINFO build/installer.nsh`
- electron-builder includes NSIS, no separate install needed on Linux

**Issue: "FFmpeg binaries not found"**
```bash
# Verify FFmpeg location
ls -lh build/ffmpeg/bin/
# Should show: ffmpeg.exe, ffplay.exe, ffprobe.exe
```

**Issue: "Python scripts not included"**
- Check `package.json` extraResources section
- Verify files exist: `ls python/*.py`

### Installer Issues

**Issue: Placeholder URL still present after build**
- You forgot to run `update-installer-url.sh`
- Rebuild after updating URL
- Check with: `grep PLACEHOLDER build/installer.nsh`

**Issue: Google Drive download fails during installation**
- Verify URL is correct direct download format
- Test URL in browser (should auto-download)
- Check Google Drive sharing permissions
- Try with `confirm=t` parameter: `...&id=FILE_ID&confirm=t`

**Issue: NSISdl plugin not found**
- electron-builder should include this
- Alternative: Use INetC plugin for better progress
- Or bundle Python environment in installer (increases size to 2GB)

### Runtime Issues

**Issue: Python not found after installation**
- Check: `C:\Program Files\CreatorCrafter\venv\python.exe`
- If missing, extraction failed
- User should run manual extraction or use hotfix

**Issue: Dependencies import errors**
- Test imports: `venv\python.exe -c "import torch, audiocraft"`
- If failed, pre-built environment may be corrupt
- Rebuild Python environment package

**Issue: FFmpeg not working**
- Check: `C:\Program Files\CreatorCrafter\resources\ffmpeg\ffmpeg.exe`
- Test: `ffmpeg.exe -version`
- If missing, FFmpeg not included in build

---

## Alternative Build Options

### Option 1: Bundle Python Environment in Installer

**Pros:** No internet required during installation, 100% reliable
**Cons:** Installer size ~2GB (slow download)

**Implementation:**
1. Copy `scripts/dist/python-env-windows-x64-v1.0.0.zip` to project root
2. Extract to: `python-env-windows/`
3. Update `package.json`:
```json
{
  "build": {
    "extraResources": [
      {
        "from": "python-env-windows",
        "to": "venv"
      }
    ]
  }
}
```
4. Update `build/installer.nsh` to skip download step
5. Build: `npm run electron:build:win`

**Result:** Installer will be ~2GB but requires no internet

---

### Option 2: Use GitHub Releases for Python Environment

**Pros:** Better for open source, unlimited bandwidth
**Cons:** Requires GitHub account, public repo

**Implementation:**
```bash
# Create GitHub release
cd /home/mahim/CreatorCrafter
gh release create v1.0.0-python-env \
  --title "Python Environment v1.0.0" \
  --notes "Pre-built Windows Python environment" \
  scripts/dist/python-env-windows-x64-v1.0.0.zip

# Get download URL
# Format: https://github.com/USERNAME/CreatorCrafter/releases/download/v1.0.0-python-env/python-env-windows-x64-v1.0.0.zip

# Update installer
./scripts/update-installer-url.sh "https://github.com/USERNAME/CreatorCrafter/releases/download/v1.0.0-python-env/python-env-windows-x64-v1.0.0.zip"

# Build
npm run electron:build:win
```

---

### Option 3: Self-Hosted Download Server

**Pros:** Full control, no rate limits, can use CDN
**Cons:** Requires hosting, ongoing costs

**Implementation:**
1. Upload to S3, DigitalOcean Spaces, or similar
2. Configure CDN (CloudFront, CloudFlare)
3. Get public URL
4. Update installer with URL
5. Build

**Example S3 upload:**
```bash
aws s3 cp scripts/dist/python-env-windows-x64-v1.0.0.zip \
  s3://creatorcrafter-assets/python-env/ \
  --acl public-read

# URL: https://creatorcrafter-assets.s3.amazonaws.com/python-env/python-env-windows-x64-v1.0.0.zip
```

---

## Version Management

### Updating Python Environment

**When to update:**
- New Python version
- Updated PyTorch version
- New AudioCraft version
- Security patches

**Process:**
1. Rebuild Python environment with new versions
2. Update version number: `v1.1.0`, `v2.0.0`, etc.
3. Upload new package to Google Drive
4. Update `installer-config.json` with new URL and SHA256
5. Update `build/installer.nsh` with new version
6. Increment app version in `package.json`
7. Rebuild installer
8. Test thoroughly

### Maintaining Multiple Versions

Keep old Python environment packages available for users on older app versions:
- `python-env-windows-x64-v1.0.0.zip` (for app v1.0.0)
- `python-env-windows-x64-v1.1.0.zip` (for app v1.1.0)
- etc.

---

## Summary

### What You Have Now

1. **Pre-built Python environment:** Ready at `scripts/dist/python-env-windows-x64-v1.0.0.zip` (393MB)
2. **NSIS installer script:** Downloads and extracts Python environment from Google Drive
3. **Configuration files:** `installer-config.json` with all metadata
4. **Update script:** Easy way to set Google Drive URL before building
5. **Documentation:** Complete guide for building and testing

### What You Need to Do

1. **Upload to Google Drive:** Upload `python-env-windows-x64-v1.0.0.zip`
2. **Get direct download URL:** Convert sharing link to direct download format
3. **Update installer:** Run `update-installer-url.sh` with the URL
4. **Build installer:** Run `npm run electron:build:win`
5. **Test on Windows:** Follow testing checklist above
6. **Distribute:** Share `CreatorCrafter Setup 1.0.0.exe` with users

### Expected Results

**Users will get:**
- Single installer file: ~250-300MB download
- Automated installation: 6-12 minutes
- No manual Python installation required
- No Visual Studio required
- No manual dependency installation
- AI models download on first use (5-15 minutes total)
- All future uses: instant

**Success criteria:**
- Installation succeeds on clean Windows machines
- No Python errors on launch
- Video analysis works on first try
- SFX generation works on first try
- No manual intervention needed

---

## Contact & Support

If you encounter issues:

1. **Check installation logs:** `C:\Program Files\CreatorCrafter\INSTALLATION_NOTES.txt`
2. **Verify Python:** `C:\Program Files\CreatorCrafter\venv\python.exe --version`
3. **Test dependencies:** `C:\Program Files\CreatorCrafter\venv\python.exe -c "import torch, audiocraft"`
4. **Check FFmpeg:** `C:\Program Files\CreatorCrafter\resources\ffmpeg\ffmpeg.exe -version`

For persistent issues, see troubleshooting section or contact support.

---

**Ready to build! Upload to Google Drive and follow the steps above.**
