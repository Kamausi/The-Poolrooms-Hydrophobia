// What the HUD shows about being hurt and about hitting something, decided without the DOM. Health stays off the
// screen while you are whole and comes back when it matters (an injury, a recent hit, being down). A hit taken shows
// as an arc on the side it came from; a hit landed marks the reticle by what it did: a plain hit, a weak point, a
// kill, or a hit that did nothing. Pure and unit-tested; hud.js draws the result.

/** Where on the raft a hit landed, as a bearing from straight ahead (degrees, positive to the right). */
export const CHAMBER_BEARING = { bow: 0, right: 90, stern: 180, left: -90 };

/**
 * Bearing of `from` as seen from `eye` facing `yaw` (the on-foot convention: forward is [-sin yaw, 0, -cos yaw]).
 * Degrees in (-180, 180]: 0 ahead, 90 right, -90 left, 180 behind. null when the source is on top of you.
 */
export function bearing(yaw, eye, from) {
  const dx = from[0] - eye[0], dz = from[2] - eye[2];
  if (Math.hypot(dx, dz) < 0.05) return null;
  const fwd = -Math.sin(yaw) * dx - Math.cos(yaw) * dz;
  const right = Math.cos(yaw) * dx - Math.sin(yaw) * dz;
  const a = (Math.atan2(right, fwd) * 180) / Math.PI;
  return a <= -180 ? 180 : a;
}

/** How long after a hit health stays on screen even at full (seconds). */
export const VITALS_LINGER = 4;

/** Whether the health readout is shown. */
export function vitalsShown({ health, max = 100, sinceHurt = Infinity, persistent = false, downed = false }) {
  return persistent || downed || health < max - 0.5 || sinceHurt < VITALS_LINGER;
}

/** Which reticle mark a landed shot earns. */
export function hitKind({ killed = false, weak = false, resisted = false } = {}) {
  return killed ? 'kill' : resisted ? 'none' : weak ? 'weak' : 'hit';
}

/** How strong the damage arc is for a hit of n points (0.3 for a scratch, 1 for a heavy hit). */
export function arcStrength(n) {
  return Math.max(0.3, Math.min(1, 0.3 + n / 20));
}
