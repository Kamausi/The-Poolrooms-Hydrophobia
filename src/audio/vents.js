// Sound through vents, from the audit ("sound through vents"). On foot a sound behind a wall is muffled (audio
// occlusion). But the facility is ducted: if the sound is near a ceiling vent and you are near another, it reaches you
// through the ducts instead, from the vent's direction, thin and metallic. A footstep in the next room can come from
// above you. Pure and unit-tested; audio.js plays it, explore.js places the vents.

/** How close a sound or a listener must be to a vent for the ducts to carry it (metres). */
export const VENT_REACH = 7;
/** Sound loses less along a duct than through open air: a metre of duct counts as this much. */
export const DUCT_FACTOR = 0.5;

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Choose which vents carry a sound. `src` and `me` are positions, `vents` a list of positions, `sees(a, b)` whether
 * there is a clear line between two points. Returns { at, from, gain } (the vent you hear it from, the vent it went
 * into, how loud it arrives, 0..1) or null when the ducts do not carry it.
 */
export function ventRoute(src, me, vents, { sees = (_a, _b) => true, reach = VENT_REACH } = {}) {
  const nearest = (p) => {
    let best = null, bd = reach;
    for (const v of vents) { const d = dist(p, v); if (d < bd && sees(p, v)) { bd = d; best = v; } }
    return best;
  };
  const from = nearest(src), at = nearest(me);
  if (!from || !at || from === at) return null;
  const length = dist(src, from) + dist(from, at) * DUCT_FACTOR + dist(at, me);
  const gain = Math.max(0.15, Math.min(0.8, 1 - length / 40));
  return { at, from, gain };
}

/** Where vents go: every cell that `ok(x, z)` allows and whose `seed(x, z)` (0..1) is under `share`. */
export function ventCells(cells, { ok = (_x, _z) => true, seed, share = 0.12 }) {
  return cells.filter(([x, z]) => ok(x, z) && seed(x, z) < share);
}
