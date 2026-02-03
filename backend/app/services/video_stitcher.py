"""
Video Stitcher Service - Implements 90+ professional video transitions using FFmpeg.

This service handles:
1. Stitching multiple video clips together
2. Applying transitions between clips using FFmpeg's xfade filter
3. Mixing background audio and SFX
4. Rendering final output video
"""
import os
import subprocess
import tempfile
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass


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


class VideoStitcher:
    """Service for stitching video clips with transitions."""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def get_xfade_transition(self, transition_type: str) -> Optional[str]:
        """Get the FFmpeg xfade transition name for our transition type."""
        return XFADE_TRANSITIONS.get(transition_type, 'fade')

    def stitch_clips(
        self,
        clips: List[ClipInfo],
        transitions: List[TransitionInfo],
        output_filename: str,
        background_audio: Optional[str] = None,
        audio_volume: float = 0.3,
        sfx_tracks: Optional[List[SFXTrackInfo]] = None
    ) -> Tuple[bool, str]:
        """
        Stitch multiple clips together with transitions.

        Args:
            clips: List of clip information
            transitions: List of transitions (should be len(clips) - 1)
            output_filename: Name of output file
            background_audio: Optional background music path
            audio_volume: Volume for background audio (0-1)
            sfx_tracks: Optional list of SFX tracks to mix in

        Returns:
            Tuple of (success, output_path or error_message)
        """
        if len(clips) < 1:
            return False, "No clips provided"

        if len(clips) == 1 and not sfx_tracks and not background_audio:
            # Single clip with no audio mixing needed
            return self._render_single_clip(clips[0], output_filename)

        if len(clips) > 1 and len(transitions) != len(clips) - 1:
            return False, f"Expected {len(clips) - 1} transitions, got {len(transitions)}"

        output_path = os.path.join(self.output_dir, output_filename)

        try:
            # Build the FFmpeg command
            cmd = self._build_stitch_command(
                clips, transitions, output_path,
                background_audio, audio_volume, sfx_tracks
            )
            print(f"FFmpeg command: {' '.join(cmd)}")

            # Execute FFmpeg
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

    def _build_stitch_command(
        self,
        clips: List[ClipInfo],
        transitions: List[TransitionInfo],
        output_path: str,
        background_audio: Optional[str],
        audio_volume: float,
        sfx_tracks: Optional[List[SFXTrackInfo]] = None
    ) -> List[str]:
        """Build the FFmpeg command for stitching clips with transitions, BGM, and SFX."""

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

                xfade_type = self.get_xfade_transition(transition.type)

                if xfade_type is None or transition.type == 'cut':
                    filter_parts.append(
                        f"[{prev_video}][{next_video}]concat=n=2:v=1:a=0[{output_video}]"
                    )
                    audio_filter_parts.append(
                        f"[{prev_audio}][{next_audio}]concat=n=2:v=0:a=1[{output_audio}]"
                    )
                else:
                    offset = current_offset - transition.duration
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

        # Combine filter parts
        all_filters = filter_parts + audio_filter_parts
        final_audio = "aout"

        # Add background audio mix if provided
        if background_audio:
            bgm_index = len(clips)
            all_filters.append(
                f"[{final_audio}][{bgm_index}:a]amix=inputs=2:duration=first:"
                f"weights=1 {audio_volume}[abgm]"
            )
            final_audio = "abgm"

        # Add SFX mixing if provided
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
        cmd.extend(['-map', '[vout]', '-map', f'[{final_audio}]'])

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
