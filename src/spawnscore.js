// Where to bring something in. Never in front of you unless a set piece says so: candidates are scored for being
// at the right distance, out of sight, along the way you are going, and not used a moment ago.
// Pure: the caller supplies candidates and the tests (sight, distance); this ranks them.

/**
 * @param {{ pos: number[], id?: string }[]} candidates
 * @param {{ eye: number[], forward: number[], visible: (p: number[]) => boolean, near?: number, far?: number,
 *   ahead?: number[] | null, recent?: Map<string, number>, now?: number, random?: () => number }} o
 *   visible(p): true if the player could see p now. ahead: where the player is heading (optional).
 * @returns {{ pos: number[], id?: string, score: number }[]} best first; candidates in plain sight score below zero
 */
export function scoreSpawns(candidates, { eye, forward, visible, near = 6, far = 18, ahead = null, recent = new Map(), now = 0, random = Math.random }) {
  const out = [];
  for (const c of candidates) {
    const dx = c.pos[0] - eye[0], dz = c.pos[2] - eye[2];
    const d = Math.hypot(dx, dz);
    let score = 0;
    // Distance: best in the middle of the band, nothing too close, little too far.
    if (d < near) score -= 3;
    else if (d > far) score -= (d - far) * 0.15;
    else score += 1 - Math.abs(d - (near + far) / 2) / ((far - near) / 2) * 0.5;
    // Out of sight is the point.
    const seen = visible(c.pos);
    if (seen) score -= 4;
    else score += 1.5;
    // In front of the player's eyes but behind a wall is better than behind them: they will meet it.
    const facing = d > 1e-3 ? (dx * forward[0] + dz * forward[2]) / d : 0;
    if (!seen) score += Math.max(0, facing) * 0.6;
    if (ahead) { const da = Math.hypot(c.pos[0] - ahead[0], c.pos[2] - ahead[2]); score += Math.max(0, 1 - da / far) * 0.8; }
    // Not the same place twice in a row.
    const key = c.id ?? `${Math.round(c.pos[0])},${Math.round(c.pos[2])}`;
    const last = recent.get(key);
    if (last !== undefined && now - last < 20) score -= 2 * (1 - (now - last) / 20);
    score += random() * 0.2; // ties break differently each time
    out.push({ ...c, id: key, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** The best candidate that is out of sight, or null. Remembers it in `recent`. */
export function pickSpawn(candidates, o) {
  const best = scoreSpawns(candidates, o).find((c) => c.score > 0) || null;
  if (best && o.recent) o.recent.set(best.id, o.now ?? 0);
  return best;
}
