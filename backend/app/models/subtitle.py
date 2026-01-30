"""
Subtitle model for caption/subtitle tracks.
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class Subtitle(Base):
    """Subtitle/caption track model."""

    __tablename__ = "subtitles"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    text = Column(String(1000), nullable=False)
    start_time = Column(Float, nullable=False)  # Seconds
    end_time = Column(Float, nullable=False)    # Seconds

    # Style configuration stored as JSON
    style = Column(JSON, default=lambda: Subtitle.get_default_style())

    # Relationships
    project = relationship("Project", back_populates="subtitles")

    @staticmethod
    def get_default_style() -> dict:
        """Get default subtitle style."""
        return {
            "fontSize": 24,
            "fontFamily": "Arial",
            "color": "#ffffff",
            "backgroundColor": "rgba(0,0,0,0.7)",
            "position": "bottom"
        }

    def __repr__(self):
        return f"<Subtitle {self.start_time}-{self.end_time}: {self.text[:30]}>"
