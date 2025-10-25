import { useEffect, useRef } from 'react'
import { useProject } from '../context/ProjectContext'

/**
 * Auto-save hook that automatically saves project after 30 seconds of inactivity
 * Only auto-saves if a project is already created (has projectPath)
 */
export function useAutoSave() {
  const {
    projectPath,
    hasUnsavedChanges,
    saveProject,
    isSaving
  } = useProject()

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastChangeTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    // Only auto-save if we have a project and there are unsaved changes
    if (!projectPath || !hasUnsavedChanges || isSaving) {
      return
    }

    // Update last change time
    lastChangeTimeRef.current = Date.now()

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // Set new timer for 30 seconds
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        console.log('Auto-saving project...')
        await saveProject()
        console.log('Auto-save completed')
      } catch (error) {
        console.error('Auto-save failed:', error)
        // Don't show alert for auto-save failures to avoid interrupting user
      }
    }, 30000) // 30 seconds

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [projectPath, hasUnsavedChanges, isSaving, saveProject])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])
}
