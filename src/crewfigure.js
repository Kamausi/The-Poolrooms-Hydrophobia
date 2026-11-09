// The crew as figures: one build, two poses (seated in the raft, walking on foot). Read by silhouette first,
// colour second: Mars's safety helmet, Dez's brimmed cap, Tubs broad in a beanie, June tall in a pale hood and
// long coat. Procedural, with no skeleton: the stand-in until there are rigged crew models (see docs/PRODUCTION.md).
import { box, cylinder, sphere } from '67js';
import { add, scale, normalize, cross, writeBasis, writeSegment, hide, linear } from './math.js';

export const CREW_LOOK = {
  mars: { jacket: '#3a4a5c', vest: '#b19a50', hat: '#b19a50', hatKind: 'helmet', tall: 1, broad: 1 },
  dez: { jacket: '#22324a', vest: '#9a8445', hat: '#1b2738', hatKind: 'cap', tall: 1.02, broad: 0.95 },
  tubs: { jacket: '#8a8278', vest: '#a8823a', hat: '#2b2a27', hatKind: 'beanie', tall: 1.05, broad: 1.3 },
  june: { jacket: '#c9c6b8', vest: '#b46a3c', hat: '#bdbaac', hatKind: 'hood', tall: 1.08, broad: 0.85, coat: true },
};
/** A guest in the water: faded swimwear grey, a park flotation vest, bare-headed. */
export const VISITOR_LOOK = { jacket: '#7d8784', vest: '#b46a3c', hat: '#3a3530', hatKind: 'none', tall: 1, broad: 0.95 };

const UP = [0, 1, 0];
const skin = { color: [0.5, 0.38, 0.3], metallic: 0, roughness: 0.65 };
const glove = { color: [0.1, 0.1, 0.09], metallic: 0, roughness: 0.95 };
const boots = { color: [0.06, 0.06, 0.06], metallic: 0, roughness: 0.8 };

/** P(name, geometry, material) is the scene's part factory. */
export function createCrewFigure(P, id, tag = '', look = null) {
  const L = look || CREW_LOOK[id];
  const cloth = { color: linear(L.jacket), metallic: 0, roughness: 0.8 };
  const trousers = { color: L.coat ? linear(L.jacket).map((c) => c * 0.85) : [0.08, 0.09, 0.1], metallic: 0, roughness: 0.85 };
  const n = (what) => `Crew ${what} ${id}${tag}`;
  const f = {
    id, L,
    body: P(n('body'), cylinder(14, 0.4, 2), cloth),
    vest: P(n('vest'), box(0.04, 2), { color: linear(L.vest).map((c) => c * 0.8), metallic: 0, roughness: 0.8 }),
    shoulders: P(n('shoulders'), box(0.35, 3), cloth),
    armL: P(n('arm L'), cylinder(10, 0.45, 2), cloth),
    armR: P(n('arm R'), cylinder(10, 0.45, 2), cloth),
    handL: P(n('hand L'), box(0.4, 2), glove),
    handR: P(n('hand R'), box(0.4, 2), glove),
    legL: P(n('leg L'), cylinder(10, 0.4, 2), trousers),
    legR: P(n('leg R'), cylinder(10, 0.4, 2), trousers),
    footL: P(n('boot L'), box(0.35, 2), boots),
    footR: P(n('boot R'), box(0.35, 2), boots),
    head: P(n('head'), sphere(14, 10), skin),
    hat: P(n('hat'), sphere(16, 10), { color: linear(L.hat), metallic: 0, roughness: L.hatKind === 'helmet' ? 0.5 : 0.9 }),
    brim: P(n('brim'), box(0.2, 2), { color: linear(L.hat), metallic: 0, roughness: 0.9 }),
  };
  f.all = [f.body, f.vest, f.shoulders, f.armL, f.armR, f.handL, f.handR, f.legL, f.legR, f.footL, f.footR, f.head, f.hat, f.brim];
  return f;
}

export function hideCrewFigure(f) {
  f.all.forEach(hide);
}

