"""
SFX Generator using ElevenLabs Sound Effects V2 API

Uses the eleven_text_to_sound_v2 model for best quality:
- 48 kHz professional audio quality (direct PCM output)
- Up to 30 seconds duration
- Seamless looping support
- Balanced prompt_influence (0.3) for natural sound generation
- Prompt preprocessing optimized for ElevenLabs
- Retry logic with exponential backoff
"""
from typing import Callable, Optional
from pathlib import Path
import sys
import requests
import os
import re
import time


def preprocess_prompt_for_elevenlabs(prompt: str) -> str:
    """
    Preprocess and optimize the prompt for ElevenLabs Sound Effects API.

    ElevenLabs works best with:
    - Specific, concrete sound descriptions
    - Action-oriented language
    - No abstract concepts or emotions
    - Present tense, active voice
    - Onomatopoeia and sound-specific words

    Args:
        prompt: Raw prompt from video analysis

    Returns:
        Optimized prompt for ElevenLabs
    """
    # Remove common filler words that don't help sound generation
    filler_words = [
        'ambience', 'ambiance', 'sounds of', 'sound of', 'the sound of',
        'atmosphere', 'background', 'ambient', 'general', 'typical',
        'natural', 'realistic', 'authentic', 'high quality'
    ]

    processed = prompt.lower()
    for word in filler_words:
        processed = processed.replace(word, '')

    # Clean up extra spaces
    processed = re.sub(r'\s+', ' ', processed).strip()

    # Ensure prompt isn't too long (ElevenLabs works better with concise prompts)
    # Split into sentences and take the most descriptive ones
    sentences = re.split(r'[,.]', processed)

    # Filter out very short fragments and prioritize action words
    action_words = ['ing', 'click', 'whoosh', 'thud', 'crash', 'bang', 'pop',
                   'hum', 'buzz', 'creak', 'splash', 'crack', 'snap', 'boom',
                   'rumble', 'roar', 'whistle', 'hiss', 'sizzle', 'crackle']

    scored_sentences = []
    for s in sentences:
        s = s.strip()
        if len(s) < 5:
            continue
        # Score by presence of action/sound words
        score = sum(1 for word in action_words if word in s.lower())
        # Boost sentences with onomatopoeia
        if any(ono in s.lower() for ono in ['whoosh', 'thud', 'bang', 'pop', 'buzz', 'hiss', 'boom']):
            score += 2
        scored_sentences.append((s, score))

    # Sort by score and take top sentences up to ~200 chars
    scored_sentences.sort(key=lambda x: x[1], reverse=True)

    result_parts = []
    total_len = 0
    for sentence, score in scored_sentences:
        if total_len + len(sentence) < 250:
            result_parts.append(sentence)
            total_len += len(sentence)

    result = ', '.join(result_parts) if result_parts else processed[:250]

    # Final cleanup
    result = re.sub(r'\s+', ' ', result).strip()
    result = result.strip(',').strip()

    # Capitalize first letter
    if result:
        result = result[0].upper() + result[1:]

    return result


