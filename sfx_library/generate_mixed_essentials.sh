#!/bin/bash
# Mixed Essentials SFX Library Generator (ElevenLabs API)
# Generated on 2025-11-15T22:45:51.535727

set -e  # Exit on error

# Check for API key
if [ -z "$ELEVENLABS_API_KEY" ]; then
  echo 'Error: ELEVENLABS_API_KEY environment variable not set'
  echo 'Usage: ELEVENLABS_API_KEY=your_key_here ./generate_mixed_essentials.sh'
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="./sfx_library"
PYTHON_SCRIPT="$SCRIPT_DIR/../python/elevenlabs_sfx_generator.py"

echo 'Starting Mixed Essentials SFX generation...'
echo 'Total sounds: 26'
echo 'Estimated cost: 3,120 credits (26 sounds × 3s × 40 credits/s)'
echo 'Estimated time: 10-15 minutes'
echo ''

# Create category directories
mkdir -p "$OUTPUT_DIR/cartoon"
mkdir -p "$OUTPUT_DIR/cinematic"
mkdir -p "$OUTPUT_DIR/music"
mkdir -p "$OUTPUT_DIR/nature_sounds"
mkdir -p "$OUTPUT_DIR/technology"

# Generate sounds

# Category: cartoon
echo 'Generating cartoon...'
echo '[1/26] slide-whistle'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cartoon slide whistle sound effect, descending pitch" --duration 3.0 --output "$OUTPUT_DIR/cartoon/slide-whistle.wav" || echo 'Failed: slide-whistle'

echo '[2/26] spring-boing'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cartoon spring boing sound effect, bouncy jump" --duration 3.0 --output "$OUTPUT_DIR/cartoon/spring-boing.wav" || echo 'Failed: spring-boing'

echo '[3/26] slip-fall'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cartoon slip and fall sound effect, comedic accident" --duration 3.0 --output "$OUTPUT_DIR/cartoon/slip-fall.wav" || echo 'Failed: slip-fall'

echo '[4/26] bonk-hit'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cartoon bonk hit sound effect, comedic impact on head" --duration 3.0 --output "$OUTPUT_DIR/cartoon/bonk-hit.wav" || echo 'Failed: bonk-hit'

echo '[5/26] splat-impact'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cartoon splat sound effect, wet impact" --duration 3.0 --output "$OUTPUT_DIR/cartoon/splat-impact.wav" || echo 'Failed: splat-impact'

echo '[6/26] pop-burst'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cartoon pop sound effect, bubble burst" --duration 3.0 --output "$OUTPUT_DIR/cartoon/pop-burst.wav" || echo 'Failed: pop-burst'


# Category: cinematic
echo 'Generating cinematic...'
echo '[7/26] thunder-boom'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "massive thunder boom sound effect, dramatic storm" --duration 3.0 --output "$OUTPUT_DIR/cinematic/thunder-boom.wav" || echo 'Failed: thunder-boom'

echo '[8/26] lightning-strike'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "lightning strike crack sound effect, electric bolt" --duration 3.0 --output "$OUTPUT_DIR/cinematic/lightning-strike.wav" || echo 'Failed: lightning-strike'

echo '[9/26] earthquake-rumble'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "earthquake rumble sound effect, ground shaking" --duration 3.0 --output "$OUTPUT_DIR/cinematic/earthquake-rumble.wav" || echo 'Failed: earthquake-rumble'

echo '[10/26] meteor-impact'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "meteor impact explosion sound, massive crash" --duration 3.0 --output "$OUTPUT_DIR/cinematic/meteor-impact.wav" || echo 'Failed: meteor-impact'

echo '[11/26] avalanche-crash'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "avalanche crashing sound effect, snow tumbling down mountain" --duration 3.0 --output "$OUTPUT_DIR/cinematic/avalanche-crash.wav" || echo 'Failed: avalanche-crash'


# Category: music
echo 'Generating music...'
echo '[12/26] kick-drum-hit'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "deep kick drum hit sound, 808 bass drum" --duration 3.0 --output "$OUTPUT_DIR/music/kick-drum-hit.wav" || echo 'Failed: kick-drum-hit'

echo '[13/26] snare-hit'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "snare drum hit sound effect, crisp snare" --duration 3.0 --output "$OUTPUT_DIR/music/snare-hit.wav" || echo 'Failed: snare-hit'

echo '[14/26] bass-drop-heavy'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "heavy bass drop sound effect, dubstep sub bass" --duration 3.0 --output "$OUTPUT_DIR/music/bass-drop-heavy.wav" || echo 'Failed: bass-drop-heavy'

echo '[15/26] synth-stab'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "synth stab sound effect, electronic hit" --duration 3.0 --output "$OUTPUT_DIR/music/synth-stab.wav" || echo 'Failed: synth-stab'

echo '[16/26] riser-buildup'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "tension riser sound effect, musical buildup" --duration 3.0 --output "$OUTPUT_DIR/music/riser-buildup.wav" || echo 'Failed: riser-buildup'


# Category: nature_sounds
echo 'Generating nature_sounds...'
echo '[17/26] dog-bark'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "dog barking sound effect, medium sized dog" --duration 3.0 --output "$OUTPUT_DIR/nature_sounds/dog-bark.wav" || echo 'Failed: dog-bark'

echo '[18/26] cat-meow'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cat meowing sound effect, house cat" --duration 3.0 --output "$OUTPUT_DIR/nature_sounds/cat-meow.wav" || echo 'Failed: cat-meow'

echo '[19/26] water-splash'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "water splash sound effect, large splash in pool" --duration 3.0 --output "$OUTPUT_DIR/nature_sounds/water-splash.wav" || echo 'Failed: water-splash'

echo '[20/26] fire-crackle'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "fire crackling sound effect, campfire burning" --duration 3.0 --output "$OUTPUT_DIR/nature_sounds/fire-crackle.wav" || echo 'Failed: fire-crackle'

echo '[21/26] thunder-rumble'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "distant thunder rumble sound, storm approaching" --duration 3.0 --output "$OUTPUT_DIR/nature_sounds/thunder-rumble.wav" || echo 'Failed: thunder-rumble'


# Category: technology
echo 'Generating technology...'
echo '[22/26] phone-buzz'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "phone vibration buzz sound effect, mobile phone vibrate" --duration 3.0 --output "$OUTPUT_DIR/technology/phone-buzz.wav" || echo 'Failed: phone-buzz'

echo '[23/26] glitch-digital'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "digital glitch sound effect, technology malfunction" --duration 3.0 --output "$OUTPUT_DIR/technology/glitch-digital.wav" || echo 'Failed: glitch-digital'

echo '[24/26] swipe-screen'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "touchscreen swipe sound effect, finger swipe on phone" --duration 3.0 --output "$OUTPUT_DIR/technology/swipe-screen.wav" || echo 'Failed: swipe-screen'

echo '[25/26] notification-ping'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "notification ping sound effect, app alert tone" --duration 3.0 --output "$OUTPUT_DIR/technology/notification-ping.wav" || echo 'Failed: notification-ping'

echo '[26/26] robot-beep'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "robot beep sound effect, mechanical electronic beep" --duration 3.0 --output "$OUTPUT_DIR/technology/robot-beep.wav" || echo 'Failed: robot-beep'


echo ''
echo 'Mixed Essentials generation complete!'
echo 'Generated sounds saved to: $OUTPUT_DIR'