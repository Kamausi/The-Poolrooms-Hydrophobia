// Effects from a fixed set of slots (src/effectpool.js): sparks, droplets, bubbles.
import { describe, it, expect } from 'vitest';
import { createEffectPool, KINDS } from '../../src/effectpool.js';

const run = (fx, seconds, dt = 1 / 60) => { for (let t = 0; t < seconds; t += dt) fx.tick(dt); };

describe('effect pool', () => {
  it('spawns a burst into free slots and lets every piece fade out', () => {
    const fx = createEffectPool();
    expect(fx.burst('spark', [0, 1, 0], { count: 5 })).toBe(5);
    expect(fx.live('spark')).toBe(5);
    run(fx, 1);
    expect(fx.live('spark')).toBe(0);
  });
  it('never grows: when a kind is full, the oldest pieces are taken over', () => {
    const fx = createEffectPool();
    fx.burst('spark', [0, 0, 0], { count: KINDS.spark.slots });
    run(fx, 0.05);
    fx.burst('spark', [5, 0, 0], { count: 3 });
    expect(fx.slots('spark')).toHaveLength(KINDS.spark.slots);
    expect(fx.live('spark')).toBe(KINDS.spark.slots);
    expect(fx.slots('spark').filter((p) => p.on && p.pos[0] > 4).length).toBe(3);
  });
  it('sparks and droplets fall, bubbles rise', () => {
    const fx = createEffectPool();
    fx.burst('droplet', [0, 1, 0], { count: 4, speed: 0.1, spread: 0 });
    fx.burst('bubble', [0, -1, 0], { count: 4, speed: 0.1, spread: 0 });
    run(fx, 0.4);
    expect(fx.slots('droplet').filter((p) => p.on).every((p) => p.pos[1] < 1)).toBe(true);
    expect(fx.slots('bubble').filter((p) => p.on).every((p) => p.pos[1] > -1)).toBe(true);
  });
  it('scales a burst with the quality density but always makes at least one piece', () => {
    const fx = createEffectPool();
    expect(fx.burst('spark', [0, 0, 0], { count: 8, density: 0.45 })).toBe(4);
    expect(fx.burst('droplet', [0, 0, 0], { count: 2, density: 0.1 })).toBe(1);
  });
  it('is deterministic for a seed', () => {
    const a = createEffectPool({ seed: 3 }), b = createEffectPool({ seed: 3 });
    a.burst('spark', [0, 0, 0], { count: 3 }); b.burst('spark', [0, 0, 0], { count: 3 });
    run(a, 0.1); run(b, 0.1);
    expect(a.slots('spark').map((p) => p.pos)).toEqual(b.slots('spark').map((p) => p.pos));
  });
});
