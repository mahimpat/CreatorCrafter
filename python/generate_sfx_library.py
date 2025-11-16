#!/usr/bin/env python3
"""
SFX Library Generator
Systematically generates a comprehensive sound effects library for the app
Organizes by categories: Foley, Transitions, Impacts, UI, Ambient, etc.
"""

import os
import json
import argparse
import sys
from pathlib import Path
from datetime import datetime

# SFX Library Structure
# Each category contains prompts optimized for quality results

# Standard duration for all SFX (3 seconds provides good material that can be trimmed/looped)
DEFAULT_DURATION = 3.0

SFX_LIBRARY = {
    "transitions": {
        "description": "Transition effects for cuts, scene changes, and motion",
        "sounds": [
            # Whooshes
            {"name": "whoosh-fast", "prompt": "fast whoosh sound effect, swift air movement", "duration": DEFAULT_DURATION, "tags": ["whoosh", "fast", "transition"]},
            {"name": "whoosh-slow", "prompt": "slow whoosh sound effect, gentle air sweep", "duration": DEFAULT_DURATION, "tags": ["whoosh", "slow", "transition"]},
            {"name": "whoosh-deep", "prompt": "deep bass whoosh, low frequency air movement", "duration": DEFAULT_DURATION, "tags": ["whoosh", "bass", "deep"]},
            {"name": "whoosh-rise", "prompt": "rising whoosh sound effect, ascending pitch", "duration": DEFAULT_DURATION, "tags": ["whoosh", "rise", "up"]},
            {"name": "whoosh-fall", "prompt": "falling whoosh sound effect, descending pitch", "duration": DEFAULT_DURATION, "tags": ["whoosh", "fall", "down"]},

            # Swooshes
            {"name": "swoosh-left", "prompt": "swoosh sound panning left to right", "duration": DEFAULT_DURATION, "tags": ["swoosh", "pan", "transition"]},
            {"name": "swoosh-right", "prompt": "swoosh sound panning right to left", "duration": DEFAULT_DURATION, "tags": ["swoosh", "pan", "transition"]},
            {"name": "swoosh-quick", "prompt": "quick swoosh sound effect, rapid movement", "duration": DEFAULT_DURATION, "tags": ["swoosh", "quick", "fast"]},

            # Risers
            {"name": "riser-tension", "prompt": "tension building riser sound effect", "duration": DEFAULT_DURATION, "tags": ["riser", "tension", "build"]},
            {"name": "riser-dramatic", "prompt": "dramatic riser sound effect, epic buildup", "duration": DEFAULT_DURATION, "tags": ["riser", "dramatic", "epic"]},
            {"name": "riser-subtle", "prompt": "subtle ambient riser, gentle buildup", "duration": DEFAULT_DURATION, "tags": ["riser", "subtle", "ambient"]},

            # Impacts for transitions
            {"name": "transition-hit", "prompt": "transition hit sound effect, punchy impact", "duration": DEFAULT_DURATION, "tags": ["hit", "transition", "impact"]},
            {"name": "transition-boom", "prompt": "boom transition sound effect, deep impact", "duration": DEFAULT_DURATION, "tags": ["boom", "transition", "bass"]},
        ]
    },

    "foley": {
        "description": "Foley sounds for human actions and object interactions",
        "sounds": [
            # Footsteps
            {"name": "footstep-concrete", "prompt": "single footstep on concrete floor", "duration": DEFAULT_DURATION, "tags": ["footstep", "concrete", "walk"]},
            {"name": "footstep-wood", "prompt": "single footstep on wooden floor, creaky", "duration": DEFAULT_DURATION, "tags": ["footstep", "wood", "walk"]},
            {"name": "footstep-gravel", "prompt": "footstep on gravel, crunchy texture", "duration": DEFAULT_DURATION, "tags": ["footstep", "gravel", "crunch"]},

            # Door sounds
            {"name": "door-open", "prompt": "door opening sound effect, wooden door creaking", "duration": DEFAULT_DURATION, "tags": ["door", "open", "creak"]},
            {"name": "door-close", "prompt": "door closing sound effect, solid close", "duration": DEFAULT_DURATION, "tags": ["door", "close", "slam"]},
            {"name": "door-knock", "prompt": "knocking on wooden door, three knocks", "duration": DEFAULT_DURATION, "tags": ["door", "knock", "wood"]},

            # Object handling
            {"name": "paper-rustle", "prompt": "paper rustling sound effect, pages turning", "duration": DEFAULT_DURATION, "tags": ["paper", "rustle", "foley"]},
            {"name": "cloth-movement", "prompt": "clothing fabric movement, cloth rustle", "duration": DEFAULT_DURATION, "tags": ["cloth", "fabric", "rustle"]},
            {"name": "keyboard-typing", "prompt": "keyboard typing sound, mechanical keys", "duration": DEFAULT_DURATION, "tags": ["keyboard", "typing", "tech"]},
            {"name": "pen-writing", "prompt": "pen writing on paper sound", "duration": DEFAULT_DURATION, "tags": ["pen", "writing", "paper"]},

            # Glass/ceramic
            {"name": "glass-clink", "prompt": "wine glasses clinking together", "duration": DEFAULT_DURATION, "tags": ["glass", "clink", "toast"]},
            {"name": "cup-place", "prompt": "coffee cup placed on table", "duration": DEFAULT_DURATION, "tags": ["cup", "place", "ceramic"]},

            # Metal
            {"name": "keys-jingle", "prompt": "keys jingling sound effect, metal clanking", "duration": DEFAULT_DURATION, "tags": ["keys", "jingle", "metal"]},
            {"name": "coins-drop", "prompt": "coins dropping on hard surface", "duration": DEFAULT_DURATION, "tags": ["coins", "drop", "metal"]},
        ]
    },

    "impacts": {
        "description": "Impact sounds for punches, hits, crashes, and collisions",
        "sounds": [
            # Punches/Hits
            {"name": "punch-hard", "prompt": "hard punch impact sound effect, powerful hit", "duration": DEFAULT_DURATION, "tags": ["punch", "hit", "impact"]},
            {"name": "punch-soft", "prompt": "soft punch sound effect, light hit", "duration": DEFAULT_DURATION, "tags": ["punch", "hit", "soft"]},
            {"name": "slap-face", "prompt": "face slap sound effect, sharp impact", "duration": DEFAULT_DURATION, "tags": ["slap", "hit", "sharp"]},

            # Thuds
            {"name": "thud-heavy", "prompt": "heavy thud sound, large object falling", "duration": DEFAULT_DURATION, "tags": ["thud", "heavy", "fall"]},
            {"name": "thud-body", "prompt": "body thud sound effect, person falling", "duration": DEFAULT_DURATION, "tags": ["thud", "body", "fall"]},

            # Crashes
            {"name": "crash-glass", "prompt": "glass breaking and shattering sound", "duration": DEFAULT_DURATION, "tags": ["crash", "glass", "shatter"]},
            {"name": "crash-metal", "prompt": "metal crash sound effect, metallic collision", "duration": DEFAULT_DURATION, "tags": ["crash", "metal", "collision"]},

            # Explosions
            {"name": "explosion-big", "prompt": "large explosion sound effect, powerful blast", "duration": DEFAULT_DURATION, "tags": ["explosion", "blast", "boom"]},
            {"name": "explosion-small", "prompt": "small explosion sound, firecracker pop", "duration": DEFAULT_DURATION, "tags": ["explosion", "pop", "small"]},
        ]
    },

    "ui": {
        "description": "UI sounds for clicks, notifications, and interface feedback",
        "sounds": [
            # Clicks
            {"name": "click-soft", "prompt": "soft button click sound, gentle tap", "duration": DEFAULT_DURATION, "tags": ["click", "button", "ui"]},
            {"name": "click-hard", "prompt": "hard button click, mechanical switch", "duration": DEFAULT_DURATION, "tags": ["click", "button", "mechanical"]},
            {"name": "click-tech", "prompt": "futuristic tech click sound, digital beep", "duration": DEFAULT_DURATION, "tags": ["click", "tech", "digital"]},

            # Pops
            {"name": "pop-bubble", "prompt": "bubble pop sound effect, light pop", "duration": DEFAULT_DURATION, "tags": ["pop", "bubble", "ui"]},
            {"name": "pop-cork", "prompt": "cork pop sound, champagne opening", "duration": DEFAULT_DURATION, "tags": ["pop", "cork", "celebration"]},

            # Notifications
            {"name": "notification-bell", "prompt": "notification bell sound, gentle chime", "duration": DEFAULT_DURATION, "tags": ["notification", "bell", "alert"]},
            {"name": "notification-ping", "prompt": "notification ping sound, digital alert", "duration": DEFAULT_DURATION, "tags": ["notification", "ping", "alert"]},
            {"name": "notification-success", "prompt": "success notification sound, positive chime", "duration": DEFAULT_DURATION, "tags": ["notification", "success", "positive"]},
            {"name": "notification-error", "prompt": "error notification sound, negative beep", "duration": DEFAULT_DURATION, "tags": ["notification", "error", "negative"]},

            # Beeps
            {"name": "beep-short", "prompt": "short beep sound, single tone", "duration": DEFAULT_DURATION, "tags": ["beep", "short", "tone"]},
            {"name": "beep-countdown", "prompt": "countdown beep sound, timer tick", "duration": DEFAULT_DURATION, "tags": ["beep", "countdown", "timer"]},
        ]
    },

    "ambient": {
        "description": "Ambient background sounds and room tones",
        "sounds": [
            # Room tones
            {"name": "room-quiet", "prompt": "quiet room tone, subtle ambient noise", "duration": DEFAULT_DURATION, "tags": ["ambient", "room", "quiet"]},
            {"name": "room-office", "prompt": "office ambient sound, keyboard typing and murmurs", "duration": DEFAULT_DURATION, "tags": ["ambient", "office", "work"]},

            # Nature
            {"name": "wind-gentle", "prompt": "gentle wind sound, soft breeze", "duration": DEFAULT_DURATION, "tags": ["nature", "wind", "outdoor"]},
            {"name": "rain-light", "prompt": "light rain sound, gentle rainfall", "duration": DEFAULT_DURATION, "tags": ["nature", "rain", "weather"]},
            {"name": "birds-morning", "prompt": "morning birds chirping, peaceful nature", "duration": DEFAULT_DURATION, "tags": ["nature", "birds", "morning"]},

            # Urban
            {"name": "city-traffic", "prompt": "distant city traffic ambient sound", "duration": DEFAULT_DURATION, "tags": ["urban", "traffic", "city"]},
            {"name": "cafe-ambience", "prompt": "coffee shop ambient sound, people chatting", "duration": DEFAULT_DURATION, "tags": ["urban", "cafe", "people"]},
        ]
    },

    "movement": {
        "description": "Movement sounds for swipes, slides, and mechanical actions",
        "sounds": [
            # Swipes
            {"name": "swipe-left", "prompt": "swipe sound effect, quick motion left", "duration": DEFAULT_DURATION, "tags": ["swipe", "motion", "ui"]},
            {"name": "swipe-up", "prompt": "swipe up sound effect, upward motion", "duration": DEFAULT_DURATION, "tags": ["swipe", "motion", "up"]},

            # Slides
            {"name": "slide-drawer", "prompt": "drawer sliding open sound, smooth motion", "duration": DEFAULT_DURATION, "tags": ["slide", "drawer", "furniture"]},
            {"name": "slide-zipper", "prompt": "zipper sliding sound effect", "duration": DEFAULT_DURATION, "tags": ["slide", "zipper", "clothing"]},

            # Mechanical
            {"name": "gear-turn", "prompt": "mechanical gear turning sound, clockwork", "duration": DEFAULT_DURATION, "tags": ["mechanical", "gear", "clockwork"]},
            {"name": "motor-start", "prompt": "electric motor starting sound effect", "duration": DEFAULT_DURATION, "tags": ["mechanical", "motor", "electric"]},
        ]
    }
}


