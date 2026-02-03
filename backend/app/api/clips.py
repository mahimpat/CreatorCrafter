"""
Video clips management API endpoints.
"""
import os
import json
import subprocess
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.video_clip import VideoClip
from app.schemas.clip import (
    VideoClipCreate,
    VideoClipUpdate,
    VideoClipResponse,
    ClipReorderRequest
)
from app.api.deps import get_current_user
from app.services.file_service import file_service
from app.services.video_stitcher import VideoStitcher, ClipInfo, TransitionInfo, SFXTrackInfo
from app.models.transition import Transition
from app.models.sfx_track import SFXTrack
from app.models.background_audio import BackgroundAudio
from app.config import settings

router = APIRouter()


def get_video_metadata(file_path: str) -> dict:
    """Extract video metadata using FFprobe."""
    try:
        result = subprocess.run(
            [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', '-show_streams', file_path
            ],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except Exception as e:
        print(f"Error extracting metadata: {e}")
    return {}


@router.get("/{project_id}/clips", response_model=List[VideoClipResponse])
async def list_clips(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all video clips in a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    clips = db.query(VideoClip).filter(
        VideoClip.project_id == project_id
    ).order_by(VideoClip.timeline_order).all()

    return clips


@router.post("/{project_id}/clips", response_model=VideoClipResponse)
async def upload_clip(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a new video clip to a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get current clip count for ordering
    clip_count = db.query(VideoClip).filter(
        VideoClip.project_id == project_id
    ).count()

    # Save the file
    filename = await file_service.save_uploaded_file(
        file, current_user.id, project_id, "clips"
    )

    # Get file path and extract metadata
    file_path = file_service.get_file_path(
        current_user.id, project_id, "clips", filename
    )

    metadata = get_video_metadata(file_path)

    # Extract duration and dimensions
    duration = None
    width = None
    height = None
    fps = None

    if 'streams' in metadata:
        for stream in metadata['streams']:
            if stream.get('codec_type') == 'video':
                duration = float(stream.get('duration', 0))
                width = stream.get('width')
                height = stream.get('height')
                # Parse frame rate (e.g., "30/1" or "29.97")
                fps_str = stream.get('r_frame_rate', '0/1')
                if '/' in fps_str:
                    num, denom = fps_str.split('/')
                    fps = float(num) / float(denom) if float(denom) != 0 else None
                break

    if not duration and 'format' in metadata:
        duration = float(metadata['format'].get('duration', 0))

    # Create clip record
    clip = VideoClip(
        project_id=project_id,
        filename=filename,
        original_name=file.filename,
        original_order=clip_count,
        timeline_order=clip_count,
        duration=duration,
        width=width,
        height=height,
        fps=fps,
        clip_metadata=metadata
    )

    db.add(clip)
    db.commit()
    db.refresh(clip)

    return clip


@router.get("/{project_id}/clips/{clip_id}", response_model=VideoClipResponse)
async def get_clip(
    project_id: int,
    clip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific video clip."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    clip = db.query(VideoClip).filter(
        VideoClip.id == clip_id,
        VideoClip.project_id == project_id
    ).first()

    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    return clip


@router.put("/{project_id}/clips/{clip_id}", response_model=VideoClipResponse)
async def update_clip(
    project_id: int,
    clip_id: int,
    data: VideoClipUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a video clip (trim, reorder, etc.)."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    clip = db.query(VideoClip).filter(
        VideoClip.id == clip_id,
        VideoClip.project_id == project_id
    ).first()

    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(clip, key, value)

    db.commit()
    db.refresh(clip)

    return clip


@router.delete("/{project_id}/clips/{clip_id}")
async def delete_clip(
    project_id: int,
    clip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a video clip."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    clip = db.query(VideoClip).filter(
        VideoClip.id == clip_id,
        VideoClip.project_id == project_id
    ).first()

    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    # Delete the file
    file_path = file_service.get_file_path(
        current_user.id, project_id, "clips", clip.filename
    )
    if os.path.exists(file_path):
        os.remove(file_path)

    # Delete from database
    db.delete(clip)
    db.commit()

    # Reorder remaining clips
    remaining_clips = db.query(VideoClip).filter(
        VideoClip.project_id == project_id
    ).order_by(VideoClip.timeline_order).all()

    for i, c in enumerate(remaining_clips):
        c.timeline_order = i

    db.commit()

    return {"message": "Clip deleted successfully"}


@router.post("/{project_id}/clips/{clip_id}/duplicate", response_model=VideoClipResponse)
async def duplicate_clip(
    project_id: int,
    clip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Duplicate a video clip."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    original_clip = db.query(VideoClip).filter(
        VideoClip.id == clip_id,
        VideoClip.project_id == project_id
    ).first()

    if not original_clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    # Get current clip count for ordering
    clip_count = db.query(VideoClip).filter(
        VideoClip.project_id == project_id
    ).count()

    # Create a duplicate clip record (uses same video file)
    new_clip = VideoClip(
        project_id=project_id,
        filename=original_clip.filename,  # Same file
        original_name=f"{original_clip.original_name or 'Clip'} (copy)",
        original_order=clip_count,
        timeline_order=clip_count,  # Add at end
        duration=original_clip.duration,
        start_trim=original_clip.start_trim,
        end_trim=original_clip.end_trim,
        width=original_clip.width,
        height=original_clip.height,
        fps=original_clip.fps,
        clip_metadata=original_clip.clip_metadata
    )

    db.add(new_clip)
    db.commit()
    db.refresh(new_clip)

    return new_clip


@router.post("/{project_id}/clips/{clip_id}/split")
async def split_clip(
    project_id: int,
    clip_id: int,
    split_time: float,  # Time within the clip (after start_trim) where to split
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Split a clip into two at the specified time.

    Args:
        split_time: The time (in seconds) within the clip's visible portion where to split.
                   This is relative to the start_trim (0 = start of visible clip).
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    original_clip = db.query(VideoClip).filter(
        VideoClip.id == clip_id,
        VideoClip.project_id == project_id
    ).first()

    if not original_clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    # Calculate the actual split point in the original video
    # split_time is relative to the start of the trimmed clip
    actual_split_time = original_clip.start_trim + split_time

    # Validate split time
    clip_duration = original_clip.duration - original_clip.start_trim - original_clip.end_trim
    if split_time <= 0 or split_time >= clip_duration:
        raise HTTPException(
            status_code=400,
            detail=f"Split time must be between 0 and {clip_duration} seconds"
        )

    # Shift all clips after this one to make room for the new clip
    clips_after = db.query(VideoClip).filter(
        VideoClip.project_id == project_id,
        VideoClip.timeline_order > original_clip.timeline_order
    ).all()

    for clip in clips_after:
        clip.timeline_order += 1

    # Create the second clip (from split point to end)
    new_clip = VideoClip(
        project_id=project_id,
        filename=original_clip.filename,  # Same video file
        original_name=f"{original_clip.original_name or 'Clip'} (part 2)",
        original_order=original_clip.original_order,
        timeline_order=original_clip.timeline_order + 1,  # Right after original
        duration=original_clip.duration,
        start_trim=actual_split_time,  # Starts at split point
        end_trim=original_clip.end_trim,  # Same end trim
        width=original_clip.width,
        height=original_clip.height,
        fps=original_clip.fps,
        clip_metadata=original_clip.clip_metadata
    )

    # Update original clip to end at split point
    original_clip.end_trim = original_clip.duration - actual_split_time
    original_clip.original_name = f"{original_clip.original_name or 'Clip'} (part 1)"

    db.add(new_clip)
    db.commit()
    db.refresh(original_clip)
    db.refresh(new_clip)

    return {
        "original_clip": original_clip,
        "new_clip": new_clip,
        "message": f"Clip split at {split_time:.2f}s"
    }


@router.put("/{project_id}/clips/reorder")
async def reorder_clips(
    project_id: int,
    data: ClipReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reorder clips on the timeline."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update each clip's order
    for item in data.clip_orders:
        clip = db.query(VideoClip).filter(
            VideoClip.id == item['id'],
            VideoClip.project_id == project_id
        ).first()
        if clip:
            clip.timeline_order = item['timeline_order']

    db.commit()

    # Return updated clips
    clips = db.query(VideoClip).filter(
        VideoClip.project_id == project_id
    ).order_by(VideoClip.timeline_order).all()

    return [VideoClipResponse.model_validate(c) for c in clips]


@router.post("/{project_id}/clips/stitch")
async def stitch_clips(
    project_id: int,
    background_tasks: BackgroundTasks,
    include_sfx: bool = True,
    include_bgm: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stitch all clips together with transitions, SFX, and BGM, then export.
    Runs in background with WebSocket progress updates.
    Returns a task_id for tracking progress.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all clips in timeline order
    clips = db.query(VideoClip).filter(
        VideoClip.project_id == project_id
    ).order_by(VideoClip.timeline_order).all()

    if not clips:
        raise HTTPException(status_code=400, detail="No clips to stitch")

    # Get all transitions
    transitions = db.query(Transition).filter(
        Transition.project_id == project_id
    ).all()

    # Build a map of transitions by from_clip_id
    transition_map = {t.from_clip_id: t for t in transitions}

    # Prepare clip and transition info for stitcher
    clip_infos = []
    transition_infos = []

    for i, clip in enumerate(clips):
        # Get file path
        file_path = file_service.get_file_path(
            current_user.id, project_id, "clips", clip.filename
        )

        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=400,
                detail=f"Clip file not found: {clip.filename}"
            )

        clip_infos.append(ClipInfo(
            path=file_path,
            duration=clip.duration or 0,
            start_trim=clip.start_trim or 0,
            end_trim=clip.end_trim or 0
        ))

        # Get transition to next clip (if not the last clip)
        if i < len(clips) - 1:
            transition = transition_map.get(clip.id)

            if transition:
                transition_infos.append(TransitionInfo(
                    type=transition.type,
                    duration=transition.duration,
                    parameters=transition.parameters
                ))
            else:
                # Default to cut (no transition)
                transition_infos.append(TransitionInfo(
                    type='cut',
                    duration=0
                ))

    # Gather SFX tracks if requested
    sfx_infos = None
    if include_sfx:
        sfx_tracks = db.query(SFXTrack).filter(
            SFXTrack.project_id == project_id
        ).order_by(SFXTrack.start_time).all()

        if sfx_tracks:
            sfx_infos = []
            for sfx in sfx_tracks:
                sfx_path = file_service.get_file_path(
                    current_user.id, project_id, "sfx", sfx.filename
                )
                if os.path.exists(sfx_path):
                    sfx_infos.append(SFXTrackInfo(
                        path=sfx_path,
                        start_time=sfx.start_time,
                        duration=sfx.duration,
                        volume=sfx.volume or 1.0
                    ))

    # Gather BGM if requested
    bgm_path = None
    bgm_volume = 0.3
    if include_bgm:
        bgm_track = db.query(BackgroundAudio).filter(
            BackgroundAudio.project_id == project_id
        ).first()

        if bgm_track:
            bgm_path = file_service.get_file_path(
                current_user.id, project_id, "bgm", bgm_track.filename
            )
            bgm_volume = bgm_track.volume or 0.3
            if not os.path.exists(bgm_path):
                bgm_path = None

    # Get output directory for exports
    export_dir = file_service.get_file_path(
        current_user.id, project_id, "exports", ""
    )
    os.makedirs(export_dir, exist_ok=True)

    # Generate output filename and task ID
    import uuid
    task_id = f"export_{uuid.uuid4().hex[:8]}"
    output_filename = f"export_{uuid.uuid4().hex[:8]}.mp4"

    # Launch export as background task with WebSocket progress
    from app.tasks.ai_tasks import run_video_export
    background_tasks.add_task(
        run_video_export,
        task_id=task_id,
        project_id=project_id,
        user_id=current_user.id,
        clip_infos=clip_infos,
        transition_infos=transition_infos,
        output_dir=export_dir,
        output_filename=output_filename,
        bgm_path=bgm_path,
        bgm_volume=bgm_volume,
        sfx_infos=sfx_infos,
    )

    return {
        "success": True,
        "task_id": task_id,
        "message": f"Export started for {len(clips)} clips"
    }
