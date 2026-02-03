/**
 * User API calls for onboarding, review, and usage tracking
 */
import { apiClient } from './client'

export interface UserUsage {
  project_count: number
  max_projects: number
  can_create_project: boolean
  sfx_seconds_used: number
  sfx_seconds_remaining: number
  can_generate_sfx: boolean
  total_time_in_app: number
  onboarding_completed: boolean
  review_completed: boolean
}

export interface UserLimits {
  projects: {
    used: number
    max: number
    remaining: number
    can_create: boolean
  }
  sfx: {
    seconds_used: number
    seconds_max: number
    seconds_remaining: number
    can_generate: boolean
    formatted_used: string
    formatted_remaining: string
  }
}

export interface OnboardingStatus {
  completed: boolean
  completed_at: string | null
}

export interface ReviewStatus {
  completed: boolean
  completed_at: string | null
  prompted: boolean
  should_prompt: boolean
  total_time_in_app: number
  time_until_prompt: number
}

export interface ReviewSubmit {
  rating: number // 1-5
  feedback?: string
  would_recommend?: boolean
  use_case?: string
  feature_request?: string
  pain_points?: string
  email?: string
}

export interface TimeTrackingResponse {
  total_time_in_app: number
  should_prompt_review: boolean
}

export const usersApi = {
  // Usage & Limits
  getUsage: () => apiClient.get<UserUsage>('/users/me/usage'),
  getLimits: () => apiClient.get<UserLimits>('/users/me/limits'),

  // Onboarding
  getOnboardingStatus: () => apiClient.get<OnboardingStatus>('/users/me/onboarding/status'),
  completeOnboarding: (steps?: string[]) =>
    apiClient.post('/users/me/onboarding/complete', { steps_completed: steps }),

  // Review/Feedback
  getReviewStatus: () => apiClient.get<ReviewStatus>('/users/me/review/status'),
  submitReview: (review: ReviewSubmit) =>
    apiClient.post<{ success: boolean; message: string }>('/users/me/review', review),
  markReviewPrompted: () => apiClient.post('/users/me/review/prompted'),
  dismissReview: () => apiClient.post('/users/me/review/dismiss'),

  // Time Tracking
  updateTimeTracking: (secondsToAdd: number) =>
    apiClient.post<TimeTrackingResponse>('/users/me/time-tracking', { seconds_to_add: secondsToAdd }),
}
