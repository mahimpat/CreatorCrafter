"""
CreatorCrafter FastAPI Application
Main entry point for the web backend.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.database import init_db
from app.api import auth, users, projects, video, ai, files, clips, transitions, bgm
from app.api.websocket import router as websocket_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs startup and shutdown code.
    """
    # Startup
    print("Starting CreatorCrafter API...")

    # Ensure storage directory exists
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    os.makedirs(os.path.join(settings.STORAGE_PATH, "users"), exist_ok=True)

    # Initialize database tables
    init_db()
    print("Database initialized")

    yield

    # Shutdown
    print("Shutting down CreatorCrafter API...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered video content creation platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving user uploads
# Files will be accessible at /storage/users/{user_id}/projects/{project_id}/...
if os.path.exists(settings.STORAGE_PATH):
    app.mount(
        "/storage",
        StaticFiles(directory=settings.STORAGE_PATH),
        name="storage"
    )

# Include API routers
app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_PREFIX}/auth",
    tags=["Authentication"]
)

app.include_router(
    users.router,
    prefix=f"{settings.API_V1_PREFIX}/users",
    tags=["Users"]
)

app.include_router(
    projects.router,
    prefix=f"{settings.API_V1_PREFIX}/projects",
    tags=["Projects"]
)

app.include_router(
    video.router,
    prefix=f"{settings.API_V1_PREFIX}/video",
    tags=["Video Processing"]
)

app.include_router(
    ai.router,
    prefix=f"{settings.API_V1_PREFIX}/ai",
    tags=["AI/ML"]
)

app.include_router(
    files.router,
    prefix=f"{settings.API_V1_PREFIX}/files",
    tags=["File Management"]
)

app.include_router(
    clips.router,
    prefix=f"{settings.API_V1_PREFIX}/projects",
    tags=["Video Clips"]
)

app.include_router(
    transitions.router,
    prefix=f"{settings.API_V1_PREFIX}/projects",
    tags=["Transitions"]
)

app.include_router(
    bgm.router,
    prefix=f"{settings.API_V1_PREFIX}/projects",
    tags=["Background Audio"]
)

# WebSocket router for real-time progress updates
app.include_router(
    websocket_router,
    tags=["WebSocket"]
)


@app.get("/")
async def root():
    """Root endpoint - API health check."""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}
