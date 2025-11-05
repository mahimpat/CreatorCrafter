@echo off
REM Check if system is ready to build Python environment

echo ==========================================
echo Prerequisite Checker
echo ==========================================
echo.

set ERROR_COUNT=0

REM Check Python
echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   X Python is NOT installed
    echo     Download from: https://www.python.org/downloads/
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo   - Python %PYTHON_VERSION% found

    REM Check if it's 3.11
    echo %PYTHON_VERSION% | findstr /C:"3.11" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo   ! WARNING: Python 3.11 is recommended
        echo     Current version: %PYTHON_VERSION%
    )
)

REM Check pip
echo.
echo [2/4] Checking pip...
python -m pip --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   X pip is NOT available
    set /a ERROR_COUNT+=1
) else (
    echo   - pip is available
)

REM Check disk space
echo.
echo [3/4] Checking disk space...
for /f "tokens=3" %%a in ('dir /-c ^| find "bytes free"') do set FREE_BYTES=%%a
set FREE_BYTES=%FREE_BYTES:,=%
set /a FREE_GB=%FREE_BYTES% / 1073741824
if %FREE_GB% LSS 10 (
    echo   ! WARNING: Low disk space
    echo     Available: %FREE_GB% GB
    echo     Recommended: 10 GB or more
) else (
    echo   - %FREE_GB% GB available
)

REM Check internet connection
echo.
echo [4/4] Checking internet connection...
ping -n 1 pypi.org >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   X Cannot reach pypi.org
    echo     Check your internet connection
    set /a ERROR_COUNT+=1
) else (
    echo   - Internet connection OK
)

REM Summary
echo.
echo ==========================================
if %ERROR_COUNT% EQU 0 (
    echo   All checks PASSED
    echo ==========================================
    echo.
    echo   You are ready to build!
    echo   Run: build-windows-venv.bat
) else (
    echo   %ERROR_COUNT% issue(s) found
    echo ==========================================
    echo.
    echo   Please fix the issues above before building
)

echo.
pause
