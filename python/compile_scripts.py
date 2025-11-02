#!/usr/bin/env python3
"""
Compile Python scripts to bytecode (.pyc) for distribution.
This makes the scripts harder to read and modify by end users.
"""

import py_compile
import os
import shutil
from pathlib import Path

def compile_script(source_file, output_dir):
    """Compile a Python script to bytecode"""
    print(f"Compiling {source_file}...")

    # Compile to .pyc
    compiled = py_compile.compile(
        source_file,
        cfile=None,  # Let Python decide the output path
        dfile=source_file,  # Use source filename in tracebacks
        doraise=True
    )

    # Move .pyc to output directory with original name
    source_name = os.path.basename(source_file)
    output_file = os.path.join(output_dir, source_name + 'c')  # .pyc extension

    shutil.copy(compiled, output_file)
    print(f"  → {output_file}")

    return output_file

def main():
    """Compile all Python scripts for distribution"""
    script_dir = Path(__file__).parent
    dist_dir = script_dir / 'dist'

    # Create dist directory
    dist_dir.mkdir(exist_ok=True)

    # Scripts to compile
    scripts = [
        'video_analyzer.py',
        'audiocraft_generator.py',
        'download_models.py',
        'setup_environment.py'
    ]

    print("=" * 60)
    print("Compiling Python scripts to bytecode")
    print("=" * 60)
    print()

    compiled_files = []
    for script in scripts:
        source = script_dir / script
        if source.exists():
            try:
                compiled = compile_script(str(source), str(dist_dir))
                compiled_files.append(compiled)
            except Exception as e:
                print(f"ERROR compiling {script}: {e}")
        else:
            print(f"WARNING: {script} not found, skipping")

    print()
    print("=" * 60)
    print(f"Compilation complete! {len(compiled_files)} files compiled")
    print("=" * 60)
    print()
    print(f"Compiled files in: {dist_dir}")
    print()
    print("NOTE: .pyc files are bytecode, not source code.")
    print("They are harder to read but not impossible to reverse engineer.")
    print("For maximum security, consider using PyInstaller or Nuitka.")
    print()

    return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())
