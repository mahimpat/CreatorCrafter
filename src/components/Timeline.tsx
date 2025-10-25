import { useRef, useState } from 'react'
import { useProject } from '../context/ProjectContext'
import './Timeline.css'

export default function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null)
  const timeRulerRef = useRef<HTMLDivElement>(null)
  const {
    currentTime,
    duration,
    setCurrentTime,
    subtitles,
    updateSubtitle,
    sfxTracks,
    updateSFXTrack,
    textOverlays,
    updateTextOverlay,
    analysis,
    videoPath
  } = useProject()

  const [isDragging, setIsDragging] = useState(false)
  const [draggedSFX, setDraggedSFX] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.5)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [resizingClip, setResizingClip] = useState<{
    id: string
    type: 'subtitle' | 'sfx' | 'overlay'
    handle: 'left' | 'right'
    startX: number
    originalStart: number
    originalEnd: number
  } | null>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const generateTimeMarkers = () => {
    const markers = []
    const interval = zoom >= 1 ? 1 : zoom >= 0.5 ? 5 : 10 // seconds between markers

    for (let time = 0; time <= safeDuration; time += interval) {
      const position = (time / safeDuration) * timelineWidth
      markers.push(
        <div
          key={time}
          className="time-marker"
          style={{ left: `${position}px` }}
        >
          <div className="time-tick" />
          <span className="time-label">{formatTime(time)}</span>
        </div>
      )
    }
    return markers
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || draggedSFX) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    const percentage = x / timelineWidth
    const newTime = percentage * safeDuration

    setCurrentTime(Math.max(0, Math.min(safeDuration, newTime)))
  }

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  const handleMouseUp = () => {
    if (resizingClip) {
      handleResizeEnd()
    } else if (draggedSFX) {
      handleSFXMouseUp()
    } else {
      setIsDragging(false)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return

    if (resizingClip) {
      handleResizeMove(e)
      return
    }

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    const percentage = x / timelineWidth
    const newTime = percentage * safeDuration

    if (isDragging && !draggedSFX) {
      setCurrentTime(Math.max(0, Math.min(safeDuration, newTime)))
    } else if (draggedSFX) {
      // Update the position of the dragged SFX track
      const clampedTime = Math.max(0, Math.min(safeDuration, newTime))
      updateSFXTrack(draggedSFX, { start: clampedTime })
    }
  }

  const handleSFXMouseDown = (e: React.MouseEvent, sfxId: string) => {
    // Don't start dragging if we're clicking on a resize handle
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return
    }
    e.stopPropagation()
    setDraggedSFX(sfxId)
    setIsDragging(true)
  }

  const handleSFXMouseUp = () => {
    setDraggedSFX(null)
    setIsDragging(false)
  }

  // Resize handle event handlers
  const handleResizeStart = (
    e: React.MouseEvent,
    clipId: string,
    clipType: 'subtitle' | 'sfx' | 'overlay',
    handle: 'left' | 'right',
    originalStart: number,
    originalEnd: number
  ) => {
    e.stopPropagation()
    setResizingClip({
      id: clipId,
      type: clipType,
      handle,
      startX: e.clientX,
      originalStart,
      originalEnd
    })
    setIsDragging(true)
  }

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!resizingClip || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const deltaX = e.clientX - resizingClip.startX
    const deltaTime = (deltaX / timelineWidth) * safeDuration

    let newStart = resizingClip.originalStart
    let newEnd = resizingClip.originalEnd

    if (resizingClip.handle === 'left') {
      newStart = Math.max(0, Math.min(resizingClip.originalEnd - 0.1, resizingClip.originalStart + deltaTime))
    } else {
      newEnd = Math.min(safeDuration, Math.max(resizingClip.originalStart + 0.1, resizingClip.originalEnd + deltaTime))
    }

    // Update the clip based on type
    if (resizingClip.type === 'subtitle') {
      updateSubtitle(resizingClip.id, { start: newStart, end: newEnd })
    } else if (resizingClip.type === 'sfx') {
      const newDuration = newEnd - newStart
      updateSFXTrack(resizingClip.id, { start: newStart, duration: newDuration })
    } else if (resizingClip.type === 'overlay') {
      updateTextOverlay(resizingClip.id, { start: newStart, end: newEnd })
    }
  }

  const handleResizeEnd = () => {
    setResizingClip(null)
    setIsDragging(false)
  }

  // Ensure duration is valid and reasonable
  const safeDuration = Math.max(1, duration || 1)
  const baseWidth = Math.max(800, safeDuration * 30) // 30px per second minimum, 800px minimum
  const timelineWidth = Math.min(baseWidth * zoom, 10000) // Cap at 10000px
  const playheadPosition = safeDuration > 0 ? (currentTime / safeDuration) * timelineWidth : 0


  return (
    <div className="timeline-container">
      {/* Timeline Header with Controls */}
      <div className="timeline-header">
        <div className="timeline-controls">
          <div className="time-display">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="separator">/</span>
            <span className="total-time">{formatTime(safeDuration)}</span>
          </div>
          <div className="zoom-controls">
            <button onClick={() => setZoom(Math.max(0.1, zoom - 0.5))}>-</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(5, zoom + 0.5))}>+</button>
          </div>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div className="timeline-workspace">
        {/* Track Headers */}
        <div className="track-headers">
          <div className="track-header video-header">
            <span>Video</span>
            <div className="track-controls">
              <button className="track-toggle">👁</button>
              <button className="track-lock">🔒</button>
            </div>
          </div>
          <div className="track-header subtitle-header">
            <span>Subtitles</span>
            <div className="track-controls">
              <button className="track-toggle">👁</button>
              <button className="track-lock">🔒</button>
            </div>
          </div>
          <div className="track-header sfx-header">
            <span>Sound FX</span>
            <div className="track-controls">
              <button className="track-toggle">👁</button>
              <button className="track-lock">🔒</button>
            </div>
          </div>
          <div className="track-header overlay-header">
            <span>Text Overlays</span>
            <div className="track-controls">
              <button className="track-toggle">👁</button>
              <button className="track-lock">🔒</button>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="timeline-content">
          {/* Time Ruler */}
          <div
            ref={timeRulerRef}
            className="time-ruler"
            style={{ width: `${timelineWidth}px` }}
          >
            {generateTimeMarkers()}
          </div>

          {/* Timeline Tracks */}
          <div
            ref={timelineRef}
            className="timeline-tracks"
            style={{ width: `${timelineWidth}px` }}
            onClick={handleTimelineClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseUp}
          >
            {/* Playhead */}
            <div
              className="playhead"
              style={{ left: `${playheadPosition}px` }}
            />

            {/* Video Track */}
            <div className="track video-track">
              {/* AI-detected scenes */}
              {analysis?.scenes.map((scene, index) => {
                const scenePosition = (scene.timestamp / safeDuration) * timelineWidth
                return (
                  <div
                    key={index}
                    className={`scene-marker scene-${scene.type}`}
                    style={{ left: `${scenePosition}px` }}
                    title={`${scene.type}: ${scene.description}`}
                  />
                )
              })}
            </div>

            {/* Subtitle Track */}
            <div className="track subtitle-track">
              {subtitles.map(subtitle => {
                const startPos = (subtitle.start / safeDuration) * timelineWidth
                const width = ((subtitle.end - subtitle.start) / safeDuration) * timelineWidth
                return (
                  <div
                    key={subtitle.id}
                    className={`track-item subtitle-item ${resizingClip?.id === subtitle.id ? 'resizing' : ''}`}
                    style={{
                      left: `${startPos}px`,
                      width: `${Math.max(width, 20)}px`
                    }}
                    title={subtitle.text}
                  >
                    {/* Left resize handle */}
                    <div
                      className="resize-handle resize-handle-left"
                      onMouseDown={(e) => handleResizeStart(e, subtitle.id, 'subtitle', 'left', subtitle.start, subtitle.end)}
                    />

                    <span className="clip-label">{subtitle.text.substring(0, 20)}...</span>

                    {/* Right resize handle */}
                    <div
                      className="resize-handle resize-handle-right"
                      onMouseDown={(e) => handleResizeStart(e, subtitle.id, 'subtitle', 'right', subtitle.start, subtitle.end)}
                    />
                  </div>
                )
              })}
            </div>

            {/* SFX Track */}
            <div className="track sfx-track">
              {sfxTracks.map(sfx => {
                const startPos = (sfx.start / safeDuration) * timelineWidth
                const width = (sfx.duration / safeDuration) * timelineWidth
                const sfxEnd = sfx.start + sfx.duration


                return (
                  <div
                    key={sfx.id}
                    className={`track-item sfx-item ${draggedSFX === sfx.id ? 'dragging' : ''} ${resizingClip?.id === sfx.id ? 'resizing' : ''}`}
                    style={{
                      left: `${startPos}px`,
                      width: `${Math.max(width, 60)}px`
                    }}
                    title={`${sfx.prompt || 'SFX'} - ${sfx.start.toFixed(2)}s`}
                    onMouseDown={(e) => handleSFXMouseDown(e, sfx.id)}
                  >
                    {/* Left resize handle */}
                    <div
                      className="resize-handle resize-handle-left"
                      onMouseDown={(e) => handleResizeStart(e, sfx.id, 'sfx', 'left', sfx.start, sfxEnd)}
                    />

                    <span className="clip-label">{sfx.prompt || 'SFX'}</span>
                    <div className="clip-waveform"></div>

                    {/* Right resize handle */}
                    <div
                      className="resize-handle resize-handle-right"
                      onMouseDown={(e) => handleResizeStart(e, sfx.id, 'sfx', 'right', sfx.start, sfxEnd)}
                    />
                  </div>
                )
              })}

              {/* AI-suggested SFX */}
              {analysis?.suggestedSFX.map((suggestion, index) => {
                const position = (suggestion.timestamp / safeDuration) * timelineWidth
                return (
                  <div
                    key={index}
                    className="sfx-suggestion"
                    style={{ left: `${position}px` }}
                    title={`Suggested: ${suggestion.prompt}`}
                  />
                )
              })}
            </div>

            {/* Text Overlay Track */}
            <div className="track overlay-track">
              {textOverlays.map(overlay => {
                const startPos = (overlay.start / safeDuration) * timelineWidth
                const width = ((overlay.end - overlay.start) / safeDuration) * timelineWidth
                return (
                  <div
                    key={overlay.id}
                    className={`track-item overlay-item ${resizingClip?.id === overlay.id ? 'resizing' : ''}`}
                    style={{
                      left: `${startPos}px`,
                      width: `${Math.max(width, 40)}px`
                    }}
                    title={overlay.text}
                  >
                    {/* Left resize handle */}
                    <div
                      className="resize-handle resize-handle-left"
                      onMouseDown={(e) => handleResizeStart(e, overlay.id, 'overlay', 'left', overlay.start, overlay.end)}
                    />

                    <span className="clip-label">{overlay.text}</span>

                    {/* Right resize handle */}
                    <div
                      className="resize-handle resize-handle-right"
                      onMouseDown={(e) => handleResizeStart(e, overlay.id, 'overlay', 'right', overlay.start, overlay.end)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
