"""
Text Overlay model for text overlays on video.
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class TextOverlay(Base):
    """Text overlay model."""

    __tablename__ = "text_overlays"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    text = Column(String(500), nullable=False)
    start_time = Column(Float, nullable=False)  # Seconds
    end_time = Column(Float, nullable=False)    # Seconds

    # Style configuration stored as JSON
    style = Column(JSON, default=lambda: TextOverlay.get_default_style())

    # Relationships
    project = relationship("Project", back_populates="text_overlays")

    @staticmethod
    def get_default_style() -> dict:
        """Get default overlay style."""
        return {
            "fontSize": 32,
            "fontFamily": "Arial",
            "color": "#ffffff",
            "backgroundColor": "transparent",
            "position": {"x": 50, "y": 50},  # Percentage from top-left
            "animation": "none"  # none, fade, slide, zoom
        }

    def __repr__(self):
        return f"<TextOverlay {self.start_time}-{self.end_time}: {self.text[:30]}>"
