/**
 * Command Pattern implementation for Undo/Redo functionality
 * Stores a history of commands that can be executed and undone
 */

export interface Command {
  execute: () => void
  undo: () => void
  description: string
}

export class CommandHistory {
  private history: Command[] = []
  private currentIndex: number = -1
  private maxHistory: number = 50 // Limit history to prevent memory issues (increased from 20)

  /**
   * Execute a command and add it to history
   */
  execute(command: Command): void {
    // Execute the command
    command.execute()

    // Remove any commands after current index (when undoing then doing new action)
    this.history = this.history.slice(0, this.currentIndex + 1)

    // Add command to history
    this.history.push(command)
    this.currentIndex++

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift()
      this.currentIndex--
    }
  }

  /**
   * Undo the last command
   */
  undo(): boolean {
    if (!this.canUndo()) {
      return false
    }

    const command = this.history[this.currentIndex]
    command.undo()
    this.currentIndex--
    return true
  }

  /**
   * Redo the last undone command
   */
  redo(): boolean {
    if (!this.canRedo()) {
      return false
    }

    this.currentIndex++
    const command = this.history[this.currentIndex]
    command.execute()
    return true
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex >= 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * Get current history state for debugging
   */
  getState(): { canUndo: boolean; canRedo: boolean; currentIndex: number; historyLength: number } {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      currentIndex: this.currentIndex,
      historyLength: this.history.length
    }
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = []
    this.currentIndex = -1
  }

  /**
   * Get the description of commands for display
   */
  getUndoDescription(): string | null {
    if (!this.canUndo()) return null
    return this.history[this.currentIndex].description
  }

  getRedoDescription(): string | null {
    if (!this.canRedo()) return null
    return this.history[this.currentIndex + 1].description
  }
}

/**
 * Factory functions for creating common commands
 */

export interface SFXTrack {
  id: string
  path: string
  start: number
  duration: number
  volume: number
  prompt?: string
}

export interface Subtitle {
  id: string
  text: string
  start: number
  end: number
  style: any
}

export interface TextOverlay {
  id: string
  text: string
  start: number
  end: number
  style: any
}

/**
 * Create a command for adding an SFX track
 */
export function createAddSFXCommand(
  track: SFXTrack,
  addFn: (track: SFXTrack) => void,
  removeFn: (id: string) => void
): Command {
  return {
    execute: () => addFn(track),
    undo: () => removeFn(track.id),
    description: `Add SFX: ${track.prompt || 'sound effect'}`
  }
}

/**
 * Create a command for deleting an SFX track
 */
export function createDeleteSFXCommand(
  track: SFXTrack,
  addFn: (track: SFXTrack) => void,
  removeFn: (id: string) => void
): Command {
  return {
    execute: () => removeFn(track.id),
    undo: () => addFn(track),
    description: `Delete SFX: ${track.prompt || 'sound effect'}`
  }
}

/**
 * Create a command for updating an SFX track
 */
export function createUpdateSFXCommand(
  id: string,
  oldTrack: SFXTrack,
  newTrack: Partial<SFXTrack>,
  updateFn: (id: string, track: Partial<SFXTrack>) => void
): Command {
  return {
    execute: () => updateFn(id, newTrack),
    undo: () => updateFn(id, oldTrack),
    description: `Update SFX position`
  }
}

/**
 * Create a command for adding a subtitle
 */
export function createAddSubtitleCommand(
  subtitle: Subtitle,
  addFn: (subtitle: Subtitle) => void,
  removeFn: (id: string) => void
): Command {
  return {
    execute: () => addFn(subtitle),
    undo: () => removeFn(subtitle.id),
    description: `Add subtitle: ${subtitle.text.substring(0, 20)}...`
  }
}

/**
 * Create a command for deleting a subtitle
 */
export function createDeleteSubtitleCommand(
  subtitle: Subtitle,
  addFn: (subtitle: Subtitle) => void,
  removeFn: (id: string) => void
): Command {
  return {
    execute: () => removeFn(subtitle.id),
    undo: () => addFn(subtitle),
    description: `Delete subtitle: ${subtitle.text.substring(0, 20)}...`
  }
}

/**
 * Create a command for multiple deletions (ripple delete)
 */
export function createBulkDeleteCommand(
  deletedSFX: SFXTrack[],
  deletedSubtitles: Subtitle[],
  deletedOverlays: TextOverlay[],
  restoreFn: (sfx: SFXTrack[], subtitles: Subtitle[], overlays: TextOverlay[]) => void,
  deleteFn: () => void,
  description: string = 'Delete selected clips'
): Command {
  return {
    execute: deleteFn,
    undo: () => restoreFn(deletedSFX, deletedSubtitles, deletedOverlays),
    description
  }
}
