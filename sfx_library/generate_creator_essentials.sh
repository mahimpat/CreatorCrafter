#!/bin/bash
# Content Creator Essentials SFX Library Generator (ElevenLabs API)
# Generated on 2025-11-15T22:25:13.757893

set -e  # Exit on error

# Check for API key
if [ -z "$ELEVENLABS_API_KEY" ]; then
  echo 'Error: ELEVENLABS_API_KEY environment variable not set'
  echo 'Usage: ELEVENLABS_API_KEY=your_key_here ./generate_creator_essentials.sh'
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="./sfx_library"
PYTHON_SCRIPT="$SCRIPT_DIR/../python/elevenlabs_sfx_generator.py"

echo 'Starting Content Creator Essentials SFX generation...'
echo 'Total sounds: 50'
echo 'Estimated cost: 6,000 credits (50 sounds × 3s × 40 credits/s)'
echo 'Estimated time: 15-25 minutes'
echo ''

# Create category directories
mkdir -p "$OUTPUT_DIR/attention"
mkdir -p "$OUTPUT_DIR/creator_transitions"
mkdir -p "$OUTPUT_DIR/emotional"
mkdir -p "$OUTPUT_DIR/engagement"

# Generate sounds

# Category: attention
echo 'Generating attention...'
echo '[1/50] record-scratch'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "vinyl record scratch sound effect, dramatic stop" --duration 3.0 --output "$OUTPUT_DIR/attention/record-scratch.wav" || echo 'Failed: record-scratch'

echo '[2/50] rewind'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "tape rewind sound effect, fast backwards" --duration 3.0 --output "$OUTPUT_DIR/attention/rewind.wav" || echo 'Failed: rewind'

echo '[3/50] fast-forward'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "fast forward sound effect, VCR tape speeding up" --duration 3.0 --output "$OUTPUT_DIR/attention/fast-forward.wav" || echo 'Failed: fast-forward'

echo '[4/50] air-horn'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "air horn blast sound effect, loud party horn" --duration 3.0 --output "$OUTPUT_DIR/attention/air-horn.wav" || echo 'Failed: air-horn'

echo '[5/50] dramatic-hit'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "dramatic orchestral hit sound, epic impact" --duration 3.0 --output "$OUTPUT_DIR/attention/dramatic-hit.wav" || echo 'Failed: dramatic-hit'

echo '[6/50] bass-drop'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "massive bass drop sound effect, dubstep style" --duration 3.0 --output "$OUTPUT_DIR/attention/bass-drop.wav" || echo 'Failed: bass-drop'

echo '[7/50] shock-sfx'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "shock sound effect, dramatic surprise sting" --duration 3.0 --output "$OUTPUT_DIR/attention/shock-sfx.wav" || echo 'Failed: shock-sfx'

echo '[8/50] suspense-hit'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "suspense thriller hit sound, tense impact" --duration 3.0 --output "$OUTPUT_DIR/attention/suspense-hit.wav" || echo 'Failed: suspense-hit'

echo '[9/50] jump-scare'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "jump scare sound effect, sudden loud scary noise" --duration 3.0 --output "$OUTPUT_DIR/attention/jump-scare.wav" || echo 'Failed: jump-scare'

echo '[10/50] cartoon-boing'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cartoon boing sound effect, bouncy spring" --duration 3.0 --output "$OUTPUT_DIR/attention/cartoon-boing.wav" || echo 'Failed: cartoon-boing'

echo '[11/50] wrong-answer'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "wrong answer buzzer sound, game show fail" --duration 3.0 --output "$OUTPUT_DIR/attention/wrong-answer.wav" || echo 'Failed: wrong-answer'

echo '[12/50] clown-horn'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "clown horn honk sound effect, funny bike horn" --duration 3.0 --output "$OUTPUT_DIR/attention/clown-horn.wav" || echo 'Failed: clown-horn'

