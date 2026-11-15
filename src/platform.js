// Browser services the game asks for, each optional: where a browser lacks one (or refuses it) the game carries on
// as before.
//
// - Raw mouse: Pointer Lock with `unadjustedMovement`, so the operating system's pointer acceleration does not bend
//   aim. Browsers that do not support it reject the request; the lock is then taken without it.
// - Screen Wake Lock while a run is being played, so a long ride on a controller does not dim the screen. Released
//   on the menu and when paused; the browser drops it when the tab is hidden, and it is taken again on return.
// - Persistent storage: asked once, after the first save, so the browser does not clear the save, the settings and
//   the facility's memory under storage pressure.

const status = { rawMouse: 'unknown', wake: 'off', persist: 'unasked' };
let sentinel = null, wantAwake = false, asking = false, resumed = false;
// The browser drops the lock when the tab is hidden; ask again when it is shown.
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) resumed = true; });

/** Take the pointer lock on `el`, with raw (unaccelerated) movement where the browser allows it. */
export function lockPointer(el) {
  if (!el?.requestPointerLock) return;
  let p;
  try { p = el.requestPointerLock({ unadjustedMovement: true }); } catch { p = null; }
  if (p && typeof p.then === 'function') {
    p.then(() => { status.rawMouse = 'on'; }).catch((e) => {
      // Not supported here: take the ordinary lock instead.
      if (e?.name === 'NotSupportedError') { status.rawMouse = 'unsupported'; el.requestPointerLock()?.catch?.(() => {}); }
    });
  } else status.rawMouse = 'unsupported'; // an old browser without the promise form
}

/** Keep the screen awake while `on` (called every frame; it only acts on a change). */
export function keepAwake(on) {
  // Ask on the way into play (and on coming back to a visible tab), not every frame: a refusal is not retried until
  // play stops and starts again.
  const rising = on && (!wantAwake || resumed);
  resumed = false;
  wantAwake = on;
  if (rising && !sentinel && !asking && !document.hidden && navigator.wakeLock?.request) {
    asking = true;
    navigator.wakeLock.request('screen').then((s) => {
      asking = false;
      sentinel = s;
      status.wake = 'on';
      s.addEventListener?.('release', () => { sentinel = null; status.wake = 'off'; });
      if (!wantAwake) release();
    }).catch(() => { asking = false; status.wake = 'refused'; });
  } else if (!on && sentinel) release();
  else if (!navigator.wakeLock) status.wake = 'unsupported';
}

function release() {
  const s = sentinel;
  sentinel = null;
  status.wake = 'off';
  s?.release?.().catch?.(() => {});
}

/** Ask the browser once to keep this site's storage (saves, settings, the facility's memory). */
export function persistStorage() {
  if (status.persist !== 'unasked') return;
  status.persist = 'asking';
  if (!navigator.storage?.persist) { status.persist = 'unsupported'; return; }
  navigator.storage.persisted().then((already) => (already ? true : navigator.storage.persist()))
    .then((granted) => { status.persist = granted ? 'granted' : 'denied'; })
    .catch(() => { status.persist = 'denied'; });
}

/** What was granted (for tests and the settings screen). */
export const platformStatus = () => ({ ...status });
