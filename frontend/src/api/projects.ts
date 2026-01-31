/**
 * Projects API calls
 */
import { apiClient } from './client'

export type ProjectMode = 'manual' | 'semi_manual' | 'automatic'

export interface ProjectSummary {
  id: number
  name: string
  mode: ProjectMode
  video_filename: string | null
  video_original_name: string | null
  created_at: string
  last_opened: string
}

export interface SubtitleStyle {
  fontSize: number
  fontFamily: string
  color: string
  backgroundColor: string
  position: 'top' | 'center' | 'bottom'
}

export interface Subtitle {
  id: number
  project_id: number
  text: string
  start_time: number
  end_time: number
  style: SubtitleStyle
}

export interface SFXTrack {
  id: number
  project_id: number
  filename: string
  start_time: number
  duration: number
  volume: number
  prompt: string | null
}

export interface OverlayStyle {
  fontSize: number
  fontFamily: string
  color: string
  backgroundColor: string
  position: { x: number; y: number }
  animation: 'none' | 'fade' | 'slide' | 'zoom'
}

export interface TextOverlay {
  id: number
  project_id: number
  text: string
  start_time: number
  end_time: number
  style: OverlayStyle
}

export interface VideoAnalysisResult {
  scenes: Array<{
    timestamp: number
    type: string
    description: string
    action_description?: string
    sound_description?: string
    confidence: number
  }>
  suggestedSFX: Array<{
    timestamp: number
    prompt: string
    reason: string
    visual_context?: string
    action_context?: string
    confidence: number
  }>
  suggestedTransitions?: Array<{
    timestamp: number
    type: 'cut' | 'gradual' | 'start' | 'end'
    confidence: number
    suggested_transition: 'cut' | 'fade' | 'fade_in' | 'fade_out' | 'dissolve' | 'wipe' | 'slide'
    reason: string
  }>
  transcription: Array<{
    text: string
    start: number
    end: number
    confidence: number
  }>
}

