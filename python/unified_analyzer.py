#!/usr/bin/env python3
"""
Unified Video Analysis System
Combines SFX generation analysis and thumbnail analysis into a single pass
Results are cached to avoid redundant processing
"""

import argparse
import json
import sys
import cv2
import os
import numpy as np
from pathlib import Path

# Import the existing working video analyzer functions
# This way we use the EXACT SAME algorithm that was working before
from video_analyzer import (
    analyze_scenes,
    transcribe_audio as video_analyzer_transcribe,
    suggest_sfx,
    EventDetector
)

from music_prompt_generator import suggest_music
from animation_suggester import AnimationSuggester
import concurrent.futures


def print_log(message):
    """Print log message to stderr"""
    print(message, file=sys.stderr)


# Try to import AI libraries
try:
    import whisper
    WHISPER_AVAILABLE = True
    print_log("✓ Whisper imported successfully")
except ImportError:
    WHISPER_AVAILABLE = False
    print_log("✗ Whisper not available")

try:
    from transformers import BlipProcessor, BlipForConditionalGeneration
    from PIL import Image as PILImage
    import torch
    BLIP_AVAILABLE = True
    print_log("✓ BLIP imported successfully")
except ImportError:
    BLIP_AVAILABLE = False
    print_log("✗ BLIP not available")


# Face detection for thumbnails
def detect_faces(frame):
    """Detect faces in a frame"""
    try:
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )

        return len(faces), faces
    except Exception as e:
        print_log(f"Face detection error: {e}")
        return 0, []


def calculate_sharpness(frame):
    """Calculate Laplacian variance (sharpness)"""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return cv2.Laplacian(gray, cv2.CV_64F).var()


def calculate_contrast(frame):
    """Calculate standard deviation of luminance"""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return gray.std()


def calculate_vibrancy(frame):
    """Calculate color saturation"""
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    return hsv[:, :, 1].mean()


def score_frame(frame, has_faces, face_count, sharpness, contrast, vibrancy):
    """Score frame for thumbnail quality"""
    score = 0

    # Face presence (very important)
    if has_faces:
        score += 40 + min(face_count * 10, 20)

    # Sharpness (important)
    sharpness_normalized = min(sharpness / 100, 1.0)
    score += sharpness_normalized * 20

    # Contrast (important)
    contrast_normalized = min(contrast / 50, 1.0)
    score += contrast_normalized * 15

    # Vibrancy (less important)
    vibrancy_normalized = min(vibrancy / 128, 1.0)
    score += vibrancy_normalized * 5

    return score


