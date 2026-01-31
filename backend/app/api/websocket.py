"""
WebSocket endpoint for real-time progress updates.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, Optional
import asyncio
import json

from app.database import SessionLocal
from app.api.deps import get_current_user_ws

router = APIRouter()


class ConnectionManager:
    """
    Manages WebSocket connections for real-time updates.
    """

    def __init__(self):
        # Map of user_id -> WebSocket connection
        self.active_connections: Dict[int, WebSocket] = {}
        # Map of task_id -> progress data
        self.task_progress: Dict[str, dict] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """Accept and store a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        """Remove a WebSocket connection."""
        self.active_connections.pop(user_id, None)

    async def send_personal_message(self, user_id: int, message: dict):
        """Send a message to a specific user."""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception:
                # Connection might be closed
                self.disconnect(user_id)

    async def send_progress(
        self,
        user_id: int,
        task_type: str,
        task_id: str,
        project_id: int,
        stage: str,
        progress: int,
        message: str = "",
        data: Optional[dict] = None
    ):
        """Send a progress update to a user."""
        update = {
            "type": task_type,
            "task_id": task_id,
            "project_id": project_id,
            "stage": stage,
            "progress": progress,
            "message": message,
        }
        if data:
            update["data"] = data

        # Store progress for status queries
        self.task_progress[task_id] = update

        await self.send_personal_message(user_id, update)

    async def send_task_complete(
        self,
        user_id: int,
        task_type: str,
        task_id: str,
        project_id: int,
        result: dict
    ):
        """Send task completion notification."""
        update = {
            "type": f"{task_type}_complete",
            "task_id": task_id,
            "project_id": project_id,
            "stage": "completed",
            "progress": 100,
            "result": result
        }

        self.task_progress[task_id] = update
        await self.send_personal_message(user_id, update)

    async def send_task_error(
        self,
        user_id: int,
        task_type: str,
        task_id: str,
        project_id: int,
        error: str
    ):
        """Send task error notification."""
        update = {
            "type": f"{task_type}_error",
            "task_id": task_id,
            "project_id": project_id,
            "stage": "error",
            "progress": 0,
            "error": error
        }

        self.task_progress[task_id] = update
        await self.send_personal_message(user_id, update)

    def get_task_status(self, task_id: str) -> Optional[dict]:
        """Get the latest status for a task."""
        return self.task_progress.get(task_id)


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    WebSocket endpoint for receiving real-time progress updates.

    Connect with: ws://localhost:8000/ws?token=<jwt_token>

    Messages sent:
    - video_analysis: Progress updates for video analysis
    - sfx_generation: Progress updates for SFX generation
    - video_render: Progress updates for video rendering
    - *_complete: Task completion with results
    - *_error: Task error with message
    """
    # Authenticate user
    db = SessionLocal()
    user = None
    try:
        user = await get_current_user_ws(token, db)
        if not user:
            await websocket.accept()  # Accept first to send close reason
            await websocket.close(code=4001, reason="Authentication failed")
            return

        # Connect
        await manager.connect(user.id, websocket)

        # Send initial connection success message
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connected successfully",
            "user_id": user.id
        })

        try:
            while True:
                # Keep connection alive and handle incoming messages
                try:
                    data = await asyncio.wait_for(
                        websocket.receive_text(),
                        timeout=60.0  # 60 second timeout
                    )
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    try:
                        await websocket.send_text("ping")
                    except Exception:
                        break
                    continue

                # Handle ping/pong for connection keepalive
                if data == "ping":
                    await websocket.send_text("pong")
                elif data == "pong":
                    pass  # Keepalive response
                else:
                    # Handle JSON messages
                    try:
                        msg = json.loads(data)
                        if msg.get("type") == "get_status":
                            task_id = msg.get("task_id")
                            status = manager.get_task_status(task_id)
                            if status:
                                await websocket.send_json(status)
                            else:
                                await websocket.send_json({
                                    "type": "status",
                                    "task_id": task_id,
                                    "status": "unknown"
                                })
                    except json.JSONDecodeError:
                        pass

        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"WebSocket error for user {user.id if user else 'unknown'}: {e}")

    finally:
        if user:
            manager.disconnect(user.id)
        db.close()


# Export manager for use in tasks
def get_connection_manager() -> ConnectionManager:
    """Get the global connection manager instance."""
    return manager
