import { useRef, useState, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import { Film, Volume2, MessageSquare, Type, Eye, Lock, Music, Undo2, Redo2, Magnet, Trash2, Hand, Image, Scissors, Sparkles } from 'lucide-react'
import './Timeline.css'

export default function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null)
  const labelsRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const {
    currentTime,
    duration,
    setCurrentTime,
    videoPath,
    originalAudioPath,
    subtitles,
    addSubtitle,
    updateSubtitle,
    deleteSFXTrack,
    splitSFXTrack,
    deleteSubtitle,
    deleteTextOverlay,
    sfxTracks,
    addSFXTrack,
    updateSFXTrack,
    audioTracks,
    deleteAudioTrack,
    updateAudioTrack,
    splitAudioTrack,
    textOverlays,
    updateTextOverlay,
    animationTracks,
    updateAnimationTrack,
    deleteAnimationTrack,
    analysis,
    unifiedAnalysis,
    setAnalysis,
    setUnifiedAnalysis,
    selectedClipIds,
    selectClip,
    clearSelection,
    snappingEnabled,
    toggleSnapping,
    undo,
    redo,
    canUndo,
    canRedo,
    deleteSelectedClips,
    videoTimelineClips,
    addVideoToTimeline,
    updateVideoTimelineClip,
    deleteVideoTimelineClip,
    splitVideoTimelineClip,
    videoClips,
    mediaOverlays,
    mediaOverlayAssets,
    updateMediaOverlay,
    deleteMediaOverlay,
    applySilenceRemoval,
  } = useProject()

  // Use unified analysis if available, otherwise fall back to legacy analysis
  const sfxSuggestions = unifiedAnalysis?.sfx_suggestions || analysis?.suggestedSFX || []
  const animationSuggestions = unifiedAnalysis?.animation_suggestions || []

  const [draggedItem, setDraggedItem] = useState<{
    id: string
    type: 'subtitle' | 'sfx' | 'audio' | 'overlay' | 'video' | 'media-overlay' | 'animation'
    startX: number
    originalStart: number
  } | null>(null)

  const [potentialDrag, setPotentialDrag] = useState<{
    id: string
    type: 'subtitle' | 'sfx' | 'audio' | 'overlay' | 'video' | 'media-overlay' | 'animation'
    startX: number
    startY: number
  } | null>(null)

  const [resizingItem, setResizingItem] = useState<{
    id: string
    type: 'subtitle' | 'sfx' | 'audio' | 'overlay' | 'video' | 'media-overlay' | 'animation'
    edge: 'left' | 'right'
    originalStart: number
    originalEnd: number
    originalDuration: number
  } | null>(null)

  const [snapGuide, setSnapGuide] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [isDraggingToDelete, setIsDraggingToDelete] = useState(false)
  const [isOverBin, setIsOverBin] = useState(false)
  const [isAnalyzingTimeline, setIsAnalyzingTimeline] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<string>('')

  // Drag threshold in pixels - must move this far before starting drag
  const DRAG_THRESHOLD = 5

  // Snapping helper function
  const applySnapping = (time: number, excludeId?: string): number => {
    if (!snappingEnabled) {
      setSnapGuide(null)
      return time
    }

    const snapThreshold = 0.2 // 0.2 seconds snap distance
    let closestSnapPoint: number | null = null
    let minDistance = snapThreshold

    // Snap points to check
    const snapPoints: number[] = [
      0, // Timeline start
      currentTime, // Playhead
      duration, // Timeline end
    ]

    // Add all clip edges as snap points (excluding current clip)
    videoTimelineClips.forEach(clip => {
      if (clip.id !== excludeId) {
        snapPoints.push(clip.start)
        snapPoints.push(clip.start + clip.duration)
      }
    })

    sfxTracks.forEach(track => {
      if (track.id !== excludeId) {
        snapPoints.push(track.start)
        snapPoints.push(track.start + track.duration)
      }
    })

    audioTracks.forEach(track => {
      if (track.id !== excludeId) {
        snapPoints.push(track.start)
        snapPoints.push(track.start + track.duration)
      }
    })

    subtitles.forEach(subtitle => {
      if (subtitle.id !== excludeId) {
        snapPoints.push(subtitle.start)
        snapPoints.push(subtitle.end)
      }
    })

    textOverlays.forEach(overlay => {
      if (overlay.id !== excludeId) {
        snapPoints.push(overlay.start)
        snapPoints.push(overlay.end)
      }
    })

    mediaOverlays.forEach(overlay => {
      if (overlay.id !== excludeId) {
        snapPoints.push(overlay.start)
        snapPoints.push(overlay.start + overlay.duration)
      }
    })

    animationTracks.forEach(track => {
      if (track.id !== excludeId) {
        snapPoints.push(track.start)
        snapPoints.push(track.start + track.duration)
      }
    })

    // Find closest snap point
    snapPoints.forEach(snapPoint => {
      const distance = Math.abs(time - snapPoint)
      if (distance < minDistance) {
        minDistance = distance
        closestSnapPoint = snapPoint
      }
    })

    if (closestSnapPoint !== null) {
      setSnapGuide(closestSnapPoint)
      return closestSnapPoint
    } else {
      setSnapGuide(null)
      return time
    }
  }

  // Synchronize vertical scrolling between labels and scroll area
  // Use flag to prevent infinite loop
  const isScrollingSyncRef = useRef(false)

  const handleLabelsScroll = () => {
    if (isScrollingSyncRef.current) return
    if (labelsRef.current && scrollAreaRef.current) {
      isScrollingSyncRef.current = true
      scrollAreaRef.current.scrollTop = labelsRef.current.scrollTop
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false
      })
    }
  }

  const handleScrollAreaScroll = () => {
    if (isScrollingSyncRef.current) return
    if (labelsRef.current && scrollAreaRef.current) {
      isScrollingSyncRef.current = true
      labelsRef.current.scrollTop = scrollAreaRef.current.scrollTop
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false
      })
    }
  }

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

    // Clear selection when clicking on empty timeline
    clearSelection()

    // Clear potential drag (in case of click without drag)
    setPotentialDrag(null)
  }

  const handleTrackItemClick = (e: React.MouseEvent) => {
    // Prevent click from bubbling to timeline (which would clear selection)
    e.stopPropagation()
  }

  const handleTrackItemMouseDown = (
    e: React.MouseEvent,
    id: string,
    type: 'subtitle' | 'sfx' | 'audio' | 'overlay' | 'video' | 'media-overlay' | 'animation',
    itemWidth: number
  ) => {
    e.stopPropagation()
    e.preventDefault() // Prevent default drag behavior

    // Detect if clicking on edge (16px from left or right for easier grabbing)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const edgeThreshold = 16 // Increased for easier interaction

    const isLeftEdge = clickX <= edgeThreshold
    const isRightEdge = clickX >= rect.width - edgeThreshold

    // Handle edge resizing
    if (isLeftEdge || isRightEdge) {
      // Get original clip data
      let originalStart = 0
      let originalEnd = 0
      let originalDuration = 0

      if (type === 'video') {
        const clip = videoTimelineClips.find(c => c.id === id)
        if (clip) {
          originalStart = clip.start
          originalDuration = clip.duration
          originalEnd = originalStart + originalDuration
        }
      } else if (type === 'media-overlay') {
        const overlay = mediaOverlays.find(o => o.id === id)
        if (overlay) {
          originalStart = overlay.start
          originalDuration = overlay.duration
          originalEnd = originalStart + originalDuration
        }
      } else if (type === 'sfx') {
        const track = sfxTracks.find(t => t.id === id)
        if (track) {
          originalStart = track.start
          originalDuration = track.originalDuration  // Use max source duration
          originalEnd = originalStart + track.duration  // Current end position
        }
      } else if (type === 'audio') {
        const track = audioTracks.find(t => t.id === id)
        if (track) {
          originalStart = track.start
          originalDuration = track.originalDuration  // Use max source duration
          originalEnd = originalStart + track.duration  // Current end position
        }
      } else if (type === 'subtitle') {
        const subtitle = subtitles.find(s => s.id === id)
        if (subtitle) {
          originalStart = subtitle.start
          originalEnd = subtitle.end
          originalDuration = originalEnd - originalStart
        }
      } else if (type === 'overlay') {
        const overlay = textOverlays.find(o => o.id === id)
        if (overlay) {
          originalStart = overlay.start
          originalEnd = overlay.end
          originalDuration = originalEnd - originalStart
        }
      } else if (type === 'animation') {
        const track = animationTracks.find(t => t.id === id)
        if (track) {
          originalStart = track.start
          originalDuration = track.duration
          originalEnd = originalStart + originalDuration
        }
      }

      setResizingItem({
        id,
        type,
        edge: isLeftEdge ? 'left' : 'right',
        originalStart,
        originalEnd,
        originalDuration
      })
      selectClip(id, false) // Select the clip being resized
      return
    }

    // Handle selection: Cmd/Ctrl+click for multi-select, regular click for single select
    const isMultiSelect = e.metaKey || e.ctrlKey
    selectClip(id, isMultiSelect)

    // Set up potential drag (will only become actual drag if mouse moves beyond threshold)
    if (!isMultiSelect) {
      setPotentialDrag({
        id,
        type,
        startX: e.clientX,
        startY: e.clientY
      })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const sfxData = e.dataTransfer.getData('sfx-library-item')
    const videoClipData = e.dataTransfer.getData('video-clip')

    console.log('[Timeline] handleDrop called, videoClipData:', videoClipData)

    if (videoClipData) {
      try {
        const videoClip = JSON.parse(videoClipData)
        console.log('[Timeline] Parsed video clip:', videoClip)

        const rect = timelineRef.current?.getBoundingClientRect()
        if (rect) {
          const x = e.clientX - rect.left
          const dropTime = Math.max(0, x / pixelsPerSecond)

          // Create new video timeline clip from library clip
          const timelineClip: import('../context/ProjectContext').VideoTimelineClip = {
            id: `video-timeline-${Date.now()}`,
            videoClipId: videoClip.id,
            start: dropTime,
            duration: videoClip.duration,
            clipStart: 0,
            clipEnd: videoClip.duration
          }

          console.log('[Timeline] Adding timeline clip:', timelineClip)
          console.log('[Timeline] Current videoClips:', videoClips)
          addVideoToTimeline(timelineClip)
        }
      } catch (err) {
        console.error('Failed to parse dropped video clip:', err)
      }
    } else if (sfxData) {
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
            originalDuration: item.duration,  // Store original duration
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

  // Global mouse move handler for dragging and resizing
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return

      const rect = timelineRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const newTime = Math.max(0, Math.min(safeDuration, x / pixelsPerSecond))

      // Check if we should convert potential drag to actual drag
      if (potentialDrag && !draggedItem) {
        const deltaX = Math.abs(e.clientX - potentialDrag.startX)
        const deltaY = Math.abs(e.clientY - potentialDrag.startY)
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

        // Only start dragging if moved beyond threshold
        if (distance > DRAG_THRESHOLD) {
          // Get original start time for the dragged item
          let originalStart = 0
          if (potentialDrag.type === 'video') {
            const clip = videoTimelineClips.find(c => c.id === potentialDrag.id)
            if (clip) originalStart = clip.start
          } else if (potentialDrag.type === 'media-overlay') {
            const overlay = mediaOverlays.find(o => o.id === potentialDrag.id)
            if (overlay) originalStart = overlay.start
          } else if (potentialDrag.type === 'sfx') {
            const track = sfxTracks.find(t => t.id === potentialDrag.id)
            if (track) originalStart = track.start
          } else if (potentialDrag.type === 'audio') {
            const track = audioTracks.find(t => t.id === potentialDrag.id)
            if (track) originalStart = track.start
          } else if (potentialDrag.type === 'subtitle') {
            const subtitle = subtitles.find(s => s.id === potentialDrag.id)
            if (subtitle) originalStart = subtitle.start
          } else if (potentialDrag.type === 'overlay') {
            const overlay = textOverlays.find(o => o.id === potentialDrag.id)
            if (overlay) originalStart = overlay.start
          } else if (potentialDrag.type === 'animation') {
            const track = animationTracks.find(t => t.id === potentialDrag.id)
            if (track) originalStart = track.start
          }

          setDraggedItem({
            id: potentialDrag.id,
            type: potentialDrag.type,
            startX: e.clientX,
            originalStart
          })
          setPotentialDrag(null)
          setIsDraggingToDelete(false)
        }
      }

      // Handle resizing
      if (resizingItem) {
        const minDuration = 0.1 // Minimum 0.1 second clip duration

        if (resizingItem.edge === 'left') {
          // Trim from start - adjust start time while keeping end fixed
          const maxStart = resizingItem.originalEnd - minDuration
          let newStart = Math.max(0, Math.min(newTime, maxStart))

          // Apply snapping
          newStart = applySnapping(newStart, resizingItem.id)

          const newDuration = resizingItem.originalEnd - newStart

          if (resizingItem.type === 'video') {
            const clip = videoTimelineClips.find(c => c.id === resizingItem.id)
            if (clip) {
              const sourceClip = videoClips.find(v => v.id === clip.videoClipId)
              if (sourceClip) {
                const trimAmount = resizingItem.originalStart - newStart
                const newClipStart = Math.max(0, clip.clipStart - trimAmount)
                updateVideoTimelineClip(resizingItem.id, {
                  start: newStart,
                  duration: newDuration,
                  clipStart: newClipStart
                })
              }
            }
          } else if (resizingItem.type === 'media-overlay') {
            updateMediaOverlay(resizingItem.id, {
              start: newStart,
              duration: newDuration
            })
          } else if (resizingItem.type === 'sfx') {
            // When trimming from left, we need to adjust the clip offset in the source file
            const track = sfxTracks.find(t => t.id === resizingItem.id)
            if (track) {
              const trimAmount = newStart - resizingItem.originalStart
              const newClipStart = Math.max(0, (track.clipStart || 0) + trimAmount)

              // Constrain duration to not exceed remaining source duration
              const remainingSourceDuration = resizingItem.originalDuration - newClipStart
              const constrainedDuration = Math.min(newDuration, remainingSourceDuration)

              updateSFXTrack(resizingItem.id, {
                start: newStart,
                duration: constrainedDuration,
                clipStart: newClipStart
              })
            }
          } else if (resizingItem.type === 'audio') {
            // When trimming from left, we need to adjust the clip offset in the source file
            const track = audioTracks.find(t => t.id === resizingItem.id)
            if (track) {
              const trimAmount = newStart - resizingItem.originalStart
              const newClipStart = Math.max(0, (track.clipStart || 0) + trimAmount)

              // Constrain duration to not exceed remaining source duration
              const remainingSourceDuration = resizingItem.originalDuration - newClipStart
              const constrainedDuration = Math.min(newDuration, remainingSourceDuration)

              updateAudioTrack(resizingItem.id, {
                start: newStart,
                duration: constrainedDuration,
                clipStart: newClipStart
              })
            }
          } else if (resizingItem.type === 'subtitle') {
            updateSubtitle(resizingItem.id, {
              start: newStart,
              end: resizingItem.originalEnd
            })
          } else if (resizingItem.type === 'overlay') {
            updateTextOverlay(resizingItem.id, {
              start: newStart,
              end: resizingItem.originalEnd
            })
          } else if (resizingItem.type === 'animation') {
            const newDuration = resizingItem.originalEnd - newStart
            updateAnimationTrack(resizingItem.id, {
              start: newStart,
              duration: newDuration
            })
          }
        } else if (resizingItem.edge === 'right') {
          // Trim from end - adjust end time while keeping start fixed
          const minEnd = resizingItem.originalStart + minDuration
          let newEnd = Math.max(minEnd, Math.min(newTime, safeDuration))

          // Apply snapping
          newEnd = applySnapping(newEnd, resizingItem.id)

          const newDuration = newEnd - resizingItem.originalStart

          if (resizingItem.type === 'video') {
            const clip = videoTimelineClips.find(c => c.id === resizingItem.id)
            if (clip) {
              const sourceClip = videoClips.find(v => v.id === clip.videoClipId)
              if (sourceClip) {
                const newClipEnd = Math.min(sourceClip.duration, clip.clipStart + newDuration)
                updateVideoTimelineClip(resizingItem.id, {
                  duration: newDuration,
                  clipEnd: newClipEnd
                })
              }
            }
          } else if (resizingItem.type === 'media-overlay') {
            updateMediaOverlay(resizingItem.id, {
              duration: newDuration
            })
          } else if (resizingItem.type === 'sfx') {
            // When trimming from right, adjust the clip end point
            const track = sfxTracks.find(t => t.id === resizingItem.id)
            if (track) {
              const clipStart = track.clipStart || 0
              const newClipEnd = Math.min(resizingItem.originalDuration, clipStart + newDuration)
              const constrainedDuration = newClipEnd - clipStart

              updateSFXTrack(resizingItem.id, {
                duration: constrainedDuration,
                clipEnd: newClipEnd
              })
            }
          } else if (resizingItem.type === 'audio') {
            // When trimming from right, adjust the clip end point
            const track = audioTracks.find(t => t.id === resizingItem.id)
            if (track) {
              const clipStart = track.clipStart || 0
              const newClipEnd = Math.min(resizingItem.originalDuration, clipStart + newDuration)
              const constrainedDuration = newClipEnd - clipStart

              updateAudioTrack(resizingItem.id, {
                duration: constrainedDuration,
                clipEnd: newClipEnd
              })
            }
          } else if (resizingItem.type === 'subtitle') {
            updateSubtitle(resizingItem.id, {
              end: newEnd
            })
          } else if (resizingItem.type === 'overlay') {
            updateTextOverlay(resizingItem.id, {
              end: newEnd
            })
          } else if (resizingItem.type === 'animation') {
            const newDuration = newEnd - resizingItem.originalStart
            updateAnimationTrack(resizingItem.id, {
              duration: newDuration
            })
          }
        }
        return
      }

      // Handle dragging
      if (draggedItem) {
        // Check if dragging over delete zone
        const deleteZone = document.querySelector('.delete-drop-zone')
        if (deleteZone) {
          const deleteRect = deleteZone.getBoundingClientRect()
          const isOver = (
            e.clientX >= deleteRect.left &&
            e.clientX <= deleteRect.right &&
            e.clientY >= deleteRect.top &&
            e.clientY <= deleteRect.bottom
          )
          setIsOverBin(isOver)
          setIsDraggingToDelete(true)

          if (isOver) {
            // If over bin, don't move the clip on timeline, just show it's ready to delete
            return
          }
        }

        // Calculate new start time based on mouse delta
        const deltaX = e.clientX - draggedItem.startX
        const deltaTime = deltaX / pixelsPerSecond
        const proposedTime = draggedItem.originalStart + deltaTime

        // Constrain to timeline boundaries (0 to safeDuration)
        const constrainedTime = Math.max(0, Math.min(proposedTime, safeDuration))

        // Apply snapping to constrained drag position
        const snappedTime = applySnapping(constrainedTime, draggedItem.id)

        // Update the position based on item type
        if (draggedItem.type === 'video') {
          const clip = videoTimelineClips.find(c => c.id === draggedItem.id)
          if (clip) {
            // Ensure clip doesn't extend beyond timeline
            const maxStart = safeDuration - clip.duration
            const finalStart = Math.max(0, Math.min(snappedTime, maxStart))
            updateVideoTimelineClip(draggedItem.id, { start: finalStart })
          }
        } else if (draggedItem.type === 'media-overlay') {
          const overlay = mediaOverlays.find(o => o.id === draggedItem.id)
          if (overlay) {
            const maxStart = safeDuration - overlay.duration
            const finalStart = Math.max(0, Math.min(snappedTime, maxStart))
            updateMediaOverlay(draggedItem.id, { start: finalStart })
          }
        } else if (draggedItem.type === 'sfx') {
          const track = sfxTracks.find(t => t.id === draggedItem.id)
          if (track) {
            const maxStart = safeDuration - track.duration
            const finalStart = Math.max(0, Math.min(snappedTime, maxStart))
            updateSFXTrack(draggedItem.id, { start: finalStart })
          }
        } else if (draggedItem.type === 'audio') {
          const track = audioTracks.find(t => t.id === draggedItem.id)
          if (track) {
            const maxStart = safeDuration - track.duration
            const finalStart = Math.max(0, Math.min(snappedTime, maxStart))
            updateAudioTrack(draggedItem.id, { start: finalStart })
          }
        } else if (draggedItem.type === 'subtitle') {
          const subtitle = subtitles.find(s => s.id === draggedItem.id)
          if (subtitle) {
            const duration = subtitle.end - subtitle.start
            const maxStart = safeDuration - duration
            const finalStart = Math.max(0, Math.min(snappedTime, maxStart))
            updateSubtitle(draggedItem.id, {
              start: finalStart,
              end: finalStart + duration
            })
          }
        } else if (draggedItem.type === 'overlay') {
          const overlay = textOverlays.find(o => o.id === draggedItem.id)
          if (overlay) {
            const duration = overlay.end - overlay.start
            const maxStart = safeDuration - duration
            const finalStart = Math.max(0, Math.min(snappedTime, maxStart))
            updateTextOverlay(draggedItem.id, {
              start: finalStart,
              end: finalStart + duration
            })
          }
        } else if (draggedItem.type === 'animation') {
          const track = animationTracks.find(t => t.id === draggedItem.id)
          if (track) {
            const maxStart = safeDuration - track.duration
            const finalStart = Math.max(0, Math.min(snappedTime, maxStart))
            updateAnimationTrack(draggedItem.id, { start: finalStart })
          }
        }
      }
    }

    const handleWindowMouseUp = (e: MouseEvent) => {
      // Check if dropped on bin for deletion
      if (isDraggingToDelete && isOverBin && draggedItem) {
        // Delete the item
        if (draggedItem.type === 'video') {
          deleteVideoTimelineClip(draggedItem.id)
        } else if (draggedItem.type === 'media-overlay') {
          deleteMediaOverlay(draggedItem.id)
        } else if (draggedItem.type === 'sfx') {
          deleteSFXTrack(draggedItem.id)
        } else if (draggedItem.type === 'audio') {
          deleteAudioTrack(draggedItem.id)
        } else if (draggedItem.type === 'subtitle') {
          deleteSubtitle(draggedItem.id)
        } else if (draggedItem.type === 'overlay') {
          deleteTextOverlay(draggedItem.id)
        } else if (draggedItem.type === 'animation') {
          deleteAnimationTrack(draggedItem.id)
        }
      }

      // Reset all drag/resize states
      setDraggedItem(null)
      setPotentialDrag(null) // Clear potential drag
      setResizingItem(null)
      // Always clear snap guide when mouse is released
      setSnapGuide(null)
      setIsDraggingToDelete(false)
      setIsOverBin(false)
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [
    draggedItem,
    potentialDrag,
    resizingItem,
    isDraggingToDelete,
    isOverBin,
    safeDuration,
    pixelsPerSecond,
    videoTimelineClips,
    mediaOverlays,
    sfxTracks,
    audioTracks,
    subtitles,
    textOverlays,
    animationTracks,
    videoClips,
    applySnapping,
    updateVideoTimelineClip,
    updateMediaOverlay,
    updateSFXTrack,
    updateAudioTrack,
    updateSubtitle,
    updateTextOverlay,
    updateAnimationTrack,
    deleteVideoTimelineClip,
    deleteMediaOverlay,
    deleteSFXTrack,
    deleteAudioTrack,
    deleteSubtitle,
    deleteTextOverlay,
    deleteAnimationTrack
  ])

  // Split the selected clip at playhead position
  const handleSplitAtPlayhead = () => {
    // Must have exactly one clip selected
    if (selectedClipIds.length !== 1) return

    const selectedId = selectedClipIds[0]

    // Try to find in Video clips
    const videoClip = videoTimelineClips.find(c => c.id === selectedId)
    if (videoClip) {
      const playheadRelativePos = currentTime - videoClip.start
      // Check if playhead is within the selected track bounds with margin
      if (playheadRelativePos > 0.2 && playheadRelativePos < (videoClip.duration - 0.2)) {
        splitVideoTimelineClip(selectedId, currentTime)
      }
      return
    }

    // Try to find in SFX tracks
    const sfx = sfxTracks.find(t => t.id === selectedId)
    if (sfx) {
      const playheadRelativePos = currentTime - sfx.start
      // Check if playhead is within the selected track bounds with margin
      if (playheadRelativePos > 0.2 && playheadRelativePos < (sfx.duration - 0.2)) {
        splitSFXTrack(selectedId, currentTime)
      }
      return
    }

    // Try to find in audio tracks
    const audio = audioTracks.find(t => t.id === selectedId)
    if (audio) {
      const playheadRelativePos = currentTime - audio.start
      // Check if playhead is within the selected track bounds with margin
      if (playheadRelativePos > 0.2 && playheadRelativePos < (audio.duration - 0.2)) {
        splitAudioTrack(selectedId, currentTime)
      }
      return
    }
  }

  // Check if split button should be enabled
  // Requires: exactly 1 clip selected AND playhead over that clip
  const canSplitAtPlayhead = () => {
    if (selectedClipIds.length !== 1) return false

    const selectedId = selectedClipIds[0]

    // Check if selected clip is a Video clip
    const videoClip = videoTimelineClips.find(c => c.id === selectedId)
    if (videoClip) {
      const playheadRelativePos = currentTime - videoClip.start
      return playheadRelativePos > 0.2 && playheadRelativePos < (videoClip.duration - 0.2)
    }

    // Check if selected clip is an SFX track
    const sfx = sfxTracks.find(t => t.id === selectedId)
    if (sfx) {
      const playheadRelativePos = currentTime - sfx.start
      return playheadRelativePos > 0.2 && playheadRelativePos < (sfx.duration - 0.2)
    }

    // Check if selected clip is an audio track
    const audio = audioTracks.find(t => t.id === selectedId)
    if (audio) {
      const playheadRelativePos = currentTime - audio.start
      return playheadRelativePos > 0.2 && playheadRelativePos < (audio.duration - 0.2)
    }

    return false
  }

  // Analyze the entire timeline composition
  const handleAnalyzeTimeline = async () => {
    if (videoTimelineClips.length === 0) {
      alert('Please add video clips to the timeline first')
      return
    }

    setIsAnalyzingTimeline(true)
    setAnalysisProgress('Preparing timeline export...')

    try {
      // Step 1: Create timeline composition data
      const timelineComposition = videoTimelineClips.map(clip => {
        const sourceClip = videoClips.find(v => v.id === clip.videoClipId)
        if (!sourceClip) return null

        return {
          videoPath: sourceClip.path,
          start: clip.start,
          duration: clip.duration,
          clipStart: clip.clipStart,
          clipEnd: clip.clipEnd
        }
      }).filter(Boolean)

      setAnalysisProgress('Generating timeline preview...')

      // Step 2: Call backend to analyze timeline
      const result = await window.electronAPI.analyzeTimeline(timelineComposition)

      setAnalysisProgress('Processing analysis results...')

      // Step 3: Map results to timeline
      // The backend returns results with timestamps relative to timeline start (0)
      // These can be directly used as they match our timeline positions

      // Save analysis results to global state so Auto-Generate button works
      // Clear unifiedAnalysis so timeline analysis takes priority in UI
      if (result.success) {
        setUnifiedAnalysis(null)  // Clear old "Analyze Video" results
        setAnalysis({
          scenes: [],
          suggestedSFX: result.suggestedSFX || [],
          transcription: (result.subtitles || []).map((sub: any) => ({
            text: sub.text,
            start: sub.start,
            end: sub.end,
            confidence: 1.0  // Timeline analysis doesn't provide confidence, default to 1.0
          }))
        })
      }

      let addedCount = 0

      if (result.subtitles && result.subtitles.length > 0) {
        // Import subtitles as captions on the timeline
        result.subtitles.forEach((subtitle: any) => {
          const newSubtitle = {
            id: `subtitle-timeline-${Date.now()}-${Math.random()}`,
            text: subtitle.text,
            start: subtitle.start,
            end: subtitle.end,
            style: {
              fontSize: 48,
              fontFamily: 'Arial',
              color: '#FFFFFF',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              position: 'bottom' as const
            }
          }
          addSubtitle(newSubtitle)
          addedCount++
        })
      }

      // Note: SFX suggestions are stored in analysis for manual review
      // Users can click suggestions to add them to timeline

      const message = addedCount > 0
        ? `Added ${addedCount} captions from timeline!`
        : 'Timeline analyzed - no captions found'

      setAnalysisProgress(message)
      setTimeout(() => {
        setAnalysisProgress('')
        setIsAnalyzingTimeline(false)
      }, 3000)

    } catch (error) {
      console.error('Timeline analysis error:', error)
      setAnalysisProgress('Analysis failed')
      setTimeout(() => {
        setAnalysisProgress('')
        setIsAnalyzingTimeline(false)
      }, 3000)
    }
  }

  // Bin drop zone handlers
  const handleBinDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsOverBin(true)
  }

  const handleBinDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOverBin(false)
  }

  // Note: handleBinDrop is no longer needed as we handle drop in the global mouseUp handler
  // But we keep the visual feedback in the render

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

      {/* Editing Toolbar */}
      <div className="timeline-toolbar">
        <div className="toolbar-section">
          <button
            className="toolbar-btn"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Cmd/Ctrl+Z)"
          >
            <Undo2 size={16} />
            <span>Undo</span>
          </button>
          <button
            className="toolbar-btn"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Cmd/Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
            <span>Redo</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        {unifiedAnalysis?.cut_suggestions && unifiedAnalysis.cut_suggestions.length > 0 && (
          <div className="toolbar-section">
            <button
              className="toolbar-btn"
              onClick={applySilenceRemoval}
              title={`Remove ${unifiedAnalysis.cut_suggestions.length} silence gaps`}
              style={{ background: '#ff4d4d20', borderColor: '#ff4d4d' }}
            >
              <Scissors size={16} />
              <span>Remove Silence ({unifiedAnalysis.cut_suggestions.length})</span>
            </button>
          </div>
        )}

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button
            className={`toolbar-btn delete-drop-zone ${isOverBin ? 'drop-active' : ''} ${isDraggingToDelete ? 'drop-ready' : ''}`}
            onClick={deleteSelectedClips}
            disabled={selectedClipIds.length === 0 && !isDraggingToDelete}
            title={isDraggingToDelete ? "Drop here to delete" : "Delete Selected (Delete/Backspace)"}
            onDragOver={handleBinDragOver}
            onDragLeave={handleBinDragLeave}
          >
            <Trash2 size={16} />
            <span>{isOverBin ? 'Drop to Delete' : 'Delete'}</span>
          </button>
          <button
            className="toolbar-btn"
            onClick={handleSplitAtPlayhead}
            disabled={!canSplitAtPlayhead()}
            title="Split clip at playhead (S) - Select a clip, then position playhead over it"
          >
            <Scissors size={16} />
            <span>Split</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button
            className={`toolbar-btn ${snappingEnabled ? 'active' : ''}`}
            onClick={toggleSnapping}
            title="Toggle Snapping (S)"
          >
            <Magnet size={16} />
            <span>Snap</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button
            className={`toolbar-btn ${isAnalyzingTimeline ? 'analyzing' : ''}`}
            onClick={handleAnalyzeTimeline}
            disabled={isAnalyzingTimeline || videoTimelineClips.length === 0}
            title="Analyze timeline composition - Generate captions and SFX for your edit"
          >
            <Sparkles size={16} />
            <span>{isAnalyzingTimeline ? analysisProgress : 'Analyze Timeline'}</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <div className="toolbar-info">
            <Hand size={14} />
            <span className="toolbar-hint">Click to select • Hover edges to trim • Select clip + position playhead to Split • Drag to Delete to remove</span>
          </div>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div className="timeline-main">
        {/* Fixed Left Column - Track Labels */}
        <div className="timeline-labels" ref={labelsRef} onScroll={handleLabelsScroll}>
          {/* Spacer to align with time ruler */}
          <div className="timeline-labels-spacer" />

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

          {/* Media Overlay Track Label */}
          <div className="track-label">
            <span className="track-icon"><Image size={16} /></span>
            <span className="track-name">Media Overlays</span>
            <div className="track-controls">
              <button className="track-btn" title="Toggle visibility"><Eye size={14} /></button>
              <button className="track-btn" title="Lock track"><Lock size={14} /></button>
            </div>
          </div>

          {/* Animation Track Label */}
          <div className="track-label">
            <span className="track-icon"><Sparkles size={16} /></span>
            <span className="track-name">Animations</span>
            <div className="track-controls">
              <button className="track-btn" title="Toggle visibility"><Eye size={14} /></button>
              <button className="track-btn" title="Lock track"><Lock size={14} /></button>
            </div>
          </div>
        </div>

        {/* Scrollable Right Column - Timeline Content */}
        <div className="timeline-scroll-area" ref={scrollAreaRef} onScroll={handleScrollAreaScroll}>
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
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {/* Playhead line */}
            <div
              className="playhead-line"
              style={{ left: `${playheadPosition}px` }}
            />

            {/* Snap guide line */}
            {snapGuide !== null && (
              <div
                className="snap-guide-line"
                style={{ left: `${snapGuide * pixelsPerSecond}px` }}
              />
            )}

            {/* Video Track */}
            <div className="track video-track">
              <div className="track-content">
                {/* Show main video if loaded and no timeline clips */}
                {videoPath && videoTimelineClips.length === 0 ? (
                  <div
                    className="track-item video-clip main-video"
                    style={{
                      left: '0px',
                      width: `${safeDuration * pixelsPerSecond}px`
                    }}
                    title="Main Video"
                  >
                    <div className="item-content">
                      <span className="item-icon"><Film size={14} /></span>
                      <span className="item-label">Main Video</span>
                    </div>
                  </div>
                ) : videoTimelineClips.length === 0 ? (
                  <div className="empty-track-message">
                    Drag video clips from Media Bin to add them to timeline
                  </div>
                ) : (
                  videoTimelineClips.map(clip => {
                    const sourceClip = videoClips.find(v => v.id === clip.videoClipId)
                    if (!sourceClip) {
                      console.error('[Timeline Render] Could not find source clip for videoClipId:', clip.videoClipId, 'Available clips:', videoClips.map(v => v.id))
                      return null
                    }

                    const startPos = clip.start * pixelsPerSecond
                    const width = clip.duration * pixelsPerSecond
                    const displayWidth = Math.max(width, 60)
                    const isResizing = resizingItem?.id === clip.id
                    const resizingClass = isResizing ? `resizing-${resizingItem.edge}` : ''

                    return (
                      <div
                        key={clip.id}
                        className={`track-item video-clip ${draggedItem?.id === clip.id ? 'dragging' : ''} ${selectedClipIds.includes(clip.id) ? 'selected' : ''} ${resizingClass}`}
                        style={{
                          left: `${startPos}px`,
                          width: `${displayWidth}px`
                        }}
                        onClick={handleTrackItemClick}
                        onMouseDown={(e) => handleTrackItemMouseDown(e, clip.id, 'video', displayWidth)}
                        title={`${sourceClip.name} - ${clip.start.toFixed(2)}s`}
                      >
                        <div className="item-content">
                          <span className="item-icon"><Film size={14} /></span>
                          <span className="item-label">{sourceClip.name}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Original Audio Track - Now editable */}
            <div className="track audio-track">
              <div className="track-content">
                {audioTracks.length > 0 ? (
                  audioTracks.map(audio => {
                    const startPos = audio.start * pixelsPerSecond
                    const width = audio.duration * pixelsPerSecond
                    const displayWidth = Math.max(width, 60)
                    const isResizing = resizingItem?.id === audio.id
                    const resizingClass = isResizing ? `resizing-${resizingItem.edge}` : ''
                    const isSelected = selectedClipIds.includes(audio.id)

                    return (
                      <div
                        key={audio.id}
                        className={`track-item audio-item ${draggedItem?.id === audio.id ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${resizingClass}`}
                        style={{
                          left: `${startPos}px`,
                          width: `${displayWidth}px`,
                          height: '60px'
                        }}
                        onClick={handleTrackItemClick}
                        onMouseDown={(e) => handleTrackItemMouseDown(e, audio.id, 'audio', displayWidth)}
                        title={`Original Audio - ${audio.start.toFixed(2)}s`}
                      >
                        <div className="item-content">
                          <span className="item-icon"><Volume2 size={14} /></span>
                          <span className="clip-label">Original Audio</span>
                        </div>
                        <div className="waveform"></div>
                      </div>
                    )
                  })
                ) : originalAudioPath ? (
                  <div className="empty-track-message">
                    Loading audio track...
                  </div>
                ) : (
                  <div className="empty-track-message">
                    No audio track (video may be silent)
                  </div>
                )}
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
                  {sfxSuggestions.map((suggestion, index) => {
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
                      const displayWidth = Math.max(width, 60)
                      const isResizing = resizingItem?.id === sfx.id
                      const resizingClass = isResizing ? `resizing-${resizingItem.edge}` : ''
                      const isSelected = selectedClipIds.includes(sfx.id)

                      return (
                        <div
                          key={sfx.id}
                          className={`track-item sfx-item ${draggedItem?.id === sfx.id ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${resizingClass}`}
                          style={{
                            left: `${startPos}px`,
                            width: `${displayWidth}px`
                          }}
                          onClick={handleTrackItemClick}
                          onMouseDown={(e) => handleTrackItemMouseDown(e, sfx.id, 'sfx', displayWidth)}
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
                    {laneIndex === 0 && sfxSuggestions.map((suggestion, index) => {
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
                  const displayWidth = Math.max(width, 40)
                  const isResizing = resizingItem?.id === subtitle.id
                  const resizingClass = isResizing ? `resizing-${resizingItem.edge}` : ''

                  return (
                    <div
                      key={subtitle.id}
                      className={`track-item subtitle-item ${draggedItem?.id === subtitle.id ? 'dragging' : ''} ${selectedClipIds.includes(subtitle.id) ? 'selected' : ''} ${resizingClass}`}
                      style={{
                        left: `${startPos}px`,
                        width: `${displayWidth}px`
                      }}
                      onClick={handleTrackItemClick}
                      onMouseDown={(e) => handleTrackItemMouseDown(e, subtitle.id, 'subtitle', displayWidth)}
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
                  const displayWidth = Math.max(width, 40)
                  const isResizing = resizingItem?.id === overlay.id
                  const resizingClass = isResizing ? `resizing-${resizingItem.edge}` : ''

                  return (
                    <div
                      key={overlay.id}
                      className={`track-item overlay-item ${draggedItem?.id === overlay.id ? 'dragging' : ''} ${selectedClipIds.includes(overlay.id) ? 'selected' : ''} ${resizingClass}`}
                      style={{
                        left: `${startPos}px`,
                        width: `${displayWidth}px`
                      }}
                      onClick={handleTrackItemClick}
                      onMouseDown={(e) => handleTrackItemMouseDown(e, overlay.id, 'overlay', displayWidth)}
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

            {/* Media Overlay Track */}
            <div className="track media-overlay-track">
              <div className="track-content">
                {mediaOverlays.length === 0 ? (
                  <div className="empty-track-message">
                    Drag overlay media from Overlays tab or drop directly on video
                  </div>
                ) : (
                  mediaOverlays.map(overlay => {
                    const asset = mediaOverlayAssets.find(a => a.id === overlay.assetId)
                    if (!asset) return null

                    const startPos = overlay.start * pixelsPerSecond
                    const width = overlay.duration * pixelsPerSecond
                    const displayWidth = Math.max(width, 60)
                    const isResizing = resizingItem?.id === overlay.id
                    const resizingClass = isResizing ? `resizing-${resizingItem.edge}` : ''

                    return (
                      <div
                        key={overlay.id}
                        className={`track-item media-overlay-item ${draggedItem?.id === overlay.id ? 'dragging' : ''} ${selectedClipIds.includes(overlay.id) ? 'selected' : ''} ${resizingClass}`}
                        style={{
                          left: `${startPos}px`,
                          width: `${displayWidth}px`
                        }}
                        onClick={handleTrackItemClick}
                        onMouseDown={(e) => handleTrackItemMouseDown(e, overlay.id, 'media-overlay', displayWidth)}
                        title={`${asset.name} - ${overlay.start.toFixed(2)}s`}
                      >
                        <div className="item-content">
                          <span className="item-icon">
                            {asset.type === 'image' ? <Image size={14} /> : <Film size={14} />}
                          </span>
                          <span className="item-label">{asset.name}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Animation Track */}
            <div className="track animation-track">
              <div className="track-content">
                {animationTracks.length === 0 ? (
                  <div className="empty-track-message">
                    Add Lottie animations from Animations tab
                  </div>
                ) : (
                  animationTracks.map(track => {
                    const startPos = track.start * pixelsPerSecond
                    const width = track.duration * pixelsPerSecond
                    const displayWidth = Math.max(width, 60)
                    const isResizing = resizingItem?.id === track.id
                    const resizingClass = isResizing ? `resizing-${resizingItem.edge}` : ''

                    return (
                      <div
                        key={track.id}
                        className={`track-item animation-item ${draggedItem?.id === track.id ? 'dragging' : ''} ${selectedClipIds.includes(track.id) ? 'selected' : ''} ${resizingClass}`}
                        style={{
                          left: `${startPos}px`,
                          width: `${displayWidth}px`
                        }}
                        onClick={handleTrackItemClick}
                        onMouseDown={(e) => handleTrackItemMouseDown(e, track.id, 'animation', displayWidth)}
                        title={`${track.name} - ${track.start.toFixed(2)}s`}
                      >
                        <div className="item-content">
                          <span className="item-icon"><Sparkles size={14} /></span>
                          <span className="item-label">{track.name}</span>
                        </div>
                      </div>
                    )
                  })
                )}

                {/* AI Animation Suggestions */}
                {animationSuggestions.map((suggestion, index) => {
                  const position = suggestion.timestamp * pixelsPerSecond
                  return (
                    <div
                      key={`anim-sugg-${index}`}
                      className="animation-suggestion"
                      style={{ left: `${position}px` }}
                      title={`Suggested: ${suggestion.category} (${suggestion.reason})`}
                    />
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