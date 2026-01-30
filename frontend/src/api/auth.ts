/**
 * Authentication API calls
 */
import { apiClient } from './client'

export interface User {
  id: number
  email: string
  username: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export const authApi = {
  register: (email: string, username: string, password: string) =>
    apiClient.post<User>('/auth/register', { email, username, password }),

  login: (email: string, password: string) => {
    // OAuth2 spec uses 'username' field for email
    const formData = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`

    return apiClient.post<LoginResponse>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },

  refreshToken: (refreshToken: string) =>
    apiClient.post<LoginResponse>('/auth/refresh', { refresh_token: refreshToken }),

  getMe: () => apiClient.get<User>('/auth/me'),

  logout: () => apiClient.post('/auth/logout'),
}
