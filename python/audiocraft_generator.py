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
    from audiocraft.models import AudioGen
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


def generate_sfx(prompt: str, duration: float, output_path: str):
    """
    Generate sound effect using AudioCraft.

    Args:
        prompt: Text description of the desired sound effect
        duration: Duration in seconds
        output_path: Path to save the generated audio
    """
    try:
        print("Loading AudioGen model...", file=sys.stderr)
        # Load the AudioGen model (medium is the only available pretrained model)
        model = AudioGen.get_pretrained('facebook/audiogen-medium')
        print("Model loaded successfully.", file=sys.stderr)

        # Set generation parameters
        model.set_generation_params(
            duration=duration,
            temperature=1.0,
            top_k=250,
            top_p=0.0,
            cfg_coef=3.0
        )

        # Generate audio
        print(f"Generating audio for: {prompt}", file=sys.stderr)
        descriptions = [prompt]
        wav = model.generate(descriptions)
        print("Audio generation completed.", file=sys.stderr)

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
    parser = argparse.ArgumentParser(description='Generate sound effects using AudioCraft')
    parser.add_argument('--prompt', required=True, help='Text description of the sound effect')
    parser.add_argument('--duration', type=float, required=True, help='Duration in seconds')
    parser.add_argument('--output', required=True, help='Output file path')

    args = parser.parse_args()

    # Validate duration
    if args.duration <= 0 or args.duration > 30:
        print("Error: Duration must be between 0 and 30 seconds", file=sys.stderr)
        sys.exit(1)

    generate_sfx(args.prompt, args.duration, args.output)


if __name__ == '__main__':
    main()
