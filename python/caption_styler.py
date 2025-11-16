#!/usr/bin/env python3
"""
AI-Powered Caption Styler
Analyzes transcription and detects words that should be emphasized
Uses spaCy for advanced NLP analysis with fallback to keyword matching
"""

import argparse
import json
import re
import sys
from typing import List, Dict, Any

# Try to import spaCy for advanced NLP
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
    print("✓ Using spaCy for advanced NLP analysis", file=sys.stderr)
except (ImportError, OSError):
    SPACY_AVAILABLE = False
    print("⚠️  spaCy not available, using keyword-based analysis", file=sys.stderr)
    print("   Install with: pip install spacy && python -m spacy download en_core_web_sm", file=sys.stderr)

# Power words that should be emphasized (common impactful words)
POWER_WORDS = {
    # Action words
    'achieve', 'accelerate', 'boost', 'breakthrough', 'build', 'create', 'destroy',
    'dominate', 'explode', 'generate', 'grow', 'increase', 'launch', 'master',
    'multiply', 'revolutionize', 'scale', 'skyrocket', 'transform', 'unlock',

    # Intensity words
    'amazing', 'awesome', 'best', 'biggest', 'critical', 'crucial', 'devastating',
    'epic', 'essential', 'exclusive', 'extreme', 'fastest', 'guaranteed', 'huge',
    'incredible', 'insane', 'massive', 'perfect', 'powerful', 'proven', 'shocking',
    'stunning', 'ultimate', 'unbelievable', 'unique', 'urgent', 'vital',

    # Emotional words
    'afraid', 'angry', 'confident', 'confused', 'devastated', 'excited', 'fear',
    'happy', 'hope', 'love', 'panic', 'proud', 'sad', 'scared', 'surprised',
    'terrified', 'thrilled', 'worried',

    # Negation (important for context)
    'never', 'nothing', 'nobody', 'nowhere', 'always', 'everything', 'everyone',
    'everywhere',

    # Time urgency
    'now', 'today', 'immediately', 'instant', 'quick', 'fast', 'soon', 'urgent',

    # Money/value
    'free', 'profit', 'revenue', 'money', 'cash', 'wealth', 'rich', 'save', 'earn',
    'invest', 'roi', 'value', 'worth'
}

# Sentiment word groups (Phase 2)
POSITIVE_WORDS = {
    'amazing', 'awesome', 'best', 'brilliant', 'excellent', 'fantastic', 'great',
    'happy', 'incredible', 'joy', 'love', 'perfect', 'wonderful', 'excited',
    'thrilled', 'proud', 'success', 'win', 'achieve', 'accomplish', 'breakthrough',
    'celebrate', 'good', 'nice', 'beautiful', 'awesome', 'fantastic', 'superb'
}

NEGATIVE_WORDS = {
    'bad', 'terrible', 'worst', 'awful', 'horrible', 'disaster', 'fail', 'failed',
    'failure', 'wrong', 'mistake', 'error', 'problem', 'issue', 'danger', 'warning',
    'risk', 'afraid', 'fear', 'scared', 'worried', 'panic', 'angry', 'sad',
    'devastating', 'critical', 'urgent', 'emergency', 'crisis', 'loss', 'lose'
}

QUESTION_INDICATORS = {'?', 'how', 'what', 'why', 'when', 'where', 'who', 'which'}


def is_number(word: str) -> bool:
    """Check if word contains or is a number"""
    # Remove common formatting
    cleaned = word.replace(',', '').replace('$', '').replace('%', '').replace('.', '')

    # Check if it's a pure number
    if cleaned.isdigit():
        return True

    # Check if it contains digits (like "10x", "25%", "$100")
    if any(char.isdigit() for char in word):
        return True

    return False


def is_all_caps(word: str) -> bool:
    """Check if word is all caps (at least 2 letters)"""
    # Only consider words with at least 2 alphabetic characters
    alpha_chars = [c for c in word if c.isalpha()]

    if len(alpha_chars) < 2:
        return False

    return all(c.isupper() for c in alpha_chars)


def is_power_word(word: str) -> bool:
    """Check if word is in the power words list"""
    cleaned = word.lower().strip('.,!?;:"\'-')
    return cleaned in POWER_WORDS


def analyze_sentiment_spacy(text: str, doc=None) -> str:
    """
    Analyze sentiment using spaCy's linguistic features
    Returns: 'positive', 'negative', 'question', or 'neutral'
    """
    if doc is None:
        doc = nlp(text)

    # Check for question
    if '?' in text or any(token.tag_ in ['WP', 'WDT', 'WRB'] for token in doc):
        return 'question'

    # Analyze sentiment using multiple signals
    positive_score = 0
    negative_score = 0

    for token in doc:
        token_lower = token.text.lower()

        # Check word lists
        if token_lower in POSITIVE_WORDS:
            positive_score += 2
        elif token_lower in NEGATIVE_WORDS:
            negative_score += 2

        # Check for negation (affects sentiment)
        if token.dep_ == 'neg':
            negative_score += 1

        # Exclamation marks indicate strong emotion
        if token.text == '!':
            positive_score += 1

    # Determine overall sentiment
    if positive_score > negative_score and positive_score > 0:
        return 'positive'
    elif negative_score > positive_score and negative_score > 0:
        return 'negative'
    else:
        return 'neutral'


