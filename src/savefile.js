// Save integrity. A save is written as an envelope: the schema it follows, the build that wrote it, when, a checksum of
// the state, and the state. Reading checks all of it and says what was wrong in words a player can read:
//
// - an envelope from a newer schema is refused (an older build must not half-read it);
// - an unversioned save (what builds before schema 3 wrote) is migrated: it is the bare state;
// - a checksum that does not match means the text was damaged or edited, and the save is refused;
// - the state must have the shape the game relies on (sector index in range, numbers that are numbers, lists that
//   are lists); anything outside that is refused rather than loaded into a broken run.
//
// The writer keeps the previous good save as a backup, so a damaged save falls back one checkpoint instead of losing
// the campaign. Pure and unit-tested except `writeSave` / `readSave`, which take a storage object.

export const SAVE_SCHEMA = 3;

/** FNV-1a over the text: cheap and enough to catch damage (not a security measure). */
export function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** The envelope for a state. */
export function wrap(state, { build = 'dev', now = Date.now() } = {}) {
  const text = JSON.stringify(state);
  return { schema: SAVE_SCHEMA, build, savedAt: now, sum: checksum(text), state: JSON.parse(text) };
}

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * What is wrong with a state, or null. `sectors` is how many attractions exist (a sector index past them is a save from
 * a different game layout).
 */
export function problemWith(s, { sectors = 8 } = {}) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return 'it holds no game';
  if (!Number.isInteger(s.sectorIndex) || s.sectorIndex < 0 || (!s.endless && !s.custom && s.sectorIndex >= sectors)) return 'its attraction does not exist';
  for (const k of ['health', 'drift', 'score']) if (k in s && !num(s[k])) return `its ${k} is not a number`;
  if ('health' in s && (s.health < 0 || s.health > 1e7)) return 'its health is out of range';
  for (const k of ['upgrades', 'logbook', 'leaks', 'gear', 'forgotten', 'tags']) if (k in s && !Array.isArray(s[k])) return `its ${k} is not a list`;
  if ('power' in s && (typeof s.power !== 'object' || s.power === null)) return 'its power record is damaged';
  return null;
}

/**
 * Read an envelope (or a pre-envelope save). Returns { state, migrated } when it can be used, or { problem } saying why
 * not. `raw` is the parsed JSON. `opts.check` replaces the shape check (the resume record wraps a state).
 */
export function unwrap(raw, opts = {}) {
  if (raw == null) return { problem: 'there is no save' };
  let state, migrated = false;
  if (typeof raw === 'object' && 'schema' in raw && 'state' in raw) {
    if (raw.schema > SAVE_SCHEMA) return { problem: 'it was written by a newer version of the game' };
    if (raw.sum !== checksum(JSON.stringify(raw.state))) return { problem: 'it was damaged (the checksum does not match)' };
    state = raw.state;
  } else {
    state = raw; // schema 2 and earlier: the bare state
    migrated = true;
  }
  const p = (opts.check || problemWith)(state, opts);
  return p ? { problem: p } : { state, migrated };
}

/** Parse text safely: the JSON, or undefined when it is not JSON at all. */
const parse = (text) => { try { return JSON.parse(text); } catch { return undefined; } };

/**
 * Write `state` under `key`, moving the previous good save to `key-backup` first. Returns false if storage refused.
 * @param {{ getItem(k: string): string | null, setItem(k: string, v: string): void }} store
 */
export function writeSave(store, key, state, opts = {}) {
  try {
    const prev = store.getItem(key);
    if (prev && !unwrap(parse(prev), opts).problem) store.setItem(`${key}-backup`, prev);
    store.setItem(key, JSON.stringify(wrap(state, opts)));
    return true;
  } catch { return false; }
}

/**
 * Read the save under `key`; if it is damaged, the backup. Returns { state, from: 'save' | 'backup', migrated,
 * problem? } or { state: null, problem } when neither can be used.
 */
export function readSave(store, key, opts = {}) {
  let text = null;
  try { text = store.getItem(key); } catch { /* storage unavailable */ }
  if (text == null) return { state: null, problem: null };
  const parsed = parse(text);
  const main = parsed === undefined ? { problem: 'it was cut off or damaged' } : unwrap(parsed, opts);
  if (!main.problem) return { state: main.state, from: 'save', migrated: main.migrated };
  let back = null;
  try { back = store.getItem(`${key}-backup`); } catch { /* storage unavailable */ }
  const b = back == null ? { problem: 'there is no backup' } : unwrap(parse(back), opts);
  if (!b.problem) return { state: b.state, from: 'backup', migrated: b.migrated, problem: main.problem };
  return { state: null, problem: main.problem };
}
