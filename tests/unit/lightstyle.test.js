import { describe, it, expect } from 'vitest';
import { lightFor, isFailing, STYLES } from '../../src/render/lightstyle.js';
import { ROOMS } from '../../src/audio/acoustics.js';

const base = [0.8, 0.85, 0.9];

describe('lighting style per kind of space', () => {
  it('every acoustic zone has a lighting style', () => {
    for (const z of Object.keys(ROOMS)) if (['tile', 'hall', 'room', 'dry'].includes(z)) expect(STYLES[z]).toBeDefined();
  });
  it('a hall is brighter and throws further than a corridor; a corridor is colder; a room is the dimmest and warmest', () => {
    const hall = lightFor('hall', base), corr = lightFor('tile', base), room = lightFor('room', base);
    expect(hall.intensity).toBeGreaterThan(corr.intensity);
    expect(hall.range).toBeGreaterThan(corr.range);
    const warmth = (l) => l.color[0] / l.color[2];
    expect(warmth(corr)).toBeLessThan(warmth(hall));
    expect(warmth(room)).toBeGreaterThan(warmth(hall));
    expect(room.intensity).toBeLessThan(corr.intensity);
    for (const l of [hall, corr, room]) for (const c of l.color) expect(c).toBeLessThanOrEqual(1);
  });
  it('corridors have the most failing tubes', () => {
    const share = (z) => Array.from({ length: 1000 }, (_, i) => isFailing((i + 0.5) / 1000, STYLES[z])).filter(Boolean).length / 1000;
    expect(share('tile')).toBeCloseTo(0.25, 2);
    expect(share('hall')).toBeCloseTo(0.06, 2);
    expect(share('tile')).toBeGreaterThan(share('room'));
    expect(lightFor('nowhere', base).range).toBe(STYLES.room.range);
  });
});
