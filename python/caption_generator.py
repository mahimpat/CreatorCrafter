"""
AI Caption Generator for Thumbnails
Uses BLIP vision model + Whisper transcription to generate catchy thumbnail text
"""

import argparse
import json
import sys
import cv2
import os
from pathlib import Path

def print_log(message):
    """Print log message to stderr"""
    print(message, file=sys.stderr)

# Try to import transformers for BLIP
try:
    from transformers import BlipProcessor, BlipForConditionalGeneration
    from PIL import Image
    import torch
    BLIP_AVAILABLE = True
    print_log("✓ BLIP (transformers) imported successfully")
except ImportError as e:
    BLIP_AVAILABLE = False
    print_log(f"✗ BLIP not available: {e}")

# Try to import whisper
try:
    import whisper
    WHISPER_AVAILABLE = True
    print_log("✓ Whisper imported successfully")
except ImportError as e:
    WHISPER_AVAILABLE = False
    print_log(f"✗ Whisper not available: {e}")


def extract_frame_at_timestamp(video_path, timestamp):
    """Extract a single frame at specific timestamp"""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    # Clamp timestamp to valid range
    timestamp = max(0, min(timestamp, duration - 0.1))
    frame_number = int(timestamp * fps)
    frame_number = max(0, min(frame_number, total_frames - 1))

    # Try position-based seek
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()

    if not ret:
        # Fallback to time-based seek
        cap.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
        ret, frame = cap.read()

    cap.release()

    if not ret or frame is None:
        raise Exception(f"Could not extract frame at {timestamp}s")

    return frame


def analyze_visual_scene(image_path):
    """Use BLIP to describe the visual scene"""
    if not BLIP_AVAILABLE:
        print_log("⚠ BLIP not available, skipping visual analysis")
        return None

    try:
        print_log("🔍 Analyzing visual scene with BLIP...")

        # Load BLIP model (using base model for speed)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print_log(f"  Using device: {device}")

        processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)

        # Load and process image
        image = Image.open(image_path).convert('RGB')
        inputs = processor(image, return_tensors="pt").to(device)

        # Generate caption
        output = model.generate(**inputs, max_new_tokens=50)
        caption = processor.decode(output[0], skip_special_tokens=True)

        print_log(f"  Visual description: {caption}")
        return caption

    except Exception as e:
        print_log(f"❌ Visual analysis failed: {e}")
        return None


def extract_audio_context(video_path, timestamp, context_window=10):
    """Extract transcription context around the timestamp"""
    if not WHISPER_AVAILABLE:
        print_log("⚠ Whisper not available, skipping audio context")
        return None

    try:
        print_log("🎧 Extracting audio context with Whisper...")

        # Load Whisper model (use base for speed)
        model = whisper.load_model("base")

        # Transcribe the video
        print_log("  Transcribing video (this may take a moment)...")
        result = model.transcribe(video_path, language="en")

        # Find segments around the timestamp
        start_time = max(0, timestamp - context_window / 2)
        end_time = timestamp + context_window / 2

        relevant_segments = []
        for segment in result['segments']:
            seg_start = segment['start']
            seg_end = segment['end']

            # Check if segment overlaps with our time window
            if seg_start <= end_time and seg_end >= start_time:
                relevant_segments.append(segment['text'].strip())

        context = ' '.join(relevant_segments)
        print_log(f"  Audio context: {context[:100]}...")

        return context

    except Exception as e:
        print_log(f"❌ Audio transcription failed: {e}")
        return None


