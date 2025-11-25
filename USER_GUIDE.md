# CreatorCrafter User Guide

## What is CreatorCrafter?

**CreatorCrafter** is an AI-powered desktop application that helps video creators automate secondary content creation. It uses advanced AI models to analyze your videos, generate sound effects, create captions, and edit multi-clip sequences - all designed to save you hours of manual work.

### Key Features

🎬 **AI Video Analysis** - Automatic transcription and scene understanding using OpenAI Whisper
🔊 **AI Sound Effects** - Generate custom SFX using Meta's AudioCraft
📝 **Smart Captions** - Auto-generate styled subtitles from speech
✂️ **Multi-Clip Timeline** - Edit sequences with multiple video clips
🎨 **Text Overlays** - Add animated text overlays to your videos
🚀 **One-Click Export** - Render final videos with all effects applied

---

## Getting Started

### Installation

1. **Download the installer** (247MB)
2. **Run the installer** - Installs in ~30 seconds to `%LOCALAPPDATA%\CreatorCrafter\`
3. **Run setup-dependencies.bat** - Found in installation folder, takes 10-15 minutes
   - Auto-installs Python 3.11+ if needed
   - Installs AI dependencies (~1.5GB)
   - Sets up FFmpeg paths
4. **Launch CreatorCrafter** from Start Menu

**First Run:** AI models will download automatically (~2GB total)
- First video analysis: ~5 minutes (Whisper model)
- First SFX generation: ~10 minutes (AudioCraft model)
- After that: Everything is instant!

### System Requirements

- **OS:** Windows 10/11 (64-bit)
- **RAM:** 8GB minimum, 16GB recommended
- **Disk Space:** ~4GB for app + dependencies + models
- **Internet:** Required for initial setup and model downloads
- **Graphics:** CPU works fine, GPU (CUDA) accelerates AI processing

---

## Main Interface Overview

When you launch CreatorCrafter, you'll see:

```
┌─────────────────────────────────────────────────────┐
│ File  Edit  View  Help                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│           VIDEO PLAYER                              │
│         (Main preview area)                         │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Timeline  │  Media Bin  │  Subtitles  │  SFX      │
├─────────────────────────────────────────────────────┤
│                                                     │
│              TIMELINE / EDITOR                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Top Tabs

- **Timeline** - Edit your video sequence
- **Media Bin** - Browse and import media files
- **Subtitle Editor** - Create and style captions
- **SFX Editor** - Generate and manage sound effects
- **Overlay Editor** - Add text overlays

---

## Workflows & How to Use

### Workflow 1: Analyze a Single Video

**Use Case:** Transcribe speech, understand scenes, detect motion

1. **Import Video**
   - Click "Import Video" or drag-and-drop a video file
   - Supported formats: MP4, MOV, AVI, MKV

2. **Analyze Video**
   - Click "Analyze Video" button
   - AI will process:
     - 🎤 Speech transcription (Whisper)
     - 🎬 Scene detection (frame analysis)
     - 🏃 Motion detection (enhanced)
     - 🎭 Scene transitions (cuts, fades, dissolves)

3. **View Results**
   - **Transcript:** Full text of all speech
   - **Scenes:** Key moments detected
   - **Motion Events:** High-activity segments
   - **Timing:** All events timestamped

4. **Use the Data**
   - Auto-generate captions from transcript
   - Place SFX at detected events
   - Identify key moments for editing

**Time:** 2-5 minutes depending on video length

---

### Workflow 2: Create Multi-Clip Timeline

**Use Case:** Edit sequences with multiple video clips

1. **Add Videos to Media Bin**
   - Click "Media Bin" tab
   - Import multiple video files
   - Thumbnail previews shown

2. **Build Timeline**
   - Drag videos from Media Bin to Timeline
   - Videos placed end-to-end automatically
   - Scrub timeline to preview

3. **Analyze Timeline**
   - Click "Analyze Timeline" button
   - AI analyzes the entire concatenated sequence
   - All clips processed as one video

4. **Edit & Refine**
   - Adjust clip order
   - Trim clips (future feature)
   - Add transitions (future feature)

**Timeline Controls:**
- **Play/Pause:** Space bar or button
- **Scrub:** Click on timeline or drag playhead
- **Zoom:** Scroll to zoom timeline view

---

### Workflow 3: Generate AI Sound Effects

**Use Case:** Create custom SFX for your videos

1. **Open SFX Editor**
   - Click "SFX Editor" tab
   - View existing SFX tracks

2. **Create New SFX**
   - Click "Generate SFX" button
   - Enter a text prompt describing the sound
     - Example: "thunder and rain"
     - Example: "door creaking open"
     - Example: "footsteps on gravel"

3. **Set Parameters**
   - **Duration:** 1-30 seconds
   - **Start Time:** When to play in video
   - **Volume:** 0-100%

4. **Generate**
   - Click "Generate"
   - AI creates audio using AudioCraft
   - Preview the generated sound

5. **Apply to Video**
   - SFX added to timeline
   - Plays synchronized with video
   - Adjust volume and timing as needed

