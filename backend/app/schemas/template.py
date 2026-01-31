"""
Advanced Editing Templates Schema.
Defines comprehensive templates that control every aspect of auto-generation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class TemplateCategory(str, Enum):
    """Template categories for organization."""
    SOCIAL = "social"
    PROFESSIONAL = "professional"
    CREATIVE = "creative"
    EDUCATIONAL = "educational"


class PacingStyle(str, Enum):
    """Pacing styles that control cut frequency and rhythm."""
    VERY_FAST = "very_fast"      # 1-2s clips, rapid cuts
    FAST = "fast"                # 2-4s clips, energetic
    MODERATE = "moderate"        # 4-8s clips, balanced
    SLOW = "slow"                # 8-15s clips, deliberate
    CINEMATIC = "cinematic"      # 10-20s clips, dramatic pacing


class EnergyCurve(str, Enum):
    """Energy curve patterns for clip ordering."""
    HOOK_FIRST = "hook_first"           # Start with best moment, then narrative
    BUILD_UP = "build_up"               # Start slow, build to climax
    CONSTANT_HIGH = "constant_high"     # Maintain high energy throughout
    WAVE = "wave"                       # Alternating high/low energy
    NARRATIVE = "narrative"             # Natural story progression
    RANDOM_ENERGY = "random"            # Mix it up unpredictably


class MusicMood(str, Enum):
    """Music mood categories for BGM generation/selection."""
    EPIC = "epic"
    UPBEAT = "upbeat"
    CHILL = "chill"
    DRAMATIC = "dramatic"
    ELECTRONIC = "electronic"
    AMBIENT = "ambient"
    TRENDING = "trending"
    INTENSE = "intense"
    HAPPY = "happy"
    EMOTIONAL = "emotional"


class CaptionStyle(str, Enum):
    """Caption animation and styling presets."""
    NONE = "none"
    MINIMAL = "minimal"              # Simple, clean
    WORD_BY_WORD = "word_by_word"    # Animated word reveal
    KARAOKE = "karaoke"              # Highlighted as spoken
    BOLD_IMPACT = "bold_impact"      # Large, bold, centered
    SUBTITLE = "subtitle"            # Traditional bottom subtitles
    DYNAMIC = "dynamic"              # Moving, scaling effects


class TransitionPreferences(BaseModel):
    """Transition preferences for a template."""
    preferred_types: List[str] = Field(
        default=["fade", "dissolve"],
        description="Preferred transition types in order of preference"
    )
    duration_range: tuple[float, float] = Field(
        default=(0.3, 0.8),
        description="Min and max transition duration in seconds"
    )
    frequency: float = Field(
        default=1.0,
        ge=0.0, le=1.0,
        description="How often to add transitions (0=never, 1=always)"
    )
    match_energy: bool = Field(
        default=True,
        description="Match transition intensity to content energy"
    )


class PacingPreferences(BaseModel):
    """Pacing and rhythm preferences."""
    style: PacingStyle = PacingStyle.MODERATE
    min_clip_duration: float = Field(default=2.0, ge=0.5)
    max_clip_duration: float = Field(default=10.0, le=60.0)
    target_total_duration: Optional[float] = Field(
        default=None,
        description="Target output video duration in seconds"
    )
    trim_silence: bool = Field(
        default=True,
        description="Auto-trim silent/boring parts"
    )
    trim_threshold: float = Field(
        default=0.3,
        description="Silence threshold for trimming (0-1)"
    )
    beat_sync: bool = Field(
        default=False,
        description="Sync cuts to music beats when BGM is present"
    )


class EffectsPreferences(BaseModel):
    """Visual effects preferences."""
    intro_effect: Optional[str] = Field(
        default="fade",
        description="Intro effect type"
    )
    intro_duration: float = Field(default=1.0)
    outro_effect: Optional[str] = Field(
        default="fade",
        description="Outro effect type"
    )
    outro_duration: float = Field(default=1.5)
    color_grade: Optional[str] = Field(
        default=None,
        description="Color grading preset (cinematic, vintage, vibrant, etc.)"
    )
    zoom_on_highlights: bool = Field(
        default=False,
        description="Add subtle zoom on detected highlights"
    )
    motion_graphics: bool = Field(
        default=False,
        description="Add motion graphics/lower thirds"
    )


class AudioPreferences(BaseModel):
    """Audio and music preferences."""
    music_mood: MusicMood = MusicMood.UPBEAT
    music_volume: float = Field(default=0.3, ge=0.0, le=1.0)
    auto_duck: bool = Field(
        default=True,
        description="Auto-lower music during speech"
    )
    duck_level: float = Field(
        default=0.15,
        description="Music volume during speech"
    )
    sfx_enabled: bool = Field(default=True)
    sfx_intensity: float = Field(
        default=0.5, ge=0.0, le=1.0,
        description="How many SFX to add (0=none, 1=lots)"
    )
    whoosh_on_transitions: bool = Field(default=True)
    impact_on_cuts: bool = Field(default=False)


class CaptionPreferences(BaseModel):
    """Caption and subtitle preferences."""
    enabled: bool = Field(default=True)
    style: CaptionStyle = CaptionStyle.MINIMAL
    font_family: str = Field(default="Inter")
    font_size: str = Field(default="24px")
    font_weight: str = Field(default="600")
    color: str = Field(default="#FFFFFF")
    background_color: str = Field(default="rgba(0, 0, 0, 0.7)")
    position: str = Field(default="bottom")  # top, middle, bottom
    max_words_per_line: int = Field(default=8)
    highlight_color: Optional[str] = Field(
        default="#FFD700",
        description="Color for word highlighting in karaoke style"
    )


class EditingTemplate(BaseModel):
    """
    Complete editing template that defines the entire auto-generation behavior.
    """
    id: str = Field(description="Unique template identifier")
    name: str = Field(description="Display name")
    description: str = Field(description="Template description")
    icon: str = Field(description="Emoji or icon identifier")
    category: TemplateCategory = TemplateCategory.SOCIAL

    # Preview/marketing
    preview_tags: List[str] = Field(
        default=[],
        description="Tags like 'Popular', 'New', 'Pro'"
    )
    example_use_cases: List[str] = Field(
        default=[],
        description="Example use cases for this template"
    )

    # Core preferences
    energy_curve: EnergyCurve = EnergyCurve.HOOK_FIRST
    transitions: TransitionPreferences = Field(default_factory=TransitionPreferences)
    pacing: PacingPreferences = Field(default_factory=PacingPreferences)
    effects: EffectsPreferences = Field(default_factory=EffectsPreferences)
    audio: AudioPreferences = Field(default_factory=AudioPreferences)
    captions: CaptionPreferences = Field(default_factory=CaptionPreferences)

    # Advanced
    ai_enhancement_level: float = Field(
        default=0.7, ge=0.0, le=1.0,
        description="How much AI should 'enhance' (0=minimal, 1=aggressive)"
    )
    prioritize_faces: bool = Field(
        default=True,
        description="Prioritize clips with detected faces"
    )
    avoid_repetition: bool = Field(
        default=True,
        description="Avoid similar consecutive clips"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "tiktok_viral",
                "name": "TikTok Viral",
                "description": "Fast-paced, attention-grabbing edits optimized for short-form social media",
                "icon": "lightning",
                "category": "social"
            }
        }


# ============================================================================
# PREDEFINED TEMPLATES
# ============================================================================

TEMPLATES: Dict[str, EditingTemplate] = {}


def _register_template(template: EditingTemplate):
    """Register a template in the global registry."""
    TEMPLATES[template.id] = template
    return template


# -----------------------------------------------------------------------------
# SOCIAL MEDIA TEMPLATES
# -----------------------------------------------------------------------------

TIKTOK_VIRAL = _register_template(EditingTemplate(
    id="tiktok_viral",
    name="TikTok Viral",
    description="Ultra-fast cuts, trendy effects, and hook-first editing designed to stop the scroll and maximize engagement.",
    icon="zap",
    category=TemplateCategory.SOCIAL,
    preview_tags=["Popular", "Trending"],
    example_use_cases=[
        "Dance videos",
        "Quick tutorials",
        "Reaction clips",
        "Day in my life",
        "Product showcases"
    ],
    energy_curve=EnergyCurve.HOOK_FIRST,
    transitions=TransitionPreferences(
        preferred_types=["cut", "flash", "glitch", "zoom_in"],
        duration_range=(0.1, 0.3),
        frequency=0.7,
        match_energy=True
    ),
    pacing=PacingPreferences(
        style=PacingStyle.VERY_FAST,
        min_clip_duration=0.5,
        max_clip_duration=3.0,
        trim_silence=True,
        trim_threshold=0.2,
        beat_sync=True
    ),
    effects=EffectsPreferences(
        intro_effect="flash",
        intro_duration=0.3,
        outro_effect="fade",
        outro_duration=0.5,
        zoom_on_highlights=True,
        motion_graphics=False
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.TRENDING,
        music_volume=0.5,
        auto_duck=True,
        duck_level=0.2,
        sfx_enabled=True,
        sfx_intensity=0.8,
        whoosh_on_transitions=True,
        impact_on_cuts=True
    ),
    captions=CaptionPreferences(
        enabled=True,
        style=CaptionStyle.WORD_BY_WORD,
        font_family="Montserrat",
        font_size="32px",
        font_weight="800",
        color="#FFFFFF",
        background_color="transparent",
        position="middle",
        max_words_per_line=4,
        highlight_color="#00FF00"
    ),
    ai_enhancement_level=0.9,
    prioritize_faces=True
))


YOUTUBE_SHORTS = _register_template(EditingTemplate(
    id="youtube_shorts",
    name="YouTube Shorts",
    description="Optimized for YouTube's short-form format with clear branding moments and strong hooks.",
    icon="youtube",
    category=TemplateCategory.SOCIAL,
    preview_tags=["Popular"],
    example_use_cases=[
        "Channel highlights",
        "Quick tips",
        "Behind the scenes",
        "Teasers"
    ],
    energy_curve=EnergyCurve.HOOK_FIRST,
    transitions=TransitionPreferences(
        preferred_types=["cut", "zoom_in", "slide_left", "fade"],
        duration_range=(0.2, 0.5),
        frequency=0.6,
        match_energy=True
    ),
    pacing=PacingPreferences(
        style=PacingStyle.FAST,
        min_clip_duration=1.0,
        max_clip_duration=5.0,
        trim_silence=True,
        beat_sync=True
    ),
    effects=EffectsPreferences(
        intro_effect="zoom_in",
        intro_duration=0.5,
        outro_effect="fade",
        outro_duration=1.0,
        zoom_on_highlights=True
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.UPBEAT,
        music_volume=0.35,
        auto_duck=True,
        sfx_enabled=True,
        sfx_intensity=0.6,
        whoosh_on_transitions=True
    ),
    captions=CaptionPreferences(
        enabled=True,
        style=CaptionStyle.BOLD_IMPACT,
        font_size="28px",
        font_weight="700",
        position="bottom"
    ),
    ai_enhancement_level=0.8
))


INSTAGRAM_REELS = _register_template(EditingTemplate(
    id="instagram_reels",
    name="Instagram Reels",
    description="Aesthetic, polished edits with smooth transitions perfect for the Instagram audience.",
    icon="instagram",
    category=TemplateCategory.SOCIAL,
    preview_tags=["Aesthetic"],
    example_use_cases=[
        "Lifestyle content",
        "Fashion/Beauty",
        "Travel moments",
        "Food videos"
    ],
    energy_curve=EnergyCurve.WAVE,
    transitions=TransitionPreferences(
        preferred_types=["dissolve", "fade", "slide_left", "zoom_out"],
        duration_range=(0.3, 0.6),
        frequency=0.8,
        match_energy=True
    ),
    pacing=PacingPreferences(
        style=PacingStyle.FAST,
        min_clip_duration=1.5,
        max_clip_duration=4.0,
        trim_silence=True,
        beat_sync=True
    ),
    effects=EffectsPreferences(
        intro_effect="fade",
        intro_duration=0.8,
        outro_effect="fade",
        outro_duration=1.0,
        color_grade="vibrant"
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.TRENDING,
        music_volume=0.45,
        auto_duck=True,
        sfx_enabled=True,
        sfx_intensity=0.5,
        whoosh_on_transitions=True
    ),
    captions=CaptionPreferences(
        enabled=True,
        style=CaptionStyle.MINIMAL,
        font_family="Playfair Display",
        font_size="24px",
        color="#FFFFFF",
        background_color="rgba(0,0,0,0.5)",
        position="bottom"
    ),
    ai_enhancement_level=0.75
))


# -----------------------------------------------------------------------------
# PROFESSIONAL TEMPLATES
# -----------------------------------------------------------------------------

CINEMATIC = _register_template(EditingTemplate(
    id="cinematic",
    name="Cinematic",
    description="Film-quality editing with dramatic pacing, smooth transitions, and epic feel. Perfect for storytelling.",
    icon="film",
    category=TemplateCategory.PROFESSIONAL,
    preview_tags=["Pro", "Premium"],
    example_use_cases=[
        "Short films",
        "Travel documentaries",
        "Wedding videos",
        "Brand stories",
        "Music videos"
    ],
    energy_curve=EnergyCurve.BUILD_UP,
    transitions=TransitionPreferences(
        preferred_types=["dissolve", "fade", "wipe_left"],
        duration_range=(0.8, 2.0),
        frequency=1.0,
        match_energy=False
    ),
    pacing=PacingPreferences(
        style=PacingStyle.CINEMATIC,
        min_clip_duration=4.0,
        max_clip_duration=20.0,
        trim_silence=False,
        beat_sync=False
    ),
    effects=EffectsPreferences(
        intro_effect="fade",
        intro_duration=2.0,
        outro_effect="fade",
        outro_duration=3.0,
        color_grade="cinematic",
        zoom_on_highlights=False
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.EPIC,
        music_volume=0.4,
        auto_duck=True,
        duck_level=0.1,
        sfx_enabled=True,
        sfx_intensity=0.3,
        whoosh_on_transitions=False,
        impact_on_cuts=False
    ),
    captions=CaptionPreferences(
        enabled=False,
        style=CaptionStyle.SUBTITLE,
        font_family="Georgia",
        font_size="20px",
        position="bottom"
    ),
    ai_enhancement_level=0.5,
    prioritize_faces=True
))


CORPORATE = _register_template(EditingTemplate(
    id="corporate",
    name="Corporate Professional",
    description="Clean, professional editing suitable for business presentations and corporate communications.",
    icon="briefcase",
    category=TemplateCategory.PROFESSIONAL,
    preview_tags=["Business"],
    example_use_cases=[
        "Company updates",
        "Product demos",
        "Training videos",
        "Executive messages",
        "Event recaps"
    ],
    energy_curve=EnergyCurve.NARRATIVE,
    transitions=TransitionPreferences(
        preferred_types=["fade", "dissolve", "cut"],
        duration_range=(0.5, 1.0),
        frequency=0.9,
        match_energy=False
    ),
    pacing=PacingPreferences(
        style=PacingStyle.MODERATE,
        min_clip_duration=3.0,
        max_clip_duration=15.0,
        trim_silence=True,
        trim_threshold=0.5
    ),
    effects=EffectsPreferences(
        intro_effect="fade",
        intro_duration=1.5,
        outro_effect="fade",
        outro_duration=2.0,
        motion_graphics=True
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.AMBIENT,
        music_volume=0.2,
        auto_duck=True,
        sfx_enabled=False,
        sfx_intensity=0.0
    ),
    captions=CaptionPreferences(
        enabled=True,
        style=CaptionStyle.SUBTITLE,
        font_family="Arial",
        font_size="22px",
        color="#FFFFFF",
        background_color="rgba(0,0,0,0.8)",
        position="bottom"
    ),
    ai_enhancement_level=0.4
))


DOCUMENTARY = _register_template(EditingTemplate(
    id="documentary",
    name="Documentary",
    description="Thoughtful, informative editing style that lets the content breathe while maintaining engagement.",
    icon="book-open",
    category=TemplateCategory.PROFESSIONAL,
    preview_tags=["Storytelling"],
    example_use_cases=[
        "Mini documentaries",
        "Interview compilations",
        "Historical content",
        "Nature videos",
        "Investigative pieces"
    ],
    energy_curve=EnergyCurve.NARRATIVE,
    transitions=TransitionPreferences(
        preferred_types=["dissolve", "fade", "cut"],
        duration_range=(0.6, 1.5),
        frequency=0.85,
        match_energy=False
    ),
    pacing=PacingPreferences(
        style=PacingStyle.SLOW,
        min_clip_duration=5.0,
        max_clip_duration=30.0,
        trim_silence=False
    ),
    effects=EffectsPreferences(
        intro_effect="fade",
        intro_duration=2.5,
        outro_effect="fade",
        outro_duration=3.0
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.EMOTIONAL,
        music_volume=0.25,
        auto_duck=True,
        duck_level=0.08,
        sfx_enabled=True,
        sfx_intensity=0.2
    ),
    captions=CaptionPreferences(
        enabled=True,
        style=CaptionStyle.SUBTITLE,
        font_family="Source Sans Pro",
        font_size="20px",
        position="bottom"
    ),
    ai_enhancement_level=0.3
))


# -----------------------------------------------------------------------------
# CREATIVE TEMPLATES
# -----------------------------------------------------------------------------

GAMING = _register_template(EditingTemplate(
    id="gaming",
    name="Gaming Montage",
    description="High-energy gaming edits with glitch effects, RGB vibes, and impact moments that pop.",
    icon="gamepad-2",
    category=TemplateCategory.CREATIVE,
    preview_tags=["Gaming", "Popular"],
    example_use_cases=[
        "Gaming highlights",
        "Montages",
        "Stream clips",
        "Esports content",
        "Game reviews"
    ],
    energy_curve=EnergyCurve.CONSTANT_HIGH,
    transitions=TransitionPreferences(
        preferred_types=["glitch", "flash", "zoom_in", "spin"],
        duration_range=(0.1, 0.4),
        frequency=0.9,
        match_energy=True
    ),
    pacing=PacingPreferences(
        style=PacingStyle.VERY_FAST,
        min_clip_duration=0.5,
        max_clip_duration=4.0,
        trim_silence=True,
        beat_sync=True
    ),
    effects=EffectsPreferences(
        intro_effect="glitch",
        intro_duration=0.5,
        outro_effect="glitch",
        outro_duration=0.8,
        zoom_on_highlights=True
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.ELECTRONIC,
        music_volume=0.55,
        auto_duck=True,
        sfx_enabled=True,
        sfx_intensity=1.0,
        whoosh_on_transitions=True,
        impact_on_cuts=True
    ),
    captions=CaptionPreferences(
        enabled=True,
        style=CaptionStyle.BOLD_IMPACT,
        font_family="Bebas Neue",
        font_size="36px",
        font_weight="700",
        color="#00FF00",
        background_color="transparent",
        position="middle",
        max_words_per_line=3
    ),
    ai_enhancement_level=0.95
))


VLOG = _register_template(EditingTemplate(
    id="vlog",
    name="Vlog Style",
    description="Casual, authentic editing that feels personal and relatable. Jump cuts and natural flow.",
    icon="video",
    category=TemplateCategory.CREATIVE,
    preview_tags=["Casual", "Popular"],
    example_use_cases=[
        "Daily vlogs",
        "Travel vlogs",
        "Day in my life",
        "Casual updates",
        "Personal stories"
    ],
    energy_curve=EnergyCurve.WAVE,
    transitions=TransitionPreferences(
        preferred_types=["cut", "zoom_in", "slide_left"],
        duration_range=(0.15, 0.3),
        frequency=0.4,
        match_energy=True
    ),
    pacing=PacingPreferences(
        style=PacingStyle.MODERATE,
        min_clip_duration=2.0,
        max_clip_duration=8.0,
        trim_silence=True,
        trim_threshold=0.4
    ),
    effects=EffectsPreferences(
        intro_effect="zoom_in",
        intro_duration=0.5,
        outro_effect="fade",
        outro_duration=1.0
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.CHILL,
        music_volume=0.25,
        auto_duck=True,
        sfx_enabled=True,
        sfx_intensity=0.4,
        whoosh_on_transitions=True
    ),
    captions=CaptionPreferences(
        enabled=True,
        style=CaptionStyle.MINIMAL,
        font_family="Poppins",
        font_size="22px",
        position="bottom"
    ),
    ai_enhancement_level=0.6,
    prioritize_faces=True
))


MUSIC_VIDEO = _register_template(EditingTemplate(
    id="music_video",
    name="Music Video",
    description="Beat-synced editing with creative effects, perfect for music-driven content.",
    icon="music",
    category=TemplateCategory.CREATIVE,
    preview_tags=["Creative", "Beat-Sync"],
    example_use_cases=[
        "Music videos",
        "Dance performances",
        "Cover songs",
        "Lyric videos",
        "Concert footage"
    ],
    energy_curve=EnergyCurve.WAVE,
    transitions=TransitionPreferences(
        preferred_types=["flash", "zoom_in", "spin", "glitch", "color_fade"],
        duration_range=(0.1, 0.5),
        frequency=0.95,
        match_energy=True
    ),
    pacing=PacingPreferences(
        style=PacingStyle.FAST,
        min_clip_duration=0.5,
        max_clip_duration=4.0,
        beat_sync=True
    ),
    effects=EffectsPreferences(
        intro_effect="flash",
        intro_duration=0.3,
        outro_effect="color_fade",
        outro_duration=1.5,
        color_grade="vibrant",
        zoom_on_highlights=True
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.UPBEAT,
        music_volume=0.8,
        auto_duck=False,
        sfx_enabled=True,
        sfx_intensity=0.6,
        whoosh_on_transitions=True,
        impact_on_cuts=True
    ),
    captions=CaptionPreferences(
        enabled=False,
        style=CaptionStyle.KARAOKE
    ),
    ai_enhancement_level=0.85
))


HYPE_PROMO = _register_template(EditingTemplate(
    id="hype_promo",
    name="Hype Promo",
    description="Maximum energy, maximum impact. All the effects, fast cuts, designed to excite and convert.",
    icon="flame",
    category=TemplateCategory.CREATIVE,
    preview_tags=["High Energy", "Marketing"],
    example_use_cases=[
        "Product launches",
        "Event promos",
        "Sale announcements",
        "Trailers",
        "Hype videos"
    ],
    energy_curve=EnergyCurve.CONSTANT_HIGH,
    transitions=TransitionPreferences(
        preferred_types=["flash", "glitch", "zoom_in", "spin", "pixelate"],
        duration_range=(0.1, 0.25),
        frequency=1.0,
        match_energy=True
    ),
    pacing=PacingPreferences(
        style=PacingStyle.VERY_FAST,
        min_clip_duration=0.3,
        max_clip_duration=2.0,
        trim_silence=True,
        beat_sync=True
    ),
    effects=EffectsPreferences(
        intro_effect="glitch",
        intro_duration=0.4,
        outro_effect="flash",
        outro_duration=0.5,
        zoom_on_highlights=True,
        motion_graphics=True
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.INTENSE,
        music_volume=0.6,
        auto_duck=True,
        sfx_enabled=True,
        sfx_intensity=1.0,
        whoosh_on_transitions=True,
        impact_on_cuts=True
    ),
    captions=CaptionPreferences(
        enabled=True,
        style=CaptionStyle.BOLD_IMPACT,
        font_family="Impact",
        font_size="40px",
        font_weight="900",
        color="#FFFF00",
        background_color="transparent",
        position="middle",
        max_words_per_line=2
    ),
    ai_enhancement_level=1.0
))


# -----------------------------------------------------------------------------
# EDUCATIONAL TEMPLATES
# -----------------------------------------------------------------------------

TUTORIAL = _register_template(EditingTemplate(
    id="tutorial",
    name="Tutorial",
    description="Clear, methodical editing focused on instruction and comprehension. No distractions.",
    icon="graduation-cap",
    category=TemplateCategory.EDUCATIONAL,
    preview_tags=["Educational"],
    example_use_cases=[
        "How-to videos",
        "Software tutorials",
        "Cooking recipes",
        "DIY projects",
        "Educational content"
    ],
    energy_curve=EnergyCurve.NARRATIVE,
    transitions=TransitionPreferences(
        preferred_types=["fade", "dissolve", "cut"],
        duration_range=(0.4, 0.8),
        frequency=0.7,
        match_energy=False
    ),
    pacing=PacingPreferences(
        style=PacingStyle.MODERATE,
        min_clip_duration=3.0,
        max_clip_duration=20.0,
        trim_silence=True,
        trim_threshold=0.6
    ),
    effects=EffectsPreferences(
        intro_effect="fade",
        intro_duration=1.0,
        outro_effect="fade",
        outro_duration=1.5,
        motion_graphics=True
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.AMBIENT,
        music_volume=0.15,
        auto_duck=True,
        duck_level=0.05,
        sfx_enabled=True,
        sfx_intensity=0.2,
        whoosh_on_transitions=False
    ),
    captions=CaptionPreferences(
        enabled=True,
        style=CaptionStyle.SUBTITLE,
        font_family="Roboto",
        font_size="22px",
        color="#FFFFFF",
        background_color="rgba(0,0,0,0.75)",
        position="bottom",
        max_words_per_line=10
    ),
    ai_enhancement_level=0.4
))


EXPLAINER = _register_template(EditingTemplate(
    id="explainer",
    name="Explainer",
    description="Engaging educational content with visual aids and clear pacing for complex topics.",
    icon="lightbulb",
    category=TemplateCategory.EDUCATIONAL,
    preview_tags=["Educational", "Engaging"],
    example_use_cases=[
        "Concept explanations",
        "Product explainers",
        "Science content",
        "News analysis",
        "Tech reviews"
    ],
    energy_curve=EnergyCurve.BUILD_UP,
    transitions=TransitionPreferences(
        preferred_types=["dissolve", "zoom_in", "slide_left", "fade"],
        duration_range=(0.4, 0.8),
        frequency=0.8,
        match_energy=True
    ),
    pacing=PacingPreferences(
        style=PacingStyle.MODERATE,
        min_clip_duration=2.0,
        max_clip_duration=12.0,
        trim_silence=True
    ),
    effects=EffectsPreferences(
        intro_effect="zoom_in",
        intro_duration=0.8,
        outro_effect="fade",
        outro_duration=1.5,
        zoom_on_highlights=True
    ),
    audio=AudioPreferences(
        music_mood=MusicMood.UPBEAT,
        music_volume=0.2,
        auto_duck=True,
        sfx_enabled=True,
        sfx_intensity=0.4,
        whoosh_on_transitions=True
    ),
    captions=CaptionPreferences(
        enabled=True,
        style=CaptionStyle.DYNAMIC,
        font_family="Inter",
        font_size="24px",
        font_weight="600",
        position="bottom"
    ),
    ai_enhancement_level=0.6
))


# -----------------------------------------------------------------------------
# HELPER FUNCTIONS
# -----------------------------------------------------------------------------

def get_template(template_id: str) -> Optional[EditingTemplate]:
    """Get a template by ID."""
    return TEMPLATES.get(template_id)


def get_all_templates() -> List[EditingTemplate]:
    """Get all available templates."""
    return list(TEMPLATES.values())


def get_templates_by_category(category: TemplateCategory) -> List[EditingTemplate]:
    """Get templates filtered by category."""
    return [t for t in TEMPLATES.values() if t.category == category]


def get_template_ids() -> List[str]:
    """Get list of all template IDs."""
    return list(TEMPLATES.keys())
