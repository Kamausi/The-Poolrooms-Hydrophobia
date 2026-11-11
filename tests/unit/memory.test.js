import { describe, it, expect, beforeEach } from 'vitest';
import { facility, recordSector, recordDeath, authorExpedition, sectorMem } from '../../src/memory.js';
import { SECTORS } from '../../src/sectors.js';

beforeEach(() => { facility.sectors = {}; facility.accepted = {}; facility.history = []; });

describe('facility memory', () => {
  it('current water state is the latest decision, history counts every one', () => {
    recordSector('s1', 'flooded'); recordSector('s1', 'drained');
    const m = sectorMem('s1');
    expect(m.water).toBe('drained');
    expect(m.flooded).toBe(1);
    expect(m.drained).toBe(1);
  });
  it('authors a playable variation from current state, deterministically', () => {
    recordSector('s1', 'restored'); recordSector('s1', 'flooded');
    const a = authorExpedition(SECTORS);
    const b = authorExpedition(SECTORS);
    expect(a[1]).toBeTruthy();
    expect(a[1].map).toEqual(b[1].map);
    expect(a[1].plaque).toBe(true);
  });
  it('a dock you left early keeps your place until you restore it', () => {
    recordSector('s3', 'left');
    const v = authorExpedition(SECTORS)[3];
    expect(v.left).toBe(1);
    expect(v.map).toBeUndefined();
    recordSector('s3', 'restored');
    expect(authorExpedition(SECTORS)[3]?.left).toBeUndefined();
  });
  it('remembered deaths make a place observant, never a harder map', () => {
    recordDeath('s2', [3, 4]);
    const v = authorExpedition(SECTORS)[2];
    expect(v.dangerous).toBe(true);
    expect(v.map).toBeUndefined();
  });
});
