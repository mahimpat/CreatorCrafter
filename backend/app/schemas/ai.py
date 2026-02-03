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
    """Schema for SFX generation request (uses ElevenLabs API)."""
    prompt: str = Field(..., min_length=1, max_length=500)
    duration: float = Field(..., gt=0, le=22)  # ElevenLabs max is 22 seconds


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


class BGMSuggestion(BaseModel):
    """Schema for BGM (Background Music) suggestion from analysis."""
    type: str  # 'primary', 'alternative', 'contrast'
    mood: str  # 'uplifting', 'energetic', 'calm', 'dramatic', etc.
    genre: str  # 'electronic', 'orchestral', 'ambient', etc.
    tempo_range: tuple  # (min_bpm, max_bpm)
    energy_level: str  # 'low', 'medium', 'high'
    duration: float  # suggested duration in seconds
    confidence: float = 0.7
    reason: str  # explanation for this suggestion
    generation_prompt: Optional[str] = None  # prompt for AI music generation

    class Config:
        # Allow tuple to be serialized as list in JSON
        json_encoders = {
            tuple: list
        }


class VideoAnalysisResult(BaseModel):
    """Schema for complete video analysis result."""
    scenes: List[SceneInfo]
    suggestedSFX: List[SFXSuggestion]
    suggestedBGM: Optional[List[BGMSuggestion]] = None
    transcription: List[TranscriptionSegment]


class TemplateSettings(BaseModel):
    """Template settings for auto-generation."""
    # Intro/Outro effects
    intro_effect: Optional[str] = 'none'
    intro_duration: Optional[float] = 1.0
    outro_effect: Optional[str] = 'none'
    outro_duration: Optional[float] = 1.0

    # Transitions
    transition_types: Optional[List[str]] = None  # List of preferred transition types
    transition_duration: Optional[float] = 0.5

    # Pacing & Energy
    pacing_style: Optional[str] = 'moderate'  # slow, moderate, fast, dynamic
    energy_level: Optional[float] = 0.5  # 0.0 to 1.0
    min_clip_duration: Optional[float] = 2.0
    max_clip_duration: Optional[float] = 10.0

    # Audio
    music_mood: Optional[str] = None
    music_volume: Optional[float] = 0.3
    sfx_intensity: Optional[float] = 0.5

    # Captions
    caption_style: Optional[str] = 'standard'
    caption_position: Optional[str] = 'bottom'

    class Config:
        extra = 'allow'  # Allow additional fields


class AutoGenerateRequest(BaseModel):
    """Schema for auto-generate request - applies all suggestions automatically."""
    include_subtitles: bool = True
    include_sfx: bool = True
    include_transitions: bool = True
    sfx_confidence_threshold: float = Field(0.5, ge=0, le=1)
    transition_confidence_threshold: float = Field(0.5, ge=0, le=1)
    max_sfx_count: int = Field(10, ge=1, le=50)  # Limit SFX generation to control API costs

    # Template settings for intelligent generation
    template_id: Optional[str] = None
    template_settings: Optional[TemplateSettings] = None


class AutoGenerateResponse(BaseModel):
    """Schema for auto-generate response."""
    task_id: str
    status: str
    message: str


class AutoGenerateResult(BaseModel):
    """Schema for auto-generate completion result."""
    subtitles_created: int = 0
    sfx_generated: int = 0
    transitions_created: int = 0
    errors: List[str] = []
