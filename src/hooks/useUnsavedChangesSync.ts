import { useEffect } from 'react'
import { useProject } from '../context/ProjectContext'

/**
 * Syncs the unsaved changes state with the main process
 * This enables the "Save before close?" dialog when closing the app
 */
export function useUnsavedChangesSync() {
  const { hasUnsavedChanges } = useProject()

  useEffect(() => {
    // Sync state with main process
    window.electronAPI.setUnsavedChanges(hasUnsavedChanges)
  }, [hasUnsavedChanges])

  // Listen for save-before-close event from main process
  useEffect(() => {
    const handleSaveBeforeClose = () => {
      // Trigger save from ProjectContext
      const { saveProject } = useProject()
      saveProject()
    }

    // Note: This would need proper event listener setup in preload.ts
    // For now, this is a placeholder for the concept

    return () => {
      // Cleanup
    }
  }, [])
}
