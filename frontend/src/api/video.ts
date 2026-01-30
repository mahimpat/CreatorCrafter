/**
 * Video processing API calls
 */
import { apiClient } from './client'

export interface VideoUploadResponse {
  filename: string
  original_name: string
  url: string
  metadata: Record<string, unknown> | null
}

export interface VideoMetadata {
  filename: string
  original_name: string | null
  duration: number | null
  metadata: Record<string, unknown> | null
}

export interface AudioExtractResponse {
  audio_filename: string
  audio_url: string
}

export interface TaskResponse {
  task_id: string
  status: string
  message: string
}

export const videoApi = {
  upload: (
    projectId: number,
    file: File,
    onProgress?: (percent: number) => void
  ) => apiClient.uploadFile(`/video/${projectId}/upload`, file, onProgress),

  getMetadata: (projectId: number) =>
    apiClient.get<VideoMetadata>(`/video/${projectId}/metadata`),

  extractAudio: (projectId: number) =>
    apiClient.post<AudioExtractResponse>(`/video/${projectId}/extract-audio`),

  render: (
    projectId: number,
    options?: {
      output_filename?: string
      format?: string
      include_subtitles?: boolean
      include_sfx?: boolean
      include_bgm?: boolean
      include_overlays?: boolean
    }
  ) => apiClient.post<TaskResponse>(`/video/${projectId}/render`, options),

  exportSubtitles: (projectId: number) =>
    apiClient.get<string>(`/video/${projectId}/export-subtitles`, {
      responseType: 'text',
    }),
}
