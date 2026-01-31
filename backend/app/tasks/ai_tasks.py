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
    Creates subtitles, generates SFX, and applies transitions.

    Now template-aware with:
    - Content-aware transition selection based on scene descriptions
    - Variable SFX duration based on scene context
    - Template-specific transition types and intro/outro effects
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    from app.models.subtitle import Subtitle
    from app.models.sfx_track import SFXTrack
    from app.models.transition import Transition, TransitionType

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

    result = {
        "subtitles_created": 0,
        "sfx_generated": 0,
        "transitions_created": 0,
        "errors": [],
        # Template-enhanced results
        "template_applied": template_id,
        "intro_effect": intro_effect if intro_effect != 'none' else None,
        "intro_duration": intro_duration if intro_effect != 'none' else None,
        "outro_effect": outro_effect if outro_effect != 'none' else None,
        "outro_duration": outro_duration if outro_effect != 'none' else None,
    }

    # Helper: Select content-aware transition based on scene descriptions
    def select_content_aware_transition(scene_before: dict, scene_after: dict, template_types: list) -> tuple:
        """
        Select transition type based on scene content analysis.
        Returns (TransitionType, duration)
        """
        desc_before = (scene_before.get('description', '') + ' ' + scene_before.get('action_description', '')).lower()
        desc_after = (scene_after.get('description', '') + ' ' + scene_after.get('action_description', '')).lower()

        # Action keywords for fast/dynamic transitions
        action_keywords = ['running', 'jumping', 'fast', 'action', 'fighting', 'explosion', 'crash', 'quick', 'sudden']
        # Calm keywords for smooth transitions
        calm_keywords = ['peaceful', 'calm', 'slow', 'quiet', 'serene', 'gentle', 'relax']
        # Location change keywords
        location_keywords = ['outside', 'inside', 'room', 'building', 'street', 'outdoor', 'indoor', 'location']
        # Emotional keywords
        emotional_keywords = ['sad', 'happy', 'emotion', 'cry', 'laugh', 'dramatic', 'intense']

        # Determine scene characteristics
        is_action = any(kw in desc_before or kw in desc_after for kw in action_keywords)
        is_calm = any(kw in desc_before or kw in desc_after for kw in calm_keywords)
        is_location_change = any(kw in desc_before for kw in location_keywords) and any(kw in desc_after for kw in location_keywords)
        is_emotional = any(kw in desc_before or kw in desc_after for kw in emotional_keywords)

        # Map to transition types with duration
        if is_action:
            # Fast action → quick dynamic transitions
            options = [
                (TransitionType.GLITCH, 0.3),
                (TransitionType.FLASH, 0.25),
                (TransitionType.ZOOM_IN, 0.3),
                (TransitionType.CUT, 0.0),
            ]
        elif is_location_change:
            # Location change → wipes/slides
            options = [
                (TransitionType.WIPE_LEFT, 0.5),
                (TransitionType.WIPE_RIGHT, 0.5),
                (TransitionType.SLIDE_LEFT, 0.4),
                (TransitionType.SLIDE_RIGHT, 0.4),
            ]
        elif is_emotional:
            # Emotional → slow dissolves/fades
            options = [
                (TransitionType.DISSOLVE, 0.8),
                (TransitionType.FADE, 1.0),
                (TransitionType.BLUR, 0.6),
            ]
        elif is_calm:
            # Calm scenes → smooth transitions
            options = [
                (TransitionType.DISSOLVE, 0.6),
                (TransitionType.FADE, 0.7),
                (TransitionType.CROSS_ZOOM, 0.5),
            ]
        else:
            # Default based on pacing
            if pacing_style in ['fast', 'very_fast']:
                options = [
                    (TransitionType.CUT, 0.0),
                    (TransitionType.ZOOM_IN, 0.3),
                    (TransitionType.FLASH, 0.25),
                ]
            elif pacing_style == 'slow':
                options = [
                    (TransitionType.DISSOLVE, 0.8),
                    (TransitionType.FADE, 1.0),
                ]
            else:  # moderate
                options = [
                    (TransitionType.DISSOLVE, 0.5),
                    (TransitionType.FADE, 0.5),
                    (TransitionType.WIPE_LEFT, 0.4),
                ]

        # If template specifies transition types, prefer those
        if template_types:
            type_mapping = {
                'cut': TransitionType.CUT,
                'fade': TransitionType.FADE,
                'dissolve': TransitionType.DISSOLVE,
                'wipe_left': TransitionType.WIPE_LEFT,
                'wipe_right': TransitionType.WIPE_RIGHT,
                'slide_left': TransitionType.SLIDE_LEFT,
                'slide_right': TransitionType.SLIDE_RIGHT,
                'zoom_in': TransitionType.ZOOM_IN,
                'zoom_out': TransitionType.ZOOM_OUT,
                'glitch': TransitionType.GLITCH,
                'flash': TransitionType.FLASH,
                'blur': TransitionType.BLUR,
                'spin': TransitionType.SPIN,
                'color_fade': TransitionType.COLOR_FADE,
            }
            for t_name in template_types:
                if t_name.lower() in type_mapping:
                    # Find matching option or create new one
                    matched = type_mapping[t_name.lower()]
                    for opt in options:
                        if opt[0] == matched:
                            return opt
                    # Use first template type with default duration
                    return (matched, 0.4)

        # Return first option
        return options[0] if options else (TransitionType.DISSOLVE, 0.5)

    # Helper: Calculate SFX duration based on scene context
    def calculate_sfx_duration(suggestion: dict, transcription: list) -> float:
        """
        Calculate optimal SFX duration based on:
        - Scene context
        - Avoid overlapping with speech
        - Template pacing
        """
        timestamp = suggestion.get('timestamp', 0)
        base_duration = 3.0

        # Adjust based on pacing
        if pacing_style in ['fast', 'very_fast']:
            base_duration = 2.0
        elif pacing_style == 'slow':
            base_duration = 4.0

        # Check for speech overlap - reduce duration if speech nearby
        for seg in transcription:
            seg_start = seg.get('start', 0)
            seg_end = seg.get('end', 0)

            # If SFX would overlap with speech
            if seg_start <= timestamp + base_duration and seg_end >= timestamp:
                # Reduce to fit before speech or use shorter duration
                available = seg_start - timestamp
                if available > 0.5:
                    base_duration = min(base_duration, available)
                else:
                    base_duration = min(base_duration, 1.5)  # Short ambient
                break

        # Clamp to valid range (ElevenLabs: 0.5-22 seconds)
        return max(0.5, min(base_duration, 10.0))

    try:
        # Send start notification
        loop.run_until_complete(send_progress(
            user_id, "auto_generate", task_id, project_id,
            "starting", 0, f"Starting auto-generation with {template_id or 'default'} template..."
        ))

        db = SessionLocal()

        try:
            total_steps = 0
            if include_subtitles:
                total_steps += 1
            if include_sfx:
                total_steps += 1
            if include_transitions:
                total_steps += 1

            current_step = 0
            base_progress = 0

            # Get scenes for content-aware decisions
            scenes = analysis_results.get('scenes', [])
            transcription = analysis_results.get('transcription', [])

            # Step 1: Create subtitles from transcription with template styling
            if include_subtitles:
                if transcription:
                    loop.run_until_complete(send_progress(
                        user_id, "auto_generate", task_id, project_id,
                        "subtitles", 10, f"Creating {len(transcription)} subtitles with {caption_style} style..."
                    ))

                    # Get template-aware subtitle style
                    subtitle_style = Subtitle.get_default_style()
                    if caption_style == 'bold':
                        subtitle_style['fontSize'] = '32px'
                        subtitle_style['fontFamily'] = 'Impact, sans-serif'
                    elif caption_style == 'minimal':
                        subtitle_style['fontSize'] = '18px'
                        subtitle_style['backgroundColor'] = 'transparent'
                    elif caption_style == 'animated':
                        subtitle_style['fontSize'] = '24px'
                        subtitle_style['animation'] = 'pop'
                    elif caption_style == 'karaoke':
                        subtitle_style['fontSize'] = '28px'
                        subtitle_style['highlightColor'] = '#FFD700'

                    for i, segment in enumerate(transcription):
                        try:
                            subtitle = Subtitle(
                                project_id=project_id,
                                text=segment.get('text', '').strip(),
                                start_time=segment.get('start', 0),
                                end_time=segment.get('end', 0),
                                style=subtitle_style
                            )
                            db.add(subtitle)
                            result["subtitles_created"] += 1

                            if (i + 1) % 10 == 0:
                                progress = 10 + int((i / len(transcription)) * 20)
                                loop.run_until_complete(send_progress(
                                    user_id, "auto_generate", task_id, project_id,
                                    "subtitles", progress, f"Created {i + 1}/{len(transcription)} subtitles..."
                                ))
                        except Exception as e:
                            result["errors"].append(f"Subtitle error: {str(e)}")

                    db.commit()
                    loop.run_until_complete(send_progress(
                        user_id, "auto_generate", task_id, project_id,
                        "subtitles", 30, f"Created {result['subtitles_created']} subtitles"
                    ))
                current_step += 1
                base_progress = 30

            # Step 2: Generate SFX with variable duration based on context
            if include_sfx:
                sfx_suggestions = analysis_results.get('suggestedSFX', [])
                # Filter by confidence and limit count
                filtered_sfx = [
                    s for s in sfx_suggestions
                    if s.get('confidence', 0) >= sfx_confidence_threshold
                ][:max_sfx_count]

                if filtered_sfx:
                    loop.run_until_complete(send_progress(
                        user_id, "auto_generate", task_id, project_id,
                        "sfx", base_progress + 5, f"Generating {len(filtered_sfx)} sound effects with smart durations..."
                    ))

                    from app.ai.sfx_generator import generate_sfx
                    import uuid
                    import os

                    for i, suggestion in enumerate(filtered_sfx):
                        try:
                            prompt = suggestion.get('prompt', 'ambient sound')
                            timestamp = suggestion.get('timestamp', 0)

                            # Calculate smart duration based on context
                            duration = calculate_sfx_duration(suggestion, transcription)

                            # Generate SFX file
                            output_filename = f"sfx_auto_{uuid.uuid4().hex[:8]}.wav"
                            output_path = file_service.get_file_path(
                                user_id, project_id, "sfx", output_filename
                            )

                            # Ensure directory exists
                            os.makedirs(os.path.dirname(output_path), exist_ok=True)

                            # Generate with calculated duration
                            generate_sfx(
                                prompt=prompt,
                                duration=duration,
                                output_path=output_path,
                                progress_callback=None
                            )

                            # Adjust volume based on energy level
                            sfx_volume = 0.5 + (energy_level * 0.3)  # 0.5 to 0.8

                            # Create SFX track record
                            sfx_track = SFXTrack(
                                project_id=project_id,
                                filename=output_filename,
                                start_time=timestamp,
                                duration=duration,
                                volume=sfx_volume,
                                prompt=prompt
                            )
                            db.add(sfx_track)
                            result["sfx_generated"] += 1

                            progress = base_progress + 5 + int(((i + 1) / len(filtered_sfx)) * 30)
                            loop.run_until_complete(send_progress(
                                user_id, "auto_generate", task_id, project_id,
                                "sfx", progress, f"Generated {i + 1}/{len(filtered_sfx)} sound effects ({duration:.1f}s)"
                            ))

                        except Exception as e:
                            result["errors"].append(f"SFX generation error: {str(e)}")

                    db.commit()

                current_step += 1
                base_progress = 70

            # Step 3: Create content-aware transitions between clips
            if include_transitions and len(clip_ids) > 1:
                loop.run_until_complete(send_progress(
                    user_id, "auto_generate", task_id, project_id,
                    "transitions", base_progress + 5, "Creating smart transitions based on content analysis..."
                ))

                # Get existing transitions to avoid duplicates
                existing = db.query(Transition).filter(
                    Transition.project_id == project_id
                ).all()
                existing_pairs = {(t.from_clip_id, t.to_clip_id) for t in existing}

                # Get clip durations for finding scenes
                from app.models.video_clip import VideoClip
                clips = db.query(VideoClip).filter(
                    VideoClip.id.in_(clip_ids)
                ).all()
                clip_map = {c.id: c for c in clips}

                # Build timeline position for each clip
                timeline_positions = []
                current_pos = 0
                for cid in clip_ids:
                    clip = clip_map.get(cid)
                    if clip:
                        effective_duration = (clip.duration or 0) - clip.start_trim - clip.end_trim
                        timeline_positions.append({
                            'clip_id': cid,
                            'start': current_pos,
                            'end': current_pos + effective_duration
                        })
                        current_pos += effective_duration

                # Find scenes near transition points
                def find_scene_near_time(target_time: float, margin: float = 2.0) -> dict:
                    """Find the closest scene to a given time."""
                    closest = None
                    closest_dist = float('inf')
                    for scene in scenes:
                        dist = abs(scene.get('timestamp', 0) - target_time)
                        if dist < closest_dist and dist <= margin:
                            closest_dist = dist
                            closest = scene
                    return closest or {'description': '', 'action_description': ''}

                transitions_to_create = []

                for i in range(len(clip_ids) - 1):
                    from_clip = clip_ids[i]
                    to_clip = clip_ids[i + 1]

                    if (from_clip, to_clip) in existing_pairs:
                        continue

                    # Find transition point (end of from_clip)
                    trans_point = timeline_positions[i]['end'] if i < len(timeline_positions) else 0

                    # Get scenes before and after transition
                    scene_before = find_scene_near_time(trans_point - 1)
                    scene_after = find_scene_near_time(trans_point + 1)

                    # Select content-aware transition
                    transition_type, duration = select_content_aware_transition(
                        scene_before, scene_after, template_transition_types
                    )

                    transitions_to_create.append({
                        'from_clip_id': from_clip,
                        'to_clip_id': to_clip,
                        'type': transition_type,
                        'duration': duration
                    })

                for trans_data in transitions_to_create:
                    try:
                        transition = Transition(
                            project_id=project_id,
                            type=trans_data['type'],
                            from_clip_id=trans_data['from_clip_id'],
                            to_clip_id=trans_data['to_clip_id'],
                            duration=trans_data['duration'],
                            ai_suggested=1
                        )
                        db.add(transition)
                        result["transitions_created"] += 1
                    except Exception as e:
                        result["errors"].append(f"Transition error: {str(e)}")

                db.commit()
                loop.run_until_complete(send_progress(
                    user_id, "auto_generate", task_id, project_id,
                    "transitions", 95, f"Created {result['transitions_created']} smart transitions"
                ))

        finally:
            db.close()

        # Send completion with template info
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

        # Send completion with file URL
        manager = get_connection_manager()
        file_url = file_service.get_file_url(user_id, project_id, "sfx", output_filename)

        loop.run_until_complete(manager.send_task_complete(
            user_id, "sfx_generation", task_id, project_id,
            {
                "filename": output_filename,
                "url": file_url,
                "prompt": prompt,
                "duration": duration
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
