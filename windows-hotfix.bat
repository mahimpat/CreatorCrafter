@echo off
REM Windows Hotfix Script for CreatorCrafter
REM Run this script as Administrator if the app fails to analyze videos or generate SFX

echo ========================================
echo CreatorCrafter - Python Environment Setup
echo ========================================
echo.

REM Get installation directory (where the app is installed)
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

echo Current directory: %CD%
echo.

REM Check if Python is installed
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python 3.8 or higher from:
    echo https://www.python.org/downloads/
    echo.
    echo Make sure to check "Add Python to PATH" during installation!
    echo.
    pause
    exit /b 1
)

python --version
echo Python found!
echo.

REM Create virtual environment
echo [2/5] Creating Python virtual environment...
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
echo [3/5] Upgrading pip...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
echo.

REM Install dependencies
echo [4/5] Installing Python dependencies...
echo This may take several minutes. Please wait...
echo.

REM Check if requirements.txt exists
if exist "resources\requirements.txt" (
    set "REQ_FILE=resources\requirements.txt"
) else if exist "requirements.txt" (
    set "REQ_FILE=requirements.txt"
) else (
    echo ERROR: requirements.txt not found
    echo Looking in: resources\requirements.txt or requirements.txt
    pause
    exit /b 1
)

echo Installing from: %REQ_FILE%
pip install -r "%REQ_FILE%"
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    echo.
    echo Try running this script as Administrator
    pause
    exit /b 1
)
echo Dependencies installed!
echo.

REM Download AI models
echo [5/5] Downloading AI models...
echo This may take several minutes and download ~500MB
echo.

REM Find the download_models script
if exist "resources\python\download_models.pyc" (
    python resources\python\download_models.pyc
) else if exist "resources\python\download_models.py" (
    python resources\python\download_models.py
) else if exist "python\download_models.py" (
    python python\download_models.py
) else (
    echo WARNING: download_models script not found
    echo You may need to download models manually
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo You can now close this window and restart CreatorCrafter.
echo.
pause
