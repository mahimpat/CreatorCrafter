"""
Transitions management API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
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

router = APIRouter()


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

    # Create the transition
    transition = Transition(
        project_id=project_id,
        type=data.type,
        from_clip_id=data.from_clip_id,
        to_clip_id=data.to_clip_id,
        duration=data.duration,
        parameters=data.parameters
    )

    db.add(transition)
    db.commit()
    db.refresh(transition)

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

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(transition, key, value)

    db.commit()
    db.refresh(transition)

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

    db.delete(transition)
    db.commit()

    return {"message": "Transition deleted successfully"}
