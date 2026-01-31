"""Fix transition type column to use string instead of enum.

Revision ID: 003_fix_transition
Revises: 002_add_multi_clip_support
Create Date: 2024-01-31

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_fix_transition'
down_revision = '002_add_multi_clip_support'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    SQLite doesn't support ALTER COLUMN, so we need to:
    1. Create a new table with the correct schema
    2. Copy data from old table
    3. Drop old table
    4. Rename new table
    """
    # Create new table with string type
    op.execute("""
        CREATE TABLE transitions_new (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL DEFAULT 'cut',
            from_clip_id INTEGER NOT NULL REFERENCES video_clips(id) ON DELETE CASCADE,
            to_clip_id INTEGER NOT NULL REFERENCES video_clips(id) ON DELETE CASCADE,
            duration FLOAT DEFAULT 0.5,
            parameters JSON,
            ai_suggested INTEGER DEFAULT 0,
            confidence FLOAT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Copy data from old table
    op.execute("""
        INSERT INTO transitions_new
        SELECT id, project_id, type, from_clip_id, to_clip_id,
               duration, parameters, ai_suggested, confidence,
               created_at, updated_at
        FROM transitions
    """)

    # Drop old table
    op.execute("DROP TABLE transitions")

    # Rename new table
    op.execute("ALTER TABLE transitions_new RENAME TO transitions")

    # Recreate indexes
    op.create_index('ix_transitions_id', 'transitions', ['id'])


def downgrade() -> None:
    # For downgrade, we'd need to convert back to enum
    # This is complex and usually not needed for development
    pass
