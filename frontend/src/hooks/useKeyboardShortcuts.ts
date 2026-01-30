/**
 * useKeyboardShortcuts - Hook for global keyboard shortcuts
 */
import { useEffect, useCallback } from 'react'

interface ShortcutAction {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  action: () => void
  description: string
}

interface UseKeyboardShortcutsOptions {
  onSave?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onPlayPause?: () => void
  onDelete?: () => void
  onExport?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onSave,
  onUndo,
  onRedo,
  onPlayPause,
  onDelete,
  onExport,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Ctrl/Cmd + S - Save
      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault()
        onSave?.()
        return
      }

      // Ctrl/Cmd + Z - Undo
      if (cmdOrCtrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        onUndo?.()
        return
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y - Redo
      if ((cmdOrCtrl && e.shiftKey && e.key === 'z') || (cmdOrCtrl && e.key === 'y')) {
        e.preventDefault()
        onRedo?.()
        return
      }

      // Space - Play/Pause
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        onPlayPause?.()
        return
      }

      // Delete/Backspace - Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onDelete?.()
        return
      }

      // Ctrl/Cmd + E - Export
      if (cmdOrCtrl && e.key === 'e') {
        e.preventDefault()
        onExport?.()
        return
      }
    },
    [enabled, onSave, onUndo, onRedo, onPlayPause, onDelete, onExport]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// List of all shortcuts for help display
export const KEYBOARD_SHORTCUTS: ShortcutAction[] = [
  { key: 'S', ctrl: true, action: () => {}, description: 'Save project' },
  { key: 'Z', ctrl: true, action: () => {}, description: 'Undo' },
  { key: 'Z', ctrl: true, shift: true, action: () => {}, description: 'Redo' },
  { key: 'Space', action: () => {}, description: 'Play/Pause video' },
  { key: 'Delete', action: () => {}, description: 'Delete selected item' },
  { key: 'E', ctrl: true, action: () => {}, description: 'Export project' },
]
