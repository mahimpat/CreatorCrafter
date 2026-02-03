/**
 * GL Transitions - Professional GLSL Shader Transitions
 * Using official gl-transitions library (https://gl-transitions.com/)
 *
 * This module loads professional-grade WebGL transitions and maps them
 * to our internal transition type names.
 */

// Import all transitions from gl-transitions package
import glTransitionsData from 'gl-transitions';

// Type definition for gl-transitions
interface GLTransition {
  name: string;
  glsl: string;
  defaultParams: Record<string, unknown>;
  paramsTypes: Record<string, string>;
  author?: string;
  license?: string;
}

// Cast the imported data to proper type
const glTransitions: GLTransition[] = glTransitionsData as GLTransition[];

// Build a lookup map for quick access by name
const transitionsByName: Map<string, GLTransition> = new Map();
glTransitions.forEach(t => {
  transitionsByName.set(t.name.toLowerCase(), t);
});

// Vertex shader - shared by all transitions (WebGL 2.0 / GLSL ES 3.0)
export const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

// Fragment shader wrapper for gl-transitions (converts GLSL ES 1.0 to 3.0)
const FRAGMENT_HEADER = `#version 300 es
precision highp float;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform float u_ratio;

in vec2 v_texCoord;
out vec4 fragColor;

// gl-transitions compatibility layer
vec4 getFromColor(vec2 uv) {
  return texture(u_from, uv);
}

vec4 getToColor(vec2 uv) {
  return texture(u_to, uv);
}

// Expose uniforms as gl-transitions expects
#define progress u_progress
#define ratio u_ratio
`;

const FRAGMENT_FOOTER = `
void main() {
  fragColor = transition(v_texCoord);
}
`;

/**
 * Mapping from our internal transition types to gl-transitions names
 * This maps 90+ internal effect names to the corresponding gl-transition
 */
export const TRANSITION_MAP: Record<string, string> = {
  // === BASIC TRANSITIONS ===
  'cut': 'fade', // Just use fade with very fast duration
  'fade': 'fade',
  'crossfade': 'fade',
  'dissolve': 'Dissolve',

  // === DIRECTIONAL WIPES ===
  'wipe_left': 'wipeLeft',
  'wipe_right': 'wipeRight',
  'wipe_up': 'wipeUp',
  'wipe_down': 'wipeDown',
  'directional_wipe': 'directionalwipe',

  // === SLIDES ===
  'slide_left': 'SimpleZoom', // Slide alternatives
  'slide_right': 'SimpleZoom',
  'push_left': 'Mosaic',
  'push_right': 'Mosaic',

  // === 3D TRANSITIONS ===
  'cube': 'cube',
  'cube_left': 'cube',
  'cube_right': 'cube',
  'flip': 'Flip',
  'flip_horizontal': 'Flip',
  'flip_vertical': 'Flip',
  'rotate': 'rotate_scale_fade',
  'spin': 'rotate_scale_fade',
  'door': 'DoorWay',
  'doorway': 'DoorWay',

  // === ZOOM TRANSITIONS ===
  'zoom': 'ZoomInCircles',
  'zoom_in': 'ZoomInCircles',
  'zoom_out': 'SimpleZoom',
  'circle_zoom': 'ZoomInCircles',
  'crosszoom': 'crosszoom',

  // === CIRCLE/RADIAL ===
  'circle': 'circle',
  'circle_open': 'CircleCrop',
  'circle_close': 'circle',
  'circleopen': 'CircleCrop',
  'radial': 'Radial',
  'pinwheel': 'pinwheel',

  // === CREATIVE/ARTISTIC ===
  'blur': 'LinearBlur',
  'motion_blur': 'LinearBlur',
  'dreamy': 'dreamy',
  'dream': 'dreamy',

  // === DISTORTION ===
  'ripple': 'ripple',
  'water': 'WaterDrop',
  'waterdrop': 'WaterDrop',
  'wave': 'ripple',
  'swirl': 'Swirl',
  'morph': 'Mosaic',
  'liquid': 'ripple',

  // === GLITCH/DIGITAL ===
  'glitch': 'GlitchDisplace',
  'digital_glitch': 'GlitchDisplace',
  'glitch_displace': 'GlitchDisplace',
  'static': 'Dissolve',
  'pixelate': 'pixelize',
  'pixel': 'pixelize',
  'mosaic': 'Mosaic',

  // === FLASH/COLOR ===
  'flash': 'luminance_melt',
  'white_flash': 'luminance_melt',
  'color_fade': 'ColourDistance',
  'colorfade': 'ColourDistance',
  'luminance': 'luminance_melt',

  // === SHAPE TRANSITIONS ===
  'heart': 'heart',
  'star': 'star',
  'diamond': 'Radial',
  'hexagon': 'hexagonalize',
  'squares': 'squareswire',
  'grid': 'GridFlip',

  // === BLINDS/BARS ===
  'blinds': 'WindowBlinds',
  'window_blinds': 'WindowBlinds',
  'bars_horizontal': 'ButterflyWaveScrawler',
  'bars_vertical': 'ButterflyWaveScrawler',
  'venetian': 'WindowBlinds',

  // === ADVANCED CREATIVE ===
  'burn': 'Burn',
  'fire': 'Burn',
  'wind': 'wind',
  'page_curl': 'Dreamy',
  'book': 'BookFlip',
  'book_flip': 'BookFlip',
  'kaleidoscope': 'kaleidoscope',
  'crosswarp': 'crosswarp',
  'squeeze': 'squeeze',
  'stretch': 'stretch',

  // === BOUNCY/PLAYFUL ===
  'bounce': 'Bounce',
  'bowtiehorizontal': 'BowTieHorizontal',
  'bowtievertical': 'BowTieVertical',
  'bowtie': 'BowTieHorizontal',

  // === CINEMATIC ===
  'cinematic': 'directionalwarp',
  'film': 'FilmBurn',
  'film_burn': 'FilmBurn',

  // === PATTERN TRANSITIONS ===
  'perlin': 'perlin',
  'noise': 'perlin',
  'angular': 'angular',
  'polar': 'polar_function',

  // === FALLBACKS ===
  'default': 'fade',
};

