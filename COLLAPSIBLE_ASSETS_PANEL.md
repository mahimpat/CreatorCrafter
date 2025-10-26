# Collapsible Assets Panel Feature

## Overview
Moved the Assets panel from the right sidebar to a collapsible left sidebar for better workflow and screen space management.

## Changes Made

### 1. VideoEditor.tsx
**New Features:**
- Added `isAssetsOpen` state to control panel visibility (default: `true`)
- Moved `ProjectManager` component to left sidebar
- Added collapse/expand button in the left sidebar header
- Added floating expand button when panel is collapsed
- Removed "Assets" from right sidebar tool selector tabs

**Component Structure:**
```tsx
<div className="editor-main">
  {/* Left Sidebar - Assets Panel (collapsible) */}
  <div className="editor-left-sidebar">
    <ProjectManager />
  </div>

  {/* Expand button (when collapsed) */}
  <button className="expand-assets-btn" />

  {/* Center - Video & Timeline */}
  <div className="editor-content">
    <VideoPlayer />
    <Timeline />
  </div>

  {/* Right Sidebar - Tools */}
  <div className="editor-sidebar">
    {/* Subtitles, SFX, Overlays tabs */}
  </div>
</div>
```

### 2. VideoEditor.css
**New Styles Added:**

#### Left Sidebar Panel
```css
.editor-left-sidebar {
  flex: 0 0 320px;
  width: 320px;
  transition: all 0.3s ease;
}

.editor-left-sidebar.collapsed {
  flex: 0 0 0;
  width: 0;
}
```

#### Collapse/Expand Controls
- `.left-sidebar-header` - Panel header with title and collapse button
- `.collapse-btn` - Chevron button to toggle panel
- `.expand-assets-btn` - Floating button on left edge when collapsed

**Visual Features:**
- Smooth 0.3s transition animation
- Hover effects with accent color
- Icon changes based on state (ChevronLeft/ChevronRight)

### 3. SidePanel.tsx
**Updated:**
- Removed `'assets'` from tool type union
- Removed `ProjectManager` import and rendering
- Now only handles: 'subtitles' | 'sfx' | 'overlays'

## User Experience

### Opening/Closing the Panel

**When Open (default):**
- Assets panel visible on left (320px wide)
- Shows "Project Assets" header with collapse button (←)
- Full ProjectManager component with tabs and file lists

**When Collapsed:**
- Panel slides smoothly to the left (0px width)
- Floating expand button appears on left edge (→)
- More screen space for video/timeline
- Assets data preserved in state

### Interaction
1. **Collapse**: Click the `←` button in the left sidebar header
2. **Expand**: Click the floating `→` button on the left edge
3. **Smooth Animation**: 300ms ease transition

## Layout Benefits

### Before
```
┌─────────────────────────────────────┐
│  TopBar                              │
├──────────────────────┬───────────────┤
│                      │ Right Sidebar │
│   Video & Timeline   │ ─────────────  │
│                      │ • Subtitles   │
│                      │ • Sound FX    │
│                      │ • Overlays    │
│                      │ • Assets      │
└──────────────────────┴───────────────┘
```

### After
```
┌─────────────────────────────────────────┐
│  TopBar                                  │
├──────┬──────────────────────┬────────────┤
│ Left │                      │ Right      │
│ Side │   Video & Timeline   │ Sidebar    │
│ bar  │                      │ ─────────  │
│ ──── │                      │ • Subtitles│
│Assets│                      │ • Sound FX │
│ (←)  │                      │ • Overlays │
└──────┴──────────────────────┴────────────┘
```

### Collapsed State
```
┌───────────────────────────────────────────┐
│  TopBar                                    │
├──────────────────────────────┬────────────┤
│ →                            │ Right      │
│                              │ Sidebar    │
│    Video & Timeline          │ ─────────  │
│    (More Space!)             │ • Subtitles│
│                              │ • Sound FX │
│                              │ • Overlays │
└──────────────────────────────┴────────────┘
```

## Technical Details

### State Management
```tsx
const [isAssetsOpen, setIsAssetsOpen] = useState(true)
```

### Icons Used (Lucide React)
- `ChevronLeft` - Collapse button (when open)
- `ChevronRight` - Expand buttons (when collapsed)

### CSS Classes
- `.editor-left-sidebar` - Main left sidebar container
- `.editor-left-sidebar.open` - Visible state
- `.editor-left-sidebar.collapsed` - Hidden state
- `.left-sidebar-header` - Header with title and button
- `.collapse-btn` - Collapse/expand button in header
- `.expand-assets-btn` - Floating expand button

### Responsive Behavior
- Fixed width when open: 320px
- Zero width when collapsed: 0px
- Content center flexes to fill available space
- Right sidebar remains fixed at 350px

## Integration Points

### ProjectManager Component
- Unchanged internally
- Now rendered in left sidebar instead of right tab
- Full functionality preserved:
  - Browse SFX files
  - Browse exported videos
  - Delete files
  - Show in folder
  - Refresh button

## Future Enhancements

Potential improvements:
1. **Remember State**: Save collapse preference to localStorage
2. **Keyboard Shortcut**: Add hotkey (e.g., Ctrl+B) to toggle panel
3. **Resize Handle**: Drag to resize panel width
4. **Multiple Panels**: Add collapsible panels for other tools
5. **Animation Options**: Different transition effects
6. **Auto-collapse**: Collapse automatically when screen width is small

## Testing Checklist

- [x] Panel opens by default
- [x] Collapse button hides panel smoothly
- [x] Expand button shows panel smoothly
- [x] Icons change based on state
- [x] ProjectManager functions correctly in new position
- [x] No TypeScript errors introduced
- [x] Right sidebar tabs work correctly without Assets
- [x] Layout adapts properly to panel state
- [x] Hover effects work on buttons

## Notes

- Default state is **open** (`isAssetsOpen: true`)
- Panel remembers state during session (until page refresh)
- Smooth 300ms transitions for professional feel
- Floating expand button provides easy access when collapsed
- No changes to ProjectManager component itself
