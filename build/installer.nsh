; Custom NSIS installer script for CreatorCrafter
; This script handles Python environment setup on Windows with detailed logging

!include "LogicLib.nsh"
!include "WordFunc.nsh"

!macro customInit
  ; Show details by default (keep installer window open)
  SetAutoClose false
!macroend

!macro customInstall
  ; Enable detailed output
  SetDetailsPrint both

  DetailPrint "=========================================="
  DetailPrint "CreatorCrafter Installation"
  DetailPrint "=========================================="
  DetailPrint ""

  ; Check if Python 3 is installed
  DetailPrint "[1/5] Checking Python installation..."
  nsExec::ExecToStack 'python --version'
  Pop $0  ; Exit code
  Pop $1  ; Output

  ${If} $0 != 0
    DetailPrint "ERROR: Python not found!"
    DetailPrint ""
    MessageBox MB_ICONEXCLAMATION|MB_OK "Python 3 is required but not found.$\n$\nPlease install Python 3.8 or higher from:$\nhttps://www.python.org/downloads/$\n$\nMake sure to check 'Add Python to PATH' during installation.$\n$\nThen run this installer again."
    Abort "Python is required for installation"
  ${Else}
    DetailPrint "Python found: $1"
    DetailPrint ""
  ${EndIf}

  ; Create virtual environment
  DetailPrint "[2/5] Creating Python virtual environment..."
  DetailPrint "Location: $INSTDIR\venv"
  DetailPrint "This may take a minute..."
  DetailPrint ""

  nsExec::ExecToLog 'python -m venv "$INSTDIR\venv"'
  Pop $0

  ${If} $0 != 0
    DetailPrint "ERROR: Failed to create virtual environment (exit code: $0)"
    MessageBox MB_ICONEXCLAMATION|MB_OKCANCEL "Failed to create Python virtual environment.$\n$\nThis might happen if:$\n- Python venv module is not installed$\n- Disk space is low$\n- Antivirus is blocking$\n$\nClick OK to continue anyway (you'll need to run the hotfix)$\nClick Cancel to abort installation" IDOK continue_anyway
    Abort "Virtual environment creation failed"
    continue_anyway:
    DetailPrint "Continuing installation without venv..."
    DetailPrint "You will need to run windows-hotfix.bat after installation"
    DetailPrint ""
    Goto skip_python_setup
  ${Else}
    DetailPrint "Virtual environment created successfully!"
    DetailPrint ""
  ${EndIf}

  ; Upgrade pip
  DetailPrint "[3/5] Upgrading pip..."
  DetailPrint ""

  nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install --upgrade pip'
  Pop $0

  ${If} $0 != 0
    DetailPrint "WARNING: Failed to upgrade pip (exit code: $0)"
    DetailPrint "Continuing anyway..."
  ${Else}
    DetailPrint "Pip upgraded successfully!"
  ${EndIf}
  DetailPrint ""

  ; Install Python dependencies (using Windows-optimized approach)
  DetailPrint "[4/5] Installing Python dependencies..."
  DetailPrint "This will download ~2GB and may take 10-20 minutes..."
  DetailPrint ""
  DetailPrint "IMPORTANT: If installation seems stuck:"
  DetailPrint "  - Don't close! Large packages take time to download/install."
  DetailPrint "  - PyTorch alone is ~2GB and takes 5-10 minutes."
  DetailPrint "  - xformers may fail - this is NORMAL and OK!"
  DetailPrint ""

  ; Step 1: Install PyTorch FIRST (CPU version to avoid CUDA issues)
  DetailPrint "Step 1/2: Installing PyTorch (CPU version)..."
  DetailPrint "This is the largest package (~2GB) and may take 5-10 minutes..."
  DetailPrint ""
  nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu'
  Pop $0

  ${If} $0 != 0
    DetailPrint ""
    DetailPrint "ERROR: PyTorch installation failed (exit code: $0)"
    DetailPrint ""
    MessageBox MB_ICONEXCLAMATION|MB_OKCANCEL "Failed to install PyTorch.$\n$\nThis might happen if:$\n- Internet connection is slow/interrupted$\n- Disk space is low (<3GB)$\n- Antivirus is blocking downloads$\n$\nClick OK to continue (you'll need to run windows-hotfix-v3.bat)$\nClick Cancel to abort installation" IDOK continue_anyway2
    Abort "PyTorch installation failed"
    continue_anyway2:
    DetailPrint "Continuing without PyTorch..."
    DetailPrint "You MUST run windows-hotfix-v3.bat after installation"
    DetailPrint ""
    Goto skip_model_download
  ${Else}
    DetailPrint ""
    DetailPrint "✓ PyTorch installed successfully!"
    DetailPrint ""
  ${EndIf}

  ; Step 2: Install other dependencies individually (more reliable than batch)
  DetailPrint "Step 2/2: Installing other dependencies..."
  DetailPrint "Installing: numpy, scipy, Pillow, opencv-python..."
  nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install --prefer-binary numpy scipy Pillow opencv-python'

  DetailPrint "Installing: transformers, librosa, soundfile, scenedetect..."
  nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install --prefer-binary transformers librosa soundfile scenedetect[opencv]'

  DetailPrint "Installing: openai-whisper..."
  nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install --prefer-binary openai-whisper'

  ; Install av (PyAV) separately first - it's a common failure point
  DetailPrint "Installing: av (PyAV - FFmpeg bindings)..."
  DetailPrint "Note: This package sometimes has issues on Windows"
  nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install --prefer-binary av'
  Pop $0

  ${If} $0 != 0
    DetailPrint "WARNING: av (PyAV) installation had issues"
    DetailPrint "Attempting alternative installation method..."
    nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install setuptools wheel Cython'
    nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install av --no-build-isolation'
    Pop $0
    ${If} $0 != 0
      DetailPrint "WARNING: av installation failed - AudioCraft may have limited functionality"
    ${EndIf}
  ${EndIf}

  ; Install audiocraft last (may show xformers warnings - that's expected)
  DetailPrint "Installing: audiocraft (xformers warnings are NORMAL)..."
  DetailPrint "Note: If you see xformers errors, ignore them - app will still work!"
  nsExec::ExecToLog '"$INSTDIR\venv\Scripts\pip.exe" install --prefer-binary audiocraft'
  Pop $0

  ; Verify AudioCraft was actually installed (not just warnings, but actually importable)
  DetailPrint "Verifying AudioCraft installation..."
  nsExec::ExecToLog '"$INSTDIR\venv\Scripts\python.exe" -c "import audiocraft; print(\"AudioCraft OK\")"'
  Pop $1

  ${If} $1 != 0
    DetailPrint ""
    DetailPrint "ERROR: AudioCraft failed to install properly!"
    DetailPrint "SFX generation will not work until AudioCraft is installed."
    DetailPrint ""
    DetailPrint "After installation, run windows-hotfix-v3.bat to fix this."
    DetailPrint ""
  ${Else}
    DetailPrint ""
    DetailPrint "✓ AudioCraft verified successfully!"
    DetailPrint "✓ All dependencies installed successfully!"
    DetailPrint ""
  ${EndIf}

  ; Download AI models
  DetailPrint "[5/5] Downloading AI models..."
  DetailPrint "This will download ~500MB more and may take 5-10 minutes..."
  DetailPrint "Models being downloaded:"
  DetailPrint "  - Whisper (speech recognition) ~150MB"
  DetailPrint "  - AudioCraft (sound effects) ~300MB"
  DetailPrint "  - BLIP (image understanding) ~50MB"
  DetailPrint ""

  ; Use .py files (cross-version compatible)
  ${If} ${FileExists} "$INSTDIR\resources\python\download_models.py"
    DetailPrint "Using: download_models.py"
    nsExec::ExecToLog '"$INSTDIR\venv\Scripts\python.exe" "$INSTDIR\resources\python\download_models.py"'
  ${Else}
    DetailPrint "WARNING: download_models.py not found!"
    DetailPrint "Skipping model download - models will download on first use"
    Goto skip_model_download
  ${EndIf}

  Pop $0

  ${If} $0 != 0
    DetailPrint ""
    DetailPrint "WARNING: Model download had issues (exit code: $0)"
    DetailPrint "Models will be downloaded automatically when you first use the features"
    DetailPrint ""
  ${Else}
    DetailPrint ""
    DetailPrint "AI models downloaded successfully!"
    DetailPrint ""
  ${EndIf}

  skip_model_download:
  skip_python_setup:

  ; Setup FFmpeg
  DetailPrint ""
  DetailPrint "=========================================="
  DetailPrint "Setting up FFmpeg"
  DetailPrint "=========================================="
  DetailPrint ""

  ; Check if FFmpeg binaries exist in the package
  ${If} ${FileExists} "$INSTDIR\resources\ffmpeg\ffmpeg.exe"
    DetailPrint "FFmpeg binaries found in installation package"
    DetailPrint "Location: $INSTDIR\resources\ffmpeg\"
    DetailPrint ""

    ; Add FFmpeg to system PATH for current user
    DetailPrint "Adding FFmpeg to PATH..."
    DetailPrint ""

    ; Read current user PATH
    ReadRegStr $1 HKCU "Environment" "Path"

    ; Add FFmpeg to PATH (append)
    StrCpy $1 "$1;$INSTDIR\resources\ffmpeg"
    WriteRegStr HKCU "Environment" "Path" "$1"

    DetailPrint "✓ FFmpeg added to PATH: $INSTDIR\resources\ffmpeg"
    DetailPrint ""
    DetailPrint "Note: You may need to restart your computer or logout/login"
    DetailPrint "      for PATH changes to take effect globally."
    DetailPrint ""
    DetailPrint "✓ FFmpeg setup complete!"

  ${Else}
    DetailPrint "WARNING: FFmpeg binaries not found in package!"
    DetailPrint "Expected location: $INSTDIR\resources\ffmpeg\ffmpeg.exe"
    DetailPrint ""
    DetailPrint "You will need to install FFmpeg manually:"
    DetailPrint "1. Download from: https://ffmpeg.org/download.html"
    DetailPrint "2. Extract to a folder"
    DetailPrint "3. Add to PATH"
    DetailPrint ""
  ${EndIf}

  DetailPrint ""

  ; Installation complete
  DetailPrint ""
  DetailPrint "=========================================="
  DetailPrint "Installation Complete!"
  DetailPrint "=========================================="
  DetailPrint ""
  DetailPrint "CreatorCrafter is now installed at:"
  DetailPrint "$INSTDIR"
  DetailPrint ""

  ; Check if we have a working venv
  ${If} ${FileExists} "$INSTDIR\venv\Scripts\python.exe"
    DetailPrint "Python virtual environment: OK"
    DetailPrint "Location: $INSTDIR\venv"
  ${Else}
    DetailPrint "Python virtual environment: NOT CREATED"
    DetailPrint ""
    DetailPrint "IMPORTANT: You need to run the hotfix!"
    DetailPrint "After installation completes:"
    DetailPrint "1. Navigate to: $INSTDIR"
    DetailPrint "2. Right-click: windows-hotfix-v3.bat"
    DetailPrint "3. Select: Run as Administrator"
    DetailPrint "4. Wait 10-20 minutes for completion"
    DetailPrint "5. Restart CreatorCrafter"
    DetailPrint ""
  ${EndIf}

  DetailPrint ""
  DetailPrint "You can now close this window and launch CreatorCrafter!"
  DetailPrint ""

  ; Create a readme file with instructions
  FileOpen $4 "$INSTDIR\FIRST_RUN_INSTRUCTIONS.txt" w
  FileWrite $4 "CreatorCrafter - First Run Instructions$\r$\n"
  FileWrite $4 "========================================$\r$\n"
  FileWrite $4 "$\r$\n"
  FileWrite $4 "If you encounter errors about Python or AI features:$\r$\n"
  FileWrite $4 "$\r$\n"
  FileWrite $4 "1. Make sure Python 3.8+ is installed$\r$\n"
  FileWrite $4 "2. Make sure FFmpeg is installed and in PATH$\r$\n"
  FileWrite $4 "3. Check that venv folder exists: $INSTDIR\venv$\r$\n"
  FileWrite $4 "$\r$\n"
  FileWrite $4 "If venv doesn't exist or features don't work:$\r$\n"
  FileWrite $4 "1. Right-click windows-hotfix.bat$\r$\n"
  FileWrite $4 "2. Select 'Run as Administrator'$\r$\n"
  FileWrite $4 "3. Wait 10-15 minutes for completion$\r$\n"
  FileWrite $4 "4. Restart CreatorCrafter$\r$\n"
  FileWrite $4 "$\r$\n"
  FileWrite $4 "Requirements:$\r$\n"
  FileWrite $4 "- Python 3.8 or higher (from python.org)$\r$\n"
  FileWrite $4 "- FFmpeg (from ffmpeg.org)$\r$\n"
  FileWrite $4 "- ~2GB free disk space for AI models$\r$\n"
  FileWrite $4 "- Internet connection for model downloads$\r$\n"
  FileWrite $4 "$\r$\n"
  FileWrite $4 "For more help, see HOTFIX_README.md$\r$\n"
  FileClose $4

  DetailPrint "Created: FIRST_RUN_INSTRUCTIONS.txt"
  DetailPrint ""
!macroend

!macro customUnInstall
  DetailPrint "Removing Python virtual environment..."
  RMDir /r "$INSTDIR\venv"

  ; Remove FFmpeg from PATH
  DetailPrint "Removing FFmpeg from PATH..."
  ReadRegStr $1 HKCU "Environment" "Path"

  ; Remove the FFmpeg path
  ${WordReplace} "$1" ";$INSTDIR\resources\ffmpeg" "" "+" $1
  ${WordReplace} "$1" "$INSTDIR\resources\ffmpeg;" "" "+" $1
  ${WordReplace} "$1" "$INSTDIR\resources\ffmpeg" "" "+" $1

  WriteRegStr HKCU "Environment" "Path" "$1"

  DetailPrint "Cleanup complete!"
!macroend
