"""
VideoClip model for multi-clip video projects.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class VideoClip(Base):
    """Individual video clip in a multi-clip project."""

    __tablename__ = "video_clips"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # File information
    filename = Column(String(255), nullable=False)  # Stored filename
    original_name = Column(String(255), nullable=True)  # Original upload name

    # Ordering
    original_order = Column(Integer, nullable=False)  # Order when uploaded
    timeline_order = Column(Integer, nullable=False)  # Current order on timeline

    # Trim points (in seconds)
    start_trim = Column(Float, default=0.0)  # Trim from beginning
    end_trim = Column(Float, default=0.0)  # Trim from end

    # Timeline position (in seconds)
    timeline_start = Column(Float, default=0.0)  # Position on final timeline

    # Clip metadata
    duration = Column(Float, nullable=True)  # Original clip duration in seconds
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    fps = Column(Float, nullable=True)
    clip_metadata = Column(JSON, nullable=True)  # Full FFprobe metadata

    # AI Analysis for this clip
    analysis = Column(JSON, nullable=True)  # BLIP analysis, scene detection, etc.

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="video_clips")
    outgoing_transition = relationship(
        "Transition",
        foreign_keys="Transition.from_clip_id",
        back_populates="from_clip",
        uselist=False
    )
    incoming_transition = relationship(
        "Transition",
        foreign_keys="Transition.to_clip_id",
        back_populates="to_clip",
        uselist=False
    )

    @property
    def effective_duration(self) -> float:
        """Get duration after trimming."""
        if self.duration is None:
            return 0.0
        return max(0.0, self.duration - self.start_trim - self.end_trim)

    def __repr__(self):
        return f"<VideoClip {self.id}: {self.original_name or self.filename}>"
