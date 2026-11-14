// What disturbs the water, and the shapes that show it. The engine's water has one ripple slot (a normal ring from
// the last splash) and its material hooks do not run in the renderer path this game uses (tested: see
// docs/ARCHITECTURE.md), so everything else is geometry from fixed pools the scenes build once:
//
// - rings: up to six expanding rings at once (shots, splashes, steps, paddle strokes, things surfacing), flat tori on
//   the surface that widen and thin out;
// - the raft's wake: two arms opening at the Kelvin angle (19.5 degrees either side of the line behind it) and a
//   churned trail, scaled by speed;
// - current streaks: thin foam strips carried along the channel at the current's speed;
// - caustics: two sheets of a caustic pattern just above the pool floor, drifting against each other.
//
// `createWaterField().impulse` is the one way in for disturbances; it also names the newest strong ring for the
// engine's own ripple slot. Pure and unit-tested: no DOM, no renderer.

/** Kelvin half-angle: the wake arms of anything moving on deep water open at asin(1/3). */
export const KELVIN = Math.asin(1 / 3);
export const RING_SLOTS = 6;
/** How long a ring lives (s), how fast its front travels (m/s) and how wide it starts (m). */
export const RING_LIFE = 2.4, RING_SPEED = 1.4, RING_START = 0.12;

/** Strength by kind of disturbance, so every caller speaks the same scale. */
export const IMPULSE = { shot: 0.7, step: 0.35, paddle: 0.6, splash: 1, surface: 1.2, burst: 0.9, drop: 0.5 };

export function createWaterField({ slots = RING_SLOTS } = {}) {
  const rings = Array.from({ length: slots }, () => ({ x: 0, y: 0, z: 0, t0: -1e3, k: 0 }));
  let newest = null;
  return {
    /**
     * A disturbance at `at` ([x, y, z], y the water surface there) of `kind` (a key of IMPULSE) or a strength, at
     * time `now`. Takes a finished ring's slot, or the oldest. Returns the slot used.
     */
    impulse(at, kind = 'splash', now = 0) {
      const k = typeof kind === 'number' ? kind : IMPULSE[kind] ?? 0.6;
      let i = rings.findIndex((r) => now - r.t0 >= RING_LIFE);
      if (i < 0) i = rings.reduce((o, r, j) => (r.t0 < rings[o].t0 ? j : o), 0);
      Object.assign(rings[i], { x: at[0], y: at[1] ?? 0, z: at[2], t0: now, k });
      if (k >= 0.5) newest = { at: [at[0], at[1] ?? 0, at[2]], time: now };
      return i;
    },
    /** The newest ring strong enough for the engine's normal ripple, or null. */
    strongest() { return newest; },
    /** Rings still travelling at `now`. */
    live(now) { return rings.filter((r) => ringShape(r, now)).length; },
    rings,
  };
}

/**
 * The shape of a ring at `now`: centre, radius (m) and fade (1 new, 0 gone), or null when it is not travelling.
 * The scenes scale a flat torus by radius and flatten it by fade.
 */
export function ringShape(r, now) {
  const age = now - r.t0;
  if (age < 0 || age >= RING_LIFE || r.k <= 0) return null;
  const left = 1 - age / RING_LIFE;
  return { at: [r.x, r.y, r.z], radius: RING_START + age * RING_SPEED * (0.7 + 0.3 * Math.min(1.5, r.k)), fade: Math.min(1, r.k) * left * left };
}

/**
 * The wake behind something at `pos` moving at `speed` m/s along `heading` ([x, z]): two arms and a trail, each a
 * strip { centre, yaw, length, width } lying on the water. Empty when it is barely moving. `length` is the arm length
 * at full speed (6 m/s).
 */
export function wakeStrips(pos, heading, speed, { length = 7 } = {}) {
  const k = Math.max(0, Math.min(1, speed / 6));
  if (k < 0.05) return [];
  const l = Math.hypot(heading[0], heading[1]) || 1;
  const bx = -heading[0] / l, bz = -heading[1] / l; // straight back
  const strip = (dx, dz, len, width) => ({
    centre: [pos[0] + dx * len / 2, pos[1], pos[2] + dz * len / 2],
    yaw: Math.atan2(dx, dz), length: len, width,
  });
  const arm = (side) => {
    const c = Math.cos(KELVIN), s = Math.sin(KELVIN) * side;
    return strip(bx * c - bz * s, bx * s + bz * c, length * k, 0.12 + 0.18 * k);
  };
  return [arm(1), arm(-1), strip(bx, bz, length * 0.6 * k, 0.35 + 0.3 * k)];
}

/** Whether point p ([x, y, z]) lies on one of the wake arms (for tests): behind, and at the Kelvin angle. */
export function onWakeArm(p, pos, heading) {
  const l = Math.hypot(heading[0], heading[1]) || 1;
  const bx = -heading[0] / l, bz = -heading[1] / l;
  const rx = p[0] - pos[0], rz = p[2] - pos[2];
  const along = rx * bx + rz * bz, across = Math.abs(rx * -bz + rz * bx);
  return along > 0 && Math.abs(across - along * Math.tan(KELVIN)) < 0.25;
}

/**
 * Current streaks: `count` strips spread over `span` metres of channel, carried at `flow` m/s. Returns, for each, how
 * far along the span it is (0..span) and its side offset (-1..1 of the half width), plus a fade that hides it as it
 * wraps from the end of the span back to the start.
 */
export function streaks(count, span, flow, t) {
  return Array.from({ length: count }, (_, i) => {
    const phase = (((i * 0.61803 * span + flow * t) % span) + span) % span;
    const edge = Math.min(phase, span - phase) / Math.max(0.001, span * 0.1);
    return { along: phase, side: Math.sin(i * 2.399) * 0.75, fade: Math.min(1, edge) * Math.min(1, Math.abs(flow) / 1.5) };
  });
}

/**
 * Foam from the conditions (waves and falls 0..1, flow in m/s): fast water, waves and falls whiten it; turbid water
 * holds it. Channel currents here run 2.4 (the lift) to 12.5 m/s (the flume): nothing foams below 5 m/s.
 */
export function foamLevel({ flow = 0, waves = 0, falls = 0, turbidity = 0 } = {}) {
  const f = Math.min(1, Math.max(0, flow - 5) / 8) * 0.5 + waves * 0.45 + falls * 0.6;
  return Math.max(0, Math.min(1, f * (1 + Math.min(0.5, turbidity))));
}

/** How bright the caustics are, from the light, the water's clarity and how rough the surface is (0..1.2). */
export function causticStrength({ light = 1, turbidity = 0.03, rough = 0 } = {}) {
  return Math.max(0, Math.min(1.2, light * 0.9 * Math.exp(-turbidity * 6) * (1 - Math.min(0.7, rough * 0.5))));
}

/** The two caustic sheets' offsets at time t (m), drifting on different slow loops so their overlap keeps changing. */
export function causticDrift(t) {
  return [
    [Math.sin(t * 0.23) * 0.35, Math.cos(t * 0.17) * 0.35],
    [Math.cos(t * 0.19 + 1.3) * 0.35, Math.sin(t * 0.29 + 0.4) * 0.35],
  ];
}
