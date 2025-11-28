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
  unifiedAnalyze: (videoPath: string) =>
    ipcRenderer.invoke('video:unifiedAnalyze', videoPath),

  // Timeline analysis - analyzes the timeline composition (video clips only, not SFX/overlays)
  analyzeTimeline: (composition: Array<{
    videoPath: string
    start: number
    duration: number
    clipStart: number
    clipEnd: number
  }>) =>
    ipcRenderer.invoke('timeline:analyze', composition),
  generateSFX: (prompt: string, duration: number, modelType?: 'audiogen' | 'musicgen') =>
    ipcRenderer.invoke('audiocraft:generate', prompt, duration, modelType || 'audiogen'),

  // Caption styling AI analysis
  analyzeCaptions: (transcriptionData: any) =>
    ipcRenderer.invoke('captions:analyze', transcriptionData),

  // ElevenLabs APIs
  elevenlabsGenerate: (prompt: string, duration: number | undefined, apiKey: string) =>
    ipcRenderer.invoke('elevenlabs:generate', prompt, duration, apiKey),
  elevenlabsValidateKey: (apiKey: string) =>
    ipcRenderer.invoke('elevenlabs:validateKey', apiKey),
  elevenlabsGetCredits: (apiKey: string) =>
    ipcRenderer.invoke('elevenlabs:getCredits', apiKey),

  // Thumbnail generation APIs
  thumbnailAnalyze: (videoPath: string) =>
    ipcRenderer.invoke('thumbnail:analyze', videoPath),
  thumbnailGenerate: (options: { videoPath: string; timestamp: number; text: string; template: string; outputPath?: string }) =>
    ipcRenderer.invoke('thumbnail:generate', options),

  // Brand Kit APIs
  brandkitList: () =>
    ipcRenderer.invoke('brandkit:list'),
  brandkitLoad: (brandKitId: string) =>
    ipcRenderer.invoke('brandkit:load', brandKitId),
  brandkitSave: (brandKit: any) =>
    ipcRenderer.invoke('brandkit:save', brandKit),
  brandkitDelete: (brandKitId: string) =>
    ipcRenderer.invoke('brandkit:delete', brandKitId),

  // Multi-Platform Export API
  thumbnailMultiExport: (options: any) =>
    ipcRenderer.invoke('thumbnail:multiExport', options),

  // File system APIs
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),

  // Project management APIs
  createProject: (options: { projectName: string; projectPath: string; videoPath: string }) =>
    ipcRenderer.invoke('project:create', options),
  saveProject: (projectPath: string, projectData: any) =>
    ipcRenderer.invoke('project:save', projectPath, projectData),
  loadProject: (projectPath: string) =>
    ipcRenderer.invoke('project:load', projectPath),
  openProjectFolder: () =>
    ipcRenderer.invoke('project:openFolder'),
  openProjectFile: () =>
    ipcRenderer.invoke('project:openFile'),
  getRecentProjects: () =>
    ipcRenderer.invoke('project:getRecent'),
  removeRecentProject: (projectPath: string) =>
    ipcRenderer.invoke('project:removeRecent', projectPath),
  copyAssetToProject: (sourcePath: string, projectPath: string, assetType: 'source' | 'sfx' | 'exports' | 'audio' | 'music' | 'thumbnails') =>
    ipcRenderer.invoke('project:copyAsset', sourcePath, projectPath, assetType),
  resolveProjectPath: (projectPath: string, relativePath: string) =>
    ipcRenderer.invoke('project:resolvePath', projectPath, relativePath),
  getProjectSFXFiles: (projectPath: string) =>
    ipcRenderer.invoke('project:getSFXFiles', projectPath),
  getProjectExports: (projectPath: string) =>
    ipcRenderer.invoke('project:getExports', projectPath),
  fileExists: (filePath: string) =>
    ipcRenderer.invoke('project:fileExists', filePath),
  deleteFile: (filePath: string) =>
    ipcRenderer.invoke('project:deleteFile', filePath),
  showInFolder: (filePath: string) =>
    ipcRenderer.invoke('project:showInFolder', filePath),
  isValidProject: (projectPath: string) =>
    ipcRenderer.invoke('project:isValid', projectPath),

  // Replicate APIs
  replicateGenerateVideo: (prompt: string, apiKey: string, model?: string, duration?: number) =>
    ipcRenderer.invoke('replicate:generateVideo', { prompt, apiKey, model, duration }),
  replicateCheckStatus: (predictionId: string, apiKey: string) =>
    ipcRenderer.invoke('replicate:checkStatus', { predictionId, apiKey }),
  replicateDownloadVideo: (url: string, fileName: string) =>
    ipcRenderer.invoke('replicate:downloadVideo', { url, fileName }),

  // FreeSound APIs (API key only - no OAuth)
  freesoundSearch: (params: any) =>
    ipcRenderer.invoke('freesound:search', params),
  freesoundGetSound: (soundId: number) =>
    ipcRenderer.invoke('freesound:getSound', soundId),
  freesoundDownloadPreview: (previewUrl: string, outputPath: string) =>
    ipcRenderer.invoke('freesound:downloadPreview', previewUrl, outputPath),

  // App state management
  setUnsavedChanges: (hasChanges: boolean) =>
    ipcRenderer.invoke('app:setUnsavedChanges', hasChanges),
  getUnsavedChanges: () =>
    ipcRenderer.invoke('app:getUnsavedChanges'),

  // SFX Library
  loadSFXLibrary: () =>
    ipcRenderer.invoke('sfxLibrary:load'),
  getSFXLibraryPath: (relativePath: string) =>
    ipcRenderer.invoke('sfxLibrary:getPath', relativePath),
  copySFXToProject: (libraryPath: string, projectPath: string) =>
    ipcRenderer.invoke('sfxLibrary:copyToProject', libraryPath, projectPath),

  // Animation Library
  loadAnimationLibrary: () =>
    ipcRenderer.invoke('animationLibrary:load'),
  getAnimationFromLibrary: (category: string, filename: string) =>
    ipcRenderer.invoke('animationLibrary:getAnimation', category, filename),

  // Setup handlers
  startSetup: () =>
    ipcRenderer.invoke('setup:start'),
  setupComplete: () =>
    ipcRenderer.invoke('setup:complete'),
  checkPackages: () =>
    ipcRenderer.invoke('setup:checkPackages'),
  onSetupProgress: (callback: (progress: any) => void) => {
    const listener = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('setup:progress', listener)
    return () => ipcRenderer.removeListener('setup:progress', listener)
  },
  openExternal: (url: string) =>
    ipcRenderer.invoke('shell:openExternal', url),

  // Settings API
  getSetting: (key: string) =>
    ipcRenderer.invoke('settings:get', key),
  getAllSettings: () =>
    ipcRenderer.invoke('settings:getAll'),
  setSetting: (key: string, value: any) =>
    ipcRenderer.invoke('settings:set', key, value)
})

