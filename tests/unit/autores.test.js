import { describe, it, expect } from 'vitest';
import { createAutoRes } from '../../src/autores.js';

const feed = (a, ms, seconds) => { for (let t = 0; t < seconds * 1000; t += ms) a.push(ms); };

describe('automatic resolution', () => {
  it('holds full scale when frames are on target', () => {
    const a = createAutoRes();
    feed(a, 16.7, 20);
    expect(a.scale).toBe(1);
  });
  it('steps down after two bad seconds, and no lower than half', () => {
    const a = createAutoRes();
    feed(a, 25, 2.2);
    expect(a.scale).toBe(0.9);
    feed(a, 40, 60);
    expect(a.scale).toBe(0.5);
  });
  it('comes back up slowly when there is room', () => {
    const a = createAutoRes();
    feed(a, 30, 9);
    const low = a.scale;
    feed(a, 10, 5.5);
    expect(a.scale).toBeCloseTo(low + 0.05, 5);
    feed(a, 10, 120);
    expect(a.scale).toBe(1);
  });
  it('ignores a single hitch', () => {
    const a = createAutoRes();
    feed(a, 16.7, 1.5); a.push(900); feed(a, 16.7, 3);
    expect(a.scale).toBe(1);
  });
  it('uses the 30 FPS target when asked', () => {
    const a = createAutoRes({ target: 33.3 });
    feed(a, 30, 20);
    expect(a.scale).toBe(1);
  });
});
