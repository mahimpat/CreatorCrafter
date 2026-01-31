"""
Video Analyzer with Semantic Understanding
Adapted from the original Electron app's Python script.
Analyzes video content using vision models to understand context,
identify actions, and suggest contextual sound effects.

Features intelligent audio description generation:
1. LLM-based (OpenAI/Anthropic) when API keys configured
2. Semantic embedding matching using sentence-transformers
3. Keyword-based fallback with comprehensive mappings
"""
from typing import Callable, Optional, Dict, Any, List
from pathlib import Path
import sys

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
    progress_callback: Optional[Callable] = None
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

                    if combined_score > HARD_CUT_THRESHOLD:
                        # Hard cut detected
                        transitions.append({
                            'timestamp': timestamp,
                            'type': 'cut',
                            'confidence': min(combined_score, 1.0),
                            'suggested_transition': suggest_transition_type(combined_score, 'hard'),
                            'reason': 'Significant visual change detected'
                        })
                        last_transition_time = timestamp

                    elif combined_score > SOFT_CUT_THRESHOLD:
                        # Gradual transition detected
                        transitions.append({
                            'timestamp': timestamp,
                            'type': 'gradual',
                            'confidence': combined_score,
                            'suggested_transition': suggest_transition_type(combined_score, 'soft'),
                            'reason': 'Gradual scene change detected'
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


def suggest_transition_type(score: float, transition_style: str) -> str:
    """
    Suggest appropriate transition type based on the detected change.

    Args:
        score: The transition detection score (0-1)
        transition_style: 'hard' or 'soft'

    Returns:
        Suggested transition type
    """
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
    Perform complete video analysis.

    Args:
        video_path: Path to video file
        audio_path: Path to extracted audio file
        progress_callback: Optional callback(stage, progress_percent, message)

    Returns:
        Analysis results dict with scenes, suggestedSFX, transcription, transitions
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

    # Detect transitions
    if progress_callback:
        progress_callback("transition_detection", 80, "Detecting scene transitions...")
    transitions = detect_transitions(video_path, progress_callback)

    # Generate SFX suggestions
    if progress_callback:
        progress_callback("sfx_suggestions", 90, "Generating SFX suggestions...")
    sfx_suggestions = suggest_sfx(scenes, transcription)

    if progress_callback:
        progress_callback("completed", 100, "Analysis complete")

    return {
        "scenes": scenes,
        "suggestedSFX": sfx_suggestions,
        "suggestedTransitions": transitions,
        "transcription": transcription
    }