// Expose electron object for IPC event listeners (needed for progress tracking)
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel: string, func: (...args: any[]) => void) => {
      const validChannels = ['render-progress', 'render-speed']
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, func)
      }
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
      const validChannels = ['render-progress', 'render-speed']
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, func)
      }
    }
  }
})

// Type definitions for window.electronAPI
export interface ElectronAPI {
  openFileDialog: () => Promise<string | null>
  saveFileDialog: (defaultPath: string) => Promise<string | null>
  extractAudio: (videoPath: string) => Promise<string>
  getVideoMetadata: (videoPath: string) => Promise<VideoMetadata>
  renderVideo: (options: RenderOptions) => Promise<string>
  analyzeVideo: (videoPath: string, audioPath: string) => Promise<VideoAnalysis>
  generateSFX: (prompt: string, duration: number, modelType?: 'audiogen' | 'musicgen') => Promise<string>

  // ElevenLabs APIs
  elevenlabsGenerate: (prompt: string, duration: number | undefined, apiKey: string) => Promise<{ success: boolean; filePath?: string; duration?: number; creditsUsed?: number; error?: string }>
  elevenlabsValidateKey: (apiKey: string) => Promise<{ valid: boolean }>
  elevenlabsGetCredits: (apiKey: string) => Promise<{ credits: number | null }>

  // Thumbnail generation APIs
  thumbnailAnalyze: (videoPath: string) => Promise<{
    success: boolean;
    candidates?: Array<{
      path: string
      timestamp: number
      score: number
      face_count: number
      faces: Array<{ x: number; y: number; w: number; h: number }>
    }>;
    error?: string
  }>
  thumbnailGenerate: (options: { videoPath: string; timestamp: number; text: string; template: string; outputPath?: string }) => Promise<{ success: boolean; path?: string; error?: string }>

  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<boolean>

  // Project management
  createProject: (options: { projectName: string; projectPath: string; videoPath: string }) => Promise<{ projectPath: string; videoRelativePath: string }>
  saveProject: (projectPath: string, projectData: any) => Promise<boolean>
  loadProject: (projectPath: string) => Promise<any>
  openProjectFolder: () => Promise<string | null>
  openProjectFile: () => Promise<string | null>
  getRecentProjects: () => Promise<any[]>
  removeRecentProject: (projectPath: string) => Promise<boolean>
  copyAssetToProject: (sourcePath: string, projectPath: string, assetType: 'source' | 'sfx' | 'exports' | 'audio' | 'music' | 'thumbnails') => Promise<string>
  resolveProjectPath: (projectPath: string, relativePath: string) => Promise<string>
  getProjectSFXFiles: (projectPath: string) => Promise<string[]>
  getProjectExports: (projectPath: string) => Promise<string[]>
  fileExists: (filePath: string) => Promise<boolean>
  deleteFile: (filePath: string) => Promise<boolean>
  showInFolder: (filePath: string) => Promise<boolean>
  isValidProject: (projectPath: string) => Promise<boolean>

  // FreeSound APIs (API key only - no OAuth)
  freesoundSearch: (params: any) => Promise<{ success: boolean; results?: any; error?: string }>
  freesoundGetSound: (soundId: number) => Promise<{ success: boolean; sound?: any; error?: string }>
  freesoundDownloadPreview: (previewUrl: string, outputPath: string) => Promise<{ success: boolean; filePath?: string; error?: string }>

  // App state management
  setUnsavedChanges: (hasChanges: boolean) => Promise<boolean>
  getUnsavedChanges: () => Promise<boolean>

  // Setup Wizard API
  startSetup: () => Promise<void>
  onSetupProgress: (callback: (progress: { stage: string; progress: number; message: string; error?: string }) => void) => () => void
  setupComplete: () => Promise<void>
  openExternal: (url: string) => Promise<void>

  // Settings API
  getSetting: (key: string) => Promise<any>
  getAllSettings: () => Promise<any>
  setSetting: (key: string, value: any) => Promise<boolean>
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
    reason?: string
    visual_context?: string
    action_context?: string
    confidence?: number
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
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: any[]) => void) => void
        removeListener: (channel: string, func: (...args: any[]) => void) => void
      }
    }
  }
}
