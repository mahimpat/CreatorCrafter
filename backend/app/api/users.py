"""
User management API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.models.user import User
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
