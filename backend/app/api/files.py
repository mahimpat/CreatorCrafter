"""
File management API endpoints.
"""
import os
import mimetypes
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.schemas.files import FileInfo, FileListResponse
from app.api.deps import get_current_user, get_user_from_token
from app.services.file_service import file_service
from app.config import settings

router = APIRouter()


@router.post("/{project_id}/upload")
async def upload_file(
    project_id: int,
    file: UploadFile = File(...),
    asset_type: str = "sfx",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a file to a project.
    asset_type can be 'source', 'sfx', or 'exports'
    """
    # Verify project
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if asset_type not in ["source", "sfx", "exports"]:
        raise HTTPException(status_code=400, detail="Invalid asset type")

    # Save file
    filename = await file_service.save_uploaded_file(
        file, current_user.id, project_id, asset_type
    )

    return {
        "filename": filename,
        "original_name": file.filename,
        "url": file_service.get_file_url(current_user.id, project_id, asset_type, filename),
        "asset_type": asset_type
    }


@router.get("/{project_id}/files", response_model=FileListResponse)
async def list_files(
    project_id: int,
    asset_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all files in a project, optionally filtered by asset type.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files = {
        "source": [],
        "sfx": [],
        "exports": []
    }

    asset_types = [asset_type] if asset_type else ["source", "sfx", "exports"]

    for at in asset_types:
        file_list = file_service.list_files(current_user.id, project_id, at)
        files[at] = [
            {
                "filename": f,
                "url": file_service.get_file_url(current_user.id, project_id, at, f),
                "asset_type": at
            }
            for f in file_list
        ]

    return files


@router.get("/{project_id}/stream/{asset_type}/{filename}")
async def stream_file(
    project_id: int,
    asset_type: str,
    filename: str,
    request: Request,
    token: Optional[str] = Query(None, description="JWT token for authentication (used by video elements)"),
    db: Session = Depends(get_db)
):
    """
    Stream a file with support for range requests (for video seeking).
    Accepts authentication via Authorization header OR token query parameter.
    Query parameter auth is needed for HTML video elements that can't set headers.
    """
    # Try to get user from query param token (for video elements)
    current_user = None
    if token:
        current_user = get_user_from_token(token, db)

    # If no query param token, try Authorization header
    if not current_user:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            header_token = auth_header[7:]
            current_user = get_user_from_token(header_token, db)

    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_path = file_service.get_file_path(
        current_user.id, project_id, asset_type, filename
    )

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    file_size = os.path.getsize(file_path)
    mime_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"

    # Handle range requests for video/audio seeking
    range_header = request.headers.get("range")

    if range_header:
        start, end = parse_range_header(range_header, file_size)

        def iterfile():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            iterfile(),
            status_code=206,
            media_type=mime_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(end - start + 1),
            }
        )

    # Full file response
    return FileResponse(
        file_path,
        media_type=mime_type,
        headers={"Accept-Ranges": "bytes"}
    )


@router.delete("/{project_id}/files/{asset_type}/{filename}")
async def delete_file(
    project_id: int,
    asset_type: str,
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a file from a project.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_path = file_service.get_file_path(
        current_user.id, project_id, asset_type, filename
    )

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    os.remove(file_path)

    return {"message": "File deleted successfully"}


def parse_range_header(range_header: str, file_size: int) -> tuple:
    """
    Parse HTTP Range header and return start/end positions.
    """
    try:
        range_spec = range_header.replace("bytes=", "")
        parts = range_spec.split("-")

        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1

        # Clamp values
        start = max(0, start)
        end = min(end, file_size - 1)

        return start, end
    except (ValueError, IndexError):
        return 0, file_size - 1
