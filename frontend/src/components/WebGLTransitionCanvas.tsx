/**
 * WebGLTransitionCanvas Component
 *
 * Renders professional WebGL-based video transitions using gl-transitions shaders.
 * Positioned as an overlay above the video player, visible only during transitions.
 */

import React, { useRef, useEffect } from 'react';
import { useWebGLTransition, TransitionConfig } from '../hooks/useWebGLTransition';
import './WebGLTransitionCanvas.css';

export interface WebGLTransitionCanvasProps {
  /** Reference to the "from" video element (current clip) */
  fromVideoRef: React.RefObject<HTMLVideoElement>;
  /** Reference to the "to" video element (next clip) */
  toVideoRef: React.RefObject<HTMLVideoElement>;
  /** Active transition configuration, null when no transition */
  transition: TransitionConfig | null;
  /** Callback when transition animation completes */
  onTransitionComplete?: () => void;
  /** Callback for transition progress updates */
  onTransitionProgress?: (progress: number) => void;
  /** Additional CSS class name */
  className?: string;
}

export function WebGLTransitionCanvas({
  fromVideoRef,
  toVideoRef,
  transition,
  onTransitionComplete,
  onTransitionProgress,
  className = '',
}: WebGLTransitionCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    startTransition,
    stopTransition,
    isTransitioning,
    isSupported,
  } = useWebGLTransition({
    canvasRef,
    fromVideoRef,
    toVideoRef,
    onComplete: onTransitionComplete,
    onProgress: onTransitionProgress,
  });

  // Start transition when config changes
  useEffect(() => {
    if (transition && isSupported) {
      startTransition(transition);
    } else if (!transition && isTransitioning) {
      stopTransition();
    }
  }, [transition, isSupported, startTransition, stopTransition, isTransitioning]);

  // Match canvas size to video dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = fromVideoRef.current;

    if (!canvas || !video) return;

    const updateSize = () => {
      if (video.videoWidth && video.videoHeight) {
        // Set internal canvas resolution
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };

    // Update on video metadata load
    video.addEventListener('loadedmetadata', updateSize);
    // Initial update
    updateSize();

    return () => {
      video.removeEventListener('loadedmetadata', updateSize);
    };
  }, [fromVideoRef]);

  // Show canvas only during active transitions
  const isVisible = isTransitioning || (transition !== null && isSupported);

  if (!isSupported) {
    // Return null if WebGL not supported - fallback to CSS transitions
    return <></>;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`webgl-transition-canvas ${isVisible ? 'visible' : ''} ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}

export default WebGLTransitionCanvas;
