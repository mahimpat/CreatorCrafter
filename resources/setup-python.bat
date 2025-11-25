@echo off
REM CreatorCrafter Python Setup
REM Run this after installation to setup Python dependencies

echo ========================================
echo CreatorCrafter Python Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.11+ is required
    echo.
    echo Please install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo Python found!
echo.

REM Get the installation directory
set INSTALL_DIR=%~dp0..

echo Creating virtual environment...
python -m venv "%INSTALL_DIR%\venv"

echo.
echo Installing dependencies (this takes 10-15 minutes)...
echo Please be patient...
echo.

"%INSTALL_DIR%\venv\Scripts\python.exe" -m pip install --upgrade pip
"%INSTALL_DIR%\venv\Scripts\pip.exe" install -r "%INSTALL_DIR%\resources\requirements.txt"

if errorlevel 1 (
    echo.
    echo WARNING: Some dependencies may have failed
    echo Application might not work correctly
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Python environment created at:
echo %INSTALL_DIR%\venv
echo.
echo You can now launch CreatorCrafter
echo.
pause
