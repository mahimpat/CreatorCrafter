/**
 * WebSocket hook for real-time progress updates
 * Fixed to prevent constant reconnections in React StrictMode
 */
import { useEffect, useRef, useCallback, useState } from 'react'

export interface ProgressUpdate {
  type: string
  task_id?: string
  project_id?: number
  stage?: string
  progress?: number
  message?: string
  result?: Record<string, unknown>
  error?: string
}

interface UseWebSocketOptions {
  onProgress?: (update: ProgressUpdate) => void
  onComplete?: (update: ProgressUpdate) => void
  onError?: (update: ProgressUpdate) => void
  enabled?: boolean
}

// Singleton WebSocket connection to prevent multiple connections
let globalWs: WebSocket | null = null
let globalWsConnecting = false
let connectionAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const listeners: Set<(data: ProgressUpdate) => void> = new Set()

function getOrCreateWebSocket(): WebSocket | null {
  const token = localStorage.getItem('access_token')
  if (!token) return null

  // Return existing connection if open or connecting
  if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING)) {
    return globalWs
  }

  // Prevent multiple simultaneous connection attempts
  if (globalWsConnecting) {
    return null
  }

  // Check max attempts
  if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('Max WebSocket reconnection attempts reached')
    return null
  }

  globalWsConnecting = true
  connectionAttempts++

  // Derive WebSocket URL: use VITE_WS_URL env var, or auto-detect from page URL
  const wsBase = import.meta.env.VITE_WS_URL || (() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.hostname}:8000`
  })()
  const wsUrl = `${wsBase}/ws?token=${encodeURIComponent(token)}`

  try {
    globalWs = new WebSocket(wsUrl)

    globalWs.onopen = () => {
      globalWsConnecting = false
      connectionAttempts = 0 // Reset on successful connection
    }

    globalWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProgressUpdate
        // Notify all listeners
        listeners.forEach(listener => listener(data))
        // Also dispatch a custom event for components that need to listen globally
        window.dispatchEvent(new CustomEvent('ws-progress', { detail: data }))
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    globalWs.onclose = (event) => {
      globalWsConnecting = false
      globalWs = null

      // Reconnect after delay (unless it was a clean close or auth failure)
      if (event.code !== 1000 && event.code !== 4001 && connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(() => {
          getOrCreateWebSocket()
        }, Math.min(3000 * connectionAttempts, 15000)) // Exponential backoff
      }
    }

    globalWs.onerror = (error) => {
      console.error('WebSocket error:', error)
      globalWsConnecting = false
    }

    return globalWs
  } catch (e) {
    console.error('Failed to create WebSocket:', e)
    globalWsConnecting = false
    return null
  }
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onProgress, onComplete, onError, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const [lastProgress, setLastProgress] = useState<ProgressUpdate | null>(null)

  // Store callbacks in refs to avoid dependency issues
  const onProgressRef = useRef(onProgress)
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)

  // Update refs when callbacks change
  useEffect(() => {
    onProgressRef.current = onProgress
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
  }, [onProgress, onComplete, onError])

  useEffect(() => {
    if (!enabled) return

    // Create message handler
    const handleMessage = (data: ProgressUpdate) => {
      setLastProgress(data)

      // Call appropriate callback based on message type
      if (data.type === 'connected') {
        setIsConnected(true)
      } else if (data.type.endsWith('_complete')) {
        onCompleteRef.current?.(data)
      } else if (data.type.endsWith('_error')) {
        onErrorRef.current?.(data)
      } else {
        onProgressRef.current?.(data)
      }
    }

    // Register listener
    listeners.add(handleMessage)

    // Get or create connection
    const ws = getOrCreateWebSocket()
    if (ws?.readyState === WebSocket.OPEN) {
      setIsConnected(true)
    }

    // Cleanup
    return () => {
      listeners.delete(handleMessage)
      // Don't close the global WebSocket on unmount - it's shared
    }
  }, [enabled])

  // Update connection state when WebSocket state changes
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(globalWs?.readyState === WebSocket.OPEN)
    }

    const interval = setInterval(checkConnection, 1000)
    return () => clearInterval(interval)
  }, [])

  const sendPing = useCallback(() => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send('ping')
    }
  }, [])

  const getTaskStatus = useCallback((taskId: string) => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify({ type: 'get_status', task_id: taskId }))
    }
  }, [])

  const reconnect = useCallback(() => {
    connectionAttempts = 0 // Reset attempts
    if (globalWs) {
      globalWs.close()
      globalWs = null
    }
    getOrCreateWebSocket()
  }, [])

  return {
    isConnected,
    lastProgress,
    sendPing,
    getTaskStatus,
    reconnect,
  }
}
