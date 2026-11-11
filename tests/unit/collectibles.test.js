import { describe, it, expect } from 'vitest';
import { SETS, POWERUPS, plan, collect, progress, allItems, headcountLine } from '../../src/collectibles.js';
import { claimLost, LOST_FOUND, LOST_FOUND_COST } from '../../src/collectibles.js';

const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const cells = Array.from({ length: 12 }, (_, i) => [i, i % 4]);

describe('collectibles and power-ups', () => {
  it('sets are small and every id is unique', () => {
    const ids = allItems().map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of Object.values(SETS)) expect(s.items.length).toBeLessThanOrEqual(6);
  });
  it('a sector offers at most two collectibles and one power-up, on different cells, the same every time', () => {
    const a = plan({ sectorIndex: 2, cells, found: {}, hash }), b = plan({ sectorIndex: 2, cells, found: {}, hash });
    expect(a).toEqual(b);
    expect(a.filter((x) => x.type === 'collectible').length).toBe(2);
    expect(a.filter((x) => x.type === 'powerup').length).toBe(1);
    expect(new Set(a.map((x) => x.cell.join())).size).toBe(a.length);
  });
  it('never offers what is already in the ledger, and runs out gracefully', () => {
    const found = {};
    for (let n = 0; n < 40; n++) for (const x of plan({ sectorIndex: n % 8, cells, found, hash }).filter((y) => y.type === 'collectible')) { expect(found[x.id]).toBeFalsy(); collect({}, found, x); }
    expect(allItems().every((i) => found[i.id])).toBe(true);
    expect(plan({ sectorIndex: 0, cells, found, hash }).filter((x) => x.type === 'collectible')).toHaveLength(0);
  });
  it('a dry thing takes Drift off you and is counted; completing a set pays a bonus once', () => {
    const state = { drift: 50 }, found = {};
    const items = allItems().filter((i) => i.set === 'dry');
    let last = null;
    for (const it of items) last = collect(state, found, it);
    expect(state.drift).toBe(0);
    expect(state.dryCount).toBe(items.length);
    expect(last.complete).toBe(true);
    expect(last.bonus).toBe(2500);
    expect(collect(state, found, items[0])).toBeNull();
    expect(progress(found).dry).toEqual({ name: 'DRY THINGS', have: 4, of: 4 });
  });
  it('the headcount only resolves when every record is found', () => {
    const found = {};
    expect(headcountLine(found, 4)).toBeNull();
    found['hc-clip'] = true;
    expect(headcountLine(found, 4)).toMatch(/1 of 5/);
    for (const [id] of SETS.headcount.items) found[id] = true;
    expect(headcountLine(found, 4)).toMatch(/There are 4 of you/);
  });
  it('power-ups are named objects with a stated effect', () => {
    for (const p of Object.values(POWERUPS)) { expect(p.name).toBeTruthy(); expect(p.note.length).toBeGreaterThan(10); }
  });
});

describe('the Lost & Found', () => {
  it('costs credit, gives exactly one item per visit, and refuses without credit', () => {
    const s = { credit: LOST_FOUND_COST * 2 };
    expect(claimLost(s, 0, 'a').id).toBe('dressing');
    expect(s.dressings).toBe(1);
    expect(s.credit).toBe(LOST_FOUND_COST);
    expect(claimLost(s, 0, 'a')).toBeNull();
    expect(claimLost(s, 0.5, 'b')).not.toBeNull();
    expect(claimLost(s, 0.5, 'c')).toBeNull();
  });
  it('never takes anything but the fee: every outcome leaves supplies and health no worse', () => {
    for (let i = 0; i < LOST_FOUND.length * 20; i++) {
      const s = { credit: LOST_FOUND_COST, dressings: 1, cells: 2, filters: 1, patchKits: 1, health: 60, drift: 30 };
      const got = claimLost(s, i / (LOST_FOUND.length * 20), 'v');
      expect(got.text.length).toBeGreaterThan(10);
      expect(s.dressings).toBeGreaterThanOrEqual(1); expect(s.cells).toBeGreaterThanOrEqual(2); expect(s.cells).toBeLessThanOrEqual(3);
      expect(s.filters).toBeGreaterThanOrEqual(1); expect(s.patchKits).toBeGreaterThanOrEqual(1);
      expect(s.health).toBe(60); expect(s.drift).toBe(30); expect(s.credit).toBeGreaterThanOrEqual(0);
    }
  });
  it('every row is reachable', () => {
    const seen = new Set();
    for (let i = 0; i < 1000; i++) seen.add(claimLost({ credit: 1000 }, i / 1000, i).id);
    expect(seen.size).toBe(LOST_FOUND.length);
  });
});
