import React, { createContext, useContext, useState, ReactNode } from 'react'

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
    isAnalyzing: false
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
      subtitles: [...prev.subtitles, subtitle]
    }))
  }

  const updateSubtitle = (id: string, subtitle: Partial<Subtitle>) => {
    setState(prev => ({
      ...prev,
      subtitles: prev.subtitles.map(s => (s.id === id ? { ...s, ...subtitle } : s))
    }))
  }

  const deleteSubtitle = (id: string) => {
    setState(prev => ({
      ...prev,
      subtitles: prev.subtitles.filter(s => s.id !== id)
    }))
  }

  const addSFXTrack = (track: SFXTrack) => {
    setState(prev => ({
      ...prev,
      sfxTracks: [...prev.sfxTracks, track]
    }))
  }

  const updateSFXTrack = (id: string, track: Partial<SFXTrack>) => {
    setState(prev => ({
      ...prev,
      sfxTracks: prev.sfxTracks.map(t => (t.id === id ? { ...t, ...track } : t))
    }))
  }

  const deleteSFXTrack = (id: string) => {
    setState(prev => ({
      ...prev,
      sfxTracks: prev.sfxTracks.filter(t => t.id !== id)
    }))
  }

  const addTextOverlay = (overlay: TextOverlay) => {
    setState(prev => ({
      ...prev,
      textOverlays: [...prev.textOverlays, overlay]
    }))
  }

  const updateTextOverlay = (id: string, overlay: Partial<TextOverlay>) => {
    setState(prev => ({
      ...prev,
      textOverlays: prev.textOverlays.map(o => (o.id === id ? { ...o, ...overlay } : o))
    }))
  }

  const deleteTextOverlay = (id: string) => {
    setState(prev => ({
      ...prev,
      textOverlays: prev.textOverlays.filter(o => o.id !== id)
    }))
  }

  const setAnalysis = (analysis: VideoAnalysisResult | null) => {
    setState(prev => ({ ...prev, analysis }))
  }

  const setIsAnalyzing = (analyzing: boolean) => {
    setState(prev => ({ ...prev, isAnalyzing: analyzing }))
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
        setIsAnalyzing
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
