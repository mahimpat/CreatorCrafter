; CreatorCrafter Windows Installer
; NSIS Script for packaging the Electron app with Python dependencies

;--------------------------------
; Includes

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "x64.nsh"
!include "WordFunc.nsh"

; For internet downloads
!addplugindir "."

;--------------------------------
; Configuration

; Application Info
!define APPNAME "CreatorCrafter"
!define COMPANYNAME "CreatorCrafter"
!define DESCRIPTION "AI-Powered Video Content Creator"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 0

; Required Python version
!define PYTHON_VERSION "3.9"
!define PYTHON_VERSION_FULL "3.9.13"
!define PYTHON_INSTALLER "python-${PYTHON_VERSION_FULL}-amd64.exe"
!define PYTHON_URL "https://www.python.org/ftp/python/${PYTHON_VERSION_FULL}/${PYTHON_INSTALLER}"

; Installer settings
Name "${APPNAME}"
OutFile "CreatorCrafter-Setup.exe"
InstallDir "$PROGRAMFILES64\${APPNAME}"
InstallDirRegKey HKLM "Software\${APPNAME}" "InstallDir"
RequestExecutionLevel admin

;--------------------------------
; Interface Settings

!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

;--------------------------------
; Pages

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

;--------------------------------
; Languages

!insertmacro MUI_LANGUAGE "English"

;--------------------------------
; Variables

Var PythonInstalled

;--------------------------------
; Functions

; Check if Python is installed and get version
Function CheckPython
  ; Clear errors
  ClearErrors

  ; Try to run python --version
  nsExec::ExecToStack 'python --version'
  Pop $0 ; Return value
  Pop $1 ; Output

  ${If} $0 == 0
    ; Python found, check version
    DetailPrint "Python found: $1"

    ; Check if version contains 3.9 using StrStr
    Push "$1"
    Push "3.9"
    Call StrStr
    Pop $2

    ${If} $2 != ""
      DetailPrint "Python 3.9 is already installed"
      StrCpy $PythonInstalled "1"
    ${Else}
      DetailPrint "Python version is not 3.9"
      StrCpy $PythonInstalled "0"
    ${EndIf}
  ${Else}
    DetailPrint "Python not found in PATH"
    StrCpy $PythonInstalled "0"
  ${EndIf}
FunctionEnd

; Download Python installer
Function DownloadPython
  DetailPrint "Downloading Python ${PYTHON_VERSION_FULL}..."

  ; Use NSISdl plugin (built-in, works on Linux makensis)
  NSISdl::download "${PYTHON_URL}" "$TEMP\${PYTHON_INSTALLER}"
  Pop $0

  ${If} $0 == "success"
    DetailPrint "Python installer downloaded successfully"
  ${Else}
    MessageBox MB_OK|MB_ICONEXCLAMATION "Failed to download Python installer: $0$\n$\nPlease download Python ${PYTHON_VERSION} manually from:$\n${PYTHON_URL}$\n$\nThen install it before running CreatorCrafter."
    ; Don't abort, let user install Python manually
    StrCpy $PythonInstalled "0"
  ${EndIf}
FunctionEnd

; Install Python
Function InstallPython
  DetailPrint "Installing Python ${PYTHON_VERSION_FULL}..."

  ; Run Python installer with silent options
  ; /quiet = silent install
  ; InstallAllUsers=1 = install for all users
  ; PrependPath=1 = add Python to PATH
  ; Include_pip=1 = install pip
  ExecWait '"$TEMP\${PYTHON_INSTALLER}" /quiet InstallAllUsers=1 PrependPath=1 Include_pip=1' $0

  ${If} $0 == 0
    DetailPrint "Python installed successfully"

    ; Refresh environment variables
    ; Add Python to PATH for this session
    ReadRegStr $1 HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "Path"
    System::Call 'Kernel32::SetEnvironmentVariable(t "PATH", t "$1")i.r0'
  ${Else}
    MessageBox MB_OK|MB_ICONEXCLAMATION "Python installation failed with error code $0.$\n$\nPlease install Python ${PYTHON_VERSION} manually from python.org"
    Abort
  ${EndIf}

  ; Delete installer
  Delete "$TEMP\${PYTHON_INSTALLER}"
FunctionEnd

; Install Python packages
Function InstallPythonPackages
  DetailPrint "Installing Python dependencies..."
  DetailPrint "This may take several minutes. Please wait..."

  ; Install packages from requirements.txt
  nsExec::ExecToLog 'python -m pip install --upgrade pip'
  nsExec::ExecToLog 'python -m pip install -r "$INSTDIR\resources\requirements.txt"'
  Pop $0

  ${If} $0 == 0
    DetailPrint "Python packages installed successfully"
  ${Else}
    MessageBox MB_OK|MB_ICONEXCLAMATION "Failed to install Python packages.$\n$\nYou may need to install them manually using:$\n$\npip install -r requirements.txt"
  ${EndIf}
FunctionEnd

;--------------------------------
; Installer Section

Section "Install" SecInstall
  ; Set output path
  SetOutPath "$INSTDIR"

  ; Check for Python
  Call CheckPython

  ; Install Python if not found
  ${If} $PythonInstalled == "0"
    Call DownloadPython
    Call InstallPython
  ${EndIf}

  ; Copy application files
  DetailPrint "Copying application files..."

  ; Copy Electron app files
  File /r "release\win-unpacked\*.*"

  ; Copy resources
  SetOutPath "$INSTDIR\resources"
  File /r "python\*.*"
  File "requirements.txt"
  File "package.json"

  ; Install Python packages
  Call InstallPythonPackages

  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\${APPNAME}.exe"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${APPNAME}.exe"

  ; Write registry keys
  WriteRegStr HKLM "Software\${APPNAME}" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$INSTDIR\${APPNAME}.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "${COMPANYNAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "VersionMajor" ${VERSIONMAJOR}
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "VersionMinor" ${VERSIONMINOR}

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  DetailPrint "Installation complete!"
SectionEnd

;--------------------------------
; Uninstaller Section

Section "Uninstall"
  ; Remove files
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"

  ; Remove shortcuts
  Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
  Delete "$SMPROGRAMS\${APPNAME}\Uninstall.lnk"
  RMDir "$SMPROGRAMS\${APPNAME}"
  Delete "$DESKTOP\${APPNAME}.lnk"

  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
  DeleteRegKey HKLM "Software\${APPNAME}"

  MessageBox MB_OK "Uninstallation complete!$\n$\nNote: Python and its packages were not removed as they may be used by other applications."
SectionEnd

;--------------------------------
; Helper Functions

; StrStr function - finds substring in string
; Push haystack
; Push needle
; Call StrStr
; Pop result (empty if not found, position if found)
Function StrStr
  Exch $R1 ; needle
  Exch
  Exch $R2 ; haystack
  Push $R3
  Push $R4
  Push $R5
  StrLen $R3 $R1
  StrCpy $R4 0

  loop:
    StrCpy $R5 $R2 $R3 $R4
    StrCmp $R5 $R1 done
    StrCmp $R5 "" done
    IntOp $R4 $R4 + 1
    Goto loop
  done:
    StrCpy $R1 $R2 "" $R4
    Pop $R5
    Pop $R4
    Pop $R3
    Pop $R2
    Exch $R1
FunctionEnd
