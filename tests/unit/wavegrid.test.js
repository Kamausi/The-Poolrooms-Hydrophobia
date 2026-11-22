import { describe, it, expect } from 'vitest';
import { createWaveGrid, sheetGeometry } from '../../src/render/wavegrid.js';

describe('wavegrid', () => {
  it('a dip spreads out as a ring at about the wave speed', () => {
    const g = createWaveGrid({ n: 81, size: 20, speed: 2, damping: 0 });
    g.disturb(10, 10, 0.1, 0.5);
    for (let t = 0; t < 2; t += 1 / 60) g.step(1 / 60);
    // After 2 s the front is near 4 m out: find where the disturbance is largest along a line from the centre.
    let best = 0, at = 0;
    for (let r = 1; r < 9.5; r += 0.1) { const v = Math.abs(g.heightAt(10 + r, 10)); if (v > best) { best = v; at = r; } }
    expect(at).toBeGreaterThan(3);
    expect(at).toBeLessThan(5);
  });
  it('stays stable and dies away with damping', () => {
    const g = createWaveGrid({ n: 32, size: 8 });
    g.disturb(4, 4, 0.1, 0.6);
    const e0 = g.energy();
    for (let t = 0; t < 20; t += 1 / 30) g.step(1 / 30); // big steps: substeps keep it stable
    expect(Number.isFinite(g.energy())).toBe(true);
    expect(g.energy()).toBeLessThan(e0 * 0.05);
  });
  it('a wall reflects: water behind it never moves, and the wave comes back', () => {
    const g = createWaveGrid({ n: 61, size: 12, speed: 2, damping: 0 });
    g.setMask((x) => x < 8); // a wall at x = 8
    g.disturb(4, 6, 0.1, 0.5);
    let behind = 0, back = 0;
    for (let t = 0; t < 4; t += 1 / 60) {
      g.step(1 / 60);
      behind = Math.max(behind, Math.abs(g.heightAt(10, 6)));
      if (t > 3) back = Math.max(back, Math.abs(g.heightAt(6, 6)));
    }
    expect(behind).toBe(0);
    expect(back).toBeGreaterThan(0.001);
  });
  it('writes a mesh whose normals tilt away from a rise', () => {
    const g = createWaveGrid({ n: 16, size: 4 }), geo = sheetGeometry(16, 4);
    g.disturb(2, 2, -0.2, 1); // a bump
    g.writeMesh(geo.positions, geo.normals, 1);
    const c = 8 * 16 + 5; // left of centre: the surface rises toward +x
    expect(geo.normals[c * 3]).toBeLessThan(0);
    expect(geo.normals[c * 3 + 1]).toBeGreaterThan(0.5);
    expect(geo.indices.length).toBe(15 * 15 * 6);
  });
});
