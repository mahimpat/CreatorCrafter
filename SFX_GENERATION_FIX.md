# SFX Generation Issue - Diagnosis and Fix

**Date:** November 3, 2025
**Issue:** Video analysis works, but SFX generation fails

---

## Problem

**Symptom:** After installing CreatorCrafter and clicking "Generate SFX", it fails to generate sound effects.

**Root Cause:** AudioCraft library failed to install during NSIS installation, but installer continued anyway without verifying it was actually importable.

---

## Why AudioCraft Fails to Install

AudioCraft has complex dependencies:
1. **xformers** - Optional optimization library that requires C++ build tools
2. **torch** - PyTorch (must be installed first)
3. **torchaudio** - Audio processing for PyTorch

On Windows without C++ build tools:
- xformers compilation fails ✅ **Expected - we handle this**
- But sometimes this causes the entire AudioCraft installation to fail ❌ **Not handled properly**

---

## Current Installer Behavior

**Problem in installer script (build/installer.nsh):**

```nsh
; Install audiocraft
nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install --prefer-binary audiocraft'
Pop $0

; If exit code != 0, just show warning and continue
${If} $0 != 0
  DetailPrint "WARNING: AudioCraft installation had warnings"
  DetailPrint "This is NORMAL on Windows - the app should still work!"
${EndIf}
```

**Issue:** We assumed non-zero exit code = xformers warnings (OK), but it could also mean AudioCraft completely failed to install (NOT OK).

---

## Fix Applied

### Improved Installer Verification ✅

**Updated installer script:**

```nsh
; Install audiocraft
nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install --prefer-binary audiocraft'
Pop $0

; VERIFY AudioCraft can actually be imported
DetailPrint "Verifying AudioCraft installation..."
nsExec::ExecToLog '"$INSTDIR\venv\Scripts\python.exe" -c "import audiocraft; print(\"AudioCraft OK\")"'
Pop $1

${If} $1 != 0
  DetailPrint "ERROR: AudioCraft failed to install properly!"
  DetailPrint "SFX generation will not work until AudioCraft is installed."
  DetailPrint "After installation, run windows-hotfix-v3.bat to fix this."
${Else}
  DetailPrint "✓ AudioCraft verified successfully!"
${EndIf}
```

**Improvement:**
- ✅ Actually tests if AudioCraft can be imported
- ✅ Distinguishes between warnings (OK) and failures (NOT OK)
- ✅ Informs user if SFX won't work
- ✅ Directs user to fix script

---

## For Existing Installations (Your Current Issue)

### Quick Fix Option 1: Use fix-audiocraft-only.bat

**NEW SCRIPT** included in installer: `fix-audiocraft-only.bat`

**Steps:**
1. Navigate to: `C:\Program Files\CreatorCrafter\`
2. Right-click: `fix-audiocraft-only.bat`
3. Select: "Run as Administrator"
4. Wait 5-10 minutes
5. Restart CreatorCrafter

**What it does:**
- Attempts to install AudioCraft
- Verifies it can be imported
- Shows clear success/failure message

---

### Quick Fix Option 2: Manual Command

**If you're comfortable with command line:**

1. Open Command Prompt as Administrator
2. Run:
   ```cmd
   cd "C:\Program Files\CreatorCrafter"
   venv\Scripts\pip.exe install --prefer-binary audiocraft
   venv\Scripts\python.exe -c "import audiocraft; print('AudioCraft OK')"
   ```
3. If you see "AudioCraft OK", restart CreatorCrafter

---

### Full Fix Option 3: Run windows-hotfix-v3.bat

**If quick fix doesn't work:**

1. Navigate to: `C:\Program Files\CreatorCrafter\`
2. Right-click: `windows-hotfix-v3.bat`
3. Select: "Run as Administrator"
4. Wait 15-20 minutes (reinstalls everything)
5. Restart CreatorCrafter

---

## Diagnosis Steps

### Check if AudioCraft is Installed

**Command Prompt:**
```cmd
cd "C:\Program Files\CreatorCrafter"
venv\Scripts\python.exe -c "import audiocraft; print('Installed')"
```

**Expected Results:**

**If AudioCraft IS installed:**
```
Installed
```

**If AudioCraft is NOT installed:**
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
ModuleNotFoundError: No module named 'audiocraft'
```

---

## Why Analysis Works But SFX Doesn't

**Different dependencies:**

| Feature | Python Package | Installation Difficulty |
|---------|---------------|------------------------|
| Video Analysis | `openai-whisper` | ✅ Easy (pure Python wheels) |
| | `transformers` | ✅ Easy (pure Python wheels) |
| | `Pillow`, `opencv-python` | ✅ Easy (binary wheels available) |
| SFX Generation | `audiocraft` | ❌ Hard (has C++ dependencies) |
| | `xformers` (optional) | ❌ Very hard (requires build tools) |

**Result:**
- Whisper, transformers, opencv: Install successfully → Analysis works ✅
- AudioCraft: May fail to install → SFX doesn't work ❌

---

## Future Installer Improvements

### Improvement 1: Verify After Installation ✅ DONE
- Test import after installing each critical package
- Show clear error messages if verification fails

### Improvement 2: Fallback Installation Method
If standard pip install fails, try:
```cmd
pip install audiocraft --no-deps
pip install torch torchaudio
```

### Improvement 3: Pre-Download Wheels
- Include pre-built wheels for common Python versions
- Install from local wheels instead of downloading

---

## Files Modified

### 1. build/installer.nsh
**Change:** Added AudioCraft import verification
```nsh
nsExec::ExecToLog '"$INSTDIR\venv\Scripts\python.exe" -c "import audiocraft; print(\"AudioCraft OK\")"'
```

### 2. fix-audiocraft-only.bat (NEW)
**Purpose:** Quick fix script for AudioCraft installation issues
**Location:** Installed to `C:\Program Files\CreatorCrafter\fix-audiocraft-only.bat`

### 3. package.json
**Change:** Added fix-audiocraft-only.bat to extraResources
```json
{
  "from": "fix-audiocraft-only.bat",
  "to": "../fix-audiocraft-only.bat"
}
```

---

## Summary

### Problem
- ✅ Video analysis works (Whisper, BLIP installed successfully)
- ❌ SFX generation fails (AudioCraft not installed)

### Root Cause
- Installer didn't verify AudioCraft was actually importable
- Assumed xformers warnings meant AudioCraft still worked
- But AudioCraft installation actually failed completely

### Solution
1. **For existing installations:** Run `fix-audiocraft-only.bat` or `windows-hotfix-v3.bat`
2. **For new installations:** Updated installer now verifies AudioCraft import

### Next Steps
1. Apply quick fix to your current installation
2. Rebuild installer with improved verification
3. Test new installer verifies AudioCraft properly

---

**Status:** ✅ Fix applied to installer script
**User Action:** Run fix-audiocraft-only.bat on current installation
**Ready for:** Rebuild installer with verification
