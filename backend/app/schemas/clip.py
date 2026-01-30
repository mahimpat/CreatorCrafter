"""
Pydantic schemas for video clips.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class VideoClipCreate(BaseModel):
    """Schema for creating a video clip."""
    filename: str
    original_name: Optional[str] = None
    original_order: int
    timeline_order: int
    start_trim: float = 0.0
    end_trim: float = 0.0
    timeline_start: float = 0.0
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    clip_metadata: Optional[Dict[str, Any]] = None


class VideoClipUpdate(BaseModel):
    """Schema for updating a video clip."""
    timeline_order: Optional[int] = None
    start_trim: Optional[float] = None
    end_trim: Optional[float] = None
    timeline_start: Optional[float] = None


class VideoClipResponse(BaseModel):
    """Schema for video clip responses."""
    id: int
    project_id: int
    filename: str
    original_name: Optional[str]
    original_order: int
    timeline_order: int
    start_trim: float
    end_trim: float
    timeline_start: float
    duration: Optional[float]
    width: Optional[int]
    height: Optional[int]
    fps: Optional[float]
    clip_metadata: Optional[Dict[str, Any]]
    analysis: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClipReorderRequest(BaseModel):
    """Schema for reordering clips."""
    clip_orders: list[dict]  # [{"id": 1, "timeline_order": 0}, ...]
