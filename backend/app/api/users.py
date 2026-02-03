"""
User management API endpoints.
Includes onboarding, review/feedback, and usage tracking.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
import httpx
import logging

from app.database import get_db
from app.config import settings
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
logger = logging.getLogger(__name__)


async def send_to_google_forms(review_data: dict, user_email: str):
    """
    Send review data to Google Forms for external collection.
    This runs in the background and doesn't block the API response.
    """
    if not settings.GOOGLE_FORM_ID:
        logger.warning("Google Forms not configured (GOOGLE_FORM_ID is empty)")
        return

    # Note: The form URL uses the form ID directly, not the /e/ prefilled format
    form_url = f"https://docs.google.com/forms/d/e/{settings.GOOGLE_FORM_ID}/formResponse"
    logger.info(f"Submitting to Google Form: {form_url}")

    # Build form data with entry IDs
    form_data = {}

    if settings.GOOGLE_FORM_ENTRY_RATING and review_data.get("rating"):
        form_data[settings.GOOGLE_FORM_ENTRY_RATING] = str(review_data["rating"])

    if settings.GOOGLE_FORM_ENTRY_RECOMMEND and review_data.get("would_recommend") is not None:
        form_data[settings.GOOGLE_FORM_ENTRY_RECOMMEND] = "Yes" if review_data["would_recommend"] else "No"

    if settings.GOOGLE_FORM_ENTRY_USE_CASE and review_data.get("use_case"):
        form_data[settings.GOOGLE_FORM_ENTRY_USE_CASE] = review_data["use_case"]

    if settings.GOOGLE_FORM_ENTRY_FEATURE_REQUEST and review_data.get("feature_request"):
        form_data[settings.GOOGLE_FORM_ENTRY_FEATURE_REQUEST] = review_data["feature_request"]

    if settings.GOOGLE_FORM_ENTRY_PAIN_POINTS and review_data.get("pain_points"):
        form_data[settings.GOOGLE_FORM_ENTRY_PAIN_POINTS] = review_data["pain_points"]

    if settings.GOOGLE_FORM_ENTRY_FEEDBACK and review_data.get("feedback"):
        form_data[settings.GOOGLE_FORM_ENTRY_FEEDBACK] = review_data["feedback"]

    if settings.GOOGLE_FORM_ENTRY_EMAIL and user_email:
        form_data[settings.GOOGLE_FORM_ENTRY_EMAIL] = user_email

    if not form_data:
        logger.warning("No form data to submit")
        return

    try:
        logger.info(f"Sending to Google Forms with data: {form_data}")

        # Google Forms works best with these specific headers
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Origin": "https://docs.google.com",
            "Referer": f"https://docs.google.com/forms/d/e/{settings.GOOGLE_FORM_ID}/viewform",
        }

        async with httpx.AsyncClient(follow_redirects=False) as client:
            response = await client.post(
                form_url,
                data=form_data,
                headers=headers,
                timeout=10.0
            )
            # Google Forms returns 302 redirect on success, or 200 if it shows confirmation
            logger.info(f"Google Forms response: status={response.status_code}")
            if response.status_code in [200, 302, 303]:
                logger.info("Google Forms submission successful!")
            else:
                logger.warning(f"Google Forms returned unexpected status: {response.status_code}")
    except Exception as e:
        # Don't fail the review submission if Google Forms fails
        logger.error(f"Failed to submit to Google Forms: {e}", exc_info=True)


@router.post("/me/review/test-google-forms")
async def test_google_forms(
    current_user: User = Depends(get_current_user),
):
    """
    Test Google Forms submission with sample data.
    Use this to verify your form configuration is correct.
    """
    if not settings.GOOGLE_FORM_ID:
        return {
            "success": False,
            "error": "GOOGLE_FORM_ID not configured in .env"
        }

    test_data = {
        "rating": 5,
        "would_recommend": True,
        "use_case": "Test submission from CreatorCrafter",
        "feature_request": "This is a test feature request",
        "pain_points": "This is a test pain point",
        "feedback": "This is test feedback - please ignore",
    }

    # Run synchronously for immediate feedback
    import httpx

    form_url = f"https://docs.google.com/forms/d/e/{settings.GOOGLE_FORM_ID}/formResponse"

    form_data = {}
    if settings.GOOGLE_FORM_ENTRY_RATING:
        form_data[settings.GOOGLE_FORM_ENTRY_RATING] = str(test_data["rating"])
    if settings.GOOGLE_FORM_ENTRY_RECOMMEND:
        form_data[settings.GOOGLE_FORM_ENTRY_RECOMMEND] = "Yes"
    if settings.GOOGLE_FORM_ENTRY_USE_CASE:
        form_data[settings.GOOGLE_FORM_ENTRY_USE_CASE] = test_data["use_case"]
    if settings.GOOGLE_FORM_ENTRY_FEATURE_REQUEST:
        form_data[settings.GOOGLE_FORM_ENTRY_FEATURE_REQUEST] = test_data["feature_request"]
    if settings.GOOGLE_FORM_ENTRY_PAIN_POINTS:
        form_data[settings.GOOGLE_FORM_ENTRY_PAIN_POINTS] = test_data["pain_points"]
    if settings.GOOGLE_FORM_ENTRY_FEEDBACK:
        form_data[settings.GOOGLE_FORM_ENTRY_FEEDBACK] = test_data["feedback"]
    if settings.GOOGLE_FORM_ENTRY_EMAIL:
        form_data[settings.GOOGLE_FORM_ENTRY_EMAIL] = current_user.email

    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.post(
                form_url,
                data=form_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10.0
            )

        return {
            "success": response.status_code == 200,
            "status_code": response.status_code,
            "form_url": form_url,
            "data_sent": form_data,
            "config": {
                "GOOGLE_FORM_ID": settings.GOOGLE_FORM_ID,
                "GOOGLE_FORM_ENTRY_RATING": settings.GOOGLE_FORM_ENTRY_RATING,
                "GOOGLE_FORM_ENTRY_RECOMMEND": settings.GOOGLE_FORM_ENTRY_RECOMMEND,
                "GOOGLE_FORM_ENTRY_USE_CASE": settings.GOOGLE_FORM_ENTRY_USE_CASE,
                "GOOGLE_FORM_ENTRY_FEATURE_REQUEST": settings.GOOGLE_FORM_ENTRY_FEATURE_REQUEST,
                "GOOGLE_FORM_ENTRY_PAIN_POINTS": settings.GOOGLE_FORM_ENTRY_PAIN_POINTS,
                "GOOGLE_FORM_ENTRY_FEEDBACK": settings.GOOGLE_FORM_ENTRY_FEEDBACK,
                "GOOGLE_FORM_ENTRY_EMAIL": settings.GOOGLE_FORM_ENTRY_EMAIL,
            },
            "message": "Check your Google Form responses to see if the test data was submitted"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "form_url": form_url,
            "data_sent": form_data,
        }


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
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit app review and feedback for idea validation.
    Quick survey with rating and optional questions.
    Also sends to Google Forms if configured.
    """
    current_user.review_completed = True
    current_user.review_completed_at = datetime.utcnow()
    current_user.review_rating = review.rating
    current_user.review_would_recommend = review.would_recommend

    # Combine all feedback
    feedback_parts = []
    if review.email:
        feedback_parts.append(f"Contact email: {review.email}")
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

    # Send to Google Forms in background (non-blocking)
    # Use provided email if available, otherwise fall back to user's account email
    if settings.GOOGLE_FORM_ID:
        review_data = {
            "rating": review.rating,
            "would_recommend": review.would_recommend,
            "use_case": review.use_case,
            "feature_request": review.feature_request,
            "pain_points": review.pain_points,
            "feedback": review.feedback,
            "email": review.email or current_user.email,
        }
        background_tasks.add_task(send_to_google_forms, review_data, review.email or current_user.email)

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
