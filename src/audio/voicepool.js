// How many sounds may play at once, and which give way. Without a limit a firefight piles up dozens of one-shots
// and the important ones (a hit, the whistle, a crewmate's warning) drown. Pure: the audio code asks, this answers.
//
//   admit(name, priority, seconds, now) → { ok, victim }
//     ok: play it. victim: a voice to stop first to make room (a lower priority one), or null.
//   A sound already playing more than `perName` times is refused, so repeats do not stack into a wall.

export const PRIORITY = { critical: 4, high: 3, normal: 2, low: 1 };

/** Priority by sound name; anything not listed is normal. */
export const SOUND_PRIORITY = {
  hurt: 'critical', whistle: 'critical', release: 'critical', intake: 'critical', grab: 'critical',
  gate: 'high', wrong: 'high', burst: 'high', scatter: 'high', disrupt: 'high', chime: 'high', radio: 'high', door: 'high', thump: 'high',
  footstep: 'low', tick: 'low', uiMove: 'low', bubbles: 'low', clicks: 'low', floatKnock: 'low', stroke: 'low', hiss: 'low', breath: 'low',
};
export const priorityOf = (name) => PRIORITY[SOUND_PRIORITY[name] || 'normal'];

export function createVoicePool({ max = 24, perName = 3 } = {}) {
  /** @type {{ id: number, name: string, priority: number, ends: number, handle: any }[]} */
  let live = [];
  let next = 1;
  return {
    get count() { return live.length; },
    get live() { return live; },
    admit(name, priority, seconds, now, handle = null) {
      live = live.filter((v) => v.ends > now);
      if (live.filter((v) => v.name === name).length >= perName) return { ok: false, victim: null };
      let victim = null;
      if (live.length >= max) {
        // Give way: the lowest priority, then the one closest to finishing.
        const low = live.reduce((a, b) => (b.priority < a.priority || (b.priority === a.priority && b.ends < a.ends) ? b : a));
        if (low.priority >= priority) return { ok: false, victim: null };
        victim = low;
        live = live.filter((v) => v !== low);
      }
      const v = { id: next++, name, priority, ends: now + Math.max(0.01, seconds), handle };
      live.push(v);
      return { ok: true, victim, voice: v };
    },
  };
}
