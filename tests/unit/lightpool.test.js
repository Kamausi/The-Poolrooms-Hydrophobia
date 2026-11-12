import { describe, it, expect } from 'vitest';
import { createLightPool, mergeLights } from '../../src/lightpool.js';

describe('the light pool', () => {
  it('a flash is bright at once and gone after its life', () => {
    const p = createLightPool();
    p.flash([0, 1, 0], { intensity: 8, life: 0.1 });
    expect(p.lights()[0].intensity).toBeCloseTo(8);
    p.tick(0.05); expect(p.lights()[0].intensity).toBeLessThan(8);
    p.tick(0.06); expect(p.lights()).toEqual([]);
  });
  it('never grows: with every slot lit, the dimmest is taken over', () => {
    const p = createLightPool({ slots: 3 });
    p.flash([0, 0, 0], { intensity: 2, life: 1 }); p.flash([1, 0, 0], { intensity: 9, life: 1 }); p.flash([2, 0, 0], { intensity: 5, life: 1 });
    p.flash([3, 0, 0], { intensity: 7, life: 1 });
    const l = p.lights(); expect(l.length).toBe(3); expect(l.some((x) => x.position[0] === 0)).toBe(false); expect(p.size).toBe(3);
  });
  it('merging keeps within the engine limit and always leaves room for a flash', () => {
    const scene = Array.from({ length: 16 }, (_, i) => ({ id: i })), f = [{ id: 'f' }, { id: 'g' }];
    const m = mergeLights(scene, f, 16);
    expect(m.length).toBe(16); expect(m.some((x) => x.id === 'f')).toBe(true);
    expect(mergeLights([{ id: 1 }], f, 16).length).toBe(3);
    expect(mergeLights(scene.slice(0, 4), [], 16).length).toBe(4);
  });
});
