"""
Transitions management API endpoints.
"""
import os
import uuid
from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.video_clip import VideoClip
from app.models.transition import Transition
from app.schemas.transition import (
    TransitionCreate,
    TransitionUpdate,
    TransitionResponse
)
from app.api.deps import get_current_user
from app.services.file_service import file_service
from app.services.video_stitcher import VideoStitcher

router = APIRouter()


def _render_transition_task(
    user_id: int,
    project_id: int,
    transition_id: int,
    from_clip_path: str,
    from_clip_duration: float,
    from_clip_start_trim: float,
    from_clip_end_trim: float,
    to_clip_path: str,
    to_clip_duration: float,
    to_clip_start_trim: float,
    to_clip_end_trim: float,
    transition_type: str,
    transition_duration: float,
    parameters: dict = None,
):
    """Background task to render a transition preview video."""
    transitions_dir = file_service.get_file_path(
        user_id, project_id, "transitions", ""
    )
    os.makedirs(transitions_dir, exist_ok=True)

    output_filename = f"transition_{uuid.uuid4().hex[:12]}.mp4"
    output_path = os.path.join(transitions_dir, output_filename)

    stitcher = VideoStitcher(transitions_dir)

    success, result = stitcher.render_transition_preview(
        clip1_path=from_clip_path,
        clip1_duration=from_clip_duration,
        clip1_start_trim=from_clip_start_trim,
        clip1_end_trim=from_clip_end_trim,
        clip2_path=to_clip_path,
        clip2_duration=to_clip_duration,
        clip2_start_trim=to_clip_start_trim,
        clip2_end_trim=to_clip_end_trim,
        transition_type=transition_type,
        transition_duration=transition_duration,
        output_path=output_path,
        parameters=parameters,
    )

    if success:
        db = SessionLocal()
        try:
            transition = db.query(Transition).filter(
                Transition.id == transition_id
            ).first()
            if transition:
                # Delete old rendered file if exists
                if transition.rendered_filename:
                    old_path = os.path.join(
                        transitions_dir, transition.rendered_filename
                    )
                    if os.path.exists(old_path):
                        os.remove(old_path)
                transition.rendered_filename = output_filename
                db.commit()
                print(f"[TransitionRender] Success: {output_filename}")
        finally:
            db.close()
    else:
        print(f"[TransitionRender] Failed for transition {transition_id}: {result}")
        if os.path.exists(output_path):
            os.remove(output_path)


def _trigger_render(
    background_tasks: BackgroundTasks,
    user_id: int,
    project_id: int,
    transition: Transition,
    from_clip: VideoClip,
    to_clip: VideoClip,
):
    """Helper to trigger a transition render in the background."""
    if transition.type == 'cut':
        return

    from_path = file_service.get_file_path(
        user_id, project_id, "clips", from_clip.filename
    )
    to_path = file_service.get_file_path(
        user_id, project_id, "clips", to_clip.filename
    )

    if not os.path.exists(from_path) or not os.path.exists(to_path):
        print(f"[TransitionRender] Clip file(s) missing, skipping render")
        return

    background_tasks.add_task(
        _render_transition_task,
        user_id=user_id,
        project_id=project_id,
        transition_id=transition.id,
        from_clip_path=from_path,
        from_clip_duration=from_clip.duration or 0,
        from_clip_start_trim=from_clip.start_trim or 0,
        from_clip_end_trim=from_clip.end_trim or 0,
        to_clip_path=to_path,
        to_clip_duration=to_clip.duration or 0,
        to_clip_start_trim=to_clip.start_trim or 0,
        to_clip_end_trim=to_clip.end_trim or 0,
        transition_type=transition.type,
        transition_duration=transition.duration,
        parameters=transition.parameters,
    )