def generate_thumbnail_captions(visual_description, audio_context, max_words=10):
    """
    Generate 3 thumbnail caption variations

    Args:
        visual_description: BLIP description of the scene
        audio_context: Whisper transcription context
        max_words: Maximum words per caption

    Returns:
        list of 3 caption variations
    """
    print_log("✨ Generating thumbnail caption variations...")

    captions = []

    # Strategy 1: Extract key phrases from audio context
    if audio_context:
        # Simple extraction: find exciting words/phrases
        exciting_words = ['how to', 'best', 'worst', 'amazing', 'incredible', 'unbelievable',
                         'shocking', 'secret', 'revealed', 'ultimate', 'perfect', 'fail',
                         'win', 'epic', 'insane', 'crazy', 'new', 'update', 'first', 'last']

        words = audio_context.lower().split()
        # Look for exciting keywords
        caption_words = []
        for i, word in enumerate(words):
            clean_word = word.strip('.,!?')
            if clean_word in exciting_words or (i > 0 and words[i-1].strip('.,!?') in exciting_words):
                # Take a window around exciting words
                start_idx = max(0, i - 2)
                end_idx = min(len(words), i + 4)
                caption_words = words[start_idx:end_idx]
                break

        if caption_words:
            caption = ' '.join(caption_words[:max_words]).upper()
            caption = caption.strip('.,!?').title()
            captions.append(caption)

    # Strategy 2: Use visual description with emphasis
    if visual_description:
        # Extract key visual elements
        visual_words = visual_description.split()[:max_words]
        visual_caption = ' '.join(visual_words).upper()
        captions.append(visual_caption)

    # Strategy 3: Combine both for context-aware caption
    if visual_description and audio_context:
        # Take first few words from visual + key words from audio
        vis_part = ' '.join(visual_description.split()[:4])
        audio_words = audio_context.split()

        # Find action words in audio
        action_words = []
        for word in audio_words:
            clean = word.strip('.,!?').lower()
            if len(clean) > 3 and clean not in ['that', 'this', 'with', 'from', 'have', 'will', 'would', 'could']:
                action_words.append(word)
                if len(action_words) >= 3:
                    break

        if action_words:
            combined = f"{vis_part}: {' '.join(action_words[:3])}".upper()
            captions.append(combined[:60])  # Limit length

    # Strategy 4: Question format (clickbait style)
    if audio_context:
        # Try to form a question
        audio_lower = audio_context.lower()
        if 'how' in audio_lower:
            idx = audio_lower.find('how')
            question = audio_context[idx:idx+50].split('.')[0]
            captions.append(question.strip().upper() + "?")
        elif 'why' in audio_lower:
            idx = audio_lower.find('why')
            question = audio_context[idx:idx+50].split('.')[0]
            captions.append(question.strip().upper() + "?")
        elif 'what' in audio_lower:
            idx = audio_lower.find('what')
            question = audio_context[idx:idx+50].split('.')[0]
            captions.append(question.strip().upper() + "?")

    # Fallback captions if we don't have enough
    default_captions = [
        "WATCH THIS NOW",
        "YOU WON'T BELIEVE THIS",
        "MUST SEE"
    ]

    while len(captions) < 3:
        captions.append(default_captions[len(captions)])

    # Ensure we have exactly 3 unique captions
    unique_captions = []
    for cap in captions:
        if cap not in unique_captions:
            unique_captions.append(cap)
            if len(unique_captions) == 3:
                break

    # Fill with defaults if needed
    while len(unique_captions) < 3:
        default = default_captions[len(unique_captions)]
        if default not in unique_captions:
            unique_captions.append(default)

    print_log(f"  Generated {len(unique_captions)} caption variations:")
    for i, cap in enumerate(unique_captions[:3], 1):
        print_log(f"    {i}. {cap}")

    return unique_captions[:3]


def main():
    parser = argparse.ArgumentParser(description='AI Thumbnail Caption Generator')
    parser.add_argument('--video', required=True, help='Path to video file')
    parser.add_argument('--timestamp', type=float, required=True, help='Timestamp in seconds')
    parser.add_argument('--output', required=True, help='Output JSON file path')

    args = parser.parse_args()

    try:
        print_log(f"🎬 Generating captions for: {args.video} at {args.timestamp}s")

        # Extract frame for visual analysis
        print_log("📸 Extracting frame...")
        frame = extract_frame_at_timestamp(args.video, args.timestamp)

        # Save frame temporarily for BLIP
        temp_frame_path = '/tmp/caption_frame.jpg'
        cv2.imwrite(temp_frame_path, frame)

        # Analyze visual scene
        visual_description = analyze_visual_scene(temp_frame_path)

        # Extract audio context
        audio_context = extract_audio_context(args.video, args.timestamp, context_window=15)

        # Generate captions
        captions = generate_thumbnail_captions(visual_description, audio_context, max_words=10)

        # Output results
        result = {
            'success': True,
            'captions': captions,
            'visual_description': visual_description,
            'audio_context': audio_context[:200] if audio_context else None,
            'timestamp': args.timestamp
        }

        # Save to file
        with open(args.output, 'w') as f:
            json.dump(result, f, indent=2)

        # Also print to stdout for IPC
        print(json.dumps(result))
        print_log("✅ Caption generation complete!")

        # Cleanup
        if os.path.exists(temp_frame_path):
            os.remove(temp_frame_path)

        return 0

    except Exception as e:
        print_log(f"❌ Caption generation failed: {e}")
        import traceback
        print_log(traceback.format_exc())

        error_result = {
            'success': False,
            'error': str(e),
            'captions': ["WATCH THIS NOW", "MUST SEE", "YOU WON'T BELIEVE THIS"]
        }

        print(json.dumps(error_result))
        return 1


if __name__ == '__main__':
    sys.exit(main())