def analyze_thumbnails(video_path, max_frames=20):
    """
    Analyze video for thumbnail candidates

    Returns:
        List of thumbnail candidates with scores
    """
    print_log("🖼️  Analyzing video for thumbnails...")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    print_log(f"Video: {duration:.1f}s, {total_frames} frames @ {fps:.1f} FPS")

    # Sample frames evenly
    frame_interval = max(1, total_frames // max_frames)

    candidates = []
    frame_count = 0
    analyzed_count = 0

    while cap.isOpened() and analyzed_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_interval == 0:
            timestamp = frame_count / fps

            # Resize for faster processing
            analysis_frame = cv2.resize(frame, (640, 360))

            # Calculate metrics
            face_count, faces = detect_faces(analysis_frame)
            has_faces = face_count > 0
            sharpness = calculate_sharpness(analysis_frame)
            contrast = calculate_contrast(analysis_frame)
            vibrancy = calculate_vibrancy(analysis_frame)

            # Calculate score
            score = score_frame(analysis_frame, has_faces, face_count, sharpness, contrast, vibrancy)

            candidate = {
                'timestamp': float(timestamp),
                'frame_number': frame_count,
                'score': float(score),
                'has_faces': bool(has_faces),
                'face_count': int(face_count),
                'sharpness': float(sharpness),
                'contrast': float(contrast),
                'vibrancy': float(vibrancy)
            }

            candidates.append(candidate)
            analyzed_count += 1

            if analyzed_count % 5 == 0:
                print_log(f"  Analyzed {analyzed_count}/{max_frames} frames...")

        frame_count += 1

    cap.release()

    # Sort by score
    candidates.sort(key=lambda x: x['score'], reverse=True)

    print_log(f"✓ Found {len(candidates)} thumbnail candidates")

    return candidates[:10]  # Return top 10


def transcribe_audio(video_path):
    """
    Transcribe audio using Whisper

    Returns:
        Transcription segments with timestamps
    """
    if not WHISPER_AVAILABLE:
        print_log("⚠️  Whisper not available, skipping transcription")
        return []

    print_log("🎧 Transcribing audio with Whisper...")

    try:
        model = whisper.load_model("base")
        result = model.transcribe(video_path, language="en")

        segments = []
        for segment in result['segments']:
            segments.append({
                'text': segment['text'].strip(),
                'start': float(segment['start']),
                'end': float(segment['end']),
                'confidence': float(segment.get('confidence', 0.0))
            })

        print_log(f"✓ Transcribed {len(segments)} segments")

        return segments

    except Exception as e:
        print_log(f"❌ Transcription failed: {e}")
        return []


def analyze_visual_scenes(video_path, num_samples=10):
    """
    Analyze visual scenes using BLIP

    Returns:
        List of scene descriptions with timestamps
    """
    if not BLIP_AVAILABLE:
        print_log("⚠️  BLIP not available, skipping visual analysis")
        return []

    print_log("📸 Analyzing visual scenes with BLIP...")

    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        frame_interval = max(1, total_frames // num_samples)

        scenes = []
        frame_count = 0
        analyzed = 0

        while cap.isOpened() and analyzed < num_samples:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_interval == 0:
                timestamp = frame_count / fps

                # Convert BGR to RGB
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = PILImage.fromarray(rgb_frame)

                # Generate description
                inputs = processor(pil_image, return_tensors="pt").to(device)
                output = model.generate(**inputs, max_new_tokens=50)
                description = processor.decode(output[0], skip_special_tokens=True)

                scenes.append({
                    'timestamp': float(timestamp),
                    'description': description,
                    'type': 'visual'
                })

                analyzed += 1

                if analyzed % 3 == 0:
                    print_log(f"  Analyzed {analyzed}/{num_samples} scenes...")

            frame_count += 1

        cap.release()

        print_log(f"✓ Analyzed {len(scenes)} visual scenes")

        return scenes

    except Exception as e:
        print_log(f"❌ Visual analysis failed: {e}")
        return []


def generate_sfx_suggestions(transcription, visual_scenes, video_path=None):
    """
    SMART SFX generation using the existing sophisticated system from video_analyzer.py

    Uses:
    - SoundExtractor for concrete sound descriptions (not abstract visuals)
    - Mood and energy context from smart scenes
    - Visual scene analysis from BLIP

    Returns:
        List of SFX suggestions with timestamps
    """
    print_log("🔊 Generating SFX suggestions with smart analysis...")

    suggestions = []
    sound_extractor = SoundExtractor()

    # Process visual scenes with smart sound extraction
    for scene in visual_scenes:
        visual_desc = scene.get('description', '')
        timestamp = scene.get('timestamp')

        # Use SoundExtractor to get concrete sounds from visual description
        # This maps visuals to actual sounds (e.g., "bench press" → "weight plates clanking")
        concrete_sound = sound_extractor.extract_sounds(
            visual_desc,
            action_description='',  # Not available in this context
            sound_description=''    # Not available in this context
        )

        # Skip if this is a dialogue scene or no sound identified
        if concrete_sound is None:
            continue

        # If we have a concrete sound, add it as a suggestion
        if concrete_sound and len(concrete_sound) > 5:
            suggestions.append({
                'timestamp': float(timestamp),
                'prompt': concrete_sound,
                'reason': f"Visual scene: {visual_desc[:50]}...",
                'visual_context': visual_desc,
                'confidence': 0.7
            })

    # Analyze transcription for explicit sound mentions
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

    for segment in transcription:
        text = segment['text']
        text_lower = text.lower()
        timestamp = segment['start']

        # Check for explicit sound mentions
        for word, sfx in sound_words.items():
            if word in text_lower:
                suggestions.append({
                    'timestamp': float(timestamp),
                    'prompt': sfx,
                    'reason': f'Mentioned "{word}" in dialogue',
                    'audio_context': text,
                    'confidence': float(segment.get('confidence', 0.8))
                })

    # Remove duplicates (same timestamp)
    unique_suggestions = {}
    for suggestion in suggestions:
        timestamp = suggestion['timestamp']
        if timestamp not in unique_suggestions:
            unique_suggestions[timestamp] = suggestion

    suggestions = list(unique_suggestions.values())
    suggestions.sort(key=lambda x: x['timestamp'])

    print_log(f"✓ Generated {len(suggestions)} SFX suggestions")

    return suggestions


def unified_analyze(video_path):
    """
    Perform unified analysis for video processing
    Uses the REAL video_analyzer functions for SFX (the working algorithm)

    NOTE: Thumbnail analysis is DISABLED in this release to improve performance

    Returns:
        Complete analysis result dict
    """
    print_log("=" * 60)
    print_log("🎬 UNIFIED VIDEO ANALYSIS")
    print_log("=" * 60)

    result = {
        'success': True,
        'video_path': video_path,
        'analyzed_at': None,
        'thumbnail_candidates': [],
        'transcription': [],
        'visual_scenes': [],
        'events': [],
        'sfx_suggestions': [],
        'music_suggestions': [],
        'animation_suggestions': []
    }

    try:
        import time
        result['analyzed_at'] = int(time.time() * 1000)

        # Step 1: Thumbnail analysis (unique to unified analyzer)
        # DISABLED FOR THIS RELEASE - Thumbnail generation feature not included
        result['thumbnail_candidates'] = []

        # PARALLEL PROCESSING START
        # Run Transcription and Scene Analysis in parallel to save time
        print_log("🚀 Starting parallel analysis (Transcription + Scene Detection)...")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            # Submit tasks
            future_transcription = executor.submit(video_analyzer_transcribe, video_path)
            future_scenes = executor.submit(analyze_scenes, video_path)
            
            # Wait for results
            print_log("   Waiting for parallel tasks to complete...")
            result['transcription'] = future_transcription.result()
            scenes = future_scenes.result()
            
        print_log(f"✓ Transcribed {len(result['transcription'])} segments")
        print_log(f"✓ Analyzed {len(scenes)} scenes")
        # PARALLEL PROCESSING END

        # Step 4: Event detection (motion peaks, transitions)
        print_log("🎯 Detecting events for precise SFX timing...")
        event_detector = EventDetector()
        motion_events = event_detector.detect_motion_peaks(video_path, scenes)
        transitions = event_detector.detect_scene_transitions(scenes)
        all_events = motion_events + transitions
        print_log(f"✓ Detected {len(all_events)} events")

        # Step 5: Generate SFX suggestions using the REAL suggest_sfx function
        # This is the sophisticated algorithm with motion verification, context disambiguation, etc.
        print_log("🔊 Generating SFX suggestions with smart analysis...")
        result['sfx_suggestions'] = suggest_sfx(
            scenes,
            result['transcription'],
            video_path,
            None,  # No separate audio file (using video directly)
            events=all_events
        )

        # Step 6: Generate background music suggestions (Week 3)
        print_log("🎵 Generating background music suggestions...")
        result['music_suggestions'] = suggest_music(scenes)
        print_log(f"✓ Generated {len(result['music_suggestions'])} music suggestions")

        # Step 7: Generate Animation Suggestions (New Feature)
        print_log("✨ Generating animation suggestions...")
        animation_suggester = AnimationSuggester()
        result['animation_suggestions'] = animation_suggester.suggest_animations(
            result['transcription'],
            scenes
        )
        print_log(f"✓ Generated {len(result['animation_suggestions'])} animation suggestions")

        # Step 8: Detect Silence Gaps (New Feature)
        print_log("✂️  Detecting silence gaps for jump cuts...")
        
        def detect_silence_gaps(transcription, min_gap=0.8):
            """Find gaps between speech segments > min_gap seconds"""
            gaps = []
            if not transcription:
                return gaps
                
            # Sort by start time just in case
            sorted_segments = sorted(transcription, key=lambda x: x['start'])
            
            # Check gap between start of video and first speech
            if sorted_segments[0]['start'] > min_gap:
                gaps.append({
                    'start': 0.0,
                    'end': sorted_segments[0]['start'],
                    'duration': sorted_segments[0]['start']
                })
                
            # Check gaps between segments
            for i in range(len(sorted_segments) - 1):
                current_end = sorted_segments[i]['end']
                next_start = sorted_segments[i+1]['start']
                gap_duration = next_start - current_end
                
                if gap_duration > min_gap:
                    gaps.append({
                        'start': current_end,
                        'end': next_start,
                        'duration': gap_duration
                    })
                    
            return gaps

        silence_gaps = detect_silence_gaps(result['transcription'])
        result['cut_suggestions'] = [{
            'start': gap['start'],
            'end': gap['end'],
            'duration': gap['duration'],
            'type': 'silence',
            'reason': f"Silence detected ({gap['duration']:.1f}s)"
        } for gap in silence_gaps]
        
        print_log(f"✓ Found {len(result['cut_suggestions'])} silence gaps")

        # Store events for frontend
        result['events'] = all_events

        # Convert scenes to visual_scenes format for frontend compatibility
        result['visual_scenes'] = [{
            'timestamp': s.get('timestamp', s.get('start', 0)),
            'description': s.get('description', ''),
            'type': s.get('type', 'scene')
        } for s in scenes]

        # Count primary vs enhancement suggestions
        primary_count = sum(1 for s in result['sfx_suggestions'] if s.get('type') == 'primary')
        enhancement_count = sum(1 for s in result['sfx_suggestions'] if s.get('type') == 'enhancement')

        print_log("=" * 60)
        print_log("✅ ANALYSIS COMPLETE")
        print_log(f"   Thumbnails: {len(result['thumbnail_candidates'])} candidates")
        print_log(f"   Transcription: {len(result['transcription'])} segments")
        print_log(f"   Scenes: {len(result['visual_scenes'])} descriptions")
        print_log(f"   Events: {len(result['events'])} detected")
        print_log(f"   SFX: {len(result['sfx_suggestions'])} suggestions")
        if primary_count > 0 or enhancement_count > 0:
            print_log(f"      ├─ {primary_count} primary (silent sections)")
            print_log(f"      └─ {enhancement_count} enhancements (optional)")
        print_log(f"   Music: {len(result['music_suggestions'])} suggestions")
        print_log(f"   Animations: {len(result['animation_suggestions'])} suggestions")
        print_log("=" * 60)

        return result

    except Exception as e:
        print_log(f"❌ Analysis failed: {e}")
        import traceback
        print_log(traceback.format_exc())

        result['success'] = False
        result['error'] = str(e)

        return result


def main():
    parser = argparse.ArgumentParser(description='Unified Video Analysis')
    parser.add_argument('--video', required=True, help='Path to video file')
    parser.add_argument('--output', required=True, help='Output JSON file path')

    args = parser.parse_args()

    try:
        result = unified_analyze(args.video)

        # Save to file
        with open(args.output, 'w') as f:
            json.dump(result, f, indent=2)

        # Print to stdout for IPC
        print(json.dumps(result))

        return 0 if result['success'] else 1

    except Exception as e:
        print_log(f"❌ Error: {e}")
        import traceback
        print_log(traceback.format_exc())

        error_result = {
            'success': False,
            'error': str(e)
        }

        print(json.dumps(error_result))
        return 1


if __name__ == '__main__':
    sys.exit(main())
