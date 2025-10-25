# AI Content Creator Assistant

A powerful Electron-based desktop application that helps video content creators automate secondary content creation tasks using AI. The application analyzes videos, generates captions/subtitles, suggests and creates sound effects using Meta AudioCraft, and enables custom text overlays.

## Features

### Core Functionality
- **Video Upload & Processing**: Support for MP4, MOV, AVI, MKV, and WebM formats
- **AI-Powered Video Analysis**: Automatically identifies key moments, scene changes, and optimal timeslots for enhancements
- **Smart Caption Generation**: Auto-generates captions from speech using Whisper AI
- **AI Sound Effects**: Generate custom SFX using Meta AudioCraft based on text descriptions
- **Text Overlays**: Add customizable animated text overlays at specific timestamps
- **Timeline Editor**: Intuitive timeline-based editing with visual track management
- **Video Rendering**: Export final videos with all applied effects

### AI Features
- Speech-to-text transcription using OpenAI Whisper
- Scene detection and classification
- Intelligent SFX suggestions based on video content and dialogue
- Text-to-audio generation using Meta AudioCraft MusicGen

### Editing Capabilities
- **Subtitles/Captions**:
  - Auto-generate from transcription
  - Customizable fonts, colors, sizes, and positions
  - Timeline-based editing
  - Export to SRT/VTT formats

- **Sound Effects**:
  - AI-generated SFX from text prompts
  - Import existing audio files
  - Visual timeline management
  - Volume controls

- **Text Overlays**:
  - Custom positioning
  - Animation effects (fade, slide, zoom)
  - Style customization
  - Multiple overlays support

## Prerequisites

### System Requirements
- **Operating System**: Windows 10+, macOS 10.14+, or Linux
- **Node.js**: v18 or higher
- **Python**: 3.8 or higher
- **FFmpeg**: Must be installed and available in system PATH
- **Memory**: 8GB RAM minimum (16GB recommended for AI features)
- **GPU**: CUDA-compatible GPU recommended for faster AI processing (optional)

