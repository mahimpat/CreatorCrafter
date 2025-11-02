import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react'
import { useProject, MediaOverlay, MediaOverlayAsset } from '../context/ProjectContext'
import './MediaOverlayCanvas.css'

interface MediaOverlayCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement>
  videoWidth: number
  videoHeight: number
}

type TransformHandle = 'tl' | 'tr' | 'bl' | 'br' | 'rotate' | 'move' | null

function MediaOverlayCanvas({ videoRef, videoWidth, videoHeight }: MediaOverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayMediaRefs = useRef<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map())
  const rafIdRef = useRef<number | null>(null)

  const {
    currentTime,
    mediaOverlays,
    mediaOverlayAssets,
    addMediaOverlayToTimeline,
    updateMediaOverlay,
    selectedClipIds,
    selectClip
  } = useProject()

  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [activeHandle, setActiveHandle] = useState<TransformHandle>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [initialTransform, setInitialTransform] = useState<any>(null)
  const [cursorStyle, setCursorStyle] = useState<string>('default')

  // Get active overlays at current time (memoized to avoid recalculation)
  const activeOverlays = useMemo(() =>
    mediaOverlays.filter(
      overlay => currentTime >= overlay.start && currentTime < overlay.start + overlay.duration && overlay.visible
    ).sort((a, b) => a.zIndex - b.zIndex),
    [mediaOverlays, currentTime]
  )

  // Load media assets (images/videos)
  useEffect(() => {
    const mediaMap = overlayMediaRefs.current

    // Remove elements for deleted assets
    mediaMap.forEach((element, assetId) => {
      if (!mediaOverlayAssets.find(asset => asset.id === assetId)) {
        if (element instanceof HTMLVideoElement) {
          element.pause()
          element.remove()
        }
        mediaMap.delete(assetId)
      }
    })

    // Create elements for new assets
    mediaOverlayAssets.forEach(asset => {
      if (!mediaMap.has(asset.id)) {
        if (asset.type === 'image') {
          const img = new Image()
          img.src = `localfile://${asset.path}`
          mediaMap.set(asset.id, img)
        } else if (asset.type === 'video') {
          const video = document.createElement('video')
          video.src = `localfile://${asset.path}`
          video.preload = 'auto'
          video.muted = true // Muted by default, can be controlled via volume property
          mediaMap.set(asset.id, video)
        }
      }
    })

    // Cleanup on unmount
    return () => {
      mediaMap.forEach((element, assetId) => {
        if (element instanceof HTMLVideoElement) {
          element.pause()
          element.src = '' // Free memory
          element.remove()
        }
      })
      mediaMap.clear()
    }
  }, [mediaOverlayAssets])

  // Render overlays on canvas using requestAnimationFrame for better performance
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !videoRef.current) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Cancel previous animation frame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
    }

    // Render function
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render each active overlay
    activeOverlays.forEach(overlay => {
      const asset = mediaOverlayAssets.find(a => a.id === overlay.assetId)
      if (!asset) return

      const mediaElement = overlayMediaRefs.current.get(asset.id)
      if (!mediaElement) return

      // Calculate overlay position and size on canvas
      const x = overlay.transform.x * canvas.width
      const y = overlay.transform.y * canvas.height
      const width = overlay.transform.width * canvas.width * overlay.transform.scaleX
      const height = overlay.transform.height * canvas.height * overlay.transform.scaleY

      ctx.save()

      // Apply transformations
      ctx.globalAlpha = overlay.opacity
      ctx.globalCompositeOperation = overlay.blendMode as GlobalCompositeOperation

      // Translate to position
      ctx.translate(x, y)

      // Rotate if needed
      if (overlay.transform.rotation !== 0) {
        const anchorX = width * overlay.transform.anchorX
        const anchorY = height * overlay.transform.anchorY
        ctx.translate(anchorX, anchorY)
        ctx.rotate((overlay.transform.rotation * Math.PI) / 180)
        ctx.translate(-anchorX, -anchorY)
      }

      // Draw media
      try {
        if (mediaElement instanceof HTMLImageElement && mediaElement.complete) {
          ctx.drawImage(mediaElement, 0, 0, width, height)
        } else if (mediaElement instanceof HTMLVideoElement) {
          // Sync video time with timeline
          const overlayTime = currentTime - overlay.start
          const videoTime = (overlay.clipStart || 0) + overlayTime

          if (Math.abs(mediaElement.currentTime - videoTime) > 0.1) {
            mediaElement.currentTime = videoTime
          }

          if (mediaElement.readyState >= 2) {
            ctx.drawImage(mediaElement, 0, 0, width, height)
          }
        }
      } catch (error) {
        console.error('Error drawing overlay:', error)
      }

      ctx.restore()

        // Draw transform controls for selected overlay
        if (selectedClipIds.includes(overlay.id)) {
          drawTransformControls(ctx, x, y, width, height, overlay.transform.rotation)
        }
      })
    }

    // Use requestAnimationFrame for smooth rendering
    rafIdRef.current = requestAnimationFrame(render)

    // Cleanup
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [activeOverlays, currentTime, selectedClipIds, mediaOverlayAssets, videoRef])

  // Draw transform controls (bounding box, resize handles, rotation handle)
  const drawTransformControls = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number
  ) => {
    ctx.save()

    // Translate to center for rotation
    ctx.translate(x + width / 2, y + height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-(x + width / 2), -(y + height / 2))

    // Bounding box
    ctx.strokeStyle = '#4fc3f7'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(x, y, width, height)
    ctx.setLineDash([])

    // Resize handles
    const handleSize = 10
    const handles = [
      { x: x - handleSize / 2, y: y - handleSize / 2 }, // top-left
      { x: x + width - handleSize / 2, y: y - handleSize / 2 }, // top-right
      { x: x - handleSize / 2, y: y + height - handleSize / 2 }, // bottom-left
      { x: x + width - handleSize / 2, y: y + height - handleSize / 2 }, // bottom-right
    ]

    ctx.fillStyle = '#4fc3f7'
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
    })

    // Rotation handle (circle at top center)
    const rotateHandleY = y - 30
    const rotateHandleX = x + width / 2
    ctx.beginPath()
    ctx.arc(rotateHandleX, rotateHandleY, 8, 0, Math.PI * 2)
    ctx.fill()

    // Line from top to rotation handle
    ctx.strokeStyle = '#4fc3f7'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + width / 2, y)
    ctx.lineTo(rotateHandleX, rotateHandleY)
    ctx.stroke()

    ctx.restore()
  }

  // Handle drop from OverlayLibrary
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)

    try {
      const assetData = e.dataTransfer.getData('media-overlay-asset')
      if (!assetData) return

      const asset: MediaOverlayAsset = JSON.parse(assetData)

      // Get drop position relative to canvas
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      // Scale coordinates to canvas internal resolution, then normalize to 0-1
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const dropX = ((e.clientX - rect.left) * scaleX) / canvas.width
      const dropY = ((e.clientY - rect.top) * scaleY) / canvas.height

      // Create new overlay at drop position
      const newOverlay: MediaOverlay = {
        id: `overlay-${Date.now()}`,
        assetId: asset.id,
        start: currentTime,
        duration: asset.duration,
        transform: {
          x: Math.max(0, Math.min(0.7, dropX - 0.15)), // Center on drop point, constrained
          y: Math.max(0, Math.min(0.7, dropY - 0.15)),
          width: 0.3, // 30% of canvas width
          height: 0.3, // 30% of canvas height
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          anchorX: 0.5,
          anchorY: 0.5,
        },
        opacity: 1,
        visible: true,
        blendMode: 'normal',
        clipStart: 0,
        clipEnd: asset.duration,
        volume: asset.type === 'video' ? 0.5 : undefined,
        zIndex: mediaOverlays.length // Place on top
      }

      addMediaOverlayToTimeline(newOverlay)
      selectClip(newOverlay.id, false)
    } catch (error) {
      console.error('Error dropping overlay:', error)
    }
  }, [currentTime, mediaOverlays.length, addMediaOverlayToTimeline, selectClip])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
  }, [])

  // Mouse interaction for transform controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    // Scale mouse coordinates to canvas internal resolution
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Check if clicking on selected overlay
    const selectedOverlay = activeOverlays.find(o => selectedClipIds.includes(o.id))
    if (selectedOverlay) {
      // Check which handle was clicked
      const handle = getHandleAtPosition(x, y, selectedOverlay, canvas.width, canvas.height)
      if (handle) {
        setActiveHandle(handle)
        setDragStart({ x, y })
        setInitialTransform({ ...selectedOverlay.transform })
        return
      }
    }

    // Check if clicking on any overlay
    for (let i = activeOverlays.length - 1; i >= 0; i--) {
      const overlay = activeOverlays[i]
      if (isPointInOverlay(x, y, overlay, canvas.width, canvas.height)) {
        selectClip(overlay.id, false)
        setActiveHandle('move')
        setDragStart({ x, y })
        setInitialTransform({ ...overlay.transform })
        return
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    // Scale mouse coordinates to canvas internal resolution
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Update cursor based on hover position (when not dragging)
    if (!activeHandle) {
      const selectedOverlay = activeOverlays.find(o => selectedClipIds.includes(o.id))
      if (selectedOverlay) {
        const handle = getHandleAtPosition(x, y, selectedOverlay, canvas.width, canvas.height)
        if (handle === 'tl' || handle === 'br') {
          setCursorStyle('nwse-resize')
        } else if (handle === 'tr' || handle === 'bl') {
          setCursorStyle('nesw-resize')
        } else if (handle === 'rotate') {
          setCursorStyle('grab')
        } else if (handle === 'move') {
          setCursorStyle('move')
        } else {
          setCursorStyle('default')
        }
      } else {
        setCursorStyle('default')
      }
      return
    }

    // Handle active dragging
    if (!dragStart || !initialTransform) return

    const dx = (x - dragStart.x) / canvas.width
    const dy = (y - dragStart.y) / canvas.height

    const selectedOverlay = activeOverlays.find(o => selectedClipIds.includes(o.id))
    if (!selectedOverlay) return

    if (activeHandle === 'move') {
      // Move overlay
      updateMediaOverlay(selectedOverlay.id, {
        transform: {
          ...selectedOverlay.transform,
          x: Math.max(0, Math.min(1 - selectedOverlay.transform.width * selectedOverlay.transform.scaleX, initialTransform.x + dx)),
          y: Math.max(0, Math.min(1 - selectedOverlay.transform.height * selectedOverlay.transform.scaleY, initialTransform.y + dy))
        }
      })
    } else if (activeHandle === 'rotate') {
      // Calculate rotation based on mouse position relative to overlay center
      const overlayX = selectedOverlay.transform.x * canvas.width + (selectedOverlay.transform.width * canvas.width * selectedOverlay.transform.scaleX) / 2
      const overlayY = selectedOverlay.transform.y * canvas.height + (selectedOverlay.transform.height * canvas.height * selectedOverlay.transform.scaleY) / 2

      const angle = Math.atan2(y - overlayY, x - overlayX) * (180 / Math.PI)
      const rotation = angle + 90 // Adjust so 0 degrees is pointing up

      updateMediaOverlay(selectedOverlay.id, {
        transform: {
          ...selectedOverlay.transform,
          rotation: Math.round(rotation)
        }
      })
    } else if (activeHandle === 'tl' || activeHandle === 'tr' || activeHandle === 'bl' || activeHandle === 'br') {
      // Resize from corners
      const pixelDx = x - dragStart.x
      const pixelDy = y - dragStart.y

      let newX = initialTransform.x
      let newY = initialTransform.y
      let newScaleX = initialTransform.scaleX
      let newScaleY = initialTransform.scaleY

      const initialWidthPixels = initialTransform.width * canvas.width * initialTransform.scaleX
      const initialHeightPixels = initialTransform.height * canvas.height * initialTransform.scaleY

      if (activeHandle === 'tl') {
        // Top-left: move position and scale inversely
        newX = initialTransform.x + dx
        newY = initialTransform.y + dy
        newScaleX = Math.max(0.1, (initialWidthPixels - pixelDx) / (initialTransform.width * canvas.width))
        newScaleY = Math.max(0.1, (initialHeightPixels - pixelDy) / (initialTransform.height * canvas.height))
      } else if (activeHandle === 'tr') {
        // Top-right: move Y position, scale width normally, height inversely
        newY = initialTransform.y + dy
        newScaleX = Math.max(0.1, (initialWidthPixels + pixelDx) / (initialTransform.width * canvas.width))
        newScaleY = Math.max(0.1, (initialHeightPixels - pixelDy) / (initialTransform.height * canvas.height))
      } else if (activeHandle === 'bl') {
        // Bottom-left: move X position, scale height normally, width inversely
        newX = initialTransform.x + dx
        newScaleX = Math.max(0.1, (initialWidthPixels - pixelDx) / (initialTransform.width * canvas.width))
        newScaleY = Math.max(0.1, (initialHeightPixels + pixelDy) / (initialTransform.height * canvas.height))
      } else if (activeHandle === 'br') {
        // Bottom-right: scale both normally
        newScaleX = Math.max(0.1, (initialWidthPixels + pixelDx) / (initialTransform.width * canvas.width))
        newScaleY = Math.max(0.1, (initialHeightPixels + pixelDy) / (initialTransform.height * canvas.height))
      }

      // Constrain to canvas bounds
      newX = Math.max(0, Math.min(1 - initialTransform.width * newScaleX, newX))
      newY = Math.max(0, Math.min(1 - initialTransform.height * newScaleY, newY))

      updateMediaOverlay(selectedOverlay.id, {
        transform: {
          ...selectedOverlay.transform,
          x: newX,
          y: newY,
          scaleX: newScaleX,
          scaleY: newScaleY
        }
      })
    }
  }

  const handleMouseUp = () => {
    setActiveHandle(null)
    setDragStart(null)
    setInitialTransform(null)
  }

  // Helper functions
  const getHandleAtPosition = (x: number, y: number, overlay: MediaOverlay, canvasWidth: number, canvasHeight: number): TransformHandle => {
    const overlayX = overlay.transform.x * canvasWidth
    const overlayY = overlay.transform.y * canvasHeight
    const overlayWidth = overlay.transform.width * canvasWidth * overlay.transform.scaleX
    const overlayHeight = overlay.transform.height * canvasHeight * overlay.transform.scaleY

    // Handle size constants
    const handleSize = 10
    const handleHitArea = 15 // Larger hit area for easier clicking
    const rotateHandleRadius = 8
    const rotateHandleY = overlayY - 30

    // Check rotation handle (at top center)
    const rotateHandleX = overlayX + overlayWidth / 2
    const distToRotateHandle = Math.sqrt(
      Math.pow(x - rotateHandleX, 2) + Math.pow(y - rotateHandleY, 2)
    )
    if (distToRotateHandle <= rotateHandleRadius + 5) {
      return 'rotate'
    }

    // Check corner resize handles
    const handles = [
      { x: overlayX, y: overlayY, type: 'tl' as TransformHandle },
      { x: overlayX + overlayWidth, y: overlayY, type: 'tr' as TransformHandle },
      { x: overlayX, y: overlayY + overlayHeight, type: 'bl' as TransformHandle },
      { x: overlayX + overlayWidth, y: overlayY + overlayHeight, type: 'br' as TransformHandle },
    ]

    for (const handle of handles) {
      const distX = Math.abs(x - handle.x)
      const distY = Math.abs(y - handle.y)
      if (distX <= handleHitArea && distY <= handleHitArea) {
        return handle.type
      }
    }

    // Check if inside overlay bounds (for move)
    if (x >= overlayX && x <= overlayX + overlayWidth &&
        y >= overlayY && y <= overlayY + overlayHeight) {
      return 'move'
    }

    return null
  }

  const isPointInOverlay = (x: number, y: number, overlay: MediaOverlay, canvasWidth: number, canvasHeight: number): boolean => {
    const overlayX = overlay.transform.x * canvasWidth
    const overlayY = overlay.transform.y * canvasHeight
    const overlayWidth = overlay.transform.width * canvasWidth * overlay.transform.scaleX
    const overlayHeight = overlay.transform.height * canvasHeight * overlay.transform.scaleY

    return x >= overlayX && x <= overlayX + overlayWidth &&
           y >= overlayY && y <= overlayY + overlayHeight
  }

  return (
    <canvas
      ref={canvasRef}
      className={`media-overlay-canvas ${isDraggingOver ? 'drag-over' : ''}`}
      width={videoWidth}
      height={videoHeight}
      style={{ cursor: cursorStyle }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  )
}

// Memoize MediaOverlayCanvas to prevent unnecessary re-renders
export default memo(MediaOverlayCanvas, (prevProps, nextProps) => {
  // Only re-render if video dimensions change
  return prevProps.videoWidth === nextProps.videoWidth &&
         prevProps.videoHeight === nextProps.videoHeight
})
