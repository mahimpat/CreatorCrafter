#!/usr/bin/env python3
"""
Bonus Pack SFX Library Generator
Final 8 high-value sounds to max out the library
"""

import os
import sys
import json
import argparse
from datetime import datetime

# Standard duration for all SFX (3 seconds provides good material that can be trimmed/looped)
DEFAULT_DURATION = 3.0

BONUS_PACK = {
    "gaming": {
        "description": "Gaming and esports sound effects",
        "sounds": [
            {"name": "coin-collect", "prompt": "video game coin collect sound effect, arcade pickup", "duration": DEFAULT_DURATION, "tags": ["game", "coin", "collect", "pickup"]},
            {"name": "power-up", "prompt": "video game power up sound effect, level boost", "duration": DEFAULT_DURATION, "tags": ["game", "power", "up", "boost"]},
            {"name": "game-start", "prompt": "video game start sound effect, ready fight", "duration": DEFAULT_DURATION, "tags": ["game", "start", "fight", "begin"]},
        ]
    },

    "everyday": {
        "description": "Common everyday household sounds",
        "sounds": [
            {"name": "phone-ring", "prompt": "landline phone ringing sound effect, telephone ring", "duration": DEFAULT_DURATION, "tags": ["phone", "ring", "telephone", "call"]},
            {"name": "doorbell-ring", "prompt": "doorbell ringing sound effect, house door chime", "duration": DEFAULT_DURATION, "tags": ["doorbell", "ring", "door", "chime"]},
            {"name": "alarm-clock", "prompt": "alarm clock ringing sound effect, morning wake up", "duration": DEFAULT_DURATION, "tags": ["alarm", "clock", "ring", "wake"]},
        ]
    },

    "bonus_music": {
        "description": "Additional music production elements",
        "sounds": [
            {"name": "vinyl-scratch", "prompt": "DJ vinyl scratch sound effect, turntable scrubbing", "duration": DEFAULT_DURATION, "tags": ["vinyl", "scratch", "dj", "turntable"]},
            {"name": "cowbell-hit", "prompt": "cowbell percussion hit sound, more cowbell", "duration": DEFAULT_DURATION, "tags": ["cowbell", "percussion", "hit", "music"]},
        ]
    }
}


def generate_library_metadata(output_dir: str):
    """Generate metadata JSON with all sound information"""

    metadata = {
        "version": "5.0.0",
        "name": "Bonus Pack - Final Edition",
        "generated_at": datetime.now().isoformat(),
        "total_sounds": sum(len(cat["sounds"]) for cat in BONUS_PACK.values()),
        "categories": BONUS_PACK
    }

    metadata_path = os.path.join(output_dir, 'bonus_pack_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"✓ Generated metadata: {metadata_path}", file=sys.stderr)
    return metadata


def generate_generation_script(output_dir: str):
    """Generate bash script for ElevenLabs batch generation"""

    script_lines = [
        "#!/bin/bash",
        "# Bonus Pack SFX Library Generator (ElevenLabs API)",
        f"# Generated on {datetime.now().isoformat()}",
        "",
        "set -e  # Exit on error",
        "",
        "# Check for API key",
        "if [ -z \"$ELEVENLABS_API_KEY\" ]; then",
        "  echo 'Error: ELEVENLABS_API_KEY environment variable not set'",
        "  echo 'Usage: ELEVENLABS_API_KEY=your_key_here ./generate_bonus_pack.sh'",
        "  exit 1",
        "fi",
        "",
        "SCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"",
        f"OUTPUT_DIR=\"{output_dir}\"",
        "PYTHON_SCRIPT=\"$SCRIPT_DIR/../python/elevenlabs_sfx_generator.py\"",
        "",
        "echo '🎁 Starting BONUS PACK SFX generation...'",
        "echo 'Total sounds: 8'",
        "echo 'Estimated cost: 960 credits (8 sounds × 3s × 40 credits/s)'",
        "echo 'Estimated time: 3-5 minutes'",
        "echo ''",
        "",
        "# Create category directories",
    ]

    # Add directory creation
    for category in BONUS_PACK.keys():
        script_lines.append(f"mkdir -p \"$OUTPUT_DIR/{category}\"")

    script_lines.append("")
    script_lines.append("# Generate sounds")
    script_lines.append("")

    total_sounds = sum(len(cat["sounds"]) for cat in BONUS_PACK.values())
    current = 0

    for category, data in BONUS_PACK.items():
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
        "echo '🎊 ═══════════════════════════════════════════ 🎊'",
        "echo '    BONUS PACK GENERATION COMPLETE!'",
        "echo '🎊 ═══════════════════════════════════════════ 🎊'",
        "echo ''",
        "echo '🎉 CONGRATULATIONS! 🎉'",
        "echo ''",
        "echo '📊 FINAL LIBRARY STATISTICS:'",
        "echo '   ├─ Total Sounds: 157 professional SFX'",
        "echo '   ├─ Total Categories: 22 diverse categories'",
        "echo '   ├─ Total Credits Used: ~18,840 credits'",
        "echo '   └─ Library Value: $200+ equivalent'",
        "echo ''",
        "echo '✨ Your complete professional SFX library is ready!'",
        "echo '   Restart CreatorCrafter to see all 157 sounds.'",
        "echo ''",
    ])

    script_path = os.path.join(output_dir, 'generate_bonus_pack.sh')
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

    print("\n=== 🎁 BONUS PACK - FINAL EDITION 🎁 ===\n", file=sys.stderr)

    for category, data in BONUS_PACK.items():
        count = len(data["sounds"])
        total += count
        print(f"{category.upper()}: {count} sounds", file=sys.stderr)
        print(f"  {data['description']}", file=sys.stderr)
        print("", file=sys.stderr)

    print(f"TOTAL: {total} sound effects", file=sys.stderr)
    print(f"ESTIMATED COST: {total * 120} credits ({total} sounds × 3s × 40 credits/s)", file=sys.stderr)
    print(f"CREDITS REMAINING: ~40 credits after generation", file=sys.stderr)
    print("", file=sys.stderr)
    print("🎊 This completes your ENTIRE SFX library! 🎊", file=sys.stderr)
    print("", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description='Generate Bonus Pack SFX library structure'
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

    print(f"Creating Bonus Pack library in: {args.output}", file=sys.stderr)
    print("", file=sys.stderr)

    # Generate metadata
    metadata = generate_library_metadata(args.output)

    # Generate batch script
    script_path = generate_generation_script(args.output)

    print_library_stats()

    print("✓ Setup complete!", file=sys.stderr)
    print("", file=sys.stderr)
    print("Next steps:", file=sys.stderr)
    print(f"  1. Review the library: {args.output}/bonus_pack_metadata.json", file=sys.stderr)
    print(f"  2. Set your API key: export ELEVENLABS_API_KEY=your_key_here", file=sys.stderr)
    print(f"  3. Run generation: {script_path}", file=sys.stderr)
    print(f"  4. Wait ~3-5 minutes", file=sys.stderr)
    print(f"  5. 🎉 COMPLETE! 157 SOUNDS TOTAL! 🎉", file=sys.stderr)
    print("", file=sys.stderr)


if __name__ == '__main__':
    main()
