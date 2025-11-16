#!/bin/bash
# SFX Library Batch Generation Script (ElevenLabs API)
# Generated on 2025-11-15T22:10:59.952277

set -e  # Exit on error

# Check for API key
if [ -z "$ELEVENLABS_API_KEY" ]; then
  echo 'Error: ELEVENLABS_API_KEY environment variable not set'
  echo 'Usage: ELEVENLABS_API_KEY=your_key_here ./generate_library.sh'
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="./sfx_library"
PYTHON_SCRIPT="$SCRIPT_DIR/../python/elevenlabs_sfx_generator.py"

echo 'Starting SFX library generation with ElevenLabs API...'
echo 'Total sounds: 60'
echo 'Estimated cost: 7,200 credits (60 sounds × 3s × 40 credits/s)'
echo 'Estimated time: 20-40 minutes'
echo ''

# Create category directories
mkdir -p "$OUTPUT_DIR/transitions"
mkdir -p "$OUTPUT_DIR/foley"
mkdir -p "$OUTPUT_DIR/impacts"
mkdir -p "$OUTPUT_DIR/ui"
mkdir -p "$OUTPUT_DIR/ambient"
mkdir -p "$OUTPUT_DIR/movement"

# Generate sounds

# Category: transitions
echo 'Generating transitions...'
echo '[1/60] whoosh-fast'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "fast whoosh sound effect, swift air movement" --duration 3.0 --output "$OUTPUT_DIR/transitions/whoosh-fast.wav" || echo 'Failed: whoosh-fast'

echo '[2/60] whoosh-slow'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "slow whoosh sound effect, gentle air sweep" --duration 3.0 --output "$OUTPUT_DIR/transitions/whoosh-slow.wav" || echo 'Failed: whoosh-slow'

echo '[3/60] whoosh-deep'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "deep bass whoosh, low frequency air movement" --duration 3.0 --output "$OUTPUT_DIR/transitions/whoosh-deep.wav" || echo 'Failed: whoosh-deep'

echo '[4/60] whoosh-rise'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "rising whoosh sound effect, ascending pitch" --duration 3.0 --output "$OUTPUT_DIR/transitions/whoosh-rise.wav" || echo 'Failed: whoosh-rise'

echo '[5/60] whoosh-fall'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "falling whoosh sound effect, descending pitch" --duration 3.0 --output "$OUTPUT_DIR/transitions/whoosh-fall.wav" || echo 'Failed: whoosh-fall'

echo '[6/60] swoosh-left'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "swoosh sound panning left to right" --duration 3.0 --output "$OUTPUT_DIR/transitions/swoosh-left.wav" || echo 'Failed: swoosh-left'

echo '[7/60] swoosh-right'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "swoosh sound panning right to left" --duration 3.0 --output "$OUTPUT_DIR/transitions/swoosh-right.wav" || echo 'Failed: swoosh-right'

echo '[8/60] swoosh-quick'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "quick swoosh sound effect, rapid movement" --duration 3.0 --output "$OUTPUT_DIR/transitions/swoosh-quick.wav" || echo 'Failed: swoosh-quick'

echo '[9/60] riser-tension'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "tension building riser sound effect" --duration 3.0 --output "$OUTPUT_DIR/transitions/riser-tension.wav" || echo 'Failed: riser-tension'

echo '[10/60] riser-dramatic'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "dramatic riser sound effect, epic buildup" --duration 3.0 --output "$OUTPUT_DIR/transitions/riser-dramatic.wav" || echo 'Failed: riser-dramatic'

echo '[11/60] riser-subtle'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "subtle ambient riser, gentle buildup" --duration 3.0 --output "$OUTPUT_DIR/transitions/riser-subtle.wav" || echo 'Failed: riser-subtle'

echo '[12/60] transition-hit'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "transition hit sound effect, punchy impact" --duration 3.0 --output "$OUTPUT_DIR/transitions/transition-hit.wav" || echo 'Failed: transition-hit'

echo '[13/60] transition-boom'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "boom transition sound effect, deep impact" --duration 3.0 --output "$OUTPUT_DIR/transitions/transition-boom.wav" || echo 'Failed: transition-boom'


# Category: foley
echo 'Generating foley...'
echo '[14/60] footstep-concrete'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "single footstep on concrete floor" --duration 3.0 --output "$OUTPUT_DIR/foley/footstep-concrete.wav" || echo 'Failed: footstep-concrete'

echo '[15/60] footstep-wood'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "single footstep on wooden floor, creaky" --duration 3.0 --output "$OUTPUT_DIR/foley/footstep-wood.wav" || echo 'Failed: footstep-wood'

