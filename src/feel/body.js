// A floating body: something loose in the water (a crate, a chair, a board) that rides the same Gerstner surface as
// the raft. Buoyancy pulls it toward its waterline under the surface as a damped spring (stiff in heave, softer in
// tilt), the water drags its drift down to the current's speed, and a knock from the raft shoves it aside and sets it
// spinning. Integrated with semi-implicit Euler, which is stable for these stiffnesses at frame rates down to 30.
//
// Coordinates are the track frame, as in float.js: x across the channel, z along it. Pure and unit-tested.
import { raftOnWaves } from './float.js';

/**
 * @param {{ x?: number, z?: number, draft?: number, half?: { width: number, length: number } }} [o]
 *   draft: how deep it floats (m); half: its footprint for sampling the waves.
 */
export function createFloater({ x = 0, z = 0, draft = 0.08, half = { width: 0.45, length: 0.3 } } = {}) {
  return { x, z, y: -draft, vx: 0, vz: 0, vy: 0, roll: 0, vr: 0, pitch: 0, vp: 0, spin: 0, vs: 0, draft, half };
}

/** Spring constants: heave (rad/s natural frequency), tilt, and how fast the water takes its drift (1/s). */
export const FLOAT = { heave: 6, heaveDamp: 0.55, tilt: 4, tiltDamp: 0.5, drag: 1.4, spinDrag: 1.2, maxStep: 1 / 30 };

const spring = (pos, vel, target, w, zeta, dt) => vel + (w * w * (target - pos) - 2 * zeta * w * vel) * dt;

/**
 * Step the body by `dt` on the waves at time `t`, in water moving at `current` m/s along +z (0 for still water).
 * @param {ReturnType<typeof createFloater>} b
 */
export function stepFloater(b, waves, t, dt, current = 0) {
  for (let left = Math.max(0, dt); left > 1e-6;) {
    const h = Math.min(left, FLOAT.maxStep);
    left -= h;
    const sea = raftOnWaves(waves, b.x, b.z, t, b.half);
    b.vy = spring(b.y, b.vy, sea.heave - b.draft, FLOAT.heave, FLOAT.heaveDamp, h);
    b.vr = spring(b.roll, b.vr, sea.roll, FLOAT.tilt, FLOAT.tiltDamp, h);
    b.vp = spring(b.pitch, b.vp, sea.pitch, FLOAT.tilt, FLOAT.tiltDamp, h);
    const k = Math.exp(-FLOAT.drag * h);
    b.vx *= k;
    b.vz = current + (b.vz - current) * k;
    b.vs *= Math.exp(-FLOAT.spinDrag * h);
    b.y += b.vy * h; b.roll += b.vr * h; b.pitch += b.vp * h;
    b.x += b.vx * h; b.z += b.vz * h; b.spin += b.vs * h;
  }
  return b;
}

/** Knock the body: a change of velocity across and along (m/s), a dunk (m/s, negative is down) and spin (rad/s). */
export function knock(b, across, along = 0, dunk = -0.6, spin = 0) {
  b.vx += across; b.vz += along; b.vy += dunk; b.vs += spin;
  b.vr += across * 0.8; // it tips away from the blow
  return b;
}

/**
 * A tilted basis for drawing the body: right, up and forward unit vectors from the track's right and forward at
 * its position, rolled about forward, pitched about right and turned by its spin.
 */
export function floaterBasis(b, right, forward) {
  const up = [right[1] * forward[2] - right[2] * forward[1], right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];
  const c = Math.cos(b.spin), s = Math.sin(b.spin);
  // Spin about up.
  let r = right.map((v, i) => v * c - forward[i] * s), f = forward.map((v, i) => v * c + right[i] * s);
  // Tilt: lean up toward right by roll and toward forward by pitch, then make the frame orthonormal again.
  let u = up.map((v, i) => v + right[i] * Math.sin(b.roll) + forward[i] * Math.sin(b.pitch));
  const n = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  u = n(u);
  const d = r[0] * u[0] + r[1] * u[1] + r[2] * u[2];
  r = n(r.map((v, i) => v - u[i] * d));
  f = [u[1] * r[2] - u[2] * r[1], u[2] * r[0] - u[0] * r[2], u[0] * r[1] - u[1] * r[0]];
  return { right: r, up: u, forward: f };
}
