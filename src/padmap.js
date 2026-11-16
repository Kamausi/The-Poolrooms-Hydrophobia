// Which controller buttons press or hold which keys, by context. Every button is taken on the raft, so on foot
// the two that have no job there are reused: look-back opens the survey map and patch cycles the work lamp.
// Pure: input.js polls the pad and applies these tables.

/**
 * @param {'ride' | 'explore'} context
 * @param {Record<string, number>} M action id → button index (after the player's rebinding)
 * @returns {{ edge: Record<number, string>, hold: Record<number, string>, patchHeld: boolean, dressingOnRelease: boolean }}
 *   edge: button → key pressed once; hold: button → key held; patchHeld: whether the patch button is a hold here.
 */
export function padTables(context, M) {
  const edge = { [M.hop]: ' ', [M.use]: 'e', [M.burst]: 'f', 9: 'escape', [M.recharge]: 'r', [M.dressing]: 'h', [M.cycle]: 'tab' };
  // Select is also the chord button (CHORDS): when dressing is on Select it fires when Select is let go without a chord.
  const dressingOnRelease = M.dressing === SELECT;
  if (dressingOnRelease) delete edge[SELECT];
  const hold = { [M.boost]: 'shift', [M.hop]: ' ', [M.ping]: 'b' };
  if (context === 'explore') {
    edge[M.lookback] = 'm';
    edge[M.patch] = 'l';
    return { edge, hold, patchHeld: false, dressingOnRelease };
  }
  hold[M.lookback] = 'x';
  return { edge, hold, patchHeld: true, dressingOnRelease };
}

/** The chord button: held, it turns the face buttons into the actions that have no button of their own. */
export const SELECT = 8;

/**
 * Hold Select and press a face button. These are the actions every controller button is already taken for on the
 * raft: the maintenance override at a locked gate, setting the work lamp down or picking it up, Ride Control and
 * handing over the helm. button → [key the game reads, action id, label]
 */
export const CHORDS = {
  0: ['o', 'override', 'Select + A'],
  1: ['k', 'lampPlace', 'Select + B'],
  2: ['t', 'autopilot', 'Select + X'],
  3: ['y', 'helm', 'Select + Y'],
};

/** The chord label for an action, or null if it has none. */
export function chordLabel(id) {
  const c = Object.values(CHORDS).find(([, a]) => a === id);
  return c ? c[2] : null;
}
