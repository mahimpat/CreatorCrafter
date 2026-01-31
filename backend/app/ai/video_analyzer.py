"""
Video Analyzer with Semantic Understanding
Adapted from the original Electron app's Python script.
Analyzes video content using vision models to understand context,
identify actions, and suggest contextual sound effects.

Features intelligent audio description generation:
1. LLM-based (OpenAI/Anthropic) when API keys configured
2. Semantic embedding matching using sentence-transformers
3. Keyword-based fallback with comprehensive mappings

Enhanced with:
- Adaptive frame sampling based on motion detection
- Audio peak detection for emphasis points
- Silence detection for SFX/cut placement
- Emotion detection from scene descriptions
- Content-aware transition suggestions
"""
from typing import Callable, Optional, Dict, Any, List, Tuple
from pathlib import Path
import sys
import numpy as np

# Lazy load models to save memory
_whisper_model = None
_vlm_model = None
_vlm_processor = None
_sentence_model = None
_sound_embeddings = None
_llm_client = None


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


def get_llm_client():
    """Get LLM client for intelligent audio description generation."""
    global _llm_client
    if _llm_client is not None:
        return _llm_client

    from app.config import settings

    # Try Anthropic first (Claude is excellent for this task)
    if settings.ANTHROPIC_API_KEY:
        try:
            import anthropic
            _llm_client = ('anthropic', anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY))
            print("Using Anthropic Claude for audio description generation", file=sys.stderr)
            return _llm_client
        except ImportError:
            print("anthropic package not installed, trying OpenAI", file=sys.stderr)
        except Exception as e:
            print(f"Failed to init Anthropic: {e}", file=sys.stderr)

    # Try OpenAI
    if settings.OPENAI_API_KEY:
        try:
            import openai
            _llm_client = ('openai', openai.OpenAI(api_key=settings.OPENAI_API_KEY))
            print("Using OpenAI for audio description generation", file=sys.stderr)
            return _llm_client
        except ImportError:
            print("openai package not installed", file=sys.stderr)
        except Exception as e:
            print(f"Failed to init OpenAI: {e}", file=sys.stderr)

    return None


def get_sentence_model():
    """Lazy load sentence transformer for semantic matching."""
    global _sentence_model
    if _sentence_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Use a small, fast model for semantic matching
            _sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            print("Loaded sentence transformer for semantic SFX matching", file=sys.stderr)
        except ImportError:
            print("sentence-transformers not installed, using keyword matching", file=sys.stderr)
            return None
        except Exception as e:
            print(f"Failed to load sentence transformer: {e}", file=sys.stderr)
            return None
    return _sentence_model


# Sound categories with semantic descriptions for embedding matching
SOUND_CATEGORIES = [
    # Category: (semantic description for matching, detailed audio prompt)
    ("person walking on street footsteps pedestrian", "clear footsteps walking on hard surface, rhythmic heel-toe pattern, steady pace walking sounds"),
    ("running jogging sprinting athletic exercise", "fast-paced running footsteps on ground, athletic heavy breathing, rapid foot impacts"),
    ("people talking conversation speaking chatting", "soft background conversation murmur, indistinct human voices talking, ambient speech"),
    ("laughing happy joyful smiling cheerful", "genuine warm laughter, happy chuckling sounds, joyful human expression"),
    ("crying sad tears emotional upset", "gentle sobbing, emotional crying sounds, soft weeping"),
    ("eating food dining restaurant meal", "restaurant ambience with cutlery clinking, plates, soft background chatter, dining sounds"),
    ("car driving automobile vehicle road", "smooth car engine humming while driving, tires on road, vehicle interior ambience"),
    ("motorcycle bike riding street", "powerful motorcycle engine revving, exhaust rumble, bike acceleration"),
    ("train railway station subway metro", "train wheels rhythmically clicking on tracks, distant train horn, railway station ambience"),
    ("airplane aircraft flying jet airport", "airplane jet engine roar, cabin pressure hum, aircraft in flight"),
    ("beach ocean sea waves coast shore water", "peaceful ocean waves rolling onto sandy beach, distant seagulls calling, coastal breeze"),
    ("forest trees woods nature woodland", "serene forest ambience with birds singing, gentle wind through leaves, natural woodland sounds"),
    ("rain raining storm weather wet", "steady rainfall with drops hitting surfaces, rain pattering, wet weather sounds"),
    ("thunder lightning storm dramatic weather", "dramatic thunder crack and rumble, lightning strike, intense storm sounds"),
    ("wind windy breezy gusty weather", "strong wind whooshing and gusting, air movement, breezy outdoor sounds"),
    ("river stream water flowing creek", "gentle river water flowing over rocks, babbling stream, peaceful water sounds"),
    ("birds chirping singing nature wildlife", "cheerful birds chirping and singing, multiple bird calls, dawn chorus"),
    ("dog barking pet animal canine", "friendly dog barking, excited panting, playful canine sounds"),
    ("cat meowing pet animal feline", "soft cat meowing, content purring, gentle feline sounds"),
    ("fire flames burning campfire bonfire", "warm crackling campfire, wood popping, cozy fire burning"),
    ("city urban street traffic downtown", "busy city street ambience with distant traffic, car horns, urban hustle"),
    ("office work computer business typing", "quiet office ambience, air conditioning hum, distant keyboard typing, professional space"),
    ("kitchen cooking food preparation chef", "sizzling pan with food cooking, kitchen activity, pots clanking, meal preparation"),
    ("crowd people gathering audience group", "crowd of people murmuring, ambient human voices, public gathering sounds"),
    ("sports game playing athletic activity", "sports activity sounds, athletic movement, competitive game ambience"),
    ("music playing instrument performance concert", "live musical performance, instruments playing, concert venue ambience"),
    ("construction building tools machinery work", "construction site sounds, hammering, power tools, heavy machinery"),
    ("door opening closing entrance exit", "wooden door creaking open, handle turning, door closing sounds"),
    ("phone ringing notification alert technology", "smartphone ringtone, digital notification chime, phone alert"),
    ("typing keyboard computer technology work", "rapid mechanical keyboard typing, mouse clicks, focused work sounds"),
    ("applause clapping audience appreciation cheering", "enthusiastic crowd applause, multiple hands clapping in approval, audience appreciation"),
    ("silence quiet peaceful calm serene", "quiet peaceful ambience, subtle room tone, calm atmosphere"),
    ("night evening dark nighttime crickets", "quiet nighttime ambience, crickets chirping, peaceful night sounds"),
    ("morning sunrise dawn daybreak early", "early morning ambience, birds starting to sing, peaceful dawn"),
]


def get_sound_embeddings():
    """Compute and cache embeddings for sound categories."""
    global _sound_embeddings
    if _sound_embeddings is not None:
        return _sound_embeddings

    model = get_sentence_model()
    if model is None:
        return None

    try:
        # Compute embeddings for all category descriptions
        descriptions = [cat[0] for cat in SOUND_CATEGORIES]
        embeddings = model.encode(descriptions, convert_to_tensor=True)
        _sound_embeddings = embeddings
        return _sound_embeddings
    except Exception as e:
        print(f"Failed to compute sound embeddings: {e}", file=sys.stderr)
        return None


# =============================================================================
# AUDIO ANALYSIS FUNCTIONS (Quick Win #2 & #3)
# =============================================================================

