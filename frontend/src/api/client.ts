/**
 * API Client with authentication support
 */
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

class ApiClient {
  private client: AxiosInstance
  private refreshPromise: Promise<string> | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          const newToken = await this.refreshToken()
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return this.client(originalRequest)
          }
        }
        return Promise.reject(error)
      }
    )
  }

  private async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return null

    this.refreshPromise = this.client
      .post('/auth/refresh', { refresh_token: refreshToken })
      .then((res) => {
        const { access_token, refresh_token } = res.data
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        return access_token
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return null
      })
      .finally(() => {
        this.refreshPromise = null
      })

    return this.refreshPromise
  }

  get<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config)
  }

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config)
  }

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.put<T>(url, data, config)
  }

  delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config)
  }

  // File upload with progress
  uploadFile(
    url: string,
    file: File,
    onProgress?: (percent: number) => void,
    additionalData?: Record<string, string>
  ) {
    const formData = new FormData()
    formData.append('file', file)

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    return this.client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      },
    })
  }
}

export const apiClient = new ApiClient()
