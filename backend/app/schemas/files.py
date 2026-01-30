"""
Pydantic schemas for file management requests and responses.
"""
from pydantic import BaseModel
from typing import List, Optional


class FileInfo(BaseModel):
    """Schema for file information."""
    filename: str
    url: str
    asset_type: str


class FileListResponse(BaseModel):
    """Schema for file list response."""
    source: List[FileInfo] = []
    sfx: List[FileInfo] = []
    exports: List[FileInfo] = []
