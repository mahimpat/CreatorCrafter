#!/usr/bin/env python3
"""
Video Analyzer with Semantic Understanding
Analyzes video content using vision models to understand context,
identify actions, and suggest contextual sound effects.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

# Import smart scene analyzer, event detector, and music generator
from smart_scene_analyzer import SmartSceneAnalyzer
from event_detector import EventDetector, EventClassifier
from music_prompt_generator import suggest_music

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

# Suppress FFmpeg/OpenCV H.264 decoder warnings
# These warnings spam the console during video frame analysis but don't affect functionality
os.environ['OPENCV_FFMPEG_LOGLEVEL'] = '-8'  # Suppress all FFmpeg warnings
cv2.setLogLevel(0)  # Suppress OpenCV warnings

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
    SMART scene analysis using intelligent scene detection + visual understanding.

    New approach:
    1. Detect scene boundaries (cuts/transitions) using PySceneDetect
    2. Analyze mood and energy for each scene (color, motion, cuts)
    3. Get visual description with BLIP for ONE frame per scene (not every 3s!)
    4. Combine smart analysis with visual understanding

    Args:
        video_path: Path to video file

    Returns:
        List of scenes with smart analysis (mood, energy, visual description)
    """
    try:
        print("🎬 Starting SMART scene analysis...", file=sys.stderr)

        # Step 1: Smart scene detection (mood, energy, cuts)
        smart_analyzer = SmartSceneAnalyzer()
        smart_scenes = smart_analyzer.analyze_video(video_path)

        print(f"✓ Detected {len(smart_scenes)} scenes with mood/energy analysis", file=sys.stderr)

        # Step 2: Add visual descriptions using BLIP (1x per scene instead of every 3s!)
        print(f"Adding visual descriptions to {len(smart_scenes)} scenes...", file=sys.stderr)

        model, processor = get_vlm_model()
        cap = cv2.VideoCapture(video_path)

        enriched_scenes = []

        for i, scene in enumerate(smart_scenes):
            # Analyze middle frame of scene (most representative)
            middle_frame_idx = int((scene['start_frame'] + scene['end_frame']) / 2)

            cap.set(cv2.CAP_PROP_POS_FRAMES, middle_frame_idx)
            ret, frame = cap.read()

            if ret:
                # Get visual description with BLIP
                visual_analysis = analyze_frame_content(frame, model, processor)

                # Combine smart analysis with visual description
                enriched_scene = {
                    'timestamp': scene['start'],  # Scene start time
                    'type': 'smart_scene',
                    'scene_id': scene['scene_id'],
                    'duration': scene['duration'],
                    'start': scene['start'],
                    'end': scene['end'],
                    'start_frame': scene['start_frame'],  # Needed for event detection
                    'end_frame': scene['end_frame'],      # Needed for event detection

                    # Visual understanding (BLIP)
                    'description': visual_analysis['description'],
                    'action_description': visual_analysis['action_description'],
                    'sound_description': visual_analysis['sound_description'],

                    # Smart analysis (color, motion, energy)
                    'mood': scene['mood'],
                    'mood_confidence': scene['mood_confidence'],
                    'energy_level': scene['energy_level'],
                    'energy_label': scene['energy_label'],
                    'motion_intensity': scene['motion_intensity'],
                    'color_metrics': scene['color_metrics'],

                    # Combined confidence
                    'confidence': (visual_analysis['confidence'] + scene['mood_confidence']) / 2
                }

                enriched_scenes.append(enriched_scene)

                # Progress
                progress = int((i + 1) / len(smart_scenes) * 100)
                print(f"  Scene {i+1}/{len(smart_scenes)}: {scene['mood']} mood, {enriched_scene['description'][:40]}... ({progress}%)", file=sys.stderr)

        cap.release()

        print(f"✓ SMART scene analysis complete! {len(enriched_scenes)} scenes analyzed", file=sys.stderr)
        return enriched_scenes

    except Exception as e:
        print(f"Error in smart scene analysis: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)

        # Fallback to old method if smart analysis fails
        print("Falling back to basic analysis...", file=sys.stderr)
        return basic_scene_analysis(video_path)


def basic_scene_analysis(video_path: str):
    """
    Fallback: Basic scene analysis if smart analysis fails.
    Samples frames every 5 seconds as a simple approach.
    """
    try:
        model, processor = get_vlm_model()
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps

        scenes = []
        sample_rate = int(fps * 5)  # Every 5 seconds

        print(f"Basic analysis: sampling every 5 seconds", file=sys.stderr)

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_rate == 0:
                timestamp = frame_idx / fps
                analysis = analyze_frame_content(frame, model, processor)

                scene = {
                    'timestamp': timestamp,
                    'type': 'basic_sample',
                    'description': analysis['description'],
                    'action_description': analysis['action_description'],
                    'sound_description': analysis['sound_description'],
                    'confidence': analysis['confidence'],
                    # Add default mood/energy
                    'mood': 'neutral',
                    'energy_level': 5,
                    'energy_label': 'medium'
                }

                scenes.append(scene)

            frame_idx += 1

        cap.release()
        return scenes

    except Exception as e:
        print(f"Basic analysis also failed: {e}", file=sys.stderr)
        return []


class MotionVerifier:
    """
    Verify action-based sounds by detecting actual motion in video.
    Prevents false positives like "car engine" for parked cars.
    """
    def __init__(self):
        # Motion thresholds for different action types (0.0 - 1.0 scale)
        self.motion_thresholds = {
            'walking': 0.10,      # Moderate motion
            'running': 0.20,      # High motion
            'driving': 0.15,      # Moderate-high motion (camera or objects moving)
            'car': 0.15,          # Vehicle in motion
            'typing': 0.05,       # Low but present motion
            'opening': 0.08,      # Low-moderate motion (door/window)
            'closing': 0.08,      # Low-moderate motion
            'moving': 0.12,       # General movement
            'jumping': 0.25,      # High motion
            'default': 0.08       # Default threshold for other actions
        }

    def analyze_motion(self, video_path: str, timestamp: float, window: float = 1.0) -> float:
        """
        Analyze motion intensity around a specific timestamp.

        Args:
            video_path: Path to video file
            timestamp: Time to analyze (seconds)
            window: Time window before/after (seconds)

        Returns:
            Motion intensity (0.0 = no motion, 1.0 = maximum motion)
        """
        try:
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)

            # Get frames around timestamp
            start_frame = int(max(0, (timestamp - window) * fps))
            end_frame = int((timestamp + window) * fps)

            cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

            motion_scores = []
            prev_gray = None

            while cap.get(cv2.CAP_PROP_POS_FRAMES) < end_frame:
                ret, frame = cap.read()
                if not ret:
                    break

                # Convert to grayscale for motion detection
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                gray = cv2.GaussianBlur(gray, (5, 5), 0)  # Reduce noise

                if prev_gray is not None:
                    # Calculate frame difference
                    diff = cv2.absdiff(gray, prev_gray)
                    # Normalize to 0-1 range
                    motion = diff.mean() / 255.0
                    motion_scores.append(motion)

                prev_gray = gray

            cap.release()

            if not motion_scores:
                return 0.0

            # Return average motion intensity
            return float(np.mean(motion_scores))

        except Exception as e:
            print(f"Motion analysis error: {e}", file=sys.stderr)
            return 0.5  # Default to neutral if analysis fails

    def verify_action_sound(self, action_type: str, video_path: str, timestamp: float) -> Dict:
        """
        Verify that an action sound matches actual motion in video.

        Args:
            action_type: Type of action (walking, driving, typing, etc.)
            video_path: Path to video file
            timestamp: When action is supposed to occur

        Returns:
            Dict with verified, confidence, and motion_intensity
        """
        # Determine motion threshold for this action
        threshold = self.motion_thresholds.get(action_type, self.motion_thresholds['default'])

        # Analyze motion
        motion_intensity = self.analyze_motion(video_path, timestamp)

        if motion_intensity >= threshold:
            # Motion confirmed
            confidence = min(0.9, 0.5 + (motion_intensity / threshold) * 0.4)
            return {
                'verified': True,
                'confidence': confidence,
                'motion_intensity': motion_intensity,
                'reason': f'Motion detected ({motion_intensity:.2f}, threshold: {threshold:.2f})'
            }
        else:
            # Insufficient motion - likely false positive
            return {
                'verified': False,
                'confidence': 0.25,
                'motion_intensity': motion_intensity,
                'reason': f'Insufficient motion ({motion_intensity:.2f}, need {threshold:.2f})',
                'warning': f'No motion detected for {action_type}'
            }


