"""
File service for managing user file storage.
"""
import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional
import aiofiles
from fastapi import UploadFile

from app.config import settings


class FileService:
    """Service for managing file storage operations."""

    def __init__(self):
        self.storage_root = Path(settings.STORAGE_PATH)

    def get_user_storage_path(self, user_id: int) -> Path:
        """Get the storage path for a user."""
        path = self.storage_root / "users" / str(user_id)
        path.mkdir(parents=True, exist_ok=True)
        return path

    def get_project_storage_path(self, user_id: int, project_id: int) -> Path:
        """Get the storage path for a project."""
        path = self.get_user_storage_path(user_id) / "projects" / str(project_id)
        path.mkdir(parents=True, exist_ok=True)
        return path

    def get_asset_path(self, user_id: int, project_id: int, asset_type: str) -> Path:
        """
        Get path for asset type.

        Args:
            user_id: User ID
            project_id: Project ID
            asset_type: One of 'source', 'sfx', 'exports'

        Returns:
            Path to the asset directory
        """
        path = self.get_project_storage_path(user_id, project_id) / asset_type
        path.mkdir(parents=True, exist_ok=True)
        return path

    def create_project_directories(self, user_id: int, project_id: int):
        """Create all directories for a new project."""
        project_path = self.get_project_storage_path(user_id, project_id)
        (project_path / "source").mkdir(parents=True, exist_ok=True)
        (project_path / "sfx").mkdir(parents=True, exist_ok=True)
        (project_path / "exports").mkdir(parents=True, exist_ok=True)

    async def save_uploaded_file(
        self,
        file: UploadFile,
        user_id: int,
        project_id: int,
        asset_type: str
    ) -> str:
        """
        Save an uploaded file to project storage.

        Args:
            file: The uploaded file
            user_id: User ID
            project_id: Project ID
            asset_type: One of 'source', 'sfx', 'exports'

        Returns:
            The filename (not full path)
        """
        # Generate unique filename
        ext = Path(file.filename).suffix if file.filename else ""
        filename = f"{uuid.uuid4().hex}{ext}"

        # Get destination path
        dest_dir = self.get_asset_path(user_id, project_id, asset_type)
        dest_path = dest_dir / filename

        # Save file
        async with aiofiles.open(dest_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        return filename

    def save_file_sync(
        self,
        content: bytes,
        user_id: int,
        project_id: int,
        asset_type: str,
        filename: str
    ) -> str:
        """
        Save file content synchronously.

        Args:
            content: File content as bytes
            user_id: User ID
            project_id: Project ID
            asset_type: One of 'source', 'sfx', 'exports'
            filename: Desired filename

        Returns:
            The filename
        """
        dest_dir = self.get_asset_path(user_id, project_id, asset_type)
        dest_path = dest_dir / filename

        with open(dest_path, 'wb') as f:
            f.write(content)

        return filename

    def get_file_path(
        self,
        user_id: int,
        project_id: int,
        asset_type: str,
        filename: str
    ) -> str:
        """Get the full file path for a file."""
        return str(self.get_asset_path(user_id, project_id, asset_type) / filename)

    def get_file_url(
        self,
        user_id: int,
        project_id: int,
        asset_type: str,
        filename: str
    ) -> str:
        """Get the URL for accessing a file via the static files mount."""
        return f"/storage/users/{user_id}/projects/{project_id}/{asset_type}/{filename}"

    def list_files(
        self,
        user_id: int,
        project_id: int,
        asset_type: str
    ) -> List[str]:
        """List all files in an asset directory."""
        asset_dir = self.get_asset_path(user_id, project_id, asset_type)
        if not asset_dir.exists():
            return []
        return [f.name for f in asset_dir.iterdir() if f.is_file()]

    def delete_file(
        self,
        user_id: int,
        project_id: int,
        asset_type: str,
        filename: str
    ) -> bool:
        """Delete a file from project storage."""
        file_path = self.get_asset_path(user_id, project_id, asset_type) / filename
        if file_path.exists():
            file_path.unlink()
            return True
        return False

    def delete_project_files(self, user_id: int, project_id: int):
        """Delete all files for a project."""
        project_path = self.get_project_storage_path(user_id, project_id)
        if project_path.exists():
            shutil.rmtree(project_path)

    def file_exists(
        self,
        user_id: int,
        project_id: int,
        asset_type: str,
        filename: str
    ) -> bool:
        """Check if a file exists."""
        file_path = self.get_asset_path(user_id, project_id, asset_type) / filename
        return file_path.exists()


# Global file service instance
file_service = FileService()
