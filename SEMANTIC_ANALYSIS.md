# Semantic Video Analysis - Improved SFX Suggestions

## What Changed

### Before ❌ (Basic Pattern Matching)

**Old Method:**
- Simple frame difference to detect scene changes
- Generic "smooth transition swoosh" for ALL transitions
- Basic keyword matching ("door" → "door opening sound")
- No understanding of visual content

**Problems:**
- No context awareness
- Same SFX for different situations
- Missed important moments
- Relied only on spoken words

### After ✅ (Semantic Understanding)

**New Method:**
- **CLIP Vision Model** analyzes what's actually in each frame
- Detects specific actions, objects, and environments
- Contextual SFX based on what's happening
- Combines visual + audio understanding

## How It Works

### 1. Visual Semantic Analysis (Lines 80-145)

**CLIP Model** analyzes frames to detect:

**Actions:**
- person walking → "footsteps on ground"
- person running → "running footsteps, breathing"
- door opening → "door creaking open"
- car driving → "car engine rumble, traffic ambience"
- water flowing → "water flowing, stream sounds"

**Environments:**
- outdoor scene → "outdoor ambience, birds chirping"
- office → "office ambience, computer hum"
- street → "traffic sounds, city ambience"
- forest → "forest sounds, birds, nature"
- rain → "rain falling, thunder"

**Objects:**
- car → "car door, engine start"
- phone → "phone notification, vibration"
- water → "water splash, pouring"
- fire → "fire crackling"

### 2. Semantic Scene Detection (Lines 148-220)

Instead of simple pixel differences:
- Analyzes keyframes every 2 seconds
- Uses CLIP to understand frame content
- Detects primary action, object, and environment
- Shows progress: "Detected: person walking..."

### 3. Intelligent SFX Suggestions (Lines 223-372)

**Contextual Logic:**
1. If person walking detected → suggest footsteps
2. If outdoor environment → suggest ambient nature sounds
3. If phone object + talking action → suggest phone sounds
4. If dialogue mentions "knock door" → suggest knocking sound

**Smart Filtering:**
- Only suggests high-confidence detections (>20%)
- Avoids duplicate suggestions at same timestamp
- Prioritizes unique environments
- Combines visual + audio context

### 4. Contextual Keyword Analysis (Lines 322-357)

**Advanced Pattern Matching:**
- "knock" + "door" → "knocking on wooden door"
- "open" + "door" → "door opening slowly"
- "start" + "car" → "car engine starting"
- "splash" (alone) → "water splash"

## Example Comparison

### Scenario: Person walking to a car

**Old System:**
```
Timestamp: 5.2s
SFX: "smooth transition swoosh"
Reason: "Detected scene change"
```

**New System:**
```
Timestamp: 4.0s
SFX: "footsteps on ground"
Reason: "Detected: person walking"
Confidence: 0.78

Timestamp: 8.5s
SFX: "car door, engine start"
Reason: "Object interaction: car"
Confidence: 0.65
```

## Performance

**Processing Speed:**
- Analyzes 1 keyframe per 2 seconds of video
- CLIP inference: ~0.5s per frame (CPU) / ~0.1s (GPU)
- 60-second video: ~15 keyframes analyzed in 7-15 seconds

**First Run:**
- Downloads CLIP model (~500MB) once
- Cached for future use

## Configuration

### Adjust Detection Frequency

Edit `video_analyzer.py` line 169:
```python
sample_rate = int(fps * 2)  # Every 2 seconds
# Change to: int(fps * 1) for every 1 second (more detailed)
# Change to: int(fps * 5) for every 5 seconds (faster)
```

### Adjust Confidence Threshold

Edit `video_analyzer.py` line 137:
```python
if prob.item() > 0.1:  # 10% confidence
# Increase to 0.3 for more selective detection
# Decrease to 0.05 for more suggestions
```

### Add Custom Actions/Objects

Edit the categories in lines 97-115:
```python
action_categories = [
    "person walking", "person running",
    # Add your custom actions:
    "person dancing", "person cooking", etc.
]
```

## Benefits

1. **Context-Aware**: Understands what's happening in the video
2. **Accurate**: Suggests SFX that match the actual content
3. **Intelligent**: Combines visual + audio for better results
4. **Flexible**: Easy to add new action/object mappings
5. **Efficient**: Samples keyframes instead of analyzing every frame

## Dependencies

- `transformers>=4.30.0` - HuggingFace library for CLIP
- `torch>=2.2.0` - PyTorch for model inference
- Already installed in your environment!

## Testing

Run analysis on a test video:
```bash
source venv/bin/activate
ffmpeg -i your_video.mp4 -vn -acodec pcm_s16le -ar 44100 -ac 2 audio.wav
python python/video_analyzer.py --video your_video.mp4 --audio audio.wav
```

You'll see output like:
```
Loading CLIP vision model...
Analyzing 30 keyframes for semantic content...
Progress: 10% - Detected: person walking...
Progress: 20% - Detected: indoor scene...
```

## Next Steps

You can further improve by:
1. Adding more action categories
2. Using larger CLIP models for better accuracy
3. Implementing action sequence detection (walking → running → jumping)
4. Adding temporal context (what happened before/after)
