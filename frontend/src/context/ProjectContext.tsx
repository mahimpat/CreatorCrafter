/**
 * Project Context - State management for the video editor
 * Adapted for web API instead of Electron IPC
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
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
import { useUndoRedo, UndoAction } from '../hooks/useUndoRedo'

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
  lastSavedAt: Date | null
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
  generateSFX: (prompt: string, duration: number, startTime?: number) => Promise<void>

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

  // Undo/Redo
  undo: () => Promise<void>
  redo: () => Promise<void>
  canUndo: boolean
  canRedo: boolean

  // Helpers
  getVideoStreamUrl: () => string | null
  getSFXStreamUrl: (filename: string) => string
  refreshVideoUrl: () => void
  lastSavedAt: Date | null
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
  const { pushAction, popUndo, popRedo, canUndo, canRedo } = useUndoRedo()

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
    lastSavedAt: null,
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
      // Extract audio first — only for single video mode (semi_manual/manual).
      // In automatic (clip-based) mode, the backend analysis endpoint
      // handles audio extraction for each clip internally.
      if (state.videoUrl && state.projectMode !== 'automatic') {
        await videoApi.extractAudio(state.projectId)
      }

      // Start analysis - works for both single video and multi-clip projects
      await aiApi.analyzeVideo(state.projectId)

      // Analysis runs in background, results come via WebSocket
    } catch (error) {
      console.error('Failed to start analysis:', error)
      setState((prev) => ({ ...prev, isAnalyzing: false }))
    }
  }, [state.projectId, state.videoUrl, state.projectMode])

  // Subtitle operations
  const addSubtitle = useCallback(
    async (subtitle: Omit<Subtitle, 'id' | 'project_id'>) => {
      if (!state.projectId) return

      const res = await projectsApi.createSubtitle(state.projectId, subtitle)
      pushAction({ type: 'add', entityType: 'subtitle', entityId: res.data.id, previousState: null, newState: res.data as unknown as Record<string, unknown> })
      setState((prev) => ({
        ...prev,
        subtitles: [...prev.subtitles, res.data],
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId, pushAction]
  )

  const updateSubtitle = useCallback(
    async (id: number, data: Partial<Subtitle>) => {
      if (!state.projectId) return

      const oldItem = state.subtitles.find(s => s.id === id)
      const res = await projectsApi.updateSubtitle(state.projectId, id, data)
      pushAction({ type: 'update', entityType: 'subtitle', entityId: id, previousState: (oldItem || null) as unknown as Record<string, unknown>, newState: res.data as unknown as Record<string, unknown> })
      setState((prev) => ({
        ...prev,
        subtitles: prev.subtitles.map((s) => (s.id === id ? res.data : s)),
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId, state.subtitles, pushAction]
  )

  const deleteSubtitle = useCallback(
    async (id: number) => {
      if (!state.projectId) return

      const oldItem = state.subtitles.find(s => s.id === id)
      pushAction({ type: 'delete', entityType: 'subtitle', entityId: id, previousState: (oldItem || null) as unknown as Record<string, unknown>, newState: null })
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
      pushAction({ type: 'add', entityType: 'sfx', entityId: res.data.id, previousState: null, newState: res.data as unknown as Record<string, unknown> })
      setState((prev) => ({
        ...prev,
        sfxTracks: [...prev.sfxTracks, res.data],
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId, pushAction]
  )

  const updateSFXTrack = useCallback(
    async (id: number, data: Partial<SFXTrack>) => {
      if (!state.projectId) return

      const oldItem = state.sfxTracks.find(t => t.id === id)
      const res = await projectsApi.updateSFXTrack(state.projectId, id, data)
      pushAction({ type: 'update', entityType: 'sfx', entityId: id, previousState: (oldItem || null) as unknown as Record<string, unknown>, newState: res.data as unknown as Record<string, unknown> })
      setState((prev) => ({
        ...prev,
        sfxTracks: prev.sfxTracks.map((t) => (t.id === id ? res.data : t)),
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId, state.sfxTracks, pushAction]
  )

  const deleteSFXTrack = useCallback(
    async (id: number) => {
      if (!state.projectId) return

      const oldItem = state.sfxTracks.find(t => t.id === id)
      pushAction({ type: 'delete', entityType: 'sfx', entityId: id, previousState: (oldItem || null) as unknown as Record<string, unknown>, newState: null })
      await projectsApi.deleteSFXTrack(state.projectId, id)
      setState((prev) => ({
        ...prev,
        sfxTracks: prev.sfxTracks.filter((t) => t.id !== id),
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId, state.sfxTracks, pushAction]
  )

  const generateSFX = useCallback(
    async (prompt: string, duration: number, startTime?: number) => {
      if (!state.projectId) return

      // SFX generation runs in background, results come via WebSocket
      await aiApi.generateSFX(state.projectId, prompt, duration, startTime ?? 0)
    },
    [state.projectId]
  )

  // Overlay operations
  const addTextOverlay = useCallback(
    async (overlay: Omit<TextOverlay, 'id' | 'project_id'>) => {
      if (!state.projectId) return

      const res = await projectsApi.createOverlay(state.projectId, overlay)
      pushAction({ type: 'add', entityType: 'overlay', entityId: res.data.id, previousState: null, newState: res.data as unknown as Record<string, unknown> })
      setState((prev) => ({
        ...prev,
        textOverlays: [...prev.textOverlays, res.data],
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId, pushAction]
  )

  const updateTextOverlay = useCallback(
    async (id: number, data: Partial<TextOverlay>) => {
      if (!state.projectId) return

      const oldItem = state.textOverlays.find(o => o.id === id)
      const res = await projectsApi.updateOverlay(state.projectId, id, data)
      pushAction({ type: 'update', entityType: 'overlay', entityId: id, previousState: (oldItem || null) as unknown as Record<string, unknown>, newState: res.data as unknown as Record<string, unknown> })
      setState((prev) => ({
        ...prev,
        textOverlays: prev.textOverlays.map((o) => (o.id === id ? res.data : o)),
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId, state.textOverlays, pushAction]
  )

  const deleteTextOverlay = useCallback(
    async (id: number) => {
      if (!state.projectId) return

      const oldItem = state.textOverlays.find(o => o.id === id)
      pushAction({ type: 'delete', entityType: 'overlay', entityId: id, previousState: (oldItem || null) as unknown as Record<string, unknown>, newState: null })
      await projectsApi.deleteOverlay(state.projectId, id)
      setState((prev) => ({
        ...prev,
        textOverlays: prev.textOverlays.filter((o) => o.id !== id),
        hasUnsavedChanges: true,
      }))
    },
    [state.projectId]
  )

  // Undo/Redo execution
  const applyAction = useCallback(async (action: UndoAction, reverse: boolean) => {
    if (!state.projectId) return
    const pid = state.projectId

    if (reverse) {
      // Undo: reverse the action
      if (action.type === 'add') {
        // Undo add = delete
        if (action.entityType === 'subtitle') {
          await projectsApi.deleteSubtitle(pid, action.entityId)
          setState(prev => ({ ...prev, subtitles: prev.subtitles.filter(s => s.id !== action.entityId) }))
        } else if (action.entityType === 'sfx') {
          await projectsApi.deleteSFXTrack(pid, action.entityId)
          setState(prev => ({ ...prev, sfxTracks: prev.sfxTracks.filter(t => t.id !== action.entityId) }))
        } else if (action.entityType === 'overlay') {
          await projectsApi.deleteOverlay(pid, action.entityId)
          setState(prev => ({ ...prev, textOverlays: prev.textOverlays.filter(o => o.id !== action.entityId) }))
        }
      } else if (action.type === 'update' && action.previousState) {
        // Undo update = restore previous state
        if (action.entityType === 'subtitle') {
          const res = await projectsApi.updateSubtitle(pid, action.entityId, action.previousState as Partial<Subtitle>)
          setState(prev => ({ ...prev, subtitles: prev.subtitles.map(s => s.id === action.entityId ? res.data : s) }))
        } else if (action.entityType === 'sfx') {
          const res = await projectsApi.updateSFXTrack(pid, action.entityId, action.previousState as Partial<SFXTrack>)
          setState(prev => ({ ...prev, sfxTracks: prev.sfxTracks.map(t => t.id === action.entityId ? res.data : t) }))
        } else if (action.entityType === 'overlay') {
          const res = await projectsApi.updateOverlay(pid, action.entityId, action.previousState as Partial<TextOverlay>)
          setState(prev => ({ ...prev, textOverlays: prev.textOverlays.map(o => o.id === action.entityId ? res.data : o) }))
        }
      } else if (action.type === 'delete' && action.previousState) {
        // Undo delete = re-create
        if (action.entityType === 'subtitle') {
          const res = await projectsApi.createSubtitle(pid, action.previousState as Omit<Subtitle, 'id' | 'project_id'>)
          setState(prev => ({ ...prev, subtitles: [...prev.subtitles, res.data] }))
        } else if (action.entityType === 'sfx') {
          const res = await projectsApi.createSFXTrack(pid, action.previousState as Omit<SFXTrack, 'id' | 'project_id'>)
          setState(prev => ({ ...prev, sfxTracks: [...prev.sfxTracks, res.data] }))
        } else if (action.entityType === 'overlay') {
          const res = await projectsApi.createOverlay(pid, action.previousState as Omit<TextOverlay, 'id' | 'project_id'>)
          setState(prev => ({ ...prev, textOverlays: [...prev.textOverlays, res.data] }))
        }
      }
    } else {
      // Redo: re-apply the action
      if (action.type === 'add' && action.newState) {
        if (action.entityType === 'subtitle') {
          const res = await projectsApi.createSubtitle(pid, action.newState as Omit<Subtitle, 'id' | 'project_id'>)
          setState(prev => ({ ...prev, subtitles: [...prev.subtitles, res.data] }))
        } else if (action.entityType === 'sfx') {
          const res = await projectsApi.createSFXTrack(pid, action.newState as Omit<SFXTrack, 'id' | 'project_id'>)
          setState(prev => ({ ...prev, sfxTracks: [...prev.sfxTracks, res.data] }))
        } else if (action.entityType === 'overlay') {
          const res = await projectsApi.createOverlay(pid, action.newState as Omit<TextOverlay, 'id' | 'project_id'>)
          setState(prev => ({ ...prev, textOverlays: [...prev.textOverlays, res.data] }))
        }
      } else if (action.type === 'update' && action.newState) {
        if (action.entityType === 'subtitle') {
          const res = await projectsApi.updateSubtitle(pid, action.entityId, action.newState as Partial<Subtitle>)
          setState(prev => ({ ...prev, subtitles: prev.subtitles.map(s => s.id === action.entityId ? res.data : s) }))
        } else if (action.entityType === 'sfx') {
          const res = await projectsApi.updateSFXTrack(pid, action.entityId, action.newState as Partial<SFXTrack>)
          setState(prev => ({ ...prev, sfxTracks: prev.sfxTracks.map(t => t.id === action.entityId ? res.data : t) }))
        } else if (action.entityType === 'overlay') {
          const res = await projectsApi.updateOverlay(pid, action.entityId, action.newState as Partial<TextOverlay>)
          setState(prev => ({ ...prev, textOverlays: prev.textOverlays.map(o => o.id === action.entityId ? res.data : o) }))
        }
      } else if (action.type === 'delete') {
        if (action.entityType === 'subtitle') {
          await projectsApi.deleteSubtitle(pid, action.entityId)
          setState(prev => ({ ...prev, subtitles: prev.subtitles.filter(s => s.id !== action.entityId) }))
        } else if (action.entityType === 'sfx') {
          await projectsApi.deleteSFXTrack(pid, action.entityId)
          setState(prev => ({ ...prev, sfxTracks: prev.sfxTracks.filter(t => t.id !== action.entityId) }))
        } else if (action.entityType === 'overlay') {
          await projectsApi.deleteOverlay(pid, action.entityId)
          setState(prev => ({ ...prev, textOverlays: prev.textOverlays.filter(o => o.id !== action.entityId) }))
        }
      }
    }
  }, [state.projectId])

  const undo = useCallback(async () => {
    const action = popUndo()
    if (action) await applyAction(action, true)
  }, [popUndo, applyAction])

  const redo = useCallback(async () => {
    const action = popRedo()
    if (action) await applyAction(action, false)
  }, [popRedo, applyAction])

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

  // Rebuild video URL with fresh token (call after token refresh)
  const refreshVideoUrl = useCallback(() => {
    setState((prev) => {
      if (!prev.project?.video_filename || !prev.projectId) return prev
      return {
        ...prev,
        videoUrl: buildStreamUrl(prev.projectId, 'source', prev.project.video_filename),
      }
    })
  }, [])

  // Auto-save: debounce 30s after changes detected
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (state.hasUnsavedChanges && state.projectId) {
      autoSaveTimerRef.current = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          hasUnsavedChanges: false,
          lastSavedAt: new Date(),
        }))
      }, 30000)
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [state.hasUnsavedChanges, state.projectId])

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
        refreshVideoUrl,
        lastSavedAt: state.lastSavedAt,
        undo,
        redo,
        canUndo,
        canRedo,
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
