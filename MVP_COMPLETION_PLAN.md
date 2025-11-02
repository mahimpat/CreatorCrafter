# CreatorCrafter - MVP Completion Plan

## 🎯 Goal: Production-Ready MVP in 1-2 Weeks

Current Status: **70% Complete**
Target: **100% Shippable Product**

---

## 🔴 Critical Path (Must Have)

### 1. Video Export/Rendering ⭐ BLOCKING
**Status:** Partially implemented
**Priority:** P0 - CRITICAL
**Time:** 3-4 days

#### Current State:
```typescript
// electron/main.ts - Render handler exists but incomplete
ipcMain.handle('video:render', async (_, options: RenderOptions) => {
  // Basic FFmpeg command builder
  // Missing: subtitle burning, overlay compositing, audio mixing
})
```

#### What's Missing:
- [ ] Burn subtitles into video (FFmpeg drawtext filter)
- [ ] Composite media overlays (images/videos with transforms)
- [ ] Mix multiple audio tracks (original + SFX)
- [ ] Handle different output formats
- [ ] Progress tracking during export
- [ ] Cancel export functionality
- [ ] Error recovery

#### Implementation Tasks:

**Task 1.1: Complete FFmpeg Command Builder** (4 hours)
```typescript
// electron/main.ts
function buildRenderCommand(options: RenderOptions): string[] {
  const filters = [];

  // Add subtitle burning
  if (options.subtitles) {
    const subtitleFilter = buildSubtitleFilter(options.subtitles);
    filters.push(subtitleFilter);
  }

  // Add overlay compositing
  if (options.overlays) {
    const overlayFilter = buildOverlayFilter(options.overlays);
    filters.push(overlayFilter);
  }

  // Complex filter chain
  const filterComplex = filters.join(',');

  return [
    '-i', options.videoPath,
    ...audioInputs,
    '-filter_complex', filterComplex,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    ...audioMixing,
    options.outputPath
  ];
}
```

**Task 1.2: Add Progress Tracking** (2 hours)
- Parse FFmpeg output for progress (time=XXX, fps=XXX)
- Send progress updates to renderer via IPC
- Show progress bar in UI
- Estimated time remaining

**Task 1.3: Export UI Component** (3 hours)
- Export dialog with format selection
- Quality presets (720p, 1080p, 4K)
- File size estimation
- Progress modal during export
- Cancel button

**Task 1.4: Audio Mixing** (3 hours)
- Mix original audio with SFX tracks
- Apply volume levels per track
- Handle audio sync issues
- Fade in/out support

**Task 1.5: Testing & Edge Cases** (2 hours)
- Test with various video formats
- Test with many overlays/subtitles
- Test export cancellation
- Handle disk space errors

**Files to Modify:**
- `electron/main.ts` - Render handler
- `src/components/ExportDialog.tsx` (NEW)
- `src/components/VideoEditor.tsx` - Add export button
- `src/context/ProjectContext.tsx` - Export state

---

### 2. Error Handling & User Feedback ⭐
**Priority:** P0 - CRITICAL
**Time:** 2 days

#### What's Needed:
- [ ] Toast notification system
- [ ] Loading states for all operations
- [ ] Error boundaries in React
- [ ] User-friendly error messages
- [ ] Retry mechanisms

#### Implementation Tasks:

**Task 2.1: Toast Notification System** (2 hours)
```bash
npm install react-hot-toast
```

```typescript
// src/components/ToastProvider.tsx
import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return <Toaster position="top-right" />;
}

// Usage in components:
import toast from 'react-hot-toast';

toast.success('Video analyzed successfully!');
toast.error('Failed to generate SFX');
toast.loading('Processing video...');
```

**Task 2.2: Loading States** (3 hours)
- Add loading spinners for AI operations
- Disable buttons during processing
- Show progress for long operations
- Skeleton loaders for timeline

**Task 2.3: Error Boundaries** (2 hours)
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  // Catch errors in child components
  // Show friendly error message
  // Offer to reload or report bug
}
```

**Task 2.4: Better Error Messages** (2 hours)
```typescript
// src/utils/errorMessages.ts
export function getUserFriendlyError(error: Error): string {
  if (error.message.includes('ENOENT')) {
    return 'File not found. Please check if the file still exists.';
  }
  if (error.message.includes('Python')) {
    return 'Python error. Please run windows-hotfix.bat to fix.';
  }
  // ... more mappings
}
```

**Task 2.5: Retry Logic** (2 hours)
- Auto-retry failed AI operations (max 3 times)
- Exponential backoff
- User notification of retries

**Files to Create:**
- `src/components/ToastProvider.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/utils/errorMessages.ts`
- `src/hooks/useAsyncOperation.ts`

---

### 3. Performance Optimization ⭐
**Priority:** P0 - CRITICAL
**Time:** 2-3 days

#### Current Issues:
- Timeline lags with many clips
- Canvas re-renders too often
- Large project files slow to load
- Memory leaks in long sessions

#### Implementation Tasks:

**Task 3.1: Timeline Virtualization** (4 hours)
```typescript
// Only render visible clips in timeline
import { FixedSizeList } from 'react-window';

