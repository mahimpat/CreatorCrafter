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
  // AI-powered caption styling
  words?: Array<{
    text: string
    start: number
    end: number
    emphasized?: boolean  // Auto-detected emphasis (numbers, power words, ALL CAPS)
    emphasisType?: 'number' | 'caps' | 'keyword' | 'entity'  // Why it's emphasized
  }>
  animation?: {
    type: 'none' | 'karaoke' | 'pop' | 'slide'
    duration?: number  // Animation duration per word in ms
  }
  template?: 'dynamic' | 'impact' | 'minimal' | 'energetic' | 'professional' | 'custom'  // Applied style template
  emphasisColor?: string  // Override color for emphasized words
  sentimentColors?: {
    positive: string
    negative: string
    neutral: string
    question: string
  }
  sentiment?: 'positive' | 'negative' | 'neutral' | 'question'  // Overall sentiment of caption
}

export interface SFXTrack {
  id: string
  path: string
  start: number
  duration: number
  originalDuration: number  // Store original duration to prevent enlarging beyond source
  volume: number
  prompt?: string
  trimStart?: number  // Offset in source audio file for playback (used when splitting)
  clipStart?: number  // Alias for trimStart - start offset in source file
  clipEnd?: number    // End offset in source file
}

export interface AudioTrack {
  id: string
  path: string
  start: number
  duration: number
  originalDuration: number
  volume: number
  trimStart?: number  // Offset in source audio file for playback (used when splitting)
  clipStart?: number  // Alias for trimStart - start offset in source file
  clipEnd?: number    // End offset in source file
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

export interface VideoClip {
  id: string
  name: string
  path: string
  duration: number
  thumbnail?: string
  importedAt: number
}

export interface VideoTimelineClip {
  id: string
  videoClipId: string // Reference to VideoClip
  start: number
  duration: number
  clipStart: number // Start time within the source video
  clipEnd: number // End time within the source video
}

// Media Overlay System (Images & Videos as overlays)
export interface MediaOverlayAsset {
  id: string
  name: string
  path: string
  type: 'image' | 'video'
  duration: number // For videos, or display duration for images
  width?: number
  height?: number
  thumbnail?: string
  importedAt: number
}

export interface MediaOverlay {
  id: string
  assetId: string // Reference to MediaOverlayAsset
  start: number // Start time on timeline
  duration: number // How long to show
  // Transform properties
  transform: {
    x: number // Position X (0-1, percentage of canvas)
    y: number // Position Y (0-1, percentage of canvas)
    width: number // Width (0-1, percentage of canvas width)
    height: number // Height (0-1, percentage of canvas height)
    rotation: number // Rotation in degrees
    scaleX: number // Scale X (1 = 100%)
    scaleY: number // Scale Y (1 = 100%)
    anchorX: number // Anchor point X (0-1, within overlay)
    anchorY: number // Anchor point Y (0-1, within overlay)
  }
  // Appearance properties
  opacity: number // 0-1
  visible: boolean
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  // Video-specific properties
  clipStart?: number // For video overlays - trim start
  clipEnd?: number // For video overlays - trim end
  volume?: number // For video overlays with audio (0-1)
  // Layer ordering
  zIndex: number // Higher = on top
}

// Unified Analysis Types
export interface ThumbnailCandidate {
  timestamp: number
  frame_number: number
  score: number
  has_faces: boolean
  face_count: number
  sharpness: number
  contrast: number
  vibrancy: number
}

export interface TranscriptionSegment {
  text: string
  start: number
  end: number
  confidence: number
}

export interface VisualScene {
  timestamp: number
  description: string
  type: string
}

export interface SFXSuggestion {
  timestamp: number
  prompt: string
  reason: string
  audio_context?: string
  visual_context?: string
  confidence: number
  type?: 'primary' | 'enhancement'  // primary = needed, enhancement = optional
  audio_present?: boolean
  motion_verified?: boolean
  event_type?: string
}

export interface MusicSuggestion {
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
}

export interface EventData {
  type: 'motion_peak' | 'scene_transition'
  timestamp: number
  frame?: number
  intensity?: number
  category?: string
  from_mood?: string
  to_mood?: string
}

export interface UnifiedAnalysisResult {
  success: boolean
  video_path: string
  analyzed_at: number  // timestamp in milliseconds
  thumbnail_candidates: ThumbnailCandidate[]
  transcription: TranscriptionSegment[]
  visual_scenes: VisualScene[]
  events: EventData[]
  sfx_suggestions: SFXSuggestion[]
  music_suggestions: MusicSuggestion[]
  error?: string
}

// Legacy type for backwards compatibility
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
    reason?: string
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
  audioTracks: AudioTrack[]  // Editable audio segments
  currentTime: number
  duration: number
  isPlaying: boolean
  subtitles: Subtitle[]
  sfxTracks: SFXTrack[]
  sfxLibrary: SFXLibraryItem[]
  textOverlays: TextOverlay[]
  analysis: VideoAnalysisResult | null  // Legacy
  unifiedAnalysis: UnifiedAnalysisResult | null  // New unified system
  isAnalyzing: boolean
  // Multi-video support
  videoClips: VideoClip[]
  videoTimelineClips: VideoTimelineClip[]
  // Media overlay support (images & videos)
  mediaOverlayAssets: MediaOverlayAsset[]
  mediaOverlays: MediaOverlay[]
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
  splitSFXTrack: (id: string, splitTime: number) => void
  addSFXToLibrary: (item: SFXLibraryItem) => void
  removeSFXFromLibrary: (id: string) => void
  addAudioTrack: (track: AudioTrack) => void
  updateAudioTrack: (id: string, track: Partial<AudioTrack>) => void
  deleteAudioTrack: (id: string) => void
  splitAudioTrack: (id: string, splitTime: number) => void
  addTextOverlay: (overlay: TextOverlay) => void
  updateTextOverlay: (id: string, overlay: Partial<TextOverlay>) => void
  deleteTextOverlay: (id: string) => void
  setAnalysis: (analysis: VideoAnalysisResult | null) => void
  setUnifiedAnalysis: (analysis: UnifiedAnalysisResult | null) => void
  setIsAnalyzing: (analyzing: boolean) => void
  // Video clip management
  importVideoClip: (path: string) => Promise<void>
  addVideoClip: (clip: VideoClip) => void
  removeVideoClip: (id: string) => void
  addVideoToTimeline: (clip: VideoTimelineClip) => void
  updateVideoTimelineClip: (id: string, clip: Partial<VideoTimelineClip>) => void
  deleteVideoTimelineClip: (id: string) => void
  // Media overlay management
  importMediaOverlay: (path: string, type: 'image' | 'video') => Promise<void>
  addMediaOverlayAsset: (asset: MediaOverlayAsset) => void
  removeMediaOverlayAsset: (id: string) => void
  addMediaOverlayToTimeline: (overlay: MediaOverlay) => void
  updateMediaOverlay: (id: string, overlay: Partial<MediaOverlay>) => void
  deleteMediaOverlay: (id: string) => void
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
    audioTracks: [],
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    subtitles: [],
    sfxTracks: [],
    sfxLibrary: [],
    textOverlays: [],
    analysis: null,
    unifiedAnalysis: null,
    isAnalyzing: false,
    videoClips: [],
    videoTimelineClips: [],
    mediaOverlayAssets: [],
    mediaOverlays: [],
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
    setState(prev => {
      if (path && prev.duration > 0) {
        // Initialize audio tracks with a single segment spanning the entire duration
        const audioTrack: AudioTrack = {
          id: `audio-${Date.now()}`,
          path,
          start: 0,
          duration: prev.duration,
          originalDuration: prev.duration,
          volume: 1,
          trimStart: 0
        }
        return { ...prev, originalAudioPath: path, audioTracks: [audioTrack] }
      }
      return { ...prev, originalAudioPath: path, audioTracks: [] }
    })
  }

  const setCurrentTime = (time: number) => {
    setState(prev => ({ ...prev, currentTime: time }))
  }

  const setDuration = (duration: number) => {
    setState(prev => {
      // If we have an audio path but no tracks, initialize them now
      if (prev.originalAudioPath && prev.audioTracks.length === 0 && duration > 0) {
        const audioTrack: AudioTrack = {
          id: `audio-${Date.now()}`,
          path: prev.originalAudioPath,
          start: 0,
          duration,
          originalDuration: duration,
          volume: 1,
          trimStart: 0
        }
        return { ...prev, duration, audioTracks: [audioTrack] }
      }
      return { ...prev, duration }
    })
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
    // Ensure originalDuration is set (for backward compatibility)
    const trackWithOriginal = {
      ...track,
      originalDuration: track.originalDuration || track.duration
    }
    setState(prev => ({
      ...prev,
      sfxTracks: [...prev.sfxTracks, trackWithOriginal],
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

  const splitSFXTrack = (id: string, splitTime: number) => {
    setState(prev => {
      const trackToSplit = prev.sfxTracks.find(t => t.id === id)
      if (!trackToSplit) return prev

      // Calculate split position relative to track start
      const relativeTime = splitTime - trackToSplit.start

      // Ensure split time is within track bounds
      if (relativeTime <= 0 || relativeTime >= trackToSplit.duration) {
        return prev
      }

      // Create two new tracks
      const leftTrack: SFXTrack = {
        ...trackToSplit,
        id: `sfx-${Date.now()}-left`,
        duration: relativeTime,
        // Keep same start time
      }

      const rightTrack: SFXTrack = {
        ...trackToSplit,
        id: `sfx-${Date.now()}-right`,
        start: splitTime,
        duration: trackToSplit.duration - relativeTime,
        // Trimstart is used for audio playback offset
        trimStart: (trackToSplit.trimStart || 0) + relativeTime,
      }

      // Remove original track and add the two new tracks
      return {
        ...prev,
        sfxTracks: [
          ...prev.sfxTracks.filter(t => t.id !== id),
          leftTrack,
          rightTrack
        ],
        hasUnsavedChanges: true
      }
    })
  }

  // Audio track management functions
  const addAudioTrack = (track: AudioTrack) => {
    setState(prev => ({
      ...prev,
      audioTracks: [...prev.audioTracks, track],
      hasUnsavedChanges: true
    }))
  }

  const updateAudioTrack = (id: string, track: Partial<AudioTrack>) => {
    setState(prev => ({
      ...prev,
      audioTracks: prev.audioTracks.map(t => (t.id === id ? { ...t, ...track } : t)),
      hasUnsavedChanges: true
    }))
  }

  const deleteAudioTrack = (id: string) => {
    setState(prev => ({
      ...prev,
      audioTracks: prev.audioTracks.filter(t => t.id !== id),
      hasUnsavedChanges: true
    }))
  }

  const splitAudioTrack = (id: string, splitTime: number) => {
    setState(prev => {
      const trackToSplit = prev.audioTracks.find(t => t.id === id)
      if (!trackToSplit) return prev

      // Calculate split position relative to track start
      const relativeTime = splitTime - trackToSplit.start

      // Ensure split time is within track bounds
      if (relativeTime <= 0 || relativeTime >= trackToSplit.duration) {
        return prev
      }

      // Create two new tracks
      const leftTrack: AudioTrack = {
        ...trackToSplit,
        id: `audio-${Date.now()}-left`,
        duration: relativeTime,
      }

      const rightTrack: AudioTrack = {
        ...trackToSplit,
        id: `audio-${Date.now()}-right`,
        start: splitTime,
        duration: trackToSplit.duration - relativeTime,
        trimStart: (trackToSplit.trimStart || 0) + relativeTime,
      }

      // Remove original track and add the two new tracks
      return {
        ...prev,
        audioTracks: [
          ...prev.audioTracks.filter(t => t.id !== id),
          leftTrack,
          rightTrack
        ],
        hasUnsavedChanges: true
      }
    })
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

  const setUnifiedAnalysis = (analysis: UnifiedAnalysisResult | null) => {
    setState(prev => ({ ...prev, unifiedAnalysis: analysis }))
  }

  const setIsAnalyzing = (analyzing: boolean) => {
    setState(prev => ({ ...prev, isAnalyzing: analyzing }))
  }

  // Video clip management methods
  const importVideoClip = async (path: string) => {
    try {
      // Get metadata for the video
      const metadata = await window.electronAPI.getVideoMetadata(path)

      // Create video clip object
      const videoClip: VideoClip = {
        id: `video-${Date.now()}`,
        name: path.split('/').pop() || path.split('\\').pop() || 'Video',
        path: path,
        duration: metadata.format?.duration || 0,
        importedAt: Date.now()
      }

      // Add to video clips library
      addVideoClip(videoClip)
    } catch (error) {
      console.error('Error importing video clip:', error)
      throw error
    }
  }

  const addVideoClip = (clip: VideoClip) => {
    setState(prev => ({
      ...prev,
      videoClips: [...prev.videoClips, clip],
      hasUnsavedChanges: true
    }))
  }

  const removeVideoClip = (id: string) => {
    setState(prev => ({
      ...prev,
      videoClips: prev.videoClips.filter(clip => clip.id !== id),
      // Also remove any timeline clips using this video
      videoTimelineClips: prev.videoTimelineClips.filter(tc => tc.videoClipId !== id),
      hasUnsavedChanges: true
    }))
  }

  const addVideoToTimeline = (clip: VideoTimelineClip) => {
    setState(prev => ({
      ...prev,
      videoTimelineClips: [...prev.videoTimelineClips, clip],
      hasUnsavedChanges: true
    }))
  }

  const updateVideoTimelineClip = (id: string, clip: Partial<VideoTimelineClip>) => {
    setState(prev => ({
      ...prev,
      videoTimelineClips: prev.videoTimelineClips.map(c =>
        c.id === id ? { ...c, ...clip } : c
      ),
      hasUnsavedChanges: true
    }))
  }

  const deleteVideoTimelineClip = (id: string) => {
    setState(prev => ({
      ...prev,
      videoTimelineClips: prev.videoTimelineClips.filter(c => c.id !== id),
      hasUnsavedChanges: true
    }))
  }

  // Media overlay management functions
  const importMediaOverlay = async (path: string, type: 'image' | 'video') => {
    try {
      let duration = 5 // Default duration for images (5 seconds)
      let width: number | undefined
      let height: number | undefined

      if (type === 'video') {
        // Get metadata for video overlays
        const metadata = await window.electronAPI.getVideoMetadata(path)
        duration = metadata.format?.duration || 5

        // Get video dimensions
        const videoStream = metadata.streams.find(s => s.codec_type === 'video')
        if (videoStream) {
          width = videoStream.width
          height = videoStream.height
        }
      } else {
        // For images, we'd need to load the image to get dimensions
        // For now, we'll set them when rendering
        duration = 5 // Default 5 seconds for images
      }

      // Create media overlay asset
      const asset: MediaOverlayAsset = {
        id: `overlay-asset-${Date.now()}`,
        name: path.split('/').pop() || path.split('\\').pop() || 'Media',
        path: path,
        type: type,
        duration: duration,
        width: width,
        height: height,
        importedAt: Date.now()
      }

      // Add to media overlay assets library
      addMediaOverlayAsset(asset)
    } catch (error) {
      console.error('Error importing media overlay:', error)
      throw error
    }
  }

  const addMediaOverlayAsset = (asset: MediaOverlayAsset) => {
    setState(prev => ({
      ...prev,
      mediaOverlayAssets: [...prev.mediaOverlayAssets, asset],
      hasUnsavedChanges: true
    }))
  }

  const removeMediaOverlayAsset = (id: string) => {
    setState(prev => ({
      ...prev,
      mediaOverlayAssets: prev.mediaOverlayAssets.filter(a => a.id !== id),
      // Also remove any overlays using this asset
      mediaOverlays: prev.mediaOverlays.filter(o => o.assetId !== id),
      hasUnsavedChanges: true
    }))
  }

  const addMediaOverlayToTimeline = (overlay: MediaOverlay) => {
    setState(prev => ({
      ...prev,
      mediaOverlays: [...prev.mediaOverlays, overlay],
      hasUnsavedChanges: true
    }))
  }

  const updateMediaOverlay = (id: string, overlay: Partial<MediaOverlay>) => {
    setState(prev => ({
      ...prev,
      mediaOverlays: prev.mediaOverlays.map(o =>
        o.id === id ? { ...o, ...overlay } : o
      ),
      hasUnsavedChanges: true
    }))
  }

  const deleteMediaOverlay = (id: string) => {
    setState(prev => ({
      ...prev,
      mediaOverlays: prev.mediaOverlays.filter(o => o.id !== id),
      hasUnsavedChanges: true
    }))
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
      const duration = metadata.format.duration

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
        videoClips: [],
        videoTimelineClips: [],
        mediaOverlayAssets: [],
        mediaOverlays: [],
        audioTracks: [],
        analysis: null,
        unifiedAnalysis: null,
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
          sfxLibrary: state.sfxLibrary,
          textOverlays: state.textOverlays,
          analysis: state.analysis,
          unifiedAnalysis: state.unifiedAnalysis
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
        videoClips: deserialized.videoClips || [],
        videoTimelineClips: deserialized.videoTimelineClips || [],
        mediaOverlayAssets: deserialized.mediaOverlayAssets || [],
        mediaOverlays: deserialized.mediaOverlays || [],
        audioTracks: deserialized.audioTracks || [],
        analysis: deserialized.analysis,
        unifiedAnalysis: deserialized.unifiedAnalysis || null,
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
      audioTracks: [],
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      subtitles: [],
      sfxTracks: [],
      sfxLibrary: [],
      textOverlays: [],
      analysis: null,
      unifiedAnalysis: null,
      isAnalyzing: false,
      videoClips: [],
      videoTimelineClips: [],
      mediaOverlayAssets: [],
      mediaOverlays: [],
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
        splitSFXTrack,
        addSFXToLibrary,
        removeSFXFromLibrary,
        addAudioTrack,
        updateAudioTrack,
        deleteAudioTrack,
        splitAudioTrack,
        addTextOverlay,
        updateTextOverlay,
        deleteTextOverlay,
        setAnalysis,
        setUnifiedAnalysis,
        setIsAnalyzing,
        importVideoClip,
        addVideoClip,
        removeVideoClip,
        addVideoToTimeline,
        updateVideoTimelineClip,
        deleteVideoTimelineClip,
        importMediaOverlay,
        addMediaOverlayAsset,
        removeMediaOverlayAsset,
        addMediaOverlayToTimeline,
        updateMediaOverlay,
        deleteMediaOverlay,
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
