# CreatorCrafter - Windows Python Environment Builder
# Run this script on a Windows machine to create a pre-built Python environment
# that can be distributed with the installer

# Requires: Python 3.11 installed on Windows

param(
    [string]$OutputDir = ".\dist",
    [string]$Version = "1.0.0"
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "CreatorCrafter Python Environment Builder" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$VenvName = "venv_dist"
$PackageName = "python-env-windows-x64-v$Version.zip"
$LogFile = "build-log.txt"

# Start logging
Start-Transcript -Path $LogFile

# Check Python version
Write-Host "[1/9] Checking Python installation..." -ForegroundColor Yellow
$PythonVersion = python --version 2>&1
Write-Host "Found: $PythonVersion" -ForegroundColor Green

if ($PythonVersion -notmatch "Python 3.11") {
    Write-Host "ERROR: Python 3.11 is required!" -ForegroundColor Red
    Write-Host "Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Clean up old builds
Write-Host ""
Write-Host "[2/9] Cleaning up old builds..." -ForegroundColor Yellow
if (Test-Path $VenvName) {
    Write-Host "Removing old venv..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $VenvName
}

# Create virtual environment
Write-Host ""
Write-Host "[3/9] Creating Python virtual environment..." -ForegroundColor Yellow
python -m venv $VenvName

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create virtual environment" -ForegroundColor Red
    exit 1
}

Write-Host "Virtual environment created successfully" -ForegroundColor Green

# Activate virtual environment
Write-Host ""
Write-Host "[4/9] Activating virtual environment..." -ForegroundColor Yellow
$ActivateScript = ".\$VenvName\Scripts\Activate.ps1"
& $ActivateScript

# Upgrade pip
Write-Host ""
Write-Host "[5/9] Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip setuptools wheel

# Install dependencies in correct order
Write-Host ""
Write-Host "[6/9] Installing Python packages..." -ForegroundColor Yellow
Write-Host "This will take 15-30 minutes and download ~2GB" -ForegroundColor Cyan
Write-Host ""

# Step 1: NumPy (must be 1.x, not 2.x)
Write-Host "Installing NumPy 1.26.4..." -ForegroundColor Cyan
pip install numpy==1.26.4
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: NumPy installation failed" -ForegroundColor Red
    exit 1
}

# Step 2: PyTorch CPU version
Write-Host ""
Write-Host "Installing PyTorch 2.1.0 (CPU)..." -ForegroundColor Cyan
Write-Host "This is the largest package (~2GB) and may take 10-20 minutes..." -ForegroundColor Yellow
pip install torch==2.1.0 torchaudio==2.1.0 --index-url https://download.pytorch.org/whl/cpu
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: PyTorch installation failed" -ForegroundColor Red
    exit 1
}

# Step 3: AudioCraft dependencies (install separately to avoid xformers)
Write-Host ""
Write-Host "Installing AudioCraft dependencies..." -ForegroundColor Cyan
pip install einops==0.8.1
pip install hydra-core==1.3.2
pip install omegaconf==2.3.0
pip install julius==0.2.7
pip install encodec==0.1.1
pip install flashy==0.0.2

# Step 4: AudioCraft (without dependencies to skip xformers)
Write-Host ""
Write-Host "Installing AudioCraft 1.3.0..." -ForegroundColor Cyan
Write-Host "Note: Installing without xformers (not needed for CPU)" -ForegroundColor Yellow
pip install audiocraft==1.3.0 --no-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AudioCraft installation failed" -ForegroundColor Red
    exit 1
}

# Step 5: Transformers
Write-Host ""
Write-Host "Installing Transformers..." -ForegroundColor Cyan
pip install transformers==4.35.0
pip install tokenizers==0.22.1
pip install huggingface-hub==0.36.0
pip install safetensors==0.6.2

# Step 6: Audio processing
Write-Host ""
Write-Host "Installing audio processing libraries..." -ForegroundColor Cyan
pip install librosa==0.11.0
pip install soundfile==0.13.1
pip install audioread==3.0.1

# Step 7: Video processing
Write-Host ""
Write-Host "Installing video processing libraries..." -ForegroundColor Cyan
pip install opencv-python==4.8.1.78
pip install scenedetect==0.6.7.1

# Step 8: Whisper
Write-Host ""
Write-Host "Installing OpenAI Whisper..." -ForegroundColor Cyan
pip install openai-whisper==20250625

# Step 9: Image processing
Write-Host ""
Write-Host "Installing image processing libraries..." -ForegroundColor Cyan
pip install Pillow==11.3.0

# Step 10: Scientific computing
Write-Host ""
Write-Host "Installing scientific computing libraries..." -ForegroundColor Cyan
pip install scipy==1.16.2

# Step 11: Utilities
Write-Host ""
Write-Host "Installing utilities..." -ForegroundColor Cyan
pip install requests==2.32.5
pip install tqdm==4.67.1
pip install PyYAML==6.0.3
pip install packaging==25.0
pip install filelock==3.20.0
pip install regex==2025.10.23