def analyze_audio_features(
    audio_path: str,
    progress_callback: Optional[Callable] = None
) -> Dict[str, Any]:
    """
    Analyze audio for peaks, silence, and energy levels.

    Quick Win #2: Audio Peak Detection - Find emphasis points
    Quick Win #3: Silence Detection - Find gaps for cuts/SFX

    Args:
        audio_path: Path to audio file (WAV format preferred)
        progress_callback: Optional callback(stage, progress, message)

    Returns:
        Dict with peaks, silences, and energy profile
    """
    try:
        import wave
        import struct

        if progress_callback:
            progress_callback("audio_analysis", 25, "Analyzing audio features...")

        # Read audio file
        with wave.open(audio_path, 'rb') as wav:
            n_channels = wav.getnchannels()
            sample_width = wav.getsampwidth()
            frame_rate = wav.getframerate()
            n_frames = wav.getnframes()
            duration = n_frames / frame_rate

            # Read all frames
            raw_data = wav.readframes(n_frames)

        # Convert to numpy array
        if sample_width == 2:  # 16-bit audio
            fmt = f"<{n_frames * n_channels}h"
            samples = np.array(struct.unpack(fmt, raw_data), dtype=np.float32)
        elif sample_width == 1:  # 8-bit audio
            samples = np.array(list(raw_data), dtype=np.float32) - 128
        else:
            # Fallback for other formats
            samples = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32)

        # If stereo, convert to mono
        if n_channels == 2:
            samples = samples.reshape(-1, 2).mean(axis=1)

        # Normalize to -1 to 1
        max_val = np.max(np.abs(samples))
        if max_val > 0:
            samples = samples / max_val

        # Calculate energy in windows (100ms windows)
        window_size = int(frame_rate * 0.1)  # 100ms
        hop_size = int(frame_rate * 0.05)    # 50ms hop

        energy_profile = []
        timestamps = []

        for i in range(0, len(samples) - window_size, hop_size):
            window = samples[i:i + window_size]
            energy = np.sqrt(np.mean(window ** 2))  # RMS energy
            timestamp = i / frame_rate
            energy_profile.append(energy)
            timestamps.append(timestamp)

        energy_profile = np.array(energy_profile)
        timestamps = np.array(timestamps)

        # Detect peaks (Quick Win #2)
        # Find local maxima that are significantly above average
        mean_energy = np.mean(energy_profile)
        std_energy = np.std(energy_profile)
        peak_threshold = mean_energy + 1.5 * std_energy

        peaks = []
        min_peak_gap = 0.5  # Minimum 0.5s between peaks
        last_peak_time = -min_peak_gap

        for i in range(1, len(energy_profile) - 1):
            if energy_profile[i] > peak_threshold:
                # Check if local maximum
                if energy_profile[i] > energy_profile[i-1] and energy_profile[i] > energy_profile[i+1]:
                    timestamp = timestamps[i]
                    if timestamp - last_peak_time >= min_peak_gap:
                        peaks.append({
                            'timestamp': timestamp,
                            'energy': float(energy_profile[i]),
                            'intensity': 'high' if energy_profile[i] > mean_energy + 2 * std_energy else 'medium',
                            'type': 'audio_peak'
                        })
                        last_peak_time = timestamp

        # Detect silences (Quick Win #3)
        # Find regions where energy is below threshold for extended period
        silence_threshold = mean_energy * 0.1  # 10% of mean energy
        min_silence_duration = 0.3  # At least 300ms of silence

        silences = []
        silence_start = None

        for i, (timestamp, energy) in enumerate(zip(timestamps, energy_profile)):
            if energy < silence_threshold:
                if silence_start is None:
                    silence_start = timestamp
            else:
                if silence_start is not None:
                    silence_duration = timestamp - silence_start
                    if silence_duration >= min_silence_duration:
                        silences.append({
                            'start': silence_start,
                            'end': timestamp,
                            'duration': silence_duration,
                            'type': 'silence'
                        })
                    silence_start = None

        # Check for trailing silence
        if silence_start is not None:
            silence_duration = duration - silence_start
            if silence_duration >= min_silence_duration:
                silences.append({
                    'start': silence_start,
                    'end': duration,
                    'duration': silence_duration,
                    'type': 'silence'
                })

        if progress_callback:
            progress_callback("audio_analysis", 30,
                           f"Found {len(peaks)} audio peaks, {len(silences)} silence regions")

        return {
            'peaks': peaks,
            'silences': silences,
            'duration': duration,
            'mean_energy': float(mean_energy),
            'energy_profile': {
                'timestamps': timestamps.tolist()[::10],  # Subsample for storage
                'values': energy_profile.tolist()[::10]
            }
        }

    except Exception as e:
        print(f"Error analyzing audio features: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            'peaks': [],
            'silences': [],
            'duration': 0,
            'mean_energy': 0,
            'energy_profile': {'timestamps': [], 'values': []}
        }


# =============================================================================
# ADVANCED AUDIO ANALYSIS WITH LIBROSA
# =============================================================================

