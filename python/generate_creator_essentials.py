#!/usr/bin/env python3
"""
Content Creator Essentials SFX Library Generator
High-value sound effects for YouTube/TikTok creators
"""

import os
import sys
import json
import argparse
from datetime import datetime

# Standard duration for all SFX (3 seconds provides good material that can be trimmed/looped)
DEFAULT_DURATION = 3.0

CREATOR_ESSENTIALS = {
    "attention": {
        "description": "Attention-grabbing sounds for hooks and dramatic moments",
        "sounds": [
            # Record scratch / rewind
            {"name": "record-scratch", "prompt": "vinyl record scratch sound effect, dramatic stop", "duration": DEFAULT_DURATION, "tags": ["record", "scratch", "stop", "dramatic"]},
            {"name": "rewind", "prompt": "tape rewind sound effect, fast backwards", "duration": DEFAULT_DURATION, "tags": ["rewind", "tape", "backwards"]},
            {"name": "fast-forward", "prompt": "fast forward sound effect, VCR tape speeding up", "duration": DEFAULT_DURATION, "tags": ["fast", "forward", "speed"]},

            # Air horn / dramatic hits
            {"name": "air-horn", "prompt": "air horn blast sound effect, loud party horn", "duration": DEFAULT_DURATION, "tags": ["air", "horn", "blast", "loud"]},
            {"name": "dramatic-hit", "prompt": "dramatic orchestral hit sound, epic impact", "duration": DEFAULT_DURATION, "tags": ["dramatic", "orchestral", "epic", "impact"]},
            {"name": "bass-drop", "prompt": "massive bass drop sound effect, dubstep style", "duration": DEFAULT_DURATION, "tags": ["bass", "drop", "dubstep", "heavy"]},

            # Shocking / surprising
            {"name": "shock-sfx", "prompt": "shock sound effect, dramatic surprise sting", "duration": DEFAULT_DURATION, "tags": ["shock", "surprise", "sting"]},
            {"name": "suspense-hit", "prompt": "suspense thriller hit sound, tense impact", "duration": DEFAULT_DURATION, "tags": ["suspense", "thriller", "tense"]},
            {"name": "jump-scare", "prompt": "jump scare sound effect, sudden loud scary noise", "duration": DEFAULT_DURATION, "tags": ["jump", "scare", "scary", "sudden"]},

            # Comedic attention
            {"name": "cartoon-boing", "prompt": "cartoon boing sound effect, bouncy spring", "duration": DEFAULT_DURATION, "tags": ["cartoon", "boing", "bounce", "spring"]},
            {"name": "wrong-answer", "prompt": "wrong answer buzzer sound, game show fail", "duration": DEFAULT_DURATION, "tags": ["wrong", "buzzer", "fail", "game"]},
            {"name": "clown-horn", "prompt": "clown horn honk sound effect, funny bike horn", "duration": DEFAULT_DURATION, "tags": ["clown", "horn", "honk", "funny"]},

            # Modern attention
            {"name": "glitch-impact", "prompt": "digital glitch impact sound effect, technology malfunction", "duration": DEFAULT_DURATION, "tags": ["glitch", "digital", "tech", "impact"]},
            {"name": "laser-zap", "prompt": "laser zap sound effect, sci-fi energy blast", "duration": DEFAULT_DURATION, "tags": ["laser", "zap", "sci-fi", "energy"]},
            {"name": "explosion-boom", "prompt": "cinematic explosion boom, big movie blast", "duration": DEFAULT_DURATION, "tags": ["explosion", "boom", "cinematic", "blast"]},
        ]
    },

    "creator_transitions": {
        "description": "Modern transitions for jump cuts and scene changes",
        "sounds": [
            # Jump cuts / glitches
            {"name": "jump-cut", "prompt": "quick jump cut whoosh sound, fast transition", "duration": DEFAULT_DURATION, "tags": ["jump", "cut", "whoosh", "fast"]},
            {"name": "glitch-transition", "prompt": "digital glitch transition sound effect, data corruption", "duration": DEFAULT_DURATION, "tags": ["glitch", "transition", "digital", "data"]},
            {"name": "tape-stop", "prompt": "tape stop sound effect, slowing down to halt", "duration": DEFAULT_DURATION, "tags": ["tape", "stop", "slow", "halt"]},

            # Whooshes optimized for content
            {"name": "quick-swipe", "prompt": "quick swipe whoosh sound, fast swish", "duration": DEFAULT_DURATION, "tags": ["swipe", "whoosh", "quick", "swish"]},
            {"name": "zoom-in", "prompt": "zoom in whoosh sound effect, approaching fast", "duration": DEFAULT_DURATION, "tags": ["zoom", "in", "approach", "whoosh"]},
            {"name": "zoom-out", "prompt": "zoom out whoosh sound effect, receding away", "duration": DEFAULT_DURATION, "tags": ["zoom", "out", "recede", "whoosh"]},

            # Tech transitions
            {"name": "hologram-appear", "prompt": "hologram appearing sound effect, sci-fi materialize", "duration": DEFAULT_DURATION, "tags": ["hologram", "appear", "sci-fi", "tech"]},
            {"name": "hologram-disappear", "prompt": "hologram disappearing sound effect, dematerialize", "duration": DEFAULT_DURATION, "tags": ["hologram", "disappear", "dematerialize"]},
            {"name": "digital-wipe", "prompt": "digital screen wipe sound effect, transition swipe", "duration": DEFAULT_DURATION, "tags": ["digital", "wipe", "screen", "swipe"]},

            # Cinematic transitions
            {"name": "cinematic-riser", "prompt": "cinematic riser sound effect, building tension", "duration": DEFAULT_DURATION, "tags": ["cinematic", "riser", "tension", "build"]},
            {"name": "reverse-cymbal", "prompt": "reverse cymbal crash sound effect, backwards buildup", "duration": DEFAULT_DURATION, "tags": ["reverse", "cymbal", "crash", "buildup"]},
            {"name": "trailer-boom", "prompt": "movie trailer boom sound, deep bass hit", "duration": DEFAULT_DURATION, "tags": ["trailer", "boom", "movie", "bass"]},

            # Modern cuts
            {"name": "snap-cut", "prompt": "snap finger sound effect, quick transition snap", "duration": DEFAULT_DURATION, "tags": ["snap", "finger", "quick", "cut"]},
            {"name": "time-freeze", "prompt": "time freeze sound effect, motion stop with reverb", "duration": DEFAULT_DURATION, "tags": ["time", "freeze", "stop", "reverb"]},
            {"name": "speed-ramp", "prompt": "speed ramp sound effect, slow motion transition", "duration": DEFAULT_DURATION, "tags": ["speed", "ramp", "slow", "motion"]},
        ]
    },

    "emotional": {
        "description": "Emotional moments and storytelling sounds",
        "sounds": [
            # Victory / success
            {"name": "victory-fanfare", "prompt": "short victory fanfare sound, success celebration", "duration": DEFAULT_DURATION, "tags": ["victory", "fanfare", "success", "win"]},
            {"name": "achievement-unlock", "prompt": "achievement unlock sound effect, game reward", "duration": DEFAULT_DURATION, "tags": ["achievement", "unlock", "game", "reward"]},
            {"name": "level-up", "prompt": "level up sound effect, power up success", "duration": DEFAULT_DURATION, "tags": ["level", "up", "power", "success"]},

            # Failure / disappointment
            {"name": "sad-trombone", "prompt": "sad trombone fail sound effect, comedic failure", "duration": DEFAULT_DURATION, "tags": ["sad", "trombone", "fail", "comedy"]},
            {"name": "game-over", "prompt": "game over sound effect, defeat loss", "duration": DEFAULT_DURATION, "tags": ["game", "over", "defeat", "loss"]},
            {"name": "error-sound", "prompt": "error sound effect, system failure beep", "duration": DEFAULT_DURATION, "tags": ["error", "failure", "beep", "system"]},

            # Suspense / tension
            {"name": "suspense-drone", "prompt": "suspense drone sound, tense atmosphere", "duration": DEFAULT_DURATION, "tags": ["suspense", "drone", "tense", "atmosphere"]},
            {"name": "heartbeat-pulse", "prompt": "heartbeat pulse sound effect, nervous tension", "duration": DEFAULT_DURATION, "tags": ["heartbeat", "pulse", "nervous", "tension"]},

            # Epic moments
            {"name": "epic-orchestral", "prompt": "epic orchestral swell sound, heroic moment", "duration": DEFAULT_DURATION, "tags": ["epic", "orchestral", "heroic", "swell"]},
            {"name": "triumphant-horns", "prompt": "triumphant horn fanfare, victory theme", "duration": DEFAULT_DURATION, "tags": ["triumphant", "horns", "fanfare", "theme"]},
        ]
    },

    "engagement": {
        "description": "Engagement sounds for calls-to-action and viewer interaction",
        "sounds": [
            # Subscribe / like prompts
            {"name": "bell-notification", "prompt": "notification bell ding sound, alert chime", "duration": DEFAULT_DURATION, "tags": ["bell", "notification", "ding", "alert"]},
            {"name": "subscribe-click", "prompt": "button click sound effect, satisfying tap", "duration": DEFAULT_DURATION, "tags": ["subscribe", "click", "button", "tap"]},
            {"name": "like-sound", "prompt": "positive like sound effect, approval chime", "duration": DEFAULT_DURATION, "tags": ["like", "positive", "approval", "chime"]},

            # Countdown / timers
            {"name": "countdown-beep", "prompt": "countdown timer beep sound, short tick", "duration": DEFAULT_DURATION, "tags": ["countdown", "timer", "beep", "tick"]},
            {"name": "countdown-final", "prompt": "countdown final beep sound, urgent alert", "duration": DEFAULT_DURATION, "tags": ["countdown", "final", "urgent", "beep"]},
            {"name": "time-running-out", "prompt": "time running out ticking sound, urgent timer", "duration": DEFAULT_DURATION, "tags": ["time", "running", "ticking", "urgent"]},

            # Pointing / highlighting
            {"name": "pop-up", "prompt": "pop-up appear sound effect, graphic element", "duration": DEFAULT_DURATION, "tags": ["pop", "up", "appear", "graphic"]},
            {"name": "text-appear", "prompt": "text appearing sound effect, typing reveal", "duration": DEFAULT_DURATION, "tags": ["text", "appear", "typing", "reveal"]},

            # Modern engagement
            {"name": "cash-register", "prompt": "cash register cha-ching sound, money sale", "duration": DEFAULT_DURATION, "tags": ["cash", "register", "money", "sale"]},
            {"name": "magic-sparkle", "prompt": "magic sparkle sound effect, fairy dust twinkle", "duration": DEFAULT_DURATION, "tags": ["magic", "sparkle", "fairy", "twinkle"]},
        ]
    }
}


