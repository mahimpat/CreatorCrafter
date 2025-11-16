# Building Windows Installer from Ubuntu

This guide explains how to build the Windows installer (`CreatorCrafter-Setup.exe`) directly from your Ubuntu development machine.

## ✅ Prerequisites Installed

- ✅ **NSIS** v3.09-4 - Installed via apt
- ✅ **Node.js** v18+ - Already have for development
- ✅ **Build script** - `build-windows-installer-linux.sh` created

## 🚀 Quick Start

### One-Command Build

```bash
./build-windows-installer-linux.sh
```

This script will:
1. Clean previous builds
2. Install npm dependencies (if needed)
3. Build Electron app for Windows
4. Create NSIS installer
5. Output: `CreatorCrafter-Setup.exe`

## 📋 Step-by-Step Build Process

### Step 1: Verify Prerequisites

```bash
# Check NSIS
makensis -VERSION
# Should show: v3.09-4

# Check Node.js
node --version
# Should show: v18.x or higher
```

### Step 2: Install Dependencies (First Time Only)

```bash
cd /home/mahim/CreatorCrafter
npm install
```

### Step 3: Run Build Script

```bash
./build-windows-installer-linux.sh
```

**Expected output:**
```
=======================================
CreatorCrafter Windows Installer Build
Running on: Linux
=======================================

✓ NSIS found: v3.09-4

[1/5] Cleaning previous builds...
✓ Clean complete

[2/5] ✓ Dependencies already installed

[3/5] Building Electron application for Windows...
This may take a few minutes...
✓ Electron build complete

[4/5] Verifying build output...
✓ All required files present

[5/5] Creating NSIS installer...
Running makensis...

=======================================
✓ Build Complete!
=======================================

Installer created: CreatorCrafter-Setup.exe
Size: 15M

You can now distribute this installer to Windows users.
```

### Step 4: Test the Installer

Transfer `CreatorCrafter-Setup.exe` to a Windows machine and run it.

## 🔧 Manual Build (Alternative Method)

If you prefer to run commands manually:

```bash
# 1. Clean previous builds
rm -rf dist dist-electron release CreatorCrafter-Setup.exe

# 2. Build Electron app for Windows
npm run build:win

# 3. Create NSIS installer
makensis installer.nsi
```

## 📦 Build Output

After successful build, you'll have:

```
CreatorCrafter-Setup.exe    (~15-20 MB)
```

This single file contains:
- Electron application (bundled)
- Python installation logic
- Dependency installation scripts
- Desktop/Start Menu shortcuts

## ⚙️ How Cross-Platform Building Works

### Electron Builder
- **electron-builder** supports cross-platform builds natively
- Can build Windows apps from Linux/Mac
- Uses Wine (optional) for some Windows-specific operations
- Downloads Windows-specific dependencies automatically

### NSIS on Linux
- **makensis** works natively on Linux
- Compiles Windows installers without Wine
- Uses standard NSIS plugins (NSISdl for downloads)
- Output `.exe` runs perfectly on Windows

## 🐛 Troubleshooting

### Build Fails: "wine: not found"

**Solution:** Wine is optional. The build should still work.

If you want to install Wine anyway:
```bash
sudo apt-get install wine wine64
```

### Build Fails: "electron-builder: command not found"

**Solution:** Install dependencies:
```bash
npm install
```

### Build Fails: "makensis: command not found"

**Solution:** NSIS not installed properly:
```bash
sudo apt-get update
sudo apt-get install nsis
makensis -VERSION  # Verify
```

### Installer Created but Very Small (<1 MB)

**Problem:** Electron build files not included

**Solution:** Check that `dist/win-unpacked` exists:
```bash
ls -la dist/win-unpacked/
```

If missing, rebuild:
```bash
rm -rf dist
npm run build:win
```

### Python Download Fails in Installer

**Note:** This is expected behavior on first run. The Windows installer will download Python 3.9 from python.org when first run on Windows.

If you want to bundle Python offline, you need to:
1. Download `python-3.9.13-amd64.exe`
2. Modify NSIS script to include it in installer
3. Increases installer size by ~25MB

## 📊 Build Performance

| Step | Duration | Output |
|------|----------|--------|
| Clean | <1 sec | - |
| npm install | 1-2 min (first time) | node_modules/ |
| Electron build | 2-5 min | dist/win-unpacked/ |
| NSIS compile | 10-30 sec | CreatorCrafter-Setup.exe |
| **Total** | **~5-8 min** | **~15-20 MB installer** |

## 🔐 Code Signing (Optional)

For production releases, you should sign the installer:

1. **Get a code signing certificate** (e.g., from DigiCert, Sectigo)
2. **Install signtool** on Windows build machine
3. **Sign the executable:**
   ```cmd
   signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com CreatorCrafter-Setup.exe
   ```

Note: Code signing requires Windows tools and can't be done from Linux.

## 📤 Distribution

After building, you can distribute `CreatorCrafter-Setup.exe` via:

- **Direct download** - Host on your website
- **GitHub Releases** - Attach to release
- **Cloud storage** - Google Drive, Dropbox, etc.
- **Package managers** - Chocolatey, Scoop (advanced)

## 🎯 Testing Checklist

Before distributing, test the installer on:

- [ ] Fresh Windows 10 installation
- [ ] Fresh Windows 11 installation
- [ ] Windows with Python already installed
- [ ] Windows without Python
- [ ] Windows with slow internet (Python download)
- [ ] Windows with antivirus enabled

## 📝 Build Script Details

### What `build-windows-installer-linux.sh` Does

1. **Checks for NSIS** - Exits if not found
2. **Warns about Wine** - Optional, not required
3. **Cleans builds** - Removes old files
4. **Installs dependencies** - If node_modules missing
5. **Builds Electron** - Creates Windows unpacked app
6. **Verifies output** - Checks all files present
7. **Creates installer** - Runs makensis
8. **Shows summary** - Size, distribution info

### Build Script Options

You can modify the script to:
- Skip cleaning: Comment out `rm -rf dist`
- Skip npm install: Comment out npm install section
- Add verbose output: Add `-V4` to makensis command
- Custom output name: Modify NSIS OutFile directive

## 🔄 CI/CD Integration

To integrate into GitHub Actions:

```yaml
name: Build Windows Installer

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install NSIS
        run: sudo apt-get install -y nsis
      - name: Build Installer
        run: ./build-windows-installer-linux.sh
      - name: Upload Artifact
        uses: actions/upload-artifact@v3
        with:
          name: windows-installer
          path: CreatorCrafter-Setup.exe
```

## 📞 Support

If you encounter issues:
1. Check the build log output
2. Verify all prerequisites are installed
3. Try manual build steps one at a time
4. Check GitHub Issues for similar problems

---

**Ready to build?** Run: `./build-windows-installer-linux.sh`
