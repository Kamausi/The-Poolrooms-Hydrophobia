// The Observer: the audit's third threat type. It watches from where you cannot get to it, and it moves when the line
// of sight breaks. It never attacks, never chases, and cannot be shot. What it does is take up your attention: you
// learn that it is there, you lose it, and it is somewhere else, a little closer each time.
//
// Rules, so it is learnable rather than random:
// - it only takes a new place where you are not looking, and always one that can see you;
// - walk towards it and it is not there any more (closer than `REACH`, it moves);
// - once you have seen it, it moves when it has been out of your sight for `LOST` seconds;
// - if you never notice it, it moves after `UNNOTICED` seconds to somewhere more likely to be noticed;
// - each move brings its distance band in, down to a floor it never crosses;
// - after `MOVES` places it leaves for good.
// Pure and unit-tested: explore.js supplies the candidate places and what can be seen.

export const REACH = 10, LOST = 1.5, UNNOTICED = 40, MOVES = 4;

/** The distance band for its next place: far at first, closer with each move, never under 9 m. */
export function band(moves) {
  return [Math.max(9, 16 - moves * 2), Math.max(13, 28 - moves * 4)];
}

/**
 * Choose its next place. `cands` are [x, y, z] floor points; `inView(p)` whether you are looking at p now; `sees(p)`
 * whether p has a line of sight to you. Returns a point, or null if nowhere suits (it then waits).
 */
export function choosePerch(cands, { me, moves = 0, inView, sees, random = Math.random, last = null }) {
  const [lo, hi] = band(moves);
  const ok = cands.filter((p) => {
    const d = Math.hypot(p[0] - me[0], p[2] - me[2]);
    return d >= lo && d <= hi && !inView(p) && sees(p) && !(last && Math.hypot(p[0] - last[0], p[2] - last[2]) < 4);
  });
  return ok.length ? ok[Math.floor(random() * ok.length)] : null;
}

export function createObserver() {
  return { mode: 'waiting', at: null, moves: 0, seen: false, seenT: 0, lostT: 0, hereT: 0, sightings: 0 };
}

/**
 * One frame. `looked`: you are looking at it with nothing in between. `dist`: how far it is. Returns what happened:
 * 'seen' (the first moment you see it in this place), 'move' (it needs a new place), 'leave' (it is done), or null.
 */
export function stepObserver(o, { dt, looked, dist }) {
  if (o.mode !== 'watching') return null;
  o.hereT += dt;
  if (looked) {
    o.seenT += dt; o.lostT = 0;
    if (!o.seen) { o.seen = true; o.sightings++; return 'seen'; }
  } else if (o.seen) o.lostT += dt;
  const move = dist < REACH || (o.seen && o.lostT >= LOST) || (!o.seen && o.hereT >= UNNOTICED);
  if (!move) return null;
  o.moves++;
  return o.moves >= MOVES ? 'leave' : 'move';
}

/** It has taken a new place. */
export function placeObserver(o, at) {
  Object.assign(o, { mode: 'watching', at, seen: false, seenT: 0, lostT: 0, hereT: 0 });
}
