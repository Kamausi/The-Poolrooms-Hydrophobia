import { describe, it, expect } from 'vitest';
import { describeAI } from '../../src/debug/aiview.js';

describe('aiview', () => {
  it('says what each entity senses and intends', () => {
    const t = describeAI({
      phase: 'build', me: [0, 0, 0], habits: { scanning: 0.8, rushing: 0, hurt: 0.2, lingering: 0 },
      blooms: [{ active: true, pos: [3, 1, 4], perc: { state: 'aware', awareness: 1, sinceSensed: 0.5, lastKnown: [1, 0, 1] }, pur: { mode: 'pursue' }, commit: true, windup: 0.3 }, { active: false, pos: [0, 0, 0] }],
      lifeguard: { state: 'search', violations: 2, pos: [9, 0, 9] },
      attendant: { trust: 2, t: 4, cool: 0, d: { kind: 'wait', lie: true, count: 4 } }, learned: { stepAways: 2, spent: false },
      followers: [{ id: 'june', pos: [1, 0, 2], vel: [3, 4], route: { path: [[0, 0], [1, 1]] } }],
    });
    expect(t).toMatch(/DIRECTOR build/);
    expect(t).toMatch(/BLOOM 0 {2}5\.0 m · aware 1\.0 .* pursue · HOLDS A SLOT · SWELLING 0\.3s/);
    expect(t).not.toMatch(/BLOOM 1/);
    expect(t).toMatch(/LIFEGUARD search · warnings 2/);
    expect(t).toMatch(/CREW JUNE .* speed 5\.0 · route 2 cells/);
    expect(t).toMatch(/scan 0\.8/);
    expect(t).toMatch(/ATTENDANT trust 2 · wait \(FALSE: says 4 guests\) 4\.0s · burst dodged 2x/);
  });
});
