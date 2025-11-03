@echo off
REM Comprehensive AudioCraft Diagnostic Script
REM This will tell us exactly what's wrong

echo ========================================
echo AudioCraft Diagnostic Tool
echo ========================================
echo.

REM Get installation directory
set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

echo Installation Directory: %INSTALL_DIR%
echo.

REM Check if venv exists
echo [1/8] Checking virtual environment...
if not exist "venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found!
    echo Expected location: %INSTALL_DIR%venv\Scripts\python.exe
    echo.
    echo Please reinstall CreatorCrafter.
    pause
    exit /b 1
)
echo OK: Virtual environment found
echo.

REM Check Python version
echo [2/8] Checking Python version...
venv\Scripts\python.exe --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python executable is broken
    pause
    exit /b 1
)
echo.

REM Check pip
echo [3/8] Checking pip...
venv\Scripts\pip.exe --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: pip is not working
    pause
    exit /b 1
)
echo.

REM Check PyTorch
echo [4/8] Checking PyTorch installation...
venv\Scripts\python.exe -c "import torch; print('PyTorch version:', torch.__version__)"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PyTorch is not installed!
    echo This is required for AudioCraft.
    echo.
    echo Installing PyTorch now...
    venv\Scripts\pip.exe install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    if %ERRORLEVEL% NEQ 0 (
        echo FAILED to install PyTorch!
        pause
        exit /b 1
    )
    echo PyTorch installed successfully.
)
echo.

REM Check torchaudio
echo [5/8] Checking torchaudio...
venv\Scripts\python.exe -c "import torchaudio; print('torchaudio version:', torchaudio.__version__)"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: torchaudio is not installed!
    echo Installing torchaudio...
    venv\Scripts\pip.exe install torchaudio --index-url https://download.pytorch.org/whl/cpu
)
echo.

REM Check audiocraft
echo [6/8] Checking AudioCraft installation...
venv\Scripts\python.exe -c "import audiocraft; print('AudioCraft version:', audiocraft.__version__)"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: AudioCraft is NOT installed!
    echo.
    echo Attempting to install AudioCraft now...
    echo This may take 5-10 minutes...
    echo.

    REM Try method 1: Standard installation
    echo Method 1: Standard pip install...
    venv\Scripts\pip.exe install audiocraft

    REM Test if it worked
    venv\Scripts\python.exe -c "import audiocraft; print('Success!')" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Method 1 failed, trying method 2...

        REM Try method 2: Install without dependencies, then install deps manually
        echo Method 2: Installing without xformers...
        venv\Scripts\pip.exe uninstall -y audiocraft xformers
        venv\Scripts\pip.exe install audiocraft --no-deps
        venv\Scripts\pip.exe install torch torchaudio transformers einops num2words scipy numpy

        REM Test again
        venv\Scripts\python.exe -c "import audiocraft; print('Success!')" >nul 2>&1
        if %ERRORLEVEL% NEQ 0 (
            echo Method 2 failed, trying method 3...

            REM Try method 3: Install from git
            echo Method 3: Installing from GitHub...
            venv\Scripts\pip.exe install git+https://github.com/facebookresearch/audiocraft.git

            REM Test again
            venv\Scripts\python.exe -c "import audiocraft; print('Success!')" >nul 2>&1
            if %ERRORLEVEL% NEQ 0 (
                echo.
                echo ========================================
                echo ALL INSTALLATION METHODS FAILED
                echo ========================================
                echo.
                echo AudioCraft could not be installed using any method.
                echo This usually means:
                echo   1. Python version incompatibility
                echo   2. Network/firewall blocking downloads
                echo   3. Disk space issues
                echo   4. Corrupted pip cache
                echo.
                echo Try these manual fixes:
                echo   1. Clear pip cache: venv\Scripts\pip.exe cache purge
                echo   2. Check disk space: dir
                echo   3. Check internet: ping pypi.org
                echo   4. Try with VPN disabled
                echo.
                pause
                exit /b 1
            )
        )
    )
)
echo OK: AudioCraft is installed
echo.

REM Check AudioCraft models
echo [7/8] Checking AudioCraft models...
venv\Scripts\python.exe -c "from audiocraft.models import AudioGen; print('AudioGen model can be imported')"
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: AudioGen model import failed
    echo This might be OK - models download on first use
)
echo.

REM Final comprehensive test
echo [8/8] Running comprehensive AudioCraft test...
echo This will test actual generation (may take 1-2 minutes)...
venv\Scripts\python.exe -c "from audiocraft.models import AudioGen; model = AudioGen.get_pretrained('facebook/audiogen-medium'); print('AudioGen model loaded successfully!')"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: Model loading failed!
    echo This could mean:
    echo   - First download in progress (try again in 2 minutes)
    echo   - Network issues downloading model
    echo   - Insufficient disk space
    echo.
    echo The model is ~1.5GB and downloads on first use.
    echo.
) else (
    echo.
    echo ========================================
    echo SUCCESS! AudioCraft is fully working!
    echo ========================================
    echo.
    echo AudioCraft is installed and can load models.
    echo You can now restart CreatorCrafter and try SFX generation.
    echo.
)

echo.
echo ========================================
echo Diagnostic Complete
echo ========================================
echo.
echo Summary saved to: audiocraft-diagnostic.log
echo.

REM Save diagnostic info to log file
echo AudioCraft Diagnostic Log > audiocraft-diagnostic.log
echo Generated: %date% %time% >> audiocraft-diagnostic.log
echo. >> audiocraft-diagnostic.log
echo Installation Directory: %INSTALL_DIR% >> audiocraft-diagnostic.log
venv\Scripts\python.exe --version >> audiocraft-diagnostic.log 2>&1
venv\Scripts\pip.exe list >> audiocraft-diagnostic.log 2>&1

pause
