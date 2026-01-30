/**
 * WebSocket hook for real-time progress updates
 */
import { useEffect, useRef, useCallback, useState } from 'react'

export interface ProgressUpdate {
  type: string
  task_id: string
  project_id: number
  stage: string
  progress: number
  message?: string
  result?: Record<string, unknown>
  error?: string
}

interface UseWebSocketOptions {
  onProgress?: (update: ProgressUpdate) => void
  onComplete?: (update: ProgressUpdate) => void
  onError?: (update: ProgressUpdate) => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const ws = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastProgress, setLastProgress] = useState<ProgressUpdate | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws?token=${token}`

    try {
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        setIsConnected(true)
        console.log('WebSocket connected')
      }

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ProgressUpdate
          setLastProgress(data)

          // Call appropriate callback based on message type
          if (data.type.endsWith('_complete')) {
            options.onComplete?.(data)
          } else if (data.type.endsWith('_error')) {
            options.onError?.(data)
          } else if (data.type !== 'connected') {
            options.onProgress?.(data)
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      ws.current.onclose = () => {
        setIsConnected(false)
        console.log('WebSocket disconnected')

        // Reconnect after delay
        reconnectTimeout.current = setTimeout(connect, 3000)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        ws.current?.close()
      }
    } catch (e) {
      console.error('Failed to create WebSocket:', e)
    }
  }, [options])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
      ws.current?.close()
    }
  }, [connect])

  const sendPing = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send('ping')
    }
  }, [])

  const getTaskStatus = useCallback((taskId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'get_status', task_id: taskId }))
    }
  }, [])

  return {
    isConnected,
    lastProgress,
    sendPing,
    getTaskStatus,
  }
}