echo '[16/60] footstep-gravel'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "footstep on gravel, crunchy texture" --duration 3.0 --output "$OUTPUT_DIR/foley/footstep-gravel.wav" || echo 'Failed: footstep-gravel'

echo '[17/60] door-open'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "door opening sound effect, wooden door creaking" --duration 3.0 --output "$OUTPUT_DIR/foley/door-open.wav" || echo 'Failed: door-open'

echo '[18/60] door-close'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "door closing sound effect, solid close" --duration 3.0 --output "$OUTPUT_DIR/foley/door-close.wav" || echo 'Failed: door-close'

echo '[19/60] door-knock'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "knocking on wooden door, three knocks" --duration 3.0 --output "$OUTPUT_DIR/foley/door-knock.wav" || echo 'Failed: door-knock'

echo '[20/60] paper-rustle'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "paper rustling sound effect, pages turning" --duration 3.0 --output "$OUTPUT_DIR/foley/paper-rustle.wav" || echo 'Failed: paper-rustle'

echo '[21/60] cloth-movement'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "clothing fabric movement, cloth rustle" --duration 3.0 --output "$OUTPUT_DIR/foley/cloth-movement.wav" || echo 'Failed: cloth-movement'

echo '[22/60] keyboard-typing'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "keyboard typing sound, mechanical keys" --duration 3.0 --output "$OUTPUT_DIR/foley/keyboard-typing.wav" || echo 'Failed: keyboard-typing'

echo '[23/60] pen-writing'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "pen writing on paper sound" --duration 3.0 --output "$OUTPUT_DIR/foley/pen-writing.wav" || echo 'Failed: pen-writing'

echo '[24/60] glass-clink'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "wine glasses clinking together" --duration 3.0 --output "$OUTPUT_DIR/foley/glass-clink.wav" || echo 'Failed: glass-clink'

echo '[25/60] cup-place'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "coffee cup placed on table" --duration 3.0 --output "$OUTPUT_DIR/foley/cup-place.wav" || echo 'Failed: cup-place'

echo '[26/60] keys-jingle'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "keys jingling sound effect, metal clanking" --duration 3.0 --output "$OUTPUT_DIR/foley/keys-jingle.wav" || echo 'Failed: keys-jingle'

echo '[27/60] coins-drop'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "coins dropping on hard surface" --duration 3.0 --output "$OUTPUT_DIR/foley/coins-drop.wav" || echo 'Failed: coins-drop'


# Category: impacts
echo 'Generating impacts...'
echo '[28/60] punch-hard'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "hard punch impact sound effect, powerful hit" --duration 3.0 --output "$OUTPUT_DIR/impacts/punch-hard.wav" || echo 'Failed: punch-hard'

echo '[29/60] punch-soft'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "soft punch sound effect, light hit" --duration 3.0 --output "$OUTPUT_DIR/impacts/punch-soft.wav" || echo 'Failed: punch-soft'

echo '[30/60] slap-face'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "face slap sound effect, sharp impact" --duration 3.0 --output "$OUTPUT_DIR/impacts/slap-face.wav" || echo 'Failed: slap-face'

echo '[31/60] thud-heavy'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "heavy thud sound, large object falling" --duration 3.0 --output "$OUTPUT_DIR/impacts/thud-heavy.wav" || echo 'Failed: thud-heavy'

echo '[32/60] thud-body'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "body thud sound effect, person falling" --duration 3.0 --output "$OUTPUT_DIR/impacts/thud-body.wav" || echo 'Failed: thud-body'

echo '[33/60] crash-glass'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "glass breaking and shattering sound" --duration 3.0 --output "$OUTPUT_DIR/impacts/crash-glass.wav" || echo 'Failed: crash-glass'

echo '[34/60] crash-metal'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "metal crash sound effect, metallic collision" --duration 3.0 --output "$OUTPUT_DIR/impacts/crash-metal.wav" || echo 'Failed: crash-metal'

echo '[35/60] explosion-big'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "large explosion sound effect, powerful blast" --duration 3.0 --output "$OUTPUT_DIR/impacts/explosion-big.wav" || echo 'Failed: explosion-big'

echo '[36/60] explosion-small'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "small explosion sound, firecracker pop" --duration 3.0 --output "$OUTPUT_DIR/impacts/explosion-small.wav" || echo 'Failed: explosion-small'


# Category: ui
echo 'Generating ui...'
echo '[37/60] click-soft'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "soft button click sound, gentle tap" --duration 3.0 --output "$OUTPUT_DIR/ui/click-soft.wav" || echo 'Failed: click-soft'

echo '[38/60] click-hard'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "hard button click, mechanical switch" --duration 3.0 --output "$OUTPUT_DIR/ui/click-hard.wav" || echo 'Failed: click-hard'

