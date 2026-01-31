"""
User model for authentication and usage tracking.
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


# Usage limits
MAX_PROJECTS_PER_USER = 3
MAX_SFX_SECONDS_PER_USER = 180  # 3 minutes


class User(Base):
    """User account model with usage tracking."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Onboarding
    onboarding_completed = Column(Boolean, default=False)
    onboarding_completed_at = Column(DateTime, nullable=True)

    # Usage tracking
    sfx_seconds_used = Column(Float, default=0.0)  # Total SFX seconds generated
    total_time_in_app = Column(Integer, default=0)  # Total seconds spent in app

    # Review/Feedback
    review_prompted = Column(Boolean, default=False)
    review_prompted_at = Column(DateTime, nullable=True)
    review_completed = Column(Boolean, default=False)
    review_completed_at = Column(DateTime, nullable=True)
    review_rating = Column(Integer, nullable=True)  # 1-5 stars
    review_feedback = Column(Text, nullable=True)
    review_would_recommend = Column(Boolean, nullable=True)

    # Relationships
    projects = relationship(
        "Project",
        back_populates="owner",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.username}>"

    @property
    def project_count(self) -> int:
        """Get current project count."""
        return len(self.projects) if self.projects else 0

    @property
    def can_create_project(self) -> bool:
        """Check if user can create more projects."""
        return self.project_count < MAX_PROJECTS_PER_USER

    @property
    def sfx_seconds_remaining(self) -> float:
        """Get remaining SFX generation seconds."""
        return max(0, MAX_SFX_SECONDS_PER_USER - self.sfx_seconds_used)

    @property
    def can_generate_sfx(self) -> bool:
        """Check if user has SFX quota remaining."""
        return self.sfx_seconds_remaining > 0
