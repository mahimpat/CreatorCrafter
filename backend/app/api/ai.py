"""
AI/ML API endpoints for video analysis and SFX generation.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.schemas.ai import (
    AnalyzeRequest,
    AnalyzeResponse,
    SFXGenerateRequest,
    SFXGenerateResponse,
    TaskStatus,
    AutoGenerateRequest,
    AutoGenerateResponse,
)
from app.api.deps import get_current_user
from app.services.file_service import file_service
from app.config import settings

router = APIRouter()


@router.post("/{project_id}/analyze", response_model=AnalyzeResponse)
async def analyze_video(
    project_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start AI video analysis.
    This is a long-running task that will be executed in the background.
    Progress updates are sent via WebSocket.

    Supports both single video and multi-clip projects:
    - If clips exist, analyzes all clips sequentially
    - Otherwise, analyzes the main source video
    """
    from app.models.video_clip import VideoClip
    import os

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check for video clips first
    clips = db.query(VideoClip).filter(
        VideoClip.project_id == project_id
    ).order_by(VideoClip.timeline_order).all()

    video_paths = []
    audio_paths = []

    if clips and len(clips) > 0:
        # Multi-clip mode: analyze all clips
        for clip in clips:
            clip_path = file_service.get_file_path(
                current_user.id, project_id, "clips", clip.filename
            )
            if os.path.exists(clip_path):
                video_paths.append({
                    'path': clip_path,
                    'start_trim': clip.start_trim,
                    'end_trim': clip.end_trim,
                    'duration': clip.duration,
                    'timeline_order': clip.timeline_order
                })

                # Check for clip audio (extract if needed)
                audio_filename = f"audio_{clip.filename.rsplit('.', 1)[0]}.wav"
                audio_path = file_service.get_file_path(
                    current_user.id, project_id, "clips", audio_filename
                )
                audio_paths.append(audio_path)

        if not video_paths:
            raise HTTPException(status_code=404, detail="No valid video clips found")

    else:
        # Single video mode
        if not project.video_filename:
            raise HTTPException(status_code=404, detail="No video uploaded")

        video_path = file_service.get_file_path(
            current_user.id, project_id, "source", project.video_filename
        )
        video_paths.append({
            'path': video_path,
            'start_trim': 0,
            'end_trim': 0,
            'duration': project.video_duration / 1000 if project.video_duration else None,
            'timeline_order': 0
        })

        # Check if audio has been extracted
        audio_filename = f"audio_{project.video_filename.rsplit('.', 1)[0]}.wav"
        audio_path = file_service.get_file_path(
            current_user.id, project_id, "source", audio_filename
        )

        if not os.path.exists(audio_path):
            raise HTTPException(
                status_code=400,
                detail="Audio not extracted. Call /video/{project_id}/extract-audio first."
            )
        audio_paths.append(audio_path)

    # Queue the analysis task
    from app.tasks.ai_tasks import run_video_analysis, run_multi_clip_analysis
    task_id = f"analysis_{project_id}_{current_user.id}"

    if len(video_paths) > 1:
        # Multi-clip analysis
        background_tasks.add_task(
            run_multi_clip_analysis,
            task_id=task_id,
            project_id=project_id,
            user_id=current_user.id,
            video_clips=video_paths,
            audio_paths=audio_paths,
        )
        message = f"Timeline analysis started for {len(video_paths)} clips. Progress updates will be sent via WebSocket."
    else:
        # Single video analysis
        background_tasks.add_task(
            run_video_analysis,
            task_id=task_id,
            project_id=project_id,
            user_id=current_user.id,
            video_path=video_paths[0]['path'],
            audio_path=audio_paths[0],
        )
        message = "Video analysis has been started. Progress updates will be sent via WebSocket."

    return {
        "task_id": task_id,
        "status": "started",
        "message": message
    }


