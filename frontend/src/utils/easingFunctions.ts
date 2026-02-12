/**
 * Easing functions for transition progress curves.
 * Maps the easing types defined in TransitionsEditor EASING_OPTIONS
 * to mathematical curves applied to linear progress [0,1].
 */

export function applyEasing(t: number, type: string): number {
  // Clamp input to [0, 1]
  const ct = Math.max(0, Math.min(1, t));

  switch (type) {
    case 'ease-in':
      return ct * ct * ct;

    case 'ease-out':
      return 1 - Math.pow(1 - ct, 3);

    case 'ease-in-out':
      return ct < 0.5
        ? 4 * ct * ct * ct
        : 1 - Math.pow(-2 * ct + 2, 3) / 2;

    case 'ease':
      return ct < 0.5
        ? 2 * ct * ct
        : 1 - Math.pow(-2 * ct + 2, 2) / 2;

    case 'bounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      let x = 1 - ct; // bounce at end: reverse, apply bounce, reverse
      let result: number;
      if (x < 1 / d1) {
        result = n1 * x * x;
      } else if (x < 2 / d1) {
        result = n1 * (x -= 1.5 / d1) * x + 0.75;
      } else if (x < 2.5 / d1) {
        result = n1 * (x -= 2.25 / d1) * x + 0.9375;
      } else {
        result = n1 * (x -= 2.625 / d1) * x + 0.984375;
      }
      return 1 - result;
    }

    case 'elastic': {
      if (ct === 0 || ct === 1) return ct;
      const c4 = (2 * Math.PI) / 3;
      return -Math.pow(2, 10 * ct - 10) * Math.sin((ct * 10 - 10.75) * c4) + 1;
    }

    case 'linear':
    default:
      return ct;
  }
}
