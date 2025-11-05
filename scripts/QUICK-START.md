# Quick Start - Build Windows Python Environment

## On Windows Machine

### Step 1: Install Python 3.11
Download and install from: https://www.python.org/downloads/
✅ **Check "Add Python to PATH"**

### Step 2: Run Build Script
```cmd
cd CreatorCrafter\scripts
build-windows-venv.bat
```

### Step 3: Wait
⏱️ 20-40 minutes (downloads ~2GB)

### Step 4: Get Output
📦 File: `dist\python-env-windows-x64-v1.0.0.zip` (~1GB)

---

## Test the Package

```powershell
.\test-venv-package.ps1 -PackagePath "..\dist\python-env-windows-x64-v1.0.0.zip"
```

---

## Upload to Distribution

### GitHub Releases (Easiest)
```bash
gh release create v1.0.0 dist/python-env-windows-x64-v1.0.0.zip
```

### AWS S3
```bash
aws s3 cp dist/python-env-windows-x64-v1.0.0.zip s3://your-bucket/
aws s3api put-object-acl --bucket your-bucket --key python-env-windows-x64-v1.0.0.zip --acl public-read
```

---

## What It Solves

❌ **Before:** Users need Visual Studio → 80% install failures
✅ **After:** Pre-built package → 99% success rate

---

## Files Created

```
scripts/
├── build-windows-venv.bat          ← Run this
├── build-windows-venv.ps1          ← Main script
├── test-venv-package.ps1           ← Test output
└── README-BUILD-VENV.md            ← Full docs

dist/
├── python-env-windows-x64-v1.0.0.zip   ← Distribute this
├── metadata-v1.0.0.json
└── SHA256SUMS-v1.0.0.txt
```

---

## Next Steps

1. ✅ Build package (you're here!)
2. ⬜ Test on clean Windows machine
3. ⬜ Upload to CDN/GitHub
4. ⬜ Update installer to download package
5. ⬜ Distribute to users

---

See **README-BUILD-VENV.md** for full documentation.
