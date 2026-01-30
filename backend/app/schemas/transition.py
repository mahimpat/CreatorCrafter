"""
Pydantic schemas for transitions.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class TransitionTypeEnum(str, Enum):
    """Types of transitions."""
    CUT = "cut"
    FADE = "fade"
    DISSOLVE = "dissolve"
    WIPE_LEFT = "wipe_left"
    WIPE_RIGHT = "wipe_right"
    WIPE_UP = "wipe_up"
    WIPE_DOWN = "wipe_down"
    SLIDE_LEFT = "slide_left"
    SLIDE_RIGHT = "slide_right"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"


class TransitionCreate(BaseModel):
    """Schema for creating a transition."""
    type: TransitionTypeEnum = TransitionTypeEnum.CUT
    from_clip_id: int
    to_clip_id: int
    duration: float = Field(default=0.5, ge=0, le=5.0)
    parameters: Optional[Dict[str, Any]] = None


class TransitionUpdate(BaseModel):
    """Schema for updating a transition."""
    type: Optional[TransitionTypeEnum] = None
    duration: Optional[float] = Field(default=None, ge=0, le=5.0)
    parameters: Optional[Dict[str, Any]] = None


class TransitionResponse(BaseModel):
    """Schema for transition responses."""
    id: int
    project_id: int
    type: TransitionTypeEnum
    from_clip_id: int
    to_clip_id: int
    duration: float
    parameters: Optional[Dict[str, Any]]
    ai_suggested: int
    confidence: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
