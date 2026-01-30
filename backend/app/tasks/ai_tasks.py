"""
Background tasks for AI processing.
Uses FastAPI BackgroundTasks for simpler deployment.
For production with heavy load, consider migrating to Celery.
"""
import asyncio
from typing import Optional, Callable
from datetime import datetime

from app.database import SessionLocal
from app.models.project import Project
from app.api.websocket import get_connection_manager
from app.services.file_service import file_service


async def send_progress(
    user_id: int,
    task_type: str,
    task_id: str,
    project_id: int,
    stage: str,
    progress: int,
    message: str = ""
):
    """Helper to send progress updates via WebSocket."""
    manager = get_connection_manager()
    await manager.send_progress(
        user_id=user_id,
        task_type=task_type,
        task_id=task_id,
        project_id=project_id,
        stage=stage,
        progress=progress,
        message=message
    )


def run_video_analysis(
    task_id: str,
    project_id: int,
    user_id: int,
    video_path: str,
    audio_path: str
):
    """
    Run video analysis in background.
    Imports AI modules only when needed to save memory.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        # Send start notification
        loop.run_until_complete(send_progress(
            user_id, "video_analysis", task_id, project_id,
            "starting", 0, "Initializing video analysis..."
        ))

        # Import AI module
        loop.run_until_complete(send_progress(
            user_id, "video_analysis", task_id, project_id,
            "loading_models", 5, "Loading AI models..."
        ))

        from app.ai.video_analyzer import analyze_video

        def progress_callback(stage: str, progress: int, message: str):
            """Callback for analysis progress."""
            # Map progress to 5-95 range (5% for init, 95% for completion)
            mapped_progress = 5 + int(progress * 0.9)
            loop.run_until_complete(send_progress(
                user_id, "video_analysis", task_id, project_id,
                stage, mapped_progress, message
            ))

        # Run analysis
        results = analyze_video(
            video_path=video_path,
            audio_path=audio_path,
            progress_callback=progress_callback
        )

        # Save results to database
        db = SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                project.analysis_results = results
                project.updated_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()

        # Send completion
        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_complete(
            user_id, "video_analysis", task_id, project_id, results
        ))

    except Exception as e:
        # Send error
        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_error(
            user_id, "video_analysis", task_id, project_id, str(e)
        ))

    finally:
        loop.close()


def run_sfx_generation(
    task_id: str,
    project_id: int,
    user_id: int,
    prompt: str,
    duration: float,
    output_path: str,
    output_filename: str
):
    """
    Run SFX generation in background.
    Imports AI modules only when needed to save memory.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        # Send start notification
        loop.run_until_complete(send_progress(
            user_id, "sfx_generation", task_id, project_id,
            "starting", 0, "Initializing SFX generation..."
        ))

        # Import AI module
        loop.run_until_complete(send_progress(
            user_id, "sfx_generation", task_id, project_id,
            "loading_model", 10, "Loading AudioGen model..."
        ))

        from app.ai.audiocraft_generator import generate_sfx

        def progress_callback(stage: str, progress: int):
            """Callback for generation progress."""
            mapped_progress = 10 + int(progress * 0.85)
            loop.run_until_complete(send_progress(
                user_id, "sfx_generation", task_id, project_id,
                stage, mapped_progress, f"Generating audio: {progress}%"
            ))

        # Generate SFX
        result_path = generate_sfx(
            prompt=prompt,
            duration=duration,
            output_path=output_path,
            progress_callback=progress_callback
        )

        # Send completion with file URL
        manager = get_connection_manager()
        file_url = file_service.get_file_url(user_id, project_id, "sfx", output_filename)

        loop.run_until_complete(manager.send_task_complete(
            user_id, "sfx_generation", task_id, project_id,
            {
                "filename": output_filename,
                "url": file_url,
                "prompt": prompt,
                "duration": duration
            }
        ))

    except Exception as e:
        # Send error
        manager = get_connection_manager()
        loop.run_until_complete(manager.send_task_error(
            user_id, "sfx_generation", task_id, project_id, str(e)
        ))

    finally:
        loop.close()
