#!/usr/bin/env python3
"""
Event Detector for Video Analysis
Detects precise moments where sounds should occur:
- Motion peaks (impacts, slams, movements)
- Scene transitions (cuts, fades)
- Object interactions

Enhanced with:
- Transition detection to filter false positives
- Adaptive thresholds based on scene energy
- Scene boundary buffering
- Prominence-based peak detection
"""

import cv2
import numpy as np
import sys
import os
from typing import List, Dict, Tuple
from scipy.signal import find_peaks
from transition_detector import TransitionDetector

# Suppress FFmpeg/OpenCV H.264 decoder warnings
# These warnings spam the console during frame-by-frame analysis but don't affect functionality
os.environ['OPENCV_FFMPEG_LOGLEVEL'] = '-8'  # Suppress all FFmpeg warnings
cv2.setLogLevel(0)  # Suppress OpenCV warnings


class EventDetector:
    """
    Detect events in video for frame-accurate SFX timing.
    Enhanced with transition detection and adaptive thresholds.
    """

    def __init__(
        self,
        base_motion_threshold: float = 0.15,
        scene_boundary_buffer: float = 0.5,
        frame_skip: int = 1,
        enable_transition_detection: bool = True
    ):
        """
        Args:
            base_motion_threshold: Base threshold for detecting significant motion
            scene_boundary_buffer: Time (seconds) to ignore near scene boundaries
            frame_skip: Skip every N frames (1 = analyze all frames)
            enable_transition_detection: Enable transition filtering (slower but more accurate)
        """
        self.base_motion_threshold = base_motion_threshold
        self.scene_boundary_buffer = scene_boundary_buffer
        self.frame_skip = frame_skip
        self.enable_transition_detection = enable_transition_detection
        self.transition_detector = TransitionDetector() if enable_transition_detection else None

    def get_adaptive_threshold(self, scene: Dict) -> float:
        """
        Calculate adaptive motion threshold based on scene characteristics.

        Lower threshold for calm scenes (catch subtle motion)
        Higher threshold for high-energy scenes (avoid camera motion false positives)

        Args:
            scene: Scene dictionary with energy_level

        Returns:
            Adjusted motion threshold
        """
        base = self.base_motion_threshold
        energy_level = scene.get('energy_level', 5)

        # Low energy (calm scenes) - lower threshold to catch subtle motions
        if energy_level < 3:
            return base * 0.7

        # High energy (action scenes) - higher threshold to avoid camera motion
        elif energy_level > 7:
            return base * 1.5

        # Medium energy - use base threshold
        return base

    def is_near_scene_boundary(self, timestamp: float, scene: Dict) -> bool:
        """
        Check if timestamp is within buffer distance of scene start/end.
        Motion near boundaries is often transition artifacts.

        Args:
            timestamp: Time in seconds
            scene: Scene dictionary with start/end times

        Returns:
            True if within buffer of scene boundary
        """
        start = scene.get('start', 0)
        end = scene.get('end', float('inf'))

        return (timestamp - start < self.scene_boundary_buffer or
                end - timestamp < self.scene_boundary_buffer)

    def detect_motion_peaks(self, video_path: str, scenes: List[Dict]) -> List[Dict]:
        """
        Detect motion peaks within each scene with enhanced filtering.

        Enhancements:
        - Filters out transitions (cuts, fades, dissolves)
        - Uses adaptive thresholds based on scene energy
        - Ignores motion near scene boundaries
        - Better peak detection with prominence

        Args:
            video_path: Path to video file
            scenes: List of scenes from smart analysis

        Returns:
            List of motion peak events with timing and intensity
        """
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)

        all_events = []
        filtered_count = {'transitions': 0, 'boundaries': 0}

        print(f"🔍 Enhanced motion detection with transition filtering...", file=sys.stderr)

        for scene_idx, scene in enumerate(scenes):
            start_frame = scene['start_frame']
            end_frame = scene['end_frame']

            # Get adaptive threshold for this scene
            adaptive_threshold = self.get_adaptive_threshold(scene)

            # Analyze motion frame by frame with transition detection
            motion_history = []
            prev_frame = None
            prev_gray = None

            for frame_idx in range(start_frame, end_frame):
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, curr_frame = cap.read()

                if not ret:
                    break

                # Convert to grayscale (keep unblurred for transition detection)
                curr_gray_raw = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)
                curr_gray = cv2.GaussianBlur(curr_gray_raw, (5, 5), 0)

                if prev_frame is not None and prev_gray is not None:
                    # Check for transitions FIRST before analyzing motion (if enabled)
                    transition_type = None
                    if self.enable_transition_detection:
                        # Pass unblurred grayscale frames to avoid redundant conversions
                        # Use the raw grayscale (before blur) for transition detection
                        prev_gray_raw = getattr(self, '_prev_gray_raw', None)
                        transition_type = self.transition_detector.detect_transition_type(
                            prev_frame, curr_frame, None, prev_gray_raw, curr_gray_raw
                        )

                    # Store raw grayscale for next iteration
                    self._prev_gray_raw = curr_gray_raw

                    if transition_type:
                        # Skip this frame - it's a transition, not real motion
                        filtered_count['transitions'] += 1
                        # print(f"  Filtered {transition_type} at frame {frame_idx}", file=sys.stderr)
                    else:
                        # No transition detected - analyze motion normally
                        diff = cv2.absdiff(curr_gray, prev_gray)
                        motion_score = np.mean(diff) / 255.0

                        timestamp = frame_idx / fps

                        # Check if near scene boundary
                        if self.is_near_scene_boundary(timestamp, scene):
                            # Still record but mark as boundary
                            motion_history.append({
                                'frame': frame_idx,
                                'timestamp': timestamp,
                                'motion': motion_score,
                                'near_boundary': True
                            })
                        else:
                            motion_history.append({
                                'frame': frame_idx,
                                'timestamp': timestamp,
                                'motion': motion_score,
                                'near_boundary': False
                            })

                prev_frame = curr_frame
                prev_gray = curr_gray

            # Find peaks in motion with enhanced detection
            if len(motion_history) > 2:
                events = self._find_peaks_enhanced(
                    motion_history,
                    scene,
                    adaptive_threshold
                )
                all_events.extend(events)

                # Count filtered boundaries
                boundary_filtered = sum(1 for m in motion_history if m.get('near_boundary', False))
                filtered_count['boundaries'] += boundary_filtered

            # Progress
            progress = int((scene_idx + 1) / len(scenes) * 100)
            print(f"  Scene {scene_idx+1}/{len(scenes)}: {len(motion_history)} frames, threshold={adaptive_threshold:.3f} ({progress}%)", file=sys.stderr)

        cap.release()

        print(f"✓ Motion detection complete!", file=sys.stderr)
        print(f"  Filtered {filtered_count['transitions']} transition frames", file=sys.stderr)
        print(f"  Filtered {filtered_count['boundaries']} boundary frames", file=sys.stderr)
        print(f"  Detected {len(all_events)} motion peak events", file=sys.stderr)

        return all_events

    def _find_peaks_enhanced(
        self,
        motion_history: List[Dict],
        scene: Dict,
        threshold: float
    ) -> List[Dict]:
        """
        Find motion peaks using prominence-based detection (scipy).
        Better than simple local maximum - peaks must "stand out".

        Args:
            motion_history: List of motion measurements
            scene: Scene metadata
            threshold: Adaptive motion threshold for this scene

        Returns:
            List of peak events
        """
        peaks = []

        # Convert to numpy for easier processing
        motion_values = np.array([m['motion'] for m in motion_history])
        near_boundaries = np.array([m.get('near_boundary', False) for m in motion_history])

        # Use scipy find_peaks with prominence for better peak detection
        # Prominence ensures peaks "stand out" from their surroundings
        peak_indices, properties = find_peaks(
            motion_values,
            height=threshold,  # Minimum height (adaptive threshold)
            prominence=0.05,   # Must stand out by at least 0.05 from neighbors
            distance=10        # At least 10 frames (0.33s at 30fps) between peaks
        )

        for idx in peak_indices:
            # Skip peaks near scene boundaries
            if near_boundaries[idx]:
                continue

            # Calculate intensity (0-10 scale)
            intensity = min(10, int(motion_values[idx] * 20))

            # Get prominence for confidence calculation
            prominence = properties['prominences'][np.where(peak_indices == idx)[0][0]]
            confidence = min(0.95, 0.75 + (prominence * 2))  # Higher prominence = higher confidence

            peak_event = {
                'type': 'motion_peak',
                'timestamp': motion_history[idx]['timestamp'],
                'frame': motion_history[idx]['frame'],
                'intensity': intensity,
                'motion_score': float(motion_values[idx]),
                'prominence': float(prominence),
                'confidence': confidence,
                'scene_id': scene['scene_id'],
                'scene_mood': scene.get('mood', 'neutral'),
                'scene_description': scene.get('description', ''),
                'detection_method': 'enhanced'  # Mark as using enhanced detection
            }

            peaks.append(peak_event)

        return peaks

    def _find_peaks(self, motion_history: List[Dict], scene: Dict) -> List[Dict]:
        """
        LEGACY: Find motion peaks in the motion history (simple method).
        Kept for backward compatibility. New code should use _find_peaks_enhanced.

        Args:
            motion_history: List of motion measurements
            scene: Scene metadata

        Returns:
            List of peak events
        """
        peaks = []

        # Convert to numpy for easier processing
        motion_values = np.array([m['motion'] for m in motion_history])

        # Find local maxima
        for i in range(1, len(motion_values) - 1):
            # Check if this is a local maximum
            if (motion_values[i] > motion_values[i-1] and
                motion_values[i] > motion_values[i+1] and
                motion_values[i] > self.base_motion_threshold):

                # Calculate intensity (0-10 scale)
                intensity = min(10, int(motion_values[i] * 20))

                peak_event = {
                    'type': 'motion_peak',
                    'timestamp': motion_history[i]['timestamp'],
                    'frame': motion_history[i]['frame'],
                    'intensity': intensity,
                    'motion_score': float(motion_values[i]),
                    'scene_id': scene['scene_id'],
                    'scene_mood': scene.get('mood', 'neutral'),
                    'scene_description': scene.get('description', ''),
                    'detection_method': 'legacy'
                }

                peaks.append(peak_event)

        return peaks

    def detect_scene_transitions(self, scenes: List[Dict]) -> List[Dict]:
        """
        Convert scene boundaries into transition events.

        Args:
            scenes: List of scenes

        Returns:
            List of transition events
        """
        transitions = []

        for i in range(len(scenes) - 1):
            current_scene = scenes[i]
            next_scene = scenes[i + 1]

            transition = {
                'type': 'scene_transition',
                'timestamp': current_scene['end'],
                'from_scene': current_scene['scene_id'],
                'to_scene': next_scene['scene_id'],
                'from_mood': current_scene.get('mood', 'neutral'),
                'to_mood': next_scene.get('mood', 'neutral'),
                'from_energy': current_scene.get('energy_level', 5),
                'to_energy': next_scene.get('energy_level', 5)
            }

            transitions.append(transition)

        return transitions


