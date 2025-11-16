#!/usr/bin/env python3
"""
Final Touches SFX Library Generator
Last high-value sounds to complete the library
"""

import os
import sys
import json
import argparse
from datetime import datetime

# Standard duration for all SFX (3 seconds provides good material that can be trimmed/looped)
DEFAULT_DURATION = 3.0

FINAL_TOUCHES = {
    "vehicles": {
        "description": "Vehicle and transportation sounds",
        "sounds": [
            {"name": "car-honk", "prompt": "car horn honk sound effect, vehicle beep", "duration": DEFAULT_DURATION, "tags": ["car", "horn", "honk", "vehicle"]},
            {"name": "car-engine-start", "prompt": "car engine starting sound effect, ignition turn on", "duration": DEFAULT_DURATION, "tags": ["car", "engine", "start", "ignition"]},
            {"name": "motorcycle-rev", "prompt": "motorcycle engine revving sound, bike acceleration", "duration": DEFAULT_DURATION, "tags": ["motorcycle", "rev", "bike", "engine"]},
            {"name": "airplane-flyby", "prompt": "airplane flying by sound effect, jet passing overhead", "duration": DEFAULT_DURATION, "tags": ["airplane", "jet", "flyby", "sky"]},
        ]
    },

    "horror": {
        "description": "Horror and scary sound effects",
        "sounds": [
            {"name": "creepy-ambience", "prompt": "creepy horror ambience sound, eerie atmosphere", "duration": DEFAULT_DURATION, "tags": ["creepy", "horror", "eerie", "ambience"]},
            {"name": "scream-horror", "prompt": "horror scream sound effect, terrified woman screaming", "duration": DEFAULT_DURATION, "tags": ["scream", "horror", "scared", "fear"]},
            {"name": "music-box-creepy", "prompt": "creepy music box sound, haunted toy playing slowly", "duration": DEFAULT_DURATION, "tags": ["music", "box", "creepy", "haunted"]},
        ]
    },

    "sports": {
        "description": "Sports and action sounds",
        "sounds": [
            {"name": "crowd-cheer", "prompt": "crowd cheering sound effect, stadium audience applause", "duration": DEFAULT_DURATION, "tags": ["crowd", "cheer", "applause", "stadium"]},
            {"name": "whistle-blow", "prompt": "referee whistle blow sound effect, sports whistle", "duration": DEFAULT_DURATION, "tags": ["whistle", "blow", "referee", "sports"]},
            {"name": "basketball-bounce", "prompt": "basketball bouncing sound effect, ball dribbling on court", "duration": DEFAULT_DURATION, "tags": ["basketball", "bounce", "dribble", "ball"]},
        ]
    },

    "food": {
        "description": "Food and cooking sounds",
        "sounds": [
            {"name": "sizzle-cooking", "prompt": "food sizzling sound effect, frying pan cooking", "duration": DEFAULT_DURATION, "tags": ["sizzle", "cooking", "fry", "food"]},
            {"name": "knife-chop", "prompt": "knife chopping vegetables sound, cutting on board", "duration": DEFAULT_DURATION, "tags": ["knife", "chop", "cut", "cooking"]},
            {"name": "liquid-pour", "prompt": "liquid pouring sound effect, water into glass", "duration": DEFAULT_DURATION, "tags": ["pour", "liquid", "water", "drink"]},
        ]
    }
}


def generate_library_metadata(output_dir: str):
    """Generate metadata JSON with all sound information"""

    metadata = {
        "version": "4.0.0",
        "name": "Final Touches Pack",
        "generated_at": datetime.now().isoformat(),
        "total_sounds": sum(len(cat["sounds"]) for cat in FINAL_TOUCHES.values()),
        "categories": FINAL_TOUCHES
    }

    metadata_path = os.path.join(output_dir, 'final_touches_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"✓ Generated metadata: {metadata_path}", file=sys.stderr)
    return metadata


def generate_generation_script(output_dir: str):
    """Generate bash script for ElevenLabs batch generation"""

    script_lines = [
        "#!/bin/bash",
        "# Final Touches SFX Library Generator (ElevenLabs API)",
        f"# Generated on {datetime.now().isoformat()}",
        "",
        "set -e  # Exit on error",
        "",
        "# Check for API key",
        "if [ -z \"$ELEVENLABS_API_KEY\" ]; then",
        "  echo 'Error: ELEVENLABS_API_KEY environment variable not set'",
        "  echo 'Usage: ELEVENLABS_API_KEY=your_key_here ./generate_final_touches.sh'",
        "  exit 1",
        "fi",
        "",
        "SCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"",
        f"OUTPUT_DIR=\"{output_dir}\"",
        "PYTHON_SCRIPT=\"$SCRIPT_DIR/../python/elevenlabs_sfx_generator.py\"",
        "",
        "echo 'Starting Final Touches SFX generation...'",
        "echo 'Total sounds: 13'",
        "echo 'Estimated cost: 1,560 credits (13 sounds × 3s × 40 credits/s)'",
        "echo 'Estimated time: 5-10 minutes'",
        "echo ''",
        "",
        "# Create category directories",
    ]

    # Add directory creation
    for category in FINAL_TOUCHES.keys():
        script_lines.append(f"mkdir -p \"$OUTPUT_DIR/{category}\"")

    script_lines.append("")
    script_lines.append("# Generate sounds")
    script_lines.append("")

    total_sounds = sum(len(cat["sounds"]) for cat in FINAL_TOUCHES.values())
    current = 0

    for category, data in FINAL_TOUCHES.items():
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
        "echo 'Final Touches generation complete!'",
        "echo 'Generated sounds saved to: $OUTPUT_DIR'",
        "echo ''",
        "echo '🎉 LIBRARY COMPLETE! 🎉'",
        "echo 'Total library size: 149 professional sound effects'",
    ])

    script_path = os.path.join(output_dir, 'generate_final_touches.sh')
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

    print("\n=== Final Touches Library ===\n", file=sys.stderr)

    for category, data in FINAL_TOUCHES.items():
        count = len(data["sounds"])
        total += count
        print(f"{category.upper()}: {count} sounds", file=sys.stderr)
        print(f"  {data['description']}", file=sys.stderr)
        print("", file=sys.stderr)

    print(f"TOTAL: {total} sound effects", file=sys.stderr)
    print(f"ESTIMATED COST: {total * 120} credits ({total} sounds × 3s × 40 credits/s)", file=sys.stderr)
    print(f"CREDITS REMAINING: ~100 credits after generation", file=sys.stderr)
    print("", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description='Generate Final Touches SFX library structure'
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

    print(f"Creating Final Touches library in: {args.output}", file=sys.stderr)
    print("", file=sys.stderr)

    # Generate metadata
    metadata = generate_library_metadata(args.output)

    # Generate batch script
    script_path = generate_generation_script(args.output)

    print_library_stats()

    print("✓ Setup complete!", file=sys.stderr)
    print("", file=sys.stderr)
    print("Next steps:", file=sys.stderr)
    print(f"  1. Review the library: {args.output}/final_touches_metadata.json", file=sys.stderr)
    print(f"  2. Set your API key: export ELEVENLABS_API_KEY=your_key_here", file=sys.stderr)
    print(f"  3. Run generation: {script_path}", file=sys.stderr)
    print(f"  4. Wait ~5-10 minutes", file=sys.stderr)
    print(f"  5. Enjoy your complete 149-sound library! 🎵", file=sys.stderr)
    print("", file=sys.stderr)


if __name__ == '__main__':
    main()
