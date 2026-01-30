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
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.video_filename:
        raise HTTPException(status_code=404, detail="No video uploaded")

    # Check if audio has been extracted
    audio_filename = f"audio_{project.video_filename.rsplit('.', 1)[0]}.wav"
    audio_path = file_service.get_file_path(
        current_user.id, project_id, "source", audio_filename
    )

    import os
    if not os.path.exists(audio_path):
        raise HTTPException(
            status_code=400,
            detail="Audio not extracted. Call /video/{project_id}/extract-audio first."
        )

    # Queue the analysis task
    # In full implementation, this would use Celery
    # For now, we'll use FastAPI background tasks for simpler deployment

    from app.tasks.ai_tasks import run_video_analysis
    task_id = f"analysis_{project_id}_{current_user.id}"

    background_tasks.add_task(
        run_video_analysis,
        task_id=task_id,
        project_id=project_id,
        user_id=current_user.id,
        video_path=file_service.get_file_path(
            current_user.id, project_id, "source", project.video_filename
        ),
        audio_path=audio_path,
    )

    return {
        "task_id": task_id,
        "status": "started",
        "message": "Video analysis has been started. Progress updates will be sent via WebSocket."
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

    # Validate duration
    if request.duration <= 0 or request.duration > 30:
        raise HTTPException(
            status_code=400,
            detail="Duration must be between 0 and 30 seconds"
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
