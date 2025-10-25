# AI Content Creator Assistant

A production-grade Electron desktop application that helps video content creators automate secondary content creation tasks using AI-powered tools.

## Features

- **Video Upload & Processing**: Import and process video files with FFmpeg integration
- **AI-Powered Video Analysis**: Automatic scene detection, key moment identification, and emotional beat analysis
- **Intelligent Caption Generation**: Speech-to-text transcription with customizable styling
- **Text Overlay System**: Add and animate text overlays with rich styling options
- **AI Sound Effect Generation**: Generate custom SFX using Meta's AudioCraft
- **Timeline Editor**: Professional timeline interface for precise content placement
- **Multi-format Export**: Export videos with all effects and separate subtitle files

## Architecture

### Security-First Design

This application implements Electron security best practices:

- **No nodeIntegration**: Renderer processes never have direct Node.js access
- **Context Isolation**: Full isolation between main and renderer processes
- **Sandbox Mode**: All renderer processes run in sandboxed environment
- **Preload Scripts**: Controlled API exposure through preload bridge
- **Input Validation**: All IPC messages validated on both sides
- **CSP Headers**: Content Security Policy prevents XSS attacks

### Process Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Main Process                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Service    │  │   IPC        │  │   Database   │      │
│  │   Manager    │──│   Handlers   │──│   SQLite     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                                                     │
│         ├─── Video Service (FFmpeg)                         │
│         ├─── Caption Service                                │
│         ├─── SFX Service                                    │
│         └─── Python Bridge ────────────────┐               │
└─────────────────────────────────────────────│───────────────┘
                                              │
                        ┌─────────────────────┴───────────────┐
                        │      Python AI Server               │
                        │  ┌────────────┐  ┌────────────┐    │
                        │  │  Whisper   │  │ AudioCraft │    │
                        │  │    STT     │  │    SFX     │    │
                        │  └────────────┘  └────────────┘    │
                        │  ┌────────────┐                     │
                        │  │   Video    │                     │
                        │  │  Analysis  │                     │
                        │  └────────────┘                     │
                        └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process                         │
│                      (Sandboxed)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    React     │  │   Zustand    │  │   Video      │      │
│  │     UI       │──│    Store     │──│   Player     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                                                     │
│         └─── Preload API (contextBridge) ───────────────────┤
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Electron 28+**: Desktop application framework
- **React 18**: UI component library
- **TypeScript**: Type-safe development
- **Vite**: Fast development server and build tool
- **Zustand**: Lightweight state management
- **React Router**: Client-side routing

### Backend (Main Process)
- **Node.js**: JavaScript runtime
- **Better-SQLite3**: High-performance local database
- **Electron-store**: Settings persistence
- **Electron-log**: Logging system
- **FFmpeg**: Video/audio processing (external)

### AI/ML Services (Python)
- **AudioCraft**: AI sound effect generation
- **Whisper**: Speech-to-text transcription
- **OpenCV**: Video analysis and scene detection
- **PyTorch**: Deep learning framework

## Prerequisites

- **Node.js**: v18.x or v20.x
- **Python**: 3.10+
- **FFmpeg**: Latest version (must be in PATH)
- **Git**: For version control

### System Requirements

- **OS**: Windows 10+, macOS 11+, or Linux (Ubuntu 20.04+)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 2GB for application + space for video cache
- **GPU**: CUDA-capable GPU recommended for AI operations (optional)

## Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/ai-content-creator-assistant.git
cd ai-content-creator-assistant
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Set Up Python Environment

```bash
# Create virtual environment
cd python
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

cd ..
```

### 4. Install FFmpeg

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

**Windows (Chocolatey):**
```bash
choco install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Verify Installation:**
```bash
ffmpeg -version
```

### 5. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Development

### Start Development Server

Run both the Vite dev server and Electron:

```bash
npm run dev
```

This will:
1. Start Vite development server on `http://localhost:5173`
2. Launch Electron application with hot reload
3. Enable React DevTools
4. Open Chrome DevTools automatically

### Project Structure

```
ai-content-creator-assistant/
├── src/
│   ├── main/              # Main process (Node.js)
│   │   ├── main.ts        # Entry point
│   │   ├── menu.ts        # Application menu
│   │   ├── ipc/           # IPC handlers
│   │   └── services/      # Backend services
│   ├── preload/           # Preload scripts (Bridge)
│   │   └── preload.ts     # Main preload script
│   ├── renderer/          # Renderer process (React)
│   │   ├── main.tsx       # React entry point
│   │   ├── App.tsx        # Root component
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── stores/        # State management
│   │   └── styles/        # CSS styles
│   ├── common/            # Shared types and constants
│   │   ├── types.ts       # TypeScript interfaces
│   │   └── constants.ts   # App constants
│   └── workers/           # Background workers (optional)
├── python/                # Python AI services
│   ├── ai_server.py       # Main AI server
│   ├── requirements.txt   # Python dependencies
│   ├── audiocraft/        # AudioCraft integration
│   └── ml_models/         # ML model implementations
├── resources/             # Application resources
│   ├── icons/             # App icons
│   └── assets/            # Static assets
├── scripts/               # Build and utility scripts
├── .github/               # GitHub Actions CI/CD
├── package.json           # Node.js dependencies
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── README.md              # This file
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:vite         # Start Vite only
npm run dev:electron     # Start Electron only

# Building
npm run build            # Build all (renderer + main + preload)
npm run build:renderer   # Build React frontend
npm run build:main       # Build main process
npm run build:preload    # Build preload scripts

# Packaging
npm run package          # Package for current platform
npm run package:all      # Package for all platforms
npm run package:win      # Package for Windows
npm run package:mac      # Package for macOS
npm run package:linux    # Package for Linux

# Publishing
npm run publish          # Build and publish to GitHub releases

# Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
npm test                 # Run tests
npm run test:e2e         # Run end-to-end tests

# Maintenance
npm run clean            # Clean build artifacts
npm run rebuild          # Rebuild native modules
```

