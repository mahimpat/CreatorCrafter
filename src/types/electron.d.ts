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
      unifiedAnalyze: (videoPath: string) => Promise<{
        success: boolean
        video_path: string
        analyzed_at: number
        thumbnail_candidates: Array<{
          timestamp: number
          frame_number: number
          score: number
          has_faces: boolean
          face_count: number
          sharpness: number
          contrast: number
          vibrancy: number
        }>
        transcription: Array<{
          text: string
          start: number
          end: number
          confidence: number
        }>
        visual_scenes: Array<{
          timestamp: number
          description: string
          type: string
        }>
        events: Array<{
          type: 'motion_peak' | 'scene_transition'
          timestamp: number
          frame?: number
          intensity?: number
          category?: string
          from_mood?: string
          to_mood?: string
        }>
        highlights: Array<{
          start: number
          end: number
          score: number
          reason: string
          type: string
        }>
        sfx_suggestions: Array<{
          timestamp: number
          prompt: string
          reason: string
          audio_context?: string
          visual_context?: string
          confidence: number
          type?: 'primary' | 'enhancement'
          audio_present?: boolean
          motion_verified?: boolean
          event_type?: string
        }>
        music_suggestions: Array<{
          timestamp: number
          duration: number
          scene_id: number
          prompt: string
          description: string
          mood: string
          energy_level: number
          genre: string
          tempo: string
          confidence: number
        }>
        error?: string
      }>
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
      copyAssetToProject: (sourcePath: string, projectPath: string, assetType: 'source' | 'sfx' | 'exports' | 'audio' | 'music' | 'thumbnails') => Promise<string>
      resolveProjectPath: (projectPath: string, relativePath: string) => Promise<string>
      getProjectSFXFiles: (projectPath: string) => Promise<string[]>
      getProjectExports: (projectPath: string) => Promise<string[]>
      fileExists: (filePath: string) => Promise<boolean>
      deleteFile: (filePath: string) => Promise<boolean>
      showInFolder: (filePath: string) => Promise<boolean>
      isValidProject: (projectPath: string) => Promise<boolean>

      // Replicate AI
      replicateGenerateVideo: (prompt: string, apiKey: string, model?: string, duration?: number) => Promise<{ success: boolean; prediction?: any; error?: string }>
      replicateCheckStatus: (predictionId: string, apiKey: string) => Promise<{ success: boolean; prediction?: any; error?: string }>
      replicateDownloadVideo: (url: string, fileName: string) => Promise<{ success: boolean; filePath?: string; error?: string }>

      // FreeSound APIs
      freesoundSearch: (params: any) => Promise<{ success: boolean; results?: any; error?: string }>
      freesoundGetSound: (soundId: number) => Promise<{ success: boolean; sound?: any; error?: string }>
      freesoundDownloadPreview: (previewUrl: string, outputPath: string) => Promise<{ success: boolean; filePath?: string; error?: string }>

      // ElevenLabs APIs
      elevenlabsGenerate: (prompt: string, duration: number | undefined, apiKey: string) => Promise<{ success: boolean; filePath?: string; duration?: number; creditsUsed?: number; error?: string }>
      elevenlabsValidateKey: (apiKey: string) => Promise<{ valid: boolean }>
      elevenlabsGetCredits: (apiKey: string) => Promise<{ credits: number | null }>

      // Thumbnail generation APIs
      thumbnailAnalyze: (videoPath: string) => Promise<{
        success: boolean; candidates?: Array<{
          timestamp: number
          frame_number: number
          score: number
          has_faces: boolean
          face_count: number
          sharpness: number
          contrast: number
          vibrancy: number
        }>; error?: string
      }>
      thumbnailExtract: (videoPath: string, timestamp: number) => Promise<{ success: boolean; frame_path?: string; timestamp?: number; error?: string }>
      thumbnailGenerate: (options: { videoPath: string; timestamp: number; text: string; template: string; background?: string; brandKitId?: string }) => Promise<{ success: boolean; thumbnail_path?: string; error?: string }>
      thumbnailGenerateVariations: (options: { videoPath: string; timestamp: number; text: string; numVariations: number; brandKitId?: string }) => Promise<{ success: boolean; variations?: any[]; error?: string }>
      thumbnailGenerateCaptions: (videoPath: string, timestamp: number) => Promise<{ success: boolean; captions?: string[]; visual_description?: string; audio_context?: string; error?: string }>

      // Brand Kit APIs
      brandkitList: () => Promise<{ success: boolean; brandKits?: any[]; error?: string }>
      brandkitLoad: (brandKitId: string) => Promise<{ success: boolean; brandKit?: any; error?: string }>
      brandkitSave: (brandKit: any) => Promise<{ success: boolean; error?: string }>
      brandkitDelete: (brandKitId: string) => Promise<{ success: boolean; error?: string }>

      // Multi-Platform Export API
      thumbnailMultiExport: (options: any) => Promise<any>

      // Timeline Analysis API
      analyzeTimeline: (composition: Array<{
        videoPath: string
        start: number
        duration: number
        clipStart: number
        clipEnd: number
      }>) => Promise<{
        success: boolean
        subtitles?: Array<{
          text: string
          start: number
          end: number
        }>
        suggestedSFX?: Array<{
          timestamp: number
          prompt: string
          reason: string
        }>
        error?: string
      }>

      // Caption Styling AI Analysis API
      analyzeCaptions: (transcriptionData: any) => Promise<{
        success: boolean
        captions?: Array<{
          text: string
          start: number
          end: number
          sentiment: 'positive' | 'negative' | 'neutral' | 'question'
          words: Array<{
            text: string
            start: number
            end: number
            emphasized: boolean
            emphasisType?: 'number' | 'caps' | 'keyword' | 'entity'
          }>
        }>
        stats?: {
          total_segments: number
          total_words: number
          emphasized_words: number
          emphasis_percentage: number
          sentiment_distribution: {
            positive: number
            negative: number
            neutral: number
            question: number
          }
        }
        error?: string
      }>

      // App state management
      setUnsavedChanges: (hasChanges: boolean) => Promise<boolean>
      getUnsavedChanges: () => Promise<boolean>

      // SFX Library API
      loadSFXLibrary: () => Promise<{
        success: boolean
        metadata?: any
        error?: string
      }>
      getSFXLibraryPath: (relativePath: string) => Promise<{
        success: boolean
        path?: string
        error?: string
      }>
      copySFXToProject: (libraryPath: string, projectPath: string) => Promise<{
        success: boolean
        projectPath?: string
        error?: string
      }>

      // Animation Library API
      loadAnimationLibrary: () => Promise<{
        success: boolean
        metadata?: any
        error?: string
      }>
      getAnimationFromLibrary: (category: string, filename: string) => Promise<{
        success: boolean
        data?: any
        path?: string
        error?: string
      }>

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
  }
}

export { }
