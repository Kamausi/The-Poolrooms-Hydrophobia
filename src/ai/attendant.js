// The Attendant as an antagonist that acts, not only speaks. On foot it gives the guests instructions over the
// public address ("remain where you are while the gallery is serviced", "proceed to the north gallery") and the
// facility then acts on them: it runs the lights, sends you places, keeps you still.
//
// Most instructions are honest, and following one is safe. The audit's director signal "the player repeatedly trusts
// facility instructions" is answered here: once you have followed two in a row, the next one may be false, and
// following a false one has a consequence (the lights in your room go, or something is waiting where it sent you).
//
// It must be learnable, not a coin toss. A false instruction always addresses the wrong number of guests ("Thank you,
// four guests" when there are three of you). The count is something the player can check; the facility's word is
// not. An honest instruction always has the right count. The player's own status (health, the HUD's crew list) is
// never falsified: the lie is in what belongs to the facility.
//
// Rules: never false in the first attraction (it teaches that the Attendant is usually right), never two false in a
// row, and ignoring an instruction, honest or not, costs nothing. Pure and unit-tested.

export const DIRECTIVE_KINDS = ['wait', 'proceed'];

/** How many times in a row the player must have done as told before an instruction can be false. */
export const TRUST_BEFORE_LIE = 2;

/** A wrong guest count near the real one (never zero, never the real one). */
export function wrongCount(actual, random) {
  if (actual <= 1) return 2;
  return random() < 0.5 ? actual + 1 : actual - 1;
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
export const countWord = (n) => WORDS[n] || String(n);

/**
 * Where a place lies from you, as the facility names it. North is -z, as on the survey map (survey.js), so the
 * player can check a direction against the map.
 */
export function placeName(dx, dz) {
  const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north');
  return `the ${dir} gallery`;
}

/**
 * Decide the next instruction. `trust` is how many the player has followed in a row; `lastFalse` whether the last
 * one was a lie; `place` is { name, pos } for a proceed instruction (null when there is nowhere suitable).
 * Returns { kind, lie, count, text, pos?, seconds }.
 */
export function chooseDirective({ trust = 0, lastFalse = false, sectorIndex = 0, guests = 1, place = null, area = 'the gallery', random = Math.random, kind: wantKind = null, lie: wantLie = null }) {
  const kinds = place ? DIRECTIVE_KINDS : ['wait'];
  const pickKind = kinds[Math.floor(random() * kinds.length)];
  const kind = wantKind && kinds.includes(wantKind) ? wantKind : pickKind; // `kind` and `lie` force a choice (tests, ?debug)
  const canLie = sectorIndex > 0 && !lastFalse && trust >= TRUST_BEFORE_LIE;
  // Trusting longer makes a lie likelier, but it is never certain: a lie you can predict from the count of
  // instructions alone is not a lie you have to read.
  const roll = random();
  const lie = wantLie ?? (canLie && roll < Math.min(0.85, 0.45 + 0.15 * (trust - TRUST_BEFORE_LIE)));
  const count = lie ? wrongCount(guests, random) : guests;
  const who = `${countWord(count)[0].toUpperCase()}${countWord(count).slice(1)} ${count === 1 ? 'guest' : 'guests'}`;
  if (kind === 'wait') {
    return { kind, lie, count, seconds: 10, window: 16,
      text: `${who}, please remain where you are while ${area} is serviced. Thank you for your patience.` };
  }
  return { kind, lie, count, seconds: 45, pos: place.pos, place: place.name,
    text: `${who}, please proceed to ${place.name}. A member of staff will meet you there.` };
}

/**
 * What the player has done with an instruction this frame. `held` is how long they have stayed within reach of
 * where a wait was given; `distance` how far they are from a proceed target. Returns 'complied', 'ignored' or null.
 */
export function judge(d, { held = 0, t = 0, moved = false, distance = Infinity }) {
  if (d.kind === 'wait') {
    if (held >= d.seconds) return 'complied';
    if (moved || t > d.window) return 'ignored';
    return null;
  }
  if (distance < 3) return 'complied';
  if (t > d.seconds) return 'ignored';
  return null;
}

/** Trust after an outcome: following builds it, not following (or catching a lie) resets it. */
export function nextTrust(trust, outcome) { return outcome === 'complied' ? trust + 1 : 0; }

// ---------- Learned behaviour ----------
// The audit's other missing signal: "the player has learned a particular enemy behaviour → occasionally introduce a
// carefully telegraphed exception". The behaviour tracked is the Bloom's burst tell: it swells and holds still, so
// stepping back cancels it. Once the player has dodged it that way three times, one Bloom (at most one per dock)
// keeps coming while it swells. It sounds different (it breathes in twice), and the first time it is captioned. The
// wind-up time and the damage are unchanged; what changes is the answer: shoot it, or outrun it.

export const LEARNED_AFTER = 3;

export function createLearning() {
  const s = { stepAways: 0, spent: false };
  return {
    s,
    /** The player cancelled a burst by stepping away. */
    stepAway() { s.stepAways++; },
    /** Whether the next Bloom to wind up should be the exception (and use it up if so). */
    takeException() {
      if (s.spent || s.stepAways < LEARNED_AFTER) return false;
      s.spent = true; s.stepAways = 0;
      return true;
    },
  };
}
