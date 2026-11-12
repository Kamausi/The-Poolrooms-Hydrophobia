// Keyboard, mouse, pointer lock and touch, collected into one state object read once per frame.
// Rebinding: the game reads each action's default key; settings.bindings maps the physical key onto it.
import { padTables } from './padmap.js';
import { settings, ACTIONS } from './settings.js';

let remap = new Map(); // physical → default key
let shadowed = new Set(); // default keys that were rebound away (pressing them does nothing)
export function applyBindings() {
  remap = new Map();
  shadowed = new Set();
  for (const [id, , def] of ACTIONS) {
    const bound = settings.bindings?.[id];
    if (bound && bound !== def) { remap.set(bound, def); shadowed.add(def); }
  }
}
const logical = (k) => (remap.has(k) ? remap.get(k) : shadowed.has(k) ? null : k);

export const input = {
  keys: new Set(),
  pressed: new Set(), // keys pressed since the last frame
  firing: false,
  context: 'ride', // the scene sets this; right mouse locks on the raft and scans on foot
  rightHeld: false,
  scanHeld: false, // touch SCAN or controller Y
  lockHeld: false, // touch LOCK or controller left trigger
  braceHeld: false, // touch BRACE or controller B
  paddleHeld: false, // touch PADDLE, or controller L3 (toggles)
  patchHeld: false, // touch PATCH or controller D-pad down
  pad: false,
  get scanning() {
    return this.scanHeld || this.keys.has('q') || (this.rightHeld && this.context !== 'ride');
  },
  get locking() {
    return this.lockHeld || (this.rightHeld && this.context === 'ride');
  },
  /** Hold to paddle: lowers the blaster. One hold is a steady stroke rhythm, never mashing. */
  get paddling() {
    return this.paddleHeld || (!settings.paddleToggle && this.keys.has('v'));
  },
  /** Hold to find a leak, press a patch over it, and pump the chamber back up. */
  get patching() {
    return this.patchHeld || this.keys.has('g');
  },
  get bracing() {
    return this.braceHeld || (!settings.braceToggle && (this.keys.has('control') || this.keys.has('c')));
  },
  aim: [0, 0], // cursor in normalised device coordinates (ride mode)
  look: [0, 0], // accumulated mouse movement since last frame (explore mode)
  move: [0, 0], // touch stick, x right, y forward
  touch: false,
  locked: false,
};

let canvas = null;

export function initInput(target) {
  canvas = target;
  applyBindings();
  addEventListener('keydown', (e) => {
    if (input.capture) { e.preventDefault(); input.capture(e.key.toLowerCase()); input.capture = null; return; }
    const raw = e.key.toLowerCase();
    input.pad = false; // prompts follow the device you last touched
    if ([' ', 'arrowup', 'arrowdown', 'control', 'tab'].includes(raw)) e.preventDefault();
    const k = logical(raw);
    if (!k) return;
    if (!input.keys.has(k)) {
      input.pressed.add(k);
      if (k === 'v' && settings.paddleToggle) input.paddleHeld = !input.paddleHeld;
      if ((k === 'c' || k === 'control') && settings.braceToggle) input.braceHeld = !input.braceHeld;
    }
    input.keys.add(k);
  });
  addEventListener('keyup', (e) => { const k = logical(e.key.toLowerCase()); if (k) input.keys.delete(k); });
  addEventListener('wheel', (e) => { if (input.context === 'ride' || input.context === 'explore') input.pressed.add(e.deltaY > 0 ? 'tab' : 'cycle-'); }, { passive: true });
  addEventListener('blur', () => {
    input.keys.clear();
    input.firing = false;
    input.scanHeld = false;
    input.rightHeld = false;
    input.lockHeld = false;
    input.braceHeld = false;
    input.paddleHeld = false;
    input.patchHeld = false;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) input.firing = true;
    if (e.button === 2) input.rightHeld = true;
    if (e.button === 1) { input.pressed.add('b'); e.preventDefault(); }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('mouseup', (e) => {
    if (e.button === 0) input.firing = false;
    if (e.button === 2) input.rightHeld = false;
  });
  addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.aim[0] = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    input.aim[1] = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    if (input.locked) {
      input.look[0] += e.movementX;
      input.look[1] += e.movementY;
    }
  });
  document.addEventListener('pointerlockchange', () => {
    input.locked = document.pointerLockElement === canvas;
  });

  setupTouch();
}

export function requestLock() {
  if (input.touch || !canvas || document.pointerLockElement === canvas) return;
  canvas.requestPointerLock?.()?.catch?.(() => {});
}

export function releaseLock() {
  if (document.pointerLockElement) document.exitPointerLock();
}

/** Call at the end of each frame. */
export function endFrame() {
  input.pressed.clear();
  input.look[0] = 0;
  input.look[1] = 0;
}

export const wasPressed = (k) => input.pressed.has(k);
export const isDown = (k) => input.keys.has(k);