**First Generation:** ~10 minutes (model downloads)
**Subsequent Generations:** ~1-2 minutes per SFX

**Tips for Better SFX:**
- Be specific: "heavy rain on metal roof" vs "rain"
- Describe intensity: "loud explosion" vs "explosion"
- Include duration context: "short beep" vs "continuous alarm"

---

### Workflow 4: Add Captions/Subtitles

**Use Case:** Add subtitles from video transcript

1. **Analyze Video First**
   - Must run "Analyze Video" to get transcript
   - Transcript extracted via Whisper AI

2. **Open Subtitle Editor**
   - Click "Subtitle Editor" tab
   - Transcript shown with timestamps

3. **Auto-Generate Captions**
   - Click "Generate Captions"
   - Captions created from transcript
   - Timing based on speech detection

4. **Edit Captions**
   - Adjust text for accuracy
   - Fix timing if needed
   - Split/merge caption segments

5. **Style Captions**
   - Font: Choose font family
   - Size: Adjust text size
   - Color: Text and background color
   - Position: Top, middle, or bottom
   - Animation: Fade in/out effects (future)

6. **Burn into Video**
   - Captions embedded during export
   - Or export as separate .srt file

---

### Workflow 5: Add Text Overlays

**Use Case:** Add titles, lower thirds, annotations

1. **Open Overlay Editor**
   - Click "Overlay Editor" tab

2. **Create Overlay**
   - Click "Add Overlay"
   - Enter text content
   - Set start time and duration

3. **Style Overlay**
   - Position: X/Y coordinates or presets
   - Font: Family, size, weight
   - Colors: Text, outline, background
   - Animation: Fade, slide, zoom (future)

4. **Preview**
   - Scrub timeline to see overlay
   - Adjust timing and position

5. **Apply**
   - Overlay rendered in final export

**Common Uses:**
- Video titles
- Channel name/logo
- Call-to-action text
- Scene labels
- Timestamps

---

### Workflow 6: Export Final Video

**Use Case:** Render video with all effects applied

1. **Review Timeline**
   - Check all clips in order
   - Verify SFX timing
   - Confirm captions/overlays

2. **Export Video**
   - Click "Export" button
   - Choose output location and filename

3. **Export Includes:**
   - ✅ All video clips (concatenated)
   - ✅ Original audio
   - ✅ SFX tracks (mixed)
   - ✅ Captions (burned in)
   - ✅ Text overlays
   - ✅ Animations (future)

4. **Processing**
   - FFmpeg renders final video
   - Shows progress bar
   - Time depends on video length

5. **Output**
   - MP4 file ready to upload
   - Same resolution as source
   - Optimized for web streaming

**Export Time:** ~1-5 minutes for typical videos

---

## Advanced Features

### Frame Analysis

Videos are analyzed frame-by-frame for:
- **Motion intensity** - Detects action scenes, camera movement
- **Scene boundaries** - Identifies cuts, fades, dissolves
- **Visual content** - Understands what's in each frame (BLIP AI)

### Event Detection

Smart detection of:
- **High motion events** - Action sequences
- **Scene transitions** - Cuts between shots
- **Speech segments** - Who's talking when
- **Audio events** - Music, silence, sound effects

### Optimization

- **4K videos downscaled** to 720p for analysis (9x faster)
- **Frame skipping** optional for very long videos
- **Transition detection** can be toggled
- **GPU acceleration** if NVIDIA CUDA available

---

## Tips & Best Practices

### For Video Analysis

✅ **Use good audio quality** - Whisper works best with clear speech
✅ **Minimize background noise** - Improves transcription accuracy
✅ **Shorter videos first** - Test workflow on 1-2 minute clips
✅ **Check transcript** - Review before generating captions

### For SFX Generation

✅ **Be descriptive** - "Creaking wooden door" > "Door"
✅ **Short prompts work** - 3-7 words is optimal
✅ **Generate multiple options** - Try variations
✅ **Adjust volume** - Balance with original audio

### For Timeline Editing

✅ **Organize Media Bin** - Name clips clearly
✅ **Analyze timeline** after arranging clips
✅ **Preview often** - Scrub to check transitions
✅ **Save projects** - Don't lose your work!

### For Performance

✅ **Close other apps** - Free up RAM for AI processing
✅ **Use SSD** - Faster video loading and export
✅ **GPU helps** - CUDA accelerates AI models
✅ **Patience on first run** - Model downloads take time

---

## Common Use Cases

### 1. YouTube Video Creation

1. Import main video
2. Analyze to get transcript
3. Generate captions for accessibility
4. Add SFX at key moments
5. Add title overlay at start
6. Export final video

### 2. Tutorial Videos

1. Record screen capture
2. Analyze speech to get transcript
3. Auto-generate captions
4. Add text overlays for step numbers
5. Generate UI sound effects (clicks, whooshes)
6. Export with all elements

### 3. Podcast Clips

1. Import full podcast video
2. Analyze to find key moments
3. Create multi-clip timeline of highlights
4. Add captions for social media
5. Generate background music/ambience
6. Export short clips

### 4. Social Media Content

