// Shared primitive shapes (src/shapes.js): identical arguments return the same geometry object, so the renderer
// draws every part that uses it as one instanced batch; different arguments build different geometry.
import { describe, it, expect } from 'vitest';
import { box, cylinder, sphere, torus, shapeCount } from '../../src/shapes.js';

describe('shared shapes', () => {
  it('returns one geometry per distinct call', () => {
    const n = shapeCount();
    expect(box(0.05, 2)).toBe(box(0.05, 2));
    expect(cylinder(12, 0, 1)).toBe(cylinder(12, 0, 1));
    expect(sphere(10, 8)).toBe(sphere(10, 8));
    expect(torus(0.3, 48, 16)).toBe(torus(0.3, 48, 16));
    expect(box(0.05, 2)).not.toBe(box(0.06, 2));
    expect(shapeCount() - n).toBe(5);
  });
  it('builds real geometry', () => {
    const g = cylinder(16, 0.1, 2);
    expect(g.positions.length).toBeGreaterThan(0);
    expect(g.indices.length % 3).toBe(0);
  });
});
