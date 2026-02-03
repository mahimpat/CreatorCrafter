"""
Pydantic schemas for user-related requests and responses.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)


class UserResponse(BaseModel):
    """Schema for user responses."""
    id: int
    email: str
    username: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    # Onboarding
    onboarding_completed: bool = False
    # Usage limits
    project_count: int = 0
    max_projects: int = 3
    sfx_seconds_used: float = 0.0
    sfx_seconds_remaining: float = 180.0
    # Review status
    review_completed: bool = False

    class Config:
        from_attributes = True


class UserUsageResponse(BaseModel):
    """Schema for user usage/limits response."""
    project_count: int
    max_projects: int
    can_create_project: bool
    sfx_seconds_used: float
    sfx_seconds_remaining: float
    can_generate_sfx: bool
    total_time_in_app: int
    onboarding_completed: bool
    review_completed: bool

    class Config:
        from_attributes = True


class OnboardingComplete(BaseModel):
    """Schema for completing onboarding."""
    steps_completed: Optional[list[str]] = None


class ReviewSubmit(BaseModel):
    """Schema for submitting app review/feedback."""
    rating: int = Field(..., ge=1, le=5, description="Star rating 1-5")
    feedback: Optional[str] = Field(None, max_length=2000)
    would_recommend: Optional[bool] = None
    # Quick survey questions for idea validation
    use_case: Optional[str] = Field(None, max_length=500, description="Primary use case")
    feature_request: Optional[str] = Field(None, max_length=500, description="Most wanted feature")
    pain_points: Optional[str] = Field(None, max_length=500, description="Current pain points")
    # Contact info
    email: Optional[EmailStr] = Field(None, description="Optional email for follow-up")


class ReviewResponse(BaseModel):
    """Schema for review submission response."""
    success: bool
    message: str


class TimeTrackingUpdate(BaseModel):
    """Schema for updating time spent in app."""
    seconds_to_add: int = Field(..., ge=0, le=3600, description="Seconds to add (max 1 hour per update)")


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str


class PasswordChange(BaseModel):
    """Schema for password change request."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
