// Storage beyond localStorage, each part optional.
//
// - The photo album: ride photos (JPEG data URLs, ~50 KB each) are too big for localStorage, so they lived only for
//   the session. They now go to IndexedDB (database `underflow-album`), keyed by sector, the last few kept; the
//   game loads them back at boot. Without IndexedDB they stay session-only, as before.
// - Save files: the save, the settings and the facility's memory as one gzip-compressed file to download
//   (CompressionStream, built into the browser), and the same file read back. Lets a player move a campaign to
//   another browser or keep a copy.
//
// The pure parts (packing, unpacking, checking a save file) are unit-tested; the browser parts are checked headless.

export const SAVE_FILE_VERSION = 1;
/** localStorage keys a save file carries. */
export const SAVE_KEYS = ['underflow-save-v2', 'underflow-resume-v2', 'underflow-settings', 'underflow-facility', 'underflow-loops', 'underflow-endless-records', 'underflow-tips'];

/** The save file's contents, from a reader of localStorage values (key → string or null). */
export function packSave(read, { now = Date.now() } = {}) {
  const data = {};
  for (const k of SAVE_KEYS) { const v = read(k); if (v != null) data[k] = v; }
  return { game: 'the-poolrooms-hydrophobia', version: SAVE_FILE_VERSION, saved: now, data };
}

/** Check a parsed save file and return the entries to write back, or throw with a reason a player can read. */
export function unpackSave(file) {
  if (!file || file.game !== 'the-poolrooms-hydrophobia') throw new Error('This is not a Hydrophobia save file.');
  if (file.version > SAVE_FILE_VERSION) throw new Error('This save file is from a newer version of the game.');
  const out = {};
  for (const [k, v] of Object.entries(file.data || {})) {
    if (!SAVE_KEYS.includes(k) || typeof v !== 'string') continue;
    try { JSON.parse(v); } catch { throw new Error(`The save file is damaged (${k}).`); }
    out[k] = v;
  }
  if (!Object.keys(out).length) throw new Error('The save file is empty.');
  return out;
}

/** Gzip a string to bytes (CompressionStream), or null where the browser lacks it. */
export async function gzip(text) {
  if (typeof CompressionStream === 'undefined') return null;
  const s = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
/** Bytes back to text: gzip if it starts with the gzip magic number, plain text otherwise. */
export async function gunzip(bytes) {
  if (bytes[0] === 0x1f && bytes[1] === 0x8b && typeof DecompressionStream !== 'undefined') {
    const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(s).text();
  }
  return new TextDecoder().decode(bytes);
}

/** Download the save as `hydrophobia-save.json.gz` (or plain .json without CompressionStream). */
export async function exportSave() {
  const text = JSON.stringify(packSave((k) => localStorage.getItem(k)));
  const z = await gzip(text);
  const blob = new Blob([z || text], { type: z ? 'application/gzip' : 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = z ? 'hydrophobia-save.json.gz' : 'hydrophobia-save.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return { bytes: blob.size, compressed: !!z, plain: text.length };
}

/** Read a save file (bytes) and write it into localStorage. Returns the keys restored. */
export async function importSave(bytes) {
  const entries = unpackSave(JSON.parse(await gunzip(bytes)));
  for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
  return Object.keys(entries);
}

// ---------- The photo album (IndexedDB) ----------
const DB = 'underflow-album', STORE = 'photos', KEEP = 8;
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}
const done = (tx) => new Promise((r) => { tx.oncomplete = () => r(true); tx.onerror = tx.onabort = () => r(false); });

/** Keep a photo ({ sector, label, url }); the oldest go past the last eight. */
export async function savePhoto(photo) {
  const d = await db();
  if (!d) return false;
  const all = await loadPhotos();
  const tx = d.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE);
  st.add({ ...photo, at: Date.now() });
  for (const old of all.slice(0, Math.max(0, all.length + 1 - KEEP))) st.delete(old.id);
  return done(tx);
}

/** Every kept photo, oldest first ([] without IndexedDB). */
export async function loadPhotos() {
  const d = await db();
  if (!d) return [];
  return new Promise((resolve) => {
    const req = d.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}
