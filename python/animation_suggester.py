#!/usr/bin/env python3
"""
Animation Suggester
Analyzes transcription and scene data to suggest relevant animations
(Lottie/Fabric) for the video timeline.
"""

import re
from typing import List, Dict, Any

class AnimationSuggester:
    """
    Suggests animations based on keyword triggers in transcription
    and scene transitions.
    """

    def __init__(self):
        # Keywords that trigger specific animations
        self.triggers = {
            'subscribe': {
                'keywords': ['subscribe', 'sub to', 'join the channel'],
                'type': 'lottie',
                'asset_id': 'subscribe-bell-bounce',
                'category': 'engagement',
                'duration': 3.0
            },
            'like': {
                'keywords': ['like the video', 'thumbs up', 'smash the like'],
                'type': 'lottie',
                'asset_id': 'engagement-like-pop',
                'category': 'engagement',
                'duration': 2.0
            },
            'comment': {
                'keywords': ['comment below', 'leave a comment', 'let me know'],
                'type': 'lottie',
                'asset_id': 'engagement-comment-bubble',
                'category': 'engagement',
                'duration': 2.5
            },
            'share': {
                'keywords': ['share this', 'send this to'],
                'type': 'lottie',
                'asset_id': 'engagement-share-explosion',
                'category': 'engagement',
                'duration': 2.0
            },
            'notification': {
                'keywords': ['notification', 'bell icon', 'alerts'],
                'type': 'lottie',
                'asset_id': 'subscribe-bell-bounce',
                'category': 'engagement',
                'duration': 3.0
            },
            'link': {
                'keywords': ['link in bio', 'description below', 'check the link'],
                'type': 'fabric',
                'asset_id': 'lower-thirds-arrow-down',
                'category': 'call_to_action',
                'duration': 4.0
            },
            'instagram': {
                'keywords': ['instagram', 'follow me on insta'],
                'type': 'fabric',
                'asset_id': 'lower-thirds-social-handles',
                'config': {'platform': 'instagram'},
                'category': 'social',
                'duration': 5.0
            },
            'tiktok': {
                'keywords': ['tiktok'],
                'type': 'fabric',
                'asset_id': 'lower-thirds-social-handles',
                'config': {'platform': 'tiktok'},
                'category': 'social',
                'duration': 5.0
            }
        }

    def suggest_animations(self, transcription: List[Dict], scenes: List[Dict]) -> List[Dict]:
        """
        Generate animation suggestions based on transcription and scenes.

        Args:
            transcription: List of transcription segments
            scenes: List of analyzed scenes

        Returns:
            List of animation suggestions
        """
        suggestions = []
        
        # 1. Analyze transcription for keywords
        suggestions.extend(self._analyze_transcription(transcription))

        # 2. Analyze scenes for transitions (future expansion)
        # For now, we focus on transcription-based triggers as requested

        # Sort by timestamp
        suggestions.sort(key=lambda x: x['timestamp'])

        return suggestions

    def _analyze_transcription(self, transcription: List[Dict]) -> List[Dict]:
        """Scan transcription for keywords."""
        suggestions = []
        used_timestamps = set()
        min_gap = 5.0  # Minimum seconds between animations

        for segment in transcription:
            text = segment['text'].lower()
            timestamp = segment['start']
            
            # Check for triggers
            for key, trigger in self.triggers.items():
                for keyword in trigger['keywords']:
                    if keyword in text:
                        # Avoid overlapping animations
                        if not self._is_too_close(timestamp, used_timestamps, min_gap):
                            suggestion = {
                                'timestamp': float(timestamp),
                                'type': trigger['type'],
                                'asset_id': trigger['asset_id'],
                                'category': trigger['category'],
                                'duration': trigger['duration'],
                                'reason': f"Mentioned '{keyword}'",
                                'confidence': 0.85
                            }
                            
                            if 'config' in trigger:
                                suggestion['config'] = trigger['config']

                            suggestions.append(suggestion)
                            used_timestamps.add(timestamp)
                            break # Only one trigger per segment to avoid clutter

        return suggestions

    def _is_too_close(self, timestamp: float, used_timestamps: set, min_gap: float) -> bool:
        """Check if timestamp is too close to existing ones."""
        for t in used_timestamps:
            if abs(timestamp - t) < min_gap:
                return True
        return False

if __name__ == '__main__':
    # Simple test
    suggester = AnimationSuggester()
    sample_transcription = [
        {'text': "Welcome back! Don't forget to subscribe to the channel.", 'start': 5.0, 'end': 8.0},
        {'text': "And smash that like button if you enjoy this.", 'start': 15.0, 'end': 18.0},
        {'text': "Check the link in bio for more info.", 'start': 30.0, 'end': 33.0}
    ]
    results = suggester.suggest_animations(sample_transcription, [])
    import json
    print(json.dumps(results, indent=2))
