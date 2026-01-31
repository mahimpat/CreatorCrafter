/**
 * API module exports
 */
export { apiClient } from './client'
export { authApi } from './auth'
export { projectsApi } from './projects'
export { videoApi } from './video'
export { aiApi } from './ai'
export { filesApi } from './files'

export type { User, LoginResponse } from './auth'
export type {
  Project,
  ProjectSummary,
  ProjectMode,
  Subtitle,
  SubtitleStyle,
  SFXTrack,
  TextOverlay,
  OverlayStyle,
  VideoAnalysisResult,
  VideoClip,
  Transition,
  BackgroundAudio,
} from './projects'
export type { VideoUploadResponse, VideoMetadata, AudioExtractResponse } from './video'
export type { TaskResponse, TaskStatus, SFXGenerateRequest, AutoGenerateRequest, AutoGenerateResult, TemplateSettings } from './ai'
export type { FileInfo, FileListResponse, FileUploadResponse } from './files'