@router.get("/{project_id}/transitions", response_model=List[TransitionResponse])
async def list_transitions(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all transitions in a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    transitions = db.query(Transition).filter(
        Transition.project_id == project_id
    ).all()

    return transitions


@router.post("/{project_id}/transitions", response_model=TransitionResponse)
async def create_transition(
    project_id: int,
    data: TransitionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a transition between two clips."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify both clips exist and belong to this project
    from_clip = db.query(VideoClip).filter(
        VideoClip.id == data.from_clip_id,
        VideoClip.project_id == project_id
    ).first()

    to_clip = db.query(VideoClip).filter(
        VideoClip.id == data.to_clip_id,
        VideoClip.project_id == project_id
    ).first()

    if not from_clip or not to_clip:
        raise HTTPException(status_code=400, detail="Invalid clip IDs")

    # Check if transition already exists between these clips
    existing = db.query(Transition).filter(
        Transition.from_clip_id == data.from_clip_id,
        Transition.to_clip_id == data.to_clip_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Transition already exists between these clips"
        )

    # Create the transition (store type as string)
    transition = Transition(
        project_id=project_id,
        type=data.type.value,
        from_clip_id=data.from_clip_id,
        to_clip_id=data.to_clip_id,
        duration=data.duration,
        parameters=data.parameters
    )

    db.add(transition)
    db.commit()
    db.refresh(transition)

    # Auto-render the transition preview
    _trigger_render(
        background_tasks, current_user.id, project_id,
        transition, from_clip, to_clip
    )

    return transition


@router.get("/{project_id}/transitions/{transition_id}", response_model=TransitionResponse)
async def get_transition(
    project_id: int,
    transition_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific transition."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    transition = db.query(Transition).filter(
        Transition.id == transition_id,
        Transition.project_id == project_id
    ).first()

    if not transition:
        raise HTTPException(status_code=404, detail="Transition not found")

    return transition


@router.put("/{project_id}/transitions/{transition_id}", response_model=TransitionResponse)
async def update_transition(
    project_id: int,
    transition_id: int,
    data: TransitionUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a transition."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    transition = db.query(Transition).filter(
        Transition.id == transition_id,
        Transition.project_id == project_id
    ).first()

    if not transition:
        raise HTTPException(status_code=404, detail="Transition not found")

    # Check if type, duration, or parameters changed (needs re-render)
    update_data = data.model_dump(exclude_unset=True)
    needs_rerender = False
    for key in ('type', 'duration', 'parameters'):
        if key in update_data and getattr(transition, key) != update_data[key]:
            needs_rerender = True
            break

    # Update fields (type is stored as string)
    for key, value in update_data.items():
        setattr(transition, key, value)

    # Invalidate old render if re-rendering
    if needs_rerender:
        transition.rendered_filename = None

    db.commit()
    db.refresh(transition)

    # Re-render if needed
    if needs_rerender:
        from_clip = db.query(VideoClip).filter(
            VideoClip.id == transition.from_clip_id
        ).first()
        to_clip = db.query(VideoClip).filter(
            VideoClip.id == transition.to_clip_id
        ).first()
        if from_clip and to_clip:
            _trigger_render(
                background_tasks, current_user.id, project_id,
                transition, from_clip, to_clip
            )

    return transition


@router.delete("/{project_id}/transitions/{transition_id}")
async def delete_transition(
    project_id: int,
    transition_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a transition."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    transition = db.query(Transition).filter(
        Transition.id == transition_id,
        Transition.project_id == project_id
    ).first()

    if not transition:
        raise HTTPException(status_code=404, detail="Transition not found")

    # Delete rendered file from disk
    if transition.rendered_filename:
        transitions_dir = file_service.get_file_path(
            current_user.id, project_id, "transitions", ""
        )
        rendered_path = os.path.join(
            transitions_dir, transition.rendered_filename
        )
        if os.path.exists(rendered_path):
            os.remove(rendered_path)

    db.delete(transition)
    db.commit()

    return {"message": "Transition deleted successfully"}


@router.post("/{project_id}/transitions/{transition_id}/render", response_model=TransitionResponse)
async def render_transition(
    project_id: int,
    transition_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger rendering of a transition preview video."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    transition = db.query(Transition).filter(
        Transition.id == transition_id,
        Transition.project_id == project_id
    ).first()

    if not transition:
        raise HTTPException(status_code=404, detail="Transition not found")

    if transition.type == 'cut':
        return transition

    from_clip = db.query(VideoClip).filter(
        VideoClip.id == transition.from_clip_id
    ).first()
    to_clip = db.query(VideoClip).filter(
        VideoClip.id == transition.to_clip_id
    ).first()

    if not from_clip or not to_clip:
        raise HTTPException(status_code=400, detail="Clip(s) not found")

    _trigger_render(
        background_tasks, current_user.id, project_id,
        transition, from_clip, to_clip
    )

    return transition
