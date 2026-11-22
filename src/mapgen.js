// Generated dock layouts for endless mode, by wave function collapse (Maxim Gumin's WFC, 2016, in its "simple tiled"
// form), checked by the same solvability rules as the authored maps.
//
// The authored maps teach which kinds of cell sit next to which: wall, floor or water, in each of the four
// directions, with how often. A generated map keeps everything that makes the dock work exactly where the authored
// one has it (the dock, cells, the machine, doors, keypads, objects, and the ring of cells around each) and the
// outer wall, and lets WFC fill the plain terrain between them: each open cell starts able to be any kind, the cell
// with the fewest options left is decided (weighted by how common that kind is), and every neighbour loses the kinds
// that can no longer sit next to it. A contradiction restarts with the next seed. A result is used only if
// `solvable` passes; otherwise the authored map is used. Deterministic for a seed. Pure and unit-tested.
import { rng } from './math.js';

/** The three kinds of terrain WFC decides. Everything else in a map is a feature and is kept. */
export const KINDS = ['#', '.', '~'];
const WATERY = new Set(['~', 'u', 'L', 'f', 'R', 'r', '>', '<', '^', 'v', 'x', 'o', 'w', 'd']);
/** The kind of terrain a map character stands on. */
export const kindOf = (c) => (c === '#' ? '#' : WATERY.has(c) ? '~' : '.');
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Adjacency rules learned from maps: for each kind and direction, which kinds may be next to it (with counts), and
 * how common each kind is overall.
 */
export function learn(maps) {
  const allow = KINDS.map(() => DIRS.map(() => new Map()));
  const freq = new Map(KINDS.map((k) => [k, 1]));
  for (const map of maps) {
    for (let z = 0; z < map.length; z++) for (let x = 0; x < map[z].length; x++) {
      const a = KINDS.indexOf(kindOf(map[z][x]));
      freq.set(KINDS[a], freq.get(KINDS[a]) + 1);
      DIRS.forEach(([dx, dz], d) => {
        const c = map[z + dz]?.[x + dx];
        if (c === undefined) return;
        const b = kindOf(c);
        allow[a][d].set(b, (allow[a][d].get(b) || 0) + 1);
      });
    }
  }
  return { allow, freq };
}

/**
 * Run WFC over a W × H grid. `fixed[z][x]` is a kind already decided, or null for a cell to decide. Returns rows of
 * kinds, or null on a contradiction.
 */
export function collapse(rules, fixed, random) {
  const H = fixed.length, W = fixed[0].length;
  const all = (1 << KINDS.length) - 1;
  const opts = fixed.map((row) => row.map((k) => (k ? 1 << KINDS.indexOf(k) : all)));
  const okNext = (a, d, b) => rules.allow[a][d].has(KINDS[b]);
  const propagate = (stack) => {
    while (stack.length) {
      const [x, z] = stack.pop();
      DIRS.forEach(([dx, dz], d) => {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) return;
        let keep = 0;
        for (let b = 0; b < KINDS.length; b++) {
          if (!(opts[nz][nx] & (1 << b))) continue;
          for (let a = 0; a < KINDS.length; a++) if (opts[z][x] & (1 << a) && okNext(a, d, b)) { keep |= 1 << b; break; }
        }
        if (keep !== opts[nz][nx]) { opts[nz][nx] = keep; stack.push([nx, nz]); }
      });
    }
  };
  const start = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (fixed[z][x]) start.push([x, z]);
  propagate(start);
  for (;;) {
    let best = null, fewest = Infinity;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const o = opts[z][x];
      if (!o) return null; // contradiction
      const n = bits(o);
      if (n > 1 && n + random() * 0.1 < fewest) { fewest = n + random() * 0.1; best = [x, z]; }
    }
    if (!best) break;
    const [x, z] = best, o = opts[z][x];
    const choices = KINDS.map((k, i) => (o & (1 << i) ? rules.freq.get(k) : 0));
    let r = random() * choices.reduce((a, b) => a + b, 0), pick = 0;
    for (; pick < choices.length; pick++) { r -= choices[pick]; if (r <= 0 && choices[pick] > 0) break; }
    opts[z][x] = 1 << Math.min(pick, KINDS.length - 1);
    propagate([[x, z]]);
  }
  return opts.map((row) => row.map((o) => KINDS[Math.log2(o)]));
}
const bits = (o) => { let n = 0; for (; o; o &= o - 1) n++; return n; };

