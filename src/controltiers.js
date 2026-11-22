// The actions in tiers, from the audit: primary (what every moment needs: move, aim, fire, use, inspect),
// contextual (what a situation asks for and the prompt names: brace, patch, paddle, shove, dressing...) and
// advanced (what rewards mastery: blaster profiles, the burst, crew commands, the work lamp).
//
// The tiers drive three things: the order of the controls reference and the binding lists in Settings, and when a
// first-time tip may be shown (an advanced tip waits until the primary actions are in the player's hands). Pure and
// unit-tested.

export const TIER_ORDER = ['primary', 'contextual', 'advanced'];
export const TIER_LABELS = { primary: 'PRIMARY', contextual: 'WHEN ASKED', advanced: 'ADVANCED' };

// `aim` and `fire` are not rebindable keys (the mouse and the triggers), so they are listed here with fixed labels.
export const TIERS = {
  aim: 'primary', fire: 'primary', left: 'primary', right: 'primary', forward: 'primary', back: 'primary',
  hop: 'primary', use: 'primary', scan: 'primary',
  brace: 'contextual', shove: 'contextual', patch: 'contextual', paddle: 'contextual', boost: 'contextual',
  recharge: 'contextual', dressing: 'contextual', map: 'contextual', lookback: 'contextual', override: 'contextual',
  cycle: 'advanced', burst: 'advanced', ping: 'advanced', autopilot: 'advanced', helm: 'advanced', lamp: 'advanced',
  lampPlace: 'advanced',
};

/** An action's tier; anything unlisted is advanced (a new action has to earn a place in the first two). */
export const tierOf = (id) => TIERS[id] || 'advanced';

/**
 * Group [id, label, ...] rows by tier, in tier order, keeping each tier's rows in their given order.
 * Returns [{ tier, label, rows }], with empty tiers left out.
 */
export function byTier(rows) {
  return TIER_ORDER.map((tier) => ({ tier, label: TIER_LABELS[tier], rows: rows.filter((r) => tierOf(r[0]) === tier) }))
    .filter((g) => g.rows.length);
}

/** The four movement actions, shown in the reference as one row. */
export const MOVE_IDS = ['forward', 'left', 'back', 'right'];

/**
 * The rows of the controls reference: aim, fire and movement first (one row for the four movement keys), then every
 * other rebindable action. `label(id)` gives an action's current key; rows are [id, label, keyText].
 */
export function referenceRows(actions, { pad = false, label = (id) => id } = {}) {
  const move = pad ? 'left stick' : MOVE_IDS.map(label).join('');
  const fixed = [['aim', 'Aim', pad ? 'right stick' : 'mouse'], ['fire', 'Fire', pad ? 'RT' : 'click'], ['forward', 'Move / steer (back brakes)', move]];
  return [...fixed, ...actions.filter(([id]) => !MOVE_IDS.includes(id)).map(([id, text]) => [id, text, label(id)])];
}

// First-time tips by the action they teach. A tip for an advanced action waits until the primary ones are in hand.
export const TIP_TIERS = { steer: 'primary', fire: 'primary', hop: 'primary', gate: 'primary', moor: 'primary',
  patch: 'contextual', paddle: 'contextual', profiles: 'advanced' };

/** Primary actions are in hand once the player has steered a while and fired a few times. */
export const PRIMARY_SHOTS = 5;
export const PRIMARY_SECONDS = 40;

/** Whether a tip may be shown now. `shots` is shots fired this run, `time` seconds on the raft. */
export function tipAllowed(key, { shots = 0, time = 0 } = {}) {
  const tier = TIP_TIERS[key] || 'contextual';
  if (tier !== 'advanced') return true;
  return shots >= PRIMARY_SHOTS && time >= PRIMARY_SECONDS;
}
