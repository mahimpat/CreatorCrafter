import { useEffect, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import lottie, { AnimationItem } from 'lottie-web'
import type { AnimationTrack } from '../types/animation'

interface AnimationCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement>
  videoWidth: number
  videoHeight: number
}

export default function AnimationCanvas({ videoRef, videoWidth, videoHeight }: AnimationCanvasProps) {
  const { animationTracks, currentTime, isPlaying } = useProject()
  const containerRef = useRef<HTMLDivElement>(null)
  const animationInstances = useRef<Map<string, AnimationItem>>(new Map())
  const animationContainers = useRef<Map<string, HTMLDivElement>>(new Map())

  // Clean up animations when component unmounts
  useEffect(() => {
    return () => {
      animationInstances.current.forEach(anim => anim.destroy())
      animationInstances.current.clear()
      animationContainers.current.clear()
    }
  }, [])

  // Create/update/remove animation instances based on active tracks
  useEffect(() => {
    if (!containerRef.current) return

    const activeAnimations = animationTracks.filter(track =>
      currentTime >= track.start && currentTime < track.start + track.duration
    )

    const activeIds = new Set(activeAnimations.map(track => track.id))

    // Remove animations that are no longer active
    animationInstances.current.forEach((anim, trackId) => {
      if (!activeIds.has(trackId)) {
        anim.destroy()
        animationInstances.current.delete(trackId)

        const container = animationContainers.current.get(trackId)
        if (container && container.parentNode) {
          container.parentNode.removeChild(container)
        }
        animationContainers.current.delete(trackId)
      }
    })

    // Create new animations for newly active tracks
    activeAnimations.forEach(track => {
      if (!animationInstances.current.has(track.id) && track.lottieData) {
        // Create container for this animation
        const animContainer = document.createElement('div')
        animContainer.className = 'lottie-animation-container'
        animContainer.style.position = 'absolute'
        animContainer.style.pointerEvents = 'none'
        animContainer.style.zIndex = String(track.zIndex || 100)

        // Position and size the container
        updateAnimationStyle(animContainer, track, videoWidth, videoHeight)

        containerRef.current?.appendChild(animContainer)
        animationContainers.current.set(track.id, animContainer)

        // Create lottie animation
        try {
          const anim = lottie.loadAnimation({
            container: animContainer,
            renderer: 'svg',
            loop: track.loop,
            autoplay: false, // We'll control playback manually
            animationData: track.lottieData,
            rendererSettings: {
              preserveAspectRatio: 'xMidYMid meet'
            }
          })

          // Apply speed multiplier
          if (track.speed !== 1) {
            anim.setSpeed(track.speed)
          }

          animationInstances.current.set(track.id, anim)
        } catch (error) {
          console.error('Failed to load Lottie animation:', error)
        }
      }
    })

    // Update positions and styles for all active animations
    activeAnimations.forEach(track => {
      const container = animationContainers.current.get(track.id)
      if (container) {
        updateAnimationStyle(container, track, videoWidth, videoHeight)
      }
    })
  }, [animationTracks, currentTime, videoWidth, videoHeight])

  // Control animation playback based on video state
  useEffect(() => {
    animationInstances.current.forEach((anim, trackId) => {
      const track = animationTracks.find(t => t.id === trackId)
      if (!track) return

      const trackTime = currentTime - track.start
      const trackProgress = trackTime / track.duration

      if (isPlaying) {
        // Calculate frame to display based on current time
        const totalFrames = anim.totalFrames
        const targetFrame = trackProgress * totalFrames

        // Only play if not already playing
        if (anim.isPaused) {
          anim.goToAndPlay(targetFrame, true)
        } else {
          // Sync to correct frame if drift detected
          const currentFrame = anim.currentFrame
          if (Math.abs(currentFrame - targetFrame) > 2) {
            anim.goToAndPlay(targetFrame, true)
          }
        }
      } else {
        // Pause and show correct frame when not playing
        const totalFrames = anim.totalFrames
        const targetFrame = trackProgress * totalFrames
        anim.goToAndStop(targetFrame, true)
      }

      // Apply opacity
      const container = animationContainers.current.get(trackId)
      if (container && track.opacity !== undefined) {
        container.style.opacity = String(track.opacity)
      }
    })
  }, [currentTime, isPlaying, animationTracks])

  return (
    <div
      ref={containerRef}
      className="animation-canvas-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    />
  )
}

// Helper function to update animation container style
function updateAnimationStyle(
  container: HTMLDivElement,
  track: AnimationTrack,
  videoWidth: number,
  videoHeight: number
) {
  // Calculate size based on scale
  const baseSize = 200 // Base size in pixels
  const size = baseSize * track.scale

  // Position is in percentage (0-1), convert to pixels
  const x = track.position.x * videoWidth - size / 2
  const y = track.position.y * videoHeight - size / 2

  container.style.left = `${x}px`
  container.style.top = `${y}px`
  container.style.width = `${size}px`
  container.style.height = `${size}px`
  container.style.transform = `rotate(${track.rotation}deg)`
  container.style.opacity = String(track.opacity)
  container.style.zIndex = String(track.zIndex || 100)
}
