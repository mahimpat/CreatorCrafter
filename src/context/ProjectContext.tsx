import { createContext, useContext, useState, ReactNode } from 'react'
import { serializeProject, deserializeProject } from '../utils/projectSerializer'

export interface Subtitle {
  id: string
  text: string
  start: number
  end: number
  style: {
    fontSize: number
    fontFamily: string
    color: string
    backgroundColor: string
    position: 'top' | 'center' | 'bottom'
  }
}

export interface SFXTrack {
  id: string
  path: string
  start: number
  duration: number
  volume: number
  prompt?: string
}

export interface TextOverlay {
  id: string
  text: string
  start: number
  end: number
  style: {
    fontSize: number
    fontFamily: string
    color: string
    backgroundColor: string
    position: { x: number; y: number }
    animation: 'none' | 'fade' | 'slide' | 'zoom'
  }
}

export interface VideoAnalysisResult {
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
    visual_context?: string
    action_context?: string
    confidence?: number
  }>
  suggestedMusic?: Array<{
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
  transcription: Array<{
    text: string
    start: number
    end: number
    confidence: number
  }>
}

interface ProjectState {
  videoPath: string | null
  videoMetadata: any | null
  currentTime: number
  duration: number
  isPlaying: boolean
  subtitles: Subtitle[]
  sfxTracks: SFXTrack[]
  textOverlays: TextOverlay[]
  analysis: VideoAnalysisResult | null
  isAnalyzing: boolean
  // Project management
  projectPath: string | null
  projectName: string | null
  hasUnsavedChanges: boolean
  lastSaved: Date | null
  isSaving: boolean
  createdAt: Date | null
}

interface ProjectContextType extends ProjectState {
  setVideoPath: (path: string | null) => void
  setVideoMetadata: (metadata: any) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
  addSubtitle: (subtitle: Subtitle) => void
  updateSubtitle: (id: string, subtitle: Partial<Subtitle>) => void
  deleteSubtitle: (id: string) => void
  addSFXTrack: (track: SFXTrack) => void
  updateSFXTrack: (id: string, track: Partial<SFXTrack>) => void
  deleteSFXTrack: (id: string) => void
  addTextOverlay: (overlay: TextOverlay) => void
  updateTextOverlay: (id: string, overlay: Partial<TextOverlay>) => void
  deleteTextOverlay: (id: string) => void
  setAnalysis: (analysis: VideoAnalysisResult | null) => void
  setIsAnalyzing: (analyzing: boolean) => void
  // Project management methods
  createNewProject: (name: string, location: string, videoPath: string) => Promise<void>
  saveProject: () => Promise<void>
  saveProjectAs: (name: string, location: string) => Promise<void>
  loadProject: (projectPath: string) => Promise<void>
  closeProject: () => void
  markDirty: () => void
  markClean: () => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProjectState>({
    videoPath: null,
    videoMetadata: null,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    subtitles: [],
    sfxTracks: [],
    textOverlays: [],
    analysis: null,
    isAnalyzing: false,
    projectPath: null,
    projectName: null,
    hasUnsavedChanges: false,
    lastSaved: null,
    isSaving: false,
    createdAt: null
  })

  const setVideoPath = (path: string | null) => {
    setState(prev => ({ ...prev, videoPath: path }))
  }

  const setVideoMetadata = (metadata: any) => {
    setState(prev => ({ ...prev, videoMetadata: metadata }))
  }

  const setCurrentTime = (time: number) => {
    setState(prev => ({ ...prev, currentTime: time }))
  }

  const setDuration = (duration: number) => {
    setState(prev => ({ ...prev, duration }))
  }

  const setIsPlaying = (playing: boolean) => {
    setState(prev => ({ ...prev, isPlaying: playing }))
  }

  const addSubtitle = (subtitle: Subtitle) => {
    setState(prev => ({
      ...prev,
      subtitles: [...prev.subtitles, subtitle],
      hasUnsavedChanges: true
    }))
  }

