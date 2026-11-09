import { describe, it, expect } from 'vitest';
import { ensureHull, addAll, compressorRefill, CHAMBERS } from '../../src/hull.js';

describe('hull chambers', () => {
  it('starts from the old single raft number and keeps it as the average', () => {
    const s = { raft: 80 };
    ensureHull(s);
    expect(CHAMBERS.every((k) => s.chambers[k] === 80)).toBe(true);
    s.chambers.left = 40;
    addAll(s, 0);
    expect(s.raft).toBe(70);
  });
  it('clamps to 0..100', () => {
    const s = { raft: 90 };
    addAll(s, 50);
    expect(s.raft).toBe(100);
    addAll(s, -500);
    expect(s.raft).toBe(0);
  });
  it('the compressor seals leaks as bench patches and refills, keeping at most nine marks', () => {
    const s = { raft: 30, leaks: Array.from({ length: 12 }, (_, i) => ({ chamber: 'bow', u: i / 12, cause: 'bloom' })) };
    compressorRefill(s);
    expect(s.leaks).toHaveLength(0);
    expect(s.raft).toBe(100);
    expect(s.hullMarks.length).toBeLessThanOrEqual(9);
    expect(s.hullMarks.every((m) => m.kind === 'patch' && m.bench)).toBe(true);
  });
});
