// Which controller buttons press or hold which keys, by context. Every button is taken on the raft, so on foot
// the two that have no job there are reused: look-back opens the survey map and patch cycles the work lamp.
// Pure: input.js polls the pad and applies these tables.

/**
 * @param {'ride' | 'explore'} context
 * @param {Record<string, number>} M action id → button index (after the player's rebinding)
 * @returns {{ edge: Record<number, string>, hold: Record<number, string>, patchHeld: boolean }}
 *   edge: button → key pressed once; hold: button → key held; patchHeld: whether the patch button is a hold here.
 */
export function padTables(context, M) {
  const edge = { [M.hop]: ' ', [M.use]: 'e', [M.burst]: 'f', 9: 'escape', [M.recharge]: 'r', [M.dressing]: 'h', [M.cycle]: 'tab' };
  const hold = { [M.boost]: 'shift', [M.hop]: ' ', [M.ping]: 'b' };
  if (context === 'explore') {
    edge[M.lookback] = 'm';
    edge[M.patch] = 'l';
    return { edge, hold, patchHeld: false };
  }
  hold[M.lookback] = 'x';
  return { edge, hold, patchHeld: true };
}