def analyze_sentiment(text: str) -> str:
    """
    Analyze the overall sentiment of a text segment
    Uses spaCy if available, falls back to keyword matching
    Returns: 'positive', 'negative', 'question', or 'neutral'
    """
    if SPACY_AVAILABLE:
        doc = nlp(text)
        return analyze_sentiment_spacy(text, doc)

    # Fallback: keyword-based sentiment
    text_lower = text.lower()
    words = text_lower.split()

    # Check for question indicators
    if '?' in text or any(word in QUESTION_INDICATORS for word in words):
        return 'question'

    # Count positive and negative words
    positive_count = sum(1 for word in words if word.strip('.,!?;:"\'-') in POSITIVE_WORDS)
    negative_count = sum(1 for word in words if word.strip('.,!?;:"\'-') in NEGATIVE_WORDS)

    # Determine sentiment based on word counts
    if positive_count > negative_count and positive_count > 0:
        return 'positive'
    elif negative_count > positive_count and negative_count > 0:
        return 'negative'
    else:
        return 'neutral'


def analyze_word_spacy(token, entities_map: Dict[str, str]) -> Dict[str, Any]:
    """
    Analyze a single word using spaCy token
    Returns dict with emphasis info
    """
    result = {
        'emphasized': False,
        'emphasisType': None
    }

    word = token.text

    # Priority order: numbers > named entities > all caps > important POS > power words

    # 1. Numbers
    if is_number(word) or token.like_num:
        result['emphasized'] = True
        result['emphasisType'] = 'number'
        return result

    # 2. Named entities (people, organizations, brands, locations)
    if word in entities_map:
        result['emphasized'] = True
        result['emphasisType'] = 'entity'
        return result

    # 3. ALL CAPS words
    if is_all_caps(word):
        result['emphasized'] = True
        result['emphasisType'] = 'caps'
        return result

    # 4. Important parts of speech (proper nouns, strong verbs)
    if token.pos_ in ['PROPN']:  # Proper nouns (names, brands, etc.)
        result['emphasized'] = True
        result['emphasisType'] = 'entity'
        return result

    # 5. Power words from our list
    if is_power_word(word):
        result['emphasized'] = True
        result['emphasisType'] = 'keyword'
        return result

    # 6. Strong action verbs in present tense
    if token.pos_ == 'VERB' and token.tag_ in ['VB', 'VBP', 'VBZ']:
        word_lower = word.lower()
        # Common action verbs worth emphasizing
        action_verbs = {'create', 'build', 'make', 'launch', 'start', 'achieve',
                       'grow', 'increase', 'boost', 'transform', 'change', 'improve'}
        if word_lower in action_verbs:
            result['emphasized'] = True
            result['emphasisType'] = 'keyword'
            return result

    return result


def analyze_word(word: str) -> Dict[str, Any]:
    """
    Analyze a single word and determine if it should be emphasized
    Fallback for when spaCy is not available
    Returns dict with emphasis info
    """
    result = {
        'emphasized': False,
        'emphasisType': None
    }

    # Priority order: numbers > all caps > power words
    if is_number(word):
        result['emphasized'] = True
        result['emphasisType'] = 'number'
    elif is_all_caps(word):
        result['emphasized'] = True
        result['emphasisType'] = 'caps'
    elif is_power_word(word):
        result['emphasized'] = True
        result['emphasisType'] = 'keyword'

    return result


