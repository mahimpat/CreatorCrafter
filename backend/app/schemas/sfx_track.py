"""
Pydantic schemas for SFX track-related requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional


class SFXTrackCreate(BaseModel):
    """Schema for creating an SFX track."""
    filename: str = Field(..., min_length=1, max_length=255)
    start_time: float = Field(..., ge=0)
    duration: float = Field(..., gt=0)
    volume: Optional[float] = Field(1.0, ge=0, le=1)
    prompt: Optional[str] = Field(None, max_length=500)


class SFXTrackUpdate(BaseModel):
    """Schema for updating an SFX track."""
    start_time: Optional[float] = Field(None, ge=0)
    duration: Optional[float] = Field(None, gt=0)
    volume: Optional[float] = Field(None, ge=0, le=1)


class SFXTrackResponse(BaseModel):
    """Schema for SFX track responses."""
    id: int
    project_id: int
    filename: str
    start_time: float
    duration: float
    volume: float
    prompt: Optional[str]

    class Config:
        from_attributes = True
