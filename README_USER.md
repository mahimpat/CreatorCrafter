# CreatorCrafter

**AI-Powered Video Editing for Content Creators**

CreatorCrafter is a desktop application that helps video creators automate secondary content creation using AI. Generate captions, sound effects, and overlays with the power of machine learning.

![CreatorCrafter Screenshot](https://via.placeholder.com/800x450?text=CreatorCrafter+Screenshot)

## Features

### 🎬 Multi-Track Video Timeline
- Import and arrange multiple video clips
- Precise trimming and clip management
- Magnetic snapping for perfect alignment
- Undo/redo support with full history

### 🎙️ AI-Powered Transcription
- Automatic subtitle generation using Whisper AI
- Real-time caption editing
- Multiple export formats (SRT, VTT)
- Customizable styling

### 🎵 Sound Effect Generation
- Generate custom sound effects using Meta's AudioCraft
- AI-powered scene analysis for SFX suggestions
- Browse FreeSound library for professional SFX
- Multi-lane audio mixing

### 🖼️ Media Overlays
- Import images and videos as overlays
- Drag-and-drop positioning on video
- Transform controls (move, resize, rotate)
- Opacity and blend mode adjustments
- Timeline-based timing control

### 📝 Text Overlays
- Create custom text overlays
- Flexible positioning and styling
- Animation support (coming soon)

### 💾 Project Management
- Save and load projects
- Recent projects quick access
- Asset organization by type
- Auto-save functionality

## Installation

### Windows

1. **Download the Installer**
   - Download `CreatorCrafter-Setup-1.0.0.exe` from the releases page

2. **Run the Installer**
   - Double-click the downloaded file
   - Choose installation directory (default: `C:\Program Files\CreatorCrafter`)
   - The installer will:
     - Install the application
     - Set up Python environment
     - Download AI models (~500MB)
     - Create desktop and start menu shortcuts

3. **Prerequisites**
   - Python 3.8 or higher must be installed from [python.org](https://python.org)
   - Ensure "Add Python to PATH" is checked during Python installation

### macOS

1. **Download the DMG**
   - Download `CreatorCrafter-1.0.0.dmg` from the releases page

2. **Install**
   - Open the DMG file
   - Drag CreatorCrafter to your Applications folder
   - First launch: Right-click → Open (to bypass Gatekeeper)

3. **Setup Environment**
   - On first run, the app will guide you through Python setup
   - Or manually run: `python3 python/setup_environment.py`

4. **Prerequisites**
   - macOS 10.15 (Catalina) or higher
   - Python 3.8+ (usually pre-installed, or install via Homebrew)
   - FFmpeg: `brew install ffmpeg`

### Linux (Ubuntu/Debian)

#### Option 1: AppImage (Recommended)

1. **Download AppImage**
   - Download `CreatorCrafter-1.0.0.AppImage`

2. **Make Executable**
   ```bash
   chmod +x CreatorCrafter-1.0.0.AppImage
   ```

3. **Run**
   ```bash
   ./CreatorCrafter-1.0.0.AppImage
   ```

#### Option 2: DEB Package

1. **Install Prerequisites**
   ```bash
   sudo apt-get update
   sudo apt-get install -y ffmpeg python3 python3-pip python3-venv
   ```

2. **Install Package**
   ```bash
   sudo dpkg -i CreatorCrafter-1.0.0.deb
   ```

3. **Run**
   ```bash
   creatorcrafter
   ```

## Getting Started

### 1. Create Your First Project

1. **Launch CreatorCrafter**
2. **Import a Video**
   - Click "Create New Project"
   - Choose a project location
   - Select your source video file
3. **Wait for Analysis**
   - The AI will analyze your video for transcription and scene understanding
   - This takes 1-2 minutes for a 1-minute video

### 2. Generate Subtitles

1. **Go to Subtitles Tab** (right sidebar)
2. **Edit Generated Captions**
   - Click on any subtitle to edit text
   - Adjust timing by dragging in timeline
   - Resize duration by dragging edges
3. **Customize Styling** (coming soon)

### 3. Add Sound Effects

1. **Go to Sound FX Tab**
2. **Generate Custom SFX**
   - Enter a description (e.g., "whoosh", "explosion", "door slam")
   - Click "Generate SFX"
   - Preview and add to timeline
3. **Or Browse FreeSound Library**
   - Search for professional sound effects
   - Download and import

### 4. Add Media Overlays

1. **Go to Overlays Tab** (left sidebar)
2. **Import Images or Videos**
   - Click "Import Overlay Media"
   - Select image (PNG, JPG, GIF) or video file
3. **Add to Video**
   - Drag overlay from library onto video player
   - Or drag to timeline for precise timing
4. **Adjust Properties** (right sidebar → Overlays tab)
   - **Opacity**: Control transparency
   - **Blend Mode**: Choose visual effect
   - **Rotation**: Rotate the overlay
   - **Scale**: Resize proportionally
   - **Position**: Fine-tune placement

### 5. Export Your Video

1. **Click Export** (top bar)
2. **Choose Export Options**
   - Format (MP4, MOV)
   - Quality settings
   - Include subtitles
3. **Wait for Rendering**
   - Progress will be shown
   - Final video saved to your project folder

## Keyboard Shortcuts

### Timeline
- **Space**: Play/Pause
- **Cmd/Ctrl + Z**: Undo
- **Cmd/Ctrl + Shift + Z**: Redo
- **Delete/Backspace**: Delete selected clips
- **S**: Toggle snapping
- **Cmd/Ctrl + Click**: Multi-select clips

### Media Overlays
- **Drag**: Move overlay on video
- **Drag Corner Handles**: Resize
- **Drag Top Circle**: Rotate
- **Click Timeline Edge**: Trim duration

## Configuration

### FreeSound API Key (Optional)

To use the FreeSound library:

1. Sign up at [freesound.org](https://freesound.org)
2. Get your API key from [freesound.org/apiv2/apply](https://freesound.org/apiv2/apply)
3. Add to settings or create `.env` file:
   ```
   FREESOUND_CLIENT_ID=your_api_key_here
   ```

### AI Model Configuration

Models are downloaded automatically on first run. To use different models, edit:
- `python/video_analyzer.py` - Line ~43 (Whisper model size)
- `python/audiocraft_generator.py` - Line ~42 (AudioCraft model size)

**Available Models:**
- Whisper: `tiny`, `small`, `base`, `medium`, `large`
- AudioCraft: `small`, `medium`, `large`

Larger models = better quality but slower processing and more disk space.

## System Requirements

### Minimum
- **OS**: Windows 10, macOS 10.15+, Ubuntu 20.04+
- **RAM**: 8 GB
- **Storage**: 3 GB free space
- **CPU**: Intel i5 or equivalent (4 cores)
- **GPU**: Not required, but recommended

### Recommended
- **RAM**: 16 GB or more
- **GPU**: NVIDIA GPU with CUDA support (5-10x faster AI processing)
- **Storage**: 5 GB free space on SSD
- **CPU**: Intel i7 or equivalent (8+ cores)

## Troubleshooting

### Application Won't Start

1. **Check Python Installation**
   ```bash
   python --version  # Should show 3.8 or higher
   ```

2. **Run Setup Manually**
   ```bash
   python python/setup_environment.py
   ```

### FFmpeg Errors

**Symptoms**: "FFmpeg not found" or video import fails

**Solution**:
- Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html), add to PATH
- macOS: `brew install ffmpeg`
- Linux: `sudo apt-get install ffmpeg`

### AI Features Not Working

1. **Check AI Models Downloaded**
   - Models are in `~/.cache/huggingface/`
   - Re-download: `python python/download_models.py`

2. **Check Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

### Slow AI Processing

- **Use GPU**: If you have NVIDIA GPU, install CUDA-enabled PyTorch
- **Use Smaller Models**: Edit Python scripts to use `tiny` or `small` models
- **Reduce Video Length**: Process shorter clips for faster results

### Out of Memory Errors

- Close other applications
- Use smaller AI models
- Process shorter video segments
- Increase system RAM or add swap space

## Support & Community

- **Documentation**: [docs.creatorcrafter.com] (coming soon)
- **Report Bugs**: [GitHub Issues](https://github.com/yourrepo/CreatorCrafter/issues)
- **Discord Community**: [Join our Discord] (coming soon)
- **Email Support**: support@creatorcrafter.com

## Privacy & Data

CreatorCrafter runs **100% locally** on your machine:
- No cloud processing
- No data uploaded
- No telemetry or tracking
- Your videos stay on your computer

AI models are downloaded from HuggingFace and run locally.

## Credits

CreatorCrafter uses these amazing open-source projects:

- **Whisper** by OpenAI - Audio transcription
- **AudioCraft** by Meta - Sound generation
- **BLIP** by Salesforce - Image understanding
- **FFmpeg** - Video processing
- **Electron** - Desktop framework
- **React** - UI framework

## License

MIT License - See LICENSE file for details

---

**Made with ❤️ for Content Creators**

*CreatorCrafter v1.0.0*
