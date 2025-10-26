# Timeline Layout Fix - Fixed Track Labels

## Problem
The track labels (Video, Audio, Subtitles, Text) were positioned inside the scrollable timeline content area, causing them to scroll horizontally with the timeline. This made it difficult to identify which track was which when scrolling through longer videos.

## Solution
Restructured the timeline into a **two-column layout**:
1. **Fixed Left Column**: Track labels that stay visible
2. **Scrollable Right Column**: Timeline content with ruler and clips

## Changes Made

### 1. Timeline.tsx Structure

#### Before (Single Column)
```tsx
<div className="timeline-main">
  <div className="time-ruler" />
  <div className="timeline-content">
    <div className="track">
      <div className="track-header">Video</div>
      <div className="track-content">{clips}</div>
    </div>
  </div>
</div>
```

#### After (Two Columns)
```tsx
<div className="timeline-main">
  {/* Fixed Left Column */}
  <div className="timeline-labels">
    <div className="track-label">
      <Film /> Video <Eye /> <Lock />
    </div>
    <div className="track-label">
      <Volume2 /> Audio <Eye /> <Lock />
    </div>
    {/* ... more labels ... */}
  </div>

  {/* Scrollable Right Column */}
  <div className="timeline-scroll-area">
    <div className="time-ruler" />
    <div className="timeline-content">
      <div className="track">
        <div className="track-content">{clips}</div>
      </div>
      {/* ... more tracks ... */}
    </div>
  </div>
</div>
```

### 2. Header Alignment

Added `timeline-header-spacer` div to align header with the left column:

```tsx
<div className="timeline-header">
  <div className="timeline-header-spacer" /> {/* 200px spacer */}
  <div className="timeline-controls">
    {/* Time display and zoom controls */}
  </div>
</div>
```

### 3. CSS Changes

#### Timeline Main Container
```css
.timeline-main {
  display: flex;  /* Enable two-column layout */
  overflow: hidden;
}
```

#### Fixed Left Column
```css
.timeline-labels {
  width: 200px;
  min-width: 200px;
  flex-shrink: 0;  /* Never shrink */
  background: #252525;
  border-right: 1px solid #3a3a3a;
}

.track-label {
  height: 80px;  /* Match track height */
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
}
```

#### Scrollable Right Column
```css
.timeline-scroll-area {
  flex: 1;  /* Take remaining space */
  overflow-x: auto;  /* Horizontal scroll */
  overflow-y: hidden;
}
```

#### Track Structure Simplification
```css
/* REMOVED: .track-header styles (now in .track-label) */

.track {
  /* No longer uses flexbox */
  border-bottom: 1px solid #2a2a2a;
}

.track-content {
  height: 80px;  /* Match label height */
}
```

### 4. Track Color Coding

Each track label has a subtle gradient matching its type:

```css
.track-label:nth-child(1) { /* Video - Orange */
  background: linear-gradient(to right, #2a2a2a, rgba(255, 152, 0, 0.1));
}

.track-label:nth-child(2) { /* Audio - Green */
  background: linear-gradient(to right, #2a2a2a, rgba(76, 175, 80, 0.1));
}

.track-label:nth-child(3) { /* Subtitles - Blue */
  background: linear-gradient(to right, #2a2a2a, rgba(33, 150, 243, 0.1));
}

.track-label:nth-child(4) { /* Text - Purple */
  background: linear-gradient(to right, #2a2a2a, rgba(156, 39, 176, 0.1));
}
```

## Visual Comparison

### Before
```
┌────────────────────────────────────────┐
│ Timeline Header                         │
├────────────────────────────────────────┤
│ [Scrollable Area]                      │
│ ┌──────────────┬───────────────────┐  │
│ │ Video Label  │ Clips (scrolling) │ → │
│ └──────────────┴───────────────────┘  │
│   ^ Labels scroll with content        │
└────────────────────────────────────────┘
```

### After
```
┌────────────────────────────────────────┐
│ [Spacer] │ Timeline Header             │
├──────────┼────────────────────────────┤
│ Fixed    │ [Scrollable Area]          │
│ Labels   │                            │
│ ─────    │ ┌───────────────────────┐ │
│ Video    │ │ Clips (scrolling)     │→│
│ Audio    │ └───────────────────────┘ │
│ Subtitle │                            │
│ Text     │                            │
└──────────┴────────────────────────────┘
   ^ Labels stay visible
```

## Benefits

1. **Better Navigation**: Always know which track you're viewing
2. **Professional Layout**: Matches industry-standard DAWs (DAW = Digital Audio Workstation) like Premiere Pro, DaVinci Resolve
3. **Improved UX**: No confusion when scrolling through long timelines
4. **Visual Clarity**: Track labels and controls always accessible
5. **Consistent Height**: Labels and tracks perfectly aligned (80px each)

## Technical Details

### Layout Structure
- Left column: Fixed at 200px wide (160px on mobile)
- Right column: Takes remaining space with horizontal scroll
- Track heights: 80px (synchronized between labels and content)
- Header spacer: Matches left column width

### Scrolling Behavior
- Only the timeline content scrolls horizontally
- Track labels remain fixed in position
- Scrollbar appears only on the right column

### Responsive Design
```css
@media (max-width: 768px) {
  .timeline-labels,
  .timeline-header-spacer {
    width: 160px;  /* Narrower on mobile */
  }
}
```

## Components Modified

1. **Timeline.tsx** - Restructured JSX layout
2. **Timeline.css** - Updated all related styles

## Testing Checklist

- [x] Track labels stay fixed when scrolling horizontally
- [x] Header spacer aligns with left column
- [x] Track heights match between labels and content (80px)
- [x] Drag & drop functionality still works
- [x] Playhead renders correctly across both columns
- [x] Zoom controls work properly
- [x] Time ruler scrolls with content
- [x] Track controls (Eye/Lock buttons) accessible in labels
- [x] Color-coded gradients visible on each label
- [x] Responsive design works on smaller screens

## Backward Compatibility

All timeline functionality remains unchanged:
- Drag & drop clips
- Playhead positioning
- Zoom controls
- Time markers
- Track items (SFX, subtitles, overlays)
- AI suggestions

## Future Enhancements

Potential improvements:
1. **Resizable Labels**: Drag to resize left column width
2. **Collapsible Tracks**: Minimize/maximize individual tracks
3. **Track Reordering**: Drag tracks to reorder
4. **Custom Track Heights**: Different heights per track
5. **Track Groups**: Folder tracks that contain multiple tracks
