/**
 * useWebGLTransition Hook
 *
 * Manages WebGL-based video transitions using gl-transitions shaders.
 * Handles context creation, texture management, and animation rendering.
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import {
  createWebGLContext,
  createProgram,
  createVideoTexture,
  updateVideoTexture,
  createFullscreenQuad,
  setupVertexAttributes,
  isWebGL2Supported,
} from '../utils/webglUtils';
import { VERTEX_SHADER, getTransitionShader } from '../utils/glTransitions';

export interface TransitionConfig {
  type: string;
  duration: number; // in seconds
}

export interface UseWebGLTransitionOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  fromVideoRef: React.RefObject<HTMLVideoElement>;
  toVideoRef: React.RefObject<HTMLVideoElement>;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
}

export interface UseWebGLTransitionReturn {
  startTransition: (config: TransitionConfig) => void;
  stopTransition: () => void;
  isTransitioning: boolean;
  progress: number;
  isSupported: boolean;
  error: string | null;
}

interface WebGLState {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  fromTexture: WebGLTexture;
  toTexture: WebGLTexture;
  positionBuffer: WebGLBuffer;
  texCoordBuffer: WebGLBuffer;
  uniformLocations: {
    from: WebGLUniformLocation | null;
    to: WebGLUniformLocation | null;
    progress: WebGLUniformLocation | null;
    ratio: WebGLUniformLocation | null;
  };
}

export function useWebGLTransition({
  canvasRef,
  fromVideoRef,
  toVideoRef,
  onComplete,
  onProgress,
}: UseWebGLTransitionOptions): UseWebGLTransitionReturn {
  const [isSupported] = useState(() => isWebGL2Supported());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const webglStateRef = useRef<WebGLState | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const currentTransitionTypeRef = useRef<string>('fade');

  /**
   * Initialize WebGL context and resources
   */
  const initWebGL = useCallback((transitionType: string): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas not available');
      return false;
    }

    // Create or reuse WebGL context
    let gl: WebGL2RenderingContext | null = webglStateRef.current?.gl ?? null;
    if (!gl) {
      gl = createWebGLContext(canvas);
      if (!gl) {
        setError('WebGL not supported');
        return false;
      }
    }

    // Get shader for this transition type
    const fragmentShader = getTransitionShader(transitionType);

    // Create program
    const program = createProgram(gl, VERTEX_SHADER, fragmentShader);
    if (!program) {
      console.error('[WebGL] Failed to create shader program for:', transitionType);
      setError('Failed to create shader program');
      return false;
    }

    // Create textures
    const fromTexture = createVideoTexture(gl);
    const toTexture = createVideoTexture(gl);
    if (!fromTexture || !toTexture) {
      setError('Failed to create textures');
      return false;
    }

    // Create buffers
    const { positionBuffer, texCoordBuffer } = createFullscreenQuad(gl);
    if (!positionBuffer || !texCoordBuffer) {
      setError('Failed to create buffers');
      return false;
    }

    // Get uniform locations
    const uniformLocations = {
      from: gl.getUniformLocation(program, 'u_from'),
      to: gl.getUniformLocation(program, 'u_to'),
      progress: gl.getUniformLocation(program, 'u_progress'),
      ratio: gl.getUniformLocation(program, 'u_ratio'),
    };

    // Store state
    webglStateRef.current = {
      gl,
      program,
      fromTexture,
      toTexture,
      positionBuffer,
      texCoordBuffer,
      uniformLocations,
    };

    currentTransitionTypeRef.current = transitionType;
    setError(null);
    return true;
  }, [canvasRef]);

  /**
   * Render a single frame of the transition
   */
  const renderFrame = useCallback((timestamp: number) => {
    const state = webglStateRef.current;
    const canvas = canvasRef.current;
    const fromVideo = fromVideoRef.current;
    const toVideo = toVideoRef.current;

    if (!state || !canvas || !fromVideo || !toVideo) {
      console.warn('[WebGL] renderFrame: Missing required elements', {
        state: !!state,
        canvas: !!canvas,
        fromVideo: !!fromVideo,
        toVideo: !!toVideo,
      });
      return;
    }

    const { gl, program, fromTexture, toTexture, positionBuffer, texCoordBuffer, uniformLocations } = state;

    // Calculate progress
    const elapsed = timestamp - startTimeRef.current;
    const currentProgress = Math.min(elapsed / (durationRef.current * 1000), 1.0);

    setProgress(currentProgress);
    onProgress?.(currentProgress);

    // Resize canvas to match video
    if (fromVideo.videoWidth && fromVideo.videoHeight) {
      if (canvas.width !== fromVideo.videoWidth || canvas.height !== fromVideo.videoHeight) {
        canvas.width = fromVideo.videoWidth;
        canvas.height = fromVideo.videoHeight;
      }
    } else {
      console.warn('[WebGL] fromVideo has no dimensions:', fromVideo.videoWidth, fromVideo.videoHeight);
    }

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Clear
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use program
    gl.useProgram(program);

    // Setup vertex attributes
    setupVertexAttributes(gl, program, positionBuffer, texCoordBuffer);

    // Update textures from video frames
    gl.activeTexture(gl.TEXTURE0);
    updateVideoTexture(gl, fromTexture, fromVideo);

    gl.activeTexture(gl.TEXTURE1);
    updateVideoTexture(gl, toTexture, toVideo);

    // Set uniforms
    gl.uniform1i(uniformLocations.from, 0);
    gl.uniform1i(uniformLocations.to, 1);
    gl.uniform1f(uniformLocations.progress, currentProgress);
    gl.uniform1f(uniformLocations.ratio, canvas.width / canvas.height);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Continue animation or complete
    if (currentProgress < 1.0) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    } else {
      setIsTransitioning(false);
      setProgress(1);
      onComplete?.();
    }
  }, [canvasRef, fromVideoRef, toVideoRef, onComplete, onProgress]);

  /**
   * Start a transition
   */
  const startTransition = useCallback((config: TransitionConfig) => {
    if (!isSupported) {
      console.error('[WebGL] WebGL not supported');
      setError('WebGL not supported');
      return;
    }

    const fromVideo = fromVideoRef.current;
    const toVideo = toVideoRef.current;

    if (!fromVideo || !toVideo) {
      console.error('[WebGL] Video elements not available', { fromVideo: !!fromVideo, toVideo: !!toVideo });
      setError('Video elements not available');
      return;
    }

    // Check if videos are ready
    if (fromVideo.readyState < 2 || toVideo.readyState < 2) {
      console.warn('[WebGL] Videos not ready, waiting...', { from: fromVideo.readyState, to: toVideo.readyState });
      // Try again after a short delay
      setTimeout(() => startTransition(config), 100);
      return;
    }

    // Initialize WebGL if needed or if transition type changed
    if (!webglStateRef.current || currentTransitionTypeRef.current !== config.type) {
      // Clean up old state if exists
      if (webglStateRef.current) {
        const { gl, program, fromTexture, toTexture, positionBuffer, texCoordBuffer } = webglStateRef.current;
        gl.deleteProgram(program);
        gl.deleteTexture(fromTexture);
        gl.deleteTexture(toTexture);
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(texCoordBuffer);
      }

      if (!initWebGL(config.type)) {
        console.error('[WebGL] Failed to initialize WebGL');
        return;
      }
    }

    // Cancel any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Start transition
    setIsTransitioning(true);
    setProgress(0);
    durationRef.current = config.duration;
    startTimeRef.current = performance.now();

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [isSupported, fromVideoRef, toVideoRef, initWebGL, renderFrame]);

  /**
   * Stop the current transition
   */
  const stopTransition = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsTransitioning(false);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (webglStateRef.current) {
        const { gl, program, fromTexture, toTexture, positionBuffer, texCoordBuffer } = webglStateRef.current;
        gl.deleteProgram(program);
        gl.deleteTexture(fromTexture);
        gl.deleteTexture(toTexture);
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(texCoordBuffer);
      }
    };
  }, []);

  return {
    startTransition,
    stopTransition,
    isTransitioning,
    progress,
    isSupported,
    error,
  };
}

export default useWebGLTransition;