### Required Software
1. **Node.js and npm**: [Download](https://nodejs.org/)
2. **Python 3.8+**: [Download](https://python.org/)
3. **FFmpeg**: [Download](https://ffmpeg.org/download.html)
   - Make sure `ffmpeg` and `ffprobe` are in your system PATH

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd AI-based-content-creation
```

### 2. Install Node.js Dependencies
```bash
npm install
```

### 3. Set Up Python Environment
It's recommended to use a virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r python/requirements.txt
```

### 4. Install FFmpeg
Make sure FFmpeg is installed and accessible from your PATH.

**Verify installation:**
```bash
ffmpeg -version
ffprobe -version
```

## Development

### Run in Development Mode
```bash
npm run electron:dev
```

This will:
1. Start the Vite dev server
2. Launch the Electron application
3. Enable hot reload for quick development

### Build for Production
```bash
npm run electron:build
```

This creates production builds for your current platform in the `release/` directory.

### Build for Specific Platform
```bash
# Windows
npm run electron:build -- --win

# macOS
npm run electron:build -- --mac

# Linux
npm run electron:build -- --linux
```

## Project Structure

```
AI-based-content-creation/
├── electron/                 # Electron main process
│   ├── main.ts              # Main process entry point
│   └── preload.ts           # Preload script for IPC
├── src/                     # React frontend
│   ├── components/          # React components
│   │   ├── VideoPlayer.tsx  # Video player with controls
│   │   ├── Timeline.tsx     # Timeline editor
│   │   ├── SubtitleEditor.tsx
│   │   ├── SFXEditor.tsx
│   │   ├── OverlayEditor.tsx
│   │   └── ...
│   ├── context/            # React Context for state
│   │   └── ProjectContext.tsx
│   ├── App.tsx             # Main App component
│   ├── main.tsx            # React entry point
│   └── index.css           # Global styles
├── python/                 # Python AI/ML scripts
│   ├── audiocraft_generator.py  # AudioCraft SFX generation
│   ├── video_analyzer.py       # Video analysis & transcription
│   └── requirements.txt        # Python dependencies
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## Architecture

### Security
The application follows Electron security best practices:
- **Context Isolation**: Enabled to prevent renderer process from accessing Node.js
- **Sandbox**: Enabled for renderer processes
- **No Node Integration**: Disabled in renderer
- **Secure IPC**: All IPC communication goes through a secure preload script

### Communication Flow
```
Renderer (React)
    ↕ (IPC via preload script)
Main Process (Electron)
    ↕ (Child processes)
Python Scripts (AI/ML)
    ↕
FFmpeg (Video processing)
```

## Usage Guide

### 1. Load a Video
- Click "Select Video to Get Started" on the welcome screen
- Choose a video file (MP4, MOV, AVI, MKV, WebM)

### 2. Analyze Video
- Click "Analyze Video" in the top bar
- The AI will:
  - Extract and analyze audio
  - Transcribe speech to text
  - Detect scene changes
  - Suggest sound effects

### 3. Add Subtitles
- Switch to "Subtitles" tab
- Click "Auto-Generate" to use AI transcription
- Or manually add/edit subtitles
- Customize font, size, color, and position
- Preview in real-time on the video

### 4. Generate Sound Effects
- Switch to "Sound FX" tab
- Enter a text description (e.g., "door creaking open")
- Set duration
- Click "Generate SFX"
- Or use AI suggestions from video analysis
- Position SFX on timeline

### 5. Add Text Overlays
- Switch to "Overlays" tab
- Enter text and set timing
- Customize position, style, and animation
- Preview on video player

### 6. Export
- Click "Export Video" to render final video with all effects
- Click "Export Subtitles" to save captions as SRT file

## AI Models Used

### Whisper (Speech-to-Text)
- Model: `base` (good balance of speed/accuracy)
- Can be changed to `tiny`, `small`, `medium`, or `large` in `video_analyzer.py`
- First run downloads the model (~140MB for base)

### AudioCraft MusicGen (SFX Generation)
- Model: `small` (faster generation)
- Can be changed to `medium` or `large` in `audiocraft_generator.py`
- First run downloads the model (~300MB for small)
- Requires significant compute power (GPU recommended)

## Configuration

### Changing AI Models
Edit the Python scripts to use different model sizes:

**video_analyzer.py** (line ~35):
```python
model = whisper.load_model("base")  # Change to: tiny, small, medium, large
```

**audiocraft_generator.py** (line ~31):
```python
model = MusicGen.get_pretrained('small')  # Change to: medium, large
```

### FFmpeg Settings
Video export settings can be modified in `electron/main.ts` (buildRenderCommand function).

## Troubleshooting

### Python Scripts Not Working
1. Ensure Python virtual environment is activated
2. Verify all dependencies are installed: `pip install -r python/requirements.txt`
3. Check Python is accessible from terminal: `python --version`

### FFmpeg Errors
1. Verify FFmpeg installation: `ffmpeg -version`
2. Ensure FFmpeg is in system PATH
3. On Windows, you may need to restart after adding to PATH

### Audio Generation Fails
1. AudioCraft requires significant resources
2. Try using CPU if GPU not available (will be slower)
3. Reduce duration for faster generation
4. Check PyTorch installation supports your hardware

### Video Analysis Takes Too Long
1. Use smaller Whisper model (tiny or base)
2. Process shorter video clips for testing
3. Ensure sufficient RAM is available

### App Won't Launch
1. Delete `node_modules` and run `npm install` again
2. Clear Electron cache: `npm run clean` (if available)
3. Check console for errors

## Performance Tips

1. **GPU Acceleration**: Install CUDA-enabled PyTorch for faster AI processing
2. **Model Selection**: Use smaller AI models for faster processing
3. **Video Resolution**: Lower resolution videos process faster
4. **Incremental Saves**: Save project files to avoid re-processing

## Dependencies

### Main Technologies
- **Electron**: Desktop application framework
- **React**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool
- **FFmpeg**: Video/audio processing
- **Meta AudioCraft**: AI audio generation
- **OpenAI Whisper**: Speech recognition
- **OpenCV**: Video analysis

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Your License Here]

## Credits

- **Meta AudioCraft**: https://github.com/facebookresearch/audiocraft
- **OpenAI Whisper**: https://github.com/openai/whisper
- **FFmpeg**: https://ffmpeg.org

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Roadmap

- [ ] Batch video processing
- [ ] Custom AI model training
- [ ] Real-time preview of effects
- [ ] Cloud rendering support
- [ ] Plugin system for custom effects
- [ ] Multi-language subtitle support
- [ ] Advanced timeline editing (cut, split, trim)
- [ ] Background music generation
- [ ] Voice cloning for dubbing
- [ ] Auto-detect action sequences for SFX

---

Built with ❤️ using Electron, React, and AI