def generate_sfx(
    prompt: str,
    duration: float,
    output_path: str,
    progress_callback: Optional[Callable[[str, int], None]] = None,
    loop: bool = False
) -> str:
    """
    Generate sound effect using ElevenLabs Sound Effects V2 API.

    Uses the latest eleven_text_to_sound_v2 model with:
    - 48 kHz professional audio quality
    - Up to 30 seconds duration
    - Optional seamless looping
    - Direct PCM output (no lossy MP3 conversion)

    Args:
        prompt: Text description of the desired sound effect
        duration: Duration in seconds (0.5-30 seconds)
        output_path: Path to save the generated audio
        progress_callback: Optional callback(stage, progress_percent)
        loop: If True, generates seamlessly looping audio

    Returns:
        Path to the generated audio file
    """
    from app.config import settings

    try:
        if not settings.ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY not configured. Please set it in .env file.")

        if progress_callback:
            progress_callback("preparing", 10)

        # Preprocess the prompt for optimal ElevenLabs results
        optimized_prompt = preprocess_prompt_for_elevenlabs(prompt)

        print(f"Original prompt: {prompt[:100]}...", file=sys.stderr)
        print(f"Optimized prompt: {optimized_prompt}", file=sys.stderr)

        # ElevenLabs Sound Effects V2 API endpoint
        # Request PCM 48kHz format directly for best quality (no MP3 conversion needed)
        url = "https://api.elevenlabs.io/v1/sound-generation?output_format=pcm_48000"

        headers = {
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }

        # V2 model parameters
        # - model_id: eleven_text_to_sound_v2 for best quality
        # - duration_seconds: V2 supports up to 30 seconds
        # - prompt_influence: 0.3 for natural sound with creative freedom
        # - loop: V2 exclusive feature for seamless looping
        payload = {
            "text": optimized_prompt,
            "model_id": "eleven_text_to_sound_v2",
            "duration_seconds": min(max(duration, 0.5), 30),  # V2 supports up to 30 seconds
            "prompt_influence": 0.3,  # Balanced for natural sound quality
            "loop": loop  # V2 exclusive: seamless looping
        }

        if progress_callback:
            progress_callback("generating", 30)

        # Retry logic for reliability
        max_retries = 3
        last_error = None

        for attempt in range(max_retries):
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=120)

                if response.status_code == 200:
                    break
                elif response.status_code == 429:  # Rate limited
                    wait_time = (attempt + 1) * 5  # Exponential backoff
                    print(f"Rate limited, waiting {wait_time}s before retry...", file=sys.stderr)
                    time.sleep(wait_time)
                    continue
                elif response.status_code >= 500:  # Server error
                    wait_time = (attempt + 1) * 2
                    print(f"Server error, waiting {wait_time}s before retry...", file=sys.stderr)
                    time.sleep(wait_time)
                    continue
                else:
                    # Client error, don't retry
                    error_detail = response.text
                    try:
                        error_json = response.json()
                        error_detail = error_json.get('detail', {}).get('message', response.text)
                    except:
                        pass
                    raise Exception(f"ElevenLabs API error ({response.status_code}): {error_detail}")

            except requests.exceptions.Timeout:
                last_error = "Request timed out"
                if attempt < max_retries - 1:
                    print(f"Timeout, retrying ({attempt + 1}/{max_retries})...", file=sys.stderr)
                    time.sleep(2)
                    continue
            except requests.exceptions.ConnectionError:
                last_error = "Connection failed"
                if attempt < max_retries - 1:
                    print(f"Connection error, retrying ({attempt + 1}/{max_retries})...", file=sys.stderr)
                    time.sleep(2)
                    continue
        else:
            # All retries failed
            if last_error:
                raise Exception(f"ElevenLabs API failed after {max_retries} attempts: {last_error}")
            raise Exception(f"ElevenLabs API error after {max_retries} attempts")

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

        # V2 API with output_format=pcm_48000 returns raw PCM data
        # We need to wrap it in a WAV header for proper playback
        import wave

        pcm_data = response.content

        # PCM 48kHz, 16-bit, mono from ElevenLabs
        sample_rate = 48000
        num_channels = 1
        sample_width = 2  # 16-bit = 2 bytes

        # Ensure output path has .wav extension
        if not output_path.endswith('.wav'):
            output_path = output_path.rsplit('.', 1)[0] + '.wav'

        # Write WAV file with proper headers
        with wave.open(output_path, 'wb') as wav_file:
            wav_file.setnchannels(num_channels)
            wav_file.setsampwidth(sample_width)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_data)

        print(f"Saved {len(pcm_data)} bytes of 48kHz PCM audio to WAV", file=sys.stderr)

        if progress_callback:
            progress_callback("completed", 100)

        print(f"SFX generated successfully: {output_path}", file=sys.stderr)
        return output_path

    except requests.exceptions.Timeout:
        raise Exception("ElevenLabs API request timed out. Please try again.")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to ElevenLabs API. Check your internet connection.")
    except Exception as e:
        print(f"Error generating SFX: {str(e)}", file=sys.stderr)
        raise


def generate_sfx_with_variations(
    prompt: str,
    duration: float,
    output_path: str,
    variations: int = 1,
    progress_callback: Optional[Callable[[str, int], None]] = None
) -> list:
    """
    Generate multiple variations of a sound effect.
    Useful for A/B testing or choosing the best result.

    Args:
        prompt: Text description of the desired sound effect
        duration: Duration in seconds
        output_path: Base path for output files (will add _v1, _v2, etc.)
        variations: Number of variations to generate (1-3)
        progress_callback: Optional callback(stage, progress_percent)

    Returns:
        List of paths to generated audio files
    """
    variations = min(max(variations, 1), 3)  # Limit to 1-3

    paths = []
    base_path = output_path.rsplit('.', 1)
    ext = base_path[1] if len(base_path) > 1 else 'wav'
    base = base_path[0]

    for i in range(variations):
        if variations == 1:
            var_path = output_path
        else:
            var_path = f"{base}_v{i+1}.{ext}"

        result = generate_sfx(
            prompt=prompt,
            duration=duration,
            output_path=var_path,
            progress_callback=progress_callback
        )
        paths.append(result)

        # Small delay between requests to avoid rate limiting
        if i < variations - 1:
            time.sleep(1)

    return paths


def get_generation_info() -> dict:
    """
    Get information about the SFX generation service.

    Returns:
        Dict with service info
    """
    from app.config import settings

    return {
        "service": "elevenlabs",
        "model": "eleven_text_to_sound_v2",
        "configured": bool(settings.ELEVENLABS_API_KEY),
        "max_duration": 30,  # V2 supports up to 30 seconds
        "min_duration": 0.5,
        "audio_quality": "48kHz PCM (professional quality)",
        "supported_formats": ["wav"],  # Direct PCM output, no lossy conversion
        "prompt_influence": 0.3,
        "features": [
            "ElevenLabs V2 model (latest)",
            "48 kHz professional audio quality",
            "Direct PCM output (no lossy MP3 conversion)",
            "Seamless looping support",
            "Up to 30 seconds duration",
            "Optimized prompt preprocessing",
            "Automatic retry on failures",
            "Rate limit handling"
        ]
    }