## Building for Production

### Package Application

```bash
# Build and package for current platform
npm run build
npm run package

# Package for all platforms (requires appropriate OS or CI)
npm run package:all
```

Output will be in the `out/` directory.

### Code Signing (Production)

For production releases, configure code signing:

**macOS:**
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
export APPLE_ID=your@email.com
export APPLE_ID_PASSWORD=app_specific_password
```

**Windows:**
```bash
set CSC_LINK=C:\path\to\certificate.pfx
set CSC_KEY_PASSWORD=your_password
```

### Distribution

The build configuration supports:

- **Windows**: NSIS installer, portable executable
- **macOS**: DMG, ZIP (with notarization support)
- **Linux**: AppImage, deb, rpm, Snap

## Key Features Implementation Guide

### 1. Video Upload Integration

```typescript
// In renderer
const handleVideoUpload = async () => {
  const filePath = await window.electronAPI.file.select({
    filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi'] }]
  });

  if (filePath) {
    const { videoId, metadata } = await window.electronAPI.video.upload(filePath);
    console.log('Video uploaded:', videoId, metadata);
  }
};
```

### 2. Caption Generation

```typescript
// Generate captions from video
const generateCaptions = async (videoPath: string) => {
  const captions = await window.electronAPI.caption.generate(videoPath, 'en');
  // captions are automatically added to project
};
```

### 3. AI Sound Effect Generation

```typescript
// Generate custom SFX
const generateSFX = async () => {
  const sfx = await window.electronAPI.sfx.generate(
    'explosion sound with echo',
    3.0 // duration in seconds
  );
  console.log('Generated SFX:', sfx.audioPath);
};
```

### 4. Video Analysis

```typescript
// Analyze video for AI suggestions
const analyzeVideo = async (videoPath: string) => {
  const analysis = await window.electronAPI.video.analyze(videoPath);
  // analysis.sceneChanges, analysis.suggestedSFX, etc.
};
```

## Python AI Services Integration

The Python AI server runs as a child process and communicates via JSON over stdio.

### Adding New AI Services

1. **Add service handler in `python/ai_server.py`:**

```python
def handle_your_service(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
    if method == 'your_method':
        # Implement your AI logic
        return {'result': 'your_data'}
```

2. **Add TypeScript method in `python-bridge-service.ts`:**

```typescript
async yourMethod(params: any): Promise<any> {
  return await this.sendRequest('your_service', 'your_method', params);
}
```

3. **Expose via IPC in `ipc-handlers.ts` and `preload.ts`**

## Security Considerations

### Content Security Policy

The application uses a strict CSP defined in `index.html`:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; ..." />
```

### IPC Communication

All IPC communication:
1. Goes through preload scripts (never direct `ipcRenderer` in renderer)
2. Validates all inputs in both preload and main process
3. Uses invoke/handle pattern for request-response
4. Implements timeouts to prevent hanging

### File System Access

Renderer process never has direct file system access. All file operations go through:
1. Main process IPC handlers
2. Electron dialog APIs
3. Service layer with validation

## Performance Optimization

### Video Processing

- Uses streaming where possible to handle large files
- Implements frame extraction caching
- Background workers for heavy operations
- Progress reporting for long-running tasks

### Database

- SQLite with WAL mode for better concurrency
- Indexed queries for fast lookups
- Transactions for bulk operations
- Automatic cleanup of stale data

### React Rendering

- Memoization for expensive components
- Virtual scrolling for long lists
- Lazy loading for heavy components
- Debounced state updates

## Testing

### Unit Tests

```bash
npm test
```

### End-to-End Tests

```bash
npm run test:e2e
```

Tests use Playwright for cross-platform E2E testing.

## Troubleshooting

### Python Server Not Starting

**Issue**: AI features not working

**Solution**:
```bash
# Check Python is in PATH
python3 --version

# Verify dependencies installed
cd python
pip list

# Check logs
tail -f python/ai_server.log
```

### FFmpeg Not Found

**Issue**: Video processing fails

**Solution**:
```bash
# Verify FFmpeg in PATH
ffmpeg -version

# Add to PATH if needed (macOS/Linux)
export PATH="/usr/local/bin:$PATH"
```

### Database Locked

**Issue**: "Database is locked" error

**Solution**:
- Close all instances of the application
- Delete `.db-shm` and `.db-wal` files
- Restart application

### Build Fails

**Issue**: Native module build errors

**Solution**:
```bash
# Rebuild native modules
npm run rebuild

# Clear cache and reinstall
npm run clean
rm -rf node_modules
npm install
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Update documentation
- Follow existing code style (run `npm run format`)
- Ensure all checks pass (`npm run lint && npm run type-check`)

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Meta's AudioCraft for AI audio generation
- OpenAI's Whisper for speech-to-text
- Electron team for the framework
- All open source contributors

## Support

- Documentation: [GitHub Wiki](https://github.com/yourusername/ai-content-creator-assistant/wiki)
- Issues: [GitHub Issues](https://github.com/yourusername/ai-content-creator-assistant/issues)
- Discussions: [GitHub Discussions](https://github.com/yourusername/ai-content-creator-assistant/discussions)

## Roadmap

- [ ] GPU acceleration for video processing
- [ ] Cloud sync for projects
- [ ] Plugin system for custom AI models
- [ ] Collaborative editing
- [ ] Real-time preview rendering
- [ ] Advanced color grading
- [ ] Motion tracking
- [ ] Green screen support

---

Built with ❤️ using Electron, React, and AI