def generate_library_metadata(output_dir: str):
    """Generate JSON metadata file for the entire library"""

    metadata = {
        "version": "1.0.0",
        "generated_at": datetime.now().isoformat(),
        "total_sounds": sum(len(cat["sounds"]) for cat in SFX_LIBRARY.values()),
        "categories": {}
    }

    for category, data in SFX_LIBRARY.items():
        metadata["categories"][category] = {
            "description": data["description"],
            "count": len(data["sounds"]),
            "sounds": data["sounds"]
        }

    # Write metadata JSON
    metadata_path = os.path.join(output_dir, "library_metadata.json")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"✓ Generated metadata: {metadata_path}", file=sys.stderr)
    return metadata


def generate_generation_script(output_dir: str, model_type: str = "audiogen", provider: str = "elevenlabs"):
    """Generate a bash/python script to batch generate all sounds

    Args:
        output_dir: Output directory for sounds
        model_type: Unused, kept for backward compatibility
        provider: "elevenlabs" or "audiocraft"
    """

    if provider == "elevenlabs":
        script_lines = [
            "#!/bin/bash",
            "# SFX Library Batch Generation Script (ElevenLabs API)",
            f"# Generated on {datetime.now().isoformat()}",
            "",
            "set -e  # Exit on error",
            "",
            "# Check for API key",
            "if [ -z \"$ELEVENLABS_API_KEY\" ]; then",
            "  echo 'Error: ELEVENLABS_API_KEY environment variable not set'",
            "  echo 'Usage: ELEVENLABS_API_KEY=your_key_here ./generate_library.sh'",
            "  exit 1",
            "fi",
            "",
            "SCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"",
            f"OUTPUT_DIR=\"{output_dir}\"",
            "PYTHON_SCRIPT=\"$SCRIPT_DIR/../python/elevenlabs_sfx_generator.py\"",
            "",
            "echo 'Starting SFX library generation with ElevenLabs API...'",
            "echo 'Total sounds: 60'",
            "echo 'Estimated cost: 7,200 credits (60 sounds × 3s × 40 credits/s)'",
            "echo 'Estimated time: 20-40 minutes'",
            "echo ''",
            "",
            "# Create category directories",
        ]
    else:
        script_lines = [
            "#!/bin/bash",
            "# SFX Library Batch Generation Script (AudioCraft)",
            f"# Generated on {datetime.now().isoformat()}",
            "",
            "set -e  # Exit on error",
            "",
            "SCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"",
            f"OUTPUT_DIR=\"{output_dir}\"",
            "PYTHON_SCRIPT=\"$SCRIPT_DIR/../python/audiocraft_generator.py\"",
            "",
            "echo 'Starting SFX library generation...'",
            "echo 'This will take several hours. Progress will be saved.'",
            "echo ''",
            "",
            "# Create category directories",
        ]

    # Add directory creation
    for category in SFX_LIBRARY.keys():
        script_lines.append(f"mkdir -p \"$OUTPUT_DIR/{category}\"")

    script_lines.append("")
    script_lines.append("# Generate sounds")
    script_lines.append("")

    total_sounds = sum(len(cat["sounds"]) for cat in SFX_LIBRARY.values())
    current = 0

    for category, data in SFX_LIBRARY.items():
        script_lines.append(f"# Category: {category}")
        script_lines.append(f"echo 'Generating {category}...'")

        for sound in data["sounds"]:
            current += 1
            output_path = f"$OUTPUT_DIR/{category}/{sound['name']}.wav"

            script_lines.append(f"echo '[{current}/{total_sounds}] {sound['name']}'")

            if provider == "elevenlabs":
                script_lines.append(
                    f"python \"$PYTHON_SCRIPT\" "
                    f"--api-key \"$ELEVENLABS_API_KEY\" "
                    f"--prompt \"{sound['prompt']}\" "
                    f"--duration {sound['duration']} "
                    f"--output \"{output_path}\" || echo 'Failed: {sound['name']}'"
                )
            else:
                script_lines.append(
                    f"python \"$PYTHON_SCRIPT\" "
                    f"--prompt \"{sound['prompt']}\" "
                    f"--duration {sound['duration']} "
                    f"--output \"{output_path}\" "
                    f"--model {model_type} || echo 'Failed: {sound['name']}'"
                )
            script_lines.append("")

        script_lines.append("")

    script_lines.extend([
        "echo ''",
        "echo 'SFX library generation complete!'",
        f"echo 'Generated {total_sounds} sound effects'",
        "echo \"Location: $OUTPUT_DIR\"",
    ])

    # Write script
    script_path = os.path.join(output_dir, "generate_library.sh")
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(script_lines))

    # Make executable
    os.chmod(script_path, 0o755)

    print(f"✓ Generated batch script: {script_path}", file=sys.stderr)
    print(f"  Total sounds to generate: {total_sounds}", file=sys.stderr)
    print(f"  Estimated time: {total_sounds * 2} - {total_sounds * 4} minutes", file=sys.stderr)

    return script_path


