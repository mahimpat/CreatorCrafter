#!/usr/bin/env python3
"""
Build standalone Python executables using PyInstaller.
This provides the strongest protection - scripts are compiled into binary executables.

Prerequisites:
    pip install pyinstaller

This creates standalone .exe (Windows) or binary (macOS/Linux) files that:
- Don't require Python to be installed
- Can't be easily read or modified
- Include all dependencies
"""

import subprocess
import sys
import os
from pathlib import Path

def check_pyinstaller():
    """Check if PyInstaller is installed"""
    try:
        import PyInstaller
        return True
    except ImportError:
        return False

def build_executable(script_name, one_file=True, console=False):
    """Build a standalone executable from a Python script"""
    print(f"\nBuilding executable for {script_name}...")

    args = [
        'pyinstaller',
        '--clean',
        '--noconfirm',
    ]

    if one_file:
        args.append('--onefile')  # Single executable file

    if not console:
        args.append('--noconsole')  # No console window

    # Optimize
    args.extend([
        '--strip',  # Strip debug symbols (Linux/macOS)
        '--optimize', '2',  # Python optimization level
    ])

    # Add the script
    args.append(script_name)

    try:
        subprocess.run(args, check=True)
        print(f"✓ Successfully built {script_name}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to build {script_name}: {e}")
        return False

def main():
    """Build all Python scripts as executables"""
    script_dir = Path(__file__).parent

    print("=" * 70)
    print("Building Standalone Python Executables with PyInstaller")
    print("=" * 70)
    print()

    # Check PyInstaller
    if not check_pyinstaller():
        print("ERROR: PyInstaller is not installed")
        print()
        print("Install with: pip install pyinstaller")
        print()
        return 1

    # Change to script directory
    os.chdir(script_dir)

    # Scripts to build
    scripts = {
        'video_analyzer.py': {'console': True},  # Needs console for progress
        'audiocraft_generator.py': {'console': True},  # Needs console for progress
        'download_models.py': {'console': True},  # Shows download progress
        'setup_environment.py': {'console': True},  # Interactive
    }

    success_count = 0
    for script, options in scripts.items():
        if Path(script).exists():
            if build_executable(script, one_file=True, console=options.get('console', False)):
                success_count += 1
        else:
            print(f"WARNING: {script} not found, skipping")

    print()
    print("=" * 70)
    print(f"Build complete! {success_count}/{len(scripts)} executables built")
    print("=" * 70)
    print()
    print("Executables are in: dist/")
    print()
    print("Benefits:")
    print("  ✓ No Python installation required")
    print("  ✓ Cannot be easily read or modified")
    print("  ✓ All dependencies included")
    print("  ✓ Faster startup (no import time)")
    print()
    print("Trade-offs:")
    print("  ✗ Larger file sizes (~50-100 MB each)")
    print("  ✗ Longer build time")
    print("  ✗ Platform-specific (must build on target OS)")
    print()

    return 0 if success_count == len(scripts) else 1

if __name__ == '__main__':
    sys.exit(main())
