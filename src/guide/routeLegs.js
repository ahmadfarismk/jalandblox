/**
 * The route at a glance: a route card's steps squeezed into legs, like
 * "Walk → LRT Kelana Jaya, 5 stops → Walk". Kept out of the screen so it can
 * be tested on its own.
 */

/** @typedef {{ type: 'walk' } | { type: 'car' } | { type: 'line', line: string, stops: number|null, from: string|null, to: string|null }} Leg */

const ON_FOOT = ['walk', 'exit', 'arrive'];

/**
 * @param {{ type: string, line?: string|null, stops?: number|null, at?: string|null, alightAt?: string|null }[]} steps
 * @returns {Leg[]}
 */
export function routeLegs(steps = []) {
  const legs = [];
  for (const step of steps) {
    const last = legs.at(-1);
    if (ON_FOOT.includes(step.type)) {
      if (last?.type !== 'walk') legs.push({ type: 'walk' });
    } else if (step.type === 'board') {
      // A board step with no rail line is a car ride (e-hailing).
      legs.push(
        step.line
          ? { type: 'line', line: step.line, stops: null, from: step.at ?? null, to: null }
          : { type: 'car' },
      );
    } else if (step.type === 'ride' && last?.type === 'line') {
      last.stops = Number.isFinite(step.stops) ? step.stops : null;
      last.to = step.alightAt ?? null;
    }
  }
  return legs;
}

/**
 * Where the ride on a `ride` step starts: the `at` of the board step before it.
 * @param {{ type: string, at?: string|null }[]} steps
 * @param {number} index of the ride step
 */
export function boardedAt(steps, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (steps[i].type === 'board') return steps[i].at ?? null;
  }
  return null;
}

/**
 * White or dark text, whichever reads better on a line colour.
 * The KL Monorail's light green needs dark text; most lines take white.
 * @param {string} hex like "#E0115F"
 */
export function textOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return '#ffffff';
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contrast with white is (1.05)/(L+0.05); with near-black (#0f172a) roughly (L+0.05)/0.06.
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.06 ? '#ffffff' : '#0f172a';
}
