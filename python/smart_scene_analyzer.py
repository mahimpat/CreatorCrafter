#!/usr/bin/env python3
"""
Smart Scene Analyzer
Intelligent video scene detection, classification, and analysis for accurate SFX/music suggestions.

Features:
- Scene detection using PySceneDetect (cuts, transitions)
- Mood detection (color analysis, brightness)
- Energy calculation (motion intensity, cut frequency)
- Scene type classification (dialogue, action, transition)
"""

import cv2
import numpy as np
import sys
from typing import List, Dict, Any, Tuple
from scenedetect import detect, ContentDetector, AdaptiveDetector


class SceneDetector:
    """
    Detect scene boundaries using PySceneDetect.
    Finds cuts and transitions to segment video into coherent scenes.
    """

    def __init__(self, threshold: float = 27.0):
        """
        Args:
            threshold: Sensitivity for scene detection (lower = more sensitive)
        """
        self.threshold = threshold

    def detect_scenes(self, video_path: str) -> List[Dict[str, Any]]:
        """
        Detect all scene boundaries in a video.

        Args:
            video_path: Path to video file

        Returns:
            List of scenes with start/end times
        """
        try:
            # Use ContentDetector for cut detection
            scene_list = detect(
                video_path,
                ContentDetector(threshold=self.threshold)
            )

            # Convert to our format
            scenes = []
            for i, (start_time, end_time) in enumerate(scene_list):
                scenes.append({
                    'scene_id': i,
                    'start': start_time.get_seconds(),
                    'end': end_time.get_seconds(),
                    'duration': (end_time - start_time).get_seconds(),
                    'start_frame': start_time.get_frames(),
                    'end_frame': end_time.get_frames()
                })

            # If no scenes detected, treat entire video as one scene
            if len(scenes) == 0:
                print("No scene cuts detected, treating video as single scene", file=sys.stderr)
                cap = cv2.VideoCapture(video_path)
                fps = cap.get(cv2.CAP_PROP_FPS)
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = frame_count / fps
                cap.release()

                scenes = [{
                    'scene_id': 0,
                    'start': 0.0,
                    'end': duration,
                    'duration': duration,
                    'start_frame': 0,
                    'end_frame': frame_count
                }]

            return scenes

        except Exception as e:
            print(f"Scene detection error: {e}", file=sys.stderr)
            # Fallback: treat entire video as one scene
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps
            cap.release()

            return [{
                'scene_id': 0,
                'start': 0.0,
                'end': duration,
                'duration': duration,
                'start_frame': 0,
                'end_frame': frame_count
            }]


