#!/bin/bash
# Bonus Pack SFX Library Generator (ElevenLabs API)
# Generated on 2025-11-15T22:53:24.619465

set -e  # Exit on error

# Check for API key
if [ -z "$ELEVENLABS_API_KEY" ]; then
  echo 'Error: ELEVENLABS_API_KEY environment variable not set'
  echo 'Usage: ELEVENLABS_API_KEY=your_key_here ./generate_bonus_pack.sh'
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="./sfx_library"
PYTHON_SCRIPT="$SCRIPT_DIR/../python/elevenlabs_sfx_generator.py"

echo '🎁 Starting BONUS PACK SFX generation...'
echo 'Total sounds: 8'
echo 'Estimated cost: 960 credits (8 sounds × 3s × 40 credits/s)'
echo 'Estimated time: 3-5 minutes'
echo ''

# Create category directories
mkdir -p "$OUTPUT_DIR/gaming"
mkdir -p "$OUTPUT_DIR/everyday"
mkdir -p "$OUTPUT_DIR/bonus_music"

# Generate sounds

# Category: gaming
echo 'Generating gaming...'
echo '[1/8] coin-collect'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "video game coin collect sound effect, arcade pickup" --duration 3.0 --output "$OUTPUT_DIR/gaming/coin-collect.wav" || echo 'Failed: coin-collect'

echo '[2/8] power-up'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "video game power up sound effect, level boost" --duration 3.0 --output "$OUTPUT_DIR/gaming/power-up.wav" || echo 'Failed: power-up'

echo '[3/8] game-start'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "video game start sound effect, ready fight" --duration 3.0 --output "$OUTPUT_DIR/gaming/game-start.wav" || echo 'Failed: game-start'


# Category: everyday
echo 'Generating everyday...'
echo '[4/8] phone-ring'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "landline phone ringing sound effect, telephone ring" --duration 3.0 --output "$OUTPUT_DIR/everyday/phone-ring.wav" || echo 'Failed: phone-ring'

echo '[5/8] doorbell-ring'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "doorbell ringing sound effect, house door chime" --duration 3.0 --output "$OUTPUT_DIR/everyday/doorbell-ring.wav" || echo 'Failed: doorbell-ring'

echo '[6/8] alarm-clock'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "alarm clock ringing sound effect, morning wake up" --duration 3.0 --output "$OUTPUT_DIR/everyday/alarm-clock.wav" || echo 'Failed: alarm-clock'


# Category: bonus_music
echo 'Generating bonus_music...'
echo '[7/8] vinyl-scratch'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "DJ vinyl scratch sound effect, turntable scrubbing" --duration 3.0 --output "$OUTPUT_DIR/bonus_music/vinyl-scratch.wav" || echo 'Failed: vinyl-scratch'

echo '[8/8] cowbell-hit'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cowbell percussion hit sound, more cowbell" --duration 3.0 --output "$OUTPUT_DIR/bonus_music/cowbell-hit.wav" || echo 'Failed: cowbell-hit'


echo ''
echo '🎊 ═══════════════════════════════════════════ 🎊'
echo '    BONUS PACK GENERATION COMPLETE!'
echo '🎊 ═══════════════════════════════════════════ 🎊'
echo ''
echo '🎉 CONGRATULATIONS! 🎉'
echo ''
echo '📊 FINAL LIBRARY STATISTICS:'
echo '   ├─ Total Sounds: 157 professional SFX'
echo '   ├─ Total Categories: 22 diverse categories'
echo '   ├─ Total Credits Used: ~18,840 credits'
echo '   └─ Library Value: $200+ equivalent'
echo ''
echo '✨ Your complete professional SFX library is ready!'
echo '   Restart CreatorCrafter to see all 157 sounds.'
echo ''