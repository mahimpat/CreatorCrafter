/**
 * useTimeTracking - Hook to track time spent in app and trigger review prompt
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { usersApi } from '../api'

interface UseTimeTrackingOptions {
  enabled?: boolean
  updateInterval?: number // seconds between updates to server
}

interface UseTimeTrackingReturn {
  totalTimeInApp: number
  shouldShowReview: boolean
  markReviewShown: () => void
  isLoading: boolean
}

const UPDATE_INTERVAL = 60 // Send update every 60 seconds
const REVIEW_SHOWN_KEY = 'creatorcrafter_review_shown'

export function useTimeTracking(options: UseTimeTrackingOptions = {}): UseTimeTrackingReturn {
  const { enabled = true, updateInterval = UPDATE_INTERVAL } = options

  const [totalTimeInApp, setTotalTimeInApp] = useState(0)
  const [shouldShowReview, setShouldShowReview] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [reviewShown, setReviewShown] = useState(false)

  const lastUpdateRef = useRef<number>(Date.now())
  const localSecondsRef = useRef<number>(0)

  // Check initial review status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await usersApi.getReviewStatus()
        setTotalTimeInApp(response.data.total_time_in_app)
        setShouldShowReview(response.data.should_prompt)
        setReviewShown(response.data.prompted || response.data.completed)

        // Also check localStorage for this session
        const localShown = localStorage.getItem(REVIEW_SHOWN_KEY)
        if (localShown === 'true') {
          setShouldShowReview(false)
        }
      } catch (error) {
        console.error('Failed to check review status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (enabled) {
      checkStatus()
    } else {
      setIsLoading(false)
    }
  }, [enabled])

  // Track time and send updates
  useEffect(() => {
    if (!enabled || reviewShown) return

    const intervalId = setInterval(async () => {
      const now = Date.now()
      const secondsSinceLastUpdate = Math.floor((now - lastUpdateRef.current) / 1000)

      if (secondsSinceLastUpdate >= updateInterval) {
        try {
          const response = await usersApi.updateTimeTracking(secondsSinceLastUpdate)
          setTotalTimeInApp(response.data.total_time_in_app)

          // Check if we should show review
          if (response.data.should_prompt_review && !reviewShown) {
            const localShown = localStorage.getItem(REVIEW_SHOWN_KEY)
            if (localShown !== 'true') {
              setShouldShowReview(true)
            }
          }

          lastUpdateRef.current = now
          localSecondsRef.current = 0
        } catch (error) {
          console.error('Failed to update time tracking:', error)
          // Keep counting locally
          localSecondsRef.current += secondsSinceLastUpdate
        }
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(intervalId)
  }, [enabled, updateInterval, reviewShown])

  // Send final update on unmount
  useEffect(() => {
    if (!enabled) return

    return () => {
      const secondsSinceLastUpdate = Math.floor((Date.now() - lastUpdateRef.current) / 1000)
      if (secondsSinceLastUpdate > 5) {
        // Fire and forget - don't await
        usersApi.updateTimeTracking(secondsSinceLastUpdate).catch(() => {})
      }
    }
  }, [enabled])

  const markReviewShown = useCallback(() => {
    setShouldShowReview(false)
    setReviewShown(true)
    localStorage.setItem(REVIEW_SHOWN_KEY, 'true')

    // Mark on server
    usersApi.markReviewPrompted().catch(() => {})
  }, [])

  return {
    totalTimeInApp: totalTimeInApp + localSecondsRef.current,
    shouldShowReview: shouldShowReview && !reviewShown,
    markReviewShown,
    isLoading,
  }
}

export default useTimeTracking
