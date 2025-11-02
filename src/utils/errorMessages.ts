/**
 * Converts technical error messages into user-friendly ones
 */
export function getUserFriendlyError(error: Error | unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error)

  // File system errors
  if (errorMessage.includes('ENOENT')) {
    return 'File not found. Please check if the file still exists.'
  }
  if (errorMessage.includes('EACCES')) {
    return 'Permission denied. Please check file permissions.'
  }
  if (errorMessage.includes('ENOSPC')) {
    return 'Not enough disk space. Please free up some space and try again.'
  }
  if (errorMessage.includes('EEXIST')) {
    return 'File already exists. Please choose a different name.'
  }

  // Python/AI errors
  if (errorMessage.includes('Python')) {
    return 'Python error. Please ensure Python and dependencies are installed correctly.'
  }
  if (errorMessage.includes('Whisper')) {
    return 'Speech recognition error. The video may not have clear audio.'
  }
  if (errorMessage.includes('AudioCraft') || errorMessage.includes('MusicGen')) {
    return 'Audio generation error. Please try again with a different prompt.'
  }
  if (errorMessage.includes('BLIP')) {
    return 'Video analysis error. The video format may not be supported.'
  }

  // FFmpeg errors
  if (errorMessage.includes('FFmpeg') || errorMessage.includes('ffmpeg')) {
    if (errorMessage.includes('not found')) {
      return 'FFmpeg not found. Please ensure FFmpeg is installed and in PATH.'
    }
    if (errorMessage.includes('Invalid data')) {
      return 'Invalid video file. Please check if the file is corrupted.'
    }
    if (errorMessage.includes('no audio')) {
      return 'This video has no audio track.'
    }
    return 'Video processing error. Please check if the video file is valid.'
  }

  // Network errors
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
    return 'Network error. Please check your internet connection.'
  }
  if (errorMessage.includes('FreeSound')) {
    return 'Could not connect to FreeSound. Please check your internet connection.'
  }

  // Memory errors
  if (errorMessage.includes('out of memory') || errorMessage.includes('OOM')) {
    return 'Not enough memory. Please close other applications and try again.'
  }

  // Project errors
  if (errorMessage.includes('project')) {
    return 'Project error. The project file may be corrupted.'
  }

  // Generic fallback
  if (errorMessage.length > 0) {
    return `Error: ${errorMessage}`
  }

  return 'An unknown error occurred. Please try again.'
}

/**
 * Get error severity level
 */
export type ErrorSeverity = 'warning' | 'error' | 'critical'

export function getErrorSeverity(error: Error | unknown): ErrorSeverity {
  const errorMessage = error instanceof Error ? error.message : String(error)

  // Critical errors that require immediate attention
  if (
    errorMessage.includes('ENOSPC') ||
    errorMessage.includes('out of memory') ||
    errorMessage.includes('corrupted')
  ) {
    return 'critical'
  }

  // Errors that should be fixed
  if (
    errorMessage.includes('ENOENT') ||
    errorMessage.includes('Python') ||
    errorMessage.includes('FFmpeg not found')
  ) {
    return 'error'
  }

  // Warnings that can be ignored
  if (errorMessage.includes('no audio') || errorMessage.includes('EEXIST')) {
    return 'warning'
  }

  return 'error'
}

/**
 * Get suggested action for error
 */
export function getSuggestedAction(error: Error | unknown): string | null {
  const errorMessage = error instanceof Error ? error.message : String(error)

  if (errorMessage.includes('Python')) {
    return 'Run the setup script or windows-hotfix.bat to fix Python installation.'
  }
  if (errorMessage.includes('FFmpeg not found')) {
    return 'Install FFmpeg or run the setup script.'
  }
  if (errorMessage.includes('ENOSPC')) {
    return 'Free up disk space by deleting unnecessary files.'
  }
  if (errorMessage.includes('ENOENT')) {
    return 'Make sure the file has not been moved or deleted.'
  }
  if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
    return 'Check your internet connection and try again.'
  }

  return null
}
