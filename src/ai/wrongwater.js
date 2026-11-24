// Water that subtly breaks the facility's physical rules (the audit's water section). Everything else about the
// water is careful physics (waterfx.js, waterlook.js, float.js), so a single wrong thing reads as wrong. Two are built,
// each once per place and never explained:
//
// - On foot, rings that run backwards: they arrive from outside on still water, narrow and close on a point where
//   nothing has touched it. Once per dock, from the second attraction, while it is quiet, where you can see it.
// - On the raft, a stretch of fast channel where the current streaks slide upstream past the walls while the raft is
//   carried down. Once per attraction, from the second.
//
// Neither hurts or changes the run. The crew notice only if one of them is there to see it, and only then does it
// enter the ledger (memory.js: nothing enters the ledger except when the crew witnesses it). Pure and unit-tested.

/** The first attraction (by index) with wrong water: the first one teaches what the water normally does. */
export const FROM_SECTOR = 1;

/** When the backwards rings start, after the first (s): three, one after another, closing on the same point. */
export const RING_TIMES = [0, 0.7, 1.4];

/** How far from you the backwards rings may close (m): near enough to see clearly, far enough not to be underfoot. */
export const RING_NEAR = 4, RING_FAR = 12;

/** Section types with a current to run against. */
const FAST = new Set(['channel', 'flume', 'overflow', 'tube']);

/**
 * The stretch of channel where the streaks run upstream: [from, to] metres, or null. `ranges` are the track's sections
 * ({ s0, s1, sec: { type, speed } }); the stretch is inside one fast section at least 60 m long, past its first third.
 */
export function upstreamStretch(ranges, { sectorIndex, random = Math.random }) {
  if (sectorIndex < FROM_SECTOR) return null;
  const cands = ranges.filter((r) => FAST.has(r.sec.type) && (r.sec.speed ?? 0) >= 5 && r.s1 - r.s0 >= 60);
  if (!cands.length) return null;
  const r = cands[Math.floor(random() * cands.length)];
  const len = r.s1 - r.s0, s0 = r.s0 + len / 3;
  return [s0, s0 + Math.min(40, len / 2)];
}

/** The flow the streaks are drawn with at `s`: the current's, reversed inside the stretch. */
export const streakFlow = (flow, stretch, s) => (stretch && s >= stretch[0] && s < stretch[1] ? -flow : flow);

/**
 * Where the backwards rings close: the first of `cands` ([x, y, z] water-surface points) between RING_NEAR and
 * RING_FAR metres from `from` that `see(p)` says is in view. Returns the point or null.
 */
export function ringSpot(cands, from, see = (_p) => true) {
  for (const p of cands) {
    const d = Math.hypot(p[0] - from[0], p[2] - from[2]);
    if (d >= RING_NEAR && d <= RING_FAR && see(p)) return p;
  }
  return null;
}

/** May the wrong water happen here now? Once per place, from FROM_SECTOR, only while it is quiet. */
export const mayHappen = ({ sectorIndex, done, quiet }) => sectorIndex >= FROM_SECTOR && !done && quiet;
