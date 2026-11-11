// Expedition Score, FLOW and Service Credit. Pure rules over plain state, so the browser game, the unit tests and
// (later) a server can share them.
//
//   Expedition Score  never spent. Mastery: rankings, sector grades, personal bests.
//   FLOW              a multiplier (×1.0 … ×8.0) that rises with consecutive skilled actions: accurate hits,
//                     clean lines, saves, interrupts. It decays only while there is pressure and nothing skilled
//                     is happening; quiet rooms and exploration freeze it. Damage knocks it down, never to zero.
//   Service Credit    spendable. Earned from the same actions, unmultiplied, and spent at Safe Room cabinets.
//
// High performance opens optional routes and rewards; it never makes the director spawn more.

/** kind → [base points, flow gained, label]. Rafting is scored as well as shooting. */
export const AWARDS = {
  kill: [100, 0.15, 'DISPERSED'],
  weak: [150, 0.25, 'PRECISION'],
  interrupt: [175, 0.3, 'INTERRUPT'],
  intercept: [100, 0.2, 'RETURNED'],
  save: [500, 0.5, 'CREW SAVE'],
  revive: [400, 0.3, 'CREW UP'],
  rescue: [1000, 0.5, 'GUEST RESCUED'],
  gate: [250, 0.3, 'PERFECT LINE'],
  nearMiss: [75, 0.15, 'NEAR MISS'],
  hop: [150, 0.2, 'CLEAN HOP'],
  landing: [200, 0.25, 'CLEAN LANDING'],
  airShot: [250, 0.35, 'AIR SHOT'],
  line: [300, 0.3, 'FULL LINE'],
  sync: [500, 0.4, 'CREW SYNC'],
  route: [500, 0.4, 'ROUTE FOUND'],
  machine: [300, 0.2, 'MACHINERY'],
  evidence: [250, 0, 'RECORDED'],
  survey: [500, 0, 'SURVEYED'],
  evade: [750, 0.3, 'EVADED'],
  intact: [500, 0, 'INTACT'],
};

export const FLOW_MAX = 8;
const round5 = (n) => Math.round(n / 5) * 5;

/** Make sure a state object carries the scoring fields (old saves do not). */
export function ensureScore(state) {
  state.score ??= 0;
  state.sectorScore ??= 0; // unmultiplied: the "signal rating" that earns overrides
  state.flow ??= 1;
  state.credit ??= 0;
  state.tally ||= newTally();
  return state;
}
export const newTally = () => ({ points: 0, shots: 0, hits: 0, saves: 0, rescues: 0, maxFlow: 1, hurt: 0, incaps: 0, awards: {} });

/**
 * Award a skilled action. Returns { points, credit, flow, label } for the feed.
 * base overrides the table (legacy callers pass their own number).
 * @param {object} state @param {string} kind @param {{ base?: number, label?: string, quiet?: boolean }} [opts]
 */
export function award(state, kind, { base, label, quiet = false } = {}) {
  ensureScore(state);
  const row = AWARDS[kind] || [base ?? 0, 0.1, label || kind.toUpperCase()];
  const b = base ?? row[0];
  const points = round5(b * state.flow * (state.doubleT > 0 ? 2 : 1)); // DOUBLE FLOW: a short window where everything pays twice
  const credit = Math.max(1, Math.round(b / 10));
  state.score += points;
  state.sectorScore += b;
  state.credit += credit;
  state.flow = Math.min(FLOW_MAX, state.flow + row[1]);
  const t = state.tally;
  t.points += points;
  t.maxFlow = Math.max(t.maxFlow, state.flow);
  t.awards[kind] = (t.awards[kind] || 0) + 1;
  if (kind === 'save' || kind === 'revive') t.saves += 1;
  if (kind === 'rescue') t.rescues += 1;
  state.flowIdle = 0;
  return { points, credit, flow: state.flow, label: label || row[2], quiet };
}

/** A shot fired: accuracy for the debrief. */
export function shot(state, hit) {
  ensureScore(state);
  state.tally.shots += 1;
  if (hit) state.tally.hits += 1;
}

/** Damage taken: FLOW drops in proportion, never below ×1, never all of it. */
export function hurt(state, amount) {
  ensureScore(state);
  if (amount <= 0) return state.flow;
  state.tally.hurt += amount;
  const loss = Math.min((state.flow - 1) * 0.4, 0.3 + amount * 0.04);
  state.flow = Math.max(1, state.flow - Math.max(0, loss));
  return state.flow;
}

/** A teammate went down: a larger, single drop. */
export function incap(state) {
  ensureScore(state);
  state.tally.incaps += 1;
  state.flow = Math.max(1, state.flow - (state.flow - 1) * 0.5);
}

/**
 * Per frame. pressure: something is actively demanding skill (the director is in buildup or peak, on the raft).
 * Without pressure FLOW is frozen: silence and exploration never cost the multiplier.
 */
export function tick(state, dt, { pressure = false } = {}) {
  ensureScore(state);
  if (!pressure) return state.flow;
  state.flowIdle = (state.flowIdle || 0) + dt;
  if (state.flowIdle > 4 && state.flow > 1) state.flow = Math.max(1, state.flow - dt * 0.06);
  return state.flow;
}

/** Spend Service Credit. Returns true if it went through. */
export function spend(state, cost) {
  ensureScore(state);
  if (state.credit < cost) return false;
  state.credit -= cost;
  return true;
}

/**
 * End of a sector: the debrief and a grade. Weights differ by what the sector asked of you, so a careful
 * exploration is not marked down for not being a speedrun.
 * info: { par, raft (0..100), crewIntact (bool), kind: 'rail' | 'explore', early (left a dock unfinished) }
 */
export function debrief(state, { par = 6000, raft = 100, crewIntact = true, kind = 'rail', early = false } = {}) {
  ensureScore(state);
  const t = state.tally;
  const accuracy = t.shots ? t.hits / t.shots : 1;
  const w = kind === 'explore' ? { points: 0.3, acc: 0.1, crew: 0.35, raft: 0.25 } : { points: 0.45, acc: 0.2, crew: 0.2, raft: 0.15 };
  const g = w.points * Math.min(1, t.points / par) + w.acc * accuracy + w.crew * (crewIntact && !t.incaps ? 1 : t.incaps > 1 ? 0.2 : 0.5) + w.raft * (raft / 100);
  // Leaving a dock with its circuit dark is allowed and keeps everything you earned, but it is not a full
  // inspection: the grade stops at B.
  let grade = g >= 0.9 ? 'S' : g >= 0.75 ? 'A' : g >= 0.55 ? 'B' : g >= 0.35 ? 'C' : 'D';
  if (early && (grade === 'S' || grade === 'A')) grade = 'B';
  const out = { early, points: t.points, accuracy, maxFlow: t.maxFlow, saves: t.saves, rescues: t.rescues, incaps: t.incaps, raft, grade, value: g };
  state.tally = newTally();
  return out;
}

/** The facility's view of your performance: a qualification, said kindly. */
export function attendantVerdict(grade, early = false) {
  if (early) return 'Your party left before the attraction concluded. The attraction has noted where you stopped.';
  return {
    S: 'Guest performance exceeds expected operating parameters. Your party has qualified for advanced circulation.',
    A: 'Your party has qualified for advanced circulation.',
    B: 'Your party remains eligible for standard passage.',
    C: 'Your party remains eligible for standard passage. Please keep your party together.',
    D: 'Your party is being retained for additional orientation.',
  }[grade];
}