class ContextDisambiguator:
    """
    Disambiguate generic sounds based on visual context.
    Makes suggestions more specific (e.g., "door" → "car door" vs "house door").
    """
    def __init__(self):
        # Environment indicators
        self.environment_indicators = {
            'car': ['car', 'vehicle', 'driving', 'dashboard', 'steering', 'windshield', 'traffic', 'road', 'highway'],
            'office': ['office', 'desk', 'computer', 'cubicle', 'workspace', 'keyboard', 'monitor', 'meeting'],
            'home': ['home', 'house', 'living room', 'kitchen', 'bedroom', 'couch', 'sofa', 'table'],
            'outdoor': ['outdoor', 'outside', 'street', 'park', 'sidewalk', 'tree', 'sky', 'grass'],
            'restaurant': ['restaurant', 'cafe', 'dining', 'table', 'menu', 'waiter', 'food'],
            'store': ['store', 'shop', 'shopping', 'aisle', 'shelf', 'checkout', 'retail']
        }

        # Sound disambiguation rules: generic_sound → {environment: specific_sound}
        self.disambiguation_rules = {
            'door': {
                'car': 'car door closing, metal latch',
                'office': 'office door, commercial door closing',
                'home': 'residential door, house door closing',
                'store': 'automatic sliding door, store entrance'
            },
            'door opening': {
                'car': 'car door opening, handle click',
                'office': 'office door opening, commercial door',
                'home': 'house door opening, residential entry',
                'store': 'automatic door opening, whoosh'
            },
            'door closing': {
                'car': 'car door slam, vehicle door closing',
                'office': 'office door closing, commercial lock',
                'home': 'house door closing, door latch',
                'store': 'automatic door closing'
            },
            'footsteps': {
                'car': 'footsteps on pavement near car',
                'office': 'footsteps on carpet, office walking',
                'home': 'footsteps on floor, indoor walking',
                'outdoor': 'footsteps on concrete, outdoor walking'
            },
            'talking': {
                'car': 'conversation in car, vehicle dialogue',
                'office': 'office conversation, workplace discussion',
                'home': 'home conversation, casual talking',
                'restaurant': 'restaurant chatter, dining conversation',
                'outdoor': 'outdoor conversation, street talking'
            },
            'background': {
                'car': 'car interior ambience, road noise',
                'office': 'office ambience, workplace sounds',
                'home': 'home ambience, residential sounds',
                'outdoor': 'outdoor ambience, nature and city sounds',
                'restaurant': 'restaurant ambience, dining sounds'
            },
            'keyboard': {
                'office': 'office keyboard typing, mechanical clicks',
                'home': 'keyboard typing at home'
            }
        }

    def detect_environment(self, visual_desc: str, action_desc: str = '') -> str:
        """
        Detect the environment/context from visual descriptions.

        Returns: environment type or 'unknown'
        """
        combined = f"{visual_desc} {action_desc}".lower()

        # Score each environment
        scores = {}
        for env, indicators in self.environment_indicators.items():
            score = sum(1 for indicator in indicators if indicator in combined)
            if score > 0:
                scores[env] = score

        # Return environment with highest score
        if scores:
            return max(scores.items(), key=lambda x: x[1])[0]

        return 'unknown'

    def disambiguate_sound(self, generic_sound: str, visual_desc: str, action_desc: str = '') -> str:
        """
        Convert generic sound to context-specific sound.

        Args:
            generic_sound: Generic sound description (e.g., "door sounds")
            visual_desc: Visual scene description
            action_desc: Action description

        Returns:
            Disambiguated, context-specific sound description
        """
        # Normalize the generic sound (remove extra words)
        generic_sound_lower = generic_sound.lower()

        # Find matching rule
        matched_rule = None
        for rule_key in self.disambiguation_rules.keys():
            if rule_key in generic_sound_lower:
                matched_rule = rule_key
                break

        if not matched_rule:
            # No rule found, return original
            return generic_sound

        # Detect environment
        environment = self.detect_environment(visual_desc, action_desc)

        # Get specific sound for this environment
        specific_sounds = self.disambiguation_rules[matched_rule]

        if environment in specific_sounds:
            return specific_sounds[environment]
        else:
            # No specific mapping, return original
            return generic_sound


