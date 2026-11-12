// Perception: how an entity comes to know where you are. Awareness rises with what it can see (in line of sight,
// close, lit) and hear (shots, running, splashing), and falls when it has neither. It remembers where it last
// sensed you. Pure: the scene supplies the senses each frame; this keeps the state.
//
//   unaware     below 0.3: it does not act on you
//   suspicious  0.3 to 1: it goes to where it last sensed you, slowly
//   aware       1: it knows; it stays aware for `memory` seconds after losing you, then cools

export const STATES = ['unaware', 'suspicious', 'aware'];

/** @param {{ awareness?: number, lastKnown?: number[] | null }} [o] */
export function createPerceiver({ awareness = 0, lastKnown = null } = {}) {
  return { awareness, lastKnown, state: awareness >= 1 ? 'aware' : awareness >= 0.3 ? 'suspicious' : 'unaware', sinceSensed: 0 };
}

/**
 * One frame of senses.
 * @param {ReturnType<typeof createPerceiver>} p
 * @param {{ seen?: boolean, distance?: number, lit?: number, noise?: number, at?: number[] }} s
 *   seen: in line of sight · distance: metres · lit: 0..1 how visible you are · noise: 0..1 how loud · at: where
 * @param {number} dt
 * @param {{ range?: number, hearing?: number, close?: number, memory?: number }} [o]
 */
export function sense(p, s, dt, { range = 18, hearing = 14, close = 3.5, memory = 6 } = {}) {
  const d = s.distance ?? Infinity;
  let gain = 0;
  if (s.seen && d < range) {
    if (d < close) gain = 99; // too close not to know
    else gain += 2.4 * (1 - d / range) * (0.35 + 0.65 * (s.lit ?? 1));
  }
  if ((s.noise || 0) > 0 && d < hearing) gain += 6 * s.noise * (1 - d / hearing);
  if (gain > 0) {
    p.awareness = Math.min(1, p.awareness + gain * dt);
    p.sinceSensed = 0;
    if (s.at) p.lastKnown = [...s.at];
  } else {
    p.sinceSensed += dt;
    // Aware things hold on for a while; then everything cools.
    if (p.awareness < 1 || p.sinceSensed > memory) p.awareness = Math.max(0, p.awareness - dt * (p.awareness >= 1 ? 0.25 : 0.12));
  }
  p.state = p.awareness >= 1 ? 'aware' : p.awareness >= 0.3 ? 'suspicious' : 'unaware';
  return p.state;
}