class MoodAnalyzer:
    """
    Analyze scene mood based on visual characteristics.
    Uses color, brightness, and contrast to determine emotional tone.
    """

    @staticmethod
    def analyze_colors(frame: np.ndarray) -> Dict[str, float]:
        """
        Analyze color characteristics of a frame.

        Returns:
            Dict with color metrics (warmth, saturation, brightness)
        """
        # Convert to HSV for better color analysis
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # Calculate metrics
        hue = hsv[:, :, 0]
        saturation = hsv[:, :, 1]
        value = hsv[:, :, 2]

        # Warmth: proportion of warm colors (reds, oranges, yellows)
        warm_mask = ((hue >= 0) & (hue <= 30)) | ((hue >= 150) & (hue <= 180))
        warmth = np.mean(warm_mask.astype(float))

        # Overall metrics
        avg_saturation = np.mean(saturation) / 255.0
        avg_brightness = np.mean(value) / 255.0

        return {
            'warmth': float(warmth),
            'saturation': float(avg_saturation),
            'brightness': float(avg_brightness)
        }

    @staticmethod
    def detect_mood(color_metrics: Dict[str, float]) -> Tuple[str, float]:
        """
        Detect mood based on color characteristics.

        Returns:
            (mood_name, confidence)
        """
        warmth = color_metrics['warmth']
        saturation = color_metrics['saturation']
        brightness = color_metrics['brightness']

        # Mood detection rules
        if brightness > 0.6 and saturation > 0.4:
            if warmth > 0.5:
                return ('cheerful', 0.85)  # Bright, warm, saturated
            else:
                return ('energetic', 0.80)  # Bright, cool, saturated

        elif brightness < 0.3:
            if saturation > 0.3:
                return ('tense', 0.75)  # Dark with some color
            else:
                return ('dark', 0.80)  # Very dark, desaturated

        elif saturation < 0.2:
            if brightness > 0.5:
                return ('calm', 0.70)  # Bright but desaturated
            else:
                return ('melancholic', 0.70)  # Dark and desaturated

        else:
            return ('neutral', 0.60)  # Middle ground

    def analyze_scene_mood(self, video_path: str, start_frame: int, end_frame: int) -> Dict[str, Any]:
        """
        Analyze mood for an entire scene by sampling multiple frames.

        Args:
            video_path: Path to video
            start_frame: Scene start frame
            end_frame: Scene end frame

        Returns:
            Mood analysis results
        """
        cap = cv2.VideoCapture(video_path)

        # Sample 5 frames evenly distributed through scene
        frame_count = end_frame - start_frame
        sample_count = min(5, frame_count)
        sample_indices = np.linspace(start_frame, end_frame - 1, sample_count, dtype=int)

        color_metrics_list = []

        for frame_idx in sample_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()

            if ret:
                metrics = self.analyze_colors(frame)
                color_metrics_list.append(metrics)

        cap.release()

        # Average metrics across samples
        if color_metrics_list:
            avg_metrics = {
                'warmth': np.mean([m['warmth'] for m in color_metrics_list]),
                'saturation': np.mean([m['saturation'] for m in color_metrics_list]),
                'brightness': np.mean([m['brightness'] for m in color_metrics_list])
            }

            mood, confidence = self.detect_mood(avg_metrics)

            return {
                'mood': mood,
                'confidence': confidence,
                'color_metrics': avg_metrics
            }

        return {
            'mood': 'neutral',
            'confidence': 0.5,
            'color_metrics': {'warmth': 0.5, 'saturation': 0.5, 'brightness': 0.5}
        }


class EnergyAnalyzer:
    """
    Calculate scene energy level based on motion and editing.
    High energy = fast cuts, lots of motion
    Low energy = slow pacing, minimal motion
    """

    @staticmethod
    def calculate_motion_intensity(video_path: str, start_frame: int, end_frame: int) -> float:
        """
        Calculate average motion intensity for a scene.

        Returns:
            Motion intensity (0.0 - 1.0)
        """
        cap = cv2.VideoCapture(video_path)

        # Sample frames for motion analysis
        frame_count = end_frame - start_frame
        sample_count = min(10, frame_count - 1)  # Need pairs of frames
        sample_indices = np.linspace(start_frame, end_frame - 2, sample_count, dtype=int)

        motion_scores = []
        prev_gray = None

        for frame_idx in sample_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()

            if not ret:
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (5, 5), 0)

            if prev_gray is not None:
                # Calculate frame difference
                diff = cv2.absdiff(gray, prev_gray)
                motion = np.mean(diff) / 255.0
                motion_scores.append(motion)

            prev_gray = gray

        cap.release()

        if motion_scores:
            return float(np.mean(motion_scores))
        return 0.0

    @staticmethod
    def calculate_cut_frequency(scenes: List[Dict], video_duration: float) -> float:
        """
        Calculate cut frequency (cuts per minute).

        Returns:
            Cuts per minute
        """
        if video_duration == 0:
            return 0.0

        num_scenes = len(scenes)
        cuts_per_minute = (num_scenes / video_duration) * 60
        return cuts_per_minute

    def calculate_energy(self, motion_intensity: float, cut_frequency: float) -> Tuple[int, str]:
        """
        Calculate overall energy level (1-10 scale).

        Args:
            motion_intensity: Motion level (0.0 - 1.0)
            cut_frequency: Cuts per minute

        Returns:
            (energy_level, energy_label)
        """
        # Normalize cut frequency (typical range: 0-30 cuts/min)
        normalized_cuts = min(cut_frequency / 30.0, 1.0)

        # Weighted average (motion 60%, cuts 40%)
        energy_score = (motion_intensity * 0.6) + (normalized_cuts * 0.4)

        # Convert to 1-10 scale
        energy_level = max(1, min(10, int(energy_score * 10) + 1))

        # Label
        if energy_level <= 3:
            label = 'low'
        elif energy_level <= 6:
            label = 'medium'
        elif energy_level <= 8:
            label = 'high'
        else:
            label = 'very high'

        return energy_level, label


