#!/bin/bash
# Final Touches SFX Library Generator (ElevenLabs API)
# Generated on 2025-11-15T22:50:30.839939

set -e  # Exit on error

# Check for API key
if [ -z "$ELEVENLABS_API_KEY" ]; then
  echo 'Error: ELEVENLABS_API_KEY environment variable not set'
  echo 'Usage: ELEVENLABS_API_KEY=your_key_here ./generate_final_touches.sh'
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="./sfx_library"
PYTHON_SCRIPT="$SCRIPT_DIR/../python/elevenlabs_sfx_generator.py"

echo 'Starting Final Touches SFX generation...'
echo 'Total sounds: 13'
echo 'Estimated cost: 1,560 credits (13 sounds × 3s × 40 credits/s)'
echo 'Estimated time: 5-10 minutes'
echo ''

# Create category directories
mkdir -p "$OUTPUT_DIR/vehicles"
mkdir -p "$OUTPUT_DIR/horror"
mkdir -p "$OUTPUT_DIR/sports"
mkdir -p "$OUTPUT_DIR/food"

# Generate sounds

# Category: vehicles
echo 'Generating vehicles...'
echo '[1/13] car-honk'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "car horn honk sound effect, vehicle beep" --duration 3.0 --output "$OUTPUT_DIR/vehicles/car-honk.wav" || echo 'Failed: car-honk'

echo '[2/13] car-engine-start'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "car engine starting sound effect, ignition turn on" --duration 3.0 --output "$OUTPUT_DIR/vehicles/car-engine-start.wav" || echo 'Failed: car-engine-start'

echo '[3/13] motorcycle-rev'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "motorcycle engine revving sound, bike acceleration" --duration 3.0 --output "$OUTPUT_DIR/vehicles/motorcycle-rev.wav" || echo 'Failed: motorcycle-rev'

echo '[4/13] airplane-flyby'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "airplane flying by sound effect, jet passing overhead" --duration 3.0 --output "$OUTPUT_DIR/vehicles/airplane-flyby.wav" || echo 'Failed: airplane-flyby'


# Category: horror
echo 'Generating horror...'
echo '[5/13] creepy-ambience'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "creepy horror ambience sound, eerie atmosphere" --duration 3.0 --output "$OUTPUT_DIR/horror/creepy-ambience.wav" || echo 'Failed: creepy-ambience'

echo '[6/13] scream-horror'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "horror scream sound effect, terrified woman screaming" --duration 3.0 --output "$OUTPUT_DIR/horror/scream-horror.wav" || echo 'Failed: scream-horror'

echo '[7/13] music-box-creepy'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "creepy music box sound, haunted toy playing slowly" --duration 3.0 --output "$OUTPUT_DIR/horror/music-box-creepy.wav" || echo 'Failed: music-box-creepy'


# Category: sports
echo 'Generating sports...'
echo '[8/13] crowd-cheer'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "crowd cheering sound effect, stadium audience applause" --duration 3.0 --output "$OUTPUT_DIR/sports/crowd-cheer.wav" || echo 'Failed: crowd-cheer'

echo '[9/13] whistle-blow'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "referee whistle blow sound effect, sports whistle" --duration 3.0 --output "$OUTPUT_DIR/sports/whistle-blow.wav" || echo 'Failed: whistle-blow'

echo '[10/13] basketball-bounce'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "basketball bouncing sound effect, ball dribbling on court" --duration 3.0 --output "$OUTPUT_DIR/sports/basketball-bounce.wav" || echo 'Failed: basketball-bounce'


# Category: food
echo 'Generating food...'
echo '[11/13] sizzle-cooking'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "food sizzling sound effect, frying pan cooking" --duration 3.0 --output "$OUTPUT_DIR/food/sizzle-cooking.wav" || echo 'Failed: sizzle-cooking'

echo '[12/13] knife-chop'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "knife chopping vegetables sound, cutting on board" --duration 3.0 --output "$OUTPUT_DIR/food/knife-chop.wav" || echo 'Failed: knife-chop'

echo '[13/13] liquid-pour'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "liquid pouring sound effect, water into glass" --duration 3.0 --output "$OUTPUT_DIR/food/liquid-pour.wav" || echo 'Failed: liquid-pour'


echo ''
echo 'Final Touches generation complete!'
echo 'Generated sounds saved to: $OUTPUT_DIR'
echo ''
echo '🎉 LIBRARY COMPLETE! 🎉'
echo 'Total library size: 149 professional sound effects'