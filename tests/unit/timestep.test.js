import { describe, it, expect } from 'vitest';
import { planSteps } from '../../src/feel/timestep.js';
import { createProfiler } from '../../src/debug/profile.js';

describe('timestep', () => {
  it('an ordinary frame is one step of its own length', () => {
    expect(planSteps(1 / 60)).toEqual({ steps: 1, dt: 1 / 60, dropped: 0 });
    expect(planSteps(1 / 144).steps).toBe(1);
    expect(planSteps(1 / 30).steps).toBe(1);
  });
  it('a long frame is split into equal steps no longer than the limit', () => {
    const p = planSteps(0.08);
    expect(p.steps).toBe(3);
    expect(p.dt).toBeLessThanOrEqual(1 / 30 + 1e-12);
    expect(p.steps * p.dt + p.dropped).toBeCloseTo(0.08, 12);
  });
  it('catch-up is bounded: a stall drops the extra time', () => {
    const p = planSteps(2);
    expect(p.steps).toBe(3);
    expect(p.dropped).toBeCloseTo(2 - 0.1, 9);
    expect(planSteps(0)).toEqual({ steps: 0, dt: 0, dropped: 0 });
  });
});

describe('profile', () => {
  it('attributes frame time to sections and ranks them', () => {
    const p = createProfiler({ window: 10 });
    for (let f = 0; f < 5; f++) { p.begin('render', 0); p.end('render', 6); p.begin('sim', 6); p.end('sim', 8); p.frame(); }
    expect(p.report()).toEqual([{ name: 'render', avg: 6, p99: 6 }, { name: 'sim', avg: 2, p99: 2 }]);
  });
});
