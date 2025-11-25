@echo off
REM CreatorCrafter Windows Installer Builder
REM Run this script on Windows to build the installer

echo ========================================
echo CreatorCrafter Windows Installer Builder
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.11+ from python.org
    pause
    exit /b 1
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from nodejs.org
    pause
    exit /b 1
)

echo [1/4] Installing npm dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)
echo.

echo [2/4] Downloading FFmpeg for Windows...
if not exist resources\ffmpeg mkdir resources\ffmpeg

REM Download FFmpeg using PowerShell
powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile 'resources\ffmpeg\ffmpeg-win.zip'}"
if errorlevel 1 (
    echo ERROR: Failed to download FFmpeg
    echo Please download manually from: https://github.com/BtbN/FFmpeg-Builds/releases
    pause
    exit /b 1
)

echo Extracting FFmpeg...
powershell -Command "& {Expand-Archive -Path 'resources\ffmpeg\ffmpeg-win.zip' -DestinationPath 'resources\ffmpeg\temp' -Force}"

REM Copy binaries to resources/ffmpeg
for /r resources\ffmpeg\temp %%i in (ffmpeg.exe) do copy "%%i" resources\ffmpeg\
for /r resources\ffmpeg\temp %%i in (ffprobe.exe) do copy "%%i" resources\ffmpeg\

REM Clean up
rd /s /q resources\ffmpeg\temp
del resources\ffmpeg\ffmpeg-win.zip

if not exist resources\ffmpeg\ffmpeg.exe (
    echo ERROR: Failed to extract FFmpeg binaries
    pause
    exit /b 1
)

echo FFmpeg extracted successfully
echo.

echo [3/4] Building Electron application...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo.

echo [4/4] Creating Windows installer with NSIS...
call npx electron-builder --win --x64
if errorlevel 1 (
    echo ERROR: electron-builder failed
    pause
    exit /b 1
)
echo.

echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Installer location: release\
dir /b release\*.exe
echo.
echo The installer will:
echo   1. Check for Python 3.11+ (install if missing)
echo   2. Install CreatorCrafter application
echo   3. Create Python virtual environment
echo   4. Install all dependencies via pip
echo   5. Setup FFmpeg
echo.
echo Installer size: ~100MB
echo Installation requires internet connection
echo Installation time: 10-15 minutes
echo.
pause
