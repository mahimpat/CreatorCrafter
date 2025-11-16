#!/usr/bin/env python3
"""
Mixed Essentials SFX Library Generator
Best-of-all-categories sound effects pack
"""

import os
import sys
import json
import argparse
from datetime import datetime

# Standard duration for all SFX (3 seconds provides good material that can be trimmed/looped)
DEFAULT_DURATION = 3.0

MIXED_ESSENTIALS = {
    "cartoon": {
        "description": "Cartoon and comedy sound effects",
        "sounds": [
            {"name": "slide-whistle", "prompt": "cartoon slide whistle sound effect, descending pitch", "duration": DEFAULT_DURATION, "tags": ["cartoon", "comedy", "whistle", "slide"]},
            {"name": "spring-boing", "prompt": "cartoon spring boing sound effect, bouncy jump", "duration": DEFAULT_DURATION, "tags": ["cartoon", "spring", "boing", "bounce"]},
            {"name": "slip-fall", "prompt": "cartoon slip and fall sound effect, comedic accident", "duration": DEFAULT_DURATION, "tags": ["cartoon", "slip", "fall", "comedy"]},
            {"name": "bonk-hit", "prompt": "cartoon bonk hit sound effect, comedic impact on head", "duration": DEFAULT_DURATION, "tags": ["cartoon", "bonk", "hit", "comedy"]},
            {"name": "splat-impact", "prompt": "cartoon splat sound effect, wet impact", "duration": DEFAULT_DURATION, "tags": ["cartoon", "splat", "wet", "impact"]},
            {"name": "pop-burst", "prompt": "cartoon pop sound effect, bubble burst", "duration": DEFAULT_DURATION, "tags": ["cartoon", "pop", "bubble", "burst"]},
        ]
    },

    "cinematic": {
        "description": "Cinematic and dramatic sound effects",
        "sounds": [
            {"name": "thunder-boom", "prompt": "massive thunder boom sound effect, dramatic storm", "duration": DEFAULT_DURATION, "tags": ["thunder", "boom", "storm", "dramatic"]},
            {"name": "lightning-strike", "prompt": "lightning strike crack sound effect, electric bolt", "duration": DEFAULT_DURATION, "tags": ["lightning", "strike", "electric", "crack"]},
            {"name": "earthquake-rumble", "prompt": "earthquake rumble sound effect, ground shaking", "duration": DEFAULT_DURATION, "tags": ["earthquake", "rumble", "shake", "ground"]},
            {"name": "meteor-impact", "prompt": "meteor impact explosion sound, massive crash", "duration": DEFAULT_DURATION, "tags": ["meteor", "impact", "explosion", "crash"]},
            {"name": "avalanche-crash", "prompt": "avalanche crashing sound effect, snow tumbling down mountain", "duration": DEFAULT_DURATION, "tags": ["avalanche", "crash", "snow", "mountain"]},
        ]
    },

    "music": {
        "description": "Music elements and beat components",
        "sounds": [
            {"name": "kick-drum-hit", "prompt": "deep kick drum hit sound, 808 bass drum", "duration": DEFAULT_DURATION, "tags": ["kick", "drum", "bass", "beat"]},
            {"name": "snare-hit", "prompt": "snare drum hit sound effect, crisp snare", "duration": DEFAULT_DURATION, "tags": ["snare", "drum", "hit", "beat"]},
            {"name": "bass-drop-heavy", "prompt": "heavy bass drop sound effect, dubstep sub bass", "duration": DEFAULT_DURATION, "tags": ["bass", "drop", "dubstep", "heavy"]},
            {"name": "synth-stab", "prompt": "synth stab sound effect, electronic hit", "duration": DEFAULT_DURATION, "tags": ["synth", "stab", "electronic", "hit"]},
            {"name": "riser-buildup", "prompt": "tension riser sound effect, musical buildup", "duration": DEFAULT_DURATION, "tags": ["riser", "buildup", "tension", "music"]},
        ]
    },

    "nature_sounds": {
        "description": "Nature and animal sounds",
        "sounds": [
            {"name": "dog-bark", "prompt": "dog barking sound effect, medium sized dog", "duration": DEFAULT_DURATION, "tags": ["dog", "bark", "animal", "pet"]},
            {"name": "cat-meow", "prompt": "cat meowing sound effect, house cat", "duration": DEFAULT_DURATION, "tags": ["cat", "meow", "animal", "pet"]},
            {"name": "water-splash", "prompt": "water splash sound effect, large splash in pool", "duration": DEFAULT_DURATION, "tags": ["water", "splash", "pool", "liquid"]},
            {"name": "fire-crackle", "prompt": "fire crackling sound effect, campfire burning", "duration": DEFAULT_DURATION, "tags": ["fire", "crackle", "campfire", "burn"]},
            {"name": "thunder-rumble", "prompt": "distant thunder rumble sound, storm approaching", "duration": DEFAULT_DURATION, "tags": ["thunder", "rumble", "storm", "weather"]},
        ]
    },

    "technology": {
        "description": "Modern tech and digital sounds",
        "sounds": [
            {"name": "phone-buzz", "prompt": "phone vibration buzz sound effect, mobile phone vibrate", "duration": DEFAULT_DURATION, "tags": ["phone", "buzz", "vibrate", "mobile"]},
            {"name": "glitch-digital", "prompt": "digital glitch sound effect, technology malfunction", "duration": DEFAULT_DURATION, "tags": ["glitch", "digital", "tech", "error"]},
            {"name": "swipe-screen", "prompt": "touchscreen swipe sound effect, finger swipe on phone", "duration": DEFAULT_DURATION, "tags": ["swipe", "screen", "touch", "phone"]},
            {"name": "notification-ping", "prompt": "notification ping sound effect, app alert tone", "duration": DEFAULT_DURATION, "tags": ["notification", "ping", "alert", "app"]},
            {"name": "robot-beep", "prompt": "robot beep sound effect, mechanical electronic beep", "duration": DEFAULT_DURATION, "tags": ["robot", "beep", "mechanical", "tech"]},
        ]
    }
}


