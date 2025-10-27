import { useRef, useState } from 'react'
import { useProject } from '../context/ProjectContext'
import { Film, Volume2, MessageSquare, Type, Eye, Lock, Music } from 'lucide-react'
import './Timeline.css'

export default function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null)
  const {
    currentTime,
    duration,
    setCurrentTime,
    subtitles,
    updateSubtitle,
    sfxTracks,
    addSFXTrack,
    updateSFXTrack,
    textOverlays,
    updateTextOverlay,
    analysis,
  } = useProject()

  const [isDragging, setIsDragging] = useState(false)
  const [draggedItem, setDraggedItem] = useState<{
    id: string
    type: 'subtitle' | 'sfx' | 'overlay'
  } | null>(null)
  const [zoom, setZoom] = useState(1)

  // Assign SFX tracks to lanes to prevent visual overlap
  const assignSfxToLanes = (tracks: typeof sfxTracks) => {
    // Sort by start time
    const sorted = [...tracks].sort((a, b) => a.start - b.start)

    // Each lane tracks the end time of the last SFX in that lane
    const lanes: Array<{ endTime: number; tracks: typeof sfxTracks }> = []

    sorted.forEach(track => {
      const trackEnd = track.start + track.duration

      // Find first lane where this track fits (doesn't overlap)
      let assignedLane = lanes.find(lane => track.start >= lane.endTime)

      if (assignedLane) {
        // Add to existing lane
        assignedLane.tracks.push(track)
        assignedLane.endTime = trackEnd
      } else {
        // Create new lane
        lanes.push({
          endTime: trackEnd,
          tracks: [track]
        })
      }
    })

    return lanes.map(lane => lane.tracks)
  }

  const sfxLanes = assignSfxToLanes(sfxTracks)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  // Safe duration calculation
  const safeDuration = Math.max(1, duration || 1)
  const pixelsPerSecond = 50 * zoom
  const timelineWidth = safeDuration * pixelsPerSecond
  const playheadPosition = (currentTime / safeDuration) * timelineWidth

  // Generate time markers for ruler
  const generateTimeMarkers = () => {
    const markers = []
    const interval = zoom >= 2 ? 1 : zoom >= 1 ? 2 : 5

    for (let time = 0; time <= safeDuration; time += interval) {
      const position = time * pixelsPerSecond
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
    if (!timelineRef.current || draggedItem) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newTime = Math.max(0, Math.min(safeDuration, x / pixelsPerSecond))
    setCurrentTime(newTime)
  }

  const handleTrackItemMouseDown = (
    e: React.MouseEvent,
    id: string,
    type: 'subtitle' | 'sfx' | 'overlay'
  ) => {
    e.stopPropagation()
    setDraggedItem({ id, type })
    setIsDragging(true)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const sfxData = e.dataTransfer.getData('sfx-library-item')

    if (sfxData) {
      try {
        const item = JSON.parse(sfxData)
        const rect = timelineRef.current?.getBoundingClientRect()
        if (rect) {
          const x = e.clientX - rect.left
          const dropTime = Math.max(0, x / pixelsPerSecond)

          // Create new SFX track from library item
          const track: import('../context/ProjectContext').SFXTrack = {
            id: `sfx-${Date.now()}`,
            path: item.path,
            start: dropTime,
            duration: item.duration,
            volume: 1,
            prompt: item.prompt
          }

          addSFXTrack(track)
        }
      } catch (err) {
        console.error('Failed to parse dropped SFX:', err)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !draggedItem) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newTime = Math.max(0, Math.min(safeDuration, x / pixelsPerSecond))

    // Update the position based on item type
    if (draggedItem.type === 'sfx') {
      updateSFXTrack(draggedItem.id, { start: newTime })
    } else if (draggedItem.type === 'subtitle') {
      const subtitle = subtitles.find(s => s.id === draggedItem.id)
      if (subtitle) {
        const duration = subtitle.end - subtitle.start
        updateSubtitle(draggedItem.id, {
          start: newTime,
          end: newTime + duration
        })
      }
    } else if (draggedItem.type === 'overlay') {
      const overlay = textOverlays.find(o => o.id === draggedItem.id)
      if (overlay) {
        const duration = overlay.end - overlay.start
        updateTextOverlay(draggedItem.id, {
          start: newTime,
          end: newTime + duration
        })
      }
    }
  }

  const handleMouseUp = () => {
    setDraggedItem(null)
    setIsDragging(false)
  }

  return (
    <div className="capcut-timeline">
      {/* Timeline Header with CapCut-style controls */}
      <div className="timeline-header">
        <div className="timeline-header-spacer" />
        <div className="timeline-controls">
          {/* Left side - Time display */}
          <div className="time-display">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="separator">/</span>
            <span className="total-time">{formatTime(safeDuration)}</span>
          </div>

          {/* Right side - Zoom and view controls */}
          <div className="timeline-tools">
            <div className="zoom-controls">
              <button
                className="zoom-btn"
                onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
              >
                -
              </button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button
                className="zoom-btn"
                onClick={() => setZoom(Math.min(4, zoom + 0.25))}
              >
                +
              </button>
            </div>
            <button className="fit-btn">Fit</button>
          </div>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div className="timeline-main">
        {/* Fixed Left Column - Track Labels */}
        <div className="timeline-labels">
          {/* Video Track Label */}
          <div className="track-label">
            <span className="track-icon"><Film size={16} /></span>
            <span className="track-name">Video</span>
            <div className="track-controls">
              <button className="track-btn" title="Toggle visibility"><Eye size={14} /></button>
              <button className="track-btn" title="Lock track"><Lock size={14} /></button>
            </div>
          </div>

          {/* Audio Track Label */}
          <div className="track-label">
            <span className="track-icon"><Volume2 size={16} /></span>
            <span className="track-name">Audio</span>
            <div className="track-controls">
              <button className="track-btn" title="Toggle visibility"><Eye size={14} /></button>
              <button className="track-btn" title="Lock track"><Lock size={14} /></button>
            </div>
          </div>

          {/* Subtitle Track Label */}
          <div className="track-label">
            <span className="track-icon"><MessageSquare size={16} /></span>
            <span className="track-name">Subtitles</span>
            <div className="track-controls">
              <button className="track-btn" title="Toggle visibility"><Eye size={14} /></button>
              <button className="track-btn" title="Lock track"><Lock size={14} /></button>
            </div>
          </div>

          {/* Text Overlay Track Label */}
          <div className="track-label">
            <span className="track-icon"><Type size={16} /></span>
            <span className="track-name">Text</span>
            <div className="track-controls">
              <button className="track-btn" title="Toggle visibility"><Eye size={14} /></button>
              <button className="track-btn" title="Lock track"><Lock size={14} /></button>
            </div>
          </div>
        </div>

        {/* Scrollable Right Column - Timeline Content */}
        <div className="timeline-scroll-area">
          {/* Time Ruler */}
          <div className="time-ruler" style={{ width: `${timelineWidth}px` }}>
            {generateTimeMarkers()}
            {/* Playhead in ruler */}
            <div
              className="playhead-ruler"
              style={{ left: `${playheadPosition}px` }}
            />
          </div>

          {/* Timeline Content with tracks */}
          <div
            ref={timelineRef}
            className="timeline-content"
            style={{ width: `${timelineWidth}px` }}
            onClick={handleTimelineClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {/* Playhead line */}
            <div
              className="playhead-line"
              style={{ left: `${playheadPosition}px` }}
            />

            {/* Video Track */}
            <div className="track video-track">
              <div className="track-content">
                {/* Video timeline representation */}
                <div
                  className="video-clip"
                  style={{
                    width: `${timelineWidth}px`,
                    height: '60px'
                  }}
                >
                  <span className="clip-label">Main Video</span>
                </div>
              </div>
            </div>

            {/* Audio/SFX Tracks - Multiple lanes for layering */}
            {sfxLanes.length === 0 ? (
              // Empty track when no SFX
              <div className="track audio-track">
                <div className="track-content">
                  <div className="empty-track-message">
                    Add SFX from suggestions or generate custom effects
                  </div>

                  {/* AI Suggestions */}
                  {analysis?.suggestedSFX.map((suggestion, index) => {
                    const position = suggestion.timestamp * pixelsPerSecond
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
              </div>
            ) : (
              // Render each lane as a separate track
              sfxLanes.map((laneTracks, laneIndex) => (
                <div key={laneIndex} className="track audio-track">
                  <div className="track-header" style={{ fontSize: '0.85em', opacity: 0.6 }}>
                    SFX {laneIndex + 1}
                  </div>
                  <div className="track-content">
                    {/* SFX items in this lane */}
                    {laneTracks.map(sfx => {
                      const startPos = sfx.start * pixelsPerSecond
                      const width = sfx.duration * pixelsPerSecond

                      return (
                        <div
                          key={sfx.id}
                          className={`track-item sfx-item ${draggedItem?.id === sfx.id ? 'dragging' : ''}`}
                          style={{
                            left: `${startPos}px`,
                            width: `${Math.max(width, 60)}px`
                          }}
                          onMouseDown={(e) => handleTrackItemMouseDown(e, sfx.id, 'sfx')}
                          title={`${sfx.prompt || 'SFX'} - ${sfx.start.toFixed(2)}s`}
                        >
                          <div className="item-content">
                            <span className="item-icon"><Music size={14} /></span>
                            <span className="item-label">{sfx.prompt || 'SFX'}</span>
                          </div>
                          <div className="waveform"></div>
                        </div>
                      )
                    })}

                    {/* Show AI suggestions on first lane only */}
                    {laneIndex === 0 && analysis?.suggestedSFX.map((suggestion, index) => {
                      const position = suggestion.timestamp * pixelsPerSecond
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
                </div>
              ))
            )}

            {/* Subtitle Track */}
            <div className="track subtitle-track">
              <div className="track-content">
                {subtitles.map(subtitle => {
                  const startPos = subtitle.start * pixelsPerSecond
                  const width = (subtitle.end - subtitle.start) * pixelsPerSecond

                  return (
                    <div
                      key={subtitle.id}
                      className={`track-item subtitle-item ${draggedItem?.id === subtitle.id ? 'dragging' : ''}`}
                      style={{
                        left: `${startPos}px`,
                        width: `${Math.max(width, 40)}px`
                      }}
                      onMouseDown={(e) => handleTrackItemMouseDown(e, subtitle.id, 'subtitle')}
                      title={subtitle.text}
                    >
                      <div className="item-content">
                        <span className="item-icon"><MessageSquare size={14} /></span>
                        <span className="item-label">{subtitle.text.substring(0, 15)}...</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Text Overlay Track */}
            <div className="track overlay-track">
              <div className="track-content">
                {textOverlays.map(overlay => {
                  const startPos = overlay.start * pixelsPerSecond
                  const width = (overlay.end - overlay.start) * pixelsPerSecond

                  return (
                    <div
                      key={overlay.id}
                      className={`track-item overlay-item ${draggedItem?.id === overlay.id ? 'dragging' : ''}`}
                      style={{
                        left: `${startPos}px`,
                        width: `${Math.max(width, 40)}px`
                      }}
                      onMouseDown={(e) => handleTrackItemMouseDown(e, overlay.id, 'overlay')}
                      title={overlay.text}
                    >
                      <div className="item-content">
                        <span className="item-icon"><Type size={14} /></span>
                        <span className="item-label">{overlay.text}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}