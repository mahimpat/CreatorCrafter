"""
Pydantic schemas for transitions.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class TransitionTypeEnum(str, Enum):
    """Types of transitions - 90+ professional video effects."""

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


class TransitionCreate(BaseModel):
    """Schema for creating a transition."""
    type: TransitionTypeEnum = TransitionTypeEnum.CUT
    from_clip_id: int
    to_clip_id: int
    duration: float = Field(default=0.5, ge=0, le=5.0)
    parameters: Optional[Dict[str, Any]] = None


class TransitionUpdate(BaseModel):
    """Schema for updating a transition."""
    type: Optional[TransitionTypeEnum] = None
    duration: Optional[float] = Field(default=None, ge=0, le=5.0)
    parameters: Optional[Dict[str, Any]] = None


class TransitionResponse(BaseModel):
    """Schema for transition responses."""
    id: int
    project_id: int
    type: str  # Stored as string to support 90+ transition types
    from_clip_id: int
    to_clip_id: int
    duration: float
    parameters: Optional[Dict[str, Any]]
    ai_suggested: int
    confidence: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
