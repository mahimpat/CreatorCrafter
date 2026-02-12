"""
Video Stitcher Service - Implements 90+ professional video transitions using FFmpeg.

This service handles:
1. Stitching multiple video clips together
2. Applying transitions between clips using FFmpeg's xfade filter
3. Mixing background audio and SFX
4. Subtitle burn-in via drawtext filter
5. Text overlay rendering
6. Audio ducking (dynamic BGM volume from audio_mix_map)
7. Color grading via eq filter
8. Rendering final output video
"""
import os
import re
import subprocess
import tempfile
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ClipInfo:
    """Information about a video clip."""
    path: str
    duration: float
    start_trim: float = 0.0
    end_trim: float = 0.0

    @property
    def effective_duration(self) -> float:
        """Get the actual playable duration after trimming."""
        return self.duration - self.start_trim - self.end_trim


@dataclass
class TransitionInfo:
    """Information about a transition between clips."""
    type: str
    duration: float
    parameters: Optional[Dict] = None


@dataclass
class SFXTrackInfo:
    """Information about an SFX track to mix into the output."""
    path: str
    start_time: float  # seconds from start of timeline
    duration: float  # seconds
    volume: float = 1.0


@dataclass
class SubtitleInfo:
    """Information about a subtitle to burn into the video."""
    text: str
    start_time: float
    end_time: float
    style: Optional[Dict] = None


@dataclass
class TextOverlayInfo:
    """Information about a text overlay to render on the video."""
    text: str
    start_time: float
    end_time: float
    style: Optional[Dict] = None


@dataclass
class ColorGradeInfo:
    """Color grading parameters for the video."""
    brightness: float = 0.0      # -1.0 to 1.0
    contrast: float = 1.0        # 0.0 to 2.0
    saturation: float = 1.0      # 0.0 to 3.0
    gamma: float = 1.0           # 0.1 to 10.0


@dataclass
class AudioDuckPoint:
    """A single point in the audio ducking curve."""
    timestamp: float
    bgm_volume: float  # 0.0 to 1.0
    is_speech: bool = False


# ===== TRANSITION MAPPINGS =====
# Maps our transition types to FFmpeg xfade transitions

