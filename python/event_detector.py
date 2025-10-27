#!/usr/bin/env python3
"""
Event Detector for Video Analysis
Detects precise moments where sounds should occur:
- Motion peaks (impacts, slams, movements)
- Scene transitions (cuts, fades)
- Object interactions
"""

import cv2
import numpy as np
import sys
from typing import List, Dict, Tuple


class EventDetector:
    """
    Detect events in video for frame-accurate SFX timing.
    """

    def __init__(self, motion_threshold: float = 0.15):
        """
        Args:
            motion_threshold: Threshold for detecting significant motion
        """
        self.motion_threshold = motion_threshold

    def detect_motion_peaks(self, video_path: str, scenes: List[Dict]) -> List[Dict]:
        """
        Detect motion peaks within each scene.
        These are moments of sudden movement that likely need sound effects.

        Args:
            video_path: Path to video file
            scenes: List of scenes from smart analysis

        Returns:
            List of motion peak events with timing and intensity
        """
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)

        all_events = []

        for scene in scenes:
            start_frame = scene['start_frame']
            end_frame = scene['end_frame']

            # Analyze motion frame by frame
            motion_history = []
            prev_gray = None

            for frame_idx in range(start_frame, end_frame):
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()

                if not ret:
                    break

                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                gray = cv2.GaussianBlur(gray, (5, 5), 0)

                if prev_gray is not None:
                    # Calculate frame difference
                    diff = cv2.absdiff(gray, prev_gray)
                    motion_score = np.mean(diff) / 255.0

                    motion_history.append({
                        'frame': frame_idx,
                        'timestamp': frame_idx / fps,
                        'motion': motion_score
                    })

                prev_gray = gray

            # Find peaks in motion
            if len(motion_history) > 2:
                events = self._find_peaks(motion_history, scene)
                all_events.extend(events)

        cap.release()
        return all_events

    def _find_peaks(self, motion_history: List[Dict], scene: Dict) -> List[Dict]:
        """
        Find motion peaks in the motion history.

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
                motion_values[i] > self.motion_threshold):

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
                    'scene_description': scene.get('description', '')
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
        Classify a scene transition event.

        Args:
            event: Transition event

        Returns:
            Classified event with sound prompt
        """
        from_energy = event['from_energy']
        to_energy = event['to_energy']

        energy_change = to_energy - from_energy

        if abs(energy_change) >= 3:
            # Significant energy change
            if energy_change > 0:
                prompt = 'rising transition, building energy'
                event['category'] = 'rising_transition'
            else:
                prompt = 'falling transition, decreasing energy'
                event['category'] = 'falling_transition'
        else:
            # Smooth transition
            prompt = 'smooth scene transition'
            event['category'] = 'smooth_transition'

        event['sound_prompt'] = prompt

        return event


# For testing
if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python event_detector.py <video_path>")
        sys.exit(1)

    # This would need smart scene data
    print("Event detector module - use via video_analyzer.py")