export interface VideoClip {
  id: number
  project_id: number
  filename: string
  original_name: string | null
  original_order: number
  timeline_order: number
  start_trim: number
  end_trim: number
  timeline_start: number
  duration: number | null
  width: number | null
  height: number | null
  fps: number | null
  clip_metadata: Record<string, unknown> | null
  analysis: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Transition {
  id: number
  project_id: number
  type: string
  from_clip_id: number
  to_clip_id: number
  duration: number
  parameters: Record<string, unknown> | null
  ai_suggested: number
  confidence: number | null
  created_at: string
  updated_at: string
}

export interface BackgroundAudio {
  id: number
  project_id: number
  filename: string
  original_name: string | null
  source: 'upload' | 'ai_generated'
  start_time: number
  duration: number | null
  volume: number
  fade_in: number
  fade_out: number
  prompt: string | null
  created_at: string
  updated_at: string
}

export interface Project extends ProjectSummary {
  video_duration: number | null
  video_metadata: Record<string, unknown> | null
  analysis_results: VideoAnalysisResult | null
  updated_at: string
  subtitles: Subtitle[]
  sfx_tracks: SFXTrack[]
  text_overlays: TextOverlay[]
  video_clips?: VideoClip[]
  transitions?: Transition[]
  background_audio?: BackgroundAudio[]
}

export const projectsApi = {
  // Projects (note: trailing slashes to avoid 307 redirects losing auth headers)
  list: () => apiClient.get<ProjectSummary[]>('/projects/'),
  get: (id: number) => apiClient.get<Project>(`/projects/${id}`),
  create: (name: string, mode: ProjectMode = 'semi_manual') =>
    apiClient.post<Project>('/projects/', { name, mode }),
  update: (id: number, data: Partial<Project>) => apiClient.put<Project>(`/projects/${id}`, data),
  delete: (id: number) => apiClient.delete(`/projects/${id}`),

  // Subtitles
  listSubtitles: (projectId: number) =>
    apiClient.get<Subtitle[]>(`/projects/${projectId}/subtitles`),
  createSubtitle: (projectId: number, data: Omit<Subtitle, 'id' | 'project_id'>) =>
    apiClient.post<Subtitle>(`/projects/${projectId}/subtitles`, data),
  updateSubtitle: (projectId: number, subtitleId: number, data: Partial<Subtitle>) =>
    apiClient.put<Subtitle>(`/projects/${projectId}/subtitles/${subtitleId}`, data),
  deleteSubtitle: (projectId: number, subtitleId: number) =>
    apiClient.delete(`/projects/${projectId}/subtitles/${subtitleId}`),

  // SFX Tracks
  listSFXTracks: (projectId: number) =>
    apiClient.get<SFXTrack[]>(`/projects/${projectId}/sfx`),
  createSFXTrack: (projectId: number, data: Omit<SFXTrack, 'id' | 'project_id'>) =>
    apiClient.post<SFXTrack>(`/projects/${projectId}/sfx`, data),
  updateSFXTrack: (projectId: number, sfxId: number, data: Partial<SFXTrack>) =>
    apiClient.put<SFXTrack>(`/projects/${projectId}/sfx/${sfxId}`, data),
  deleteSFXTrack: (projectId: number, sfxId: number) =>
    apiClient.delete(`/projects/${projectId}/sfx/${sfxId}`),

  // Text Overlays
  listOverlays: (projectId: number) =>
    apiClient.get<TextOverlay[]>(`/projects/${projectId}/overlays`),
  createOverlay: (projectId: number, data: Omit<TextOverlay, 'id' | 'project_id'>) =>
    apiClient.post<TextOverlay>(`/projects/${projectId}/overlays`, data),
  updateOverlay: (projectId: number, overlayId: number, data: Partial<TextOverlay>) =>
    apiClient.put<TextOverlay>(`/projects/${projectId}/overlays/${overlayId}`, data),
  deleteOverlay: (projectId: number, overlayId: number) =>
    apiClient.delete(`/projects/${projectId}/overlays/${overlayId}`),

  // Video Clips
  listClips: (projectId: number) =>
    apiClient.get<VideoClip[]>(`/projects/${projectId}/clips`),
  uploadClip: (projectId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<VideoClip>(`/projects/${projectId}/clips`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  updateClip: (projectId: number, clipId: number, data: Partial<VideoClip>) =>
    apiClient.put<VideoClip>(`/projects/${projectId}/clips/${clipId}`, data),
  deleteClip: (projectId: number, clipId: number) =>
    apiClient.delete(`/projects/${projectId}/clips/${clipId}`),
  duplicateClip: (projectId: number, clipId: number) =>
    apiClient.post<VideoClip>(`/projects/${projectId}/clips/${clipId}/duplicate`),
  reorderClips: (projectId: number, clipOrders: Array<{ id: number; timeline_order: number }>) =>
    apiClient.put<VideoClip[]>(`/projects/${projectId}/clips/reorder`, { clip_orders: clipOrders }),
  stitchClips: (projectId: number) =>
    apiClient.post<{ success: boolean; filename: string; url: string; message: string }>(
      `/projects/${projectId}/clips/stitch`
    ),

  // Transitions
  listTransitions: (projectId: number) =>
    apiClient.get<Transition[]>(`/projects/${projectId}/transitions`),
  createTransition: (projectId: number, data: Omit<Transition, 'id' | 'project_id' | 'ai_suggested' | 'confidence' | 'created_at' | 'updated_at'>) =>
    apiClient.post<Transition>(`/projects/${projectId}/transitions`, data),
  updateTransition: (projectId: number, transitionId: number, data: Partial<Transition>) =>
    apiClient.put<Transition>(`/projects/${projectId}/transitions/${transitionId}`, data),
  deleteTransition: (projectId: number, transitionId: number) =>
    apiClient.delete(`/projects/${projectId}/transitions/${transitionId}`),

  // Background Audio
  listBGM: (projectId: number) =>
    apiClient.get<BackgroundAudio[]>(`/projects/${projectId}/bgm`),
  uploadBGM: (projectId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<BackgroundAudio>(`/projects/${projectId}/bgm/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  updateBGM: (projectId: number, bgmId: number, data: Partial<BackgroundAudio>) =>
    apiClient.put<BackgroundAudio>(`/projects/${projectId}/bgm/${bgmId}`, data),
  deleteBGM: (projectId: number, bgmId: number) =>
    apiClient.delete(`/projects/${projectId}/bgm/${bgmId}`),
}
