"""
Transition model for video clip transitions.
"""
import enum
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class TransitionType(str, enum.Enum):
    """Types of transitions between clips."""
    CUT = "cut"  # No transition, direct cut
    FADE = "fade"  # Fade to/from black
    DISSOLVE = "dissolve"  # Cross-dissolve between clips
    WIPE_LEFT = "wipe_left"  # Wipe from right to left
    WIPE_RIGHT = "wipe_right"  # Wipe from left to right
    WIPE_UP = "wipe_up"  # Wipe from bottom to top
    WIPE_DOWN = "wipe_down"  # Wipe from top to bottom
    SLIDE_LEFT = "slide_left"  # Slide from right
    SLIDE_RIGHT = "slide_right"  # Slide from left
    ZOOM_IN = "zoom_in"  # Zoom transition
    ZOOM_OUT = "zoom_out"


class Transition(Base):
    """Transition between two video clips."""

    __tablename__ = "transitions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # Transition type
    type = Column(Enum(TransitionType), default=TransitionType.CUT, nullable=False)

    # Connected clips
    from_clip_id = Column(Integer, ForeignKey("video_clips.id", ondelete="CASCADE"), nullable=False)
    to_clip_id = Column(Integer, ForeignKey("video_clips.id", ondelete="CASCADE"), nullable=False)

    # Duration in seconds (0 for cut)
    duration = Column(Float, default=0.5)

    # Additional parameters for advanced transitions
    parameters = Column(JSON, nullable=True)  # e.g., easing, direction, color

    # AI suggestion metadata
    ai_suggested = Column(Integer, default=0)  # 1 if AI suggested this transition
    confidence = Column(Float, nullable=True)  # AI confidence score

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="transitions")
    from_clip = relationship(
        "VideoClip",
        foreign_keys=[from_clip_id],
        back_populates="outgoing_transition"
    )
    to_clip = relationship(
        "VideoClip",
        foreign_keys=[to_clip_id],
        back_populates="incoming_transition"
    )

    def __repr__(self):
        return f"<Transition {self.type.value}: clip {self.from_clip_id} -> {self.to_clip_id}>"
