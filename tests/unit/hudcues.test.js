import { describe, it, expect } from 'vitest';
import { bearing, vitalsShown, hitKind, arcStrength, CHAMBER_BEARING, VITALS_LINGER } from '../../src/hudcues.js';

describe('hudcues', () => {
  it('reads a bearing in the on-foot facing convention', () => {
    // yaw 0 faces -z; right is +x.
    expect(bearing(0, [0, 0, 0], [0, 0, -5])).toBeCloseTo(0);
    expect(bearing(0, [0, 0, 0], [5, 0, 0])).toBeCloseTo(90);
    expect(bearing(0, [0, 0, 0], [-5, 0, 0])).toBeCloseTo(-90);
    expect(Math.abs(bearing(0, [0, 0, 0], [0, 0, 5]))).toBeCloseTo(180);
    // Turned to face +x (yaw -90°), something at +x is ahead.
    expect(bearing(-Math.PI / 2, [0, 0, 0], [5, 0, 0])).toBeCloseTo(0);
    expect(bearing(0, [1, 0, 1], [1, 2, 1])).toBeNull();
  });
  it('maps raft chambers to sides', () => {
    expect(CHAMBER_BEARING.stern).toBe(180);
    expect(CHAMBER_BEARING.left).toBeLessThan(0);
  });
  it('keeps health off screen while whole, unless just hit, down or persistent', () => {
    expect(vitalsShown({ health: 100 })).toBe(false);
    expect(vitalsShown({ health: 80 })).toBe(true);
    expect(vitalsShown({ health: 100, sinceHurt: 1 })).toBe(true);
    expect(vitalsShown({ health: 100, sinceHurt: VITALS_LINGER + 1 })).toBe(false);
    expect(vitalsShown({ health: 100, downed: true })).toBe(true);
    expect(vitalsShown({ health: 100, persistent: true })).toBe(true);
  });
  it('names the hit marker by what the shot did', () => {
    expect(hitKind()).toBe('hit');
    expect(hitKind({ weak: true })).toBe('weak');
    expect(hitKind({ killed: true, weak: true })).toBe('kill');
    expect(hitKind({ resisted: true })).toBe('none');
  });
  it('scales the arc with the hit', () => {
    expect(arcStrength(0)).toBe(0.3);
    expect(arcStrength(40)).toBe(1);
    expect(arcStrength(10)).toBeGreaterThan(arcStrength(4));
  });
});
