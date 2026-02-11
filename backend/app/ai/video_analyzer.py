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
    """Lazy load vision-language model for image captioning and understanding.

    Tries BLIP-2 first (richer multi-sentence captions with actions and context),
    falls back to BLIP v1 if BLIP-2 fails to load (e.g., insufficient VRAM).
    Tags the model with _is_blip2 attribute for downstream branching.
    """
    global _vlm_model, _vlm_processor
    if _vlm_model is None:
        import torch
        from app.config import settings

        # Try BLIP-2 first
        try:
            from transformers import Blip2Processor, Blip2ForConditionalGeneration
            print(f"Loading BLIP-2 model: {settings.BLIP_MODEL}", file=sys.stderr)
            _vlm_processor = Blip2Processor.from_pretrained(settings.BLIP_MODEL)
            if torch.cuda.is_available():
                _vlm_model = Blip2ForConditionalGeneration.from_pretrained(
                    settings.BLIP_MODEL, torch_dtype=torch.float16
                ).to("cuda")
            else:
                _vlm_model = Blip2ForConditionalGeneration.from_pretrained(
                    settings.BLIP_MODEL, torch_dtype=torch.float32
                )
            _vlm_model._is_blip2 = True
            print("BLIP-2 loaded successfully", file=sys.stderr)
        except Exception as e:
            print(f"BLIP-2 failed to load: {e}, falling back to BLIP v1", file=sys.stderr)
            from transformers import BlipProcessor, BlipForConditionalGeneration
            fallback = settings.BLIP_FALLBACK_MODEL
            _vlm_processor = BlipProcessor.from_pretrained(fallback)
            _vlm_model = BlipForConditionalGeneration.from_pretrained(fallback)
            if torch.cuda.is_available():
                _vlm_model = _vlm_model.to("cuda")
            _vlm_model._is_blip2 = False
            print(f"Loaded BLIP v1 fallback: {fallback}", file=sys.stderr)
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
        'intensity_curve': {'timestamps': [], 'values': []},
        'audio_content': []
    }


# =============================================================================
# AUDIO CONTENT DETECTION (Sophisticated librosa-based)
# =============================================================================

