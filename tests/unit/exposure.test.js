import { describe, it, expect } from 'vitest';
import { lightAtEye, targetExposure, adapt, hazeVolume } from '../../src/exposure.js';

describe('auto exposure', () => {
  const lamp = (d) => ({ position: [0, 0, d], intensity: 10, range: 9.5 });
  it('estimates more light near a fixture, none from one out of range', () => {
    const near = lightAtEye([lamp(1)], [0, 0, 0], 0.16), far = lightAtEye([lamp(8)], [0, 0, 0], 0.16), out = lightAtEye([lamp(30)], [0, 0, 0], 0.16);
    expect(near).toBeGreaterThan(far); expect(far).toBeGreaterThan(out); expect(out).toBeCloseTo(0.32);
  });
  it('lifts the dark part of the way, clamps down under strong light, and stays within its limits', () => {
    expect(targetExposure(3.2)).toBeCloseTo(1);
    expect(targetExposure(0.3)).toBeGreaterThan(1.2); expect(targetExposure(0)).toBe(1.45);
    expect(targetExposure(40)).toBe(0.85);
  });
  it('adapts to brightness quickly and to darkness slowly', () => {
    const toBright = adapt(1.4, 0.9, 0.5), toDark = adapt(0.9, 1.4, 0.5);
    expect(1.4 - toBright).toBeGreaterThan((toDark - 0.9) * 2);
    let e = 0.9; for (let i = 0; i < 600; i++) e = adapt(e, 1.4, 1 / 30);
    expect(e).toBeCloseTo(1.4, 2);
  });
});

describe('the haze volume', () => {
  it('is off at zero density', () => { expect(hazeVolume([0, 0, 0], { density: 0, color: [1, 1, 1] })).toEqual({ density: 0 }); });
  it('follows the eye with valid bounds and stays within the engine limits', () => {
    const v = hazeVolume([100, 1, -50], { density: 0.012, color: [0.3, 0.5, 0.5] });
    for (let i = 0; i < 3; i++) expect(v.maximum[i]).toBeGreaterThan(v.minimum[i]);
    expect(v.minimum[0]).toBe(30); expect(v.maximum[2]).toBe(20);
    expect(v.steps).toBeGreaterThanOrEqual(8); expect(v.steps).toBeLessThanOrEqual(48);
    expect(v.ambient.every((c, i) => c < v.color[i])).toBe(true);
    expect(hazeVolume([0, 0, 0], { density: 0.01, color: [1, 1, 1], sky: true }).maximum[1]).toBeGreaterThan(v.maximum[1]);
  });
});
