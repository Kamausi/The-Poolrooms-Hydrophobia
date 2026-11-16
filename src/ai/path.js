// Finding a way round walls on the dock maps, which are grids of cells. Two tools:
//
// - A* (Hart, Nilsson and Raphael, 1968) from one cell to another, for one walker with its own goal: 8-way moves,
//   no corner cutting past a wall, the octile distance as the heuristic (admissible on this grid, so the path is
//   the shortest).
// - A flow field: one breadth-first sweep of distances out from a goal (Dijkstra with the same move costs), after
//   which any number of walkers anywhere on the map read which way is downhill. A swarm closing on the player
//   shares one field, rebuilt only when the player changes cell.
//
// `open(x, z)` says whether a cell can be entered. Cells are [x, z] integers. Pure and unit-tested.

const SQ2 = Math.SQRT2;
const STEPS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];

/** May a walker step from (x, z) by (dx, dz)? Diagonals need both side cells open, so nothing squeezes past a corner. */
function canStep(open, x, z, dx, dz) {
  if (!open(x + dx, z + dz)) return false;
  return dx === 0 || dz === 0 || (open(x + dx, z) && open(x, z + dz));
}

const octile = (ax, az, bx, bz) => { const dx = Math.abs(ax - bx), dz = Math.abs(az - bz); return Math.max(dx, dz) + (SQ2 - 1) * Math.min(dx, dz); };

/** A small binary heap of [priority, value]. */
function heap() {
  const a = [];
  const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } };
  const down = (i) => { for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } };
  return {
    push(p, v) { a.push([p, v]); up(a.length - 1); },
    pop() { const top = a[0], last = a.pop(); if (a.length) { a[0] = last; down(0); } return top; },
    get size() { return a.length; },
  };
}

/**
 * A* from `start` to `goal` on a W × H grid. Returns the cells from start to goal inclusive, or null when the goal
 * cannot be reached. `limit` caps the cells searched, so a hopeless search on a big map stays cheap.
 */
export function findPath(open, W, H, start, goal, { limit = 4000 } = {}) {
  const key = (x, z) => z * W + x;
  const [sx, sz] = start, [gx, gz] = goal;
  if (!open(gx, gz) || !open(sx, sz)) return null;
  const g = new Map([[key(sx, sz), 0]]), from = new Map(), q = heap();
  q.push(octile(sx, sz, gx, gz), key(sx, sz));
  let searched = 0;
  while (q.size && searched++ < limit) {
    const [, k] = q.pop();
    const x = k % W, z = (k - x) / W;
    if (x === gx && z === gz) {
      const path = [[x, z]];
      for (let c = k; from.has(c);) { c = from.get(c); path.push([c % W, (c - (c % W)) / W]); }
      return path.reverse();
    }
    const gk = g.get(k);
    for (const [dx, dz, cost] of STEPS) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H || !canStep(open, x, z, dx, dz)) continue;
      const nk = key(nx, nz), ng = gk + cost;
      if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); from.set(nk, k); q.push(ng + octile(nx, nz, gx, gz), nk); }
    }
  }
  return null;
}

/**
 * A flow field toward `goal`: the travel cost from every reachable cell (Infinity where it cannot get there).
 * Returns { cost, W, H, goal }.
 */
export function flowField(open, W, H, goal) {
  const cost = new Float32Array(W * H).fill(Infinity);
  const [gx, gz] = goal;
  if (!open(gx, gz)) return { cost, W, H, goal };
  cost[gz * W + gx] = 0;
  const q = heap();
  q.push(0, gz * W + gx);
  while (q.size) {
    const [c, k] = q.pop();
    if (c > cost[k]) continue;
    const x = k % W, z = (k - x) / W;
    for (const [dx, dz, step] of STEPS) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H || !canStep(open, x, z, dx, dz)) continue;
      const nk = nz * W + nx, nc = c + step;
      if (nc < cost[nk]) { cost[nk] = nc; q.push(nc, nk); }
    }
  }
  return { cost, W, H, goal };
}

/** The neighbour cell to move to from (x, z) on a flow field (downhill), or null at the goal or when cut off. */
export function flowStep(field, open, x, z) {
  const { cost, W, H } = field;
  if (x < 0 || z < 0 || x >= W || z >= H) return null;
  const here = cost[z * W + x];
  if (!(here > 0) || here === Infinity) return null;
  let best = null, bc = here;
  for (const [dx, dz] of STEPS) {
    const nx = x + dx, nz = z + dz;
    if (nx < 0 || nz < 0 || nx >= W || nz >= H || !canStep(open, x, z, dx, dz)) continue;
    const c = cost[nz * W + nx];
    if (c < bc) { bc = c; best = [nx, nz]; }
  }
  return best;
}

/**
 * Where to head next along a path of cells, as a cell: the furthest cell ahead that can be seen straight from
 * here (`clear(fromCell, toCell)`), so walkers cut corners where they can instead of zig-zagging cell to cell.
 */
export function nextCorner(path, here, clear) {
  if (!path || path.length < 2) return null;
  let best = path[1];
  for (let i = 2; i < path.length; i++) { if (clear(here, path[i])) best = path[i]; else break; }
  return best;
}

/**
 * Whether a walker can go in a straight line from cell a to cell b with every cell on the way open (sampled at a
 * quarter cell, so a diagonal line does not slip between two blocked cells).
 */
export function straight(open, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.max(1, Math.ceil(Math.hypot(dx, dz) * 4));
  for (let i = 0; i <= n; i++) {
    const x = a[0] + 0.5 + (dx * i) / n, z = a[1] + 0.5 + (dz * i) / n;
    const cx = Math.floor(x), cz = Math.floor(z);
    if (!open(cx, cz)) return false;
    // Near a cell corner, both cells the line brushes must be open.
    const fx = x - cx, fz = z - cz;
    if ((fx < 0.15 || fx > 0.85) && (fz < 0.15 || fz > 0.85) && !(open(cx + (fx < 0.5 ? -1 : 1), cz) && open(cx, cz + (fz < 0.5 ? -1 : 1)))) return false;
  }
  return true;
}
