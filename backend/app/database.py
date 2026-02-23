"""
Database configuration and session management.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create database engine
# SQLite doesn't support connection pooling the same way
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db():
    """
    Dependency that provides a database session.
    Ensures the session is closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize the database by creating all tables.
    Should be called on application startup.
    """
    # Import all models to ensure they're registered with Base
    from app.models import (
        User, Project, Subtitle, SFXTrack, TextOverlay,
        VideoClip, Transition, BackgroundAudio
    )
    Base.metadata.create_all(bind=engine)

    # Migrate existing tables: add rendered_filename to transitions if missing
    from sqlalchemy import inspect, text
    insp = inspect(engine)
    if "transitions" in insp.get_table_names():
        columns = [c["name"] for c in insp.get_columns("transitions")]
        if "rendered_filename" not in columns:
            with engine.connect() as conn:
                conn.execute(text(
                    "ALTER TABLE transitions ADD COLUMN rendered_filename VARCHAR(255)"
                ))
                conn.commit()

    # Migrate video_clips: add thumbnail_filename column
    if "video_clips" in insp.get_table_names():
        columns = [c["name"] for c in insp.get_columns("video_clips")]
        if "thumbnail_filename" not in columns:
            with engine.connect() as conn:
                conn.execute(text(
                    "ALTER TABLE video_clips ADD COLUMN thumbnail_filename VARCHAR(255)"
                ))
                conn.commit()
