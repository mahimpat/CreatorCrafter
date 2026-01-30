# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Content Creator is an Electron-based desktop application that helps video creators automate secondary content creation using AI. The app analyzes videos, generates captions/subtitles, creates sound effects using Meta AudioCraft, and enables custom text overlays.

## Common Development Commands

### Development
```bash
# Start development server with hot reload
npm run electron:dev

# Type check TypeScript files
npm run type-check

# Start only the Vite dev server (for frontend testing)
npm run dev
```

### Build & Production
```bash
# Build for current platform
npm run electron:build

# Build directory only (faster, no installer)
npm run build:dir

# Build web assets only
npm run build

# Preview built assets
npm run preview
```

### Setup & Installation
```bash
# Complete setup (creates venv, installs dependencies, downloads AI models)
npm run setup

# Download AI models only (requires active venv)
npm run download:models

# Python environment setup only
npm run setup:python

# Manual Python environment (if npm scripts fail)
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate      # Windows
pip install -r requirements.txt
python python/download_models.py
```

## Architecture

### Core Components
- **Electron Main Process** (`electron/main.ts`): Handles file operations, video processing, and Python integration
- **React Frontend** (`src/`): User interface with component-based architecture
- **Python Backend** (`python/`): AI/ML processing using Whisper and AudioCraft
- **IPC Bridge** (`electron/preload.ts`): Secure communication between renderer and main processes

### State Management
Central state is managed through React Context (`src/context/ProjectContext.tsx`) with TypeScript interfaces:
- `Subtitle`: Caption/subtitle data with styling
- `SFXTrack`: Sound effect tracks with timing
- `TextOverlay`: Text overlays with animations
- `VideoAnalysisResult`: AI analysis results from Python scripts

### Project File Structure
Projects are stored as directories with:
```
project-name/
├── project.json          # Project metadata and state
└── assets/
    ├── source/           # Original video files
    ├── sfx/              # Generated/imported sound effects
    └── exports/          # Rendered output videos
```
Project serialization handled by `src/utils/projectSerializer.ts`.

### Communication Flow
```
React Components → IPC (preload.ts) → Main Process → Python Scripts → AI Models
```

### Security Model
- Context isolation enabled
- Sandbox mode for renderer processes
- No Node.js integration in renderer
- All file system operations go through IPC

## Key Files and Their Purposes

### Frontend (`src/`)
- `App.tsx`: Main application component with routing
- `context/ProjectContext.tsx`: Central state management
- `components/VideoPlayer.tsx`: Video playback with timeline controls
- `components/Timeline.tsx`: Timeline editor for all tracks
- `components/SubtitleEditor.tsx`: Caption editing interface
- `components/SFXEditor.tsx`: Sound effect generation and management
- `components/OverlayEditor.tsx`: Text overlay creation

### Backend Integration (`electron/`)
- `main.ts`: Electron main process with IPC handlers for:
  - File dialogs and video processing (FFmpeg)
  - Python script execution for AI analysis
  - AudioCraft SFX generation
  - Video rendering with overlays
- `preload.ts`: Secure API exposure to renderer
- `projectManager.ts`: Project file operations (save/load, recent projects, asset management)

### Python AI Components (`python/`)
- `video_analyzer.py`: Video analysis using Whisper (transcription) and BLIP (vision understanding)
- `audiocraft_generator.py`: SFX generation using Meta AudioCraft AudioGen
- `requirements.txt`: Python dependencies including PyTorch, OpenCV, Whisper

## Development Workflow

### Prerequisites
- Node.js 18+, Python 3.8+, FFmpeg in PATH
- Virtual environment must be activated for AI features
- ~2GB disk space for AI models (downloaded on first use)

### Adding New Features
1. **Frontend**: Create React components in `src/components/`
2. **State**: Update interfaces in `ProjectContext.tsx`
3. **Backend**: Add IPC handlers in `electron/main.ts`
4. **AI Integration**: Extend Python scripts in `python/`

### Video Processing Pipeline
1. Video upload → FFmpeg metadata extraction
2. Audio extraction → Whisper transcription
3. Frame analysis → BLIP vision model
4. SFX generation → AudioCraft MusicGen
5. Final render → FFmpeg with overlays and audio mixing

## Model Configuration

### AI Models (configurable in Python scripts)
- **Whisper**: `base` model (line ~56 in video_analyzer.py)
  - Options: `tiny`, `small`, `base`, `medium`, `large`
- **AudioGen**: `facebook/audiogen-medium` (line ~42 in audiocraft_generator.py)
  - Uses Meta AudioCraft's AudioGen model for sound effect generation
- **BLIP**: `blip-image-captioning-base` for scene understanding

### Performance Notes
- GPU acceleration supported (CUDA) for faster AI processing
- First run downloads models (~500MB total)
- AudioCraft generation can be slow on CPU (1-2 minutes per SFX)

## Testing and Debugging

### Common Issues
- Python scripts failing: Ensure virtual environment is activated
- FFmpeg errors: Verify FFmpeg is in system PATH
- Memory issues: Use smaller AI models or process shorter videos
- IPC communication: Check preload.ts API definitions match usage

### Development Tools
- Electron DevTools enabled in development mode
- Python stderr output logged to main process console
- Type checking available with `npm run type-check`

## Integration Points

### FFmpeg Integration
Video processing commands built dynamically in `buildRenderCommand()` function with support for:
- Audio mixing (original + SFX tracks)
- Subtitle burning (planned)
- Text overlay rendering (planned)

### Python-Electron Bridge
All Python scripts are executed as child processes with JSON input/output:
- Video analysis: `python/video_analyzer.py --video [path] --audio [path]`
- SFX generation: `python/audiocraft_generator.py --prompt [text] --duration [seconds] --output [path]`

Paths to Python executable and virtual environment are automatically resolved based on project structure.