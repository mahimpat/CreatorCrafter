@echo off
REM Windows Diagnostic Script for CreatorCrafter
REM Run this to see what's missing

echo ========================================
echo CreatorCrafter - Diagnostic Information
echo ========================================
echo.

REM Get installation directory
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

echo Installation Directory: %CD%
echo.

echo [Python Check]
python --version 2>nul
if %errorlevel% neq 0 (
    echo X Python: NOT FOUND
    echo   Install from: https://www.python.org/downloads/
) else (
    echo + Python: FOUND
)
echo.

echo [Virtual Environment Check]
if exist "venv\Scripts\python.exe" (
    echo + Virtual Environment: FOUND
    venv\Scripts\python.exe --version
) else (
    echo X Virtual Environment: NOT FOUND
    echo   Run windows-hotfix.bat to create it
)
echo.

echo [Requirements File Check]
if exist "resources\requirements.txt" (
    echo + requirements.txt: FOUND (resources\requirements.txt)
) else if exist "requirements.txt" (
    echo + requirements.txt: FOUND (requirements.txt)
) else (
    echo X requirements.txt: NOT FOUND
)
echo.

echo [Python Scripts Check]
if exist "resources\python\video_analyzer.pyc" (
    echo + video_analyzer: FOUND (resources\python\video_analyzer.pyc)
) else if exist "resources\python\video_analyzer.py" (
    echo + video_analyzer: FOUND (resources\python\video_analyzer.py)
) else (
    echo X video_analyzer: NOT FOUND
)

if exist "resources\python\audiocraft_generator.pyc" (
    echo + audiocraft_generator: FOUND (resources\python\audiocraft_generator.pyc)
) else if exist "resources\python\audiocraft_generator.py" (
    echo + audiocraft_generator: FOUND (resources\python\audiocraft_generator.py)
) else (
    echo X audiocraft_generator: NOT FOUND
)
echo.

echo [FFmpeg Check]
ffmpeg -version 2>nul | findstr "ffmpeg version" 2>nul
if %errorlevel% neq 0 (
    echo X FFmpeg: NOT FOUND
    echo   Install from: https://ffmpeg.org/download.html
) else (
    echo + FFmpeg: FOUND
)
echo.

echo [Installed Packages Check (if venv exists)]
if exist "venv\Scripts\pip.exe" (
    echo Checking installed packages...
    venv\Scripts\pip.exe list | findstr /i "torch whisper audiocraft"
) else (
    echo Skipping package check (no venv)
)
echo.

echo ========================================
echo.
echo If you see X marks above, run windows-hotfix.bat to fix them.
echo.
pause
