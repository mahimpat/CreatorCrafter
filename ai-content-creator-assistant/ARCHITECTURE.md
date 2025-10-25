# Architecture Documentation

## Overview

AI Content Creator Assistant is built using a secure, modular architecture that separates concerns and maintains strict security boundaries between processes.

## Core Principles

### 1. Security First

Every architectural decision prioritizes security:

- **Process Isolation**: Main, preload, and renderer processes are strictly isolated
- **No Direct Access**: Renderer never has direct access to Node.js or Electron APIs
- **Controlled Bridge**: All communication goes through validated preload scripts
- **Input Validation**: Every input is validated at multiple layers
- **Principle of Least Privilege**: Each component has minimal necessary permissions

### 2. Separation of Concerns

```
┌─────────────────────────────────────────────────────────┐
│  Presentation Layer (Renderer)                          │
│  - React components                                     │
│  - UI state management                                  │
│  - User interactions                                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ (IPC via Preload)
┌─────────────────────────────────────────────────────────┐
│  Business Logic Layer (Main Process)                    │
│  - Service orchestration                                │
│  - IPC handling                                         │
│  - State coordination                                   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Data/Service Layer                                     │
│  - Database operations                                  │
│  - File system operations                               │
│  - External process management                          │
│  - AI service integration                               │
└─────────────────────────────────────────────────────────┘
```

## Process Architecture

### Main Process

**Responsibilities:**
- Application lifecycle management
- Window creation and management
- Native menu and dialog handling
- IPC request handling
- Service initialization and coordination
- Database management
- Child process management (Python AI server)

**Key Components:**

1. **main.ts**: Entry point, window creation, security configuration
2. **menu.ts**: Native application menu
3. **ipc-handlers.ts**: IPC request routing and validation
4. **service-manager.ts**: Service lifecycle management

### Preload Process

**Responsibilities:**
- Create secure bridge between main and renderer
- Expose controlled API via contextBridge
- Sanitize data flow in both directions
- Provide type-safe API surface

**Security:**
- Runs with context isolation enabled
- Cannot be modified by renderer process
- Only exposes explicitly defined functions
- All exposed functions validate inputs

### Renderer Process

**Responsibilities:**
- UI rendering and user interaction
- Client-side state management
- Video playback
- Timeline visualization
- Real-time preview of effects

**Constraints:**
- No access to Node.js APIs
- No access to Electron APIs
- Sandboxed environment
- Can only communicate via preload API

## Service Layer Architecture

### Service Manager

Coordinates all backend services with dependency injection:

```typescript
┌───────────────────────────────────────────────────────┐
│              Service Manager                          │
├───────────────────────────────────────────────────────┤
│  - Initializes all services in correct order         │
│  - Manages service dependencies                       │
│  - Handles graceful shutdown                          │
│  - Provides singleton access                          │
└───────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Database   │ │   Settings   │ │    Python    │
│   Service    │ │   Service    │ │    Bridge    │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │    Domain Services            │
        │  - Project Service            │
        │  - Video Service              │
        │  - Caption Service            │
        │  - Overlay Service            │
        │  - SFX Service                │
        │  - Export Service             │
        └───────────────────────────────┘
```

### Database Service

**Technology**: Better-SQLite3 (synchronous, high-performance)

**Schema:**

```sql
projects
  - id: TEXT PRIMARY KEY
  - name: TEXT
  - video_path: TEXT
  - video_metadata: TEXT (JSON)
  - timeline_state: TEXT (JSON)
  - created_at: TEXT
  - updated_at: TEXT

captions
  - id: TEXT PRIMARY KEY
  - project_id: TEXT (FK)
  - start_time: REAL
  - end_time: REAL
  - text: TEXT
  - style: TEXT (JSON)
  - confidence: REAL

text_overlays
  - id: TEXT PRIMARY KEY
  - project_id: TEXT (FK)
  - text: TEXT
  - start_time: REAL
  - end_time: REAL
  - position: TEXT (JSON)
  - style: TEXT (JSON)
  - layer: INTEGER
  - animation: TEXT (JSON)

sound_effects
  - id: TEXT PRIMARY KEY
  - project_id: TEXT (FK)
  - name: TEXT
  - start_time: REAL
  - duration: REAL
  - volume: REAL
  - audio_path: TEXT
  - prompt: TEXT
  - category: TEXT
  - is_generated: INTEGER
  - metadata: TEXT (JSON)
```

**Performance Optimizations:**
- WAL mode for concurrent access
- Indexes on foreign keys
- Transactions for bulk operations
- Prepared statements for repeated queries

### Python Bridge Service

**Communication Protocol:**

```
Electron Main Process          Python AI Server
      │                              │
      │  Start Process              │
      ├─────────────────────────────>│
      │                              │
      │  {"status": "ready"}        │
      │<─────────────────────────────┤
      │                              │
      │  Request (JSON)              │
      │  {"id": "...",               │
      │   "service": "whisper",      │
      │   "method": "transcribe",    │
      │   "params": {...}}           │
      ├─────────────────────────────>│
      │                              │
      │  Process Request             │
      │                              │
      │  Response (JSON)             │
      │  {"id": "...",               │
      │   "success": true,           │
      │   "data": {...}}             │
      │<─────────────────────────────┤
      │                              │
```