def detect_audio_content(
    audio_path: str,
    transcription: List[Dict] = None,
    segment_duration: float = 0.5,  # Finer granularity for better detection
    progress_callback: Optional[Callable] = None
) -> Dict[str, Any]:
    """
    Sophisticated audio content detection for diverse video types.

    Handles all content types:
    - Music videos (heavy music, vocals)
    - Vlogs/Tutorials (speech-dominant)
    - Action/Sports (dynamic, percussive)
    - Nature/Documentary (ambient, atmospheric)
    - Silent films (minimal audio)
    - Mixed content (speech + music + SFX)

    Detection features:
    - Sub-band energy analysis (low/mid/high frequency content)
    - Harmonic-percussive separation
    - MFCC-based texture classification
    - Speech detection from transcription + spectral features
    - Music detection (harmonic content, rhythm stability)
    - Ambient sound classification
    - Existing SFX detection (transients, impacts)
    - Audio "fullness" and layering analysis

    Args:
        audio_path: Path to audio file
        transcription: Optional list of speech segments from Whisper
        segment_duration: Analysis window size in seconds (default 0.5s)
        progress_callback: Optional callback(stage, progress, message)

    Returns:
        Comprehensive audio analysis for SFX-aware suggestions
    """
    try:
        import librosa

        if progress_callback:
            progress_callback("audio_content", 29, "Analyzing existing audio content...")

        # Load audio at standard rate
        y, sr = librosa.load(audio_path, sr=22050, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        hop_length = 512
        frame_times = librosa.frames_to_time(
            np.arange(len(y) // hop_length + 1), sr=sr, hop_length=hop_length
        )

        # ===== CORE FEATURE EXTRACTION =====

        # 1. RMS Energy (overall loudness)
        rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]

        # 2. Spectral features
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop_length)[0]
        spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr, hop_length=hop_length)[0]
        spectral_flatness = librosa.feature.spectral_flatness(y=y, hop_length=hop_length)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, hop_length=hop_length)[0]
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y, hop_length=hop_length)[0]

        # 3. Harmonic-Percussive separation
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        harmonic_rms = librosa.feature.rms(y=y_harmonic, hop_length=hop_length)[0]
        percussive_rms = librosa.feature.rms(y=y_percussive, hop_length=hop_length)[0]

        # 4. Sub-band energy (low/mid/high frequencies)
        # This helps detect bass-heavy music, voice range, high-frequency effects
        S = np.abs(librosa.stft(y, hop_length=hop_length))
        freqs = librosa.fft_frequencies(sr=sr)

        # Frequency bands: sub-bass (20-60Hz), bass (60-250Hz), low-mid (250-500Hz),
        # mid (500-2kHz), high-mid (2-4kHz), high (4-8kHz), brilliance (8kHz+)
        bands = {
            'sub_bass': (20, 60),
            'bass': (60, 250),
            'low_mid': (250, 500),
            'mid': (500, 2000),
            'high_mid': (2000, 4000),
            'presence': (4000, 8000),
            'brilliance': (8000, 11025)
        }

        band_energy = {}
        for band_name, (low_f, high_f) in bands.items():
            band_mask = (freqs >= low_f) & (freqs < high_f)
            if band_mask.any():
                band_energy[band_name] = np.mean(S[band_mask, :], axis=0)
            else:
                band_energy[band_name] = np.zeros(S.shape[1])

        # 5. MFCC for texture classification (efficient - just first few coefficients)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=hop_length)

        # ===== BUILD SPEECH TIMELINE FROM TRANSCRIPTION =====
        speech_ranges = []
        if transcription:
            for segment in transcription:
                start = segment.get('start', 0)
                end = segment.get('end', start + 1)
                speech_ranges.append((start, end))

        def is_speech_time(t: float) -> bool:
            for start, end in speech_ranges:
                if start <= t <= end:
                    return True
            return False

        # ===== SEGMENT CLASSIFICATION =====
        segment_frames = int(segment_duration * sr / hop_length)
        segments = []

        # Adaptive thresholds based on overall audio characteristics
        rms_mean = np.mean(rms)
        rms_std = np.std(rms)
        rms_max = np.max(rms)

        # Silence threshold: 10% of mean or 5% of max (whichever is lower)
        silence_threshold = min(rms_mean * 0.10, rms_max * 0.05)
        low_energy_threshold = rms_mean * 0.4
        high_energy_threshold = rms_mean + 1.5 * rms_std

        for i in range(0, len(rms) - segment_frames // 2, segment_frames):
            end_idx = min(i + segment_frames, len(rms))
            seg_start = frame_times[min(i, len(frame_times) - 1)]
            seg_end = frame_times[min(end_idx, len(frame_times) - 1)]

            # Extract segment features
            seg_rms = rms[i:end_idx]
            seg_harmonic = harmonic_rms[i:end_idx]
            seg_percussive = percussive_rms[i:end_idx]
            seg_flatness = spectral_flatness[i:end_idx]
            seg_centroid = spectral_centroid[i:end_idx]
            seg_zcr = zero_crossing_rate[i:end_idx]

            # Calculate segment metrics
            avg_rms = float(np.mean(seg_rms))
            max_rms = float(np.max(seg_rms))
            rms_variance = float(np.var(seg_rms))

            avg_harmonic = float(np.mean(seg_harmonic))
            avg_percussive = float(np.mean(seg_percussive))
            harmonic_ratio = avg_harmonic / (avg_rms + 1e-8)
            percussive_ratio = avg_percussive / (avg_rms + 1e-8)

            avg_flatness = float(np.mean(seg_flatness))
            avg_centroid = float(np.mean(seg_centroid))
            avg_zcr = float(np.mean(seg_zcr))

            # Sub-band energy for this segment
            seg_bands = {}
            for band_name, energy in band_energy.items():
                seg_band = energy[i:end_idx] if i < len(energy) else energy[-segment_frames:]
                seg_bands[band_name] = float(np.mean(seg_band)) if len(seg_band) > 0 else 0.0

            # Normalize band energies
            total_band_energy = sum(seg_bands.values()) + 1e-8
            band_distribution = {k: v / total_band_energy for k, v in seg_bands.items()}

            # ===== CLASSIFICATION LOGIC =====
            content_types = []  # Can have multiple types (e.g., speech + music)
            primary_type = 'ambient'
            confidence = 0.5
            sub_types = []

            # 1. SILENCE CHECK
            if avg_rms < silence_threshold:
                primary_type = 'silence'
                confidence = 0.95
                sub_types.append('dead_air' if max_rms < silence_threshold * 0.5 else 'quiet')

            # 2. SPEECH CHECK (from transcription)
            elif is_speech_time(seg_start) or is_speech_time(seg_end):
                content_types.append('speech')
                primary_type = 'speech'
                confidence = 0.88

                # Check if speech has music underneath
                if harmonic_ratio > 0.4 and avg_flatness < 0.25:
                    sub_types.append('with_music')
                    content_types.append('music')

                # Check speech energy level
                if avg_rms > high_energy_threshold:
                    sub_types.append('loud')
                elif avg_rms < low_energy_threshold:
                    sub_types.append('quiet')

            # 3. MUSIC CHECK (harmonic content + low flatness)
            elif harmonic_ratio > 0.55 and avg_flatness < 0.30:
                primary_type = 'music'
                confidence = 0.75 + min(harmonic_ratio - 0.55, 0.2)
                content_types.append('music')

                # Sub-classify music type
                if band_distribution.get('bass', 0) > 0.25:
                    sub_types.append('bass_heavy')
                if band_distribution.get('presence', 0) > 0.15:
                    sub_types.append('bright')
                if percussive_ratio > 0.3:
                    sub_types.append('rhythmic')
                if avg_centroid > 3000:
                    sub_types.append('high_frequency')

            # 4. PERCUSSIVE/IMPACT CHECK
            elif percussive_ratio > 0.45 or (max_rms > avg_rms * 3 and rms_variance > rms_mean * 0.5):
                primary_type = 'percussive'
                confidence = 0.7
                content_types.append('percussive')

                # Classify impact type
                if band_distribution.get('sub_bass', 0) + band_distribution.get('bass', 0) > 0.4:
                    sub_types.append('bass_impact')
                elif avg_centroid > 4000:
                    sub_types.append('sharp_transient')
                else:
                    sub_types.append('general_impact')

            # 5. NOISE/AMBIENT CHECK
            elif avg_flatness > 0.45:
                primary_type = 'noise'
                confidence = 0.6
                content_types.append('noise')

                # Classify noise type
                if avg_centroid < 1500:
                    sub_types.append('low_rumble')
                elif avg_centroid > 4000:
                    sub_types.append('hiss')
                else:
                    sub_types.append('broadband')

            # 6. AMBIENT/ATMOSPHERE
            else:
                primary_type = 'ambient'
                confidence = 0.55
                content_types.append('ambient')

                # Classify ambient type
                if band_distribution.get('low_mid', 0) + band_distribution.get('mid', 0) > 0.5:
                    sub_types.append('room_tone')
                if avg_zcr > 0.1:
                    sub_types.append('textured')

            # Energy classification
            if avg_rms > high_energy_threshold:
                energy = 'high'
            elif avg_rms < low_energy_threshold:
                energy = 'low'
            else:
                energy = 'medium'

            # Spectral brightness
            brightness = 'neutral'
            if avg_centroid > 3500:
                brightness = 'bright'
            elif avg_centroid < 1500:
                brightness = 'dark'

            # Audio "fullness" (how layered/complex the audio is)
            # High variance in spectral features = more complex/layered
            spectral_complexity = float(np.std(seg_centroid) / (avg_centroid + 1e-8))
            fullness = 'sparse'
            if spectral_complexity > 0.3 and avg_rms > rms_mean:
                fullness = 'dense'
            elif spectral_complexity > 0.15:
                fullness = 'moderate'

            segments.append({
                'start': round(seg_start, 2),
                'end': round(seg_end, 2),
                'type': primary_type,
                'content_types': content_types,
                'sub_types': sub_types,
                'confidence': round(min(confidence, 1.0), 2),
                'energy': energy,
                'brightness': brightness,
                'fullness': fullness,
                'harmonic_ratio': round(harmonic_ratio, 2),
                'percussive_ratio': round(percussive_ratio, 2),
                'spectral_flatness': round(avg_flatness, 3),
                'band_distribution': {k: round(v, 3) for k, v in band_distribution.items()}
            })

        # ===== FIND SFX OPPORTUNITIES =====
        sfx_opportunities = []
        for i, seg in enumerate(segments):
            opportunity = None
            quality = 'poor'
            sfx_style = 'any'
            avoid_types = []

            # Excellent: True silence
            if seg['type'] == 'silence':
                opportunity = 'silence_gap'
                quality = 'excellent'
                sfx_style = 'any'  # Any SFX works here

            # Good: Low energy ambient
            elif seg['type'] == 'ambient' and seg['energy'] == 'low':
                opportunity = 'low_ambient'
                quality = 'good'
                sfx_style = 'subtle'

            # Good: Between speech segments (natural pause)
            elif seg['type'] == 'speech' and seg['energy'] == 'low':
                # Check if this is a pause between speech
                prev_speech = i > 0 and 'speech' in segments[i-1].get('content_types', [])
                next_speech = i < len(segments) - 1 and 'speech' in segments[i+1].get('content_types', [])
                if prev_speech or next_speech:
                    opportunity = 'speech_gap'
                    quality = 'good'
                    sfx_style = 'subtle'
                    avoid_types = ['loud', 'speech-like']

            # Fair: Music-only sections (SFX should complement, not clash)
            elif seg['type'] == 'music' and 'speech' not in seg.get('content_types', []):
                if seg['energy'] != 'high':
                    opportunity = 'music_bed'
                    quality = 'fair'
                    # Match SFX to music characteristics
                    if 'rhythmic' in seg.get('sub_types', []):
                        sfx_style = 'rhythmic'
                    elif 'bass_heavy' in seg.get('sub_types', []):
                        sfx_style = 'low_frequency'
                        avoid_types = ['bass_impact']  # Don't add more bass
                    else:
                        sfx_style = 'accent'

            # Fair: Percussive sections (add complementary sounds)
            elif seg['type'] == 'percussive':
                if seg['fullness'] != 'dense':
                    opportunity = 'percussive_gap'
                    quality = 'fair'
                    sfx_style = 'complementary'
                    # Avoid similar impact types
                    avoid_types = seg.get('sub_types', [])

            if opportunity:
                sfx_opportunities.append({
                    'timestamp': seg['start'],
                    'duration': seg['end'] - seg['start'],
                    'reason': opportunity,
                    'quality': quality,
                    'recommended_sfx_style': sfx_style,
                    'avoid_sfx_types': avoid_types,
                    'existing_audio': {
                        'type': seg['type'],
                        'energy': seg['energy'],
                        'brightness': seg['brightness']
                    }
                })

        # ===== DETECT EXISTING SFX-LIKE SOUNDS =====
        # Find sounds that are already "SFX-like" to avoid duplication
        existing_sfx = []
        for seg in segments:
            if seg['type'] == 'percussive':
                existing_sfx.append({
                    'timestamp': seg['start'],
                    'type': 'impact',
                    'sub_type': seg.get('sub_types', ['unknown'])[0] if seg.get('sub_types') else 'unknown',
                    'energy': seg['energy']
                })
            elif seg['fullness'] == 'dense' and seg['energy'] == 'high':
                existing_sfx.append({
                    'timestamp': seg['start'],
                    'type': 'complex_layer',
                    'sub_type': 'full_mix',
                    'energy': seg['energy']
                })

        # ===== SUMMARY STATISTICS =====
        sound_counts = {}
        for seg in segments:
            sound_counts[seg['type']] = sound_counts.get(seg['type'], 0) + 1

        total_segments = len(segments)
        existing_sounds = {
            stype: {
                'count': count,
                'percentage': round(count / total_segments * 100, 1) if total_segments > 0 else 0
            }
            for stype, count in sound_counts.items()
        }

        # Audio density (how "full" the audio is overall)
        non_silent = sum(1 for s in segments if s['type'] != 'silence')
        audio_density = non_silent / total_segments if total_segments > 0 else 0

        # Determine video/audio type
        video_audio_type = _classify_video_audio_type(existing_sounds, segments)

        if progress_callback:
            types_found = ', '.join(f"{k}:{v['count']}" for k, v in existing_sounds.items())
            progress_callback("audio_content", 30,
                           f"Audio type: {video_audio_type}, Content: {types_found}")

        return {
            'segments': segments,
            'sfx_opportunities': sfx_opportunities[:40],
            'existing_sfx': existing_sfx[:20],
            'existing_sounds': existing_sounds,
            'audio_density': round(audio_density, 2),
            'video_audio_type': video_audio_type,
            'duration': duration,
            'analysis_summary': {
                'total_segments': total_segments,
                'silence_percentage': existing_sounds.get('silence', {}).get('percentage', 0),
                'speech_percentage': existing_sounds.get('speech', {}).get('percentage', 0),
                'music_percentage': existing_sounds.get('music', {}).get('percentage', 0),
                'has_background_music': any('with_music' in s.get('sub_types', []) for s in segments),
                'is_dynamic': any(s['energy'] == 'high' for s in segments)
            }
        }

    except ImportError as e:
        print(f"librosa not available for audio content detection: {e}", file=sys.stderr)
        return _empty_audio_content()
    except Exception as e:
        print(f"Error detecting audio content: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return _empty_audio_content()


def _classify_video_audio_type(existing_sounds: Dict, segments: List[Dict]) -> str:
    """
    Classify the overall video/audio type based on content analysis.
    Helps tailor SFX suggestions to the content style.
    """
    speech_pct = existing_sounds.get('speech', {}).get('percentage', 0)
    music_pct = existing_sounds.get('music', {}).get('percentage', 0)
    silence_pct = existing_sounds.get('silence', {}).get('percentage', 0)
    ambient_pct = existing_sounds.get('ambient', {}).get('percentage', 0)
    percussive_pct = existing_sounds.get('percussive', {}).get('percentage', 0)

    # Check for speech with music (vlog with BGM)
    has_speech_with_music = any('with_music' in s.get('sub_types', []) for s in segments)

    # Music video: >60% music, minimal speech
    if music_pct > 60 and speech_pct < 15:
        return 'music_video'

    # Podcast/Interview: >50% speech, minimal music
    elif speech_pct > 50 and music_pct < 20:
        return 'podcast_interview'

    # Vlog/Tutorial: speech + some music/ambient
    elif speech_pct > 30 and (music_pct > 10 or has_speech_with_music):
        return 'vlog_tutorial'

    # Action/Sports: high percussive, dynamic
    elif percussive_pct > 20 or (ambient_pct > 30 and any(s['energy'] == 'high' for s in segments)):
        return 'action_dynamic'

    # Documentary/Nature: mostly ambient, some speech
    elif ambient_pct > 40 and speech_pct < 30:
        return 'documentary_nature'

    # Silent film: >50% silence
    elif silence_pct > 50:
        return 'silent_minimal'

    # Mixed content
    else:
        return 'mixed_content'


def _empty_audio_content() -> Dict[str, Any]:
    """Return empty structure for audio content detection."""
    return {
        'segments': [],
        'sfx_opportunities': [],
        'existing_sfx': [],
        'existing_sounds': {},
        'audio_density': 0,
        'video_audio_type': 'unknown',
        'duration': 0,
        'analysis_summary': {
            'total_segments': 0,
            'silence_percentage': 0,
            'speech_percentage': 0,
            'music_percentage': 0,
            'has_background_music': False,
            'is_dynamic': False
        }
    }


# =============================================================================
# QUICK AUDIO PRE-CLASSIFICATION (runs before heavy analysis)
# =============================================================================

def quick_classify_audio(
    audio_path: str,
    transcription: List[Dict]
) -> Dict[str, Any]:
    """
    Lightweight audio pre-classification using first 30s of audio.
    Runs in ~2s to determine video type before committing to heavy analysis.

    Uses librosa on a short segment to compute: RMS energy, spectral flatness,
    harmonic-percussive ratio, and speech ratio from transcription.

    Args:
        audio_path: Path to audio file
        transcription: Transcription segments from Whisper

    Returns:
        Dict with video_type, speech_ratio, harmonic_ratio, and raw features
    """
    try:
        import librosa

        # Load only first 30 seconds for speed
        y, sr = librosa.load(audio_path, sr=22050, mono=True, duration=30.0)
        duration = librosa.get_duration(y=y, sr=sr)

        if duration < 0.5:
            return {'video_type': 'unknown', 'speech_ratio': 0.0, 'harmonic_ratio': 0.0}

        # RMS energy
        rms = librosa.feature.rms(y=y)[0]
        avg_rms = float(np.mean(rms))

        # Spectral flatness (noise-like vs tonal)
        flatness = librosa.feature.spectral_flatness(y=y)[0]
        avg_flatness = float(np.mean(flatness))

        # Harmonic-percussive separation
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        harmonic_energy = float(np.mean(librosa.feature.rms(y=y_harmonic)[0]))
        percussive_energy = float(np.mean(librosa.feature.rms(y=y_percussive)[0]))
        harmonic_ratio = harmonic_energy / (avg_rms + 1e-8)
        percussive_ratio = percussive_energy / (avg_rms + 1e-8)

        # Speech ratio from transcription
        speech_duration = 0.0
        if transcription:
            for seg in transcription:
                seg_start = seg.get('start', 0)
                seg_end = seg.get('end', seg_start)
                # Only count segments in the first 30s
                if seg_start < 30.0:
                    speech_duration += min(seg_end, 30.0) - seg_start
        speech_ratio = speech_duration / max(duration, 1.0)

        # Classify video type
        if speech_ratio > 0.6 and harmonic_ratio < 0.5:
            video_type = 'podcast_interview'
        elif speech_ratio > 0.35 and harmonic_ratio > 0.3:
            video_type = 'vlog_tutorial'
        elif harmonic_ratio > 0.6 and speech_ratio < 0.15:
            video_type = 'music_video'
        elif percussive_ratio > 0.4 and avg_rms > 0.1:
            video_type = 'action_dynamic'
        elif avg_rms < 0.02:
            video_type = 'silent_minimal'
        elif avg_flatness < 0.2 and speech_ratio < 0.2:
            video_type = 'documentary_nature'
        else:
            video_type = 'mixed_content'

        return {
            'video_type': video_type,
            'speech_ratio': round(speech_ratio, 3),
            'harmonic_ratio': round(harmonic_ratio, 3),
            'percussive_ratio': round(percussive_ratio, 3),
            'avg_rms': round(avg_rms, 4),
            'avg_flatness': round(avg_flatness, 4),
            'sample_duration': round(duration, 1)
        }

    except Exception as e:
        print(f"Quick audio classification failed: {e}", file=sys.stderr)
        return {'video_type': 'unknown', 'speech_ratio': 0.0, 'harmonic_ratio': 0.0}


def get_analysis_strategy(video_type: str) -> Dict[str, Any]:
    """
    Return analysis parameters adapted to the detected video type.

    Controls whether BLIP scene analysis runs, frame sampling intervals,
    and priorities for different analysis stages.

    Args:
        video_type: Video type from quick_classify_audio()

    Returns:
        Dict with skip_blip, frame_sample_interval, min_sample_interval,
        max_sample_interval, focus_beat_sync, transcription_priority
    """
    strategies = {
        'music_video': {
            'skip_blip': True,       # Minimal useful visual captions
            'frame_sample_interval': 5.0,
            'min_sample_interval': 3.0,
            'max_sample_interval': 8.0,
            'focus_beat_sync': True,
            'transcription_priority': 'low',
        },
        'podcast_interview': {
            'skip_blip': True,       # Minimal visual change
            'frame_sample_interval': 8.0,
            'min_sample_interval': 5.0,
            'max_sample_interval': 15.0,
            'focus_beat_sync': False,
            'transcription_priority': 'high',
        },
        'vlog_tutorial': {
            'skip_blip': False,
            'frame_sample_interval': 3.0,
            'min_sample_interval': 1.5,
            'max_sample_interval': 5.0,
            'focus_beat_sync': False,
            'transcription_priority': 'high',
        },
        'action_dynamic': {
            'skip_blip': False,
            'frame_sample_interval': 2.0,
            'min_sample_interval': 1.0,
            'max_sample_interval': 3.0,
            'focus_beat_sync': True,
            'transcription_priority': 'medium',
        },
        'documentary_nature': {
            'skip_blip': False,
            'frame_sample_interval': 4.0,
            'min_sample_interval': 2.0,
            'max_sample_interval': 6.0,
            'focus_beat_sync': False,
            'transcription_priority': 'medium',
        },
        'silent_minimal': {
            'skip_blip': False,
            'frame_sample_interval': 3.0,
            'min_sample_interval': 1.5,
            'max_sample_interval': 5.0,
            'focus_beat_sync': False,
            'transcription_priority': 'low',
        },
    }

    return strategies.get(video_type, {
        'skip_blip': False,
        'frame_sample_interval': 3.0,
        'min_sample_interval': 1.5,
        'max_sample_interval': 5.0,
        'focus_beat_sync': False,
        'transcription_priority': 'medium',
    })


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


def compute_audio_emotion_at_time(
    timestamp: float,
    audio_advanced: Dict,
    audio_content: Dict
) -> Dict[str, float]:
    """
    Compute emotion scores from audio features at a specific timestamp.

    Looks up audio characteristics (energy, tempo, spectral properties) and
    maps them to emotion scores for fusion with visual emotion detection.

    Args:
        timestamp: Time in seconds to evaluate
        audio_advanced: Advanced audio analysis (tempo, beats, spectral)
        audio_content: Audio content analysis (segments with energy, brightness, etc.)

    Returns:
        Dict mapping emotion name to score (0.0-1.0)
    """
    scores = {
        'exciting': 0.0,
        'calm': 0.0,
        'happy': 0.0,
        'dramatic': 0.0,
        'sad': 0.0,
    }

    tempo = audio_advanced.get('tempo', 120)
    spectral = audio_advanced.get('spectral', {})
    avg_centroid = spectral.get('avg_centroid', 2000)
    avg_rms = spectral.get('avg_rms', 0.05)

    # Find the audio segment at this timestamp
    segments = audio_content.get('segments', [])
    seg = None
    for s in segments:
        if s.get('start', 0) <= timestamp <= s.get('end', 0):
            seg = s
            break

    if seg is None:
        # No segment found, return neutral scores
        return scores

    energy = seg.get('energy', 'medium')
    harmonic_ratio = seg.get('harmonic_ratio', 0.5)
    percussive_ratio = seg.get('percussive_ratio', 0.3)
    brightness = seg.get('brightness', 'neutral')

    energy_val = {'low': 0.2, 'medium': 0.5, 'high': 0.9}.get(energy, 0.5)

    # exciting: high energy + fast tempo + percussive
    exciting_score = 0.0
    if energy_val > 0.6:
        exciting_score += 0.3
    if tempo > 130:
        exciting_score += 0.3
    if percussive_ratio > 0.35:
        exciting_score += 0.4
    scores['exciting'] = min(exciting_score, 1.0)

    # calm: low energy + slow tempo + harmonic
    calm_score = 0.0
    if energy_val < 0.4:
        calm_score += 0.3
    if tempo < 100:
        calm_score += 0.3
    if harmonic_ratio > 0.5:
        calm_score += 0.4
    scores['calm'] = min(calm_score, 1.0)

    # happy: bright spectral + medium energy + moderate-fast tempo
    happy_score = 0.0
    if brightness == 'bright' or avg_centroid > 3000:
        happy_score += 0.4
    if 0.3 <= energy_val <= 0.7:
        happy_score += 0.2
    if tempo > 100:
        happy_score += 0.4
    scores['happy'] = min(happy_score, 1.0)

    # dramatic: dark spectral + high energy + mixed harmonic/percussive
    dramatic_score = 0.0
    if brightness == 'dark' or avg_centroid < 1500:
        dramatic_score += 0.3
    if energy_val > 0.6:
        dramatic_score += 0.4
    if harmonic_ratio > 0.3 and percussive_ratio > 0.2:
        dramatic_score += 0.3
    scores['dramatic'] = min(dramatic_score, 1.0)

    # sad: low energy + dark spectral + slow tempo
    sad_score = 0.0
    if energy_val < 0.4:
        sad_score += 0.3
    if brightness == 'dark' or avg_centroid < 2000:
        sad_score += 0.3
    if tempo < 90:
        sad_score += 0.4
    scores['sad'] = min(sad_score, 1.0)

    return scores


def detect_emotion_from_description(
    description: str,
    audio_emotion_scores: Optional[Dict[str, float]] = None,
    visual_weight: float = 0.6,
    audio_weight: float = 0.4
) -> Dict[str, Any]:
    """
    Detect emotional tone from scene description with optional audio fusion.

    When audio_emotion_scores is provided, fuses visual keyword scores with
    audio-derived emotion scores using configurable weights. This produces
    richer emotion detection than either modality alone.

    Args:
        description: Scene description text
        audio_emotion_scores: Optional dict of emotion->score from compute_audio_emotion_at_time()
        visual_weight: Weight for visual emotion (default 0.6)
        audio_weight: Weight for audio emotion (default 0.4)

    Returns:
        Dict with detected emotion, confidence, and editing suggestions
    """
    desc_lower = description.lower()

    # Visual keyword scoring
    visual_scores = {}
    for emotion, data in EMOTION_KEYWORDS.items():
        matches = sum(1 for kw in data['keywords'] if kw in desc_lower)
        if matches > 0:
            visual_scores[emotion] = matches

    # Normalize visual scores to 0-1 range
    if visual_scores:
        max_visual = max(visual_scores.values())
        visual_normalized = {e: s / max_visual for e, s in visual_scores.items()}
    else:
        visual_normalized = {}

    # Fuse with audio scores if available
    if audio_emotion_scores:
        all_emotions = set(list(visual_normalized.keys()) + list(audio_emotion_scores.keys()))
        fused_scores = {}
        for emotion in all_emotions:
            v_score = visual_normalized.get(emotion, 0.0)
            a_score = audio_emotion_scores.get(emotion, 0.0)
            fused_scores[emotion] = v_score * visual_weight + a_score * audio_weight
    else:
        fused_scores = visual_normalized

    if not fused_scores:
        return {
            'emotion': 'neutral',
            'confidence': 0.3,
            'suggested_transitions': ['dissolve', 'fade'],
            'sfx_mood': 'ambient, neutral'
        }

    # Get dominant emotion from fused scores
    dominant_emotion = max(fused_scores, key=fused_scores.get)
    max_fused = fused_scores[dominant_emotion]

    # Confidence: based on fused score strength
    if audio_emotion_scores:
        confidence = min(0.5 + max_fused * 0.45, 0.95)
    else:
        # Original keyword-only confidence
        raw_matches = visual_scores.get(dominant_emotion, 0)
        confidence = min(0.5 + (raw_matches * 0.15), 0.95)

    # Map to EMOTION_KEYWORDS data if available, otherwise use defaults
    if dominant_emotion in EMOTION_KEYWORDS:
        emotion_data = EMOTION_KEYWORDS[dominant_emotion]
        return {
            'emotion': dominant_emotion,
            'confidence': confidence,
            'suggested_transitions': emotion_data['transitions'],
            'sfx_mood': emotion_data['sfx_mood'],
            'all_emotions': {e: round(s, 3) for e, s in fused_scores.items()}
        }
    else:
        # Audio-only emotion without EMOTION_KEYWORDS entry
        default_transitions = {
            'exciting': ['glitch', 'flash', 'zoom_in'],
            'calm': ['dissolve', 'fade', 'cross_zoom'],
            'happy': ['zoom_in', 'flash', 'spin'],
            'dramatic': ['zoom_in', 'flash', 'wipe_left'],
            'sad': ['dissolve', 'fade', 'blur'],
        }
        default_moods = {
            'exciting': 'intense, dynamic',
            'calm': 'ambient, peaceful',
            'happy': 'upbeat, cheerful',
            'dramatic': 'dramatic, impactful',
            'sad': 'melancholic, soft',
        }
        return {
            'emotion': dominant_emotion,
            'confidence': confidence,
            'suggested_transitions': default_transitions.get(dominant_emotion, ['dissolve', 'fade']),
            'sfx_mood': default_moods.get(dominant_emotion, 'ambient, neutral'),
            'all_emotions': {e: round(s, 3) for e, s in fused_scores.items()}
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


# =============================================================================
# SHOT TYPE CLASSIFICATION (Professional Video Grammar)
# =============================================================================

def classify_shot_type(frame) -> Dict[str, Any]:
    """
    Classify the shot type of a video frame using face detection and composition.

    Professional editors think in shot types — each has different editing rules:
    - close_up: intimate framing, hold longer, dissolve out
    - medium_shot: standard framing, versatile transitions
    - wide_shot: establishing/location, hold longer, slow transitions
    - extreme_close_up: detail shot, dramatic emphasis
    - talking_head: consistent speaker framing, no competing SFX
    - group_shot: multiple subjects, social context
    - b_roll: no faces, supplementary footage, can cut fast
    - text_graphic: text/slide content, hold for readability

    Args:
        frame: Video frame (BGR format from OpenCV)

    Returns:
        Dict with shot_type, face_count, face_area_ratio, composition details
    """
    import cv2

    h, w = frame.shape[:2]
    frame_area = h * w
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Face detection using Haar cascade (fast, no GPU needed)
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
    )

    face_count = len(faces)
    total_face_area = 0
    largest_face_ratio = 0.0
    face_positions = []  # normalized (cx, cy) positions

    for (x, y, fw, fh) in faces:
        area = fw * fh
        total_face_area += area
        ratio = area / frame_area
        if ratio > largest_face_ratio:
            largest_face_ratio = ratio
        cx = (x + fw / 2) / w
        cy = (y + fh / 2) / h
        face_positions.append({'x': round(cx, 2), 'y': round(cy, 2)})

    face_area_ratio = total_face_area / frame_area

    # Edge density analysis (helps detect text/graphic slides)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.mean(edges > 0)

    # Composition analysis: thirds grid
    # Where is the visual weight? center-heavy vs distributed
    h_third = h // 3
    w_third = w // 3
    center_region = gray[h_third:2*h_third, w_third:2*w_third]
    outer_region_mean = (np.mean(gray) * frame_area - np.mean(center_region) * (h_third * w_third)) / max(frame_area - h_third * w_third, 1)
    center_weight = np.mean(center_region) / max(outer_region_mean, 1)

    # Classify shot type
    if face_count == 0:
        # No faces detected
        if edge_density > 0.15:
            shot_type = 'text_graphic'
        else:
            shot_type = 'b_roll'
    elif face_count == 1:
        if largest_face_ratio > 0.15:
            shot_type = 'extreme_close_up'
        elif largest_face_ratio > 0.04:
            shot_type = 'close_up'
        elif largest_face_ratio > 0.01:
            shot_type = 'medium_shot'
        else:
            shot_type = 'wide_shot'

        # Check for talking head pattern: single centered face
        if face_positions and abs(face_positions[0]['x'] - 0.5) < 0.2:
            if largest_face_ratio > 0.02:
                shot_type = 'talking_head'
    elif face_count >= 2:
        if face_area_ratio > 0.08:
            shot_type = 'group_shot'
        elif face_area_ratio > 0.02:
            shot_type = 'medium_shot'
        else:
            shot_type = 'wide_shot'
    else:
        shot_type = 'b_roll'

    return {
        'shot_type': shot_type,
        'face_count': face_count,
        'face_area_ratio': round(face_area_ratio, 4),
        'largest_face_ratio': round(largest_face_ratio, 4),
        'face_positions': face_positions,
        'edge_density': round(edge_density, 3),
        'center_weight': round(center_weight, 2),
    }


# =============================================================================
# COLOR / LIGHTING MOOD ANALYSIS
# =============================================================================

def analyze_frame_color_mood(frame) -> Dict[str, Any]:
    """
    Analyze color and lighting properties of a frame for mood inference.

    Color is responsible for ~70% of emotional perception in video.
    Professional editors use color temperature, saturation, and contrast
    to inform every editing decision.

    Args:
        frame: Video frame (BGR format from OpenCV)

    Returns:
        Dict with color_temperature, brightness_key, saturation_level,
        contrast, dominant_colors, and derived color_mood
    """
    import cv2

    # Convert to different color spaces
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)

    h, s, v = cv2.split(hsv)
    l_chan, a_chan, b_chan = cv2.split(lab)

    # --- Brightness / Key ---
    mean_brightness = float(np.mean(v))
    brightness_key = 'mid_key'
    if mean_brightness > 170:
        brightness_key = 'high_key'
    elif mean_brightness < 85:
        brightness_key = 'low_key'

    # --- Contrast ---
    contrast = float(np.std(v.astype(float)))

    # --- Saturation ---
    mean_saturation = float(np.mean(s))
    saturation_level = 'normal'
    if mean_saturation > 140:
        saturation_level = 'vivid'
    elif mean_saturation < 50:
        saturation_level = 'desaturated'
    elif mean_saturation < 90:
        saturation_level = 'muted'

    # --- Color Temperature (from LAB b-channel: negative=blue/cool, positive=yellow/warm) ---
    mean_b = float(np.mean(b_chan.astype(float)))
    # LAB b-channel: 0-127 is cool (blue-ish), 128+ is warm (yellow-ish)
    warmth_score = (mean_b - 128.0) / 128.0  # -1.0 (very cool) to +1.0 (very warm)
    color_temperature = 'neutral'
    if warmth_score > 0.08:
        color_temperature = 'warm'
    elif warmth_score < -0.08:
        color_temperature = 'cool'

    # --- Dominant Colors via K-Means (k=3) ---
    pixels = frame.reshape(-1, 3).astype(np.float32)
    # Subsample for speed (every 8th pixel)
    pixels = pixels[::8]
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    try:
        _, labels, centers = cv2.kmeans(
            pixels, 3, None, criteria, 3, cv2.KMEANS_PP_CENTERS
        )
        # Convert BGR centers to hex colors and compute percentages
        dominant_colors = []
        total_labels = len(labels)
        for i, center in enumerate(centers):
            count = int(np.sum(labels == i))
            b_val, g_val, r_val = int(center[0]), int(center[1]), int(center[2])
            hex_color = f"#{r_val:02x}{g_val:02x}{b_val:02x}"
            dominant_colors.append({
                'color': hex_color,
                'percentage': round(count / total_labels, 2)
            })
        dominant_colors.sort(key=lambda x: x['percentage'], reverse=True)
    except Exception:
        dominant_colors = []

    # --- Derive Color Mood ---
    # Combine color properties into an overall mood label
    if brightness_key == 'low_key' and saturation_level in ('desaturated', 'muted'):
        color_mood = 'dark_moody'
    elif brightness_key == 'low_key' and color_temperature == 'cool':
        color_mood = 'cold_dramatic'
    elif brightness_key == 'high_key' and saturation_level == 'vivid':
        color_mood = 'bright_energetic'
    elif brightness_key == 'high_key' and color_temperature == 'warm':
        color_mood = 'warm_cheerful'
    elif color_temperature == 'warm' and saturation_level in ('normal', 'vivid'):
        color_mood = 'warm_intimate'
    elif color_temperature == 'cool' and saturation_level in ('normal', 'muted'):
        color_mood = 'cool_professional'
    elif saturation_level == 'desaturated':
        color_mood = 'muted_vintage'
    else:
        color_mood = 'neutral'

    return {
        'color_temperature': color_temperature,
        'warmth_score': round(warmth_score, 3),
        'brightness_key': brightness_key,
        'mean_brightness': round(mean_brightness, 1),
        'saturation_level': saturation_level,
        'mean_saturation': round(mean_saturation, 1),
        'contrast': round(contrast, 1),
        'dominant_colors': dominant_colors,
        'color_mood': color_mood,
    }


def _color_mood_to_emotion_scores(color_mood_data: Dict) -> Dict[str, float]:
    """
    Convert color/lighting analysis into emotion modifier scores.

    Used as a third modality alongside visual keywords and audio
    in the emotion detection fusion.

    Args:
        color_mood_data: Output from analyze_frame_color_mood()

    Returns:
        Dict mapping emotion name to score (0.0-1.0)
    """
    scores = {
        'exciting': 0.0,
        'calm': 0.0,
        'happy': 0.0,
        'dramatic': 0.0,
        'sad': 0.0,
        'mysterious': 0.0,
        'romantic': 0.0,
    }

    color_mood = color_mood_data.get('color_mood', 'neutral')
    brightness = color_mood_data.get('brightness_key', 'mid_key')
    temp = color_mood_data.get('color_temperature', 'neutral')
    sat = color_mood_data.get('saturation_level', 'normal')
    contrast = color_mood_data.get('contrast', 50)

    # Direct mood mappings
    mood_map = {
        'dark_moody': {'dramatic': 0.7, 'sad': 0.4, 'mysterious': 0.6},
        'cold_dramatic': {'dramatic': 0.8, 'mysterious': 0.5, 'sad': 0.3},
        'bright_energetic': {'exciting': 0.7, 'happy': 0.8},
        'warm_cheerful': {'happy': 0.8, 'romantic': 0.3, 'calm': 0.2},
        'warm_intimate': {'romantic': 0.7, 'calm': 0.5, 'happy': 0.3},
        'cool_professional': {'calm': 0.4},
        'muted_vintage': {'sad': 0.4, 'calm': 0.3, 'mysterious': 0.2},
        'neutral': {},
    }

    for emotion, score in mood_map.get(color_mood, {}).items():
        scores[emotion] = max(scores[emotion], score)

    # High contrast boosts dramatic/exciting
    if contrast > 70:
        scores['dramatic'] = max(scores['dramatic'], 0.4)
        scores['exciting'] = max(scores['exciting'], 0.3)

    # Very low brightness boosts mysterious/dramatic
    if brightness == 'low_key':
        scores['mysterious'] = max(scores['mysterious'], 0.5)
        scores['dramatic'] = max(scores['dramatic'], 0.3)

    # Vivid saturation boosts energy
    if sat == 'vivid':
        scores['exciting'] = max(scores['exciting'], 0.3)
        scores['happy'] = max(scores['happy'], 0.3)

    return scores


# =============================================================================
# COLOR GRADING / LUT SUGGESTIONS
# =============================================================================

def suggest_color_grade(scenes: List[Dict]) -> Dict[str, Any]:
    """
    Generate per-scene color grading suggestions and overall LUT recommendations.

    Professional editors use color grading for 50%+ of perceived quality.
    This analyzes color properties across scenes and suggests corrections
    for consistency and cinematic look.

    Args:
        scenes: Analyzed scenes with color_mood, color_temperature,
                brightness_key, saturation_level, dominant_colors

    Returns:
        Dict with overall_lut, per_scene_grades, consistency_score,
        and skin_tone_note
    """
    if not scenes:
        return {
            'overall_lut': 'none',
            'lut_reason': 'no scenes',
            'per_scene_grades': [],
            'consistency_score': 0.0,
            'global_adjustments': {},
        }

    # Collect color properties across all scenes
    temps = [s.get('color_temperature', 'neutral') for s in scenes]
    brightness_keys = [s.get('brightness_key', 'mid_key') for s in scenes]
    sat_levels = [s.get('saturation_level', 'normal') for s in scenes]
    moods = [s.get('color_mood', 'neutral') for s in scenes]

    # --- Consistency Score ---
    # How uniform is the color palette across scenes?
    from collections import Counter
    temp_counts = Counter(temps)
    brightness_counts = Counter(brightness_keys)
    sat_counts = Counter(sat_levels)
    dominant_temp = temp_counts.most_common(1)[0]
    dominant_brightness = brightness_counts.most_common(1)[0]
    dominant_sat = sat_counts.most_common(1)[0]

    consistency_score = (
        (dominant_temp[1] / len(scenes)) * 0.4 +
        (dominant_brightness[1] / len(scenes)) * 0.3 +
        (dominant_sat[1] / len(scenes)) * 0.3
    )

    # --- Overall LUT Recommendation ---
    mood_counts = Counter(moods)
    dominant_mood = mood_counts.most_common(1)[0][0]

    lut_recommendations = {
        'dark_moody': ('cinematic_teal_orange', 'Dark moody scenes benefit from teal-orange color separation'),
        'cold_dramatic': ('cold_blue_steel', 'Cool dramatic look enhanced with blue steel grading'),
        'bright_energetic': ('vibrant_pop', 'Bright scenes pop with lifted shadows and vivid saturation'),
        'warm_cheerful': ('warm_golden', 'Warm golden tones enhance cheerful mood'),
        'warm_intimate': ('warm_film', 'Film-like warm tones with soft contrast for intimacy'),
        'cool_professional': ('clean_corporate', 'Clean neutral tones with slight cool shift'),
        'muted_vintage': ('film_emulation', 'Film emulation LUT with lifted blacks and faded highlights'),
        'neutral': ('subtle_contrast', 'Subtle contrast boost with natural color balance'),
    }

    overall_lut, lut_reason = lut_recommendations.get(
        dominant_mood, ('subtle_contrast', 'General enhancement')
    )

    # --- Global Adjustments ---
    global_adj = {}

    # Temperature correction toward consistency
    if dominant_temp[0] == 'warm' and dominant_temp[1] < len(scenes) * 0.7:
        global_adj['temperature'] = {'direction': 'warm', 'strength': 15,
                                     'reason': 'Unify color temperature toward dominant warm tone'}
    elif dominant_temp[0] == 'cool' and dominant_temp[1] < len(scenes) * 0.7:
        global_adj['temperature'] = {'direction': 'cool', 'strength': 10,
                                     'reason': 'Unify color temperature toward dominant cool tone'}

    # Brightness normalization
    low_key_ratio = brightness_counts.get('low_key', 0) / len(scenes)
    high_key_ratio = brightness_counts.get('high_key', 0) / len(scenes)
    if low_key_ratio > 0.5:
        global_adj['lift'] = {'value': 5, 'reason': 'Lift shadows slightly for visibility in dark scenes'}
    if high_key_ratio > 0.5:
        global_adj['gain'] = {'value': -5, 'reason': 'Pull down highlights to prevent blown-out look'}

    # Saturation adjustment
    desat_ratio = (sat_counts.get('desaturated', 0) + sat_counts.get('muted', 0)) / len(scenes)
    if desat_ratio > 0.5 and dominant_mood not in ('muted_vintage', 'dark_moody'):
        global_adj['saturation'] = {'value': 15, 'reason': 'Boost saturation for more visual energy'}

    # --- Per-Scene Grades ---
    per_scene_grades = []
    for i, scene in enumerate(scenes):
        grade = {'timestamp': scene.get('timestamp', 0)}
        adjustments = []

        scene_temp = scene.get('color_temperature', 'neutral')
        scene_brightness = scene.get('brightness_key', 'mid_key')
        scene_sat = scene.get('saturation_level', 'normal')

        # Temperature mismatch with dominant
        if scene_temp != dominant_temp[0] and dominant_temp[0] != 'neutral':
            if scene_temp == 'warm' and dominant_temp[0] == 'cool':
                adjustments.append({'type': 'temperature', 'shift': -20,
                                    'reason': 'Cool down to match overall palette'})
            elif scene_temp == 'cool' and dominant_temp[0] == 'warm':
                adjustments.append({'type': 'temperature', 'shift': 20,
                                    'reason': 'Warm up to match overall palette'})

        # Brightness outlier correction
        if scene_brightness == 'low_key' and dominant_brightness[0] != 'low_key':
            adjustments.append({'type': 'exposure', 'shift': 10,
                                'reason': 'Brighten to match overall exposure level'})
        elif scene_brightness == 'high_key' and dominant_brightness[0] != 'high_key':
            adjustments.append({'type': 'exposure', 'shift': -10,
                                'reason': 'Darken to match overall exposure level'})

        # Saturation outlier correction
        if scene_sat == 'desaturated' and dominant_sat[0] in ('normal', 'vivid'):
            adjustments.append({'type': 'saturation', 'shift': 20,
                                'reason': 'Boost saturation to match surrounding scenes'})
        elif scene_sat == 'vivid' and dominant_sat[0] in ('muted', 'desaturated'):
            adjustments.append({'type': 'saturation', 'shift': -15,
                                'reason': 'Reduce saturation for visual consistency'})

        grade['adjustments'] = adjustments
        grade['needs_correction'] = len(adjustments) > 0
        per_scene_grades.append(grade)

    scenes_needing_correction = sum(1 for g in per_scene_grades if g['needs_correction'])

    return {
        'overall_lut': overall_lut,
        'lut_reason': lut_reason,
        'per_scene_grades': per_scene_grades,
        'consistency_score': round(consistency_score, 2),
        'scenes_needing_correction': scenes_needing_correction,
        'global_adjustments': global_adj,
        'dominant_palette': {
            'temperature': dominant_temp[0],
            'brightness': dominant_brightness[0],
            'saturation': dominant_sat[0],
            'mood': dominant_mood,
        },
    }


# =============================================================================
# AUDIO DUCKING / MIX LEVEL RECOMMENDATIONS
# =============================================================================

def compute_audio_mix_map(
    transcription: List[Dict],
    audio_advanced: Dict,
    audio_content: Dict,
    sfx_suggestions: List[Dict],
    video_duration: float
) -> Dict[str, Any]:
    """
    Generate per-timestamp volume curves for dialogue, BGM, and SFX layers.

    Professional mixing requires:
    - BGM ducks under dialogue (typically -12dB to -18dB)
    - SFX ducks under speech but punches through BGM
    - Silence moments should have subtle ambient presence
    - Transitions may need audio cross-fades

    Args:
        transcription: Segments with start/end times
        audio_advanced: Librosa analysis (beats, tempo, energy)
        audio_content: Audio content detection (type, density)
        sfx_suggestions: SFX placement timestamps
        video_duration: Total duration

    Returns:
        Dict with bgm_volume_curve, sfx_volume_curve, dialogue_regions,
        ducking_points, and mix_notes
    """
    # Build speech timeline
    speech_regions = []
    for seg in transcription:
        if seg.get('text', '').strip():
            speech_regions.append({
                'start': seg['start'],
                'end': seg['end'],
                'energy': seg.get('energy_level', 'normal'),
            })

    # Merge overlapping speech regions
    merged_speech = []
    for region in sorted(speech_regions, key=lambda r: r['start']):
        if merged_speech and region['start'] <= merged_speech[-1]['end'] + 0.3:
            merged_speech[-1]['end'] = max(merged_speech[-1]['end'], region['end'])
        else:
            merged_speech.append(dict(region))

    # Build SFX timeline
    sfx_regions = []
    for sfx in sfx_suggestions:
        t = sfx.get('timestamp', 0)
        dur = sfx.get('duration', 2.0)
        sfx_regions.append({'start': t, 'end': t + dur})

    # Generate BGM volume curve
    # Sample at 0.5s intervals
    sample_interval = 0.5
    bgm_curve = []
    sfx_curve = []
    ducking_points = []

    t = 0.0
    while t <= video_duration:
        # Check if timestamp is during speech
        in_speech = any(r['start'] - 0.2 <= t <= r['end'] + 0.2 for r in merged_speech)
        speech_energy = 'normal'
        if in_speech:
            for r in merged_speech:
                if r['start'] <= t <= r['end']:
                    speech_energy = r.get('energy', 'normal')
                    break

        # Check if timestamp is during SFX
        in_sfx = any(r['start'] <= t <= r['end'] for r in sfx_regions)

        # Check if in high-energy segment
        high_energy_segs = audio_advanced.get('high_energy_segments', [])
        in_high_energy = any(s['start'] <= t <= s['end'] for s in high_energy_segs)

        # --- BGM Volume ---
        bgm_vol = 0.0  # dB relative to base level
        if in_speech:
            # Duck BGM under dialogue
            if speech_energy == 'quiet':
                bgm_vol = -18.0  # Whisper → duck more
            elif speech_energy == 'loud':
                bgm_vol = -10.0  # Loud speech can compete more
            else:
                bgm_vol = -14.0  # Normal speech
            ducking_points.append({
                'timestamp': round(t, 1),
                'type': 'speech_duck',
                'bgm_db': bgm_vol,
            })
        elif in_sfx:
            bgm_vol = -8.0  # Slight duck for SFX
        elif in_high_energy:
            bgm_vol = 0.0  # Let BGM breathe in instrumental sections
        else:
            bgm_vol = -3.0  # Default presence level

        bgm_curve.append({'timestamp': round(t, 1), 'volume_db': round(bgm_vol, 1)})

        # --- SFX Volume ---
        sfx_vol = 0.0
        if in_sfx:
            if in_speech:
                sfx_vol = -6.0  # Softer SFX during speech
            elif in_high_energy:
                sfx_vol = -3.0  # Moderate during high energy
            else:
                sfx_vol = 0.0  # Full volume in quiet sections
        sfx_curve.append({'timestamp': round(t, 1), 'volume_db': round(sfx_vol, 1)})

        t += sample_interval

    # Generate mix notes
    mix_notes = []
    audio_type = audio_content.get('video_audio_type', 'unknown')
    density = audio_content.get('audio_density', 0.5)

    if audio_type == 'podcast_interview':
        mix_notes.append({
            'priority': 'high',
            'note': 'Dialogue-heavy content: BGM should stay below -14dB throughout. '
                    'Use minimal SFX to avoid distraction.'
        })
    elif audio_type == 'music_video':
        mix_notes.append({
            'priority': 'high',
            'note': 'Music-driven content: BGM is the primary audio layer. '
                    'SFX should be rhythmic accents only, not ambient.'
        })
    elif density > 0.7:
        mix_notes.append({
            'priority': 'medium',
            'note': 'Dense audio mix: Use sidechain compression on BGM '
                    'triggered by dialogue for cleaner separation.'
        })

    if len(merged_speech) == 0:
        mix_notes.append({
            'priority': 'low',
            'note': 'No dialogue detected: BGM can run at full volume. '
                    'SFX should be mixed at -3dB to -6dB below BGM.'
        })

    # Calculate speech coverage percentage
    total_speech_time = sum(r['end'] - r['start'] for r in merged_speech)
    speech_coverage = total_speech_time / max(video_duration, 0.1)

    return {
        'bgm_volume_curve': bgm_curve,
        'sfx_volume_curve': sfx_curve,
        'dialogue_regions': merged_speech,
        'ducking_points': [d for d in ducking_points
                          if d == ducking_points[0] or
                          abs(d['timestamp'] - ducking_points[ducking_points.index(d) - 1]['timestamp']) > 1.0]
                          if ducking_points else [],
        'speech_coverage': round(speech_coverage, 2),
        'mix_notes': mix_notes,
    }


# =============================================================================
# GENRE-SPECIFIC EDITING RULE ENGINE
# =============================================================================

def get_genre_editing_rules(video_type: str, tempo: float = 120) -> Dict[str, Any]:
    """
    Return comprehensive editing rules adapted to the detected video genre.

    Professional editors apply fundamentally different rules for different content:
    - Music videos: beat-locked cuts, visual rhythm priority
    - Podcasts: minimal cuts, dialogue continuity, clean audio
    - Tutorials: slower pacing, text callouts, step-based structure
    - Action: fast cuts, impact sync, motion matching
    - Documentary: slow builds, visual storytelling, ambient audio

    Args:
        video_type: From quick_classify_audio() (music_video, podcast_interview, etc.)
        tempo: Detected BPM from librosa

    Returns:
        Dict with transition rules, sfx rules, pacing rules, caption rules
    """
    beat_interval = 60.0 / max(tempo, 60)

    rules = {
        'music_video': {
            'transition_rules': {
                'preferred': ['glitch', 'flash', 'zoom_in', 'zoom_out'],
                'avoid': ['dissolve', 'fade'],  # Too slow for music
                'max_duration': 0.25,
                'beat_lock': True,  # All cuts should land on beats
                'min_shot_duration': beat_interval,  # At least 1 beat per shot
                'allow_jump_cuts': True,
            },
            'sfx_rules': {
                'max_density': 3,  # Max SFX per 10 seconds
                'preferred_types': ['rhythmic_accent', 'impact', 'riser'],
                'avoid_types': ['ambient', 'dialogue_filler'],
                'sync_to_beat': True,
                'volume_relative_to_bgm': -6,  # dB below music
            },
            'pacing_rules': {
                'target_shot_duration': beat_interval * 2,  # 2 beats per shot default
                'min_shot_duration': beat_interval * 0.5,
                'max_shot_duration': beat_interval * 8,
                'allow_speed_ramps': True,
                'rhythm_priority': 'high',
            },
            'caption_rules': {
                'style': 'lyric',
                'word_by_word': True,
                'sync_to_beat': True,
                'position': 'center',
                'animation': 'bounce',
            },
        },
        'podcast_interview': {
            'transition_rules': {
                'preferred': ['cut', 'dissolve'],
                'avoid': ['glitch', 'flash', 'zoom_in', 'wipe'],
                'max_duration': 0.5,
                'beat_lock': False,
                'min_shot_duration': 5.0,  # Hold shots during dialogue
                'allow_jump_cuts': False,
            },
            'sfx_rules': {
                'max_density': 1,  # Minimal SFX
                'preferred_types': ['subtle_transition', 'room_tone'],
                'avoid_types': ['impact', 'loud_accent', 'riser'],
                'sync_to_beat': False,
                'volume_relative_to_bgm': -3,
            },
            'pacing_rules': {
                'target_shot_duration': 8.0,
                'min_shot_duration': 3.0,
                'max_shot_duration': 30.0,
                'allow_speed_ramps': False,
                'rhythm_priority': 'low',
            },
            'caption_rules': {
                'style': 'subtitle',
                'word_by_word': False,
                'sync_to_beat': False,
                'position': 'bottom',
                'animation': 'fade',
            },
        },
        'vlog_tutorial': {
            'transition_rules': {
                'preferred': ['cut', 'zoom_in', 'slide'],
                'avoid': ['glitch', 'flash'],
                'max_duration': 0.4,
                'beat_lock': False,
                'min_shot_duration': 2.0,
                'allow_jump_cuts': True,  # Common in vlogs
            },
            'sfx_rules': {
                'max_density': 4,
                'preferred_types': ['whoosh', 'pop', 'notification', 'subtle_accent'],
                'avoid_types': ['heavy_impact', 'dramatic_riser'],
                'sync_to_beat': False,
                'volume_relative_to_bgm': 0,
            },
            'pacing_rules': {
                'target_shot_duration': 4.0,
                'min_shot_duration': 1.0,
                'max_shot_duration': 15.0,
                'allow_speed_ramps': True,
                'rhythm_priority': 'medium',
            },
            'caption_rules': {
                'style': 'dynamic',
                'word_by_word': True,
                'sync_to_beat': False,
                'position': 'dynamic',  # Move based on content
                'animation': 'pop',
            },
        },
        'action_dynamic': {
            'transition_rules': {
                'preferred': ['glitch', 'flash', 'zoom_in', 'whip_pan'],
                'avoid': ['dissolve', 'fade'],
                'max_duration': 0.2,
                'beat_lock': True,
                'min_shot_duration': 0.5,
                'allow_jump_cuts': True,
            },
            'sfx_rules': {
                'max_density': 6,  # Dense SFX OK
                'preferred_types': ['impact', 'whoosh', 'riser', 'hit'],
                'avoid_types': ['ambient', 'subtle'],
                'sync_to_beat': True,
                'volume_relative_to_bgm': 3,  # SFX louder than BGM
            },
            'pacing_rules': {
                'target_shot_duration': 1.5,
                'min_shot_duration': 0.3,
                'max_shot_duration': 5.0,
                'allow_speed_ramps': True,
                'rhythm_priority': 'high',
            },
            'caption_rules': {
                'style': 'impact',
                'word_by_word': True,
                'sync_to_beat': True,
                'position': 'dynamic',
                'animation': 'slam',
            },
        },
        'documentary_nature': {
            'transition_rules': {
                'preferred': ['dissolve', 'fade', 'cross_zoom'],
                'avoid': ['glitch', 'flash', 'whip_pan'],
                'max_duration': 0.8,
                'beat_lock': False,
                'min_shot_duration': 3.0,
                'allow_jump_cuts': False,
            },
            'sfx_rules': {
                'max_density': 2,
                'preferred_types': ['ambient', 'nature', 'atmospheric'],
                'avoid_types': ['impact', 'notification', 'pop'],
                'sync_to_beat': False,
                'volume_relative_to_bgm': -3,
            },
            'pacing_rules': {
                'target_shot_duration': 6.0,
                'min_shot_duration': 2.0,
                'max_shot_duration': 20.0,
                'allow_speed_ramps': False,
                'rhythm_priority': 'low',
            },
            'caption_rules': {
                'style': 'clean',
                'word_by_word': False,
                'sync_to_beat': False,
                'position': 'bottom',
                'animation': 'fade',
            },
        },
        'silent_minimal': {
            'transition_rules': {
                'preferred': ['dissolve', 'fade', 'zoom_in'],
                'avoid': [],
                'max_duration': 0.6,
                'beat_lock': False,
                'min_shot_duration': 2.0,
                'allow_jump_cuts': True,
            },
            'sfx_rules': {
                'max_density': 5,  # More freedom without dialogue
                'preferred_types': ['ambient', 'foley', 'accent', 'atmosphere'],
                'avoid_types': [],
                'sync_to_beat': False,
                'volume_relative_to_bgm': 0,
            },
            'pacing_rules': {
                'target_shot_duration': 3.0,
                'min_shot_duration': 1.0,
                'max_shot_duration': 10.0,
                'allow_speed_ramps': True,
                'rhythm_priority': 'medium',
            },
            'caption_rules': {
                'style': 'minimal',
                'word_by_word': False,
                'sync_to_beat': False,
                'position': 'bottom',
                'animation': 'fade',
            },
        },
    }

    result = rules.get(video_type, rules['vlog_tutorial'])
    result['genre'] = video_type
    return result


# =============================================================================
# SHOT SCALE PROGRESSION & CONTINUITY RULES
# =============================================================================

def score_transition_continuity(
    scene_before: Optional[Dict],
    scene_after: Optional[Dict],
    transition_type: str,
    genre_rules: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Score a transition based on professional continuity editing rules.

    Professional editors follow shot scale progression, motion continuity,
    and color continuity. This function grades transitions and suggests
    improvements.

    Rules evaluated:
    1. Shot scale progression (wide→medium→close = good, same→same = bad)
    2. Motion direction continuity (subject moving left should continue left)
    3. Color temperature continuity (warm→cool jump = jarring without reason)
    4. Brightness continuity (dramatic jump = jarring unless intentional)
    5. Genre appropriateness (transition type vs genre preferences)

    Args:
        scene_before: Scene dict before the cut
        scene_after: Scene dict after the cut
        transition_type: Currently suggested transition
        genre_rules: Optional genre editing rules

    Returns:
        Dict with continuity_score, issues, suggested_override, reason
    """
    score = 1.0
    issues = []
    suggested_override = None
    override_reason = None

    if not scene_before or not scene_after:
        return {
            'continuity_score': 0.5,
            'issues': [],
            'suggested_override': None,
            'override_reason': None,
        }

    # --- 1. Shot Scale Progression ---
    scale_order = {
        'extreme_close_up': 0, 'close_up': 1, 'medium_shot': 2,
        'talking_head': 2, 'group_shot': 3, 'wide_shot': 4,
        'b_roll': 3, 'text_graphic': 3,
    }
    shot_a = scene_before.get('shot_type', 'b_roll')
    shot_b = scene_after.get('shot_type', 'b_roll')
    scale_a = scale_order.get(shot_a, 3)
    scale_b = scale_order.get(shot_b, 3)
    scale_delta = abs(scale_a - scale_b)

    if scale_delta == 0 and shot_a == shot_b and shot_a not in ('b_roll', 'text_graphic'):
        # Same shot scale → potential jump cut
        score -= 0.25
        issues.append({
            'type': 'same_scale',
            'severity': 'medium',
            'message': f'Same shot scale ({shot_a}→{shot_b}): '
                       f'consider varying shot size for visual interest'
        })
        # Jump cuts can be masked with a dissolve or zoom
        if transition_type in ('cut',):
            suggested_override = 'zoom_in'
            override_reason = 'Mask same-scale cut with zoom transition'

    elif scale_delta >= 3:
        # Extreme jump in scale (e.g., extreme_close_up → wide_shot)
        score -= 0.15
        issues.append({
            'type': 'extreme_scale_jump',
            'severity': 'low',
            'message': f'Large scale jump ({shot_a}→{shot_b}): '
                       f'consider an intermediate shot or dissolve'
        })
        if transition_type == 'cut':
            suggested_override = 'dissolve'
            override_reason = 'Soften extreme scale change with dissolve'

    elif 1 <= scale_delta <= 2:
        # Good progression — reward
        score += 0.1

    # --- 2. Motion Direction Continuity ---
    dir_a = scene_before.get('dominant_direction', 'static')
    dir_b = scene_after.get('dominant_direction', 'static')

    opposite_pairs = {('left', 'right'), ('right', 'left'), ('up', 'down'), ('down', 'up')}
    if (dir_a, dir_b) in opposite_pairs and dir_a != 'static':
        score -= 0.2
        issues.append({
            'type': 'motion_reversal',
            'severity': 'medium',
            'message': f'Motion direction reversal ({dir_a}→{dir_b}): '
                       f'may disorient viewer'
        })

    # --- 3. Color Temperature Continuity ---
    temp_a = scene_before.get('color_temperature', 'neutral')
    temp_b = scene_after.get('color_temperature', 'neutral')

    if temp_a != temp_b and temp_a != 'neutral' and temp_b != 'neutral':
        score -= 0.15
        issues.append({
            'type': 'color_temp_jump',
            'severity': 'low',
            'message': f'Color temperature shift ({temp_a}→{temp_b}): '
                       f'consider color grading for smoother transition'
        })
        # Dissolve helps mask color jumps
        if transition_type == 'cut' and not (genre_rules or {}).get(
            'transition_rules', {}
        ).get('allow_jump_cuts', True):
            suggested_override = 'dissolve'
            override_reason = 'Mask color temperature jump with dissolve'

    # --- 4. Brightness Continuity ---
    bright_a = scene_before.get('brightness_key', 'mid_key')
    bright_b = scene_after.get('brightness_key', 'mid_key')

    brightness_jump = (
        (bright_a == 'low_key' and bright_b == 'high_key') or
        (bright_a == 'high_key' and bright_b == 'low_key')
    )
    if brightness_jump:
        score -= 0.15
        issues.append({
            'type': 'brightness_jump',
            'severity': 'medium',
            'message': f'Brightness jump ({bright_a}→{bright_b}): '
                       f'may be jarring; consider fade or flash transition'
        })
        if transition_type == 'cut':
            if bright_a == 'low_key':
                suggested_override = 'flash'
                override_reason = 'Flash transition bridges dark→bright jump'
            else:
                suggested_override = 'fade'
                override_reason = 'Fade bridges bright→dark shift'

    # --- 5. Genre Appropriateness ---
    if genre_rules:
        tr_rules = genre_rules.get('transition_rules', {})
        preferred = tr_rules.get('preferred', [])
        avoid = tr_rules.get('avoid', [])

        if transition_type in avoid:
            score -= 0.2
            issues.append({
                'type': 'genre_mismatch',
                'severity': 'medium',
                'message': f'Transition "{transition_type}" is not recommended '
                           f'for {genre_rules.get("genre", "this")} genre'
            })
            if preferred:
                suggested_override = preferred[0]
                override_reason = f'Better match for {genre_rules.get("genre")} genre'

        elif transition_type in preferred:
            score += 0.1

    score = max(0.0, min(1.0, score))

    return {
        'continuity_score': round(score, 2),
        'issues': issues,
        'suggested_override': suggested_override,
        'override_reason': override_reason,
    }


# =============================================================================
# SCENE-PAIR VISUAL COMPARISON (for transition intelligence)
# =============================================================================

def compare_scene_pair_visuals(
    frame_a,
    frame_b,
    shot_type_a: Optional[Dict] = None,
    shot_type_b: Optional[Dict] = None,
    color_a: Optional[Dict] = None,
    color_b: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Compare visual properties between two frames at a cut point.

    Professional editors select transitions based on the RELATIONSHIP between
    two shots, not the emotion of one shot alone. This function provides the
    visual delta that drives intelligent transition selection.

    Args:
        frame_a: Last frame before the cut (BGR)
        frame_b: First frame after the cut (BGR)
        shot_type_a: Pre-computed shot type for frame A (optional, computed if None)
        shot_type_b: Pre-computed shot type for frame B (optional, computed if None)
        color_a: Pre-computed color mood for frame A (optional, computed if None)
        color_b: Pre-computed color mood for frame B (optional, computed if None)

    Returns:
        Dict with visual deltas and transition recommendation
    """
    import cv2

    # Compute shot types if not provided
    if shot_type_a is None:
        shot_type_a = classify_shot_type(frame_a)
    if shot_type_b is None:
        shot_type_b = classify_shot_type(frame_b)

    # Compute color moods if not provided
    if color_a is None:
        color_a = analyze_frame_color_mood(frame_a)
    if color_b is None:
        color_b = analyze_frame_color_mood(frame_b)

    # --- Color temperature delta ---
    warmth_delta = abs(color_a.get('warmth_score', 0) - color_b.get('warmth_score', 0))

    # --- Brightness delta ---
    brightness_delta = abs(color_a.get('mean_brightness', 128) - color_b.get('mean_brightness', 128))

    # --- Saturation delta ---
    sat_delta = abs(color_a.get('mean_saturation', 100) - color_b.get('mean_saturation', 100))

    # --- Shot type change ---
    type_a = shot_type_a.get('shot_type', 'b_roll')
    type_b = shot_type_b.get('shot_type', 'b_roll')
    shot_type_changed = type_a != type_b

    # Scale classification for zoom transitions
    scale_order = {
        'extreme_close_up': 0, 'close_up': 1, 'talking_head': 1.5,
        'medium_shot': 2, 'group_shot': 2.5, 'wide_shot': 3,
        'b_roll': 2, 'text_graphic': 2
    }
    scale_a = scale_order.get(type_a, 2)
    scale_b = scale_order.get(type_b, 2)
    scale_delta = scale_b - scale_a  # positive = zooming out, negative = zooming in

    # --- Dominant motion via simple optical flow on small frames ---
    gray_a = cv2.cvtColor(cv2.resize(frame_a, (160, 90)), cv2.COLOR_BGR2GRAY)
    gray_b = cv2.cvtColor(cv2.resize(frame_b, (160, 90)), cv2.COLOR_BGR2GRAY)

    flow = cv2.calcOpticalFlowFarneback(
        gray_a, gray_b, None,
        pyr_scale=0.5, levels=3, winsize=15,
        iterations=3, poly_n=5, poly_sigma=1.2, flags=0
    )
    flow_mag = np.sqrt(flow[..., 0]**2 + flow[..., 1]**2)
    mean_flow = float(np.mean(flow_mag))

    # Dominant direction
    mean_dx = float(np.mean(flow[..., 0]))
    mean_dy = float(np.mean(flow[..., 1]))

    if abs(mean_dx) > abs(mean_dy) and abs(mean_dx) > 0.5:
        motion_direction = 'right' if mean_dx > 0 else 'left'
    elif abs(mean_dy) > 0.5:
        motion_direction = 'down' if mean_dy > 0 else 'up'
    else:
        motion_direction = 'none'

    # --- Transition recommendation based on visual relationship ---
    recommended_transition = 'cut'  # default
    transition_reason = 'standard cut'
    transition_duration = 0.3

    # Large color mismatch → dissolve to soften
    color_mismatch = warmth_delta > 0.15 or brightness_delta > 60 or sat_delta > 50
    if color_mismatch:
        recommended_transition = 'dissolve'
        transition_reason = 'color/brightness mismatch between shots'
        transition_duration = 0.6

    # Scale change → zoom transition
    if abs(scale_delta) >= 1.5:
        if scale_delta < 0:
            recommended_transition = 'zoom_in'
            transition_reason = f'scale change: {type_a} → {type_b} (tighter framing)'
        else:
            recommended_transition = 'zoom_out' if not color_mismatch else 'dissolve'
            transition_reason = f'scale change: {type_a} → {type_b} (wider framing)'
        transition_duration = 0.5

    # Same shot type (talking_head→talking_head) → jump cut with flash
    if type_a == type_b and type_a in ('talking_head', 'close_up'):
        if mean_flow < 2.0:  # not much motion = jump cut
            recommended_transition = 'flash'
            transition_reason = f'same framing ({type_a} → {type_b}), jump cut style'
            transition_duration = 0.15

    # Motion carry-through → wipe in motion direction
    if mean_flow > 3.0 and motion_direction != 'none':
        wipe_map = {'left': 'wipe_left', 'right': 'wipe_right',
                    'up': 'wipe_up', 'down': 'wipe_down'}
        recommended_transition = wipe_map.get(motion_direction, 'wipe_left')
        transition_reason = f'motion carry-through ({motion_direction})'
        transition_duration = 0.3

    # B-roll transitions should be subtle
    if type_a == 'b_roll' or type_b == 'b_roll':
        if recommended_transition == 'cut':
            recommended_transition = 'fade'
            transition_reason = 'b-roll transition'
            transition_duration = 0.4

    # Text/graphic slides need hold time
    if type_a == 'text_graphic' or type_b == 'text_graphic':
        recommended_transition = 'fade'
        transition_reason = 'text/graphic slide transition'
        transition_duration = 0.5

    return {
        'color_warmth_delta': round(warmth_delta, 3),
        'brightness_delta': round(brightness_delta, 1),
        'saturation_delta': round(sat_delta, 1),
        'color_mismatch': color_mismatch,
        'shot_type_a': type_a,
        'shot_type_b': type_b,
        'shot_type_changed': shot_type_changed,
        'scale_delta': round(scale_delta, 1),
        'mean_flow': round(mean_flow, 2),
        'motion_direction': motion_direction,
        'recommended_transition': recommended_transition,
        'transition_reason': transition_reason,
        'transition_duration': round(transition_duration, 2),
    }


# =============================================================================
# OPTICAL FLOW / MOTION UNDERSTANDING
# =============================================================================

def analyze_motion_between_frames(prev_frame, curr_frame) -> Dict[str, Any]:
    """
    Compute optical flow between two frames to understand motion.

    Goes beyond simple frame differencing — extracts motion direction,
    magnitude, and whether it's camera motion vs subject motion.

    Args:
        prev_frame: Previous frame (BGR from OpenCV)
        curr_frame: Current frame (BGR from OpenCV)

    Returns:
        Dict with motion_magnitude, dominant_direction, motion_type, flow stats
    """
    import cv2

    # Resize for speed
    small_prev = cv2.resize(cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY), (160, 90))
    small_curr = cv2.resize(cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY), (160, 90))

    flow = cv2.calcOpticalFlowFarneback(
        small_prev, small_curr, None,
        pyr_scale=0.5, levels=3, winsize=15,
        iterations=3, poly_n=5, poly_sigma=1.2, flags=0
    )

    mag = np.sqrt(flow[..., 0]**2 + flow[..., 1]**2)
    mean_mag = float(np.mean(mag))
    max_mag = float(np.max(mag))

    mean_dx = float(np.mean(flow[..., 0]))
    mean_dy = float(np.mean(flow[..., 1]))

    # Dominant direction
    if abs(mean_dx) > abs(mean_dy) and abs(mean_dx) > 0.3:
        dominant_direction = 'right' if mean_dx > 0 else 'left'
    elif abs(mean_dy) > 0.3:
        dominant_direction = 'down' if mean_dy > 0 else 'up'
    else:
        dominant_direction = 'static'

    # Distinguish camera motion vs subject motion:
    # Camera motion → uniform flow across the frame
    # Subject motion → localized flow
    flow_std = float(np.std(mag))
    flow_uniformity = 1.0 - min(flow_std / (mean_mag + 1e-6), 1.0)

    if mean_mag < 0.5:
        motion_type = 'static'
    elif flow_uniformity > 0.6:
        motion_type = 'camera_motion'
    elif max_mag > mean_mag * 4:
        motion_type = 'subject_motion'
    else:
        motion_type = 'mixed_motion'

    # Classify camera motion subtype
    camera_subtype = 'none'
    if motion_type == 'camera_motion':
        if abs(mean_dx) > abs(mean_dy) * 2:
            camera_subtype = 'pan_right' if mean_dx > 0 else 'pan_left'
        elif abs(mean_dy) > abs(mean_dx) * 2:
            camera_subtype = 'tilt_down' if mean_dy > 0 else 'tilt_up'
        else:
            # Check for zoom (radial flow from center)
            h, w = flow.shape[:2]
            cy, cx = h // 2, w // 2
            center_mag = float(np.mean(mag[cy-5:cy+5, cx-5:cx+5]))
            edge_mag = float(np.mean(mag[:10, :]) + np.mean(mag[-10:, :])) / 2
            if edge_mag > center_mag * 1.5:
                camera_subtype = 'zoom_in'
            elif center_mag > edge_mag * 1.5:
                camera_subtype = 'zoom_out'

    return {
        'motion_magnitude': round(mean_mag, 2),
        'max_magnitude': round(max_mag, 2),
        'dominant_direction': dominant_direction,
        'motion_type': motion_type,
        'camera_subtype': camera_subtype,
        'flow_uniformity': round(flow_uniformity, 2),
        'mean_dx': round(mean_dx, 2),
        'mean_dy': round(mean_dy, 2),
    }


