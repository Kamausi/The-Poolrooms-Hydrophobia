// Keyboard, mouse, pointer lock and touch, collected into one state object read once per frame.

export const input = {
  keys: new Set(),
  pressed: new Set(), // keys pressed since the last frame
  firing: false,
  scanHeld: false, // right mouse or touch SCAN; Q also scans
  get scanning() {
    return this.scanHeld || this.keys.has('q');
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
    if ([' ', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
  });
  addEventListener('keyup', (e) => input.keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => {
    input.keys.clear();
    input.firing = false;
    input.scanHeld = false;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) input.firing = true;
    if (e.button === 2) input.scanHeld = true;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('mouseup', (e) => {
    if (e.button === 0) input.firing = false;
    if (e.button === 2) input.scanHeld = false;
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
}
