// Damped springs: one physical vocabulary for everything that should feel like it has mass. A shot, a landing or
// a hit is an impulse (a kick to the velocity); stiffness says how hard it pulls back, damping how much it
// overshoots. Semi-implicit Euler with substeps, so it stays stable at 30 FPS and on a long frame.
// Pure: no rendering, no game state.

/**
 * @param {{ stiffness?: number, damping?: number, value?: number }} [o] damping 1 is critical (no overshoot);
 *   below 1 it rings, above 1 it is sluggish.
 */
export function createSpring({ stiffness = 120, damping = 0.7, value = 0 } = {}) {
  const s = { x: value, v: 0, target: value, stiffness, damping };
  return s;
}

/** Kick the spring: an instantaneous change of velocity. */
export function impulse(s, amount) { s.v += amount; return s; }

/** Advance by dt seconds. Returns the new position. */
export function step(s, dt) {
  if (!(dt > 0)) return s.x;
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = Math.min(dt, 0.25) / n;
  const c = 2 * s.damping * Math.sqrt(s.stiffness);
  for (let i = 0; i < n; i++) {
    const a = -s.stiffness * (s.x - s.target) - c * s.v;
    s.v += a * h;
    s.x += s.v * h;
  }
  return s.x;
}

/** Whether it has come to rest at its target. */
export const settled = (s, eps = 1e-3) => Math.abs(s.x - s.target) < eps && Math.abs(s.v) < eps * 10;

/**
 * A named set of springs sharing a step: a viewmodel's pitch, yaw, roll and pushback, a camera's dip, a raft's roll.
 * @param {Record<string, { stiffness?: number, damping?: number }>} spec
 */
export function createRig(spec) {
  const springs = Object.fromEntries(Object.entries(spec).map(([k, o]) => [k, createSpring(o)]));
  return {
    springs,
    get(k) { return springs[k].x; },
    kick(k, amount) { impulse(springs[k], amount); },
    step(dt) { for (const s of Object.values(springs)) step(s, dt); },
    /** Change a channel's character (a different weapon profile) without losing its motion. */
    tune(k, o) { Object.assign(springs[k], o); },
  };
}
