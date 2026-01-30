"""
Pydantic schemas for subtitle-related requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional


class SubtitleStyle(BaseModel):
    """Schema for subtitle styling."""
    fontSize: int = 24
    fontFamily: str = "Arial"
    color: str = "#ffffff"
    backgroundColor: str = "rgba(0,0,0,0.7)"
    position: str = "bottom"  # top, center, bottom


class SubtitleCreate(BaseModel):
    """Schema for creating a subtitle."""
    text: str = Field(..., min_length=1, max_length=1000)
    start_time: float = Field(..., ge=0)
    end_time: float = Field(..., ge=0)
    style: Optional[dict] = None


class SubtitleUpdate(BaseModel):
    """Schema for updating a subtitle."""
    text: Optional[str] = Field(None, min_length=1, max_length=1000)
    start_time: Optional[float] = Field(None, ge=0)
    end_time: Optional[float] = Field(None, ge=0)
    style: Optional[dict] = None


class SubtitleResponse(BaseModel):
    """Schema for subtitle responses."""
    id: int
    project_id: int
    text: str
    start_time: float
    end_time: float
    style: dict

    class Config:
        from_attributes = True
