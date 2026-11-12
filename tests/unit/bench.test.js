import { describe, it, expect } from 'vitest';
import { summarize, report } from '../../src/bench.js';

describe('the benchmark report', () => {
  it('summarises frame times', () => {
    const s = summarize([...Array(98).fill(10), 20, 100]);
    expect(s.frames).toBe(100); expect(s.median).toBe(10); expect(s.p99).toBe(100); expect(s.worst).toBe(100);
    expect(s.average).toBeCloseTo(11); expect(s.fps).toBeCloseTo(90.91, 1);
    expect(summarize([])).toBeNull();
  });
  it('prints the GPU, tier, resolution, numbers and errors', () => {
    const t = report({ gpu: 'Some GPU', tier: 'high', auto: true, width: 1920, height: 1080, dpr: 2, scale: 0.8, errors: [] }, summarize([16, 17, 18]));
    for (const w of ['Some GPU', 'high (auto)', '1920 x 1080', '80%', 'median', '99th', 'errors       none']) expect(t).toContain(w);
    expect(report({ gpu: 'x', tier: 'low', auto: false, width: 1, height: 1, dpr: 1, scale: 1, errors: ['boom'] }, null)).toContain('boom');
  });
});
