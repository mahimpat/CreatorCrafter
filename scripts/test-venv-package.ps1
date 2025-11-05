# CreatorCrafter - Test Pre-Built Python Environment
# Run this script to test that the packaged environment works correctly

param(
    [Parameter(Mandatory=$true)]
    [string]$PackagePath
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Testing Python Environment Package" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if package exists
if (-not (Test-Path $PackagePath)) {
    Write-Host "ERROR: Package not found: $PackagePath" -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] Package found: $PackagePath" -ForegroundColor Green
$SizeMB = (Get-Item $PackagePath).Length / 1MB
Write-Host "Package size: $([math]::Round($SizeMB, 2)) MB" -ForegroundColor Cyan

# Create test directory
$TestDir = "test_env_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host ""
Write-Host "[2/5] Creating test directory: $TestDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $TestDir | Out-Null

# Extract package
Write-Host ""
Write-Host "[3/5] Extracting package..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes..." -ForegroundColor Cyan
Expand-Archive -Path $PackagePath -DestinationPath $TestDir -Force

# Check extraction
$VenvPath = Join-Path $TestDir "venv_dist"
if (-not (Test-Path $VenvPath)) {
    Write-Host "ERROR: venv_dist not found in extracted package" -ForegroundColor Red
    exit 1
}

Write-Host "Extraction successful" -ForegroundColor Green

# Test Python executable
Write-Host ""
Write-Host "[4/5] Testing Python executable..." -ForegroundColor Yellow
$PythonExe = Join-Path $VenvPath "Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    Write-Host "ERROR: Python executable not found" -ForegroundColor Red
    exit 1
}

$PythonVersion = & $PythonExe --version 2>&1
Write-Host "Python version: $PythonVersion" -ForegroundColor Green

# Test imports
Write-Host ""
Write-Host "[5/5] Testing package imports..." -ForegroundColor Yellow

$TestScript = @"
import sys
import traceback

print('Testing package imports...')
print('-' * 50)

tests = [
    ('torch', 'PyTorch'),
    ('torchaudio', 'TorchAudio'),
    ('audiocraft', 'AudioCraft'),
    ('whisper', 'OpenAI Whisper'),
    ('transformers', 'Transformers'),
    ('cv2', 'OpenCV'),
    ('librosa', 'Librosa'),
    ('soundfile', 'SoundFile'),
    ('PIL', 'Pillow'),
    ('numpy', 'NumPy'),
    ('scipy', 'SciPy'),
    ('scenedetect', 'PySceneDetect')
]

passed = 0
failed = 0

for module, name in tests:
    try:
        mod = __import__(module)
        version = getattr(mod, '__version__', 'unknown')
        print(f'✓ {name:20} {version}')
        passed += 1
    except Exception as e:
        print(f'✗ {name:20} FAILED: {str(e)[:50]}')
        failed += 1

print('-' * 50)
print(f'Results: {passed} passed, {failed} failed')

if failed > 0:
    print('\nERROR: Some imports failed')
    sys.exit(1)
else:
    print('\n✅ All imports successful!')
    sys.exit(0)
"@

$TestScript | Out-File -FilePath "test_script.py" -Encoding UTF8
& $PythonExe "test_script.py"
$TestResult = $LASTEXITCODE
Remove-Item "test_script.py"

# Summary
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if ($TestResult -eq 0) {
    Write-Host "✅ All tests PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "The package is ready for distribution!" -ForegroundColor Green
    $Success = $true
} else {
    Write-Host "✗ Tests FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the errors above and rebuild the package" -ForegroundColor Yellow
    $Success = $false
}

# Cleanup
Write-Host ""
Write-Host "Cleaning up test directory..." -ForegroundColor Gray
Remove-Item -Recurse -Force $TestDir

if ($Success) {
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Upload package to CDN/S3/GitHub Releases" -ForegroundColor White
    Write-Host "2. Update installer configuration with package URL" -ForegroundColor White
    Write-Host "3. Test installer on clean Windows machine" -ForegroundColor White
    exit 0
} else {
    exit 1
}