def compute_motion_context(
    video_path: str,
    sample_points: List[float],
    progress_callback: Optional[Callable] = None
) -> List[Dict]:
    """
    Build per-scene motion context using optical flow between consecutive samples.

    Args:
        video_path: Path to video file
        sample_points: Timestamps to analyze (from adaptive sampling)
        progress_callback: Optional callback

    Returns:
        List of motion dicts, one per sample point (first is empty)
    """
    import cv2

    motion_data = [{}]  # First frame has no previous frame
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    prev_frame = None
    for i, timestamp in enumerate(sample_points):
        frame_idx = int(timestamp * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()

        if not ret:
            if i > 0:
                motion_data.append({})
            continue

        if prev_frame is not None:
            motion = analyze_motion_between_frames(prev_frame, frame)
            motion_data.append(motion)
        prev_frame = frame

    cap.release()

    # Pad if needed
    while len(motion_data) < len(sample_points):
        motion_data.append({})

    return motion_data


# =============================================================================
# NARRATIVE ARC / INTENSITY CURVE DETECTION
# =============================================================================

def detect_narrative_arc(
    scenes: List[Dict],
    audio_advanced: Dict,
    scene_detection: Dict
) -> Dict[str, Any]:
    """
    Detect the narrative arc and intensity curve of the video.

    Combines audio energy, motion, emotion intensity, and cut frequency
    into a single intensity score over time. Finds climax point, narrative
    beats, and classifies the overall arc shape.

    Args:
        scenes: Analyzed scenes with emotion, motion data
        audio_advanced: Librosa analysis (beats, energy segments)
        scene_detection: PySceneDetect results (cuts, pacing)

    Returns:
        Dict with arc_type, climax_timestamp, intensity_curve, narrative_beats
    """
    if not scenes:
        return {
            'arc_type': 'flat',
            'climax_timestamp': 0,
            'intensity_curve': [],
            'narrative_beats': [],
        }

    # Map emotion to intensity weight
    emotion_intensity = {
        'exciting': 0.9, 'dramatic': 0.85, 'happy': 0.6, 'funny': 0.55,
        'mysterious': 0.5, 'romantic': 0.4, 'calm': 0.2, 'sad': 0.3, 'neutral': 0.35,
    }

    # Build cut frequency map (cuts per time window)
    cuts = scene_detection.get('cuts', [])
    video_duration = scenes[-1]['timestamp'] + 3.0 if scenes else 10.0

    # Build intensity curve
    intensity_points = []
    for scene in scenes:
        t = scene.get('timestamp', 0)

        # Emotion component (0-1)
        emo = scene.get('emotion', 'neutral')
        emo_score = emotion_intensity.get(emo, 0.35)

        # Motion component (0-1): from motion_context if available
        motion_mag = scene.get('motion_magnitude', 0)
        motion_score = min(motion_mag / 5.0, 1.0) if motion_mag else 0.3

        # Color intensity: high contrast + vivid saturation = more intense
        sat = scene.get('saturation_level', 'normal')
        sat_score = {'vivid': 0.8, 'normal': 0.5, 'muted': 0.3, 'desaturated': 0.15}.get(sat, 0.5)

        # Cut frequency near this timestamp
        nearby_cuts = sum(1 for c in cuts if abs(c['timestamp'] - t) < 3.0)
        cut_score = min(nearby_cuts / 3.0, 1.0)

        # Audio energy near this timestamp
        high_energy_segs = audio_advanced.get('high_energy_segments', [])
        in_high_energy = any(
            s['start'] <= t <= s['end'] for s in high_energy_segs
        )
        energy_score = 0.8 if in_high_energy else 0.3

        # Weighted combination
        intensity = (
            emo_score * 0.25 +
            motion_score * 0.2 +
            sat_score * 0.1 +
            cut_score * 0.2 +
            energy_score * 0.25
        )

        intensity_points.append({
            'timestamp': round(t, 2),
            'intensity': round(intensity, 3),
            'components': {
                'emotion': round(emo_score, 2),
                'motion': round(motion_score, 2),
                'cuts': round(cut_score, 2),
                'energy': round(energy_score, 2),
            }
        })

    if not intensity_points:
        return {
            'arc_type': 'flat',
            'climax_timestamp': 0,
            'intensity_curve': [],
            'narrative_beats': [],
        }

    # Smooth the intensity curve (rolling average of 3)
    intensities = [p['intensity'] for p in intensity_points]
    smoothed = []
    for i in range(len(intensities)):
        start = max(0, i - 1)
        end = min(len(intensities), i + 2)
        smoothed.append(np.mean(intensities[start:end]))

    for i, val in enumerate(smoothed):
        intensity_points[i]['intensity_smoothed'] = round(val, 3)

    # Find climax (peak of smoothed curve)
    peak_idx = int(np.argmax(smoothed))
    climax_timestamp = intensity_points[peak_idx]['timestamp']
    climax_position = climax_timestamp / video_duration  # 0-1 normalized position

    # Find narrative beats (local maxima above mean + 0.5*std)
    mean_intensity = np.mean(smoothed)
    std_intensity = np.std(smoothed)
    beat_threshold = mean_intensity + 0.3 * std_intensity

    narrative_beats = []
    for i in range(1, len(smoothed) - 1):
        if smoothed[i] > beat_threshold and smoothed[i] >= smoothed[i-1] and smoothed[i] >= smoothed[i+1]:
            narrative_beats.append({
                'timestamp': intensity_points[i]['timestamp'],
                'intensity': round(smoothed[i], 3),
                'type': 'climax' if i == peak_idx else 'beat',
            })

    # Classify arc shape
    n = len(smoothed)
    if n < 3:
        arc_type = 'flat'
    else:
        first_third = np.mean(smoothed[:n//3])
        middle_third = np.mean(smoothed[n//3:2*n//3])
        last_third = np.mean(smoothed[2*n//3:])

        if std_intensity < 0.05:
            arc_type = 'flat'
        elif 0.3 < climax_position < 0.7 and middle_third > first_third and middle_third > last_third:
            arc_type = 'peak_middle'  # Classic dramatic arc
        elif climax_position > 0.65:
            arc_type = 'ascending'  # Builds to climax at end
        elif climax_position < 0.35:
            arc_type = 'descending'  # Starts strong, winds down
        elif first_third > middle_third < last_third:
            arc_type = 'valley'  # Dip in the middle
        elif std_intensity > 0.15:
            arc_type = 'oscillating'  # Multiple peaks and valleys
        else:
            arc_type = 'gradual'  # Slow build or decline

    return {
        'arc_type': arc_type,
        'climax_timestamp': round(climax_timestamp, 2),
        'climax_position': round(climax_position, 2),
        'mean_intensity': round(mean_intensity, 3),
        'intensity_curve': intensity_points,
        'narrative_beats': narrative_beats,
    }


# =============================================================================
# FRAME-ACCURATE SFX IMPACT TIMING
# =============================================================================

def detect_visual_impacts(
    video_path: str,
    scene_timestamps: List[float],
    fps: float = 30.0
) -> List[Dict]:
    """
    Detect precise impact frames around scene timestamps.

    Analyzes 1-second windows at full frame rate around each timestamp to
    find the exact frame where visual impacts occur (sudden brightness
    change, motion deceleration). Returns frame-accurate timestamps.

    Args:
        video_path: Path to video file
        scene_timestamps: Timestamps to check for impacts
        fps: Video frame rate

    Returns:
        List of impact dicts with frame-accurate timestamps
    """
    import cv2

    impacts = []
    cap = cv2.VideoCapture(video_path)
    actual_fps = cap.get(cv2.CAP_PROP_FPS) or fps
    frame_duration = 1.0 / actual_fps

    for target_ts in scene_timestamps:
        # Analyze 1-second window centered on target
        start_frame = max(0, int((target_ts - 0.5) * actual_fps))
        end_frame = int((target_ts + 0.5) * actual_fps)

        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        prev_gray = None
        prev_brightness = None
        frame_deltas = []

        for frame_idx in range(start_frame, end_frame + 1):
            ret, frame = cap.read()
            if not ret:
                break

            gray = cv2.cvtColor(cv2.resize(frame, (160, 90)), cv2.COLOR_BGR2GRAY)
            brightness = float(np.mean(gray))

            if prev_gray is not None:
                # Luminance delta (flash/impact detection)
                lum_delta = abs(brightness - prev_brightness)

                # Motion magnitude delta (sudden stop = impact)
                frame_diff = float(np.mean(np.abs(gray.astype(float) - prev_gray.astype(float))))

                frame_deltas.append({
                    'frame_idx': frame_idx,
                    'timestamp': round(frame_idx / actual_fps, 4),
                    'lum_delta': lum_delta,
                    'motion_delta': frame_diff,
                    'combined': lum_delta * 0.4 + frame_diff * 0.6,
                })

            prev_gray = gray
            prev_brightness = brightness

        if not frame_deltas:
            continue

        # Find the impact frame (maximum combined delta)
        combined_scores = [d['combined'] for d in frame_deltas]
        mean_combined = np.mean(combined_scores)
        std_combined = np.std(combined_scores)
        threshold = mean_combined + 1.5 * std_combined

        # Find peaks above threshold
        for d in frame_deltas:
            if d['combined'] > threshold:
                impacts.append({
                    'timestamp': d['timestamp'],
                    'original_target': round(target_ts, 4),
                    'offset': round(d['timestamp'] - target_ts, 4),
                    'strength': round(d['combined'] / (max(combined_scores) + 1e-6), 2),
                    'type': 'flash' if d['lum_delta'] > d['motion_delta'] else 'motion_impact',
                })
                break  # Take first (strongest) impact per window

    cap.release()
    return impacts


# =============================================================================
# VISUAL RHYTHM ALIGNMENT
# =============================================================================

def analyze_visual_rhythm(
    cuts: List[Dict],
    beats: List[Dict],
    tempo: float
) -> Dict[str, Any]:
    """
    Analyze the relationship between visual editing rhythm and music rhythm.

    Professional editors align (or deliberately misalign) cuts with beats.
    This analysis reveals whether the video's cut pattern matches the music
    and identifies opportunities for improvement.

    Args:
        cuts: List of detected cuts with timestamps
        beats: List of detected beats from librosa
        tempo: Detected BPM

    Returns:
        Dict with visual_tempo_curve, beat_alignment_score, patterns
    """
    if not cuts or not beats:
        return {
            'beat_alignment_score': 0.0,
            'visual_tempo_bpm': 0,
            'pattern': 'no_data',
            'cut_on_beat_ratio': 0.0,
            'recommended_adjustments': [],
        }

    cut_times = sorted([c['timestamp'] for c in cuts if c.get('type') not in ('start', 'end')])
    beat_times = [b['timestamp'] for b in beats]

    if len(cut_times) < 2:
        return {
            'beat_alignment_score': 0.0,
            'visual_tempo_bpm': 0,
            'pattern': 'too_few_cuts',
            'cut_on_beat_ratio': 0.0,
            'recommended_adjustments': [],
        }

    # Shot durations
    shot_durations = [cut_times[i+1] - cut_times[i] for i in range(len(cut_times)-1)]
    mean_shot_duration = float(np.mean(shot_durations))
    std_shot_duration = float(np.std(shot_durations))

    # Visual tempo (cuts per minute)
    total_time = cut_times[-1] - cut_times[0]
    visual_tempo_bpm = (len(cut_times) - 1) / max(total_time / 60.0, 0.01)

    # Beat alignment: for each cut, find distance to nearest beat
    alignment_distances = []
    cuts_on_beat = 0
    beat_snap_threshold = 0.15  # 150ms

    for ct in cut_times:
        if beat_times:
            min_dist = min(abs(ct - bt) for bt in beat_times)
            alignment_distances.append(min_dist)
            if min_dist <= beat_snap_threshold:
                cuts_on_beat += 1

    cut_on_beat_ratio = cuts_on_beat / max(len(cut_times), 1)
    mean_alignment_dist = float(np.mean(alignment_distances)) if alignment_distances else 1.0

    # Beat alignment score (0-1, 1 = perfectly aligned)
    beat_alignment_score = max(0, 1.0 - mean_alignment_dist * 5)

    # Detect pacing pattern
    if std_shot_duration < 0.3:
        pattern = 'steady'
    elif len(shot_durations) >= 4:
        # Check for acceleration (shot durations getting shorter)
        first_half = np.mean(shot_durations[:len(shot_durations)//2])
        second_half = np.mean(shot_durations[len(shot_durations)//2:])
        if second_half < first_half * 0.7:
            pattern = 'accelerating'
        elif first_half < second_half * 0.7:
            pattern = 'decelerating'
        elif std_shot_duration > mean_shot_duration * 0.5:
            pattern = 'irregular'
        else:
            pattern = 'steady'
    else:
        pattern = 'too_short'

    # Recommended adjustments
    adjustments = []
    if cut_on_beat_ratio < 0.3 and tempo > 0:
        adjustments.append({
            'type': 'beat_sync',
            'message': f'Only {cut_on_beat_ratio:.0%} of cuts are on beat. '
                       f'Consider snapping more cuts to the {tempo:.0f} BPM rhythm.',
        })
    if visual_tempo_bpm > tempo * 1.5:
        adjustments.append({
            'type': 'too_fast',
            'message': f'Visual tempo ({visual_tempo_bpm:.0f} CPM) much faster than '
                       f'audio tempo ({tempo:.0f} BPM). Consider longer holds.',
        })
    if visual_tempo_bpm < tempo * 0.3 and tempo > 60:
        adjustments.append({
            'type': 'too_slow',
            'message': f'Visual tempo ({visual_tempo_bpm:.0f} CPM) much slower than '
                       f'audio tempo ({tempo:.0f} BPM). Consider adding more cuts on beat.',
        })

    return {
        'beat_alignment_score': round(beat_alignment_score, 2),
        'visual_tempo_bpm': round(visual_tempo_bpm, 1),
        'mean_shot_duration': round(mean_shot_duration, 2),
        'pattern': pattern,
        'cut_on_beat_ratio': round(cut_on_beat_ratio, 2),
        'recommended_adjustments': adjustments,
    }


# =============================================================================
# SPEAKER-AWARE CAPTION STYLING
# =============================================================================

def enhance_transcription_with_speech_analysis(
    transcription: List[Dict],
    audio_path: str
) -> List[Dict]:
    """
    Enhance transcription segments with speech energy, speaker change detection,
    and speech rate for intelligent caption styling.

    Args:
        transcription: List of transcription segments from Whisper
        audio_path: Path to audio file

    Returns:
        Same transcription list with added fields: energy_level, speaker_id,
        speech_rate, style_hint
    """
    if not transcription:
        return transcription

    try:
        import librosa

        y, sr = librosa.load(audio_path, sr=22050, mono=True)

        # Compute RMS energy per segment
        prev_mfcc_mean = None
        speaker_id = 0
        speaker_change_threshold = 25.0

        for i, seg in enumerate(transcription):
            start = seg.get('start', 0)
            end = seg.get('end', start + 1)

            # Extract audio slice
            start_sample = int(start * sr)
            end_sample = int(end * sr)
            segment_audio = y[start_sample:end_sample]

            if len(segment_audio) < sr * 0.1:
                seg['energy_level'] = 'normal'
                seg['speaker_id'] = speaker_id
                seg['speech_rate'] = 0
                seg['style_hint'] = 'normal'
                continue

            # Energy level
            rms = float(np.sqrt(np.mean(segment_audio**2)))
            # Calibrate against overall audio
            overall_rms = float(np.sqrt(np.mean(y**2)))

            if rms > overall_rms * 2.0:
                energy_level = 'loud'
            elif rms < overall_rms * 0.4:
                energy_level = 'quiet'
            else:
                energy_level = 'normal'

            seg['energy_level'] = energy_level

            # Speech rate (words per second)
            text = seg.get('text', '')
            word_count = len(text.split())
            duration = end - start
            speech_rate = word_count / max(duration, 0.1)
            seg['speech_rate'] = round(speech_rate, 1)

            # Speaker change detection via MFCC comparison
            mfccs = librosa.feature.mfcc(y=segment_audio, sr=sr, n_mfcc=13)
            mfcc_mean = np.mean(mfccs, axis=1)

            if prev_mfcc_mean is not None:
                distance = float(np.linalg.norm(mfcc_mean - prev_mfcc_mean))
                if distance > speaker_change_threshold:
                    speaker_id += 1

            prev_mfcc_mean = mfcc_mean
            seg['speaker_id'] = speaker_id

            # Style hint for caption rendering
            if energy_level == 'loud':
                style_hint = 'emphasis'  # Larger, bolder
            elif energy_level == 'quiet':
                style_hint = 'whisper'  # Smaller, italic
            elif speech_rate > 4.0:
                style_hint = 'fast'  # Might need word-by-word
            elif speech_rate < 1.5:
                style_hint = 'slow'  # Longer hold
            else:
                style_hint = 'normal'

            seg['style_hint'] = style_hint

    except Exception as e:
        print(f"Error enhancing transcription: {e}", file=sys.stderr)
        # Fallback: add defaults
        for seg in transcription:
            seg.setdefault('energy_level', 'normal')
            seg.setdefault('speaker_id', 0)
            seg.setdefault('speech_rate', 0)
            seg.setdefault('style_hint', 'normal')

    return transcription


# =============================================================================
# CREATIVE SFX LAYERING
# =============================================================================

def creative_sfx_layer(
    scene: Dict,
    genre_rules: Optional[Dict] = None,
    prev_scene: Optional[Dict] = None,
    next_scene: Optional[Dict] = None
) -> List[Dict]:
    """
    Generate creative, multi-layered SFX suggestions using compositional
    prompt building from all available scene context.

    Unlike static lookup tables, this function:
    - Composes prompts dynamically from visual description + action + motion +
      color mood + shot type + emotion + temporal context (prev/next scene)
    - Uses the existing infer_sounds_from_description pipeline (LLM → semantic → keyword)
      for the Foley layer instead of reinventing keyword matching
    - Builds ambient textures by combining color mood, brightness, and visual environment
    - Creates accent sounds that respond to motion dynamics, emotion transitions,
      and shot type changes (not static emotion→sound maps)
    - Applies contrast/complement psychology: sometimes the most effective sound
      is the *opposite* of what you see (quiet tension in a visually chaotic scene)

    Professional sound design layers:
    1. Foley layer: realistic incidental sounds derived from visual content
    2. Ambient layer: environmental texture composed from color + light + setting
    3. Accent layer: stylistic emphasis from motion dynamics + emotion arc
    4. Contrast layer: (optional) psychoacoustic contrast for emotional depth

    Args:
        scene: Scene dict with all analysis data
        genre_rules: Optional genre-specific SFX rules
        prev_scene: Previous scene for transition context
        next_scene: Next scene for anticipation context

    Returns:
        List of SFX layer dicts with layer_type, prompt, priority, volume_db, duration
    """
    layers = []
    description = scene.get('description', '').lower()
    action = scene.get('action_description', '').lower()
    sound_desc = scene.get('sound_description', '').lower()
    shot_type = scene.get('shot_type', 'b_roll')
    emotion = scene.get('emotion', 'neutral')
    emotion_conf = scene.get('emotion_confidence', 0.5)
    motion_type = scene.get('motion_type', 'static')
    motion_mag = scene.get('motion_magnitude', 0)
    camera_sub = scene.get('camera_subtype', 'none')
    color_mood = scene.get('color_mood', 'neutral')
    brightness = scene.get('brightness_key', 'mid_key')
    saturation = scene.get('saturation_level', 'normal')
    color_temp = scene.get('color_temperature', 'neutral')
    face_count = scene.get('face_count', 0)
    dominant_dir = scene.get('dominant_direction', 'static')

    # =====================================================================
    # FOLEY LAYER — Use the existing smart inference pipeline
    # =====================================================================
    # Build a rich context string from all visual info, then let
    # infer_sounds_from_description (LLM → semantic → keyword) handle it.
    foley_context_parts = []
    if description and description not in ('', 'a'):
        foley_context_parts.append(description)
    if action and action != description:
        foley_context_parts.append(f'action: {action}')
    if sound_desc and len(set(sound_desc.split())) > 2:
        foley_context_parts.append(f'expected sounds: {sound_desc}')

    foley_context = '. '.join(foley_context_parts)

    if foley_context and len(foley_context) > 10:
        foley_prompt = infer_sounds_from_description(foley_context)

        # Determine priority from shot type (close-up foley matters more)
        foley_priority = 'medium'
        foley_vol = -10
        if shot_type in ('close_up', 'extreme_close_up'):
            foley_priority = 'high'
            foley_vol = -6   # Close-up foley is prominent
        elif shot_type in ('wide_shot', 'b_roll'):
            foley_priority = 'low'
            foley_vol = -14  # Wide shots have less foley detail
        elif face_count > 0:
            foley_priority = 'medium'
            foley_vol = -10

        # Estimate foley duration from motion
        foley_dur = 3.0
        if motion_mag > 2.0:
            foley_dur = 2.0  # Fast motion = shorter, punchier foley
        elif motion_type == 'static':
            foley_dur = 4.0  # Static scene = sustained ambient foley

        if foley_prompt:
            layers.append({
                'layer_type': 'foley',
                'prompt': foley_prompt,
                'priority': foley_priority,
                'volume_db': foley_vol,
                'duration': foley_dur,
                'source': 'inferred_from_visual',
            })

    # =====================================================================
    # AMBIENT LAYER — Composed from color + brightness + setting + emotion
    # =====================================================================
    # Instead of a flat mood→string map, compose the ambient texture
    # from multiple properties to create unique, scene-specific ambience.
    ambient_parts = []

    # Tonal foundation from color mood
    tonal_foundations = {
        'dark_moody': 'deep low-frequency drone',
        'cold_dramatic': 'sparse icy metallic resonance',
        'bright_energetic': 'airy bright shimmer',
        'warm_cheerful': 'warm golden hum',
        'warm_intimate': 'soft analog warmth',
        'cool_professional': 'clean digital hum',
        'muted_vintage': 'gentle tape hiss with warm crackle',
        'neutral': 'neutral room tone',
    }
    foundation = tonal_foundations.get(color_mood, 'subtle ambient presence')
    ambient_parts.append(foundation)

    # Spatial quality from brightness
    if brightness == 'low_key':
        ambient_parts.append('in a dark enclosed space with close reverb')
    elif brightness == 'high_key':
        ambient_parts.append('in an open well-lit space with airy echo')
    else:
        ambient_parts.append('in a moderately lit space')

    # Environmental texture from the visual description
    env_modifiers = []
    outdoor_words = ('sky', 'tree', 'grass', 'field', 'mountain', 'beach',
                     'ocean', 'river', 'forest', 'outdoor', 'sun', 'cloud',
                     'road', 'street', 'building', 'city', 'park')
    indoor_words = ('room', 'office', 'desk', 'wall', 'ceiling', 'floor',
                    'furniture', 'table', 'chair', 'window', 'door', 'indoor',
                    'kitchen', 'bathroom', 'bedroom', 'studio')
    nature_words = ('water', 'bird', 'wind', 'rain', 'snow', 'leaf',
                    'animal', 'insect', 'wave', 'thunder')

    if any(w in description for w in outdoor_words):
        if any(w in description for w in nature_words):
            env_modifiers.append('layered with natural environmental sounds')
        else:
            env_modifiers.append('with urban outdoor texture')
    elif any(w in description for w in indoor_words):
        env_modifiers.append('with subtle interior room presence')

    if env_modifiers:
        ambient_parts.extend(env_modifiers)

    # Emotional texture overlay
    if emotion in ('dramatic', 'mysterious') and emotion_conf > 0.5:
        ambient_parts.append('with building tension undertone')
    elif emotion == 'sad' and emotion_conf > 0.5:
        ambient_parts.append('with melancholic descending overtones')
    elif emotion == 'exciting' and emotion_conf > 0.5:
        ambient_parts.append('with pulsing energetic undercurrent')

    # Saturation affects richness
    if saturation == 'vivid':
        ambient_parts.append('rich and full-bodied')
    elif saturation == 'desaturated':
        ambient_parts.append('thin and sparse')

    ambient_prompt = ', '.join(ambient_parts)

    # Ambient volume: quieter for dialogue-heavy, louder for visual-only
    ambient_vol = -18
    if face_count == 0:
        ambient_vol = -14  # No people → ambient is more prominent
    if motion_type == 'static':
        ambient_vol = -16  # Static scene → ambient fills the space

    layers.append({
        'layer_type': 'ambient',
        'prompt': ambient_prompt,
        'priority': 'low',
        'volume_db': ambient_vol,
        'duration': 5.0,
        'source': 'composed_from_scene',
    })

    # =====================================================================
    # ACCENT LAYER — From motion dynamics + emotion transitions + shot changes
    # =====================================================================
    accent_prompt = None
    accent_priority = 'medium'
    accent_vol = -6
    accent_dur = 1.5

    # --- Motion-based accents (physics-driven, not static maps) ---
    if motion_type == 'camera_motion' and motion_mag > 0.5:
        # Build prompt from actual motion parameters
        speed_word = 'fast' if motion_mag > 3.0 else 'smooth' if motion_mag > 1.0 else 'slow gentle'
        direction = dominant_dir

        if camera_sub in ('pan_left', 'pan_right'):
            accent_prompt = (f'{speed_word} cinematic horizontal whoosh sweeping '
                           f'{direction}, air displacement with frequency shift, '
                           f'{"aggressive" if motion_mag > 3 else "subtle"} doppler effect')
        elif camera_sub in ('tilt_up', 'tilt_down'):
            vertical = 'ascending' if camera_sub == 'tilt_up' else 'descending'
            accent_prompt = (f'{speed_word} {vertical} sweep with pitch '
                           f'{"rising" if vertical == "ascending" else "falling"}, '
                           f'vertical air movement, cinematic tilt')
        elif camera_sub == 'zoom_in':
            accent_prompt = (f'{speed_word} focus-pull riser building from wide to intimate, '
                           f'narrowing spatial compression, increasing proximity intensity')
            accent_priority = 'high'
        elif camera_sub == 'zoom_out':
            accent_prompt = (f'{speed_word} expansive reveal, opening space outward, '
                           f'widening reverb tail, spatial decompression whoosh')
            accent_priority = 'high'
        else:
            accent_prompt = (f'{speed_word} camera movement whoosh, '
                           f'cinematic air displacement, {direction} sweep')

        # Scale duration to motion magnitude
        accent_dur = max(0.5, min(3.0, motion_mag * 0.5))

    elif motion_type == 'subject_motion' and motion_mag > 1.0:
        speed_word = 'rapid' if motion_mag > 4.0 else 'quick' if motion_mag > 2.0 else 'moderate'
        accent_prompt = (f'{speed_word} movement whoosh at {direction} trajectory, '
                        f'object displacement with air turbulence, '
                        f'{"sharp attack" if motion_mag > 3 else "smooth onset"}')
        accent_dur = max(0.5, min(2.0, motion_mag * 0.4))
        if motion_mag > 3.0:
            accent_priority = 'high'

    # --- Emotion transition accents (respond to change, not static state) ---
    if not accent_prompt and prev_scene:
        prev_emotion = prev_scene.get('emotion', 'neutral')
        # Emotion *changed* → sting/transition sound
        if prev_emotion != emotion and emotion != 'neutral' and prev_emotion != 'neutral':
            transition_desc = f'{prev_emotion} to {emotion}'
            if emotion in ('dramatic', 'exciting') and prev_emotion in ('calm', 'neutral', 'sad'):
                accent_prompt = (f'dramatic tension sting, sudden shift from calm to intense, '
                               f'low frequency swell building into sharp impact, '
                               f'cinematic mood transition')
                accent_priority = 'high'
                accent_dur = 1.0
            elif emotion in ('calm', 'sad') and prev_emotion in ('exciting', 'dramatic', 'happy'):
                accent_prompt = (f'soft descending release, tension dissolving into quiet, '
                               f'gentle atmospheric fade with warm reverb tail, '
                               f'emotional decompression')
                accent_dur = 2.0
            elif emotion == 'happy' and prev_emotion in ('sad', 'dramatic', 'neutral'):
                accent_prompt = (f'uplifting reveal sting, bright ascending tone, '
                               f'positive mood shift with sparkling high-frequency detail')
                accent_dur = 1.2

    # --- Shot type change accents (visual grammar transitions) ---
    if not accent_prompt and prev_scene:
        prev_shot = prev_scene.get('shot_type', 'b_roll')
        if prev_shot != shot_type:
            # Wide→Close = intimacy increase → subtle focus sound
            if prev_shot == 'wide_shot' and shot_type in ('close_up', 'extreme_close_up'):
                accent_prompt = ('subtle focus pull sound, narrowing perspective, '
                               'proximity increase with soft high-frequency detail')
                accent_vol = -10
            # Close→Wide = reveal → expansion sound
            elif prev_shot in ('close_up', 'extreme_close_up') and shot_type == 'wide_shot':
                accent_prompt = ('spatial expansion reveal, opening perspective outward, '
                               'widening reverb with airy decompression')
                accent_priority = 'high'
            # Any→B-roll = cutaway → subtle transition
            elif shot_type == 'b_roll' and prev_shot in ('talking_head', 'close_up'):
                accent_prompt = ('gentle scene change transition, soft atmospheric shift, '
                               'subtle environmental crossfade')
                accent_vol = -12

    if accent_prompt:
        layers.append({
            'layer_type': 'accent',
            'prompt': accent_prompt,
            'priority': accent_priority,
            'volume_db': accent_vol,
            'duration': accent_dur,
            'source': 'dynamic_from_context',
        })

    # =====================================================================
    # CONTRAST LAYER — Psychoacoustic contrast for emotional depth
    # =====================================================================
    # Sometimes the most effective sound is the *opposite* of the visual.
    # A quiet moment in a chaotic scene, or a low rumble under a bright scene.
    contrast_prompt = None
    contrast_priority = 'low'
    contrast_vol = -20  # Always subtle

    # High intensity visual + quiet audio contrast = unease/tension
    if emotion in ('exciting', 'dramatic') and motion_mag > 2.0:
        if emotion_conf > 0.6:
            contrast_prompt = ('barely audible low-frequency rumble beneath the surface, '
                             'subsonic tension that you feel more than hear, '
                             'creating unease through contrast with visual chaos')
            contrast_vol = -22

    # Very calm/static visual + subtle dissonance = anticipation
    elif (emotion in ('calm', 'neutral') and motion_type == 'static' and
          next_scene and next_scene.get('emotion') in ('exciting', 'dramatic')):
        contrast_prompt = ('barely perceptible high-frequency tension building, '
                         'subtle anticipatory unease, something about to happen, '
                         'quiet before the storm micro-textures')
        contrast_priority = 'medium'
        contrast_vol = -24

    # Bright cheerful visual + subtle melancholy undertone = emotional depth
    elif (color_mood in ('bright_energetic', 'warm_cheerful') and
          emotion in ('happy',) and emotion_conf > 0.7):
        contrast_prompt = ('barely-there warm nostalgic undertone, '
                         'bittersweet memory quality, subtle analog warmth '
                         'adding emotional depth beneath the brightness')
        contrast_vol = -26

    if contrast_prompt:
        layers.append({
            'layer_type': 'contrast',
            'prompt': contrast_prompt,
            'priority': contrast_priority,
            'volume_db': contrast_vol,
            'duration': 4.0,
            'source': 'psychoacoustic_contrast',
        })

    # =====================================================================
    # GENRE FILTERING — Apply genre rules as final pass
    # =====================================================================
    if genre_rules:
        sfx_rules = genre_rules.get('sfx_rules', {})
        avoid_types = sfx_rules.get('avoid_types', [])
        max_density = sfx_rules.get('max_density', 5)

        # Filter layers that conflict with genre preferences
        if 'ambient' in avoid_types:
            layers = [l for l in layers if l['layer_type'] != 'ambient']
        if 'subtle' in avoid_types or 'dialogue_filler' in avoid_types:
            layers = [l for l in layers if l['layer_type'] not in ('foley', 'contrast')]
        if 'impact' in avoid_types or 'loud_accent' in avoid_types:
            layers = [l for l in layers if not (l['layer_type'] == 'accent' and l['volume_db'] > -8)]

        # Limit layer count based on genre density
        if len(layers) > max_density:
            # Keep highest priority layers
            priority_order = {'high': 0, 'medium': 1, 'low': 2}
            layers.sort(key=lambda l: priority_order.get(l.get('priority', 'low'), 2))
            layers = layers[:max_density]

        # Adjust volumes per genre
        vol_offset = sfx_rules.get('volume_relative_to_bgm', 0)
        for layer in layers:
            layer['volume_db'] = round(layer['volume_db'] + vol_offset, 1)

    return layers


# =============================================================================
# B-ROLL INSERTION POINT DETECTION
# =============================================================================

def detect_broll_insertion_points(
    scenes: List[Dict],
    transcription: List[Dict],
    scene_detection: Dict
) -> List[Dict]:
    """
    Detect opportunities for B-roll cutaway insertion.

    Professional videos use B-roll for ~30% of screen time. This finds moments
    where the main footage is visually static (talking head, same shot held too
    long) and recommends B-roll cutaways.

    Criteria for B-roll insertion:
    1. Long talking head segments (>5s without visual change)
    2. Verbal references to objects/locations (show what's being talked about)
    3. Transitions between topics (visual break for topic shift)
    4. Repeated shot types (viewer fatigue)

    Args:
        scenes: Analyzed scenes with shot_type, description, timestamp
        transcription: Enhanced transcription with words, speaker_id
        scene_detection: PySceneDetect results (cuts, pacing)

    Returns:
        List of B-roll insertion point dicts with timestamp, duration, reason, prompt
    """
    insertions = []
    cuts = scene_detection.get('cuts', [])
    cut_times = sorted([c['timestamp'] for c in cuts])

    if not scenes:
        return insertions

    # --- 1. Long talking head / single-shot segments ---
    for i, scene in enumerate(scenes):
        if scene.get('shot_type') not in ('talking_head', 'close_up', 'medium_shot'):
            continue

        # Find how long this shot type persists
        start_t = scene['timestamp']
        end_t = start_t

        for j in range(i + 1, len(scenes)):
            next_scene = scenes[j]
            # Check if there's a cut between them
            has_cut = any(start_t < ct < next_scene['timestamp'] for ct in cut_times)
            if has_cut:
                break
            if next_scene.get('shot_type') == scene.get('shot_type'):
                end_t = next_scene['timestamp']
            else:
                break

        held_duration = end_t - start_t
        if held_duration > 6.0:
            # Suggest B-roll at the midpoint
            mid = start_t + held_duration * 0.4
            insertions.append({
                'timestamp': round(mid, 2),
                'duration': min(3.0, held_duration * 0.3),
                'reason': f'Talking head held for {held_duration:.1f}s — cutaway adds visual interest',
                'type': 'visual_relief',
                'prompt': f'B-roll related to: {scene.get("description", "the topic being discussed")[:80]}',
                'priority': 'high' if held_duration > 10 else 'medium',
            })

    # --- 2. Topic/speaker changes ---
    prev_speaker = None
    for seg in transcription:
        speaker = seg.get('speaker_id', 0)
        if prev_speaker is not None and speaker != prev_speaker:
            # Speaker change → potential B-roll bridge
            insertions.append({
                'timestamp': round(seg['start'] - 0.5, 2),
                'duration': 1.5,
                'reason': f'Speaker change (speaker {prev_speaker}→{speaker}) — B-roll transition',
                'type': 'speaker_change',
                'prompt': 'Contextual cutaway or reaction shot',
                'priority': 'low',
            })
        prev_speaker = speaker

    # --- 3. Verbal references to visual subjects ---
    visual_keywords = {
        'look at': 'Show the referenced object or scene',
        'as you can see': 'Show the referenced visual',
        'over there': 'Show the referenced location',
        'this is': 'Close-up of the referenced subject',
        'here we have': 'Detail shot of the subject',
        'for example': 'Visual example of the concept',
        'let me show': 'Demonstrate the referenced action',
    }
    for seg in transcription:
        text = seg.get('text', '').lower()
        for phrase, prompt_hint in visual_keywords.items():
            if phrase in text:
                insertions.append({
                    'timestamp': round(seg['start'] + 0.5, 2),
                    'duration': 2.0,
                    'reason': f'Verbal cue "{phrase}" — show what\'s referenced',
                    'type': 'verbal_reference',
                    'prompt': f'{prompt_hint}: {seg.get("text", "")[:60]}',
                    'priority': 'medium',
                })
                break  # One per segment

    # Deduplicate (merge overlapping within 2s)
    insertions.sort(key=lambda x: x['timestamp'])
    deduped = []
    for ins in insertions:
        if deduped and abs(ins['timestamp'] - deduped[-1]['timestamp']) < 2.0:
            # Keep higher priority
            if ins.get('priority', 'low') == 'high' or (
                ins.get('priority') == 'medium' and deduped[-1].get('priority') == 'low'
            ):
                deduped[-1] = ins
        else:
            deduped.append(ins)

    return deduped


# =============================================================================
# LOWER-THIRD / TEXT OVERLAY SUGGESTIONS
# =============================================================================

def suggest_text_overlays(
    scenes: List[Dict],
    transcription: List[Dict],
    narrative_arc: Dict,
    video_duration: float
) -> List[Dict]:
    """
    Suggest text overlays, lower-thirds, and title cards.

    Professional videos use:
    - Speaker name tags (lower-thirds) on first appearance
    - Topic titles at section transitions
    - Key stat/quote callouts
    - Intro/outro title cards

    Args:
        scenes: Analyzed scenes with shot_type, description
        transcription: Enhanced transcription with speaker_id
        narrative_arc: Narrative arc with beats, climax
        video_duration: Total duration

    Returns:
        List of text overlay suggestion dicts
    """
    overlays = []

    # --- 1. Intro Title Card ---
    overlays.append({
        'timestamp': 0.5,
        'duration': 3.0,
        'type': 'title_card',
        'position': 'center',
        'text': '[Video Title]',
        'style': 'large_bold',
        'animation_in': 'fade_up',
        'animation_out': 'fade',
        'reason': 'Opening title card — standard professional practice',
        'priority': 'high',
    })

    # --- 2. Speaker Name Tags ---
    seen_speakers = set()
    for seg in transcription:
        speaker = seg.get('speaker_id', 0)
        if speaker not in seen_speakers:
            seen_speakers.add(speaker)
            # Find the first talking_head or close_up scene near this timestamp
            seg_time = seg.get('start', 0)
            is_on_camera = any(
                abs(s['timestamp'] - seg_time) < 3.0 and
                s.get('shot_type') in ('talking_head', 'close_up', 'medium_shot')
                for s in scenes
            )
            if is_on_camera:
                overlays.append({
                    'timestamp': round(seg_time + 0.5, 2),
                    'duration': 4.0,
                    'type': 'lower_third',
                    'position': 'bottom_left',
                    'text': f'[Speaker {speaker + 1} Name]',
                    'subtitle': '[Title/Role]',
                    'style': 'name_tag',
                    'animation_in': 'slide_right',
                    'animation_out': 'slide_left',
                    'reason': f'First appearance of speaker {speaker + 1}',
                    'priority': 'high',
                })

    # --- 3. Section/Topic Titles ---
    # Use narrative beats as section markers
    beats = narrative_arc.get('narrative_beats', [])
    for beat in beats:
        if beat.get('type') == 'beat':
            overlays.append({
                'timestamp': round(beat['timestamp'], 2),
                'duration': 2.5,
                'type': 'section_title',
                'position': 'bottom_center',
                'text': '[Section Title]',
                'style': 'section_header',
                'animation_in': 'pop',
                'animation_out': 'fade',
                'reason': f'Narrative intensity beat at {beat["timestamp"]:.1f}s — section marker',
                'priority': 'medium',
            })

    # --- 4. Key Moment Callouts ---
    climax_t = narrative_arc.get('climax_timestamp', 0)
    if climax_t > 0:
        overlays.append({
            'timestamp': round(climax_t, 2),
            'duration': 2.0,
            'type': 'callout',
            'position': 'center',
            'text': '[Key Moment / Quote]',
            'style': 'emphasis_large',
            'animation_in': 'slam',
            'animation_out': 'fade',
            'reason': 'Climax of the narrative arc — emphasize with callout',
            'priority': 'medium',
        })

    # --- 5. Outro Card ---
    if video_duration > 5:
        overlays.append({
            'timestamp': round(video_duration - 5.0, 2),
            'duration': 4.0,
            'type': 'end_card',
            'position': 'center',
            'text': '[Subscribe / Follow / CTA]',
            'style': 'large_bold',
            'animation_in': 'fade_up',
            'animation_out': 'fade',
            'reason': 'End card with call-to-action — standard professional practice',
            'priority': 'high',
        })

    overlays.sort(key=lambda x: x['timestamp'])
    return overlays


# =============================================================================
# TENSION/RELEASE PACING INTELLIGENCE
# =============================================================================

def suggest_pacing_adjustments(
    narrative_arc: Dict,
    scenes: List[Dict],
    transitions: List[Dict],
    genre_rules: Optional[Dict] = None
) -> List[Dict]:
    """
    Suggest pacing adjustments based on narrative arc analysis.

    Professional editors control pacing by:
    - Inserting rest moments after high-intensity peaks
    - Accelerating cuts leading to climax
    - Adding speed ramps for emphasis
    - Varying shot duration for rhythm

    Args:
        narrative_arc: Arc analysis with intensity_curve, climax, beats
        scenes: Analyzed scenes
        transitions: Current transition list
        genre_rules: Optional genre pacing rules

    Returns:
        List of pacing adjustment suggestions
    """
    adjustments = []
    intensity_curve = narrative_arc.get('intensity_curve', [])
    climax_t = narrative_arc.get('climax_timestamp', 0)
    arc_type = narrative_arc.get('arc_type', 'flat')

    if not intensity_curve or len(intensity_curve) < 3:
        return adjustments

    # Get genre pacing targets
    pacing_rules = {}
    if genre_rules:
        pacing_rules = genre_rules.get('pacing_rules', {})
    target_shot = pacing_rules.get('target_shot_duration', 3.0)
    allow_ramps = pacing_rules.get('allow_speed_ramps', True)

    # --- 1. Rest Moments After Peaks ---
    # Find intensity peaks (local maxima above 0.7)
    for i in range(1, len(intensity_curve) - 1):
        curr = intensity_curve[i]
        prev_val = intensity_curve[i - 1].get('intensity_smoothed',
                                               intensity_curve[i - 1].get('intensity', 0))
        curr_val = curr.get('intensity_smoothed', curr.get('intensity', 0))
        next_val = intensity_curve[i + 1].get('intensity_smoothed',
                                               intensity_curve[i + 1].get('intensity', 0))

        if curr_val > 0.65 and curr_val >= prev_val and curr_val > next_val:
            # Peak found → suggest rest moment after
            rest_t = intensity_curve[i + 1]['timestamp']
            adjustments.append({
                'timestamp': round(rest_t, 2),
                'type': 'rest_moment',
                'action': 'extend_shot',
                'target_duration': target_shot * 2.0,
                'reason': f'Rest moment after intensity peak ({curr_val:.2f}) — '
                          f'let the viewer breathe before continuing',
                'priority': 'high',
            })

    # --- 2. Accelerate Cuts Before Climax ---
    if climax_t > 2.0:
        # Find transitions in the 5 seconds before climax
        pre_climax = [t for t in transitions
                      if climax_t - 5.0 <= t.get('timestamp', 0) < climax_t
                      and t.get('type') not in ('start', 'end')]
        if len(pre_climax) < 2 and arc_type in ('ascending', 'peak_middle'):
            adjustments.append({
                'timestamp': round(climax_t - 3.0, 2),
                'type': 'cut_acceleration',
                'action': 'add_cuts',
                'suggested_interval': target_shot * 0.5,
                'reason': f'Build tension before climax at {climax_t:.1f}s — '
                          f'increase cut frequency for momentum',
                'priority': 'high',
            })

    # --- 3. Speed Ramp Suggestions ---
    if allow_ramps:
        for i, scene in enumerate(scenes):
            motion_mag = scene.get('motion_magnitude', 0)
            emotion = scene.get('emotion', 'neutral')

            # High motion + exciting emotion = speed ramp opportunity
            if motion_mag > 3.0 and emotion in ('exciting', 'dramatic'):
                adjustments.append({
                    'timestamp': round(scene['timestamp'], 2),
                    'type': 'speed_ramp',
                    'action': 'slow_motion',
                    'speed_factor': 0.5,  # 50% speed
                    'duration': 1.5,
                    'reason': f'High motion ({motion_mag:.1f}) + {emotion} emotion — '
                              f'slow-motion for dramatic emphasis',
                    'priority': 'medium',
                })

            # Static after fast motion = dramatic freeze opportunity
            if i > 0:
                prev_motion = scenes[i - 1].get('motion_magnitude', 0)
                if prev_motion > 3.0 and motion_mag < 0.5:
                    adjustments.append({
                        'timestamp': round(scene['timestamp'], 2),
                        'type': 'speed_ramp',
                        'action': 'freeze_frame',
                        'duration': 0.5,
                        'reason': f'Sudden stop after fast motion — freeze frame for impact',
                        'priority': 'low',
                    })

    # --- 4. Pacing Variation Warning ---
    # Check if all shot durations are too uniform (boring pacing)
    if len(transitions) > 4:
        shot_durs = []
        for i in range(len(transitions) - 1):
            dur = transitions[i + 1].get('timestamp', 0) - transitions[i].get('timestamp', 0)
            if dur > 0:
                shot_durs.append(dur)
        if shot_durs:
            std_dur = float(np.std(shot_durs))
            mean_dur = float(np.mean(shot_durs))
            if std_dur < mean_dur * 0.15 and len(shot_durs) > 3:
                adjustments.append({
                    'timestamp': 0,
                    'type': 'pacing_warning',
                    'action': 'vary_duration',
                    'current_mean': round(mean_dur, 2),
                    'current_std': round(std_dur, 2),
                    'reason': f'Shot durations are too uniform (mean={mean_dur:.1f}s, '
                              f'std={std_dur:.2f}s). Vary cut timing for dynamic pacing.',
                    'priority': 'medium',
                })

    # Deduplicate close timestamps
    adjustments.sort(key=lambda x: x['timestamp'])
    deduped = []
    for adj in adjustments:
        if deduped and abs(adj['timestamp'] - deduped[-1]['timestamp']) < 1.0:
            if adj.get('priority') == 'high':
                deduped[-1] = adj
        else:
            deduped.append(adj)

    return deduped


def generate_audio_description_llm(visual_description: str, duration: float = 3.0) -> Optional[str]:
    """
    Use LLM to intelligently generate audio description from visual description.
    Returns None if no LLM is configured or if generation fails.

    Generates professional-grade prompts optimized for ElevenLabs Sound Effects API:
    - Atmospheric/ambient scenes: Layered environmental descriptions
    - Action/dramatic scenes: Structured cinematic format with sound palette
    - Specific sound sources with physical and acoustic properties
    """
    client_info = get_llm_client()
    if client_info is None:
        return None

    client_type, client = client_info

    prompt = f"""You are an expert sound designer creating prompts for ElevenLabs AI sound effects generation.
Analyze this visual scene and generate a professional, highly detailed sound effect description.

CHOOSE THE APPROPRIATE FORMAT based on the scene type:

FORMAT A - For ATMOSPHERIC/AMBIENT scenes (nature, environments, calm moments):
Use flowing, descriptive prose with layered sound elements.
Example: "Mysterious winter forest at night, distant animal sounds echoing through trees, owls hooting softly, wolves howling far away, branches cracking under heavy snow, eerie atmospheric ambience, cold wind rustling through bare frozen trees, occasional snow falling from branches"

FORMAT B - For ACTION/DRAMATIC scenes (impacts, tension, movement):
Use structured cinematic format with specific sound palette.
Example: "Style: tense action, cinematic. Tempo: driving rhythm. Palette: metallic impacts, whooshing movements, heavy thuds, glass shattering, debris scattering, reverberant echoes. Sequence: initial crash with glass breaking, followed by rolling debris, settling dust, distant alarm."

CRITICAL GUIDELINES:
1. NAME SPECIFIC SOUNDS - not "sounds" but "crackling", "whooshing", "thudding", "hissing"
2. LAYER 3-5 DISTINCT ELEMENTS - foreground action + mid-ground detail + background ambience
3. USE ONOMATOPOEIA - whoosh, thud, crack, hiss, rumble, ping, screech, gurgle
4. INCLUDE ACOUSTIC SPACE - reverberant hall, dry close-up, distant echo, muffled through walls
5. ADD TEXTURE WORDS - gritty, smooth, sharp, hollow, dense, airy, metallic, organic
6. SPECIFY DYNAMICS - sudden/gradual, building/fading, rhythmic/chaotic, loud/soft

Visual scene: "{visual_description}"
Duration hint: {duration} seconds

Generate a professional sound design prompt (40-80 words). Be extremely specific and evocative.
Output ONLY the sound description, nothing else."""

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
    progress_callback: Optional[Callable] = None,
    language: Optional[str] = None
) -> List[Dict]:
    """
    Transcribe audio using OpenAI Whisper with multilingual support.

    Supports 99+ languages including:
    - Indian languages: Hindi, Kannada, Tamil, Telugu, Malayalam, Bengali, etc.
    - European languages: Spanish, French, German, Italian, Portuguese, etc.
    - Asian languages: Japanese, Chinese, Korean, Thai, Vietnamese, etc.

    Args:
        audio_path: Path to audio file
        progress_callback: Optional callback(stage, progress, message)
        language: Optional language code (e.g., 'kn' for Kannada, 'hi' for Hindi).
                  If None, Whisper will auto-detect the language.

    Returns:
        List of transcription segments with detected language
    """
    try:
        model = get_whisper_model()

        if progress_callback:
            progress_callback("transcription", 15, "Running speech recognition...")

        # First, detect the language if not specified
        if language is None:
            if progress_callback:
                progress_callback("transcription", 12, "Detecting language...")

            # Load audio for language detection
            import whisper
            audio = whisper.load_audio(audio_path)
            audio = whisper.pad_or_trim(audio)

            # Make log-Mel spectrogram
            mel = whisper.log_mel_spectrogram(audio).to(model.device)

            # Detect language
            _, probs = model.detect_language(mel)
            detected_lang = max(probs, key=probs.get)
            confidence = probs[detected_lang]

            print(f"Detected language: {detected_lang} (confidence: {confidence:.2%})", file=sys.stderr)

            # Map common language codes to names for logging
            lang_names = {
                'en': 'English', 'hi': 'Hindi', 'kn': 'Kannada', 'ta': 'Tamil',
                'te': 'Telugu', 'ml': 'Malayalam', 'bn': 'Bengali', 'mr': 'Marathi',
                'gu': 'Gujarati', 'pa': 'Punjabi', 'es': 'Spanish', 'fr': 'French',
                'de': 'German', 'ja': 'Japanese', 'zh': 'Chinese', 'ko': 'Korean',
                'ar': 'Arabic', 'ru': 'Russian', 'pt': 'Portuguese', 'it': 'Italian'
            }
            lang_name = lang_names.get(detected_lang, detected_lang.upper())

            if progress_callback:
                progress_callback("transcription", 15, f"Transcribing {lang_name} audio...")

            language = detected_lang

        # Transcribe with detected/specified language and word-level timestamps
        result = model.transcribe(
            audio_path,
            language=language,
            task='transcribe',
            verbose=False,
            word_timestamps=True
        )

        # Get the detected language from result
        detected_language = result.get('language', language)
        print(f"Transcription complete in: {detected_language}", file=sys.stderr)

        transcription = []
        for segment in result['segments']:
            # Extract word-level timestamps if available
            words = []
            if 'words' in segment:
                for w in segment['words']:
                    words.append({
                        'word': w.get('word', '').strip(),
                        'start': round(w.get('start', 0), 3),
                        'end': round(w.get('end', 0), 3),
                        'probability': round(w.get('probability', 0.9), 3),
                    })

            transcription.append({
                'text': segment['text'].strip(),
                'start': segment['start'],
                'end': segment['end'],
                'confidence': segment.get('confidence', 0.9),
                'language': detected_language,
                'words': words,
            })

        # Log first few segments for debugging
        if transcription:
            print(f"First segment: '{transcription[0]['text'][:100]}...'", file=sys.stderr)

        return transcription

    except Exception as e:
        print(f"Error transcribing audio: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
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

    # ElevenLabs-optimized sound mappings with highly descriptive prompts
    # Format: (keywords, detailed_prompt, priority)
    # Prompts include: specific sources, physical properties, temporal patterns, acoustic qualities
    sound_mappings = [
        # People & Actions - Enhanced for ElevenLabs
        (['person walking', 'man walking', 'woman walking', 'people walking'],
         'distinct footsteps walking on hard concrete surface, rhythmic heel-toe pattern with slight echo, steady medium pace, leather shoes on stone floor, subtle clothing rustle', 4),
        (['running', 'jogging', 'sprinting'],
         'rapid athletic footsteps pounding on pavement, heavy rhythmic breathing getting faster, sneakers slapping against hard ground, intense cardio exertion sounds', 4),
        (['talking', 'speaking', 'conversation', 'interview'],
         'indistinct human conversation murmur in background, multiple overlapping voices at moderate volume, occasional laughter, warm indoor acoustic space', 3),
        (['laughing', 'smiling happily', 'happy'],
         'genuine hearty laughter building up, warm happy chuckling that trails off, joyful human vocal expression with breath sounds', 4),
        (['crying', 'sad', 'tears', 'emotional'],
         'soft emotional sobbing with shaky breaths, quiet weeping and sniffling, occasional deep sigh, muffled crying sounds', 4),
        (['eating', 'dining', 'restaurant', 'food', 'meal'],
         'restaurant ambience with metal cutlery clinking on ceramic plates, glasses being set down, quiet background chatter, occasional chair movement on floor', 3),
        (['drinking', 'coffee', 'tea', 'beverage', 'sipping'],
         'hot liquid being poured from pot into ceramic cup, steam rising softly, gentle sipping sounds, cup placed on saucer with soft clink', 3),
        (['clapping', 'applause', 'audience'],
         'thunderous crowd applause erupting suddenly, hundreds of hands clapping enthusiastically, cheering voices mixed in, gradually dying down', 4),
        (['typing', 'working on computer'],
         'rapid mechanical keyboard typing with tactile clicks, continuous keystroke pattern, occasional mouse click, quiet office fan hum in background', 4),

        # Vehicles & Transportation - Cinematic style for ElevenLabs
        (['car driving', 'car moving', 'automobile', 'driving'],
         'Interior car perspective at highway speed, smooth engine humming steadily with subtle vibration, tires rolling continuously on asphalt creating textured road noise, wind whooshing past windows, occasional road bump thump, turn signal clicking rhythmically', 4),
        (['car starting', 'engine start'],
         'Style: mechanical action, sequential. Sequence: car key inserting with metallic clink, turning in ignition with click, starter motor cranking with whirring strain, engine catching and roaring to life with deep rumble, settling into rhythmic idle, exhaust gurgling', 4),
        (['motorcycle', 'motorbike', 'biker'],
         'Style: powerful action, aggressive. Palette: V-twin engine revving with throaty roar, deep exhaust rumble vibrating chest, throttle twisting with mechanical click, rapid acceleration with gear shifts, wind rushing past helmet, engine screaming at high RPM', 4),
        (['bus', 'coach', 'public transport'],
         'Large diesel bus atmosphere, deep engine rumbling at idle, pneumatic door hissing open with compressed air release, hydraulic brakes squealing softly, passengers shuffling and murmuring, coins dropping into fare box, bell dinging for stop request', 3),
        (['train', 'railway', 'subway', 'metro'],
         'Style: rhythmic travel, hypnotic. Palette: steel wheels clicking on joints in steady clackety-clack pattern, rails singing with metallic hum, distant horn echoing through tunnel, carriage swaying creaks, automated station announcement, doors beeping and sliding. Texture: industrial, reverberant', 4),
        (['airplane', 'plane', 'aircraft', 'flying'],
         'Airplane cabin at cruising altitude, powerful jet engines roaring with sustained high-frequency whine, pressurized cabin humming with white noise, occasional turbulence bumps with overhead bin rattles, seatbelt sign ding, muffled wind rushing past fuselage at 500mph', 4),
        (['airport', 'terminal'],
         'Busy international airport terminal ambience, rolling luggage wheels clicking on polished tile floors, distant PA announcements echoing through vast space, crowd murmur in multiple languages, escalators humming mechanically, departure board flapping, security scanners beeping', 3),
        (['bicycle', 'bike', 'cycling', 'cyclist'],
         'Bicycle in motion on quiet street, chain clicking rhythmically as pedals turn, spoked wheels spinning with soft whirring hum, gear mechanism clicking during shift, tires humming on smooth pavement, wind rushing past ears, occasional brake squeak', 3),
        (['boat', 'ship', 'sailing', 'water vessel'],
         'Wooden sailboat at sea, motor puttering with rhythmic chug-chug-chug, water lapping and splashing against hull, ropes creaking under tension, sail canvas flapping in wind, seagulls calling overhead, wooden deck groaning, nautical bell clanging', 4),
        (['helicopter', 'chopper'],
         'Style: powerful aerial, cinematic approach. Sequence: distant helicopter approaching, rotor blades chopping air with rapid whomp-whomp-whomp building in intensity, turbine engine whining, powerful downdraft wind blast, hovering with steady beating rhythm, radio crackle', 4),

        # Nature & Outdoors - Professional atmospheric style for ElevenLabs
        (['beach', 'ocean', 'sea', 'coast', 'shore'],
         'Serene coastal atmosphere at golden hour, rhythmic ocean waves crashing onto sandy shore with white foam hissing and receding, distant seagulls calling overhead, gentle salt breeze whooshing past, shells tumbling in surf, peaceful maritime ambience with deep water rumble underneath', 4),
        (['forest', 'woods', 'trees', 'woodland'],
         'Enchanted forest ambience with dappled sunlight, multiple songbirds singing melodically in canopy, gentle wind rustling through thousands of leaves creating soft organic whooshing, distant woodpecker tapping rhythmically, twigs snapping underfoot, peaceful woodland atmosphere with deep natural reverb', 4),
        (['jungle', 'tropical', 'rainforest'],
         'Dense tropical rainforest alive with layered wildlife, exotic birds screeching and calling, insects buzzing and chirping in continuous waves, distant howler monkeys, water dripping from broad leaves onto forest floor, humid thick air, mysterious jungle depths echoing', 4),
        (['rain', 'raining', 'rainy'],
         'Steady rainfall creating textured white noise, thousands of drops pattering on different surfaces - roof tiles, leaves, puddles, rain streaming down window glass with gentle tapping, water gurgling through gutters and drains, distant traffic splashing, cozy indoor perspective', 4),
        (['heavy rain', 'downpour', 'storm'],
         'Style: dramatic weather, intense. Palette: torrential rain hammering, deep thunder rumbles, howling wind gusts, water rushing through drains, debris rattling. Texture: chaotic layered rainfall on multiple surfaces, ominous low-frequency thunder rolls, wind whistling through gaps, dramatic storm building', 4),
        (['thunder', 'lightning', 'thunderstorm'],
         'Style: cinematic storm, powerful. Sequence: sudden bright crack of lightning strike nearby, massive thunder explosion with sharp attack, long rumbling decay rolling across sky for 8 seconds, rain intensifying, electrical crackle in air, distant secondary thunder responding', 4),
        (['wind', 'windy', 'breezy', 'gusty'],
         'Dynamic wind gusting with varying intensity, powerful whooshing crescendos and decrescendos, loose objects rattling and clanking, trees creaking and groaning under strain, high-pitched whistling through narrow gaps, leaves and debris swirling, atmospheric pressure changes', 4),
        (['river', 'stream', 'creek', 'brook'],
         'Peaceful mountain stream flowing over smooth river rocks, continuous bubbling and gurgling water sounds, small rapids creating white noise splashes, occasional fish jumping with soft plop, birds calling from riverbank, serene natural water ambience with gentle reverb', 4),
        (['waterfall', 'cascade'],
         'Majestic waterfall thundering down with immense power, massive water volume crashing onto rocks below creating deep roar, constant white noise rush filling acoustic space, fine mist spraying, rainbow prisms, overwhelming natural force with subsonic rumble', 4),
        (['birds', 'bird', 'songbird'],
         'Dawn chorus symphony with multiple bird species, cheerful songbirds chirping melodic phrases, robins and thrushes calling back and forth, brief wing flutter sounds, distant crows cawing, peaceful morning atmosphere with natural outdoor reverb', 3),
        (['dog', 'puppy', 'canine'],
         'Energetic dog expressing excitement, sharp repetitive barking woofs with slight echo, heavy panting with tongue out, tail thumping against furniture rhythmically, playful whining and yipping, claws clicking and scrambling on hardwood floor, collar jingling', 4),
        (['cat', 'kitten', 'feline'],
         'Domestic cat vocalizing softly, gentle meow with rising questioning pitch, deep content purring rumble vibrating continuously, soft pawing and kneading sounds, sudden alert chirping trill at bird outside window, quiet grooming licks, tail swishing', 4),
        (['horse', 'horses', 'equine', 'galloping'],
         'Style: powerful action, rhythmic. Palette: thundering hooves on dirt, four-beat gallop pattern, heavy snorting breaths, leather saddle creaking, mane whipping in wind, powerful neighing calls. Texture: ground-shaking impacts, athletic breathing, dust kicking up, approaching then passing', 4),
        (['fire', 'campfire', 'flames', 'bonfire'],
         'Cozy campfire crackling warmly in night air, wood logs popping and snapping with bright sparks, flames whooshing and dancing softly, glowing embers hissing, occasional loud crack as log splits, fire settling and shifting, hypnotic burning ambience', 4),
        (['snow', 'snowy', 'winter', 'cold'],
         'Mysterious winter forest at night, boots crunching through fresh powdery snow with satisfying compression sounds, cold wind whistling through bare frozen branches, distant wolves howling far away, icicles dripping slowly, eerie muffled silence of snow-covered landscape, occasional branch cracking under weight', 4),

        # Urban & Indoor - Enhanced for ElevenLabs
        (['city', 'street', 'urban', 'downtown', 'metropolis'],
         'busy city street with continuous traffic passing, car horns honking in distance, pedestrians walking and talking, construction sounds echoing between buildings', 3),
        (['traffic', 'busy road', 'highway'],
         'constant highway traffic noise with cars whooshing past at speed, truck air brakes hissing, engines accelerating and decelerating, tire noise on road', 3),
        (['office', 'workplace', 'corporate'],
         'quiet modern office ambience with air conditioning humming steadily, distant keyboards typing, phone ringing occasionally, papers shuffling, footsteps on carpet', 2),
        (['kitchen', 'cooking', 'chef', 'preparing food'],
         'sizzling hot oil in pan with food cooking, knife chopping vegetables on wooden board rapidly, pots bubbling, oven timer beeping, exhaust fan whirring', 4),
        (['bathroom', 'shower', 'bathing'],
         'shower water spraying forcefully against tiles and glass door, steam rising, water gurgling down drain, bathroom echo and reverb', 3),
        (['door opening', 'entering', 'entrance'],
         'heavy wooden door creaking open slowly with rusty hinges squeaking, metal handle clicking and turning, hinges groaning, air pressure change whoosh', 4),
        (['door closing', 'shutting door', 'exit'],
         'solid wooden door swinging shut firmly with satisfying thud, metal latch clicking into place securely, brief air compression sound, doorframe settling', 4),
        (['stairs', 'staircase', 'climbing'],
         'footsteps ascending old wooden stairs with each step creaking loudly, handrail sliding under hand, breathing getting heavier, floor boards groaning', 4),
        (['elevator', 'lift'],
         'elevator bell dinging pleasantly on arrival, mechanical metal doors sliding open smoothly, motor humming, floor indicator clicking, doors closing with thump', 4),

        # Technology & Electronics - Enhanced for ElevenLabs
        (['computer', 'laptop', 'desktop'],
         'computer cooling fan whirring at varying speeds, hard drive clicking and seeking, USB device connecting chime, mouse scrolling wheel clicking', 2),
        (['phone ringing', 'incoming call'],
         'smartphone ringtone playing electronic melody, phone vibrating intensely on hard surface buzzing, notification sounds chiming', 4),
        (['notification', 'alert', 'message'],
         'crisp digital notification chime pinging brightly, smartphone vibrating briefly with buzz, message received sound effect, lock screen lighting up', 4),
        (['camera', 'photography', 'taking photo'],
         'DSLR camera shutter clicking sharply with mirror slap, autofocus motor whirring briefly, flash capacitor charging high-pitched whine, lens adjusting', 4),
        (['video game', 'gaming', 'playing game'],
         'video game sound effects with bleeps and bloops, controller buttons clicking rapidly, achievement sound chiming, game music in background', 3),

        # Sports & Activities - Cinematic action style for ElevenLabs
        (['soccer', 'football', 'playing soccer'],
         'Style: stadium sports, energetic. Palette: leather ball thwacking off boot, ball bouncing on grass, players shouting commands, referee whistle piercing sharply, crowd roaring and chanting in waves. Texture: outdoor reverb, massive crowd ambience, athletic impacts, goal celebration explosion', 4),
        (['basketball', 'court', 'playing basketball'],
         'Style: indoor sports, rhythmic intensity. Sequence: basketball pounding hardwood with deep resonant thuds, sneakers squeaking sharply on polished floor, net chain swishing as ball drops through, buzzer blaring, crowd erupting, shoes pivoting with rubber screech', 4),
        (['swimming', 'pool', 'swimmer', 'diving'],
         'Indoor swimming pool atmosphere with echoing acoustics, diving board springing with metallic twang, body splashing into water with massive impact, rhythmic arm strokes cutting through chlorinated water, bubbles gurgling and rising, muffled underwater perspective, surface breaking gasp', 4),
        (['gym', 'workout', 'exercise', 'fitness', 'weights'],
         'Busy gym atmosphere with layered activity, heavy iron weights clanking loudly on metal racks, cable machines clicking and whirring, intense breathing and grunting with exertion, treadmill belt running steadily, motivational music thumping from speakers, water bottle squirting', 3),
        (['golf', 'golfing', 'golf course'],
         'Peaceful golf course ambience, club whooshing through air in powerful swing arc, sharp satisfying crack of ball struck cleanly off tee, ball soaring away with fading whistle, distant polite applause rippling, electric golf cart humming past, birds chirping in manicured trees', 4),
        (['tennis', 'tennis court'],
         'Style: athletic intensity, back-and-forth rhythm. Palette: racket striking ball with powerful hollow thwack, fuzzy ball bouncing on clay with soft thud, players grunting with exertion, shoes sliding on court surface, crowd gasping and applauding, umpire calling score', 4),
        (['boxing', 'fighting', 'punching'],
         'Style: combat sports, visceral impacts. Palette: leather gloves thudding against heavy bag, rapid combination punches with rhythmic impacts, fighter exhaling sharply with each strike, feet shuffling on canvas, speed bag rattling rapidly, crowd roaring for knockout, bell clanging between rounds', 4),

        # Music & Entertainment - Enhanced for ElevenLabs
        (['concert', 'live music', 'performing'],
         'live rock concert with amplified guitars and drums, massive crowd cheering and singing along, bass thumping, stage lights humming, audience clapping rhythmically', 4),
        (['guitar', 'playing guitar', 'acoustic'],
         'acoustic guitar strings being strummed melodically with pick, fingers sliding on fretboard, body resonating warmly, gentle fingerpicking pattern', 4),
        (['piano', 'playing piano', 'pianist'],
         'grand piano keys being pressed with hammers striking strings, sustain pedal engaging, melodic notes resonating in concert hall, page turning', 4),
        (['drums', 'drummer', 'drumming'],
         'full drum kit being played with bass drum thumping, snare cracking sharply, hi-hat sizzling, cymbals crashing, tom fills rolling, sticks clicking', 4),
        (['dancing', 'dance', 'dancer', 'disco'],
         'dance floor with rhythmic footwork sounds, bodies moving to beat, fabric swishing, occasional heel clicks, DJ music thumping in background', 3),
        (['party', 'celebration', 'festive'],
         'lively party atmosphere with upbeat music playing, glasses clinking in toasts, people laughing and chatting excitedly, champagne cork popping, cheering', 3),

        # Work & Industry - Enhanced for ElevenLabs
        (['construction', 'building site', 'construction site'],
         'noisy construction site with jackhammer drilling loudly, power saw cutting through wood, hammers banging on nails, workers shouting, heavy machinery beeping', 4),
        (['factory', 'industrial', 'manufacturing', 'machinery'],
         'industrial factory floor with large machines clanking rhythmically, conveyor belt rolling continuously, metal stamping press thumping, forklifts beeping, ventilation humming', 3),
        (['farm', 'farming', 'agriculture', 'barn', 'rural'],
         'peaceful farm morning with roosters crowing loudly, cows mooing in barn, tractor engine chugging in distance, chickens clucking, barn door creaking', 3),

        # General with better fallbacks - Enhanced for ElevenLabs
        (['crowd', 'people', 'group of', 'audience'],
         'large crowd of people murmuring with overlapping conversations, occasional laughter bursting out, footsteps shuffling, general public gathering ambience', 3),
        (['outdoor', 'outside', 'park', 'nature'],
         'peaceful outdoor park ambience with birds singing in trees, gentle breeze rustling leaves, distant children playing, dog barking far away, fountain trickling', 2),
        (['indoor', 'room', 'inside', 'interior'],
         'quiet indoor room tone with subtle air conditioning humming, clock ticking softly on wall, occasional creak from settling building, muffled outside sounds', 1),
        (['night', 'nighttime', 'dark', 'evening'],
         'quiet nighttime ambience with crickets chirping continuously, distant owl hooting, occasional car passing far away, gentle breeze, peaceful stillness', 2),
        (['morning', 'sunrise', 'dawn'],
         'early morning dawn chorus with birds starting to sing one by one, distant rooster crowing, dew dripping from leaves, first traffic sounds beginning', 2),
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

    # Fallback: create rich contextual ambient sound
    return "Neutral indoor room tone with subtle air circulation humming softly, distant muffled activity, quiet electronic hum from devices, occasional settling creaks from building, calm atmospheric presence with natural room reverb"


def _parse_blip2_response(text: str) -> Dict[str, str]:
    """Parse a BLIP-2 response into visual description and sound hints.

    Splits response into visual vs sound-related sentences using keyword detection.
    Returns dict with 'visual' and 'sound_hint' keys.
    """
    sound_keywords = {'sound', 'hear', 'noise', 'audio', 'music', 'voice',
                      'loud', 'quiet', 'ring', 'buzz', 'crash', 'bang',
                      'whisper', 'shout', 'sing', 'play'}

    # Split into sentences
    sentences = [s.strip() for s in text.replace('. ', '.\n').split('\n') if s.strip()]

    visual_parts = []
    sound_parts = []

    for sentence in sentences:
        words = set(sentence.lower().split())
        if words & sound_keywords:
            sound_parts.append(sentence)
        else:
            visual_parts.append(sentence)

    visual = ' '.join(visual_parts) if visual_parts else text
    sound_hint = ' '.join(sound_parts) if sound_parts else ''

    return {'visual': visual, 'sound_hint': sound_hint}


def analyze_frame_content(frame, model, processor) -> Dict[str, Any]:
    """
    Dynamically analyze frame content using vision-language model,
    shot type classification, and color/lighting mood analysis.

    Supports both BLIP-2 (richer prompted generation) and BLIP v1 (basic captioning).
    BLIP-2 uses a single multi-modal call with a prompt that asks about visuals,
    actions, and sounds simultaneously.

    Also runs:
    - classify_shot_type: face detection + composition → shot grammar
    - analyze_frame_color_mood: HSV/LAB stats → mood from color/lighting

    Args:
        frame: Video frame (BGR format from OpenCV)
        model: Vision-language model
        processor: Model processor

    Returns:
        Dict with description, shot_type, color_mood, and semantic info
    """
    import cv2
    import torch
    from PIL import Image

    # --- Shot type classification (fast, OpenCV only) ---
    shot_type_data = classify_shot_type(frame)

    # --- Color/lighting mood analysis (fast, numpy/OpenCV only) ---
    color_mood_data = analyze_frame_color_mood(frame)

    # Convert BGR to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb_frame)

    is_blip2 = getattr(model, '_is_blip2', False)

    if is_blip2:
        # BLIP-2 path: prompted generation for richer descriptions
        prompt = "Question: What is shown in this image, what action is happening, and what sounds would be present? Answer:"
        inputs = processor(pil_image, text=prompt, return_tensors="pt")
        if torch.cuda.is_available():
            inputs = {k: v.to("cuda") if hasattr(v, 'to') else v for k, v in inputs.items()}

        with torch.no_grad():
            out = model.generate(**inputs, max_new_tokens=120)
            raw_text = processor.decode(out[0], skip_special_tokens=True).strip()

        # Parse the combined response into visual and sound components
        parsed = _parse_blip2_response(raw_text)
        general_description = parsed['visual'] if parsed['visual'] else raw_text

        # Use parsed sound hint to improve sound inference
        sound_input = f"{general_description} {parsed['sound_hint']}" if parsed['sound_hint'] else general_description
        sound_description = infer_sounds_from_description(sound_input)

        action_description = raw_text

        return {
            'description': general_description,
            'action_description': action_description,
            'sound_description': sound_description,
            'confidence': 0.90,
            'shot_type': shot_type_data,
            'color_mood': color_mood_data,
        }
    else:
        # BLIP v1 path: basic captioning
        inputs = processor(pil_image, return_tensors="pt")
        if torch.cuda.is_available():
            inputs = {k: v.to("cuda") for k, v in inputs.items()}

        with torch.no_grad():
            out = model.generate(**inputs, max_length=50)
            general_description = processor.decode(out[0], skip_special_tokens=True)

        sound_description = infer_sounds_from_description(general_description)

        return {
            'description': general_description,
            'action_description': general_description,
            'sound_description': sound_description,
            'confidence': 0.85,
            'shot_type': shot_type_data,
            'color_mood': color_mood_data,
        }


def analyze_scenes(
    video_path: str,
    progress_callback: Optional[Callable] = None,
    use_adaptive_sampling: bool = True,
    analysis_strategy: Optional[Dict] = None,
    audio_advanced: Optional[Dict] = None,
    audio_content: Optional[Dict] = None
) -> List[Dict]:
    """
    Dynamically analyze video using vision-language model.
    Enhanced with adaptive sampling, emotion detection, and pre-classification strategy.

    Args:
        video_path: Path to video file
        progress_callback: Optional callback(stage, progress, message)
        use_adaptive_sampling: Use motion-based adaptive sampling (Quick Win #1)
        analysis_strategy: Optional strategy dict from get_analysis_strategy().
            If skip_blip=True, returns timestamps-only (no model inference).
            Strategy intervals override default sampling parameters.
        audio_advanced: Optional advanced audio analysis for emotion fusion
        audio_content: Optional audio content analysis for emotion fusion

    Returns:
        List of scenes with natural language descriptions and emotion data
    """
    import cv2

    try:
        # Extract strategy parameters
        skip_blip = False
        base_interval = 3.0
        min_interval = 1.5
        max_interval = 5.0
        if analysis_strategy:
            skip_blip = analysis_strategy.get('skip_blip', False)
            base_interval = analysis_strategy.get('frame_sample_interval', 3.0)
            min_interval = analysis_strategy.get('min_sample_interval', 1.5)
            max_interval = analysis_strategy.get('max_sample_interval', 5.0)

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps

        scenes = []

        # Use adaptive sampling based on motion detection
        if use_adaptive_sampling:
            if progress_callback:
                progress_callback("scene_analysis", 35, "Detecting motion for adaptive sampling...")

            sample_points = get_adaptive_sample_points(
                video_path,
                base_interval=base_interval,
                min_interval=min_interval,
                max_interval=max_interval,
                motion_threshold=0.03
            )
            total_samples = len(sample_points)

            if progress_callback:
                progress_callback("scene_analysis", 40,
                                f"Adaptive sampling: {total_samples} frames selected")
        else:
            sample_points = list(np.arange(0, duration, base_interval))
            total_samples = len(sample_points)

        # Compute motion context between consecutive sample frames
        if progress_callback:
            progress_callback("scene_analysis", 38, "Computing optical flow motion context...")
        motion_data = compute_motion_context(video_path, sample_points)

        # If skip_blip, return timestamps-only without model inference
        if skip_blip:
            if progress_callback:
                progress_callback("scene_analysis", 70,
                                f"Skipping BLIP (pre-classification), returning {total_samples} timestamps")
            for idx, timestamp in enumerate(sample_points):
                motion = motion_data[idx] if idx < len(motion_data) else {}
                scenes.append({
                    'timestamp': timestamp,
                    'type': 'dynamic_moment',
                    'description': '',
                    'action_description': '',
                    'sound_description': '',
                    'confidence': 0.3,
                    'emotion': 'neutral',
                    'emotion_confidence': 0.2,
                    'suggested_transitions': ['dissolve', 'fade'],
                    'sfx_mood': 'ambient, neutral',
                    'motion_magnitude': motion.get('motion_magnitude', 0),
                    'motion_type': motion.get('motion_type', 'static'),
                    'dominant_direction': motion.get('dominant_direction', 'static'),
                    'camera_subtype': motion.get('camera_subtype', 'none'),
                })
            cap.release()
            return scenes

        model, processor = get_vlm_model()
        processed_samples = 0

        for idx, timestamp in enumerate(sample_points):
            frame_idx = int(timestamp * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()

            if not ret:
                continue

            # Analyze frame (includes shot type + color mood)
            analysis = analyze_frame_content(frame, model, processor)

            # Compute audio emotion scores for fusion (if audio data available)
            audio_emotion_scores = None
            if audio_advanced and audio_content:
                audio_emotion_scores = compute_audio_emotion_at_time(
                    timestamp, audio_advanced, audio_content
                )

            # Get color-based emotion scores as additional modality
            color_mood_data = analysis.get('color_mood', {})
            color_emotion_scores = _color_mood_to_emotion_scores(color_mood_data)

            # Fuse all three modalities: visual keywords + audio + color
            # If audio scores exist, blend color into audio before passing
            if audio_emotion_scores:
                fused_audio_color = {}
                all_emo = set(list(audio_emotion_scores.keys()) + list(color_emotion_scores.keys()))
                for emo in all_emo:
                    a = audio_emotion_scores.get(emo, 0.0)
                    c = color_emotion_scores.get(emo, 0.0)
                    # Audio 60%, color 40% within the non-visual channel
                    fused_audio_color[emo] = a * 0.6 + c * 0.4
                combined_scores = fused_audio_color
            elif color_emotion_scores:
                combined_scores = color_emotion_scores
            else:
                combined_scores = None

            # Detect emotion with multi-modal fusion
            emotion_data = detect_emotion_from_description(
                analysis['description'],
                audio_emotion_scores=combined_scores
            )

            shot_type_data = analysis.get('shot_type', {})

            # Look up motion context for this sample
            motion = motion_data[idx] if idx < len(motion_data) else {}

            scene = {
                'timestamp': timestamp,
                'type': 'dynamic_moment',
                'description': analysis['description'],
                'action_description': analysis['action_description'],
                'sound_description': analysis['sound_description'],
                'confidence': analysis['confidence'],
                # Shot type classification
                'shot_type': shot_type_data.get('shot_type', 'b_roll'),
                'face_count': shot_type_data.get('face_count', 0),
                'face_area_ratio': shot_type_data.get('face_area_ratio', 0),
                # Color/lighting mood
                'color_mood': color_mood_data.get('color_mood', 'neutral'),
                'color_temperature': color_mood_data.get('color_temperature', 'neutral'),
                'brightness_key': color_mood_data.get('brightness_key', 'mid_key'),
                'saturation_level': color_mood_data.get('saturation_level', 'normal'),
                'dominant_colors': color_mood_data.get('dominant_colors', []),
                # Motion context (optical flow)
                'motion_magnitude': motion.get('motion_magnitude', 0),
                'motion_type': motion.get('motion_type', 'static'),
                'dominant_direction': motion.get('dominant_direction', 'static'),
                'camera_subtype': motion.get('camera_subtype', 'none'),
                # Emotion data (tri-modal fusion: visual keywords + audio + color)
                'emotion': emotion_data['emotion'],
                'emotion_confidence': emotion_data['confidence'],
                'suggested_transitions': emotion_data['suggested_transitions'],
                'sfx_mood': emotion_data['sfx_mood'],
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


def suggest_bgm(
    scenes: List[Dict],
    audio_advanced: Dict,
    scene_detection: Dict,
    emotion_distribution: Dict,
    video_duration: float
) -> List[Dict]:
    """
    Generate BGM (Background Music) suggestions based on video analysis.

    Analyzes:
    - Emotion distribution to suggest mood
    - Tempo to suggest matching music tempo
    - Pacing to suggest energy level
    - Scene content to suggest genre/style

    Returns:
        List of BGM suggestions with mood, genre, tempo, and reasoning
    """
    suggestions = []

    # Get analysis data
    tempo = audio_advanced.get('tempo', 120)
    pacing = scene_detection.get('pacing', 'moderate')
    high_energy_segments = audio_advanced.get('high_energy_segments', [])

    # Determine dominant emotion
    dominant_emotion = 'neutral'
    max_count = 0
    for emotion, count in emotion_distribution.items():
        if count > max_count:
            max_count = count
            dominant_emotion = emotion

    # Calculate energy level (0-1)
    energy_level = len(high_energy_segments) / max(len(scenes), 1)
    energy_level = min(1.0, energy_level * 2)  # Scale up

    # Pacing to energy mapping
    pacing_energy = {
        'very_fast': 0.9,
        'fast': 0.75,
        'moderate': 0.5,
        'slow': 0.3,
        'very_slow': 0.15
    }
    pacing_score = pacing_energy.get(pacing, 0.5)

    # Combined energy
    combined_energy = (energy_level + pacing_score) / 2

    # Emotion to mood mapping
    emotion_moods = {
        'happy': ['uplifting', 'cheerful', 'playful', 'bright'],
        'excited': ['energetic', 'dynamic', 'powerful', 'driving'],
        'calm': ['peaceful', 'relaxing', 'ambient', 'serene'],
        'sad': ['melancholic', 'emotional', 'reflective', 'somber'],
        'dramatic': ['cinematic', 'epic', 'intense', 'suspenseful'],
        'mysterious': ['atmospheric', 'dark ambient', 'ethereal', 'haunting'],
        'romantic': ['emotional', 'warm', 'gentle', 'intimate'],
        'action': ['intense', 'driving', 'powerful', 'aggressive'],
        'neutral': ['ambient', 'corporate', 'modern', 'neutral']
    }

    # Emotion to genre mapping
    emotion_genres = {
        'happy': ['pop', 'indie', 'acoustic', 'electronic'],
        'excited': ['electronic', 'rock', 'hip-hop', 'edm'],
        'calm': ['ambient', 'classical', 'acoustic', 'lo-fi'],
        'sad': ['classical', 'piano', 'acoustic', 'indie'],
        'dramatic': ['orchestral', 'cinematic', 'trailer music', 'epic'],
        'mysterious': ['ambient', 'electronic', 'cinematic', 'dark'],
        'romantic': ['acoustic', 'piano', 'indie', 'jazz'],
        'action': ['electronic', 'rock', 'trailer music', 'dubstep'],
        'neutral': ['corporate', 'ambient', 'electronic', 'acoustic']
    }

    moods = emotion_moods.get(dominant_emotion, emotion_moods['neutral'])
    genres = emotion_genres.get(dominant_emotion, emotion_genres['neutral'])

    # Adjust tempo suggestion based on video tempo and pacing
    if pacing in ['very_fast', 'fast']:
        suggested_tempo_range = (max(100, tempo - 20), min(180, tempo + 30))
    elif pacing in ['slow', 'very_slow']:
        suggested_tempo_range = (60, min(100, tempo + 10))
    else:
        suggested_tempo_range = (80, 140)

    # Primary suggestion based on dominant emotion
    primary_suggestion = {
        'type': 'primary',
        'mood': moods[0],
        'genre': genres[0],
        'tempo_range': suggested_tempo_range,
        'energy_level': 'high' if combined_energy > 0.65 else 'medium' if combined_energy > 0.35 else 'low',
        'duration': video_duration,
        'confidence': 0.85,
        'reason': f"Based on {dominant_emotion} mood detected in {max_count} scenes with {pacing} pacing"
    }
    suggestions.append(primary_suggestion)

    # Alternative suggestion with different mood
    if len(moods) > 1:
        alt_suggestion = {
            'type': 'alternative',
            'mood': moods[1],
            'genre': genres[1] if len(genres) > 1 else genres[0],
            'tempo_range': suggested_tempo_range,
            'energy_level': primary_suggestion['energy_level'],
            'duration': video_duration,
            'confidence': 0.7,
            'reason': f"Alternative {moods[1]} style that complements the {dominant_emotion} content"
        }
        suggestions.append(alt_suggestion)

    # Contrast suggestion for variety
    contrast_moods = {
        'happy': 'calm',
        'excited': 'dramatic',
        'calm': 'ambient',
        'sad': 'hopeful',
        'dramatic': 'mysterious',
        'action': 'cinematic'
    }
    contrast_mood = contrast_moods.get(dominant_emotion, 'ambient')
    contrast_suggestion = {
        'type': 'contrast',
        'mood': contrast_mood,
        'genre': 'cinematic' if combined_energy > 0.5 else 'ambient',
        'tempo_range': (70, 110),
        'energy_level': 'medium',
        'duration': video_duration,
        'confidence': 0.55,
        'reason': f"Contrasting {contrast_mood} style for a different feel"
    }
    suggestions.append(contrast_suggestion)

    # Add specific prompts for AI music generation
    for suggestion in suggestions:
        mood = suggestion['mood']
        genre = suggestion['genre']
        energy = suggestion['energy_level']
        tempo_low, tempo_high = suggestion['tempo_range']

        suggestion['generation_prompt'] = (
            f"{mood.capitalize()} {genre} music, {energy} energy, "
            f"{tempo_low}-{tempo_high} BPM, suitable for video background, "
            f"no vocals, professional production quality"
        )

    return suggestions


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

    # Enhance transcription with speech analysis (energy, speaker, rate)
    if progress_callback:
        progress_callback("speech_analysis", 14, "Enhancing transcription with speech analysis...")
    transcription = enhance_transcription_with_speech_analysis(transcription, audio_path)

    # Quick audio pre-classification (~2s on first 30s of audio)
    if progress_callback:
        progress_callback("pre_classification", 16, "Quick audio pre-classification...")
    pre_classification = quick_classify_audio(audio_path, transcription)
    video_type = pre_classification.get('video_type', 'unknown')
    analysis_strategy = get_analysis_strategy(video_type)
    print(f"Pre-classification: {video_type} "
          f"(speech={pre_classification.get('speech_ratio', 0):.1%}, "
          f"harmonic={pre_classification.get('harmonic_ratio', 0):.1%})", file=sys.stderr)

    # Advanced audio analysis with librosa (beats, tempo, onsets)
    if progress_callback:
        progress_callback("audio_advanced", 18, "Running advanced audio analysis (librosa)...")
    audio_advanced = analyze_audio_advanced(audio_path, progress_callback)

    # Genre-specific editing rules (depends on video_type + tempo)
    genre_rules = get_genre_editing_rules(video_type, audio_advanced.get('tempo', 120))
    print(f"Genre rules: {genre_rules.get('genre', 'unknown')} "
          f"(preferred transitions: {genre_rules.get('transition_rules', {}).get('preferred', [])})",
          file=sys.stderr)

    # Detect existing audio content (for smart SFX suggestions)
    if progress_callback:
        progress_callback("audio_content", 28, "Detecting existing audio content...")
    audio_content = detect_audio_content(audio_path, transcription, progress_callback=progress_callback)

    # Basic audio analysis for peaks and silences
    if progress_callback:
        progress_callback("audio_analysis", 32, "Analyzing audio features...")
    audio_features = analyze_audio_features(audio_path, progress_callback)

    # Analyze scenes with BLIP (adaptive sampling, emotion detection, audio fusion)
    if progress_callback:
        progress_callback("scene_analysis", 40, "Analyzing video scenes with AI vision...")
    scenes = analyze_scenes(
        video_path, progress_callback, use_adaptive_sampling=True,
        analysis_strategy=analysis_strategy,
        audio_advanced=audio_advanced,
        audio_content=audio_content
    )

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
        audio_advanced,
        video_path=video_path,
        genre_rules=genre_rules
    )

    # Narrative arc detection (intensity curve from emotion + motion + cuts + energy)
    if progress_callback:
        progress_callback("narrative_arc", 84, "Detecting narrative arc and intensity curve...")
    narrative_arc = detect_narrative_arc(scenes, audio_advanced, scene_detection)
    print(f"Narrative arc: {narrative_arc.get('arc_type', 'unknown')} "
          f"(climax at {narrative_arc.get('climax_timestamp', 0):.1f}s, "
          f"mean intensity {narrative_arc.get('mean_intensity', 0):.2f})", file=sys.stderr)

    # Visual rhythm alignment analysis (cut-to-beat alignment)
    if progress_callback:
        progress_callback("visual_rhythm", 86, "Analyzing visual rhythm alignment...")
    visual_rhythm = analyze_visual_rhythm(
        scene_detection.get('cuts', []),
        audio_advanced.get('beats', []),
        audio_advanced.get('tempo', 120)
    )
    print(f"Visual rhythm: alignment={visual_rhythm.get('beat_alignment_score', 0):.0%}, "
          f"pattern={visual_rhythm.get('pattern', 'unknown')}, "
          f"visual tempo={visual_rhythm.get('visual_tempo_bpm', 0):.0f} CPM", file=sys.stderr)

    # Frame-accurate visual impact detection
    if progress_callback:
        progress_callback("impact_detection", 88, "Detecting frame-accurate visual impacts...")
    # Use cut timestamps as candidates for impact detection
    cut_timestamps = [c['timestamp'] for c in scene_detection.get('cuts', [])]
    visual_impacts = detect_visual_impacts(
        video_path, cut_timestamps,
        fps=scene_detection.get('fps', 30.0)
    )
    print(f"Visual impacts: {len(visual_impacts)} frame-accurate impacts detected", file=sys.stderr)

    # Generate SFX suggestions (enhanced with beats, onsets, and audio content awareness)
    if progress_callback:
        progress_callback("sfx_suggestions", 90, "Generating audio-aware SFX suggestions...")
    sfx_suggestions = suggest_sfx_pro(scenes, transcription, audio_features, audio_advanced, audio_content)

    # Snap SFX timestamps to frame-accurate visual impacts
    if visual_impacts:
        impact_times = {round(imp['timestamp'], 2): imp for imp in visual_impacts}
        for sfx in sfx_suggestions:
            sfx_t = sfx.get('timestamp', 0)
            # Find nearest impact within 0.5s
            best_impact = None
            best_dist = 0.5
            for imp_t, imp in impact_times.items():
                dist = abs(sfx_t - imp_t)
                if dist < best_dist:
                    best_dist = dist
                    best_impact = imp
            if best_impact:
                sfx['original_timestamp'] = sfx['timestamp']
                sfx['timestamp'] = best_impact['timestamp']
                sfx['impact_snapped'] = True
                sfx['impact_type'] = best_impact.get('type', 'unknown')

    # Generate creative SFX layers for each scene (with temporal context)
    sfx_layers = []
    for i, scene in enumerate(scenes):
        prev_s = scenes[i - 1] if i > 0 else None
        next_s = scenes[i + 1] if i < len(scenes) - 1 else None
        layers = creative_sfx_layer(scene, genre_rules, prev_scene=prev_s, next_scene=next_s)
        if layers:
            sfx_layers.append({
                'timestamp': scene.get('timestamp', 0),
                'layers': layers,
            })

    # Color grading / LUT suggestions
    if progress_callback:
        progress_callback("color_grading", 92, "Generating color grading suggestions...")
    color_grading = suggest_color_grade(scenes)
    print(f"Color grading: LUT={color_grading.get('overall_lut', 'none')}, "
          f"consistency={color_grading.get('consistency_score', 0):.0%}, "
          f"scenes needing correction: {color_grading.get('scenes_needing_correction', 0)}",
          file=sys.stderr)

    # Calculate emotion distribution for BGM suggestions
    emotion_distribution = {}
    for scene in scenes:
        emotion = scene.get('emotion', 'neutral')
        emotion_distribution[emotion] = emotion_distribution.get(emotion, 0) + 1

    # Get video duration from scene detection or estimate from scenes
    video_duration = scene_detection.get('duration', 0)
    if video_duration == 0 and scenes:
        # Estimate from last scene timestamp
        video_duration = max(s.get('timestamp', 0) for s in scenes) + 5.0

    # Generate BGM suggestions
    if progress_callback:
        progress_callback("bgm_suggestions", 95, "Generating BGM suggestions...")
    bgm_suggestions = suggest_bgm(
        scenes=scenes,
        audio_advanced=audio_advanced,
        scene_detection=scene_detection,
        emotion_distribution=emotion_distribution,
        video_duration=video_duration
    )

    # Audio ducking / mix level recommendations
    if progress_callback:
        progress_callback("audio_mix", 98, "Computing audio mix map...")
    audio_mix_map = compute_audio_mix_map(
        transcription, audio_advanced, audio_content,
        sfx_suggestions, video_duration
    )
    print(f"Audio mix: speech coverage={audio_mix_map.get('speech_coverage', 0):.0%}, "
          f"ducking points={len(audio_mix_map.get('ducking_points', []))}, "
          f"mix notes={len(audio_mix_map.get('mix_notes', []))}",
          file=sys.stderr)

    # B-roll insertion point detection
    broll_points = detect_broll_insertion_points(scenes, transcription, scene_detection)
    print(f"B-roll points:        {len(broll_points)} suggested", file=sys.stderr)

    # Text overlay / lower-third suggestions
    text_overlays = suggest_text_overlays(scenes, transcription, narrative_arc, video_duration)
    print(f"Text overlays:        {len(text_overlays)} suggested", file=sys.stderr)

    # Pacing adjustment suggestions
    pacing_adjustments = suggest_pacing_adjustments(
        narrative_arc, scenes, transitions, genre_rules
    )
    print(f"Pacing adjustments:   {len(pacing_adjustments)} suggested", file=sys.stderr)

    if progress_callback:
        progress_callback("completed", 100, "Analysis complete")

    # Get audio content summary
    audio_type = audio_content.get('video_audio_type', 'unknown')
    audio_summary = audio_content.get('analysis_summary', {})

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
    print(f"Audio type:           {audio_type}", file=sys.stderr)
    print(f"Speech:               {audio_summary.get('speech_percentage', 0):.1f}%", file=sys.stderr)
    print(f"Music:                {audio_summary.get('music_percentage', 0):.1f}%", file=sys.stderr)
    print(f"SFX opportunities:    {len(audio_content.get('sfx_opportunities', []))}", file=sys.stderr)
    print(f"Existing SFX-like:    {len(audio_content.get('existing_sfx', []))}", file=sys.stderr)
    print(f"SFX suggestions:      {len(sfx_suggestions)}", file=sys.stderr)
    print(f"BGM suggestions:      {len(bgm_suggestions)}", file=sys.stderr)
    print(f"Transitions:          {len(transitions)}", file=sys.stderr)
    print(f"Emotion distribution: {emotion_distribution}", file=sys.stderr)
    print(f"Narrative arc:        {narrative_arc.get('arc_type', 'unknown')} (climax at {narrative_arc.get('climax_timestamp', 0):.1f}s)", file=sys.stderr)
    print(f"Visual rhythm:        alignment={visual_rhythm.get('beat_alignment_score', 0):.0%}, pattern={visual_rhythm.get('pattern', 'unknown')}", file=sys.stderr)
    print(f"Visual impacts:       {len(visual_impacts)} frame-accurate", file=sys.stderr)
    # Count speaker changes in enhanced transcription
    speaker_ids = set(seg.get('speaker_id', 0) for seg in transcription)
    print(f"Speakers detected:    {len(speaker_ids)}", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)

    return {
        "scenes": scenes,
        "suggestedSFX": sfx_suggestions,
        "suggestedTransitions": transitions,
        "suggestedBGM": bgm_suggestions,
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
        # Audio content detection (for smart SFX)
        "audio_content": {
            "video_audio_type": audio_type,
            "sfx_opportunities": audio_content.get('sfx_opportunities', [])[:20],
            "existing_sfx": audio_content.get('existing_sfx', [])[:15],
            "audio_density": audio_content.get('audio_density', 0),
            "summary": audio_summary
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
        "emotion_distribution": emotion_distribution,
        # Quick audio pre-classification (runs before heavy analysis)
        "pre_classification": pre_classification,
        # Narrative arc detection (intensity curve, climax, arc shape)
        "narrative_arc": narrative_arc,
        # Visual rhythm alignment (cut-to-beat alignment score, pacing pattern)
        "visual_rhythm": visual_rhythm,
        # Frame-accurate visual impact timestamps
        "visual_impacts": visual_impacts,
        # Color grading / LUT suggestions
        "color_grading": color_grading,
        # Audio ducking / mix level recommendations
        "audio_mix_map": {
            'speech_coverage': audio_mix_map.get('speech_coverage', 0),
            'dialogue_regions': audio_mix_map.get('dialogue_regions', []),
            'ducking_points': audio_mix_map.get('ducking_points', []),
            'mix_notes': audio_mix_map.get('mix_notes', []),
            # Omit full volume curves from response to save size; frontend can request if needed
            'bgm_volume_curve_sample': audio_mix_map.get('bgm_volume_curve', [])[:20],
        },
        # Genre-specific editing rules
        "genre_rules": genre_rules,
        # Creative SFX layering (Foley + ambient + accent per scene)
        "sfx_layers": sfx_layers,
        # B-roll insertion point suggestions
        "broll_points": broll_points,
        # Text overlay / lower-third suggestions
        "suggested_text_overlays": text_overlays,
        # Pacing adjustment recommendations
        "pacing_adjustments": pacing_adjustments,
    }


def _merge_transitions(
    cuts: List[Dict],
    scenes: List[Dict],
    audio_advanced: Dict,
    video_path: Optional[str] = None,
    genre_rules: Optional[Dict] = None
) -> List[Dict]:
    """
    Merge PySceneDetect cuts with scene analysis, audio data, and visual comparison.

    Creates intelligent transition suggestions based on:
    - Cut locations from PySceneDetect
    - Scene emotions from BLIP analysis (with color mood fusion)
    - Beat sync points from librosa
    - Scene-pair visual comparison: color delta, shot type change, motion direction
    - Shot scale continuity rules and genre-specific preferences
    """
    import cv2

    transitions = []
    beats = audio_advanced.get('beats', [])
    tempo = audio_advanced.get('tempo', 120)

    # Open video for frame extraction at cut points (for scene-pair comparison)
    cap = None
    fps = 30.0
    if video_path:
        try:
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        except Exception:
            cap = None

    for cut in cuts:
        timestamp = cut['timestamp']

        # Find scenes before and after cut for context
        scene_before = None
        scene_after = None
        for scene in scenes:
            st = scene.get('timestamp', 0)
            if st <= timestamp:
                if scene_before is None or st > scene_before.get('timestamp', 0):
                    scene_before = scene
            if st > timestamp:
                if scene_after is None or st < scene_after.get('timestamp', float('inf')):
                    scene_after = scene

        nearby_scene = scene_before or scene_after

        # Find nearest beat for sync suggestion
        nearest_beat = None
        min_beat_dist = float('inf')
        for beat in beats:
            dist = abs(beat['timestamp'] - timestamp)
            if dist < min_beat_dist:
                min_beat_dist = dist
                nearest_beat = beat

        # Beat-snap: move timestamp to nearest beat if close enough
        beat_snapped = False
        original_timestamp = None
        if nearest_beat and min_beat_dist <= 0.3:
            original_timestamp = timestamp
            timestamp = nearest_beat['timestamp']
            beat_snapped = True

        # --- Scene-pair visual comparison ---
        visual_comparison = None
        if cap is not None:
            try:
                # Extract frame just before cut and just after cut
                before_frame_idx = max(0, int((timestamp - 0.1) * fps))
                after_frame_idx = int((timestamp + 0.1) * fps)

                cap.set(cv2.CAP_PROP_POS_FRAMES, before_frame_idx)
                ret_a, frame_a = cap.read()

                cap.set(cv2.CAP_PROP_POS_FRAMES, after_frame_idx)
                ret_b, frame_b = cap.read()

                if ret_a and ret_b:
                    visual_comparison = compare_scene_pair_visuals(frame_a, frame_b)
            except Exception:
                visual_comparison = None

        # Determine transition type — visual comparison takes priority over emotion-only
        emotion = nearby_scene.get('emotion', 'neutral') if nearby_scene else 'neutral'

        if visual_comparison:
            # Use visual-relationship-based transition (professional approach)
            suggested = visual_comparison['recommended_transition']
            transition_duration = visual_comparison['transition_duration']
            reason_base = visual_comparison['transition_reason']

            # Emotion can override in extreme cases
            if emotion == 'exciting' and suggested in ('fade', 'dissolve'):
                suggested = 'glitch' if tempo > 120 else 'zoom_in'
                reason_base += f', overridden by {emotion} emotion'
            elif emotion == 'dramatic' and cut.get('type') == 'fast_cut' and suggested in ('fade', 'dissolve'):
                suggested = 'flash'
                reason_base += f', overridden by {emotion} emotion'
        else:
            # Fallback to emotion-based transitions (no video access)
            suggested = cut.get('suggested_transition', 'fade')
            transition_duration = 0.3
            reason_base = f'emotion: {emotion}'

            if emotion == 'exciting':
                suggested = 'glitch' if tempo > 120 else 'zoom_in'
            elif emotion == 'calm':
                suggested = 'dissolve'
                transition_duration = 0.6
            elif emotion == 'dramatic':
                suggested = 'flash' if cut.get('type') == 'fast_cut' else 'zoom_in'
            elif emotion == 'happy':
                suggested = 'zoom_in'
            elif emotion == 'sad':
                suggested = 'fade'
                transition_duration = 0.5

        # --- Continuity scoring & genre override ---
        continuity = score_transition_continuity(
            scene_before, scene_after, suggested, genre_rules
        )
        # Apply continuity override if score is low and override is available
        if continuity['suggested_override'] and continuity['continuity_score'] < 0.6:
            suggested = continuity['suggested_override']
            reason_base += f", continuity override: {continuity['override_reason']}"

        # Apply genre-specific max duration
        if genre_rules:
            max_dur = genre_rules.get('transition_rules', {}).get('max_duration')
            if max_dur and transition_duration > max_dur:
                transition_duration = max_dur

        transition_entry = {
            'timestamp': timestamp,
            'type': cut['type'],
            'suggested_transition': suggested,
            'transition_duration': transition_duration,
            'confidence': cut.get('confidence', 0.9),
            'emotion_context': emotion,
            'beat_synced': beat_snapped or (min_beat_dist < 0.2 if nearest_beat else False),
            'beat_snapped': beat_snapped,
            'original_timestamp': original_timestamp,
            'nearest_beat_offset': min_beat_dist if nearest_beat else None,
            'continuity_score': continuity['continuity_score'],
            'continuity_issues': continuity['issues'],
            'reason': f"PySceneDetect {cut['type']}, {reason_base}"
                      + (f", snapped to beat ({original_timestamp:.2f}s -> {timestamp:.2f}s)" if beat_snapped else ""),
        }

        # Add visual comparison data if available
        if visual_comparison:
            transition_entry['visual_comparison'] = {
                'shot_type_a': visual_comparison.get('shot_type_a'),
                'shot_type_b': visual_comparison.get('shot_type_b'),
                'color_mismatch': visual_comparison.get('color_mismatch', False),
                'motion_direction': visual_comparison.get('motion_direction', 'none'),
                'scale_delta': visual_comparison.get('scale_delta', 0),
            }

        transitions.append(transition_entry)

    if cap is not None:
        cap.release()

    # Add start and end markers
    if not transitions or transitions[0]['timestamp'] > 0.5:
        transitions.insert(0, {
            'timestamp': 0,
            'type': 'start',
            'suggested_transition': 'fade_in',
            'transition_duration': 0.5,
            'confidence': 1.0,
            'reason': 'Video start'
        })

    return transitions


def _are_semantically_similar(prompt_a: str, prompt_b: str, threshold: float = 0.7) -> bool:
    """Check if two SFX prompts are semantically similar.

    Uses sentence-transformers if available (already loaded for SFX matching),
    falls back to word-overlap ratio.

    Args:
        prompt_a: First SFX prompt
        prompt_b: Second SFX prompt
        threshold: Similarity threshold (0.0-1.0)

    Returns:
        True if prompts are semantically similar above threshold
    """
    # Try semantic similarity with sentence model
    model = get_sentence_model()
    if model is not None:
        try:
            import torch
            from sentence_transformers import util
            emb_a = model.encode(prompt_a, convert_to_tensor=True)
            emb_b = model.encode(prompt_b, convert_to_tensor=True)
            similarity = float(util.cos_sim(emb_a, emb_b)[0][0])
            return similarity >= threshold
        except Exception:
            pass

    # Fallback: word overlap ratio
    words_a = set(prompt_a.lower().split())
    words_b = set(prompt_b.lower().split())
    if not words_a or not words_b:
        return False
    overlap = len(words_a & words_b)
    union = len(words_a | words_b)
    return (overlap / union) > 0.5 if union > 0 else False


def suggest_sfx_pro(
    scenes: List[Dict],
    transcription: List[Dict],
    audio_features: Dict,
    audio_advanced: Dict,
    audio_content: Dict = None
) -> List[Dict]:
    """
    Audio-aware professional SFX suggestions.

    Uses comprehensive audio content analysis to:
    - Avoid suggesting sounds that already exist in the audio
    - Target optimal moments (silence gaps, low-density sections)
    - Match SFX style to existing audio characteristics
    - Complement rather than clash with existing audio layers

    Handles all video types:
    - Music videos: Minimal SFX, sync to rhythm
    - Vlogs/Tutorials: Speech-aware, use gaps
    - Action/Sports: Dynamic, percussive accents
    - Documentary/Nature: Ambient enhancement
    - Silent/Minimal: More freedom for SFX

    Args:
        scenes: List of analyzed scenes with sound_description
        transcription: List of transcription segments
        audio_features: Dict with peaks, silences
        audio_advanced: Dict with beats, onsets, tempo from librosa
        audio_content: Dict with audio content analysis (existing sounds, opportunities)

    Returns:
        List of SFX suggestions with contextual prompts and audio-awareness
    """
    suggestions = []

    # Initialize audio_content if not provided
    if audio_content is None:
        audio_content = _empty_audio_content()

    # Get audio context
    video_audio_type = audio_content.get('video_audio_type', 'unknown')
    sfx_opportunities = audio_content.get('sfx_opportunities', [])
    existing_sfx = audio_content.get('existing_sfx', [])
    audio_segments = audio_content.get('segments', [])
    audio_density = audio_content.get('audio_density', 0.5)
    summary = audio_content.get('analysis_summary', {})

    # Get librosa data
    tempo = audio_advanced.get('tempo', 120)
    beats = audio_advanced.get('beats', [])
    onsets = audio_advanced.get('onsets', [])
    high_energy = audio_advanced.get('high_energy_segments', [])

    # ===== ADAPT STRATEGY BASED ON VIDEO TYPE =====
    sfx_strategy = _get_sfx_strategy(video_audio_type, audio_density, summary)

    # Helper: Check if timestamp conflicts with existing audio
    def has_audio_conflict(timestamp: float, suggested_sound_type: str = None) -> bool:
        """Check if adding SFX at this time would conflict with existing audio."""
        for seg in audio_segments:
            if seg['start'] <= timestamp <= seg['end']:
                # Dense audio = potential conflict
                if seg.get('fullness') == 'dense':
                    return True
                # High energy speech/music = avoid loud SFX
                if seg['type'] in ['speech', 'music'] and seg['energy'] == 'high':
                    return True
                # Check for existing similar SFX
                if suggested_sound_type and seg['type'] == 'percussive':
                    # Avoid stacking impacts
                    if 'impact' in (suggested_sound_type or '').lower():
                        return True
        return False

    def get_audio_context_at_time(timestamp: float) -> Dict:
        """Get the audio characteristics at a specific timestamp."""
        for seg in audio_segments:
            if seg['start'] <= timestamp <= seg['end']:
                return {
                    'type': seg['type'],
                    'energy': seg['energy'],
                    'brightness': seg.get('brightness', 'neutral'),
                    'fullness': seg.get('fullness', 'moderate'),
                    'has_music': 'music' in seg.get('content_types', []),
                    'has_speech': 'speech' in seg.get('content_types', [])
                }
        return {'type': 'unknown', 'energy': 'medium', 'brightness': 'neutral', 'fullness': 'sparse'}

    def should_skip_timestamp(timestamp: float) -> bool:
        """Determine if we should skip this timestamp based on existing audio."""
        # Check existing SFX-like sounds
        for existing in existing_sfx:
            if abs(existing['timestamp'] - timestamp) < 1.0:
                return True  # Too close to existing SFX
        return False

    # Build a timeline of SFX opportunities (from audio content analysis)
    opportunity_map = {opp['timestamp']: opp for opp in sfx_opportunities}

    # Build audio moments for beat-synced suggestions
    audio_moments = []

    # Add strong downbeats (if rhythm-based SFX is appropriate)
    if sfx_strategy.get('use_rhythm_sync', True):
        downbeats = [b for b in beats if b.get('strength', 0) >= 1.0][:20]
        for beat in downbeats:
            if not has_audio_conflict(beat['timestamp']):
                audio_moments.append({
                    'timestamp': beat['timestamp'],
                    'type': 'downbeat',
                    'strength': beat.get('strength', 1.0)
                })

    # Add strong onsets
    if sfx_strategy.get('use_transient_sync', True):
        strong_onsets = [o for o in onsets if o.get('strength', 0) > 0.6][:15]
        for onset in strong_onsets:
            if not has_audio_conflict(onset['timestamp']):
                audio_moments.append({
                    'timestamp': onset['timestamp'],
                    'type': 'onset',
                    'strength': onset.get('strength', 0.7)
                })

    # Sort and deduplicate
    audio_moments.sort(key=lambda x: x['timestamp'])
    filtered_moments = []
    for moment in audio_moments:
        if not filtered_moments or moment['timestamp'] - filtered_moments[-1]['timestamp'] >= 0.8:
            filtered_moments.append(moment)

    # ===== 1. PRIMARY: SFX Opportunities (audio-aware) =====
    # These are moments identified as good for SFX based on existing audio
    for opp in sfx_opportunities[:sfx_strategy.get('max_opportunity_sfx', 10)]:
        timestamp = opp['timestamp']

        # Skip if too close to existing suggestions
        if any(abs(s['timestamp'] - timestamp) < 1.5 for s in suggestions):
            continue

        # Find visual context from nearest scene
        nearest_scene = None
        min_dist = float('inf')
        for scene in scenes:
            dist = abs(scene.get('timestamp', 0) - timestamp)
            if dist < min_dist:
                min_dist = dist
                nearest_scene = scene

        # Generate appropriate SFX based on opportunity type and visual context
        prompt = None
        reason = opp.get('reason', 'audio_gap')
        quality = opp.get('quality', 'good')
        recommended_style = opp.get('recommended_sfx_style', 'any')

        if nearest_scene and min_dist < 3.0:
            sound_desc = nearest_scene.get('sound_description', '')
            visual_desc = nearest_scene.get('description', '')

            if sound_desc and len(sound_desc) > 10:
                prompt = sound_desc
            else:
                prompt = _extract_sound_from_visual(visual_desc)

            if prompt:
                # Adjust prompt based on audio context
                audio_ctx = get_audio_context_at_time(timestamp)
                prompt = _adjust_prompt_for_audio_context(prompt, audio_ctx, recommended_style)

        if prompt:
            suggestions.append({
                'timestamp': timestamp,
                'prompt': prompt,
                'reason': f'Audio gap: {reason}' + (f', Visual: {visual_desc[:40]}...' if nearest_scene else ''),
                'confidence': 0.85 if quality == 'excellent' else 0.7 if quality == 'good' else 0.55,
                'type': 'audio_opportunity',
                'duration_hint': min(opp.get('duration', 2.0), 3.0),
                'audio_aware': True,
                'opportunity_quality': quality
            })

    # ===== 2. SECONDARY: Scene-based contextual SFX =====
    # Only add if they don't conflict with existing audio
    for scene in scenes:
        timestamp = scene.get('timestamp', 0)

        # Skip based on strategy limits
        if len([s for s in suggestions if s.get('type') == 'scene_contextual']) >= sfx_strategy.get('max_scene_sfx', 8):
            break

        # Check for audio conflicts
        if has_audio_conflict(timestamp) and not sfx_strategy.get('allow_layering', False):
            continue

        # Skip if too close to existing suggestions
        if any(abs(s['timestamp'] - timestamp) < 1.5 for s in suggestions):
            continue

        sound_desc = scene.get('sound_description', '')
        visual_desc = scene.get('description', '')
        confidence = scene.get('confidence', 0.5)

        if not sound_desc or sound_desc == 'ambient atmosphere' or len(sound_desc) < 10:
            sound_desc = _extract_sound_from_visual(visual_desc)

        if sound_desc and len(sound_desc) > 10:
            # Adjust for audio context
            audio_ctx = get_audio_context_at_time(timestamp)
            adjusted_prompt = _adjust_prompt_for_audio_context(sound_desc, audio_ctx, 'contextual')

            # Find nearest audio moment for better timing
            best_moment = None
            min_dist = float('inf')
            for moment in filtered_moments:
                dist = abs(moment['timestamp'] - timestamp)
                if dist < min_dist and dist < 2.0:
                    min_dist = dist
                    best_moment = moment

            final_timestamp = best_moment['timestamp'] if best_moment and min_dist < 1.0 else timestamp

            suggestions.append({
                'timestamp': final_timestamp,
                'prompt': adjusted_prompt,
                'reason': f'Visual: {visual_desc[:50]}...' if len(visual_desc) > 50 else f'Visual: {visual_desc}',
                'confidence': confidence * 0.9,
                'type': 'scene_contextual',
                'visual_context': visual_desc,
                'duration_hint': 2.0,
                'audio_synced': best_moment is not None,
                'audio_aware': True
            })

    # ===== 3. TERTIARY: Beat-synced accent SFX =====
    # Only if strategy allows and audio isn't too dense
    if sfx_strategy.get('add_rhythm_accents', True) and audio_density < 0.8:
        # Style-appropriate impact variations
        impact_variations = _get_impact_variations_for_type(video_audio_type)

        impact_idx = 0
        for moment in filtered_moments[:sfx_strategy.get('max_rhythm_sfx', 6)]:
            timestamp = moment['timestamp']

            # Skip if covered or conflicts
            if any(abs(s['timestamp'] - timestamp) < 1.2 for s in suggestions):
                continue
            if should_skip_timestamp(timestamp):
                continue

            # Find nearest scene for context
            nearest_scene = None
            min_dist = float('inf')
            for scene in scenes:
                dist = abs(scene.get('timestamp', 0) - timestamp)
                if dist < min_dist:
                    min_dist = dist
                    nearest_scene = scene

            # Generate contextual impact
            prompt = _generate_contextual_impact(nearest_scene, impact_variations, impact_idx, video_audio_type)
            impact_idx += 1

            # Adjust for audio context
            audio_ctx = get_audio_context_at_time(timestamp)
            prompt = _adjust_prompt_for_audio_context(prompt, audio_ctx, 'accent')

            suggestions.append({
                'timestamp': timestamp,
                'prompt': prompt,
                'reason': f'Audio {moment["type"]} at {tempo:.0f} BPM',
                'confidence': 0.65,
                'type': f'audio_{moment["type"]}',
                'duration_hint': 0.8 if moment['type'] == 'onset' else 1.2,
                'audio_aware': True
            })

    # ===== 4. SPEECH TRANSITIONS (if appropriate) =====
    if sfx_strategy.get('add_speech_accents', False) and summary.get('speech_percentage', 0) > 30:
        speech_accents = [
            "subtle whoosh transition",
            "soft air movement",
            "gentle atmosphere swell",
            "smooth transition sweep"
        ]

        accent_idx = 0
        for segment in transcription[:8]:
            start_time = segment.get('start', 0)
            text = segment.get('text', '').strip()

            if len(text) < 20:
                continue
            if any(abs(s['timestamp'] - start_time) < 2.0 for s in suggestions):
                continue
            if has_audio_conflict(start_time):
                continue

            suggestions.append({
                'timestamp': max(0, start_time - 0.3),
                'prompt': speech_accents[accent_idx % len(speech_accents)],
                'reason': f'Speech: "{text[:35]}..."' if len(text) > 35 else f'Speech: "{text}"',
                'confidence': 0.5,
                'type': 'speech_accent',
                'duration_hint': 0.5,
                'audio_aware': True
            })
            accent_idx += 1

    # Sort and context-aware deduplicate
    suggestions.sort(key=lambda x: x['timestamp'])

    # Type priority for replacement when too close
    type_priority = {
        'scene_contextual': 3,
        'audio_opportunity': 2,
        'speech_accent': 1,
    }

    unique = []
    for suggestion in suggestions:
        if not unique:
            unique.append(suggestion)
            continue

        # Check against all existing suggestions for conflicts
        conflict_idx = None
        for i, existing in enumerate(unique):
            time_gap = abs(suggestion['timestamp'] - existing['timestamp'])
            same_type = suggestion.get('type', '') == existing.get('type', '')

            # Different-type gap: 1.0s (allow close but distinct sounds)
            # Same-type gap: 3.0s (avoid repetitive sounds)
            min_gap = 3.0 if same_type else 1.0

            if time_gap < min_gap:
                conflict_idx = i
                break

            # Semantic similarity check for same-type pairs within 10s
            if same_type and time_gap < 10.0:
                if _are_semantically_similar(
                    suggestion.get('prompt', ''),
                    existing.get('prompt', ''),
                    threshold=0.7
                ):
                    conflict_idx = i
                    break

        if conflict_idx is None:
            unique.append(suggestion)
        else:
            # Priority-based replacement
            existing = unique[conflict_idx]
            new_priority = type_priority.get(suggestion.get('type', ''), 0)
            old_priority = type_priority.get(existing.get('type', ''), 0)

            if new_priority > old_priority:
                unique[conflict_idx] = suggestion
            elif new_priority == old_priority and suggestion.get('confidence', 0) > existing.get('confidence', 0):
                unique[conflict_idx] = suggestion

    return unique[:sfx_strategy.get('max_total_sfx', 20)]


def _get_sfx_strategy(video_audio_type: str, audio_density: float, summary: Dict) -> Dict:
    """
    Get SFX suggestion strategy based on video/audio type.
    """
    strategies = {
        'music_video': {
            'max_total_sfx': 8,
            'max_opportunity_sfx': 4,
            'max_scene_sfx': 3,
            'max_rhythm_sfx': 4,
            'use_rhythm_sync': True,
            'use_transient_sync': False,  # Music already has transients
            'add_rhythm_accents': True,
            'add_speech_accents': False,
            'allow_layering': False,
            'preferred_style': 'rhythmic'
        },
        'podcast_interview': {
            'max_total_sfx': 12,
            'max_opportunity_sfx': 6,
            'max_scene_sfx': 4,
            'max_rhythm_sfx': 2,
            'use_rhythm_sync': False,
            'use_transient_sync': False,
            'add_rhythm_accents': False,
            'add_speech_accents': True,
            'allow_layering': False,
            'preferred_style': 'subtle'
        },
        'vlog_tutorial': {
            'max_total_sfx': 18,
            'max_opportunity_sfx': 8,
            'max_scene_sfx': 6,
            'max_rhythm_sfx': 4,
            'use_rhythm_sync': True,
            'use_transient_sync': True,
            'add_rhythm_accents': True,
            'add_speech_accents': True,
            'allow_layering': True,
            'preferred_style': 'balanced'
        },
        'action_dynamic': {
            'max_total_sfx': 20,
            'max_opportunity_sfx': 8,
            'max_scene_sfx': 8,
            'max_rhythm_sfx': 6,
            'use_rhythm_sync': True,
            'use_transient_sync': True,
            'add_rhythm_accents': True,
            'add_speech_accents': False,
            'allow_layering': True,
            'preferred_style': 'dynamic'
        },
        'documentary_nature': {
            'max_total_sfx': 15,
            'max_opportunity_sfx': 8,
            'max_scene_sfx': 6,
            'max_rhythm_sfx': 2,
            'use_rhythm_sync': False,
            'use_transient_sync': True,
            'add_rhythm_accents': False,
            'add_speech_accents': True,
            'allow_layering': True,
            'preferred_style': 'ambient'
        },
        'silent_minimal': {
            'max_total_sfx': 25,
            'max_opportunity_sfx': 12,
            'max_scene_sfx': 10,
            'max_rhythm_sfx': 5,
            'use_rhythm_sync': True,
            'use_transient_sync': True,
            'add_rhythm_accents': True,
            'add_speech_accents': False,
            'allow_layering': True,
            'preferred_style': 'any'
        },
        'mixed_content': {
            'max_total_sfx': 18,
            'max_opportunity_sfx': 8,
            'max_scene_sfx': 6,
            'max_rhythm_sfx': 4,
            'use_rhythm_sync': True,
            'use_transient_sync': True,
            'add_rhythm_accents': True,
            'add_speech_accents': True,
            'allow_layering': True,
            'preferred_style': 'balanced'
        }
    }

    strategy = strategies.get(video_audio_type, strategies['mixed_content']).copy()

    # Adjust based on audio density
    if audio_density > 0.85:
        # Very dense audio - reduce SFX
        strategy['max_total_sfx'] = max(5, strategy['max_total_sfx'] // 2)
        strategy['allow_layering'] = False
    elif audio_density < 0.3:
        # Sparse audio - more room for SFX
        strategy['max_total_sfx'] = min(25, strategy['max_total_sfx'] + 5)

    return strategy


def _adjust_prompt_for_audio_context(prompt: str, audio_ctx: Dict, style: str) -> str:
    """
    Adjust SFX prompt based on audio context to complement existing audio.
    """
    energy = audio_ctx.get('energy', 'medium')
    brightness = audio_ctx.get('brightness', 'neutral')
    has_music = audio_ctx.get('has_music', False)
    has_speech = audio_ctx.get('has_speech', False)

    adjustments = []

    # Energy matching
    if energy == 'low':
        adjustments.append('subtle')
        adjustments.append('soft')
    elif energy == 'high':
        adjustments.append('punchy')

    # Brightness matching
    if brightness == 'dark':
        adjustments.append('warm')
        adjustments.append('low-frequency')
    elif brightness == 'bright':
        adjustments.append('crisp')

    # Context-specific adjustments
    if has_speech:
        adjustments.append('non-intrusive')
    if has_music:
        adjustments.append('complementary')

    # Style adjustments
    if style == 'subtle':
        adjustments.append('gentle')
    elif style == 'accent':
        adjustments.append('short')

    # Don't over-modify the prompt
    if not adjustments:
        return prompt

    # Add first adjustment as prefix if it improves the prompt
    adjustment = adjustments[0]
    if adjustment.lower() not in prompt.lower():
        return f"{adjustment} {prompt}"

    return prompt


def _get_impact_variations_for_type(video_audio_type: str) -> List[str]:
    """Get appropriate impact sound variations based on video type."""
    variations = {
        'music_video': [
            "rhythmic percussive hit synced to beat",
            "electronic bass drop accent",
            "synthesized impact with reverb",
            "punchy kick-style hit"
        ],
        'podcast_interview': [
            "subtle transition whoosh",
            "soft page turn sound",
            "gentle notification ping",
            "smooth atmosphere swell"
        ],
        'vlog_tutorial': [
            "bright pop accent sound",
            "cheerful notification ding",
            "clean whoosh transition",
            "upbeat click confirmation"
        ],
        'action_dynamic': [
            "powerful cinematic impact",
            "explosive boom with rumble",
            "aggressive hit with punch",
            "dynamic crash with decay"
        ],
        'documentary_nature': [
            "organic natural thud",
            "earthy impact sound",
            "atmospheric swell accent",
            "gentle wind gust"
        ],
        'silent_minimal': [
            "cinematic impact hit with bass",
            "dramatic boom with reverb",
            "sharp accent with decay",
            "atmospheric tension hit"
        ]
    }
    return variations.get(video_audio_type, variations['vlog_tutorial'])


def _generate_contextual_impact(scene: Dict, variations: List[str], idx: int, video_type: str) -> str:
    """Generate a contextual impact sound based on scene and video type."""
    if not scene:
        return variations[idx % len(variations)]

    visual_desc = scene.get('description', '').lower()
    emotion = scene.get('emotion', 'neutral')

    # Context-based prompts
    context_prompts = {
        ('action', 'fast', 'running', 'sport', 'fight', 'dance'): "powerful dynamic impact with energy",
        ('nature', 'outdoor', 'forest', 'water', 'sky'): "organic natural impact sound",
        ('tech', 'computer', 'digital', 'screen', 'phone'): "digital glitch accent, electronic hit",
        ('food', 'cook', 'kitchen', 'eat'): "kitchen impact, utensil sound",
        ('car', 'vehicle', 'drive', 'road'): "mechanical automotive accent",
        ('city', 'urban', 'street', 'building'): "urban impact, city accent",
    }

    for keywords, prompt in context_prompts.items():
        if any(kw in visual_desc for kw in keywords):
            return prompt

    # Emotion-based fallback
    emotion_prompts = {
        'exciting': "energetic impact hit",
        'dramatic': "cinematic dramatic boom",
        'happy': "bright cheerful accent",
        'sad': "melancholic subtle hit",
        'calm': "gentle soft accent"
    }

    if emotion in emotion_prompts:
        return emotion_prompts[emotion]

    # Default to video-type appropriate variation
    return variations[idx % len(variations)]


def _extract_sound_from_visual(description: str) -> str:
    """
    Extract potential sound effects from a visual description.
    Used as fallback when sound_description is not available.
    """
    desc_lower = description.lower()

    # Action-to-sound mappings
    sound_mappings = [
        (['walking', 'walk', 'steps', 'feet'], "footsteps on hard surface, shoe impacts"),
        (['running', 'run', 'sprint', 'jog'], "rapid running footsteps, athletic movement"),
        (['talking', 'speak', 'conversation'], "background conversation murmur, voices"),
        (['laugh', 'smile', 'happy'], "warm laughter, happy vocal sounds"),
        (['car', 'drive', 'vehicle', 'road'], "car engine hum, vehicle driving sounds"),
        (['water', 'ocean', 'sea', 'beach', 'wave'], "ocean waves, water ambience"),
        (['rain', 'storm', 'weather'], "rain falling, weather ambience"),
        (['wind', 'breeze', 'windy'], "gentle wind blowing, air movement"),
        (['bird', 'nature', 'forest', 'tree'], "birds chirping, nature ambience"),
        (['city', 'street', 'urban', 'traffic'], "city traffic, urban ambience"),
        (['music', 'play', 'instrument', 'guitar', 'piano'], "musical instrument playing"),
        (['type', 'keyboard', 'computer', 'work'], "keyboard typing, computer sounds"),
        (['phone', 'mobile', 'call'], "phone notification, digital device sound"),
        (['door', 'open', 'close', 'enter'], "door opening or closing"),
        (['eat', 'food', 'restaurant', 'cook'], "eating sounds, kitchen ambience"),
        (['crowd', 'people', 'group', 'audience'], "crowd murmur, multiple people talking"),
        (['sport', 'ball', 'game', 'play'], "sports activity, ball bouncing or hitting"),
        (['dance', 'party', 'club'], "upbeat dance ambience, party atmosphere"),
    ]

    for keywords, sound in sound_mappings:
        if any(kw in desc_lower for kw in keywords):
            return sound

    # Generic fallback based on common scene types
    if any(word in desc_lower for word in ['indoor', 'room', 'inside', 'home']):
        return "indoor room ambience, subtle interior atmosphere"
    elif any(word in desc_lower for word in ['outdoor', 'outside', 'sky', 'landscape']):
        return "outdoor environment ambience, open air atmosphere"

    return ""  # Return empty if no match


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
