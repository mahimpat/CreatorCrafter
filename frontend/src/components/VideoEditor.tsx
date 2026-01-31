/**
 * VideoEditor - Main video editing interface
 * Adapted for web from the Electron version
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useWebSocket, ProgressUpdate } from '../hooks/useWebSocket'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
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
  Music,
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
} from 'lucide-react'
import { VideoClip, BackgroundAudio, Transition, projectsApi } from '../api'
import Timeline from './Timeline'
import SubtitleEditor from './SubtitleEditor'
import SFXEditor from './SFXEditor'
import OverlayEditor from './OverlayEditor'
import ClipsPanel from './ClipsPanel'
import BGMPanel from './BGMPanel'
import TransitionsEditor, { TransitionType } from './TransitionsEditor'
import ModeSwitcher from './ModeSwitcher'
import AssetsPanel from './AssetsPanel'
import AutoEditPanel from './AutoEditPanel'
import AnalysisOverlay from './AnalysisOverlay'
import ExportDialog from './ExportDialog'
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp'
import WebGLTransitionCanvas from './WebGLTransitionCanvas'
import { isWebGL2Supported } from '../utils/webglUtils'
import { TRANSITION_MAP } from '../utils/glTransitions'
import './VideoEditor.css'
import './TransitionEffects.css'
import './TransitionEffects2.css'

type ActiveTab = 'clips' | 'subtitles' | 'sfx' | 'overlays' | 'bgm' | 'transitions'

export default function VideoEditor() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const toVideoRef = useRef<HTMLVideoElement>(null) // Hidden video for WebGL transition "to" texture
  const fileInputRef = useRef<HTMLInputElement>(null)

  // WebGL support detection
  const [webglSupported] = useState(() => isWebGL2Supported())

  const [activeTab, setActiveTab] = useState<ActiveTab>('subtitles')
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [videoClips, setVideoClips] = useState<VideoClip[]>([])
  const [bgmTracks, setBgmTracks] = useState<BackgroundAudio[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showAssetsPanel, setShowAssetsPanel] = useState(true)
  // Intro/Outro effects (fade in at start, fade out at end)
  const [introEffect, setIntroEffect] = useState<{ type: string; duration: number } | null>(null)
  const [outroEffect, setOutroEffect] = useState<{ type: string; duration: number } | null>(null)
  const [showIntroEffect, setShowIntroEffect] = useState(false)
  const [showOutroEffect, setShowOutroEffect] = useState(false)

  // Debug: Log transitions changes
  useEffect(() => {
    console.log('=== Transitions state updated ===', transitions)
  }, [transitions])
  // Multi-clip playback state
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [currentClipUrl, setCurrentClipUrl] = useState<string | null>(null)
  const isSeekingRef = useRef(false)
  const pendingSeekRef = useRef<number | null>(null)
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
  // Guard to prevent multiple transition triggers
  const isTransitioningRef = useRef(false)

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

  // Refs for SFX audio elements
  const sfxAudioRefs = useRef<Map<number, HTMLAudioElement>>(new Map())

  // Sort clips by timeline order
  const sortedClips = [...videoClips].sort((a, b) => a.timeline_order - b.timeline_order)

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
    } else if (sortedClips.length === 0) {
      setCurrentClipUrl(null)
    }
  }, [sortedClips, currentClipIndex, getClipStreamUrl])

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
        console.log('Analysis progress:', update.progress, update.message)
      }
    },
    onComplete: async (update: ProgressUpdate) => {
      if (update.type === 'video_analysis_complete') {
        setIsAnalyzing(false)
        if (update.result) {
          setAnalysis(update.result as any)
        }
      } else if (update.type === 'sfx_generation_complete') {
        if (update.result) {
          const result = update.result as { filename: string; prompt: string; duration: number }
          addSFXTrack({
            filename: result.filename,
            start_time: currentTime,
            duration: result.duration,
            volume: 1,
            prompt: result.prompt,
          })
        }
      } else if (update.type === 'auto_generate_complete') {
        // Auto-generation completed - refresh all data
        console.log('Auto-generation complete:', update.result)
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
        await uploadVideo(file, setUploadProgress)
        setUploadProgress(null)
      } catch (error) {
        console.error('Upload failed:', error)
        setUploadProgress(null)
      }
    },
    [uploadVideo]
  )

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        // Ensure we're at the correct position before playing
        if (sortedClips.length > 0) {
          const clipInfo = getClipAtTime(currentTime)
          if (clipInfo) {
            if (clipInfo.index !== currentClipIndex) {
              // Need to switch clips first, then play
              shouldAutoPlayRef.current = true
              isSeekingRef.current = true
              pendingSeekRef.current = clipInfo.clipTime
              setCurrentClipIndex(clipInfo.index)
              setCurrentClipUrl(getClipStreamUrl(clipInfo.clip))
              // Don't set isPlaying yet - it will be set after clip loads
              return
            } else {
              // Same clip - make sure video is at the correct clip time
              const expectedClipTime = clipInfo.clipTime
              if (Math.abs(videoRef.current.currentTime - expectedClipTime) > 0.1) {
                videoRef.current.currentTime = expectedClipTime
              }
            }
          }
        }
        videoRef.current.play()
        setIsPlaying(true)
      }
    }
  }, [isPlaying, setIsPlaying, sortedClips, currentTime, currentClipIndex, getClipAtTime, getClipStreamUrl])

  // Handle time updates - convert clip time to timeline time
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && !isSeekingRef.current) {
      const clipTime = videoRef.current.currentTime
      const timelineTime = getTimelineTimeFromClip(currentClipIndex, clipTime)
      setCurrentTime(timelineTime)
    }
  }, [currentClipIndex, getTimelineTimeFromClip, setCurrentTime])

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
        console.log('Using WebGL transition:', appliedTransition.type)

        // Preload next clip in hidden video
        setNextClipUrl(nextUrl)

        // Wait for toVideo to be ready, then start WebGL transition
        const checkToVideoReady = () => {
          if (toVideoRef.current && toVideoRef.current.readyState >= 2) {
            // Seek toVideo to start trim position
            toVideoRef.current.currentTime = nextClip.start_trim

            // Start WebGL transition
            setWebglTransitionConfig({
              type: appliedTransition.type,
              duration: appliedTransition.duration,
            })
          } else {
            // Wait and check again
            setTimeout(checkToVideoReady, 50)
          }
        }

        // Give time for source to start loading
        setTimeout(checkToVideoReady, 100)
      } else {
        // CSS fallback transition path
        // Pause video during transition
        if (videoRef.current) {
          videoRef.current.pause()
        }

        // Function to switch to next clip
        const switchToNextClip = () => {
          // Mark that we should auto-play after the new clip loads
          shouldAutoPlayRef.current = true

          setCurrentClipIndex(nextIndex)
          setCurrentClipUrl(nextUrl)

          // Set up "in" phase after a short delay
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = nextClip.start_trim
            }

            // Start "in" phase of transition
            if (appliedTransition && appliedTransition.type !== 'cut') {
              // Get color for color-based transitions
              const transitionColor = appliedTransition.parameters?.color ||
                (appliedTransition.type === 'flash' ? 'white' :
                 appliedTransition.type === 'color_fade' ? '#8b5cf6' : undefined)

              setActiveTransitionEffect({
                type: appliedTransition.type,
                duration: appliedTransition.duration,
                phase: 'in',
                color: typeof transitionColor === 'string' ? transitionColor : undefined
              })

              // Clear transition effect and resume playback after "in" phase completes
              const inDuration = (appliedTransition.duration * 1000) / 2
              setTimeout(() => {
                setActiveTransitionEffect(null)
                isTransitioningRef.current = false
                // Resume playback
                if (videoRef.current && shouldAutoPlayRef.current) {
                  videoRef.current.play().catch(() => {})
                  shouldAutoPlayRef.current = false
                }
              }, inDuration)
            } else {
              // No transition effect - just resume
              isTransitioningRef.current = false
              if (videoRef.current && shouldAutoPlayRef.current) {
                videoRef.current.play().catch(() => {})
                shouldAutoPlayRef.current = false
              }
            }
          }, 150) // Give time for video source to load
        }

        // Apply transition effect if exists (not for 'cut' type)
        if (appliedTransition && appliedTransition.type !== 'cut') {
          console.log('Starting CSS transition effect:', appliedTransition.type, 'duration:', appliedTransition.duration)

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
            switchToNextClip()
          }, outDuration)
        } else {
          // No transition or cut - switch immediately
          switchToNextClip()
        }
      }
    } else {
      // End of timeline
      setIsPlaying(false)
    }
  }, [currentClipIndex, sortedClips, getClipStreamUrl, setIsPlaying, transitions, webglSupported])

  // Handle WebGL transition complete
  const handleWebGLTransitionComplete = useCallback(() => {
    console.log('WebGL transition complete')

    // Clear WebGL transition state
    setWebglTransitionConfig(null)
    setNextClipUrl(null)

    // Switch to the next clip
    const nextIndex = currentClipIndex + 1
    if (nextIndex < sortedClips.length) {
      const nextClip = sortedClips[nextIndex]
      const nextUrl = getClipStreamUrl(nextClip)

      setCurrentClipIndex(nextIndex)
      setCurrentClipUrl(nextUrl)

      // Resume playback after clip loads
      shouldAutoPlayRef.current = true
      isTransitioningRef.current = false
    }
  }, [currentClipIndex, sortedClips, getClipStreamUrl])

  // Track if we should auto-play after clip switch
  const shouldAutoPlayRef = useRef(false)

  // Handle loaded metadata - seek to correct position and auto-play if needed
  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return

    if (pendingSeekRef.current !== null) {
      // Pending seek from timeline click
      videoRef.current.currentTime = pendingSeekRef.current
      pendingSeekRef.current = null
      isSeekingRef.current = false
      if (isPlaying || shouldAutoPlayRef.current) {
        videoRef.current.play().catch(() => {})
        shouldAutoPlayRef.current = false
      }
    } else if (sortedClips.length > 0) {
      // Multi-clip mode - seek to start_trim of current clip
      const currentClip = sortedClips[currentClipIndex]
      if (currentClip) {
        videoRef.current.currentTime = currentClip.start_trim
        // Auto-play if we were playing before clip switch
        if (shouldAutoPlayRef.current) {
          videoRef.current.play().catch(() => {})
          shouldAutoPlayRef.current = false
        }
      }
    } else {
      // Single video mode
      setDuration(videoRef.current.duration)
    }
  }, [currentClipIndex, sortedClips, isPlaying, setDuration])

  // Handle seeking on the timeline - may need to switch clips
  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const timelineTime = parseFloat(e.target.value)
      setCurrentTime(timelineTime)

      // Cancel any ongoing transition when seeking
      if (isTransitioningRef.current) {
        isTransitioningRef.current = false
        setActiveTransitionEffect(null)
      }

      if (sortedClips.length > 0) {
        // Multi-clip mode
        const clipInfo = getClipAtTime(timelineTime)
        if (clipInfo) {
          if (clipInfo.index !== currentClipIndex) {
            // Need to switch clips
            isSeekingRef.current = true
            pendingSeekRef.current = clipInfo.clipTime
            setCurrentClipIndex(clipInfo.index)
            setCurrentClipUrl(getClipStreamUrl(clipInfo.clip))
          } else if (videoRef.current) {
            // Same clip, just seek
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

    if (sortedClips.length > 0) {
      // Multi-clip mode
      const clipInfo = getClipAtTime(newTime)
      if (clipInfo) {
        if (clipInfo.index !== currentClipIndex) {
          isSeekingRef.current = true
          pendingSeekRef.current = clipInfo.clipTime
          setCurrentClipIndex(clipInfo.index)
          setCurrentClipUrl(getClipStreamUrl(clipInfo.clip))
        } else if (videoRef.current) {
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
    if (videoRef.current && sortedClips.length > 0 && currentClipIndex < sortedClips.length && isPlaying) {
      const clip = sortedClips[currentClipIndex]
      const maxTime = (clip.duration || 0) - clip.end_trim

      const checkBounds = () => {
        // Don't trigger if already transitioning
        if (isTransitioningRef.current) {
          return
        }
        if (videoRef.current && videoRef.current.currentTime >= maxTime - 0.05) {
          handleClipEnded()
        }
      }

      const interval = setInterval(checkBounds, 100)
      return () => clearInterval(interval)
    }
  }, [sortedClips, currentClipIndex, handleClipEnded, isPlaying])

  // Sync video position when timeline position changes externally (e.g., clicking timeline)
  // This only syncs when paused to avoid interfering with playback
  useEffect(() => {
    if (isPlaying || !videoRef.current) return

    if (sortedClips.length > 0) {
      const clipInfo = getClipAtTime(currentTime)
      if (!clipInfo) return

      // If already on the correct clip, just seek within it
      if (clipInfo.index === currentClipIndex) {
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

  // SFX Audio Playback - create/update audio elements and sync with video
  useEffect(() => {
    if (!project) return

    // Create or update audio elements for each SFX track
    sfxTracks.forEach(sfx => {
      let audio = sfxAudioRefs.current.get(sfx.id)

      if (!audio) {
        // Create new audio element
        audio = new Audio()
        audio.preload = 'auto'
        sfxAudioRefs.current.set(sfx.id, audio)
      }

      // Update audio source if needed
      const url = getSFXStreamUrl(sfx.filename)
      if (audio.src !== url) {
        audio.src = url
      }

      // Set volume
      audio.volume = sfx.volume
    })

    // Remove audio elements for deleted SFX tracks
    const currentIds = new Set(sfxTracks.map(s => s.id))
    sfxAudioRefs.current.forEach((audio, id) => {
      if (!currentIds.has(id)) {
        audio.pause()
        audio.src = ''
        sfxAudioRefs.current.delete(id)
      }
    })

    // Cleanup on unmount
    return () => {
      sfxAudioRefs.current.forEach(audio => {
        audio.pause()
        audio.src = ''
      })
    }
  }, [project, sfxTracks, getSFXStreamUrl])

  // SFX Playback sync - play/pause SFX based on current time and video state
  useEffect(() => {
    const syncSFXPlayback = () => {
      sfxTracks.forEach(sfx => {
        const audio = sfxAudioRefs.current.get(sfx.id)
        if (!audio) return

        const sfxStart = sfx.start_time
        const sfxEnd = sfx.start_time + sfx.duration

        // Check if current time is within this SFX's range
        const shouldPlay = currentTime >= sfxStart && currentTime < sfxEnd

        if (shouldPlay && isPlaying) {
          // Calculate position within the SFX
          const sfxPosition = currentTime - sfxStart

          // Only seek if position is significantly different (avoid constant seeking)
          if (Math.abs(audio.currentTime - sfxPosition) > 0.3) {
            audio.currentTime = sfxPosition
          }

          // Play if paused
          if (audio.paused) {
            audio.play().catch(() => {
              // Ignore autoplay errors
            })
          }
        } else {
          // Pause if playing
          if (!audio.paused) {
            audio.pause()
          }
        }
      })
    }

    // Run sync immediately
    syncSFXPlayback()

    // Set up interval for continuous sync while playing
    if (isPlaying) {
      const interval = setInterval(syncSFXPlayback, 100)
      return () => clearInterval(interval)
    }
  }, [currentTime, isPlaying, sfxTracks])

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

  // Intro effect - show fade-in when starting from beginning
  useEffect(() => {
    if (introEffect && isPlaying && currentTime < 0.5 && currentClipIndex === 0) {
      setShowIntroEffect(true)
      const timer = setTimeout(() => {
        setShowIntroEffect(false)
      }, introEffect.duration * 1000)
      return () => clearTimeout(timer)
    }
  }, [introEffect, isPlaying, currentTime, currentClipIndex])

  // Outro effect - show fade-out when approaching end
  useEffect(() => {
    if (outroEffect && isPlaying && sortedClips.length > 0) {
      const timeToEnd = totalClipsDuration - currentTime
      if (timeToEnd <= outroEffect.duration && timeToEnd > 0 && currentClipIndex === sortedClips.length - 1) {
        setShowOutroEffect(true)
      } else {
        setShowOutroEffect(false)
      }
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
      console.log('Transition already exists, updating:', existingTransition.id)
      try {
        const res = await projectsApi.updateTransition(project.id, existingTransition.id, {
          type,
          duration: transitionDuration,
        })
        console.log('Transition updated:', res.data)
        setTransitions(prev => prev.map(t => t.id === existingTransition.id ? res.data : t))
      } catch (error) {
        console.error('Failed to update transition:', error)
        throw error
      }
      return
    }

    try {
      console.log('Creating transition:', { fromClipId, toClipId, type, transitionDuration })
      const res = await projectsApi.createTransition(project.id, {
        type,
        from_clip_id: fromClipId,
        to_clip_id: toClipId,
        duration: transitionDuration,
        parameters: null,
      })
      console.log('Transition created:', res.data)
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
    console.log('=== handleApplySuggestedTransition called ===')
    console.log('Raw suggestion:', JSON.stringify(suggestion, null, 2))

    // Handle 'start' type - this is an intro/fade-in effect
    if (suggestion.type === 'start') {
      const effectType = mapSuggestedTransitionType(suggestion.suggested_transition)
      console.log(`Applying intro effect: ${effectType}`)
      setIntroEffect({ type: effectType, duration: 1.0 })
      console.log('Intro effect applied successfully!')
      return
    }

    // Handle 'end' type - this is an outro/fade-out effect
    if (suggestion.type === 'end') {
      const effectType = mapSuggestedTransitionType(suggestion.suggested_transition)
      console.log(`Applying outro effect: ${effectType}`)
      setOutroEffect({ type: effectType, duration: 1.0 })
      console.log('Outro effect applied successfully!')
      return
    }

    console.log('videoClips state:', videoClips)
    console.log('current transitions:', transitions)

    // Find the clips at this timestamp to add transition between
    const clips = [...videoClips].sort((a, b) => a.timeline_order - b.timeline_order)

    if (clips.length < 2) {
      console.warn('Need at least 2 clips to add a transition')
      alert('Need at least 2 clips to add a transition. Current clip count: ' + clips.length)
      return
    }

    console.log('Sorted clips:', clips.map(c => ({
      id: c.id,
      name: c.original_name,
      duration: c.duration,
      effectiveDuration: getClipEffectiveDuration(c)
    })))

    // Build clip boundaries (end times of each clip on the timeline)
    const clipBoundaries: Array<{ endTime: number; clipIndex: number }> = []
    let cumulativeTime = 0

    for (let i = 0; i < clips.length - 1; i++) {
      const clip = clips[i]
      const effectiveDuration = getClipEffectiveDuration(clip)
      cumulativeTime += effectiveDuration
      clipBoundaries.push({ endTime: cumulativeTime, clipIndex: i })
    }

    console.log('Clip boundaries:', clipBoundaries)
    console.log('Suggestion timestamp:', suggestion.timestamp)

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
    console.log(`Mapped transition type: "${suggestion.suggested_transition}" -> "${transitionType}"`)

    try {
      // If only one clip boundary exists, just use it
      if (clipBoundaries.length === 1) {
        const fromClip = clips[0]
        const toClip = clips[1]
        console.log(`Only one clip boundary exists. Applying "${transitionType}" transition between clips.`)
        console.log(`From: ${fromClip.original_name}, To: ${toClip.original_name}`)

        await handleAddTransition(
          fromClip.id,
          toClip.id,
          transitionType,
          0.5
        )
      } else if (bestMatch && bestMatch.distance <= threshold) {
        const fromClip = clips[bestMatch.clipIndex]
        const toClip = clips[bestMatch.clipIndex + 1]

        console.log(`Adding transition between clip ${bestMatch.clipIndex} and ${bestMatch.clipIndex + 1}`)
        console.log(`From: ${fromClip.original_name}, To: ${toClip.original_name}`)

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
        console.log(`Using closest clip boundary (distance: ${bestMatch.distance.toFixed(2)}s) for timestamp ${suggestion.timestamp}`)
        console.log(`From: ${fromClip.original_name}, To: ${toClip.original_name}`)

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
      // Success!
      console.log('Transition applied successfully!')
    } catch (error) {
      console.error('Failed to apply suggested transition:', error)
      alert('Failed to apply transition. Check console for details.')
    }
  }, [videoClips, getClipEffectiveDuration, handleAddTransition])

  // Get current subtitle for overlay display
  const currentSubtitle = subtitles.find(
    (s) => currentTime >= s.start_time && currentTime <= s.end_time
  )

  // Get current text overlay for display
  const currentOverlay = textOverlays.find(
    (o) => currentTime >= o.start_time && currentTime <= o.end_time
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
                  src={sortedClips.length > 0 ? (currentClipUrl || '') : (videoUrl || '')}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={sortedClips.length > 0 ? handleClipEnded : undefined}
                  className={activeTransitionEffect ? `video-transition-${activeTransitionEffect.type} phase-${activeTransitionEffect.phase}` : ''}
                  style={activeTransitionEffect ? {
                    '--transition-duration': `${activeTransitionEffect.duration / 2}s`
                  } as React.CSSProperties : undefined}
                />

                {/* Hidden video for WebGL transition "to" texture */}
                <video
                  ref={toVideoRef}
                  src={nextClipUrl || ''}
                  preload="auto"
                  muted
                  style={{ display: 'none' }}
                />

                {/* WebGL Transition Canvas Overlay */}
                {webglSupported && (
                  <WebGLTransitionCanvas
                    fromVideoRef={videoRef}
                    toVideoRef={toVideoRef}
                    transition={webglTransitionConfig}
                    onTransitionComplete={handleWebGLTransitionComplete}
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
                    className={`subtitle-overlay ${currentSubtitle.style.position}`}
                    style={{
                      fontSize: currentSubtitle.style.fontSize,
                      fontFamily: currentSubtitle.style.fontFamily,
                      color: currentSubtitle.style.color,
                      backgroundColor: currentSubtitle.style.backgroundColor,
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
                  className={activeTab === 'sfx' ? 'active' : ''}
                  onClick={() => setActiveTab('sfx')}
                >
                  <Music size={18} />
                  Sound FX
                </button>
                <button
                  className={activeTab === 'overlays' ? 'active' : ''}
                  onClick={() => setActiveTab('overlays')}
                >
                  <Type size={18} />
                  Overlays
                </button>
                <button
                  className={activeTab === 'bgm' ? 'active' : ''}
                  onClick={() => setActiveTab('bgm')}
                >
                  <Headphones size={18} />
                  BGM
                </button>
                <button
                  className={activeTab === 'transitions' ? 'active' : ''}
                  onClick={() => setActiveTab('transitions')}
                >
                  <Scissors size={18} />
                  Transitions
                </button>
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
                {activeTab === 'sfx' && <SFXEditor />}
                {activeTab === 'overlays' && <OverlayEditor />}
                {activeTab === 'bgm' && project && (
                  <BGMPanel
                    projectId={project.id}
                    bgmTracks={bgmTracks}
                    onBGMChange={setBgmTracks}
                  />
                )}
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
    </div>
  )
}
