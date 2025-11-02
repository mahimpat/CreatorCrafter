#!/bin/bash
# Download FFmpeg for Windows bundling
# This script downloads a portable FFmpeg build for Windows

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FFMPEG_DIR="$PROJECT_ROOT/build/ffmpeg"

echo "=========================================="
echo "Downloading FFmpeg for Windows"
echo "=========================================="
echo ""

# Create directory
mkdir -p "$FFMPEG_DIR"

# FFmpeg download URL (gyan.dev builds - trusted Windows builds)
FFMPEG_VERSION="6.1"
FFMPEG_URL="https://github.com/GyanD/codexffmpeg/releases/download/${FFMPEG_VERSION}/ffmpeg-${FFMPEG_VERSION}-essentials_build.zip"
FFMPEG_ZIP="$FFMPEG_DIR/ffmpeg.zip"

echo "Downloading FFmpeg ${FFMPEG_VERSION} (Essentials Build)..."
echo "URL: $FFMPEG_URL"
echo ""

# Download FFmpeg
if [ -f "$FFMPEG_ZIP" ]; then
    echo "FFmpeg zip already exists, skipping download..."
else
    curl -L -o "$FFMPEG_ZIP" "$FFMPEG_URL"
    echo ""
    echo "✓ Download complete!"
fi

# Extract FFmpeg
echo ""
echo "Extracting FFmpeg..."

# Remove old extraction
rm -rf "$FFMPEG_DIR/bin"

# Extract (unzip)
cd "$FFMPEG_DIR"
if command -v unzip &> /dev/null; then
    unzip -q ffmpeg.zip
    # Find the extracted directory (name includes version)
    EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "ffmpeg-*" | head -1)
    if [ -n "$EXTRACTED_DIR" ]; then
        mv "$EXTRACTED_DIR/bin" .
        rm -rf "$EXTRACTED_DIR"
    fi
else
    echo "ERROR: unzip not found. Install with: sudo apt-get install unzip"
    exit 1
fi

echo "✓ Extraction complete!"

# Verify
echo ""
echo "Verifying FFmpeg binaries..."
if [ -f "$FFMPEG_DIR/bin/ffmpeg.exe" ] && [ -f "$FFMPEG_DIR/bin/ffprobe.exe" ]; then
    echo "✓ ffmpeg.exe found ($(du -h "$FFMPEG_DIR/bin/ffmpeg.exe" | cut -f1))"
    echo "✓ ffprobe.exe found ($(du -h "$FFMPEG_DIR/bin/ffprobe.exe" | cut -f1))"
    echo ""
    echo "=========================================="
    echo "FFmpeg ready for bundling!"
    echo "=========================================="
    echo ""
    echo "Location: $FFMPEG_DIR/bin/"
    echo ""
    echo "These files will be included in the Windows installer."
else
    echo "✗ ERROR: FFmpeg binaries not found!"
    exit 1
fi

# Clean up zip
rm -f "$FFMPEG_ZIP"
echo "Cleaned up temporary files"