// Touch: left half of the screen is a movement stick, right half aims or looks; buttons fire and act.
function setupTouch() {
  const stick = { id: null, x: 0, y: 0 };
  const look = { id: null, x: 0, y: 0 };
  canvas.addEventListener('touchstart', (e) => {
    input.touch = true;
    document.body.classList.add('touch');
    for (const t of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      if (t.clientX < rect.width / 2 && stick.id === null) Object.assign(stick, { id: t.identifier, x: t.clientX, y: t.clientY });
      else if (look.id === null) {
        Object.assign(look, { id: t.identifier, x: t.clientX, y: t.clientY });
        input.aim[0] = ((t.clientX - rect.left) / rect.width) * 2 - 1;
        input.aim[1] = -(((t.clientY - rect.top) / rect.height) * 2 - 1);
      }
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      if (t.identifier === stick.id) {
        input.move[0] = Math.max(-1, Math.min(1, (t.clientX - stick.x) / 50));
        input.move[1] = Math.max(-1, Math.min(1, -(t.clientY - stick.y) / 50));
      } else if (t.identifier === look.id) {
        input.look[0] += (t.clientX - look.x) * 2;
        input.look[1] += (t.clientY - look.y) * 2;
        look.x = t.clientX;
        look.y = t.clientY;
        input.aim[0] = ((t.clientX - rect.left) / rect.width) * 2 - 1;
        input.aim[1] = -(((t.clientY - rect.top) / rect.height) * 2 - 1);
      }
    }
    e.preventDefault();
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stick.id) {
        stick.id = null;
        input.move[0] = input.move[1] = 0;
      }
      if (t.identifier === look.id) look.id = null;
    }
  };
  canvas.addEventListener('touchend', end);
  canvas.addEventListener('touchcancel', end);

  const hold = (id, on, off) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => { on(); e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend', (e) => { off(); e.preventDefault(); }, { passive: false });
  };
  hold('touch-fire', () => (input.firing = true), () => (input.firing = false));
  hold('touch-use', () => input.pressed.add('e'), () => {});
  hold('touch-reload', () => input.pressed.add('r'), () => {});
  hold('touch-boost', () => input.keys.add('shift'), () => input.keys.delete('shift'));
  hold('touch-scan', () => (input.scanHeld = true), () => (input.scanHeld = false));
  hold('touch-burst', () => input.pressed.add('f'), () => {});
  hold('touch-jump', () => { input.pressed.add(' '); input.keys.add(' '); }, () => input.keys.delete(' '));
  hold('touch-brace', () => (input.braceHeld = true), () => (input.braceHeld = false));
  hold('touch-lock', () => (input.lockHeld = true), () => (input.lockHeld = false));
  hold('touch-paddle', () => (input.paddleHeld = true), () => (input.paddleHeld = false));
  hold('touch-patch', () => (input.patchHeld = true), () => (input.patchHeld = false));
  hold('touch-shove', () => input.pressed.add('z'), () => {});
  hold('touch-ping', () => input.pressed.add('b'), () => {});
  hold('touch-cycle', () => input.pressed.add('tab'), () => {});
}

// Controller (Gamepad API). Left stick steers or moves; right stick aims (raft) or looks (on foot).
// Defaults: RT fire · LT lock/focus · A hop · B brace (tap: shove) · X use · Y scan · LB burst · RB boost
// R3 look back · L3 paddle (toggle) · D-pad up recharge · D-pad down patch · D-pad left ping · D-pad right next
// profile · Select dressing · Start pause. The actions in PAD_ACTIONS can be rebound (settings.padBindings).
// Menus, the pause screen and Safe Rooms are fully navigable: D-pad or left stick to move, A to choose,
// B to go back, left/right to change sliders and options.
export const PAD_ACTIONS = [
  ['hop', 'Hop / jump', 0], ['use', 'Use / rescue / line', 2], ['burst', 'Disruption burst', 4], ['boost', 'Boost / run', 5],
  ['dressing', 'Field dressing', 8], ['paddle', 'Paddle (toggle)', 10], ['lookback', 'Look back', 11], ['recharge', 'Recharge', 12],
  ['patch', 'Patch and pump', 13], ['ping', 'Ping / radio check', 14], ['cycle', 'Next blaster profile', 15],
];
export const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Select', 'Start', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'];
const padMap = () => Object.fromEntries(PAD_ACTIONS.map(([id, , def]) => [id, settings.padBindings?.[id] ?? def]));
const prev = [];
let bDown = 0;
const navPrev = { up: false, down: false, left: false, right: false, a: false, b: false };

function visibleOverlay() {
  for (const id of ['modal', 'paused', 'menu']) {
    const el = document.getElementById(id);
    if (el && !el.hidden && getComputedStyle(el).display !== 'none') return el;
  }
  return null;
}

