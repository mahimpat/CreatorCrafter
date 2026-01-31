/**
 * Project Context - State management for the video editor
 * Adapted for web API instead of Electron IPC
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import {
  projectsApi,
  videoApi,
  aiApi,
  Project,
  ProjectMode,
  Subtitle,
  SFXTrack,
  TextOverlay,
  VideoAnalysisResult,
} from '../api'

interface ProjectState {
  project: Project | null
  projectId: number | null
  projectMode: ProjectMode
  videoUrl: string | null
  currentTime: number
  duration: number
  isPlaying: boolean
  subtitles: Subtitle[]
  sfxTracks: SFXTrack[]
  textOverlays: TextOverlay[]
  analysis: VideoAnalysisResult | null
  isAnalyzing: boolean
  hasUnsavedChanges: boolean
  isSaving: boolean
}

interface ProjectContextType extends ProjectState {
  // Video controls
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void

  // Video operations
  uploadVideo: (file: File, onProgress?: (percent: number) => void) => Promise<void>
  analyzeVideo: () => Promise<void>

  // Subtitle operations
  addSubtitle: (subtitle: Omit<Subtitle, 'id' | 'project_id'>) => Promise<void>
  updateSubtitle: (id: number, data: Partial<Subtitle>) => Promise<void>
  deleteSubtitle: (id: number) => Promise<void>

  // SFX operations
  addSFXTrack: (track: Omit<SFXTrack, 'id' | 'project_id'>) => Promise<void>
  updateSFXTrack: (id: number, data: Partial<SFXTrack>) => Promise<void>
  deleteSFXTrack: (id: number) => Promise<void>
  generateSFX: (prompt: string, duration: number) => Promise<void>

  // Overlay operations
  addTextOverlay: (overlay: Omit<TextOverlay, 'id' | 'project_id'>) => Promise<void>
  updateTextOverlay: (id: number, data: Partial<TextOverlay>) => Promise<void>
  deleteTextOverlay: (id: number) => Promise<void>

  // Project operations
  saveProject: () => Promise<void>
  refreshProject: () => Promise<void>
  setProjectMode: (mode: ProjectMode) => Promise<void>

  // Analysis
  setAnalysis: (analysis: VideoAnalysisResult | null) => void
  setIsAnalyzing: (analyzing: boolean) => void

  // Helpers
  getVideoStreamUrl: () => string | null
  getSFXStreamUrl: (filename: string) => string
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

interface ProjectProviderProps {
  children: ReactNode
  initialProject: Project
}

// Helper to build authenticated stream URLs
const buildStreamUrl = (projectId: number, assetType: string, filename: string): string => {
  const token = localStorage.getItem('access_token')
  const baseUrl = `/api/files/${projectId}/stream/${assetType}/${filename}`
  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl
}

export function ProjectProvider({ children, initialProject }: ProjectProviderProps) {
  const [state, setState] = useState<ProjectState>({
    project: initialProject,
    projectId: initialProject.id,
    projectMode: initialProject.mode || 'semi_manual',
    videoUrl: initialProject.video_filename
      ? buildStreamUrl(initialProject.id, 'source', initialProject.video_filename)
      : null,
    currentTime: 0,
    duration: (initialProject.video_duration || 0) / 1000,
    isPlaying: false,
    subtitles: initialProject.subtitles || [],
    sfxTracks: initialProject.sfx_tracks || [],
    textOverlays: initialProject.text_overlays || [],
    analysis: initialProject.analysis_results || null,
    isAnalyzing: false,
    hasUnsavedChanges: false,
    isSaving: false,
  })

  // Video controls
  const setCurrentTime = useCallback((time: number) => {
    setState((prev) => ({ ...prev, currentTime: time }))
  }, [])

  const setDuration = useCallback((duration: number) => {
    setState((prev) => ({ ...prev, duration }))
  }, [])

  const setIsPlaying = useCallback((playing: boolean) => {
    setState((prev) => ({ ...prev, isPlaying: playing }))
  }, [])

  // Video operations
  const uploadVideo = useCallback(
    async (file: File, onProgress?: (percent: number) => void) => {
      if (!state.projectId) return

      const res = await videoApi.upload(state.projectId, file, onProgress)
      const { filename, metadata } = res.data

      // Update project in backend
      await projectsApi.update(state.projectId, {
        video_filename: filename,
        video_metadata: metadata,
      })

      setState((prev) => ({
        ...prev,
        videoUrl: prev.projectId ? buildStreamUrl(prev.projectId, 'source', filename) : null,
        hasUnsavedChanges: false,
      }))
    },
    [state.projectId]
  )

  const analyzeVideo = useCallback(async () => {
    if (!state.projectId) return

    setState((prev) => ({ ...prev, isAnalyzing: true }))

    try {
      // Extract audio first (only for single video mode, clips handle audio extraction in backend)
      if (state.videoUrl) {
        await videoApi.extractAudio(state.projectId)
      }

      // Start analysis - works for both single video and multi-clip projects
      console.log('[ProjectContext] Starting video analysis for project:', state.projectId)
      await aiApi.analyzeVideo(state.projectId)

      // Analysis runs in background, results come via WebSocket
    } catch (error) {
      console.error('Failed to start analysis:', error)
      setState((prev) => ({ ...prev, isAnalyzing: false }))
    }
  }, [state.projectId, state.videoUrl])

  // Subtitle operations
  const addSubtitle = useCallback(
    async (subtitle: Omit<Subtitle, 'id' | 'project_id'>) => {
      if (!state.projectId) return

      const res = await projectsApi.createSubtitle(state.projectId, subtitle)
      setState((prev) => ({
        ...prev,
        subtitles: [...prev.subtitles, res.data],
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId]
  )

  const updateSubtitle = useCallback(
    async (id: number, data: Partial<Subtitle>) => {
      if (!state.projectId) return

      const res = await projectsApi.updateSubtitle(state.projectId, id, data)
      setState((prev) => ({
        ...prev,
        subtitles: prev.subtitles.map((s) => (s.id === id ? res.data : s)),
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId]
  )

  const deleteSubtitle = useCallback(
    async (id: number) => {
      if (!state.projectId) return

      await projectsApi.deleteSubtitle(state.projectId, id)
      setState((prev) => ({
        ...prev,
        subtitles: prev.subtitles.filter((s) => s.id !== id),
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId]
  )

  // SFX operations
  const addSFXTrack = useCallback(
    async (track: Omit<SFXTrack, 'id' | 'project_id'>) => {
      if (!state.projectId) return

      const res = await projectsApi.createSFXTrack(state.projectId, track)
      setState((prev) => ({
        ...prev,
        sfxTracks: [...prev.sfxTracks, res.data],
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId]
  )

  const updateSFXTrack = useCallback(
    async (id: number, data: Partial<SFXTrack>) => {
      if (!state.projectId) return

      const res = await projectsApi.updateSFXTrack(state.projectId, id, data)
      setState((prev) => ({
        ...prev,
        sfxTracks: prev.sfxTracks.map((t) => (t.id === id ? res.data : t)),
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId]
  )

  const deleteSFXTrack = useCallback(
    async (id: number) => {
      if (!state.projectId) return

      await projectsApi.deleteSFXTrack(state.projectId, id)
      setState((prev) => ({
        ...prev,
        sfxTracks: prev.sfxTracks.filter((t) => t.id !== id),
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId]
  )

  const generateSFX = useCallback(
    async (prompt: string, duration: number) => {
      if (!state.projectId) return

      // SFX generation runs in background, results come via WebSocket
      await aiApi.generateSFX(state.projectId, prompt, duration)
    },
    [state.projectId]
  )

  // Overlay operations
  const addTextOverlay = useCallback(
    async (overlay: Omit<TextOverlay, 'id' | 'project_id'>) => {
      if (!state.projectId) return

      const res = await projectsApi.createOverlay(state.projectId, overlay)
      setState((prev) => ({
        ...prev,
        textOverlays: [...prev.textOverlays, res.data],
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId]
  )

  const updateTextOverlay = useCallback(
    async (id: number, data: Partial<TextOverlay>) => {
      if (!state.projectId) return

      const res = await projectsApi.updateOverlay(state.projectId, id, data)
      setState((prev) => ({
        ...prev,
        textOverlays: prev.textOverlays.map((o) => (o.id === id ? res.data : o)),
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId]
  )

  const deleteTextOverlay = useCallback(
    async (id: number) => {
      if (!state.projectId) return

      await projectsApi.deleteOverlay(state.projectId, id)
      setState((prev) => ({
        ...prev,
        textOverlays: prev.textOverlays.filter((o) => o.id !== id),
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId]
  )

  // Project operations
  const saveProject = useCallback(async () => {
    if (!state.projectId) return

    setState((prev) => ({ ...prev, isSaving: true }))
    try {
      // Project data is saved automatically via API calls
      // This is mainly for triggering any final sync
      setState((prev) => ({ ...prev, hasUnsavedChanges: false, isSaving: false }))
    } catch (error) {
      setState((prev) => ({ ...prev, isSaving: false }))
      throw error
    }
  }, [state.projectId])

  const refreshProject = useCallback(async () => {
    if (!state.projectId) return

    const res = await projectsApi.get(state.projectId)
    setState((prev) => ({
      ...prev,
      project: res.data,
      projectMode: res.data.mode || 'semi_manual',
      subtitles: res.data.subtitles,
      sfxTracks: res.data.sfx_tracks,
      textOverlays: res.data.text_overlays,
      analysis: res.data.analysis_results,
    }))
  }, [state.projectId])

  const setProjectMode = useCallback(async (mode: ProjectMode) => {
    if (!state.projectId) return

    try {
      await projectsApi.update(state.projectId, { mode } as any)
      setState((prev) => ({
        ...prev,
        projectMode: mode,
        project: prev.project ? { ...prev.project, mode } : null,
      }))
    } catch (error) {
      console.error('Failed to update mode:', error)
      throw error
    }
  }, [state.projectId])

  // Analysis
  const setAnalysis = useCallback((analysis: VideoAnalysisResult | null) => {
    setState((prev) => ({ ...prev, analysis }))
  }, [])

  const setIsAnalyzing = useCallback((analyzing: boolean) => {
    setState((prev) => ({ ...prev, isAnalyzing: analyzing }))
  }, [])

  // Helpers
  const getVideoStreamUrl = useCallback(() => {
    return state.videoUrl
  }, [state.videoUrl])

  const getSFXStreamUrl = useCallback(
    (filename: string) => {
      if (!state.projectId) return ''
      return buildStreamUrl(state.projectId, 'sfx', filename)
    },
    [state.projectId]
  )

  return (
    <ProjectContext.Provider
      value={{
        ...state,
        setCurrentTime,
        setDuration,
        setIsPlaying,
        uploadVideo,
        analyzeVideo,
        addSubtitle,
        updateSubtitle,
        deleteSubtitle,
        addSFXTrack,
        updateSFXTrack,
        deleteSFXTrack,
        generateSFX,
        addTextOverlay,
        updateTextOverlay,
        deleteTextOverlay,
        saveProject,
        refreshProject,
        setProjectMode,
        setAnalysis,
        setIsAnalyzing,
        getVideoStreamUrl,
        getSFXStreamUrl,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return context
}
