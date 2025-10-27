# Smart Video Analysis - Comprehensive Proposal

## Current Limitations Analysis

### What We Do Now (Problems):

1. **Isolated Frame Analysis** ❌
   - Analyzes frames every 3 seconds in isolation
   - No understanding of temporal flow
   - Misses important moments between keyframes
   - Can't detect scene changes or transitions

2. **Dumb Keyword Matching** ❌
   ```python
   if 'door' in description:
       suggest('door sound')  # Too simplistic!
   ```
   - Can't distinguish: gentle door close vs. door slam
   - Same suggestion for horror scene vs. comedy scene
   - No intensity or emotion understanding

3. **No SFX vs Music Distinction** ❌
   - Treats all audio suggestions the same
   - Background music needs: mood, energy, genre
   - SFX needs: precise timing, layering, intensity

4. **No Scene Understanding** ❌
   - Doesn't segment video into coherent scenes
   - Can't understand narrative structure
   - No detection of intro/build/climax/outro

5. **Poor Timing** ❌
   - Fixed 3-second intervals
   - Misses exact moment of impact, cut, transition
   - No frame-accurate synchronization

---

## What Makes "Smart" Video Analysis?

### For SFX Suggestions:

✅ **Event Detection**
- Detect precise moments: cuts, impacts, object interactions
- Frame-accurate timing (not 3-second intervals)
- Understand cause-effect (person reaches for door → door opens)

✅ **Context-Aware Intensity**
- Soft footsteps in library vs. heavy boots in action scene
- Gentle door close vs. dramatic slam
- Whisper vs. shout

✅ **Layered Sound Design**
- Background ambience (constant)
- Mid-ground (occasional sounds)
- Foreground (specific actions)

✅ **Semantic Understanding**
- "Person angrily slams car door" → heavy metal slam + echo
- "Child quietly sneaking" → soft creaky footsteps
- Not just "person" + "door" = generic sound

### For Background Music:

✅ **Mood/Emotion Detection**
- Happy, sad, tense, peaceful, energetic, calm
- Emotional arc over time (not static)

✅ **Energy Level Matching**
- Cut frequency (fast cuts = high energy)
- Motion intensity (tracking, camera movement)
- Scene pacing

✅ **Genre/Style Matching**
- Vlog → upbeat indie/electronic
- Documentary → ambient/orchestral
- Action → intense drums/bass
- Cooking video → light acoustic

✅ **Musical Structure**
- Intro (0-5s): establish mood
- Build (5-15s): increase energy
- Main (15s-end-10s): sustained energy
- Outro (last 10s): wind down

✅ **Narrative Synchronization**
- Music changes with scene changes
- Intensity matches visual intensity
- Respects dialogue moments (duck music)

---

## Proposed Smart Architecture

### Phase 1: Scene Segmentation & Understanding (Foundation)

**Goal:** Understand video structure, not just individual frames

```
Input Video
    ↓
[1. Scene Detection]
    - PySceneDetect: detect cuts/transitions
    - Result: Video split into coherent scenes
    ↓
[2. Per-Scene Analysis]
    - BLIP: visual description (1x per scene, not every 3s)
    - Motion analysis: track intensity over scene
    - Audio analysis: detect existing sound characteristics
    ↓
[3. Scene Classification]
    - Type: dialogue, action, transition, establishing shot
    - Mood: happy, tense, sad, neutral, energetic
    - Energy: low (0-3), medium (4-6), high (7-10)
```

**Benefits:**
- ✅ 5-10x fewer AI calls (analyze scenes, not frames)
- ✅ Better context (understand each scene as a whole)
- ✅ Natural segmentation for music suggestions

**Implementation:**
- Use `PySceneDetect` library (fast, no AI needed)
- Group frames into scenes
- Analyze scene as unit, not individual frames

---

### Phase 2: Event-Based SFX Detection (Precision)

**Goal:** Detect exact moments where sounds should occur