function headwear(f, head, rgt, upL, fwd) {
  const k = f.L.hatKind;
  if (k === 'helmet') writeBasis(f.hat.matrix, add(head, scale(upL, 0.06)), rgt, upL, fwd, 0.118, 0.075, 0.128);
  else if (k === 'cap') writeBasis(f.hat.matrix, add(head, scale(upL, 0.065)), rgt, upL, fwd, 0.104, 0.06, 0.11);
  else if (k === 'beanie') writeBasis(f.hat.matrix, add(head, scale(upL, 0.07)), rgt, upL, fwd, 0.104, 0.085, 0.11);
  else if (k === 'hood') writeBasis(f.hat.matrix, add(add(head, scale(upL, 0.025)), scale(fwd, -0.02)), rgt, upL, fwd, 0.128, 0.142, 0.13);
  else writeBasis(f.hat.matrix, add(add(head, scale(upL, 0.03)), scale(fwd, -0.03)), rgt, upL, fwd, 0.1, 0.1, 0.1); // wet hair
  if (k === 'cap') writeBasis(f.brim.matrix, add(add(head, scale(upL, 0.05)), scale(fwd, 0.11)), rgt, upL, fwd, 0.16, 0.015, 0.1);
  else hide(f.brim);
}

/** Upper body shared by both poses: torso from hip to shoulders, vest, shoulders, head and headwear. */
function upper(f, hip, upL, rgt, fwd, torso) {
  const B = f.L.broad;
  const sh = add(hip, scale(upL, torso));
  writeBasis(f.body.matrix, add(hip, scale(upL, torso / 2)), rgt, upL, fwd, 0.17 * B, torso * (f.L.coat ? 1.12 : 1), 0.14 * B);
  writeBasis(f.vest.matrix, add(hip, scale(upL, torso * 0.62)), rgt, upL, fwd, 0.36 * B, torso * 0.5, 0.31 * B);
  writeBasis(f.shoulders.matrix, sh, rgt, upL, fwd, 0.42 * B, 0.11, 0.2 * B);
  const head = add(sh, scale(upL, 0.17));
  writeBasis(f.head.matrix, head, rgt, upL, fwd, 0.095, 0.115, 0.105);
  headwear(f, head, rgt, upL, fwd);
  return sh;
}

/**
 * Seated low on the raft's tube. p: the seat point; upL: the leaning up axis; side: which gunwale (-1 left, 1 right);
 * stroke: the paddle stroke offset; duck: how far they hunch when bracing.
 */
export function poseSeated(f, { p, rgt, fwd, up, upL, side, stroke = 0, duck = 0 }) {
  const B = f.L.broad;
  const h = 0.5 * f.L.tall - duck;
  const sh = upper(f, p, upL, rgt, fwd, h * 0.9);
  // Arms down to the rope on the gunwale, gripping; the paddle stroke pulls them back and forth.
  for (const [arm, hand, k] of [[f.armL, f.handL, -1], [f.armR, f.handR, 1]]) {
    const shoulder = add(sh, scale(rgt, 0.2 * B * k));
    const grip = add(add(add(p, scale(rgt, (0.24 * B + 0.08) * k + (k === side ? 0.06 : -0.02))), scale(fwd, 0.16 + stroke * k)), scale(up, 0.06 + duck * 0.3));
    writeSegment(arm.matrix, shoulder, grip, 0.05 * B);
    writeBasis(hand.matrix, grip, rgt, upL, fwd, 0.08, 0.06, 0.1);
  }
  // Legs folded forward into the raft, mostly hidden by the tube.
  for (const [leg, foot, k] of [[f.legL, f.footL, -1], [f.legR, f.footR, 1]]) {
    const hip = add(p, scale(rgt, 0.09 * B * k));
    const knee = add(add(hip, scale(fwd, 0.38)), scale(up, 0.08));
    writeSegment(leg.matrix, hip, knee, 0.075 * B);
    writeBasis(foot.matrix, add(knee, scale(up, -0.2)), rgt, up, fwd, 0.12, 0.1, 0.24);
  }
}

/**
 * Standing or walking on foot. feet: ground point under the figure; yaw: facing; walk: stride phase (radians);
 * pace: 0 standing … 1 running; drop: how far they are lowered (kneeling beside you, waist-deep water).
 * arms: optional { L, R } hand offsets from the shoulder as [forward, up, outward] in metres, for an authored
 * gesture (a habit, a check of the tool, a hand braced on something).
 */
