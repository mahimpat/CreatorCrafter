#!/usr/bin/env python3
"""
Setup script to verify and configure the Python environment for CreatorCrafter.
This is run on first launch to ensure everything is properly configured.
"""

import sys
import os
import subprocess
import json
from pathlib import Path

def check_python_version():
    """Verify Python version is 3.8 or higher"""
    if sys.version_info < (3, 8):
        print(f"ERROR: Python 3.8+ required, found {sys.version_info.major}.{sys.version_info.minor}")
        return False
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def check_ffmpeg():
    """Check if FFmpeg is installed and accessible"""
    try:
        result = subprocess.run(['ffmpeg', '-version'],
                              capture_output=True,
                              text=True,
                              timeout=5)
        if result.returncode == 0:
            print("✓ FFmpeg is installed")
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    print("WARNING: FFmpeg not found. Video processing will not work.")
    print("Please install FFmpeg from: https://ffmpeg.org/download.html")
    return False

def check_dependencies():
    """Check if required Python packages are installed"""
    required_packages = [
        'torch',
        'whisper',
        'audiocraft',
        'transformers',
        'opencv-python'
    ]

    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✓ {package} installed")
        except ImportError:
            missing.append(package)
            print(f"✗ {package} missing")

    return len(missing) == 0, missing

def install_dependencies(requirements_file):
    """Install dependencies from requirements.txt"""
    print("\nInstalling Python dependencies...")
    try:
        subprocess.run([
            sys.executable, '-m', 'pip', 'install',
            '-r', requirements_file
        ], check=True)
        print("✓ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install dependencies: {e}")
        return False

def download_models():
    """Download required AI models"""
    print("\nDownloading AI models...")
    script_dir = Path(__file__).parent
    download_script = script_dir / 'download_models.py'

    if not download_script.exists():
        print("✗ download_models.py not found")
        return False

    try:
        subprocess.run([sys.executable, str(download_script)], check=True)
        print("✓ Models downloaded successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to download models: {e}")
        return False

def create_config():
    """Create initial configuration file"""
    config_dir = Path.home() / '.creatorcrafter'
    config_dir.mkdir(exist_ok=True)

    config_file = config_dir / 'config.json'
    if not config_file.exists():
        config = {
            'first_run_complete': True,
            'python_path': sys.executable,
            'models_downloaded': True
        }
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"✓ Configuration created at {config_file}")

    return True

def main():
    """Main setup routine"""
    print("=== CreatorCrafter Environment Setup ===\n")

    # Check Python version
    if not check_python_version():
        sys.exit(1)

    # Check FFmpeg
    check_ffmpeg()

    # Check dependencies
    deps_ok, missing = check_dependencies()

    if not deps_ok:
        print(f"\nMissing packages: {', '.join(missing)}")

        # Try to find requirements.txt
        possible_paths = [
            Path(__file__).parent.parent / 'requirements.txt',
            Path(__file__).parent / 'requirements.txt',
        ]

        requirements_file = None
        for path in possible_paths:
            if path.exists():
                requirements_file = path
                break

        if requirements_file:
            print(f"\nFound requirements.txt at: {requirements_file}")
            install = input("Install missing dependencies now? (y/n): ")
            if install.lower() == 'y':
                if not install_dependencies(requirements_file):
                    sys.exit(1)
        else:
            print("✗ requirements.txt not found")
            sys.exit(1)

    # Download models if needed
    print("\nChecking AI models...")
    cache_dir = Path.home() / '.cache' / 'huggingface'
    if not cache_dir.exists() or not any(cache_dir.iterdir()):
        download = input("Download AI models now? (Required, ~500MB): (y/n): ")
        if download.lower() == 'y':
            if not download_models():
                print("\nWARNING: Model download failed. AI features may not work.")
    else:
        print("✓ AI models appear to be cached")

    # Create config
    create_config()

    print("\n=== Setup Complete ===")
    print("You can now run CreatorCrafter!")
    return 0

if __name__ == '__main__':
    sys.exit(main())
