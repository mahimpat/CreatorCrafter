#!/usr/bin/env python3
"""
Music Prompt Generator for Background Music
Generates MusicGen prompts based on scene mood, energy, and genre.

Week 3 Feature: Intelligent background music suggestions
- Mood-based music matching
- Energy-appropriate tempo/intensity
- Genre detection from video style
- Musical structure (intro, build, sustain, outro)
"""

from typing import List, Dict, Tuple


class MusicPromptGenerator:
    """
    Generate intelligent MusicGen prompts based on scene characteristics.
    """

    def __init__(self):
        # Mood to music descriptors mapping
        self.mood_descriptors = {
            'cheerful': {
                'adjectives': ['upbeat', 'bright', 'happy', 'joyful', 'positive'],
                'instruments': ['acoustic guitar', 'piano', 'strings', 'light percussion'],
                'genres': ['indie pop', 'folk', 'acoustic', 'electronic pop']
            },
            'energetic': {
                'adjectives': ['energetic', 'driving', 'dynamic', 'powerful'],
                'instruments': ['electric guitar', 'drums', 'bass', 'synth'],
                'genres': ['rock', 'electronic', 'pop rock', 'EDM']
            },
            'tense': {
                'adjectives': ['tense', 'suspenseful', 'dramatic', 'intense'],
                'instruments': ['strings', 'deep bass', 'percussion', 'synth pads'],
                'genres': ['cinematic', 'thriller', 'orchestral', 'dark electronic']
            },
            'dark': {
                'adjectives': ['dark', 'ominous', 'heavy', 'brooding'],
                'instruments': ['low strings', 'deep bass', 'dark synth', 'heavy drums'],
                'genres': ['cinematic', 'dark ambient', 'industrial', 'orchestral']
            },
            'calm': {
                'adjectives': ['calm', 'peaceful', 'gentle', 'soothing'],
                'instruments': ['piano', 'soft strings', 'acoustic guitar', 'ambient pads'],
                'genres': ['ambient', 'classical', 'acoustic', 'new age']
            },
            'melancholic': {
                'adjectives': ['melancholic', 'somber', 'reflective', 'emotional'],
                'instruments': ['piano', 'strings', 'cello', 'soft guitar'],
                'genres': ['classical', 'ambient', 'acoustic', 'orchestral']
            },
            'neutral': {
                'adjectives': ['balanced', 'smooth', 'moderate'],
                'instruments': ['piano', 'light percussion', 'soft synth'],
                'genres': ['ambient', 'background', 'lounge']
            }
        }

        # Energy level to tempo/intensity mapping
        self.energy_descriptors = {
            'very_low': {
                'tempo': 'very slow',
                'intensity': 'minimal',
                'bpm_range': '60-80 BPM'
            },
            'low': {
                'tempo': 'slow',
                'intensity': 'gentle',
                'bpm_range': '80-100 BPM'
            },
            'medium': {
                'tempo': 'moderate',
                'intensity': 'moderate',
                'bpm_range': '100-120 BPM'
            },
            'high': {
                'tempo': 'fast',
                'intensity': 'energetic',
                'bpm_range': '120-140 BPM'
            },
            'very_high': {
                'tempo': 'very fast',
                'intensity': 'intense',
                'bpm_range': '140+ BPM'
            }
        }

    def classify_energy_level(self, energy: int) -> str:
        """
        Convert energy level (1-10) to category.

        Args:
            energy: Energy level 1-10

        Returns:
            Energy category (very_low, low, medium, high, very_high)
        """
        if energy <= 2:
            return 'very_low'
        elif energy <= 4:
            return 'low'
        elif energy <= 6:
            return 'medium'
        elif energy <= 8:
            return 'high'
        else:
            return 'very_high'

    def detect_video_genre(self, scenes: List[Dict]) -> str:
        """
        Detect video genre from scene characteristics.
        Helps choose appropriate music style.

        Args:
            scenes: List of scenes with analysis

        Returns:
            Video genre (vlog, documentary, action, cinematic, etc.)
        """
        if not scenes:
            return 'general'

        # Analyze scene characteristics
        avg_energy = sum(s.get('energy_level', 5) for s in scenes) / len(scenes)
        moods = [s.get('mood', 'neutral') for s in scenes]

        # Count mood occurrences
        mood_counts = {}
        for mood in moods:
            mood_counts[mood] = mood_counts.get(mood, 0) + 1

        dominant_mood = max(mood_counts.items(), key=lambda x: x[1])[0] if mood_counts else 'neutral'

        # Genre detection heuristics
        if avg_energy >= 7 and dominant_mood in ['energetic', 'cheerful']:
            return 'vlog'
        elif avg_energy <= 4 and dominant_mood in ['calm', 'neutral']:
            return 'documentary'
        elif avg_energy >= 7 and dominant_mood in ['tense', 'dark']:
            return 'action'
        elif dominant_mood in ['tense', 'dark', 'melancholic']:
            return 'cinematic'
        elif dominant_mood == 'cheerful':
            return 'lifestyle'
        else:
            return 'general'

    def generate_music_prompt(self, mood: str, energy_level: int, duration: float, genre_hint: str = None) -> Dict:
        """
        Generate a MusicGen prompt for background music.

        Args:
            mood: Scene mood (cheerful, tense, calm, etc.)
            energy_level: Energy level 1-10
            duration: Duration of music needed (seconds)
            genre_hint: Optional genre hint (vlog, documentary, etc.)

        Returns:
            Dict with prompt, description, and metadata
        """
        # Get mood descriptors
        mood_info = self.mood_descriptors.get(mood, self.mood_descriptors['neutral'])

        # Get energy descriptors
        energy_category = self.classify_energy_level(energy_level)
        energy_info = self.energy_descriptors[energy_category]

        # Choose appropriate adjective and genre
        adjective = mood_info['adjectives'][0]  # Primary adjective
        instrument = mood_info['instruments'][0]  # Primary instrument

        # Choose genre based on video genre hint
        if genre_hint:
            genre_mapping = {
                'vlog': 'upbeat indie electronic',
                'documentary': 'ambient orchestral',
                'action': 'intense cinematic',
                'cinematic': 'orchestral cinematic',
                'lifestyle': 'indie acoustic',
                'general': mood_info['genres'][0]
            }
            genre = genre_mapping.get(genre_hint, mood_info['genres'][0])
        else:
            genre = mood_info['genres'][0]

        # Build MusicGen prompt
        # Format: "[Genre] music, [mood adjective], [tempo], [instrumentation]"
        prompt = f"{genre} music, {adjective} and {energy_info['intensity']}, {energy_info['tempo']} tempo"

        # Add instrumentation
        prompt += f", featuring {instrument}"

        # Add additional mood context
        if mood in ['tense', 'dark']:
            prompt += ", dramatic and cinematic"
        elif mood in ['cheerful', 'energetic']:
            prompt += ", uplifting and positive"
        elif mood in ['calm', 'melancholic']:
            prompt += ", emotional and atmospheric"

        return {
            'prompt': prompt,
            'mood': mood,
            'energy_level': energy_level,
            'energy_category': energy_category,
            'tempo': energy_info['tempo'],
            'genre': genre,
            'duration': duration,
            'description': f"{adjective.capitalize()} {genre} music ({energy_info['tempo']} tempo)"
        }

    def generate_scene_music(self, scene: Dict, video_genre: str = None) -> Dict:
        """
        Generate music suggestion for a single scene.

        Args:
            scene: Scene with mood/energy analysis
            video_genre: Optional video genre hint

        Returns:
            Music suggestion dict
        """
        mood = scene.get('mood', 'neutral')
        energy = scene.get('energy_level', 5)
        duration = scene.get('duration', 10.0)
        start_time = scene.get('start', 0.0)

        music_prompt_data = self.generate_music_prompt(mood, energy, duration, video_genre)

        return {
            'timestamp': start_time,
            'duration': duration,
            'scene_id': scene.get('scene_id', 0),
            'prompt': music_prompt_data['prompt'],
            'description': music_prompt_data['description'],
            'mood': mood,
            'energy_level': energy,
            'genre': music_prompt_data['genre'],
            'tempo': music_prompt_data['tempo'],
            'confidence': scene.get('mood_confidence', 0.75)
        }


