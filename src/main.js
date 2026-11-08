// UNDERFLOW: game flow. Menu → raft → dock → on foot → Safe Room → next sector → ending.
import '67js/addons/world-material-shader';
import { VERSION } from '67js';
import { SECTORS } from './sectors.js';
import { createRide } from './ride.js';
import { createExplore } from './explore.js';
import { initInput, input, endFrame, releaseLock, wasPressed } from './input.js';
import { initHud, hud } from './hud.js';
import { sound } from './audio.js';
import { quality } from './quality.js';

const SAVE_KEY = 'underflow-67js-save';
const canvas = document.getElementById('world');
const $ = (id) => document.getElementById(id);

const UPGRADES = [
  { id: 'capacitor', name: 'Ballast capacitor', text: '+8 blaster charge', cost: 2, apply: (s) => (s.maxCharge += 8) },
  { id: 'coil', name: 'Quick-strike coil', text: 'Recharge 40% faster', cost: 2, apply: (s) => (s.rechargeTime *= 0.6) },
  { id: 'focus', name: 'Focused arc', text: 'Each hit does double damage', cost: 3, apply: (s) => (s.damage = 2) },
];
const ROUTES = [
  { id: 'lazy', name: 'The Lazy River', text: 'Slower water, fewer things in it. Normal score.', threat: 0.75, score: 1 },
  { id: 'rapids', name: 'The Rapids', text: 'Faster, busier, louder. Score ×1.5.', threat: 1.35, score: 1.5 },
];

const freshState = () => ({
  sectorIndex: 0, health: 100, drift: 0, charge: 24, maxCharge: 24, rechargeTime: 1.4, recharging: false,
  damage: 1, score: 0, cleared: 0, scrap: 0, upgrades: [], attempt: 0, route: ROUTES[0], sitting: false,
});

let state = freshState();
let scene = null;
let mode = 'menu';
let paused = false;
let pausedAt = 0;
let manual = false; // automated tests step the scene themselves
let last = performance.now();

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      sectorIndex: state.sectorIndex, score: state.score, cleared: state.cleared, scrap: state.scrap,
      upgrades: state.upgrades, route: state.route.id,
    }));
  } catch {}
}
function load() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  } catch {
    return null;
  }
}
function restore(data) {
  state = freshState();
  Object.assign(state, { sectorIndex: data.sectorIndex, score: data.score, cleared: data.cleared, scrap: data.scrap, upgrades: [...data.upgrades] });
  state.route = ROUTES.find((r) => r.id === data.route) || ROUTES[0];
  for (const id of state.upgrades) UPGRADES.find((u) => u.id === id)?.apply(state);
  state.charge = state.maxCharge;
}

function sectorFor(index) {
  const base = SECTORS[index];
  const k = state.route.threat;
  const threats = Object.fromEntries(Object.entries(base.threats).map(([key, v]) => [key, key === 'signals' ? v : key === 'lifeguards' ? v : v * k]));
  return { ...base, index, threats, speed: base.speed * (state.route.id === 'rapids' ? 1.15 : 1) };
}

const events = {
  damage(n, reason, quiet = false) {
    if (mode !== 'ride' && mode !== 'explore') return;
    state.health = Math.max(0, state.health - n);
    state.lastHurt = reason;
    if (!quiet) {
      hud.damage();
      sound.hurt();
    }
  },
  heal(n) {
    state.health = Math.min(100, state.health + n);
  },
  score(n, label) {
    state.score += n * state.route.score;
    if (label) hud.toast(`+${Math.round(n * state.route.score)} · ${label}`);
  },
  cleared() {
    state.cleared += 1;
  },
  tick(dt) {
    // Full Drift: you sit down in the water and stop fighting. Shooting or Space pulls you back.
    if (state.drift >= 100 && !state.sitting) {
      state.sitting = true;
      hud.say('THE ATTENDANT', 'There. Isn\'t that better?', 'drift');
    }
    if (state.sitting) {
      events.damage(dt * 5, 'You sat down in the warm water and did not get up.', true);
      hud.prompt('YOU ARE DRIFTING · Press SPACE or fire to snap out of it');
      if (wasPressed(' ')) state.drift -= 9;
      if (state.drift < 82) {
        state.sitting = false;
        hud.prompt('');
      }
    }
    sound.setHum(state.drift / 100);
    hud.stats(state);
    if (state.health <= 0) die();
  },
  disembark() {
    hud.prompt('');
    startExplore();
  },
  safeRoom() {
    showSafeRoom();
  },
};

function swap(next) {
  scene?.dispose();
  scene = null;
  try {
    scene = next();
  } catch (error) {
    console.error(error);
    showModal('This browser could not start the renderer.', `<p>UNDERFLOW needs WebGL2. The renderer reported:</p><p class="mono">${escapeHtml(error.message)}</p>`, [['BACK TO MENU', toMenu]]);
  }
}

