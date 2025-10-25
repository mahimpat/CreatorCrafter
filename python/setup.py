#!/usr/bin/env python3
"""
Setup script to verify Python environment and dependencies.
"""

import sys
import subprocess

def check_python_version():
    """Check if Python version is 3.8 or higher."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python 3.8+ required. You have Python {version.major}.{version.minor}")
        return False
    print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_dependencies():
    """Check if all required packages are installed."""
    required = [
        'torch',
        'whisper',
        'cv2',
        'numpy',
        'audiocraft'
    ]

    missing = []

    for package in required:
        try:
            if package == 'cv2':
                __import__('cv2')
            elif package == 'whisper':
                __import__('whisper')
            else:
                __import__(package)
            print(f"✓ {package}")
        except ImportError:
            print(f"❌ {package} not found")
            missing.append(package)

    return len(missing) == 0, missing


def install_dependencies():
    """Install dependencies from requirements.txt."""
    try:
        print("\nInstalling dependencies...")
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'
        ])
        print("✓ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        return False


def check_ffmpeg():
    """Check if FFmpeg is installed."""
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print(f"✓ FFmpeg: {version_line}")
            return True
    except FileNotFoundError:
        pass

    print("❌ FFmpeg not found in PATH")
    print("   Please install FFmpeg: https://ffmpeg.org/download.html")
    return False


def main():
    print("AI Content Creator - Python Environment Setup")
    print("=" * 50)

    all_ok = True

    # Check Python version
    print("\n1. Checking Python version...")
    if not check_python_version():
        all_ok = False

    # Check dependencies
    print("\n2. Checking Python dependencies...")
    deps_ok, missing = check_dependencies()

    if not deps_ok:
        print(f"\nMissing packages: {', '.join(missing)}")
        response = input("\nInstall missing dependencies? (y/n): ")
        if response.lower() == 'y':
            if not install_dependencies():
                all_ok = False
            else:
                # Re-check after installation
                deps_ok, _ = check_dependencies()
                if not deps_ok:
                    all_ok = False
        else:
            all_ok = False

    # Check FFmpeg
    print("\n3. Checking FFmpeg...")
    if not check_ffmpeg():
        all_ok = False

    # Summary
    print("\n" + "=" * 50)
    if all_ok:
        print("✓ Environment setup complete!")
        print("\nYou can now run the AI Content Creator application.")
    else:
        print("❌ Setup incomplete. Please fix the issues above.")
        sys.exit(1)


if __name__ == '__main__':
    main()
