/**
 * WebGL Utility Functions for Video Transitions
 * Provides low-level WebGL operations for texture management and shader compilation
 */

/**
 * Creates a WebGL2 rendering context from a canvas element
 */
export function createWebGLContext(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    console.warn('WebGL2 not supported, falling back to WebGL1');
    return canvas.getContext('webgl') as WebGL2RenderingContext | null;
  }

  return gl;
}

/**
 * Compiles a shader from source
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: number
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('Failed to create shader');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Creates a WebGL program from vertex and fragment shaders
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShaderSource: string,
  fragmentShaderSource: string
): WebGLProgram | null {
  const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    console.error('Failed to create program');
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  // Clean up shaders (they're now part of the program)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

/**
 * Creates a texture from a video element
 */
export function createVideoTexture(gl: WebGL2RenderingContext): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) {
    console.error('Failed to create texture');
    return null;
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set texture parameters for video (non-power-of-2 compatible)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
}

/**
 * Updates a texture with video frame data
 */
export function updateVideoTexture(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  video: HTMLVideoElement
): void {
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Use texImage2D for video frames
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    video
  );
}

/**
 * Creates a fullscreen quad for rendering
 * Returns position and texCoord buffers
 */
export function createFullscreenQuad(gl: WebGL2RenderingContext): {
  positionBuffer: WebGLBuffer | null;
  texCoordBuffer: WebGLBuffer | null;
} {
  // Fullscreen quad vertices (2 triangles)
  const positions = new Float32Array([
    -1, -1,  // Bottom-left
     1, -1,  // Bottom-right
    -1,  1,  // Top-left
    -1,  1,  // Top-left
     1, -1,  // Bottom-right
     1,  1,  // Top-right
  ]);

  // Texture coordinates
  const texCoords = new Float32Array([
    0, 1,  // Bottom-left (flipped Y for video)
    1, 1,  // Bottom-right
    0, 0,  // Top-left
    0, 0,  // Top-left
    1, 1,  // Bottom-right
    1, 0,  // Top-right
  ]);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

  return { positionBuffer, texCoordBuffer };
}

/**
 * Sets up vertex attributes for the fullscreen quad
 */
export function setupVertexAttributes(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  positionBuffer: WebGLBuffer,
  texCoordBuffer: WebGLBuffer
): void {
  // Position attribute
  const positionLoc = gl.getAttribLocation(program, 'a_position');
  if (positionLoc !== -1) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  }

  // Texture coordinate attribute
  const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
  if (texCoordLoc !== -1) {
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  }
}

/**
 * Resizes canvas to match video dimensions while maintaining device pixel ratio
 */
export function resizeCanvasToVideo(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  maxPixelRatio: number = 2
): void {
  const dpr = Math.min(window.devicePixelRatio, maxPixelRatio);
  const displayWidth = video.videoWidth || video.clientWidth;
  const displayHeight = video.videoHeight || video.clientHeight;

  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

/**
 * Checks if WebGL2 is supported in the current browser
 */
export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * Gets WebGL renderer info for debugging
 */
export function getWebGLInfo(gl: WebGL2RenderingContext): {
  vendor: string;
  renderer: string;
  version: string;
} {
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

  return {
    vendor: debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR),
    renderer: debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER),
    version: gl.getParameter(gl.VERSION),
  };
}
