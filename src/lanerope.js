// The Lane Rope's body: a racing lane line, a row of disc floats strung on a steel cable between two stainless
// anchors in the pool wall. Each hit target (a "float" in the game rules) is a short run of discs, so popping one
// leaves a visible gap in the line. Every disc shares one cylinder geometry and one of two materials, so a rope of
// thirty discs draws as two instanced batches. The layout is pure and unit-tested; `createLaneRope` only places parts.
import { cylinder, box, torus } from './shapes.js';
import { writeBasis, writeSegment, hide, add, sub, scale, normalize, cross } from './math.js';

/** Discs per hit target and their spacing along the cable, in metres. */
export const DISCS = 6;
export const SPACING = 0.105;

/**
 * Disc centres for one target: `discs` points around `centre`, spaced along the unit vector `dir`.
 * Colours alternate in blocks of two, the way a lane line reads from the deck.
 * @param {number[]} centre
 * @param {number[]} dir
 * @param {number} [discs]
 * @param {number} [spacing]
 * @returns {{ pos: number[], red: boolean }[]}
 */
export function discLayout(centre, dir, discs = DISCS, spacing = SPACING) {
  const out = [];
  for (let k = 0; k < discs; k++) {
    const t = (k - (discs - 1) / 2) * spacing;
    out.push({ pos: [centre[0] + dir[0] * t, centre[1] + dir[1] * t, centre[2] + dir[2] * t], red: Math.floor(k / 2) % 2 === 0 });
  }
  return out;
}

/**
 * Build the parts for one rope with `targets` hit targets. `P(name, geometry, material)` makes and registers a part.
 * Returns the parts grouped for placement; `place` positions them, `hideAll` hides them.
 */
export function createLaneRope(P, label, targets, { emission = 0.35 } = {}) {
  const disc = cylinder(14, 0, 1);
  const red = { color: [0.88, 0.24, 0.08], metallic: 0, roughness: 0.45, emission, emissiveColor: [1, 0.35, 0.1] };
  const white = { color: [0.9, 0.9, 0.86], metallic: 0, roughness: 0.4, emission: Math.max(0.02, emission * 0.4), emissiveColor: [1, 0.95, 0.85] };
  const steel = { color: [0.75, 0.77, 0.76], metallic: 0.9, roughness: 0.3 };
  const layout = discLayout([0, 0, 0], [1, 0, 0]);
  const rope = {
    cable: P(`${label} cable`, cylinder(8, 0, 1), steel),
    discs: Array.from({ length: targets }, (_, j) => layout.map((d, k) => P(`${label} disc ${j}.${k}`, disc, d.red ? red : white))),
    anchors: [0, 1].map((i) => ({ plate: P(`${label} anchor plate ${i}`, box(0.04, 2), steel), eye: P(`${label} anchor eye ${i}`, torus(0.25, 20, 8), steel) })),
  };
  /**
   * Place the rope from wall point `a` to wall point `b` (cable height), with target centres `centres`, `alive[j]`
   * for each target, a vertical bob per target (metres, by target index), and which ends meet a wall: an anchor is
   * only drawn where there is a wall to bolt it to.
   */
  rope.place = (a, b, centres, alive, bob = (/** @type {number} */ _j) => 0, walls = [true, true]) => {
    const dir = normalize(sub(b, a));
    writeSegment(rope.cable.matrix, a, b, 0.012);
    const up = [0, 1, 0], side = normalize(cross(up, dir));
    centres.forEach((c, j) => {
      const parts = rope.discs[j];
      if (!alive[j]) { parts.forEach(hide); return; }
      const centre = add(c, [0, bob(j), 0]);
      discLayout(centre, dir).forEach((d, k) => writeBasis(parts[k].matrix, d.pos, side, dir, up, 0.075, 0.045, 0.075));
    });
    // Anchors: a stainless plate flat on the wall, an eye bolt the cable runs to.
    [a, b].forEach((p, i) => {
      if (!walls[i]) { hide(rope.anchors[i].plate); hide(rope.anchors[i].eye); return; }
      const n = i === 0 ? dir : scale(dir, -1);
      writeBasis(rope.anchors[i].plate.matrix, add(p, scale(n, -0.03)), side, up, n, 0.16, 0.22, 0.02);
      writeBasis(rope.anchors[i].eye.matrix, p, side, n, up, 0.06, 0.06, 0.06);
    });
  };
  rope.hideAll = () => { hide(rope.cable); rope.discs.flat().forEach(hide); rope.anchors.forEach((x) => { hide(x.plate); hide(x.eye); }); };
  rope.all = () => [rope.cable, ...rope.discs.flat(), ...rope.anchors.flatMap((x) => [x.plate, x.eye])];
  return rope;
}
