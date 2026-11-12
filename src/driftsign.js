// High Drift as a facility state: the lit signs stop being about the building and start being about you.
// Signs that carry information you need to solve something are never touched, so Drift can unsettle a room
// without making it unfair. Pure: explore.js builds a second panel for each eligible sign and swaps them.

/** Text that must stay true: puzzle orders, valve and relay labels, locker numbers, anything remembered. */
const KEEP = /ORDER|VALVE|LIGHTING|PRESSURE|KEYPAD|CODE|STOPPED HERE|^\d|\d{4}/;

/**
 * What a sign reads at high Drift, or null if it must not change.
 * @param {string} text the sign's own text @param {string} style its label style @param {string | number} band the player's wristband
 */
export function driftSign(text, style, band) {
  if (style === 'uv' || style === 'hand' || KEEP.test(text)) return null;
  const lines = String(text).split('\n').length;
  const own = [`GUEST ${band}`, 'PLEASE REMAIN', 'YOU ARE EXPECTED'];
  return own.slice(0, Math.max(1, Math.min(3, lines))).join('\n');
}

/** Whether the state is on, with hysteresis so it does not flicker at the edge. */
export function driftState(on, drift, enter = 70, leave = 55) {
  return on ? drift >= leave : drift >= enter;
}