# Step 12: PyAV (optional - may fail, that's OK)
Write-Host ""
Write-Host "Installing PyAV (optional)..." -ForegroundColor Cyan
Write-Host "Note: This may fail if FFmpeg libraries not available - app will work without it" -ForegroundColor Yellow
pip install av==16.0.1
# Don't exit on failure - PyAV is optional

# Verify installations
Write-Host ""
Write-Host "[7/9] Verifying installations..." -ForegroundColor Yellow

$TestScript = @"
import sys

packages = {
    'torch': '2.1.0',
    'torchaudio': '2.1.0',
    'audiocraft': '1.3.0',
    'whisper': None,
    'transformers': '4.35.0',
    'cv2': '4.8.1.78',
    'librosa': '0.11.0',
    'PIL': '11.3.0',
    'numpy': '1.26.4',
    'scipy': '1.16.2'
}

failed = []
for package, expected_version in packages.items():
    try:
        mod = __import__(package)
        version = getattr(mod, '__version__', 'unknown')
        print(f'✓ {package:15} {version}')
        if expected_version and not version.startswith(expected_version.split('.')[0]):
            failed.append(f'{package} version mismatch')
    except ImportError as e:
        print(f'✗ {package:15} FAILED: {e}')
        failed.append(package)

if failed:
    print(f'\nERROR: Failed packages: {", ".join(failed)}')
    sys.exit(1)
else:
    print('\n✅ All packages verified successfully!')
    sys.exit(0)
"@

$TestScript | Out-File -FilePath "test_imports.py" -Encoding UTF8
python test_imports.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Package verification failed" -ForegroundColor Red
    exit 1
}

Remove-Item "test_imports.py"

# Clean up unnecessary files
Write-Host ""
Write-Host "[8/9] Cleaning up unnecessary files..." -ForegroundColor Yellow

# Remove pip cache
Write-Host "Clearing pip cache..." -ForegroundColor Gray
pip cache purge

# Remove __pycache__ directories
Write-Host "Removing __pycache__ directories..." -ForegroundColor Gray
Get-ChildItem -Path $VenvName -Include __pycache__ -Recurse -Force | Remove-Item -Force -Recurse

# Remove .pyc files
Write-Host "Removing .pyc files..." -ForegroundColor Gray
Get-ChildItem -Path $VenvName -Filter *.pyc -Recurse -Force | Remove-Item -Force

# Remove test files
Write-Host "Removing test files..." -ForegroundColor Gray
Get-ChildItem -Path $VenvName -Recurse -Include "test","tests","testing" -Directory | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue

# Calculate size before compression
$SizeMB = (Get-ChildItem -Path $VenvName -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Cleaned venv size: $([math]::Round($SizeMB, 2)) MB" -ForegroundColor Green

# Package virtual environment
Write-Host ""
Write-Host "[9/9] Packaging virtual environment..." -ForegroundColor Yellow

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$OutputPath = Join-Path $OutputDir $PackageName

Write-Host "Compressing to: $OutputPath" -ForegroundColor Cyan
Write-Host "This may take 10-15 minutes..." -ForegroundColor Yellow

# Compress with optimal compression
Compress-Archive -Path $VenvName -DestinationPath $OutputPath -CompressionLevel Optimal -Force

# Calculate final size
$FinalSizeMB = (Get-Item $OutputPath).Length / 1MB
Write-Host "Compressed package size: $([math]::Round($FinalSizeMB, 2)) MB" -ForegroundColor Green

# Generate metadata
$Metadata = @{
    version = $Version
    created = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    python_version = $PythonVersion
    platform = "windows-x64"
    packages = @{
        torch = "2.1.0"
        torchaudio = "2.1.0"
        audiocraft = "1.3.0"
        whisper = "20250625"
        transformers = "4.35.0"
        opencv = "4.8.1.78"
        numpy = "1.26.4"
    }
    size_mb = [math]::Round($FinalSizeMB, 2)
    file = $PackageName
}

$MetadataPath = Join-Path $OutputDir "metadata-v$Version.json"
$Metadata | ConvertTo-Json -Depth 10 | Out-File -FilePath $MetadataPath -Encoding UTF8

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package location: $OutputPath" -ForegroundColor Cyan
Write-Host "Package size: $([math]::Round($FinalSizeMB, 2)) MB" -ForegroundColor Cyan
Write-Host "Metadata: $MetadataPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the package on a clean Windows machine" -ForegroundColor White
Write-Host "2. Upload to your CDN/S3/GitHub Releases" -ForegroundColor White
Write-Host "3. Update installer to download this package" -ForegroundColor White
Write-Host ""

# Generate SHA256 checksum
Write-Host "Generating SHA256 checksum..." -ForegroundColor Yellow
$Hash = Get-FileHash -Path $OutputPath -Algorithm SHA256
$HashPath = Join-Path $OutputDir "SHA256SUMS-v$Version.txt"
"$($Hash.Hash)  $PackageName" | Out-File -FilePath $HashPath -Encoding UTF8
Write-Host "Checksum: $($Hash.Hash)" -ForegroundColor Cyan
Write-Host "Checksum file: $HashPath" -ForegroundColor Cyan

Write-Host ""
Write-Host "🎉 Python environment ready for distribution!" -ForegroundColor Green

Stop-Transcript
