// Auto exposure and the look of the full render tier, as plain numbers the scenes hand to the renderer.
//
// The eye adapts: step from a lit room into a dark one and the picture lifts over a few seconds; step back under
// the fixtures and it clamps down at once. We do not read pixels back. The light reaching the eye is estimated
// from the same list of lights the renderer is given, which is cheap and deterministic.

/**
 * How much light reaches the eye: ambient plus each point light falling off with distance.
 * @param {{ position: number[], intensity: number, range?: number }[]} lights
 * @param {number[]} eye @param {number} ambient the frame's ambientIntensity
 */
export function lightAtEye(lights, eye, ambient) {
  let sum = ambient * 2;
  for (const l of lights) {
    const d = Math.hypot(l.position[0] - eye[0], l.position[1] - eye[1], l.position[2] - eye[2]);
    const range = l.range ?? 10;
    if (d >= range) continue;
    const fall = 1 - d / range;
    sum += (l.intensity * fall * fall) / (1 + d * d * 0.15);
  }
  return sum;
}

/**
 * The exposure multiplier the eye would settle on for that much light: 1 in an ordinary lit room, up to `max`
 * in the dark, down to `min` under strong light. The dark is lifted only part of the way, so it stays dark.
 */
export function targetExposure(level, { ordinary = 3.2, min = 0.85, max = 1.45 } = {}) {
  const k = Math.pow(ordinary / Math.max(0.05, level), 0.35);
  return Math.max(min, Math.min(max, k));
}

/** Move toward the target: quickly when the scene got brighter, slowly when it got darker. */
export function adapt(current, target, dt, { down = 3, up = 0.45 } = {}) {
  const rate = target < current ? down : up;
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/**
 * Haze over the water for the full tier: one fog volume that follows the eye. The engine scatters only a
 * directional light through it, so indoors it reads as depth and damp air, not as beams from the fixtures.
 * @param {number[]} eye @param {{ density: number, color: number[], sky?: boolean }} o
 */
export function hazeVolume(eye, { density, color, sky = false }) {
  if (!(density > 0)) return { density: 0 };
  return {
    density,
    minimum: [eye[0] - 70, -3, eye[2] - 70],
    maximum: [eye[0] + 70, sky ? 24 : 9, eye[2] + 70],
    color,
    ambient: color.map((c) => c * (sky ? 0.5 : 0.22)),
    steps: 12, noiseAmount: 0.35, noiseScale: 0.25, drift: [0.02, 0, 0.01], maxDistance: 70, anisotropy: 0.2,
  };
}
