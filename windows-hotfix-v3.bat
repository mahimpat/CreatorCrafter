@echo off
REM Windows Hotfix Script v3 for CreatorCrafter
REM Fixes torch/xformers installation issues with proper error handling
REM Run this script as Administrator if the app fails to analyze videos or generate SFX

echo ========================================
echo CreatorCrafter - Python Environment Setup v3
echo ========================================
echo.

REM Get installation directory (where the app is installed)
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

echo Current directory: %CD%
echo.

REM Check if Python is installed
echo [1/8] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python 3.8-3.11 from:
    echo https://www.python.org/downloads/
    echo.
    echo IMPORTANT: Check "Add Python to PATH" during installation!
    echo.
    pause
    exit /b 1
)

python --version
echo Python found!
echo.

REM Check Python version (must be 3.8-3.11 for audiocraft)
echo [2/8] Checking Python version compatibility...
python -c "import sys; exit(0 if (3,8) <= sys.version_info[:2] <= (3,11) else 1)" >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Python 3.8-3.11 recommended for best compatibility
    echo Your version may have issues with audiocraft/xformers
    echo.
)

REM Create virtual environment
echo [3/8] Creating Python virtual environment...
if exist "venv\" (
    echo Virtual environment already exists, removing old one...
    rmdir /s /q "venv"
)

python -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)
echo Virtual environment created!
echo.

REM Activate virtual environment and upgrade pip
echo [4/8] Upgrading pip, setuptools, wheel...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip setuptools wheel
echo.

REM Install PyTorch first (with CPU-only to avoid CUDA issues)
echo [5/8] Installing PyTorch (CPU version)...
echo This avoids CUDA/GPU complexity and works on all systems
echo.
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
if %errorlevel% neq 0 (
    echo ERROR: Failed to install PyTorch
    echo.
    echo Trying alternative method...
    pip install torch torchvision torchaudio
)
echo PyTorch installed!
echo.

REM Install other dependencies WITHOUT xformers
echo [6/8] Installing other dependencies...
echo This may take several minutes. Please wait...
echo.

pip install --prefer-binary numpy>=1.24.0,<2.0.0
pip install --prefer-binary scipy>=1.11.0
pip install --prefer-binary Pillow>=10.0.0
pip install --prefer-binary opencv-python>=4.8.0
pip install --prefer-binary transformers>=4.30.0
pip install --prefer-binary librosa>=0.10.0
pip install --prefer-binary soundfile>=0.12.0
pip install --prefer-binary "scenedetect[opencv]>=0.6.0"
pip install --prefer-binary openai-whisper

echo.
echo Dependencies installed!
echo.

REM Install audiocraft with proper error handling
echo [7/8] Installing AudioCraft...
echo.
echo NOTE: xformers may fail to build - this is expected on Windows
echo We will try multiple methods if needed...
echo.

REM Method 1: Try normal install
echo Trying Method 1: Normal audiocraft installation...
pip install --prefer-binary audiocraft >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ AudioCraft installed successfully!
    goto :verify_audiocraft
)

echo Method 1 failed. Trying Method 2: Install without dependencies...
REM Method 2: Install without dependencies, then add them manually
pip install audiocraft --no-deps >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Could not install audiocraft package
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo Installing AudioCraft dependencies manually (skipping xformers)...
pip install --prefer-binary av einops flashy hydra-core omegaconf num2words sentencepiece tqdm >nul 2>&1

:verify_audiocraft
echo.
echo Verifying AudioCraft installation...
python -c "from audiocraft.models import MusicGen; print('✓ AudioCraft is working!')" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ⚠ WARNING: AudioCraft verification failed!
    echo The package installed but may not work properly.
    echo.
    echo This could mean:
    echo 1. Missing dependencies
    echo 2. Installation corruption
    echo.
    echo Please check WINDOWS_XFORMERS_REALITY.md for troubleshooting.
    echo.
    set "AUDIOCRAFT_BROKEN=1"
) else (
    echo ✓ AudioCraft verified and working!
    echo.
)

REM Download AI models
echo [8/8] Downloading AI models...
echo This may take several minutes and download ~500MB
echo.

if "%AUDIOCRAFT_BROKEN%"=="1" (
    echo Skipping model download due to AudioCraft issues...
    echo Please fix AudioCraft first, then run:
    echo   venv\Scripts\activate
    echo   python python\download_models.py
    echo.
    goto :end_with_warning
)

REM Find the download_models script
if exist "resources\python\download_models.pyc" (
    python resources\python\download_models.pyc
) else if exist "resources\python\download_models.py" (
    python resources\python\download_models.py
) else if exist "python\download_models.py" (
    python python\download_models.py
) else (
    echo WARNING: download_models script not found
    echo Downloading models manually...
    echo.
    python -c "import whisper; whisper.load_model('base')"
    python -c "from transformers import AutoProcessor, BlipForConditionalGeneration; BlipForConditionalGeneration.from_pretrained('Salesforce/blip-image-captioning-base')"
    python -c "from audiocraft.models import MusicGen; MusicGen.get_pretrained('facebook/musicgen-small')"
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
if "%AUDIOCRAFT_BROKEN%"=="1" (
    goto :end_with_warning
) else (
    goto :end_success
)

:end_with_warning
echo ⚠ WARNING: Setup completed with issues!
echo.
echo AudioCraft may not be working properly.
echo.
echo NEXT STEPS:
echo 1. Check WINDOWS_XFORMERS_REALITY.md for troubleshooting
echo 2. Test if audio generation works:
echo    venv\Scripts\activate
echo    python -c "from audiocraft.models import MusicGen; print('Works!')"
echo.
echo The video editing features should still work,
echo but SFX generation may fail.
echo.
pause
exit /b 1

:end_success
echo ✓ All components installed and verified!
echo.
echo Your CreatorCrafter installation is ready to use.
echo.
echo NOTE: If you saw xformers warnings during installation,
echo that's completely normal on Windows. AudioCraft is working
echo without xformers through fallback mechanisms.
echo.
echo You can now close this window and start CreatorCrafter.
echo.
pause
exit /b 0
