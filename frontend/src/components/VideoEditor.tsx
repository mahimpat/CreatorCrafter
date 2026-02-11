/**
 * VideoEditor - Main video editing interface
 * Adapted for web from the Electron version
 *
 * Enhanced with:
 * - Better error handling for various video formats
 * - Frame-accurate seeking using requestVideoFrameCallback
 * - Preloading optimization for smoother clip transitions
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useWebSocket, ProgressUpdate } from '../hooks/useWebSocket'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
// useEnhancedVideo disabled temporarily - causing infinite loop
// import { useEnhancedVideo } from '../hooks/useEnhancedVideo'
import {
  ArrowLeft,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Save,
  Download,
  Type,
  Subtitles,
  SkipBack,
  SkipForward,
  Wand2,
  Film,
  Headphones,
  Keyboard,
  PanelLeftClose,
  PanelLeft,
  Scissors,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Loader2,
  Disc3,
} from 'lucide-react'
import { VideoClip, BackgroundAudio, Transition, VideoAnalysisResult, projectsApi } from '../api'
import Timeline from './Timeline'
import SubtitleEditor from './SubtitleEditor'
import OverlayEditor from './OverlayEditor'
import ClipsPanel from './ClipsPanel'
import AudioEditor from './AudioEditor'
import TransitionsEditor, { TransitionType } from './TransitionsEditor'
import ModeSwitcher from './ModeSwitcher'
import AssetsPanel from './AssetsPanel'
import AutoEditPanel from './AutoEditPanel'
import AnalysisOverlay from './AnalysisOverlay'
import ExportDialog from './ExportDialog'
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp'
import { useToast } from './Toast'
import ReviewModal from './ReviewModal'
import WebGLTransitionCanvas from './WebGLTransitionCanvas'
import { isWebGL2Supported } from '../utils/webglUtils'
import { TRANSITION_MAP } from '../utils/glTransitions'
import './VideoEditor.css'
import './TransitionEffects.css'
import './TransitionEffects2.css'

type ActiveTab = 'clips' | 'subtitles' | 'audio' | 'overlays' | 'transitions' | 'insights'

export default function VideoEditor() {
  const navigate = useNavigate()
  const { showError, showWarning, showSuccess } = useToast()

  // === ALL REFS MUST BE DEFINED FIRST (before any callbacks) ===
  const videoRef = useRef<HTMLVideoElement>(null)
  const toVideoRef = useRef<HTMLVideoElement>(null) // Hidden video for WebGL transition "to" texture
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoReadyRef = useRef(false)
  const seekCompletedRef = useRef(true)
  const preloadCacheRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const isSeekingRef = useRef(false)
  const pendingSeekRef = useRef<number | null>(null)
  const isTransitioningRef = useRef(false)
  const shouldAutoPlayRef = useRef(false)
  const sfxAudioRefs = useRef<Map<number, HTMLAudioElement>>(new Map())
  const currentTimeRef = useRef(0)

  // === useProject MUST BE CALLED BEFORE callbacks that use its return values ===
  const {
    project,
    projectMode,
    videoUrl,
    currentTime,
    duration,
    isPlaying,
    subtitles,
    sfxTracks,
    textOverlays,
    isAnalyzing,
    analysis,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    uploadVideo,
    analyzeVideo,
    addSFXTrack,
    setAnalysis,
    setIsAnalyzing,
    saveProject,
    hasUnsavedChanges,
    setProjectMode,
    getSFXStreamUrl,
    refreshProject,
  } = useProject()

  // WebGL support detection
  const [webglSupported] = useState(() => isWebGL2Supported())

  // Video state management
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState<{ message: string; recoverable: boolean } | null>(null)

  const preloadClip = useCallback(async (url: string) => {
    if (preloadCacheRef.current.has(url)) return

    const video = document.createElement('video')
    video.preload = 'auto'
    video.src = url
    video.load()
    preloadCacheRef.current.set(url, video)

    // Clean up old entries if cache is too large
    if (preloadCacheRef.current.size > 5) {
      const firstKey = preloadCacheRef.current.keys().next().value
      if (firstKey) {
        const oldVideo = preloadCacheRef.current.get(firstKey)
        if (oldVideo) {
          oldVideo.src = ''
        }
        preloadCacheRef.current.delete(firstKey)
      }
    }
  }, [])

  const retryLoad = useCallback(() => {
    if (videoRef.current) {
      setVideoError(null)
      setIsVideoLoading(true)
      videoRef.current.load()
    }
  }, [])

  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    console.error('Video error:', video.error)
    setIsVideoLoading(false)
    videoReadyRef.current = false

    if (video.error) {
      const isNetworkError = video.error.code === MediaError.MEDIA_ERR_NETWORK
      setVideoError({
        message: video.error.message || 'Failed to load video',
        recoverable: isNetworkError
      })
    }
  }, [])

  const handleLoadStart = useCallback(() => {
    setIsVideoLoading(true)
    setVideoError(null)
    videoReadyRef.current = false
  }, [])

  const handleCanPlay = useCallback(() => {
    setIsVideoLoading(false)
    videoReadyRef.current = true
    // Note: Seeking is handled by handleLoadedMetadata, not here
    // This just marks the video as ready to play
  }, [])

  // Store timeout ID for cleanup
  const waitingTimeoutRef = useRef<number | null>(null)

  const handleWaiting = useCallback(() => {
    // Clear any existing timeout
    if (waitingTimeoutRef.current) {
      clearTimeout(waitingTimeoutRef.current)
    }
    // Only show loading if buffering takes more than 300ms
    waitingTimeoutRef.current = window.setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 3) {
        setIsVideoLoading(true)
      }
      waitingTimeoutRef.current = null
    }, 300)
  }, [])

  const handlePlaying = useCallback(() => {
    setIsVideoLoading(false)
  }, [])

  // Handle seeked event - seek is complete
  const handleSeeked = useCallback(() => {
    seekCompletedRef.current = true
    isSeekingRef.current = false

    // If we should auto-play after seek, do it now
    if (shouldAutoPlayRef.current && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.warn('Auto-play after seek failed:', err)
      })
      shouldAutoPlayRef.current = false
      setIsPlaying(true)
    }
  }, [setIsPlaying])

  const [activeTab, setActiveTab] = useState<ActiveTab>('subtitles')
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [videoClips, setVideoClips] = useState<VideoClip[]>([])
  const [bgmTracks, setBgmTracks] = useState<BackgroundAudio[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showAssetsPanel, setShowAssetsPanel] = useState(true)
  // Intro/Outro effects (fade in at start, fade out at end)
  const [introEffect, setIntroEffect] = useState<{ type: string; duration: number } | null>(null)
  const [outroEffect, setOutroEffect] = useState<{ type: string; duration: number } | null>(null)
  const [showIntroEffect, setShowIntroEffect] = useState(false)
  const [showOutroEffect, setShowOutroEffect] = useState(false)

  // Phase 4: Manual mode intelligence
  const [showBeatMarkers, setShowBeatMarkers] = useState(false)
  const [snapToBeats, setSnapToBeats] = useState(false)
  const [isQuickTranscribing, setIsQuickTranscribing] = useState(false)

  // Multi-clip playback state
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [currentClipUrl, setCurrentClipUrl] = useState<string | null>(null)
  // Transition effect state (CSS fallback)
  const [activeTransitionEffect, setActiveTransitionEffect] = useState<{
    type: string
    duration: number
    phase: 'out' | 'in'
    color?: string
  } | null>(null)
  // WebGL transition state
  const [webglTransitionConfig, setWebglTransitionConfig] = useState<{
    type: string
    duration: number
  } | null>(null)
  const [nextClipUrl, setNextClipUrl] = useState<string | null>(null)

  // Sort clips by timeline order
  const sortedClips = [...videoClips].sort((a, b) => a.timeline_order - b.timeline_order)

  // Phase 4: Extract beats from analysis for timeline
  const analysisBeats = useMemo(() => {
    const beats = analysis?.audio_advanced?.beats
    if (!beats || !Array.isArray(beats)) return []
    return beats.map((b: { timestamp: number; strength: number }) => ({
      timestamp: b.timestamp,
      strength: b.strength ?? 0.5,
    }))
  }, [analysis?.audio_advanced?.beats])

  const analysisBeatSyncPoints = useMemo(() => {
    const pts = analysis?.audio_advanced?.beat_sync_points
    if (!pts || !Array.isArray(pts)) return []
    return pts as number[]
  }, [analysis?.audio_advanced?.beat_sync_points])

  // Phase 4: Extract speech regions from transcription
  const speechRegions = useMemo(() => {
    if (!analysis?.transcription) return []
    return analysis.transcription.map(seg => ({
      start: seg.start,
      end: seg.end,
    }))
  }, [analysis?.transcription])

  // Phase 4: Scenes for shot type + color warnings
  const analysisScenes = useMemo(() => {
    return analysis?.scenes || []
  }, [analysis?.scenes])

  // Phase 4: Quick transcribe handler
  const handleQuickTranscribe = useCallback(async () => {
    if (!project?.id || isQuickTranscribing) return
    try {
      setIsQuickTranscribing(true)
      // Use the same analyze endpoint - transcription comes from the full analysis
      await analyzeVideo()
      showSuccess('Transcription complete! Check the Subtitles tab.')
    } catch {
      showError('Failed to transcribe. Please try again.')
    } finally {
      setIsQuickTranscribing(false)
    }
  }, [project?.id, isQuickTranscribing, analyzeVideo, showSuccess, showError])

  // Clip preloading is handled by preloadClip in useEnhancedVideo

  // Helper: Get effective duration of a clip (after trimming)
  const getClipEffectiveDuration = useCallback((clip: VideoClip) => {
    return (clip.duration || 0) - clip.start_trim - clip.end_trim
  }, [])

  // Helper: Calculate total duration of all clips
  const totalClipsDuration = useMemo(() => {
    return sortedClips.reduce((total, clip) => total + getClipEffectiveDuration(clip), 0)
  }, [sortedClips, getClipEffectiveDuration])

  // Helper: Build stream URL for a clip
  const getClipStreamUrl = useCallback((clip: VideoClip) => {
    if (!project?.id) return null
    const token = localStorage.getItem('access_token')
    const baseUrl = `/api/files/${project.id}/stream/clips/${clip.filename}`
    return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl
  }, [project?.id])

  // Helper: Find which clip and position corresponds to a timeline time
  const getClipAtTime = useCallback((timelineTime: number): { clip: VideoClip; index: number; clipTime: number } | null => {
    let accumulatedTime = 0

    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i]
      const clipDuration = getClipEffectiveDuration(clip)

      if (timelineTime < accumulatedTime + clipDuration) {
        // This is the clip we want
        const clipTime = timelineTime - accumulatedTime + clip.start_trim
        return { clip, index: i, clipTime }
      }

      accumulatedTime += clipDuration
    }

    // Past the end - return last clip at end
    if (sortedClips.length > 0) {
      const lastClip = sortedClips[sortedClips.length - 1]
      return {
        clip: lastClip,
        index: sortedClips.length - 1,
        clipTime: (lastClip.duration || 0) - lastClip.end_trim
      }
    }

    return null
  }, [sortedClips, getClipEffectiveDuration])

  // Helper: Get timeline time from clip index and clip time
  const getTimelineTimeFromClip = useCallback((clipIndex: number, clipTime: number) => {
    let timelineTime = 0
    for (let i = 0; i < clipIndex && i < sortedClips.length; i++) {
      timelineTime += getClipEffectiveDuration(sortedClips[i])
    }
    if (clipIndex < sortedClips.length) {
      const clip = sortedClips[clipIndex]
      timelineTime += clipTime - clip.start_trim
    }
    return timelineTime
  }, [sortedClips, getClipEffectiveDuration])

  // Update total duration when clips change
  useEffect(() => {
    if (sortedClips.length > 0 && totalClipsDuration > 0) {
      setDuration(totalClipsDuration)
    }
  }, [totalClipsDuration, setDuration, sortedClips.length])

  // Update current clip URL when clips load or clip index changes
  useEffect(() => {
    if (sortedClips.length > 0 && currentClipIndex < sortedClips.length) {
      const clip = sortedClips[currentClipIndex]
      const url = getClipStreamUrl(clip)
      // Always update URL when clips or index changes
      setCurrentClipUrl(url)

      // Preload next clips for smoother transitions
      const nextClips = sortedClips.slice(currentClipIndex + 1, currentClipIndex + 3)
      nextClips.forEach(nextClip => {
        const nextUrl = getClipStreamUrl(nextClip)
        if (nextUrl) {
          preloadClip(nextUrl)
        }
      })
    } else if (sortedClips.length === 0) {
      setCurrentClipUrl(null)
    }
  }, [sortedClips, currentClipIndex, getClipStreamUrl, preloadClip])

  // Load clips, BGM, and transitions on mount
  useEffect(() => {
    if (project?.id) {
      // Load video clips
      projectsApi.listClips(project.id)
        .then(res => setVideoClips(res.data))
        .catch(err => console.error('Failed to load clips:', err))

      // Load BGM tracks
      projectsApi.listBGM(project.id)
        .then(res => setBgmTracks(res.data))
        .catch(err => console.error('Failed to load BGM:', err))

      // Load transitions
      projectsApi.listTransitions(project.id)
        .then(res => setTransitions(res.data))
        .catch(err => console.error('Failed to load transitions:', err))
    }
  }, [project?.id])

  // WebSocket for progress updates
  useWebSocket({
    onProgress: (update: ProgressUpdate) => {
      if (update.type === 'video_analysis') {

      }
    },
    onComplete: async (update: ProgressUpdate) => {
      if (update.type === 'video_analysis_complete') {
        setIsAnalyzing(false)
        if (update.result) {
          setAnalysis(update.result as unknown as VideoAnalysisResult)
        }
      } else if (update.type === 'sfx_generation_complete') {
        if (update.result) {
          const result = update.result as { filename: string; prompt: string; duration: number }
          addSFXTrack({
            filename: result.filename,
            start_time: currentTimeRef.current,
            duration: result.duration,
            volume: 1,
            prompt: result.prompt,
          })
        }
      } else if (update.type === 'auto_generate_complete') {
        // Auto-generation completed - refresh all data
        if (project?.id) {
          try {
            const [clipsRes, transRes] = await Promise.all([
              projectsApi.listClips(project.id),
              projectsApi.listTransitions(project.id),
            ])
            setVideoClips(clipsRes.data)
            setTransitions(transRes.data)
          } catch (error) {
            console.error('Failed to refresh data after auto-generate:', error)
          }
        }
      }
    },
    onError: (update: ProgressUpdate) => {
      console.error('Task error:', update.error)
      if (update.type === 'video_analysis_error') {
        setIsAnalyzing(false)
      }
    },
  })

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => saveProject(),
    onPlayPause: () => {
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause()
        } else {
          videoRef.current.play()
        }
      }
    },
    onExport: () => videoUrl && setShowExportDialog(true),
    enabled: true,
  })

  // Toggle shortcuts help with '?' key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && !showExportDialog) {
        setShowShortcutsHelp(prev => !prev)
      }
    }
    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [showExportDialog])

  // Video handlers
  const handleVideoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        // In automatic mode, upload as a clip to sync with sidebar ClipsPanel
        if (projectMode === 'automatic' && project?.id) {
          setUploadProgress(10)
          const response = await projectsApi.uploadClip(project.id, file)
          setVideoClips(prev => [...prev, response.data])
          setUploadProgress(null)
        } else {
          // Legacy single-video upload for other modes
          await uploadVideo(file, setUploadProgress)
          setUploadProgress(null)
        }
      } catch (error) {
        console.error('Upload failed:', error)
        setUploadProgress(null)
      }
    },
    [uploadVideo, projectMode, project?.id]
  )

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
      return
    }

    // Starting playback
    if (sortedClips.length > 0) {
      const clipInfo = getClipAtTime(currentTime)
      if (clipInfo) {
        if (clipInfo.index !== currentClipIndex) {
          // Need to switch clips first, then play
          shouldAutoPlayRef.current = true
          isSeekingRef.current = true
          seekCompletedRef.current = false
          pendingSeekRef.current = clipInfo.clipTime
          setCurrentClipIndex(clipInfo.index)
          setCurrentClipUrl(getClipStreamUrl(clipInfo.clip))
          // Don't set isPlaying yet - it will be set after clip loads and seeks
          return
        } else {
          // Same clip - make sure video is at the correct clip time
          const expectedClipTime = clipInfo.clipTime
          const currentVideoTime = videoRef.current.currentTime
          const needsSeek = Math.abs(currentVideoTime - expectedClipTime) > 0.1

          if (needsSeek) {
            seekCompletedRef.current = false
            shouldAutoPlayRef.current = true
            videoRef.current.currentTime = expectedClipTime
            // Play will happen in handleSeeked callback
            return
          }
        }
      }
    }

    // No seeking needed, just play
    videoRef.current.play().catch(err => {
      console.warn('Play failed:', err)
    })
    setIsPlaying(true)
  }, [isPlaying, setIsPlaying, sortedClips, currentTime, currentClipIndex, getClipAtTime, getClipStreamUrl])

  // Handle time updates - convert clip time to timeline time
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && !isSeekingRef.current) {
      const clipTime = videoRef.current.currentTime
      if (sortedClips.length > 0) {
        // Multi-clip mode: convert clip-local time to timeline time
        const timelineTime = getTimelineTimeFromClip(currentClipIndex, clipTime)
        setCurrentTime(timelineTime)
        currentTimeRef.current = timelineTime
      } else {
        // Single video mode: use raw video time directly
        setCurrentTime(clipTime)
        currentTimeRef.current = clipTime
      }
    }
  }, [currentClipIndex, sortedClips.length, getTimelineTimeFromClip, setCurrentTime])

  // Direct clip switch without transition effects
  const switchToNextClipDirect = useCallback((nextIndex: number, nextClip: VideoClip, nextUrl: string | null) => {
    if (videoRef.current) {
      videoRef.current.pause()
    }

    // Set pending seek to the clip's start trim
    pendingSeekRef.current = nextClip.start_trim
    shouldAutoPlayRef.current = true
    seekCompletedRef.current = false

    setCurrentClipIndex(nextIndex)
    setCurrentClipUrl(nextUrl)

    // The handleCanPlay and handleSeeked callbacks will handle playing
    isTransitioningRef.current = false
  }, [])

  // CSS transition with phases
  const performCSSTransition = useCallback((
    appliedTransition: Transition,
    nextIndex: number,
    nextClip: VideoClip,
    nextUrl: string | null
  ) => {
    // Get color for color-based transitions
    const transitionColor = appliedTransition.parameters?.color ||
      (appliedTransition.type === 'flash' ? 'white' :
       appliedTransition.type === 'color_fade' ? '#8b5cf6' : undefined)

    // Start "out" phase of transition
    setActiveTransitionEffect({
      type: appliedTransition.type,
      duration: appliedTransition.duration,
      phase: 'out',
      color: typeof transitionColor === 'string' ? transitionColor : undefined
    })

    // After "out" phase completes, switch clips
    const outDuration = (appliedTransition.duration * 1000) / 2

    setTimeout(() => {
      // Pause current video
      if (videoRef.current) {
        videoRef.current.pause()
      }

      // Set pending seek to the clip's start trim
      pendingSeekRef.current = nextClip.start_trim
      shouldAutoPlayRef.current = true
      seekCompletedRef.current = false

      setCurrentClipIndex(nextIndex)
      setCurrentClipUrl(nextUrl)

      // Start "in" phase of transition
      setActiveTransitionEffect({
        type: appliedTransition.type,
        duration: appliedTransition.duration,
        phase: 'in',
        color: typeof transitionColor === 'string' ? transitionColor : undefined
      })

      // Clear transition effect after "in" phase completes
      const inDuration = (appliedTransition.duration * 1000) / 2
      setTimeout(() => {
        setActiveTransitionEffect(null)
        isTransitioningRef.current = false
      }, inDuration)
    }, outDuration)
  }, [])

  // Handle when a clip ends - switch to next clip with transition effect
  const handleClipEnded = useCallback(() => {
    // Prevent multiple triggers during transition
    if (isTransitioningRef.current) {
      return
    }

    if (currentClipIndex < sortedClips.length - 1) {
      // Mark as transitioning to prevent re-entry
      isTransitioningRef.current = true

      const currentClip = sortedClips[currentClipIndex]
      const nextIndex = currentClipIndex + 1
      const nextClip = sortedClips[nextIndex]

      // Check for applied transition between these clips
      const appliedTransition = transitions.find(
        t => t.from_clip_id === currentClip.id && t.to_clip_id === nextClip.id
      )

      const nextUrl = getClipStreamUrl(nextClip)

      // Check if we can use WebGL for this transition
      const canUseWebGL = webglSupported &&
        appliedTransition &&
        appliedTransition.type !== 'cut' &&
        TRANSITION_MAP[appliedTransition.type]

      if (canUseWebGL && appliedTransition) {
        // WebGL transition path - true crossfade between both videos
        // Preload next clip in hidden video
        setNextClipUrl(nextUrl)

        // Wait for toVideo to be ready, then start WebGL transition
        let attempts = 0
        const maxAttempts = 60 // 3 seconds max wait (60 * 50ms)
        const checkToVideoReady = () => {
          attempts++

          // Check if we should abort (e.g., user seeked elsewhere)
          if (!isTransitioningRef.current) {
            return
          }

          if (toVideoRef.current && toVideoRef.current.readyState >= 2) {
            // Seek toVideo to start trim position
            toVideoRef.current.currentTime = nextClip.start_trim

            // Start playing toVideo with volume 0 (will crossfade during transition)
            toVideoRef.current.volume = 0
            toVideoRef.current.play().catch(err => {
              console.warn('toVideo play failed:', err)
            })

            // Start WebGL transition
            setWebglTransitionConfig({
              type: appliedTransition.type,
              duration: appliedTransition.duration,
            })
          } else if (attempts < maxAttempts) {
            // Wait and check again
            setTimeout(checkToVideoReady, 50)
          } else {
            // Fallback: skip WebGL transition and switch directly
            console.warn('WebGL transition failed - toVideo not ready after', attempts, 'attempts, falling back to direct switch')
            switchToNextClipDirect(nextIndex, nextClip, nextUrl)
          }
        }

        // Give time for source to start loading
        setTimeout(checkToVideoReady, 50)
      } else {
        // CSS fallback or cut transition
        if (appliedTransition && appliedTransition.type !== 'cut') {
          performCSSTransition(appliedTransition, nextIndex, nextClip, nextUrl)
        } else {
          // No transition or cut - switch immediately
          switchToNextClipDirect(nextIndex, nextClip, nextUrl)
        }
      }
    } else {
      // End of timeline
      setIsPlaying(false)
    }
  }, [currentClipIndex, sortedClips, getClipStreamUrl, setIsPlaying, transitions, webglSupported, switchToNextClipDirect, performCSSTransition])

  // Handle WebGL transition progress - crossfade audio between clips
  const handleWebGLTransitionProgress = useCallback((progress: number) => {
    // Crossfade audio: from video fades out, to video fades in
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, (1 - progress) * volume)
    }
    if (toVideoRef.current) {
      toVideoRef.current.volume = Math.max(0, progress * volume)
    }
  }, [volume])

  // Handle WebGL transition complete
  const handleWebGLTransitionComplete = useCallback(() => {
    // Reset volumes
    if (videoRef.current) {
      videoRef.current.volume = volume
    }
    if (toVideoRef.current) {
      toVideoRef.current.pause()
      toVideoRef.current.volume = 0
    }

    // Clear WebGL transition state
    setWebglTransitionConfig(null)
    setNextClipUrl(null)

    // Switch to the next clip
    const nextIndex = currentClipIndex + 1

    if (nextIndex < sortedClips.length) {
      const nextClip = sortedClips[nextIndex]
      const nextUrl = getClipStreamUrl(nextClip)

      // Set pending seek to the clip's start trim
      pendingSeekRef.current = nextClip.start_trim
      shouldAutoPlayRef.current = true
      seekCompletedRef.current = false

      // Reset transitioning flag BEFORE setting new clip to avoid race conditions
      isTransitioningRef.current = false

      setCurrentClipIndex(nextIndex)
      setCurrentClipUrl(nextUrl)
    } else {
      // End of timeline
      isTransitioningRef.current = false
      setIsPlaying(false)
    }
  }, [currentClipIndex, sortedClips, getClipStreamUrl, volume, setIsPlaying])

  // Handle loaded metadata - seek to correct position
  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return

    // Set duration for single video mode
    if (sortedClips.length === 0) {
      setDuration(videoRef.current.duration)
      return
    }

    // For multi-clip mode, seek to the correct position
    const currentClip = sortedClips[currentClipIndex]
    if (!currentClip) return

    // Determine seek target
    let seekTarget = pendingSeekRef.current
    if (seekTarget === null) {
      // Default to clip's start trim
      seekTarget = currentClip.start_trim
    }

    const currentVideoTime = videoRef.current.currentTime
    const needsSeek = Math.abs(currentVideoTime - seekTarget) > 0.05

    if (needsSeek) {
      // Seek to target (handleSeeked will handle auto-play)
      seekCompletedRef.current = false
      videoRef.current.currentTime = seekTarget
    } else {
      // Already at the correct position - handle auto-play directly
      seekCompletedRef.current = true
      isSeekingRef.current = false

      if (shouldAutoPlayRef.current) {
        videoRef.current.play().catch(err => {
          console.warn('Auto-play failed:', err)
        })
        shouldAutoPlayRef.current = false
        setIsPlaying(true)
      }
    }

    pendingSeekRef.current = null
  }, [currentClipIndex, sortedClips, setDuration, setIsPlaying])

  // Handle seeking on the timeline - may need to switch clips
  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const timelineTime = parseFloat(e.target.value)
      setCurrentTime(timelineTime)

      // Cancel any ongoing transition when seeking
      if (isTransitioningRef.current) {
        isTransitioningRef.current = false
        setActiveTransitionEffect(null)
        setWebglTransitionConfig(null)
        setNextClipUrl(null)
      }

      if (sortedClips.length > 0) {
        // Multi-clip mode
        const clipInfo = getClipAtTime(timelineTime)
        if (clipInfo) {
          if (clipInfo.index !== currentClipIndex) {
            // Need to switch clips
            isSeekingRef.current = true
            seekCompletedRef.current = false
            pendingSeekRef.current = clipInfo.clipTime
            setCurrentClipIndex(clipInfo.index)
            setCurrentClipUrl(getClipStreamUrl(clipInfo.clip))
          } else if (videoRef.current && videoReadyRef.current) {
            // Same clip, just seek
            seekCompletedRef.current = false
            videoRef.current.currentTime = clipInfo.clipTime
          }
        }
      } else if (videoRef.current) {
        // Single video mode
        videoRef.current.currentTime = timelineTime
      }
    },
    [setCurrentTime, sortedClips, currentClipIndex, getClipAtTime, getClipStreamUrl]
  )

  // Seek relative (for skip buttons)
  const seekRelative = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(totalClipsDuration || duration, currentTime + seconds))

    // Cancel any ongoing transition when seeking
    if (isTransitioningRef.current) {
      isTransitioningRef.current = false
      setActiveTransitionEffect(null)
      setWebglTransitionConfig(null)
      setNextClipUrl(null)
    }

    if (sortedClips.length > 0) {
      // Multi-clip mode
      const clipInfo = getClipAtTime(newTime)
      if (clipInfo) {
        if (clipInfo.index !== currentClipIndex) {
          isSeekingRef.current = true
          seekCompletedRef.current = false
          pendingSeekRef.current = clipInfo.clipTime
          setCurrentClipIndex(clipInfo.index)
          setCurrentClipUrl(getClipStreamUrl(clipInfo.clip))
        } else if (videoRef.current && videoReadyRef.current) {
          seekCompletedRef.current = false
          videoRef.current.currentTime = clipInfo.clipTime
        }
      }
      setCurrentTime(newTime)
    } else if (videoRef.current) {
      // Single video mode
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [currentTime, duration, totalClipsDuration, sortedClips, currentClipIndex, getClipAtTime, getClipStreamUrl, setCurrentTime])

  // Watch for clip time exceeding clip bounds (for trimmed clips)
  useEffect(() => {
    if (!videoRef.current || sortedClips.length === 0 || currentClipIndex >= sortedClips.length || !isPlaying) {
      return
    }

    const clip = sortedClips[currentClipIndex]
    const maxTime = (clip.duration || 0) - clip.end_trim
    const video = videoRef.current

    // Use requestAnimationFrame for battery-friendly, smooth bound checking
    let rafId: number

    const checkBounds = () => {
      // Don't trigger if already transitioning
      if (!isTransitioningRef.current) {
        const currentVideoTime = video.currentTime
        // Trigger slightly before the end to ensure smooth transition
        if (currentVideoTime >= maxTime - 0.15 && seekCompletedRef.current) {
          handleClipEnded()
        }
      }

      rafId = requestAnimationFrame(checkBounds)
    }

    rafId = requestAnimationFrame(checkBounds)

    return () => cancelAnimationFrame(rafId)
  }, [sortedClips, currentClipIndex, handleClipEnded, isPlaying])

  // Safety timeout to reset stuck transitions
  useEffect(() => {
    if (!isTransitioningRef.current) return

    // If transitioning takes more than 5 seconds, reset the flag
    const timeout = setTimeout(() => {
      if (isTransitioningRef.current) {
        console.warn('[Transition] Stuck transition detected, resetting...')
        isTransitioningRef.current = false
        setActiveTransitionEffect(null)
        setWebglTransitionConfig(null)
        setNextClipUrl(null)

        // Try to continue playback
        if (videoRef.current && !videoRef.current.paused) {
          // Video is playing, let it continue
        } else if (videoRef.current) {
          // Try to resume
          videoRef.current.play().catch(() => {})
        }
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, [currentClipIndex]) // Reset timeout when clip changes

  // Sync video position when timeline position changes externally (e.g., clicking timeline)
  // This only syncs when paused and not during transitions
  useEffect(() => {
    if (isPlaying || !videoRef.current || isTransitioningRef.current || !seekCompletedRef.current) {
      return
    }

    if (sortedClips.length > 0) {
      const clipInfo = getClipAtTime(currentTime)
      if (!clipInfo) return

      // If already on the correct clip, just seek within it
      if (clipInfo.index === currentClipIndex && videoReadyRef.current) {
        const expectedClipTime = clipInfo.clipTime
        const actualClipTime = videoRef.current.currentTime
        // Sync if there's a significant difference
        if (Math.abs(actualClipTime - expectedClipTime) > 0.3) {
          videoRef.current.currentTime = expectedClipTime
        }
      }
      // Note: clip switching is handled by togglePlayPause when user presses play
    } else {
      // Single video mode - sync directly
      const actualTime = videoRef.current.currentTime
      if (Math.abs(actualTime - currentTime) > 0.3) {
        videoRef.current.currentTime = currentTime
      }
    }
  }, [currentTime, isPlaying, sortedClips, currentClipIndex, getClipAtTime])

  // SFX Audio Playback - create audio elements for SFX tracks (ported from working Electron version)
  useEffect(() => {
    if (!project) return

    const audioMap = sfxAudioRefs.current

    // Remove audio elements for deleted SFX tracks
    audioMap.forEach((audio, trackId) => {
      if (!sfxTracks.find(track => track.id === trackId)) {
        audio.pause()
        audio.src = ''
        audioMap.delete(trackId)
      }
    })

    // Create audio elements for new SFX tracks
    sfxTracks.forEach(track => {
      if (!audioMap.has(track.id)) {
        const audio = new Audio()
        const url = getSFXStreamUrl(track.filename)
        audio.src = url
        audio.volume = track.volume * volume * (isMuted ? 0 : 1)
        audio.preload = 'auto'

        audio.addEventListener('error', () => {
          console.error('[SFX] Error loading:', track.filename, audio.error?.message)
        })

        audioMap.set(track.id, audio)
      }
    })
  }, [project, sfxTracks, volume, isMuted, getSFXStreamUrl])

  // SFX Playback sync - event-driven based on currentTime (ported from working Electron version)
  useEffect(() => {
    const audioMap = sfxAudioRefs.current

    sfxTracks.forEach(track => {
      const audio = audioMap.get(track.id)
      if (!audio) return

      const trackEnd = track.start_time + track.duration
      const shouldBePlaying = isPlaying && currentTime >= track.start_time && currentTime < trackEnd

      if (shouldBePlaying && audio.paused) {
        // Calculate the position within the SFX track
        const audioTime = currentTime - track.start_time
        audio.currentTime = Math.max(0, audioTime)
        audio.volume = track.volume * volume * (isMuted ? 0 : 1)
        audio.play().catch(err => {
          console.warn('[SFX] Play failed:', track.filename, err.message)
        })
      } else if (!shouldBePlaying && !audio.paused) {
        audio.pause()
      } else if (shouldBePlaying && !audio.paused) {
        // Sync audio time with video time (0.1s tolerance like working version)
        const expectedAudioTime = currentTime - track.start_time
        if (Math.abs(audio.currentTime - expectedAudioTime) > 0.1) {
          audio.currentTime = Math.max(0, expectedAudioTime)
        }
      }
    })
  }, [currentTime, isPlaying, sfxTracks, volume, isMuted])

  // Pause all SFX when video is paused
  useEffect(() => {
    if (!isPlaying) {
      sfxAudioRefs.current.forEach(audio => {
        if (!audio.paused) {
          audio.pause()
        }
      })
    }
  }, [isPlaying])

  // Update SFX volume when main volume changes
  useEffect(() => {
    sfxAudioRefs.current.forEach((audio, trackId) => {
      const track = sfxTracks.find(t => t.id === trackId)
      if (track) {
        audio.volume = track.volume * volume * (isMuted ? 0 : 1)
      }
    })
  }, [volume, isMuted, sfxTracks])

  // Intro effect - show fade-in when starting from beginning
  useEffect(() => {
    if (!introEffect || !isPlaying || currentClipIndex !== 0) return
    // Only relevant when near the start of the video
    if (currentTime >= introEffect.duration + 0.5) return

    if (currentTime < 0.5) {
      setShowIntroEffect(true)
      const timer = setTimeout(() => {
        setShowIntroEffect(false)
      }, introEffect.duration * 1000)
      return () => clearTimeout(timer)
    }
  }, [introEffect, isPlaying, currentTime, currentClipIndex])

  // Outro effect - show fade-out when approaching end
  useEffect(() => {
    if (!outroEffect || !isPlaying || sortedClips.length === 0) return
    // Only relevant when near the end of the video
    if (currentClipIndex !== sortedClips.length - 1) {
      setShowOutroEffect(false)
      return
    }
    const timeToEnd = totalClipsDuration - currentTime
    if (timeToEnd > outroEffect.duration + 0.5) return

    if (timeToEnd <= outroEffect.duration && timeToEnd > 0) {
      setShowOutroEffect(true)
    } else {
      setShowOutroEffect(false)
    }
  }, [outroEffect, isPlaying, currentTime, totalClipsDuration, currentClipIndex, sortedClips.length])

  // Reset outro effect when playback stops
  useEffect(() => {
    if (!isPlaying) {
      setShowOutroEffect(false)
    }
  }, [isPlaying])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !isMuted
      videoRef.current.muted = newMuted
      setIsMuted(newMuted)

      // Also mute/unmute SFX tracks
      sfxAudioRefs.current.forEach(audio => {
        audio.muted = newMuted
      })
    }
  }, [isMuted])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.volume = vol
      setVolume(vol)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSave = async () => {
    try {
      await saveProject()
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  // Transition handlers
  const handleAddTransition = useCallback(async (
    fromClipId: number,
    toClipId: number,
    type: TransitionType,
    transitionDuration: number
  ) => {
    if (!project?.id) {
      console.error('No project ID available')
      return
    }

    // Check if transition already exists between these clips
    const existingTransition = transitions.find(
      t => t.from_clip_id === fromClipId && t.to_clip_id === toClipId
    )

    if (existingTransition) {
      // Update existing transition instead of creating new one
      try {
        const res = await projectsApi.updateTransition(project.id, existingTransition.id, {
          type,
          duration: transitionDuration,
        })
        setTransitions(prev => prev.map(t => t.id === existingTransition.id ? res.data : t))
      } catch (error) {
        console.error('Failed to update transition:', error)
        throw error
      }
      return
    }

    try {
      const res = await projectsApi.createTransition(project.id, {
        type,
        from_clip_id: fromClipId,
        to_clip_id: toClipId,
        duration: transitionDuration,
        parameters: null,
      })
      setTransitions(prev => [...prev, res.data])
    } catch (error) {
      console.error('Failed to add transition:', error)
      throw error // Re-throw so caller can handle it
    }
  }, [project?.id, transitions])

  const handleUpdateTransition = async (
    id: number,
    type: TransitionType,
    transitionDuration: number
  ) => {
    if (!project?.id) return
    try {
      const res = await projectsApi.updateTransition(project.id, id, {
        type,
        duration: transitionDuration,
      })
      setTransitions(prev =>
        prev.map(t => (t.id === id ? res.data : t))
      )
    } catch (error) {
      console.error('Failed to update transition:', error)
    }
  }

  const handleDeleteTransition = async (id: number) => {
    if (!project?.id) return
    try {
      await projectsApi.deleteTransition(project.id, id)
      setTransitions(prev => prev.filter(t => t.id !== id))
    } catch (error) {
      console.error('Failed to delete transition:', error)
    }
  }

  // Map AI suggested transition types to valid backend enum values
  const mapSuggestedTransitionType = (suggested: string): TransitionType => {
    const mapping: Record<string, TransitionType> = {
      'cut': 'cut',
      'fade': 'fade',
      'fade_in': 'fade',
      'fade_out': 'fade',
      'dissolve': 'dissolve',
      'wipe': 'wipe_left',
      'wipeleft': 'wipe_left',
      'wipe_left': 'wipe_left',
      'wiperight': 'wipe_right',
      'wipe_right': 'wipe_right',
      'wipeup': 'wipe_up',
      'wipe_up': 'wipe_up',
      'wipedown': 'wipe_down',
      'wipe_down': 'wipe_down',
      'slide': 'slide_left',
      'slideleft': 'slide_left',
      'slide_left': 'slide_left',
      'slideright': 'slide_right',
      'slide_right': 'slide_right',
      'zoom': 'zoom_in',
      'zoom_in': 'zoom_in',
      'zoom_out': 'zoom_out',
      // Advanced effects
      'flash': 'flash',
      'white_flash': 'flash',
      'blur': 'blur',
      'motion_blur': 'blur',
      'glitch': 'glitch',
      'digital_glitch': 'glitch',
      'color_fade': 'color_fade',
      'colorfade': 'color_fade',
      'spin': 'spin',
      'rotate': 'spin',
      'pixelate': 'pixelate',
      'pixel': 'pixelate',
    }
    const normalized = suggested.toLowerCase().replace(/[-\s]/g, '_')
    return mapping[normalized] || 'fade' // Default to fade if unknown
  }

  const handleApplySuggestedTransition = useCallback(async (suggestion: {
    timestamp: number
    type: string
    suggested_transition: string
    confidence: number
    reason: string
  }) => {
    // Handle 'start' type - this is an intro/fade-in effect
    if (suggestion.type === 'start') {
      const effectType = mapSuggestedTransitionType(suggestion.suggested_transition)
      setIntroEffect({ type: effectType, duration: 1.0 })
      return
    }

    // Handle 'end' type - this is an outro/fade-out effect
    if (suggestion.type === 'end') {
      const effectType = mapSuggestedTransitionType(suggestion.suggested_transition)
      setOutroEffect({ type: effectType, duration: 1.0 })
      return
    }

    // Find the clips at this timestamp to add transition between
    const clips = [...videoClips].sort((a, b) => a.timeline_order - b.timeline_order)

    if (clips.length < 2) {
      console.warn('Need at least 2 clips to add a transition')
      showWarning('Need at least 2 clips to add a transition')
      return
    }

    // Build clip boundaries (end times of each clip on the timeline)
    const clipBoundaries: Array<{ endTime: number; clipIndex: number }> = []
    let cumulativeTime = 0

    for (let i = 0; i < clips.length - 1; i++) {
      const clip = clips[i]
      const effectiveDuration = getClipEffectiveDuration(clip)
      cumulativeTime += effectiveDuration
      clipBoundaries.push({ endTime: cumulativeTime, clipIndex: i })
    }

    // Find the closest clip boundary to the suggestion timestamp
    let bestMatch: { clipIndex: number; distance: number } | null = null

    for (const boundary of clipBoundaries) {
      const distance = Math.abs(boundary.endTime - suggestion.timestamp)
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { clipIndex: boundary.clipIndex, distance }
      }
    }

    // Use a more lenient threshold (5 seconds or 20% of average clip duration)
    const avgClipDuration = cumulativeTime / clips.length
    const threshold = Math.max(5, avgClipDuration * 0.2)

    // Map the suggested transition type to a valid enum value
    const transitionType = mapSuggestedTransitionType(suggestion.suggested_transition)

    try {
      // If only one clip boundary exists, just use it
      if (clipBoundaries.length === 1) {
        const fromClip = clips[0]
        const toClip = clips[1]
        await handleAddTransition(
          fromClip.id,
          toClip.id,
          transitionType,
          0.5
        )
      } else if (bestMatch && bestMatch.distance <= threshold) {
        const fromClip = clips[bestMatch.clipIndex]
        const toClip = clips[bestMatch.clipIndex + 1]

        await handleAddTransition(
          fromClip.id,
          toClip.id,
          transitionType,
          0.5
        )
      } else if (bestMatch) {
        // Use the closest match even if beyond threshold
        const fromClip = clips[bestMatch.clipIndex]
        const toClip = clips[bestMatch.clipIndex + 1]

        await handleAddTransition(
          fromClip.id,
          toClip.id,
          transitionType,
          0.5
        )
      } else {
        // Fallback to first clip pair
        console.warn(`No clip boundaries found. Applying to first clip pair.`)
        const fromClip = clips[0]
        const toClip = clips[1]

        await handleAddTransition(
          fromClip.id,
          toClip.id,
          transitionType,
          0.5
        )
      }
      showSuccess('Transition applied!')
    } catch (error) {
      console.error('Failed to apply suggested transition:', error)
      showError('Failed to apply transition')
    }
  }, [videoClips, getClipEffectiveDuration, handleAddTransition, showSuccess, showError])

  // Get current subtitle for overlay display
  const currentSubtitle = subtitles.find(
    (s) => currentTime >= s.start_time && currentTime < s.end_time
  )

  // Get current text overlay for display
  const currentOverlay = textOverlays.find(
    (o) => currentTime >= o.start_time && currentTime < o.end_time
  )

  return (
    <div className={`video-editor mode-${projectMode}`}>
      {/* Header - Simplified */}
      <header className="editor-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} />
          </button>
          <div className="project-info">
            <h1>{project?.name}</h1>
            <ModeSwitcher
              currentMode={projectMode}
              onModeChange={setProjectMode}
            />
            {hasUnsavedChanges && <span className="unsaved-badge">Unsaved</span>}
          </div>
        </div>
        <div className="header-actions">
          {/* Semi-Manual mode: show analyze button */}
          {projectMode === 'semi_manual' && (
            <button
              className="analyze-btn"
              onClick={analyzeVideo}
              disabled={(!videoUrl && sortedClips.length === 0) || isAnalyzing}
            >
              <Sparkles size={18} />
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          )}

          {/* Phase 4: Manual mode intelligence controls */}
          {projectMode === 'manual' && (
            <>
              {/* Quick-transcribe button */}
              <button
                className="analyze-btn"
                onClick={handleQuickTranscribe}
                disabled={(!videoUrl && sortedClips.length === 0) || isAnalyzing || isQuickTranscribing}
                title="Analyze video to get transcription, beats, and scene data"
              >
                <Sparkles size={18} />
                {isAnalyzing || isQuickTranscribing ? 'Analyzing...' : 'Quick Analyze'}
              </button>

              {/* Beat markers toggle (only when analysis has beats) */}
              {analysisBeats.length > 0 && (
                <>
                  <button
                    className={`icon-btn ${showBeatMarkers ? 'active' : ''}`}
                    onClick={() => {
                      setShowBeatMarkers(!showBeatMarkers)
                      if (!showBeatMarkers) setSnapToBeats(true)
                      else setSnapToBeats(false)
                    }}
                    title={`Beat markers: ${showBeatMarkers ? 'ON' : 'OFF'} (${analysisBeats.length} beats, ${Math.round(analysis?.audio_advanced?.tempo || 0)} BPM)`}
                  >
                    <Disc3 size={18} />
                  </button>
                </>
              )}
            </>
          )}

          {/* Only show these in non-automatic modes */}
          {projectMode !== 'automatic' && (
            <>
              <button
                className="shortcuts-btn icon-btn"
                onClick={() => setShowShortcutsHelp(true)}
                title="Keyboard Shortcuts"
              >
                <Keyboard size={18} />
              </button>
              <button className="save-btn" onClick={handleSave}>
                <Save size={18} />
                Save
              </button>
            </>
          )}
          <button
            className="feedback-btn icon-btn"
            onClick={() => setShowReviewModal(true)}
            title="Give Feedback"
          >
            <MessageSquare size={18} />
          </button>
          <button
            className="export-btn"
            disabled={!videoUrl && sortedClips.length === 0}
            onClick={() => setShowExportDialog(true)}
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </header>

      <div className="editor-main">
        {/* Left Sidebar - Assets Panel (Hidden in automatic mode) */}
        {project && projectMode !== 'automatic' && (
          <div className={`left-sidebar ${showAssetsPanel ? 'open' : 'collapsed'}`}>
            <button
              className="sidebar-toggle"
              onClick={() => setShowAssetsPanel(!showAssetsPanel)}
              title={showAssetsPanel ? 'Hide Assets' : 'Show Assets'}
            >
              {showAssetsPanel ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>
            {showAssetsPanel && <AssetsPanel projectId={project.id} />}
          </div>
        )}

        {/* Video Player */}
        <div className="video-section">
          <div className="video-container">
            {(videoUrl || currentClipUrl) ? (
              <>
                <video
                  ref={videoRef}
                  key={sortedClips.length > 0 ? `clip-${currentClipIndex}` : 'main-video'}
                  src={sortedClips.length > 0 ? (currentClipUrl || '') : (videoUrl || '')}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={sortedClips.length > 0 ? handleClipEnded : undefined}
                  onError={handleVideoError}
                  onLoadStart={handleLoadStart}
                  onCanPlay={handleCanPlay}
                  onCanPlayThrough={handleCanPlay}
                  onWaiting={handleWaiting}
                  onPlaying={handlePlaying}
                  onSeeked={handleSeeked}
                  preload="auto"
                  playsInline
                  muted={isMuted}
                  className={activeTransitionEffect ? `video-transition-${activeTransitionEffect.type} phase-${activeTransitionEffect.phase}` : ''}
                  style={activeTransitionEffect ? {
                    '--transition-duration': `${activeTransitionEffect.duration / 2}s`
                  } as React.CSSProperties : undefined}
                />

                {/* Video loading indicator */}
                {isVideoLoading && !videoError && (
                  <div className="video-loading-overlay">
                    <Loader2 className="spin" size={32} />
                    <span>Loading video...</span>
                  </div>
                )}

                {/* Video error display with retry */}
                {videoError && (
                  <div className="video-error-overlay">
                    <AlertCircle size={32} />
                    <span className="error-message">{videoError.message}</span>
                    {videoError.recoverable && (
                      <button className="retry-btn" onClick={retryLoad}>
                        <RefreshCw size={16} />
                        Retry
                      </button>
                    )}
                    {!videoError.recoverable && (
                      <span className="error-hint">
                        This video format may not be supported. Try converting to MP4 (H.264).
                      </span>
                    )}
                  </div>
                )}

                {/* Hidden video for WebGL transition "to" texture */}
                {/* Note: Must remain visible to browser (not display:none) for WebGL texturing to work */}
                <video
                  ref={toVideoRef}
                  src={nextClipUrl || ''}
                  preload="auto"
                  muted
                  playsInline
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: 1, // Behind main video but visible to browser
                  }}
                />

                {/* WebGL Transition Canvas Overlay */}
                {webglSupported && (
                  <WebGLTransitionCanvas
                    fromVideoRef={videoRef}
                    toVideoRef={toVideoRef}
                    transition={webglTransitionConfig}
                    onTransitionComplete={handleWebGLTransitionComplete}
                    onTransitionProgress={handleWebGLTransitionProgress}
                  />
                )}

                {/* Multi-clip navigator */}
                {sortedClips.length > 1 && (
                  <div className="clip-navigator">
                    <button
                      className="clip-nav-btn"
                      onClick={() => {
                        if (currentClipIndex > 0) {
                          const prevClip = sortedClips[currentClipIndex - 1]
                          setCurrentClipIndex(currentClipIndex - 1)
                          setCurrentClipUrl(getClipStreamUrl(prevClip))
                          setCurrentTime(getTimelineTimeFromClip(currentClipIndex - 1, prevClip.start_trim))
                        }
                      }}
                      disabled={currentClipIndex === 0}
                      title="Previous clip"
                    >
                      <SkipBack size={14} />
                    </button>
                    <div className="clip-info">
                      <span className="clip-count">Clip {currentClipIndex + 1} / {sortedClips.length}</span>
                      {sortedClips[currentClipIndex] && (
                        <span className="clip-name-indicator">
                          {sortedClips[currentClipIndex].original_name || `Clip ${currentClipIndex + 1}`}
                        </span>
                      )}
                    </div>
                    <button
                      className="clip-nav-btn"
                      onClick={() => {
                        if (currentClipIndex < sortedClips.length - 1) {
                          const nextClip = sortedClips[currentClipIndex + 1]
                          setCurrentClipIndex(currentClipIndex + 1)
                          setCurrentClipUrl(getClipStreamUrl(nextClip))
                          setCurrentTime(getTimelineTimeFromClip(currentClipIndex + 1, nextClip.start_trim))
                        }
                      }}
                      disabled={currentClipIndex === sortedClips.length - 1}
                      title="Next clip"
                    >
                      <SkipForward size={14} />
                    </button>
                  </div>
                )}

                {/* SVG Filters for Advanced Transitions */}
                <svg className="transition-filters" width="0" height="0">
                  <defs>
                    {/* Liquid/Ripple Displacement Filter */}
                    <filter id="liquid-filter" x="-50%" y="-50%" width="200%" height="200%">
                      <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.015"
                        numOctaves="3"
                        result="turbulence"
                      >
                        <animate
                          attributeName="baseFrequency"
                          values="0.015;0.025;0.015"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </feTurbulence>
                      <feDisplacementMap
                        in="SourceGraphic"
                        in2="turbulence"
                        scale="30"
                        xChannelSelector="R"
                        yChannelSelector="G"
                      />
                    </filter>

                    {/* Ripple Water Effect */}
                    <filter id="ripple-filter" x="-50%" y="-50%" width="200%" height="200%">
                      <feTurbulence
                        type="turbulence"
                        baseFrequency="0.02"
                        numOctaves="2"
                        result="turbulence"
                      >
                        <animate
                          attributeName="baseFrequency"
                          values="0.02;0.04;0.02"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      </feTurbulence>
                      <feDisplacementMap
                        in="SourceGraphic"
                        in2="turbulence"
                        scale="20"
                        xChannelSelector="R"
                        yChannelSelector="B"
                      />
                    </filter>

                    {/* Wave Distortion */}
                    <filter id="wave-filter" x="-10%" y="-10%" width="120%" height="120%">
                      <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.01 0.05"
                        numOctaves="1"
                        result="noise"
                      />
                      <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale="15"
                        xChannelSelector="R"
                        yChannelSelector="G"
                      />
                    </filter>

                    {/* Glitch RGB Split */}
                    <filter id="glitch-filter" x="-10%" y="-10%" width="120%" height="120%">
                      <feOffset in="SourceGraphic" dx="3" dy="0" result="red">
                        <animate attributeName="dx" values="3;-3;3" dur="0.1s" repeatCount="indefinite" />
                      </feOffset>
                      <feOffset in="SourceGraphic" dx="-3" dy="0" result="cyan">
                        <animate attributeName="dx" values="-3;3;-3" dur="0.1s" repeatCount="indefinite" />
                      </feOffset>
                      <feComponentTransfer in="red" result="redOnly">
                        <feFuncR type="identity" />
                        <feFuncG type="discrete" tableValues="0" />
                        <feFuncB type="discrete" tableValues="0" />
                      </feComponentTransfer>
                      <feComponentTransfer in="cyan" result="cyanOnly">
                        <feFuncR type="discrete" tableValues="0" />
                        <feFuncG type="identity" />
                        <feFuncB type="identity" />
                      </feComponentTransfer>
                      <feBlend in="redOnly" in2="cyanOnly" mode="screen" />
                    </filter>

                    {/* VHS Distortion */}
                    <filter id="vhs-filter" x="-10%" y="-10%" width="120%" height="120%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.5 0.01" numOctaves="1" result="noise" />
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="R" result="displaced" />
                      <feColorMatrix in="displaced" type="saturate" values="1.5" />
                    </filter>

                    {/* Pixelate Effect */}
                    <filter id="pixelate-filter" x="0" y="0" width="100%" height="100%">
                      <feFlood x="4" y="4" height="2" width="2" />
                      <feComposite width="8" height="8" />
                      <feTile result="tiles" />
                      <feComposite in="SourceGraphic" in2="tiles" operator="in" />
                      <feMorphology operator="dilate" radius="4" />
                    </filter>

                    {/* Dream/Soft Glow */}
                    <filter id="dream-filter" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                      <feColorMatrix in="blur" type="saturate" values="1.3" result="saturated" />
                      <feBlend in="SourceGraphic" in2="saturated" mode="screen" />
                    </filter>

                    {/* Shatter/Crystallize */}
                    <filter id="shatter-filter" x="-10%" y="-10%" width="120%" height="120%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="50" xChannelSelector="R" yChannelSelector="G" />
                    </filter>

                    {/* Smoke/Cloud */}
                    <filter id="smoke-filter" x="-50%" y="-50%" width="200%" height="200%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="4" result="turbulence">
                        <animate attributeName="baseFrequency" values="0.008;0.012;0.008" dur="3s" repeatCount="indefinite" />
                      </feTurbulence>
                      <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="40" xChannelSelector="R" yChannelSelector="G" />
                      <feGaussianBlur stdDeviation="2" />
                    </filter>

                    {/* Hologram */}
                    <filter id="hologram-filter" x="-10%" y="-10%" width="120%" height="120%">
                      <feColorMatrix type="matrix" values="
                        0.5 0 0.5 0 0
                        0 1 0.5 0 0
                        0.5 0.5 1 0 0
                        0 0 0 1 0
                      " />
                      <feOffset dx="2" dy="0" result="offset1">
                        <animate attributeName="dy" values="0;2;0;-2;0" dur="0.5s" repeatCount="indefinite" />
                      </feOffset>
                      <feBlend in="SourceGraphic" in2="offset1" mode="screen" />
                    </filter>
                  </defs>
                </svg>

                {/* Transition effect overlay - Multi-layer for complex effects */}
                {activeTransitionEffect && (
                  <div
                    className={`transition-effect-overlay transition-${activeTransitionEffect.type} phase-${activeTransitionEffect.phase}`}
                    style={{
                      '--transition-duration': `${activeTransitionEffect.duration / 2}s`,
                      '--transition-color': activeTransitionEffect.color || 'black'
                    } as React.CSSProperties}
                  >
                    {/* Inner layers for particle/complex effects */}
                    {['particles', 'sparkle', 'confetti', 'explosion', 'shatter', 'disintegrate'].includes(activeTransitionEffect.type) && (
                      <>
                        <div className="particle-layer layer-1" />
                        <div className="particle-layer layer-2" />
                        <div className="particle-layer layer-3" />
                      </>
                    )}
                  </div>
                )}

                {/* Intro effect overlay - fade in from black at video start */}
                {showIntroEffect && introEffect && (
                  <div
                    className="intro-outro-effect intro-effect"
                    style={{
                      '--effect-duration': `${introEffect.duration}s`
                    } as React.CSSProperties}
                  />
                )}

                {/* Outro effect overlay - fade out to black at video end */}
                {showOutroEffect && outroEffect && (
                  <div
                    className="intro-outro-effect outro-effect"
                    style={{
                      '--effect-duration': `${outroEffect.duration}s`
                    } as React.CSSProperties}
                  />
                )}

                {/* Subtitle overlay */}
                {currentSubtitle && (
                  <div
                    className={`subtitle-overlay ${currentSubtitle.style.position === 'custom' ? 'custom' : currentSubtitle.style.position}`}
                    style={{
                      fontSize: currentSubtitle.style.fontSize,
                      fontFamily: currentSubtitle.style.fontFamily,
                      fontWeight: currentSubtitle.style.fontWeight || 'normal',
                      fontStyle: currentSubtitle.style.fontStyle || 'normal',
                      color: currentSubtitle.style.color,
                      backgroundColor: currentSubtitle.style.backgroundColor,
                      textAlign: currentSubtitle.style.textAlign || 'center',
                      textShadow: currentSubtitle.style.textShadow !== false
                        ? '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.5)'
                        : 'none',
                      ...(currentSubtitle.style.position === 'custom' && {
                        left: `${currentSubtitle.style.x || 50}%`,
                        top: `${currentSubtitle.style.y || 80}%`,
                        transform: 'translate(-50%, -50%)',
                      }),
                    }}
                  >
                    {currentSubtitle.text}
                  </div>
                )}

                {/* Text overlay */}
                {currentOverlay && (
                  <div
                    className="text-overlay"
                    style={{
                      left: `${currentOverlay.style.position.x}%`,
                      top: `${currentOverlay.style.position.y}%`,
                      fontSize: currentOverlay.style.fontSize,
                      fontFamily: currentOverlay.style.fontFamily,
                      color: currentOverlay.style.color,
                      backgroundColor: currentOverlay.style.backgroundColor,
                    }}
                  >
                    {currentOverlay.text}
                  </div>
                )}

                {/* Analysis overlay */}
                <AnalysisOverlay isVisible={isAnalyzing} />
              </>
            ) : (
              <div className="upload-prompt">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  style={{ display: 'none' }}
                />
                <button onClick={() => fileInputRef.current?.click()}>
                  <Upload size={32} />
                  <span>Upload Video</span>
                </button>
                {uploadProgress !== null && (
                  <div className="upload-progress">
                    <div
                      className="progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                    <span>{uploadProgress}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video controls - show when there's a video or clips */}
          {(videoUrl || sortedClips.length > 0) && (
            <div className="video-controls">
              <button onClick={() => seekRelative(-5)} title="Back 5s">
                <SkipBack size={18} />
              </button>
              <button onClick={togglePlayPause} className="play-btn">
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button onClick={() => seekRelative(5)} title="Forward 5s">
                <SkipForward size={18} />
              </button>

              <span className="time current">{formatTime(currentTime)}</span>

              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="seek-bar"
              />

              <span className="time total">{formatTime(duration)}</span>

              <div className="volume-controls">
                <button onClick={toggleMute}>
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-bar"
                />
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="side-panel">
          {/* Auto Mode - Always show AutoEditPanel (not tabs) */}
          {projectMode === 'automatic' && project ? (
            <AutoEditPanel
              projectId={project.id}
              isAnalyzing={isAnalyzing}
              hasClips={videoClips.length > 0}
              hasAnalysis={!!analysis && (
                (analysis.transcription?.length ?? 0) > 0 ||
                (analysis.suggestedSFX?.length ?? 0) > 0 ||
                (analysis.suggestedTransitions?.length ?? 0) > 0
              )}
              analysis={analysis}
              onAnalyze={analyzeVideo}
              onComplete={async () => {
                // Refresh data after auto-generation
                if (project?.id) {
                  const [clipsRes, transRes] = await Promise.all([
                    projectsApi.listClips(project.id),
                    projectsApi.listTransitions(project.id),
                  ])
                  setVideoClips(clipsRes.data)
                  setTransitions(transRes.data)
                }
              }}
              onPreview={async () => {
                // Refresh all data and start preview playback
                if (project?.id) {
                  try {
                    // Refresh clips, transitions, and project data (which includes subtitles/SFX)
                    const [clipsRes, transRes] = await Promise.all([
                      projectsApi.listClips(project.id),
                      projectsApi.listTransitions(project.id),
                    ])
                    setVideoClips(clipsRes.data)
                    setTransitions(transRes.data)

                    // Also refresh project to get updated subtitles and SFX
                    await refreshProject()

                    // Seek to beginning
                    setCurrentTime(0)
                    setCurrentClipIndex(0)
                    if (clipsRes.data.length > 0) {
                      const firstClip = [...clipsRes.data].sort((a, b) => a.timeline_order - b.timeline_order)[0]
                      setCurrentClipUrl(getClipStreamUrl(firstClip))
                    }

                    // Start playback after a short delay
                    setTimeout(() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0
                        videoRef.current.play().catch(console.error)
                        setIsPlaying(true)
                      }
                    }, 300)
                  } catch (error) {
                    console.error('Failed to start preview:', error)
                  }
                }
              }}
              clips={videoClips}
              onClipsChange={setVideoClips}
              onSetIntroEffect={setIntroEffect}
              onSetOutroEffect={setOutroEffect}
            />
          ) : (
            <>
              <div className="tab-buttons">
                {/* Show Clips tab for multi-clip projects */}
                <button
                  className={activeTab === 'clips' ? 'active' : ''}
                  onClick={() => setActiveTab('clips')}
                >
                  <Film size={18} />
                  Clips
                </button>
                <button
                  className={activeTab === 'subtitles' ? 'active' : ''}
                  onClick={() => setActiveTab('subtitles')}
                >
                  <Subtitles size={18} />
                  Subtitles
                </button>
                <button
                  className={activeTab === 'audio' ? 'active' : ''}
                  onClick={() => setActiveTab('audio')}
                >
                  <Headphones size={18} />
                  Audio
                </button>
                <button
                  className={activeTab === 'overlays' ? 'active' : ''}
                  onClick={() => setActiveTab('overlays')}
                >
                  <Type size={18} />
                  Overlays
                </button>
                <button
                  className={activeTab === 'transitions' ? 'active' : ''}
                  onClick={() => setActiveTab('transitions')}
                >
                  <Scissors size={18} />
                  Transitions
                </button>
                {analysis && (
                  <button
                    className={activeTab === 'insights' ? 'active' : ''}
                    onClick={() => setActiveTab('insights')}
                  >
                    <Wand2 size={18} />
                    Insights
                  </button>
                )}
              </div>

              <div className="tab-content">
                {activeTab === 'clips' && project && (
                  <>
                    {projectMode === 'automatic' && videoClips.length > 0 && (
                      <div className="back-to-auto">
                        <button onClick={() => setActiveTab('subtitles')}>
                          <Wand2 size={16} />
                          Continue to Auto Edit
                        </button>
                      </div>
                    )}
                    <ClipsPanel
                      projectId={project.id}
                      clips={videoClips}
                      onClipsChange={setVideoClips}
                    />
                  </>
                )}
                {activeTab === 'subtitles' && <SubtitleEditor />}
                {activeTab === 'audio' && project && (
                  <AudioEditor
                    projectId={project.id}
                    bgmTracks={bgmTracks}
                    onBGMChange={setBgmTracks}
                    suggestedSFX={analysis?.suggestedSFX}
                    suggestedBGM={analysis?.suggestedBGM}
                  />
                )}
                {activeTab === 'overlays' && <OverlayEditor />}
                {activeTab === 'transitions' && project && (
                  <TransitionsEditor
                    transitions={transitions}
                    suggestedTransitions={analysis?.suggestedTransitions}
                    onAddTransition={handleAddTransition}
                    onUpdateTransition={handleUpdateTransition}
                    onDeleteTransition={handleDeleteTransition}
                    onApplySuggested={handleApplySuggestedTransition}
                    clips={videoClips.map(c => ({
                      id: c.id,
                      original_name: c.original_name,
                      timeline_order: c.timeline_order,
                    }))}
                    introEffect={introEffect}
                    outroEffect={outroEffect}
                    onRemoveIntroEffect={() => setIntroEffect(null)}
                    onRemoveOutroEffect={() => setOutroEffect(null)}
                  />
                )}
                {activeTab === 'insights' && analysis && (
                  <div className="insights-panel" style={{ padding: '12px', fontSize: '0.9em' }}>
                    <h3 style={{ marginBottom: 12 }}>Analysis Intelligence</h3>

                    {/* Genre Detection */}
                    {analysis.pre_classification && (
                      <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <strong>Detected Genre:</strong>{' '}
                        <span style={{ color: '#4caf50', textTransform: 'capitalize' }}>
                          {analysis.pre_classification.video_type?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                        {analysis.pre_classification.speech_ratio !== undefined && (
                          <span style={{ marginLeft: 12, color: '#999' }}>
                            Speech: {Math.round((analysis.pre_classification.speech_ratio || 0) * 100)}%
                          </span>
                        )}
                      </div>
                    )}

                    {/* Narrative Arc */}
                    {analysis.narrative_arc?.phases && analysis.narrative_arc.phases.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <h4 style={{ marginBottom: 6 }}>Narrative Arc</h4>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {analysis.narrative_arc.phases.map((phase, i) => (
                            <div key={i} style={{
                              padding: '4px 8px', borderRadius: 4, fontSize: '0.8em',
                              background: `rgba(76, 175, 80, ${0.2 + phase.intensity * 0.6})`,
                              color: '#fff', textTransform: 'capitalize'
                            }}>
                              {phase.phase} ({phase.start_time.toFixed(0)}s-{phase.end_time.toFixed(0)}s)
                            </div>
                          ))}
                        </div>
                        {analysis.narrative_arc.climax_timestamp && (
                          <p style={{ marginTop: 4, color: '#ff9800', fontSize: '0.85em' }}>
                            Climax at {analysis.narrative_arc.climax_timestamp.toFixed(1)}s
                          </p>
                        )}
                      </div>
                    )}

                    {/* Emotion Distribution */}
                    {analysis.emotion_distribution && Object.keys(analysis.emotion_distribution).length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <h4 style={{ marginBottom: 6 }}>Emotion Distribution</h4>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {Object.entries(analysis.emotion_distribution)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .slice(0, 5)
                            .map(([emotion, score]) => (
                              <span key={emotion} style={{
                                padding: '3px 8px', borderRadius: 12, fontSize: '0.8em',
                                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                              }}>
                                {emotion}: {Math.round((score as number) * 100)}%
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Color Grading */}
                    {analysis.color_grading?.overall_lut && (
                      <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <strong>Suggested LUT:</strong>{' '}
                        <span style={{ color: '#2196f3' }}>{analysis.color_grading.overall_lut}</span>
                        {analysis.color_grading.consistency_score !== undefined && (
                          <span style={{ marginLeft: 12, color: '#999' }}>
                            Consistency: {Math.round(analysis.color_grading.consistency_score * 100)}%
                          </span>
                        )}
                      </div>
                    )}

                    {/* Pacing Adjustments */}
                    {analysis.pacing_adjustments && analysis.pacing_adjustments.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <h4 style={{ marginBottom: 6 }}>Pacing Suggestions ({analysis.pacing_adjustments.length})</h4>
                        {analysis.pacing_adjustments.slice(0, 5).map((adj, i) => (
                          <div key={i} style={{
                            padding: '4px 8px', marginBottom: 4, borderRadius: 4,
                            background: adj.severity === 'high' ? 'rgba(244,67,54,0.1)' :
                              adj.severity === 'medium' ? 'rgba(255,152,0,0.1)' : 'rgba(255,255,255,0.03)',
                            fontSize: '0.85em', borderLeft: `3px solid ${
                              adj.severity === 'high' ? '#f44336' : adj.severity === 'medium' ? '#ff9800' : '#666'
                            }`
                          }}>
                            <strong>{adj.type}</strong> at {adj.timestamp.toFixed(1)}s: {adj.suggestion}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* B-Roll Points */}
                    {analysis.broll_points && analysis.broll_points.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <h4 style={{ marginBottom: 6 }}>B-Roll Insertion Points ({analysis.broll_points.length})</h4>
                        {analysis.broll_points.slice(0, 5).map((br, i) => (
                          <div key={i} style={{
                            padding: '4px 8px', marginBottom: 4, borderRadius: 4,
                            background: 'rgba(33,150,243,0.08)', fontSize: '0.85em',
                            borderLeft: '3px solid #2196f3'
                          }}>
                            <strong>{br.timestamp.toFixed(1)}s</strong> ({br.duration.toFixed(1)}s): {br.reason}
                            {br.prompt && <div style={{ color: '#999', marginTop: 2 }}>Prompt: {br.prompt}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Genre Rules Summary */}
                    {analysis.genre_rules && (
                      <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <h4 style={{ marginBottom: 4 }}>Genre Editing Rules</h4>
                        <div style={{ fontSize: '0.85em', color: '#bbb' }}>
                          {analysis.genre_rules.transition_rules?.preferred_types && (
                            <div>Transitions: {analysis.genre_rules.transition_rules.preferred_types.join(', ')}</div>
                          )}
                          {analysis.genre_rules.pacing_rules?.target_pace && (
                            <div>Pacing: {analysis.genre_rules.pacing_rules.target_pace}</div>
                          )}
                          {analysis.genre_rules.caption_rules?.style && (
                            <div>Captions: {analysis.genre_rules.caption_rules.style}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Visual Impacts */}
                    {analysis.visual_impacts && analysis.visual_impacts.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <h4 style={{ marginBottom: 6 }}>Visual Impact Points ({analysis.visual_impacts.length})</h4>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {analysis.visual_impacts.slice(0, 10).map((vi, i) => (
                            <span key={i} style={{
                              padding: '2px 6px', borderRadius: 4, fontSize: '0.75em',
                              background: vi.intensity > 0.7 ? 'rgba(244,67,54,0.2)' : 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                            }}>
                              {vi.timestamp.toFixed(1)}s ({vi.type})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio Mix Info */}
                    {analysis.audio_mix_map?.mix_notes && analysis.audio_mix_map.mix_notes.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <h4 style={{ marginBottom: 6 }}>Audio Mix Notes</h4>
                        {analysis.audio_mix_map.mix_notes.map((note, i) => (
                          <div key={i} style={{ fontSize: '0.85em', color: '#bbb', padding: '2px 0' }}>
                            {note}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* CapCut-Style Timeline - Hidden in automatic mode */}
      {projectMode !== 'automatic' && (
        <div className="timeline-section">
          <Timeline
            videoClips={videoClips}
            onClipsChange={setVideoClips}
            projectId={project?.id}
            transitions={transitions}
            onTransitionClick={() => {
              setActiveTab('transitions')
            }}
            introEffect={introEffect}
            outroEffect={outroEffect}
            onIntroEffectClick={() => {
              setActiveTab('transitions')
            }}
            onOutroEffectClick={() => {
              setActiveTab('transitions')
            }}
            bgmTracks={bgmTracks}
            onBGMChange={setBgmTracks}
            // Phase 4: Manual mode intelligence props
            showBeatMarkers={showBeatMarkers}
            snapToBeats={snapToBeats}
            beats={analysisBeats}
            beatSyncPoints={analysisBeatSyncPoints}
            speechRegions={speechRegions}
            scenes={analysisScenes}
          />
        </div>
      )}

      {/* Export Dialog */}
      {project && (
        <ExportDialog
          projectId={project.id}
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* Review/Feedback Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={() => setShowReviewModal(false)}
      />
    </div>
  )
}
