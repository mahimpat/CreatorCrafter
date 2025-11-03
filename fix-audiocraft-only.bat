@echo off
REM Quick fix for AudioCraft installation
REM Run this if SFX generation doesn't work

echo ========================================
echo CreatorCrafter - AudioCraft Fix
echo ========================================
echo.

REM Get installation directory (where this script is located)
set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

echo Checking Python virtual environment...
if not exist "venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found at: %INSTALL_DIR%venv
    echo.
    echo Please run the full windows-hotfix-v3.bat instead.
    pause
    exit /b 1
)

echo Found venv at: %INSTALL_DIR%venv
echo.

echo ========================================
echo Attempting to install AudioCraft...
echo ========================================
echo.

REM Try installing audiocraft
echo This may take 5-10 minutes and show warnings - that's OK!
echo.
venv\Scripts\pip.exe install --prefer-binary audiocraft

echo.
echo ========================================
echo Verifying AudioCraft installation...
echo ========================================
echo.

REM Verify it can be imported
venv\Scripts\python.exe -c "import audiocraft; print('AudioCraft installed successfully!')"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo ERROR: AudioCraft verification failed
    echo ========================================
    echo.
    echo AudioCraft could not be imported. This usually means:
    echo 1. Installation failed due to missing dependencies
    echo 2. Your Python version is incompatible
    echo 3. C++ build tools are needed
    echo.
    echo SOLUTION: Run the full windows-hotfix-v3.bat script
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS!
echo ========================================
echo.
echo AudioCraft is now installed and working.
echo You can now close this window and restart CreatorCrafter.
echo SFX generation should work now!
echo.
pause
