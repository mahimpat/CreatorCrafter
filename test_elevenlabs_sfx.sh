#!/bin/bash
# Test ElevenLabs SFX Generation

# Check for API key
if [ -z "$ELEVENLABS_API_KEY" ]; then
  echo "Error: ELEVENLABS_API_KEY environment variable not set"
  echo "Usage: ELEVENLABS_API_KEY=your_key_here ./test_elevenlabs_sfx.sh"
  exit 1
fi

echo "Testing ElevenLabs SFX generation..."
echo ""

# Create test directory
mkdir -p ./sfx_library/test

# Generate a test whoosh sound
python python/elevenlabs_sfx_generator.py \
  --api-key "$ELEVENLABS_API_KEY" \
  --prompt "fast whoosh sound effect, swift air movement" \
  --duration 3.0 \
  --output "./sfx_library/test/whoosh-test.wav"

if [ $? -eq 0 ]; then
  echo ""
  echo "✓ Test successful! Generated: ./sfx_library/test/whoosh-test.wav"
  echo "File size: $(du -h ./sfx_library/test/whoosh-test.wav | cut -f1)"
  echo ""
  echo "You can now run the full library generation with:"
  echo "  ELEVENLABS_API_KEY=your_key_here ./sfx_library/generate_library.sh"
else
  echo ""
  echo "✗ Test failed. Please check your API key and try again."
  exit 1
fi
