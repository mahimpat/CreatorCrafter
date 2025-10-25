import { Subtitle, SFXTrack, TextOverlay, VideoAnalysisResult } from '../context/ProjectContext'
import { ProjectFile, PROJECT_VERSION, ProjectSFXTrack } from '../types/project'

// Browser-compatible path utilities (no Node.js path module)
function getRelativePath(from: string, to: string): string {
  // Simple relative path calculation for browser
  // Normalize slashes
  const normalizedFrom = from.replace(/\\/g, '/')
  const normalizedTo = to.replace(/\\/g, '/')

  if (!normalizedTo.startsWith(normalizedFrom)) {
    return to // Not a child path, return as-is
  }

  // Remove the base path and leading slash
  const relative = normalizedTo.substring(normalizedFrom.length)
  return relative.startsWith('/') ? relative.substring(1) : relative
}

function joinPaths(...parts: string[]): string {
  // Simple path join for browser
  return parts
    .filter(part => part && part.length > 0)
    .join('/')
    .replace(/\/+/g, '/') // Remove double slashes
}

function isAbsolutePath(path: string): boolean {
  // Check if path is absolute (works for Windows and Unix)
  return /^([a-zA-Z]:)?[/\\]/.test(path)
}

/**
 * Serialize project state to ProjectFile format for saving
 */
export function serializeProject(
  projectName: string,
  projectPath: string,
  state: {
    videoPath: string | null
    videoMetadata: any | null
    duration: number
    subtitles: Subtitle[]
    sfxTracks: SFXTrack[]
    textOverlays: TextOverlay[]
    analysis: VideoAnalysisResult | null
  },
  createdAt?: string
): ProjectFile {
  const now = new Date().toISOString()

  // Convert absolute SFX paths to relative paths
  const projectSFXTracks: ProjectSFXTrack[] = state.sfxTracks.map(track => {
    // If path is already inside project, make it relative
    const relativePath = track.path.startsWith(projectPath)
      ? getRelativePath(projectPath, track.path)
      : track.path // Keep absolute if external

    return {
      id: track.id,
      path: relativePath.replace(/\\/g, '/'), // Normalize path separators
      start: track.start,
      duration: track.duration,
      volume: track.volume,
      prompt: track.prompt
    }
  })

  // Get video relative path
  const videoRelativePath = state.videoPath && state.videoPath.startsWith(projectPath)
    ? getRelativePath(projectPath, state.videoPath).replace(/\\/g, '/')
    : state.videoPath || ''

  return {
    version: PROJECT_VERSION,
    projectName,
    createdAt: createdAt || now,
    lastModified: now,
    video: {
      originalPath: state.videoPath || '',
      relativePath: videoRelativePath,
      metadata: state.videoMetadata
    },
    subtitles: state.subtitles,
    sfxTracks: projectSFXTracks,
    textOverlays: state.textOverlays,
    analysis: state.analysis
  }
}

/**
 * Deserialize ProjectFile to runtime state format
 */
export function deserializeProject(
  projectPath: string,
  projectFile: ProjectFile
): {
  projectName: string
  videoPath: string
  videoMetadata: any
  duration: number
  subtitles: Subtitle[]
  sfxTracks: SFXTrack[]
  textOverlays: TextOverlay[]
  analysis: VideoAnalysisResult | null
  createdAt: string
  lastModified: string
} {
  // Resolve video path - prefer relative path within project
  let videoPath: string
  if (projectFile.video.relativePath) {
    videoPath = joinPaths(projectPath, projectFile.video.relativePath)
  } else {
    videoPath = projectFile.video.originalPath
  }

  // Resolve SFX paths to absolute
  const sfxTracks: SFXTrack[] = projectFile.sfxTracks.map(track => {
    // If path looks relative, resolve it relative to project
    const isRelative = !isAbsolutePath(track.path)
    const absolutePath = isRelative
      ? joinPaths(projectPath, track.path)
      : track.path

    return {
      id: track.id,
      path: absolutePath,
      start: track.start,
      duration: track.duration,
      volume: track.volume,
      prompt: track.prompt
    }
  })

  // Get duration from metadata if not stored
  const duration = projectFile.video.metadata?.format?.duration || 0

  return {
    projectName: projectFile.projectName,
    videoPath,
    videoMetadata: projectFile.video.metadata,
    duration,
    subtitles: projectFile.subtitles,
    sfxTracks,
    textOverlays: projectFile.textOverlays,
    analysis: projectFile.analysis,
    createdAt: projectFile.createdAt,
    lastModified: projectFile.lastModified
  }
}

/**
 * Validate project file structure
 */
export function validateProjectFile(data: any): data is ProjectFile {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.version === 'string' &&
    typeof data.projectName === 'string' &&
    typeof data.createdAt === 'string' &&
    typeof data.lastModified === 'string' &&
    data.video &&
    typeof data.video === 'object' &&
    Array.isArray(data.subtitles) &&
    Array.isArray(data.sfxTracks) &&
    Array.isArray(data.textOverlays)
  )
}

/**
 * Check if files referenced in project exist
 */
export async function validateProjectAssets(
  projectFile: ProjectFile,
  projectPath: string
): Promise<{
  valid: boolean
  missingVideo: boolean
  missingSFX: string[]
}> {
  const result = {
    valid: true,
    missingVideo: false,
    missingSFX: [] as string[]
  }

  // Check video file
  if (projectFile.video.relativePath) {
    const videoPath = joinPaths(projectPath, projectFile.video.relativePath)
    const videoExists = await window.electronAPI.fileExists(videoPath)
    if (!videoExists) {
      result.valid = false
      result.missingVideo = true
    }
  }

  // Check SFX files
  for (const track of projectFile.sfxTracks) {
    const isRelative = !isAbsolutePath(track.path)
    const sfxPath = isRelative
      ? joinPaths(projectPath, track.path)
      : track.path

    const exists = await window.electronAPI.fileExists(sfxPath)
    if (!exists) {
      result.valid = false
      result.missingSFX.push(track.path)
    }
  }

  return result
}

/**
 * Format project size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

/**
 * Format date for display
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

  return date.toLocaleDateString()
}
