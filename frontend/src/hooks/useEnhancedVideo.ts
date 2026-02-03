/**
 * useEnhancedVideo - Custom hook for enhanced video playback
 *
 * Features:
 * - Better error handling with retry logic
 * - Frame-accurate seeking using requestVideoFrameCallback
 * - Preloading optimization for clip transitions
 * - Format compatibility detection
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import {
  parseVideoError,
  VideoError,
  seekToFrame,
  preloadVideo,
  isRequestVideoFrameCallbackSupported,
  detectCodecSupport,
  CodecSupport,
} from '../utils/videoUtils'

interface PreloadedClip {
  url: string
  video: HTMLVideoElement | null
  status: 'pending' | 'loading' | 'ready' | 'error'
  error?: string
}

interface UseEnhancedVideoOptions {
  videoRef?: React.RefObject<HTMLVideoElement | null> // External video ref to use
  onError?: (error: VideoError) => void
  onClipReady?: (url: string) => void
  preloadAhead?: number // Number of clips to preload ahead
  retryAttempts?: number
  retryDelay?: number
}

interface UseEnhancedVideoReturn {
  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>

  // State
  isLoading: boolean
  error: VideoError | null
  codecSupport: CodecSupport
  hasFrameAccurateSeek: boolean

  // Actions
  seekAccurate: (time: number, onComplete?: () => void) => void
  preloadClip: (url: string) => Promise<void>
  preloadClips: (urls: string[]) => void
  getPreloadedClip: (url: string) => PreloadedClip | undefined
  clearPreloadCache: () => void
  retryLoad: () => void

  // Event handlers to attach to video element
  handleError: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  handleLoadStart: () => void
  handleCanPlay: () => void
  handleWaiting: () => void
  handlePlaying: () => void
}

export function useEnhancedVideo(
  options: UseEnhancedVideoOptions = {}
): UseEnhancedVideoReturn {
  const {
    videoRef: externalVideoRef,
    onError,
    onClipReady,
    preloadAhead = 1,
    retryAttempts = 3,
    retryDelay = 1000,
  } = options

  const internalVideoRef = useRef<HTMLVideoElement | null>(null)
  // Use external ref if provided, otherwise use internal
  const videoRef = externalVideoRef || internalVideoRef

  const preloadCacheRef = useRef<Map<string, PreloadedClip>>(new Map())
  const retryCountRef = useRef(0)
  const currentSrcRef = useRef<string>('')
  const waitingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<VideoError | null>(null)
  const [codecSupport] = useState(() => detectCodecSupport())
  const [hasFrameAccurateSeek] = useState(() => isRequestVideoFrameCallbackSupported())

  // Error handling with retry logic
  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget

    // Only handle actual errors (video.error is set)
    if (!video.error) {
      return
    }

    const parsedError = parseVideoError(video.error)
    console.error('Video error:', parsedError)

    // Retry for recoverable errors (network errors)
    if (parsedError.recoverable && retryCountRef.current < retryAttempts) {
      retryCountRef.current++
      console.log(`Retrying video load (attempt ${retryCountRef.current}/${retryAttempts})...`)

      const src = video.src || currentSrcRef.current
      if (src) {
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.src = src
            videoRef.current.load()
          }
        }, retryDelay * retryCountRef.current)
      }
      return
    }

    setError(parsedError)
    setIsLoading(false)
    onError?.(parsedError)
  }, [retryAttempts, retryDelay, onError, videoRef])

  // Loading state handlers
  const handleLoadStart = useCallback(() => {
    // Track current source for retry logic
    if (videoRef.current) {
      currentSrcRef.current = videoRef.current.src
    }

    setIsLoading(true)
    setError(null)
    retryCountRef.current = 0

    // Clear any previous loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }

    // Safety timeout - don't show loading forever (10 seconds)
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false)
      loadingTimeoutRef.current = null
    }, 10000)
  }, [videoRef])

  const handleCanPlay = useCallback(() => {
    // Clear loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
    setIsLoading(false)
    setError(null)
  }, [])

  const handleWaiting = useCallback(() => {
    // Clear any existing timeout
    if (waitingTimeoutRef.current) {
      clearTimeout(waitingTimeoutRef.current)
    }
    // Only show loading if buffering for more than 500ms
    waitingTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 3) {
        setIsLoading(true)
      }
      waitingTimeoutRef.current = null
    }, 500)
  }, [videoRef])

  const handlePlaying = useCallback(() => {
    // Clear waiting timeout if video starts playing
    if (waitingTimeoutRef.current) {
      clearTimeout(waitingTimeoutRef.current)
      waitingTimeoutRef.current = null
    }
    // Clear loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
    setIsLoading(false)
  }, [])

  // Frame-accurate seeking
  const seekAccurate = useCallback((time: number, onComplete?: () => void) => {
    if (!videoRef.current) {
      onComplete?.()
      return
    }
    seekToFrame(videoRef.current, time, onComplete)
  }, [videoRef])

  // Preload a single clip
  const preloadClip = useCallback(async (url: string): Promise<void> => {
    // Check if already preloaded or loading
    const existing = preloadCacheRef.current.get(url)
    if (existing && (existing.status === 'ready' || existing.status === 'loading')) {
      return
    }

    // Mark as loading
    preloadCacheRef.current.set(url, {
      url,
      video: null,
      status: 'loading',
    })

    try {
      const video = await preloadVideo(url, { timeout: 15000 })
      preloadCacheRef.current.set(url, {
        url,
        video,
        status: 'ready',
      })
      onClipReady?.(url)
    } catch (err) {
      preloadCacheRef.current.set(url, {
        url,
        video: null,
        status: 'error',
        error: err instanceof Error ? err.message : 'Preload failed',
      })
    }
  }, [onClipReady])

  // Preload multiple clips
  const preloadClips = useCallback((urls: string[]) => {
    // Only preload the specified number ahead
    const toPreload = urls.slice(0, preloadAhead)
    toPreload.forEach(url => preloadClip(url))
  }, [preloadAhead, preloadClip])

  // Get a preloaded clip
  const getPreloadedClip = useCallback((url: string): PreloadedClip | undefined => {
    return preloadCacheRef.current.get(url)
  }, [])

  // Clear preload cache
  const clearPreloadCache = useCallback(() => {
    preloadCacheRef.current.forEach(clip => {
      if (clip.video) {
        clip.video.src = ''
        clip.video.load()
      }
    })
    preloadCacheRef.current.clear()
  }, [])

  // Manual retry
  const retryLoad = useCallback(() => {
    if (videoRef.current && currentSrcRef.current) {
      retryCountRef.current = 0
      setError(null)
      setIsLoading(true)
      videoRef.current.src = currentSrcRef.current
      videoRef.current.load()
    }
  }, [videoRef])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPreloadCache()
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current)
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [clearPreloadCache])

  return {
    videoRef,
    isLoading,
    error,
    codecSupport,
    hasFrameAccurateSeek,
    seekAccurate,
    preloadClip,
    preloadClips,
    getPreloadedClip,
    clearPreloadCache,
    retryLoad,
    handleError,
    handleLoadStart,
    handleCanPlay,
    handleWaiting,
    handlePlaying,
  }
}

/**
 * Hook for preloading next clips in a playlist
 */
