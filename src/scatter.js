// Spreading things over a dock map: Poisson-disc sampling by dart throwing over the floor cells. Candidates are tried
// in random order and one is taken only if it is at least `min` cells from everything taken so far, so pickups,
// clocks, notices and lockers end up spread over the map instead of clumped in one corner, and the layout still
// comes from the sector's seed. When nothing far enough is left, the free cell furthest from the rest is taken.
// Pure and unit-tested.

/** Euclidean distance between two cells [x, z]. */
const gap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Take one cell from `cells` (removed from the array) at least `min` from every cell in `taken` (which it is added
 * to). `random` is the seeded generator. Returns the cell, or undefined when `cells` is empty.
 * @param {number[][]} cells
 * @param {number[][]} taken
 * @param {() => number} random
 */
export function takeSpread(cells, taken, random, min = 3) {
  if (!cells.length) return undefined;
  // Dart throwing: a few random picks, the first that keeps its distance wins.
  for (let tries = 0; tries < 24; tries++) {
    const i = Math.floor(random() * cells.length);
    if (taken.every((t) => gap(t, cells[i]) >= min)) return keep(cells, i, taken);
  }
  // Nothing far enough after the darts: the cell furthest from everything taken.
  let best = 0, far = -1;
  cells.forEach((c, i) => { const d = taken.length ? Math.min(...taken.map((t) => gap(t, c))) : 0; if (d > far) { far = d; best = i; } });
  return keep(cells, best, taken);
}

function keep(cells, i, taken) {
  const c = cells.splice(i, 1)[0];
  taken.push(c);
  return c;
}

/** The smallest distance between any two of `cells` (for tests). */
export function closestPair(cells) {
  let m = Infinity;
  for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) m = Math.min(m, gap(cells[a], cells[b]));
  return m;
}
