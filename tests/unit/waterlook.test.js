// Water optics (src/waterlook.js): absorption derived from each attraction's water colour, so depth reads by colour.
import { describe, it, expect } from 'vitest';
import { waterOptics, transmittance, luminance, linearHex } from '../../src/waterlook.js';
import { SECTORS } from '../../src/sectors.js';

describe('water optics', () => {
  it('converts sRGB hex to linear', () => {
    expect(linearHex('#ffffff')).toEqual([1, 1, 1]);
    expect(linearHex('#000000')).toEqual([0, 0, 0]);
    expect(linearHex('#808080')[0]).toBeCloseTo(0.2158, 3);
  });
  it('keeps shallow water nearly clear and darkens with depth in every attraction', () => {
    for (const s of SECTORS) {
      const { absorption } = waterOptics(s);
      const at = (d) => luminance(transmittance(absorption, d));
      expect(at(0.3)).toBeGreaterThan(0.65); // 30 cm of water barely dims the tile
      expect(at(1)).toBeLessThan(at(0.3));
      expect(at(2.2)).toBeLessThan(at(1));
      expect(at(2.2)).toBeLessThan(at(0.3) * 0.6); // a deep end reads clearly darker than the shallow end
      absorption.forEach((a) => { expect(a).toBeGreaterThanOrEqual(0.02); expect(a).toBeLessThanOrEqual(3); });
    }
  });
  it('absorbs red first in the blue-green pools, so deep water turns teal, not grey', () => {
    const { absorption } = waterOptics({ id: 'welcome-pools', water: '#2b9a8c' });
    expect(absorption[0]).toBeGreaterThan(absorption[1]);
    expect(absorption[0]).toBeGreaterThan(absorption[2]);
  });
  it('makes the Filtration Works murkier than a clean pool', () => {
    expect(waterOptics({ id: 'filtration-works', water: '#0b2d26' }).turbidity).toBeGreaterThan(waterOptics({ id: 'welcome-pools', water: '#2b9a8c' }).turbidity);
  });
});
