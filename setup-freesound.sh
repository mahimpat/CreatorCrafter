#!/bin/bash

echo "========================================="
echo "  FreeSound API Setup for CreatorCrafter"
echo "========================================="
echo ""
echo "This script will help you set up FreeSound API credentials."
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  Warning: .env file already exists!"
    echo ""
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

echo ""
echo "📝 First, get your API credentials from FreeSound:"
echo "   https://freesound.org/apiv2/apply"
echo ""
echo "You'll need:"
echo "  - Client ID (long string of letters/numbers)"
echo "  - Client Secret (another long string - keep it secret!)"
echo ""

read -p "Press Enter when you have your credentials ready..."

echo ""
read -p "Enter your FreeSound Client ID: " CLIENT_ID
read -p "Enter your FreeSound Client Secret: " CLIENT_SECRET

# Create or update .env file
cat > .env << EOF
# FreeSound API Configuration
# Get your credentials at: https://freesound.org/apiv2/apply

# Your FreeSound API Client ID
FREESOUND_CLIENT_ID=$CLIENT_ID

# Your FreeSound API Client Secret
FREESOUND_CLIENT_SECRET=$CLIENT_SECRET

# OAuth2 Redirect URI (default for local development)
FREESOUND_REDIRECT_URI=http://localhost:3000/freesound/callback
EOF

echo ""
echo "✅ Configuration saved to .env file!"
echo ""
echo "Next steps:"
echo "  1. Restart the application: npm run electron:dev"
echo "  2. Open the Sound FX tab"
echo "  3. Click 'FreeSound Library' tab"
echo "  4. Click 'Connect to FreeSound'"
echo ""
echo "For detailed setup instructions, see FREESOUND_SETUP_GUIDE.md"
echo ""
