# Getting Started Guide

Welcome to AI Content Creator Assistant! This guide will help you get up and running quickly.

## Quick Start (5 Minutes)

### 1. Prerequisites Check

```bash
# Check Node.js (need 18.x or 20.x)
node --version

# Check Python (need 3.10+)
python3 --version

# Check FFmpeg
ffmpeg -version
```

If any are missing, see [Installation](#installation) section below.

### 2. Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/ai-content-creator-assistant.git
cd ai-content-creator-assistant

# Install Node dependencies
npm install

# Set up Python environment
cd python
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env if needed (optional for local development)
```

### 4. Run Development Server

```bash
npm run dev
```

The application will launch automatically with hot reload enabled.

## Installation

### Node.js

**macOS/Linux:**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/) and install LTS version.

### Python

**macOS:**
```bash
brew install python@3.10
```

**Windows:**
Download from [python.org](https://www.python.org/downloads/)

**Linux:**
```bash
sudo apt update
sudo apt install python3.10 python3.10-venv
```

### FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
1. Download from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to PATH

**Linux:**
```bash
sudo apt update
sudo apt install ffmpeg
```

## First Run

### 1. Create Your First Project

1. Launch the application
2. Click "New Project"
3. Enter a project name
4. Click "Create"

### 2. Import a Video

1. In the editor, click "Import Video" or use File → Import Video
2. Select a video file (MP4, MOV, AVI supported)
3. Wait for upload and metadata extraction

### 3. Generate Captions

1. Click the "Captions" tab in the sidebar
2. Click "Generate Captions"
3. Select language (English by default)
4. Wait for AI transcription (this may take a few minutes)

### 4. Add Sound Effects

1. Click the "SFX" tab in the sidebar
2. Enter a description (e.g., "explosion sound")
3. Set duration (in seconds)
4. Click "Generate SFX"
5. The sound effect will be added to your project

### 5. Export Your Video

1. Go to File → Export or press Ctrl/Cmd+E
2. Choose export format and quality
3. Select output location
4. Click "Export"
5. Wait for rendering to complete

## Development Workflow

### File Structure Overview

```
src/
├── main/              # Backend (Node.js)
│   ├── main.ts        # Application entry
│   ├── services/      # Business logic
│   └── ipc/           # IPC handlers
├── preload/           # Secure bridge
│   └── preload.ts     # API exposure
├── renderer/          # Frontend (React)
│   ├── App.tsx        # Root component
│   ├── pages/         # Route pages
│   └── components/    # UI components
└── common/            # Shared code
    ├── types.ts       # Type definitions
    └── constants.ts   # Constants
```

### Making Changes

**Backend Changes:**

1. Edit files in `src/main/` or `src/preload/`
2. Stop the dev server (Ctrl+C)
3. Restart: `npm run dev`
4. Changes will be reflected

**Frontend Changes:**

1. Edit files in `src/renderer/`
2. Save the file
3. Hot reload happens automatically
4. Check the app window

### Adding a New Feature

**Example: Add a new caption style**

1. **Add type definition** (`src/common/types.ts`):

```typescript
export interface CaptionStyle {
  // ... existing properties
  glow?: boolean; // New property
}
```

2. **Update backend** (`src/main/services/caption-service.ts`):

```typescript
// Handle the new property in your service logic
```

3. **Update frontend** (`src/renderer/components/CaptionEditor.tsx`):

```tsx
// Add UI control for the new property
<input
  type="checkbox"
  checked={style.glow}
  onChange={(e) => updateStyle({ glow: e.target.checked })}
/>
```

4. **Test your changes**

## Common Tasks

### Run Tests

```bash
npm test
```

### Lint Code

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

### Format Code

```bash
npm run format
```

### Type Check

```bash
npm run type-check
```

### Build for Production

```bash
npm run build
npm run package
```

### Clean Build Artifacts

```bash
npm run clean
```

## Debugging

### Electron Main Process

1. Add `debugger` statement in main process code
2. Run with debugging:

```bash
# macOS/Linux
NODE_ENV=development electron --inspect-brk .

# Windows
set NODE_ENV=development && electron --inspect-brk .
```

3. Open Chrome DevTools (chrome://inspect)
4. Click "inspect" on your process

### Renderer Process

1. Open application
2. Press Ctrl+Shift+I (Cmd+Option+I on macOS)
3. Use Chrome DevTools normally

### Python AI Server

Check logs:

```bash
tail -f python/ai_server.log
```

Add debug logging:

```python
import logging
logger.info("Debug message here")
```

## Troubleshooting

### "Python server not starting"

**Solution:**

```bash
cd python
source venv/bin/activate
python ai_server.py  # Test directly
```

Check output for errors.

### "FFmpeg not found"

**Solution:**

```bash
# Check if in PATH
which ffmpeg  # macOS/Linux
where ffmpeg  # Windows

# If not found, install FFmpeg (see Installation section)
```

### "Module not found" errors

**Solution:**

```bash
# Clean and reinstall
rm -rf node_modules
npm install
```

### "Database locked"

**Solution:**

```bash
# Close all instances of the app
# Delete lock files
rm path/to/userData/*.db-shm
rm path/to/userData/*.db-wal
```

### Hot reload not working

**Solution:**

```bash
# Restart dev server
# Press Ctrl+C
npm run dev
```

## Next Steps

1. **Read the [README](./README.md)** for complete feature documentation
2. **Check [ARCHITECTURE](./ARCHITECTURE.md)** to understand the system design
3. **Review [FFMPEG_INTEGRATION](./FFMPEG_INTEGRATION.md)** for video processing details
4. **Join discussions** on GitHub Discussions
5. **Report issues** on GitHub Issues

## Learning Resources

### Electron

- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)

### React

- [React Documentation](https://react.dev/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### FFmpeg

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [FFmpeg Filters Guide](https://ffmpeg.org/ffmpeg-filters.html)

### AI/ML

- [Whisper Documentation](https://github.com/openai/whisper)
- [AudioCraft Documentation](https://github.com/facebookresearch/audiocraft)

## Support

- **Documentation**: [GitHub Wiki](https://github.com/yourusername/ai-content-creator-assistant/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/ai-content-creator-assistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ai-content-creator-assistant/discussions)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Happy coding!
