import { describe, it, expect } from 'vitest';
import { moves, head, levelWord, currentFactor, gaugeLine, LIMIT } from '../../src/flow.js';

describe('the head of water', () => {
  it('both modes move the same quantity', () => {
    const st = { drained: { a: true }, drainedBy: { a: 'raft' }, power: { a: true }, routeMod: { a: 'flooded' }, pumps: { a: true }, landing: 'a' };
    const ms = moves(st, 'a');
    expect(ms.map((m) => m.kind)).toEqual(['valve', 'diverter', 'pumps', 'circuit', 'flooded']);
    expect(ms.filter((m) => m.by === 'raft').length).toBe(3);
    expect(head(ms)).toBeCloseTo(0.5);
    expect(moves({ drained: { a: true }, drainedBy: { a: 'foot' } }, 'a')[0].kind).toBe('hand');
    expect(moves({}, 'a')).toEqual([]);
  });
  it('the level, the current and the gauge', () => {
    expect(levelWord(0)).toBe('NORMAL');
    expect(levelWord(0.5)).toBe('HIGH');
    expect(levelWord(1.5)).toBe('FLOODED');
    expect(levelWord(-0.5)).toBe('LOW');
    expect(levelWord(-1)).toBe('DRAINED');
    expect(currentFactor(0)).toBe(1);
    expect(currentFactor(9)).toBeCloseTo(1 + 0.1 * LIMIT);
    expect(currentFactor(-1)).toBeLessThan(1);
    expect(head(moves({ routeMod: { a: 'flooded' }, power: { a: true }, pumps: { a: true } }, 'a'))).toBe(LIMIT);
    expect(gaugeLine([])).toBe('WATER NORMAL');
    expect(gaugeLine(moves({ drained: { a: true }, power: { a: true } }, 'a'))).toBe('WATER LOW · RAFT: the drain valve opened · ON FOOT: the circuit restored, the pumps running');
  });
});
