// Things worth picking up. Power-ups make you more capable; collectibles make you more informed; a few artifacts
// make you wonder whether those are different. Small sets, each item a physical object with a reason to exist.
// Pure data and rules: explore.js places and draws them, the ledger keeps what was found across expeditions.

/** Collectible sets. Each item: [id, what the crew writes down]. Sets are small on purpose. */
export const SETS = {
  wristbands: {
    name: 'LOST GUESTS', kind: 'evidence',
    items: [
      ['wb-0417', 'Wristband 0417, white. Issued today.'],
      ['wb-0417b', 'Wristband 0417, white, cracked with age. The same number.'],
      ['wb-child', 'A child\'s swim-test band, green: FLOAT. The clasp was never opened.'],
      ['wb-tomorrow', 'A day pass dated tomorrow.'],
      ['wb-0000', 'A band stamped GUEST 0000.'],
      ['wb-yours', 'A band with your number on it. You are wearing yours.'],
    ],
  },
  headcount: {
    name: 'THE HEADCOUNT', kind: 'evidence',
    items: [
      ['hc-clip', 'An attendance clip: PARTY OF 4.'],
      ['hc-hooks', 'Numbered hooks, 1 to 5. Four vests. Hook 5 is wet.'],
      ['hc-board', 'A safety board: GUESTS IN WATER 5.'],
      ['hc-token', 'Admission stubs, torn in sequence. One number is missing from the middle.'],
      ['hc-tally', 'A tally in grease pencil: four strokes and a fifth, rubbed out, drawn again, rubbed out.'],
    ],
  },
  dry: {
    name: 'DRY THINGS', kind: 'artifact',
    items: [
      ['dry-matches', 'A matchbook from under a metre of water. Bone dry. It strikes.'],
      ['dry-towel', 'A folded towel on the pool floor. Warm and dry.'],
      ['dry-ticket', 'A paper ticket, crisp, lifted out of a drain.'],
      ['dry-photo', 'A photograph, dry. This room, with a wall where the door is.'],
    ],
  },
  ducks: {
    name: 'DUCKS', kind: 'relief',
    items: [
      ['duck-plain', 'A rubber duck. It is a rubber duck.'],
      ['duck-warm', 'A rubber duck. It is warm.'],
      ['duck-facing', 'A rubber duck. It was facing the door. It is facing you.'],
      ['duck-serial', 'A rubber duck. Same serial number as the last one.'],
    ],
  },
};

/** Temporary equipment, found as objects. seconds: how long it lasts once taken. */
export const POWERUPS = {
  overcharge: { name: 'OVERCHARGE CELL', seconds: 25, note: 'the blaster recharges twice as fast; it runs hot afterwards' },
  drypack: { name: 'DRY PACK', seconds: 45, note: 'Drift does not rise while you are out of the water' },
  canister: { name: 'PRESSURE CANISTER', seconds: 0, note: 'refills the raft\'s softest chamber when you board' },
};

export const allItems = () => Object.entries(SETS).flatMap(([set, s]) => s.items.map(([id, text]) => ({ id, set, text, kind: s.kind })));

/**
 * What a sector offers this expedition: at most two collectibles not yet found, and one power-up, on cells away
 * from the dock. Deterministic for a given sector, attempt and ledger, so a retry sees the same things.
 * @param {{ sectorIndex: number, cells: number[][], found: Record<string, boolean>, hash: (a: number, b: number) => number, max?: number }} o
 */
export function plan({ sectorIndex, cells, found, hash, max = 2 }) {
  const out = [];
  if (!cells.length) return out;
  const missing = allItems().filter((it) => !found[it.id]);
  // Spread the sets across the campaign: a sector prefers items whose position in the list matches its depth.
  const ranked = missing.map((it, i) => ({ it, r: hash(sectorIndex * 3.1 + i * 7.7, i * 1.3 + 0.5) })).sort((a, b) => a.r - b.r);
  const used = new Set();
  const take = (salt) => {
    for (let k = 0; k < cells.length; k++) {
      const i = Math.floor(hash(sectorIndex + salt * 5.3, k * 2.9 + salt) * cells.length) % cells.length;
      if (!used.has(i)) { used.add(i); return cells[i]; }
    }
    return null;
  };
  for (const { it } of ranked.slice(0, max)) { const cell = take(out.length + 1); if (cell) out.push({ ...it, cell, type: 'collectible' }); }
  const pk = Object.keys(POWERUPS);
  const cell = take(9);
  if (cell) out.push({ id: pk[sectorIndex % pk.length], type: 'powerup', cell, ...POWERUPS[pk[sectorIndex % pk.length]] });
  return out;
}

/** How much of each set has been found. */
export function progress(found) {
  return Object.fromEntries(Object.entries(SETS).map(([k, s]) => [k, { name: s.name, have: s.items.filter(([id]) => found[id]).length, of: s.items.length }]));
}

/**
 * Take a collectible. Returns { score, kind, text, complete, effect } and records it in found.
 * Dry things help (they take Drift off you) and count toward how the facility regards you: state.dryCount.
 */
export function collect(state, found, item) {
  if (found[item.id]) return null;
  found[item.id] = true;
  const set = SETS[item.set];
  const complete = set.items.every(([id]) => found[id]);
  let effect = null;
  if (item.kind === 'artifact') {
    state.drift = Math.max(0, (state.drift || 0) - 20);
    state.dryCount = (state.dryCount || 0) + 1;
    effect = 'dry';
  }
  const base = { evidence: 250, artifact: 750, relief: 250 }[item.kind] || 100;
  return { score: base, bonus: complete ? 2500 : 0, text: item.text, complete, setName: set.name, effect };
}

/** Headcount: what the crew can now say about how many of them there are. */
export function headcountLine(found, crew) {
  const n = SETS.headcount.items.filter(([id]) => found[id]).length;
  if (n === 0) return null;
  if (n < SETS.headcount.items.length) return `HEADCOUNT · ${n} of ${SETS.headcount.items.length} records. The facility's numbers do not agree with each other.`;
  return `HEADCOUNT · every record found. The facility has counted five since before you arrived. There are ${crew} of you. You counted.`;
}
