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
}