  const updateSubtitle = (id: string, subtitle: Partial<Subtitle>) => {
    setState(prev => ({
      ...prev,
      subtitles: prev.subtitles.map(s => (s.id === id ? { ...s, ...subtitle } : s)),
      hasUnsavedChanges: true
    }))
  }

  const deleteSubtitle = (id: string) => {
    setState(prev => ({
      ...prev,
      subtitles: prev.subtitles.filter(s => s.id !== id),
      hasUnsavedChanges: true
    }))
  }

  const addSFXTrack = (track: SFXTrack) => {
    setState(prev => ({
      ...prev,
      sfxTracks: [...prev.sfxTracks, track],
      hasUnsavedChanges: true
    }))
  }

  const updateSFXTrack = (id: string, track: Partial<SFXTrack>) => {
    setState(prev => ({
      ...prev,
      sfxTracks: prev.sfxTracks.map(t => (t.id === id ? { ...t, ...track } : t)),
      hasUnsavedChanges: true
    }))
  }

  const deleteSFXTrack = (id: string) => {
    setState(prev => ({
      ...prev,
      sfxTracks: prev.sfxTracks.filter(t => t.id !== id),
      hasUnsavedChanges: true
    }))
  }

  const addTextOverlay = (overlay: TextOverlay) => {
    setState(prev => ({
      ...prev,
      textOverlays: [...prev.textOverlays, overlay],
      hasUnsavedChanges: true
    }))
  }

  const updateTextOverlay = (id: string, overlay: Partial<TextOverlay>) => {
    setState(prev => ({
      ...prev,
      textOverlays: prev.textOverlays.map(o => (o.id === id ? { ...o, ...overlay } : o)),
      hasUnsavedChanges: true
    }))
  }

  const deleteTextOverlay = (id: string) => {
    setState(prev => ({
      ...prev,
      textOverlays: prev.textOverlays.filter(o => o.id !== id),
      hasUnsavedChanges: true
    }))
  }

  const setAnalysis = (analysis: VideoAnalysisResult | null) => {
    setState(prev => ({ ...prev, analysis }))
  }

  const setIsAnalyzing = (analyzing: boolean) => {
    setState(prev => ({ ...prev, isAnalyzing: analyzing }))
  }