echo '[13/50] glitch-impact'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "digital glitch impact sound effect, technology malfunction" --duration 3.0 --output "$OUTPUT_DIR/attention/glitch-impact.wav" || echo 'Failed: glitch-impact'

echo '[14/50] laser-zap'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "laser zap sound effect, sci-fi energy blast" --duration 3.0 --output "$OUTPUT_DIR/attention/laser-zap.wav" || echo 'Failed: laser-zap'

echo '[15/50] explosion-boom'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cinematic explosion boom, big movie blast" --duration 3.0 --output "$OUTPUT_DIR/attention/explosion-boom.wav" || echo 'Failed: explosion-boom'


# Category: creator_transitions
echo 'Generating creator_transitions...'
echo '[16/50] jump-cut'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "quick jump cut whoosh sound, fast transition" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/jump-cut.wav" || echo 'Failed: jump-cut'

echo '[17/50] glitch-transition'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "digital glitch transition sound effect, data corruption" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/glitch-transition.wav" || echo 'Failed: glitch-transition'

echo '[18/50] tape-stop'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "tape stop sound effect, slowing down to halt" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/tape-stop.wav" || echo 'Failed: tape-stop'

echo '[19/50] quick-swipe'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "quick swipe whoosh sound, fast swish" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/quick-swipe.wav" || echo 'Failed: quick-swipe'

echo '[20/50] zoom-in'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "zoom in whoosh sound effect, approaching fast" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/zoom-in.wav" || echo 'Failed: zoom-in'

echo '[21/50] zoom-out'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "zoom out whoosh sound effect, receding away" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/zoom-out.wav" || echo 'Failed: zoom-out'

echo '[22/50] hologram-appear'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "hologram appearing sound effect, sci-fi materialize" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/hologram-appear.wav" || echo 'Failed: hologram-appear'

echo '[23/50] hologram-disappear'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "hologram disappearing sound effect, dematerialize" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/hologram-disappear.wav" || echo 'Failed: hologram-disappear'

echo '[24/50] digital-wipe'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "digital screen wipe sound effect, transition swipe" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/digital-wipe.wav" || echo 'Failed: digital-wipe'

echo '[25/50] cinematic-riser'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cinematic riser sound effect, building tension" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/cinematic-riser.wav" || echo 'Failed: cinematic-riser'

echo '[26/50] reverse-cymbal'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "reverse cymbal crash sound effect, backwards buildup" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/reverse-cymbal.wav" || echo 'Failed: reverse-cymbal'

echo '[27/50] trailer-boom'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "movie trailer boom sound, deep bass hit" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/trailer-boom.wav" || echo 'Failed: trailer-boom'

echo '[28/50] snap-cut'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "snap finger sound effect, quick transition snap" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/snap-cut.wav" || echo 'Failed: snap-cut'

echo '[29/50] time-freeze'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "time freeze sound effect, motion stop with reverb" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/time-freeze.wav" || echo 'Failed: time-freeze'

echo '[30/50] speed-ramp'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "speed ramp sound effect, slow motion transition" --duration 3.0 --output "$OUTPUT_DIR/creator_transitions/speed-ramp.wav" || echo 'Failed: speed-ramp'


# Category: emotional
echo 'Generating emotional...'
echo '[31/50] victory-fanfare'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "short victory fanfare sound, success celebration" --duration 3.0 --output "$OUTPUT_DIR/emotional/victory-fanfare.wav" || echo 'Failed: victory-fanfare'

echo '[32/50] achievement-unlock'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "achievement unlock sound effect, game reward" --duration 3.0 --output "$OUTPUT_DIR/emotional/achievement-unlock.wav" || echo 'Failed: achievement-unlock'

echo '[33/50] level-up'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "level up sound effect, power up success" --duration 3.0 --output "$OUTPUT_DIR/emotional/level-up.wav" || echo 'Failed: level-up'

