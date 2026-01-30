"""
Pydantic schemas for text overlay-related requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional


class OverlayPosition(BaseModel):
    """Schema for overlay position."""
    x: float = Field(50, ge=0, le=100)  # Percentage
    y: float = Field(50, ge=0, le=100)  # Percentage


class OverlayStyle(BaseModel):
    """Schema for overlay styling."""
    fontSize: int = 32
    fontFamily: str = "Arial"
    color: str = "#ffffff"
    backgroundColor: str = "transparent"
    position: OverlayPosition = OverlayPosition()
    animation: str = "none"  # none, fade, slide, zoom


class TextOverlayCreate(BaseModel):
    """Schema for creating a text overlay."""
    text: str = Field(..., min_length=1, max_length=500)
    start_time: float = Field(..., ge=0)
    end_time: float = Field(..., ge=0)
    style: Optional[dict] = None


class TextOverlayUpdate(BaseModel):
    """Schema for updating a text overlay."""
    text: Optional[str] = Field(None, min_length=1, max_length=500)
    start_time: Optional[float] = Field(None, ge=0)
    end_time: Optional[float] = Field(None, ge=0)
    style: Optional[dict] = None


class TextOverlayResponse(BaseModel):
    """Schema for text overlay responses."""
    id: int
    project_id: int
    text: str
    start_time: float
    end_time: float
    style: dict

    class Config:
        from_attributes = True
