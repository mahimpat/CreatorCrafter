; CreatorCrafter NSIS Installer Script
; Extracts pre-built Python environment bundled with installer for reliable installation

!include "LogicLib.nsh"
!include "WordFunc.nsh"
!include "FileFunc.nsh"
!include "StrFunc.nsh"

; Initialize string functions
${StrStr}

; Configuration
!define PYTHON_ENV_FILENAME "python-env.zip"
!define PYTHON_ENV_SHA256 "db106dba2bbe10a8c3fd1c907277659726e0a6355ca839ec5978e746d7254d4f"
!define PYTHON_ENV_SIZE_MB 393

!macro customInit
  ; Keep installer window open to show details
  SetAutoClose false
!macroend

!macro customInstall
  SetDetailsPrint both

  DetailPrint ""
  DetailPrint "============================================"
  DetailPrint "  CreatorCrafter Installation - v1.0.0"
  DetailPrint "============================================"
  DetailPrint ""
  DetailPrint "This installer will:"
  DetailPrint "  1. Install CreatorCrafter application"
  DetailPrint "  2. Extract pre-built Python environment (${PYTHON_ENV_SIZE_MB}MB - bundled)"
  DetailPrint "  3. Configure dependencies"
  DetailPrint "  4. Setup FFmpeg for video processing"
  DetailPrint ""
  DetailPrint "Estimated time: 3-5 minutes"
  DetailPrint "No internet connection required for installation"
  DetailPrint "Internet needed only for AI models (download on first use)"
  DetailPrint ""
  DetailPrint "============================================"
  DetailPrint ""

  ; ==========================================
  ; STEP 1: Locate Bundled Python Environment
  ; ==========================================

  DetailPrint "[1/3] Preparing Python environment..."
  DetailPrint ""
  DetailPrint "Python environment is bundled with this installer"
  DetailPrint "Size: ${PYTHON_ENV_SIZE_MB} MB"
  DetailPrint "No internet connection required!"
  DetailPrint ""

  ; Python environment is bundled in installer resources
  StrCpy $0 "$INSTDIR\resources\${PYTHON_ENV_FILENAME}"

  ; Verify bundled file exists
  ${If} ${FileExists} "$0"
    DetailPrint "Bundled Python environment found: OK"
    DetailPrint "Location: $0"
    DetailPrint ""
  ${Else}
    DetailPrint ""
    DetailPrint "ERROR: Bundled Python environment not found!"
    DetailPrint "Expected at: $0"
    DetailPrint ""
    DetailPrint "This installer may be corrupted or incomplete."
    DetailPrint ""
    MessageBox MB_ICONEXCLAMATION|MB_OK "Python environment package not found in installer.$\n$\nThe installer may be corrupted.$\n$\nPlease download a fresh installer or contact support."
    Goto skip_python_env
  ${EndIf}

  ; ==========================================
  ; STEP 2: Extract Python Environment
  ; ==========================================

  DetailPrint "[2/3] Extracting Python environment..."
  DetailPrint ""
  DetailPrint "Destination: $INSTDIR\venv"
  DetailPrint "This may take 3-5 minutes..."
  DetailPrint ""

  ; Extract using nsisunz plugin to a temp location first
  DetailPrint "Extracting files..."
  nsisunz::UnzipToLog "$0" "$INSTDIR"
  Pop $2

  ${If} $2 != "success"
    DetailPrint ""
    DetailPrint "ERROR: Failed to extract Python environment!"
    DetailPrint "Error: $2"
    DetailPrint ""
    MessageBox MB_ICONEXCLAMATION|MB_OK "Failed to extract Python environment.$\n$\nError: $2$\n$\nThis might be due to:$\n- Insufficient disk space$\n- Antivirus blocking extraction$\n- Corrupted download$\n$\nPlease free up disk space or disable antivirus temporarily."
    Goto skip_python_env
  ${EndIf}

  DetailPrint ""
  DetailPrint "Extraction complete!"
  DetailPrint ""

  ; Rename venv_windows to venv
  DetailPrint "Configuring Python environment..."
  Rename "$INSTDIR\venv_windows" "$INSTDIR\venv"
  DetailPrint ""

  ; Verify Python executable exists
  ${If} ${FileExists} "$INSTDIR\venv\python.exe"
    DetailPrint "Python executable found: OK"
    DetailPrint "Location: $INSTDIR\venv\python.exe"
    DetailPrint ""

    ; Test Python installation
    DetailPrint "Testing Python installation..."
    nsExec::ExecToStack '"$INSTDIR\venv\python.exe" --version'
    Pop $3  ; Exit code
    Pop $4  ; Output

    ${If} $3 == 0
      DetailPrint "Python test successful: $4"
      DetailPrint ""

      ; Test critical imports
      DetailPrint "Verifying AI dependencies..."
      nsExec::ExecToLog '"$INSTDIR\venv\python.exe" -c "import torch, audiocraft, whisper, transformers; print(\"All dependencies OK\")"'
      Pop $3

      ${If} $3 == 0
        DetailPrint ""
        DetailPrint "All Python dependencies verified successfully!"
        DetailPrint ""
      ${Else}
        DetailPrint ""
        DetailPrint "WARNING: Some dependencies may have issues"
        DetailPrint "Application may still work, but some features might fail"
        DetailPrint ""
      ${EndIf}

    ${Else}
      DetailPrint "WARNING: Python test failed"
      DetailPrint "Application may not work correctly"
      DetailPrint ""
    ${EndIf}

  ${Else}
    DetailPrint "WARNING: Python executable not found!"
    DetailPrint "Expected at: $INSTDIR\venv\python.exe"
    DetailPrint ""
    DetailPrint "This might indicate:"
    DetailPrint "  - Extraction failed"
    DetailPrint "  - Corrupted download"
    DetailPrint "  - Antivirus interference"
    DetailPrint ""
  ${EndIf}

  skip_python_env:

  ; ==========================================
  ; STEP 3: Setup FFmpeg
  ; ==========================================

  DetailPrint ""
  DetailPrint "[3/3] Setting up FFmpeg for video processing..."
  DetailPrint ""

  ${If} ${FileExists} "$INSTDIR\resources\ffmpeg\ffmpeg.exe"
    DetailPrint "FFmpeg binaries found: OK"
    DetailPrint "Location: $INSTDIR\resources\ffmpeg\"
    DetailPrint ""

    ; Test FFmpeg
    DetailPrint "Testing FFmpeg installation..."
    nsExec::ExecToStack '"$INSTDIR\resources\ffmpeg\ffmpeg.exe" -version'
    Pop $3
    Pop $4

    ${If} $3 == 0
      DetailPrint "FFmpeg test successful"
      DetailPrint ""
    ${Else}
      DetailPrint "WARNING: FFmpeg test failed"
      DetailPrint ""
    ${EndIf}

    ; Add FFmpeg to user PATH (optional, for command-line access)
    DetailPrint "Adding FFmpeg to PATH for this user..."
    ReadRegStr $1 HKCU "Environment" "Path"

    ; Check if already in PATH
    ${StrStr} $2 "$1" "$INSTDIR\resources\ffmpeg"
    ${If} $2 == ""
      ; Not in PATH, add it
      StrCpy $1 "$1;$INSTDIR\resources\ffmpeg"
      WriteRegStr HKCU "Environment" "Path" "$1"
      DetailPrint "FFmpeg added to PATH"
      DetailPrint ""
      DetailPrint "Note: Restart or logout/login for PATH changes to take effect globally"
    ${Else}
      DetailPrint "FFmpeg already in PATH"
    ${EndIf}
    DetailPrint ""

  ${Else}
    DetailPrint "WARNING: FFmpeg binaries not found!"
    DetailPrint "Expected location: $INSTDIR\resources\ffmpeg\ffmpeg.exe"
    DetailPrint ""
    DetailPrint "Video processing features may not work without FFmpeg."
    DetailPrint "Please install FFmpeg manually from: https://ffmpeg.org"
    DetailPrint ""
  ${EndIf}

  ; ==========================================
  ; Installation Complete
  ; ==========================================

  DetailPrint ""
  DetailPrint "============================================"
  DetailPrint "  Installation Complete!"
  DetailPrint "============================================"
  DetailPrint ""

  ${If} ${FileExists} "$INSTDIR\venv\python.exe"
    DetailPrint "Status: Ready to use!"
    DetailPrint ""
    DetailPrint "What's included:"
    DetailPrint "  - CreatorCrafter application"
    DetailPrint "  - Python 3.11.9 + AI dependencies"
    DetailPrint "  - PyTorch 2.1.0 (CPU)"
    DetailPrint "  - AudioCraft 1.3.0"
    DetailPrint "  - Whisper (speech recognition)"
    DetailPrint "  - FFmpeg (video processing)"
    DetailPrint ""
    DetailPrint "First-run setup:"
    DetailPrint "  - AI models will download automatically on first use"
    DetailPrint "  - First video analysis: ~5 minutes (downloads Whisper model)"
    DetailPrint "  - First SFX generation: ~10 minutes (downloads AudioCraft model)"
    DetailPrint "  - After first use: everything is instant!"
    DetailPrint ""
    DetailPrint "Installation directory: $INSTDIR"
    DetailPrint "Python environment: $INSTDIR\venv"
    DetailPrint "AI models will cache to: %USERPROFILE%\.cache\huggingface"
    DetailPrint ""
  ${Else}
    DetailPrint "Status: Partial installation"
    DetailPrint ""
    DetailPrint "Python environment was not installed successfully."
    DetailPrint ""
    DetailPrint "To complete setup manually:"
    DetailPrint "  1. Download: ${PYTHON_ENV_FILENAME}"
    DetailPrint "  2. From: Google Drive (check installer-config.json)"
    DetailPrint "  3. Extract to: $INSTDIR\venv"
    DetailPrint "  4. Ensure python.exe exists at: $INSTDIR\venv\python.exe"
    DetailPrint "  5. Launch CreatorCrafter"
    DetailPrint ""
    DetailPrint "Alternatively, use the hotfix scripts:"
    DetailPrint "  - Run: $INSTDIR\windows-hotfix-v3.bat (as Administrator)"
    DetailPrint "  - Wait: 10-20 minutes for completion"
    DetailPrint "  - Restart: CreatorCrafter"
    DetailPrint ""
  ${EndIf}

  DetailPrint "============================================"
  DetailPrint ""
  DetailPrint "You can now close this window and launch CreatorCrafter!"
  DetailPrint ""
  DetailPrint "Enjoy creating amazing content!"
  DetailPrint ""

  ; Create README with instructions
  FileOpen $5 "$INSTDIR\INSTALLATION_NOTES.txt" w
  FileWrite $5 "CreatorCrafter - Installation Notes$\r$\n"
  FileWrite $5 "======================================$\r$\n"
  FileWrite $5 "$\r$\n"
  FileWrite $5 "Installation Date: $\r$\n"
  FileWrite $5 "Version: 1.0.0$\r$\n"
  FileWrite $5 "Location: $INSTDIR$\r$\n"
  FileWrite $5 "$\r$\n"
  FileWrite $5 "What's Installed:$\r$\n"
  FileWrite $5 "  - CreatorCrafter application$\r$\n"
  FileWrite $5 "  - Python 3.11.9 environment (pre-built)$\r$\n"
  FileWrite $5 "  - PyTorch 2.1.0 (CPU version)$\r$\n"
  FileWrite $5 "  - AudioCraft 1.3.0 for SFX generation$\r$\n"
  FileWrite $5 "  - Whisper for transcription$\r$\n"
  FileWrite $5 "  - FFmpeg for video processing$\r$\n"
  FileWrite $5 "$\r$\n"
  FileWrite $5 "First Run:$\r$\n"
  FileWrite $5 "  - Application launches immediately$\r$\n"
  FileWrite $5 "  - AI models download on first use of each feature$\r$\n"
  FileWrite $5 "  - First analysis: ~5 min (Whisper + BLIP models)$\r$\n"
  FileWrite $5 "  - First SFX: ~10 min (AudioCraft model)$\r$\n"
  FileWrite $5 "  - All subsequent uses: instant (models cached)$\r$\n"
  FileWrite $5 "$\r$\n"
  FileWrite $5 "File Locations:$\r$\n"
  FileWrite $5 "  - Application: $INSTDIR$\r$\n"
  FileWrite $5 "  - Python: $INSTDIR\venv\python.exe$\r$\n"
  FileWrite $5 "  - FFmpeg: $INSTDIR\resources\ffmpeg\$\r$\n"
  FileWrite $5 "  - AI Models: %USERPROFILE%\.cache\huggingface\$\r$\n"
  FileWrite $5 "$\r$\n"
  FileWrite $5 "Disk Space:$\r$\n"
  FileWrite $5 "  - Application: ~500 MB$\r$\n"
  FileWrite $5 "  - Python environment: ~1.5 GB$\r$\n"
  FileWrite $5 "  - AI models (after download): ~2 GB$\r$\n"
  FileWrite $5 "  - Total: ~4 GB$\r$\n"
  FileWrite $5 "$\r$\n"
  FileWrite $5 "Troubleshooting:$\r$\n"
  FileWrite $5 "  - If Python features don't work, check: $INSTDIR\venv\python.exe$\r$\n"
  FileWrite $5 "  - If video processing fails, check: $INSTDIR\resources\ffmpeg\ffmpeg.exe$\r$\n"
  FileWrite $5 "  - For model download issues, check internet connection$\r$\n"
  FileWrite $5 "  - Logs are in: %APPDATA%\CreatorCrafter\logs\$\r$\n"
  FileWrite $5 "$\r$\n"
  FileWrite $5 "Manual Python Environment Installation:$\r$\n"
  FileWrite $5 "  If Python environment installation failed:$\r$\n"
  FileWrite $5 "  1. Download: ${PYTHON_ENV_FILENAME}$\r$\n"
  FileWrite $5 "  2. From: Google Drive (see installer-config.json)$\r$\n"
  FileWrite $5 "  3. Extract to: $INSTDIR\venv$\r$\n"
  FileWrite $5 "  4. Verify python.exe exists$\r$\n"
  FileWrite $5 "  5. Launch CreatorCrafter$\r$\n"
  FileWrite $5 "$\r$\n"
  FileWrite $5 "Support:$\r$\n"
  FileWrite $5 "  - Documentation: See DEPLOYMENT-READY.md$\r$\n"
  FileWrite $5 "  - Issues: Check GitHub issues or contact support$\r$\n"
  FileWrite $5 "$\r$\n"
  FileClose $5

  DetailPrint "Created: INSTALLATION_NOTES.txt"
  DetailPrint ""

!macroend

!macro customUnInstall
  DetailPrint "Uninstalling CreatorCrafter..."
  DetailPrint ""

  ; Remove Python environment
  DetailPrint "Removing Python environment..."
  RMDir /r "$INSTDIR\venv"

  ; Remove FFmpeg from PATH
  DetailPrint "Removing FFmpeg from PATH..."
  ReadRegStr $1 HKCU "Environment" "Path"

  ; Remove all variations of the FFmpeg path
  ${WordReplace} "$1" ";$INSTDIR\resources\ffmpeg" "" "+" $1
  ${WordReplace} "$1" "$INSTDIR\resources\ffmpeg;" "" "+" $1
  ${WordReplace} "$1" "$INSTDIR\resources\ffmpeg" "" "+" $1

  WriteRegStr HKCU "Environment" "Path" "$1"

  ; Note: We don't remove AI models cache (user may have other apps using them)
  DetailPrint ""
  DetailPrint "Note: AI model cache not removed from:"
  DetailPrint "%USERPROFILE%\.cache\huggingface\"
  DetailPrint "You can manually delete this if you want to free up ~2GB"
  DetailPrint ""

  DetailPrint "Uninstallation complete!"
!macroend
