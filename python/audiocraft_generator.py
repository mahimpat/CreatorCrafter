#!/usr/bin/env python3
"""
AudioCraft SFX Generator
Generates sound effects using Meta's AudioCraft AudioGen model.
"""

import argparse
import json
import sys
from pathlib import Path

try:
    from audiocraft.models import AudioGen, MusicGen
    from audiocraft.data.audio import audio_write
    import torch
except ImportError as e:
    print("Error: AudioCraft not installed.", file=sys.stderr)
    print("AudioCraft has complex dependencies and may require manual installation.", file=sys.stderr)
    print("", file=sys.stderr)
    print("Try one of these methods:", file=sys.stderr)
    print("1. pip install 'audiocraft @ git+https://github.com/facebookresearch/audiocraft.git'", file=sys.stderr)
    print("2. Clone and install from source:", file=sys.stderr)
    print("   git clone https://github.com/facebookresearch/audiocraft.git", file=sys.stderr)
    print("   cd audiocraft && pip install -e .", file=sys.stderr)
    print("", file=sys.stderr)
    print(f"Original error: {e}", file=sys.stderr)
    sys.exit(1)


def generate_sfx(prompt: str, duration: float, output_path: str, model_type: str = 'audiogen'):
    """
    Generate sound effect or music using AudioCraft.

    Args:
        prompt: Text description of the desired sound/music
        duration: Duration in seconds
        output_path: Path to save the generated audio
        model_type: 'audiogen' for sound effects/foley, 'musicgen' for background music
    """
    try:
        # Choose model based on type
        if model_type.lower() == 'musicgen':
            print("Loading MusicGen model (for background music)...", file=sys.stderr)
            model = MusicGen.get_pretrained('facebook/musicgen-small')
            print("MusicGen model loaded successfully.", file=sys.stderr)
        else:
            print("Loading AudioGen model (for sound effects)...", file=sys.stderr)
            model = AudioGen.get_pretrained('facebook/audiogen-medium')
            print("AudioGen model loaded successfully.", file=sys.stderr)

        # Set generation parameters
        model.set_generation_params(
            duration=duration,
            temperature=1.0,
            top_k=250,
            top_p=0.0,
            cfg_coef=3.0
        )

        # Generate audio
        audio_type = "music" if model_type.lower() == 'musicgen' else "sound effect"
        print(f"Generating {audio_type} for: {prompt}", file=sys.stderr)
        descriptions = [prompt]
        wav = model.generate(descriptions)
        print(f"{audio_type.capitalize()} generation completed.", file=sys.stderr)

        # Save the audio file
        output_dir = Path(output_path).parent
        output_name = Path(output_path).stem

        # audio_write saves as WAV by default
        audio_write(
            str(output_dir / output_name),
            wav[0].cpu(),
            model.sample_rate,
            strategy="loudness",
            loudness_compressor=True
        )

        print(f"Success: Generated SFX saved to {output_path}")

    except Exception as e:
        print(f"Error generating SFX: {str(e)}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Generate sound effects or music using AudioCraft')
    parser.add_argument('--prompt', required=True, help='Text description of the sound effect or music')
    parser.add_argument('--duration', type=float, required=True, help='Duration in seconds')
    parser.add_argument('--output', required=True, help='Output file path')
    parser.add_argument('--model',
                        choices=['audiogen', 'musicgen'],
                        default='audiogen',
                        help='Model to use: audiogen (sound effects/foley) or musicgen (background music)')

    args = parser.parse_args()

    # Validate duration
    if args.duration <= 0 or args.duration > 30:
        print("Error: Duration must be between 0 and 30 seconds", file=sys.stderr)
        sys.exit(1)

    generate_sfx(args.prompt, args.duration, args.output, args.model)


if __name__ == '__main__':
    main()
