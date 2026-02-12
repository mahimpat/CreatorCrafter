"""
Background tasks for AI processing.
Uses FastAPI BackgroundTasks for simpler deployment.
For production with heavy load, consider migrating to Celery.
"""
import asyncio
import sys
from typing import Optional, Callable
from datetime import datetime

from app.database import SessionLocal
from app.models.project import Project
from app.api.websocket import get_connection_manager
from app.services.file_service import file_service


async def send_progress(
    user_id: int,
    task_type: str,
    task_id: str,
    project_id: int,
    stage: str,
    progress: int,
    message: str = ""
):
    """Helper to send progress updates via WebSocket."""
    manager = get_connection_manager()
    await manager.send_progress(
        user_id=user_id,
        task_type=task_type,
        task_id=task_id,
        project_id=project_id,
        stage=stage,
        progress=progress,
        message=message
    )


def run_video_analysis(
    task_id: str,
    project_id: int,
    user_id: int,
    video_path: str,
    audio_path: str
):
    """
    Run video analysis in background.
    Imports AI modules only when needed to save memory.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        # Send start notification
        loop.run_until_complete(send_progress(
            user_id, "video_analysis", task_id, project_id,
            "starting", 0, "Initializing video analysis..."
        ))

        # Import AI module
        loop.run_until_complete(send_progress(
            user_id, "video_analysis", task_id, project_id,
            "loading_models", 5, "Loading AI models..."
        ))

        from app.ai.video_analyzer import analyze_video

        def progress_callback(stage: str, progress: int, message: str):
            """Callback for analysis progress."""
            # Map progress to 5-95 range (5% for init, 95% for completion)
            mapped_progress = 5 + int(progress * 0.9)
            loop.run_until_complete(send_progress(
                user_id, "video_analysis", task_id, project_id,
                stage, mapped_progress, message
            ))

        # Run analysis
        results = analyze_video(
            video_path=video_path,
            audio_path=audio_path,
            progress_callback=progress_callback
        )

        # Save results to database
        db = SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                project.analysis_results = results
                project.updated_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()

        # Send completion
        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_complete(
            user_id, "video_analysis", task_id, project_id, results
        ))

    except Exception as e:
        # Send error
        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_error(
            user_id, "video_analysis", task_id, project_id, str(e)
        ))

    finally:
        loop.close()


def run_multi_clip_analysis(
    task_id: str,
    project_id: int,
    user_id: int,
    video_clips: list,
    audio_paths: list
):
    """
    Run analysis on multiple video clips and merge results.
    Adjusts timestamps to be relative to the overall timeline.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        # Send start notification
        loop.run_until_complete(send_progress(
            user_id, "video_analysis", task_id, project_id,
            "starting", 0, f"Initializing timeline analysis for {len(video_clips)} clips..."
        ))

        # Import AI module
        loop.run_until_complete(send_progress(
            user_id, "video_analysis", task_id, project_id,
            "loading_models", 5, "Loading AI models..."
        ))

        from app.ai.video_analyzer import analyze_video

        all_scenes = []
        all_sfx = []
        all_transitions = []
        all_transcription = []

        timeline_offset = 0  # Track position on timeline

        for idx, clip_info in enumerate(video_clips):
            clip_path = clip_info['path']
            clip_start_trim = clip_info.get('start_trim', 0)
            clip_end_trim = clip_info.get('end_trim', 0)
            clip_duration = clip_info.get('duration', 0)

            # Effective duration after trimming
            effective_duration = (clip_duration or 0) - clip_start_trim - clip_end_trim

            clip_num = idx + 1
            total_clips = len(video_clips)

            def progress_callback(stage: str, progress: int, message: str):
                """Callback for analysis progress - adjusted for multi-clip."""
                # Calculate overall progress
                clip_progress = progress / 100
                overall_progress = int(((idx + clip_progress) / total_clips) * 90) + 5
                loop.run_until_complete(send_progress(
                    user_id, "video_analysis", task_id, project_id,
                    stage, overall_progress, f"Clip {clip_num}/{total_clips}: {message}"
                ))

            # Get audio path for this clip
            audio_path = audio_paths[idx] if idx < len(audio_paths) else None

            # Check if audio exists and is valid, if not try to extract it
            import os
            import subprocess

            audio_valid = False
            if audio_path:
                # Check if audio file exists and has content
                if os.path.exists(audio_path) and os.path.getsize(audio_path) > 1000:
                    audio_valid = True
                else:
                    # Try to extract audio from clip
                    try:
                        os.makedirs(os.path.dirname(audio_path), exist_ok=True)
                        # Remove existing corrupted file if any
                        if os.path.exists(audio_path):
                            os.remove(audio_path)

                        # Check if clip has an audio stream
                        probe = subprocess.run(
                            ['ffprobe', '-v', 'error', '-select_streams', 'a',
                             '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', clip_path],
                            capture_output=True, text=True, timeout=30
                        )
                        clip_has_audio = bool(probe.stdout.strip())

                        if not clip_has_audio:
                            print(f"Clip {clip_num} has no audio stream, skipping audio extraction", file=sys.stderr)
                            audio_path = None
                        else:
                            result = subprocess.run([
                                'ffmpeg', '-y', '-i', clip_path,
                                '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                                audio_path
                            ], capture_output=True, text=True, timeout=120)

                            if result.returncode != 0:
                                print(f"FFmpeg audio extraction failed for clip {clip_num}: {result.stderr}", file=sys.stderr)
                                audio_path = None
                            elif os.path.exists(audio_path) and os.path.getsize(audio_path) > 1000:
                                audio_valid = True
                                print(f"Successfully extracted audio for clip {clip_num}", file=sys.stderr)
                            else:
                                print(f"Audio extraction created empty file for clip {clip_num}", file=sys.stderr)
                                audio_path = None
                    except subprocess.TimeoutExpired:
                        print(f"Audio extraction timed out for clip {clip_num}", file=sys.stderr)
                        audio_path = None
                    except Exception as e:
                        print(f"Warning: Could not extract audio from clip {clip_num}: {e}", file=sys.stderr)
                        audio_path = None

            # Analyze this clip
            try:
                if audio_valid and audio_path and os.path.exists(audio_path):
                    print(f"Analyzing clip {clip_num} with audio: {audio_path}", file=sys.stderr)
                    results = analyze_video(
                        video_path=clip_path,
                        audio_path=audio_path,
                        progress_callback=progress_callback
                    )
                else:
                    print(f"Analyzing clip {clip_num} without audio", file=sys.stderr)
                    # Analyze without audio
                    from app.ai.video_analyzer import analyze_scenes, detect_transitions, suggest_sfx
                    scenes = analyze_scenes(clip_path, progress_callback)
                    transitions = detect_transitions(clip_path, progress_callback)
                    sfx_suggestions = suggest_sfx(scenes, [])
                    results = {
                        'scenes': scenes,
                        'suggestedSFX': sfx_suggestions,
                        'suggestedTransitions': transitions,
                        'transcription': []
                    }

                # Adjust timestamps and add to combined results
                for scene in results.get('scenes', []):
                    adjusted_scene = scene.copy()
                    # Adjust timestamp: add timeline offset, account for start trim
                    original_time = scene['timestamp']
                    if original_time >= clip_start_trim:
                        adjusted_scene['timestamp'] = timeline_offset + (original_time - clip_start_trim)
                        if adjusted_scene['timestamp'] <= timeline_offset + effective_duration:
                            all_scenes.append(adjusted_scene)

                for sfx in results.get('suggestedSFX', []):
                    adjusted_sfx = sfx.copy()
                    original_time = sfx['timestamp']
                    if original_time >= clip_start_trim:
                        adjusted_sfx['timestamp'] = timeline_offset + (original_time - clip_start_trim)
                        if adjusted_sfx['timestamp'] <= timeline_offset + effective_duration:
                            all_sfx.append(adjusted_sfx)

                for transition in results.get('suggestedTransitions', []):
                    adjusted_trans = transition.copy()
                    original_time = transition['timestamp']
                    if original_time >= clip_start_trim:
                        adjusted_trans['timestamp'] = timeline_offset + (original_time - clip_start_trim)
                        if adjusted_trans['timestamp'] <= timeline_offset + effective_duration:
                            all_transitions.append(adjusted_trans)

                for trans_seg in results.get('transcription', []):
                    adjusted_seg = trans_seg.copy()
                    if trans_seg['start'] >= clip_start_trim:
                        adjusted_seg['start'] = timeline_offset + (trans_seg['start'] - clip_start_trim)
                        adjusted_seg['end'] = timeline_offset + (trans_seg['end'] - clip_start_trim)
                        if adjusted_seg['start'] <= timeline_offset + effective_duration:
                            all_transcription.append(adjusted_seg)

            except Exception as e:
                print(f"Error analyzing clip {clip_num}: {e}")
                import traceback
                traceback.print_exc()

            # Update timeline offset for next clip
            timeline_offset += effective_duration

        # Combine and deduplicate results
        combined_results = {
            "scenes": all_scenes,
            "suggestedSFX": all_sfx,
            "suggestedTransitions": all_transitions,
            "transcription": all_transcription
        }

        # Save results to database
        db = SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                project.analysis_results = combined_results
                project.updated_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()

        # Send completion
        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_complete(
            user_id, "video_analysis", task_id, project_id, combined_results
        ))

    except Exception as e:
        # Send error
        import traceback
        traceback.print_exc()
        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_error(
            user_id, "video_analysis", task_id, project_id, str(e)
        ))

    finally:
        loop.close()