echo '[39/60] click-tech'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "futuristic tech click sound, digital beep" --duration 3.0 --output "$OUTPUT_DIR/ui/click-tech.wav" || echo 'Failed: click-tech'

echo '[40/60] pop-bubble'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "bubble pop sound effect, light pop" --duration 3.0 --output "$OUTPUT_DIR/ui/pop-bubble.wav" || echo 'Failed: pop-bubble'

echo '[41/60] pop-cork'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cork pop sound, champagne opening" --duration 3.0 --output "$OUTPUT_DIR/ui/pop-cork.wav" || echo 'Failed: pop-cork'

echo '[42/60] notification-bell'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "notification bell sound, gentle chime" --duration 3.0 --output "$OUTPUT_DIR/ui/notification-bell.wav" || echo 'Failed: notification-bell'

echo '[43/60] notification-ping'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "notification ping sound, digital alert" --duration 3.0 --output "$OUTPUT_DIR/ui/notification-ping.wav" || echo 'Failed: notification-ping'

echo '[44/60] notification-success'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "success notification sound, positive chime" --duration 3.0 --output "$OUTPUT_DIR/ui/notification-success.wav" || echo 'Failed: notification-success'

echo '[45/60] notification-error'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "error notification sound, negative beep" --duration 3.0 --output "$OUTPUT_DIR/ui/notification-error.wav" || echo 'Failed: notification-error'

echo '[46/60] beep-short'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "short beep sound, single tone" --duration 3.0 --output "$OUTPUT_DIR/ui/beep-short.wav" || echo 'Failed: beep-short'

echo '[47/60] beep-countdown'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "countdown beep sound, timer tick" --duration 3.0 --output "$OUTPUT_DIR/ui/beep-countdown.wav" || echo 'Failed: beep-countdown'


# Category: ambient
echo 'Generating ambient...'
echo '[48/60] room-quiet'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "quiet room tone, subtle ambient noise" --duration 3.0 --output "$OUTPUT_DIR/ambient/room-quiet.wav" || echo 'Failed: room-quiet'

echo '[49/60] room-office'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "office ambient sound, keyboard typing and murmurs" --duration 3.0 --output "$OUTPUT_DIR/ambient/room-office.wav" || echo 'Failed: room-office'

echo '[50/60] wind-gentle'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "gentle wind sound, soft breeze" --duration 3.0 --output "$OUTPUT_DIR/ambient/wind-gentle.wav" || echo 'Failed: wind-gentle'

echo '[51/60] rain-light'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "light rain sound, gentle rainfall" --duration 3.0 --output "$OUTPUT_DIR/ambient/rain-light.wav" || echo 'Failed: rain-light'

echo '[52/60] birds-morning'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "morning birds chirping, peaceful nature" --duration 3.0 --output "$OUTPUT_DIR/ambient/birds-morning.wav" || echo 'Failed: birds-morning'

echo '[53/60] city-traffic'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "distant city traffic ambient sound" --duration 3.0 --output "$OUTPUT_DIR/ambient/city-traffic.wav" || echo 'Failed: city-traffic'

echo '[54/60] cafe-ambience'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "coffee shop ambient sound, people chatting" --duration 3.0 --output "$OUTPUT_DIR/ambient/cafe-ambience.wav" || echo 'Failed: cafe-ambience'


# Category: movement
echo 'Generating movement...'
echo '[55/60] swipe-left'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "swipe sound effect, quick motion left" --duration 3.0 --output "$OUTPUT_DIR/movement/swipe-left.wav" || echo 'Failed: swipe-left'

echo '[56/60] swipe-up'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "swipe up sound effect, upward motion" --duration 3.0 --output "$OUTPUT_DIR/movement/swipe-up.wav" || echo 'Failed: swipe-up'

echo '[57/60] slide-drawer'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "drawer sliding open sound, smooth motion" --duration 3.0 --output "$OUTPUT_DIR/movement/slide-drawer.wav" || echo 'Failed: slide-drawer'

echo '[58/60] slide-zipper'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "zipper sliding sound effect" --duration 3.0 --output "$OUTPUT_DIR/movement/slide-zipper.wav" || echo 'Failed: slide-zipper'

echo '[59/60] gear-turn'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "mechanical gear turning sound, clockwork" --duration 3.0 --output "$OUTPUT_DIR/movement/gear-turn.wav" || echo 'Failed: gear-turn'

echo '[60/60] motor-start'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "electric motor starting sound effect" --duration 3.0 --output "$OUTPUT_DIR/movement/motor-start.wav" || echo 'Failed: motor-start'


echo ''
echo 'SFX library generation complete!'
echo 'Generated 60 sound effects'
echo "Location: $OUTPUT_DIR"