class VisualAudioVerifier:
    """
    Verify that dialogue-mentioned sounds are actually visible in video.
    Reduces false positives by checking visual evidence.
    """
    def __init__(self):
        # Common objects and their related visual terms
        self.object_relations = {
            'door': ['door', 'doorway', 'entrance', 'exit'],
            'phone': ['phone', 'smartphone', 'cellphone', 'mobile', 'device'],
            'car': ['car', 'vehicle', 'automobile', 'sedan', 'suv'],
            'window': ['window', 'glass'],
            'computer': ['computer', 'laptop', 'desktop', 'screen', 'monitor'],
            'keyboard': ['keyboard', 'typing', 'computer'],
            'water': ['water', 'liquid', 'ocean', 'lake', 'river', 'pool'],
            'rain': ['rain', 'raining', 'wet', 'water'],
            'wind': ['wind', 'windy', 'breeze', 'air'],
            'footsteps': ['walking', 'person', 'man', 'woman', 'people', 'pedestrian'],
        }

    def extract_mentioned_object(self, text: str) -> str:
        """
        Extract the main object from dialogue text.

        Examples:
        - "open the door" → "door"
        - "answer the phone" → "phone"
        - "start the car" → "car"
        """
        text_lower = text.lower()

        # Check for known objects
        for obj in self.object_relations.keys():
            if obj in text_lower:
                return obj

        return None

    def verify_dialogue_mention(self, dialogue_text: str, nearby_scenes: List[Dict], timestamp: float) -> Dict:
        """
        Verify if dialogue-mentioned sound is supported by visual evidence.

        Args:
            dialogue_text: The spoken text
            nearby_scenes: Scenes within ±2 seconds
            timestamp: When dialogue occurred

        Returns:
            Dict with verified, confidence, and reason
        """
        mentioned_object = self.extract_mentioned_object(dialogue_text)

        if not mentioned_object:
            # No recognizable object mentioned
            return {
                'verified': False,
                'confidence': 0.5,
                'reason': 'No specific object identified in dialogue'
            }

        # Check if object appears in nearby visual scenes
        visual_evidence = False
        matching_scene = None

        for scene in nearby_scenes:
            if abs(scene['timestamp'] - timestamp) > 2.0:
                continue

            scene_desc = scene.get('description', '').lower()
            action_desc = scene.get('action_description', '').lower()
            combined = f"{scene_desc} {action_desc}"

            # Check for exact match
            if mentioned_object in combined:
                visual_evidence = True
                matching_scene = scene
                break

            # Check for related terms
            related_terms = self.object_relations.get(mentioned_object, [])
            if any(term in combined for term in related_terms):
                visual_evidence = True
                matching_scene = scene
                break

        if visual_evidence:
            return {
                'verified': True,
                'confidence': 0.9,
                'reason': f'Visually confirmed: {matching_scene.get("description", "")[:50]}',
                'matching_scene': matching_scene
            }
        else:
            return {
                'verified': False,
                'confidence': 0.3,  # Low confidence - likely false positive
                'reason': f'Mentioned "{mentioned_object}" in dialogue but not visible in scene',
                'warning': 'Possible false positive'
            }


