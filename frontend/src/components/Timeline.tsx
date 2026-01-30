import { useRef, useState, useCallback, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import {
  Film, Volume2, MessageSquare, Type, Eye, EyeOff, Lock, Unlock, Music,
  Trash2, ZoomIn, ZoomOut
} from 'lucide-react'
import './Timeline.css'

interface DragState {
  id: number
  type: 'subtitle' | 'sfx' | 'overlay'
  mode: 'move' | 'resize-start' | 'resize-end'
  startX: number
  originalStart: number
  originalEnd: number
}

interface Selection {
  id: number
  type: 'subtitle' | 'sfx' | 'overlay'
}

interface TrackVisibility {
  video: boolean
  audio: boolean
  subtitles: boolean
  overlays: boolean
}

interface TrackLock {
  video: boolean
  audio: boolean
  subtitles: boolean
  overlays: boolean
}

export default function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    currentTime,
    duration,
    setCurrentTime,
    subtitles,
    sfxTracks,
    textOverlays,
    analysis,
    updateSubtitle,
    updateSFXTrack,
    updateTextOverlay,
    deleteSubtitle,
    deleteSFXTrack,
    deleteTextOverlay,
  } = useProject()

  const [zoom, setZoom] = useState(1)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [trackVisibility, setTrackVisibility] = useState<TrackVisibility>({
    video: true, audio: true, subtitles: true, overlays: true
  })
  const [trackLock, setTrackLock] = useState<TrackLock>({
    video: false, audio: false, subtitles: false, overlays: false
  })

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const safeDuration = Math.max(1, duration || 1)
  const pixelsPerSecond = 50 * zoom
  const timelineWidth = safeDuration * pixelsPerSecond
  const playheadPosition = (currentTime / safeDuration) * timelineWidth

  // Snapping helper
  const snapToValue = useCallback((value: number, snapPoints: number[]): number => {
    if (!snapEnabled) return value
    const snapThreshold = 5 / pixelsPerSecond // 5 pixels in time
    for (const point of snapPoints) {
      if (Math.abs(value - point) < snapThreshold) {
        return point
      }
    }
    return value
  }, [snapEnabled, pixelsPerSecond])

  // Get snap points (playhead, other items edges)
  const getSnapPoints = useCallback((): number[] => {
    const points: number[] = [0, safeDuration, currentTime]

    subtitles.forEach(s => {
      if (selection?.type !== 'subtitle' || selection.id !== s.id) {
        points.push(s.start_time, s.end_time)
      }
    })
    sfxTracks.forEach(s => {
      if (selection?.type !== 'sfx' || selection.id !== s.id) {
        points.push(s.start_time, s.start_time + s.duration)
      }
    })
    textOverlays.forEach(o => {
      if (selection?.type !== 'overlay' || selection.id !== o.id) {
        points.push(o.start_time, o.end_time)
      }
    })

    return points
  }, [subtitles, sfxTracks, textOverlays, currentTime, safeDuration, selection])

  const generateTimeMarkers = () => {
    const markers = []
    const interval = zoom >= 2 ? 1 : zoom >= 1 ? 2 : 5

    for (let time = 0; time <= safeDuration; time += interval) {
      const position = time * pixelsPerSecond
      markers.push(
        <div key={time} className="time-marker" style={{ left: `${position}px` }}>
          <div className="time-tick" />
          <span className="time-text">{formatTime(time)}</span>
        </div>
      )
    }
    return markers
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || dragState) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0)
    const newTime = Math.max(0, Math.min(safeDuration, x / pixelsPerSecond))
    setCurrentTime(newTime)
    setSelection(null) // Deselect when clicking empty area
  }

  // Drag handlers
  const handleItemMouseDown = (
    e: React.MouseEvent,
    id: number,
    type: 'subtitle' | 'sfx' | 'overlay',
    mode: 'move' | 'resize-start' | 'resize-end' = 'move'
  ) => {
    e.stopPropagation()

    // Check if track is locked
    if (type === 'sfx' && trackLock.audio) return
    if (type === 'subtitle' && trackLock.subtitles) return
    if (type === 'overlay' && trackLock.overlays) return

    // Get original times
    let originalStart = 0, originalEnd = 0
    if (type === 'subtitle') {
      const item = subtitles.find(s => s.id === id)
      if (item) { originalStart = item.start_time; originalEnd = item.end_time }
    } else if (type === 'sfx') {
      const item = sfxTracks.find(s => s.id === id)
      if (item) { originalStart = item.start_time; originalEnd = item.start_time + item.duration }
    } else if (type === 'overlay') {
      const item = textOverlays.find(o => o.id === id)
      if (item) { originalStart = item.start_time; originalEnd = item.end_time }
    }

    setDragState({
      id,
      type,
      mode,
      startX: e.clientX,
      originalStart,
      originalEnd
    })
    setSelection({ id, type })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !timelineRef.current) return

    const deltaX = e.clientX - dragState.startX
    const deltaTime = deltaX / pixelsPerSecond
    const snapPoints = getSnapPoints()

    if (dragState.type === 'subtitle') {
      const subtitle = subtitles.find(s => s.id === dragState.id)
      if (!subtitle) return

      if (dragState.mode === 'move') {
        const duration = dragState.originalEnd - dragState.originalStart
        let newStart = snapToValue(dragState.originalStart + deltaTime, snapPoints)
        newStart = Math.max(0, Math.min(safeDuration - duration, newStart))
        updateSubtitle(dragState.id, { start_time: newStart, end_time: newStart + duration })
      } else if (dragState.mode === 'resize-start') {
        let newStart = snapToValue(dragState.originalStart + deltaTime, snapPoints)
        newStart = Math.max(0, Math.min(dragState.originalEnd - 0.1, newStart))
        updateSubtitle(dragState.id, { start_time: newStart })
      } else if (dragState.mode === 'resize-end') {
        let newEnd = snapToValue(dragState.originalEnd + deltaTime, snapPoints)
        newEnd = Math.max(dragState.originalStart + 0.1, Math.min(safeDuration, newEnd))
        updateSubtitle(dragState.id, { end_time: newEnd })
      }
    } else if (dragState.type === 'sfx') {
      const sfx = sfxTracks.find(s => s.id === dragState.id)
      if (!sfx) return

      if (dragState.mode === 'move') {
        const duration = sfx.duration
        let newStart = snapToValue(dragState.originalStart + deltaTime, snapPoints)
        newStart = Math.max(0, Math.min(safeDuration - duration, newStart))
        updateSFXTrack(dragState.id, { start_time: newStart })
      } else if (dragState.mode === 'resize-end') {
        let newEnd = snapToValue(dragState.originalEnd + deltaTime, snapPoints)
        const newDuration = Math.max(0.1, newEnd - sfx.start_time)
        updateSFXTrack(dragState.id, { duration: newDuration })
      }
    } else if (dragState.type === 'overlay') {
      const overlay = textOverlays.find(o => o.id === dragState.id)
      if (!overlay) return

      if (dragState.mode === 'move') {
        const duration = dragState.originalEnd - dragState.originalStart
        let newStart = snapToValue(dragState.originalStart + deltaTime, snapPoints)
        newStart = Math.max(0, Math.min(safeDuration - duration, newStart))
        updateTextOverlay(dragState.id, { start_time: newStart, end_time: newStart + duration })
      } else if (dragState.mode === 'resize-start') {
        let newStart = snapToValue(dragState.originalStart + deltaTime, snapPoints)
        newStart = Math.max(0, Math.min(dragState.originalEnd - 0.1, newStart))
        updateTextOverlay(dragState.id, { start_time: newStart })
      } else if (dragState.mode === 'resize-end') {
        let newEnd = snapToValue(dragState.originalEnd + deltaTime, snapPoints)
        newEnd = Math.max(dragState.originalStart + 0.1, Math.min(safeDuration, newEnd))
        updateTextOverlay(dragState.id, { end_time: newEnd })
      }
    }
  }, [dragState, pixelsPerSecond, subtitles, sfxTracks, textOverlays, safeDuration, snapToValue, getSnapPoints, updateSubtitle, updateSFXTrack, updateTextOverlay])

  const handleMouseUp = useCallback(() => {
    setDragState(null)
  }, [])

  // Global mouse listeners for drag
  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragState, handleMouseMove, handleMouseUp])

  // Keyboard shortcuts for timeline
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected item
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
        e.preventDefault()
        if (selection.type === 'subtitle') deleteSubtitle(selection.id)
        else if (selection.type === 'sfx') deleteSFXTrack(selection.id)
        else if (selection.type === 'overlay') deleteTextOverlay(selection.id)
        setSelection(null)
      }

      // Arrow keys for nudging
      if (selection && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        const nudgeAmount = e.shiftKey ? 1 : 0.1 // 1s with shift, 0.1s without
        const direction = e.key === 'ArrowLeft' ? -1 : 1
        const delta = nudgeAmount * direction

        if (selection.type === 'subtitle') {
          const item = subtitles.find(s => s.id === selection.id)
          if (item) {
            const newStart = Math.max(0, item.start_time + delta)
            const duration = item.end_time - item.start_time
            updateSubtitle(selection.id, {
              start_time: newStart,
              end_time: Math.min(safeDuration, newStart + duration)
            })
          }
        } else if (selection.type === 'sfx') {
          const item = sfxTracks.find(s => s.id === selection.id)
          if (item) {
            const newStart = Math.max(0, Math.min(safeDuration - item.duration, item.start_time + delta))
            updateSFXTrack(selection.id, { start_time: newStart })
          }
        } else if (selection.type === 'overlay') {
          const item = textOverlays.find(o => o.id === selection.id)
          if (item) {
            const newStart = Math.max(0, item.start_time + delta)
            const duration = item.end_time - item.start_time
            updateTextOverlay(selection.id, {
              start_time: newStart,
              end_time: Math.min(safeDuration, newStart + duration)
            })
          }
        }
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        setSelection(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selection, subtitles, sfxTracks, textOverlays, safeDuration, deleteSubtitle, deleteSFXTrack, deleteTextOverlay, updateSubtitle, updateSFXTrack, updateTextOverlay])

  // Toggle track visibility
  const toggleVisibility = (track: keyof TrackVisibility) => {
    setTrackVisibility(prev => ({ ...prev, [track]: !prev[track] }))
  }

  // Toggle track lock
  const toggleLock = (track: keyof TrackLock) => {
    setTrackLock(prev => ({ ...prev, [track]: !prev[track] }))
  }

  // Render a track item with resize handles
  const renderTrackItem = (
    id: number,
    type: 'subtitle' | 'sfx' | 'overlay',
    startTime: number,
    endTime: number,
    icon: React.ReactNode,
    label: string,
    className: string
  ) => {
    const isSelected = selection?.id === id && selection?.type === type
    const isDragging = dragState?.id === id && dragState?.type === type
    const left = startTime * pixelsPerSecond
    const width = Math.max((endTime - startTime) * pixelsPerSecond, 40)

    return (
      <div
        key={`${type}-${id}`}
        className={`track-item ${className} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ left: `${left}px`, width: `${width}px` }}
        onMouseDown={(e) => handleItemMouseDown(e, id, type, 'move')}
        title={`${label} (${formatTime(startTime)} - ${formatTime(endTime)})`}
      >
        {/* Resize handle - start */}
        <div
          className="resize-handle start"
          onMouseDown={(e) => { e.stopPropagation(); handleItemMouseDown(e, id, type, 'resize-start') }}
        />

        <div className="item-content">
          <span className="item-icon">{icon}</span>
          <span className="item-text">{label}</span>
        </div>

        {/* Resize handle - end */}
        <div
          className="resize-handle end"
          onMouseDown={(e) => { e.stopPropagation(); handleItemMouseDown(e, id, type, 'resize-end') }}
        />
      </div>
    )
  }

  return (
    <div className="capcut-timeline">
      {/* Header */}
      <div className="timeline-header">
        <div className="timeline-header-left">
          <span className="tracks-label">Tracks</span>
          {selection && (
            <div className="selection-info">
              <span className="selected-type">{selection.type}</span>
              <button
                className="delete-btn"
                onClick={() => {
                  if (selection.type === 'subtitle') deleteSubtitle(selection.id)
                  else if (selection.type === 'sfx') deleteSFXTrack(selection.id)
                  else if (selection.type === 'overlay') deleteTextOverlay(selection.id)
                  setSelection(null)
                }}
                title="Delete selected (Del)"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="timeline-header-right">
          <div className="time-display">
            <span className="current">{formatTime(currentTime)}</span>
            <span className="separator">/</span>
            <span className="total">{formatTime(safeDuration)}</span>
          </div>
          <div className="timeline-tools">
            <button
              className={`snap-btn ${snapEnabled ? 'active' : ''}`}
              onClick={() => setSnapEnabled(!snapEnabled)}
              title="Toggle snapping"
            >
              Snap
            </button>
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}>
                <ZoomOut size={14} />
              </button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button className="zoom-btn" onClick={() => setZoom(Math.min(4, zoom + 0.25))}>
                <ZoomIn size={14} />
              </button>
            </div>
            <button className="fit-btn" onClick={() => setZoom(1)}>Fit</button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="timeline-body">
        {/* Sidebar with labels */}
        <div className="timeline-sidebar">
          <div className="ruler-spacer" />
          <div className="track-labels">
            {/* Video Track Label */}
            <div className={`track-label ${!trackVisibility.video ? 'hidden-track' : ''}`}>
              <span className="track-icon"><Film size={16} /></span>
              <span className="track-name">Video</span>
              <div className="track-buttons">
                <button
                  className={`track-btn ${!trackVisibility.video ? 'off' : ''}`}
                  onClick={() => toggleVisibility('video')}
                  title="Toggle visibility"
                >
                  {trackVisibility.video ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button
                  className={`track-btn ${trackLock.video ? 'locked' : ''}`}
                  onClick={() => toggleLock('video')}
                  title="Toggle lock"
                >
                  {trackLock.video ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
              </div>
            </div>

            {/* Audio Track Label */}
            <div className={`track-label ${!trackVisibility.audio ? 'hidden-track' : ''}`}>
              <span className="track-icon"><Volume2 size={16} /></span>
              <span className="track-name">Audio</span>
              <div className="track-buttons">
                <button
                  className={`track-btn ${!trackVisibility.audio ? 'off' : ''}`}
                  onClick={() => toggleVisibility('audio')}
                  title="Toggle visibility"
                >
                  {trackVisibility.audio ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button
                  className={`track-btn ${trackLock.audio ? 'locked' : ''}`}
                  onClick={() => toggleLock('audio')}
                  title="Toggle lock"
                >
                  {trackLock.audio ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
              </div>
            </div>

            {/* Subtitles Track Label */}
            <div className={`track-label ${!trackVisibility.subtitles ? 'hidden-track' : ''}`}>
              <span className="track-icon"><MessageSquare size={16} /></span>
              <span className="track-name">Subtitles</span>
              <div className="track-buttons">
                <button
                  className={`track-btn ${!trackVisibility.subtitles ? 'off' : ''}`}
                  onClick={() => toggleVisibility('subtitles')}
                  title="Toggle visibility"
                >
                  {trackVisibility.subtitles ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button
                  className={`track-btn ${trackLock.subtitles ? 'locked' : ''}`}
                  onClick={() => toggleLock('subtitles')}
                  title="Toggle lock"
                >
                  {trackLock.subtitles ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
              </div>
            </div>

            {/* Text Overlays Track Label */}
            <div className={`track-label ${!trackVisibility.overlays ? 'hidden-track' : ''}`}>
              <span className="track-icon"><Type size={16} /></span>
              <span className="track-name">Text</span>
              <div className="track-buttons">
                <button
                  className={`track-btn ${!trackVisibility.overlays ? 'off' : ''}`}
                  onClick={() => toggleVisibility('overlays')}
                  title="Toggle visibility"
                >
                  {trackVisibility.overlays ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button
                  className={`track-btn ${trackLock.overlays ? 'locked' : ''}`}
                  onClick={() => toggleLock('overlays')}
                  title="Toggle lock"
                >
                  {trackLock.overlays ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable timeline content */}
        <div className="timeline-scroll" ref={scrollRef}>
          <div className="timeline-scroll-inner" style={{ width: `${Math.max(timelineWidth, 800)}px` }}>
            {/* Time Ruler */}
            <div className="time-ruler">
              {generateTimeMarkers()}
              <div className="playhead-top" style={{ left: `${playheadPosition}px` }} />
            </div>

            {/* Tracks */}
            <div
              ref={timelineRef}
              className={`tracks-container ${dragState ? 'dragging' : ''}`}
              onClick={handleTimelineClick}
            >
              <div className="playhead-line" style={{ left: `${playheadPosition}px` }} />

              {/* Video Track */}
              {trackVisibility.video && (
                <div className="track video">
                  <div className="video-clip" style={{ width: `${timelineWidth}px` }}>
                    <span>Main Video</span>
                  </div>
                </div>
              )}

              {/* Audio/SFX Track */}
              {trackVisibility.audio && (
                <div className={`track audio ${trackLock.audio ? 'locked' : ''}`}>
                  {sfxTracks.map(sfx =>
                    renderTrackItem(
                      sfx.id,
                      'sfx',
                      sfx.start_time,
                      sfx.start_time + sfx.duration,
                      <Music size={12} />,
                      sfx.prompt || 'SFX',
                      'sfx'
                    )
                  )}
                  {analysis?.suggestedSFX?.map((suggestion, index) => (
                    <div
                      key={`sug-${index}`}
                      className="sfx-marker"
                      style={{ left: `${suggestion.timestamp * pixelsPerSecond}px` }}
                      title={`Suggested: ${suggestion.prompt}`}
                    />
                  ))}
                </div>
              )}

              {/* Subtitles Track */}
              {trackVisibility.subtitles && (
                <div className={`track subtitles ${trackLock.subtitles ? 'locked' : ''}`}>
                  {subtitles.map(subtitle =>
                    renderTrackItem(
                      subtitle.id,
                      'subtitle',
                      subtitle.start_time,
                      subtitle.end_time,
                      <MessageSquare size={12} />,
                      subtitle.text.substring(0, 25),
                      'subtitle'
                    )
                  )}
                </div>
              )}

              {/* Text Overlays Track */}
              {trackVisibility.overlays && (
                <div className={`track overlays ${trackLock.overlays ? 'locked' : ''}`}>
                  {textOverlays.map(overlay =>
                    renderTrackItem(
                      overlay.id,
                      'overlay',
                      overlay.start_time,
                      overlay.end_time,
                      <Type size={12} />,
                      overlay.text,
                      'overlay'
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