def generate_library_metadata(output_dir: str):
    """Generate metadata JSON with all sound information"""

    metadata = {
        "version": "3.0.0",
        "name": "Mixed Essentials Pack",
        "generated_at": datetime.now().isoformat(),
        "total_sounds": sum(len(cat["sounds"]) for cat in MIXED_ESSENTIALS.values()),
        "categories": MIXED_ESSENTIALS
    }

    metadata_path = os.path.join(output_dir, 'mixed_essentials_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"✓ Generated metadata: {metadata_path}", file=sys.stderr)
    return metadata


def generate_generation_script(output_dir: str):
    """Generate bash script for ElevenLabs batch generation"""

    script_lines = [
        "#!/bin/bash",
        "# Mixed Essentials SFX Library Generator (ElevenLabs API)",
        f"# Generated on {datetime.now().isoformat()}",
        "",
        "set -e  # Exit on error",
        "",
        "# Check for API key",
        "if [ -z \"$ELEVENLABS_API_KEY\" ]; then",
        "  echo 'Error: ELEVENLABS_API_KEY environment variable not set'",
        "  echo 'Usage: ELEVENLABS_API_KEY=your_key_here ./generate_mixed_essentials.sh'",
        "  exit 1",
        "fi",
        "",
        "SCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"",
        f"OUTPUT_DIR=\"{output_dir}\"",
        "PYTHON_SCRIPT=\"$SCRIPT_DIR/../python/elevenlabs_sfx_generator.py\"",
        "",
        "echo 'Starting Mixed Essentials SFX generation...'",
        "echo 'Total sounds: 26'",
        "echo 'Estimated cost: 3,120 credits (26 sounds × 3s × 40 credits/s)'",
        "echo 'Estimated time: 10-15 minutes'",
        "echo ''",
        "",
        "# Create category directories",
    ]

    # Add directory creation
    for category in MIXED_ESSENTIALS.keys():
        script_lines.append(f"mkdir -p \"$OUTPUT_DIR/{category}\"")

    script_lines.append("")
    script_lines.append("# Generate sounds")
    script_lines.append("")

    total_sounds = sum(len(cat["sounds"]) for cat in MIXED_ESSENTIALS.values())
    current = 0

    for category, data in MIXED_ESSENTIALS.items():
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
        "echo 'Mixed Essentials generation complete!'",
        "echo 'Generated sounds saved to: $OUTPUT_DIR'",
    ])

    script_path = os.path.join(output_dir, 'generate_mixed_essentials.sh')
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

    print("\n=== Mixed Essentials Library ===\n", file=sys.stderr)

    for category, data in MIXED_ESSENTIALS.items():
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
        description='Generate Mixed Essentials SFX library structure'
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

    print(f"Creating Mixed Essentials library in: {args.output}", file=sys.stderr)
    print("", file=sys.stderr)

    # Generate metadata
    metadata = generate_library_metadata(args.output)

    # Generate batch script
    script_path = generate_generation_script(args.output)

    print_library_stats()

    print("✓ Setup complete!", file=sys.stderr)
    print("", file=sys.stderr)
    print("Next steps:", file=sys.stderr)
    print(f"  1. Review the library: {args.output}/mixed_essentials_metadata.json", file=sys.stderr)
    print(f"  2. Set your API key: export ELEVENLABS_API_KEY=your_key_here", file=sys.stderr)
    print(f"  3. Run generation: {script_path}", file=sys.stderr)
    print(f"  4. Wait ~10-15 minutes", file=sys.stderr)
    print("", file=sys.stderr)


if __name__ == '__main__':
    main()