/**
 * List of all available gl-transition names (for UI display)
 */
export const AVAILABLE_TRANSITIONS: string[] = glTransitions.map(t => t.name);

/**
 * Get the full list of available transition categories
 */
export const TRANSITION_CATEGORIES = {
  basic: ['fade', 'dissolve', 'cut'],
  wipe: ['wipe_left', 'wipe_right', 'wipe_up', 'wipe_down', 'directional_wipe'],
  slide: ['slide_left', 'slide_right', 'push_left', 'push_right'],
  '3d': ['cube', 'flip', 'rotate', 'spin', 'door', 'doorway'],
  zoom: ['zoom', 'zoom_in', 'zoom_out', 'crosszoom'],
  circle: ['circle', 'circle_open', 'radial', 'pinwheel'],
  creative: ['blur', 'dreamy', 'dream'],
  distortion: ['ripple', 'water', 'wave', 'swirl', 'morph', 'liquid'],
  glitch: ['glitch', 'pixelate', 'pixel', 'mosaic', 'static'],
  flash: ['flash', 'white_flash', 'color_fade', 'luminance'],
  shapes: ['heart', 'star', 'diamond', 'hexagon', 'squares', 'grid'],
  blinds: ['blinds', 'window_blinds', 'bars_horizontal', 'bars_vertical'],
  advanced: ['burn', 'fire', 'wind', 'page_curl', 'book', 'kaleidoscope', 'crosswarp'],
  playful: ['bounce', 'bowtie'],
  cinematic: ['cinematic', 'film', 'film_burn'],
};

/**
 * Fallback shader if a transition isn't found
 */
const FALLBACK_TRANSITION = `
vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), progress);
}
`;

/**
 * Simple fade shader (most compatible)
 */
const FADE_SHADER = `
vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), progress);
}
`;

/**
 * Custom shaders for effects not in gl-transitions
 */
const CUSTOM_SHADERS: Record<string, string> = {
  // Simple wipe transitions (gl-transitions doesn't have these built-in)
  'wipeLeft': `
vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), step(1.0 - progress, uv.x));
}
`,
  'wipeRight': `
vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), step(uv.x, progress));
}
`,
  'wipeUp': `
vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), step(1.0 - progress, uv.y));
}
`,
  'wipeDown': `
vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), step(uv.y, progress));
}
`,
  'fade': FADE_SHADER,
};

/**
 * Get shader code for a transition type
 * @param transitionType Our internal transition type name
 * @returns Complete fragment shader source
 */