echo '[34/50] sad-trombone'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "sad trombone fail sound effect, comedic failure" --duration 3.0 --output "$OUTPUT_DIR/emotional/sad-trombone.wav" || echo 'Failed: sad-trombone'

echo '[35/50] game-over'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "game over sound effect, defeat loss" --duration 3.0 --output "$OUTPUT_DIR/emotional/game-over.wav" || echo 'Failed: game-over'

echo '[36/50] error-sound'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "error sound effect, system failure beep" --duration 3.0 --output "$OUTPUT_DIR/emotional/error-sound.wav" || echo 'Failed: error-sound'

echo '[37/50] suspense-drone'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "suspense drone sound, tense atmosphere" --duration 3.0 --output "$OUTPUT_DIR/emotional/suspense-drone.wav" || echo 'Failed: suspense-drone'

echo '[38/50] heartbeat-pulse'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "heartbeat pulse sound effect, nervous tension" --duration 3.0 --output "$OUTPUT_DIR/emotional/heartbeat-pulse.wav" || echo 'Failed: heartbeat-pulse'

echo '[39/50] epic-orchestral'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "epic orchestral swell sound, heroic moment" --duration 3.0 --output "$OUTPUT_DIR/emotional/epic-orchestral.wav" || echo 'Failed: epic-orchestral'

echo '[40/50] triumphant-horns'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "triumphant horn fanfare, victory theme" --duration 3.0 --output "$OUTPUT_DIR/emotional/triumphant-horns.wav" || echo 'Failed: triumphant-horns'


# Category: engagement
echo 'Generating engagement...'
echo '[41/50] bell-notification'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "notification bell ding sound, alert chime" --duration 3.0 --output "$OUTPUT_DIR/engagement/bell-notification.wav" || echo 'Failed: bell-notification'

echo '[42/50] subscribe-click'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "button click sound effect, satisfying tap" --duration 3.0 --output "$OUTPUT_DIR/engagement/subscribe-click.wav" || echo 'Failed: subscribe-click'

echo '[43/50] like-sound'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "positive like sound effect, approval chime" --duration 3.0 --output "$OUTPUT_DIR/engagement/like-sound.wav" || echo 'Failed: like-sound'

echo '[44/50] countdown-beep'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "countdown timer beep sound, short tick" --duration 3.0 --output "$OUTPUT_DIR/engagement/countdown-beep.wav" || echo 'Failed: countdown-beep'

echo '[45/50] countdown-final'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "countdown final beep sound, urgent alert" --duration 3.0 --output "$OUTPUT_DIR/engagement/countdown-final.wav" || echo 'Failed: countdown-final'

echo '[46/50] time-running-out'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "time running out ticking sound, urgent timer" --duration 3.0 --output "$OUTPUT_DIR/engagement/time-running-out.wav" || echo 'Failed: time-running-out'

echo '[47/50] pop-up'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "pop-up appear sound effect, graphic element" --duration 3.0 --output "$OUTPUT_DIR/engagement/pop-up.wav" || echo 'Failed: pop-up'

echo '[48/50] text-appear'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "text appearing sound effect, typing reveal" --duration 3.0 --output "$OUTPUT_DIR/engagement/text-appear.wav" || echo 'Failed: text-appear'

echo '[49/50] cash-register'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "cash register cha-ching sound, money sale" --duration 3.0 --output "$OUTPUT_DIR/engagement/cash-register.wav" || echo 'Failed: cash-register'

echo '[50/50] magic-sparkle'
python "$PYTHON_SCRIPT" --api-key "$ELEVENLABS_API_KEY" --prompt "magic sparkle sound effect, fairy dust twinkle" --duration 3.0 --output "$OUTPUT_DIR/engagement/magic-sparkle.wav" || echo 'Failed: magic-sparkle'


echo ''
echo 'Content Creator Essentials generation complete!'
echo 'Generated sounds saved to: $OUTPUT_DIR'