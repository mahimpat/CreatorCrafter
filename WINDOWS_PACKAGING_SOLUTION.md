# Windows Packaging Solution - AudioCraft Deployment Issues

**Problem:** Windows users face AudioCraft installation failures due to:
1. xformers compilation requiring C++ build tools (7GB Visual Studio)
2. PyAV (av package) build failures
3. Python version mismatches
4. Dependency version conflicts

**Solution:** Pre-package Python environment with all dependencies

---

## The Problem in Detail

### Current Installer Flow (BROKEN)
```
1. User installs CreatorCrafter.exe
2. Installer creates Python venv
3. Installer tries: pip install audiocraft
4. ❌ FAILS: xformers needs Visual Studio
5. ❌ FAILS: PyAV needs FFmpeg dev libraries
6. User gets broken installation
7. User has to remote in for fixes
```

### Why It Fails on Windows

| Package | Windows Issue | Success Rate |
|---------|---------------|--------------|
| torch | ✅ Pre-built wheels available | 95% |
| numpy | ✅ Pre-built wheels available | 95% |
| audiocraft | ❌ Tries to build xformers from source | 20% |
| av (PyAV) | ❌ Needs FFmpeg C libraries | 30% |
| scipy | ⚠️ Sometimes needs compilation | 70% |

---

## Solution 1: Bundle Pre-Built Python Environment (RECOMMENDED)

### Concept

Instead of building on user's machine, **ship a pre-built Python environment**.

```
┌─────────────────────────────────────────┐
│   CreatorCrafter Installer              │
│                                         │
│   1. Extract pre-built Python env      │
│   2. Extract all dependencies (ready)  │
│   3. Extract AI models (optional)      │
│   4. Done! ✅                           │
└─────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Build Python Environment on Windows VM

**On a Windows machine or VM:**

```powershell
# Create a clean Python 3.11 environment
python -m venv venv_dist

# Activate
.\venv_dist\Scripts\activate

# Install EXACT working versions
pip install numpy==1.26.4
pip install torch==2.1.0 torchaudio==2.1.0 --index-url https://download.pytorch.org/whl/cpu
pip install transformers==4.35.0
pip install opencv-python==4.8.1.78
pip install librosa==0.11.0
pip install soundfile==0.13.1
pip install Pillow==11.3.0
pip install scipy==1.16.2
pip install scenedetect==0.6.7.1

# Install AudioCraft (ignore xformers warnings)
pip install audiocraft==1.3.0 --no-deps
pip install einops hydra-core omegaconf julius

# Install other dependencies
pip install -r requirements.txt

# Test that everything imports
python -c "import torch; import audiocraft; import whisper; print('All OK')"
```

#### Step 2: Package the Environment

**On Windows:**

```powershell
# Create distributable package
# Compress venv_dist into venv_dist.zip
Compress-Archive -Path venv_dist -DestinationPath python-env-windows-x64.zip

# Upload to release assets or S3
# Size will be ~1.5-2GB
```

#### Step 3: Update Installer to Use Pre-Built Environment

**Modify `build/installer.nsh`:**

```nsh
Section "Install"
  ; Extract application files
  SetOutPath "$INSTDIR"
  File /r "dist\*.*"

  ; Download pre-built Python environment (if not included)
  DetailPrint "Downloading pre-built Python environment..."
  DetailPrint "This is a one-time 1.5GB download..."

  inetc::get /RESUME "" \
    "https://your-cdn.com/python-env-windows-x64.zip" \
    "$TEMP\python-env.zip"

  Pop $0
  ${If} $0 != "OK"
    MessageBox MB_ICONSTOP "Failed to download Python environment"
    Abort
  ${EndIf}

  ; Extract pre-built environment
  DetailPrint "Extracting Python environment..."
  nsisunz::Unzip "$TEMP\python-env.zip" "$INSTDIR"

  ; Rename to venv
  Rename "$INSTDIR\venv_dist" "$INSTDIR\venv"

  ; Done! No pip install needed!
  DetailPrint "Installation complete!"
SectionEnd
```

---

## Solution 2: Bundle Everything in Installer (EASIEST)

### Concept

Include the entire Python environment **inside the installer**.

**Pros:**
- ✅ Single .exe file
- ✅ No internet required
- ✅ 100% reliable

**Cons:**
- ❌ Installer size: ~2GB
- ❌ Slow to download

### Implementation

**Update `package.json`:**

```json
{
  "build": {
    "extraResources": [
      {
        "from": "python-env-windows",
        "to": "venv"
      },
      {
        "from": "python",
        "to": "python"
      }
    ]
  }
}
```

**Build steps:**

```bash
# 1. Build Python env on Windows (as shown above)
# 2. Copy venv_dist to project as python-env-windows
# 3. Build installer
npm run electron:build:win

# Result: CreatorCrafter Setup.exe (~2GB)
```

**NSIS installer becomes simple:**

```nsh
Section "Install"
  ; Just extract - no pip install!
  SetOutPath "$INSTDIR"
  File /r "dist\*.*"

  ; venv already included in extraResources
  ; Application is ready to use immediately

  CreateShortCut "$DESKTOP\CreatorCrafter.lnk" "$INSTDIR\CreatorCrafter.exe"
