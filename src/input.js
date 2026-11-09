// Keyboard, mouse, pointer lock and touch, collected into one state object read once per frame.

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
    return this.paddleHeld || this.keys.has('v');
  },
  /** Hold to find a leak, press a patch over it, and pump the chamber back up. */
  get patching() {
    return this.patchHeld || this.keys.has('g');
  },
  get bracing() {
    return this.braceHeld || this.keys.has('control') || this.keys.has('c');
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
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!input.keys.has(k)) input.pressed.add(k);
    input.keys.add(k);
    if ([' ', 'arrowup', 'arrowdown', 'control'].includes(k)) e.preventDefault();
  });
  addEventListener('keyup', (e) => input.keys.delete(e.key.toLowerCase()));
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
}

// Controller (Gamepad API). Left stick steers or moves; right stick aims (raft) or looks (on foot).
// RT fire · LT lock · A hop · B brace · X use · Y scan · LB burst · RB boost · R3 look back · L3 paddle (toggle)
// D-pad up recharge · D-pad down patch · Start pause
const prev = [];
const EDGE = { 0: ' ', 2: 'e', 4: 'f', 9: 'escape', 12: 'r', 8: 'h' };
const HOLD = { 5: 'shift', 11: 'x', 0: ' ' };
export function pollGamepad(dt) {
  const pad = navigator.getGamepads?.().find((g) => g && g.connected);
  if (!pad) return;
  const b = (i) => !!pad.buttons[i]?.pressed;
  const any = pad.buttons.some((x) => x.pressed) || pad.axes.some((a) => Math.abs(a) > 0.3);
  if (any) input.pad = true;
  if (!input.pad) return;
  const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
  input.move[0] = dz(pad.axes[0] || 0);
  input.move[1] = -dz(pad.axes[1] || 0);
  const rx = dz(pad.axes[2] || 0), ry = dz(pad.axes[3] || 0);
  if (input.context === 'ride') {
    input.aim[0] = Math.max(-0.95, Math.min(0.95, input.aim[0] + rx * dt * 1.8));
    input.aim[1] = Math.max(-0.9, Math.min(0.9, input.aim[1] - ry * dt * 1.8));
  } else {
    input.look[0] += rx * dt * 700;
    input.look[1] += ry * dt * 500;
  }
  input.firing = b(7) || (pad.buttons[7]?.value || 0) > 0.4;
  input.lockHeld = b(6) || (pad.buttons[6]?.value || 0) > 0.4;
  input.braceHeld = b(1);
  input.scanHeld = b(3);
  input.patchHeld = b(13);
  if (b(10) && !prev[10]) input.paddleHeld = !input.paddleHeld;
  if (input.firing && input.paddleHeld && input.context === 'ride') input.paddleHeld = false;
  for (const [i, k] of Object.entries(EDGE)) if (b(+i) && !prev[i]) input.pressed.add(k);
  for (const [i, k] of Object.entries(HOLD)) b(+i) ? input.keys.add(k) : prev[i] && input.keys.delete(k);
  pad.buttons.forEach((x, i) => (prev[i] = x.pressed));
}
