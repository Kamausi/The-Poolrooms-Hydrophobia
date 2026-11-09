// The facility's memory. The Poolrooms remember what expeditions did, and between expeditions they author
// consequences from it: a repaired system opens a passage, a diverted current floods a familiar room, a
// rescued visitor turns up in an old record. The mechanical history stays accurate; the facility's written
// account of it does not.
//
// Three systems, three jobs:
//   world authoring (here)   proposes variations from memory, ahead of play, between expeditions
//   the director             threats, pressure and recovery during an expedition (director.js)
//   shared rules             movement, shooting, rescues, objectives (everywhere else)
// An expedition's world is fixed when it departs: every room it enters keeps the accepted layout until it
// returns. Grout's live alterations follow their own warnings. Every authored variation is checked for
// playability (the cell and the machine still reachable from the dock) before it is accepted; anything that
// fails falls back to the last accepted version, so an expedition always has content.

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

/** Names the facility gives the people you bring back. It will forget them in its own way. */
const VISITOR_NAMES = ['Ines Varga', 'Theo Lund', 'Abena Mensah', 'Ruth Calloway', 'Sami Haddad', 'Lio Park', 'Grete Holm', 'Nnamdi Eze', 'Clara Voss', 'Pavel Orlov'];

function blank() {
  return {
    expeditions: 0,
    sectors: {}, // key → { restored, flooded, drained, bypassed, deaths, damage, interest, lost, visits, feedback }
    visitors: [], // { name, sector, expedition }
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

export const sectorMem = (key) => (facility.sectors[key] ||= { restored: 0, flooded: 0, drained: 0, bypassed: 0, deaths: 0, damage: 0, interest: 0, lost: 0, visits: 0, feedback: {} });

export function recordSector(key, field, n = 1) {
  sectorMem(key)[field] = (sectorMem(key)[field] || 0) + n;
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

export function rescueVisitor(sectorKey) {
  const name = VISITOR_NAMES[facility.visitors.length % VISITOR_NAMES.length];
  facility.visitors.push({ name, sector: sectorKey, expedition: facility.expeditions });
  note('visitors', `${name} · brought to safety · expedition ${facility.expeditions}`);
  return name;
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
    // A changed water level persists: the flooded side floods a familiar room, the drained side dries one.
    const map = sector.map.map((r) => r);
    let edited = map;
    if (m.flooded || m.drained) {
      const grid = map.map((r) => [...r]);
      const cells = [];
      grid.forEach((row, z) => row.forEach((c, x) => {
        if (m.flooded && c === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => grid[z + dz]?.[x + dx] === '~')) cells.push([x, z, '~']);
        if (m.drained && c === '~') cells.push([x, z, '.']);
      }));
      for (const [x, z, to] of cells.slice(0, 6)) grid[z][x] = to;
      const candidate = grid.map((r) => r.join(''));
      if (playable(candidate)) { edited = candidate; v.notes.push(m.flooded ? 'a familiar room is flooded' : 'the water is lower than you left it'); }
    }
    if (edited !== map) v.map = edited;
    // A repaired place remembers who repaired it, wrongly.
    if (m.restored) { v.plaque = true; v.lockers = true; }
    // Where people kept dying, the facility leaves notes, and the swarms are heavier.
    if ((m.deaths || 0) >= 2) { v.dangerous = true; v.notes.push('people keep dying here'); }
    if (m.bypassed && !m.restored) { v.waiting = true; v.notes.push('the dock you skipped is waiting with its lights on'); }
    // Accept only what passes; otherwise keep the last accepted version.
    if (v.map && !playable(v.map)) v.map = facility.accepted[sector.id]?.map;
    facility.accepted[sector.id] = v;
    out[index] = v;
  });
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
