// Aim help and threat direction, as pure geometry in screen space (x right, y up, both −1…1 at the view's edge).
//
//   magnet    a controller's shot bends a little toward a target the reticle is already near. Never a snap, never
//             across the screen: the pull is strongest at the target and gone at the edge of a small radius.
//   friction  the right stick slows as the reticle crosses a target, so a thumb can stop on it.
//   wedge     where on the rim of the view to point for a threat that is off-screen or behind.
//
// The reticle is drawn where the shot will go, so the help is visible, not a hidden lie.

const nearest = (aim, points) => {
  let best = null, bd = Infinity;
  for (const p of points) {
    if (!p) continue;
    const d = Math.hypot(p[0] - aim[0], p[1] - aim[1]);
    if (d < bd) { bd = d; best = p; }
  }
  return best ? { p: best, d: bd } : null;
};

/**
 * @param {number[]} aim current reticle [x, y]
 * @param {(number[] | null)[]} points projected targets
 * @param {{ radius?: number, pull?: number }} [o] pull 0…1: how far toward the target at zero distance
 * @returns {number[]} the assisted reticle
 */
export function magnet(aim, points, { radius = 0.2, pull = 0.6 } = {}) {
  const n = nearest(aim, points);
  if (!n || n.d >= radius || pull <= 0) return [aim[0], aim[1]];
  const k = Math.min(1, pull) * (1 - n.d / radius);
  return [aim[0] + (n.p[0] - aim[0]) * k, aim[1] + (n.p[1] - aim[1]) * k];
}

/** Stick speed multiplier: 1 away from targets, down to min on top of one. */
export function friction(aim, points, { radius = 0.16, min = 0.45 } = {}) {
  const n = nearest(aim, points);
  if (!n || n.d >= radius) return 1;
  return min + (1 - min) * (n.d / radius);
}

/**
 * Where to draw a wedge for a point relative to the camera. rel is the vector from the eye to the threat; fwd,
 * right and up are the camera's unit axes; tanHalf is tan(fov / 2) vertically.
 * Returns null when the point is comfortably on screen; otherwise { x, y, angle, behind } with x, y on the rim
 * (inset) and angle in degrees clockwise from "up" for the wedge to point outward.
 */
export function wedge(rel, fwd, right, up, tanHalf, aspect, inset = 0.9) {
  const z = rel[0] * fwd[0] + rel[1] * fwd[1] + rel[2] * fwd[2];
  let x = rel[0] * right[0] + rel[1] * right[1] + rel[2] * right[2];
  let y = rel[0] * up[0] + rel[1] * up[1] + rel[2] * up[2];
  if (z > 0.1) {
    const sx = x / (z * tanHalf * aspect), sy = y / (z * tanHalf);
    if (Math.abs(sx) < 1 && Math.abs(sy) < 1) return null;
    x = sx; y = sy;
  } else {
    // Behind: only the side matters, and "directly behind" is drawn at the bottom of the view.
    y = -Math.abs(z) - Math.abs(y) * 0.2;
  }
  const m = Math.max(Math.abs(x), Math.abs(y), 1e-6);
  const ex = (x / m) * inset, ey = (y / m) * inset;
  return { x: ex, y: ey, angle: (Math.atan2(ex, ey) * 180) / Math.PI, behind: z <= 0.1 };
}

/** The few most urgent wedges. threats: { rel, urgency }. */
export function wedges(threats, fwd, right, up, tanHalf, aspect, max = 3) {
  const out = [];
  for (const t of threats) {
    const w = wedge(t.rel, fwd, right, up, tanHalf, aspect);
    if (w) out.push({ ...w, urgency: t.urgency });
  }
  return out.sort((a, b) => b.urgency - a.urgency).slice(0, max);
}
