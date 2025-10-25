import { useRef, useEffect, useState } from 'react'
import { useProject } from '../context/ProjectContext'
import './VideoPlayer.css'

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const sfxAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const {
    videoPath,
    currentTime,
    setCurrentTime,
    setDuration,
    isPlaying,
    setIsPlaying,
    subtitles,
    textOverlays,
    sfxTracks
  } = useProject()

  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null)
  const [activeOverlays, setActiveOverlays] = useState<string[]>([])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
    }
  }, [setCurrentTime, setDuration, setIsPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.play()
    } else {
      video.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Math.abs(video.currentTime - currentTime) > 0.1) {
      video.currentTime = currentTime
    }
  }, [currentTime])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  // Update active subtitle based on current time
  useEffect(() => {
    const current = subtitles.find(
      sub => currentTime >= sub.start && currentTime <= sub.end
    )
    setActiveSubtitle(current?.id || null)
  }, [currentTime, subtitles])

  // Update active overlays based on current time
  useEffect(() => {
    const active = textOverlays
      .filter(overlay => currentTime >= overlay.start && currentTime <= overlay.end)
      .map(overlay => overlay.id)
    setActiveOverlays(active)
  }, [currentTime, textOverlays])

  // Create audio elements for SFX tracks
  useEffect(() => {
    const audioMap = sfxAudioRefs.current

    // Remove audio elements for deleted SFX tracks
    audioMap.forEach((audio, trackId) => {
      if (!sfxTracks.find(track => track.id === trackId)) {
        audio.pause()
        audio.remove()
        audioMap.delete(trackId)
      }
    })

    // Create audio elements for new SFX tracks
    sfxTracks.forEach(track => {
      if (!audioMap.has(track.id)) {
        const audio = new Audio()
        audio.src = `localfile://${track.path}`
        audio.volume = track.volume * volume * (isMuted ? 0 : 1)
        audio.preload = 'auto'
        audioMap.set(track.id, audio)
      }
    })
  }, [sfxTracks, volume, isMuted])

  // Handle SFX playback based on current time and video state
  useEffect(() => {
    const audioMap = sfxAudioRefs.current

    sfxTracks.forEach(track => {
      const audio = audioMap.get(track.id)
      if (!audio) return

      const trackEnd = track.start + track.duration
      const shouldBePlaying = isPlaying && currentTime >= track.start && currentTime < trackEnd

      if (shouldBePlaying && audio.paused) {
        // Calculate the position within the SFX track
        const audioTime = currentTime - track.start
        audio.currentTime = Math.max(0, audioTime)
        audio.volume = track.volume * volume * (isMuted ? 0 : 1)
        audio.play().catch(console.error)
      } else if (!shouldBePlaying && !audio.paused) {
        audio.pause()
      } else if (shouldBePlaying && !audio.paused) {
        // Sync audio time with video time
        const expectedAudioTime = currentTime - track.start
        if (Math.abs(audio.currentTime - expectedAudioTime) > 0.1) {
          audio.currentTime = Math.max(0, expectedAudioTime)
        }
      }
    })
  }, [currentTime, isPlaying, sfxTracks, volume, isMuted])

  // Pause all SFX when video is paused
  useEffect(() => {
    const audioMap = sfxAudioRefs.current

    if (!isPlaying) {
      audioMap.forEach(audio => {
        if (!audio.paused) {
          audio.pause()
        }
      })
    }
  }, [isPlaying])

  // Update SFX volume when main volume changes
  useEffect(() => {
    const audioMap = sfxAudioRefs.current

    audioMap.forEach((audio, trackId) => {
      const track = sfxTracks.find(t => t.id === trackId)
      if (track) {
        audio.volume = track.volume * volume * (isMuted ? 0 : 1)
      }
    })
  }, [volume, isMuted, sfxTracks])

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      const audioMap = sfxAudioRefs.current
      audioMap.forEach(audio => {
        audio.pause()
        audio.remove()
      })
      audioMap.clear()
    }
  }, [])

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (newVolume > 0 && isMuted) {
      setIsMuted(false)
    }
  }

  const activeSubtitleData = subtitles.find(sub => sub.id === activeSubtitle)
  const activeOverlayData = textOverlays.filter(overlay => activeOverlays.includes(overlay.id))
  const activeSfxTracks = sfxTracks.filter(track =>
    currentTime >= track.start && currentTime < track.start + track.duration
  )

  return (
    <div className="video-player-container">
      <div className="video-wrapper">
        {videoPath && (
          <>
            <video ref={videoRef} className="video-element" src={`localfile://${videoPath}`} />

            {/* Subtitle overlay */}
            {activeSubtitleData && (
              <div
                className={`subtitle-overlay subtitle-${activeSubtitleData.style.position}`}
                style={{
                  fontSize: `${activeSubtitleData.style.fontSize}px`,
                  fontFamily: activeSubtitleData.style.fontFamily,
                  color: activeSubtitleData.style.color,
                  backgroundColor: activeSubtitleData.style.backgroundColor
                }}
              >
                {activeSubtitleData.text}
              </div>
            )}

            {/* Text overlays */}
            {activeOverlayData.map(overlay => (
              <div
                key={overlay.id}
                className={`text-overlay overlay-${overlay.style.animation}`}
                style={{
                  fontSize: `${overlay.style.fontSize}px`,
                  fontFamily: overlay.style.fontFamily,
                  color: overlay.style.color,
                  backgroundColor: overlay.style.backgroundColor,
                  left: `${overlay.style.position.x}%`,
                  top: `${overlay.style.position.y}%`
                }}
              >
                {overlay.text}
              </div>
            ))}

            {/* SFX playing indicator */}
            {activeSfxTracks.length > 0 && (
              <div className="sfx-indicator">
                <span className="sfx-icon">🔊</span>
                <span className="sfx-count">{activeSfxTracks.length} SFX</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="video-controls">
        <button className="control-btn" onClick={togglePlayPause}>
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="volume-control">
          <button className="control-btn" onClick={toggleMute}>
            {isMuted ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      </div>
    </div>
  )
}
