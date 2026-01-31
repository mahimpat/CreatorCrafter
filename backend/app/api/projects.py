"""
Project management API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.subtitle import Subtitle
from app.models.sfx_track import SFXTrack
from app.models.text_overlay import TextOverlay
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectSummary,
    ProjectFull,
)
from app.schemas.subtitle import SubtitleCreate, SubtitleUpdate, SubtitleResponse
from app.schemas.sfx_track import SFXTrackCreate, SFXTrackUpdate, SFXTrackResponse
from app.schemas.text_overlay import TextOverlayCreate, TextOverlayUpdate, TextOverlayResponse
from app.api.deps import get_current_user
from app.services.file_service import file_service

router = APIRouter()


# ==================== Project CRUD ====================

@router.get("/", response_model=List[ProjectSummary])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all projects for the current user.
    Returns summary information (not full project data).
    """
    projects = (
        db.query(Project)
        .filter(Project.owner_id == current_user.id)
        .order_by(Project.last_opened.desc())
        .all()
    )
    return projects


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new project.
    Limited to 3 projects per user.
    """
    from app.models.project import ProjectMode
    from app.models.user import MAX_PROJECTS_PER_USER

    # Refresh user to get current project count
    db.refresh(current_user)

    # Check project limit
    if not current_user.can_create_project:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Project limit reached. You can only create {MAX_PROJECTS_PER_USER} projects. "
                   f"Please delete an existing project to create a new one."
        )

    project = Project(
        name=project_data.name,
        owner_id=current_user.id,
        mode=ProjectMode(project_data.mode.value),
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    # Create project storage directories
    file_service.create_project_directories(current_user.id, project.id)

    return project


@router.get("/{project_id}", response_model=ProjectFull)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get full project details including all tracks.
    """
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Update last opened time
    project.last_opened = datetime.utcnow()
    db.commit()

    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update project details.
    """
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Update fields
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.mode is not None:
        from app.models.project import ProjectMode
        project.mode = ProjectMode(project_data.mode.value)
    if project_data.analysis_results is not None:
        project.analysis_results = project_data.analysis_results

    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a project and all associated data.
    """
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Delete project files
    file_service.delete_project_files(current_user.id, project_id)

    # Delete from database (cascades to subtitles, sfx, overlays)
    db.delete(project)
    db.commit()


# ==================== Subtitles ====================

