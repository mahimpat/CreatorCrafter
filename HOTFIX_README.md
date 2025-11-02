# CreatorCrafter Windows Hotfix Package

## Problem

If you installed CreatorCrafter on Windows and get these errors:
- "Failed to analyze video. Please make sure Python and required dependencies are installed."
- "Failed to generate SFX. Make sure Python and AudioCraft are properly installed."

This hotfix will fix it!

## What's Wrong?

The installer has two issues:
1. **Path Issue**: The app looks for Python in the wrong location (Linux path instead of Windows path)
2. **Setup Issue**: The Python environment might not have been created during installation

## Quick Fix (5 Minutes)

### Prerequisites
- Python 3.8 or higher installed from https://www.python.org/downloads/
- Make sure you checked "Add Python to PATH" during installation
- Administrator access to your computer

### Steps

1. **Copy these files to your CreatorCrafter installation folder:**
   - `windows-hotfix.bat`
   - `windows-diagnostic.bat`
   - `windows-path-fix.js`

   Default installation folder is usually:
   - `C:\Program Files\CreatorCrafter`
   - Or `C:\Users\YourName\AppData\Local\Programs\CreatorCrafter`

2. **Run the diagnostic** (optional but recommended):
   - Right-click `windows-diagnostic.bat`
   - Select "Run as Administrator"
   - Check what's missing

3. **Apply the path fix:**
   - Open Command Prompt as Administrator
   - Navigate to CreatorCrafter folder: `cd "C:\Program Files\CreatorCrafter"`
   - Run: `node windows-path-fix.js`
   - This patches the app to use correct Windows paths

4. **Set up Python environment:**
   - Right-click `windows-hotfix.bat`
   - Select "Run as Administrator"
   - Wait 10-15 minutes for it to complete
   - It will download ~500MB of AI models

5. **Restart CreatorCrafter and test!**

## What Each File Does

### windows-diagnostic.bat
- Checks if Python is installed
- Checks if virtual environment exists
- Checks if required files are present
- Shows you exactly what's missing

### windows-path-fix.js
- Patches the app's main.js file to use Windows paths
- Creates a backup before modifying
- Fixes both video analysis and SFX generation

### windows-hotfix.bat
- Creates Python virtual environment
- Installs all required Python packages
- Downloads AI models (Whisper, AudioCraft, etc.)
- Can take 10-15 minutes

## Troubleshooting

### "Python not found"
**Problem**: Python isn't installed or not in PATH

**Solution**:
1. Install Python from https://www.python.org/downloads/
2. During installation, CHECK "Add Python to PATH"
3. Restart your computer
4. Run the hotfix again

### "Access denied" or "Permission denied"
**Problem**: Not running as Administrator

**Solution**:
- Right-click the .bat file
- Choose "Run as Administrator"
- Enter your admin password if prompted

### "node: command not found"
**Problem**: Node.js not installed (needed for path-fix.js)

**Solution**:
- Install Node.js from https://nodejs.org/
- Or skip the path-fix.js and use Manual Fix below

### Still not working?
Try the Manual Fix below.

## Manual Fix (If Scripts Don't Work)

If the automated scripts don't work, you can fix it manually:

### Step 1: Find the main.js file

Look in these locations:
- `C:\Program Files\CreatorCrafter\resources\app.asar.unpacked\dist-electron\main.js`
- `C:\Program Files\CreatorCrafter\resources\dist-electron\main.js`

### Step 2: Edit main.js

Open main.js in Notepad++ or any text editor (as Administrator).

**Find these lines** (there are TWO occurrences, around lines 269 and 357):
```javascript
const pythonPath = join(appRoot, 'venv', 'bin', 'python')
```

**Replace with**:
```javascript
const pythonPath = process.platform === 'win32'
  ? join(appRoot, 'venv', 'Scripts', 'python.exe')
  : join(appRoot, 'venv', 'bin', 'python')
```

**Save the file** (you may need to save as Administrator).

### Step 3: Create Python Environment

Open Command Prompt as Administrator:

```cmd
cd "C:\Program Files\CreatorCrafter"
python -m venv venv
venv\Scripts\pip.exe install --upgrade pip
venv\Scripts\pip.exe install -r resources\requirements.txt
venv\Scripts\python.exe resources\python\download_models.pyc
```

This will take 10-15 minutes.

### Step 4: Restart CreatorCrafter

Close the app completely and restart it.

## Verifying the Fix

After applying the fix:

1. Open CreatorCrafter
2. Import a video
3. Click "Analyze Video"
4. You should see: "Analyzing video..." (instead of error)
5. Try generating SFX
6. Should work without errors!

## What Gets Installed

The hotfix installs these Python packages:
- **PyTorch** - Deep learning framework (~2GB)
- **Whisper** - Speech recognition AI
- **AudioCraft** - Sound effects generation AI
- **OpenCV** - Video processing
- **Transformers** - AI model utilities

Total download size: ~500MB
Total disk space after installation: ~2GB

## Future Versions

This bug will be fixed in the next installer version. You won't need this hotfix for future updates.

## Need More Help?

If this hotfix doesn't work:

1. Check the diagnostic output: `windows-diagnostic.bat`
2. Look for error messages in: `%APPDATA%\CreatorCrafter\logs`
3. Make sure FFmpeg is installed: https://ffmpeg.org/download.html
4. Report the issue with the error message

## Files in This Package

- `HOTFIX_README.md` - This file
- `WINDOWS_HOTFIX_INSTRUCTIONS.md` - Detailed technical instructions
- `windows-hotfix.bat` - Automated Python setup script
- `windows-diagnostic.bat` - Diagnostic tool
- `windows-path-fix.js` - Path fix automation script

---

**Questions?** Check WINDOWS_HOTFIX_INSTRUCTIONS.md for more technical details.
