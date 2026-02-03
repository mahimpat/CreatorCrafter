/**
 * Type declarations for gl-transitions package
 * https://gl-transitions.com/
 */

declare module 'gl-transitions' {
  interface GLTransition {
    /** Name of the transition (e.g., "cube", "fade", "Bounce") */
    name: string;

    /** GLSL shader source code for the transition */
    glsl: string;

    /** Default parameter values */
    defaultParams: Record<string, number | number[]>;

    /** Parameter type definitions (e.g., "float", "vec2", "vec4") */
    paramsTypes: Record<string, string>;

    /** Author of the transition */
    author?: string;

    /** License (usually MIT) */
    license?: string;

    /** Creation timestamp */
    createdAt?: string;

    /** Last update timestamp */
    updatedAt?: string;
  }

  const transitions: GLTransition[];
  export = transitions;
}
