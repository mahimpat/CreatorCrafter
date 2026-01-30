"""
Video processing API endpoints.
"""
import os
import subprocess
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.schemas.video import VideoMetadata, RenderRequest, RenderResponse
from app.api.deps import get_current_user
from app.services.file_service import file_service
from app.config import settings

router = APIRouter()


@router.post("/{project_id}/upload")
async def upload_video(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a video file to a project.
    """
    # Verify project exists and belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file extension
    ext = file.filename.split('.')[-1].lower()
    if ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {settings.ALLOWED_VIDEO_EXTENSIONS}"
        )

    # Save file
    filename = await file_service.save_uploaded_file(
        file, current_user.id, project_id, "source"
    )

    # Update project with video info
    project.video_filename = filename
    project.video_original_name = file.filename

    # Get video metadata
    video_path = file_service.get_file_path(current_user.id, project_id, "source", filename)
    metadata = get_video_metadata_ffprobe(video_path)

    if metadata:
        project.video_metadata = metadata
        if 'format' in metadata and 'duration' in metadata['format']:
            project.video_duration = int(float(metadata['format']['duration']) * 1000)

    db.commit()

    return {
        "filename": filename,
        "original_name": file.filename,
        "url": file_service.get_file_url(current_user.id, project_id, "source", filename),
        "metadata": metadata
    }


@router.get("/{project_id}/metadata", response_model=VideoMetadata)
async def get_metadata(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get video metadata for a project.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.video_filename:
        raise HTTPException(status_code=404, detail="No video uploaded")

    return {
        "filename": project.video_filename,
        "original_name": project.video_original_name,
        "duration": project.video_duration,
        "metadata": project.video_metadata
    }


@router.post("/{project_id}/extract-audio")
async def extract_audio(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extract audio track from video as WAV file.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.video_filename:
        raise HTTPException(status_code=404, detail="No video uploaded")

    video_path = file_service.get_file_path(
        current_user.id, project_id, "source", project.video_filename
    )

    # Output audio path
    audio_filename = f"audio_{project.video_filename.rsplit('.', 1)[0]}.wav"
    audio_path = file_service.get_file_path(
        current_user.id, project_id, "source", audio_filename
    )

    # Extract audio using FFmpeg
    try:
        result = subprocess.run(
            [
                'ffmpeg', '-y',
                '-i', video_path,
                '-vn',
                '-acodec', 'pcm_s16le',
                '-ar', '44100',
                '-ac', '2',
                audio_path
            ],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"FFmpeg error: {result.stderr}"
            )

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Audio extraction timed out")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="FFmpeg not found")

    return {
        "audio_filename": audio_filename,
        "audio_url": file_service.get_file_url(
            current_user.id, project_id, "source", audio_filename
        )
    }


@router.post("/{project_id}/render", response_model=RenderResponse)
async def render_video(
    project_id: int,
    render_request: RenderRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Render final video with all effects.
    Returns a task ID to track progress via WebSocket.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.video_filename:
        raise HTTPException(status_code=404, detail="No video uploaded")

    # For now, return a placeholder - full implementation with Celery later
    return {
        "task_id": "render_task_placeholder",
        "status": "queued",
        "message": "Video rendering has been queued"
    }


@router.get("/{project_id}/export-subtitles")
async def export_subtitles(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export subtitles as SRT file format.
    """
    from app.models.subtitle import Subtitle
    from fastapi.responses import PlainTextResponse

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all subtitles ordered by start time
    subtitles = db.query(Subtitle).filter(
        Subtitle.project_id == project_id
    ).order_by(Subtitle.start_time).all()

    if not subtitles:
        raise HTTPException(status_code=404, detail="No subtitles found")

    # Generate SRT content
    srt_content = []
    for idx, sub in enumerate(subtitles, 1):
        start_time = format_srt_time(sub.start_time)
        end_time = format_srt_time(sub.end_time)
        srt_content.append(f"{idx}")
        srt_content.append(f"{start_time} --> {end_time}")
        srt_content.append(sub.text)
        srt_content.append("")

    return PlainTextResponse(
        content="\n".join(srt_content),
        media_type="text/plain",
        headers={
            "Content-Disposition": f"attachment; filename=subtitles_{project_id}.srt"
        }
    )


def format_srt_time(seconds: float) -> str:
    """Convert seconds to SRT time format (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def get_video_metadata_ffprobe(video_path: str) -> Optional[dict]:
    """
    Get video metadata using FFprobe.
    """
    try:
        result = subprocess.run(
            [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                video_path
            ],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            return json.loads(result.stdout)
        return None

    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
        return None