/** Menu navigation with a controller: move focus through what can be chosen, A to choose, B to go back. */
function navigate(overlay, pad, b) {
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  const now = { up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, left: b(14) || ax < -0.6, right: b(15) || ax > 0.6, a: b(0), b: b(1) };
  const edge = (k) => now[k] && !navPrev[k];
  const items = [...overlay.querySelectorAll('button:not([disabled]), input, select, a[href]')].filter((el) => el.offsetParent !== null);
  let i = items.indexOf(document.activeElement);
  const focus = (j) => { const el = items[(j + items.length) % items.length]; el?.focus(); el?.scrollIntoView({ block: 'nearest' }); };
  if (edge('down')) focus(i < 0 ? 0 : i + 1);
  if (edge('up')) focus(i < 0 ? items.length - 1 : i - 1);
  const el = document.activeElement;
  if ((edge('left') || edge('right')) && el && items.includes(el)) {
    const dir = edge('right') ? 1 : -1;
    if (el.type === 'range') { el.value = String(Number(el.value) + dir * Number(el.step || 0.1)); el.dispatchEvent(new Event('input')); }
    else if (el.tagName === 'SELECT') { el.selectedIndex = Math.max(0, Math.min(el.options.length - 1, el.selectedIndex + dir)); el.dispatchEvent(new Event('change')); }
    else focus(i + dir);
  }
  if (edge('a') && el && items.includes(el)) el.click();
  if (edge('b')) input.pressed.add('escape');
  if (b(9) && !prev[9]) input.pressed.add('escape');
  Object.assign(navPrev, now);
}

export function pollGamepad(dt) {
  const pad = navigator.getGamepads?.().find((g) => g && g.connected);
  if (!pad) return;
  const b = (i) => !!pad.buttons[i]?.pressed;
  const any = pad.buttons.some((x) => x.pressed) || pad.axes.some((a) => Math.abs(a) > 0.3);
  if (any) input.pad = true;
  if (!input.pad) return;
  // Rebinding: the first newly pressed button is the answer.
  if (input.padCapture) {
    const i = pad.buttons.findIndex((x, k) => x.pressed && !prev[k]);
    if (i >= 0) { const f = input.padCapture; input.padCapture = null; f(i); }
    pad.buttons.forEach((x, k) => (prev[k] = x.pressed));
    return;
  }
  const overlay = visibleOverlay();
  if (overlay) {
    navigate(overlay, pad, b);
    pad.buttons.forEach((x, k) => (prev[k] = x.pressed));
    return;
  }
  const M = padMap();
  const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
  input.move[0] = dz(pad.axes[0] || 0);
  input.move[1] = -dz(pad.axes[1] || 0);
  const rx = dz(pad.axes[2] || 0), ry = dz(pad.axes[3] || 0);
  if (input.context === 'ride') {
    const f = input.aimFriction ?? 1; // set by the raft each frame: slower over a target (aim assist)
    input.aim[0] = Math.max(-0.95, Math.min(0.95, input.aim[0] + rx * dt * 1.8 * f));
    input.aim[1] = Math.max(-0.9, Math.min(0.9, input.aim[1] - ry * dt * 1.8 * f));
  } else {
    input.look[0] += rx * dt * 700;
    input.look[1] += ry * dt * 500;
  }
  input.firing = b(7) || (pad.buttons[7]?.value || 0) > 0.4;
  input.lockHeld = b(6) || (pad.buttons[6]?.value || 0) > 0.4;
  if (!settings.braceToggle) input.braceHeld = b(1);
  // A tap of B is a shove; holding it is a brace.
  if (b(1)) bDown += dt;
  else if (bDown > 0) { if (bDown < 0.2) input.pressed.add('z'); if (settings.braceToggle && bDown < 0.2) input.braceHeld = !input.braceHeld; bDown = 0; }
  input.scanHeld = b(3);
  const T = padTables(input.context === 'explore' ? 'explore' : 'ride', M);
  input.patchHeld = T.patchHeld && b(M.patch);
  if (b(M.paddle) && !prev[M.paddle]) input.paddleHeld = !input.paddleHeld;
  if (input.firing && input.paddleHeld && input.context === 'ride') input.paddleHeld = false;
  // Ping is held, not pressed: a tap pings, a hold opens the callout strip. The tables differ on foot (padmap.js).
  const EDGE = T.edge, HOLD = T.hold;
  if (input.context === 'explore') input.keys.delete('x');
  for (const [i, k] of Object.entries(EDGE)) if (b(+i) && !prev[i]) input.pressed.add(k);
  for (const [i, k] of Object.entries(HOLD)) b(+i) ? input.keys.add(k) : prev[i] && input.keys.delete(k);
  pad.buttons.forEach((x, i) => (prev[i] = x.pressed));
}

/** The label of whatever the player has bound to an action, on the device they are using: "E", "SPACE", "X". */
export function bindingLabel(id) {
  if (input.pad) {
    const pa = PAD_ACTIONS.find(([a]) => a === id);
    if (pa) return PAD_NAMES[settings.padBindings?.[id] ?? pa[2]];
  }
  const def = ACTIONS.find(([a]) => a === id)?.[2];
  const k = settings.bindings?.[id] || def || id;
  return { ' ': 'SPACE', shift: 'SHIFT', tab: 'TAB', control: 'CTRL', escape: 'ESC' }[k] || k.toUpperCase();
}

/** The same label, found from an action's default key (the letter written into older prompt text). */
export function labelForDefaultKey(key) {
  const a = ACTIONS.find(([, , def]) => def === key.toLowerCase());
  return a ? bindingLabel(a[0]) : key;
}
