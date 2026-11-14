// The pressure budget: who may commit an attack right now. Many things can be around you; only a few may act at
// once, so a crowd is a threat you can read rather than a pile of unavoidable hits. Stalking, circling and
// watching are free. The director decides how many spawn; this decides who is allowed to commit.
// Pure: entities ask, the budget answers, entities give the slot back when they stop.

/** Slots per kind, and how long a slot stays cold after it is given back. */
export const KINDS = {
  melee: { slots: 2, cool: 0.6 },
  grab: { slots: 1, cool: 2.5 },
  ranged: { slots: 2, cool: 1.2 },
  disruptive: { slots: 1, cool: 6 },
};

/**
 * @param {{ extra?: Partial<Record<keyof typeof KINDS, number>> }} [o] extra slots (deeper sectors allow more)
 */
export function createBudget({ extra = {} } = {}) {
  const held = new Map(); // id → kind
  const coolUntil = Object.fromEntries(Object.keys(KINDS).map((k) => [k, 0]));
  let now = 0;
  const count = (kind) => { let n = 0; for (const k of held.values()) if (k === kind) n += 1; return n; };
  const cap = (kind) => KINDS[kind].slots + (extra[kind] || 0);
  return {
    get now() { return now; },
    /** Advance the clock (seconds). */
    tick(dt) { now += dt; },
    holds: (id) => held.has(id),
    count,
    cap,
    /**
     * Ask for a slot. Already holding one: yes. Otherwise yes only if a slot is free and the kind is not cooling
     * down. crowd: how many of this kind are present; a lone attacker never has to wait for the cool-down.
     */
    request(id, kind, crowd = 2) {
      if (held.has(id)) return true;
      if (!KINDS[kind] || count(kind) >= cap(kind)) return false;
      if (crowd > 1 && now < coolUntil[kind]) return false;
      held.set(id, kind);
      return true;
    },
    /** Give the slot back. The kind cools down before the next one may commit. */
    release(id) {
      const kind = held.get(id);
      if (!kind) return false;
      held.delete(id);
      coolUntil[kind] = Math.max(coolUntil[kind], now + KINDS[kind].cool);
      return true;
    },
    /** Drop slots held by things that no longer exist. alive(id) says whether one does. */
    sweep(alive) { for (const id of [...held.keys()]) if (!alive(id)) held.delete(id); },
    clear() { held.clear(); },
  };
}
