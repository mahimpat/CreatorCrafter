"""Add multi-clip support and editing modes

Revision ID: 002_add_multi_clip
Revises: 001_initial
Create Date: 2024-01-15 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_add_multi_clip'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add mode column to projects table
    op.add_column(
        'projects',
        sa.Column(
            'mode',
            sa.Enum('manual', 'semi_manual', 'automatic', name='projectmode'),
            nullable=False,
            server_default='semi_manual'
        )
    )

    # Create video_clips table
    op.create_table(
        'video_clips',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_name', sa.String(length=255), nullable=True),
        sa.Column('original_order', sa.Integer(), nullable=False),
        sa.Column('timeline_order', sa.Integer(), nullable=False),
        sa.Column('start_trim', sa.Float(), nullable=True, default=0.0),
        sa.Column('end_trim', sa.Float(), nullable=True, default=0.0),
        sa.Column('timeline_start', sa.Float(), nullable=True, default=0.0),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('fps', sa.Float(), nullable=True),
        sa.Column('clip_metadata', sa.JSON(), nullable=True),
        sa.Column('analysis', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_video_clips_id'), 'video_clips', ['id'], unique=False)
    op.create_index(op.f('ix_video_clips_project_id'), 'video_clips', ['project_id'], unique=False)

    # Create transitions table
    op.create_table(
        'transitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column(
            'type',
            sa.Enum(
                'cut', 'fade', 'dissolve', 'wipe_left', 'wipe_right',
                'wipe_up', 'wipe_down', 'slide_left', 'slide_right',
                'zoom_in', 'zoom_out',
                name='transitiontype'
            ),
            nullable=False,
            default='cut'
        ),
        sa.Column('from_clip_id', sa.Integer(), nullable=False),
        sa.Column('to_clip_id', sa.Integer(), nullable=False),
        sa.Column('duration', sa.Float(), nullable=True, default=0.5),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('ai_suggested', sa.Integer(), nullable=True, default=0),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['from_clip_id'], ['video_clips.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_clip_id'], ['video_clips.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transitions_id'), 'transitions', ['id'], unique=False)
    op.create_index(op.f('ix_transitions_project_id'), 'transitions', ['project_id'], unique=False)

    # Create background_audio table
    op.create_table(
        'background_audio',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_name', sa.String(length=255), nullable=True),
        sa.Column(
            'source',
            sa.Enum('upload', 'ai_generated', name='audiosource'),
            nullable=False,
            default='upload'
        ),
        sa.Column('start_time', sa.Float(), nullable=True, default=0.0),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('volume', sa.Float(), nullable=True, default=0.3),
        sa.Column('fade_in', sa.Float(), nullable=True, default=0.0),
        sa.Column('fade_out', sa.Float(), nullable=True, default=0.0),
        sa.Column('prompt', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_background_audio_id'), 'background_audio', ['id'], unique=False)
    op.create_index(op.f('ix_background_audio_project_id'), 'background_audio', ['project_id'], unique=False)


def downgrade() -> None:
    # Drop background_audio table
    op.drop_index(op.f('ix_background_audio_project_id'), table_name='background_audio')
    op.drop_index(op.f('ix_background_audio_id'), table_name='background_audio')
    op.drop_table('background_audio')

    # Drop transitions table
    op.drop_index(op.f('ix_transitions_project_id'), table_name='transitions')
    op.drop_index(op.f('ix_transitions_id'), table_name='transitions')
    op.drop_table('transitions')

    # Drop video_clips table
    op.drop_index(op.f('ix_video_clips_project_id'), table_name='video_clips')
    op.drop_index(op.f('ix_video_clips_id'), table_name='video_clips')
    op.drop_table('video_clips')

    # Remove mode column from projects
    op.drop_column('projects', 'mode')

    # Drop enum types
    op.execute('DROP TYPE IF EXISTS projectmode')
    op.execute('DROP TYPE IF EXISTS transitiontype')
    op.execute('DROP TYPE IF EXISTS audiosource')
