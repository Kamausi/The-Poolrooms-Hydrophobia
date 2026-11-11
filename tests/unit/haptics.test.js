import { describe, it, expect } from 'vitest';
import { PATTERNS, rumble } from '../../src/haptics.js';
import { settings } from '../../src/settings.js';

describe('haptic patterns', () => {
  it('every pattern is short and within range', () => {
    for (const [k, [ms, weak, strong]] of Object.entries(PATTERNS)) {
      expect(ms, k).toBeLessThanOrEqual(400);
      expect(weak, k).toBeGreaterThanOrEqual(0); expect(weak, k).toBeLessThanOrEqual(1);
      expect(strong, k).toBeGreaterThanOrEqual(0); expect(strong, k).toBeLessThanOrEqual(1);
    }
  });
  it('profiles are distinguishable: Scatter is heavier and longer than Pulse, the Repeater is the lightest', () => {
    expect(PATTERNS.scatter[2]).toBeGreaterThan(PATTERNS.pulse[2] * 3);
    expect(PATTERNS.scatter[0]).toBeGreaterThan(PATTERNS.pulse[0]);
    expect(PATTERNS.repeater[0]).toBeLessThan(PATTERNS.pulse[0]);
  });
  it('does nothing without a controller, respects the setting, and scales', () => {
    settings.rumble = 1;
    expect(rumble('scatter').strongMagnitude).toBe(1);
    expect(rumble('nothing')).toBeNull();
    settings.rumble = 0;
    expect(rumble('scatter')).toBeNull();
    settings.rumble = 0.5;
    expect(rumble('landing').strongMagnitude).toBe(0.5);
    settings.rumble = 1;
  });
});