1. Import raw footage
2. Detect high-motion moments
3. Create timeline of best clips
4. Add trending SFX
5. Overlay text hooks
6. Export vertical format (future)

### 5. Educational Content

1. Import lecture/presentation
2. Auto-transcribe speech
3. Generate timestamped captions
4. Add topic labels as overlays
5. Insert transition sounds
6. Export with chapters (future)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Play/Pause video |
| **Left/Right Arrow** | Skip backward/forward 5 seconds |
| **Home** | Jump to start |
| **End** | Jump to end |
| **Ctrl + I** | Import video |
| **Ctrl + E** | Export video |
| **Ctrl + S** | Save project |
| **Ctrl + Z** | Undo (future) |
| **Ctrl + Y** | Redo (future) |

---

## File Management

### Project Files

CreatorCrafter saves your work as project files (.json) containing:
- Timeline configuration
- Imported media references
- SFX tracks and settings
- Caption data
- Overlay definitions
- Analysis results (cached)

**Location:** You choose where to save

### Media Storage

- **Original videos:** Stay in their original location
- **Generated SFX:** Saved in temp folder, then in project
- **AI models:** Cached in `%USERPROFILE%\.cache`
- **Exports:** You choose output location

### Cache Management

AI models are cached after first download:
- **Whisper:** ~500MB
- **AudioCraft:** ~1GB
- **BLIP:** ~500MB

**Clear cache manually:** Delete `%USERPROFILE%\.cache\huggingface` and `%USERPROFILE%\.cache\whisper`

---

## Troubleshooting

### "Python not found"

**Solution:** Run `setup-dependencies.bat` from installation folder

### "FFmpeg error"

**Solution:** Check `.env` file has correct path: `FFMPEG_PATH=C:\...\ffmpeg.exe`

### "Model download failed"

**Solution:**
- Check internet connection
- Disable VPN temporarily
- Models download from Hugging Face - ensure accessible

### "Video won't import"

**Solution:**
- Check format is supported (MP4, MOV, AVI, MKV)
- Re-encode with Handbrake if needed
- Check file isn't corrupted

### "Analysis takes forever"

**Solution:**
- Normal for first run (model downloads)
- 4K videos take longer - check if downscaling is enabled
- Long videos (>30 min) may take 10+ minutes

### "SFX sounds wrong"

**Solution:**
- Try different prompts
- Be more specific in description
- Generate multiple options
- AudioCraft is creative - results vary!

### "Out of memory"

**Solution:**
- Close other applications
- Restart CreatorCrafter
- Use smaller/shorter videos
- Upgrade RAM (16GB recommended)

---

## FAQ

**Q: Is internet required?**
A: Only for initial setup and first-time model downloads. After that, works offline.

**Q: Can I use my own AI API keys?**
A: Currently uses local AI models. Cloud API support coming in future updates.

**Q: What video formats are supported?**
A: MP4, MOV, AVI, MKV. Most common formats work via FFmpeg.

**Q: Can I edit individual clips?**
A: Currently supports arrangement and concatenation. Trimming/splitting coming soon.

**Q: How accurate is the transcription?**
A: Very accurate for clear English speech. Whisper supports 99 languages with varying accuracy.

**Q: Can I customize SFX generation?**
A: Prompt engineering is key. More controls (pitch, tempo) coming in future updates.

**Q: Does it support GPU acceleration?**
A: Yes! NVIDIA GPUs with CUDA significantly speed up AI processing.

**Q: Can I export to different formats?**
A: Currently exports to MP4. More formats coming soon.

**Q: Is my data sent to the cloud?**
A: No! All AI processing happens locally on your computer. Your videos never leave your machine.

**Q: How do I update the app?**
A: Squirrel auto-update will notify when updates available. Or download new installer.

---

## Getting Help

### Resources

- **Installation Guide:** See `INSTALLATION_GUIDE.md`
- **GitHub Issues:** Report bugs and request features
- **Documentation:** All guides in installation folder

### Community

- Share your creations
- Report bugs with error messages
- Suggest features
- Help other users

---

## What's Next?

### Planned Features

🚀 **Coming Soon:**
- Clip trimming and splitting
- Video transitions (crossfade, wipe)
- Animation effects for text
- Custom fonts and styles
- Export presets (YouTube, Instagram, TikTok)
- Batch processing
- Plugin system

💡 **Future Ideas:**
- Cloud API integration (OpenAI, ElevenLabs)
- Auto-highlight detection
- Music generation
- Multi-language support
- Collaborative editing
- Templates library

---

## Credits

**AI Models Used:**
- **OpenAI Whisper** - Speech recognition
- **Meta AudioCraft** - Sound effects generation
- **Salesforce BLIP** - Image understanding

**Built With:**
- Electron + React + TypeScript
- Python + PyTorch
- FFmpeg for video processing

---

## Version

**Current Version:** 1.0.0 (MVP)
**Release Date:** November 2025
**Platform:** Windows 10/11 (64-bit)

---

## License

See LICENSE file for details.

---

**Happy Creating! 🎬✨**

For questions, issues, or feedback, please visit our GitHub repository.