function startRide() {
  const sector = sectorFor(state.sectorIndex);
  mode = 'ride';
  paused = false;
  state.charge = state.maxCharge;
  state.recharging = false;
  state.sitting = false;
  hud.clearSpeech();
  hud.show(true);
  hud.sector(sector, 'Destroy red Blooms. Shoot green Signals to heal. Shoot still water.');
  hud.mode('● ON THE RAFT');
  hud.hint('HOLD CLICK Fire · R Recharge · A/D Dodge · SHIFT Boost');
  document.body.dataset.mode = 'ride';
  releaseLock();
  swap(() => createRide(canvas, state, sector, events));
  hud.say('THE ATTENDANT', sector.attendant.start, 'attendant');
  sound.chime();
}

function startExplore() {
  const sector = sectorFor(state.sectorIndex);
  mode = 'explore';
  hud.clearSpeech();
  hud.mode('● ON FOOT');
  hud.hint('WASD Move · MOUSE Look · CLICK Fire · E Use · R Recharge · SHIFT Run');
  document.body.dataset.mode = 'explore';
  swap(() => createExplore(canvas, state, sector, events));
}

function showSafeRoom() {
  mode = 'safe';
  releaseLock();
  scene?.dispose();
  scene = null;
  const sector = SECTORS[state.sectorIndex];
  state.health = 100;
  state.drift = 0;
  state.sitting = false;
  state.charge = state.maxCharge;
  hud.show(false);
  hud.clearSpeech();
  hud.prompt('');
  const last = state.sectorIndex === SECTORS.length - 1;
  if (last) {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    return showEnding();
  }
  state.sectorIndex += 1;
  save();

  const body = document.createElement('div');
  body.innerHTML = `<p>The bulkhead seals behind you. The pumps are loud enough to drown out the voices, and the lights are too bright for anything that lives in the water. Vitals and Drift restored.</p>`;
  const wall = document.createElement('div');
  wall.className = 'graffiti';
  for (const line of sector.graffiti) {
    const p = document.createElement('p');
    p.textContent = line;
    p.style.transform = `rotate(${(Math.random() - 0.5) * 5}deg)`;
    wall.append(p);
  }
  body.append(wall);

  const craft = document.createElement('div');
  craft.className = 'choices';
  const parts = document.createElement('p');
  parts.className = 'mono';
  const refreshParts = () => (parts.textContent = `WORKBENCH · ${state.scrap} PARTS`);
  refreshParts();
  craft.append(parts);
  for (const u of UPGRADES) {
    const b = document.createElement('button');
    const owned = state.upgrades.includes(u.id);
    b.className = 'choice';
    b.innerHTML = `<b></b><span></span><i></i>`;
    b.querySelector('b').textContent = u.name;
    b.querySelector('span').textContent = u.text;
    b.querySelector('i').textContent = owned ? 'BUILT' : `${u.cost} PARTS`;
    b.disabled = owned || state.scrap < u.cost;
    b.onclick = () => {
      state.scrap -= u.cost;
      state.upgrades.push(u.id);
      u.apply(state);
      state.charge = state.maxCharge;
      b.disabled = true;
      b.querySelector('i').textContent = 'BUILT';
      sound.pickup();
      refreshParts();
      craft.querySelectorAll('button').forEach((x, i) => {
        if (!state.upgrades.includes(UPGRADES[i].id)) x.disabled = state.scrap < UPGRADES[i].cost;
      });
      save();
    };
    craft.append(b);
  }
  body.append(craft);

  const routes = document.createElement('div');
  routes.className = 'choices';
  const label = document.createElement('p');
  label.className = 'mono';
  label.textContent = `DISPATCH BOARD · NEXT: ${SECTORS[state.sectorIndex].name} · ${SECTORS[state.sectorIndex].depth} M`;
  routes.append(label);
  for (const r of ROUTES) {
    const b = document.createElement('button');
    b.className = `choice route${state.route.id === r.id ? ' selected' : ''}`;
    b.innerHTML = `<b></b><span></span>`;
    b.querySelector('b').textContent = r.name;
    b.querySelector('span').textContent = r.text;
    b.onclick = () => {
      state.route = r;
      routes.querySelectorAll('.route').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      save();
    };
    routes.append(b);
  }
  body.append(routes);
  showModal('A moment above water.', body, [['ENTER THE NEXT SECTOR ↗', () => { hideModal(); startRide(); }]], 'SAFE ROOM / CHECKPOINT SAVED');
}