def convert_visual_to_audio_description(visual_desc: str, action_desc: str, sound_desc: str, mood: str = None, energy_level: int = None) -> str:
    """
    TRULY DYNAMIC audio prompt generation - NO static lists!
    Directly translates visual description into natural audio prompts.

    Args:
        visual_desc: What the model sees (e.g., "a river flowing through a lush green forest")
        action_desc: What's happening
        sound_desc: Direct sound description (from BLIP)
        mood: Scene mood (cheerful, tense, calm, etc.)
        energy_level: Energy level 1-10

    Returns:
        Natural language audio prompt for AudioCraft

    Example:
        Input: "a river flowing through a lush green forest", mood="calm", energy=2
        Output: "ambient sounds of a river flowing through a lush green forest, peaceful and calming ambience, subtle and gentle"
    """

    # Use the visual description DIRECTLY as the basis for audio
    # The visual description already tells us what's there!

    # Start with: "ambient sounds of [what we see]"
    base_prompt = f"ambient sounds of {visual_desc.strip()}"

    # Add mood context if available
    if mood and mood != 'neutral':
        mood_descriptors = {
            'cheerful': ', bright and uplifting atmosphere',
            'energetic': ', dynamic and energetic feel',
            'tense': ', tense and suspenseful mood',
            'dark': ', dark and ominous atmosphere',
            'calm': ', peaceful and calming ambience',
            'melancholic': ', somber and melancholic tone'
        }

        mood_suffix = mood_descriptors.get(mood, '')
        if mood_suffix:
            base_prompt += mood_suffix

    # Add energy/intensity context
    if energy_level:
        if energy_level >= 8:
            base_prompt += ', high intensity'
        elif energy_level >= 6:
            base_prompt += ', medium intensity'
        elif energy_level <= 3:
            base_prompt += ', subtle and gentle'

    return base_prompt