SectionEnd
```

---

## Solution 3: Portable Python with Embeddable Package

### Concept

Use Python's **embeddable package** (smaller, portable).

**Steps:**

1. **Download Python Embeddable:**
   ```powershell
   # Download from python.org
   https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip
   ```

2. **Install pip manually:**
   ```powershell
   # Extract embeddable package
   # Download get-pip.py
   python get-pip.py
   ```

3. **Install packages to embedded Python:**
   ```powershell
   .\python.exe -m pip install -r requirements.txt
   ```

4. **Bundle with installer**

**Pros:**
- ✅ Smaller than full Python (~50MB vs 100MB)
- ✅ Portable
- ✅ No system Python required

**Cons:**
- ⚠️ More complex setup
- ⚠️ Some packages may not work

---

## Solution 4: PyInstaller/Nuitka (Single Executable)

### Concept

Compile everything into a single `.exe` (Python + dependencies + models).

**Using PyInstaller:**

```bash
# On Windows
pip install pyinstaller

# Create spec file
pyi-makespec --onefile --add-data "python:python" --add-data "venv:venv" main.py

# Build
pyinstaller main.spec
```

**Pros:**
- ✅ Single executable
- ✅ No Python installation needed
- ✅ Professional deployment

**Cons:**
- ❌ Very large file (3-4GB with models)
- ❌ Complex to configure
- ❌ May break with certain packages

---

## Recommended Approach: Hybrid

**Combine solutions for best results:**

### Architecture

```
CreatorCrafter-Setup.exe (200MB) ←─ Small installer
    │
    ├─ Application files (150MB)
    ├─ Python runtime (50MB)
    │
    └─ On first run:
       ├─ Download dependencies package (1.5GB) ← Pre-built
       └─ Download AI models (500MB) ← Optional
```

### Implementation

**1. Build lightweight installer:**

```bash
# Package only app + Python runtime
# Exclude venv packages
```

**2. First-run setup:**

```typescript
// In Electron main.ts
async function firstRunSetup() {
  const venvExists = fs.existsSync(join(appRoot, 'venv'))

  if (!venvExists) {
    // Show progress dialog
    showDialog('Downloading dependencies...')

    // Download pre-built venv package
    await downloadFile(
      'https://cdn.example.com/python-env-v1.0.zip',
      join(appRoot, 'python-env.zip')
    )

    // Extract
    await extractZip('python-env.zip', join(appRoot, 'venv'))

    // Done!
    showDialog('Setup complete!')
  }
}
```

**3. Benefits:**

- ✅ Small initial download (200MB)
- ✅ Fast installation
- ✅ Reliable dependencies (pre-built)
- ✅ One-time 1.5GB download (cached)
- ✅ Works offline after first run

---

## Detailed Implementation: Pre-Built Venv

### Step-by-Step Guide

#### Phase 1: Build on Windows

**On Windows 10/11 machine:**

```powershell
# 1. Install Python 3.11
# Download from python.org

# 2. Create project directory
mkdir C:\CreatorCrafter-Build
cd C:\CreatorCrafter-Build

# 3. Create venv
python -m venv venv

# 4. Activate
.\venv\Scripts\activate

# 5. Install dependencies in EXACT order
pip install --upgrade pip

# NumPy first
pip install numpy==1.26.4

# PyTorch (CPU)
pip install torch==2.1.0 torchaudio==2.1.0 --index-url https://download.pytorch.org/whl/cpu

# AudioCraft dependencies (skip xformers)
pip install einops==0.8.1
pip install hydra-core==1.3.2
pip install omegaconf==2.3.0
pip install julius==0.2.7
pip install encodec==0.1.1
pip install flashy==0.0.2

# AudioCraft (no deps to avoid xformers)
pip install audiocraft==1.3.0 --no-deps

# Transformers
pip install transformers==4.35.0

# Audio/Video processing
pip install librosa==0.11.0
pip install soundfile==0.13.1
pip install opencv-python==4.8.1.78
pip install scenedetect==0.6.7.1

# Whisper
pip install openai-whisper==20250625

# Other essentials
pip install Pillow==11.3.0
pip install scipy==1.16.2
pip install requests==2.32.5
pip install tqdm==4.67.1

# PyAV (this might fail - optional)
pip install av==16.0.1
# If fails, skip it - not critical
```

**6. Verify installation:**

```powershell
python -c "import torch; print('PyTorch:', torch.__version__)"
python -c "import audiocraft; print('AudioCraft OK')"
python -c "import whisper; print('Whisper OK')"
python -c "import transformers; print('Transformers OK')"
```

**7. Clean unnecessary files:**

```powershell
# Remove pip cache
pip cache purge

# Remove __pycache__
Get-ChildItem -Path venv -Include __pycache__ -Recurse -Force | Remove-Item -Force -Recurse