function Timeline() {
  const visibleClips = getVisibleClips(scrollPosition, zoomLevel);
  return (
    <FixedSizeList
      height={600}
      itemCount={visibleClips.length}
      itemSize={50}
    >
      {({ index, style }) => (
        <ClipRenderer clip={visibleClips[index]} style={style} />
      )}
    </FixedSizeList>
  );
}
```

**Task 3.2: Canvas Optimization** (3 hours)
- Only redraw changed regions (dirty rectangles)
- Use requestAnimationFrame for animations
- Offscreen canvas for heavy operations
- Debounce resize events

**Task 3.3: React Optimization** (3 hours)
```typescript
// Use React.memo for expensive components
const TimelineClip = React.memo(({ clip }) => {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.clip.id === nextProps.clip.id;
});

// Use useMemo for expensive calculations
const sortedClips = useMemo(() => {
  return clips.sort((a, b) => a.start - b.start);
}, [clips]);

// Use useCallback for event handlers
const handleClipSelect = useCallback((clipId: string) => {
  setSelectedClip(clipId);
}, []);
```

**Task 3.4: Lazy Loading** (2 hours)
- Lazy load video thumbnails
- Generate waveforms in background
- Load overlays on demand
- Paginate analysis results

**Task 3.5: Memory Management** (2 hours)
- Clear canvas when not visible
- Dispose of unused resources
- Limit undo/redo history (max 50 actions)
- Clean up event listeners

**Files to Modify:**
- `src/components/Timeline.tsx`
- `src/components/MediaOverlayCanvas.tsx`
- `src/components/VideoPlayer.tsx`
- `src/context/ProjectContext.tsx`

---

### 4. Subtitle Export ⭐
**Priority:** P1 - HIGH
**Time:** 1 day (Quick Win!)

#### Implementation Tasks:

**Task 4.1: SRT Export** (2 hours)
```typescript
// src/utils/subtitleExporter.ts
export function exportToSRT(subtitles: Subtitle[]): string {
  return subtitles.map((sub, index) => {
    const startTime = formatSRTTime(sub.start);
    const endTime = formatSRTTime(sub.end);
    return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
  }).join('\n');
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
}
```

**Task 4.2: VTT Export** (1 hour)
```typescript
export function exportToVTT(subtitles: Subtitle[]): string {
  const header = 'WEBVTT\n\n';
  const cues = subtitles.map((sub, index) => {
    const startTime = formatVTTTime(sub.start);
    const endTime = formatVTTTime(sub.end);
    return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
  }).join('\n');
  return header + cues;
}
```

**Task 4.3: Export UI** (2 hours)
```typescript
// Add export button to SubtitleEditor
<Button onClick={handleExportSubtitles}>
  Export Subtitles
</Button>

// Show format selection dialog
const handleExportSubtitles = async () => {
  const format = await showFormatDialog(); // SRT or VTT
  const content = format === 'srt'
    ? exportToSRT(subtitles)
    : exportToVTT(subtitles);

  const filePath = await window.electronAPI.saveFileDialog('subtitles.srt');
  await window.electronAPI.writeFile(filePath, content);
  toast.success('Subtitles exported!');
};
```

**Task 4.4: Import Subtitles** (2 hours)
- Parse SRT files
- Parse VTT files
- Import into timeline
- Validate timestamps

**Files to Create:**
- `src/utils/subtitleExporter.ts`
- `src/utils/subtitleParser.ts`

**Files to Modify:**
- `src/components/SubtitleEditor.tsx`

---

## 🟡 Important (Should Have)

### 5. Auto-Save & Crash Recovery
**Priority:** P1 - HIGH
**Time:** 1 day

#### Implementation Tasks:

**Task 5.1: Auto-Save** (3 hours)
```typescript
// src/hooks/useAutoSave.ts
export function useAutoSave(projectPath: string, projectData: any) {
  useEffect(() => {
    const interval = setInterval(() => {
      if (projectPath && hasUnsavedChanges) {
        saveProject(projectPath, projectData);
        toast.success('Auto-saved', { duration: 1000 });
      }
    }, 60000); // Every 1 minute

    return () => clearInterval(interval);
  }, [projectPath, projectData]);
}
```

**Task 5.2: Crash Recovery** (2 hours)
```typescript
// Save backup to temp location
const backupPath = path.join(app.getPath('temp'), 'creatorcrafter-backup.json');

