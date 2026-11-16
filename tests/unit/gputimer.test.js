import { describe, it, expect } from 'vitest';
import { createGpuTimer } from '../../src/render/gputimer.js';

// A stand-in WebGL 2 context: queries finish two frames after they end.
function fakeGl(withExt = true) {
  let frame = 0, disjoint = false;
  const ext = { TIME_ELAPSED_EXT: 1, GPU_DISJOINT_EXT: 2 };
  return {
    QUERY_RESULT_AVAILABLE: 3, QUERY_RESULT: 4,
    getExtension: (n) => (withExt && n === 'EXT_disjoint_timer_query_webgl2' ? ext : null),
    createQuery: () => ({}),
    beginQuery() {}, endQuery() {},
    getParameter: (p) => (p === 2 ? disjoint : null),
    getQueryParameter(q, p) { q.done ??= frame + 2; return p === 3 ? frame >= q.done : 4.5e6; },
    tick() { frame++; }, set disjoint(v) { disjoint = v; },
  };
}

describe('gputimer', () => {
  it('is absent when the browser hides the timer query', () => {
    expect(createGpuTimer(fakeGl(false))).toBeNull();
  });
  it('reports milliseconds once a query finishes, a few frames late', () => {
    const gl = fakeGl(), t = createGpuTimer(gl);
    const seen = [];
    for (let i = 0; i < 6; i++) { t.begin(); t.end(); seen.push(t.collect()); gl.tick(); }
    expect(seen[0]).toBeNull();
    expect(seen.at(-1)).toBeCloseTo(4.5);
  });
  it('drops pending results after a disjoint event', () => {
    const gl = fakeGl(), t = createGpuTimer(gl);
    t.begin(); t.end(); gl.disjoint = true;
    expect(t.collect()).toBeNull();
  });
});
