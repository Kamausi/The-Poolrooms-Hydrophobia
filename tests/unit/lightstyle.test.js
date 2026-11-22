import { describe, it, expect } from 'vitest';
import { lightFor, isFailing, STYLES, raftZone, raftLight } from '../../src/render/lightstyle.js';
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
  it('on the raft each kind of section has its light: tubes like corridors, pools like halls, calm water warm, the reservoir cold', () => {
    expect(raftZone({ type: 'tube' })).toBe('tile');
    expect(raftZone({ type: 'pool' })).toBe('hall');
    expect(raftZone({ type: 'lazy', calm: true })).toBe('calm');
    expect(raftZone({ type: 'reservoir', reservoir: true, calm: true })).toBe('reservoir');
    expect(raftZone({ type: 'hall', hall: true, calm: true })).toBe('hall');
    expect(raftZone({ type: 'launch', open: true })).toBe('dry');
    expect(raftZone({ type: 'channel' })).toBe('channel');
    const own = { intensity: 9.5, range: 10.5 };
    const ch = raftLight({ type: 'channel' }, base, own);
    expect(ch.intensity).toBe(9.5); expect(ch.range).toBeCloseTo(10.5); expect(ch.color).toEqual(base); // the channel is unchanged
    const tube = raftLight({ type: 'tube' }, base, own), hall = raftLight({ type: 'pool' }, base, own), res = raftLight({ reservoir: true }, base, own), calm = raftLight({ calm: true }, base, own);
    expect(tube.range).toBeLessThan(ch.range);
    expect(hall.range).toBeGreaterThan(ch.range);
    expect(res.color[2] / res.color[0]).toBeGreaterThan(ch.color[2] / ch.color[0]);
    expect(calm.color[0] / calm.color[2]).toBeGreaterThan(ch.color[0] / ch.color[2]);
  });
});