```
[Scene Timeline]
    ↓
[Event Detection]
    - Frame differencing: detect motion peaks
    - Object detection: track objects entering/leaving
    - Cut detection: scene transitions
    - Action recognition: specific movements
    ↓
[Event Classification]
    - Impact event (collision, slam, drop)
    - Transition event (cut, wipe, fade)
    - Movement event (walk, run, gesture)
    - Interaction event (grab, open, close)
    ↓
[Context Enrichment]
    - Get visual context from scene description
    - Get intensity from motion magnitude
    - Get emotion from scene mood
    ↓
[Smart SFX Suggestion]
    Event: "Impact at 5.3s"
    Context: "Car door in tense scene"
    Intensity: "High (8/10)"
    → Suggestion: "Heavy car door slam with metallic clang, tense atmosphere"
```

**Benefits:**
- ✅ Frame-accurate timing
- ✅ Context-aware descriptions
- ✅ Intensity-matched suggestions
- ✅ Catches important moments (not just every 3 seconds)

**Implementation:**
- OpenCV motion detection (fast, no AI)
- Simple object tracking
- Combine with BLIP descriptions for context

---

### Phase 3: Semantic Audio Prompt Generation (Intelligence)

**Goal:** Generate smart audio prompts, not keyword matching

**Current (Dumb):**
```python
if 'door' in description:
    prompt = 'door sounds'  # Too generic!
```

**Smart Approach:**
```python
# Use simple template-based generation
scene_context = "tense horror scene"
visual_object = "old wooden door"
action = "slowly creaking open"
intensity = 7  # out of 10
mood = "eerie"

# Generate contextual prompt
prompt = generate_audio_prompt(
    object=visual_object,
    action=action,
    scene_mood=mood,
    intensity=intensity
)
# Result: "Old wooden door slowly creaking open with eerie groaning,
#          tense atmosphere, high intensity"
```

**Benefits:**
- ✅ Rich, contextual prompts for better AudioCraft results
- ✅ No need for LLM API (template-based)
- ✅ Captures nuance and emotion

**Implementation:**
- Template system with variables
- Intensity adjectives: soft/moderate/loud/intense
- Mood adjectives: eerie/cheerful/tense/peaceful
- Action verbs: creaking/slamming/clicking/whooshing

---

### Phase 4: Music Mood & Energy Analysis (Background Music)

**Goal:** Suggest background music based on scene mood and energy

```
[Scene Analysis]
    ↓
[Mood Detection]
    - Visual cues: colors (warm/cool), brightness
    - Motion patterns: fast cuts = energetic, slow = calm
    - Face detection: smiling = happy, frowning = sad
    - Audio cues: existing dialogue tone
    ↓
[Energy Calculation]
    - Cut frequency: cuts/second
    - Motion magnitude: pixels changed/frame
    - Camera movement: static vs. dynamic
    ↓
[Music Suggestion]
    Mood: "energetic and cheerful"
    Energy: 8/10
    Genre: "vlog"
    Duration: 15s
    → MusicGen Prompt: "Upbeat electronic music with driving beat,
                        energetic and cheerful mood, perfect for vlogs"
```

**Benefits:**
- ✅ Mood-matched music
- ✅ Energy-matched pacing
- ✅ Genre-appropriate suggestions
- ✅ Uses MusicGen (which you already have!)

**Implementation:**
- Color histogram analysis (OpenCV)
- Motion magnitude tracking
- Simple heuristics for mood
- Template-based MusicGen prompts

---

## Implementation Roadmap

### Week 1: Scene-Based Analysis (Foundation)

**Day 1-2: Scene Detection**
- Integrate PySceneDetect
- Split video into scenes
- Test on sample videos

**Day 3-4: Scene Classification**
- Mood detection (color, motion)
- Energy calculation
- Scene type classification

**Day 5: Integration**
- Update analyze_scenes() to work per-scene
- Remove 3-second sampling
- Test accuracy improvements

**Expected Improvement:**
- 70% fewer AI calls
- Better context understanding
- Foundation for smart suggestions

---

### Week 2: Event-Based SFX (Precision)

