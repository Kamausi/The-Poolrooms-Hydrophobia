// The Doppler shift: a sound coming toward you is higher, going away lower. For a source moving at velocity v_s and a
// listener at v_l, with n the unit vector from the listener to the source and c the speed of sound,
//   f' / f = (c + v_l·n) / (c + v_s·n)
// (v_l·n > 0 when the listener moves toward the source; v_s·n > 0 when the source moves away). Speeds here are
// metres per second and small next to c, so the shift is a few per cent: a Bloom closing on the raft at 12 m/s
// sounds about 3.5% sharp. The ratio is clamped so a glitch in a velocity can never produce a silly pitch.
// Pure and unit-tested.

export const SPEED_OF_SOUND = 343;

/** Pitch ratio heard by a listener at `lp` moving at `lv`, from a source at `sp` moving at `sv` ([x, y, z]). */
export function dopplerRatio(sp, sv, lp, lv, c = SPEED_OF_SOUND) {
  const d = [sp[0] - lp[0], sp[1] - lp[1], sp[2] - lp[2]], l = Math.hypot(...d);
  if (l < 1e-6) return 1;
  const n = d.map((v) => v / l);
  const dot = (a) => a[0] * n[0] + a[1] * n[1] + a[2] * n[2];
  // A source closing at or past the speed of sound has no meaningful ratio: the denominator is kept positive.
  const r = (c + dot(lv)) / Math.max(c * 0.05, c + dot(sv));
  return Math.max(0.8, Math.min(1.25, r));
}

/** A velocity from two positions `dt` seconds apart (for sources the game moves by position only). */
export const velocity = (prev, now, dt) => (prev && dt > 0 ? [(now[0] - prev[0]) / dt, (now[1] - prev[1]) / dt, (now[2] - prev[2]) / dt] : [0, 0, 0]);
