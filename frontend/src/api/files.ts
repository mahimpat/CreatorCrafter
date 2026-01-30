/**
 * File management API calls
 */
import { apiClient } from './client'

export interface FileInfo {
  filename: string
  url: string
  asset_type: string
}

export interface FileListResponse {
  source: FileInfo[]
  sfx: FileInfo[]
  exports: FileInfo[]
}

export interface FileUploadResponse {
  filename: string
  original_name: string
  url: string
  asset_type: string
}

export const filesApi = {
  upload: (
    projectId: number,
    file: File,
    assetType: 'source' | 'sfx' | 'exports' = 'sfx',
    onProgress?: (percent: number) => void
  ) =>
    apiClient.uploadFile(
      `/files/${projectId}/upload?asset_type=${assetType}`,
      file,
      onProgress
    ),

  list: (projectId: number, assetType?: string) => {
    const params = assetType ? `?asset_type=${assetType}` : ''
    return apiClient.get<FileListResponse>(`/files/${projectId}/files${params}`)
  },

  getStreamUrl: (projectId: number, assetType: string, filename: string) =>
    `/api/files/${projectId}/stream/${assetType}/${filename}`,

  delete: (projectId: number, assetType: string, filename: string) =>
    apiClient.delete(`/files/${projectId}/files/${assetType}/${filename}`),
}
