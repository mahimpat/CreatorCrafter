import { useState, useCallback } from 'react'

export type EntityType = 'subtitle' | 'sfx' | 'overlay'

export interface UndoAction {
  type: 'add' | 'update' | 'delete'
  entityType: EntityType
  entityId: number
  previousState: Record<string, unknown> | null
  newState: Record<string, unknown> | null
}

const MAX_HISTORY = 50

export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([])
  const [redoStack, setRedoStack] = useState<UndoAction[]>([])

  const pushAction = useCallback((action: UndoAction) => {
    setUndoStack(prev => {
      const next = [...prev, action]
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
    })
    setRedoStack([])
  }, [])

  const popUndo = useCallback((): UndoAction | null => {
    let action: UndoAction | null = null
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      action = prev[prev.length - 1]
      return prev.slice(0, -1)
    })
    if (action) {
      setRedoStack(prev => [...prev, action!])
    }
    return action
  }, [])

  const popRedo = useCallback((): UndoAction | null => {
    let action: UndoAction | null = null
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      action = prev[prev.length - 1]
      return prev.slice(0, -1)
    })
    if (action) {
      setUndoStack(prev => [...prev, action!])
    }
    return action
  }, [])

  return {
    pushAction,
    popUndo,
    popRedo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  }
}
