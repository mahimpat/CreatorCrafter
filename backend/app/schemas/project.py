"""
Pydantic schemas for project-related requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum

from app.schemas.subtitle import SubtitleResponse
from app.schemas.sfx_track import SFXTrackResponse
from app.schemas.text_overlay import TextOverlayResponse


class ProjectModeEnum(str, Enum):
    """Editing mode for the project."""
    MANUAL = "manual"
    SEMI_MANUAL = "semi_manual"
    AUTOMATIC = "automatic"


class ProjectCreate(BaseModel):
    """Schema for creating a project."""
    name: str = Field(..., min_length=1, max_length=255)
    mode: ProjectModeEnum = ProjectModeEnum.SEMI_MANUAL


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    mode: Optional[ProjectModeEnum] = None
    analysis_results: Optional[dict] = None


class ProjectResponse(BaseModel):
    """Schema for project responses (basic info)."""
    id: int
    name: str
    mode: ProjectModeEnum
    video_filename: Optional[str]
    video_original_name: Optional[str]
    video_duration: Optional[int]
    created_at: datetime
    updated_at: datetime
    last_opened: datetime

    class Config:
        from_attributes = True


class ProjectSummary(BaseModel):
    """Schema for project list (summary only)."""
    id: int
    name: str
    mode: ProjectModeEnum
    video_filename: Optional[str]
    video_original_name: Optional[str]
    created_at: datetime
    last_opened: datetime

    class Config:
        from_attributes = True


class ProjectFull(BaseModel):
    """Schema for full project with all related data."""
    id: int
    name: str
    mode: ProjectModeEnum
    video_filename: Optional[str]
    video_original_name: Optional[str]
    video_duration: Optional[int]
    video_metadata: Optional[dict]
    analysis_results: Optional[dict]
    created_at: datetime
    updated_at: datetime
    last_opened: datetime
    subtitles: List[SubtitleResponse]
    sfx_tracks: List[SFXTrackResponse]
    text_overlays: List[TextOverlayResponse]

    class Config:
        from_attributes = True
