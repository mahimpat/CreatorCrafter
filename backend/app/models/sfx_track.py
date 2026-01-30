"""
SFX Track model for sound effect tracks.
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class SFXTrack(Base):
    """Sound effect track model."""

    __tablename__ = "sfx_tracks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    filename = Column(String(255), nullable=False)  # Filename in project storage
    start_time = Column(Float, nullable=False)      # Seconds
    duration = Column(Float, nullable=False)        # Seconds
    volume = Column(Float, default=1.0)             # 0.0 to 1.0
    prompt = Column(String(500), nullable=True)     # Original generation prompt

    # Relationships
    project = relationship("Project", back_populates="sfx_tracks")

    def __repr__(self):
        return f"<SFXTrack {self.filename} at {self.start_time}s>"
