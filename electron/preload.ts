import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Dialog APIs
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (defaultPath: string) => ipcRenderer.invoke('dialog:saveFile', defaultPath),

  // Video processing APIs
  extractAudio: (videoPath: string) => ipcRenderer.invoke('video:extractAudio', videoPath),
  getVideoMetadata: (videoPath: string) => ipcRenderer.invoke('video:getMetadata', videoPath),
  renderVideo: (options: RenderOptions) => ipcRenderer.invoke('video:render', options),

  // AI/ML APIs
  analyzeVideo: (videoPath: string, audioPath: string) =>
    ipcRenderer.invoke('ai:analyzeVideo', videoPath, audioPath),
  generateSFX: (prompt: string, duration: number) =>
    ipcRenderer.invoke('audiocraft:generate', prompt, duration),

  // File system APIs
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('fs:writeFile', filePath, content)
})

// Type definitions for window.electronAPI
export interface ElectronAPI {
  openFileDialog: () => Promise<string | null>
  saveFileDialog: (defaultPath: string) => Promise<string | null>
  extractAudio: (videoPath: string) => Promise<string>
  getVideoMetadata: (videoPath: string) => Promise<VideoMetadata>
  renderVideo: (options: RenderOptions) => Promise<string>
  analyzeVideo: (videoPath: string, audioPath: string) => Promise<VideoAnalysis>
  generateSFX: (prompt: string, duration: number) => Promise<string>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<boolean>
}

export interface VideoMetadata {
  format: {
    duration: number
    size: number
    bit_rate: number
  }
  streams: Array<{
    codec_type: string
    codec_name: string
    width?: number
    height?: number
    r_frame_rate?: string
  }>
}

export interface VideoAnalysis {
  scenes: Array<{
    timestamp: number
    type: 'action' | 'dialogue' | 'transition' | 'emotional'
    confidence: number
    description: string
  }>
  suggestedSFX: Array<{
    timestamp: number
    prompt: string
    reason: string
  }>
  transcription: Array<{
    text: string
    start: number
    end: number
    confidence: number
  }>
}

export interface RenderOptions {
  videoPath: string
  outputPath: string
  subtitles?: Array<{ text: string; start: number; end: number }>
  sfxTracks?: Array<{ path: string; start: number }>
  overlays?: Array<{ text: string; start: number; end: number; style: any }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