# Remove .pyc files
Get-ChildItem -Path venv -Filter *.pyc -Recurse -Force | Remove-Item -Force
```

**8. Package venv:**

```powershell
# Compress
Compress-Archive -Path venv -DestinationPath python-env-windows-x64-v1.0.zip -CompressionLevel Optimal

# Check size
(Get-Item python-env-windows-x64-v1.0.zip).Length / 1MB
# Should be ~800-1200 MB
```

---

#### Phase 2: Host Pre-Built Package

**Option A: GitHub Releases**

```bash
# Upload to GitHub releases
gh release create v1.0.0 python-env-windows-x64-v1.0.zip
```

**Option B: AWS S3**

```bash
# Upload to S3
aws s3 cp python-env-windows-x64-v1.0.zip s3://creatorcrafter-deps/

# Make public
aws s3api put-object-acl --bucket creatorcrafter-deps --key python-env-windows-x64-v1.0.zip --acl public-read
```

**Option C: CDN (Recommended)**

Use CloudFlare, Cloudinary, or similar for fast downloads worldwide.

---

#### Phase 3: Update Installer

**Create download script:**

```javascript
// electron/downloadDependencies.ts
import { download } from 'electron-dl'
import { extract } from 'extract-zip'

export async function downloadPythonEnv(win: BrowserWindow) {
  const url = 'https://cdn.example.com/python-env-windows-x64-v1.0.zip'
  const destPath = join(app.getPath('userData'), 'python-env.zip')

  // Download with progress
  await download(win, url, {
    directory: app.getPath('userData'),
    filename: 'python-env.zip',
    onProgress: (progress) => {
      win.webContents.send('download-progress', progress.percent)
    }
  })

  // Extract
  const venvPath = join(app.getPath('userData'), '..', 'venv')
  await extract(destPath, { dir: venvPath })

  // Cleanup
  fs.unlinkSync(destPath)
}
```

**Update main.ts:**

```typescript
app.on('ready', async () => {
  const venvExists = fs.existsSync(getVenvPath())

  if (!venvExists) {
    // Show splash screen
    const splash = new BrowserWindow({ /*...*/ })
    splash.loadFile('splash.html')

    // Download dependencies
    await downloadPythonEnv(splash)

    splash.close()
  }

  // Continue normal startup
  createWindow()
})
```

---

## Testing Checklist

### Test Pre-Built Package

- [ ] Extract on clean Windows 10 machine
- [ ] Test Python imports: `python -c "import audiocraft"`
- [ ] Run video_analyzer.py
- [ ] Run audiocraft_generator.py
- [ ] Generate SFX
- [ ] Analyze video

### Test Installer

- [ ] Install on clean Windows machine
- [ ] First run downloads dependencies
- [ ] Application launches
- [ ] Import video works
- [ ] Analyze video works
- [ ] Generate SFX works
- [ ] Export video works

---

## Version Management

**Create versioned packages:**

```
python-env-windows-x64-v1.0.zip  (torch 2.1.0, audiocraft 1.3.0)
python-env-windows-x64-v1.1.zip  (updated versions)
python-env-windows-x64-v2.0.zip  (major update)
```

**Check for updates:**

```typescript
async function checkDependencyVersion() {
  const localVersion = readVersionFile()
  const remoteVersion = await fetch('https://cdn.example.com/latest-version.json')

  if (remoteVersion > localVersion) {
    showUpdateDialog()
  }
}
```

---

## Cost Analysis

### Bandwidth Costs

**Per installation:**
- Pre-built venv download: 1.2 GB
- AI models download: 500 MB
- **Total:** ~1.7 GB

**100 users:**
- Total bandwidth: 170 GB
- S3 cost: ~$1.50
- CloudFront cost: ~$8.50

**1000 users:**
- Total bandwidth: 1.7 TB
- Cost: ~$150

**Recommendation:** Use CDN with caching to reduce costs.

---

## Summary

### Problems Solved

✅ No more xformers compilation failures
✅ No more PyAV build issues
✅ No more Visual Studio requirements
✅ No more version mismatches
✅ No more remote login needed
✅ Consistent experience for all users

### Trade-offs

❌ Larger initial package (1-2GB vs 200MB)
❌ Need Windows machine to build venv
❌ Need hosting for pre-built package
❌ Updates require rebuilding venv

### When to Use Each Approach

| Approach | Best For | Difficulty |
|----------|----------|------------|
| **Pre-built venv download** | Production | Medium |
| **Bundled in installer** | Simple deployment | Easy |
| **Portable Python** | Advanced users | Hard |
| **PyInstaller** | Commercial product | Very Hard |

---

## Next Steps

1. [ ] Build pre-built venv on Windows
2. [ ] Test on clean Windows machine
3. [ ] Upload to CDN/S3
4. [ ] Update installer to download on first run
5. [ ] Test end-to-end installation
6. [ ] Document for users

---

**Recommended: Pre-built venv with first-run download**

This gives best balance of:
- Installation speed
- Reliability
- User experience
- Maintainability

Would you like me to help implement this solution?