def run_auto_generate(
    task_id: str,
    project_id: int,
    user_id: int,
    analysis_results: dict,
    clip_ids: list,
    include_subtitles: bool = True,
    include_sfx: bool = True,
    include_transitions: bool = True,
    sfx_confidence_threshold: float = 0.5,
    transition_confidence_threshold: float = 0.5,
    max_sfx_count: int = 10,
    template_id: str = None,
    template_settings: dict = None,
):
    """
    Automatically generate all secondary elements from analysis results.
    Uses ALL available analysis data for intelligent content creation:

    - Genre-aware editing rules for transitions, SFX, and captions
    - Pre-computed suggestedTransitions with continuity scoring
    - Layered SFX from sfx_layers with visual_impacts snapping
    - Speaker-differentiated subtitles with word-level timing
    - Audio ducking from audio_mix_map for volume control
    - Auto text overlays from suggested_text_overlays
    - Narrative arc and pacing intelligence
    - Color grading data passed through for rendering pipeline
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    from app.models.subtitle import Subtitle
    from app.models.sfx_track import SFXTrack
    from app.models.transition import Transition, TransitionType
    from app.models.text_overlay import TextOverlay

    # Default template settings
    settings = template_settings or {}
    intro_effect = settings.get('intro_effect', 'none')
    intro_duration = settings.get('intro_duration', 1.0)
    outro_effect = settings.get('outro_effect', 'none')
    outro_duration = settings.get('outro_duration', 1.0)
    template_transition_types = settings.get('transition_types', [])
    pacing_style = settings.get('pacing_style', 'moderate')
    energy_level = settings.get('energy_level', 0.5)
    caption_style = settings.get('caption_style', 'standard')

    # ================================================================
    # Extract ALL analysis data (22 fields)
    # ================================================================
    scenes = analysis_results.get('scenes', [])
    transcription = analysis_results.get('transcription', [])
    suggested_sfx = analysis_results.get('suggestedSFX', [])
    suggested_transitions = analysis_results.get('suggestedTransitions', [])
    genre_rules = analysis_results.get('genre_rules', {})
    sfx_layers = analysis_results.get('sfx_layers', [])
    visual_impacts = analysis_results.get('visual_impacts', [])
    audio_mix_map = analysis_results.get('audio_mix_map', {})
    color_grading = analysis_results.get('color_grading', {})
    narrative_arc = analysis_results.get('narrative_arc', {})
    pacing_adjustments = analysis_results.get('pacing_adjustments', [])
    suggested_text_overlays = analysis_results.get('suggested_text_overlays', [])
    broll_points = analysis_results.get('broll_points', [])
    pre_classification = analysis_results.get('pre_classification', {})
    audio_content = analysis_results.get('audio_content', {})
    emotion_distribution = analysis_results.get('emotion_distribution', {})
    visual_rhythm = analysis_results.get('visual_rhythm', {})

    # Genre-specific rules (override template pacing if genre provides better guidance)
    caption_rules = genre_rules.get('caption_rules', {})
    transition_rules = genre_rules.get('transition_rules', {})
    sfx_rules = genre_rules.get('sfx_rules', {})
    pacing_rules = genre_rules.get('pacing_rules', {})

    # Audio ducking data
    ducking_points = audio_mix_map.get('ducking_points', [])

    result = {
        "subtitles_created": 0,
        "sfx_generated": 0,
        "transitions_created": 0,
        "text_overlays_created": 0,
        "errors": [],
        # Template-enhanced results
        "template_applied": template_id,
        "intro_effect": intro_effect if intro_effect != 'none' else None,
        "intro_duration": intro_duration if intro_effect != 'none' else None,
        "outro_effect": outro_effect if outro_effect != 'none' else None,
        "outro_duration": outro_duration if outro_effect != 'none' else None,
        # Enriched metadata for rendering pipeline
        "color_grading": color_grading,
        "audio_mix_map": audio_mix_map,
        "narrative_arc": narrative_arc,
        "pacing_adjustments": pacing_adjustments,
        "broll_points": broll_points,
        "genre_rules": genre_rules,
    }

    # ================================================================
    # HELPER: Speaker color for differentiation
    # ================================================================
    SPEAKER_COLORS = [
        "#FFFFFF", "#00BFFF", "#FFD700", "#FF6B6B",
        "#7CFC00", "#FF69B4", "#00CED1", "#FFA500",
    ]

    def get_speaker_style(speaker_id, energy_lvl, base_style):
        """Apply speaker-specific color and energy-based emphasis."""
        style = dict(base_style)
        if speaker_id is not None:
            color_idx = speaker_id % len(SPEAKER_COLORS)
            style['color'] = SPEAKER_COLORS[color_idx]
            style['speakerId'] = speaker_id
        if energy_lvl:
            if energy_lvl == 'high':
                style['fontWeight'] = 'bold'
                base_size = style.get('fontSize', 24)
                if isinstance(base_size, str):
                    base_size = int(base_size.replace('px', ''))
                style['fontSize'] = base_size + 4
            elif energy_lvl == 'low':
                style['fontStyle'] = 'italic'
                style['opacity'] = 0.85
        return style

    # ================================================================
    # HELPER: Get SFX volume from audio_mix_map ducking data
    # ================================================================
    def get_sfx_volume_at(timestamp):
        """Get recommended SFX volume from audio_mix_map ducking data."""
        if not ducking_points:
            return 0.6
        closest = None
        closest_dist = float('inf')
        for dp in ducking_points:
            dist = abs(dp.get('timestamp', 0) - timestamp)
            if dist < closest_dist:
                closest_dist = dist
                closest = dp
        if closest:
            if closest.get('is_speech', False):
                return 0.3  # Duck SFX during speech
            return closest.get('sfx_volume', 0.6)
        return 0.6

    # ================================================================
    # HELPER: Snap timestamp to nearest visual impact
    # ================================================================
    def snap_to_visual_impact(timestamp, max_snap=0.5):
        """Snap an SFX timestamp to the nearest visual impact for tighter sync."""
        if not visual_impacts:
            return timestamp
        closest_dist = float('inf')
        closest_time = timestamp
        for vi in visual_impacts:
            vi_time = vi.get('timestamp', 0)
            dist = abs(vi_time - timestamp)
            if dist < closest_dist and dist <= max_snap:
                closest_dist = dist
                closest_time = vi_time
        return closest_time

    # ================================================================
    # HELPER: Calculate SFX duration with genre and mix awareness
    # ================================================================
    def calculate_sfx_duration(suggestion, transcription_data):
        """Calculate SFX duration using genre rules, audio mix map, and speech avoidance."""
        timestamp = suggestion.get('timestamp', 0)

        # Genre-based duration bounds
        genre_max = sfx_rules.get('max_duration', 5.0)
        genre_min = sfx_rules.get('min_duration', 0.5)

        # Start with pacing-based default
        if pacing_style in ['fast', 'very_fast'] or pacing_rules.get('target_pace') == 'fast':
            base_duration = 2.0
        elif pacing_style == 'slow' or pacing_rules.get('target_pace') == 'slow':
            base_duration = 4.0
        else:
            base_duration = 3.0

        # Avoid speech overlap
        for seg in transcription_data:
            seg_start = seg.get('start', 0)
            seg_end = seg.get('end', 0)
            if seg_start <= timestamp + base_duration and seg_end >= timestamp:
                available = seg_start - timestamp
                if available > 0.5:
                    base_duration = min(base_duration, available)
                else:
                    base_duration = min(base_duration, 1.5)
                break

        # Clamp to genre rules then ElevenLabs range
        base_duration = max(genre_min, min(base_duration, genre_max))
        return max(0.5, min(base_duration, 10.0))

    # ================================================================
    # HELPER: Fallback transition selection (when no pre-computed transition)
    # ================================================================
    def select_fallback_transition(scene_before, scene_after, template_types):
        """Select transition from scene descriptions when suggestedTransitions is empty."""
        desc = (
            scene_before.get('description', '') + ' ' +
            scene_after.get('description', '')
        ).lower()

        # Use genre rules if available
        preferred = transition_rules.get('preferred_types', [])
        max_dur = transition_rules.get('max_duration', 0.8)

        if preferred:
            type_mapping = {t.value: t for t in TransitionType}
            for pref in preferred:
                if pref in type_mapping:
                    return (type_mapping[pref], min(0.5, max_dur))

        # Content-based fallback
        action_kw = ['running', 'jumping', 'fast', 'action', 'fighting', 'explosion']
        calm_kw = ['peaceful', 'calm', 'slow', 'quiet', 'serene', 'gentle']
        emotional_kw = ['sad', 'happy', 'emotion', 'cry', 'laugh', 'dramatic', 'intense']

        if any(kw in desc for kw in action_kw):
            return (TransitionType.GLITCH, 0.3)
        elif any(kw in desc for kw in emotional_kw):
            return (TransitionType.DISSOLVE, 0.8)
        elif any(kw in desc for kw in calm_kw):
            return (TransitionType.DISSOLVE, 0.6)

        # Template type preference
        if template_types:
            for t_name in template_types:
                try:
                    tt = TransitionType(t_name.lower())
                    return (tt, 0.4)
                except ValueError:
                    continue

        # Pacing-based default
        if pacing_style in ['fast', 'very_fast']:
            return (TransitionType.CUT, 0.0)
        elif pacing_style == 'slow':
            return (TransitionType.FADE, 0.8)
        return (TransitionType.DISSOLVE, 0.5)

    # ================================================================
    # HELPER: Build word-level subtitle segments from transcription
    # ================================================================
    def build_word_level_subtitles(segment):
        """Split a transcription segment into word-level subtitle chunks."""
        words = segment.get('words', [])
        if not words:
            return [segment]  # No word-level data, use segment as-is

        max_words = caption_rules.get('max_words_per_line', 8)

        chunks = []
        current_words = []
        current_start = None

        for w in words:
            word_text = w.get('word', '').strip()
            if not word_text:
                continue
            if current_start is None:
                current_start = w.get('start', segment.get('start', 0))
            current_words.append(word_text)

            if len(current_words) >= max_words:
                chunks.append({
                    'text': ' '.join(current_words),
                    'start': current_start,
                    'end': w.get('end', segment.get('end', 0)),
                    'speaker_id': segment.get('speaker_id'),
                    'energy_level': segment.get('energy_level'),
                })
                current_words = []
                current_start = None

        # Remaining words
        if current_words:
            chunks.append({
                'text': ' '.join(current_words),
                'start': current_start,
                'end': words[-1].get('end', segment.get('end', 0)),
                'speaker_id': segment.get('speaker_id'),
                'energy_level': segment.get('energy_level'),
            })

        return chunks if chunks else [segment]

    try:
        # Send start notification
        loop.run_until_complete(send_progress(
            user_id, "auto_generate", task_id, project_id,
            "starting", 0, f"Starting auto-generation with {template_id or 'default'} template..."
        ))

        db = SessionLocal()

        try:
            current_step = 0
            base_progress = 0

            # ============================================================
            # STEP 1: Create subtitles with speaker differentiation
            #         + word-level timing + genre caption rules
            # ============================================================
            if include_subtitles:
                if transcription:
                    loop.run_until_complete(send_progress(
                        user_id, "auto_generate", task_id, project_id,
                        "subtitles", 5, f"Creating subtitles with {caption_style} style (word-level timing)..."
                    ))

                    # Build base subtitle style from template + genre rules
                    subtitle_style = Subtitle.get_default_style()
                    if caption_style == 'bold':
                        subtitle_style['fontSize'] = 32
                        subtitle_style['fontFamily'] = 'Impact, sans-serif'
                    elif caption_style == 'minimal':
                        subtitle_style['fontSize'] = 18
                        subtitle_style['backgroundColor'] = 'transparent'
                    elif caption_style == 'animated':
                        subtitle_style['fontSize'] = 24
                        subtitle_style['animation'] = 'pop'
                    elif caption_style == 'karaoke':
                        subtitle_style['fontSize'] = 28
                        subtitle_style['highlightColor'] = '#FFD700'

                    # Genre caption rules can override style
                    genre_caption_style = caption_rules.get('style')
                    if genre_caption_style == 'minimal':
                        subtitle_style['backgroundColor'] = 'transparent'
                        base_fs = subtitle_style.get('fontSize', 24)
                        if isinstance(base_fs, str):
                            base_fs = int(base_fs.replace('px', ''))
                        subtitle_style['fontSize'] = min(base_fs, 20)
                    elif genre_caption_style == 'bold':
                        subtitle_style['fontWeight'] = 'bold'
                    elif genre_caption_style == 'cinematic':
                        subtitle_style['fontFamily'] = 'Georgia, serif'
                        subtitle_style['letterSpacing'] = '2px'

                    subtitle_count = 0
                    for i, segment in enumerate(transcription):
                        try:
                            # Use word-level timing if available
                            chunks = build_word_level_subtitles(segment)

                            for chunk in chunks:
                                text = chunk.get('text', '').strip()
                                if not text:
                                    continue

                                # Apply speaker color + energy emphasis
                                chunk_style = get_speaker_style(
                                    chunk.get('speaker_id'),
                                    chunk.get('energy_level'),
                                    subtitle_style
                                )

                                subtitle = Subtitle(
                                    project_id=project_id,
                                    text=text,
                                    start_time=chunk.get('start', 0),
                                    end_time=chunk.get('end', 0),
                                    style=chunk_style
                                )
                                db.add(subtitle)
                                subtitle_count += 1

                            if (i + 1) % 10 == 0:
                                progress = 5 + int((i / len(transcription)) * 20)
                                loop.run_until_complete(send_progress(
                                    user_id, "auto_generate", task_id, project_id,
                                    "subtitles", progress,
                                    f"Created subtitles for {i + 1}/{len(transcription)} segments..."
                                ))
                        except Exception as e:
                            result["errors"].append(f"Subtitle error at segment {i}: {str(e)}")

                    db.commit()
                    result["subtitles_created"] = subtitle_count
                    loop.run_until_complete(send_progress(
                        user_id, "auto_generate", task_id, project_id,
                        "subtitles", 25, f"Created {subtitle_count} subtitles (word-level)"
                    ))
                current_step += 1
                base_progress = 25

            # ============================================================
            # STEP 2: Generate SFX with layering, impact snapping,
            #         and mix-aware volume
            # ============================================================
            if include_sfx:
                # Prefer sfx_layers (multi-layer per scene), fall back to suggestedSFX
                sfx_source = []

                if sfx_layers:
                    for layer_entry in sfx_layers:
                        timestamp = layer_entry.get('timestamp', 0)
                        for layer_type in ['foley', 'ambient', 'accent', 'contrast']:
                            layer = layer_entry.get(layer_type)
                            if layer and layer.get('prompt'):
                                sfx_source.append({
                                    'timestamp': timestamp,
                                    'prompt': layer['prompt'],
                                    'confidence': layer.get('confidence', 0.7),
                                    'layer_type': layer_type,
                                    'duration_hint': layer.get('duration_hint'),
                                })

                if not sfx_source:
                    sfx_source = [dict(s, layer_type='flat') for s in suggested_sfx]

                # Apply genre SFX density rules
                genre_max_sfx = sfx_rules.get('max_per_minute', 3)
                video_duration = max(
                    (s.get('timestamp', 0) for s in scenes), default=60
                ) if scenes else 60
                effective_max = max(max_sfx_count, int(genre_max_sfx * video_duration / 60))

                # Filter by confidence
                filtered_sfx = [
                    s for s in sfx_source
                    if s.get('confidence', 0) >= sfx_confidence_threshold
                ]

                # Prioritize: accent > foley > ambient > contrast > flat
                layer_priority = {'accent': 0, 'foley': 1, 'ambient': 2, 'flat': 3, 'contrast': 4}
                filtered_sfx.sort(
                    key=lambda x: (
                        layer_priority.get(x.get('layer_type', 'flat'), 5),
                        -x.get('confidence', 0)
                    )
                )
                filtered_sfx = filtered_sfx[:effective_max]

                if filtered_sfx:
                    loop.run_until_complete(send_progress(
                        user_id, "auto_generate", task_id, project_id,
                        "sfx", base_progress + 3,
                        f"Generating {len(filtered_sfx)} layered sound effects..."
                    ))

                    from app.ai.sfx_generator import generate_sfx
                    import uuid
                    import os

                    for i, suggestion in enumerate(filtered_sfx):
                        try:
                            prompt = suggestion.get('prompt', 'ambient sound')
                            timestamp = suggestion.get('timestamp', 0)
                            layer_type = suggestion.get('layer_type', 'flat')

                            # Snap accent/foley to visual impacts for tighter sync
                            if layer_type in ('accent', 'foley'):
                                timestamp = snap_to_visual_impact(timestamp, max_snap=0.5)

                            # Calculate duration
                            if suggestion.get('duration_hint'):
                                duration = max(0.5, min(suggestion['duration_hint'], 10.0))
                            else:
                                duration = calculate_sfx_duration(suggestion, transcription)

                            # Layer-specific duration adjustments
                            if layer_type == 'ambient':
                                duration = min(duration * 1.5, 10.0)
                            elif layer_type == 'accent':
                                duration = min(duration, 2.0)

                            # Generate SFX file
                            output_filename = f"sfx_auto_{layer_type}_{uuid.uuid4().hex[:8]}.wav"
                            output_path = file_service.get_file_path(
                                user_id, project_id, "sfx", output_filename
                            )
                            os.makedirs(os.path.dirname(output_path), exist_ok=True)

                            generate_sfx(
                                prompt=prompt,
                                duration=duration,
                                output_path=output_path,
                                progress_callback=None
                            )

                            # Volume: audio_mix_map ducking × layer weight × energy
                            base_vol = get_sfx_volume_at(timestamp)
                            layer_vol_mult = {
                                'foley': 1.0, 'accent': 0.9, 'ambient': 0.5,
                                'contrast': 0.4, 'flat': 0.7,
                            }
                            sfx_volume = (
                                base_vol *
                                layer_vol_mult.get(layer_type, 0.7) *
                                (0.5 + energy_level * 0.5)
                            )
                            sfx_volume = max(0.1, min(sfx_volume, 1.0))

                            sfx_track = SFXTrack(
                                project_id=project_id,
                                filename=output_filename,
                                start_time=timestamp,
                                duration=duration,
                                volume=sfx_volume,
                                prompt=f"[{layer_type}] {prompt}"
                            )
                            db.add(sfx_track)
                            result["sfx_generated"] += 1

                            progress = base_progress + 3 + int(((i + 1) / len(filtered_sfx)) * 30)
                            loop.run_until_complete(send_progress(
                                user_id, "auto_generate", task_id, project_id,
                                "sfx", progress,
                                f"Generated {i + 1}/{len(filtered_sfx)} SFX [{layer_type}] ({duration:.1f}s)"
                            ))

                        except Exception as e:
                            result["errors"].append(f"SFX error [{layer_type}]: {str(e)}")

                    db.commit()

                current_step += 1
                base_progress = 65

            # ============================================================
            # STEP 3: Create transitions using pre-computed
            #         suggestedTransitions with continuity scoring
            # ============================================================
            if include_transitions and len(clip_ids) > 1:
                loop.run_until_complete(send_progress(
                    user_id, "auto_generate", task_id, project_id,
                    "transitions", base_progress + 2,
                    "Creating AI-scored transitions with continuity analysis..."
                ))

                # Avoid duplicates
                existing = db.query(Transition).filter(
                    Transition.project_id == project_id
                ).all()
                existing_pairs = {(t.from_clip_id, t.to_clip_id) for t in existing}

                from app.models.video_clip import VideoClip
                clips_db = db.query(VideoClip).filter(
                    VideoClip.id.in_(clip_ids)
                ).all()
                clip_map = {c.id: c for c in clips_db}

                # Build timeline positions
                timeline_positions = []
                current_pos = 0
                for cid in clip_ids:
                    clip = clip_map.get(cid)
                    if clip:
                        eff_dur = (clip.duration or 0) - clip.start_trim - clip.end_trim
                        timeline_positions.append({
                            'clip_id': cid,
                            'start': current_pos,
                            'end': current_pos + eff_dur
                        })
                        current_pos += eff_dur

                # Index suggested transitions by rounded timestamp for lookup
                transition_by_time = {}
                for st in suggested_transitions:
                    t = st.get('timestamp', 0)
                    transition_by_time[round(t, 1)] = st

                transitions_to_create = []
                for i in range(len(clip_ids) - 1):
                    from_clip = clip_ids[i]
                    to_clip = clip_ids[i + 1]

                    if (from_clip, to_clip) in existing_pairs:
                        continue

                    trans_point = timeline_positions[i]['end'] if i < len(timeline_positions) else 0

                    # Look up pre-computed transition (try nearby timestamps)
                    pre_computed = None
                    for offset in [0.0, 0.1, -0.1, 0.2, -0.2, 0.5, -0.5, 1.0, -1.0]:
                        key = round(trans_point + offset, 1)
                        if key in transition_by_time:
                            pre_computed = transition_by_time[key]
                            break

                    if pre_computed:
                        # Use the pre-computed, continuity-scored transition
                        trans_type_str = pre_computed.get('type', 'dissolve')
                        trans_duration = pre_computed.get('duration', 0.5)
                        confidence = pre_computed.get('confidence', 0.7)
                        continuity = pre_computed.get('continuity_score')

                        try:
                            trans_type = TransitionType(trans_type_str)
                        except ValueError:
                            trans_type = TransitionType.DISSOLVE

                        # Apply genre max_duration constraint
                        max_dur = transition_rules.get('max_duration', 1.0)
                        trans_duration = min(trans_duration, max_dur)
                    else:
                        # Fallback: derive from scene descriptions
                        def _find_scene_near(target_time, margin=2.0):
                            closest = None
                            closest_dist = float('inf')
                            for sc in scenes:
                                dist = abs(sc.get('timestamp', 0) - target_time)
                                if dist < closest_dist and dist <= margin:
                                    closest_dist = dist
                                    closest = sc
                            return closest or {'description': ''}

                        scene_before = _find_scene_near(trans_point - 1)
                        scene_after = _find_scene_near(trans_point + 1)
                        trans_type, trans_duration = select_fallback_transition(
                            scene_before, scene_after, template_transition_types
                        )
                        confidence = 0.5
                        continuity = None

                    transitions_to_create.append({
                        'from_clip_id': from_clip,
                        'to_clip_id': to_clip,
                        'type': trans_type,
                        'duration': trans_duration,
                        'confidence': confidence,
                        'continuity_score': continuity,
                    })

                for trans_data in transitions_to_create:
                    try:
                        params = {}
                        if trans_data.get('continuity_score') is not None:
                            params['continuity_score'] = trans_data['continuity_score']

                        transition = Transition(
                            project_id=project_id,
                            type=trans_data['type'].value if hasattr(trans_data['type'], 'value') else trans_data['type'],
                            from_clip_id=trans_data['from_clip_id'],
                            to_clip_id=trans_data['to_clip_id'],
                            duration=trans_data['duration'],
                            ai_suggested=1,
                            confidence=trans_data.get('confidence'),
                            parameters=params if params else None,
                        )
                        db.add(transition)
                        result["transitions_created"] += 1
                    except Exception as e:
                        result["errors"].append(f"Transition error: {str(e)}")

                db.commit()
                loop.run_until_complete(send_progress(
                    user_id, "auto_generate", task_id, project_id,
                    "transitions", base_progress + 15,
                    f"Created {result['transitions_created']} AI-scored transitions"
                ))

            current_step += 1
            base_progress = 82

            # ============================================================
            # STEP 4: Auto-create text overlays from analysis suggestions
            # ============================================================
            if suggested_text_overlays:
                loop.run_until_complete(send_progress(
                    user_id, "auto_generate", task_id, project_id,
                    "text_overlays", base_progress + 2,
                    f"Creating {len(suggested_text_overlays)} text overlays..."
                ))

                for overlay_suggestion in suggested_text_overlays:
                    try:
                        text = overlay_suggestion.get('text', '')
                        if not text:
                            continue

                        overlay_type = overlay_suggestion.get('type', 'title')
                        start = overlay_suggestion.get(
                            'start_time',
                            overlay_suggestion.get('timestamp', 0)
                        )
                        end = overlay_suggestion.get('end_time', start + 3.0)

                        # Style based on overlay type
                        style = TextOverlay.get_default_style()
                        if overlay_type == 'intro_title':
                            style['fontSize'] = 48
                            style['fontFamily'] = 'Impact, sans-serif'
                            style['position'] = {'x': 50, 'y': 40}
                            style['animation'] = 'fade'
                        elif overlay_type == 'lower_third':
                            style['fontSize'] = 22
                            style['backgroundColor'] = 'rgba(0,0,0,0.6)'
                            style['position'] = {'x': 10, 'y': 80}
                            style['animation'] = 'slide'
                        elif overlay_type == 'section_title':
                            style['fontSize'] = 36
                            style['position'] = {'x': 50, 'y': 50}
                            style['animation'] = 'zoom'
                        elif overlay_type == 'callout':
                            style['fontSize'] = 28
                            style['color'] = '#FFD700'
                            style['fontWeight'] = 'bold'
                            style['position'] = {'x': 50, 'y': 30}
                            style['animation'] = 'pop'
                        elif overlay_type == 'outro_title':
                            style['fontSize'] = 40
                            style['fontFamily'] = 'Georgia, serif'
                            style['position'] = {'x': 50, 'y': 45}
                            style['animation'] = 'fade'

                        overlay = TextOverlay(
                            project_id=project_id,
                            text=text,
                            start_time=start,
                            end_time=end,
                            style=style
                        )
                        db.add(overlay)
                        result["text_overlays_created"] += 1
                    except Exception as e:
                        result["errors"].append(f"Text overlay error: {str(e)}")

                db.commit()
                loop.run_until_complete(send_progress(
                    user_id, "auto_generate", task_id, project_id,
                    "text_overlays", base_progress + 8,
                    f"Created {result['text_overlays_created']} text overlays"
                ))

            base_progress = 92

            # ============================================================
            # STEP 5: Store enriched metadata for rendering pipeline + UI
            # ============================================================
            project = db.query(Project).filter(Project.id == project_id).first()
            if project and project.analysis_results:
                updated_results = dict(project.analysis_results)
                updated_results['auto_generate_metadata'] = {
                    'genre_detected': pre_classification.get('video_type', 'unknown'),
                    'subtitles_word_level': any(
                        s.get('words') for s in transcription
                    ),
                    'sfx_layering_used': bool(sfx_layers),
                    'transitions_ai_scored': bool(suggested_transitions),
                    'text_overlays_auto': result['text_overlays_created'],
                    'color_grading_available': bool(color_grading),
                    'audio_ducking_available': bool(audio_mix_map),
                    'narrative_arc_available': bool(narrative_arc),
                    'pacing_adjustments_count': len(pacing_adjustments),
                    'broll_suggestions_count': len(broll_points),
                }
                project.analysis_results = updated_results
                project.updated_at = datetime.utcnow()
                db.commit()

            loop.run_until_complete(send_progress(
                user_id, "auto_generate", task_id, project_id,
                "complete", 98, "Auto-generation complete"
            ))

        finally:
            db.close()

        # Send completion with enriched result
        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_complete(
            user_id, "auto_generate", task_id, project_id, result
        ))

    except Exception as e:
        import traceback
        traceback.print_exc()
        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_error(
            user_id, "auto_generate", task_id, project_id, str(e)
        ))

    finally:
        loop.close()


def run_sfx_generation(
    task_id: str,
    project_id: int,
    user_id: int,
    prompt: str,
    duration: float,
    output_path: str,
    output_filename: str
):
    """
    Run SFX generation in background.
    Imports AI modules only when needed to save memory.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        # Send start notification
        loop.run_until_complete(send_progress(
            user_id, "sfx_generation", task_id, project_id,
            "starting", 0, "Initializing SFX generation..."
        ))

        # Import AI module
        loop.run_until_complete(send_progress(
            user_id, "sfx_generation", task_id, project_id,
            "preparing", 10, "Preparing ElevenLabs SFX generation..."
        ))

        from app.ai.sfx_generator import generate_sfx

        def progress_callback(stage: str, progress: int):
            """Callback for generation progress."""
            mapped_progress = 10 + int(progress * 0.85)
            loop.run_until_complete(send_progress(
                user_id, "sfx_generation", task_id, project_id,
                stage, mapped_progress, f"Generating audio: {progress}%"
            ))

        # Generate SFX
        result_path = generate_sfx(
            prompt=prompt,
            duration=duration,
            output_path=output_path,
            progress_callback=progress_callback
        )

        # Track SFX usage (update user's sfx_seconds_used)
        db = SessionLocal()
        try:
            from app.models.user import User
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.sfx_seconds_used = (user.sfx_seconds_used or 0) + duration
                db.commit()
                print(f"Updated SFX usage for user {user_id}: +{duration}s, total: {user.sfx_seconds_used}s", file=sys.stderr)
        except Exception as e:
            print(f"Failed to update SFX usage: {e}", file=sys.stderr)
        finally:
            db.close()

        # Send completion with file URL and usage info
        manager = get_connection_manager()
        file_url = file_service.get_file_url(user_id, project_id, "sfx", output_filename)

        loop.run_until_complete(manager.send_task_complete(
            user_id, "sfx_generation", task_id, project_id,
            {
                "filename": output_filename,
                "url": file_url,
                "prompt": prompt,
                "duration": duration,
                "seconds_used": duration
            }
        ))

    except Exception as e:
        # Send error
        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_error(
            user_id, "sfx_generation", task_id, project_id, str(e)
        ))

    finally:
        loop.close()


