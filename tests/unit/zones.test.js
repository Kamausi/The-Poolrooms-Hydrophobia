import { describe, it, expect } from 'vitest';
import { zoneAt, createZoneTracker, mixFor, ZONE_HOLD } from '../../src/audio/zones.js';
import { ROOMS } from '../../src/audio/acoustics.js';

// A little map: a corridor (row 2) from a big pool hall on the left to a small closed room on the right.
const MAP = [
  '##########################',
  '#~~~~~~~~#################',
  '#~~~~~~~~...........#...##',
  '#~~~~~~~~##########.....##',
  '#~~~~~~~~##########.....##',
  '##########################',
];
const open = (x, z) => MAP[z]?.[x] !== undefined && MAP[z][x] !== '#';
const water = (x, z) => MAP[z]?.[x] === '~';

describe('acoustic zones', () => {
  it('a pool hall is a hall, a narrow run is a corridor, a small closed space is a room, open sky is dry', () => {
    expect(zoneAt(4, 2, { open, water })).toBe('hall');
    expect(zoneAt(13, 2, { open, water })).toBe('tile');
    expect(zoneAt(21, 3, { open, water })).toBe('room');
    expect(zoneAt(13, 2, { open, water, openSky: true })).toBe('dry');
    for (const z of ['hall', 'tile', 'room', 'dry']) expect(ROOMS[z]).toBeDefined();
  });
  it('a new zone has to hold before the reverb follows it', () => {
    const t = createZoneTracker();
    expect(t.step('tile', 0.1)).toBe('tile');
    expect(t.step('hall', ZONE_HOLD / 2)).toBe('tile');
    expect(t.step('tile', 0.1)).toBe('tile'); // stepped back: the change is forgotten
    expect(t.step('hall', ZONE_HOLD / 2)).toBe('tile');
    expect(t.step('hall', ZONE_HOLD / 2 + 0.01)).toBe('hall');
  });
  it('speech reads over the music and ambience; a fight thins the ambience; under water both nearly go', () => {
    expect(mixFor()).toEqual({ music: 1, beds: 1 });
    const talk = mixFor({ speaking: true });
    expect(talk.music).toBeLessThan(0.5);
    expect(talk.beds).toBeLessThan(1);
    expect(mixFor({ phase: 'peak' }).beds).toBeLessThan(1);
    expect(mixFor({ phase: 'peak' }).music).toBe(1);
    const under = mixFor({ under: true });
    expect(under.music).toBeLessThan(0.5);
    expect(under.beds).toBeLessThan(0.2);
  });
});
