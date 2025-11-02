import { useEffect, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import toast from 'react-hot-toast'

/**
 * Auto-save hook that automatically saves project after 30 seconds of inactivity
 * Also creates backup files for crash recovery
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
  const backupTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-save after 30 seconds of inactivity
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
        toast.success('Auto-saved', {
          duration: 2000,
          icon: '💾'
        })
        console.log('Auto-save completed')
      } catch (error) {
        console.error('Auto-save failed:', error)
        toast.error('Auto-save failed', {
          duration: 3000
        })
      }
    }, 30000) // 30 seconds

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [projectPath, hasUnsavedChanges, isSaving, saveProject])

  // Create backup every 2 minutes (independent of changes)
  useEffect(() => {
    if (!projectPath) return

    // Create backup every 2 minutes
    backupTimerRef.current = setInterval(async () => {
      if (hasUnsavedChanges && !isSaving) {
        try {
          console.log('Creating backup...')
          await saveProject()
          console.log('Backup created')
        } catch (error) {
          console.error('Backup creation failed:', error)
        }
      }
    }, 120000) // 2 minutes

    return () => {
      if (backupTimerRef.current) {
        clearInterval(backupTimerRef.current)
      }
    }
  }, [projectPath, hasUnsavedChanges, isSaving, saveProject])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      if (backupTimerRef.current) {
        clearInterval(backupTimerRef.current)
      }
    }
  }, [])
}