export function useClipPreloader(
  clips: Array<{ url: string; id: number }>,
  currentIndex: number,
  preloadCount: number = 2
) {
  const preloadCacheRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const [preloadStatus, setPreloadStatus] = useState<Record<string, 'loading' | 'ready' | 'error'>>({})

  // Preload upcoming clips
  useEffect(() => {
    const toPreload = clips.slice(currentIndex + 1, currentIndex + 1 + preloadCount)

    toPreload.forEach(async clip => {
      if (preloadCacheRef.current.has(clip.url)) return

      setPreloadStatus(prev => ({ ...prev, [clip.url]: 'loading' }))

      try {
        const video = await preloadVideo(clip.url, { timeout: 20000 })
        preloadCacheRef.current.set(clip.url, video)
        setPreloadStatus(prev => ({ ...prev, [clip.url]: 'ready' }))
      } catch {
        setPreloadStatus(prev => ({ ...prev, [clip.url]: 'error' }))
      }
    })

    // Clean up clips that are far behind
    const keysToRemove: string[] = []
    preloadCacheRef.current.forEach((video, url) => {
      const clipIndex = clips.findIndex(c => c.url === url)
      if (clipIndex < currentIndex - 1) {
        video.src = ''
        keysToRemove.push(url)
      }
    })
    keysToRemove.forEach(key => preloadCacheRef.current.delete(key))
  }, [clips, currentIndex, preloadCount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      preloadCacheRef.current.forEach(video => {
        video.src = ''
      })
      preloadCacheRef.current.clear()
    }
  }, [])

  const getPreloadedVideo = useCallback((url: string): HTMLVideoElement | undefined => {
    return preloadCacheRef.current.get(url)
  }, [])

  const isClipReady = useCallback((url: string): boolean => {
    return preloadStatus[url] === 'ready'
  }, [preloadStatus])

  return {
    preloadStatus,
    getPreloadedVideo,
    isClipReady,
  }
}

export default useEnhancedVideo
