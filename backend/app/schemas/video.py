"""
Pydantic schemas for video processing requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any


class VideoMetadata(BaseModel):
    """Schema for video metadata response."""
    filename: str
    original_name: Optional[str]
    duration: Optional[int]  # Milliseconds
    metadata: Optional[dict]


class RenderSubtitle(BaseModel):
    """Schema for subtitle in render request."""
    text: str
    start: float
    end: float


class RenderSFX(BaseModel):
    """Schema for SFX track in render request."""
    filename: str
    start: float


class RenderOverlay(BaseModel):
    """Schema for text overlay in render request."""
    text: str
    start: float
    end: float
    style: dict


class RenderRequest(BaseModel):
    """Schema for video render request."""
    output_filename: Optional[str] = None
    include_subtitles: bool = True
    include_sfx: bool = True
    include_overlays: bool = True
    output_format: str = "mp4"
    video_codec: str = "libx264"
    audio_codec: str = "aac"


class RenderResponse(BaseModel):
    """Schema for render response."""
    task_id: str
    status: str
    message: str