def split_into_words_with_timing_spacy(segment: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Split a transcription segment into words using spaCy tokenization with timing
    """
    text = segment['text'].strip()
    start_time = segment['start']
    end_time = segment['end']
    duration = end_time - start_time

    # Process text with spaCy
    doc = nlp(text)

    # Extract named entities
    entities_map = {}
    for ent in doc.ents:
        if ent.label_ in ['PERSON', 'ORG', 'PRODUCT', 'GPE', 'LOC', 'EVENT']:
            for token in ent:
                entities_map[token.text] = ent.label_

    # Get tokens (spaCy handles punctuation better)
    tokens = [token for token in doc if not token.is_space]

    if not tokens:
        return []

    # Estimate timing for each token (linear distribution)
    word_duration = duration / len(tokens)

    words_with_timing = []
    for i, token in enumerate(tokens):
        word_start = start_time + (i * word_duration)
        word_end = word_start + word_duration

        # Analyze token for emphasis using spaCy
        analysis = analyze_word_spacy(token, entities_map)

        word_data = {
            'text': token.text,
            'start': round(word_start, 3),
            'end': round(word_end, 3),
            'emphasized': analysis['emphasized'],
            'emphasisType': analysis['emphasisType']
        }

        words_with_timing.append(word_data)

    return words_with_timing


def split_into_words_with_timing(segment: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Split a transcription segment into individual words with estimated timing
    Uses spaCy if available, falls back to simple split

    segment format from Whisper:
    {
        "text": "Hello world this is amazing",
        "start": 0.0,
        "end": 2.5
    }
    """
    if SPACY_AVAILABLE:
        return split_into_words_with_timing_spacy(segment)

    # Fallback: simple split
    text = segment['text'].strip()
    start_time = segment['start']
    end_time = segment['end']
    duration = end_time - start_time

    # Split text into words (preserve punctuation)
    words_raw = text.split()

    if not words_raw:
        return []

    # Estimate timing for each word (simple linear distribution)
    word_duration = duration / len(words_raw)

    words_with_timing = []
    for i, word in enumerate(words_raw):
        word_start = start_time + (i * word_duration)
        word_end = word_start + word_duration

        # Analyze word for emphasis
        analysis = analyze_word(word)

        word_data = {
            'text': word,
            'start': round(word_start, 3),
            'end': round(word_end, 3),
            'emphasized': analysis['emphasized'],
            'emphasisType': analysis['emphasisType']
        }

        words_with_timing.append(word_data)

    return words_with_timing


def analyze_captions(transcription: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Analyze transcription segments and add word-level timing + emphasis detection + sentiment

    Input format (from Whisper):
    [
        {"text": "Hello world", "start": 0.0, "end": 1.5, "confidence": 0.95},
        {"text": "This is amazing", "start": 1.5, "end": 3.0, "confidence": 0.98}
    ]

    Output format:
    [
        {
            "text": "Hello world",
            "start": 0.0,
            "end": 1.5,
            "sentiment": "neutral",
            "words": [
                {"text": "Hello", "start": 0.0, "end": 0.75, "emphasized": false},
                {"text": "world", "start": 0.75, "end": 1.5, "emphasized": false}
            ]
        },
        ...
    ]
    """
    styled_segments = []

    for segment in transcription:
        # Get word-level timing and emphasis
        words = split_into_words_with_timing(segment)

        # Analyze sentiment of the entire segment
        sentiment = analyze_sentiment(segment['text'])

        styled_segment = {
            'text': segment['text'],
            'start': segment['start'],
            'end': segment['end'],
            'words': words,
            'sentiment': sentiment
        }

        # Add confidence if available
        if 'confidence' in segment:
            styled_segment['confidence'] = segment['confidence']

        styled_segments.append(styled_segment)

    return styled_segments


def main():
    parser = argparse.ArgumentParser(description='Analyze captions for AI-powered styling')
    parser.add_argument('--input', required=True, help='Input JSON file with transcription')
    parser.add_argument('--output', required=True, help='Output JSON file with styled captions')

    args = parser.parse_args()

    try:
        # Read input transcription
        with open(args.input, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Extract transcription array
        transcription = data.get('transcription', [])

        if not transcription:
            print("⚠️  No transcription found in input", file=sys.stderr)
            sys.exit(1)

        # Analyze captions
        styled_captions = analyze_captions(transcription)

        # Calculate statistics
        total_words = sum(len(seg['words']) for seg in styled_captions)
        emphasized_words = sum(
            sum(1 for word in seg['words'] if word['emphasized'])
            for seg in styled_captions
        )

        # Count sentiment distribution
        sentiment_counts = {
            'positive': sum(1 for seg in styled_captions if seg.get('sentiment') == 'positive'),
            'negative': sum(1 for seg in styled_captions if seg.get('sentiment') == 'negative'),
            'neutral': sum(1 for seg in styled_captions if seg.get('sentiment') == 'neutral'),
            'question': sum(1 for seg in styled_captions if seg.get('sentiment') == 'question')
        }

        # Prepare output
        output_data = {
            'success': True,
            'captions': styled_captions,
            'stats': {
                'total_segments': len(styled_captions),
                'total_words': total_words,
                'emphasized_words': emphasized_words,
                'emphasis_percentage': round((emphasized_words / total_words * 100) if total_words > 0 else 0, 1),
                'sentiment_distribution': sentiment_counts
            }
        }

        # Write output
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2)

        print(f"✓ Analyzed {len(styled_captions)} caption segments", file=sys.stderr)
        print(f"✓ Found {emphasized_words} emphasized words out of {total_words} total ({output_data['stats']['emphasis_percentage']}%)", file=sys.stderr)

    except FileNotFoundError:
        print(f"❌ Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in input file: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
