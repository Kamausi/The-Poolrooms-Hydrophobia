import { describe, it, expect } from 'vitest';
import { wrap, unwrap, problemWith, checksum, writeSave, readSave, SAVE_SCHEMA } from '../../src/savefile.js';

const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const good = { sectorIndex: 2, health: 80, drift: 10, score: 500, upgrades: ['valve'], power: { s1: true } };

describe('savefile', () => {
  it('round-trips through the envelope with schema, build and checksum', () => {
    const e = wrap(good, { build: '0.3.0', now: 7 });
    expect(e).toMatchObject({ schema: SAVE_SCHEMA, build: '0.3.0', savedAt: 7 });
    expect(unwrap(JSON.parse(JSON.stringify(e)))).toEqual({ state: good, migrated: false });
  });
  it('migrates an unversioned save (schema 2 and earlier)', () => {
    expect(unwrap({ ...good })).toEqual({ state: good, migrated: true });
  });
  it('refuses a damaged, newer or impossible save, saying why', () => {
    const e = wrap(good); e.state.health = 9999;
    expect(unwrap(e).problem).toMatch(/damaged/);
    expect(unwrap({ ...wrap(good), schema: SAVE_SCHEMA + 1 }).problem).toMatch(/newer/);
    expect(problemWith({ sectorIndex: 40 })).toMatch(/does not exist/);
    expect(problemWith({ sectorIndex: 1, health: 'lots' })).toMatch(/not a number/);
    expect(problemWith({ sectorIndex: 1, upgrades: 'valve' })).toMatch(/not a list/);
    expect(problemWith({ sectorIndex: 40, endless: true })).toBeNull(); // endless depths run past the campaign
    expect(checksum('a')).not.toBe(checksum('b'));
  });
  it('a damaged save falls back to the backup: one checkpoint lost, not the campaign', () => {
    const s = memStore();
    writeSave(s, 'k', { ...good, sectorIndex: 1 });
    writeSave(s, 'k', { ...good, sectorIndex: 2 });
    expect(readSave(s, 'k')).toMatchObject({ from: 'save', state: { sectorIndex: 2 } });
    s.setItem('k', s.getItem('k').slice(0, 40)); // an interrupted write: cut-off JSON
    const r = readSave(s, 'k');
    expect(r).toMatchObject({ from: 'backup', state: { sectorIndex: 1 } });
    expect(r.problem).toBeTruthy();
  });
  it('a damaged save is never copied over the good backup', () => {
    const s = memStore();
    writeSave(s, 'k', { ...good, sectorIndex: 1 });
    writeSave(s, 'k', { ...good, sectorIndex: 2 });
    s.setItem('k', '{broken');
    writeSave(s, 'k', { ...good, sectorIndex: 3 });
    expect(JSON.parse(s.getItem('k-backup')).state.sectorIndex).toBe(1);
  });
  it('with nothing usable it says so and loads nothing', () => {
    const s = memStore(); s.setItem('k', 'not json');
    expect(readSave(s, 'k')).toMatchObject({ state: null });
    expect(readSave(memStore(), 'k')).toEqual({ state: null, problem: null });
  });
});
