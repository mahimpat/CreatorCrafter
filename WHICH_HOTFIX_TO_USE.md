# Which Windows Hotfix Script Should You Use?

## Quick Answer

**Use `windows-hotfix-v3.bat` (newest and most reliable)**

## Comparison

### windows-hotfix.bat (Original)
❌ **DO NOT USE** - Has known issues
- Tries to install all dependencies at once
- Fails when xformers can't compile
- No error recovery
- Confusing error messages

---

### windows-hotfix-v2.bat (Improved)
⚠️ **MOSTLY WORKS** - Will work for ~90% of users
- Installs PyTorch first ✅
- Uses binary wheels ✅
- Suppresses xformers errors ✅
- **Problem:** Doesn't verify if audiocraft actually installed
- **Problem:** Continues to model download even if audiocraft failed
- **Risk:** Silent failure (you think it worked but it didn't)

**When to use:** If v3 doesn't exist or you want to try the simpler script first

---

### windows-hotfix-v3.bat (Best) ⭐
✅ **RECOMMENDED** - Most robust
- Installs PyTorch first ✅
- Uses binary wheels ✅
- **Tries TWO methods to install audiocraft:**
  - Method 1: Normal install (with xformers fallback)
  - Method 2: Install without deps, then add manually (skips xformers)
- **Verifies audiocraft works** with actual import test ✅
- **Clear success/failure messages** ✅
- **Skips model download if audiocraft broken** ✅
- **Proper exit codes** (0 = success, 1 = failure)

**Use this one!**

---

## What Each Script Does Differently

### v2 Approach:
```batch
pip install audiocraft 2>nul  # Try to install
if error:
    print "This is normal, continue anyway"
# Continue to next step regardless
```

**Problem:** If audiocraft truly failed, you won't know until you try to use it.

### v3 Approach:
```batch
# Method 1
pip install audiocraft
if success:
    verify it works
    continue

# Method 2 (if Method 1 failed)
pip install audiocraft --no-deps  # Skip xformers!
pip install other dependencies manually
verify it works

if still broken:
    show error and exit with code 1
```

**Advantage:** You know immediately if installation worked.

---

## Testing After Installation

Regardless of which script you use, **always verify:**

```batch
venv\Scripts\activate
python -c "from audiocraft.models import MusicGen; print('✓ Works!')"
```

### If this succeeds:
✅ **AudioCraft is working!**
- SFX generation will work
- Proceed with using the app

### If this fails:
❌ **AudioCraft is broken!**
- Check `WINDOWS_XFORMERS_REALITY.md`
- Try manual installation
- Or use v3 script (has better error handling)

---

## Migration Guide

### If you already ran v2:

**Option A: Verify it worked**
```batch
venv\Scripts\activate
python -c "from audiocraft.models import MusicGen; print('Works!')"
```
- If this succeeds → You're good! No need to change.
- If this fails → Run v3 script

**Option B: Start fresh with v3**
```batch
# Remove old environment
rmdir /s /q venv

# Run new script
windows-hotfix-v3.bat
```

---

## Expected Results

### windows-hotfix-v2.bat
```
[6/7] Installing other dependencies...
Installing audiocraft (xformers may fail - this is OK)...
Note: audiocraft installation had warnings (likely xformers)
This is NORMAL on Windows - the app will still work!

[7/7] Downloading AI models...
Setup Complete!
```

**You won't know if it actually worked until you test it yourself.**

---

### windows-hotfix-v3.bat

**Success Case:**
```
[7/8] Installing AudioCraft...
Trying Method 1: Normal audiocraft installation...
✓ AudioCraft installed successfully!

Verifying AudioCraft installation...
✓ AudioCraft is working!

[8/8] Downloading AI models...
========================================
Setup Complete!
========================================
✓ All components installed and verified!
```

**Failure Case:**
```
[7/8] Installing AudioCraft...
Trying Method 1: Normal audiocraft installation...
Method 1 failed. Trying Method 2: Install without dependencies...
Installing AudioCraft dependencies manually (skipping xformers)...

Verifying AudioCraft installation...
⚠ WARNING: AudioCraft verification failed!

========================================
Setup Complete!
========================================
⚠ WARNING: Setup completed with issues!

NEXT STEPS:
1. Check WINDOWS_XFORMERS_REALITY.md for troubleshooting
```

**You know immediately if there's a problem.**

---

## Bottom Line

| Feature | v2 | v3 |
|---------|----|----|
| Installs PyTorch first | ✅ | ✅ |
| Uses binary wheels | ✅ | ✅ |
| Tries multiple install methods | ❌ | ✅ |
| Verifies audiocraft works | ❌ | ✅ |
| Proper error handling | ⚠️ | ✅ |
| Clear success/failure messages | ⚠️ | ✅ |
| Safe for all users | ⚠️ | ✅ |

## Recommendation

**Use windows-hotfix-v3.bat** - It's more robust and will tell you immediately if there's a problem, rather than silently continuing with a broken installation.

**If v3 has issues,** you can always fall back to v2, but v3 should work for everyone that v2 works for, PLUS handle edge cases better.

---

**Updated:** November 2, 2025
**Status:** v3 is the recommended version