function showEnding() {
  mode = 'end';
  showModal('You found the surface.', `
    <p>Three sectors. Three sealed doors. The last bulkhead opens onto a ladder, and the ladder goes up, and up, into yellow light and damp carpet.</p>
    <p>At the top of the Yellow Channel a raft is waiting. Dry inside. Four life vests, folded neatly on the seat.</p>
    <p>You know the handwriting on the tag. It's yours.</p>
    <div class="manual-row"><span>Final signal score</span><b>${Math.round(state.score)}</b></div>
    <div class="manual-row"><span>Entities dispersed</span><b>${state.cleared}</b></div>
    <p class="mono">END OF CAMPAIGN 1 · OVERFLOW</p>`, [['RIDE AGAIN ↗', () => { hideModal(); state = freshState(); startRide(); }], ['MENU', toMenu]], 'EXPEDITION COMPLETE');
}

function die() {
  if (mode !== 'ride' && mode !== 'explore') return;
  mode = 'dead';
  releaseLock();
  hud.prompt('');
  sound.gurgle();
  showModal('The water took you.', `<p>${escapeHtml(state.lastHurt || 'You stopped moving.')}</p><p>Somewhere above, a raft comes back up the slide. Empty.</p>`, [
    ['RETRY THIS SECTOR ↗', () => {
      hideModal();
      const data = load();
      const attempt = state.attempt + 1;
      if (data && data.sectorIndex === state.sectorIndex) restore(data);
      else {
        const keep = { sectorIndex: state.sectorIndex };
        const route = state.route;
        state = { ...freshState(), ...keep, route };
      }
      state.attempt = attempt;
      startRide();
    }],
    ['MENU', toMenu],
  ], 'TRANSMISSION LOST');
}

function showModal(title, body, actions, label = 'FIELD MANUAL') {
  $('modal-label').textContent = label;
  $('modal-title').textContent = title;
  const target = $('modal-body');
  target.innerHTML = '';
  if (typeof body === 'string') target.innerHTML = body;
  else target.append(body);
  const bar = $('modal-actions');
  bar.innerHTML = '';
  for (const [text, fn] of actions) {
    const b = document.createElement('button');
    b.textContent = text;
    b.onclick = fn;
    bar.append(b);
  }
  $('modal').hidden = false;
}
function hideModal() {
  $('modal').hidden = true;
}

function toMenu() {
  hideModal();
  scene?.dispose();
  scene = null;
  mode = 'menu';
  hud.show(false);
  hud.clearSpeech();
  releaseLock();
  document.body.dataset.mode = 'menu';
  $('menu').hidden = false;
  $('continue').hidden = !load();
}

function setPaused(on) {
  if (mode !== 'ride' && mode !== 'explore') return;
  if (on === paused) return;
  paused = on;
  pausedAt = performance.now();
  $('paused').hidden = !on;
  if (on) releaseLock();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // Esc that releases pointer lock already paused us; ignore the same key press.
  if ((wasPressed('escape') || wasPressed('p')) && now - pausedAt > 250) setPaused(!paused);
  if (scene && !paused && !manual && (mode === 'ride' || mode === 'explore')) scene.update(dt);
  endFrame();
  requestAnimationFrame(frame);
}

// Boot
initInput(canvas);
initHud();
$('engine').textContent = `RENDERED WITH 67JS ${VERSION}`;
$('continue').hidden = !load();
$('start').onclick = () => {
  sound.unlock();
  sound.startHum();
  $('menu').hidden = true;
  state = freshState();
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  startRide();
};
$('continue').onclick = () => {
  const data = load();
  if (!data) return;
  sound.unlock();
  sound.startHum();
  $('menu').hidden = true;
  restore(data);
  startRide();
};
$('sound').onclick = () => {
  sound.setEnabled(!sound.enabled);
  $('sound').textContent = sound.enabled ? 'SOUND ON' : 'SOUND OFF';
};
$('resume').onclick = () => setPaused(false);
$('quit').onclick = () => { setPaused(false); toMenu(); };
$('pause').onclick = () => setPaused(true);
document.addEventListener('pointerlockchange', () => {
  // Leaving pointer lock with Esc pauses the game on foot.
  if (!document.pointerLockElement && mode === 'explore' && !paused && !input.touch) setPaused(true);
});
addEventListener('resize', () => scene?.resize());
document.addEventListener('visibilitychange', () => document.hidden && setPaused(true));
requestAnimationFrame(frame);

// For automated checks.
window.__underflow = {
  get state() { return state; },
  get mode() { return mode; },
  startExplore, showSafeRoom, startRide,
  /** Step the active scene by a fixed dt, n times, with the given keys held. */
  step(n, dt = 1 / 30) {
    manual = true;
    for (let i = 0; i < n && scene && (mode === 'ride' || mode === 'explore'); i++) {
      quality.skipRender = i < n - 1;
      scene.update(dt);
      endFrame();
    }
    quality.skipRender = false;
  },
  press(key) { input.pressed.add(key); },
};