class EventClassifier:
    """
    Classify detected events into categories for appropriate sound effects.
    """

    @staticmethod
    def classify_motion_event(event: Dict, visual_context: str) -> Dict:
        """
        Classify a motion peak event based on intensity and visual context.

        Args:
            event: Motion peak event
            visual_context: Visual description of the scene

        Returns:
            Classified event with sound prompt
        """
        intensity = event['intensity']
        visual = visual_context.lower()

        # Determine event category based on intensity
        if intensity >= 7:
            category = 'impact'
            base_sound = 'strong impact, loud sound'
        elif intensity >= 4:
            category = 'movement'
            base_sound = 'noticeable movement'
        else:
            category = 'subtle_motion'
            base_sound = 'subtle motion'

        # Build context-aware prompt
        prompt = f"{base_sound} in scene with {visual_context}"

        # Add mood context
        mood = event.get('scene_mood', 'neutral')
        if mood != 'neutral':
            mood_map = {
                'cheerful': ', energetic atmosphere',
                'tense': ', tense and dramatic',
                'dark': ', ominous and heavy',
                'calm': ', gentle and soft'
            }
            prompt += mood_map.get(mood, '')

        event['category'] = category
        event['sound_prompt'] = prompt

        return event

    @staticmethod
    def classify_transition_event(event: Dict) -> Dict:
        """
        Classify a scene transition event with improved audio prompts.

        Generates specific, concrete audio descriptions that AudioCraft can synthesize well.
        Considers energy changes, mood shifts, and transition characteristics.

        Args:
            event: Transition event

        Returns:
            Classified event with enhanced sound prompt
        """
        from_energy = event['from_energy']
        to_energy = event['to_energy']
        from_mood = event.get('from_mood', 'neutral')
        to_mood = event.get('to_mood', 'neutral')

        energy_change = to_energy - from_energy
        avg_energy = (from_energy + to_energy) / 2

        # Determine transition type based on energy change
        if energy_change >= 4:
            # DRAMATIC RISE: Low to High Energy
            category = 'dramatic_rise'

            # Choose prompt based on target mood
            if to_mood in ['tense', 'dark']:
                prompt = 'deep bass riser with tension build, dramatic whoosh crescendo, ominous rumble'
            elif to_mood in ['energetic', 'cheerful']:
                prompt = 'bright uplifting riser with shimmer, ascending whoosh, positive energy build'
            else:
                prompt = 'cinematic riser with whoosh, building tension and momentum, sweeping crescendo'

        elif energy_change >= 2:
            # MODERATE RISE: Building energy
            category = 'rising_transition'

            if to_mood in ['tense', 'dark']:
                prompt = 'subtle tension riser, low frequency build-up with dark ambience'
            elif to_mood in ['energetic', 'cheerful']:
                prompt = 'uplifting whoosh with sparkle, bright transition stinger, hopeful rise'
            else:
                prompt = 'smooth upward whoosh with shimmer, gentle energy increase, light swoosh'

        elif energy_change <= -4:
            # DRAMATIC FALL: High to Low Energy
            category = 'dramatic_fall'

            # Choose prompt based on target mood
            if to_mood in ['calm', 'melancholic']:
                prompt = 'descending whoosh with reverb tail, calming wind down, peaceful resolution'
            elif to_mood in ['dark', 'tense']:
                prompt = 'deep drop with bass rumble, ominous downward sweep, tension release'
            else:
                prompt = 'falling whoosh with decay, downward swoosh with soft landing, gentle drop'

        elif energy_change <= -2:
            # MODERATE FALL: Decreasing energy
            category = 'falling_transition'

            if to_mood in ['calm', 'melancholic']:
                prompt = 'soft downward swoosh, gentle wind-down with airy tail, calming descent'
            elif to_mood in ['dark']:
                prompt = 'subtle downward sweep with dark pad, tension decrease, moody transition'
            else:
                prompt = 'smooth downward whoosh, gentle energy decrease, soft fade swoosh'

        elif abs(energy_change) <= 1 and avg_energy >= 7:
            # HIGH ENERGY SMOOTH TRANSITION
            category = 'high_energy_transition'

            if from_mood == to_mood:
                prompt = 'quick impact hit with punch, sharp transition stinger, tight whoosh'
            elif to_mood in ['tense', 'dark']:
                prompt = 'aggressive whoosh with bite, edgy transition hit, sharp sweep'
            else:
                prompt = 'energetic swoosh with snap, bright quick transition, snappy whoosh'

        elif abs(energy_change) <= 1 and avg_energy <= 3:
            # LOW ENERGY SMOOTH TRANSITION
            category = 'low_energy_transition'

            if from_mood == to_mood:
                prompt = 'soft airy whoosh, delicate transition breeze, subtle wind sweep'
            elif to_mood in ['calm']:
                prompt = 'gentle wind chime with soft pad, peaceful transition, serene whoosh'
            else:
                prompt = 'light ambient whoosh, soft atmospheric sweep, quiet air transition'

        else:
            # NEUTRAL SMOOTH TRANSITION
            category = 'smooth_transition'

            # Consider mood change for neutral energy transitions
            if from_mood == 'cheerful' and to_mood == 'tense':
                prompt = 'transitional swoosh from bright to dark, mood shift whoosh with tension'
            elif from_mood == 'tense' and to_mood == 'cheerful':
                prompt = 'relieving whoosh from dark to light, tension release with bright tail'
            elif from_mood == 'calm' and to_mood in ['energetic', 'cheerful']:
                prompt = 'awakening whoosh with sparkle, smooth shift to brightness, gentle lift'
            elif from_mood in ['energetic', 'cheerful'] and to_mood == 'calm':
                prompt = 'settling whoosh with soft decay, smooth transition to calm, gentle wind-down'
            elif to_mood in ['dark', 'tense']:
                prompt = 'cinematic whoosh with slight tension, dramatic scene change, sweeping air'
            elif to_mood in ['cheerful', 'energetic']:
                prompt = 'bright cinematic whoosh, clean transition sweep, uplifting air movement'
            else:
                prompt = 'smooth cinematic whoosh, clean scene transition, neutral air sweep'

        # Add technical audio characteristics
        # These help AudioCraft understand the sound design
        if energy_change > 0:
            # Rising transitions: add frequency rise indicators
            prompt += ', rising pitch'
        elif energy_change < 0:
            # Falling transitions: add frequency fall indicators
            prompt += ', falling pitch'

        # Add reverb/ambience based on energy level
        if avg_energy >= 7:
            prompt += ', tight and punchy'
        elif avg_energy <= 3:
            prompt += ', spacious reverb'
        else:
            prompt += ', medium reverb'

        event['category'] = category
        event['sound_prompt'] = prompt

        return event


# For testing
if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python event_detector.py <video_path>")
        sys.exit(1)

    # This would need smart scene data
    print("Event detector module - use via video_analyzer.py")