**Features:**
- Asynchronous request handling
- Request timeout management
- Automatic process recovery
- Graceful shutdown
- Error propagation
- Progress reporting

## Data Flow

### Project Workflow

```
1. User Creates Project
   Renderer → Preload → Main → ProjectService → Database

2. User Uploads Video
   Renderer → Preload → Main → VideoService
   └─> Copy to cache
   └─> Extract metadata (FFmpeg)
   └─> Update project in Database

3. User Generates Captions
   Renderer → Preload → Main → CaptionService
   └─> Extract audio (FFmpeg)
   └─> Python Bridge → Whisper
   └─> Process transcription
   └─> Save to Database
   └─> Send progress updates to Renderer

4. User Generates SFX
   Renderer → Preload → Main → SFXService
   └─> Python Bridge → AudioCraft
   └─> Generate audio file
   └─> Save to cache
   └─> Add to project

5. User Exports Video
   Renderer → Preload → Main → ExportService
   └─> Load project data
   └─> Render video with FFmpeg
   └─> Apply overlays, captions, SFX
   └─> Export to file
   └─> Send completion notification
```

### State Management

**Renderer State (Zustand):**

```typescript
interface AppState {
  // Project state
  projects: Project[];
  currentProject: Project | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProjects: () => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  openProject: (id: string) => Promise<void>;
  saveProject: () => Promise<void>;
  updateProject: (updates: Partial<Project>) => void;
}
```

**Main Process State:**
- Managed by individual services
- No global state (services are independent)
- Database is source of truth
- In-memory caches where needed

## IPC Communication Patterns

### Request-Response Pattern

```typescript
// Renderer (via preload)
const result = await window.electronAPI.video.upload(filePath);

// Main Process
ipcMain.handle('video:upload', async (event, filePath) => {
  validateString(filePath, 'File path');
  return await videoService.uploadVideo(filePath);
});
```

### Event Broadcasting

```typescript
// Main Process
mainWindow.webContents.send('progress:update', {
  operationId: 'caption-generation',
  progress: 50,
  message: 'Processing audio...'
});

// Renderer
window.electronAPI.on.progressUpdate((progress) => {
  console.log(progress.message, progress.progress);
});
```

## Security Architecture

### Threat Model

**Threats Mitigated:**

1. **XSS Attacks**: Content Security Policy, no eval, no inline scripts
2. **Node.js API Access**: Context isolation, no nodeIntegration
3. **IPC Injection**: Input validation on all IPC calls
4. **Path Traversal**: Path sanitization in file operations
5. **Command Injection**: No shell commands with user input
6. **Prototype Pollution**: Input validation, no Object.assign with user data

### Security Layers

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Content Security Policy                  │
│  - Restricts resource loading                       │
│  - Prevents inline scripts                          │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Layer 2: Sandbox & Context Isolation              │
│  - Renderer has no Node.js access                   │
│  - Preload is isolated from renderer                │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Layer 3: Preload API Validation                   │
│  - Type checking                                     │
│  - Input sanitization                                │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Layer 4: Main Process Validation                  │
│  - Business logic validation                         │
│  - Authorization checks                              │
│  - Resource limits                                   │
└─────────────────────────────────────────────────────┘
```

## Performance Considerations

### Video Processing

**Challenges:**
- Large file sizes (GBs)
- CPU-intensive operations
- Long processing times

**Solutions:**
- Streaming APIs where possible
- Background processing
- Progress reporting
- Cancellation support
- Resource limits and cleanup

### Database Operations

**Optimizations:**
- Synchronous API (no async overhead)
- WAL mode for concurrency
- Prepared statements
- Batch operations with transactions
- Indexes on frequently queried columns

### React Rendering

**Optimizations:**
- React.memo for expensive components
- useMemo/useCallback for derived state
- Virtual scrolling for timeline
- Debounced updates for timeline scrubbing
- Lazy loading for heavy components

## Testing Strategy

### Unit Tests

- Service layer logic
- IPC handlers
- Data transformations
- Utility functions

### Integration Tests

- Service interactions
- Database operations
- IPC communication
- Python bridge

### End-to-End Tests

- User workflows
- Cross-process communication
- UI interactions
- File operations

## Deployment Architecture

### Development

```
[Vite Dev Server:5173] ← [Electron Main Process] → [Python Server]
         │                         │
         └─────────────────────────┘
              Live Reload
```

### Production

```
[Bundled Renderer] ← [Electron Main Process] → [Bundled Python]
      (Asar)              (Asar)                  (Asar unpack)
```

## Extension Points

### Adding New Services

1. Create service class in `src/main/services/`
2. Add initialization in `service-manager.ts`
3. Add IPC handlers in `ipc-handlers.ts`
4. Expose API in `preload.ts`
5. Use in renderer via `window.electronAPI`

### Adding AI Models

1. Add Python implementation in `python/`
2. Add handler in `ai_server.py`
3. Add method in `python-bridge-service.ts`
4. Expose via IPC

### Custom Video Effects

1. Extend `VideoService` with new methods
2. Use FFmpeg filters
3. Update export pipeline
4. Add UI controls in renderer

## Future Improvements

- Worker threads for CPU-intensive operations
- WebGL for real-time video effects
- WebAssembly for performance-critical code
- Distributed processing for large projects
- Plugin architecture for third-party extensions
