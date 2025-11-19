import { useEffect, useRef, useState } from 'react'
import { useProject } from '../context/ProjectContext'
import lottie, { AnimationItem } from 'lottie-web'
import type { AnimationTrack } from '../types/animation'
import './AnimationCanvas.css'

interface AnimationCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement>
  videoWidth: number
  videoHeight: number
}

export default function AnimationCanvas({ videoRef, videoWidth, videoHeight }: AnimationCanvasProps) {
  const { animationTracks, currentTime, isPlaying, updateAnimationTrack } = useProject()
  const containerRef = useRef<HTMLDivElement>(null)
  const animationInstances = useRef<Map<string, AnimationItem>>(new Map())
  const animationContainers = useRef<Map<string, HTMLDivElement>>(new Map())

  // State for interactive controls
  const [selectedAnimationId, setSelectedAnimationId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStartPos = useRef<{ x: number; y: number; trackX: number; trackY: number } | null>(null)
  const resizeStartData = useRef<{ scale: number; mouseX: number; mouseY: number } | null>(null)

  // Get the actual displayed video size and position (not the original dimensions)
  const getDisplayedVideoInfo = () => {
    if (!videoRef.current || !containerRef.current) {
      return { width: videoWidth, height: videoHeight, offsetX: 0, offsetY: 0 }
    }

    const videoRect = videoRef.current.getBoundingClientRect()
    const canvasRect = containerRef.current.getBoundingClientRect()

    // Calculate offset of video within canvas
    const offsetX = videoRect.left - canvasRect.left
    const offsetY = videoRect.top - canvasRect.top

    return {
      width: videoRect.width,
      height: videoRect.height,
      offsetX,
      offsetY
    }
  }

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
        animContainer.setAttribute('data-track-id', track.id) // Store track ID for event handlers
        animContainer.style.position = 'absolute'
        animContainer.style.zIndex = String(track.zIndex || 100)
        animContainer.style.cursor = 'move'
        animContainer.style.pointerEvents = 'auto' // Ensure container can receive events

        // Create inner wrapper for the lottie animation (pointer-events: none)
        const lottieWrapper = document.createElement('div')
        lottieWrapper.className = 'lottie-wrapper'
        lottieWrapper.style.width = '100%'
        lottieWrapper.style.height = '100%'
        lottieWrapper.style.pointerEvents = 'none'
        animContainer.appendChild(lottieWrapper)

        // Create resize handle
        const resizeHandle = document.createElement('div')
        resizeHandle.className = 'animation-resize-handle'
        resizeHandle.style.position = 'absolute'
        resizeHandle.style.right = '-6px'
        resizeHandle.style.bottom = '-6px'
        resizeHandle.style.width = '12px'
        resizeHandle.style.height = '12px'
        resizeHandle.style.background = '#3b82f6'
        resizeHandle.style.border = '2px solid white'
        resizeHandle.style.borderRadius = '50%'
        resizeHandle.style.cursor = 'nwse-resize'
        resizeHandle.style.display = 'none'
        animContainer.appendChild(resizeHandle)

        // Position and size the container
        const videoInfo = getDisplayedVideoInfo()
        updateAnimationStyle(animContainer, track, videoInfo.width, videoInfo.height, videoInfo.offsetX, videoInfo.offsetY)

        containerRef.current?.appendChild(animContainer)
        animationContainers.current.set(track.id, animContainer)


        // Create lottie animation in the wrapper
        try {
          const anim = lottie.loadAnimation({
            container: lottieWrapper,
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
          console.error('[AnimationCanvas] Failed to load Lottie animation:', error)
        }
      }
    })

    // Update positions and styles for all active animations
    const videoInfo = getDisplayedVideoInfo()
    activeAnimations.forEach(track => {
      const container = animationContainers.current.get(track.id)
      if (container) {
        updateAnimationStyle(container, track, videoInfo.width, videoInfo.height, videoInfo.offsetX, videoInfo.offsetY)
      }
    })
  }, [animationTracks, currentTime, videoWidth, videoHeight])

  // Sync animation playback with video (optimized)
  useEffect(() => {
    animationInstances.current.forEach((anim, trackId) => {
      const track = animationTracks.find(t => t.id === trackId)
      if (!track) return

      const trackTime = currentTime - track.start
      const trackProgress = Math.max(0, Math.min(1, trackTime / track.duration))
      const targetFrame = trackProgress * anim.totalFrames

      if (isPlaying) {
        // When playing, only update if paused or significantly out of sync
        if (anim.isPaused) {
          // Calculate playback speed to match animation duration with track duration
          const playbackSpeed = (anim.totalFrames / anim.frameRate) / track.duration
          anim.setSpeed(playbackSpeed * track.speed)
          anim.goToAndPlay(targetFrame, true)
        }
      } else {
        // When paused, always sync to current frame
        if (!anim.isPaused) {
          anim.pause()
        }
        // Use goToAndStop without forcing render on every frame update
        if (Math.abs(anim.currentFrame - targetFrame) > 0.5) {
          anim.goToAndStop(targetFrame, true)
        }
      }
    })
  }, [currentTime, isPlaying, animationTracks])

  // Update opacity
  useEffect(() => {
    animationInstances.current.forEach((anim, trackId) => {
      const track = animationTracks.find(t => t.id === trackId)
      if (!track) return

      const container = animationContainers.current.get(trackId)
      if (container && track.opacity !== undefined) {
        container.style.opacity = String(track.opacity)
      }
    })
  }, [animationTracks])

  // Handle mouse down on animation for dragging
  const handleMouseDown = (e: React.MouseEvent, trackId: string, track: AnimationTrack) => {
    if (e.button !== 0) return // Only left click

    console.log('[AnimationCanvas] Mouse down on animation:', trackId, track.name)
    console.log('[AnimationCanvas] Current track position:', track.position)
    e.stopPropagation()
    setSelectedAnimationId(trackId)

    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      trackX: track.position.x,
      trackY: track.position.y
    }
    setIsDragging(true)
    console.log('[AnimationCanvas] Started dragging - track position:', { x: track.position.x, y: track.position.y })
    console.log('[AnimationCanvas] Started dragging - client coords:', { x: e.clientX, y: e.clientY })
  }

  // Handle resize corner mouse down
  const handleResizeMouseDown = (e: React.MouseEvent, trackId: string, track: AnimationTrack) => {
    e.stopPropagation()
    e.preventDefault()

    setSelectedAnimationId(trackId)
    resizeStartData.current = {
      scale: track.scale,
      mouseX: e.clientX,
      mouseY: e.clientY
    }
    setIsResizing(true)
  }

  // Global mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartPos.current && !resizeStartData.current) return

      const videoInfo = getDisplayedVideoInfo()

      if (isDragging && dragStartPos.current && selectedAnimationId) {
        // Calculate delta in pixels
        const deltaX = e.clientX - dragStartPos.current.x
        const deltaY = e.clientY - dragStartPos.current.y

        // Convert to percentage (0-1)
        const deltaXPercent = deltaX / videoInfo.width
        const deltaYPercent = deltaY / videoInfo.height

        // Calculate new position (before clamping)
        const unclampedX = dragStartPos.current.trackX + deltaXPercent
        const unclampedY = dragStartPos.current.trackY + deltaYPercent

        // Update track position (clamp to keep within bounds)
        const newX = Math.max(0, Math.min(1, unclampedX))
        const newY = Math.max(0, Math.min(1, unclampedY))

        updateAnimationTrack(selectedAnimationId, {
          position: { x: newX, y: newY }
        })
      } else if (isResizing && resizeStartData.current && selectedAnimationId) {
        // Calculate distance moved
        const deltaY = e.clientY - resizeStartData.current.mouseY

        // Scale based on vertical movement (100px = 1x scale change)
        const scaleChange = deltaY / 100
        const newScale = Math.max(0.1, Math.min(5, resizeStartData.current.scale + scaleChange))

        updateAnimationTrack(selectedAnimationId, {
          scale: newScale
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      dragStartPos.current = null
      resizeStartData.current = null
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, selectedAnimationId, updateAnimationTrack])

  // Update selection visual indicators
  useEffect(() => {
    animationContainers.current.forEach((container, trackId) => {
      const resizeHandle = container.querySelector('.animation-resize-handle') as HTMLElement

      if (trackId === selectedAnimationId) {
        // Show selection
        container.style.outline = '2px solid #3b82f6'
        container.style.outlineOffset = '2px'
        if (resizeHandle) resizeHandle.style.display = 'block'
      } else {
        // Hide selection
        container.style.outline = 'none'
        if (resizeHandle) resizeHandle.style.display = 'none'
      }
    })
  }, [selectedAnimationId])

  // Handle all mouse down events via event delegation
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    console.log('[AnimationCanvas] Canvas mouse down')
    console.log('[AnimationCanvas] Target element:', target)
    console.log('[AnimationCanvas] Target className:', target.className)
    console.log('[AnimationCanvas] Target tagName:', target.tagName)
    console.log('[AnimationCanvas] All classes:', target.classList)

    // Check if clicked on animation container
    const animContainer = target.closest('.lottie-animation-container') as HTMLElement
    console.log('[AnimationCanvas] Closest animation container:', animContainer)

    if (animContainer) {
      console.log('[AnimationCanvas] Found animation container')
      const trackId = animContainer.getAttribute('data-track-id')
      console.log('[AnimationCanvas] Track ID:', trackId)

      if (!trackId) {
        console.log('[AnimationCanvas] No track ID found')
        return
      }

      const track = animationTracks.find(t => t.id === trackId)
      if (!track) {
        console.log('[AnimationCanvas] Track not found:', trackId)
        return
      }

      console.log('[AnimationCanvas] Found track:', track.name)

      // Check if clicked on resize handle
      if (target.classList.contains('animation-resize-handle')) {
        console.log('[AnimationCanvas] Clicked resize handle')
        handleResizeMouseDown(e, trackId, track)
      } else {
        console.log('[AnimationCanvas] Clicked animation body')
        handleMouseDown(e, trackId, track)
      }
      return
    }

    // Clicked on empty canvas area - deselect
    console.log('[AnimationCanvas] Clicked empty area - no animation container found')
    setSelectedAnimationId(null)
  }

  return (
    <div
      ref={containerRef}
      className="animation-canvas-container"
      onMouseDown={handleCanvasMouseDown}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto', // Changed to auto to allow clicking
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
  videoHeight: number,
  offsetX: number = 0,
  offsetY: number = 0
) {
  // Calculate size based on scale
  const baseSize = 200 // Base size in pixels
  const size = baseSize * track.scale

  // Position is in percentage (0-1), convert to pixels, then add video offset
  const x = offsetX + (track.position.x * videoWidth) - size / 2
  const y = offsetY + (track.position.y * videoHeight) - size / 2

  container.style.left = `${x}px`
  container.style.top = `${y}px`
  container.style.width = `${size}px`
  container.style.height = `${size}px`
  container.style.transform = `rotate(${track.rotation}deg)`
  container.style.opacity = String(track.opacity)
  container.style.zIndex = String(track.zIndex || 100)
}
