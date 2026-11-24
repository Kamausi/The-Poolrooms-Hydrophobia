// The architectural credibility pass (the audit: "how public spaces, plant rooms and drainage relate"). A dock map is
// a building with plumbing, so two rules hold on every map, authored or generated:
//
// - Drainage: every pool (a connected body of wadeable water) has main drains in its floor, at least one and about
//   one for every eight cells, spread over the pool rather than bunched, and never in the cell next to another drain.
// - Plant to water: every machine that works the water (the service panel S, the pump control C, the water-level
//   control Q, the fountain panel o) has a service pipe run to the water it serves: the shortest way over the floor
//   from the machine to the nearest pool edge, which the scene hangs under the ceiling.
//
// Pure and unit-tested; `tests/maps.mjs` checks both rules on every map.

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Cells that belong to a pool. */
export const POOL = new Set(['~', 'u', 'L', 'r', 'f', 'o']);
/** Machines that work the water. */
export const MACHINES = ['S', 'C', 'Q', 'o'];
/** Cells a service pipe may run over (it hangs under the ceiling, so anything that is not wall). */
const PASS = (ch) => ch && ch !== '#';

/** One main drain for about this many pool cells. */
export const CELLS_PER_DRAIN = 8;

const at = (map, x, z) => map[z]?.[x];

/** The pools: connected regions of pool cells, each a list of [x, z]. */
export function pools(map) {
  const H = map.length, W = map[0].length, seen = new Set(), out = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (!POOL.has(at(map, x, z)) || seen.has(`${x},${z}`)) continue;
    const region = [], q = [[x, z]];
    seen.add(`${x},${z}`);
    while (q.length) {
      const [cx, cz] = q.pop();
      region.push([cx, cz]);
      for (const [dx, dz] of DIRS) {
        const nx = cx + dx, nz = cz + dz, k = `${nx},${nz}`;
        if (!seen.has(k) && POOL.has(at(map, nx, nz))) { seen.add(k); q.push([nx, nz]); }
      }
    }
    out.push(region);
  }
  return out;
}

/**
 * Where the main drains go: for each pool, ceil(cells / CELLS_PER_DRAIN) drains, chosen farthest-first so they spread
 * over the pool, on wadeable water ('~') where there is any, never in a cell next to another drain. Returns [x, z]s.
 */
export function planDrains(map) {
  const out = [];
  for (const region of pools(map)) {
    const floor = region.filter(([x, z]) => at(map, x, z) === '~');
    const cands = floor.length ? floor : region;
    const want = Math.max(1, Math.ceil(region.length / CELLS_PER_DRAIN));
    // Start from the cell nearest the pool's middle; then always the candidate farthest from every drain so far.
    const mx = region.reduce((a, c) => a + c[0], 0) / region.length, mz = region.reduce((a, c) => a + c[1], 0) / region.length;
    const chosen = [cands.reduce((b, c) => (Math.hypot(c[0] - mx, c[1] - mz) < Math.hypot(b[0] - mx, b[1] - mz) ? c : b))];
    while (chosen.length < want) {
      let best = null, bestD = 1;
      for (const c of cands) {
        const d = Math.min(...chosen.map((o) => Math.abs(o[0] - c[0]) + Math.abs(o[1] - c[1])));
        if (d > bestD) { best = c; bestD = d; }
      }
      if (!best) break; // the pool is too small for another drain that is not next to one
      chosen.push(best);
    }
    out.push(...chosen);
  }
  return out;
}

/**
 * The service pipe from a machine at [x, z] to the nearest pool edge: the shortest run over non-wall cells, from the
 * machine to the first cell that borders a pool (or is one, for a machine standing in the water). Returns the cells,
 * machine first, or null when no water can be reached.
 */
export function serviceRun(map, from) {
  const key = (x, z) => `${x},${z}`;
  const prev = new Map([[key(...from), null]]);
  const q = [from];
  const wet = (x, z) => POOL.has(at(map, x, z)) || DIRS.some(([dx, dz]) => POOL.has(at(map, x + dx, z + dz)));
  while (q.length) {
    const c = q.shift();
    if (wet(...c)) {
      const path = [];
      for (let k = key(...c), p = c; p; p = prev.get(k), k = p && key(...p)) path.unshift(p);
      return path;
    }
    for (const [dx, dz] of DIRS) {
      const n = [c[0] + dx, c[1] + dz], k = key(...n);
      if (!prev.has(k) && PASS(at(map, ...n))) { prev.set(k, c); q.push(n); }
    }
  }
  return null;
}

/** Every machine's service run on a map: [{ machine, at: [x, z], run }]. */
export function serviceRuns(map) {
  const out = [];
  map.forEach((row, z) => [...row].forEach((ch, x) => { if (MACHINES.includes(ch)) out.push({ machine: ch, at: [x, z], run: serviceRun(map, [x, z]) }); }));
  return out;
}

/**
 * The credibility problems on a map, as text (empty when it is credible): a pool without a drain, a drain next to
 * another, a machine with no water to serve.
 */
export function problems(map) {
  const out = [];
  const drains = planDrains(map), keyed = new Set(drains.map((d) => d.join()));
  for (const region of pools(map)) if (!region.some((c) => keyed.has(c.join()))) out.push(`pool at ${region[0]} has no drain`);
  for (const d of drains) if (drains.some((o) => o !== d && Math.abs(o[0] - d[0]) + Math.abs(o[1] - d[1]) <= 1)) out.push(`drains bunched at ${d}`);
  for (const s of serviceRuns(map)) if (!s.run) out.push(`machine ${s.machine} at ${s.at} serves no water`);
  return out;
}
