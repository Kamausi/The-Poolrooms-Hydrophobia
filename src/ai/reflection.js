// Your reflection in still water, and the two Drift effects the audit names for it: a reflection that lags, and a
// reflection that acts on its own.
//
// Standing at the edge of still water you see yourself in it (a figure in your crew colours, upside down under the
// surface, leaning away from you to fit the pool's depth). Below the moderate Drift stage it follows you exactly.
// From the moderate stage it follows you late, by a fraction of a second, so a quick turn shows. At the high stage, once per dock and
// never in the first attraction, it stops following: it stays where it was and looks up at where you are now. It
// never comes out of the water and it never does anything to you; it is gone the moment you look away.
//
// Pure and unit-tested. The figure is posed by crewfigure.js and then turned over here, matrix by matrix.

import { driftStage } from './driftfx.js';

/** How far behind you the reflection is at the moderate stage and above (seconds). */
export const LAG_SECONDS = 0.6;
/** How close to still water you must stand to see yourself in it (metres from your feet to the image's). */
export const SEE_RANGE = 2.6;
/** How far you must walk from it, once it has stopped following, before it is caught out (metres). */
export const LEFT_BEHIND = 1.4;

/** What the reflection does at this much Drift: 'follow', 'lag' (from 50) or 'own' (from 70, where allowed). */
export function reflectionMode(drift, { sectorIndex = 0, spent = false } = {}) {
  const stage = driftStage(drift);
  if (stage === 'high' && sectorIndex > 0 && !spent) return 'own';
  return stage === 'moderate' || stage === 'high' ? 'lag' : 'follow';
}

/** The pose `delay` seconds ago from a history [{ t, feet, yaw }] (oldest first); the oldest one if none is that old. */
export function delayedPose(history, now, delay) {
  if (!history.length) return null;
  let pick = history[0];
  for (const h of history) { if (h.t <= now - delay) pick = h; else break; }
  return pick;
}

/** Keep a short history: drop entries older than `keep` seconds. */
export function trimHistory(history, now, keep = 2) {
  while (history.length > 1 && history[0].t < now - keep) history.shift();
  return history;
}

/**
 * Turn a posed part over, under the water: a half turn about the horizontal line through `pivot` along `axis` (the
 * figure's facing, toward the water), which puts the head straight down, then a lean of `tilt` radians that swings the
 * head away from you and the face up. Seen from the edge a reflection stretches away from you, and this way a whole
 * figure fits in shallow water. Both are rotations, so the part's basis stays right-handed and its faces outward. `m`
 * is a column-major 4×4 and is changed in place.
 */
export function turnUnder(m, pivot, axis, tilt = 0) {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const a = [axis[0] / len, axis[1] / len, axis[2] / len];
  // k = a × up: rotating by +tilt about k swings straight down toward +a.
  const kl = Math.hypot(a[2], a[0]) || 1;
  const k = [-a[2] / kl, 0, a[0] / kl];
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const R = (v) => {
    const d = 2 * (a[0] * v[0] + a[1] * v[1] + a[2] * v[2]);
    const h = [d * a[0] - v[0], d * a[1] - v[1], d * a[2] - v[2]]; // half turn about a
    const kh = k[0] * h[0] + k[1] * h[1] + k[2] * h[2];
    const x = [k[1] * h[2] - k[2] * h[1], k[2] * h[0] - k[0] * h[2], k[0] * h[1] - k[1] * h[0]];
    return [0, 1, 2].map((i) => h[i] * c + x[i] * s + k[i] * kh * (1 - c)); // Rodrigues
  };
  for (let col = 0; col < 3; col++) {
    const v = R([m[col * 4], m[col * 4 + 1], m[col * 4 + 2]]);
    m[col * 4] = v[0]; m[col * 4 + 1] = v[1]; m[col * 4 + 2] = v[2];
  }
  const t = R([m[12] - pivot[0], m[13] - pivot[1], m[14] - pivot[2]]);
  m[12] = pivot[0] + t[0]; m[13] = pivot[1] + t[1]; m[14] = pivot[2] + t[2];
  return m;
}

/** How far to lean a 1.75 m figure so it fits water this deep: 0 is straight down, π/2 flat under the surface. */
export const tiltFor = (depth) => Math.PI / 2 - Math.asin(Math.max(0.05, Math.min(1, (depth - 0.08) / 1.75)));
