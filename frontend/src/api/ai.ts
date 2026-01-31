/**
 * AI/ML API calls
 */
import { apiClient } from './client'
import type { VideoAnalysisResult } from './projects'

export interface TaskResponse {
  task_id: string
  status: string
  message: string
}

export interface TaskStatus {
  task_id: string
  status: string
  progress: number
  message: string
  result?: Record<string, unknown>
}

export interface SFXGenerateRequest {
  prompt: string
  duration: number
}

export interface TemplateSettings {
  // Intro/Outro
  intro_effect?: 'none' | 'fade_in' | 'zoom_in' | 'slide_in' | 'glitch_in' | 'flash_in'
  intro_duration?: number
  outro_effect?: 'none' | 'fade_out' | 'zoom_out' | 'slide_out' | 'glitch_out' | 'flash_out'
  outro_duration?: number

  // Transitions
  transition_types?: string[]
  transition_duration?: number

  // Pacing & Energy
  pacing_style?: 'slow' | 'moderate' | 'fast' | 'dynamic' | 'building'
  energy_level?: number
  min_clip_duration?: number
  max_clip_duration?: number

  // Audio
  music_mood?: string
  music_volume?: number
  sfx_intensity?: number

  // Captions
  caption_style?: 'none' | 'minimal' | 'standard' | 'bold' | 'animated' | 'karaoke'
  caption_position?: 'bottom' | 'top' | 'center'

  // Visual Effects
  color_grading?: string
  vignette?: boolean
  film_grain?: boolean

  // AI Enhancement
  ai_enhancement_level?: number
  prioritize_faces?: boolean
  avoid_repetition?: boolean
  beat_sync?: boolean
}

export interface AutoGenerateRequest {
  include_subtitles?: boolean
  include_sfx?: boolean
  include_transitions?: boolean
  sfx_confidence_threshold?: number
  transition_confidence_threshold?: number
  max_sfx_count?: number

  // Template System
  template_id?: string
  template_settings?: TemplateSettings
}

export interface AutoGenerateResult {
  subtitles_created: number
  sfx_generated: number
  transitions_created: number
  errors: string[]

  // Template-enhanced results
  template_applied?: string
  intro_effect?: string | null
  intro_duration?: number | null
  outro_effect?: string | null
  outro_duration?: number | null
  clips_reordered?: boolean
  clips_trimmed?: number
  music_added?: boolean
  color_grading_applied?: boolean
  total_duration?: number
  energy_score?: number
}

export const aiApi = {
  analyzeVideo: (projectId: number) =>
    apiClient.post<TaskResponse>(`/ai/${projectId}/analyze`),

  getAnalysisStatus: (projectId: number, taskId: string) =>
    apiClient.get<TaskStatus>(`/ai/${projectId}/analyze/status/${taskId}`),

  getAnalysisResults: (projectId: number) =>
    apiClient.get<VideoAnalysisResult>(`/ai/${projectId}/analysis-results`),

  generateSFX: (projectId: number, prompt: string, duration: number) =>
    apiClient.post<TaskResponse>(`/ai/${projectId}/generate-sfx`, { prompt, duration }),

  getSFXStatus: (projectId: number, taskId: string) =>
    apiClient.get<TaskStatus>(`/ai/${projectId}/sfx/status/${taskId}`),

  autoGenerate: (projectId: number, options?: AutoGenerateRequest) =>
    apiClient.post<TaskResponse>(`/ai/${projectId}/auto-generate`, options || {}),
}
