import { useRef, useState } from 'react'
import { useProject } from '../context/ProjectContext'
import './Timeline.css'

export default function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null)
  const {
    currentTime,
    duration,
    setCurrentTime,
    subtitles,
    sfxTracks,
    textOverlays,
    analysis
  } = useProject()

  const [isDragging, setIsDragging] = useState(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration

    setCurrentTime(Math.max(0, Math.min(duration, newTime)))
  }

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration

    setCurrentTime(Math.max(0, Math.min(duration, newTime)))
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <span className="time-display">{formatTime(currentTime)}</span>
        <span className="time-display">{formatTime(duration)}</span>
      </div>

      <div
        ref={timelineRef}
        className="timeline"
        onClick={handleTimelineClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
      >
        {/* Progress bar */}
        <div className="timeline-progress" style={{ width: `${progressPercentage}%` }} />

        {/* Playhead */}
        <div className="playhead" style={{ left: `${progressPercentage}%` }} />

        {/* AI-detected scenes */}
        {analysis?.scenes.map((scene, index) => {
          const scenePosition = (scene.timestamp / duration) * 100
          return (
            <div
              key={index}
              className={`scene-marker scene-${scene.type}`}
              style={{ left: `${scenePosition}%` }}
              title={`${scene.type}: ${scene.description}`}
            />
          )
        })}

        {/* Subtitle track */}
        <div className="track subtitle-track">
          {subtitles.map(subtitle => {
            const startPos = (subtitle.start / duration) * 100
            const width = ((subtitle.end - subtitle.start) / duration) * 100
            return (
              <div
                key={subtitle.id}
                className="track-item subtitle-item"
                style={{
                  left: `${startPos}%`,
                  width: `${width}%`
                }}
                title={subtitle.text}
              />
            )
          })}
        </div>

        {/* SFX track */}
        <div className="track sfx-track">
          {sfxTracks.map(sfx => {
            const startPos = (sfx.start / duration) * 100
            const width = (sfx.duration / duration) * 100
            return (
              <div
                key={sfx.id}
                className="track-item sfx-item"
                style={{
                  left: `${startPos}%`,
                  width: `${width}%`
                }}
                title={sfx.prompt || 'SFX'}
              />
            )
          })}

          {/* AI-suggested SFX */}
          {analysis?.suggestedSFX.map((suggestion, index) => {
            const position = (suggestion.timestamp / duration) * 100
            return (
              <div
                key={index}
                className="sfx-suggestion"
                style={{ left: `${position}%` }}
                title={`Suggested: ${suggestion.prompt}`}
              />
            )
          })}
        </div>

        {/* Text overlay track */}
        <div className="track overlay-track">
          {textOverlays.map(overlay => {
            const startPos = (overlay.start / duration) * 100
            const width = ((overlay.end - overlay.start) / duration) * 100
            return (
              <div
                key={overlay.id}
                className="track-item overlay-item"
                style={{
                  left: `${startPos}%`,
                  width: `${width}%`
                }}
                title={overlay.text}
              />
            )
          })}
        </div>
      </div>

      <div className="timeline-labels">
        <span>Subtitles</span>
        <span>Sound FX</span>
        <span>Overlays</span>
      </div>
    </div>
  )
}
