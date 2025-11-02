# Windows Hotfix Instructions

Your CreatorCrafter installation has an issue with Python path detection on Windows. Follow these steps to fix it:

## Quick Fix (Recommended)

### Step 1: Run the Diagnostic Script
1. Navigate to your CreatorCrafter installation folder (usually `C:\Program Files\CreatorCrafter` or wherever you installed it)
2. Copy the file `windows-diagnostic.bat` to this folder
3. Right-click `windows-diagnostic.bat` and select "Run as Administrator"
4. Check what's missing

### Step 2: Run the Hotfix Script
1. Copy the file `windows-hotfix.bat` to your CreatorCrafter installation folder
2. Right-click `windows-hotfix.bat` and select "Run as Administrator"
3. Wait for it to complete (may take 10-15 minutes to download AI models)

### Step 3: Manual Fix (Path Issue)

The app is looking for Python in the wrong location. You need to manually edit the main.js file:

**Location:** `C:\Program Files\CreatorCrafter\resources\app.asar.unpacked\dist-electron\main.js`
OR: `C:\Program Files\CreatorCrafter\resources\dist-electron\main.js`

**Find these lines (around line 269 and 355):**
```javascript
const pythonPath = join(appRoot, 'venv', 'bin', 'python')
```

**Replace with:**
```javascript
const pythonPath = process.platform === 'win32'
  ? join(appRoot, 'venv', 'Scripts', 'python.exe')
  : join(appRoot, 'venv', 'bin', 'python')
```

**There are TWO occurrences** - one for SFX generation and one for video analysis. Fix both!

## Alternative: Use System Python (Temporary Workaround)

If the above doesn't work, you can use your system Python instead:

1. Install Python 3.8+ from https://www.python.org/downloads/
2. During installation, CHECK "Add Python to PATH"
3. Open Command Prompt as Administrator and run:
```cmd
cd "C:\Program Files\CreatorCrafter"
python -m pip install torch torchvision torchaudio
python -m pip install transformers audiocraft whisper opencv-python
```

Then edit `main.js` and change:
```javascript
const pythonPath = 'python'  // Use system Python
```

## Files to Copy to Windows Machine

Copy these files from your build machine to the Windows installation directory:

1. `windows-hotfix.bat` - Automated setup script
2. `windows-diagnostic.bat` - Diagnostic tool
3. This instruction file

## Checking if it Works

After running the hotfix:

1. Close CreatorCrafter completely
2. Restart the application
3. Try to analyze a video or generate SFX
4. If it still fails, check the diagnostic output

## Common Issues

**"Python not found"**
- Install Python from python.org
- Make sure "Add to PATH" was checked during installation

**"Permission denied"**
- Run the scripts as Administrator
- Make sure antivirus isn't blocking them

**"Module not found" errors**
- The AI models might not have downloaded
- Run the hotfix script again
- Or manually run: `venv\Scripts\pip.exe install -r resources\requirements.txt`

**Still not working?**
- Check the app logs (usually in `%APPDATA%\CreatorCrafter\logs`)
- Make sure FFmpeg is installed: https://ffmpeg.org/download.html

## Need Help?

If none of this works, the issue might be with the installer itself. The next version will have this fixed.
