// How the raft sits in the water, from two pieces of physics instead of hand-tuned sines.
//
// - Gerstner (trochoidal) waves: the surface is a sum of waves, each with deep-water dispersion (ω² = g·k), so long
//   waves travel faster than short ones. The raft samples the surface under its four chambers, so it heaves with the
//   average and rolls and pitches with the slope. A wave pool's swell and the camera's bob come from the same sum.
// - Archimedes on the chambers: each chamber is a spring whose stiffness is its air (a soft chamber gives less lift
//   per centimetre it sinks). Solving force and moment balance for a rigid raft on four supports gives how deep it
//   sits, which side it lists to and whether the nose goes down. A soft left side lists the raft left; a soft bow
//   pitches it forward.
//
// Coordinates are the track frame: x across the channel (metres, + right), z along it (metres of track, + ahead).
// Pure and unit-tested: no DOM, no renderer.

export const G = 9.81;

/**
 * One wave: amplitude (m), wavelength (m), direction [x, z] (any length), steepness 0..1 (Gerstner Q: 0 a sine,
 * 1 a sharp crest) and a phase.
 * @typedef {{ amp: number, length: number, dir: number[], steep?: number, phase?: number }} Wave
 */

/** Deep-water angular frequency of a wave (rad/s). */
export const omega = (length) => Math.sqrt(G * ((2 * Math.PI) / length));

/**
 * The waves on a section's water. Calm channels carry a light chop running mostly across the channel (so the raft's
 * own speed barely changes how often it bobs); a wave pool adds a swell running back along the channel toward the
 * raft; fast water is choppier; shallow water is flatter; still, roofless water (sky) is almost flat.
 * @param {{ wavepool?: boolean, current?: number, shallow?: boolean, sky?: boolean }} [sec]
 * @returns {Wave[]}
 */
export function seaState(sec = {}) {
  const chop = (sec.shallow ? 0.6 : 1) * (sec.sky ? 0.4 : 1) * (1 + Math.min(1, Math.abs(sec.current || 0) / 3) * 0.4);
  /** @type {Wave[]} */
  const waves = [
    { amp: 0.05 * chop, length: 14, dir: [0.94, 0.34], steep: 0.4, phase: 0 },
    { amp: 0.03 * chop, length: 36, dir: [-0.8, 0.6], steep: 0.2, phase: 1.7 },
    { amp: 0.012 * chop, length: 4.5, dir: [0.3, -0.95], steep: 0.5, phase: 4.1 },
  ];
  if (sec.wavepool) waves.push({ amp: 0.2, length: 11, dir: [0, -1], steep: 0.55, phase: 0.6 });
  return waves;
}

/**
 * The surface at (x, z) at time t: height (m) and its slope along x and z (dimensionless), plus the horizontal
 * displacement of the water there (Gerstner circles; small for these steepnesses).
 * @param {Wave[]} waves
 */
export function gerstner(waves, x, z, t) {
  let height = 0, sx = 0, sz = 0, dx = 0, dz = 0;
  for (const w of waves) {
    const l = Math.hypot(w.dir[0], w.dir[1]) || 1, ux = w.dir[0] / l, uz = w.dir[1] / l;
    const k = (2 * Math.PI) / w.length, theta = k * (ux * x + uz * z) - omega(w.length) * t + (w.phase || 0);
    // Gerstner's Q_i = steep / (k·A·N): with steep ≤ 1 the crests sharpen but never loop over.
    const along = ((w.steep ?? 0) / (k * waves.length)) * Math.cos(theta);
    const c = Math.cos(theta), s = Math.sin(theta);
    height += w.amp * s;
    sx += ux * k * w.amp * c;
    sz += uz * k * w.amp * c;
    dx += ux * along;
    dz += uz * along;
  }
  return { height, slope: [sx, sz], shift: [dx, dz] };
}

/** Half width (m, left to right chamber) and half length (m, stern to bow) of the raft's support cross. */
export const RAFT_HALF = { width: 0.9, length: 1.1 };

/**
 * How the waves move the raft: heave (m), roll (rad, + right side down) and pitch (rad, + bow down), from the surface
 * under its four chambers at track position (x, z).
 */
export function raftOnWaves(waves, x, z, t, half = RAFT_HALF) {
  const h = (dx, dz) => gerstner(waves, x + dx, z + dz, t).height;
  const left = h(-half.width, 0), right = h(half.width, 0), bow = h(0, half.length), stern = h(0, -half.length);
  return {
    heave: (left + right + bow + stern) / 4,
    roll: Math.atan2(left - right, 2 * half.width),
    pitch: Math.atan2(stern - bow, 2 * half.length),
  };
}

/** Lift a chamber gives at 0% (the floor and the crew's packs still float a little) and the raft's design draft (m). */
export const MIN_LIFT = 0.15, DRAFT = 0.06;

/**
 * Archimedes on the four chambers. Each chamber is a support at the cross (left/right at ±width, bow/stern at
 * ±length) with stiffness from its air (0..100). The load sits at the centre. Force and moment balance give how far
 * each support sinks: δ = z + roll·x + pitch·y. Returns:
 * - sink: extra depth (m) beyond the design draft (0 when every chamber is full);
 * - roll: rad, + right side down (a soft right side);
 * - pitch: rad, + bow down (a soft bow).
 * @param {{ left: number, right: number, bow: number, stern: number }} chambers
 */
export function buoyancy(chambers, { half = RAFT_HALF, draft = DRAFT, minLift = MIN_LIFT } = {}) {
  const k = (v) => minLift + (1 - minLift) * Math.max(0, Math.min(100, v)) / 100;
  const kl = k(chambers.left), kr = k(chambers.right), kb = k(chambers.bow), ks = k(chambers.stern);
  const a = half.width, b = half.length;
  // The load that sinks a full raft (all k = 1) to its draft: W = 4·draft.
  const W = 4 * draft;
  const K = kl + kr + kb + ks;
  const Sx = (kr - kl) * a, Sy = (kb - ks) * b;
  const Ixx = (kl + kr) * a * a, Iyy = (kb + ks) * b * b;
  const z = W / (K - (Sx * Sx) / Ixx - (Sy * Sy) / Iyy);
  const phi = (-z * Sx) / Ixx, psi = (-z * Sy) / Iyy; // sink gradient across (+x right) and along (+y bow)
  return { sink: Math.max(0, z - draft), roll: Math.atan(phi) + 0, pitch: Math.atan(psi) + 0 }; // + 0: no negative zero
}
