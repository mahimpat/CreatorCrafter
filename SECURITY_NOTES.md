# CreatorCrafter - Security Notes

## Python Scripts Protection

### Implementation

Python scripts are bundled inside the application's **resources** directory, not in user-accessible locations. This prevents users from accidentally or intentionally modifying the AI processing logic.

### File Locations After Installation

#### Windows
```
C:\Program Files\CreatorCrafter\
├── CreatorCrafter.exe
└── resources\              # <-- Not user-accessible
    ├── python\
    │   ├── video_analyzer.py
    │   ├── audiocraft_generator.py
    │   └── download_models.py
    └── requirements.txt
```

#### macOS
```
/Applications/CreatorCrafter.app/
└── Contents/
    └── Resources/          # <-- Inside app bundle
        ├── python/
        └── requirements.txt
```

#### Linux
```
/opt/CreatorCrafter/
└── resources/              # <-- Not in user PATH
    ├── python/
    └── requirements.txt
```

### Why This Matters

1. **Integrity**: Users cannot accidentally break AI functionality by editing scripts
2. **Security**: Prevents injection of malicious code into Python scripts
3. **Support**: Reduces support issues from users modifying code
4. **Updates**: Ensures all users run the same, tested Python code

### How It Works

The **extraResources** configuration in `package.json` packages Python files separately from the main application code (which is in an ASAR archive). These files are placed in the `resources/` directory which is:

- Not easily accessible to end users
- Protected by OS permissions (Program Files on Windows requires admin)
- Separate from user data/configuration

### Access Controls

| Location | User Access | Admin Access | Notes |
|----------|-------------|--------------|-------|
| Program Files (Windows) | Read-only | Read-write | Requires UAC elevation |
| Applications (macOS) | Read-only | Read-write | Inside .app bundle |
| /opt (Linux) | Read-only | Read-write | System directory |

### Development vs Production

**Development** (source code):
```
project/
├── python/
│   ├── video_analyzer.py    # <-- Editable
│   └── ...
```

**Production** (installed app):
```
install-dir/
└── resources/
    └── python/
        ├── video_analyzer.py    # <-- Protected
        └── ...
```

### Configuration

#### package.json - extraResources

```json
"extraResources": [
  {
    "from": "python",
    "to": "python",
    "filter": ["**/*", "!__pycache__", "!*.pyc", "!*.md"]
  },
  {
    "from": "requirements.txt",
    "to": "requirements.txt"
  }
]
```

This ensures Python scripts are:
- Copied to `resources/python/` (not `resources/app/python/`)
- Filtered to exclude cache files and documentation
- Not bundled in the ASAR archive (more secure)

#### electron/main.ts - Resource Path

```typescript
const appRoot = app.isPackaged
  ? process.resourcesPath      // Production: /path/to/resources/
  : join(__dirname, '..')      // Development: /path/to/project/
```

This automatically resolves to the correct location in both environments.

## Additional Security Measures

### 1. Electron Security

- ✅ **Context Isolation**: Enabled
- ✅ **Node Integration**: Disabled in renderer
- ✅ **Sandbox**: Enabled for renderer processes
- ✅ **Preload Script**: Secure IPC bridge only

### 2. File Access

- ✅ All file operations go through IPC
- ✅ No direct filesystem access from renderer
- ✅ Path validation in main process
- ✅ Temporary files cleaned up

### 3. Python Execution

- ✅ Scripts executed as child processes (isolated)
- ✅ No shell execution (`spawn` not `exec`)
- ✅ Input validation before passing to Python
- ✅ Output sanitization from Python

### 4. User Data Separation

User-created content is stored separately:

```
User Data Locations:
- Windows: %APPDATA%/CreatorCrafter/
- macOS: ~/Library/Application Support/CreatorCrafter/
- Linux: ~/.config/CreatorCrafter/

Contains:
- Projects (user videos, edits)
- Settings/preferences
- Recent projects list
- NOT Python scripts
```

## What Users Can Modify

Users have full control over:

- ✅ Their video projects
- ✅ Application settings
- ✅ FreeSound API key (.env file)
- ✅ Virtual environment (venv/) - if they know how

Users cannot easily modify:

- ❌ Python AI scripts
- ❌ Application binary
- ❌ Core application logic
- ❌ Node.js dependencies (in ASAR)

## Verifying Protection

### Test 1: Check File Permissions

**Windows**:
```cmd
icacls "C:\Program Files\CreatorCrafter\resources\python\video_analyzer.py"
```
Should show BUILTIN\Users:(R) or (RX) only.

**Linux/macOS**:
```bash
ls -la /opt/CreatorCrafter/resources/python/
```
Should show root ownership or read-only for users.

### Test 2: Try to Edit

Attempt to edit `video_analyzer.py` as a regular user:
- Windows: Should require admin elevation
- macOS: Should require authentication
- Linux: Should get "Permission denied"

### Test 3: Verify Path in Running App

Add logging to main.ts:
```typescript
console.log('Python script path:', join(appRoot, 'python', 'video_analyzer.py'))
```

Should output:
- Production: `/path/to/resources/python/video_analyzer.py`
- Not: `/path/to/resources/app/python/video_analyzer.py`

## Future Enhancements

### Short-term
- [ ] Add script integrity checking (checksums)
- [ ] Log script execution attempts
- [ ] Add file modification detection

### Long-term
- [ ] Encrypt Python scripts (PyInstaller/Nuitka)
- [ ] Code signing for Python scripts
- [ ] Runtime integrity verification
- [ ] Sandboxed Python execution

## Compliance Notes

This setup helps with:

- **GDPR**: User data separate from application code
- **SOC 2**: Code integrity and access controls
- **General Security**: Reduced attack surface

## Troubleshooting

### "Python script not found" Error

**Symptom**: Application fails to run Python scripts after installation.

**Cause**: Resource path misconfigured.

**Fix**: Verify `appRoot` in main.ts points to `process.resourcesPath` when packaged.

### Scripts Work in Dev but Not Production

**Symptom**: Python scripts execute in development but fail in built app.

**Cause**: Path differences between dev and production.

**Debug**:
```typescript
console.log('Is packaged:', app.isPackaged)
console.log('App root:', appRoot)
console.log('Script path:', join(appRoot, 'python', 'video_analyzer.py'))
```

### User Reports They Can't Edit Scripts

**Response**: This is intentional. Python scripts are part of the application and should not be user-editable. Any configuration should be done through the UI or settings file.

---

**Note**: While this provides reasonable protection, determined users with admin access can still modify files. For maximum security, consider:
- Code obfuscation (PyInstaller, py2exe)
- Encryption of sensitive logic
- Server-side processing for critical operations

However, for an MVP desktop application, the current protection is appropriate and follows industry standards for Electron apps.
