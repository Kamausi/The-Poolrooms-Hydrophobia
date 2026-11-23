// The consequence stage, from the audit ("an explicit consequence stage at every dock"). When the raft leaves a dock,
// the crew says what was left behind and what it changes on the water ahead, in the same words every time, and the
// journal's field notes keep it under that attraction. The effects themselves are the game's own: restoring the
// circuit opens the service gate (main.js), the way-out choice rewrites the outlet (main.js), and leaving a dock dark
// leaves the next stretch of channel on emergency light (ride.js). Pure and unit-tested.

/** How much of the light the next stretch keeps when you leave a dock without power. */
export const DARK_STRETCH = 0.5;

/**
 * What leaving this dock means. `powered`: the circuit was restored; `routeMod`: the way-out choice ('flooded',
 * 'drained', 'bypass' or none). Returns { sector, lines: [{ did, so }], dim, text }.
 */
export function departure({ sector, powered = false, routeMod = null, water = null }) {
  const lines = [];
  if (powered) lines.push({ did: 'The circuit is restored', so: 'the service gate stands open and the way out is lit' });
  else lines.push({ did: 'You left the dock dark', so: 'the channel ahead runs on emergency light', dim: true });
  if (powered && routeMod === 'flooded') lines.push({ did: 'You raised the pool', so: 'the outlet is flooded: fast, deep, with things in it' });
  if (powered && routeMod === 'drained') lines.push({ did: 'You drained the water away', so: 'the outlet is exposed and rough' });
  if (powered && routeMod === 'bypass') lines.push({ did: 'You kept the water circulating', so: 'the bypass is calm' });
  // The head of water (flow.js), when anything moved it: one line naming the level both modes set.
  if (water) lines.push({ did: 'The water', so: water });
  return { sector, lines, dim: lines.some((l) => l.dim), text: lines.map((l) => `${l.did}: ${l.so}.`) };
}

/** Whether position `s` on the raft is in the dark stretch after a dock left unpowered: [from, to] metres, or null. */
export const inDarkStretch = (range, s) => !!range && s >= range[0] && s < range[1];