XFADE_TRANSITIONS = {
    # Basic
    'cut': None,  # No transition
    'fade': 'fade',
    'fadeblack': 'fadeblack',
    'fadewhite': 'fadewhite',
    'dissolve': 'dissolve',
    'crossfade': 'fade',

    # Wipes
    'wipe_left': 'wipeleft',
    'wipe_right': 'wiperight',
    'wipe_up': 'wipeup',
    'wipe_down': 'wipedown',
    'wipe_diagonal_tl': 'wipetl',
    'wipe_diagonal_tr': 'wipetr',
    'wipe_diagonal_bl': 'wipebl',
    'wipe_diagonal_br': 'wipebr',

    # Slides
    'slide_left': 'slideleft',
    'slide_right': 'slideright',
    'slide_up': 'slideup',
    'slide_down': 'slidedown',
    'push_left': 'smoothleft',
    'push_right': 'smoothright',
    'push_up': 'smoothup',
    'push_down': 'smoothdown',

    # Zoom
    'zoom_in': 'zoomin',
    'zoom_out': 'fadewhite',  # Approximate with fade
    'zoom_rotate': 'zoomin',
    'zoom_blur': 'hblur',
    'zoom_bounce': 'zoomin',
    'scale_center': 'zoomin',

    # 3D Effects (approximated with available xfade transitions)
    'cube_left': 'slideleft',
    'cube_right': 'slideright',
    'cube_up': 'slideup',
    'cube_down': 'slidedown',
    'flip_horizontal': 'horzopen',
    'flip_vertical': 'vertopen',
    'rotate_3d': 'radial',
    'fold_left': 'hlslice',
    'fold_right': 'hrslice',
    'page_curl': 'wipebr',

    # Stylized
    'glitch': 'pixelize',
    'glitch_heavy': 'pixelize',
    'vhs': 'pixelize',
    'static': 'pixelize',
    'film_burn': 'fadewhite',
    'film_scratch': 'fade',
    'chromatic': 'fadegrays',
    'rgb_split': 'pixelize',

    # Motion
    'swirl': 'radial',
    'ripple': 'radial',
    'wave': 'vuslice',
    'shake': 'pixelize',
    'bounce': 'squeezev',
    'elastic': 'squeezeh',
    'whip_pan': 'hblur',
    'crash_zoom': 'zoomin',

    # Flash & Light
    'flash': 'fadewhite',
    'flash_white': 'fadewhite',
    'flash_color': 'fadewhite',
    'strobe': 'fadewhite',
    'light_leak': 'fadewhite',
    'lens_flare': 'fadewhite',
    'glow': 'fadewhite',
    'bloom': 'fadewhite',

    # Color
    'color_fade': 'fadegrays',
    'color_wipe': 'wiperight',
    'color_burn': 'fadewhite',
    'ink_drop': 'circleopen',
    'paint_splatter': 'radial',
    'color_shift': 'fadegrays',
    'desaturate': 'fadegrays',
    'negative': 'fade',

    # Shapes
    'circle_in': 'circleclose',
    'circle_out': 'circleopen',
    'diamond_in': 'diagtl',
    'diamond_out': 'diagbr',
    'heart_in': 'circleclose',
    'heart_out': 'circleopen',
    'star_in': 'radial',
    'star_out': 'radial',
    'hexagon': 'radial',

    # Blur
    'blur': 'hblur',
    'blur_directional': 'hblur',
    'blur_radial': 'radial',
    'blur_zoom': 'hblur',
    'focus_pull': 'hblur',
    'defocus': 'hblur',

    # Digital
    'pixelate': 'pixelize',
    'pixelate_in': 'pixelize',
    'pixelate_out': 'pixelize',
    'mosaic': 'pixelize',
    'blocks': 'pixelize',
    'digital_noise': 'pixelize',

    # Cinematic
    'letterbox': 'squeezev',
    'bars_horizontal': 'horzclose',
    'bars_vertical': 'vertclose',
    'blinds': 'hlslice',
    'curtain': 'horzopen',
    'split_screen': 'vertopen',

    # Liquid
    'liquid': 'dissolve',
    'morph': 'dissolve',
    'melt': 'vuslice',
    'drip': 'vdslice',
    'smoke': 'dissolve',
    'clouds': 'dissolve',

    # Particles
    'particles': 'dissolve',
    'sparkle': 'dissolve',
    'confetti': 'pixelize',
    'explosion': 'radial',
    'shatter': 'pixelize',
    'disintegrate': 'dissolve',

    # Spin
    'spin': 'radial',
    'spin_blur': 'radial',
    'spin_zoom': 'radial',
    'tornado': 'radial',

    # Special
    'dream': 'dissolve',
    'vintage': 'fadegrays',
    'retro': 'pixelize',
    'cyberpunk': 'pixelize',
    'neon': 'fadewhite',
    'hologram': 'pixelize',
}

