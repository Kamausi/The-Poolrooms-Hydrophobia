import { describe, it, expect } from 'vitest';
import { createVoicePool, priorityOf, PRIORITY } from '../../src/voicepool.js';

describe('the voice pool', () => {
  it('plays freely under the limit and refuses a fourth copy of the same sound', () => {
    const p = createVoicePool({ max: 8, perName: 3 });
    for (let i = 0; i < 3; i++) expect(p.admit('tick', 1, 1, 0).ok).toBe(true);
    expect(p.admit('tick', 1, 1, 0).ok).toBe(false);
    expect(p.admit('hurt', 4, 1, 0).ok).toBe(true);
  });
  it('when full, a more important sound takes the place of the least important one; an equal one is refused', () => {
    const p = createVoicePool({ max: 3, perName: 9 });
    p.admit('a', 1, 2, 0); p.admit('b', 2, 2, 0); p.admit('c', 2, 2, 0);
    const r = p.admit('hurt', 4, 1, 0);
    expect(r.ok).toBe(true); expect(r.victim.name).toBe('a');
    expect(p.admit('d', 2, 1, 0).ok).toBe(false);
  });
  it('finished voices free their place', () => {
    const p = createVoicePool({ max: 1 });
    p.admit('a', 1, 0.5, 0);
    expect(p.admit('b', 1, 0.5, 0.2).ok).toBe(false);
    expect(p.admit('b', 1, 0.5, 0.6).ok).toBe(true);
  });
  it('priorities: being hurt and the whistle outrank gunfire, which outranks footsteps', () => {
    expect(priorityOf('hurt')).toBe(PRIORITY.critical); expect(priorityOf('whistle')).toBe(PRIORITY.critical);
    expect(priorityOf('scatter')).toBeGreaterThan(priorityOf('footstep'));
    expect(priorityOf('something-unlisted')).toBe(PRIORITY.normal);
  });
});
