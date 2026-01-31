/**
 * GL Transitions - Professional GLSL Shader Transitions
 * Based on https://gl-transitions.com/
 *
 * This file contains transition shaders and mappings from our internal
 * transition types to gl-transitions shader implementations.
 */

// Vertex shader - shared by all transitions
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

// Base fragment shader header - shared uniforms and functions
const FRAGMENT_HEADER = `#version 300 es
precision highp float;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform float u_ratio;

in vec2 v_texCoord;
out vec4 fragColor;

vec4 getFromColor(vec2 uv) {
  return texture(u_from, uv);
}

vec4 getToColor(vec2 uv) {
  return texture(u_to, uv);
}

#define progress u_progress
#define ratio u_ratio
`;

// ============================================
// TRANSITION SHADERS
// ============================================

const TRANSITIONS: Record<string, string> = {
  // Basic fade transition
  fade: `
vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), progress);
}
`,

  // Crossfade with slight blur during transition
  crossfade: `
vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), progress);
}
`,

  // Dissolve with noise
  dissolve: `
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 transition(vec2 uv) {
  float noise = rand(uv);
  float threshold = progress;

  if (noise < threshold) {
    return getToColor(uv);
  }
  return getFromColor(uv);
}
`,

  // Wipe left
  wipeLeft: `
vec4 transition(vec2 uv) {
  float x = 1.0 - uv.x;
  return mix(getFromColor(uv), getToColor(uv), step(x, progress));
}
`,

  // Wipe right
  wipeRight: `
vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), step(uv.x, progress));
}
`,

  // Wipe up
  wipeUp: `
vec4 transition(vec2 uv) {
  float y = 1.0 - uv.y;
  return mix(getFromColor(uv), getToColor(uv), step(y, progress));
}
`,

  // Wipe down
  wipeDown: `
vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), step(uv.y, progress));
}
`,

  // Slide left
  slideLeft: `
vec4 transition(vec2 uv) {
  vec2 fromUV = uv + vec2(progress, 0.0);
  vec2 toUV = uv + vec2(progress - 1.0, 0.0);

  if (uv.x > 1.0 - progress) {
    return getToColor(toUV);
  }
  return getFromColor(fromUV);
}
`,

  // Slide right
  slideRight: `
vec4 transition(vec2 uv) {
  vec2 fromUV = uv - vec2(progress, 0.0);
  vec2 toUV = uv - vec2(progress - 1.0, 0.0);

  if (uv.x < progress) {
    return getToColor(toUV);
  }
  return getFromColor(fromUV);
}
`,

  // 3D Cube transition
  cube: `
const float persp = 0.7;
const float unzoom = 0.3;
const float reflection = 0.4;
const float floating = 3.0;

vec2 project(vec2 p) {
  return p * vec2(1.0, -1.2) + vec2(0.0, -floating / 100.0);
}

bool inBounds(vec2 p) {
  return all(lessThan(vec2(0.0), p)) && all(lessThan(p, vec2(1.0)));
}

vec4 bgColor(vec2 p, vec2 pfr, vec2 pto) {
  vec4 c = vec4(0.0, 0.0, 0.0, 1.0);
  pfr = project(pfr);
  if (inBounds(pfr)) {
    c += mix(vec4(0.0), getFromColor(pfr), reflection * mix(1.0, 0.0, pfr.y));
  }
  pto = project(pto);
  if (inBounds(pto)) {
    c += mix(vec4(0.0), getToColor(pto), reflection * mix(1.0, 0.0, pto.y));
  }
  return c;
}

vec2 xskew(vec2 p, float persp, float center) {
  float x = mix(p.x, 1.0 - p.x, center);
  return (
    (vec2(x, (p.y - 0.5 * (1.0 - persp) * x) / (1.0 + (persp - 1.0) * x)) - vec2(0.5 - distance(center, 0.5), 0.0))
    * vec2(0.5 / distance(center, 0.5) * (center < 0.5 ? 1.0 : -1.0), 1.0)
    + vec2(center < 0.5 ? 0.0 : 1.0, 0.0)
  );
}

vec4 transition(vec2 op) {
  float uz = unzoom * 2.0 * (0.5 - distance(0.5, progress));
  vec2 p = -uz * 0.5 + (1.0 + uz) * op;
  vec2 fromP = xskew(
    (p - vec2(progress, 0.0)) / vec2(1.0 - progress, 1.0),
    1.0 - mix(progress, 0.0, persp),
    0.0
  );
  vec2 toP = xskew(
    p / vec2(progress, 1.0),
    mix(pow(progress, 2.0), 1.0, persp),
    1.0
  );
  if (inBounds(fromP)) {
    return getFromColor(fromP);
  } else if (inBounds(toP)) {
    return getToColor(toP);
  }
  return bgColor(op, fromP, toP);
}
`,

  // Circle crop / iris
  circleOpen: `
vec4 transition(vec2 uv) {
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(uv, center);
  float radius = progress * 1.5;

  if (dist < radius) {
    return getToColor(uv);
  }
  return getFromColor(uv);
}
`,

  // Circle close
  circleClose: `
vec4 transition(vec2 uv) {
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(uv, center);
  float radius = (1.0 - progress) * 1.5;

  if (dist < radius) {
    return getFromColor(uv);
  }
  return getToColor(uv);
}
`,

  // Pixelize transition
  pixelize: `
const ivec2 squaresMin = ivec2(20);
const int steps = 50;

vec4 transition(vec2 uv) {
  float d = min(progress, 1.0 - progress);
  float dist = steps > 0 ? ceil(d * float(steps)) / float(steps) : d;
  vec2 squareSize = 2.0 * dist / vec2(squaresMin);

  vec2 p = dist > 0.0 ? (floor(uv / squareSize) + 0.5) * squareSize : uv;

  return mix(getFromColor(p), getToColor(p), progress);
}
`,

  // Glitch displacement
  glitchDisplace: `
float random(vec2 co) {
  float a = 12.9898;
  float b = 78.233;
  float c = 43758.5453;
  float dt = dot(co.xy, vec2(a, b));
  float sn = mod(dt, 3.14);
  return fract(sin(sn) * c);
}

vec4 transition(vec2 uv) {
  float strength = 0.4;
  float speed = 10.0;

  float offset = strength * (random(vec2(floor(uv.y * speed), progress)) - 0.5);

  vec2 uvFrom = uv;
  vec2 uvTo = uv;

  uvFrom.x += offset * (1.0 - progress);
  uvTo.x += offset * progress;

  vec4 fromColor = getFromColor(uvFrom);
  vec4 toColor = getToColor(uvTo);

  // RGB split effect
  if (progress > 0.0 && progress < 1.0) {
    float split = 0.02 * sin(progress * 3.14159);
    fromColor.r = getFromColor(uvFrom + vec2(split, 0.0)).r;
    fromColor.b = getFromColor(uvFrom - vec2(split, 0.0)).b;
    toColor.r = getToColor(uvTo + vec2(split, 0.0)).r;
    toColor.b = getToColor(uvTo - vec2(split, 0.0)).b;
  }

  return mix(fromColor, toColor, progress);
}
`,

  // Radial wipe
  radial: `
vec4 transition(vec2 uv) {
  vec2 center = vec2(0.5, 0.5);
  vec2 dir = uv - center;
  float angle = atan(dir.y, dir.x) + 3.14159265;
  float normalizedAngle = angle / (2.0 * 3.14159265);

  if (normalizedAngle < progress) {
    return getToColor(uv);
  }
  return getFromColor(uv);
}
`,

  // Zoom in
  zoomIn: `
vec4 transition(vec2 uv) {
  float zoom = 1.0 + progress * 0.5;
  vec2 center = vec2(0.5, 0.5);
  vec2 fromUV = center + (uv - center) / zoom;

  float alpha = progress;
  vec4 fromColor = getFromColor(fromUV);
  vec4 toColor = getToColor(uv);

  return mix(fromColor, toColor, alpha);
}
`,

  // Zoom out
  zoomOut: `
vec4 transition(vec2 uv) {
  float zoom = 1.0 + (1.0 - progress) * 0.5;
  vec2 center = vec2(0.5, 0.5);
  vec2 toUV = center + (uv - center) / zoom;

  float alpha = progress;
  vec4 fromColor = getFromColor(uv);
  vec4 toColor = getToColor(toUV);

  return mix(fromColor, toColor, alpha);
}
`,

  // Swirl
  swirl: `
vec4 transition(vec2 uv) {
  float radius = 0.5;
  float angle = progress * 3.14159 * 2.0;
  vec2 center = vec2(0.5, 0.5);
  vec2 tc = uv - center;
  float dist = length(tc);

  if (dist < radius) {
    float percent = (radius - dist) / radius;
    float theta = percent * percent * angle;
    float s = sin(theta);
    float c = cos(theta);
    tc = vec2(dot(tc, vec2(c, -s)), dot(tc, vec2(s, c)));
  }

  vec2 newUV = tc + center;
  return mix(getFromColor(newUV), getToColor(uv), progress);
}
`,

  // Water drop / ripple
  waterDrop: `
const float amplitude = 30.0;
const float speed = 30.0;

vec4 transition(vec2 uv) {
  vec2 dir = uv - vec2(0.5);
  float dist = length(dir);

  if (dist > progress) {
    return mix(getFromColor(uv), getToColor(uv), progress);
  }

  vec2 offset = dir * sin(dist * amplitude - progress * speed);
  return mix(getFromColor(uv + offset * 0.03), getToColor(uv), progress);
}
`,

  // Flash white
  flashWhite: `
vec4 transition(vec2 uv) {
  float flash = sin(progress * 3.14159);
  vec4 fromColor = getFromColor(uv);
  vec4 toColor = getToColor(uv);
  vec4 white = vec4(1.0, 1.0, 1.0, 1.0);

  vec4 mixed = mix(fromColor, toColor, progress);
  return mix(mixed, white, flash * 0.7);
}
`,

  // Directional warp
  directionalWarp: `
const vec2 direction = vec2(-1.0, 0.0);
const float smoothness = 0.5;

const vec2 center = vec2(0.5, 0.5);

vec4 transition(vec2 uv) {
  vec2 v = normalize(direction);
  v /= abs(v.x) + abs(v.y);
  float d = v.x * center.x + v.y * center.y;
  float m = 1.0 - smoothstep(-smoothness, 0.0, v.x * uv.x + v.y * uv.y - (d - 0.5 + progress * (1.0 + smoothness)));
  return mix(getFromColor(uv), getToColor(uv), m);
}
`,

  // Bounce
  bounce: `
const float shadowHeight = 0.075;
const float bounces = 3.0;
const vec4 shadowColour = vec4(0.0, 0.0, 0.0, 0.6);

vec4 transition(vec2 uv) {
  float sTime = progress;
  float phase = sTime * 3.14159265 * bounces;
  float y = abs(cos(phase)) * (1.0 - sTime);
  float d = uv.y - y;

  if (d > 0.0) {
    return getToColor(uv);
  }

  if (d > -shadowHeight) {
    float shadow = 1.0 - (-d / shadowHeight);
    return mix(getFromColor(vec2(uv.x, uv.y + y)), shadowColour, shadow);
  }

  return getFromColor(vec2(uv.x, uv.y + y));
}
`,

  // Morph
  morph: `
const float strength = 0.1;

vec4 transition(vec2 uv) {
  vec4 ca = getFromColor(uv);
  vec4 cb = getToColor(uv);

  vec2 oa = (((ca.rg + ca.b) * 0.5) * 2.0 - 1.0);
  vec2 ob = (((cb.rg + cb.b) * 0.5) * 2.0 - 1.0);
  vec2 oc = mix(oa, ob, 0.5) * strength;

  float w0 = 1.0 - progress;
  float w1 = progress;

  return mix(getFromColor(uv + oc * w0), getToColor(uv - oc * w1), progress);
}
`,

  // Doorway
  doorway: `
const float reflection = 0.4;
const float perspective = 0.4;
const float depth = 3.0;

bool inBounds(vec2 p) {
  return all(lessThan(vec2(0.0), p)) && all(lessThan(p, vec2(1.0)));
}

vec2 project(vec2 p) {
  return p * vec2(1.0, -1.2) + vec2(0.0, -0.02);
}

vec4 bgColor(vec2 p, vec2 pto) {
  vec4 c = vec4(0.0, 0.0, 0.0, 1.0);
  pto = project(pto);
  if (inBounds(pto)) {
    c += mix(vec4(0.0), getToColor(pto), reflection * mix(1.0, 0.0, pto.y));
  }
  return c;
}

vec4 transition(vec2 uv) {
  vec2 pfr = vec2(-1.0);
  vec2 pto = vec2(-1.0);

  float middleSlit = 2.0 * abs(uv.x - 0.5) - progress;
  if (middleSlit > 0.0) {
    pfr = uv + (uv.x > 0.5 ? -1.0 : 1.0) * vec2(0.5 * progress, 0.0);
    float d = 1.0 / (1.0 + perspective * progress * (1.0 - middleSlit));
    pfr.y -= d / 2.0;
    pfr.y *= d;
    pfr.y += d / 2.0;
  }

  float size = mix(1.0, depth, 1.0 - progress);
  pto = (uv + vec2(-0.5, -0.5)) * vec2(size, size) + vec2(0.5, 0.5);

  if (inBounds(pfr)) {
    return getFromColor(pfr);
  } else if (inBounds(pto)) {
    return getToColor(pto);
  }

  return bgColor(uv, pto);
}
`,

  // Dreamy
  dreamy: `
vec4 transition(vec2 uv) {
  float shifty = 0.03 * progress * cos(10.0 * (progress + uv.x));
  vec4 fromColor = getFromColor(vec2(uv.x, uv.y + shifty));
  vec4 toColor = getToColor(vec2(uv.x, uv.y + shifty));
  return mix(fromColor, toColor, progress);
}
`,

  // Burn
  burn: `
const vec3 color = vec3(0.9, 0.4, 0.2);

vec4 transition(vec2 uv) {
  float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
  float burnProgress = progress + noise * 0.1;

  if (burnProgress > uv.y) {
    float edge = smoothstep(burnProgress - 0.05, burnProgress, uv.y);
    vec4 burnColor = vec4(color * edge * 2.0, 1.0);
    return mix(burnColor, getToColor(uv), smoothstep(0.0, 0.1, burnProgress - uv.y));
  }
  return getFromColor(uv);
}
`,

  // Hexagonalize
  hexagonalize: `
const int steps = 50;
const float horizontalHexagons = 20.0;

struct Hexagon {
  float q;
  float r;
  float s;
};

Hexagon createHexagon(float q, float r) {
  Hexagon hex;
  hex.q = q;
  hex.r = r;
  hex.s = -q - r;
  return hex;
}

Hexagon roundHexagon(Hexagon hex) {
  float q = floor(hex.q + 0.5);
  float r = floor(hex.r + 0.5);
  float s = floor(hex.s + 0.5);

  float deltaQ = abs(q - hex.q);
  float deltaR = abs(r - hex.r);
  float deltaS = abs(s - hex.s);

  if (deltaQ > deltaR && deltaQ > deltaS) {
    q = -r - s;
  } else if (deltaR > deltaS) {
    r = -q - s;
  } else {
    s = -q - r;
  }

  return createHexagon(q, r);
}

Hexagon hexagonFromPoint(vec2 point, float size) {
  point.y /= ratio;
  point = (point - 0.5) / size;

  float q = (sqrt(3.0) / 3.0 * point.x - 1.0 / 3.0 * point.y) * 2.0;
  float r = 2.0 / 3.0 * point.y;

  Hexagon hex = createHexagon(q, r);
  return roundHexagon(hex);
}

vec2 pointFromHexagon(Hexagon hex, float size) {
  float x = (sqrt(3.0) * hex.q + sqrt(3.0) / 2.0 * hex.r) * size + 0.5;
  float y = (3.0 / 2.0 * hex.r) * size + 0.5;
  return vec2(x, y * ratio);
}

vec4 transition(vec2 uv) {
  float dist = steps > 0 ? ceil(progress * float(steps)) / float(steps) : progress;
  float size = (sqrt(3.0) / 3.0) * dist / horizontalHexagons;

  if (dist > 0.0) {
    vec2 point = pointFromHexagon(hexagonFromPoint(uv, size), size);
    return mix(getFromColor(point), getToColor(point), progress);
  }
  return mix(getFromColor(uv), getToColor(uv), progress);
}
`,

  // Wind
  wind: `
const float size = 0.2;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 transition(vec2 uv) {
  float r = rand(vec2(0.0, uv.y));
  float m = smoothstep(0.0, -size, uv.x * (1.0 - size) + size * r - (progress * (1.0 + size)));
  return mix(getFromColor(uv), getToColor(uv), m);
}
`,

  // Kaleidoscope
  kaleidoscope: `
const float speed = 1.0;
const float angle = 1.0;
const float power = 1.5;

vec4 transition(vec2 uv) {
  vec2 p = uv - 0.5;
  float r = length(p);
  float a = atan(p.y, p.x);

  float progress2 = progress * progress;
  a += progress2 * angle * power;
  r += progress2 * 0.5;

  vec2 newUV = vec2(cos(a), sin(a)) * r + 0.5;

  if (newUV.x < 0.0 || newUV.x > 1.0 || newUV.y < 0.0 || newUV.y > 1.0) {
    return getToColor(uv);
  }

  return mix(getFromColor(newUV), getToColor(uv), progress);
}
`,

  // Luminance melt
  luminanceMelt: `
const bool direction = true;
const float threshold = 0.8;
const bool above = false;

float luma(vec4 color) {
  return dot(color.rgb, vec3(0.299, 0.587, 0.114));
}

vec4 transition(vec2 uv) {
  vec4 fromColor = getFromColor(uv);
  vec4 toColor = getToColor(uv);

  float l = luma(fromColor);
  bool a = above ? l > threshold : l < threshold;

  float p = progress * 2.0 - 1.0;
  p = direction ? p : -p;

  float t = a ? 1.0 - p : p;
  t = clamp(t, 0.0, 1.0);

  return mix(fromColor, toColor, t);
}
`,
};

