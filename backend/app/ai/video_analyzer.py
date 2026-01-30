"""
Video Analyzer with Semantic Understanding
Adapted from the original Electron app's Python script.
Analyzes video content using vision models to understand context,
identify actions, and suggest contextual sound effects.
"""
from typing import Callable, Optional, Dict, Any, List
from pathlib import Path
import sys

# Lazy load models to save memory
_whisper_model = None
_vlm_model = None
_vlm_processor = None


def get_whisper_model():
    """Lazy load Whisper model for audio transcription."""
    global _whisper_model
    if _whisper_model is None:
        import whisper
        from app.config import settings
        _whisper_model = whisper.load_model(settings.WHISPER_MODEL)
    return _whisper_model


def get_vlm_model():
    """Lazy load vision-language model for image captioning and understanding."""
    global _vlm_model, _vlm_processor
    if _vlm_model is None:
        import torch
        from transformers import BlipProcessor, BlipForConditionalGeneration
        from app.config import settings

        _vlm_processor = BlipProcessor.from_pretrained(settings.BLIP_MODEL)
        _vlm_model = BlipForConditionalGeneration.from_pretrained(settings.BLIP_MODEL)
        if torch.cuda.is_available():
            _vlm_model = _vlm_model.to("cuda")
    return _vlm_model, _vlm_processor


def transcribe_audio(
    audio_path: str,
    progress_callback: Optional[Callable] = None
) -> List[Dict]:
    """
    Transcribe audio using OpenAI Whisper.

    Args:
        audio_path: Path to audio file
        progress_callback: Optional callback(stage, progress, message)

    Returns:
        List of transcription segments
    """
    try:
        model = get_whisper_model()

        if progress_callback:
            progress_callback("transcription", 15, "Running speech recognition...")

        result = model.transcribe(
            audio_path,
            language='en',
            task='transcribe',
            verbose=False
        )

        transcription = []
        for segment in result['segments']:
            transcription.append({
                'text': segment['text'].strip(),
                'start': segment['start'],
                'end': segment['end'],
                'confidence': segment.get('confidence', 0.9)
            })

        return transcription

    except Exception as e:
        print(f"Error transcribing audio: {str(e)}", file=sys.stderr)
        return []


def analyze_frame_content(frame, model, processor) -> Dict[str, Any]:
    """
    Dynamically analyze frame content using vision-language model.

    Args:
        frame: Video frame (BGR format from OpenCV)
        model: Vision-language model
        processor: Model processor

    Returns:
        Dict with dynamic description and extracted semantic info
    """
    import cv2
    import torch
    from PIL import Image

    # Convert BGR to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb_frame)

    # Generate natural language caption
    inputs = processor(pil_image, return_tensors="pt")
    if torch.cuda.is_available():
        inputs = {k: v.to("cuda") for k, v in inputs.items()}

    with torch.no_grad():
        # Generate general description
        out = model.generate(**inputs, max_length=50)
        general_description = processor.decode(out[0], skip_special_tokens=True)

        # Generate action-focused description
        action_prompt = "What is happening in this image?"
        action_inputs = processor(pil_image, action_prompt, return_tensors="pt")
        if torch.cuda.is_available():
            action_inputs = {k: v.to("cuda") for k, v in action_inputs.items()}

        action_out = model.generate(**action_inputs, max_length=50)
        action_description = processor.decode(action_out[0], skip_special_tokens=True)

        # Generate sound-focused description
        sound_prompt = "What sounds would you hear in this scene?"
        sound_inputs = processor(pil_image, sound_prompt, return_tensors="pt")
        if torch.cuda.is_available():
            sound_inputs = {k: v.to("cuda") for k, v in sound_inputs.items()}

        sound_out = model.generate(**sound_inputs, max_length=50)
        sound_description = processor.decode(sound_out[0], skip_special_tokens=True)

    return {
        'description': general_description,
        'action_description': action_description,
        'sound_description': sound_description,
        'confidence': 0.85
    }


