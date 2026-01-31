"""
SFX Generator using ElevenLabs API
Generates sound effects using ElevenLabs Sound Effects API.
"""
from typing import Callable, Optional
from pathlib import Path
import sys
import requests
import os


def generate_sfx(
    prompt: str,
    duration: float,
    output_path: str,
    progress_callback: Optional[Callable[[str, int], None]] = None
) -> str:
    """
    Generate sound effect using ElevenLabs Sound Effects API.

    Args:
        prompt: Text description of the desired sound effect
        duration: Duration in seconds (used as duration_seconds parameter)
        output_path: Path to save the generated audio
        progress_callback: Optional callback(stage, progress_percent)

    Returns:
        Path to the generated audio file
    """
    from app.config import settings

    try:
        if not settings.ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY not configured. Please set it in .env file.")

        if progress_callback:
            progress_callback("preparing", 10)

        # ElevenLabs Sound Effects API endpoint
        url = "https://api.elevenlabs.io/v1/sound-generation"

        headers = {
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }

        # Request body
        # duration_seconds: Optional, between 0.5 and 22 seconds
        # prompt_influence: How closely to follow the prompt (0-1, default 0.3)
        payload = {
            "text": prompt,
            "duration_seconds": min(max(duration, 0.5), 22),  # Clamp between 0.5 and 22
            "prompt_influence": 0.5  # Balanced between prompt and naturalness
        }

        if progress_callback:
            progress_callback("generating", 30)

        # Make the API request
        response = requests.post(url, json=payload, headers=headers, timeout=120)

        if response.status_code != 200:
            error_detail = response.text
            try:
                error_json = response.json()
                error_detail = error_json.get('detail', {}).get('message', response.text)
            except:
                pass
            raise Exception(f"ElevenLabs API error ({response.status_code}): {error_detail}")

        if progress_callback:
            progress_callback("saving", 80)

        # Ensure output directory exists
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)

        # The API returns MP3 audio data directly
        # Save as MP3 first, then convert to WAV if needed
        mp3_path = output_path.replace('.wav', '.mp3')

        with open(mp3_path, 'wb') as f:
            f.write(response.content)

        # Convert MP3 to WAV using ffmpeg for consistency with the rest of the system
        if output_path.endswith('.wav'):
            import subprocess
            try:
                subprocess.run([
                    'ffmpeg', '-y', '-i', mp3_path,
                    '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2',
                    output_path
                ], check=True, capture_output=True)
                # Remove the temporary MP3 file
                os.remove(mp3_path)
            except subprocess.CalledProcessError as e:
                # If ffmpeg fails, just use the MP3
                print(f"Warning: Could not convert to WAV, using MP3: {e}", file=sys.stderr)
                output_path = mp3_path
            except FileNotFoundError:
                # ffmpeg not available, use MP3
                print("Warning: ffmpeg not found, using MP3 format", file=sys.stderr)
                output_path = mp3_path

        if progress_callback:
            progress_callback("completed", 100)

        return output_path

    except requests.exceptions.Timeout:
        raise Exception("ElevenLabs API request timed out. Please try again.")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to ElevenLabs API. Check your internet connection.")
    except Exception as e:
        print(f"Error generating SFX: {str(e)}", file=sys.stderr)
        raise


def get_generation_info() -> dict:
    """
    Get information about the SFX generation service.

    Returns:
        Dict with service info
    """
    from app.config import settings

    return {
        "service": "elevenlabs",
        "configured": bool(settings.ELEVENLABS_API_KEY),
        "max_duration": 22,
        "min_duration": 0.5,
        "supported_formats": ["mp3", "wav"]
    }
