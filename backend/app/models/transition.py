"""
Transition model for video clip transitions.
"""
import enum
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class TransitionType(str, enum.Enum):
    """Types of transitions between clips - 90+ professional effects."""

    # === BASIC (4) ===
    CUT = "cut"
    FADE = "fade"
    DISSOLVE = "dissolve"
    CROSSFADE = "crossfade"

    # === WIPES (8) ===
    WIPE_LEFT = "wipe_left"
    WIPE_RIGHT = "wipe_right"
    WIPE_UP = "wipe_up"
    WIPE_DOWN = "wipe_down"
    WIPE_DIAGONAL_TL = "wipe_diagonal_tl"
    WIPE_DIAGONAL_TR = "wipe_diagonal_tr"
    WIPE_DIAGONAL_BL = "wipe_diagonal_bl"
    WIPE_DIAGONAL_BR = "wipe_diagonal_br"

    # === SLIDES (8) ===
    SLIDE_LEFT = "slide_left"
    SLIDE_RIGHT = "slide_right"
    SLIDE_UP = "slide_up"
    SLIDE_DOWN = "slide_down"
    PUSH_LEFT = "push_left"
    PUSH_RIGHT = "push_right"
    PUSH_UP = "push_up"
    PUSH_DOWN = "push_down"

    # === ZOOM (6) ===
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    ZOOM_ROTATE = "zoom_rotate"
    ZOOM_BLUR = "zoom_blur"
    ZOOM_BOUNCE = "zoom_bounce"
    SCALE_CENTER = "scale_center"

    # === 3D EFFECTS (10) ===
    CUBE_LEFT = "cube_left"
    CUBE_RIGHT = "cube_right"
    CUBE_UP = "cube_up"
    CUBE_DOWN = "cube_down"
    FLIP_HORIZONTAL = "flip_horizontal"
    FLIP_VERTICAL = "flip_vertical"
    ROTATE_3D = "rotate_3d"
    FOLD_LEFT = "fold_left"
    FOLD_RIGHT = "fold_right"
    PAGE_CURL = "page_curl"

    # === STYLIZED (8) ===
    GLITCH = "glitch"
    GLITCH_HEAVY = "glitch_heavy"
    VHS = "vhs"
    STATIC = "static"
    FILM_BURN = "film_burn"
    FILM_SCRATCH = "film_scratch"
    CHROMATIC = "chromatic"
    RGB_SPLIT = "rgb_split"

    # === MOTION (8) ===
    SWIRL = "swirl"
    RIPPLE = "ripple"
    WAVE = "wave"
    SHAKE = "shake"
    BOUNCE = "bounce"
    ELASTIC = "elastic"
    WHIP_PAN = "whip_pan"
    CRASH_ZOOM = "crash_zoom"

    # === FLASH & LIGHT (8) ===
    FLASH = "flash"
    FLASH_WHITE = "flash_white"
    FLASH_COLOR = "flash_color"
    STROBE = "strobe"
    LIGHT_LEAK = "light_leak"
    LENS_FLARE = "lens_flare"
    GLOW = "glow"
    BLOOM = "bloom"

    # === COLOR (8) ===
    COLOR_FADE = "color_fade"
    COLOR_WIPE = "color_wipe"
    COLOR_BURN = "color_burn"
    INK_DROP = "ink_drop"
    PAINT_SPLATTER = "paint_splatter"
    COLOR_SHIFT = "color_shift"
    DESATURATE = "desaturate"
    NEGATIVE = "negative"

    # === SHAPES (9) ===
    CIRCLE_IN = "circle_in"
    CIRCLE_OUT = "circle_out"
    DIAMOND_IN = "diamond_in"
    DIAMOND_OUT = "diamond_out"
    HEART_IN = "heart_in"
    HEART_OUT = "heart_out"
    STAR_IN = "star_in"
    STAR_OUT = "star_out"
    HEXAGON = "hexagon"

    # === BLUR (6) ===
    BLUR = "blur"
    BLUR_DIRECTIONAL = "blur_directional"
    BLUR_RADIAL = "blur_radial"
    BLUR_ZOOM = "blur_zoom"
    FOCUS_PULL = "focus_pull"
    DEFOCUS = "defocus"

    # === DIGITAL (6) ===
    PIXELATE = "pixelate"
    PIXELATE_IN = "pixelate_in"
    PIXELATE_OUT = "pixelate_out"
    MOSAIC = "mosaic"
    BLOCKS = "blocks"
    DIGITAL_NOISE = "digital_noise"

    # === CINEMATIC (6) ===
    LETTERBOX = "letterbox"
    BARS_HORIZONTAL = "bars_horizontal"
    BARS_VERTICAL = "bars_vertical"
    BLINDS = "blinds"
    CURTAIN = "curtain"
    SPLIT_SCREEN = "split_screen"

    # === LIQUID (6) ===
    LIQUID = "liquid"
    MORPH = "morph"
    MELT = "melt"
    DRIP = "drip"
    SMOKE = "smoke"
    CLOUDS = "clouds"

    # === PARTICLES (6) ===
    PARTICLES = "particles"
    SPARKLE = "sparkle"
    CONFETTI = "confetti"
    EXPLOSION = "explosion"
    SHATTER = "shatter"
    DISINTEGRATE = "disintegrate"

    # === SPIN (4) ===
    SPIN = "spin"
    SPIN_BLUR = "spin_blur"
    SPIN_ZOOM = "spin_zoom"
    TORNADO = "tornado"

    # === SPECIAL (6) ===
    DREAM = "dream"
    VINTAGE = "vintage"
    RETRO = "retro"
    CYBERPUNK = "cyberpunk"
    NEON = "neon"
    HOLOGRAM = "hologram"


class Transition(Base):
    """Transition between two video clips."""

    __tablename__ = "transitions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # Transition type (stored as string to support 90+ transition types)
    type = Column(String(50), default="cut", nullable=False)

    # Connected clips
    from_clip_id = Column(Integer, ForeignKey("video_clips.id", ondelete="CASCADE"), nullable=False)
    to_clip_id = Column(Integer, ForeignKey("video_clips.id", ondelete="CASCADE"), nullable=False)

    # Duration in seconds (0 for cut)
    duration = Column(Float, default=0.5)

    # Additional parameters for advanced transitions
    parameters = Column(JSON, nullable=True)  # e.g., easing, direction, color

    # AI suggestion metadata
    ai_suggested = Column(Integer, default=0)  # 1 if AI suggested this transition
    confidence = Column(Float, nullable=True)  # AI confidence score

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="transitions")
    from_clip = relationship(
        "VideoClip",
        foreign_keys=[from_clip_id],
        back_populates="outgoing_transition"
    )
    to_clip = relationship(
        "VideoClip",
        foreign_keys=[to_clip_id],
        back_populates="incoming_transition"
    )

    def __repr__(self):
        return f"<Transition {self.type.value}: clip {self.from_clip_id} -> {self.to_clip_id}>"
