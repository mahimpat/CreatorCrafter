/**
 * useWebGLTransition Hook
 *
 * Manages WebGL-based video transitions using gl-transitions shaders.
 * Uses a snapshot canvas as the "from" texture (always instantly ready)
 * and a video element as the "to" texture.
 * This avoids the need for two videos decoding simultaneously.
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
import { applyEasing } from '../utils/easingFunctions';

export interface TransitionConfig {
  type: string;
  duration: number; // in seconds
  easing?: string;
}

/** The "from" source can be a canvas (snapshot) or a video element */
type TexSource = HTMLCanvasElement | HTMLVideoElement;

export interface UseWebGLTransitionOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** "From" source — typically a snapshot canvas with the last frame of the outgoing clip */
  fromRef: React.RefObject<TexSource>;
  /** "To" source — the video element playing the incoming clip */
  toVideoRef: React.RefObject<HTMLVideoElement>;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
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

/** Get width/height from either a canvas or video element */
function getSourceDimensions(source: TexSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  return { width: source.width, height: source.height };
}

export function useWebGLTransition({
  canvasRef,
  fromRef,
  toVideoRef,
  onComplete,
  onProgress,
  onError,
}: UseWebGLTransitionOptions): UseWebGLTransitionReturn {
  const [isSupported] = useState(() => isWebGL2Supported());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const webglStateRef = useRef<WebGLState | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const transitionActiveRef = useRef(false);

  // Use refs for callbacks to avoid stale closures in the animation loop
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onProgressRef.current = onProgress;
  onErrorRef.current = onError;
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const currentTransitionTypeRef = useRef<string>('fade');
  const easingTypeRef = useRef<string>('linear');

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
    const fromSource = fromRef.current;
    const toVideo = toVideoRef.current;

    if (!state || !canvas || !fromSource || !toVideo) {
      return;
    }

    const { gl, program, fromTexture, toTexture, positionBuffer, texCoordBuffer, uniformLocations } = state;

    // Calculate progress with easing
    const elapsed = timestamp - startTimeRef.current;
    const linearProgress = Math.min(elapsed / (durationRef.current * 1000), 1.0);
    const currentProgress = applyEasing(linearProgress, easingTypeRef.current);

    setProgress(currentProgress);
    onProgressRef.current?.(currentProgress);

    // Resize canvas to match source dimensions
    const dims = getSourceDimensions(fromSource);
    if (dims.width && dims.height) {
      if (canvas.width !== dims.width || canvas.height !== dims.height) {
        canvas.width = dims.width;
        canvas.height = dims.height;
      }
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

    // Update "from" texture (canvas snapshot — static, but re-uploading is fine)
    gl.activeTexture(gl.TEXTURE0);
    updateVideoTexture(gl, fromTexture, fromSource);

    // Update "to" texture (live video frames)
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
    if (linearProgress < 1.0) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    } else {
      transitionActiveRef.current = false;
      setProgress(1);
      onCompleteRef.current?.();
    }
  }, [canvasRef, fromRef, toVideoRef]);

  /**
   * Start a transition
   */
  const startTransition = useCallback((config: TransitionConfig) => {
    // Don't restart if a transition is already actively running
    if (transitionActiveRef.current) {
      return;
    }

    if (!isSupported) {
      setError('WebGL not supported');
      return;
    }

    const fromSource = fromRef.current;
    const toVideo = toVideoRef.current;

    if (!fromSource || !toVideo) {
      setError('Source elements not available');
      onErrorRef.current?.('Source elements not available');
      return;
    }

    // The "from" source is a canvas snapshot — always ready.
    // Only check if the "to" video is ready.
    if (toVideo.readyState < 2) {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      retryTimeoutRef.current = window.setTimeout(() => {
        retryTimeoutRef.current = null;
        startTransition(config);
      }, 50);
      return;
    }

    // Cancel any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Cancel any existing animation before cleanup
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Initialize WebGL if needed or if transition type changed
    if (!webglStateRef.current || currentTransitionTypeRef.current !== config.type) {
      if (webglStateRef.current) {
        const { gl, program, fromTexture, toTexture, positionBuffer, texCoordBuffer } = webglStateRef.current;
        gl.deleteProgram(program);
        gl.deleteTexture(fromTexture);
        gl.deleteTexture(toTexture);
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(texCoordBuffer);
        webglStateRef.current = null;
      }

      if (!initWebGL(config.type)) {
        onErrorRef.current?.(`Shader compilation failed for: ${config.type}`);
        return;
      }
    }

    // Mark transition as active
    transitionActiveRef.current = true;

    // Start transition
    setIsTransitioning(true);
    setProgress(0);
    durationRef.current = config.duration;
    easingTypeRef.current = config.easing || 'linear';
    startTimeRef.current = performance.now();

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [isSupported, fromRef, toVideoRef, initWebGL, renderFrame]);

  /**
   * Stop the current transition
   */
  const stopTransition = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    transitionActiveRef.current = false;
    setIsTransitioning(false);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
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
