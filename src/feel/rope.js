// A floating line as a Verlet rope: point masses joined by distance constraints, pinned at the two wall anchors.
// Gravity pulls every point down; a point with a float under it is pushed back up by how deep it sits (buoyancy as a
// stiff spring about the waterline). So the Lane Rope rests on the water, a hit sends a dip running along it, and
// where a target is shot away the line loses its floats and sags between its neighbours.
//
// Coordinates are local to the rope: x along it from the first anchor (metres), y up from the waterline.
// Verlet: x' = x + (x - x_prev)·damping + a·dt². Pure and unit-tested: no DOM, no renderer.

/**
 * @param {{ length: number, points?: number, slack?: number, gravity?: number, lift?: number, damping?: number }} o
 *   length between anchors (m); points (≥ 3); slack: rope length over anchor distance (under 1: the line is
 *   tensioned, as a lane line is, so a dip travels along it); lift: buoyancy stiffness
 *   (1/s², a float sits g/lift below the line); damping per step (water drag).
 */
export function createRope({ length, points = 17, slack = 0.995, gravity = 9.81, lift = 200, damping = 0.965 }) {
  const n = Math.max(3, points | 0);
  const rest = (length * slack) / (n - 1);
  const nodes = Array.from({ length: n }, (_, i) => {
    const x = (length * i) / (n - 1);
    return { x, y: 0, px: x, py: 0, float: i > 0 && i < n - 1 };
  });
  const pinned = (i) => i === 0 || i === n - 1;

  function step(dt, iterations = 8) {
    const h = Math.min(dt, 1 / 30);
    const sub = h > 1 / 90 ? 2 : 1, d = h / sub;
    for (let k = 0; k < sub; k++) {
      for (let i = 1; i < n - 1; i++) {
        const p = nodes[i];
        const ay = -gravity + (p.float && p.y < 0 ? -p.y * lift : 0);
        const vx = (p.x - p.px) * damping, vy = (p.y - p.py) * damping;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + ay * d * d;
      }
      for (let it = 0; it < iterations; it++) {
        for (let i = 0; i < n - 1; i++) {
          const a = nodes[i], b = nodes[i + 1];
          const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1e-9;
          if (l <= rest) continue; // a rope pulls, it does not push
          const f = (l - rest) / l;
          const wa = pinned(i) ? 0 : pinned(i + 1) ? 1 : 0.5, wb = pinned(i + 1) ? 0 : pinned(i) ? 1 : 0.5;
          a.x += dx * f * wa; a.y += dy * f * wa;
          b.x -= dx * f * wb; b.y -= dy * f * wb;
        }
      }
    }
  }

  const index = (u) => Math.max(0, Math.min(n - 1, u * (n - 1)));

  return {
    nodes,
    step,
    /** Kick the rope at fraction u (0..1) with a vertical speed (m/s, negative is down), spread over neighbours. */
    kick(u, speed) {
      const c = index(u);
      for (let i = 1; i < n - 1; i++) {
        const w = Math.max(0, 1 - Math.abs(i - c) / 1.5);
        if (w > 0) nodes[i].py = nodes[i].y - speed * w * (1 / 60);
      }
    },
    /** Floats on or off for the nodes between fractions u0 and u1 (a target shot away loses its floats). */
    floats(u0, u1, on) {
      for (let i = 1; i < n - 1; i++) { const u = i / (n - 1); if (u >= u0 && u <= u1) nodes[i].float = on; }
    },
    /** Height of the rope (m, from the waterline) at fraction u, interpolated. */
    heightAt(u) {
      const f = index(u), i = Math.min(n - 2, Math.floor(f)), t = f - i;
      return nodes[i].y * (1 - t) + nodes[i + 1].y * t;
    },
    /** Lowest point of the rope (m). */
    lowest() { return Math.min(...nodes.map((p) => p.y)); },
  };
}

/** Run a rope until it settles (for building one at rest). */
export function settle(rope, seconds = 3) {
  for (let t = 0; t < seconds; t += 1 / 60) rope.step(1 / 60);
  return rope;
}