export function poseStanding(f, { feet, yaw, walk = 0, pace = 0, drop = 0, arms = null }) {
  const B = f.L.broad;
  const fwd = [Math.sin(yaw), 0, Math.cos(yaw)];
  const rgt = normalize(cross(UP, fwd)); // keeps the basis right-handed, so faces stay outward
  const H = 1.72 * f.L.tall;
  const legLen = H * 0.47 - drop * 0.6;
  const bob = Math.abs(Math.sin(walk)) * 0.03 * pace;
  const hip = add(feet, [0, Math.max(0.25, legLen) + bob, 0]);
  const lean = normalize(add(UP, scale(fwd, 0.08 * pace)));
  const sh = upper(f, hip, lean, rgt, fwd, H * 0.3);
  const swing = Math.sin(walk) * 0.32 * pace;
  for (const [leg, foot, k, ph] of [[f.legL, f.footL, -1, 1], [f.legR, f.footR, 1, -1]]) {
    const h = add(hip, scale(rgt, 0.09 * B * k));
    const step = scale(fwd, swing * ph);
    const lift = Math.max(0, Math.cos(walk) * ph) * 0.09 * pace;
    const ground = add(add(add(feet, scale(rgt, 0.1 * B * k)), step), [0, 0.05 + lift, 0]);
    writeSegment(leg.matrix, h, ground, 0.075 * B);
    writeBasis(foot.matrix, add(ground, scale(fwd, 0.05)), rgt, UP, fwd, 0.12, 0.09, 0.26);
  }
  // Arms swing against the legs; kneeling, the near arm reaches down to you.
  for (const [arm, hand, k, ph] of [[f.armL, f.handL, -1, -1], [f.armR, f.handR, 1, 1]]) {
    const shoulder = add(sh, scale(rgt, 0.21 * B * k));
    const reach = drop > 0.3 && k === 1 ? scale(fwd, 0.45) : scale(fwd, swing * ph * 0.8 + 0.06);
    const g = arms?.[k === 1 ? 'R' : 'L'];
    const hand0 = g ? add(add(add(shoulder, scale(fwd, g[0])), [0, g[1], 0]), scale(rgt, g[2] * k)) : add(add(add(shoulder, [0, -0.56, 0]), reach), scale(rgt, 0.05 * k));
    writeSegment(arm.matrix, shoulder, hand0, 0.05 * B);
    writeBasis(hand.matrix, hand0, rgt, UP, fwd, 0.07, 0.1, 0.08);
  }
}

/**
 * Face down in the water: the torso along dir, arms spread, legs trailing under the surface. at: chest point
 * at the waterline; dir: the way the head points (horizontal); drift: a slow phase for the limbs.
 */
export function poseProne(f, { at, dir, drift = 0 }) {
  const B = f.L.broad;
  const down = [0, -1, 0];
  const rgt = normalize(cross(dir, down));
  const hip = add(at, scale(dir, -0.32));
  const sh = upper(f, hip, dir, rgt, down, 0.5);
  for (const [arm, hand, k] of [[f.armL, f.handL, -1], [f.armR, f.handR, 1]]) {
    const shoulder = add(sh, scale(rgt, 0.2 * B * k));
    const hand0 = add(add(add(shoulder, scale(rgt, (0.5 + Math.sin(drift + k) * 0.05) * k)), scale(dir, 0.22)), [0, -0.12, 0]);
    writeSegment(arm.matrix, shoulder, hand0, 0.05 * B);
    writeBasis(hand.matrix, hand0, rgt, dir, down, 0.08, 0.1, 0.05);
  }
  for (const [leg, foot, k] of [[f.legL, f.footL, -1], [f.legR, f.footR, 1]]) {
    const h = add(hip, scale(rgt, 0.09 * B * k));
    const end = add(add(add(h, scale(dir, -0.8)), scale(rgt, (0.1 + Math.sin(drift * 0.7 + k) * 0.03) * k)), [0, -0.25, 0]);
    writeSegment(leg.matrix, h, end, 0.075 * B);
    writeBasis(foot.matrix, end, rgt, dir, down, 0.11, 0.24, 0.09);
  }
}
