// Corridors that change, the last of the audit's Drift effects. At high Drift, once per dock and never in the first
// attraction, a corridor you walked down a while ago is tiled over when you come back: old tile, as if it had always
// been a wall. It is a real wall while it stands (you cannot walk through it, and nothing routes through it).
//
// It must never trap anyone, so a corridor cell is closed only if every other open cell can still be reached from
// where you stand, and only while you are not looking at it and nobody (you, the crew, anything hunting) is in it or
// next to it. It opens again, also only while unseen, when Drift falls back or after a while. Pure and unit-tested.

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** How many open cells can be reached from `start` without passing `skip` ([x, z] or null). */
export function reachable(open, W, H, start, skip = null) {
  const key = (x, z) => z * W + x;
  const seen = new Set([key(...start)]);
  const stack = [start];
  while (stack.length) {
    const [x, z] = stack.pop();
    for (const [dx, dz] of DIRS) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H || !open(nx, nz)) continue;
      if (skip && nx === skip[0] && nz === skip[1]) continue;
      const k = key(nx, nz);
      if (seen.has(k)) continue;
      seen.add(k); stack.push([nx, nz]);
    }
  }
  return seen.size;
}

/** Whether closing `cell` leaves every other open cell reachable from `start`. */
export function safeToClose(open, W, H, start, cell) {
  if (start[0] === cell[0] && start[1] === cell[1]) return false;
  return reachable(open, W, H, start, cell) === reachable(open, W, H, start) - 1;
}

/**
 * Choose the corridor cell to close: one of `cands` ([x, z], corridor cells you have walked through), at least
 * `minAgo` seconds since you were there (`lastAt(cell)` gives when), not `busy` (someone in or next to it), not
 * `seen` (in view now), and safe to close. Returns [x, z] or null.
 */
export function chooseClosure(cands, { open, W, H, start, now, lastAt, minAgo = 20, busy = (_c) => false, seen = (_c) => false }) {
  for (const c of cands) {
    const t = lastAt(c);
    if (t == null || now - t < minAgo || busy(c) || seen(c)) continue;
    if (safeToClose(open, W, H, start, c)) return c;
  }
  return null;
}