@router.get("/{project_id}/analyze/status/{task_id}", response_model=TaskStatus)
async def get_analysis_status(
    project_id: int,
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the status of a video analysis task.
    """
    # In a full Celery implementation, we'd check the task status
    # For now, return a placeholder
    return {
        "task_id": task_id,
        "status": "unknown",
        "progress": 0,
        "message": "Use WebSocket for real-time status updates"
    }


@router.post("/{project_id}/generate-sfx", response_model=SFXGenerateResponse)
async def generate_sfx(
    project_id: int,
    request: SFXGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a sound effect using AudioCraft.
    This is a long-running task that will be executed in the background.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate duration (ElevenLabs limit is 0.5-22 seconds)
    if request.duration < 0.5 or request.duration > 22:
        raise HTTPException(
            status_code=400,
            detail="Duration must be between 0.5 and 22 seconds"
        )

    # Generate output filename
    import uuid
    output_filename = f"sfx_{uuid.uuid4().hex}.wav"
    output_path = file_service.get_file_path(
        current_user.id, project_id, "sfx", output_filename
    )

    # Queue the SFX generation task
    from app.tasks.ai_tasks import run_sfx_generation
    task_id = f"sfx_{project_id}_{uuid.uuid4().hex[:8]}"

    background_tasks.add_task(
        run_sfx_generation,
        task_id=task_id,
        project_id=project_id,
        user_id=current_user.id,
        prompt=request.prompt,
        duration=request.duration,
        output_path=output_path,
        output_filename=output_filename,
    )

    return {
        "task_id": task_id,
        "status": "started",
        "message": "SFX generation has been started. Progress updates will be sent via WebSocket."
    }


@router.get("/{project_id}/sfx/status/{task_id}", response_model=TaskStatus)
async def get_sfx_status(
    project_id: int,
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Get the status of an SFX generation task.
    """
    return {
        "task_id": task_id,
        "status": "unknown",
        "progress": 0,
        "message": "Use WebSocket for real-time status updates"
    }


@router.get("/{project_id}/analysis-results")
async def get_analysis_results(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get stored analysis results for a project.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.analysis_results:
        raise HTTPException(status_code=404, detail="No analysis results available")

    return project.analysis_results


@router.post("/{project_id}/auto-generate", response_model=AutoGenerateResponse)
async def auto_generate(
    project_id: int,
    request: AutoGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Automatically generate all secondary elements from analysis results.

    This endpoint takes the stored analysis results and:
    - Creates subtitles from transcription
    - Generates SFX from suggestions
    - Creates transitions between clips

    All operations run in background with WebSocket progress updates.
    """
    from app.models.video_clip import VideoClip

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.analysis_results:
        raise HTTPException(
            status_code=400,
            detail="No analysis results available. Run /analyze first."
        )

    # Get clips for transition creation
    clips = db.query(VideoClip).filter(
        VideoClip.project_id == project_id
    ).order_by(VideoClip.timeline_order).all()

    clip_ids = [clip.id for clip in clips]

    # Queue the auto-generate task
    from app.tasks.ai_tasks import run_auto_generate
    import uuid
    task_id = f"auto_gen_{project_id}_{uuid.uuid4().hex[:8]}"

    # Convert template settings to dict if provided
    template_settings_dict = None
    if request.template_settings:
        template_settings_dict = request.template_settings.model_dump()

    background_tasks.add_task(
        run_auto_generate,
        task_id=task_id,
        project_id=project_id,
        user_id=current_user.id,
        analysis_results=project.analysis_results,
        clip_ids=clip_ids,
        include_subtitles=request.include_subtitles,
        include_sfx=request.include_sfx,
        include_transitions=request.include_transitions,
        sfx_confidence_threshold=request.sfx_confidence_threshold,
        transition_confidence_threshold=request.transition_confidence_threshold,
        max_sfx_count=request.max_sfx_count,
        template_id=request.template_id,
        template_settings=template_settings_dict,
    )

    return {
        "task_id": task_id,
        "status": "started",
        "message": "Auto-generation started. Progress updates will be sent via WebSocket."
    }
