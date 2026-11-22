// Utility scoring: choose among options by scoring each against several considerations, each mapped through a
// response curve to 0..1 and multiplied together, with the compensation factor from Dave Mark's "Infinite Axis
// Utility System" (GDC 2010–2015) so an option is not punished just for being judged on more things. A consideration
// at 0 vetoes the option. Used for which threat a crewmate shoots at. Pure and unit-tested.

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Response curves from an input already scaled to 0..1. */
export const CURVES = {
  linear: (x) => clamp01(x),
  inverse: (x) => clamp01(1 - x),
  /** Rises fast then flattens (x^0.5): the first bit matters most. */
  sqrt: (x) => Math.sqrt(clamp01(x)),
  /** Slow then sharp (x^2). */
  square: (x) => clamp01(x) ** 2,
  /** A soft threshold around 0.5. */
  logistic: (x) => 1 / (1 + Math.exp(-12 * (clamp01(x) - 0.5))),
};

/**
 * A consideration: read a number from the option, scale it from [lo, hi] to 0..1, pass it through a curve.
 * @param {(o: any) => number} read
 */
export const consider = (read, lo, hi, curve = 'linear') => (o) => CURVES[curve]((read(o) - lo) / (hi - lo || 1));

/** The utility of one option under `considerations` (functions to 0..1), with compensation. */
export function utility(option, considerations) {
  const n = considerations.length;
  if (!n) return 0;
  let s = 1;
  for (const c of considerations) {
    const v = clamp01(c(option));
    if (v === 0) return 0;
    // Compensation: lift each factor by part of what it lost, scaled by how many factors there are.
    const lift = (1 - v) * (1 - 1 / n);
    s *= v + lift * v;
  }
  return s;
}

/** The best option and its score, or null when every option scores 0. */
export function choose(options, considerations) {
  let best = null, top = 0;
  for (const o of options) { const u = utility(o, considerations); if (u > top) { top = u; best = o; } }
  return best ? { option: best, score: top } : null;
}

/**
 * Which threat a crewmate fires at. Each threat: { dist (m from the shooter), toPlayer (m from the player),
 * committed (attacking the player now), hp (hits left), grabbing (holding someone) }. Close to the shooter is
 * easier to hit; close to the player and committed is more urgent; nearly dead is worth finishing; something
 * holding a person outranks everything. Out of range (14 m) scores 0.
 */
export const TARGETING = [
  consider((t) => t.dist, 0, 14, 'inverse'),
  consider((t) => t.toPlayer, 0, 12, 'inverse'),
  consider((t) => (t.grabbing ? 1 : t.committed ? 0.5 : 0.2), 0, 1, 'linear'),
  consider((t) => 1 / Math.max(1, t.hp), 0, 1, 'sqrt'),
];
