@echo off
REM Build script for CreatorCrafter (Windows)
REM Usage: build.bat [platform]
REM platform: win, mac, linux, or all (default: win)

setlocal enabledelayedexpansion

echo === CreatorCrafter Build Script ===
echo.

REM Parse arguments
set PLATFORM=%1
if "%PLATFORM%"=="" set PLATFORM=win

REM Check prerequisites
echo [INFO] Checking prerequisites...

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION%

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python 3.8+
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] %PYTHON_VERSION%

REM Check FFmpeg
where ffmpeg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] FFmpeg not found. The app will not work without FFmpeg.
    echo Install FFmpeg from: https://ffmpeg.org/download.html
) else (
    echo [OK] FFmpeg found
)

REM Install npm dependencies
echo.
echo [INFO] Installing npm dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install npm dependencies
    exit /b 1
)
echo [OK] npm dependencies installed

REM Type check
echo.
echo [INFO] Running TypeScript type check...
call npm run type-check
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Type check failed
    exit /b 1
)
echo [OK] Type check passed

REM Clean previous builds
echo.
echo [INFO] Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist dist-electron rmdir /s /q dist-electron
if exist release rmdir /s /q release
echo [OK] Cleaned

REM Compile Python scripts to bytecode
echo.
echo [INFO] Compiling Python scripts to bytecode...
python python\compile_scripts.py
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python scripts compiled to bytecode
) else (
    echo [WARNING] Failed to compile Python scripts (continuing anyway)
)

REM Build based on platform
echo.
echo [INFO] Building application for %PLATFORM%...

if "%PLATFORM%"=="win" (
    echo Building for Windows...
    call npm run electron:build -- --win --x64
) else if "%PLATFORM%"=="mac" (
    echo Building for macOS...
    call npm run electron:build -- --mac
) else if "%PLATFORM%"=="linux" (
    echo Building for Linux...
    call npm run electron:build -- --linux
) else if "%PLATFORM%"=="all" (
    echo Building for all platforms...
    call npm run electron:build -- --win --mac --linux
) else (
    echo [ERROR] Unknown platform: %PLATFORM%
    echo Usage: build.bat [win^|mac^|linux^|all]
    exit /b 1
)

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    exit /b 1
)

echo.
echo [OK] Build complete!

REM Show output
echo.
echo [INFO] Build artifacts:
if exist release (
    dir /b release
    echo.
    echo Installers created in: %CD%\release\
) else (
    echo [ERROR] No release directory found
)

REM Show next steps
echo.
echo === Next Steps ===
echo 1. Test the installer on a clean machine
echo 2. Verify Python environment setup works
echo 3. Check FFmpeg integration
echo 4. Test AI model downloads
echo.
echo For distribution instructions, see INSTALLATION.md

endlocal
