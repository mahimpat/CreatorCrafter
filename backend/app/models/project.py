"""
Project model for video editing projects.
"""
import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class ProjectMode(str, enum.Enum):
    """Editing mode for the project."""
    MANUAL = "manual"
    SEMI_MANUAL = "semi_manual"
    AUTOMATIC = "automatic"


class Project(Base):
    """Video editing project model."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Editing mode
    mode = Column(Enum(ProjectMode), default=ProjectMode.SEMI_MANUAL, nullable=False)

    # Video information (for single-video projects or stitched output)
    video_filename = Column(String(255), nullable=True)
    video_original_name = Column(String(255), nullable=True)
    video_duration = Column(Integer, nullable=True)  # Duration in milliseconds
    video_metadata = Column(JSON, nullable=True)  # FFprobe metadata

    # AI Analysis results
    analysis_results = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_opened = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="projects")
    subtitles = relationship(
        "Subtitle",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="Subtitle.start_time"
    )
    sfx_tracks = relationship(
        "SFXTrack",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="SFXTrack.start_time"
    )
    text_overlays = relationship(
        "TextOverlay",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="TextOverlay.start_time"
    )
    video_clips = relationship(
        "VideoClip",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="VideoClip.timeline_order"
    )
    transitions = relationship(
        "Transition",
        back_populates="project",
        cascade="all, delete-orphan"
    )
    background_audio = relationship(
        "BackgroundAudio",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="BackgroundAudio.start_time"
    )

    def __repr__(self):
        return f"<Project {self.name}>"