def generate_library_metadata(output_dir: str):
    """Generate library_metadata.json with all sound information"""

    metadata = {
        "version": "2.0.0",
        "name": "Content Creator Essentials Pack",
        "generated_at": datetime.now().isoformat(),
        "total_sounds": sum(len(cat["sounds"]) for cat in CREATOR_ESSENTIALS.values()),
        "categories": CREATOR_ESSENTIALS
    }

    metadata_path = os.path.join(output_dir, 'creator_essentials_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"✓ Generated metadata: {metadata_path}", file=sys.stderr)
    return metadata


def generate_generation_script(output_dir: str):
    """Generate bash script for ElevenLabs batch generation"""

    script_lines = [
        "#!/bin/bash",
        "# Content Creator Essentials SFX Library Generator (ElevenLabs API)",
        f"# Generated on {datetime.now().isoformat()}",
        "",
        "set -e  # Exit on error",
        "",
        "# Check for API key",
        "if [ -z \"$ELEVENLABS_API_KEY\" ]; then",
        "  echo 'Error: ELEVENLABS_API_KEY environment variable not set'",
        "  echo 'Usage: ELEVENLABS_API_KEY=your_key_here ./generate_creator_essentials.sh'",
        "  exit 1",
        "fi",
        "",
        "SCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"",
        f"OUTPUT_DIR=\"{output_dir}\"",
        "PYTHON_SCRIPT=\"$SCRIPT_DIR/../python/elevenlabs_sfx_generator.py\"",
        "",
        "echo 'Starting Content Creator Essentials SFX generation...'",
        "echo 'Total sounds: 50'",
        "echo 'Estimated cost: 6,000 credits (50 sounds × 3s × 40 credits/s)'",
        "echo 'Estimated time: 15-25 minutes'",
        "echo ''",
        "",
        "# Create category directories",
    ]

    # Add directory creation
    for category in CREATOR_ESSENTIALS.keys():
        script_lines.append(f"mkdir -p \"$OUTPUT_DIR/{category}\"")

    script_lines.append("")
    script_lines.append("# Generate sounds")
    script_lines.append("")

    total_sounds = sum(len(cat["sounds"]) for cat in CREATOR_ESSENTIALS.values())
    current = 0

    for category, data in CREATOR_ESSENTIALS.items():
        script_lines.append(f"# Category: {category}")
        script_lines.append(f"echo 'Generating {category}...'")

        for sound in data["sounds"]:
            current += 1
            output_path = f"$OUTPUT_DIR/{category}/{sound['name']}.wav"

            script_lines.append(f"echo '[{current}/{total_sounds}] {sound['name']}'")
            script_lines.append(
                f"python \"$PYTHON_SCRIPT\" "
                f"--api-key \"$ELEVENLABS_API_KEY\" "
                f"--prompt \"{sound['prompt']}\" "
                f"--duration {sound['duration']} "
                f"--output \"{output_path}\" || echo 'Failed: {sound['name']}'"
            )
            script_lines.append("")

        script_lines.append("")

    script_lines.extend([
        "echo ''",
        "echo 'Content Creator Essentials generation complete!'",
        "echo 'Generated sounds saved to: $OUTPUT_DIR'",
    ])

    script_path = os.path.join(output_dir, 'generate_creator_essentials.sh')
    with open(script_path, 'w') as f:
        f.write('\n'.join(script_lines))

    # Make executable
    os.chmod(script_path, 0o755)

    print(f"✓ Generated batch script: {script_path}", file=sys.stderr)
    print(f"  Total sounds to generate: {total_sounds}", file=sys.stderr)
    print(f"  Estimated cost: {total_sounds * 120} credits", file=sys.stderr)
    print("", file=sys.stderr)

    return script_path


def print_library_stats():
    """Print statistics about the library"""
    total = 0

    print("\n=== Content Creator Essentials Library ===\n", file=sys.stderr)

    for category, data in CREATOR_ESSENTIALS.items():
        count = len(data["sounds"])
        total += count
        print(f"{category.upper()}: {count} sounds", file=sys.stderr)
        print(f"  {data['description']}", file=sys.stderr)
        print("", file=sys.stderr)

    print(f"TOTAL: {total} sound effects", file=sys.stderr)
    print(f"ESTIMATED COST: {total * 120} credits ({total} sounds × 3s × 40 credits/s)", file=sys.stderr)
    print("", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description='Generate Content Creator Essentials SFX library structure'
    )
    parser.add_argument(
        '--output',
        default='./sfx_library',
        help='Output directory for library (default: ./sfx_library)'
    )
    parser.add_argument(
        '--stats-only',
        action='store_true',
        help='Only print library statistics without generating files'
    )

    args = parser.parse_args()

    if args.stats_only:
        print_library_stats()
        return

    # Create output directory
    os.makedirs(args.output, exist_ok=True)

    print(f"Creating Content Creator Essentials library in: {args.output}", file=sys.stderr)
    print("", file=sys.stderr)

    # Generate metadata
    metadata = generate_library_metadata(args.output)

    # Generate batch script
    script_path = generate_generation_script(args.output)

    print_library_stats()

    print("✓ Setup complete!", file=sys.stderr)
    print("", file=sys.stderr)
    print("Next steps:", file=sys.stderr)
    print(f"  1. Review the library: {args.output}/creator_essentials_metadata.json", file=sys.stderr)
    print(f"  2. Set your API key: export ELEVENLABS_API_KEY=your_key_here", file=sys.stderr)
    print(f"  3. Run generation: {script_path}", file=sys.stderr)
    print(f"  4. Wait ~15-25 minutes", file=sys.stderr)
    print("", file=sys.stderr)


if __name__ == '__main__':
    main()
