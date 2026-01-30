"""
Background audio/music management API endpoints.
"""
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.background_audio import BackgroundAudio, AudioSource
from app.schemas.bgm import (
    BackgroundAudioCreate,
    BackgroundAudioUpdate,
    BackgroundAudioResponse,
    BGMGenerateRequest
)
from app.api.deps import get_current_user
from app.services.file_service import file_service

router = APIRouter()


@router.get("/{project_id}/bgm", response_model=List[BackgroundAudioResponse])
async def list_bgm(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all background audio tracks in a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tracks = db.query(BackgroundAudio).filter(
        BackgroundAudio.project_id == project_id
    ).order_by(BackgroundAudio.start_time).all()

    return tracks


@router.post("/{project_id}/bgm/upload", response_model=BackgroundAudioResponse)
async def upload_bgm(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a background audio file."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Save the file
    filename = await file_service.save_uploaded_file(
        file, current_user.id, project_id, "bgm"
    )

    # Create BGM record
    bgm = BackgroundAudio(
        project_id=project_id,
        filename=filename,
        original_name=file.filename,
        source=AudioSource.UPLOAD
    )

    db.add(bgm)
    db.commit()
    db.refresh(bgm)

    return bgm


@router.post("/{project_id}/bgm/generate", response_model=BackgroundAudioResponse)
async def generate_bgm(
    project_id: int,
    data: BGMGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate background music using AI (MusicGen)."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # For now, return a placeholder - actual AI generation would be similar to SFX
    # TODO: Implement MusicGen integration for BGM generation
    raise HTTPException(
        status_code=501,
        detail="AI BGM generation not yet implemented. Use upload instead."
    )


@router.get("/{project_id}/bgm/{bgm_id}", response_model=BackgroundAudioResponse)
async def get_bgm(
    project_id: int,
    bgm_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific background audio track."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    bgm = db.query(BackgroundAudio).filter(
        BackgroundAudio.id == bgm_id,
        BackgroundAudio.project_id == project_id
    ).first()

    if not bgm:
        raise HTTPException(status_code=404, detail="Background audio not found")

    return bgm


@router.put("/{project_id}/bgm/{bgm_id}", response_model=BackgroundAudioResponse)
async def update_bgm(
    project_id: int,
    bgm_id: int,
    data: BackgroundAudioUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update background audio settings."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    bgm = db.query(BackgroundAudio).filter(
        BackgroundAudio.id == bgm_id,
        BackgroundAudio.project_id == project_id
    ).first()

    if not bgm:
        raise HTTPException(status_code=404, detail="Background audio not found")

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bgm, key, value)

    db.commit()
    db.refresh(bgm)

    return bgm


@router.delete("/{project_id}/bgm/{bgm_id}")
async def delete_bgm(
    project_id: int,
    bgm_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a background audio track."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    bgm = db.query(BackgroundAudio).filter(
        BackgroundAudio.id == bgm_id,
        BackgroundAudio.project_id == project_id
    ).first()

    if not bgm:
        raise HTTPException(status_code=404, detail="Background audio not found")

    # Delete the file
    file_path = file_service.get_file_path(
        current_user.id, project_id, "bgm", bgm.filename
    )
    if os.path.exists(file_path):
        os.remove(file_path)

    # Delete from database
    db.delete(bgm)
    db.commit()

    return {"message": "Background audio deleted successfully"}
