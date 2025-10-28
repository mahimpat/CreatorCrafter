import { Subtitle, SFXTrack, TextOverlay, VideoAnalysisResult } from '../context/ProjectContext'

/**
 * Project file structure stored in project.json
 */
export interface ProjectFile {
  version: string
  projectName: string
  createdAt: string
  lastModified: string
  video: {
    originalPath: string // Original absolute path when project was created
    relativePath: string // Relative path within project folder
    metadata: any // FFprobe metadata
  }
  audio?: {
    originalPath?: string // Original absolute path to extracted audio
    relativePath?: string // Relative path within project folder
  }
  subtitles: Subtitle[]
  sfxTracks: ProjectSFXTrack[] // SFX tracks with relative paths
  textOverlays: TextOverlay[]
  analysis: VideoAnalysisResult | null
}

/**
 * SFX track with relative path for project portability
 */
export interface ProjectSFXTrack extends Omit<SFXTrack, 'path'> {
  path: string // Relative path within project folder
  absolutePath?: string // Resolved absolute path (runtime only, not saved)
}

/**
 * Recent project entry stored in user data
 */
export interface RecentProject {
  path: string // Absolute path to project folder
  name: string
  lastOpened: string
  videoPath?: string
  thumbnail?: string // Optional base64 thumbnail
}

/**
 * Auto-save metadata
 */
export interface AutoSaveData {
  projectPath: string | null
  timestamp: string
  state: {
    videoPath: string | null
    videoMetadata: any | null
    duration: number
    subtitles: Subtitle[]
    sfxTracks: SFXTrack[]
    textOverlays: TextOverlay[]
    analysis: VideoAnalysisResult | null
  }
}

/**
 * Project creation options
 */
export interface CreateProjectOptions {
  projectName: string
  projectPath: string // Parent directory where project folder will be created
  videoPath: string
  videoMetadata: any
}

/**
 * Project folder structure
 */
export const PROJECT_STRUCTURE = {
  PROJECT_FILE: 'project.json',
  ASSETS_DIR: 'assets',
  SOURCE_DIR: 'assets/source',
  SFX_DIR: 'assets/sfx',
  EXPORTS_DIR: 'assets/exports',
  AUTO_SAVE_FILE: '.autosave.json'
} as const

/**
 * Project file version for migration support
 */
export const PROJECT_VERSION = '1.0.0'