def run_video_export(
    task_id: str,
    project_id: int,
    user_id: int,
    clip_infos: list,
    transition_infos: list,
    output_dir: str,
    output_filename: str,
    bgm_path: str = None,
    bgm_volume: float = 0.3,
    sfx_infos: list = None,
    subtitle_infos: list = None,
    overlay_infos: list = None,
    color_grade_info=None,
    ducking_infos: list = None,
):
    """
    Run video export (stitch + mix) in background with WebSocket progress.
    Now supports subtitle burn-in, text overlays, color grading, and audio ducking.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(send_progress(
            user_id, "video_render", task_id, project_id,
            "preparing", 10, "Preparing video export..."
        ))

        from app.services.video_stitcher import VideoStitcher

        sfx_count = len(sfx_infos) if sfx_infos else 0
        sub_count = len(subtitle_infos) if subtitle_infos else 0
        ovl_count = len(overlay_infos) if overlay_infos else 0
        bgm_label = " + BGM" if bgm_path else ""
        sfx_label = f" + {sfx_count} SFX" if sfx_count else ""
        sub_label = f" + {sub_count} subtitles" if sub_count else ""
        ovl_label = f" + {ovl_count} overlays" if ovl_count else ""
        cg_label = " + color grading" if color_grade_info else ""
        duck_label = " + audio ducking" if ducking_infos else ""

        loop.run_until_complete(send_progress(
            user_id, "video_render", task_id, project_id,
            "rendering", 30,
            f"Rendering {len(clip_infos)} clips{bgm_label}{sfx_label}"
            f"{sub_label}{ovl_label}{cg_label}{duck_label}..."
        ))

        stitcher = VideoStitcher(output_dir)
        success, result = stitcher.stitch_clips(
            clip_infos,
            transition_infos,
            output_filename,
            background_audio=bgm_path,
            audio_volume=bgm_volume,
            sfx_tracks=sfx_infos,
            subtitles=subtitle_infos,
            text_overlays=overlay_infos,
            color_grade=color_grade_info,
            ducking_points=ducking_infos,
        )

        if not success:
            raise Exception(f"Export failed: {result}")

        loop.run_until_complete(send_progress(
            user_id, "video_render", task_id, project_id,
            "finalizing", 90, "Finalizing export..."
        ))

        # Build the download URL
        export_url = file_service.get_file_url(
            user_id, project_id, "exports", output_filename
        )

        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_complete(
            user_id, "video_render", task_id, project_id,
            {
                "url": export_url,
                "filename": output_filename,
                "message": (
                    f"Exported {len(clip_infos)} clips{bgm_label}{sfx_label}"
                    f"{sub_label}{ovl_label}{cg_label}{duck_label}"
                )
            }
        ))

    except Exception as e:
        import traceback
        traceback.print_exc()
        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_error(
            user_id, "video_render", task_id, project_id, str(e)
        ))

    finally:
        loop.close()
