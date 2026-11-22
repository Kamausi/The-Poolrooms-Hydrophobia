import { describe, it, expect } from 'vitest';
import { packSave, unpackSave, gzip, gunzip, SAVE_KEYS } from '../../src/storage.js';

describe('storage', () => {
  const store = { 'underflow-save-v2': '{"sector":3}', 'underflow-settings': '{"sway":false}', 'other-site': 'x' };
  it('a save file carries only the game\'s own keys', () => {
    const f = packSave((k) => store[k] ?? null, { now: 5 });
    expect(Object.keys(f.data)).toEqual(['underflow-save-v2', 'underflow-settings']);
    expect(f.saved).toBe(5);
    expect(SAVE_KEYS).toContain('underflow-facility');
  });
  it('unpacking refuses files that are not saves, are newer, damaged or empty', () => {
    expect(() => unpackSave({ game: 'other' })).toThrow(/not a Hydrophobia/);
    expect(() => unpackSave({ game: 'the-poolrooms-hydrophobia', version: 99, data: {} })).toThrow(/newer/);
    expect(() => unpackSave({ game: 'the-poolrooms-hydrophobia', version: 1, data: { 'underflow-save-v2': '{bad' } })).toThrow(/damaged/);
    expect(() => unpackSave({ game: 'the-poolrooms-hydrophobia', version: 1, data: { 'evil-key': '{}' } })).toThrow(/empty/);
  });
  it('round-trips through gzip', async () => {
    const f = packSave((k) => store[k] ?? null);
    const text = JSON.stringify(f), z = await gzip(text);
    expect(z[0]).toBe(0x1f);
    expect(await gunzip(z)).toBe(text);
    expect(unpackSave(JSON.parse(await gunzip(z)))).toEqual({ 'underflow-save-v2': store['underflow-save-v2'], 'underflow-settings': store['underflow-settings'] });
    expect(await gunzip(new TextEncoder().encode(text))).toBe(text); // plain JSON files still read
  });
});
