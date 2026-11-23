// The investigative layer's counts, from the audit ("records, counts, routes, reached through inspection"). The
// journal already keeps what the crew saw (the ledger), what the facility claims (its records) and the route map.
// This adds the thing a player can check for themselves: every time the facility addresses you by number, the notes
// keep what it said beside how many of you there were. Read in the pause journal, it is the Attendant's tell laid
// out as evidence: an honest instruction always has the right count, a false one never does (ai/attendant.js).
//
// Nothing is marked for you. The notes show both numbers; deciding what that means is the player's job.
// Pure and unit-tested.

import { countWord } from './ai/attendant.js';

/** How many claims the notes keep (the oldest go first). */
export const KEEP = 24;

/** Note one claim. `notes` is an array kept on the expedition state. Returns the note. */
export function noteClaim(notes, { sector, said, actual, what, t = 0 }) {
  const n = { sector, said, actual, what, t };
  notes.push(n);
  while (notes.length > KEEP) notes.shift();
  return n;
}

const WHAT = { wait: 'asked you to wait', proceed: 'sent you somewhere', gate: 'closed the boarding gate', lock: 'locked a door', route: 'named a channel', dose: 'cleared the water' };

/** One line of the notes as the journal shows it: what was said, and how many of you there were. */
export function claimLine(n) {
  const said = `${countWord(n.said)[0].toUpperCase()}${countWord(n.said).slice(1)} ${n.said === 1 ? 'guest' : 'guests'}`;
  const you = n.actual === 1 ? 'you were alone' : `there were ${countWord(n.actual)} of you`;
  return `${n.sector} · "${said}" · it ${WHAT[n.what] || 'spoke'} · ${you}`;
}

/** A summary for the top of the page: how many claims, and how many had a count that was not yours. */
export function claimSummary(notes) {
  const off = notes.filter((n) => n.said !== n.actual).length;
  return { total: notes.length, off };
}

// ---------- Readings: what the inspection beam showed ----------
// A reading enters the notes only when you hold the beam on something until it reads (the audit's "reached through
// inspection"). Reading the same thing again adds a line only if it says something different now, so a sign that
// changed while you were not looking leaves both versions in the notes.

/** How many readings the notes keep (the oldest go first). */
export const KEEP_READINGS = 40;

/** Note a reading. Returns the new note, or null when this thing read the same as last time. */
export function noteReading(readings, { sector, key, label, text, t = 0 }) {
  const last = [...readings].reverse().find((r) => r.sector === sector && r.key === key);
  if (last && last.text === text) return null;
  const r = { sector, key, label, text, t, again: !!last };
  readings.push(r);
  while (readings.length > KEEP_READINGS) readings.shift();
  return r;
}

/** One reading as the journal shows it. A second, different reading of the same thing says so. */
export const readingLine = (r) => `${r.sector} · ${r.label}${r.again ? ' (read again)' : ''} · ${r.text}`;

// ---------- One view: everything by attraction ----------
// The audit asks for records, counts and routes "organised as one". The journal's other tabs keep each kind apart
// (so contradictions can be compared); the field notes put them side by side for each attraction you have reached:
// where it is on the route, what the crew saw there (the ledger), what the beam read, what the facility counted, and
// which documents came from there.

const LEDGER_KINDS = ['places', 'machinery', 'behaviours', 'visitors', 'changes'];

/**
 * The case for each attraction reached, newest first. `sectors` are the attraction names in route order;
 * `sectorIndex` where you are; `ledger` the crew ledger ({ kind: ['NAME: text'] }); `readings`, `claims` the notes;
 * `documents` the logbook ([{ title, text }]). Returns [{ name, route, seen, read, counted, documents }].
 */
export function casebook({ sectors, sectorIndex, ledger = {}, readings = [], claims = [], documents = [], departures = {} }) {
  const out = [];
  for (let i = Math.min(sectorIndex, sectors.length - 1); i >= 0; i--) {
    const name = sectors[i];
    const prefix = `${name}: `;
    const seen = LEDGER_KINDS.flatMap((k) => (ledger[k] || []).filter((l) => l.startsWith(prefix)).map((l) => l.slice(prefix.length)));
    out.push({
      name,
      route: i === sectorIndex ? 'YOU ARE HERE' : 'SURVEYED',
      seen,
      read: readings.filter((r) => r.sector === name).reverse(),
      counted: claims.filter((c) => c.sector === name).reverse(),
      documents: documents.filter((d) => d.title.toUpperCase().includes(name.toUpperCase())).map((d) => d.title),
      left: Object.values(departures).filter((d) => d.sector === name).flatMap((d) => d.text),
    });
  }
  return out;
}
