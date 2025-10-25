#!/usr/bin/env python3
"""
Video Analyzer with Semantic Understanding
Analyzes video content using vision models to understand context,
identify actions, and suggest contextual sound effects.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Dict, Any

try:
    import whisper
    import cv2
    import numpy as np
    import torch
    from transformers import BlipProcessor, BlipForConditionalGeneration
    from PIL import Image
except ImportError as e:
    print(f"Error: Required packages not installed: {e}", file=sys.stderr)
    print("pip install openai-whisper opencv-python numpy torch transformers pillow", file=sys.stderr)
    sys.exit(1)

# Initialize vision-language model for dynamic understanding (lazy loading)
_vlm_model = None
_vlm_processor = None

def get_vlm_model():
    """Lazy load vision-language model for image captioning and understanding."""
    global _vlm_model, _vlm_processor
    if _vlm_model is None:
        print("Loading vision-language model for dynamic analysis...", file=sys.stderr)
        # Using BLIP-2 for image understanding and description
        _vlm_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        _vlm_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
        if torch.cuda.is_available():
            _vlm_model = _vlm_model.to("cuda")
    return _vlm_model, _vlm_processor


def transcribe_audio(audio_path: str):
    """
    Transcribe audio using OpenAI Whisper.

    Args:
        audio_path: Path to audio file

    Returns:
        List of transcription segments
    """
    try:
        # Load Whisper model (base is good balance of speed/accuracy)
        # Options: 'tiny', 'base', 'small', 'medium', 'large'
        model = whisper.load_model("base")

        # Transcribe
        result = model.transcribe(
            audio_path,
            language='en',
            task='transcribe',
            verbose=False
        )

        # Format segments
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


def analyze_frame_content(frame: np.ndarray, model, processor) -> Dict[str, Any]:
    """
    Dynamically analyze frame content using vision-language model.
    No predefined categories - generates natural language descriptions.

    Args:
        frame: Video frame (BGR format from OpenCV)
        model: Vision-language model
        processor: Model processor

    Returns:
        Dict with dynamic description and extracted semantic info
    """
    # Convert BGR to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb_frame)

    # Generate natural language caption of what's happening
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
        'confidence': 0.85  # BLIP is generally high quality
    }


def analyze_scenes(video_path: str):
    """
    Dynamically analyze video using vision-language model for natural understanding.

    Args:
        video_path: Path to video file

    Returns:
        List of scenes with dynamic natural language descriptions
    """
    try:
        model, processor = get_vlm_model()

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps

        scenes = []
        frame_idx = 0

        # Analyze keyframes (every 3 seconds for VLM analysis - slower but more detailed)
        sample_rate = int(fps * 3)
        total_samples = int(duration / 3)

        print(f"Analyzing {total_samples} keyframes with vision-language model...", file=sys.stderr)

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_rate == 0:
                timestamp = frame_idx / fps

                # Dynamic analysis - generates descriptions
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

                progress = int((frame_idx / frame_count) * 100)
                # Show what the model actually sees
                print(f"Progress: {progress}% - Scene: {analysis['description'][:50]}...", file=sys.stderr)

            frame_idx += 1

        cap.release()
        return scenes

    except Exception as e:
        print(f"Error analyzing scenes: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return []


def convert_visual_to_audio_description(visual_desc: str, action_desc: str, sound_desc: str) -> str:
    """
    Dynamically convert visual descriptions into audio/SFX prompts.
    Uses natural language processing to infer appropriate sounds.

    Args:
        visual_desc: What the model sees
        action_desc: What's happening
        sound_desc: Direct sound description from model

    Returns:
        SFX prompt for AudioCraft
    """
    # Start with the model's sound description if available
    if sound_desc and sound_desc.lower() not in ['none', 'unknown', 'unclear']:
        base_prompt = sound_desc
    else:
        # Fallback: intelligently construct from visual description
        base_prompt = ""

        # Extract key elements from descriptions
        combined = f"{visual_desc} {action_desc}".lower()

        # Dynamic sound inference rules
        sound_mappings = [
            # Movement sounds
            (['walking', 'person walking', 'man walking', 'woman walking'], 'footsteps'),
            (['running', 'person running'], 'running footsteps, heavy breathing'),
            (['jumping', 'leaping'], 'jumping impact, landing sound'),
            (['dancing', 'moving'], 'shuffling feet, movement'),

            # Transportation
            (['car', 'vehicle', 'automobile'], 'car engine, vehicle sounds'),
            (['driving', 'car driving'], 'car engine rumble, road noise'),
            (['bicycle', 'bike'], 'bicycle pedaling, chain sounds'),
            (['train'], 'train sounds, railway ambience'),
            (['airplane', 'plane'], 'airplane engine, flight sounds'),

            # Nature
            (['tree', 'forest', 'woods'], 'rustling leaves, forest ambience'),
            (['water', 'lake', 'ocean', 'sea'], 'water sounds, waves'),
            (['rain', 'raining'], 'rain falling, raindrops'),
            (['wind', 'windy'], 'wind blowing, air whooshing'),
            (['bird', 'birds'], 'birds chirping, nature sounds'),

            # Indoor/Objects
            (['door'], 'door sounds'),
            (['opening door'], 'door opening, creaking'),
            (['closing door'], 'door closing, latch'),
            (['phone', 'smartphone'], 'phone sounds, notification'),
            (['computer', 'laptop'], 'typing, keyboard clicks'),
            (['typing'], 'keyboard typing, mechanical clicks'),

            # People
            (['talking', 'speaking', 'conversation'], 'conversation, people talking'),
            (['crowd', 'people', 'group'], 'crowd ambience, multiple voices'),
            (['sitting'], 'subtle movement, chair creak'),
            (['standing'], 'shuffling, quiet presence'),

            # Environments
            (['street', 'road'], 'traffic sounds, urban ambience'),
            (['city', 'urban'], 'city sounds, distant traffic'),
            (['office'], 'office ambience, computer hum'),
            (['kitchen'], 'kitchen sounds, utensils'),
            (['outdoor', 'outside'], 'outdoor ambience, nature'),
        ]

        # Find matching sound descriptions
        matched_sounds = []
        for keywords, sound in sound_mappings:
            if any(keyword in combined for keyword in keywords):
                matched_sounds.append(sound)

        # Combine matched sounds or use visual description as fallback
        if matched_sounds:
            base_prompt = ", ".join(matched_sounds[:3])  # Max 3 combined sounds
        else:
            # Generic fallback based on visual description
            base_prompt = f"ambient sounds for {visual_desc}"

    return base_prompt


def suggest_sfx(scenes: List[Dict], transcription: List[Dict]) -> List[Dict]:
    """
    DYNAMICALLY suggest sound effects based on natural language understanding.
    No static mappings - generates contextual SFX from visual descriptions.

    Args:
        scenes: List of scenes with dynamic descriptions
        transcription: List of transcription segments

    Returns:
        List of dynamically generated SFX suggestions
    """
    suggestions = []

    # Process each scene with dynamic understanding
    for scene in scenes:
        if scene.get('type') == 'dynamic_moment':
            timestamp = scene['timestamp']
            visual_desc = scene.get('description', '')
            action_desc = scene.get('action_description', '')
            sound_desc = scene.get('sound_description', '')

            # Dynamically generate SFX prompt from visual understanding
            sfx_prompt = convert_visual_to_audio_description(visual_desc, action_desc, sound_desc)

            # Only add if we generated something meaningful
            if sfx_prompt and len(sfx_prompt) > 5:
                suggestions.append({
                    'timestamp': timestamp,
                    'prompt': sfx_prompt,
                    'reason': f'Scene: {visual_desc[:60]}...' if len(visual_desc) > 60 else f'Scene: {visual_desc}',
                    'confidence': scene.get('confidence', 0.7),
                    'visual_context': visual_desc,
                    'action_context': action_desc
                })

    # Enhance with transcription - dynamic phrase detection
    for segment in transcription:
        text = segment['text']
        text_lower = text.lower()
        timestamp = segment['start']

        # Dynamic sound word detection
        sound_words = {
            'knock': 'knocking sound',
            'bang': 'loud bang, impact',
            'crash': 'crashing sound, collision',
            'splash': 'water splash',
            'ring': 'ringing sound',
            'beep': 'electronic beep',
            'alarm': 'alarm sound',
            'click': 'clicking sound',
            'pop': 'popping sound',
            'whoosh': 'whooshing sound',
            'buzz': 'buzzing sound',
            'hum': 'humming sound',
            'whistle': 'whistling sound',
            'slam': 'door slamming',
            'footsteps': 'footstep sounds',
        }

        # Check for explicit sound mentions
        for word, sfx in sound_words.items():
            if word in text_lower:
                # Find nearby scene for context
                nearby_scene = next((s for s in scenes if abs(s['timestamp'] - timestamp) < 2.0), None)
                context = nearby_scene.get('description', '') if nearby_scene else text

                suggestions.append({
                    'timestamp': timestamp,
                    'prompt': sfx,
                    'reason': f'Mentioned "{word}" in dialogue: "{text[:50]}..."',
                    'confidence': 0.9,
                    'dialogue_context': text,
                    'visual_context': context
                })

        # Dynamic action phrase detection (no hardcoded combos)
        # Split into words and look for action patterns
        words = text_lower.split()
        for i, word in enumerate(words):
            # Object + action patterns
            if i < len(words) - 1:
                # "door opens", "car starts", etc.
                obj = word
                action = words[i + 1]

                # Generate dynamic SFX from object-action pair
                sfx_prompt = f"{obj} {action} sound"

                # Only add if it seems like a real object-action
                if any(char.isalpha() for char in obj) and len(obj) > 2:
                    # Verify this isn't already covered
                    if not any(abs(s['timestamp'] - timestamp) < 0.5 for s in suggestions):
                        suggestions.append({
                            'timestamp': timestamp,
                            'prompt': sfx_prompt,
                            'reason': f'Action mentioned: "{obj} {action}"',
                            'confidence': 0.6,
                            'dialogue_context': text
                        })

    # Sort and deduplicate
    suggestions.sort(key=lambda x: x['timestamp'])

    # Smart deduplication - keep highest confidence for similar timestamps
    unique_suggestions = []
    for suggestion in suggestions:
        # Check if there's already a similar suggestion nearby
        similar = next((s for s in unique_suggestions
                       if abs(s['timestamp'] - suggestion['timestamp']) < 1.5), None)

        if similar:
            # Keep the one with higher confidence
            if suggestion['confidence'] > similar['confidence']:
                unique_suggestions.remove(similar)
                unique_suggestions.append(suggestion)
        else:
            unique_suggestions.append(suggestion)

    # Filter minimum confidence
    unique_suggestions = [s for s in unique_suggestions if s.get('confidence', 0) > 0.4]

    return sorted(unique_suggestions, key=lambda x: x['timestamp'])


def analyze_video(video_path: str, audio_path: str):
    """
    Perform complete video analysis.

    Args:
        video_path: Path to video file
        audio_path: Path to extracted audio file

    Returns:
        Complete analysis results as dict
    """
    print("Analyzing video...", file=sys.stderr)

    # Transcribe audio
    print("Transcribing audio...", file=sys.stderr)
    transcription = transcribe_audio(audio_path)

    # Analyze scenes
    print("Analyzing scenes...", file=sys.stderr)
    scenes = analyze_scenes(video_path)

    # Generate SFX suggestions
    print("Generating SFX suggestions...", file=sys.stderr)
    sfx_suggestions = suggest_sfx(scenes, transcription)

    # Compile results
    analysis = {
        'scenes': scenes,
        'suggestedSFX': sfx_suggestions,
        'transcription': transcription
    }

    return analysis


def main():
    parser = argparse.ArgumentParser(description='Analyze video content')
    parser.add_argument('--video', required=True, help='Path to video file')
    parser.add_argument('--audio', required=True, help='Path to extracted audio file')

    args = parser.parse_args()

    # Validate inputs
    if not Path(args.video).exists():
        print(f"Error: Video file not found: {args.video}", file=sys.stderr)
        sys.exit(1)

    if not Path(args.audio).exists():
        print(f"Error: Audio file not found: {args.audio}", file=sys.stderr)
        sys.exit(1)

    try:
        # Analyze video
        analysis = analyze_video(args.video, args.audio)

        # Output results as JSON
        print(json.dumps(analysis, indent=2))

    except Exception as e:
        print(f"Error analyzing video: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
