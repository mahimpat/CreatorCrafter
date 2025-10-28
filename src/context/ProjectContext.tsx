import { createContext, useContext, useState, useRef, ReactNode } from 'react'
import { serializeProject, deserializeProject } from '../utils/projectSerializer'
import { CommandHistory } from '../utils/commandHistory'

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

export interface SFXLibraryItem {
  id: string
  path: string
  prompt: string
  duration: number
  createdAt: number
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
  originalAudioPath: string | null
  currentTime: number
  duration: number
  isPlaying: boolean
  subtitles: Subtitle[]
  sfxTracks: SFXTrack[]
  sfxLibrary: SFXLibraryItem[]
  textOverlays: TextOverlay[]
  analysis: VideoAnalysisResult | null
  isAnalyzing: boolean
  // Timeline editing
  selectedClipIds: string[]
  snappingEnabled: boolean
  canUndo: boolean
  canRedo: boolean
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
  setOriginalAudioPath: (path: string | null) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
  addSubtitle: (subtitle: Subtitle) => void
  updateSubtitle: (id: string, subtitle: Partial<Subtitle>) => void
  deleteSubtitle: (id: string) => void
  addSFXTrack: (track: SFXTrack) => void
  updateSFXTrack: (id: string, track: Partial<SFXTrack>) => void
  deleteSFXTrack: (id: string) => void
  addSFXToLibrary: (item: SFXLibraryItem) => void
  removeSFXFromLibrary: (id: string) => void
  addTextOverlay: (overlay: TextOverlay) => void
  updateTextOverlay: (id: string, overlay: Partial<TextOverlay>) => void
  deleteTextOverlay: (id: string) => void
  setAnalysis: (analysis: VideoAnalysisResult | null) => void
  setIsAnalyzing: (analyzing: boolean) => void
  // Timeline editing methods
  selectClip: (id: string, multiSelect?: boolean) => void
  deselectClip: (id: string) => void
  clearSelection: () => void
  selectAll: () => void
  deleteSelectedClips: () => void
  toggleSnapping: () => void
  undo: () => void
  redo: () => void
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
    originalAudioPath: null,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    subtitles: [],
    sfxTracks: [],
    sfxLibrary: [],
    textOverlays: [],
    analysis: null,
    isAnalyzing: false,
    selectedClipIds: [],
    snappingEnabled: true,
    canUndo: false,
    canRedo: false,
    projectPath: null,
    projectName: null,
    hasUnsavedChanges: false,
    lastSaved: null,
    isSaving: false,
    createdAt: null
  })

  // Command history for undo/redo (persists across renders)
  const commandHistory = useRef(new CommandHistory())

  // Helper to update undo/redo state after command history changes
  const updateUndoRedoState = () => {
    setState(prev => ({
      ...prev,
      canUndo: commandHistory.current.canUndo(),
      canRedo: commandHistory.current.canRedo()
    }))
  }

  const setVideoPath = (path: string | null) => {
    setState(prev => ({ ...prev, videoPath: path }))
  }

  const setVideoMetadata = (metadata: any) => {
    setState(prev => ({ ...prev, videoMetadata: metadata }))
  }

  const setOriginalAudioPath = (path: string | null) => {
    setState(prev => ({ ...prev, originalAudioPath: path }))
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

  const addSFXToLibrary = (item: SFXLibraryItem) => {
    setState(prev => ({
      ...prev,
      sfxLibrary: [...prev.sfxLibrary, item],
      hasUnsavedChanges: true
    }))
  }

  const removeSFXFromLibrary = (id: string) => {
    setState(prev => ({
      ...prev,
      sfxLibrary: prev.sfxLibrary.filter(item => item.id !== id),
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

  // Timeline editing methods
  const selectClip = (id: string, multiSelect: boolean = false) => {
    setState(prev => {
      if (multiSelect) {
        // Toggle selection with multi-select
        const isSelected = prev.selectedClipIds.includes(id)
        return {
          ...prev,
          selectedClipIds: isSelected
            ? prev.selectedClipIds.filter(clipId => clipId !== id)
            : [...prev.selectedClipIds, id]
        }
      } else {
        // Single selection - replace current selection
        return {
          ...prev,
          selectedClipIds: [id]
        }
      }
    })
  }

  const deselectClip = (id: string) => {
    setState(prev => ({
      ...prev,
      selectedClipIds: prev.selectedClipIds.filter(clipId => clipId !== id)
    }))
  }

  const clearSelection = () => {
    setState(prev => ({
      ...prev,
      selectedClipIds: []
    }))
  }

  const selectAll = () => {
    setState(prev => {
      // Collect all clip IDs from all tracks
      const allClipIds = [
        ...prev.subtitles.map(s => s.id),
        ...prev.sfxTracks.map(t => t.id),
        ...prev.textOverlays.map(o => o.id)
      ]
      return {
        ...prev,
        selectedClipIds: allClipIds
      }
    })
  }

  const deleteSelectedClips = () => {
    setState(prev => {
      if (prev.selectedClipIds.length === 0) return prev

      // Separate selections by type
      const selectedSFXIds = new Set(prev.selectedClipIds)
      const selectedSubtitleIds = new Set(prev.selectedClipIds)
      const selectedOverlayIds = new Set(prev.selectedClipIds)

      // Delete from all tracks
      const newSFXTracks = prev.sfxTracks.filter(t => !selectedSFXIds.has(t.id))
      const newSubtitles = prev.subtitles.filter(s => !selectedSubtitleIds.has(s.id))
      const newTextOverlays = prev.textOverlays.filter(o => !selectedOverlayIds.has(o.id))

      // Ripple delete: close gaps by shifting clips left
      // For SFX tracks, we need to identify gaps and shift clips
      const sortedDeletedSFX = prev.sfxTracks
        .filter(t => selectedSFXIds.has(t.id))
        .sort((a, b) => a.start - b.start)

      let rippledSFXTracks = [...newSFXTracks]
      sortedDeletedSFX.forEach(deletedTrack => {
        const deletedEnd = deletedTrack.start + deletedTrack.duration
        // Shift all clips that start after this deleted clip
        rippledSFXTracks = rippledSFXTracks.map(track => {
          if (track.start >= deletedEnd) {
            return {
              ...track,
              start: track.start - deletedTrack.duration
            }
          }
          return track
        })
      })

      return {
        ...prev,
        sfxTracks: rippledSFXTracks,
        subtitles: newSubtitles,
        textOverlays: newTextOverlays,
        selectedClipIds: [],
        hasUnsavedChanges: true
      }
    })
  }

  const toggleSnapping = () => {
    setState(prev => ({
      ...prev,
      snappingEnabled: !prev.snappingEnabled
    }))
  }

  const undo = () => {
    if (commandHistory.current.undo()) {
      updateUndoRedoState()
    }
  }

  const redo = () => {
    if (commandHistory.current.redo()) {
      updateUndoRedoState()
    }
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

      // Extract audio from video and save to project
      let originalAudioPath: string | null = null
      try {
        const audioPath = await window.electronAPI.extractAudio(videoPath)
        // Copy audio to project assets/sfx folder
        const audioRelativePath = await window.electronAPI.copyAssetToProject(
          audioPath,
          result.projectPath,
          'sfx'
        )
        originalAudioPath = await window.electronAPI.resolveProjectPath(
          result.projectPath,
          audioRelativePath
        )
      } catch (error) {
        console.warn('Could not extract audio from video:', error)
        // Continue without audio - some videos may not have audio
      }

      // Initialize project state
      setState({
        videoPath: resolvedVideoPath,
        videoMetadata: metadata,
        originalAudioPath,
        currentTime: 0,
        duration,
        isPlaying: false,
        subtitles: [],
        sfxTracks: [],
        sfxLibrary: [],
        textOverlays: [],
        analysis: null,
        isAnalyzing: false,
        selectedClipIds: [],
        snappingEnabled: true,
        canUndo: false,
        canRedo: false,
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
          originalAudioPath: state.originalAudioPath,
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
        originalAudioPath: deserialized.originalAudioPath || null,
        currentTime: 0,
        duration: deserialized.duration,
        isPlaying: false,
        subtitles: deserialized.subtitles,
        sfxTracks: deserialized.sfxTracks,
        sfxLibrary: deserialized.sfxLibrary || [],
        textOverlays: deserialized.textOverlays,
        analysis: deserialized.analysis,
        isAnalyzing: false,
        selectedClipIds: [],
        snappingEnabled: true,
        canUndo: false,
        canRedo: false,
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
    // Clear command history when closing project
    commandHistory.current.clear()

    setState({
      videoPath: null,
      videoMetadata: null,
      originalAudioPath: null,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      subtitles: [],
      sfxTracks: [],
      sfxLibrary: [],
      textOverlays: [],
      analysis: null,
      isAnalyzing: false,
      selectedClipIds: [],
      snappingEnabled: true,
      canUndo: false,
      canRedo: false,
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
        setOriginalAudioPath,
        setCurrentTime,
        setDuration,
        setIsPlaying,
        addSubtitle,
        updateSubtitle,
        deleteSubtitle,
        addSFXTrack,
        updateSFXTrack,
        deleteSFXTrack,
        addSFXToLibrary,
        removeSFXFromLibrary,
        addTextOverlay,
        updateTextOverlay,
        deleteTextOverlay,
        setAnalysis,
        setIsAnalyzing,
        selectClip,
        deselectClip,
        clearSelection,
        selectAll,
        deleteSelectedClips,
        toggleSnapping,
        undo,
        redo,
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
