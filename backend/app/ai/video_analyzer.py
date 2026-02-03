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

        # Transcribe with detected/specified language
        result = model.transcribe(
            audio_path,
            language=language,
            task='transcribe',
            verbose=False
        )

        # Get the detected language from result
        detected_language = result.get('language', language)
        print(f"Transcription complete in: {detected_language}", file=sys.stderr)

        transcription = []
        for segment in result['segments']:
            transcription.append({
                'text': segment['text'].strip(),
                'start': segment['start'],
                'end': segment['end'],
                'confidence': segment.get('confidence', 0.9),
                'language': detected_language
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

    # Advanced audio analysis with librosa (beats, tempo, onsets)
    if progress_callback:
        progress_callback("audio_advanced", 18, "Running advanced audio analysis (librosa)...")
    audio_advanced = analyze_audio_advanced(audio_path, progress_callback)

    # Detect existing audio content (for smart SFX suggestions)
    if progress_callback:
        progress_callback("audio_content", 28, "Detecting existing audio content...")
    audio_content = detect_audio_content(audio_path, transcription, progress_callback=progress_callback)

    # Basic audio analysis for peaks and silences
    if progress_callback:
        progress_callback("audio_analysis", 32, "Analyzing audio features...")
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

    # Generate SFX suggestions (enhanced with beats, onsets, and audio content awareness)
    if progress_callback:
        progress_callback("sfx_suggestions", 85, "Generating audio-aware SFX suggestions...")
    sfx_suggestions = suggest_sfx_pro(scenes, transcription, audio_features, audio_advanced, audio_content)

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

    # Sort and deduplicate
    suggestions.sort(key=lambda x: x['timestamp'])

    unique = []
    for suggestion in suggestions:
        if not unique:
            unique.append(suggestion)
        elif suggestion['timestamp'] - unique[-1]['timestamp'] >= 1.5:
            unique.append(suggestion)
        elif suggestion.get('type') == 'scene_contextual' and unique[-1].get('type') != 'scene_contextual':
            unique[-1] = suggestion
        elif suggestion.get('type') == 'audio_opportunity' and unique[-1].get('type') not in ['scene_contextual', 'audio_opportunity']:
            unique[-1] = suggestion
        elif suggestion.get('confidence', 0) > unique[-1].get('confidence', 0) + 0.1:
            unique[-1] = suggestion

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