def analyze_audio_advanced(
    audio_path: str,
    progress_callback: Optional[Callable] = None
) -> Dict[str, Any]:
    """
    Advanced audio analysis using librosa for professional-grade features.

    Features:
    - Beat detection with tempo estimation
    - Onset detection for transient events
    - Spectral analysis for energy distribution
    - Music vs speech classification hints

    Args:
        audio_path: Path to audio file
        progress_callback: Optional callback(stage, progress, message)

    Returns:
        Dict with beats, onsets, tempo, spectral features
    """
    try:
        import librosa

        if progress_callback:
            progress_callback("audio_advanced", 20, "Loading audio with librosa...")

        # Load audio with librosa (handles various formats)
        y, sr = librosa.load(audio_path, sr=22050, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        if progress_callback:
            progress_callback("audio_advanced", 22, "Detecting tempo and beats...")

        # Beat detection
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)

        # Handle tempo - could be float or ndarray
        tempo_value = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)

        beats = [
            {
                'timestamp': float(t),
                'type': 'beat',
                'strength': 1.0 if i % 4 == 0 else 0.5  # Downbeat vs offbeat
            }
            for i, t in enumerate(beat_times)
        ]

        if progress_callback:
            progress_callback("audio_advanced", 24, "Detecting audio onsets...")

        # Onset detection (transients - hits, attacks, etc.)
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units='frames')
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)
        onset_strengths = librosa.onset.onset_strength(y=y, sr=sr)

        # Get strength for each onset
        onsets = []
        for i, onset_frame in enumerate(onset_frames):
            if onset_frame < len(onset_strengths):
                strength = float(onset_strengths[onset_frame])
                onsets.append({
                    'timestamp': float(onset_times[i]),
                    'type': 'onset',
                    'strength': strength / max(onset_strengths) if max(onset_strengths) > 0 else 0.5
                })

        # Filter to significant onsets only
        if onsets:
            mean_strength = np.mean([o['strength'] for o in onsets])
            significant_onsets = [o for o in onsets if o['strength'] > mean_strength]
        else:
            significant_onsets = []

        if progress_callback:
            progress_callback("audio_advanced", 26, "Analyzing spectral features...")

        # Spectral analysis
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        rms = librosa.feature.rms(y=y)[0]

        # Calculate average spectral features
        avg_centroid = float(np.mean(spectral_centroids))
        avg_rolloff = float(np.mean(spectral_rolloff))
        avg_rms = float(np.mean(rms))

        # Energy segments (high energy moments)
        frame_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
        rms_threshold = np.mean(rms) + np.std(rms)

        high_energy_segments = []
        in_segment = False
        segment_start = 0

        for i, (time, energy) in enumerate(zip(frame_times, rms)):
            if energy > rms_threshold and not in_segment:
                in_segment = True
                segment_start = time
            elif energy <= rms_threshold and in_segment:
                in_segment = False
                if time - segment_start > 0.3:  # At least 300ms
                    high_energy_segments.append({
                        'start': float(segment_start),
                        'end': float(time),
                        'duration': float(time - segment_start),
                        'type': 'high_energy'
                    })

        if progress_callback:
            progress_callback("audio_advanced", 28,
                           f"Found {len(beats)} beats, {len(significant_onsets)} onsets, tempo: {tempo_value:.0f} BPM")

        return {
            'tempo': tempo_value,
            'beats': beats,
            'onsets': significant_onsets,
            'high_energy_segments': high_energy_segments[:20],  # Limit for storage
            'duration': duration,
            'spectral': {
                'avg_centroid': avg_centroid,
                'avg_rolloff': avg_rolloff,
                'avg_rms': avg_rms
            },
            # Helpful for demo: beat-synced timestamps for SFX
            'beat_sync_points': [float(t) for t in beat_times[::4]][:20],  # Every 4th beat
            'intensity_curve': {
                'timestamps': frame_times[::20].tolist()[:100],
                'values': rms[::20].tolist()[:100]
            }
        }

    except ImportError as e:
        print(f"librosa not available: {e}", file=sys.stderr)
        return _empty_audio_advanced()
    except Exception as e:
        print(f"Error in advanced audio analysis: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return _empty_audio_advanced()


def _empty_audio_advanced() -> Dict[str, Any]:
    """Return empty structure for advanced audio analysis."""
    return {
        'tempo': 0,
        'beats': [],
        'onsets': [],
        'high_energy_segments': [],
        'duration': 0,
        'spectral': {'avg_centroid': 0, 'avg_rolloff': 0, 'avg_rms': 0},
        'beat_sync_points': [],
        'intensity_curve': {'timestamps': [], 'values': []}
    }


# =============================================================================
# PROFESSIONAL SCENE DETECTION WITH PYSCENEDETECT
# =============================================================================

def detect_scenes_professional(
    video_path: str,
    progress_callback: Optional[Callable] = None,
    threshold: float = 27.0
) -> Dict[str, Any]:
    """
    Professional scene detection using PySceneDetect.

    Much more accurate than basic frame differencing:
    - ContentDetector: Detects content changes (color, motion)
    - Precise cut timestamps
    - Configurable threshold for sensitivity

    Args:
        video_path: Path to video file
        progress_callback: Optional callback(stage, progress, message)
        threshold: Detection sensitivity (lower = more sensitive, default 27.0)

    Returns:
        Dict with scenes list and metadata
    """
    try:
        from scenedetect import detect, ContentDetector, AdaptiveDetector
        from scenedetect.scene_manager import SceneManager
        from scenedetect.video_stream import VideoStream

        if progress_callback:
            progress_callback("scene_detection", 75, "Running professional scene detection...")

        # Use ContentDetector for general content changes
        # AdaptiveDetector is better for varying lighting
        scene_list = detect(video_path, ContentDetector(threshold=threshold))

        scenes = []
        for i, scene in enumerate(scene_list):
            start_time = scene[0].get_seconds()
            end_time = scene[1].get_seconds()
            duration = end_time - start_time

            scenes.append({
                'scene_number': i + 1,
                'start': start_time,
                'end': end_time,
                'duration': duration,
                'type': 'detected_scene'
            })

        # Calculate cuts (transition points between scenes)
        cuts = []
        for i in range(len(scenes) - 1):
            cut_time = scenes[i]['end']

            # Determine cut type based on scene durations
            prev_duration = scenes[i]['duration']
            next_duration = scenes[i + 1]['duration'] if i + 1 < len(scenes) else 0

            # Fast cuts indicate action, slow cuts indicate calm scenes
            if prev_duration < 2.0 or next_duration < 2.0:
                cut_type = 'fast_cut'
                suggested_transition = 'cut'
            elif prev_duration > 5.0 and next_duration > 5.0:
                cut_type = 'slow_cut'
                suggested_transition = 'dissolve'
            else:
                cut_type = 'normal_cut'
                suggested_transition = 'fade'

            cuts.append({
                'timestamp': cut_time,
                'type': cut_type,
                'suggested_transition': suggested_transition,
                'confidence': 0.95,  # PySceneDetect is very accurate
                'scene_before': i + 1,
                'scene_after': i + 2
            })

        # Calculate pacing metrics
        if scenes:
            avg_scene_duration = sum(s['duration'] for s in scenes) / len(scenes)

            if avg_scene_duration < 2.0:
                pacing = 'fast'
            elif avg_scene_duration < 5.0:
                pacing = 'moderate'
            else:
                pacing = 'slow'
        else:
            avg_scene_duration = 0
            pacing = 'unknown'

        if progress_callback:
            progress_callback("scene_detection", 78,
                           f"Detected {len(scenes)} scenes, {len(cuts)} cuts ({pacing} pacing)")

        return {
            'scenes': scenes,
            'cuts': cuts,
            'total_scenes': len(scenes),
            'total_cuts': len(cuts),
            'avg_scene_duration': avg_scene_duration,
            'pacing': pacing,
            'detection_method': 'pyscenedetect_content'
        }

    except ImportError as e:
        print(f"PySceneDetect not available: {e}, falling back to basic detection", file=sys.stderr)
        return _detect_scenes_fallback(video_path, progress_callback)
    except Exception as e:
        print(f"Error in professional scene detection: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return _detect_scenes_fallback(video_path, progress_callback)


def _detect_scenes_fallback(
    video_path: str,
    progress_callback: Optional[Callable] = None
) -> Dict[str, Any]:
    """Fallback scene detection using basic frame differencing."""
    import cv2

    try:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps
        cap.release()

        # Return minimal structure
        return {
            'scenes': [{'scene_number': 1, 'start': 0, 'end': duration, 'duration': duration, 'type': 'full_video'}],
            'cuts': [],
            'total_scenes': 1,
            'total_cuts': 0,
            'avg_scene_duration': duration,
            'pacing': 'unknown',
            'detection_method': 'fallback'
        }
    except Exception:
        return {
            'scenes': [],
            'cuts': [],
            'total_scenes': 0,
            'total_cuts': 0,
            'avg_scene_duration': 0,
            'pacing': 'unknown',
            'detection_method': 'failed'
        }


# =============================================================================
# EMOTION DETECTION (Quick Win #4)
# =============================================================================

# Emotion keywords for scene mood detection
EMOTION_KEYWORDS = {
    'happy': {
        'keywords': ['smiling', 'laughing', 'happy', 'joy', 'cheerful', 'excited', 'celebration',
                     'party', 'fun', 'playing', 'dancing', 'bright', 'sunny', 'colorful'],
        'transitions': ['zoom_in', 'flash', 'spin'],
        'sfx_mood': 'upbeat, cheerful'
    },
    'sad': {
        'keywords': ['sad', 'crying', 'tears', 'alone', 'lonely', 'dark', 'rain', 'gloomy',
                     'depressed', 'grief', 'mourning', 'somber'],
        'transitions': ['dissolve', 'fade', 'blur'],
        'sfx_mood': 'melancholic, soft'
    },
    'exciting': {
        'keywords': ['action', 'running', 'fast', 'explosion', 'chase', 'fight', 'sports',
                     'racing', 'jumping', 'extreme', 'intense', 'battle', 'competition'],
        'transitions': ['glitch', 'flash', 'zoom_in', 'cut'],
        'sfx_mood': 'intense, dynamic'
    },
    'calm': {
        'keywords': ['peaceful', 'calm', 'quiet', 'serene', 'nature', 'forest', 'beach',
                     'sunset', 'sunrise', 'meditation', 'relaxing', 'gentle', 'slow'],
        'transitions': ['dissolve', 'fade', 'cross_zoom'],
        'sfx_mood': 'ambient, peaceful'
    },
    'dramatic': {
        'keywords': ['dramatic', 'intense', 'serious', 'confrontation', 'argument', 'tension',
                     'suspense', 'climax', 'revelation', 'shocking', 'surprised'],
        'transitions': ['zoom_in', 'flash', 'wipe_left'],
        'sfx_mood': 'dramatic, impactful'
    },
    'romantic': {
        'keywords': ['romantic', 'love', 'couple', 'kiss', 'wedding', 'embrace', 'holding hands',
                     'date', 'flowers', 'candlelight', 'intimate'],
        'transitions': ['dissolve', 'fade', 'blur'],
        'sfx_mood': 'soft, romantic'
    },
    'mysterious': {
        'keywords': ['mysterious', 'dark', 'shadow', 'fog', 'mist', 'unknown', 'hidden',
                     'secret', 'night', 'eerie', 'strange', 'unusual'],
        'transitions': ['dissolve', 'fade', 'blur'],
        'sfx_mood': 'mysterious, atmospheric'
    },
    'funny': {
        'keywords': ['funny', 'comedy', 'laughing', 'joke', 'silly', 'humor', 'comic',
                     'prank', 'amusing', 'hilarious', 'goofy'],
        'transitions': ['zoom_in', 'spin', 'flash'],
        'sfx_mood': 'comedic, playful'
    }
}


def detect_emotion_from_description(description: str) -> Dict[str, Any]:
    """
    Detect emotional tone from scene description.
    Quick Win #4: Emotion keyword detection for mood-aware editing.

    Args:
        description: Scene description text

    Returns:
        Dict with detected emotion, confidence, and editing suggestions
    """
    desc_lower = description.lower()

    emotion_scores = {}

    for emotion, data in EMOTION_KEYWORDS.items():
        # Count matching keywords
        matches = sum(1 for kw in data['keywords'] if kw in desc_lower)
        if matches > 0:
            # Score based on number of matches and keyword specificity
            emotion_scores[emotion] = matches

    if not emotion_scores:
        # Default to neutral
        return {
            'emotion': 'neutral',
            'confidence': 0.3,
            'suggested_transitions': ['dissolve', 'fade'],
            'sfx_mood': 'ambient, neutral'
        }

    # Get dominant emotion
    dominant_emotion = max(emotion_scores, key=emotion_scores.get)
    max_score = emotion_scores[dominant_emotion]

    # Calculate confidence based on number of matches
    confidence = min(0.5 + (max_score * 0.15), 0.95)

    emotion_data = EMOTION_KEYWORDS[dominant_emotion]

    return {
        'emotion': dominant_emotion,
        'confidence': confidence,
        'suggested_transitions': emotion_data['transitions'],
        'sfx_mood': emotion_data['sfx_mood'],
        'all_emotions': emotion_scores
    }


# =============================================================================
# MOTION DETECTION FOR ADAPTIVE SAMPLING (Quick Win #1)
# =============================================================================

def calculate_frame_motion(prev_frame, curr_frame) -> float:
    """
    Calculate motion score between two frames using frame differencing.

    Args:
        prev_frame: Previous frame (grayscale, resized)
        curr_frame: Current frame (grayscale, resized)

    Returns:
        Motion score (0.0 to 1.0)
    """
    if prev_frame is None:
        return 0.0

    # Calculate absolute difference
    diff = np.abs(curr_frame.astype(float) - prev_frame.astype(float))

    # Motion score is normalized mean difference
    motion_score = np.mean(diff) / 255.0

    return motion_score


def get_adaptive_sample_points(
    video_path: str,
    base_interval: float = 3.0,
    min_interval: float = 1.0,
    max_interval: float = 5.0,
    motion_threshold: float = 0.05
) -> List[float]:
    """
    Determine adaptive sample points based on motion detection.
    Quick Win #1: Sample more frames during motion, fewer during static scenes.

    Args:
        video_path: Path to video file
        base_interval: Default sampling interval in seconds
        min_interval: Minimum interval during high motion
        max_interval: Maximum interval during low motion
        motion_threshold: Threshold to consider motion significant

    Returns:
        List of timestamps to sample
    """
    import cv2

    try:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps

        # First pass: Calculate motion scores at regular intervals
        motion_scores = []
        motion_timestamps = []

        # Sample every 0.5 seconds for motion detection
        motion_sample_interval = int(fps * 0.5)
        prev_frame = None
        frame_idx = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % motion_sample_interval == 0:
                # Convert to grayscale and resize for fast processing
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                small = cv2.resize(gray, (160, 90))

                motion = calculate_frame_motion(prev_frame, small)
                motion_scores.append(motion)
                motion_timestamps.append(frame_idx / fps)

                prev_frame = small

            frame_idx += 1

        cap.release()

        if not motion_scores:
            # Fallback to uniform sampling
            return list(np.arange(0, duration, base_interval))

        # Second pass: Determine adaptive sample points
        sample_points = [0.0]  # Always start at beginning
        current_time = 0.0

        motion_scores = np.array(motion_scores)
        motion_timestamps = np.array(motion_timestamps)
        mean_motion = np.mean(motion_scores)

        while current_time < duration - 0.5:
            # Find motion score near current time
            idx = np.argmin(np.abs(motion_timestamps - current_time))
            local_motion = motion_scores[max(0, idx-2):min(len(motion_scores), idx+3)].mean()

            # Adjust interval based on motion
            if local_motion > motion_threshold * 2:
                # High motion - sample more frequently
                interval = min_interval
            elif local_motion > motion_threshold:
                # Medium motion - use base interval
                interval = base_interval
            else:
                # Low motion - sample less frequently
                interval = max_interval

            current_time += interval
            if current_time < duration - 0.5:
                sample_points.append(current_time)

        # Always include end
        if sample_points[-1] < duration - 1.0:
            sample_points.append(duration - 0.5)

        return sample_points

    except Exception as e:
        print(f"Error in adaptive sampling: {e}", file=sys.stderr)
        # Fallback to uniform sampling
        return list(np.arange(0, duration if 'duration' in dir() else 60, base_interval))


def generate_audio_description_llm(visual_description: str) -> Optional[str]:
    """
    Use LLM to intelligently generate audio description from visual description.
    Returns None if no LLM is configured or if generation fails.
    """
    client_info = get_llm_client()
    if client_info is None:
        return None

    client_type, client = client_info

    prompt = f"""Given this visual scene description, generate a detailed audio/sound effect description that would naturally accompany this scene.
The description should be suitable for an AI audio generation model (like AudioGen or MusicGen).
Focus on environmental sounds, ambient noise, and sound effects - NOT music or dialogue.

Visual description: "{visual_description}"

Generate a single, detailed audio description (20-50 words) that describes the sounds in this scene.
Only output the audio description, nothing else."""

    try:
        if client_type == 'anthropic':
            response = client.messages.create(
                model="claude-3-haiku-20240307",  # Fast, cheap, good enough for this
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text.strip()

        elif client_type == 'openai':
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",  # Fast, cheap
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"LLM audio description generation failed: {e}", file=sys.stderr)
        return None


def infer_sounds_semantic(description: str) -> Optional[str]:
    """
    Use semantic embeddings to find the best matching sound category.
    Returns None if semantic matching is not available.
    """
    model = get_sentence_model()
    embeddings = get_sound_embeddings()

    if model is None or embeddings is None:
        return None

    try:
        import torch
        # Encode the input description
        query_embedding = model.encode(description, convert_to_tensor=True)

        # Compute cosine similarities
        from sentence_transformers import util
        similarities = util.cos_sim(query_embedding, embeddings)[0]

        # Get the best match
        best_idx = torch.argmax(similarities).item()
        best_score = similarities[best_idx].item()

        # Only use if similarity is good enough
        if best_score > 0.25:  # Threshold for semantic match
            return SOUND_CATEGORIES[best_idx][1]

        return None

    except Exception as e:
        print(f"Semantic matching failed: {e}", file=sys.stderr)
        return None


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


def infer_sounds_from_description(description: str) -> str:
    """
    Intelligently infer appropriate sounds from a visual description.
    Uses a multi-stage pipeline for maximum accuracy:

    1. LLM-based generation (if API key configured) - Most accurate
    2. Semantic embedding matching - Handles variations well
    3. Keyword-based fallback - Fast, reliable baseline

    Args:
        description: Visual description of a scene

    Returns:
        Detailed audio description suitable for AI audio generation
    """
    from app.config import settings

    # Stage 1: Try LLM-based generation (most intelligent)
    llm_result = generate_audio_description_llm(description)
    if llm_result:
        return llm_result

    # Stage 2: Try semantic matching (handles variations better than keywords)
    if settings.USE_SEMANTIC_SFX_MATCHING:
        semantic_result = infer_sounds_semantic(description)
        if semantic_result:
            return semantic_result

    # Stage 3: Keyword-based fallback (always works, fast)
    return infer_sounds_keyword_based(description)


def infer_sounds_keyword_based(description: str) -> str:
    """
    Keyword-based sound inference - reliable fallback method.
    Uses comprehensive keyword matching with priority-based selection.
    """
    desc_lower = description.lower()

    # Enhanced sound mappings with detailed, generation-friendly prompts
    # Format: (keywords, detailed_prompt, priority)
    sound_mappings = [
        # People & Actions
        (['person walking', 'man walking', 'woman walking', 'people walking'],
         'clear footsteps walking on hard surface, rhythmic heel-toe pattern, steady pace walking sounds', 4),
        (['running', 'jogging', 'sprinting'],
         'fast-paced running footsteps on ground, athletic heavy breathing, rapid foot impacts', 4),
        (['talking', 'speaking', 'conversation', 'interview'],
         'soft background conversation murmur, indistinct human voices talking, ambient speech', 3),
        (['laughing', 'smiling happily', 'happy'],
         'genuine warm laughter, happy chuckling sounds, joyful human expression', 4),
        (['crying', 'sad', 'tears', 'emotional'],
         'gentle sobbing, emotional crying sounds, soft weeping', 4),
        (['eating', 'dining', 'restaurant', 'food', 'meal'],
         'restaurant ambience with cutlery clinking, plates, soft background chatter, dining sounds', 3),
        (['drinking', 'coffee', 'tea', 'beverage', 'sipping'],
         'liquid pouring into glass, sipping sounds, drink being consumed', 3),
        (['clapping', 'applause', 'audience'],
         'enthusiastic crowd applause, multiple hands clapping in approval, audience appreciation', 4),
        (['typing', 'working on computer'],
         'rapid mechanical keyboard typing, mouse clicks, focused work sounds', 4),

        # Vehicles & Transportation
        (['car driving', 'car moving', 'automobile', 'driving'],
         'smooth car engine humming while driving, tires on road, vehicle interior ambience', 4),
        (['car starting', 'engine start'],
         'car engine ignition, motor starting up, vehicle coming to life', 4),
        (['motorcycle', 'motorbike', 'biker'],
         'powerful motorcycle engine revving, exhaust rumble, bike acceleration', 4),
        (['bus', 'coach', 'public transport'],
         'large bus engine idling, hydraulic door hissing open, public transit sounds', 3),
        (['train', 'railway', 'subway', 'metro'],
         'train wheels rhythmically clicking on tracks, distant train horn, railway station ambience', 4),
        (['airplane', 'plane', 'aircraft', 'flying'],
         'airplane jet engine roar, cabin pressure hum, aircraft in flight', 4),
        (['airport', 'terminal'],
         'busy airport terminal ambience, flight announcements, travelers with luggage', 3),
        (['bicycle', 'bike', 'cycling', 'cyclist'],
         'bicycle chain clicking, wheels spinning, gentle pedaling sounds on pavement', 3),
        (['boat', 'ship', 'sailing', 'water vessel'],
         'boat motor puttering, water lapping against hull, nautical sounds', 4),
        (['helicopter', 'chopper'],
         'helicopter rotor blades whopping, powerful chopper engine, aerial vehicle', 4),

        # Nature & Outdoors - Enhanced
        (['beach', 'ocean', 'sea', 'coast', 'shore'],
         'peaceful ocean waves rolling onto sandy beach, distant seagulls calling, coastal breeze', 4),
        (['forest', 'woods', 'trees', 'woodland'],
         'serene forest ambience with birds singing, gentle wind through leaves, natural woodland sounds', 4),
        (['jungle', 'tropical', 'rainforest'],
         'dense jungle sounds with exotic birds, insects buzzing, tropical rainforest ambience', 4),
        (['rain', 'raining', 'rainy'],
         'steady rainfall with drops hitting surfaces, rain pattering, wet weather sounds', 4),
        (['heavy rain', 'downpour', 'storm'],
         'intense heavy rainfall, thunder rumbling in distance, dramatic storm ambience', 4),
        (['thunder', 'lightning', 'thunderstorm'],
         'dramatic thunder crack and rumble, lightning strike, intense storm sounds', 4),
        (['wind', 'windy', 'breezy', 'gusty'],
         'strong wind whooshing and gusting, air movement, breezy outdoor sounds', 4),
        (['river', 'stream', 'creek', 'brook'],
         'gentle river water flowing over rocks, babbling stream, peaceful water sounds', 4),
        (['waterfall', 'cascade'],
         'powerful waterfall rushing and crashing, cascading water, majestic falls', 4),
        (['birds', 'bird', 'songbird'],
         'cheerful birds chirping and singing, multiple bird calls, dawn chorus', 3),
        (['dog', 'puppy', 'canine'],
         'friendly dog barking, excited panting, playful canine sounds', 4),
        (['cat', 'kitten', 'feline'],
         'soft cat meowing, content purring, gentle feline sounds', 4),
        (['horse', 'horses', 'equine', 'galloping'],
         'horse hooves galloping on ground, powerful neighing, equestrian sounds', 4),
        (['fire', 'campfire', 'flames', 'bonfire'],
         'warm crackling campfire, wood popping, cozy fire burning', 4),
        (['snow', 'snowy', 'winter', 'cold'],
         'footsteps crunching through fresh snow, cold winter wind, snowy ambience', 3),

        # Urban & Indoor - Enhanced
        (['city', 'street', 'urban', 'downtown', 'metropolis'],
         'busy city street ambience with distant traffic, car horns, urban hustle', 3),
        (['traffic', 'busy road', 'highway'],
         'constant traffic noise, cars passing by, road ambience', 3),
        (['office', 'workplace', 'corporate'],
         'quiet office ambience, air conditioning hum, distant keyboard typing, professional space', 2),
        (['kitchen', 'cooking', 'chef', 'preparing food'],
         'sizzling pan with food cooking, kitchen activity, pots clanking, meal preparation', 4),
        (['bathroom', 'shower', 'bathing'],
         'shower water running, bathroom echo, water splashing', 3),
        (['door opening', 'entering', 'entrance'],
         'wooden door creaking open, handle turning, doorway sounds', 4),
        (['door closing', 'shutting door', 'exit'],
         'door firmly closing shut, latch clicking, door closing sounds', 4),
        (['stairs', 'staircase', 'climbing'],
         'footsteps ascending wooden stairs, creaking steps, climbing sounds', 4),
        (['elevator', 'lift'],
         'elevator bell ding, mechanical doors sliding, lift arrival', 4),

        # Technology & Electronics
        (['computer', 'laptop', 'desktop'],
         'computer fan whirring softly, hard drive activity, electronic device ambience', 2),
        (['phone ringing', 'incoming call'],
         'smartphone ringtone, phone vibrating, incoming call alert', 4),
        (['notification', 'alert', 'message'],
         'digital notification chime, message alert sound, phone ping', 4),
        (['camera', 'photography', 'taking photo'],
         'camera shutter clicking, autofocus beep, photograph being taken', 4),
        (['video game', 'gaming', 'playing game'],
         'video game sound effects, button mashing, gaming sounds', 3),

        # Sports & Activities - Enhanced
        (['soccer', 'football', 'playing soccer'],
         'soccer ball being kicked, crowd cheering, whistle blowing, football match ambience', 4),
        (['basketball', 'court', 'playing basketball'],
         'basketball bouncing on court, sneakers squeaking, ball swishing through net', 4),
        (['swimming', 'pool', 'swimmer', 'diving'],
         'water splashing, swimmer strokes, pool ambience, diving sounds', 4),
        (['gym', 'workout', 'exercise', 'fitness', 'weights'],
         'weights clanking, exercise machine sounds, gym ambience, heavy breathing workout', 3),
        (['golf', 'golfing', 'golf course'],
         'golf club swinging through air, ball struck cleanly, golf course ambience', 4),
        (['tennis', 'tennis court'],
         'tennis ball struck by racket, ball bouncing on court, tennis match sounds', 4),
        (['boxing', 'fighting', 'punching'],
         'boxing gloves hitting, punching sounds, combat sports', 4),

        # Music & Entertainment - Enhanced
        (['concert', 'live music', 'performing'],
         'live concert performance, crowd cheering, amplified music, venue ambience', 4),
        (['guitar', 'playing guitar', 'acoustic'],
         'acoustic guitar strings being strummed, melodic guitar playing', 4),
        (['piano', 'playing piano', 'pianist'],
         'piano keys being played, melodic piano music, classical piano sounds', 4),
        (['drums', 'drummer', 'drumming'],
         'drum kit being played, rhythmic drum beats, percussion sounds', 4),
        (['dancing', 'dance', 'dancer', 'disco'],
         'dance floor sounds, rhythmic music, dancing footwork', 3),
        (['party', 'celebration', 'festive'],
         'lively party atmosphere, music playing, people chatting and laughing', 3),

        # Work & Industry
        (['construction', 'building site', 'construction site'],
         'construction site sounds, hammering, power tools, heavy machinery', 4),
        (['factory', 'industrial', 'manufacturing', 'machinery'],
         'industrial factory machinery, conveyor belts, manufacturing sounds', 3),
        (['farm', 'farming', 'agriculture', 'barn', 'rural'],
         'peaceful farm ambience, roosters crowing, tractor in distance, rural sounds', 3),

        # General with better fallbacks
        (['crowd', 'people', 'group of', 'audience'],
         'crowd of people murmuring, ambient human voices, public gathering sounds', 3),
        (['outdoor', 'outside', 'park', 'nature'],
         'peaceful outdoor ambience, birds chirping, gentle breeze, natural environment', 2),
        (['indoor', 'room', 'inside', 'interior'],
         'quiet indoor room tone, subtle air conditioning, calm interior ambience', 1),
        (['night', 'nighttime', 'dark', 'evening'],
         'quiet nighttime ambience, crickets chirping, peaceful night sounds', 2),
        (['morning', 'sunrise', 'dawn'],
         'early morning ambience, birds starting to sing, peaceful dawn', 2),
    ]

    matched_sounds = []

    for keywords, sound, priority in sound_mappings:
        if any(keyword in desc_lower for keyword in keywords):
            matched_sounds.append((sound, priority))

    if matched_sounds:
        # Sort by priority (higher first) and take best match
        matched_sounds.sort(key=lambda x: x[1], reverse=True)
        # Return the highest priority, most descriptive match
        return matched_sounds[0][0]

    # Fallback: create contextual ambient sound
    return "soft ambient background atmosphere, subtle environmental sounds"


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
        # Generate general description - this is what BLIP does best
        out = model.generate(**inputs, max_length=50)
        general_description = processor.decode(out[0], skip_special_tokens=True)

    # Infer sounds from the visual description using our smart mapping
    sound_description = infer_sounds_from_description(general_description)

    return {
        'description': general_description,
        'action_description': general_description,  # Use same description
        'sound_description': sound_description,
        'confidence': 0.85
    }


def analyze_scenes(
    video_path: str,
    progress_callback: Optional[Callable] = None,
    use_adaptive_sampling: bool = True
) -> List[Dict]:
    """
    Dynamically analyze video using vision-language model.
    Enhanced with adaptive sampling and emotion detection.

    Args:
        video_path: Path to video file
        progress_callback: Optional callback(stage, progress, message)
        use_adaptive_sampling: Use motion-based adaptive sampling (Quick Win #1)

    Returns:
        List of scenes with natural language descriptions and emotion data
    """
    import cv2

    try:
        model, processor = get_vlm_model()

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps

        scenes = []

        # Quick Win #1: Use adaptive sampling based on motion detection
        if use_adaptive_sampling:
            if progress_callback:
                progress_callback("scene_analysis", 35, "Detecting motion for adaptive sampling...")

            sample_points = get_adaptive_sample_points(
                video_path,
                base_interval=3.0,
                min_interval=1.5,  # More samples during action
                max_interval=5.0,  # Fewer samples during static scenes
                motion_threshold=0.03
            )
            total_samples = len(sample_points)

            if progress_callback:
                progress_callback("scene_analysis", 40,
                                f"Adaptive sampling: {total_samples} frames selected")
        else:
            # Uniform sampling every 3 seconds
            sample_points = list(np.arange(0, duration, 3.0))
            total_samples = len(sample_points)

        processed_samples = 0

        for timestamp in sample_points:
            frame_idx = int(timestamp * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()

            if not ret:
                continue

            # Analyze frame
            analysis = analyze_frame_content(frame, model, processor)

            # Quick Win #4: Detect emotion from description
            emotion_data = detect_emotion_from_description(analysis['description'])

            scene = {
                'timestamp': timestamp,
                'type': 'dynamic_moment',
                'description': analysis['description'],
                'action_description': analysis['action_description'],
                'sound_description': analysis['sound_description'],
                'confidence': analysis['confidence'],
                # Enhanced with emotion data
                'emotion': emotion_data['emotion'],
                'emotion_confidence': emotion_data['confidence'],
                'suggested_transitions': emotion_data['suggested_transitions'],
                'sfx_mood': emotion_data['sfx_mood']
            }

            scenes.append(scene)
            processed_samples += 1

            if progress_callback:
                progress = int((processed_samples / max(total_samples, 1)) * 100)
                progress_callback(
                    "scene_analysis",
                    40 + int(progress * 0.4),
                    f"Analyzing scene {processed_samples}/{total_samples} ({scene['emotion']})"
                )

        cap.release()

        # Log emotion distribution
        emotion_counts = {}
        for scene in scenes:
            emotion = scene.get('emotion', 'neutral')
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        print(f"Emotion distribution: {emotion_counts}", file=sys.stderr)

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
    # Use our smart inference instead of relying on model's sound description
    # Filter out bad model outputs (repetitive text, nonsense)
    if sound_desc and len(set(sound_desc.split())) > 3:  # Has variety in words
        # Check if it looks like valid text (not repetitive gibberish)
        words = sound_desc.lower().split()
        unique_ratio = len(set(words)) / max(len(words), 1)
        if unique_ratio > 0.3:  # More than 30% unique words
            return sound_desc

    # Use the smart inference from visual description
    combined = f"{visual_desc} {action_desc}"
    return infer_sounds_from_description(combined)


def suggest_sfx(scenes: List[Dict], transcription: List[Dict]) -> List[Dict]:
    """
    Dynamically suggest sound effects based on scene analysis.
    Generates detailed, descriptive prompts suitable for AI audio generation.

    Args:
        scenes: List of scenes with descriptions
        transcription: List of transcription segments

    Returns:
        List of SFX suggestions with detailed prompts
    """
    suggestions = []

    for scene in scenes:
        if scene.get('type') == 'dynamic_moment':
            timestamp = scene['timestamp']
            visual_desc = scene.get('description', '')
            action_desc = scene.get('action_description', '')
            sound_desc = scene.get('sound_description', '')

            # Generate detailed audio prompt
            sfx_prompt = convert_visual_to_audio_description(
                visual_desc, action_desc, sound_desc
            )

            if sfx_prompt and len(sfx_prompt) > 10:
                # Create a clean, descriptive reason
                reason = visual_desc
                if len(reason) > 80:
                    reason = reason[:77] + '...'

                suggestions.append({
                    'timestamp': timestamp,
                    'prompt': sfx_prompt,
                    'reason': f'Visual: {reason}',
                    'confidence': scene.get('confidence', 0.7),
                    'visual_context': visual_desc,
                    'action_context': action_desc,
                    'duration_hint': 3.0  # Suggested duration for the SFX
                })

    # Sort by timestamp
    suggestions.sort(key=lambda x: x['timestamp'])

    # Deduplicate - keep suggestions that are at least 2 seconds apart
    unique_suggestions = []
    for suggestion in suggestions:
        # Check if there's already a similar suggestion nearby
        similar = next((s for s in unique_suggestions
                       if abs(s['timestamp'] - suggestion['timestamp']) < 2.0), None)

        if similar:
            # Keep the one with higher confidence
            if suggestion['confidence'] > similar['confidence']:
                unique_suggestions.remove(similar)
                unique_suggestions.append(suggestion)
        else:
            unique_suggestions.append(suggestion)

    # Filter by confidence and return
    return [s for s in unique_suggestions if s.get('confidence', 0) > 0.35]


def detect_transitions(
    video_path: str,
    progress_callback: Optional[Callable] = None,
    scenes: Optional[List[Dict]] = None
) -> List[Dict]:
    """
    Detect scene transitions/cuts in the video using frame differencing.
    Optimized for CPU by sampling frames instead of processing every frame.

    Args:
        video_path: Path to video file
        progress_callback: Optional callback(stage, progress, message)

    Returns:
        List of detected transitions with timestamps and suggested types
    """
    import cv2
    import numpy as np

    try:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps

        transitions = []
        prev_frame = None
        prev_hist = None

        # Parameters for transition detection
        HARD_CUT_THRESHOLD = 0.7  # High difference = hard cut
        SOFT_CUT_THRESHOLD = 0.4  # Medium difference = gradual transition
        MIN_TRANSITION_GAP = 1.5  # Minimum 1.5 seconds between transitions

        last_transition_time = -MIN_TRANSITION_GAP

        # Optimize: Sample every N frames instead of every frame
        # For 30fps video, sample every 3 frames (~10fps effective)
        # This speeds up processing by 3x while still catching transitions
        sample_interval = max(1, int(fps / 10))  # Sample at ~10fps
        total_samples = frame_count // sample_interval
        processed_samples = 0

        if progress_callback:
            progress_callback("transition_detection", 80,
                            f"Detecting transitions (sampling {total_samples} frames)...")

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Only process sampled frames
            if frame_idx % sample_interval == 0:
                timestamp = frame_idx / fps

                # Convert to grayscale and resize for faster processing
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                small = cv2.resize(gray, (160, 90))

                # Calculate histogram
                hist = cv2.calcHist([small], [0], None, [64], [0, 256])
                hist = cv2.normalize(hist, hist).flatten()

                if prev_hist is not None and timestamp - last_transition_time >= MIN_TRANSITION_GAP:
                    # Compare histograms
                    hist_diff = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_BHATTACHARYYA)

                    # Also check structural similarity
                    if prev_frame is not None:
                        frame_diff = np.mean(np.abs(small.astype(float) - prev_frame.astype(float))) / 255.0
                    else:
                        frame_diff = 0

                    # Combined score
                    combined_score = (hist_diff + frame_diff) / 2

                    # Find nearby scenes for content-aware suggestions (Quick Win #5)
                    scene_before = None
                    scene_after = None
                    if scenes:
                        for scene in scenes:
                            scene_time = scene.get('timestamp', 0)
                            if scene_time <= timestamp and (scene_before is None or scene_time > scene_before.get('timestamp', 0)):
                                scene_before = scene
                            if scene_time > timestamp and (scene_after is None or scene_time < scene_after.get('timestamp', float('inf'))):
                                scene_after = scene

                    if combined_score > HARD_CUT_THRESHOLD:
                        # Hard cut detected
                        transitions.append({
                            'timestamp': timestamp,
                            'type': 'cut',
                            'confidence': min(combined_score, 1.0),
                            'suggested_transition': suggest_transition_type(combined_score, 'hard', scene_before, scene_after),
                            'reason': 'Significant visual change detected',
                            'emotion_context': scene_before.get('emotion') if scene_before else None
                        })
                        last_transition_time = timestamp

                    elif combined_score > SOFT_CUT_THRESHOLD:
                        # Gradual transition detected
                        transitions.append({
                            'timestamp': timestamp,
                            'type': 'gradual',
                            'confidence': combined_score,
                            'suggested_transition': suggest_transition_type(combined_score, 'soft', scene_before, scene_after),
                            'reason': 'Gradual scene change detected',
                            'emotion_context': scene_before.get('emotion') if scene_before else None
                        })
                        last_transition_time = timestamp

                prev_hist = hist
                prev_frame = small
                processed_samples += 1

                # Progress update every 50 samples
                if progress_callback and processed_samples % 50 == 0:
                    progress = int((processed_samples / max(total_samples, 1)) * 100)
                    progress_callback("transition_detection", 80 + int(progress * 0.1),
                                    f"Detecting transitions... {processed_samples}/{total_samples}")

            frame_idx += 1

        cap.release()

        # Add start and end markers
        if len(transitions) == 0 or transitions[0]['timestamp'] > 1.0:
            transitions.insert(0, {
                'timestamp': 0,
                'type': 'start',
                'confidence': 1.0,
                'suggested_transition': 'fade_in',
                'reason': 'Video start'
            })

        if len(transitions) == 0 or transitions[-1]['timestamp'] < duration - 1.0:
            transitions.append({
                'timestamp': duration,
                'type': 'end',
                'confidence': 1.0,
                'suggested_transition': 'fade_out',
                'reason': 'Video end'
            })

        return transitions

    except Exception as e:
        print(f"Error detecting transitions: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return []


def suggest_transition_type(
    score: float,
    transition_style: str,
    scene_before: Optional[Dict] = None,
    scene_after: Optional[Dict] = None
) -> str:
    """
    Suggest appropriate transition type based on the detected change.
    Quick Win #5: Content-aware transition suggestions.

    Args:
        score: The transition detection score (0-1)
        transition_style: 'hard' or 'soft'
        scene_before: Scene data before transition (optional)
        scene_after: Scene data after transition (optional)

    Returns:
        Suggested transition type
    """
    # Quick Win #5: Use scene emotions if available
    if scene_before and scene_after:
        emotion_before = scene_before.get('emotion', 'neutral')
        emotion_after = scene_after.get('emotion', 'neutral')
        suggested = scene_before.get('suggested_transitions', [])

        # Emotion-based transition selection
        if emotion_before == 'exciting' or emotion_after == 'exciting':
            return 'glitch' if score > 0.7 else 'zoom_in'
        elif emotion_before == 'sad' or emotion_after == 'sad':
            return 'dissolve' if score > 0.5 else 'fade'
        elif emotion_before == 'happy' or emotion_after == 'happy':
            return 'zoom_in' if score > 0.7 else 'slide'
        elif emotion_before == 'dramatic' or emotion_after == 'dramatic':
            return 'flash' if score > 0.7 else 'wipe'
        elif emotion_before == 'calm' or emotion_after == 'calm':
            return 'dissolve'
        elif emotion_before == 'mysterious' or emotion_after == 'mysterious':
            return 'fade' if score > 0.5 else 'blur'

        # Use scene's suggested transitions if available
        if suggested and len(suggested) > 0:
            return suggested[0]

    # Fallback to score-based selection
    if transition_style == 'hard':
        # For hard cuts, suggest more dynamic transitions
        if score > 0.85:
            return 'cut'  # Very abrupt change - keep as cut
        elif score > 0.75:
            return 'wipe'  # Strong change - wipe transition
        else:
            return 'slide'  # Moderate hard change - slide
    else:
        # For soft/gradual changes, suggest smoother transitions
        if score > 0.55:
            return 'dissolve'  # Cross-dissolve for gradual changes
        else:
            return 'fade'  # Fade for subtle changes


def analyze_video(
    video_path: str,
    audio_path: str,
    progress_callback: Optional[Callable[[str, int, str], None]] = None
) -> Dict[str, Any]:
    """
    Perform complete video analysis with professional-grade features.

    Demo-Ready Enhancements:
    - PySceneDetect: Professional scene cut detection
    - librosa: Beat detection, tempo, onset analysis
    - Adaptive frame sampling based on motion
    - Audio peak/silence detection
    - Emotion detection from scene descriptions
    - Content-aware transition suggestions

    Args:
        video_path: Path to video file
        audio_path: Path to extracted audio file
        progress_callback: Optional callback(stage, progress_percent, message)

    Returns:
        Analysis results dict with scenes, suggestedSFX, transcription, transitions,
        audio_features, audio_advanced, scene_detection
    """
    if progress_callback:
        progress_callback("loading_models", 5, "Loading AI models...")

    # Transcribe audio
    if progress_callback:
        progress_callback("transcription", 10, "Transcribing audio...")
    transcription = transcribe_audio(audio_path, progress_callback)

    # Advanced audio analysis with librosa (beats, tempo, onsets)
    if progress_callback:
        progress_callback("audio_advanced", 18, "Running advanced audio analysis (librosa)...")
    audio_advanced = analyze_audio_advanced(audio_path, progress_callback)

    # Basic audio analysis for peaks and silences
    if progress_callback:
        progress_callback("audio_analysis", 30, "Analyzing audio features...")
    audio_features = analyze_audio_features(audio_path, progress_callback)

    # Analyze scenes with BLIP (adaptive sampling & emotion detection)
    if progress_callback:
        progress_callback("scene_analysis", 40, "Analyzing video scenes with AI vision...")
    scenes = analyze_scenes(video_path, progress_callback, use_adaptive_sampling=True)

    # Professional scene detection with PySceneDetect
    if progress_callback:
        progress_callback("scene_detection", 70, "Running professional scene detection (PySceneDetect)...")
    scene_detection = detect_scenes_professional(video_path, progress_callback)

    # Merge professional cuts into transitions
    if progress_callback:
        progress_callback("transition_detection", 82, "Generating transition suggestions...")
    transitions = _merge_transitions(
        scene_detection.get('cuts', []),
        scenes,
        audio_advanced
    )

    # Generate SFX suggestions (enhanced with beats and onsets)
    if progress_callback:
        progress_callback("sfx_suggestions", 90, "Generating beat-synced SFX suggestions...")
    sfx_suggestions = suggest_sfx_pro(scenes, transcription, audio_features, audio_advanced)

    if progress_callback:
        progress_callback("completed", 100, "Analysis complete")

    # Summary stats
    emotion_distribution = {}
    for scene in scenes:
        emotion = scene.get('emotion', 'neutral')
        emotion_distribution[emotion] = emotion_distribution.get(emotion, 0) + 1

    print(f"\n{'='*60}", file=sys.stderr)
    print(f"PROFESSIONAL ANALYSIS COMPLETE", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)
    print(f"Scenes (BLIP):        {len(scenes)} analyzed", file=sys.stderr)
    print(f"Scenes (PySceneDetect): {scene_detection.get('total_scenes', 0)} detected", file=sys.stderr)
    print(f"Cuts detected:        {scene_detection.get('total_cuts', 0)}", file=sys.stderr)
    print(f"Pacing:               {scene_detection.get('pacing', 'unknown')}", file=sys.stderr)
    print(f"Tempo:                {audio_advanced.get('tempo', 0):.0f} BPM", file=sys.stderr)
    print(f"Beats detected:       {len(audio_advanced.get('beats', []))}", file=sys.stderr)
    print(f"Onsets detected:      {len(audio_advanced.get('onsets', []))}", file=sys.stderr)
    print(f"Audio peaks:          {len(audio_features.get('peaks', []))}", file=sys.stderr)
    print(f"Silence regions:      {len(audio_features.get('silences', []))}", file=sys.stderr)
    print(f"SFX suggestions:      {len(sfx_suggestions)}", file=sys.stderr)
    print(f"Transitions:          {len(transitions)}", file=sys.stderr)
    print(f"Emotion distribution: {emotion_distribution}", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)

    return {
        "scenes": scenes,
        "suggestedSFX": sfx_suggestions,
        "suggestedTransitions": transitions,
        "transcription": transcription,
        # Basic audio features
        "audio_features": {
            "peaks": audio_features.get('peaks', []),
            "silences": audio_features.get('silences', []),
            "mean_energy": audio_features.get('mean_energy', 0)
        },
        # Advanced audio (librosa)
        "audio_advanced": {
            "tempo": audio_advanced.get('tempo', 0),
            "beats": audio_advanced.get('beats', [])[:50],  # Limit for response size
            "onsets": audio_advanced.get('onsets', [])[:30],
            "beat_sync_points": audio_advanced.get('beat_sync_points', []),
            "high_energy_segments": audio_advanced.get('high_energy_segments', []),
            "spectral": audio_advanced.get('spectral', {})
        },
        # Professional scene detection (PySceneDetect)
        "scene_detection": {
            "scenes": scene_detection.get('scenes', []),
            "cuts": scene_detection.get('cuts', []),
            "total_scenes": scene_detection.get('total_scenes', 0),
            "pacing": scene_detection.get('pacing', 'unknown'),
            "avg_scene_duration": scene_detection.get('avg_scene_duration', 0),
            "detection_method": scene_detection.get('detection_method', 'unknown')
        },
        "emotion_distribution": emotion_distribution
    }


def _merge_transitions(
    cuts: List[Dict],
    scenes: List[Dict],
    audio_advanced: Dict
) -> List[Dict]:
    """
    Merge PySceneDetect cuts with scene analysis and audio data.

    Creates intelligent transition suggestions based on:
    - Cut locations from PySceneDetect
    - Scene emotions from BLIP analysis
    - Beat sync points from librosa
    """
    transitions = []
    beats = audio_advanced.get('beats', [])
    tempo = audio_advanced.get('tempo', 120)

    for cut in cuts:
        timestamp = cut['timestamp']

        # Find nearby scene for emotion context
        nearby_scene = None
        for scene in scenes:
            if abs(scene.get('timestamp', 0) - timestamp) < 3.0:
                nearby_scene = scene
                break

        # Find nearest beat for sync suggestion
        nearest_beat = None
        min_beat_dist = float('inf')
        for beat in beats:
            dist = abs(beat['timestamp'] - timestamp)
            if dist < min_beat_dist:
                min_beat_dist = dist
                nearest_beat = beat

        # Determine transition type based on context
        emotion = nearby_scene.get('emotion', 'neutral') if nearby_scene else 'neutral'
        suggested = cut.get('suggested_transition', 'fade')

        # Override with emotion-based transitions
        if emotion == 'exciting':
            suggested = 'glitch' if tempo > 120 else 'zoom_in'
        elif emotion == 'calm':
            suggested = 'dissolve'
        elif emotion == 'dramatic':
            suggested = 'flash' if cut['type'] == 'fast_cut' else 'zoom_in'
        elif emotion == 'happy':
            suggested = 'zoom_in'
        elif emotion == 'sad':
            suggested = 'fade'

        transitions.append({
            'timestamp': timestamp,
            'type': cut['type'],
            'suggested_transition': suggested,
            'confidence': cut.get('confidence', 0.9),
            'emotion_context': emotion,
            'beat_synced': min_beat_dist < 0.2 if nearest_beat else False,
            'nearest_beat_offset': min_beat_dist if nearest_beat else None,
            'reason': f"PySceneDetect {cut['type']}, emotion: {emotion}"
        })

    # Add start and end markers
    if not transitions or transitions[0]['timestamp'] > 0.5:
        transitions.insert(0, {
            'timestamp': 0,
            'type': 'start',
            'suggested_transition': 'fade_in',
            'confidence': 1.0,
            'reason': 'Video start'
        })

    return transitions


def suggest_sfx_pro(
    scenes: List[Dict],
    transcription: List[Dict],
    audio_features: Dict,
    audio_advanced: Dict
) -> List[Dict]:
    """
    Professional SFX suggestions using librosa beat/onset data.

    Demo-ready features:
    - Beat-synced SFX placement
    - Onset-triggered impact sounds
    - High-energy segment emphasis
    - Tempo-aware pacing

    Args:
        scenes: List of analyzed scenes
        transcription: List of transcription segments
        audio_features: Dict with peaks, silences
        audio_advanced: Dict with beats, onsets, tempo from librosa

    Returns:
        List of SFX suggestions with professional timing
    """
    suggestions = []

    # Get librosa data
    tempo = audio_advanced.get('tempo', 120)
    beats = audio_advanced.get('beats', [])
    onsets = audio_advanced.get('onsets', [])
    high_energy = audio_advanced.get('high_energy_segments', [])
    beat_sync_points = audio_advanced.get('beat_sync_points', [])

    # 1. Beat-synced whoosh/impact at every 4th beat (downbeats)
    downbeats = [b for b in beats if b.get('strength', 0) >= 1.0][:15]
    for beat in downbeats:
        timestamp = beat['timestamp']

        # Find nearby scene for context
        nearby_scene = None
        for scene in scenes:
            if abs(scene.get('timestamp', 0) - timestamp) < 2.0:
                nearby_scene = scene
                break

        if nearby_scene:
            emotion = nearby_scene.get('emotion', 'neutral')
            if emotion == 'exciting':
                prompt = "punchy bass hit, beat drop impact, energetic thump"
            elif emotion == 'dramatic':
                prompt = "cinematic boom, dramatic low-end impact, tension hit"
            elif emotion == 'happy':
                prompt = "uplifting whoosh, bright accent hit, cheerful impact"
            else:
                prompt = "subtle beat accent, soft rhythmic hit, gentle pulse"

            suggestions.append({
                'timestamp': timestamp,
                'prompt': prompt,
                'reason': f'Beat-synced ({tempo:.0f} BPM downbeat)',
                'confidence': 0.85,
                'type': 'beat_sync',
                'visual_context': nearby_scene.get('description', ''),
                'duration_hint': 0.5
            })

    # 2. Onset-triggered sounds for significant transients
    strong_onsets = [o for o in onsets if o.get('strength', 0) > 0.7][:10]
    for onset in strong_onsets:
        timestamp = onset['timestamp']

        # Skip if too close to existing suggestion
        if any(abs(s['timestamp'] - timestamp) < 0.5 for s in suggestions):
            continue

        suggestions.append({
            'timestamp': timestamp,
            'prompt': "sharp transient hit, quick attack accent, stinger sound",
            'reason': f'Audio onset detected (strength: {onset["strength"]:.2f})',
            'confidence': 0.75,
            'type': 'onset_trigger',
            'duration_hint': 0.3
        })

    # 3. High-energy segment emphasis
    for segment in high_energy[:5]:
        start = segment['start']
        duration = segment['duration']

        # Skip if too close to existing
        if any(abs(s['timestamp'] - start) < 1.0 for s in suggestions):
            continue

        suggestions.append({
            'timestamp': start,
            'prompt': "energy build-up riser, intensity swell, momentum builder",
            'reason': f'High-energy segment ({duration:.1f}s)',
            'confidence': 0.7,
            'type': 'energy_segment',
            'duration_hint': min(duration, 2.0)
        })

    # 4. Add scene-based ambient sounds for gaps
    for scene in scenes:
        timestamp = scene.get('timestamp', 0)

        # Skip if too close to existing
        if any(abs(s['timestamp'] - timestamp) < 2.0 for s in suggestions):
            continue

        # Only add for scenes with good visual context
        if scene.get('confidence', 0) > 0.5:
            prompt = scene.get('sound_description', 'ambient atmosphere')
            suggestions.append({
                'timestamp': timestamp,
                'prompt': prompt,
                'reason': f'Scene context: {scene.get("description", "")[:50]}',
                'confidence': scene.get('confidence', 0.6),
                'type': 'scene_ambient',
                'visual_context': scene.get('description', ''),
                'duration_hint': 3.0
            })

    # Sort by timestamp
    suggestions.sort(key=lambda x: x['timestamp'])

    # Deduplicate - keep suggestions at least 1.5 seconds apart
    unique = []
    for suggestion in suggestions:
        if not unique or suggestion['timestamp'] - unique[-1]['timestamp'] >= 1.5:
            unique.append(suggestion)
        elif suggestion.get('confidence', 0) > unique[-1].get('confidence', 0):
            unique[-1] = suggestion

    return unique[:25]  # Limit total suggestions


def suggest_sfx_enhanced(
    scenes: List[Dict],
    transcription: List[Dict],
    audio_features: Dict
) -> List[Dict]:
    """
    Enhanced SFX suggestions using audio peak/silence information.
    (Legacy function - kept for compatibility)

    Improvements:
    - Place SFX at audio peaks for emphasis
    - Use silence regions for ambient SFX
    - Avoid placing SFX during speech

    Args:
        scenes: List of analyzed scenes
        transcription: List of transcription segments
        audio_features: Dict with peaks, silences, energy profile

    Returns:
        List of SFX suggestions with optimized timing
    """
    # Get base suggestions from scenes
    base_suggestions = suggest_sfx(scenes, transcription)

    # Get audio peaks and silences
    peaks = audio_features.get('peaks', [])
    silences = audio_features.get('silences', [])

    enhanced_suggestions = []

    # Add suggestions at audio peaks (emphasis points)
    for peak in peaks[:10]:  # Limit to top 10 peaks
        timestamp = peak['timestamp']
        intensity = peak.get('intensity', 'medium')

        # Find nearby scene for context
        nearby_scene = None
        for scene in scenes:
            if abs(scene['timestamp'] - timestamp) < 2.0:
                nearby_scene = scene
                break

        # Check if we already have a suggestion near this peak
        has_nearby = any(abs(s['timestamp'] - timestamp) < 1.5 for s in base_suggestions)

        if not has_nearby and nearby_scene:
            # Create emphasis SFX suggestion
            if intensity == 'high':
                sfx_prompt = "dramatic impact hit, bass drop, powerful emphasis sound"
            else:
                sfx_prompt = "subtle emphasis whoosh, soft impact, accent sound"

            enhanced_suggestions.append({
                'timestamp': timestamp,
                'prompt': sfx_prompt,
                'reason': f'Audio peak detected ({intensity} intensity)',
                'confidence': 0.75 if intensity == 'high' else 0.6,
                'visual_context': nearby_scene.get('description', ''),
                'type': 'audio_peak',
                'duration_hint': 1.5
            })

    # Add ambient suggestions for longer silences
    for silence in silences:
        if silence['duration'] >= 1.0:  # Only for silences >= 1 second
            timestamp = silence['start'] + 0.3  # Start slightly after silence begins

            # Find nearby scene for context
            nearby_scene = None
            for scene in scenes:
                if abs(scene['timestamp'] - timestamp) < 3.0:
                    nearby_scene = scene
                    break

            # Check if we already have a suggestion in this silence
            has_nearby = any(
                silence['start'] <= s['timestamp'] <= silence['end']
                for s in base_suggestions + enhanced_suggestions
            )

            if not has_nearby and nearby_scene:
                # Use scene's mood for ambient sound
                sfx_mood = nearby_scene.get('sfx_mood', 'ambient, atmospheric')
                enhanced_suggestions.append({
                    'timestamp': timestamp,
                    'prompt': f"soft {sfx_mood} background atmosphere, subtle environmental sounds",
                    'reason': f'Silence detected ({silence["duration"]:.1f}s) - adding ambient',
                    'confidence': 0.55,
                    'visual_context': nearby_scene.get('description', ''),
                    'type': 'silence_fill',
                    'duration_hint': min(silence['duration'] - 0.5, 3.0)
                })

    # Combine and sort all suggestions
    all_suggestions = base_suggestions + enhanced_suggestions
    all_suggestions.sort(key=lambda x: x['timestamp'])

    # Deduplicate - keep suggestions that are at least 2 seconds apart
    unique_suggestions = []
    for suggestion in all_suggestions:
        similar = next((s for s in unique_suggestions
                       if abs(s['timestamp'] - suggestion['timestamp']) < 2.0), None)

        if similar:
            # Keep the one with higher confidence
            if suggestion.get('confidence', 0) > similar.get('confidence', 0):
                unique_suggestions.remove(similar)
                unique_suggestions.append(suggestion)
        else:
            unique_suggestions.append(suggestion)

    return unique_suggestions