def suggest_sfx(scenes: List[Dict], transcription: List[Dict], video_path: str = None, events: List[Dict] = None) -> List[Dict]:
    """
    DYNAMICALLY suggest sound effects based on natural language understanding.
    No static mappings - generates contextual SFX from visual descriptions.
    NOW WITH EVENT-BASED DETECTION for frame-accurate SFX timing.

    Week 2 Improvements:
    - Event-based detection for precise timing (motion peaks, transitions)
    - Frame-accurate SFX suggestions
    - Context-aware event classification
    - Visual-audio verification and motion verification

    Args:
        scenes: List of scenes with dynamic descriptions
        transcription: List of transcription segments
        video_path: Path to video file (optional, needed for motion verification)
        events: List of detected events (motion peaks, transitions) for precise SFX

    Returns:
        List of dynamically generated SFX suggestions
    """
    suggestions = []

    # Initialize verifiers and disambiguator
    verifier = VisualAudioVerifier()
    motion_verifier = MotionVerifier() if video_path else None
    disambiguator = ContextDisambiguator()
    event_classifier = EventClassifier()

    # WEEK 2: Process events for frame-accurate SFX suggestions
    if events:
        print(f"Processing {len(events)} detected events for precise SFX timing...", file=sys.stderr)

        for event in events:
            event_type = event.get('type')
            timestamp = event.get('timestamp')

            if event_type == 'motion_peak':
                # Classify motion event with visual context
                visual_context = event.get('scene_description', '')
                classified = event_classifier.classify_motion_event(event, visual_context)

                # Generate SFX suggestion from event
                suggestion = {
                    'timestamp': timestamp,
                    'prompt': classified['sound_prompt'],
                    'reason': f"Motion peak detected ({classified['category']}, intensity: {event.get('intensity', 5)}/10)",
                    'confidence': 0.85,  # Events have high confidence (detected, not inferred)
                    'event_type': event_type,
                    'category': classified['category'],
                    'intensity': event.get('intensity', 5),
                    'frame': event.get('frame')
                }
                suggestions.append(suggestion)

            elif event_type == 'scene_transition':
                # Classify transition event
                classified = event_classifier.classify_transition_event(event)

                # Generate transition SFX
                suggestion = {
                    'timestamp': timestamp,
                    'prompt': classified['sound_prompt'],
                    'reason': f"Scene transition ({classified['category']})",
                    'confidence': 0.75,
                    'event_type': event_type,
                    'category': classified['category'],
                    'from_mood': event.get('from_mood', 'neutral'),
                    'to_mood': event.get('to_mood', 'neutral')
                }
                suggestions.append(suggestion)

    # Process each scene with dynamic understanding (for general ambience)
    for scene in scenes:
        scene_type = scene.get('type', 'basic_sample')

        # Handle both old format (dynamic_moment) and new format (smart_scene)
        if scene_type in ['dynamic_moment', 'smart_scene', 'basic_sample']:
            timestamp = scene['timestamp']
            visual_desc = scene.get('description', '')
            action_desc = scene.get('action_description', '')
            sound_desc = scene.get('sound_description', '')

            # Get mood and energy from scene
            mood = scene.get('mood', 'neutral')
            energy_level = scene.get('energy_level', 5)

            # TRULY DYNAMIC prompt generation - uses visual description + mood + energy
            sfx_prompt = convert_visual_to_audio_description(
                visual_desc,
                action_desc,
                sound_desc,
                mood=mood,
                energy_level=energy_level
            )

            # CONTEXT DISAMBIGUATION: Make sound more specific based on environment
            sfx_prompt = disambiguator.disambiguate_sound(sfx_prompt, visual_desc, action_desc)

            # Only add if we generated something meaningful
            if sfx_prompt and len(sfx_prompt) > 5:
                base_confidence = scene.get('confidence', 0.7)

                # MOTION VERIFICATION: Check if action-based sounds have actual motion
                motion_verified = True
                motion_confidence_multiplier = 1.0

                if motion_verifier and video_path:
                    # Detect action type from descriptions
                    combined_desc = f"{visual_desc} {action_desc}".lower()

                    # Check for action keywords that require motion
                    action_keywords = {
                        'walking': 'walking',
                        'running': 'running',
                        'driving': 'driving',
                        'car': 'car',
                        'moving': 'moving',
                        'typing': 'typing',
                        'opening': 'opening',
                        'closing': 'closing',
                        'jumping': 'jumping'
                    }

                    detected_action = None
                    for keyword, action_type in action_keywords.items():
                        if keyword in combined_desc:
                            detected_action = action_type
                            break

                    # If action detected, verify with motion analysis
                    if detected_action:
                        try:
                            motion_result = motion_verifier.verify_action_sound(
                                detected_action, video_path, timestamp
                            )
                            motion_verified = motion_result['verified']

                            # Adjust confidence based on motion verification
                            if motion_verified:
                                # High motion detected - boost confidence slightly
                                motion_confidence_multiplier = min(1.1, 1.0 + motion_result.get('motion_intensity', 0) * 0.2)
                            else:
                                # No motion detected - reduce confidence significantly
                                motion_confidence_multiplier = 0.35  # Low confidence for unverified action
                        except Exception as e:
                            print(f"Motion verification error: {e}", file=sys.stderr)
                            # If motion verification fails, don't penalize
                            motion_verified = True

                final_confidence = base_confidence * motion_confidence_multiplier

                suggestion = {
                    'timestamp': timestamp,
                    'prompt': sfx_prompt,
                    'reason': f'Scene: {visual_desc[:60]}...' if len(visual_desc) > 60 else f'Scene: {visual_desc}',
                    'confidence': final_confidence,
                    'visual_context': visual_desc,
                    'action_context': action_desc,
                    'motion_verified': motion_verified
                }

                # Add warning if motion verification failed
                if not motion_verified:
                    suggestion['warning'] = 'Action mentioned but no motion detected - possible false positive'

                suggestions.append(suggestion)

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

        # Check for explicit sound mentions with visual verification
        for word, sfx in sound_words.items():
            if word in text_lower:
                # Find nearby scenes for visual verification
                nearby_scenes = [s for s in scenes if abs(s['timestamp'] - timestamp) < 2.0]

                # VISUAL-AUDIO VERIFICATION: Check if mentioned sound is actually visible
                verification = verifier.verify_dialogue_mention(text, nearby_scenes, timestamp)

                # CONTEXT DISAMBIGUATION: Make sound more specific
                visual_context = nearby_scenes[0].get('description', '') if nearby_scenes else ''
                action_context = nearby_scenes[0].get('action_description', '') if nearby_scenes else ''
                disambiguated_sfx = disambiguator.disambiguate_sound(sfx, visual_context, action_context)

                # Use verified confidence instead of static 0.9
                confidence = verification['confidence']

                # Add suggestion with verification info
                suggestion = {
                    'timestamp': timestamp,
                    'prompt': disambiguated_sfx,
                    'reason': f'Mentioned "{word}" in dialogue: "{text[:50]}..." - {verification["reason"]}',
                    'confidence': confidence,
                    'dialogue_context': text,
                    'visual_context': nearby_scenes[0].get('description', text) if nearby_scenes else text,
                    'verified': verification['verified']
                }

                # Add warning if not verified (possible false positive)
                if not verification['verified']:
                    suggestion['warning'] = verification.get('warning', 'Not visually confirmed')

                suggestions.append(suggestion)

        # Dynamic action phrase detection with visual verification
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
                        # Find nearby scenes for verification
                        nearby_scenes = [s for s in scenes if abs(s['timestamp'] - timestamp) < 2.0]

                        # Verify the object-action pair
                        verification = verifier.verify_dialogue_mention(f"{obj} {action}", nearby_scenes, timestamp)

                        suggestion = {
                            'timestamp': timestamp,
                            'prompt': sfx_prompt,
                            'reason': f'Action mentioned: "{obj} {action}" - {verification["reason"]}',
                            'confidence': verification['confidence'] * 0.8,  # Slightly lower for inferred actions
                            'dialogue_context': text,
                            'verified': verification['verified']
                        }

                        if not verification['verified']:
                            suggestion['warning'] = 'Inferred action not visually confirmed'

                        suggestions.append(suggestion)

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
    Perform complete video analysis with smart scene detection and event-based SFX.

    Week 1: Smart scene-based analysis
    Week 2: Event detection for frame-accurate SFX timing

    Args:
        video_path: Path to video file
        audio_path: Path to extracted audio file

    Returns:
        Complete analysis results as dict
    """
    print("Analyzing video...", file=sys.stderr)

    # Transcribe audio (if available)
    transcription = []
    if audio_path and os.path.exists(audio_path):
        print("Transcribing audio...", file=sys.stderr)
        transcription = transcribe_audio(audio_path)
    else:
        print("No audio file provided - skipping transcription", file=sys.stderr)

    # Analyze scenes (Week 1: Smart scene detection)
    print("Analyzing scenes...", file=sys.stderr)
    scenes = analyze_scenes(video_path)

    # Detect events (Week 2: Frame-accurate event detection)
    print("🎯 Detecting events for precise SFX timing...", file=sys.stderr)
    event_detector = EventDetector()

    # Detect motion peaks within scenes
    motion_events = event_detector.detect_motion_peaks(video_path, scenes)
    print(f"✓ Detected {len(motion_events)} motion peaks", file=sys.stderr)

    # Detect scene transitions
    transitions = event_detector.detect_scene_transitions(scenes)
    print(f"✓ Detected {len(transitions)} scene transitions", file=sys.stderr)

    # Combine all events
    all_events = motion_events + transitions

    # Generate SFX suggestions with event-based detection (Week 2)
    print("Generating SFX suggestions from events and scenes...", file=sys.stderr)
    sfx_suggestions = suggest_sfx(scenes, transcription, video_path, events=all_events)

    # Generate background music suggestions (Week 3)
    print("🎵 Generating background music suggestions...", file=sys.stderr)
    music_suggestions = suggest_music(scenes)
    print(f"✓ Generated {len(music_suggestions)} music suggestions", file=sys.stderr)

    # Compile results (Week 2 + 3: Separated SFX and Music)
    analysis = {
        'scenes': scenes,
        'events': all_events,  # Include events in output
        'suggestedSFX': sfx_suggestions,  # Sound effects (precise, event-based)
        'suggestedMusic': music_suggestions,  # Background music (mood/energy-based)
        'transcription': transcription
    }

    print(f"\n✅ Analysis complete!", file=sys.stderr)
    print(f"   📊 {len(scenes)} scenes analyzed", file=sys.stderr)
    print(f"   🎯 {len(all_events)} events detected", file=sys.stderr)
    print(f"   🔊 {len(sfx_suggestions)} SFX suggestions", file=sys.stderr)
    print(f"   🎵 {len(music_suggestions)} music suggestions", file=sys.stderr)

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
