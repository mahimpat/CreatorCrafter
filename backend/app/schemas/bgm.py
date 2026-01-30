"""
Pydantic schemas for background audio/music.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class AudioSourceEnum(str, Enum):
    """Source of the background audio."""
    UPLOAD = "upload"
    AI_GENERATED = "ai_generated"


class BackgroundAudioCreate(BaseModel):
    """Schema for creating background audio."""
    filename: str
    original_name: Optional[str] = None
    source: AudioSourceEnum = AudioSourceEnum.UPLOAD
    start_time: float = 0.0
    duration: Optional[float] = None
    volume: float = Field(default=0.3, ge=0.0, le=1.0)
    fade_in: float = Field(default=0.0, ge=0.0)
    fade_out: float = Field(default=0.0, ge=0.0)
    prompt: Optional[str] = None


class BackgroundAudioUpdate(BaseModel):
    """Schema for updating background audio."""
    start_time: Optional[float] = None
    duration: Optional[float] = None
    volume: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    fade_in: Optional[float] = Field(default=None, ge=0.0)
    fade_out: Optional[float] = Field(default=None, ge=0.0)


class BackgroundAudioResponse(BaseModel):
    """Schema for background audio responses."""
    id: int
    project_id: int
    filename: str
    original_name: Optional[str]
    source: AudioSourceEnum
    start_time: float
    duration: Optional[float]
    volume: float
    fade_in: float
    fade_out: float
    prompt: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BGMGenerateRequest(BaseModel):
    """Schema for AI BGM generation request."""
    prompt: str = Field(..., min_length=3, max_length=500)
    duration: float = Field(default=30.0, ge=5.0, le=300.0)
    style: Optional[str] = None  # e.g., "upbeat", "calm", "dramatic"
