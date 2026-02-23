/**
 * WebGLTransitionCanvas Component
 *
 * Renders professional WebGL-based video transitions using gl-transitions shaders.
 * Uses a snapshot canvas as the "from" source (no dual-video needed).
 * Positioned as an overlay above the video player, visible only during transitions.
 */

import React, { useRef, useEffect } from 'react';
import { useWebGLTransition, TransitionConfig } from '../hooks/useWebGLTransition';
import './WebGLTransitionCanvas.css';

export interface WebGLTransitionCanvasProps {
  /** Reference to the "from" source — a canvas snapshot of the outgoing clip */
  fromRef: React.RefObject<HTMLCanvasElement | HTMLVideoElement>;
  /** Reference to the "to" video element (next clip) */
  toVideoRef: React.RefObject<HTMLVideoElement>;
  /** Active transition configuration, null when no transition */
  transition: TransitionConfig | null;
  /** Callback when transition animation completes */
  onTransitionComplete?: () => void;
  /** Callback for transition progress updates */
  onTransitionProgress?: (progress: number) => void;
  /** Callback when WebGL transition fails (shader compilation etc.) */
  onTransitionError?: (error: string) => void;
  /** Additional CSS class name */
  className?: string;
}

export function WebGLTransitionCanvas({
  fromRef,
  toVideoRef,
  transition,
  onTransitionComplete,
  onTransitionProgress,
  onTransitionError,
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
    fromRef,
    toVideoRef,
    onComplete: onTransitionComplete,
    onProgress: onTransitionProgress,
    onError: onTransitionError,
  });

  // Start transition when config changes
  useEffect(() => {
    if (transition && isSupported) {
      startTransition(transition);
    } else if (!transition) {
      stopTransition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition, isSupported]);

  const isVisible = isTransitioning;

  if (!isSupported) {
    return <></>;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`webgl-transition-canvas ${isVisible ? 'visible' : ''} ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        opacity: isVisible ? 1 : 0,
        pointerEvents: 'none',
        zIndex: 26,
      }}
      aria-hidden="true"
    />
  );
}

export default WebGLTransitionCanvas;
