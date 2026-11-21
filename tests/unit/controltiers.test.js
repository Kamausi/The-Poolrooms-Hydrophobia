import { describe, it, expect } from 'vitest';
import { TIERS, tierOf, byTier, referenceRows, tipAllowed, PRIMARY_SHOTS, PRIMARY_SECONDS } from '../../src/controltiers.js';
import { ACTIONS } from '../../src/settings.js';

describe('control tiers', () => {
  it('every rebindable action has a tier, and the audit\'s primary set is primary', () => {
    for (const [id] of ACTIONS) expect(TIERS[id], id).toBeDefined();
    for (const id of ['aim', 'fire', 'forward', 'use', 'scan']) expect(tierOf(id)).toBe('primary');
    for (const id of ['brace', 'patch', 'paddle']) expect(tierOf(id)).toBe('contextual');
    for (const id of ['cycle', 'burst', 'autopilot', 'helm']) expect(tierOf(id)).toBe('advanced');
    expect(tierOf('something-new')).toBe('advanced');
  });
  it('groups rows in tier order and keeps their order inside a tier', () => {
    const g = byTier([['cycle', 'x'], ['use', 'y'], ['brace', 'z'], ['hop', 'w']]);
    expect(g.map((x) => x.tier)).toEqual(['primary', 'contextual', 'advanced']);
    expect(g[0].rows.map((r) => r[0])).toEqual(['use', 'hop']);
    expect(byTier([['use', 'y']]).length).toBe(1);
  });
  it('the reference lists aim, fire and movement first with the device\'s own labels', () => {
    const label = (id) => ({ forward: 'W', left: 'A', back: 'S', right: 'D' }[id] || id.toUpperCase());
    const keys = referenceRows(ACTIONS, { label });
    expect(keys.slice(0, 3).map((r) => r[2])).toEqual(['mouse', 'click', 'WASD']);
    expect(referenceRows(ACTIONS, { pad: true, label }).slice(0, 3).map((r) => r[2])).toEqual(['right stick', 'RT', 'left stick']);
    expect(keys.length).toBe(ACTIONS.length + 2 - 3); // aim and fire added, four movement rows become one
    expect(keys.find((r) => r[0] === 'use')[2]).toBe('USE');
  });
  it('an advanced tip waits until the primary actions are in hand; others never wait', () => {
    expect(tipAllowed('profiles', { shots: 0, time: 100 })).toBe(false);
    expect(tipAllowed('profiles', { shots: PRIMARY_SHOTS, time: PRIMARY_SECONDS - 1 })).toBe(false);
    expect(tipAllowed('profiles', { shots: PRIMARY_SHOTS, time: PRIMARY_SECONDS })).toBe(true);
    expect(tipAllowed('steer', {})).toBe(true);
    expect(tipAllowed('patch', {})).toBe(true);
  });
});