  // Project management methods
  const createNewProject = async (name: string, location: string, videoPath: string) => {
    try {
      // Get video metadata
      const metadata = await window.electronAPI.getVideoMetadata(videoPath)
      const duration = parseFloat(metadata.format.duration)

      // Create project structure and copy video
      const result = await window.electronAPI.createProject({
        projectName: name,
        projectPath: location,
        videoPath
      })

      // Resolve video path within project
      const resolvedVideoPath = await window.electronAPI.resolveProjectPath(
        result.projectPath,
        result.videoRelativePath
      )

      // Initialize project state
      setState({
        videoPath: resolvedVideoPath,
        videoMetadata: metadata,
        currentTime: 0,
        duration,
        isPlaying: false,
        subtitles: [],
        sfxTracks: [],
        textOverlays: [],
        analysis: null,
        isAnalyzing: false,
        projectPath: result.projectPath,
        projectName: name,
        hasUnsavedChanges: false,
        lastSaved: new Date(),
        isSaving: false,
        createdAt: new Date()
      })

      // Save initial project file
      await saveProjectInternal(result.projectPath, name, new Date().toISOString())
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  }

  const saveProjectInternal = async (projectPath: string, projectName: string, createdAt: string) => {
    setState(prev => ({ ...prev, isSaving: true }))

    try {
      const projectData = serializeProject(
        projectName,
        projectPath,
        {
          videoPath: state.videoPath,
          videoMetadata: state.videoMetadata,
          duration: state.duration,
          subtitles: state.subtitles,
          sfxTracks: state.sfxTracks,
          textOverlays: state.textOverlays,
          analysis: state.analysis
        },
        createdAt
      )

      await window.electronAPI.saveProject(projectPath, projectData)

      setState(prev => ({
        ...prev,
        hasUnsavedChanges: false,
        lastSaved: new Date(),
        isSaving: false
      }))
    } catch (error) {
      setState(prev => ({ ...prev, isSaving: false }))
      console.error('Failed to save project:', error)
      throw error
    }
  }

  const saveProject = async () => {
    if (!state.projectPath || !state.projectName) {
      throw new Error('No project loaded')
    }

    await saveProjectInternal(
      state.projectPath,
      state.projectName,
      state.createdAt?.toISOString() || new Date().toISOString()
    )
  }

  const saveProjectAs = async (name: string, location: string) => {
    try {
      // Create new project structure
      const result = await window.electronAPI.createProject({
        projectName: name,
        projectPath: location,
        videoPath: state.videoPath || ''
      })

      // Copy all SFX files to new project
      const newSFXTracks: SFXTrack[] = []
      for (const track of state.sfxTracks) {
        const relativePath = await window.electronAPI.copyAssetToProject(
          track.path,
          result.projectPath,
          'sfx'
        )
        const absolutePath = await window.electronAPI.resolveProjectPath(
          result.projectPath,
          relativePath
        )
        newSFXTracks.push({ ...track, path: absolutePath })
      }

      setState(prev => ({
        ...prev,
        projectPath: result.projectPath,
        projectName: name,
        sfxTracks: newSFXTracks,
        createdAt: new Date()
      }))

      await saveProjectInternal(result.projectPath, name, new Date().toISOString())
    } catch (error) {
      console.error('Failed to save project as:', error)
      throw error
    }
  }

  const loadProject = async (projectPath: string) => {
    try {
      const projectData = await window.electronAPI.loadProject(projectPath)
      const deserialized = deserializeProject(projectPath, projectData)

      setState({
        videoPath: deserialized.videoPath,
        videoMetadata: deserialized.videoMetadata,
        currentTime: 0,
        duration: deserialized.duration,
        isPlaying: false,
        subtitles: deserialized.subtitles,
        sfxTracks: deserialized.sfxTracks,
        textOverlays: deserialized.textOverlays,
        analysis: deserialized.analysis,
        isAnalyzing: false,
        projectPath,
        projectName: deserialized.projectName,
        hasUnsavedChanges: false,
        lastSaved: new Date(deserialized.lastModified),
        isSaving: false,
        createdAt: new Date(deserialized.createdAt)
      })
    } catch (error) {
      console.error('Failed to load project:', error)
      throw error
    }
  }

  const closeProject = () => {
    setState({
      videoPath: null,
      videoMetadata: null,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      subtitles: [],
      sfxTracks: [],
      textOverlays: [],
      analysis: null,
      isAnalyzing: false,
      projectPath: null,
      projectName: null,
      hasUnsavedChanges: false,
      lastSaved: null,
      isSaving: false,
      createdAt: null
    })
  }

  const markDirty = () => {
    setState(prev => ({ ...prev, hasUnsavedChanges: true }))
  }

  const markClean = () => {
    setState(prev => ({ ...prev, hasUnsavedChanges: false }))
  }

  return (
    <ProjectContext.Provider
      value={{
        ...state,
        setVideoPath,
        setVideoMetadata,
        setCurrentTime,
        setDuration,
        setIsPlaying,
        addSubtitle,
        updateSubtitle,
        deleteSubtitle,
        addSFXTrack,
        updateSFXTrack,
        deleteSFXTrack,
        addTextOverlay,
        updateTextOverlay,
        deleteTextOverlay,
        setAnalysis,
        setIsAnalyzing,
        createNewProject,
        saveProject,
        saveProjectAs,
        loadProject,
        closeProject,
        markDirty,
        markClean
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
