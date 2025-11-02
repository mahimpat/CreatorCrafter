#!/usr/bin/env python3
"""
Sound Extractor
Extracts concrete audio elements from visual descriptions.
Maps visual actions/objects to the actual sounds they make.
"""

import re
from typing import Dict, List, Optional


class SoundExtractor:
    """
    Extract concrete sound descriptions from visual descriptions.
    Translates "what we see" into "what we hear".
    """

    def __init__(self):
        # Map objects/actions to their characteristic sounds
        self.sound_mappings = {
            # Actions - Physical
            'walking': 'footsteps on hard surface, walking pace, shoe impacts',
            'running': 'fast footsteps, rapid running pace, athletic movement',
            'jumping': 'impact landing, body movement, athletic exertion',
            'exercising': 'athletic movement, physical exertion, breathing',
            'workout': 'gym sounds, weight equipment, athletic breathing',
            'lifting': 'weight equipment, exertion grunts, metal clanking',
            'bench press': 'gym weight plates clanking, heavy breathing, metal bar impacts',
            'push up': 'body movement, athletic breathing, rhythmic exertion',
            'sit up': 'athletic breathing, body movement on surface',

            # Actions - Objects
            'typing': 'keyboard typing, mechanical key clicks, fast typing rhythm',
            'clicking': 'mouse clicks, button presses, interface sounds',
            'writing': 'pen on paper, writing sounds, paper rustling',
            'opening': 'door opening, handle turning, hinges creaking',
            'closing': 'door closing impact, latch clicking, solid thud',
            'knocking': 'knocking on door, impact hits on wood',
            'slamming': 'door slam impact, loud bang, forceful closing',

            # Vehicles
            'driving': 'car engine rumble, road noise, tire sounds, vehicle movement',
            'car': 'car engine idle, mechanical hum, vehicle ambience',
            'truck': 'heavy truck engine, diesel rumble, large vehicle sounds',
            'motorcycle': 'motorcycle engine roar, revving, bike sounds',
            'bicycle': 'bike chain clicking, pedaling sounds, wheel rotation',
            'airplane': 'jet engine roar, airplane turbines, aircraft sounds',
            'helicopter': 'helicopter blades whopping, rotor sounds, aircraft',
            'train': 'train wheels on tracks, locomotive sounds, rail clicks',

            # Nature
            'rain': 'rain falling, water droplets, rainfall ambience',
            'raining': 'rain sounds, water falling, rainfall atmosphere',
            'thunder': 'thunder rumble, storm sounds, lightning crack',
            'wind': 'wind blowing, air movement, breeze sounds',
            'windy': 'strong wind gusts, air rushing, blustery atmosphere',
            'water': 'water flowing, liquid sounds, aquatic ambience',
            'ocean': 'ocean waves, water crashing, sea ambience',
            'waves': 'wave crashes, water movement, surf sounds',
            'river': 'river flowing, water stream, rushing water',
            'waterfall': 'waterfall cascade, rushing water, water falling',
            'fire': 'fire crackling, flames burning, combustion sounds',
            'burning': 'fire crackling, burning sounds, flame ambience',

            # Animals
            'dog': 'dog barking, animal sounds, canine vocalizations',
            'barking': 'dog barking sounds, canine barks',
            'cat': 'cat meowing, feline sounds, purring',
            'bird': 'bird chirping, avian calls, wildlife sounds',
            'birds': 'birds chirping, multiple bird calls, nature ambience',
            'horse': 'horse neighing, hooves on ground, equine sounds',

            # Urban/City
            'traffic': 'traffic ambience, multiple vehicles, city sounds',
            'city': 'urban ambience, city sounds, busy atmosphere',
            'street': 'street sounds, urban environment, city ambience',
            'crowd': 'crowd chatter, people talking, busy atmosphere',
            'people talking': 'crowd ambience, background conversation, social atmosphere',
            'construction': 'construction sounds, machinery, building work',
            'sirens': 'emergency sirens, police car, ambulance sounds',

            # Domestic
            'cooking': 'cooking sounds, kitchen ambience, food preparation',
            'chopping': 'knife chopping, cutting board impacts, food prep',
            'frying': 'frying pan sizzle, oil popping, cooking sounds',
            'boiling': 'water boiling, bubbling sounds, steam',
            'dishwashing': 'dishes clanking, water running, kitchen sounds',
            'vacuum': 'vacuum cleaner motor, suction sounds',
            'blender': 'blender motor, mixing sounds, appliance',

            # Electronics
            'phone': 'phone ringing, notification sounds, mobile device',
            'ringing': 'phone ringing, bell sounds, alert tone',
            'computer': 'computer fan hum, keyboard typing, tech ambience',
            'television': 'TV static, electronic sounds, screen ambience',
            'alarm': 'alarm sound, beeping, alert tone',

            # Music/Audio
            'guitar': 'guitar strumming, string instrument, musical notes',
            'piano': 'piano keys, musical notes, keyboard instrument',
            'drums': 'drum beats, percussion, rhythmic impacts',
            'singing': 'vocal performance, singing voice, musical vocals',
            'music': 'background music, musical ambience, instruments',

            # Industrial
            'machinery': 'mechanical sounds, industrial equipment, motors',
            'engine': 'engine running, mechanical motor, power sounds',
            'drill': 'power drill, drilling sounds, tool motor',
            'saw': 'saw cutting, woodworking sounds, blade friction',
            'hammer': 'hammer impacts, metal on metal, construction',

            # Impacts/Crashes
            'crash': 'loud crash impact, collision sounds, destruction',
            'breaking': 'glass breaking, objects shattering, destruction',
            'smashing': 'impact smashing, breaking sounds, forceful destruction',
            'explosion': 'explosion boom, blast sounds, dramatic impact',
            'bang': 'loud bang impact, sudden hit, explosive sound',

            # Weather
            'storm': 'storm sounds, thunder and rain, turbulent weather',
            'snowing': 'quiet winter ambience, soft snow falling',
            'foggy': 'muted atmospheric ambience, quiet fog atmosphere',
        }

        # Environment indicators for context
        self.environment_sounds = {
            'gym': 'gym ambience, weight equipment clanking, workout atmosphere',
            'kitchen': 'kitchen ambience, cooking sounds, domestic sounds',
            'office': 'office ambience, keyboard typing, workplace sounds',
            'restaurant': 'restaurant ambience, dining sounds, cutlery clinking',
            'store': 'store ambience, shopping sounds, retail atmosphere',
            'park': 'outdoor ambience, nature sounds, park atmosphere',
            'forest': 'forest ambience, nature sounds, birds and wind',
            'beach': 'beach ambience, ocean waves, seagulls, coastal sounds',
            'indoor': 'indoor room tone, subtle reverb, enclosed space',
            'outdoor': 'outdoor ambience, open air, environmental sounds',
            'night': 'night ambience, quiet atmosphere, nocturnal sounds',
            'day': 'daytime ambience, active atmosphere, daylight sounds',
        }

    def extract_sounds(
        self,
        visual_description: str,
        action_description: str = '',
        sound_description: str = ''
    ) -> Optional[str]:
        """
        Extract concrete sound descriptions from visual descriptions.

        Args:
            visual_description: What the vision model sees
            action_description: What actions are happening
            sound_description: Direct sound description (if available)

        Returns:
            Concrete audio description or None if should skip
        """
        combined = f"{visual_description} {action_description} {sound_description}".lower()

        # Skip if this is just people talking/dialogue
        if self._is_dialogue_scene(combined):
            return None  # Don't suggest - dialogue already has audio

        # Extract sound elements
        sound_elements = []

        # Check for direct sound mappings
        for keyword, sound_desc in self.sound_mappings.items():
            if keyword in combined:
                sound_elements.append(sound_desc)

        # Add environment sounds if present
        for env, env_sound in self.environment_sounds.items():
            if env in combined:
                # Only add environment if no specific sounds found
                if not sound_elements:
                    sound_elements.append(env_sound)
                break

        if not sound_elements:
            # No specific sounds found - generate generic ambient
            return self._generate_generic_ambient(visual_description, action_description)

        # Deduplicate and combine
        unique_elements = []
        seen = set()
        for element in sound_elements:
            # Simple deduplication
            key = element.split(',')[0].strip()
            if key not in seen:
                seen.add(key)
                unique_elements.append(element)

        # Combine up to 2-3 elements (avoid overly complex prompts)
        return ', '.join(unique_elements[:3])

    def _is_dialogue_scene(self, description: str) -> bool:
        """
        Check if this is primarily a dialogue/talking scene.
        These should be skipped as speech is already in the audio.
        """
        dialogue_indicators = [
            'person talking',
            'people talking',
            'man talking',
            'woman talking',
            'conversation',
            'speaking',
            'dialogue',
            'interview',
            'discussion',
            'presentation',
            'lecture',
        ]

        # Count dialogue indicators
        dialogue_count = sum(1 for indicator in dialogue_indicators if indicator in description)

        # If primarily dialogue and no other action, skip
        if dialogue_count > 0:
            # Check if there's other significant action
            action_indicators = [
                'walking', 'running', 'driving', 'working out',
                'cooking', 'building', 'playing', 'fighting'
            ]
            has_action = any(action in description for action in action_indicators)

            if not has_action:
                return True  # Pure dialogue - skip

        return False

    def _generate_generic_ambient(
        self,
        visual_description: str,
        action_description: str
    ) -> str:
        """
        Generate generic ambient sounds when no specific sounds detected.
        Uses descriptive approach based on scene.
        """
        combined = f"{visual_description} {action_description}".lower()

        # Determine general ambience type
        if any(word in combined for word in ['indoor', 'room', 'inside', 'interior']):
            base = 'indoor room tone, subtle ambience'
        elif any(word in combined for word in ['outdoor', 'outside', 'exterior', 'street']):
            base = 'outdoor ambience, environmental sounds'
        elif any(word in combined for word in ['nature', 'forest', 'park', 'field']):
            base = 'natural ambience, outdoor atmosphere'
        elif any(word in combined for word in ['city', 'urban', 'downtown']):
            base = 'urban ambience, city sounds, distant traffic'
        elif any(word in combined for word in ['quiet', 'silent', 'empty', 'alone']):
            base = 'quiet room tone, minimal ambience, subtle presence'
        else:
            base = 'ambient background atmosphere, environmental sounds'

        return base

    def enhance_with_mood(self, sound_description: str, mood: str, energy_level: int) -> str:
        """
        Add mood and energy characteristics to sound description.

        Args:
            sound_description: Base sound description
            mood: Scene mood (cheerful, tense, calm, etc.)
            energy_level: Energy level 1-10

        Returns:
            Enhanced sound description
        """
        if not sound_description:
            return sound_description

        enhancements = []

        # Add mood descriptors
        if mood and mood != 'neutral':
            mood_map = {
                'cheerful': 'bright and lively',
                'energetic': 'dynamic and intense',
                'tense': 'tense and dramatic',
                'dark': 'dark and ominous',
                'calm': 'peaceful and serene',
                'melancholic': 'somber and melancholic'
            }
            if mood in mood_map:
                enhancements.append(mood_map[mood])

        # Add energy descriptors
        if energy_level:
            if energy_level >= 8:
                enhancements.append('high intensity and energy')
            elif energy_level >= 6:
                enhancements.append('moderate intensity')
            elif energy_level <= 3:
                enhancements.append('subtle and gentle')

        # Combine
        if enhancements:
            return f"{sound_description}, {', '.join(enhancements)}"

        return sound_description


# For testing
if __name__ == '__main__':
    extractor = SoundExtractor()

    # Test cases
    test_cases = [
        ("a man is doing a bench press exercise", "working out", ""),
        ("a person walking down the street", "walking", ""),
        ("a car driving on a highway", "driving", ""),
        ("people talking at a restaurant", "conversation", ""),
        ("rain falling on a window", "raining", ""),
        ("a dog barking in a park", "barking", ""),
        ("someone typing on a laptop", "typing", ""),
        ("a door closing", "closing door", ""),
    ]

    print("Sound Extraction Tests:")
    print("=" * 60)

    for visual, action, sound in test_cases:
        result = extractor.extract_sounds(visual, action, sound)
        print(f"\nVisual: {visual}")
        print(f"Action: {action}")
        print(f"Result: {result if result else '[SKIP - has audio]'}")

        if result:
            # Test with mood enhancement
            enhanced = extractor.enhance_with_mood(result, 'tense', 7)
            print(f"Enhanced: {enhanced}")
