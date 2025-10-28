import { useEffect } from 'react'
import { useProject } from '../context/ProjectContext'

/**
 * Global keyboard shortcuts hook for timeline editing
 * Handles common keyboard shortcuts for professional video editing workflow
 */
export function useKeyboardShortcuts() {
  const {
    selectedClipIds,
    deleteSelectedClips,
    selectAll,
    clearSelection,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    sfxTracks,
    subtitles,
    textOverlays,
    updateSFXTrack,
    updateSubtitle,
    updateTextOverlay,
  } = useProject()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Get the active element to avoid capturing shortcuts when typing in inputs
      const activeElement = document.activeElement
      const isTyping = activeElement?.tagName === 'INPUT' ||
                       activeElement?.tagName === 'TEXTAREA' ||
                       activeElement?.getAttribute('contenteditable') === 'true'

      // Don't capture shortcuts when typing in input fields
      if (isTyping) return

      // Delete/Backspace - Delete selected clips
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipIds.length > 0) {
        e.preventDefault()
        deleteSelectedClips()
        return
      }

      // Space - Play/Pause toggle
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        setIsPlaying(!isPlaying)
        return
      }

      // Cmd/Ctrl+A - Select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        selectAll()
        return
      }

      // Escape - Clear selection
      if (e.key === 'Escape') {
        e.preventDefault()
        clearSelection()
        return
      }

      // Arrow Left - Nudge selected clips left (0.1 second)
      if (e.key === 'ArrowLeft' && selectedClipIds.length > 0) {
        e.preventDefault()
        nudgeSelectedClips(-0.1)
        return
      }

      // Arrow Right - Nudge selected clips right (0.1 second)
      if (e.key === 'ArrowRight' && selectedClipIds.length > 0) {
        e.preventDefault()
        nudgeSelectedClips(0.1)
        return
      }

      // Plus/Equals - Zoom in (handled by Timeline component)
      // Minus - Zoom out (handled by Timeline component)
      // These are handled in the Timeline component's local state
    }

    // Helper function to nudge selected clips by an offset
    const nudgeSelectedClips = (offset: number) => {
      selectedClipIds.forEach(id => {
        // Find clip in SFX tracks
        const sfxTrack = sfxTracks.find(t => t.id === id)
        if (sfxTrack) {
          const newStart = Math.max(0, sfxTrack.start + offset)
          updateSFXTrack(id, { start: newStart })
          return
        }

        // Find clip in subtitles
        const subtitle = subtitles.find(s => s.id === id)
        if (subtitle) {
          const clipDuration = subtitle.end - subtitle.start
          const newStart = Math.max(0, subtitle.start + offset)
          updateSubtitle(id, {
            start: newStart,
            end: newStart + clipDuration
          })
          return
        }

        // Find clip in text overlays
        const overlay = textOverlays.find(o => o.id === id)
        if (overlay) {
          const clipDuration = overlay.end - overlay.start
          const newStart = Math.max(0, overlay.start + offset)
          updateTextOverlay(id, {
            start: newStart,
            end: newStart + clipDuration
          })
          return
        }
      })
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    selectedClipIds,
    deleteSelectedClips,
    selectAll,
    clearSelection,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    sfxTracks,
    subtitles,
    textOverlays,
    updateSFXTrack,
    updateSubtitle,
    updateTextOverlay,
  ])
}
