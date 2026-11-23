import { describe, it, expect } from 'vitest';
import { departure, inDarkStretch } from '../../src/consequence.js';

describe('the consequence stage', () => {
  it('names what was left behind and what it changes ahead, the same way every time', () => {
    const lit = departure({ sector: 'THE WAVE HALL', powered: true });
    expect(lit.dim).toBe(false);
    expect(lit.text).toEqual(['The circuit is restored: the service gate stands open and the way out is lit.']);
    const dark = departure({ sector: 'THE WAVE HALL', powered: false, routeMod: 'flooded' });
    expect(dark.dim).toBe(true);
    expect(dark.text).toEqual(['You left the dock dark: the channel ahead runs on emergency light.']); // no power, no reroute
    const flooded = departure({ sector: 'X', powered: true, routeMod: 'flooded' });
    expect(flooded.lines.length).toBe(2);
    expect(flooded.text[1]).toMatch(/outlet is flooded/);
    expect(departure({ sector: 'X', powered: true, routeMod: 'drained' }).text[1]).toMatch(/exposed/);
    expect(departure({ sector: 'X', powered: true, routeMod: 'bypass' }).text[1]).toMatch(/calm/);
  });
  it('the dark stretch is a range on the raft', () => {
    expect(inDarkStretch([100, 300], 150)).toBe(true);
    expect(inDarkStretch([100, 300], 300)).toBe(false);
    expect(inDarkStretch(null, 150)).toBe(false);
  });
});
