# Python Script Protection Options

This document explains the different levels of protection available for Python scripts in CreatorCrafter.

## TL;DR - Quick Comparison

| Method | Protection Level | Accessibility | Size Impact | Effort |
|--------|-----------------|---------------|-------------|--------|
| **Source Code** (default) | ⭐ Low | Fully readable | Minimal | None |
| **Resources Directory** | ⭐⭐ Medium | Needs admin | Minimal | ✓ Done |
| **Bytecode (.pyc)** | ⭐⭐⭐ Good | Hard to read | Minimal | Easy |
| **PyInstaller Executables** | ⭐⭐⭐⭐ Excellent | Binary only | +50-100 MB/script | Moderate |

## Current Implementation: Resources Directory Protection

**Status**: ✅ IMPLEMENTED

The Python scripts are currently packaged in the application's `resources/` directory, which provides basic protection.

### What's Protected:
```
Installation Directory/
└── resources/               # ← Needs admin/root access
    ├── python/
    │   ├── video_analyzer.py      # Protected by OS permissions
    │   ├── audiocraft_generator.py
    │   └── download_models.py
    └── requirements.txt
```

### Protection Level:
- ⭐⭐ **Medium Protection**
- Scripts are outside user's normal access
- Requires admin privileges to modify (Windows/Linux)
- Inside app bundle (macOS)

### Pros:
- ✅ No additional build steps
- ✅ Small file size
- ✅ Easy to debug
- ✅ Works across all platforms

### Cons:
- ❌ Still readable by users with admin access
- ❌ Can be copied and modified
- ❌ Source code visible

---

## Option 1: Bytecode Compilation (.pyc)

**Status**: 📝 READY TO USE

Compile Python scripts to bytecode, making them harder (but not impossible) to read.

### How to Use:

```bash
# Compile scripts to .pyc files
npm run compile:python

# Then build installer
npm run electron:build:secure
```

### What It Does:

```
python/
├── video_analyzer.py      # Source code
└── dist/
    └── video_analyzer.pyc  # Compiled bytecode
```

Bytecode is:
- Machine-readable but not human-readable
- Can be decompiled with tools (but requires effort)
- Same performance as source code
- Much smaller than executables

### Protection Level:
- ⭐⭐⭐ **Good Protection**
- Not easily readable
- Requires decompiler to reverse
- Deters casual users

### Implementation:

The `compile_scripts.py` script automatically:
1. Compiles all `.py` files to `.pyc`
2. Places them in `python/dist/`
3. Packager includes `.pyc` instead of `.py`

### To Enable:

1. Run compilation:
   ```bash
   npm run compile:python
   ```

2. Update `package.json` extraResources to use `python/dist/`:
   ```json
   "extraResources": [
     {
       "from": "python/dist",
       "to": "python",
       "filter": ["**/*.pyc"]
     }
   ]
   ```

3. Build as usual:
   ```bash
   npm run electron:build
   ```

### Pros:
- ✅ Much harder to read than source
- ✅ Same file size as source
- ✅ Same performance
- ✅ Works on all platforms
- ✅ Easy to implement

### Cons:
- ❌ Can still be decompiled with tools
- ❌ Not truly secure
- ❌ Debug stack traces less readable

---

## Option 2: PyInstaller Executables (Recommended for Maximum Security)

**Status**: 📝 READY TO USE

Convert Python scripts to standalone binary executables that cannot be easily reversed.

### How to Use:

```bash
# Install PyInstaller (one-time)
pip install pyinstaller

# Build executables
npm run build:python:exe

# Then build installer
npm run electron:build
```

### What It Does:

```
python/dist/
├── video_analyzer          # Standalone binary (Linux/macOS)
├── video_analyzer.exe      # Standalone binary (Windows)
├── audiocraft_generator    # Each script becomes an executable
└── download_models
```

### Protection Level:
- ⭐⭐⭐⭐ **Excellent Protection**
- Compiled to machine code
- Very difficult to reverse engineer
- No Python interpreter needed

### File Size Impact:

| Component | Source | ByteCode | Executable |
|-----------|--------|----------|------------|
| video_analyzer | ~15 KB | ~15 KB | **~80 MB** |
| audiocraft_generator | ~12 KB | ~12 KB | **~85 MB** |
| download_models | ~8 KB | ~8 KB | **~65 MB** |
| **Total** | ~35 KB | ~35 KB | **~230 MB** |

**Total installer size increase**: +200-250 MB

### Implementation Steps:

1. **Install PyInstaller**:
   ```bash
   pip install pyinstaller
   ```

2. **Build executables**:
   ```bash
   npm run build:python:exe
   ```

3. **Update package.json** to use executables:
   ```json
   "extraResources": [
     {
       "from": "python/dist",
       "to": "python",
       "filter": ["video_analyzer*", "audiocraft_generator*", "download_models*", "!*.spec", "!*.py"]
     }
   ]
   ```

4. **Update electron/main.ts** to execute binaries:
   ```typescript
   // Instead of:
   const pythonPath = join(appRoot, 'venv', 'bin', 'python')
   const pythonScript = join(appRoot, 'python', 'video_analyzer.py')

   // Use:
   const executable = join(appRoot, 'python', 'video_analyzer') // or .exe on Windows
   ```