def suggest_music(scenes: List[Dict]) -> List[Dict]:
    """
    Generate background music suggestions for all scenes.

    Args:
        scenes: List of scenes with mood/energy analysis

    Returns:
        List of music suggestions (one per scene or merged for similar adjacent scenes)
    """
    if not scenes:
        return []

    generator = MusicPromptGenerator()

    # Detect overall video genre
    video_genre = generator.detect_video_genre(scenes)
    print(f"Detected video genre: {video_genre}", file=__import__('sys').stderr)

    music_suggestions = []

    # Strategy: Generate music for each scene, but merge similar adjacent scenes
    for i, scene in enumerate(scenes):
        # Check if this scene is similar to previous (can use same music)
        if i > 0:
            prev_scene = scenes[i - 1]

            # Check if moods and energy are similar
            same_mood = scene.get('mood') == prev_scene.get('mood')
            similar_energy = abs(scene.get('energy_level', 5) - prev_scene.get('energy_level', 5)) <= 2

            if same_mood and similar_energy:
                # Extend previous music suggestion instead of creating new one
                if music_suggestions:
                    music_suggestions[-1]['duration'] += scene.get('duration', 0)
                    continue

        # Generate music for this scene
        music = generator.generate_scene_music(scene, video_genre)
        music_suggestions.append(music)

    print(f"Generated {len(music_suggestions)} music suggestions", file=__import__('sys').stderr)

    return music_suggestions


# For testing
if __name__ == '__main__':
    import sys

    # Test prompt generation
    generator = MusicPromptGenerator()

    # Test different moods and energies
    test_cases = [
        ('cheerful', 8, 'vlog'),
        ('tense', 9, 'action'),
        ('calm', 3, 'documentary'),
        ('dark', 7, 'cinematic'),
    ]

    print("=== Music Prompt Generator Test ===\n")

    for mood, energy, genre in test_cases:
        result = generator.generate_music_prompt(mood, energy, 30.0, genre)
        print(f"Mood: {mood}, Energy: {energy}/10, Genre: {genre}")
        print(f"Prompt: {result['prompt']}")
        print(f"Description: {result['description']}\n")
