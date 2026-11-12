// Quality tiers. One table says what each tier draws; Auto picks a starting tier and moves down when the frame
// rate cannot be held even at the lowest render scale, and back up when there is a lot of room.
// Pure: quality.js reads the browser and applies a tier; the scenes read the result.

export const TIER_ORDER = ['low', 'medium', 'high', 'ultra'];

/**
 * shading/samples/depth are fixed when a scene is built; everything else takes effect on the next frame.
 * ratioCap caps the device pixel ratio (a pixel budget, not "whatever the screen reports").
 */
export const TIERS = {
  low: { shading: 'light', samples: 1, ratioCap: 0.6, depth: false, ao: 0, haze: 0, hazeSteps: 8, lights: 4, bloom: 0, shadows: 0 },
  medium: { shading: 'full', samples: 1, ratioCap: 1, depth: true, ao: 0, haze: 0, hazeSteps: 8, lights: 6, bloom: 0.35, shadows: 0 },
  high: { shading: 'full', samples: 2, ratioCap: 1.5, depth: true, ao: 0.6, haze: 0.012, hazeSteps: 12, lights: 10, bloom: 0.45, shadows: 1 },
  ultra: { shading: 'full', samples: 4, ratioCap: 2, depth: true, ao: 0.7, haze: 0.014, hazeSteps: 20, lights: 14, bloom: 0.5, shadows: 2 },
};

/** The setting is a number so it can sit on a slider: 0 auto, 1 low, 2 medium, 3 high, 4 ultra. */
export const SETTING_TIERS = ['auto', 'low', 'medium', 'high', 'ultra'];

/**
 * Which tier to start on. A ?quality= in the URL wins, then the player's setting; Auto starts on high with a GPU
 * and on low without one.
 * @returns {{ tier: string, auto: boolean }}
 */
export function resolveTier({ forced = null, setting = 0, software = false } = {}) {
  if (forced && TIERS[forced]) return { tier: forced, auto: false };
  const name = SETTING_TIERS[setting] || 'auto';
  if (name !== 'auto') return { tier: name, auto: false };
  return { tier: software ? 'low' : 'high', auto: !software };
}

/** The pixel ratio a tier renders at on this screen. The light tier is a fixed fraction, the rest are capped. */
export const tierRatio = (tier, devicePixelRatio = 1) => (tier === 'low' ? TIERS.low.ratioCap : Math.min(devicePixelRatio || 1, TIERS[tier].ratioCap));

/**
 * Auto: feed it frame times and the current render scale. Returns a new tier name when it decides to move.
 * Down after four bad seconds at the lowest scale; up after thirty very good seconds at full scale, never above
 * `ceiling`. It never goes below `floor`.
 */
export function createAutoTier({ start = 'high', floor = 'low', ceiling = 'high', target = 16.7, minScale = 0.5 } = {}) {
  let tier = start, sum = 0, n = 0, t = 0, bad = 0, good = 0;
  return {
    get tier() { return tier; },
    set target(v) { target = v; },
    push(ms, scale) {
      if (ms > 250) return null;
      sum += ms; n += 1; t += ms;
      if (t < 1000) return null;
      const avg = sum / n;
      sum = n = t = 0;
      if (scale <= minScale + 1e-6 && avg > target * 1.15) { bad += 1; good = 0; }
      else if (scale >= 1 - 1e-6 && avg < target * 0.55) { good += 1; bad = 0; }
      else { bad = 0; good = 0; }
      const i = TIER_ORDER.indexOf(tier);
      if (bad >= 4 && i > TIER_ORDER.indexOf(floor)) { bad = 0; tier = TIER_ORDER[i - 1]; return tier; }
      if (good >= 30 && i < TIER_ORDER.indexOf(ceiling)) { good = 0; tier = TIER_ORDER[i + 1]; return tier; }
      return null;
    },
  };
}