/**
 * Builds a complete fragment shader from a transition function
 */
function buildFragmentShader(transitionCode: string): string {
  return `${FRAGMENT_HEADER}

${transitionCode}

void main() {
  fragColor = transition(v_texCoord);
}
`;
}

/**
 * Maps internal transition types to gl-transitions shader names
 */
export const TRANSITION_MAP: Record<string, string> = {
  // Basic
  'cut': 'fade',
  'fade': 'fade',
  'dissolve': 'dissolve',
  'crossfade': 'crossfade',

  // Wipes
  'wipe_left': 'wipeLeft',
  'wipe_right': 'wipeRight',
  'wipe_up': 'wipeUp',
  'wipe_down': 'wipeDown',
  'wipe_diagonal_tl': 'wipeLeft',
  'wipe_diagonal_tr': 'wipeRight',
  'wipe_diagonal_bl': 'wipeLeft',
  'wipe_diagonal_br': 'wipeRight',

  // Slides
  'slide_left': 'slideLeft',
  'slide_right': 'slideRight',
  'slide_up': 'wipeUp',
  'slide_down': 'wipeDown',
  'push_left': 'directionalWarp',
  'push_right': 'directionalWarp',
  'push_up': 'directionalWarp',
  'push_down': 'directionalWarp',

  // Zoom
  'zoom_in': 'zoomIn',
  'zoom_out': 'zoomOut',
  'zoom_rotate': 'swirl',
  'zoom_blur': 'zoomIn',
  'zoom_bounce': 'bounce',
  'scale_center': 'zoomIn',

  // 3D
  'cube_left': 'cube',
  'cube_right': 'cube',
  'cube_up': 'cube',
  'cube_down': 'cube',
  'flip_horizontal': 'cube',
  'flip_vertical': 'cube',
  'rotate_3d': 'cube',
  'fold_left': 'doorway',
  'fold_right': 'doorway',
  'page_curl': 'doorway',

  // Stylized
  'glitch': 'glitchDisplace',
  'glitch_heavy': 'glitchDisplace',
  'vhs': 'glitchDisplace',
  'static': 'dissolve',
  'film_burn': 'burn',
  'film_scratch': 'burn',
  'chromatic': 'glitchDisplace',
  'rgb_split': 'glitchDisplace',

  // Motion
  'swirl': 'swirl',
  'shake': 'glitchDisplace',
  'bounce': 'bounce',
  'elastic': 'bounce',
  'whip_pan': 'directionalWarp',
  'crash_zoom': 'zoomIn',

  // Flash & Light
  'flash': 'flashWhite',
  'flash_white': 'flashWhite',
  'flash_color': 'flashWhite',
  'strobe': 'flashWhite',
  'light_leak': 'flashWhite',
  'lens_flare': 'flashWhite',
  'glow': 'flashWhite',
  'bloom': 'flashWhite',

  // Color
  'color_fade': 'fade',
  'color_wipe': 'wipeLeft',
  'color_burn': 'burn',
  'ink_drop': 'circleOpen',
  'paint_splatter': 'dissolve',
  'color_shift': 'dreamy',
  'desaturate': 'fade',
  'negative': 'fade',

  // Shapes
  'circle_in': 'circleOpen',
  'circle_out': 'circleClose',
  'diamond_in': 'circleOpen',
  'diamond_out': 'circleClose',
  'heart_in': 'circleOpen',
  'heart_out': 'circleClose',
  'star_in': 'circleOpen',
  'star_out': 'circleClose',
  'hexagon': 'hexagonalize',

  // Blur
  'blur': 'fade',
  'blur_directional': 'directionalWarp',
  'blur_radial': 'swirl',
  'blur_zoom': 'zoomIn',
  'focus_pull': 'fade',
  'defocus': 'fade',

  // Digital
  'pixelate': 'pixelize',
  'pixelate_in': 'pixelize',
  'pixelate_out': 'pixelize',
  'mosaic': 'pixelize',
  'blocks': 'pixelize',
  'digital_noise': 'dissolve',

  // Cinematic
  'letterbox': 'wipeUp',
  'bars_horizontal': 'wipeUp',
  'bars_vertical': 'wipeLeft',
  'blinds': 'wipeDown',
  'curtain': 'wipeLeft',
  'split_screen': 'wipeLeft',

  // Liquid
  'liquid': 'waterDrop',
  'ripple': 'waterDrop',
  'wave': 'dreamy',
  'morph': 'morph',
  'melt': 'luminanceMelt',
  'drip': 'luminanceMelt',
  'smoke': 'fade',
  'clouds': 'fade',

  // Particles
  'particles': 'dissolve',
  'sparkle': 'dissolve',
  'confetti': 'dissolve',
  'explosion': 'flashWhite',
  'shatter': 'dissolve',
  'disintegrate': 'dissolve',

  // Spin
  'spin': 'swirl',
  'spin_blur': 'swirl',
  'spin_zoom': 'swirl',
  'tornado': 'swirl',

  // Special
  'dream': 'dreamy',
  'vintage': 'fade',
  'retro': 'pixelize',
  'cyberpunk': 'glitchDisplace',
  'neon': 'flashWhite',
  'hologram': 'glitchDisplace',
};

/**
 * Gets the fragment shader source for a transition type
 */
export function getTransitionShader(transitionType: string): string {
  // Map internal type to gl-transition name
  const glTransitionName = TRANSITION_MAP[transitionType] || 'fade';

  // Get the transition code
  const transitionCode = TRANSITIONS[glTransitionName] || TRANSITIONS.fade;

  return buildFragmentShader(transitionCode);
}

/**
 * Gets all available transition names
 */
export function getAvailableTransitions(): string[] {
  return Object.keys(TRANSITIONS);
}

/**
 * Checks if a transition is available in gl-transitions
 */
export function isTransitionAvailable(transitionType: string): boolean {
  const glName = TRANSITION_MAP[transitionType];
  return !!glName && !!TRANSITIONS[glName];
}
