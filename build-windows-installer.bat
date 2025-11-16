@echo off
echo =====================================
echo CreatorCrafter Windows Installer Build
echo =====================================
echo.

REM Check if NSIS is installed
where makensis >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: NSIS not found!
    echo.
    echo Please install NSIS from: https://nsis.sourceforge.io/Download
    echo After installation, make sure makensis.exe is in your PATH
    pause
    exit /b 1
)

echo [1/4] Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist CreatorCrafter-Setup.exe del /f CreatorCrafter-Setup.exe

echo [2/4] Building Electron application...
call npm run build:win
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Electron build failed!
    pause
    exit /b 1
)

echo [3/4] Verifying build output...
if not exist "dist\win-unpacked\CreatorCrafter.exe" (
    echo ERROR: CreatorCrafter.exe not found in build output!
    echo Expected location: dist\win-unpacked\CreatorCrafter.exe
    pause
    exit /b 1
)

echo [4/4] Creating NSIS installer...
makensis installer.nsi
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: NSIS installer creation failed!
    pause
    exit /b 1
)

echo.
echo =====================================
echo Build Complete!
echo =====================================
echo.
echo Installer created: CreatorCrafter-Setup.exe
echo.
echo You can now distribute this installer to Windows users.
echo The installer will:
echo   - Check for Python 3.9 (install if missing)
echo   - Install Python dependencies
echo   - Install CreatorCrafter application
echo   - Create desktop and start menu shortcuts
echo.
pause
