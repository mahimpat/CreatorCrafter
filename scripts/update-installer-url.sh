#!/bin/bash
# Script to update the Google Drive URL in the NSIS installer before building
# Usage: ./update-installer-url.sh "https://drive.google.com/uc?export=download&id=YOUR_FILE_ID"

set -e

GOOGLE_DRIVE_URL="$1"
INSTALLER_NSH="/home/mahim/CreatorCrafter/build/installer.nsh"

if [ -z "$GOOGLE_DRIVE_URL" ]; then
    echo "ERROR: Google Drive URL not provided"
    echo ""
    echo "Usage: $0 <google-drive-url>"
    echo ""
    echo "Example:"
    echo "  $0 'https://drive.google.com/uc?export=download&id=1a2b3c4d5e6f7g8h9i0j'"
    echo ""
    echo "To get the URL:"
    echo "  1. Upload scripts/dist/python-env-windows-x64-v1.0.0.zip to Google Drive"
    echo "  2. Share with 'Anyone with the link'"
    echo "  3. Extract FILE_ID from sharing link"
    echo "  4. Use format: https://drive.google.com/uc?export=download&id=FILE_ID"
    echo ""
    exit 1
fi

echo "Updating installer with Google Drive URL..."
echo "URL: $GOOGLE_DRIVE_URL"
echo ""

# Backup original
cp "$INSTALLER_NSH" "$INSTALLER_NSH.backup"

# Replace placeholder with actual URL
sed -i "s|GOOGLE_DRIVE_DOWNLOAD_URL_PLACEHOLDER|$GOOGLE_DRIVE_URL|g" "$INSTALLER_NSH"

echo "Updated: $INSTALLER_NSH"
echo "Backup: $INSTALLER_NSH.backup"
echo ""
echo "Ready to build! Run: npm run electron:build:win"
echo ""