def analyze_scenes(
    video_path: str,
    progress_callback: Optional[Callable] = None
) -> List[Dict]:
    """
    Dynamically analyze video using vision-language model.

    Args:
        video_path: Path to video file
        progress_callback: Optional callback(stage, progress, message)

    Returns:
        List of scenes with natural language descriptions
    """
    import cv2

    try:
        model, processor = get_vlm_model()

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps

        scenes = []
        frame_idx = 0

        # Analyze keyframes every 3 seconds
        sample_rate = int(fps * 3)
        total_samples = int(duration / 3)
        processed_samples = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_rate == 0:
                timestamp = frame_idx / fps

                # Analyze frame
                analysis = analyze_frame_content(frame, model, processor)

                scene = {
                    'timestamp': timestamp,
                    'type': 'dynamic_moment',
                    'description': analysis['description'],
                    'action_description': analysis['action_description'],
                    'sound_description': analysis['sound_description'],
                    'confidence': analysis['confidence']
                }

                scenes.append(scene)
                processed_samples += 1

                if progress_callback:
                    progress = int((processed_samples / max(total_samples, 1)) * 100)
                    progress_callback(
                        "scene_analysis",
                        40 + int(progress * 0.4),
                        f"Analyzing scene {processed_samples}/{total_samples}"
                    )

            frame_idx += 1

        cap.release()
        return scenes

    except Exception as e:
        print(f"Error analyzing scenes: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return []


def convert_visual_to_audio_description(
    visual_desc: str,
    action_desc: str,
    sound_desc: str
) -> str:
    """Convert visual descriptions into audio/SFX prompts."""
    if sound_desc and sound_desc.lower() not in ['none', 'unknown', 'unclear']:
        base_prompt = sound_desc
    else:
        base_prompt = ""
        combined = f"{visual_desc} {action_desc}".lower()

        # Dynamic sound inference rules
        sound_mappings = [
            (['walking', 'person walking', 'man walking', 'woman walking'], 'footsteps'),
            (['running', 'person running'], 'running footsteps, heavy breathing'),
            (['car', 'vehicle', 'automobile'], 'car engine, vehicle sounds'),
            (['tree', 'forest', 'woods'], 'rustling leaves, forest ambience'),
            (['water', 'lake', 'ocean', 'sea'], 'water sounds, waves'),
            (['door'], 'door sounds'),
            (['typing', 'computer', 'laptop'], 'keyboard typing, mechanical clicks'),
            (['crowd', 'people', 'group'], 'crowd ambience, multiple voices'),
            (['street', 'road'], 'traffic sounds, urban ambience'),
            (['outdoor', 'outside'], 'outdoor ambience, nature'),
        ]

        matched_sounds = []
        for keywords, sound in sound_mappings:
            if any(keyword in combined for keyword in keywords):
                matched_sounds.append(sound)

        if matched_sounds:
            base_prompt = ", ".join(matched_sounds[:3])
        else:
            base_prompt = f"ambient sounds for {visual_desc}"

    return base_prompt


def suggest_sfx(scenes: List[Dict], transcription: List[Dict]) -> List[Dict]:
    """
    Dynamically suggest sound effects based on scene analysis.

    Args:
        scenes: List of scenes with descriptions
        transcription: List of transcription segments

    Returns:
        List of SFX suggestions
    """
    suggestions = []

    for scene in scenes:
        if scene.get('type') == 'dynamic_moment':
            timestamp = scene['timestamp']
            visual_desc = scene.get('description', '')
            action_desc = scene.get('action_description', '')
            sound_desc = scene.get('sound_description', '')

            sfx_prompt = convert_visual_to_audio_description(
                visual_desc, action_desc, sound_desc
            )

            if sfx_prompt and len(sfx_prompt) > 5:
                suggestions.append({
                    'timestamp': timestamp,
                    'prompt': sfx_prompt,
                    'reason': f'Scene: {visual_desc[:60]}...' if len(visual_desc) > 60 else f'Scene: {visual_desc}',
                    'confidence': scene.get('confidence', 0.7),
                    'visual_context': visual_desc,
                    'action_context': action_desc
                })

    # Sort and deduplicate
    suggestions.sort(key=lambda x: x['timestamp'])

    unique_suggestions = []
    for suggestion in suggestions:
        similar = next((s for s in unique_suggestions
                       if abs(s['timestamp'] - suggestion['timestamp']) < 1.5), None)

        if similar:
            if suggestion['confidence'] > similar['confidence']:
                unique_suggestions.remove(similar)
                unique_suggestions.append(suggestion)
        else:
            unique_suggestions.append(suggestion)

    return [s for s in unique_suggestions if s.get('confidence', 0) > 0.4]


def analyze_video(
    video_path: str,
    audio_path: str,
    progress_callback: Optional[Callable[[str, int, str], None]] = None
) -> Dict[str, Any]:
    """
    Perform complete video analysis.

    Args:
        video_path: Path to video file
        audio_path: Path to extracted audio file
        progress_callback: Optional callback(stage, progress_percent, message)

    Returns:
        Analysis results dict with scenes, suggestedSFX, transcription
    """
    if progress_callback:
        progress_callback("loading_models", 5, "Loading AI models...")

    # Transcribe audio
    if progress_callback:
        progress_callback("transcription", 10, "Transcribing audio...")
    transcription = transcribe_audio(audio_path, progress_callback)

    # Analyze scenes
    if progress_callback:
        progress_callback("scene_analysis", 40, "Analyzing video scenes...")
    scenes = analyze_scenes(video_path, progress_callback)

    # Generate SFX suggestions
    if progress_callback:
        progress_callback("sfx_suggestions", 90, "Generating SFX suggestions...")
    sfx_suggestions = suggest_sfx(scenes, transcription)

    if progress_callback:
        progress_callback("completed", 100, "Analysis complete")

    return {
        "scenes": scenes,
        "suggestedSFX": sfx_suggestions,
        "transcription": transcription
    }
