// Water flow as the one mechanic joining the raft and on foot (the audit's core-loop recommendation). Every water
// action in an attraction, whichever mode it was taken in, moves one quantity: the head of water, how high the
// facility's water stands there relative to normal. The raft's actions (the drain valve, the diverter, the breaker
// that starts the pumps) and the dock's (draining by hand, restoring the circuit, the way-out choice) all add to it,
// and both modes read it back: the raft's route panel and the dock both show the level and what set it, the current
// in the stretch after the dock runs faster on high water and slower on low, and the crew's departure report names it.
//
// The head is worked out from the state each time (nothing extra to save or resume). Pure and unit-tested.

/** How much each action moves the head, in tenths of the normal level; and which mode it belongs to. */
export const MOVES = {
  valve: { d: -1, by: 'raft', what: 'the drain valve opened' },
  hand: { d: -1, by: 'foot', what: 'the passage drained by hand' },
  diverter: { d: -0.5, by: 'raft', what: 'the diverter thrown to the landing' },
  pumps: { d: 0.5, by: 'raft', what: 'the breaker started the pumps' },
  circuit: { d: 0.5, by: 'foot', what: 'the circuit restored, the pumps running' },
  flooded: { d: 1, by: 'foot', what: 'the pool raised' },
  drained: { d: -1, by: 'foot', what: 'the side channel drained' },
  bypass: { d: 0, by: 'foot', what: 'the water kept circulating' },
};

/** The head can not go past this either way. */
export const LIMIT = 1.5;

/**
 * The actions taken in attraction `key`, read from the expedition state. `drained` is one flag for both drains, so
 * `drainedBy` ('raft' or 'foot', kept when it was set) says which. Returns [{ kind, d, by, what }].
 */
export function moves(state, key) {
  const out = [];
  const add = (kind) => out.push({ kind, ...MOVES[kind] });
  if (state.drained?.[key]) add(state.drainedBy?.[key] === 'foot' ? 'hand' : 'valve');
  if (state.landing === key) add('diverter');
  if (state.pumps?.[key]) add('pumps');
  if (state.power?.[key]) add('circuit');
  const mod = state.routeMod?.[key];
  if (mod && MOVES[mod]) add(mod);
  return out;
}

/** The head of water: the sum of the moves, kept within the limit. */
export const head = (ms) => Math.max(-LIMIT, Math.min(LIMIT, ms.reduce((a, m) => a + m.d, 0)));

/** The level in a word, as both modes show it. */
export const levelWord = (h) => (h >= 1 ? 'FLOODED' : h > 0.25 ? 'HIGH' : h <= -1 ? 'DRAINED' : h < -0.25 ? 'LOW' : 'NORMAL');

/** What the current after the dock does with the head: faster on high water, slower on low, within 15%. */
export const currentFactor = (h) => 1 + 0.1 * Math.max(-LIMIT, Math.min(LIMIT, h));

/** One line for a HUD or a report: the level and what set it, raft first. */
export function gaugeLine(ms) {
  const h = head(ms);
  if (!ms.some((m) => m.d)) return `WATER ${levelWord(h)}`;
  const by = (who) => ms.filter((m) => m.by === who && m.d).map((m) => m.what);
  const parts = [['RAFT', by('raft')], ['ON FOOT', by('foot')]].filter(([, w]) => w.length).map(([who, w]) => `${who}: ${w.join(', ')}`);
  return `WATER ${levelWord(h)} · ${parts.join(' · ')}`;
}
