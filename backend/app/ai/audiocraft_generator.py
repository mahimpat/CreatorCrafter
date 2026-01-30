"""
AudioCraft SFX Generator
Adapted from the original Electron app's Python script.
Generates sound effects using Meta's AudioCraft AudioGen model.
"""
from typing import Callable, Optional
from pathlib import Path
import sys

# Lazy load model to save memory
_audiogen_model = None


def get_audiogen_model():
    """Lazy load AudioGen model."""
    global _audiogen_model
    if _audiogen_model is None:
        from audiocraft.models import AudioGen
        from app.config import settings
        _audiogen_model = AudioGen.get_pretrained(settings.AUDIOGEN_MODEL)
    return _audiogen_model


def generate_sfx(
    prompt: str,
    duration: float,
    output_path: str,
    progress_callback: Optional[Callable[[str, int], None]] = None
) -> str:
    """
    Generate sound effect using AudioCraft.

    Args:
        prompt: Text description of the desired sound effect
        duration: Duration in seconds (max 30)
        output_path: Path to save the generated audio
        progress_callback: Optional callback(stage, progress_percent)

    Returns:
        Path to the generated audio file
    """
    from audiocraft.data.audio import audio_write

    try:
        if progress_callback:
            progress_callback("loading_model", 10)

        model = get_audiogen_model()

        if progress_callback:
            progress_callback("model_loaded", 30)

        # Set generation parameters
        model.set_generation_params(
            duration=duration,
            temperature=1.0,
            top_k=250,
            top_p=0.0,
            cfg_coef=3.0
        )

        if progress_callback:
            progress_callback("generating", 40)

        # Generate audio
        descriptions = [prompt]
        wav = model.generate(descriptions)

        if progress_callback:
            progress_callback("saving", 90)

        # Save the audio file
        output_dir = Path(output_path).parent
        output_name = Path(output_path).stem

        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)

        # audio_write saves as WAV by default
        audio_write(
            str(output_dir / output_name),
            wav[0].cpu(),
            model.sample_rate,
            strategy="loudness",
            loudness_compressor=True
        )

        if progress_callback:
            progress_callback("completed", 100)

        return output_path

    except Exception as e:
        print(f"Error generating SFX: {str(e)}", file=sys.stderr)
        raise