// On startup, check for backup
if (fs.existsSync(backupPath)) {
  const shouldRecover = await dialog.showMessageBox({
    message: 'Found unsaved changes. Recover?',
    buttons: ['Recover', 'Discard']
  });

  if (shouldRecover.response === 0) {
    // Load backup
  }
}
```

**Task 5.3: Unsaved Changes Warning** (1 hour)
```typescript
// Warn before closing
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure?';
  }
});
```

---

### 6. Quick Wins (Polish)
**Priority:** P2 - MEDIUM
**Time:** 1-2 days total

#### Easy Improvements:

**Task 6.1: Recent Projects** (1 hour)
- Show last 5 projects on welcome screen
- Quick open recent project
- Remove from recent list

**Task 6.2: Keyboard Shortcuts Help** (1 hour)
- Show shortcuts overlay (press `?`)
- List all available shortcuts
- Searchable

**Task 6.3: Dark Mode** (2 hours)
- Toggle in settings
- Save preference
- CSS variables for colors

**Task 6.4: Project Settings** (2 hours)
- Project name/description
- Default export settings
- Custom project thumbnail

**Task 6.5: Timeline Zoom** (2 hours)
```typescript
// Zoom in/out timeline
const handleZoom = (delta: number) => {
  setZoomLevel(prev => Math.max(0.1, Math.min(5, prev + delta * 0.1)));
};

// Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === '+') handleZoom(1);
    if (e.ctrlKey && e.key === '-') handleZoom(-1);
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

**Task 6.6: Waveform Visualization** (3 hours)
- Show audio waveform on timeline
- Generate waveform data with FFmpeg
- Canvas rendering

**Task 6.7: Export Presets** (2 hours)
```typescript
const EXPORT_PRESETS = {
  'YouTube 1080p': { width: 1920, height: 1080, bitrate: '8M' },
  'Instagram Story': { width: 1080, height: 1920, bitrate: '5M' },
  'TikTok': { width: 1080, height: 1920, bitrate: '5M' },
  'Twitter': { width: 1280, height: 720, bitrate: '4M' },
};
```

---

## 📋 Implementation Order (Sprints)

### **Sprint 1: Critical Exports (Week 1)**
Days 1-2: Video Export Core
Days 3-4: Export Progress & UI
Day 5: Subtitle Export

### **Sprint 2: Polish & Stability (Week 2)**
Days 1-2: Error Handling & Toasts
Days 3-4: Performance Optimization
Day 5: Auto-Save & Quick Wins

---

## 🧪 Testing Checklist

Before shipping, test:

### Video Export:
- [ ] Export with subtitles only
- [ ] Export with SFX only
- [ ] Export with overlays only
- [ ] Export with all features combined
- [ ] Export different formats (MP4, MOV, WebM)
- [ ] Export different resolutions (720p, 1080p, 4K)
- [ ] Cancel export mid-way
- [ ] Export with no free disk space (error handling)
- [ ] Export very long video (>30 min)

### Performance:
- [ ] Load project with 100+ clips
- [ ] Timeline with 50+ overlays
- [ ] Scrub through long video
- [ ] Multiple undo/redo operations
- [ ] Memory usage over 1 hour session

### Error Handling:
- [ ] Missing video file
- [ ] Corrupted project file
- [ ] Python not available
- [ ] FFmpeg not found
- [ ] Network error during SFX generation
- [ ] Disk full during export

### User Experience:
- [ ] First-time user flow
- [ ] Keyboard shortcuts work
- [ ] Auto-save recovery
- [ ] Subtitle export/import
- [ ] Responsive UI (no freezing)

---

## 📦 Release Checklist

Before v1.0 launch:

- [ ] All critical features complete
- [ ] All tests passing
- [ ] User documentation written
- [ ] Tutorial video created
- [ ] Installer tested on clean Windows machine
- [ ] Known bugs documented
- [ ] Performance acceptable (no major lag)
- [ ] Error messages helpful
- [ ] Code signing certificate (optional but recommended)
- [ ] Website/landing page ready
- [ ] Social media accounts set up

---

## 🚀 Ready to Start?

**Let's begin with Task 1.1: Complete FFmpeg Command Builder**

I'll help you implement the video export system. It's the most critical feature and everything else depends on it.

**Should I start by:**
1. Examining the current render implementation?
2. Building the FFmpeg command builder?
3. Creating the export UI component?

**Or would you prefer to start with something else from the list?**

Let me know and we'll knock these out one by one! 💪
