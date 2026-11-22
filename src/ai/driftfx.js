// The middle stage of Drift, from the audit: perceptual uncertainty. Two effects, both about information you can no
// longer trust, neither a threat:
//
// - a crewmate's voice comes from the wrong side: the caption says where it came from and where they actually are, so
//   the contradiction is stated, not guessed at;
// - an object that was not there when you walked past is there now, on a spot you have already seen. It only moves
//   while you are looking somewhere else.
//
// The player's own status is never touched (health, the crew list, prompts). Pure and unit-tested.

/** @type {[number, string][]} */
export const STAGES = [[0, 'none'], [30, 'low'], [50, 'moderate'], [70, 'high']];

/** Which Drift stage a value is in: 'none', 'low' (from 30), 'moderate' (from 50) or 'high' (from 70). */
export function driftStage(drift) {
  let s = 'none';
  for (const [at, name] of STAGES) if (drift >= at) s = name;
  return s;
}

/**
 * Where something is, said relative to where you face: 'ahead', 'to your right', 'behind you' or 'to your left'.
 * `forward` is your facing [x, z]; `to` the direction to the thing [x, z]. Uses the game's convention (yaw turns
 * left with +y, so right is forward × up = [-fz, fx]).
 */
export function sideWord(forward, to) {
  const [fx, fz] = forward, len = Math.hypot(to[0], to[1]) || 1;
  const tx = to[0] / len, tz = to[1] / len;
  const ahead = fx * tx + fz * tz, right = -fz * tx + fx * tz;
  if (Math.abs(ahead) >= Math.abs(right)) return ahead >= 0 ? 'ahead' : 'behind you';
  return right >= 0 ? 'to your right' : 'to your left';
}

/** The opposite of a side word: a voice from where the speaker cannot be. */
export const OPPOSITE = { ahead: 'behind you', 'behind you': 'ahead', 'to your right': 'to your left', 'to your left': 'to your right' };

/**
 * Choose where the moved object turns up: a point you passed `minAgo`..`maxAgo` seconds ago, `near`..`far` metres
 * away, not in view now. `trail` is [{ t, pos }] oldest first. Returns a position or null.
 */
export function pickPassed(trail, { now, me, inView, minAgo = 8, maxAgo = 40, near = 4, far = 14, random = Math.random }) {
  const ok = trail.filter((c) => {
    const ago = now - c.t, d = Math.hypot(c.pos[0] - me[0], c.pos[2] - me[2]);
    return ago >= minAgo && ago <= maxAgo && d >= near && d <= far && !inView(c.pos);
  });
  return ok.length ? ok[Math.floor(random() * ok.length)].pos : null;
}