@router.get("/{project_id}/subtitles", response_model=List[SubtitleResponse])
async def list_subtitles(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all subtitles for a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project.subtitles


@router.post("/{project_id}/subtitles", response_model=SubtitleResponse, status_code=201)
async def create_subtitle(
    project_id: int,
    subtitle_data: SubtitleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new subtitle."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    subtitle = Subtitle(
        project_id=project_id,
        text=subtitle_data.text,
        start_time=subtitle_data.start_time,
        end_time=subtitle_data.end_time,
        style=subtitle_data.style or Subtitle.get_default_style(),
    )

    db.add(subtitle)
    db.commit()
    db.refresh(subtitle)

    return subtitle


@router.put("/{project_id}/subtitles/{subtitle_id}", response_model=SubtitleResponse)
async def update_subtitle(
    project_id: int,
    subtitle_id: int,
    subtitle_data: SubtitleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a subtitle."""
    subtitle = db.query(Subtitle).join(Project).filter(
        Subtitle.id == subtitle_id,
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not subtitle:
        raise HTTPException(status_code=404, detail="Subtitle not found")

    if subtitle_data.text is not None:
        subtitle.text = subtitle_data.text
    if subtitle_data.start_time is not None:
        subtitle.start_time = subtitle_data.start_time
    if subtitle_data.end_time is not None:
        subtitle.end_time = subtitle_data.end_time
    if subtitle_data.style is not None:
        subtitle.style = subtitle_data.style

    db.commit()
    db.refresh(subtitle)

    return subtitle


@router.delete("/{project_id}/subtitles/{subtitle_id}", status_code=204)
async def delete_subtitle(
    project_id: int,
    subtitle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a subtitle."""
    subtitle = db.query(Subtitle).join(Project).filter(
        Subtitle.id == subtitle_id,
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not subtitle:
        raise HTTPException(status_code=404, detail="Subtitle not found")

    db.delete(subtitle)
    db.commit()


# ==================== SFX Tracks ====================

@router.get("/{project_id}/sfx", response_model=List[SFXTrackResponse])
async def list_sfx_tracks(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all SFX tracks for a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project.sfx_tracks


@router.post("/{project_id}/sfx", response_model=SFXTrackResponse, status_code=201)
async def create_sfx_track(
    project_id: int,
    sfx_data: SFXTrackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new SFX track."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    sfx_track = SFXTrack(
        project_id=project_id,
        filename=sfx_data.filename,
        start_time=sfx_data.start_time,
        duration=sfx_data.duration,
        volume=sfx_data.volume or 1.0,
        prompt=sfx_data.prompt,
    )

    db.add(sfx_track)
    db.commit()
    db.refresh(sfx_track)

    return sfx_track


@router.put("/{project_id}/sfx/{sfx_id}", response_model=SFXTrackResponse)
async def update_sfx_track(
    project_id: int,
    sfx_id: int,
    sfx_data: SFXTrackUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an SFX track."""
    sfx_track = db.query(SFXTrack).join(Project).filter(
        SFXTrack.id == sfx_id,
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not sfx_track:
        raise HTTPException(status_code=404, detail="SFX track not found")

    if sfx_data.start_time is not None:
        sfx_track.start_time = sfx_data.start_time
    if sfx_data.duration is not None:
        sfx_track.duration = sfx_data.duration
    if sfx_data.volume is not None:
        sfx_track.volume = sfx_data.volume

    db.commit()
    db.refresh(sfx_track)

    return sfx_track


@router.delete("/{project_id}/sfx/{sfx_id}", status_code=204)
async def delete_sfx_track(
    project_id: int,
    sfx_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an SFX track."""
    sfx_track = db.query(SFXTrack).join(Project).filter(
        SFXTrack.id == sfx_id,
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not sfx_track:
        raise HTTPException(status_code=404, detail="SFX track not found")

    # Optionally delete the audio file
    # file_service.delete_file(current_user.id, project_id, 'sfx', sfx_track.filename)

    db.delete(sfx_track)
    db.commit()


# ==================== Text Overlays ====================

@router.get("/{project_id}/overlays", response_model=List[TextOverlayResponse])
async def list_text_overlays(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all text overlays for a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project.text_overlays


@router.post("/{project_id}/overlays", response_model=TextOverlayResponse, status_code=201)
async def create_text_overlay(
    project_id: int,
    overlay_data: TextOverlayCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new text overlay."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    overlay = TextOverlay(
        project_id=project_id,
        text=overlay_data.text,
        start_time=overlay_data.start_time,
        end_time=overlay_data.end_time,
        style=overlay_data.style or TextOverlay.get_default_style(),
    )

    db.add(overlay)
    db.commit()
    db.refresh(overlay)

    return overlay


@router.put("/{project_id}/overlays/{overlay_id}", response_model=TextOverlayResponse)
async def update_text_overlay(
    project_id: int,
    overlay_id: int,
    overlay_data: TextOverlayUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a text overlay."""
    overlay = db.query(TextOverlay).join(Project).filter(
        TextOverlay.id == overlay_id,
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not overlay:
        raise HTTPException(status_code=404, detail="Text overlay not found")

    if overlay_data.text is not None:
        overlay.text = overlay_data.text
    if overlay_data.start_time is not None:
        overlay.start_time = overlay_data.start_time
    if overlay_data.end_time is not None:
        overlay.end_time = overlay_data.end_time
    if overlay_data.style is not None:
        overlay.style = overlay_data.style

    db.commit()
    db.refresh(overlay)

    return overlay


@router.delete("/{project_id}/overlays/{overlay_id}", status_code=204)
async def delete_text_overlay(
    project_id: int,
    overlay_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a text overlay."""
    overlay = db.query(TextOverlay).join(Project).filter(
        TextOverlay.id == overlay_id,
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not overlay:
        raise HTTPException(status_code=404, detail="Text overlay not found")

    db.delete(overlay)
    db.commit()