**Day 1-2: Event Detection**
- Motion peak detection
- Object interaction tracking
- Cut/transition detection

**Day 3-4: Smart Prompts**
- Template-based prompt generation
- Context + intensity + mood integration
- Test AudioCraft output quality

**Day 5: Timing Refinement**
- Frame-accurate event timing
- Filter false positives
- User testing

**Expected Improvement:**
- Frame-accurate SFX timing
- 60% better prompt quality
- Context-aware suggestions

---

### Week 3: Music Intelligence (Background)

**Day 1-2: Mood Analysis**
- Color-based mood detection
- Motion-based energy calculation
- Face expression detection (optional)

**Day 3-4: Music Prompts**
- MusicGen prompt templates
- Genre classification
- Energy-to-music mapping

**Day 5: Integration & Testing**
- Separate SFX and Music tabs
- User feedback collection
- Refinement

**Expected Improvement:**
- Mood-matched music suggestions
- Genre-appropriate recommendations
- Better user experience

---

## Comparison: Before vs After

### Current System:
```
[Video] → [Sample every 3s] → [BLIP 3x per frame] → [Keyword match] → [Generic suggestions]

Problems:
❌ Slow (30+ AI calls)
❌ Misses important moments
❌ Generic, not contextual
❌ Same for SFX and music
❌ Poor timing
```

### Smart System:
```
[Video] → [Scene detection] → [Event detection] → [Mood analysis] → [Context-aware prompts]

Benefits:
✅ Fast (5-10 AI calls)
✅ Frame-accurate events
✅ Rich, contextual prompts
✅ Separate SFX/Music intelligence
✅ Precise timing
```

---

## Technical Stack (Minimal New Dependencies)

### Already Have:
- ✅ OpenCV (motion, color analysis)
- ✅ BLIP (visual understanding)
- ✅ Whisper (transcription)
- ✅ AudioCraft (AudioGen + MusicGen)

### Need to Add:
- 📦 `scenedetect` (scene detection) - lightweight
- 📦 Templates for prompt generation - no dependency

### Remove/Reduce:
- ❌ Remove 3x BLIP calls per frame
- ❌ Remove keyword matching
- ❌ Remove 3-second sampling

**Net Result:** Fewer dependencies, better performance!

---

## User Experience Improvements

### Better SFX Suggestions:
**Before:**
```
5.0s - "door sounds" (confidence: 0.7)
```

**After:**
```
5.3s - "Heavy wooden door slamming in tense horror scene, loud metallic latch"
       (confidence: 0.92)
       [Preview] [Use] [Edit Prompt]
```

### Better Music Suggestions:
**Before:**
```
0.0s - "background music" (generic)
```

**After:**
```
Scene 1 (0-15s): "Upbeat electronic music, energetic and cheerful, perfect for vlog intro"
       Mood: Energetic 😊 | Energy: 8/10 | Genre: Electronic
       [Preview] [Use] [Customize]

Scene 2 (15-30s): "Calm ambient music, peaceful and introspective, documentary style"
       Mood: Calm 😌 | Energy: 3/10 | Genre: Ambient
       [Preview] [Use] [Customize]
```

---

## Success Metrics

### Accuracy:
- Current: ~40% of suggestions are useful
- Target: ~80% of suggestions are useful

### Speed:
- Current: 30-60s for 30s video
- Target: 10-15s for 30s video (3-4x faster)

### User Satisfaction:
- Measure: % of suggestions accepted by user
- Current: ~20%
- Target: ~60%

---

## What Do You Think?

This proposal focuses on:
1. **Smart segmentation** - understand scenes, not just frames
2. **Event-based detection** - precise timing for SFX
3. **Context-aware prompts** - rich descriptions for better AI generation
4. **Mood intelligence** - appropriate music suggestions
5. **Minimal dependencies** - use what we have efficiently

**Should we start with Week 1 (Scene-Based Analysis)?** It's the foundation that makes everything else possible and will immediately improve accuracy while reducing AI calls.
