// Property tests (fast-check): instead of a few chosen cases, each rule is checked against a hundred generated ones,
// and a failure is shrunk to the smallest case that breaks it.
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buoyancy, raftOnWaves, seaState } from '../../src/feel/float.js';
import { createRope } from '../../src/feel/rope.js';
import { steer } from '../../src/ai/steering.js';
import { takeSpread } from '../../src/scatter.js';
import { sabine, ABSORB } from '../../src/audio/acoustics.js';
import { foamLevel, causticStrength } from '../../src/render/waterfx.js';
import { rng } from '../../src/math.js';

const pct = fc.double({ min: 0, max: 100, noNaN: true });
const chambers = fc.record({ left: pct, right: pct, bow: pct, stern: pct });

describe('properties', () => {
  it('buoyancy: the raft always lists toward the softer side and pitches toward the softer end, and never floats above its draft', () => {
    fc.assert(fc.property(chambers, (c) => {
      const b = buoyancy(c);
      if (![b.sink, b.roll, b.pitch].every(Number.isFinite)) return false;
      if (b.sink < 0) return false;
      if (Math.sign(b.roll) !== 0 && Math.sign(b.roll) !== Math.sign(c.left - c.right)) return false; // + right down when the right is softer
      if (Math.sign(b.pitch) !== 0 && Math.sign(b.pitch) !== Math.sign(c.stern - c.bow)) return false;
      return Math.abs(b.roll) < 0.5 && Math.abs(b.pitch) < 0.5;
    }));
  });
  it('buoyancy: letting air out of any chamber never lifts the raft', () => {
    fc.assert(fc.property(chambers, fc.constantFrom('left', 'right', 'bow', 'stern'), fc.double({ min: 1, max: 100, noNaN: true }), (c, k, d) => {
      const less = { ...c, [k]: Math.max(0, c[k] - d) };
      return buoyancy(less).sink >= buoyancy(c).sink - 1e-12;
    }));
  });
  it('waves: the raft never heaves further than the sum of the amplitudes', () => {
    fc.assert(fc.property(fc.boolean(), fc.double({ min: -50, max: 50, noNaN: true }), fc.double({ min: 0, max: 500, noNaN: true }), fc.double({ min: 0, max: 300, noNaN: true }), (pool, x, z, t) => {
      const w = seaState({ wavepool: pool }), r = raftOnWaves(w, x, z, t);
      return Math.abs(r.heave) <= w.reduce((a, q) => a + q.amp, 0) + 1e-9;
    }));
  });
  it('rope: whatever hits it, the anchors stay put and the line stays finite and shorter than slack allows', () => {
    fc.assert(fc.property(fc.array(fc.record({ u: fc.double({ min: 0, max: 1, noNaN: true }), v: fc.double({ min: -8, max: 8, noNaN: true }), pop: fc.boolean() }), { maxLength: 12 }), (hits) => {
      const r = createRope({ length: 6 });
      for (const h of hits) { r.kick(h.u, h.v); if (h.pop) r.floats(h.u - 0.05, h.u + 0.05, false); for (let i = 0; i < 20; i++) r.step(1 / 60); }
      const n = r.nodes, ends = n[0].x === 0 && n[0].y === 0 && n[n.length - 1].x === 6 && n[n.length - 1].y === 0;
      return ends && n.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.y > -3 && p.y < 3);
    }));
  });
  it('steering: no agent ever moves faster than its top speed', () => {
    const pt = fc.tuple(fc.double({ min: -20, max: 20, noNaN: true }), fc.constant(0), fc.double({ min: -20, max: 20, noNaN: true }));
    fc.assert(fc.property(pt, pt, fc.array(pt, { maxLength: 5 }), fc.double({ min: 1, max: 6, noNaN: true }), (from, to, others, top) => {
      const a = { pos: [...from] };
      for (let i = 0; i < 60; i++) { steer(a, to, others, 1 / 60, { maxSpeed: top }); if (Math.hypot(...a.vel) > top + 1e-9) return false; }
      return true;
    }));
  });
  it('scatter: never hands out the same cell twice, and only cells it was given', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 1e6 }), fc.integer({ min: 0, max: 40 }), (w, h, seed, n) => {
      const cells = []; for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) cells.push([x, z]);
      const all = new Set(cells.map(String)), taken = [], r = rng(seed);
      for (let i = 0; i < n; i++) takeSpread(cells, taken, r);
      const keys = taken.map(String);
      return new Set(keys).size === keys.length && keys.every((k) => all.has(k)) && taken.length === Math.min(n, w * h);
    }));
  });
  it('acoustics: more absorption on any surface never lengthens the reverb', () => {
    const mats = fc.constantFrom(...Object.keys(ABSORB));
    fc.assert(fc.property(fc.double({ min: 1, max: 40, noNaN: true }), fc.double({ min: 2, max: 15, noNaN: true }), fc.double({ min: 1, max: 80, noNaN: true }), mats, mats, mats, fc.double({ min: 0, max: 100, noNaN: true }), (w, h, l, floor, walls, ceiling, extra) => {
      const base = sabine({ w, h, l, floor, walls, ceiling }), more = sabine({ w, h, l, floor, walls, ceiling, extra });
      return base.rt60 > 0 && more.rt60 <= base.rt60 + 1e-12;
    }));
  });
  it('water: foam and caustic strength stay in range for any conditions', () => {
    const k = fc.double({ min: 0, max: 1, noNaN: true });
    fc.assert(fc.property(fc.double({ min: 0, max: 30, noNaN: true }), k, k, k, (flow, waves, falls, turbidity) => {
      const f = foamLevel({ flow, waves, falls, turbidity }), c = causticStrength({ light: waves, turbidity, rough: falls });
      return f >= 0 && f <= 1 && c >= 0 && c <= 1.2;
    }));
  });
});
