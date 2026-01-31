import { useRef, useState, useCallback, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import { VideoClip, Transition, projectsApi } from '../api'
import {
  Film, Volume2, MessageSquare, Type, Eye, EyeOff, Lock, Unlock, Music,
  Trash2, ZoomIn, ZoomOut, Scissors, Copy, Play, Square,
  SkipBack, SkipForward, ArrowRightLeft, ChevronsLeft, ChevronsRight
} from 'lucide-react'
import './Timeline.css'

interface DragState {
  id: number
  type: 'subtitle' | 'sfx' | 'overlay' | 'clip'
  mode: 'move' | 'resize-start' | 'resize-end' | 'trim-start' | 'trim-end'
  startX: number
  originalStart: number
  originalEnd: number
  originalTrimStart?: number
  originalTrimEnd?: number
}

interface Selection {
  id: number
  type: 'subtitle' | 'sfx' | 'overlay' | 'clip'
}

interface IntroOutroEffect {
  type: string
  duration: number
}

interface TimelineProps {
  videoClips?: VideoClip[]
  onClipsChange?: (clips: VideoClip[]) => void
  projectId?: number
  transitions?: Transition[]
  onTransitionClick?: (fromClipId: number, toClipId: number, existingTransition?: Transition) => void
  introEffect?: IntroOutroEffect | null
  outroEffect?: IntroOutroEffect | null
  onIntroEffectClick?: () => void
  onOutroEffectClick?: () => void
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

export default function Timeline({
  videoClips = [],
  onClipsChange,
  projectId,
  transitions = [],
  onTransitionClick,
  introEffect,
  outroEffect,
  onIntroEffectClick,
  onOutroEffectClick
}: TimelineProps) {
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
  // Clipboard for copy/paste (future feature)
  const [, setClipboard] = useState<{ type: string; data: unknown } | null>(null)
  const [trackVisibility, setTrackVisibility] = useState<TrackVisibility>({
    video: true, audio: true, subtitles: true, overlays: true
  })
  const [trackLock, setTrackLock] = useState<TrackLock>({
    video: false, audio: false, subtitles: false, overlays: false
  })
  // Clip reorder drag state
  const [clipDragState, setClipDragState] = useState<{
    draggedId: number | null
    dragOverId: number | null
    dragOverPosition: 'before' | 'after' | null
  }>({ draggedId: null, dragOverId: null, dragOverPosition: null })

  // Sort clips by timeline order
  const sortedClips = [...videoClips].sort((a, b) => a.timeline_order - b.timeline_order)

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

  // Calculate clip timeline position
  const getClipTimelinePosition = (clip: VideoClip) => {
    let position = 0
    for (const c of sortedClips) {
      if (c.id === clip.id) break
      position += (c.duration || 0) - c.start_trim - c.end_trim
    }
    return position
  }

  // Get effective clip duration after trimming
  const getClipEffectiveDuration = (clip: VideoClip) => {
    return (clip.duration || 0) - clip.start_trim - clip.end_trim
  }

  // Get clip at current playhead position
  const getClipAtPlayhead = useCallback(() => {
    let position = 0
    for (const clip of sortedClips) {
      const clipDuration = getClipEffectiveDuration(clip)
      if (currentTime >= position && currentTime < position + clipDuration) {
        return { clip, position, clipTime: currentTime - position + clip.start_trim }
      }
      position += clipDuration
    }
    return null
  }, [sortedClips, currentTime, getClipEffectiveDuration])

  // Split clip at current playhead position
  const handleSplitAtPlayhead = async () => {
    if (!projectId || sortedClips.length === 0) return

    const clipInfo = getClipAtPlayhead()
    if (!clipInfo) return

    const { clip, clipTime } = clipInfo

    // Trim the current clip to end at playhead
    const newEndTrim = (clip.duration || 0) - clipTime

    try {
      await projectsApi.updateClip(projectId, clip.id, {
        end_trim: newEndTrim
      })
      // Refresh clips
      const res = await projectsApi.listClips(projectId)
      onClipsChange?.(res.data)
    } catch (error) {
      console.error('Failed to split clip:', error)
    }
  }

  // Trim clip start to playhead (Set In Point)
  const handleSetInPoint = async () => {
    if (!projectId) return

    // If a clip is selected, trim its start
    if (selection?.type === 'clip') {
      const clip = sortedClips.find(c => c.id === selection.id)
      if (!clip) return

      // Get the clip's position on timeline
      let clipStartPosition = 0
      for (const c of sortedClips) {
        if (c.id === clip.id) break
        clipStartPosition += getClipEffectiveDuration(c)
      }

      // Calculate new start trim
      if (currentTime > clipStartPosition) {
        const newStartTrim = clip.start_trim + (currentTime - clipStartPosition)
        // Don't trim past the end
        if (newStartTrim < (clip.duration || 0) - clip.end_trim - 0.1) {
          await updateClipTrim(clip.id, { start_trim: newStartTrim })
        }
      }
    } else {
      // If no selection, trim the clip at playhead
      const clipInfo = getClipAtPlayhead()
      if (clipInfo) {
        const { clip, clipTime } = clipInfo
        const newStartTrim = clipTime
        if (newStartTrim < (clip.duration || 0) - clip.end_trim - 0.1) {
          await updateClipTrim(clip.id, { start_trim: newStartTrim })
        }
      }
    }
  }

  // Trim clip end to playhead (Set Out Point)
  const handleSetOutPoint = async () => {
    if (!projectId) return

    // If a clip is selected, trim its end
    if (selection?.type === 'clip') {
      const clip = sortedClips.find(c => c.id === selection.id)
      if (!clip) return

      // Get the clip's position on timeline
      let clipStartPosition = 0
      for (const c of sortedClips) {
        if (c.id === clip.id) break
        clipStartPosition += getClipEffectiveDuration(c)
      }

      const clipEndPosition = clipStartPosition + getClipEffectiveDuration(clip)

      // Calculate new end trim
      if (currentTime < clipEndPosition && currentTime > clipStartPosition) {
        const timeIntoClip = currentTime - clipStartPosition
        const newEndTrim = (clip.duration || 0) - clip.start_trim - timeIntoClip
        if (newEndTrim >= 0) {
          await updateClipTrim(clip.id, { end_trim: newEndTrim })
        }
      }
    } else {
      // If no selection, trim the clip at playhead
      const clipInfo = getClipAtPlayhead()
      if (clipInfo) {
        const { clip, clipTime } = clipInfo
        const newEndTrim = (clip.duration || 0) - clipTime
        if (newEndTrim >= 0) {
          await updateClipTrim(clip.id, { end_trim: newEndTrim })
        }
      }
    }
  }

  // Duplicate selected clip
  const handleDuplicateClip = async () => {
    if (!projectId || !selection || selection.type !== 'clip') return

    try {
      // Use the duplicateClip API endpoint
      await projectsApi.duplicateClip(projectId, selection.id)
      const res = await projectsApi.listClips(projectId)
      onClipsChange?.(res.data)
    } catch (error) {
      console.error('Failed to duplicate clip:', error)
    }
  }

  // Update clip trim
  const updateClipTrim = async (clipId: number, updates: { start_trim?: number; end_trim?: number }) => {
    if (!projectId) return
    try {
      await projectsApi.updateClip(projectId, clipId, updates)
      const res = await projectsApi.listClips(projectId)
      onClipsChange?.(res.data)
    } catch (error) {
      console.error('Failed to update clip trim:', error)
    }
  }

  // Delete selected clip
  const handleDeleteClip = async (clipId: number) => {
    if (!projectId) return
    try {
      await projectsApi.deleteClip(projectId, clipId)
      const res = await projectsApi.listClips(projectId)
      onClipsChange?.(res.data)
      setSelection(null)
    } catch (error) {
      console.error('Failed to delete clip:', error)
    }
  }

  // Duplicate selected item
  const handleDuplicate = async () => {
    if (!selection) return

    if (selection.type === 'subtitle') {
      const item = subtitles.find(s => s.id === selection.id)
      if (item) {
        // Copy would need to be handled by context
        setClipboard({ type: 'subtitle', data: item })
      }
    } else if (selection.type === 'sfx') {
      const item = sfxTracks.find(s => s.id === selection.id)
      if (item) {
        setClipboard({ type: 'sfx', data: item })
      }
    } else if (selection.type === 'overlay') {
      const item = textOverlays.find(o => o.id === selection.id)
      if (item) {
        setClipboard({ type: 'overlay', data: item })
      }
    }
  }

  // Jump to previous/next clip
  const jumpToPreviousClip = () => {
    let position = 0
    let prevPosition = 0
    for (const clip of sortedClips) {
      const clipDuration = getClipEffectiveDuration(clip)
      if (currentTime <= position + 0.1) {
        setCurrentTime(Math.max(0, prevPosition))
        return
      }
      prevPosition = position
      position += clipDuration
    }
    setCurrentTime(prevPosition)
  }

  const jumpToNextClip = () => {
    let position = 0
    for (const clip of sortedClips) {
      const clipDuration = getClipEffectiveDuration(clip)
      position += clipDuration
      if (position > currentTime + 0.1) {
        setCurrentTime(Math.min(safeDuration, position))
        return
      }
    }
  }

  // Clip reorder drag handlers
  const handleClipDragStart = (e: React.DragEvent, clipId: number) => {
    if (trackLock.video) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', clipId.toString())
    setClipDragState({ draggedId: clipId, dragOverId: null, dragOverPosition: null })
  }

  const handleClipDragOver = (e: React.DragEvent, clipId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    if (clipDragState.draggedId === clipId) return

    // Determine if dropping before or after based on mouse position
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const midPoint = rect.left + rect.width / 2
    const position = e.clientX < midPoint ? 'before' : 'after'

    setClipDragState(prev => ({
      ...prev,
      dragOverId: clipId,
      dragOverPosition: position
    }))
  }

  const handleClipDragLeave = () => {
    setClipDragState(prev => ({
      ...prev,
      dragOverId: null,
      dragOverPosition: null
    }))
  }

  const handleClipDrop = async (e: React.DragEvent, targetClipId: number) => {
    e.preventDefault()

    const draggedId = clipDragState.draggedId
    if (!draggedId || draggedId === targetClipId || !projectId) {
      setClipDragState({ draggedId: null, dragOverId: null, dragOverPosition: null })
      return
    }

    // Find indices
    const draggedIndex = sortedClips.findIndex(c => c.id === draggedId)
    let targetIndex = sortedClips.findIndex(c => c.id === targetClipId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setClipDragState({ draggedId: null, dragOverId: null, dragOverPosition: null })
      return
    }

    // Adjust target index based on drop position
    if (clipDragState.dragOverPosition === 'after') {
      targetIndex += 1
    }

    // If dragging from before target, adjust for removal
    if (draggedIndex < targetIndex) {
      targetIndex -= 1
    }

    // Reorder clips
    const newClips = [...sortedClips]
    const [movedClip] = newClips.splice(draggedIndex, 1)
    newClips.splice(targetIndex, 0, movedClip)

    // Update timeline_order
    const reorderedClips = newClips.map((clip, index) => ({
      ...clip,
      timeline_order: index
    }))

    onClipsChange?.(reorderedClips)

    // Save to backend
    try {
      await projectsApi.reorderClips(
        projectId,
        reorderedClips.map(c => ({ id: c.id, timeline_order: c.timeline_order }))
      )
    } catch (error) {
      console.error('Failed to reorder clips:', error)
    }

    setClipDragState({ draggedId: null, dragOverId: null, dragOverPosition: null })
  }

  const handleClipDragEnd = () => {
    setClipDragState({ draggedId: null, dragOverId: null, dragOverPosition: null })
  }

  // Item drag handlers (for subtitles, sfx, overlays)
  const handleItemMouseDown = (
    e: React.MouseEvent,
    id: number,
    type: 'subtitle' | 'sfx' | 'overlay' | 'clip',
    mode: 'move' | 'resize-start' | 'resize-end' | 'trim-start' | 'trim-end' = 'move'
  ) => {
    e.stopPropagation()

    // Check if track is locked
    if (type === 'sfx' && trackLock.audio) return
    if (type === 'subtitle' && trackLock.subtitles) return
    if (type === 'overlay' && trackLock.overlays) return
    if (type === 'clip' && trackLock.video) return

    // Get original times
    let originalStart = 0, originalEnd = 0, originalTrimStart = 0, originalTrimEnd = 0
    if (type === 'subtitle') {
      const item = subtitles.find(s => s.id === id)
      if (item) { originalStart = item.start_time; originalEnd = item.end_time }
    } else if (type === 'sfx') {
      const item = sfxTracks.find(s => s.id === id)
      if (item) { originalStart = item.start_time; originalEnd = item.start_time + item.duration }
    } else if (type === 'overlay') {
      const item = textOverlays.find(o => o.id === id)
      if (item) { originalStart = item.start_time; originalEnd = item.end_time }
    } else if (type === 'clip') {
      const clip = videoClips.find(c => c.id === id)
      if (clip) {
        originalStart = getClipTimelinePosition(clip)
        originalEnd = originalStart + getClipEffectiveDuration(clip)
        originalTrimStart = clip.start_trim
        originalTrimEnd = clip.end_trim
      }
    }

    setDragState({
      id,
      type,
      mode,
      startX: e.clientX,
      originalStart,
      originalEnd,
      originalTrimStart,
      originalTrimEnd
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
    } else if (dragState.type === 'clip') {
      const clip = videoClips.find(c => c.id === dragState.id)
      if (!clip) return

      const clipTotalDuration = clip.duration || 0

      if (dragState.mode === 'trim-start') {
        // Trim from the start of the clip
        const newTrimStart = Math.max(0, Math.min(
          clipTotalDuration - clip.end_trim - 0.1,
          (dragState.originalTrimStart || 0) + deltaTime
        ))
        updateClipTrim(dragState.id, { start_trim: newTrimStart })
      } else if (dragState.mode === 'trim-end') {
        // Trim from the end of the clip
        const newTrimEnd = Math.max(0, Math.min(
          clipTotalDuration - clip.start_trim - 0.1,
          (dragState.originalTrimEnd || 0) - deltaTime
        ))
        updateClipTrim(dragState.id, { end_trim: newTrimEnd })
      }
    }
  }, [dragState, pixelsPerSecond, subtitles, sfxTracks, textOverlays, videoClips, safeDuration, snapToValue, getSnapPoints, updateSubtitle, updateSFXTrack, updateTextOverlay, updateClipTrim])

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
        else if (selection.type === 'clip') handleDeleteClip(selection.id)
        setSelection(null)
      }

      // Only process shortcuts if not in a text input
      const isTextInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA'
      if (isTextInput) return

      // Split at playhead (S key)
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        handleSplitAtPlayhead()
      }

      // Set In Point (I key) - Trim start to playhead
      if (e.key === 'i' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        handleSetInPoint()
      }

      // Set Out Point (O key) - Trim end to playhead
      if (e.key === 'o' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        handleSetOutPoint()
      }

      // Duplicate clip (D key)
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && selection?.type === 'clip') {
        handleDuplicateClip()
      }

      // Copy to clipboard (Cmd/Ctrl + C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selection) {
        e.preventDefault()
        handleDuplicate()
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
            {/* Navigation */}
            <div className="tool-group">
              <button
                className="tool-btn"
                onClick={jumpToPreviousClip}
                title="Previous clip"
              >
                <SkipBack size={14} />
              </button>
              <button
                className="tool-btn"
                onClick={jumpToNextClip}
                title="Next clip"
              >
                <SkipForward size={14} />
              </button>
            </div>

            {/* Trim tools */}
            <div className="tool-group">
              <button
                className="tool-btn"
                onClick={handleSetInPoint}
                disabled={sortedClips.length === 0}
                title="Set In Point - Trim start to playhead (I)"
              >
                <ChevronsRight size={14} />
              </button>
              <button
                className="tool-btn"
                onClick={handleSetOutPoint}
                disabled={sortedClips.length === 0}
                title="Set Out Point - Trim end to playhead (O)"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                className="tool-btn"
                onClick={handleSplitAtPlayhead}
                disabled={sortedClips.length === 0}
                title="Split at playhead (S)"
              >
                <Scissors size={14} />
              </button>
            </div>

            {/* Edit tools */}
            <div className="tool-group">
              <button
                className="tool-btn"
                onClick={handleDuplicateClip}
                disabled={!selection || selection.type !== 'clip'}
                title="Duplicate clip"
              >
                <Copy size={14} />
              </button>
              <button
                className="tool-btn delete"
                onClick={() => {
                  if (selection) {
                    if (selection.type === 'subtitle') deleteSubtitle(selection.id)
                    else if (selection.type === 'sfx') deleteSFXTrack(selection.id)
                    else if (selection.type === 'overlay') deleteTextOverlay(selection.id)
                    else if (selection.type === 'clip') handleDeleteClip(selection.id)
                    setSelection(null)
                  }
                }}
                disabled={!selection}
                title="Delete selected (Del)"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* View controls */}
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
                <div className={`track video ${trackLock.video ? 'locked' : ''}`}>
                  {sortedClips.length > 0 ? (
                    // Render multiple clips
                    sortedClips.map((clip, index) => {
                      const clipPosition = getClipTimelinePosition(clip)
                      const clipDuration = getClipEffectiveDuration(clip)
                      const isSelected = selection?.id === clip.id && selection?.type === 'clip'
                      const isDragging = dragState?.id === clip.id && dragState?.type === 'clip'
                      const isBeingDragged = clipDragState.draggedId === clip.id
                      const isDragOver = clipDragState.dragOverId === clip.id
                      const dragOverPosition = isDragOver ? clipDragState.dragOverPosition : null

                      return (
                        <div
                          key={clip.id}
                          className={`video-clip multi-clip ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isBeingDragged ? 'clip-dragging' : ''} ${isDragOver ? `drag-over drag-over-${dragOverPosition}` : ''}`}
                          style={{
                            left: `${clipPosition * pixelsPerSecond}px`,
                            width: `${clipDuration * pixelsPerSecond}px`,
                          }}
                          draggable={!trackLock.video}
                          onDragStart={(e) => handleClipDragStart(e, clip.id)}
                          onDragOver={(e) => handleClipDragOver(e, clip.id)}
                          onDragLeave={handleClipDragLeave}
                          onDrop={(e) => handleClipDrop(e, clip.id)}
                          onDragEnd={handleClipDragEnd}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelection({ id: clip.id, type: 'clip' })
                          }}
                          title={`${clip.original_name || `Clip ${index + 1}`} (${formatTime(clipDuration)}) - Drag to reorder`}
                        >
                          {/* Trim handle - start */}
                          <div
                            className="trim-handle start"
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              handleItemMouseDown(e, clip.id, 'clip', 'trim-start')
                            }}
                            title="Drag to trim start"
                          />

                          <div className="clip-content">
                            <Film size={14} />
                            <span className="clip-name">{clip.original_name || `Clip ${index + 1}`}</span>
                            <span className="clip-duration">{formatTime(clipDuration)}</span>
                          </div>

                          {/* Trim handle - end */}
                          <div
                            className="trim-handle end"
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              handleItemMouseDown(e, clip.id, 'clip', 'trim-end')
                            }}
                            title="Drag to trim end"
                          />

                          {/* Trim indicators */}
                          {clip.start_trim > 0 && (
                            <div className="trim-indicator start" title={`Trimmed ${formatTime(clip.start_trim)} from start`} />
                          )}
                          {clip.end_trim > 0 && (
                            <div className="trim-indicator end" title={`Trimmed ${formatTime(clip.end_trim)} from end`} />
                          )}

                          {/* Transition indicator after clip (except last) */}
                          {index < sortedClips.length - 1 && (() => {
                            const nextClip = sortedClips[index + 1]
                            const appliedTransition = transitions.find(
                              t => t.from_clip_id === clip.id && t.to_clip_id === nextClip.id
                            )
                            const transitionType = appliedTransition?.type || 'none'
                            const transitionDuration = appliedTransition?.duration || 0

                            return (
                              <div
                                className={`clip-transition-indicator ${transitionType !== 'none' ? 'has-transition' : ''} transition-${transitionType}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onTransitionClick?.(clip.id, nextClip.id, appliedTransition)
                                }}
                                title={appliedTransition
                                  ? `${transitionType.toUpperCase()} (${transitionDuration}s) - Click to edit`
                                  : 'Click to add transition'
                                }
                              >
                                <ArrowRightLeft size={10} />
                                {appliedTransition && (
                                  <span className="transition-type-label">{transitionType}</span>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })
                  ) : (
                    // Fallback for single video
                    <div className="video-clip" style={{ width: `${timelineWidth}px` }}>
                      <span>Main Video</span>
                    </div>
                  )}

                  {/* Transition markers */}
                  {analysis?.suggestedTransitions?.map((transition, index) => (
                    transition.type !== 'start' && transition.type !== 'end' && (
                      <div
                        key={`trans-${index}`}
                        className={`transition-marker ${transition.suggested_transition}`}
                        style={{ left: `${transition.timestamp * pixelsPerSecond}px` }}
                        title={`${transition.suggested_transition.toUpperCase()}: ${transition.reason} (${Math.round(transition.confidence * 100)}%)`}
                      >
                        <Scissors size={10} />
                      </div>
                    )
                  ))}

                  {/* Intro effect indicator */}
                  {introEffect && (
                    <div
                      className="intro-effect-indicator"
                      style={{ width: `${introEffect.duration * pixelsPerSecond}px` }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onIntroEffectClick?.()
                      }}
                      title={`Intro: ${introEffect.type} (${introEffect.duration}s) - Click to edit`}
                    >
                      <span className="effect-icon"><Play size={10} /></span>
                      <span className="effect-label">Fade In</span>
                    </div>
                  )}

                  {/* Outro effect indicator */}
                  {outroEffect && sortedClips.length > 0 && (
                    <div
                      className="outro-effect-indicator"
                      style={{
                        left: `${(safeDuration - outroEffect.duration) * pixelsPerSecond}px`,
                        width: `${outroEffect.duration * pixelsPerSecond}px`
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onOutroEffectClick?.()
                      }}
                      title={`Outro: ${outroEffect.type} (${outroEffect.duration}s) - Click to edit`}
                    >
                      <span className="effect-icon"><Square size={10} /></span>
                      <span className="effect-label">Fade Out</span>
                    </div>
                  )}
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
