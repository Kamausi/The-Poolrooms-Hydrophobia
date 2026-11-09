// The facility's memory. The Poolrooms remember what expeditions did, and between expeditions they author
// consequences from it: a repaired system opens a passage, a diverted current floods a familiar room, a
// rescued visitor turns up in an old record. The mechanical history stays accurate; the facility's written
// account of it does not.
//
// Three systems, three jobs:
//   world authoring (here)   proposes variations from memory, ahead of play, between expeditions
//   the director             threats, pressure and recovery during an expedition (director.js)
//   shared rules             movement, shooting, rescues, objectives (everywhere else)
// The contract:
//   - An expedition receives one accepted version of the facility when it departs. Retries continue that
//     expedition and keep its version. Only a new departure adopts persistent changes.
//   - History records every decision ("you flooded this room once"); current state records the latest
//     resolved outcome ("this room is flooded now"). Authoring reads current state.
//   - Three accounts, kept apart: what the facility did (facility.history), what the crew witnessed (the
//     ledger, written only when the crew sees it), and what the facility claims (its records, which lie).
//   - A rescue becomes a lasting fact at the next Safe Room. A failed expedition keeps what was committed and
//     what was witnessed; uncommitted rescues are lost with the run.
//   - Remembered deaths make a place observant, not harder: warnings, a vest at the spot, an incident notice,
//     an abandoned cache, the Attendant recognising you. Pressure stays the live director's job.
// Every authored map is checked for playability (the cell and the machine reachable from the dock). A failed
// candidate falls back to the last accepted map if that still passes, otherwise to the authored base map.

const KEY = 'underflow-facility';

/** The creative brief every authored variation answers to. */
export const DIRECTIVE = `Maintain a public aquatic facility that has outgrown the people it was built to serve.
Keep the pumps running. Keep the signs confident. Make each space appear to have had an ordinary purpose.
Build from porcelain, water, rubber, painted metal, fluorescent light, and the evidence of repeated maintenance.
Let the crew understand what they need to do while remaining uncertain about where they are.
Introduce contradictions through scale, repetition, water levels, reflections, records, and human absence.
Remember the expedition's actions. Express their consequences through later rooms and machinery.
Allow the facility's written account of those actions to become increasingly incorrect.
Preserve opportunities for cooperation, recognisable danger, and dependable refuge.
Leave some rooms quiet. Make the water inviting enough that stopping feels tempting.`;

/** Names for the people you bring back: first × last, so a long history does not repeat. Each has a unique id. */
const FIRST = ['Ines', 'Theo', 'Abena', 'Ruth', 'Sami', 'Lio', 'Grete', 'Nnamdi', 'Clara', 'Pavel', 'Mira', 'Owen', 'Yusra', 'Tomas'];
const LAST = ['Varga', 'Lund', 'Mensah', 'Calloway', 'Haddad', 'Park', 'Holm', 'Eze', 'Voss', 'Orlov', 'Achebe', 'Reyes', 'Novak'];

function blank() {
  return {
    expeditions: 0,
    sectors: {}, // key → { restored, flooded, drained, bypassed, deaths, damage, interest, lost, visits, feedback }
    visitors: [], // { id, name, sector, expedition } — committed at a Safe Room
    history: [], // what the facility did: { expedition, sector, notes }
    ledger: { places: [], machinery: [], behaviours: [], visitors: [], changes: [] },
    accepted: {}, // sector id → last accepted variation (the fallback)
  };
}

export const facility = (() => {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return blank(); }
})();
facility.ledger = { ...blank().ledger, ...facility.ledger };

export function saveFacility() {
  try { localStorage.setItem(KEY, JSON.stringify(facility)); } catch {}
}

facility.history ||= [];
export const sectorMem = (key) => (facility.sectors[key] ||= { restored: 0, flooded: 0, drained: 0, bypassed: 0, deaths: 0, damage: 0, interest: 0, lost: 0, visits: 0, feedback: {}, water: null, lastDeath: null });

export function recordSector(key, field, n = 1) {
  const m = sectorMem(key);
  m[field] = (m[field] || 0) + n;
  // History counts every decision; current state is the latest one.
  if (field === 'flooded' || field === 'drained') m.water = field;
  saveFacility();
}

/** Where and how the crew died last here, so the place can remember it physically. */
export function recordDeath(key, where) {
  const m = sectorMem(key);
  m.deaths = (m.deaths || 0) + 1;
  m.lastDeath = where;
  saveFacility();
}

/** The crew's reliable record: a discovery catalogue that only ever says what actually happened. */
export function note(kind, item) {
  const list = facility.ledger[kind];
  if (!list || list.includes(item)) return false;
  list.push(item);
  saveFacility();
  return true;
}