# Custom FFmpeg xfade expressions for transitions that were previously approximated.
# FFmpeg custom xfade syntax: xfade=transition=custom:expr='EXPRESSION'
# Variables: X, Y (pixel coords), W, H (dimensions), P (progress 0->1),
# A (pixel from clip 1), B (pixel from clip 2), a0(x,y), b0(x,y) (sampling)
XFADE_CUSTOM_EXPRESSIONS = {
    # Circle wipe with soft edge (was: circleclose/circleopen)
    'circle_in': "if(lte(hypot(X-W/2,Y-H/2), P*hypot(W/2,H/2)*1.1+10), B, A)",
    'circle_out': "if(gte(hypot(X-W/2,Y-H/2), (1-P)*hypot(W/2,H/2)*1.1+10), B, A)",

    # Diamond wipe (was: diagtl/diagbr)
    'diamond_in': "if(lte(abs(X-W/2)/W+abs(Y-H/2)/H, P*1.2), B, A)",
    'diamond_out': "if(gte(abs(X-W/2)/W+abs(Y-H/2)/H, (1-P)*1.2), B, A)",

    # Diagonal feathered wipes
    'wipe_diagonal_tl': "A*(1-clip((X/W+Y/H-2*P*1.2)/(0.15+0.001),0,1))+B*clip((X/W+Y/H-2*P*1.2)/(0.15+0.001),0,1)",
    'wipe_diagonal_br': "A*(1-clip((2-X/W-Y/H-2*P*1.2)/(0.15+0.001),0,1))+B*clip((2-X/W-Y/H-2*P*1.2)/(0.15+0.001),0,1)",

    # Zoom in/out (was: zoomin/fadewhite)
    'zoom_in': "a0(W/2+(X-W/2)*(1-P), H/2+(Y-H/2)*(1-P))*(1-P)+B*P",
    'zoom_out': "A*(1-P)+b0(W/2+(X-W/2)*P, H/2+(Y-H/2)*P)*P",

    # Noise dissolve (was: dissolve)
    'liquid': "if(gt(random(Y*W+X+1)*(1.2-abs(P-0.5)*0.4), 1-P), B, A)",
    'smoke': "if(gt(random(Y*W+X+1)*(1.2-abs(P-0.5)*0.4), 1-P), B, A)",

    # Pixelate with variable block size (was: pixelize for everything)
    'pixelate': "if(lt(P,0.5), a0(floor(X/(2+200*(0.5-abs(P-0.5))))*(2+200*(0.5-abs(P-0.5))),floor(Y/(2+200*(0.5-abs(P-0.5))))*(2+200*(0.5-abs(P-0.5)))), b0(floor(X/(2+200*(0.5-abs(P-0.5))))*(2+200*(0.5-abs(P-0.5))),floor(Y/(2+200*(0.5-abs(P-0.5))))*(2+200*(0.5-abs(P-0.5)))))",
    'glitch': "if(gt(random(floor(Y/20)*W+floor(X/20)+P*100),0.5-P*0.5), B, A)",
    'glitch_heavy': "if(gt(random(floor(Y/10)*W+floor(X/10)+P*200),0.3-P*0.3), B, A)",

    # Star/heart shapes - radial with angular modulation
    'star_in': "if(lte(hypot(X-W/2,Y-H/2)*(1+0.3*cos(5*atan2(Y-H/2,X-W/2))), P*hypot(W/2,H/2)*1.3), B, A)",
    'heart_in': "if(lte(hypot(X-W/2,Y-H/2)*(1-0.3*cos(atan2(Y-H/2,X-W/2))), P*hypot(W/2,H/2)*1.3), B, A)",

    # Blinds / bars
    'blinds': "if(gt(mod(Y, H/10), (1-P)*H/10), B, A)",
    'bars_horizontal': "if(gt(mod(Y, H/8), (1-P)*H/8), B, A)",
    'bars_vertical': "if(gt(mod(X, W/8), (1-P)*W/8), B, A)",

    # Spin (was: radial)
    'spin': "if(lt(mod(atan2(Y-H/2,X-W/2)+3.14159, 6.28318), P*6.28318), B, A)",
}


def _escape_drawtext(text: str) -> str:
    """Escape text for FFmpeg drawtext filter.

    FFmpeg drawtext requires specific escaping:
    - Single quotes, colons, backslashes, and semicolons need escaping
    - Newlines become explicit \\n
    """
    # Escape backslashes first
    text = text.replace('\\', '\\\\\\\\')
    # Escape single quotes
    text = text.replace("'", "\\'")
    # Escape colons (special in drawtext)
    text = text.replace(':', '\\:')
    # Escape semicolons (filter separator)
    text = text.replace(';', '\\;')
    # Escape percent signs
    text = text.replace('%', '%%')
    # Newlines
    text = text.replace('\n', '\\n')
    return text


