// Type definitions for window.electronAPI
// This must be kept in sync with electron/preload.ts

declare global {
  interface Window {
    electronAPI: {
      openFileDialog: () => Promise<string | null>
      saveFileDialog: (defaultPath: string) => Promise<string | null>
      extractAudio: (videoPath: string) => Promise<string>
      getVideoMetadata: (videoPath: string) => Promise<any>
      renderVideo: (options: any) => Promise<string>
      analyzeVideo: (videoPath: string, audioPath: string) => Promise<any>
      generateSFX: (prompt: string, duration: number, modelType?: 'audiogen' | 'musicgen') => Promise<string>
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
      copyAssetToProject: (sourcePath: string, projectPath: string, assetType: 'source' | 'sfx' | 'exports' | 'audio' | 'music') => Promise<string>
      resolveProjectPath: (projectPath: string, relativePath: string) => Promise<string>
      getProjectSFXFiles: (projectPath: string) => Promise<string[]>
      getProjectExports: (projectPath: string) => Promise<string[]>
      fileExists: (filePath: string) => Promise<boolean>
      deleteFile: (filePath: string) => Promise<boolean>
      showInFolder: (filePath: string) => Promise<boolean>
      isValidProject: (projectPath: string) => Promise<boolean>

      // FreeSound APIs
      freesoundSearch: (params: any) => Promise<{ success: boolean; results?: any; error?: string }>
      freesoundGetSound: (soundId: number) => Promise<{ success: boolean; sound?: any; error?: string }>
      freesoundDownloadPreview: (previewUrl: string, outputPath: string) => Promise<{ success: boolean; filePath?: string; error?: string }>

      // App state management
      setUnsavedChanges: (hasChanges: boolean) => Promise<boolean>
      getUnsavedChanges: () => Promise<boolean>
    }
  }
}

export {}