def print_library_stats():
    """Print statistics about the library"""
    total = 0

    print("\n=== SFX Library Structure ===\n", file=sys.stderr)

    for category, data in SFX_LIBRARY.items():
        count = len(data["sounds"])
        total += count
        print(f"{category.upper()}: {count} sounds", file=sys.stderr)
        print(f"  {data['description']}", file=sys.stderr)
        print("", file=sys.stderr)

    print(f"TOTAL: {total} sound effects", file=sys.stderr)
    print("", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description='Generate SFX library structure and batch generation scripts'
    )
    parser.add_argument(
        '--output',
        default='./sfx_library',
        help='Output directory for library (default: ./sfx_library)'
    )
    parser.add_argument(
        '--provider',
        choices=['elevenlabs', 'audiocraft'],
        default='elevenlabs',
        help='Generation provider (default: elevenlabs)'
    )
    parser.add_argument(
        '--model',
        choices=['audiogen', 'musicgen'],
        default='audiogen',
        help='Model to use for AudioCraft generation (default: audiogen)'
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

    print(f"Creating SFX library structure in: {args.output}", file=sys.stderr)
    print("", file=sys.stderr)

    # Generate metadata
    metadata = generate_library_metadata(args.output)

    # Generate batch script
    script_path = generate_generation_script(args.output, args.model, args.provider)

    print("", file=sys.stderr)
    print_library_stats()

    print("✓ Setup complete!", file=sys.stderr)
    print("", file=sys.stderr)
    print("Next steps:", file=sys.stderr)
    print(f"  1. Review the library structure: {args.output}/library_metadata.json", file=sys.stderr)

    if args.provider == 'elevenlabs':
        print(f"  2. Set your API key: export ELEVENLABS_API_KEY=your_key_here", file=sys.stderr)
        print(f"  3. Run the batch generation: {script_path}", file=sys.stderr)
        print(f"  4. Wait for completion (20-40 minutes, costs ~7,200 credits)", file=sys.stderr)
    else:
        print(f"  2. Run the batch generation: {script_path}", file=sys.stderr)
        print(f"  3. Wait for completion (several hours)", file=sys.stderr)

    print(f"  5. Review and curate the generated sounds", file=sys.stderr)
    print("", file=sys.stderr)


if __name__ == '__main__':
    main()
