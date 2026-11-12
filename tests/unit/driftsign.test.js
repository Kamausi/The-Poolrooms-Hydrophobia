import { describe, it, expect } from 'vitest';
import { driftSign, driftState } from '../../src/driftsign.js';

describe('signs at high Drift', () => {
  it('ordinary signs become about you, with the same number of lines', () => {
    expect(driftSign('SERVICE · KEEP CLOSED', 'rule', 4471)).toBe('GUEST 4471');
    expect(driftSign('MAINTENANCE NOTICE\nDO NOT ENTER THE OVERFLOW ALONE\nA · B', 'sign', 12)).toBe('GUEST 12\nPLEASE REMAIN\nYOU ARE EXPECTED');
  });
  it('never touches anything you need to read to solve the room', () => {
    for (const t of ['PRESSURE DIAGRAM\nOPEN IN ORDER: A → B → C\nPUMPS: 1 2 3 4', 'VALVE A\nPUMP 1 OF 4', 'LIGHTING\nMAIN · EMERGENCY', '0417', '0415 · 0416 · 0417', 'YOUR PARTY STOPPED HERE\nPLEASE CONTINUE · VISIT 2', 'PUMP REPAIRED · 2006\nCREDIT: DRAINER CREW SEVEN']) expect(driftSign(t, 'sign', 1)).toBeNull();
  });
  it('leaves handwriting and blacklight paint alone', () => {
    expect(driftSign("DON'T STAY HERE", 'hand', 1)).toBeNull();
    expect(driftSign('THIS WAY', 'uv', 1)).toBeNull();
  });
  it('turns on at 70 and off below 55', () => {
    expect(driftState(false, 69)).toBe(false); expect(driftState(false, 70)).toBe(true);
    expect(driftState(true, 60)).toBe(true); expect(driftState(true, 54)).toBe(false);
  });
});
