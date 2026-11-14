// Short-lived effects from a fixed set of slots: impact sparks, splash droplets, bubbles. Like the light pool, nothing
// is created or destroyed during play: a burst takes free slots, and when a kind is full the oldest piece is taken
// over. Each piece moves on its own (sparks fall fast, droplets arc and fall, bubbles rise and wobble) and fades
// over its life. How many pieces a burst makes follows the quality `particles` density (tiers.js `thinning`).
// Pure: the scenes draw each live slot with a part of their own.

/** Per kind: slots, life in seconds, gravity (m/s², negative rises), drag, starting size. */
export const KINDS = {
  spark: { slots: 12, life: 0.28, gravity: 9, drag: 2.5, size: 0.05 },
  droplet: { slots: 12, life: 0.7, gravity: 9.8, drag: 0.6, size: 0.06 },
  bubble: { slots: 8, life: 1.6, gravity: -1.2, drag: 3, size: 0.05 },
};

/** A tiny deterministic random so tests and replays agree. */
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function createEffectPool({ seed = 7, kinds = KINDS } = {}) {
  const random = mulberry(seed);
  const pools = Object.fromEntries(Object.entries(kinds).map(([k, o]) => [k, Array.from({ length: o.slots }, () => ({ on: false, pos: [0, 0, 0], vel: [0, 0, 0], age: 0, life: o.life, size: o.size, color: [1, 1, 1] }))]));
  let now = 0;
  return {
    /** Pieces per kind, for the scenes to allocate parts. */
    sizes: Object.fromEntries(Object.entries(kinds).map(([k, o]) => [k, o.slots])),
    /**
     * A burst of `count` pieces of `kind` at `at`, thrown outward around `dir` (unit vector, default up) at `speed`
     * m/s with `spread` (0 a jet, 1 a hemisphere). `density` (0..1) scales the count; at least one piece always comes.
     * Returns the number spawned.
     */
    burst(kind, at, { count = 4, dir = [0, 1, 0], speed = 3, spread = 0.7, color = [1, 1, 1], density = 1 } = {}) {
      const pool = pools[kind]; if (!pool) return 0;
      const n = Math.max(1, Math.round(count * density));
      for (let i = 0; i < n; i++) {
        const p = pool.find((x) => !x.on) || pool.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));
        const r = [random() * 2 - 1, random() * 2 - 1, random() * 2 - 1];
        const v = [dir[0] + r[0] * spread, dir[1] + r[1] * spread, dir[2] + r[2] * spread];
        const l = Math.hypot(...v) || 1, sp = speed * (0.6 + 0.4 * random());
        Object.assign(p, { on: true, pos: [...at], vel: v.map((c) => (c / l) * sp), age: 0, life: kinds[kind].life * (0.75 + 0.5 * random()), size: kinds[kind].size * (0.8 + 0.4 * random()), color });
      }
      return n;
    },
    /** Advance every live piece. */
    tick(dt) {
      now += dt;
      for (const [k, pool] of Object.entries(pools)) {
        const o = kinds[k];
        for (const p of pool) {
          if (!p.on) continue;
          p.age += dt;
          if (p.age >= p.life) { p.on = false; continue; }
          const keep = Math.exp(-o.drag * dt);
          p.vel = [p.vel[0] * keep, (p.vel[1] - o.gravity * dt) * keep, p.vel[2] * keep];
          if (k === 'bubble') p.vel[0] += Math.sin(now * 9 + p.size * 100) * dt * 0.6; // a wobble on the way up
          p.pos = [p.pos[0] + p.vel[0] * dt, p.pos[1] + p.vel[1] * dt, p.pos[2] + p.vel[2] * dt];
        }
      }
    },
    /** The slots of a kind (live or not), in a fixed order, so slot i is always drawn by part i. */
    slots(kind) { return pools[kind] || []; },
    /** How far through its life a piece is, 0..1 (1 = gone). */
    fade(p) { return p.on ? p.age / p.life : 1; },
    live(kind) { return (pools[kind] || []).filter((p) => p.on).length; },
  };
}
