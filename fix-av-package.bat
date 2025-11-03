@echo off
REM Fix for PyAV (av) installation issue
REM PyAV is required by AudioCraft but often fails on Windows

echo ========================================
echo PyAV (av) Installation Fix
echo ========================================
echo.

set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

echo [1/4] Checking virtual environment...
if not exist "venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found
    pause
    exit /b 1
)
echo OK: venv found
echo.

echo [2/4] Uninstalling any broken av/audiocraft installations...
venv\Scripts\pip.exe uninstall -y av audiocraft
echo.

echo [3/4] Installing PyAV (av) with pre-built wheel...
echo This package provides FFmpeg bindings for Python.
echo.

REM Try to install av first, separately
echo Attempting to install av...
venv\Scripts\pip.exe install av

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Standard installation failed. Trying alternative method...
    echo.

    REM Try installing from conda-forge wheel (more reliable on Windows)
    echo Trying to install from PyPI with no build isolation...
    venv\Scripts\pip.exe install av --no-build-isolation

    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo Still failing. Trying to install dependencies first...
        venv\Scripts\pip.exe install setuptools wheel Cython
        venv\Scripts\pip.exe install av --no-build-isolation

        if %ERRORLEVEL% NEQ 0 (
            echo.
            echo ========================================
            echo ERROR: PyAV installation failed
            echo ========================================
            echo.
            echo PyAV requires FFmpeg libraries and often fails on Windows.
            echo.
            echo WORKAROUND: Install AudioCraft without av dependency
            echo AudioCraft can work without av for basic functionality.
            echo.
            goto install_without_av
        )
    )
)

echo.
echo [4/4] Installing AudioCraft...
venv\Scripts\pip.exe install audiocraft

REM Verify
venv\Scripts\python.exe -c "import audiocraft; print('AudioCraft installed!')"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: AudioCraft still cannot be imported
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS!
echo ========================================
echo.
echo AudioCraft is now installed with av support.
echo Restart CreatorCrafter to use SFX generation.
echo.
pause
exit /b 0

:install_without_av
echo.
echo Installing AudioCraft without av (limited functionality)...
echo.

REM Install AudioCraft dependencies manually, skipping av
venv\Scripts\pip.exe install torch torchaudio
venv\Scripts\pip.exe install transformers
venv\Scripts\pip.exe install einops
venv\Scripts\pip.exe install num2words
venv\Scripts\pip.exe install julius
venv\Scripts\pip.exe install hydra-core
venv\Scripts\pip.exe install omegaconf

REM Install audiocraft without dependencies
venv\Scripts\pip.exe install audiocraft --no-deps

echo.
echo Testing AudioCraft import...
venv\Scripts\python.exe -c "import audiocraft; print('AudioCraft installed (without av)')"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo FAILED: AudioCraft cannot be installed
    echo ========================================
    echo.
    echo This is likely due to Python version incompatibility.
    echo AudioCraft requires Python 3.8-3.11.
    echo.
    venv\Scripts\python.exe --version
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo PARTIAL SUCCESS
echo ========================================
echo.
echo AudioCraft installed WITHOUT av support.
echo Basic SFX generation should work.
echo Some advanced features may not be available.
echo.
echo Restart CreatorCrafter to use SFX generation.
echo.
pause
exit /b 0