export function getTransitionShader(transitionType: string): string {
  // Normalize the transition type
  const normalizedType = transitionType.toLowerCase().replace(/[-\s]/g, '_');

  // Map to gl-transitions name
  const glTransitionName = TRANSITION_MAP[normalizedType] || transitionType;

  // First check custom shaders
  if (CUSTOM_SHADERS[glTransitionName]) {
    return FRAGMENT_HEADER + CUSTOM_SHADERS[glTransitionName] + FRAGMENT_FOOTER;
  }

  // Try to find in gl-transitions by exact name
  let transition = transitionsByName.get(glTransitionName.toLowerCase());

  // If not found, try the original type
  if (!transition) {
    transition = transitionsByName.get(normalizedType);
  }

  // If still not found, try some variations
  if (!transition) {
    // Try without underscores
    const noUnderscores = normalizedType.replace(/_/g, '');
    transition = transitionsByName.get(noUnderscores);
  }

  if (transition) {
    // Process the glsl code to make it compatible with WebGL 2.0
    let glslCode = transition.glsl;

    // Convert GLSL ES 1.0 to GLSL ES 3.0 compatibility
    // Fix: texture2D -> texture (for ES 3.0)
    glslCode = glslCode.replace(/texture2D\s*\(/g, 'texture(');

    // Fix: gl_FragColor is not available in ES 3.0 (our footer uses fragColor)
    glslCode = glslCode.replace(/gl_FragColor/g, 'fragColor');

    // Add default uniform declarations for any parameters
    // IMPORTANT: We use const instead of #define to avoid breaking uniform declarations
    // #define would do text substitution turning "uniform float amplitude;" into "uniform float 100.0;"
    let constDeclarations = '';
    if (transition.defaultParams) {
      for (const [param, value] of Object.entries(transition.defaultParams)) {
        // Remove the uniform declaration from shader code since we'll use a const
        // This regex matches: uniform <type> <param>; with optional comment
        glslCode = glslCode.replace(
          new RegExp(`uniform\\s+\\w+\\s+${param}\\s*;[^\\n]*\\n?`, 'g'),
          ''
        );

        // Get type from paramsTypes if available, otherwise infer from value
        let glslType: string = transition.paramsTypes?.[param] || '';
        let defaultValue: string;

        if (Array.isArray(value)) {
          // Ensure all numbers have decimal points
          const formattedValues = (value as number[]).map(v =>
            Number.isInteger(v) ? `${v}.0` : String(v)
          );
          if (!glslType) {
            if (value.length === 2) glslType = 'vec2';
            else if (value.length === 3) glslType = 'vec3';
            else if (value.length === 4) glslType = 'vec4';
            else glslType = 'float';
          }
          defaultValue = `${glslType}(${formattedValues.join(', ')})`;
        } else if (typeof value === 'number') {
          if (!glslType) glslType = 'float';
          // Format as float for GLSL ES 3.0 (integers cause syntax errors in float context)
          defaultValue = Number.isInteger(value) ? `${value}.0` : String(value);
        } else if (typeof value === 'boolean') {
          if (!glslType) glslType = 'bool';
          defaultValue = value ? 'true' : 'false';
        } else {
          if (!glslType) glslType = 'float';
          defaultValue = String(value);
        }

        // Add const declaration
        constDeclarations += `const ${glslType} ${param} = ${defaultValue};\n`;
      }
    }

    return FRAGMENT_HEADER + constDeclarations + glslCode + FRAGMENT_FOOTER;
  }

  // Fallback to simple fade
  console.warn(`Transition "${transitionType}" not found, using fade fallback`);
  return FRAGMENT_HEADER + FALLBACK_TRANSITION + FRAGMENT_FOOTER;
}

/**
 * Get information about a specific transition
 */
export function getTransitionInfo(transitionType: string): {
  name: string;
  author?: string;
  license?: string;
  params: Record<string, unknown>;
} | null {
  const normalizedType = transitionType.toLowerCase().replace(/[-\s]/g, '_');
  const glTransitionName = TRANSITION_MAP[normalizedType] || transitionType;

  const transition = transitionsByName.get(glTransitionName.toLowerCase());

  if (transition) {
    return {
      name: transition.name,
      author: transition.author,
      license: transition.license,
      params: transition.defaultParams,
    };
  }

  return null;
}

/**
 * Check if a transition type is supported
 */
export function isTransitionSupported(transitionType: string): boolean {
  const normalizedType = transitionType.toLowerCase().replace(/[-\s]/g, '_');

  // Check our mapping
  if (TRANSITION_MAP[normalizedType]) {
    return true;
  }

  // Check custom shaders
  if (CUSTOM_SHADERS[transitionType]) {
    return true;
  }

  // Check gl-transitions directly
  if (transitionsByName.has(normalizedType)) {
    return true;
  }

  return false;
}

/**
 * Get all available transition names grouped by category
 */
export function getTransitionsByCategory(): Record<string, string[]> {
  return TRANSITION_CATEGORIES;
}

/**
 * Search for transitions by name
 */
export function searchTransitions(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const results: string[] = [];

  // Search our mapping
  for (const [internal, gl] of Object.entries(TRANSITION_MAP)) {
    if (internal.includes(lowerQuery) || gl.toLowerCase().includes(lowerQuery)) {
      results.push(internal);
    }
  }

  // Search gl-transitions directly
  for (const t of glTransitions) {
    if (t.name.toLowerCase().includes(lowerQuery)) {
      results.push(t.name);
    }
  }

  return [...new Set(results)];
}

// Export the raw gl-transitions for advanced usage
export { glTransitions, transitionsByName };

// Default export
export default {
  VERTEX_SHADER,
  TRANSITION_MAP,
  AVAILABLE_TRANSITIONS,
  TRANSITION_CATEGORIES,
  getTransitionShader,
  getTransitionInfo,
  isTransitionSupported,
  getTransitionsByCategory,
  searchTransitions,
};
