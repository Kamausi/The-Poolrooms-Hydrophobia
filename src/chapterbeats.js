// The reference chapter's sequence (the audit's section 12): a 12–18 minute chapter that moves through five beats,
// false safety, mastery, suspicion, escalation and compromised safety, in that order and never back. The Closed Wave
// Pool is that chapter; this module says which beat it is in, and the scenes (ride.js, explore.js) read the beat:
//
// - false safety: nothing escalates and nothing unexplained happens; the Attendant is pleasant and always right.
// - mastery: the director runs as normal, so the first threats arrive and are learned, but there are still no omens.
// - suspicion: the omens begin, and from here the Attendant may lie.
// - escalation: one crescendo when it begins; everything is allowed.
// - compromised safety: the place that has been safe all chapter, the arrival dock with the raft, is not: something
//   is waiting on it when you go back to leave, and the Safe Room at the end says so.
//
// A beat comes from play time and from what you have done, whichever is later: reaching the dock is at least mastery,
// making the water decision is at least escalation, and leaving to go back to the raft after it is compromised.
// The 12–18 minute length is the target the times are set for; nobody has timed a real play. Pure and unit-tested.

export const BEATS = ['false-safety', 'mastery', 'suspicion', 'escalation', 'compromised'];

/** When each beat begins on time alone (s of chapter play). */
export const BEAT_AT = { 'false-safety': 0, mastery: 120, suspicion: 300, escalation: 540, compromised: 780 };

/** The words a beat is shown with (the ?debug=ai view, the journal). */
export const BEAT_LABEL = { 'false-safety': 'FALSE SAFETY', mastery: 'MASTERY', suspicion: 'SUSPICION', escalation: 'ESCALATION', compromised: 'COMPROMISED SAFETY' };

const rank = (b) => Math.max(0, BEATS.indexOf(b));

/** The later of two beats. */
export const later = (a, b) => (rank(a) >= rank(b) ? a : b);

/** The beat from time alone. */
export function beatByTime(t) {
  let out = BEATS[0];
  for (const b of BEATS) if (t >= BEAT_AT[b]) out = b;
  return out;
}

/** The beat now: time `t` (s), raised to `floor` (the beat what you have done has reached), never lowered. */
export const beatAt = (t, floor = BEATS[0]) => later(beatByTime(t), floor);

/** Is beat `b` at or past `than`? */
export const atLeast = (b, than) => rank(b) >= rank(than);

/** The floor after something you did: 'dock' (arrived on foot), 'decision' (the water decision), 'leave' (heading back to the raft after it). */
export function floorAfter(floor, did) {
  const to = { dock: 'mastery', decision: 'escalation', leave: 'compromised' }[did];
  return to ? later(floor || BEATS[0], to) : floor;
}

/** What a beat allows. */
export function allows(b) {
  return {
    escalate: atLeast(b, 'mastery'),   // the director may build up and send threats
    omens: atLeast(b, 'suspicion'),    // unexplained things
    lies: atLeast(b, 'suspicion'),     // the Attendant may be false
    compromised: b === 'compromised',  // the safe place is not
  };
}

/**
 * Advance the chapter on `state` by `dt` seconds (state.chapterT, state.chapterFloor, state.chapterBeat). Returns
 * the beat just entered, or null. Only for the reference chapter; anything else is left alone.
 */
export function tickChapter(state, dt) {
  if (!state.custom?.chapter) return null;
  const before = state.chapterBeat || BEATS[0];
  state.chapterT = (state.chapterT || 0) + dt;
  const now = later(before, beatAt(state.chapterT, state.chapterFloor));
  state.chapterBeat = now;
  return now !== before ? now : null;
}
