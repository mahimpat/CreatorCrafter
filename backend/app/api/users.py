"""
User management API endpoints.
Includes onboarding, review/feedback, and usage tracking.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    UserUsageResponse,
    OnboardingComplete,
    ReviewSubmit,
    ReviewResponse,
    TimeTrackingUpdate,
)
from app.models.user import User, MAX_PROJECTS_PER_USER, MAX_SFX_SECONDS_PER_USER
from app.api.deps import get_current_user
from app.services.auth_service import get_password_hash, verify_password

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user's information.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's information.
    """
    # Check if new email is already taken by another user
    if user_data.email and user_data.email != current_user.email:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        current_user.email = user_data.email

    # Check if new username is already taken
    if user_data.username and user_data.username != current_user.username:
        existing = db.query(User).filter(User.username == user_data.username).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        current_user.username = user_data.username

    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/me/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change current user's password.
    """
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )

    current_user.hashed_password = get_password_hash(new_password)
    db.commit()

    return {"message": "Password changed successfully"}


@router.delete("/me")
async def delete_current_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete current user's account and all associated data.
    """
    # TODO: Delete user's files from storage

    db.delete(current_user)
    db.commit()

    return {"message": "Account deleted successfully"}


# =============================================================================
# USAGE & LIMITS
# =============================================================================

@router.get("/me/usage", response_model=UserUsageResponse)
async def get_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's usage statistics and limits.
    """
    db.refresh(current_user)

    return {
        "project_count": current_user.project_count,
        "max_projects": MAX_PROJECTS_PER_USER,
        "can_create_project": current_user.can_create_project,
        "sfx_seconds_used": current_user.sfx_seconds_used or 0,
        "sfx_seconds_remaining": current_user.sfx_seconds_remaining,
        "can_generate_sfx": current_user.can_generate_sfx,
        "total_time_in_app": current_user.total_time_in_app or 0,
        "onboarding_completed": current_user.onboarding_completed or False,
        "review_completed": current_user.review_completed or False,
    }


@router.get("/me/limits")
async def get_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's usage limits with detailed breakdown.
    """
    db.refresh(current_user)

    return {
        "projects": {
            "used": current_user.project_count,
            "max": MAX_PROJECTS_PER_USER,
            "remaining": MAX_PROJECTS_PER_USER - current_user.project_count,
            "can_create": current_user.can_create_project,
        },
        "sfx": {
            "seconds_used": current_user.sfx_seconds_used or 0,
            "seconds_max": MAX_SFX_SECONDS_PER_USER,
            "seconds_remaining": current_user.sfx_seconds_remaining,
            "can_generate": current_user.can_generate_sfx,
            "formatted_used": f"{(current_user.sfx_seconds_used or 0) / 60:.1f} min",
            "formatted_remaining": f"{current_user.sfx_seconds_remaining / 60:.1f} min",
        }
    }


# =============================================================================
# ONBOARDING
# =============================================================================

@router.get("/me/onboarding/status")
async def get_onboarding_status(
    current_user: User = Depends(get_current_user)
):
    """
    Get onboarding status for current user.
    """
    return {
        "completed": current_user.onboarding_completed or False,
        "completed_at": current_user.onboarding_completed_at,
    }


@router.post("/me/onboarding/complete", response_model=UserResponse)
async def complete_onboarding(
    data: OnboardingComplete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark onboarding as completed for current user.
    """
    current_user.onboarding_completed = True
    current_user.onboarding_completed_at = datetime.utcnow()

    db.commit()
    db.refresh(current_user)

    return current_user


# =============================================================================
# REVIEW & FEEDBACK (Idea Validation)
# =============================================================================

@router.get("/me/review/status")
async def get_review_status(
    current_user: User = Depends(get_current_user)
):
    """
    Get review status and check if review prompt should be shown.
    Prompt after 15 minutes (900 seconds) in app.
    """
    total_time = current_user.total_time_in_app or 0

    should_prompt = (
        not current_user.review_completed and
        not current_user.review_prompted and
        total_time >= 900  # 15 minutes
    )

    return {
        "completed": current_user.review_completed or False,
        "completed_at": current_user.review_completed_at,
        "prompted": current_user.review_prompted or False,
        "should_prompt": should_prompt,
        "total_time_in_app": total_time,
        "time_until_prompt": max(0, 900 - total_time),
    }


@router.post("/me/review", response_model=ReviewResponse)
async def submit_review(
    review: ReviewSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit app review and feedback for idea validation.
    Quick survey with rating and optional questions.
    """
    current_user.review_completed = True
    current_user.review_completed_at = datetime.utcnow()
    current_user.review_rating = review.rating
    current_user.review_would_recommend = review.would_recommend

    # Combine all feedback
    feedback_parts = []
    if review.feedback:
        feedback_parts.append(f"General feedback: {review.feedback}")
    if review.use_case:
        feedback_parts.append(f"Primary use case: {review.use_case}")
    if review.feature_request:
        feedback_parts.append(f"Most wanted feature: {review.feature_request}")
    if review.pain_points:
        feedback_parts.append(f"Pain points: {review.pain_points}")

    current_user.review_feedback = "\n\n".join(feedback_parts) if feedback_parts else None

    db.commit()

    return {
        "success": True,
        "message": "Thank you for your feedback! It helps us improve CreatorCrafter."
    }


@router.post("/me/review/prompted")
async def mark_review_prompted(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark that review prompt was shown to user.
    """
    current_user.review_prompted = True
    current_user.review_prompted_at = datetime.utcnow()

    db.commit()

    return {"success": True}


@router.post("/me/review/dismiss")
async def dismiss_review(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Dismiss review prompt (user chose not to review now).
    """
    current_user.review_prompted = True
    current_user.review_prompted_at = datetime.utcnow()

    db.commit()

    return {"success": True, "message": "No problem! We may ask again later."}


# =============================================================================
# TIME TRACKING
# =============================================================================

@router.post("/me/time-tracking")
async def update_time_tracking(
    data: TimeTrackingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update time spent in app (called periodically by frontend).
    Returns whether review should be prompted.
    """
    current_user.total_time_in_app = (current_user.total_time_in_app or 0) + data.seconds_to_add

    db.commit()

    # Check if review should be prompted
    should_prompt_review = (
        not current_user.review_completed and
        not current_user.review_prompted and
        current_user.total_time_in_app >= 900  # 15 minutes
    )

    return {
        "total_time_in_app": current_user.total_time_in_app,
        "should_prompt_review": should_prompt_review,
    }