/**
 * The same rules as tests/maps.mjs: from the dock, the cell candidates (P) and the machine (S) are reachable once the
 * puzzle doors open; quiet rooms (Q), caches (C) and the restroom (R) before; keypads (K) and gates (G) can be
 * approached from outside; D, P and S exist. T cells come in linked pairs.
 */
export function solvable(map) {
  const g = map.map((r) => [...r]), H = g.length, W = g[0]?.length || 0;
  if (!g.every((r) => r.length === W)) return false;
  const find = (ch) => { const o = []; g.forEach((r, z) => r.forEach((c, x) => c === ch && o.push([x, z]))); return o; };
  for (const ch of 'DPS') if (!find(ch).length) return false;
  const T = find('T');
  const reach = (startCell, open) => {
    const seen = new Set([startCell.join()]), q = [startCell];
    while (q.length) {
      const [x, z] = q.shift();
      const nb = [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]];
      const ti = T.findIndex(([a, b]) => a === x && b === z);
      if (ti >= 0 && T[ti ^ 1]) nb.push(T[ti ^ 1]);
      for (const [nx, nz] of nb) {
        const c = g[nz]?.[nx];
        if (!c || c === '#' || c === 'x' || c === 'o') continue;
        if (!open && (c === 'B' || c === 'K' || c === 'G')) continue;
        const k = `${nx},${nz}`;
        if (!seen.has(k)) { seen.add(k); q.push([nx, nz]); }
      }
    }
    return seen;
  };
  const D = find('D')[0], closed = reach(D, false), opened = reach(D, true);
  const has = (set, cells) => cells.every((c) => set.has(c.join()));
  if (!has(opened, [...find('P'), ...find('S')])) return false;
  if (!has(closed, [...find('Q'), ...find('C'), ...find('R')])) return false;
  for (const [x, z] of [...find('K'), ...find('G')]) if (![[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]].some((c) => closed.has(c.join()))) return false;
  return true;
}

/**
 * A generated variation of `base` (rows of characters): features and the ring around each kept, the outer wall kept,
 * plain terrain regenerated by WFC with rules learned from `corpus`. Tries `tries` seeds; returns
 * { map, seed, tries } for the first solvable one, or { map: base, fallback: true }.
 */
export function generateDock(base, corpus, seed, { tries = 24, rules = learn(corpus) } = {}) {
  const H = base.length, W = base[0].length;
  const feature = (c) => c !== '#' && c !== '.' && c !== '~';
  const keep = base.map((row, z) => [...row].map((c, x) => {
    if (x === 0 || z === 0 || x === W - 1 || z === H - 1) return true;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (feature(base[z + dz]?.[x + dx] ?? '#')) return true;
    return false;
  }));
  for (let t = 0; t < tries; t++) {
    const random = rng(seed * 7919 + t * 104729 + 1);
    const fixed = base.map((row, z) => [...row].map((c, x) => (keep[z][x] ? kindOf(c) : null)));
    const out = collapse(rules, fixed, random);
    if (!out) continue;
    const map = base.map((row, z) => [...row].map((c, x) => (keep[z][x] ? c : out[z][x])).join(''));
    if (solvable(map)) return { map, seed, tries: t + 1 };
  }
  return { map: base, fallback: true };
}

/** How many cells differ between two maps (for tests and the debug report). */
export function changed(a, b) {
  let n = 0;
  for (let z = 0; z < a.length; z++) for (let x = 0; x < a[z].length; x++) if (a[z][x] !== b[z]?.[x]) n++;
  return n;
}
