// The survey map: what the crew has actually walked. Nothing is drawn that has not been seen, and nothing drawn
// is false, so it can be trusted even when the room cannot. Pure: explore.js feeds it cells, the HUD prints it.

/** @returns {{ W: number, H: number, seen: Uint8Array, marks: Record<string, number[]>, done: boolean }} */
export function createSurvey(W, H, seenIndices = [], rememberedIndices = []) {
  const s = { W, H, seen: new Uint8Array(W * H), old: new Uint8Array(W * H), marks: {}, done: false };
  for (const i of seenIndices) if (i >= 0 && i < W * H) s.seen[i] = 1;
  // What an earlier expedition surveyed here. Drawn apart from what has been seen this time, never mixed with it.
  for (const i of rememberedIndices) if (i >= 0 && i < W * H) s.old[i] = 1;
  return s;
}

/** Cells to carry to the next expedition: everything seen this time, plus what was already remembered. */
export const carryList = (s) => { const out = []; for (let i = 0; i < s.seen.length; i++) if (s.seen[i] || s.old[i]) out.push(i); return out; };

/** Remembered cells that are walls now: places the last survey walked that this room does not have. */
export function disagreements(s, isWall) {
  let n = 0;
  for (let i = 0; i < s.old.length; i++) if (s.old[i] && isWall(i % s.W, Math.floor(i / s.W))) n += 1;
  return n;
}

/**
 * Standing in cell (x, z): record it and the open cells you can see along the four straight lines from it, up to
 * `reach` cells, stopping at the first wall. Returns how many cells were new.
 * @param {(x: number, z: number) => boolean} isWall
 */
export function visit(s, x, z, isWall, reach = 2) {
  if (x < 0 || z < 0 || x >= s.W || z >= s.H || isWall(x, z)) return 0;
  let fresh = 0;
  const mark = (cx, cz) => { const i = cz * s.W + cx; if (!s.seen[i]) { s.seen[i] = 1; fresh += 1; } };
  mark(x, z);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let k = 1; k <= reach; k++) {
      const cx = x + dx * k, cz = z + dz * k;
      if (cx < 0 || cz < 0 || cx >= s.W || cz >= s.H || isWall(cx, cz)) break;
      mark(cx, cz);
    }
  }
  return fresh;
}

/** Note something found at a cell (the panel, a machine, a find): drawn only once its cell has been seen. */
export function mark(s, glyph, x, z) { s.marks[`${x},${z}`] = [x, z, glyph.codePointAt(0)]; }

/** Fraction of the walkable cells that have been seen. open: list of [x, z]. */
export function coverage(s, open) {
  if (!open.length) return 1;
  let n = 0;
  for (const [x, z] of open) if (s.seen[z * s.W + x]) n += 1;
  return n / open.length;
}

export const seenList = (s) => { const out = []; for (let i = 0; i < s.seen.length; i++) if (s.seen[i]) out.push(i); return out; };

/**
 * Draw it as text, one string per row. Seen floor is '·', seen water '≈', a wall is drawn only where it borders
 * something seen, everything else is blank. A cell only remembered from an earlier expedition is '∘'; if that
 * cell is a wall now it is '?': the old survey walked there and this room has no such place. you: [x, z, facing] with facing 0..3 (north, east, south, west).
 * @param {(x: number, z: number) => string} at the room's own cell character
 */
export function render(s, at, isWall, { you = null, raft = null } = {}) {
  const seen = (x, z) => x >= 0 && z >= 0 && x < s.W && z < s.H && !!s.seen[z * s.W + x];
  const rows = [];
  for (let z = 0; z < s.H; z++) {
    let row = '';
    for (let x = 0; x < s.W; x++) {
      let c = ' ';
      if (seen(x, z)) {
        const ch = at(x, z);
        c = ch === '~' || ch === 'u' ? '≈' : '·';
        const m = s.marks[`${x},${z}`];
        if (m) c = String.fromCodePoint(m[2]);
        if (raft && raft[0] === x && raft[1] === z) c = 'R';
        if (you && you[0] === x && you[1] === z) c = '▲▶▼◀'[you[2] ?? 0];
      } else if (s.old[z * s.W + x]) c = isWall(x, z) ? '?' : '∘';
      else if (isWall(x, z) && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dz]) => seen(x + dx, z + dz))) c = '█';
      row += c;
    }
    rows.push(row);
  }
  // Trim blank margins so a small surveyed corner is not a small dot in a large blank sheet.
  while (rows.length > 1 && !rows[0].trim()) rows.shift();
  while (rows.length > 1 && !rows[rows.length - 1].trim()) rows.pop();
  const left = Math.min(...rows.map((r) => (r.trim() ? r.search(/\S/) : Infinity)));
  return Number.isFinite(left) ? rows.map((r) => r.slice(left).replace(/\s+$/, '')) : [''];
}