/** A rescue in the field: named at once, but only pending until the crew reaches a Safe Room. */
export function nameVisitor(sectorKey, n) {
  const i = facility.visitors.length + n;
  const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 5 + Math.floor(i / FIRST.length)) % LAST.length]}`;
  return { id: `v${facility.expeditions}-${sectorKey}-${i}-${Date.now() % 100000}`, name, sector: sectorKey, expedition: facility.expeditions };
}
/** At a Safe Room, pending rescues become facts: in the facility's memory and in the crew's ledger. */
export function commitVisitors(pending = []) {
  for (const v of pending) {
    if (facility.visitors.some((x) => x.id === v.id)) continue;
    facility.visitors.push(v);
    note('visitors', `${v.name} · brought to safety · expedition ${v.expedition}`);
  }
  saveFacility();
}

/** Reachability: the dock must still reach the cell candidates and the machine. */
function playable(map) {
  const g = map.map((r) => [...r]);
  const find = (ch) => { const o = []; g.forEach((r, z) => r.forEach((c, x) => c === ch && o.push([x, z]))); return o; };
  const D = find('D')[0];
  if (!D) return false;
  const seen = new Set([D.join()]);
  const q = [D];
  const T = find('T');
  while (q.length) {
    const [x, z] = q.shift();
    const nb = [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]];
    const ti = T.findIndex(([a, b]) => a === x && b === z);
    if (ti >= 0 && T[ti ^ 1]) nb.push(T[ti ^ 1]);
    for (const [nx, nz] of nb) {
      const c = g[nz]?.[nx];
      if (!c || c === '#' || c === 'x') continue;
      const k = `${nx},${nz}`;
      if (!seen.has(k)) { seen.add(k); q.push([nx, nz]); }
    }
  }
  return [...find('P'), ...find('S')].every((c) => seen.has(c.join()));
}

/**
 * World authoring, between expeditions: one variation per sector from what earlier expeditions did, checked
 * for playability, cached as the accepted version. Deterministic for a given memory, so a retry sees the same
 * world. Signals of interest (optional rooms explored, documents read, puzzles solved, "unsettling" feedback)
 * decide which places get expanded; "I got lost" feedback makes a place simpler, not bigger.
 */
export function authorExpedition(sectors) {
  const out = {};
  sectors.forEach((sector, index) => {
    const m = facility.sectors[`s${index}`];
    if (!m) return;
    const v = { notes: [] };
    const interest = (m.interest || 0) + (m.feedback?.unsettling || 0) * 3 - (m.feedback?.lost || 0) * 3;
    // A repaired system opens more of the building: "the service corridor has been extended".
    if (m.restored && interest >= 2) { v.extend = true; v.notes.push('the service corridor has been extended'); }
    // The water is where the latest decision left it (not a sum of every decision ever made).
    if (m.water) {
      const grid = sector.map.map((r) => [...r]);
      const cells = [];
      grid.forEach((row, z) => row.forEach((c, x) => {
        if (m.water === 'flooded' && c === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => grid[z + dz]?.[x + dx] === '~')) cells.push([x, z, '~']);
        if (m.water === 'drained' && c === '~') cells.push([x, z, '.']);
      }));
      for (const [x, z, to] of cells.slice(0, 6)) grid[z][x] = to;
      const candidate = grid.map((r) => r.join(''));
      const last = facility.accepted[sector.id]?.map;
      // Accept the candidate; failing that the last accepted map if it still passes; failing that the base map.
      if (playable(candidate)) v.map = candidate;
      else if (last && playable(last)) v.map = last;
      if (v.map) { v.water = m.water; v.notes.push(m.water === 'flooded' ? 'a familiar room is flooded' : 'the water is lower than you left it'); }
    }
    // A repaired place remembers who repaired it, wrongly.
    if (m.restored) { v.plaque = true; v.lockers = true; }
    // Where people died, the facility remembers: a warning, a vest at the spot, a notice, a cache. Not harder.
    if ((m.deaths || 0) >= 1 && m.lastDeath) { v.dangerous = true; v.deathAt = m.lastDeath; v.notes.push('it remembers where you died'); }
    if (m.bypassed && !m.restored) { v.waiting = true; v.notes.push('the dock you skipped is waiting with its lights on'); }
    facility.accepted[sector.id] = v;
    facility.history.push({ expedition: facility.expeditions, sector: sector.id, notes: v.notes });
    out[index] = v;
  });
  if (facility.history.length > 200) facility.history.splice(0, facility.history.length - 200);
  saveFacility();
  return out;
}

/** The facility's records: confident, official, and wrong about the people you saved. */
export function falseRecord(visitor, sectorName) {
  const year = 1960 + ((visitor.name.length * 7) % 30);
  return [
    `ATTENDANCE SHEET · ${sectorName}: ${visitor.name.toUpperCase()} — NOT ADMITTED · NO RECORD OF ENTRY`,
    `MAINTENANCE TERMINAL · ${sectorName}: ROOM INSPECTED BY ${visitor.name.toUpperCase()}, ${year}. NO FAULTS FOUND.`,
    `STAFF PHOTOGRAPH, ${year}: ${visitor.name} stands third from the left, in a Pumphouse vest, already wet.`,
  ][facility.visitors.indexOf(visitor) % 3];
}