class SmartSceneAnalyzer:
    """
    Main class that orchestrates scene detection, mood analysis, and energy calculation.
    """

    def __init__(self):
        self.scene_detector = SceneDetector()
        self.mood_analyzer = MoodAnalyzer()
        self.energy_analyzer = EnergyAnalyzer()

    def analyze_video(self, video_path: str) -> List[Dict[str, Any]]:
        """
        Perform complete smart scene analysis.

        Args:
            video_path: Path to video file

        Returns:
            List of scenes with full analysis (mood, energy, timing)
        """
        import sys

        print("🎬 Smart Scene Analysis Started", file=sys.stderr)

        # 1. Detect scene boundaries
        print("Detecting scenes...", file=sys.stderr)
        scenes = self.scene_detector.detect_scenes(video_path)
        print(f"✓ Found {len(scenes)} scenes", file=sys.stderr)

        # 2. Get video metadata
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        cap.release()

        # 3. Calculate cut frequency
        cut_frequency = self.energy_analyzer.calculate_cut_frequency(scenes, duration)

        # 4. Analyze each scene
        print(f"Analyzing {len(scenes)} scenes for mood and energy...", file=sys.stderr)

        for i, scene in enumerate(scenes):
            # Mood analysis
            mood_result = self.mood_analyzer.analyze_scene_mood(
                video_path,
                scene['start_frame'],
                scene['end_frame']
            )

            # Energy analysis
            motion_intensity = self.energy_analyzer.calculate_motion_intensity(
                video_path,
                scene['start_frame'],
                scene['end_frame']
            )

            energy_level, energy_label = self.energy_analyzer.calculate_energy(
                motion_intensity,
                cut_frequency
            )

            # Add analysis results to scene
            scene.update({
                'mood': mood_result['mood'],
                'mood_confidence': mood_result['confidence'],
                'color_metrics': mood_result['color_metrics'],
                'motion_intensity': motion_intensity,
                'energy_level': energy_level,
                'energy_label': energy_label,
                'fps': fps
            })

            # Progress indicator
            progress = int((i + 1) / len(scenes) * 100)
            print(f"  Scene {i+1}/{len(scenes)}: {scene['mood']} mood, {energy_label} energy ({progress}%)", file=sys.stderr)

        print("✓ Smart scene analysis complete!", file=sys.stderr)

        return scenes


# For testing
if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: python smart_scene_analyzer.py <video_path>")
        sys.exit(1)

    analyzer = SmartSceneAnalyzer()
    scenes = analyzer.analyze_video(sys.argv[1])

    print("\n=== Scene Analysis Results ===")
    for scene in scenes:
        print(f"\nScene {scene['scene_id']}: {scene['start']:.2f}s - {scene['end']:.2f}s ({scene['duration']:.2f}s)")
        print(f"  Mood: {scene['mood']} (confidence: {scene['mood_confidence']:.2f})")
        print(f"  Energy: {scene['energy_level']}/10 ({scene['energy_label']})")
        print(f"  Motion: {scene['motion_intensity']:.3f}")
        print(f"  Colors: warmth={scene['color_metrics']['warmth']:.2f}, brightness={scene['color_metrics']['brightness']:.2f}")