class VideoStitcher:
    """Service for stitching video clips with transitions, subtitles, overlays, and color grading."""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def get_xfade_transition(self, transition_type: str) -> Tuple[Optional[str], Optional[str]]:
        """Get the FFmpeg xfade transition name and optional custom expression.

        Returns:
            Tuple of (xfade_name, custom_expr). If custom_expr is set,
            xfade_name will be 'custom'.
        """
        # Check custom expressions first for higher-fidelity export
        if transition_type in XFADE_CUSTOM_EXPRESSIONS:
            return ('custom', XFADE_CUSTOM_EXPRESSIONS[transition_type])
        # Fall back to built-in xfade types
        return (XFADE_TRANSITIONS.get(transition_type, 'fade'), None)

    def _get_easing_expr(self, easing: str) -> str:
        """Return an FFmpeg expression that remaps P with an easing curve.

        For custom xfade expressions, P can be replaced with this to apply easing.
        Built-in xfade transitions don't support easing natively.
        """
        if easing == 'ease-in':
            return '(P*P*P)'
        if easing == 'ease-out':
            return '(1-pow(1-P,3))'
        if easing == 'ease-in-out':
            return 'if(lt(P,0.5),4*P*P*P,1-pow(-2*P+2,3)/2)'
        if easing == 'ease':
            return 'if(lt(P,0.5),2*P*P,1-pow(-2*P+2,2)/2)'
        return 'P'  # linear

    def stitch_clips(
        self,
        clips: List[ClipInfo],
        transitions: List[TransitionInfo],
        output_filename: str,
        background_audio: Optional[str] = None,
        audio_volume: float = 0.3,
        sfx_tracks: Optional[List[SFXTrackInfo]] = None,
        subtitles: Optional[List[SubtitleInfo]] = None,
        text_overlays: Optional[List[TextOverlayInfo]] = None,
        color_grade: Optional[ColorGradeInfo] = None,
        ducking_points: Optional[List[AudioDuckPoint]] = None,
    ) -> Tuple[bool, str]:
        """
        Stitch multiple clips together with transitions, audio, subtitles,
        text overlays, color grading, and audio ducking.

        Args:
            clips: List of clip information
            transitions: List of transitions (should be len(clips) - 1)
            output_filename: Name of output file
            background_audio: Optional background music path
            audio_volume: Base volume for background audio (0-1)
            sfx_tracks: Optional list of SFX tracks to mix in
            subtitles: Optional list of subtitles to burn into video
            text_overlays: Optional list of text overlays to render
            color_grade: Optional color grading parameters
            ducking_points: Optional audio ducking curve for BGM

        Returns:
            Tuple of (success, output_path or error_message)
        """
        if len(clips) < 1:
            return False, "No clips provided"

        has_extras = (
            sfx_tracks or background_audio or subtitles or
            text_overlays or color_grade
        )

        if len(clips) == 1 and not has_extras:
            return self._render_single_clip(clips[0], output_filename)

        if len(clips) > 1 and len(transitions) != len(clips) - 1:
            return False, f"Expected {len(clips) - 1} transitions, got {len(transitions)}"

        output_path = os.path.join(self.output_dir, output_filename)

        try:
            cmd = self._build_stitch_command(
                clips, transitions, output_path,
                background_audio, audio_volume, sfx_tracks,
                subtitles, text_overlays, color_grade, ducking_points
            )
            print(f"FFmpeg command: {' '.join(cmd)}")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout
            )

            if result.returncode != 0:
                print(f"FFmpeg stderr: {result.stderr}")
                return False, f"FFmpeg error: {result.stderr[-500:]}"

            return True, output_path

        except subprocess.TimeoutExpired:
            return False, "Video rendering timed out"
        except FileNotFoundError:
            return False, "FFmpeg not found"
        except Exception as e:
            return False, str(e)

    def _render_single_clip(self, clip: ClipInfo, output_filename: str) -> Tuple[bool, str]:
        """Render a single clip with trim applied."""
        output_path = os.path.join(self.output_dir, output_filename)

        cmd = [
            'ffmpeg', '-y',
            '-i', clip.path,
            '-ss', str(clip.start_trim),
            '-t', str(clip.effective_duration),
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '192k',
            output_path
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                return False, f"FFmpeg error: {result.stderr[-500:]}"
            return True, output_path
        except Exception as e:
            return False, str(e)

    # =================================================================
    # Subtitle burn-in filter builder
    # =================================================================
    def _build_subtitle_filters(
        self, subtitles: List[SubtitleInfo], input_label: str
    ) -> Tuple[List[str], str]:
        """Build drawtext filter chain for subtitles.

        Returns (filter_parts, final_video_label).
        """
        if not subtitles:
            return [], input_label

        filters = []
        current_label = input_label

        for i, sub in enumerate(subtitles):
            text = _escape_drawtext(sub.text)
            style = sub.style or {}

            font_size = style.get('fontSize', 24)
            if isinstance(font_size, str):
                font_size = int(font_size.replace('px', ''))
            font_family = style.get('fontFamily', 'Arial').split(',')[0].strip()
            font_color = style.get('color', 'white')
            bg_color = style.get('backgroundColor', 'black@0.7')
            position = style.get('position', 'bottom')
            font_weight = style.get('fontWeight', '')

            # Position: bottom center by default
            if position == 'top':
                x_expr = "(w-text_w)/2"
                y_expr = "40"
            else:
                x_expr = "(w-text_w)/2"
                y_expr = "h-80"

            # Convert hex color to FFmpeg format
            if font_color.startswith('#'):
                font_color = font_color  # FFmpeg accepts #RRGGBB

            # Background box
            box_enabled = 1
            box_color = "black@0.7"
            if bg_color == 'transparent' or bg_color == 'none':
                box_enabled = 0
            elif bg_color.startswith('rgba'):
                box_color = "black@0.7"  # Approximate

            out_label = f"vsub{i}"
            enable = f"between(t\\,{sub.start_time:.3f}\\,{sub.end_time:.3f})"

            drawtext = (
                f"[{current_label}]drawtext="
                f"text='{text}':"
                f"fontsize={font_size}:"
                f"fontcolor={font_color}:"
                f"fontfile=:"
                f"font='{font_family}':"
                f"x={x_expr}:y={y_expr}:"
                f"box={box_enabled}:boxcolor={box_color}:boxborderw=8:"
                f"enable='{enable}'"
            )

            # Bold text via borderw (simulates bold)
            if font_weight == 'bold':
                drawtext += ":borderw=1:bordercolor=white"

            drawtext += f"[{out_label}]"
            filters.append(drawtext)
            current_label = out_label

        return filters, current_label

    # =================================================================
    # Text overlay filter builder
    # =================================================================
    def _build_overlay_filters(
        self, overlays: List[TextOverlayInfo], input_label: str
    ) -> Tuple[List[str], str]:
        """Build drawtext filter chain for text overlays.

        Returns (filter_parts, final_video_label).
        """
        if not overlays:
            return [], input_label

        filters = []
        current_label = input_label

        for i, overlay in enumerate(overlays):
            text = _escape_drawtext(overlay.text)
            style = overlay.style or {}

            font_size = style.get('fontSize', 32)
            if isinstance(font_size, str):
                font_size = int(font_size.replace('px', ''))
            font_family = style.get('fontFamily', 'Arial').split(',')[0].strip()
            font_color = style.get('color', 'white')
            font_weight = style.get('fontWeight', '')
            animation = style.get('animation', 'none')

            # Position from style (percentage-based)
            pos = style.get('position', {'x': 50, 'y': 50})
            if isinstance(pos, dict):
                x_pct = pos.get('x', 50)
                y_pct = pos.get('y', 50)
                x_expr = f"(w*{x_pct}/100)-(text_w/2)"
                y_expr = f"(h*{y_pct}/100)-(text_h/2)"
            else:
                x_expr = "(w-text_w)/2"
                y_expr = "(h-text_h)/2"

            if font_color.startswith('#'):
                font_color = font_color

            # Background
            bg_color = style.get('backgroundColor', 'transparent')
            box_enabled = 0
            box_color = "black@0.5"
            if bg_color and bg_color != 'transparent' and bg_color != 'none':
                box_enabled = 1

            out_label = f"vovl{i}"
            enable = f"between(t\\,{overlay.start_time:.3f}\\,{overlay.end_time:.3f})"

            # Animation: fade-in via alpha
            alpha_expr = "1"
            fade_dur = 0.5
            if animation == 'fade':
                t_start = overlay.start_time
                t_end = overlay.end_time
                alpha_expr = (
                    f"if(lt(t\\,{t_start + fade_dur:.3f})\\,"
                    f"(t-{t_start:.3f})/{fade_dur:.3f}\\,"
                    f"if(gt(t\\,{t_end - fade_dur:.3f})\\,"
                    f"({t_end:.3f}-t)/{fade_dur:.3f}\\,1))"
                )

            drawtext = (
                f"[{current_label}]drawtext="
                f"text='{text}':"
                f"fontsize={font_size}:"
                f"fontcolor_expr={font_color}@'%{{eif\\:{alpha_expr}\\:d}}':"
                f"font='{font_family}':"
                f"x={x_expr}:y={y_expr}:"
                f"box={box_enabled}:boxcolor={box_color}:boxborderw=10:"
                f"enable='{enable}'"
            )

            if font_weight == 'bold':
                drawtext += ":borderw=1:bordercolor=white"

            drawtext += f"[{out_label}]"
            filters.append(drawtext)
            current_label = out_label

        return filters, current_label

    # =================================================================
    # Color grading filter builder
    # =================================================================
    def _build_color_grade_filter(
        self, grade: ColorGradeInfo, input_label: str
    ) -> Tuple[List[str], str]:
        """Build eq filter for color grading.

        Returns (filter_parts, final_video_label).
        """
        if not grade:
            return [], input_label

        # Only add filter if values differ from default
        is_default = (
            abs(grade.brightness) < 0.01 and
            abs(grade.contrast - 1.0) < 0.01 and
            abs(grade.saturation - 1.0) < 0.01 and
            abs(grade.gamma - 1.0) < 0.01
        )
        if is_default:
            return [], input_label

        out_label = "vcg"
        eq_filter = (
            f"[{input_label}]eq="
            f"brightness={grade.brightness:.3f}:"
            f"contrast={grade.contrast:.3f}:"
            f"saturation={grade.saturation:.3f}:"
            f"gamma={grade.gamma:.3f}"
            f"[{out_label}]"
        )
        return [eq_filter], out_label

    # =================================================================
    # Audio ducking filter builder
    # =================================================================
    def _build_audio_ducking_filter(
        self, ducking_points: List[AudioDuckPoint],
        bgm_input_label: str,
        base_volume: float
    ) -> Tuple[List[str], str]:
        """Build volume automation filter for BGM ducking during speech.

        Generates an FFmpeg volume expression that interpolates between
        ducking points for smooth BGM volume changes.

        Returns (filter_parts, final_audio_label).
        """
        if not ducking_points or len(ducking_points) < 2:
            return [], bgm_input_label

        # Sort by timestamp
        points = sorted(ducking_points, key=lambda p: p.timestamp)

        # Build a nested if() expression for volume automation
        # Each segment linearly interpolates between points
        # FFmpeg volume filter with eval=frame
        vol_expr_parts = []
        for i in range(len(points) - 1):
            t0 = points[i].timestamp
            v0 = points[i].bgm_volume * base_volume
            t1 = points[i + 1].timestamp
            v1 = points[i + 1].bgm_volume * base_volume

            # Linear interpolation: v0 + (v1-v0) * (t-t0)/(t1-t0)
            slope = (v1 - v0) / max(t1 - t0, 0.001)
            segment = f"if(between(t\\,{t0:.2f}\\,{t1:.2f})\\,{v0:.3f}+{slope:.6f}*(t-{t0:.2f})\\,"
            vol_expr_parts.append(segment)

        # Default fallback: last point's volume
        last_vol = points[-1].bgm_volume * base_volume
        vol_expr = "".join(vol_expr_parts) + f"{last_vol:.3f}" + ")" * len(vol_expr_parts)

        # Cap expression length — FFmpeg has limits
        # If too many points, simplify to step function
        if len(vol_expr) > 4000:
            # Simplify: sample every 2 seconds
            simplified = []
            for i in range(0, len(points) - 1, max(1, len(points) // 50)):
                t = points[i].timestamp
                v = points[i].bgm_volume * base_volume
                simplified.append(f"if(lt(t\\,{t:.1f})\\,{v:.2f}\\,")
            last_v = points[-1].bgm_volume * base_volume
            vol_expr = "".join(simplified) + f"{last_v:.2f}" + ")" * len(simplified)

        out_label = "bgm_ducked"
        duck_filter = (
            f"[{bgm_input_label}]volume='{vol_expr}':eval=frame[{out_label}]"
        )
        return [duck_filter], out_label

    # =================================================================
    # Main FFmpeg command builder
    # =================================================================
    def _build_stitch_command(
        self,
        clips: List[ClipInfo],
        transitions: List[TransitionInfo],
        output_path: str,
        background_audio: Optional[str],
        audio_volume: float,
        sfx_tracks: Optional[List[SFXTrackInfo]] = None,
        subtitles: Optional[List[SubtitleInfo]] = None,
        text_overlays: Optional[List[TextOverlayInfo]] = None,
        color_grade: Optional[ColorGradeInfo] = None,
        ducking_points: Optional[List[AudioDuckPoint]] = None,
    ) -> List[str]:
        """Build the FFmpeg command for stitching clips with all enhancements."""

        cmd = ['ffmpeg', '-y']

        # Add all input files: clips, then BGM, then SFX
        for clip in clips:
            cmd.extend(['-i', clip.path])

        if background_audio:
            cmd.extend(['-i', background_audio])

        if sfx_tracks:
            for sfx in sfx_tracks:
                cmd.extend(['-i', sfx.path])

        # Build the filter complex
        filter_parts = []
        audio_filter_parts = []

        if len(clips) == 1:
            # Single clip - simple trim/passthrough
            clip = clips[0]
            if clip.start_trim > 0 or clip.end_trim > 0:
                filter_parts.append(
                    f"[0:v]trim=start={clip.start_trim}:duration={clip.effective_duration},"
                    f"setpts=PTS-STARTPTS[vout]"
                )
                audio_filter_parts.append(
                    f"[0:a]atrim=start={clip.start_trim}:duration={clip.effective_duration},"
                    f"asetpts=PTS-STARTPTS[aout]"
                )
            else:
                filter_parts.append("[0:v]null[vout]")
                audio_filter_parts.append("[0:a]anull[aout]")
        else:
            # Multi-clip: trim each clip, then apply xfade transitions
            for i, clip in enumerate(clips):
                if clip.start_trim > 0 or clip.end_trim > 0:
                    filter_parts.append(
                        f"[{i}:v]trim=start={clip.start_trim}:duration={clip.effective_duration},"
                        f"setpts=PTS-STARTPTS[v{i}]"
                    )
                    audio_filter_parts.append(
                        f"[{i}:a]atrim=start={clip.start_trim}:duration={clip.effective_duration},"
                        f"asetpts=PTS-STARTPTS[a{i}]"
                    )
                else:
                    filter_parts.append(f"[{i}:v]null[v{i}]")
                    audio_filter_parts.append(f"[{i}:a]anull[a{i}]")

            # Apply xfade transitions between clips
            current_offset = clips[0].effective_duration
            prev_video = "v0"
            prev_audio = "a0"

            for i, transition in enumerate(transitions):
                next_video = f"v{i + 1}"
                next_audio = f"a{i + 1}"
                output_video = f"vt{i}" if i < len(transitions) - 1 else "vout"
                output_audio = f"at{i}" if i < len(transitions) - 1 else "aout"

                xfade_type, custom_expr = self.get_xfade_transition(transition.type)

                if xfade_type is None or transition.type == 'cut':
                    filter_parts.append(
                        f"[{prev_video}][{next_video}]concat=n=2:v=1:a=0[{output_video}]"
                    )
                    audio_filter_parts.append(
                        f"[{prev_audio}][{next_audio}]concat=n=2:v=0:a=1[{output_audio}]"
                    )
                else:
                    offset = current_offset - transition.duration

                    if custom_expr:
                        # Apply easing to custom expression by replacing P
                        easing = (transition.parameters or {}).get('easing', 'linear')
                        easing_expr = self._get_easing_expr(easing)
                        if easing_expr != 'P':
                            expr_with_easing = custom_expr.replace('P', easing_expr)
                        else:
                            expr_with_easing = custom_expr
                        filter_parts.append(
                            f"[{prev_video}][{next_video}]xfade=transition=custom:"
                            f"duration={transition.duration}:offset={offset}:"
                            f"expr='{expr_with_easing}'[{output_video}]"
                        )
                    else:
                        filter_parts.append(
                            f"[{prev_video}][{next_video}]xfade=transition={xfade_type}:"
                            f"duration={transition.duration}:offset={offset}[{output_video}]"
                        )

                    audio_filter_parts.append(
                        f"[{prev_audio}][{next_audio}]acrossfade=d={transition.duration}[{output_audio}]"
                    )

                current_offset = offset + clips[i + 1].effective_duration
                prev_video = output_video
                prev_audio = output_audio

        # ====== VIDEO POST-PROCESSING CHAIN ======
        # Applied after xfade: color grading -> subtitles -> text overlays
        final_video = "vout"
        video_post_filters = []

        # 1. Color grading (eq filter)
        if color_grade:
            cg_filters, final_video = self._build_color_grade_filter(
                color_grade, final_video
            )
            video_post_filters.extend(cg_filters)

        # 2. Subtitle burn-in (drawtext chain)
        if subtitles:
            sub_filters, final_video = self._build_subtitle_filters(
                subtitles, final_video
            )
            video_post_filters.extend(sub_filters)

        # 3. Text overlays (drawtext chain)
        if text_overlays:
            ovl_filters, final_video = self._build_overlay_filters(
                text_overlays, final_video
            )
            video_post_filters.extend(ovl_filters)

        # Combine all filter parts
        all_filters = filter_parts + audio_filter_parts + video_post_filters
        final_audio = "aout"

        # ====== AUDIO POST-PROCESSING CHAIN ======
        # BGM with optional ducking, then SFX mixing

        # Add background audio mix with optional ducking
        if background_audio:
            bgm_index = len(clips)
            bgm_label = f"{bgm_index}:a"

            if ducking_points:
                # Apply volume automation for speech ducking
                duck_filters, ducked_label = self._build_audio_ducking_filter(
                    ducking_points, bgm_label, audio_volume
                )
                all_filters.extend(duck_filters)

                # Mix ducked BGM with main audio
                all_filters.append(
                    f"[{final_audio}][{ducked_label}]amix=inputs=2:"
                    f"duration=first:normalize=0[abgm]"
                )
            else:
                # Static volume mix (original behavior)
                all_filters.append(
                    f"[{final_audio}][{bgm_index}:a]amix=inputs=2:duration=first:"
                    f"weights=1 {audio_volume}[abgm]"
                )
            final_audio = "abgm"

        # Add SFX mixing
        if sfx_tracks:
            sfx_start_idx = len(clips) + (1 if background_audio else 0)

            sfx_labels = []
            for i, sfx in enumerate(sfx_tracks):
                input_idx = sfx_start_idx + i
                delay_ms = int(sfx.start_time * 1000)
                label = f"sfxd{i}"
                all_filters.append(
                    f"[{input_idx}:a]adelay={delay_ms}|{delay_ms},"
                    f"volume={sfx.volume}[{label}]"
                )
                sfx_labels.append(label)

            # Mix all SFX with main audio
            mix_inputs = f"[{final_audio}]" + "".join(f"[{l}]" for l in sfx_labels)
            num_inputs = 1 + len(sfx_tracks)
            all_filters.append(
                f"{mix_inputs}amix=inputs={num_inputs}:duration=first:normalize=0[asfx]"
            )
            final_audio = "asfx"

        # Build the complete filter_complex
        filter_complex = ";".join(all_filters)

        cmd.extend(['-filter_complex', filter_complex])
        cmd.extend(['-map', f'[{final_video}]', '-map', f'[{final_audio}]'])

        # Output settings
        cmd.extend([
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            output_path
        ])

        return cmd

    def stitch_two_clips(
        self,
        clip1_path: str,
        clip2_path: str,
        transition_type: str,
        transition_duration: float,
        output_path: str
    ) -> Tuple[bool, str]:
        """
        Simple method to stitch exactly two clips with a transition.
        Useful for testing or simple use cases.
        """
        # Get clip durations
        duration1 = self._get_video_duration(clip1_path)
        duration2 = self._get_video_duration(clip2_path)

        if duration1 is None or duration2 is None:
            return False, "Could not get video durations"

        xfade = self.get_xfade_transition(transition_type)
        offset = duration1 - transition_duration

        if xfade is None or transition_type == 'cut':
            # Simple concatenation
            cmd = [
                'ffmpeg', '-y',
                '-i', clip1_path,
                '-i', clip2_path,
                '-filter_complex',
                '[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]',
                '-map', '[v]', '-map', '[a]',
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
                '-c:a', 'aac', '-b:a', '192k',
                output_path
            ]
        else:
            # With xfade transition
            cmd = [
                'ffmpeg', '-y',
                '-i', clip1_path,
                '-i', clip2_path,
                '-filter_complex',
                f'[0:v][1:v]xfade=transition={xfade}:duration={transition_duration}:offset={offset}[v];'
                f'[0:a][1:a]acrossfade=d={transition_duration}[a]',
                '-map', '[v]', '-map', '[a]',
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
                '-c:a', 'aac', '-b:a', '192k',
                output_path
            ]

        try:
            print(f"FFmpeg command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                return False, f"FFmpeg error: {result.stderr[-500:]}"
            return True, output_path
        except Exception as e:
            return False, str(e)

    def _get_video_duration(self, video_path: str) -> Optional[float]:
        """Get the duration of a video file using ffprobe."""
        try:
            result = subprocess.run(
                [
                    'ffprobe', '-v', 'error',
                    '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1',
                    video_path
                ],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                return float(result.stdout.strip())
            return None
        except:
            return None


# Singleton instance
video_stitcher: Optional[VideoStitcher] = None


def get_video_stitcher(output_dir: str) -> VideoStitcher:
    """Get or create the video stitcher instance."""
    global video_stitcher
    if video_stitcher is None or video_stitcher.output_dir != output_dir:
        video_stitcher = VideoStitcher(output_dir)
    return video_stitcher