5. **Build installer**:
   ```bash
   npm run electron:build
   ```

### Pros:
- ✅ **Maximum security** - nearly impossible to reverse
- ✅ No Python installation required
- ✅ Faster startup (no import time)
- ✅ All dependencies bundled
- ✅ Cannot be modified by users

### Cons:
- ❌ **Much larger file sizes** (+200-250 MB)
- ❌ Must build on each target platform
- ❌ Longer build time (5-10 minutes)
- ❌ More complex troubleshooting
- ❌ Anti-virus may flag executables

---

## Comparison Matrix

### Source Code (Default)
```python
# video_analyzer.py
def analyze_video(path):
    # Fully readable code
    ...
```
- Anyone can read and understand
- Can be copied and modified
- Easy to debug

### Bytecode (.pyc)
```
# video_analyzer.pyc
d\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00
\x00\x00\x00\x00\x00\x00\xe3\x00\x00...
```
- Looks like gibberish to humans
- Requires decompiler to read
- Moderate deterrent

### Executable (PyInstaller)
```
# video_analyzer.exe
MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00
\x00\xff\xff\x00\x00\xb8\x00\x00\x00...
```
- Binary machine code
- Extremely difficult to reverse
- Strong protection

---

## Recommendations

### For MVP / Beta Testing:
**Use Resources Directory + Bytecode**
- Good balance of security and size
- Easy to implement: `npm run compile:python`
- Deters casual modification
- Installer stays small

### For Public Release:
**Use PyInstaller Executables**
- Maximum protection
- Professional appearance
- No Python dependency
- Worth the larger size for security

### For Open Source:
**Use Source Code**
- Transparency is the goal
- Users can audit code
- Community contributions possible

---

## Implementation Guide

### Quick Start - Add Bytecode Protection Now:

1. **Compile scripts**:
   ```bash
   python3 python/compile_scripts.py
   ```

2. **Update package.json**:
   ```json
   "extraResources": [
     {
       "from": "python/dist",
       "to": "python",
       "filter": ["**/*.pyc"]
     }
   ]
   ```

3. **Update main.ts** to use `.pyc`:
   ```typescript
   const pythonScript = join(appRoot, 'python', 'video_analyzer.pyc')
   ```

4. **Build**:
   ```bash
   npm run electron:build:secure
   ```

### Advanced - Switch to PyInstaller:

1. **Install PyInstaller**:
   ```bash
   pip install pyinstaller
   ```

2. **Build executables**:
   ```bash
   python3 python/build_executables.py
   ```

3. **Test executables**:
   ```bash
   ./python/dist/video_analyzer --help
   ```

4. **Update package.json** (see Option 2 above)

5. **Update main.ts** to execute binaries

6. **Build and test**:
   ```bash
   npm run electron:build
   ```

---

## Security Considerations

### None of These Methods Provide Perfect Security

- Determined attackers can reverse any protection
- Bytecode can be decompiled (tools available)
- Executables can be disassembled (difficult but possible)
- Source code can always leak through other means

### Best Practices:

1. **Don't store secrets in Python scripts**
   - API keys should be in `.env`
   - Credentials should be user-provided

2. **Assume code will be seen eventually**
   - Don't rely on obscurity
   - Use proper authentication
   - Validate all inputs

3. **Focus on what matters**
   - Protect proprietary algorithms
   - Protect business logic
   - Less critical: data processing code

### For CreatorCrafter Specifically:

The AI scripts in CreatorCrafter are:
- Using open-source models (Whisper, AudioCraft)
- Implementing publicly known algorithms
- Not containing proprietary IP

**Recommendation**: Bytecode protection is sufficient for MVP. The goal is to prevent casual modification, not nation-state actors.

---

## Current Status & Next Steps

### Currently Implemented:
- ✅ Resources directory protection
- ✅ Admin-level file permissions
- ✅ Separate from user data

### Ready to Enable:
- 📝 Bytecode compilation (run `npm run compile:python`)
- 📝 PyInstaller executables (run `npm run build:python:exe`)

### Recommended for MVP:
**Resources Directory** (current) is acceptable for MVP/beta testing.

**Bytecode** for first public release (5 minutes to add).

**PyInstaller** for commercial release (worth the effort if selling).

---

## FAQ

**Q: Will users notice the difference?**
A: No. All methods work identically from the user's perspective.

**Q: Which method do you recommend?**
A: For MVP: Current (resources dir). For public: Bytecode. For commercial: PyInstaller.

**Q: Can I switch later?**
A: Yes. Just run the compile/build script and rebuild the installer.

**Q: Do I need all three?**
A: No. Pick one. Bytecode is the sweet spot for most cases.

**Q: Will this slow down the app?**
A: Bytecode: No. PyInstaller: Slightly faster startup, same runtime.

**Q: What about debugging?**
A: Source: Easy. Bytecode: Harder. PyInstaller: Use dev build for debugging.

---

For questions or issues, see SECURITY_NOTES.md or open a GitHub issue.
