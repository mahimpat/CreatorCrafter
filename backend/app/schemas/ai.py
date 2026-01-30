"""
Pydantic schemas for AI/ML requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class AnalyzeRequest(BaseModel):
    """Schema for video analysis request."""
    # Analysis is triggered by endpoint, no body needed
    pass


class AnalyzeResponse(BaseModel):
    """Schema for video analysis response."""
    task_id: str
    status: str
    message: str


class SFXGenerateRequest(BaseModel):
    """Schema for SFX generation request."""
    prompt: str = Field(..., min_length=1, max_length=500)
    duration: float = Field(..., gt=0, le=30)


class SFXGenerateResponse(BaseModel):
    """Schema for SFX generation response."""
    task_id: str
    status: str
    message: str


class TaskStatus(BaseModel):
    """Schema for task status response."""
    task_id: str
    status: str
    progress: int = Field(0, ge=0, le=100)
    message: str = ""
    result: Optional[dict] = None


# Analysis result schemas (matching the Python script output)

class SceneInfo(BaseModel):
    """Schema for scene analysis result."""
    timestamp: float
    type: str
    description: str
    action_description: Optional[str] = None
    sound_description: Optional[str] = None
    confidence: float


class SFXSuggestion(BaseModel):
    """Schema for SFX suggestion from analysis."""
    timestamp: float
    prompt: str
    reason: str
    visual_context: Optional[str] = None
    action_context: Optional[str] = None
    confidence: float = 0.7


class TranscriptionSegment(BaseModel):
    """Schema for transcription segment."""
    text: str
    start: float
    end: float
    confidence: float = 0.9


class VideoAnalysisResult(BaseModel):
    """Schema for complete video analysis result."""
    scenes: List[SceneInfo]
    suggestedSFX: List[SFXSuggestion]
    transcription: List[TranscriptionSegment]
