#!/usr/bin/env python3
"""
Model Download Script
Downloads all required AI models for the application during setup/deployment.
"""

import sys
import os
from pathlib import Path

def download_audiocraft_models():
    """Download AudioCraft models to local cache."""
    print("Downloading AudioCraft models...")

    try:
        from audiocraft.models import AudioGen
        print("Loading AudioGen model (this will download it)...")

        # This will download the model to the Hugging Face cache
        model = AudioGen.get_pretrained('facebook/audiogen-medium')
        print("✓ AudioGen model downloaded successfully")

        # Clean up memory
        del model

    except ImportError as e:
        print(f"Error: AudioCraft not installed: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error downloading AudioGen model: {e}", file=sys.stderr)
        return False

    return True

def download_whisper_models():
    """Download Whisper models to local cache."""
    print("Downloading Whisper models...")

    try:
        import whisper

        # Download base model (good balance of speed and accuracy)
        print("Loading Whisper base model...")
        model = whisper.load_model("base")
        print("✓ Whisper base model downloaded successfully")

        # Clean up memory
        del model

    except ImportError as e:
        print(f"Error: Whisper not installed: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error downloading Whisper model: {e}", file=sys.stderr)
        return False

    return True

def download_blip_models():
    """Download BLIP models to local cache."""
    print("Downloading BLIP models...")

    try:
        from transformers import BlipProcessor, BlipForConditionalGeneration

        print("Loading BLIP processor and model...")
        processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
        print("✓ BLIP models downloaded successfully")

        # Clean up memory
        del processor, model

    except ImportError as e:
        print(f"Error: Transformers not installed: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error downloading BLIP model: {e}", file=sys.stderr)
        return False

    return True

def main():
    """Download all required models."""
    print("Starting model download process...")
    print("This may take several minutes on first run...")
    print("-" * 50)

    success = True

    # Download models
    if not download_whisper_models():
        success = False

    print()

    if not download_blip_models():
        success = False

    print()

    if not download_audiocraft_models():
        success = False

    print("-" * 50)

    if success:
        print("✓ All models downloaded successfully!")
        print("The application is ready to use.")
        return 0
    else:
        print("✗ Some models failed to download.")
        print("Please check your internet connection and try again.")
        return 1

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)