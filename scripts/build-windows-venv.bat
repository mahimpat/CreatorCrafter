@echo off
REM CreatorCrafter - Windows Python Environment Builder (Batch Wrapper)
REM This script runs the PowerShell build script

echo ==========================================
echo CreatorCrafter Python Environment Builder
echo ==========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python 3.11 from:
    echo https://www.python.org/downloads/
    echo.
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Found Python %PYTHON_VERSION%

REM Run PowerShell script
echo.
echo Running build script...
echo This will take 20-40 minutes depending on your internet speed
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0build-windows-venv.ps1"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==========================================
    echo Build completed successfully!
    echo ==========================================
    echo.
    echo Check the 'dist' folder for the output package
) else (
    echo.
    echo ==========================================
    echo Build failed!
    echo ==========================================
    echo.
    echo Check build-log.txt for details
)

pause
