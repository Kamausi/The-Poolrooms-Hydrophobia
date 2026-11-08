// UNDERFLOW: game flow.
// Campaign: eight attractions. Each is a ride (raft) → holding pool → optional dock (on foot) → service gate →
// arrival bay → Safe Room. Skipping the dock takes the bypass: no checkpoint, straight into the next sector.
// Endless: seeded, escalating sectors with a score and per-seed records.
import '67js/addons/world-material-shader';
import { VERSION } from '67js';
import { SECTORS } from './sectors.js';
import { buildPlan, buildEndlessPlan } from './plans.js';
import { createRide } from './ride.js';
import { createExplore } from './explore.js';
import { initInput, input, endFrame, releaseLock, wasPressed } from './input.js';
import { initHud, hud } from './hud.js';
import { sound } from './audio.js';
import { quality } from './quality.js';
import { rng } from './math.js';
import { showModal, hideModal, showSafeRoom, showDocument, showKeypad, settingsView, logbookView } from './ui.js';

const SAVE_KEY = 'underflow-save-v2';
const RESUME_KEY = 'underflow-resume-v2';
const RECORD_KEY = 'underflow-endless-records';
const canvas = document.getElementById('world');
const $ = (id) => document.getElementById(id);

const freshState = (extra = {}) => ({
  sectorIndex: 0, health: 100, drift: 0, charge: 24, maxCharge: 24, rechargeTime: 1.4, recharging: false,
  heat: 0, noise: 0, overheated: false, damage: 1, score: 0, cleared: 0, scrap: 0, cells: 1, filters: 1, filter: 100,
  raft: 100, patches: 0, upgrades: [], logbook: [], power: {}, drained: {}, attempt: 0, guests: 1,
  band: String(1000 + Math.floor(Math.random() * 8999)).padStart(4, '0'), name: 'Mars', crewLine: 0,
  passenger: { stage: 0, t: 0 }, ride: null, sectorKey: 's0', endless: false, seed: 0, sitting: false,
  ...extra,
});

let state = freshState();
let scene = null;
let mode = 'menu';
let paused = false;
let pausedAt = 0;
let manual = false; // automated tests step the scene themselves
let last = performance.now();
let lastPosition = null;

// ---------- Sectors ----------
function sectorAt(index) {
  if (!state.endless) return { ...SECTORS[index], index };
  // Endless: a seeded attraction per depth, with a random ride and harder threats.
  const r = rng(state.seed * 131 + index * 7919);
  const base = SECTORS[Math.floor(r() * SECTORS.length)];
  const { tokens, threat } = buildEndlessPlan(r, index);
  return { ...base, index, endless: true, ride: tokens, threat, name: base.name, depth: base.depth + index * 6, crew: [] };
}
function planFor(sector) {
  const random = rng(5000 + sector.index * 97 + state.attempt * 13 + state.seed * 3);
  return { items: buildPlan(sector, random, sector.threat || 1), choices: {} };
}
const keyFor = (index) => `${state.endless ? 'e' : 's'}${index}`;

// ---------- Saving ----------
function snapshot() {
  return JSON.parse(JSON.stringify({ ...state, cameraUp: undefined }));
}
function saveCheckpoint() {
  if (state.endless) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot())); } catch {}
}
function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function saveResume() {
  if (!lastPosition || (mode !== 'ride' && mode !== 'explore')) return;
  try { localStorage.setItem(RESUME_KEY, JSON.stringify({ state: snapshot(), position: lastPosition })); } catch {}
}
function clearResume() {
  try { localStorage.removeItem(RESUME_KEY); } catch {}
}

// ---------- Events from scenes ----------
const events = {
  damage(n, reason, quiet = false) {
    if (mode !== 'ride' && mode !== 'explore') return;
    state.health = Math.max(0, state.health - n);
    state.lastHurt = reason;
    if (!quiet) { hud.damage(); sound.hurt(); }
  },
  heal(n) { state.health = Math.min(100, state.health + n); },
  score(n, label) {
    state.score += n;
    if (label) hud.toast(state.endless ? `+${n} · ${label}` : label);
  },
  cleared() { state.cleared += 1; },
  tick(dt) {
    // Full Drift: you sit down in the warm water. Space or firing pulls you back.
    if (state.drift >= 100 && !state.sitting) {
      state.sitting = true;
      hud.say('THE ATTENDANT', 'There. Isn\'t that better?', 'drift');
    }
    if (state.sitting) {
      events.damage(dt * 5, 'You sat down in the warm water and did not get up.', true);
      hud.prompt('YOU ARE DRIFTING · press SPACE or fire to snap out of it');
      if (wasPressed(' ') || input.firing) state.drift -= wasPressed(' ') ? 9 : dt * 6;
      if (state.drift < 82) state.sitting = false;
    }
    hud.stats(state);
    if (state.health <= 0) die();
  },
  position(p) {
    lastPosition = p;
    saveResume();
  },
  moor(p) {
    state.ridePosition = p;
    hud.say('THE ATTENDANT', SECTORS[state.sectorIndex]?.attendant?.dock || 'Please mind the gap.', 'attendant');
    startExplore();
  },
  board() {
    // With the circuit restored, the dock's service gate is the one standing open.
    if (state.power[state.sectorKey]) {
      const dock = state.ride.items.find((it) => it.type === 'pool' && it.dock);
      const i = dock?.exits.findIndex((ex) => ex.route === 'service');
      if (dock && i >= 0) state.ride.choices[dock.id] = i;
    }
    startRide({ resumeS: state.ridePosition?.s, departed: state.ridePosition?.departed });
  },
  safeRoom() { enterSafeRoom(); },
  drop() {
    // The bypass: no checkpoint, no heal. The spillway drops you into the next sector.
    hud.toast('SPILLWAY · NO CHECKPOINT');
    sound.splash();
    nextSector(false);
  },
  read(doc) {
    if (!state.logbook.some((d) => d.id === doc.id)) state.logbook.push(doc);
    pauseForOverlay(() => showDocument(doc, resumeFromOverlay));
  },
  keypad(code, success) {
    pauseForOverlay(() => showKeypad(code, () => { success(); resumeFromOverlay(); }, resumeFromOverlay));
  },
};

function pauseForOverlay(open) {
  paused = true;
  releaseLock();
  open();
}
function resumeFromOverlay() {
  hideModal();
  paused = false;
}

function swap(next) {
  scene?.dispose();
  scene = null;
  try {
    scene = next();
  } catch (error) {
    console.error(error);
    showModal('This browser could not start the renderer.', `UNDERFLOW needs WebGL2. The renderer reported: ${error.message}`, [['BACK TO MENU', toMenu]]);
  }
}

// ---------- Flow ----------
function beginSector(index) {
  state.sectorIndex = index;
  state.sectorKey = keyFor(index);
  state.crewLine = 0;
  state.ridePosition = null;
  const sector = sectorAt(index);
  state.ride = state.nextPlan && state.nextPlanIndex === index ? state.nextPlan : planFor(sector);
  state.nextPlan = null;
}

function startRide(opts = {}) {
  const sector = sectorAt(state.sectorIndex);
  mode = 'ride';
  paused = false;
  state.charge = Math.max(state.charge, Math.floor(state.maxCharge / 2));
  state.recharging = false;
  state.sitting = false;
  hud.clearSpeech();
  hud.show(true);
  hud.sector(sector, opts.resumeS ? 'Choose your gate. Depart with SPACE.' : 'Shoot what moves. Scan what hides. Watch the route.');
  hud.mode('● ON THE RAFT');
  hud.hint('CLICK fire · RIGHT-CLICK scan · F burst · R recharge · A/D dodge · S brake · SHIFT boost');
  document.body.dataset.mode = 'ride';
  releaseLock();
  swap(() => createRide(canvas, state, sector, events, opts));
  if (!opts.resumeS) {
    hud.say('THE ATTENDANT', sector.attendant?.start || 'Please remain seated.', 'attendant');
    sound.chime();
  }
}

function startExplore(opts = {}) {
  const sector = sectorAt(state.sectorIndex);
  mode = 'explore';
  paused = false;
  hud.clearSpeech();
  hud.show(true);
  hud.sector(sector, 'Find the power cell. Restore the service gate. Return to the raft.');
  hud.mode('● ON FOOT');
  hud.hint('WASD move · MOUSE look · CLICK fire · RIGHT-CLICK scan · F burst · E use · SHIFT run');
  document.body.dataset.mode = 'explore';
  swap(() => createExplore(canvas, state, sector, events, opts));
}

function enterSafeRoom() {
  mode = 'safe';
  releaseLock();
  scene?.dispose();
  scene = null;
  clearResume();
  const sector = sectorAt(state.sectorIndex);
  // Composure fully recovers; equipment gets a minimum recharge; the raft is cleansed.
  state.drift = 0;
  state.sitting = false;
  state.health = Math.max(state.health, 60);
  state.charge = state.maxCharge;
  state.cells = Math.max(state.cells, 1);
  state.filters = Math.max(state.filters, 1);
  if (state.filter <= 0) state.filter = 100;
  state.passenger = { stage: 0, t: 0 };
  state.guests += 1;
  hud.show(false);
  hud.clearSpeech();
  hud.prompt('');
  sound.vent();
  const last = !state.endless && state.sectorIndex === SECTORS.length - 1;
  if (last) {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    return showEnding();
  }
  const nextIndex = state.sectorIndex + 1;
  const nextSec = sectorAt(nextIndex);
  state.nextPlan = planFor(nextSec);
  state.nextPlanIndex = nextIndex;
  // The checkpoint is the start of the next sector.
  const saveNow = () => {
    if (state.endless) return;
    const s = snapshot();
    s.sectorIndex = nextIndex;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {}
  };
  saveNow();
  showSafeRoom(state, sector, nextSec, state.nextPlan, () => { hideModal(); nextSector(true); }, saveNow);
}

function nextSector() {
  hideModal();
  const next = state.sectorIndex + 1;
  if (!state.endless && next >= SECTORS.length) return showEnding();
  if (state.endless) recordEndless();
  beginSector(next);
  startRide();
}

function showEnding() {
  mode = 'end';
  hud.show(false);
  clearResume();
  showModal('You found the surface.', `The last bulkhead opens onto a ladder, and the ladder goes up, and up, into yellow light and damp carpet.

At the top of the Welcome Pools a raft is waiting. Dry inside. Four life vests, folded neatly on the seat. A wristband on the cushion, numbered ${state.band}.

You know the handwriting on the tag. It's yours. The raft that came back empty was always going to be this one.

GUESTS CHECKED IN: ${state.guests} · GUESTS CHECKED OUT: 0

Entities dispersed: ${state.cleared} · Documents recorded: ${state.logbook.length}

END OF CAMPAIGN 1 · OVERFLOW`, [['RIDE AGAIN ↗', () => { hideModal(); newCampaign(); }, true], ['MENU', toMenu]], 'THE LOOP');
}

function die() {
  if (mode !== 'ride' && mode !== 'explore') return;
  mode = 'dead';
  releaseLock();
  hud.prompt('');
  sound.gurgle();
  clearResume();
  if (state.endless) {
    const rec = recordEndless();
    showModal('The water took you.', `${state.lastHurt || 'You stopped moving.'}

ENDLESS · SEED ${state.seed} · DEPTH ${state.sectorIndex + 1} · SCORE ${Math.round(state.score)} · DISCOVERIES ${state.logbook.length}

Best on this seed: depth ${rec.depth}, score ${rec.score}.`, [
      ['SAME SEED ↗', () => { hideModal(); startEndless(state.seed); }, true],
      ['COPY SEED LINK', () => navigator.clipboard?.writeText(`${location.origin}${location.pathname}?seed=${state.seed}`)],
      ['MENU', toMenu],
    ], 'TRANSMISSION LOST');
    return;
  }
  showModal('The water took you.', `${state.lastHurt || 'You stopped moving.'}

Somewhere above, a raft comes back up the slide. Empty.`, [
    ['RETRY FROM THE LAST SAFE ROOM ↗', () => {
      hideModal();
      const save = loadJSON(SAVE_KEY);
      const attempt = state.attempt + 1;
      if (save) state = { ...freshState(), ...save };
      else state = freshState({ band: state.band });
      state.attempt = attempt;
      beginSector(state.sectorIndex);
      startRide();
    }, true],
    ['MENU', toMenu],
  ], 'TRANSMISSION LOST');
}

function recordEndless() {
  const all = loadJSON(RECORD_KEY) || {};
  const prev = all[state.seed] || { depth: 0, score: 0, discoveries: 0 };
  const rec = { depth: Math.max(prev.depth, state.sectorIndex + 1), score: Math.max(prev.score, Math.round(state.score)), discoveries: Math.max(prev.discoveries, state.logbook.length) };
  all[state.seed] = rec;
  try { localStorage.setItem(RECORD_KEY, JSON.stringify(all)); } catch {}
  return rec;
}

function newCampaign() {
  state = freshState();
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  clearResume();
  beginSector(0);
  mode = 'intro';
  showModal('Remain seated.', `You wake in a raft. The water is warm. There is a numbered wristband on your arm: ${state.band}. You don't remember putting it on.

The Arc Blaster is tethered to the seat. The announcements say to remain seated until the unloading station.

You have already passed the unloading station three times. Each time, it was farther underwater.

Dez's voice crackles on the radio. The raft split at the junction. The crew is on the other channel. The Backrooms above are flooding, and the drain is somewhere below you.`, [['ENTER THE FLOW ↗', () => { hideModal(); startRide(); }, true]], `WRISTBAND ${state.band} · CHECKED IN`);
}

function startEndless(seed) {
  state = freshState({ endless: true, seed: seed || Math.floor(Math.random() * 99999) + 1 });
  clearResume();
  beginSector(0);
  hud.toast(`ENDLESS · SEED ${state.seed}`);
  startRide();
}

function resume(data) {
  state = { ...freshState(), ...data.state };
  const p = data.position;
  if (p.mode === 'explore') startExplore({ pos: p.pos, yaw: p.yaw, hasCell: p.hasCell });
  else startRide({ resumeS: p.s, departed: p.departed });
  hud.toast('RESUMED WHERE YOU LEFT OFF');
}

function toMenu() {
  hideModal();
  scene?.dispose();
  scene = null;
  mode = 'menu';
  paused = false;
  $('paused').hidden = true;
  hud.show(false);
  hud.clearSpeech();
  releaseLock();
  document.body.dataset.mode = 'menu';
  $('menu').hidden = false;
  refreshMenu();
}

function refreshMenu() {
  $('continue').hidden = !loadJSON(RESUME_KEY) && !loadJSON(SAVE_KEY);
  const res = loadJSON(RESUME_KEY);
  $('continue').textContent = res ? 'RESUME WHERE YOU LEFT OFF' : 'CONTINUE FROM THE LAST SAFE ROOM';
  const seedParam = new URLSearchParams(location.search).get('seed');
  if (seedParam) $('seed').value = seedParam;
  const recs = loadJSON(RECORD_KEY) || {};
  const best = Object.entries(recs).sort((a, b) => b[1].depth - a[1].depth)[0];
  $('records').textContent = best ? `Best endless run: seed ${best[0]}, depth ${best[1].depth}, score ${best[1].score}.` : '';
}

function setPaused(on) {
  if (mode !== 'ride' && mode !== 'explore') return;
  if (on === paused) return;
  paused = on;
  pausedAt = performance.now();
  $('paused').hidden = !on;
  if (on) {
    releaseLock();
    const box = $('pause-extra');
    box.replaceChildren(settingsView(), logbookView(state));
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if ($('modal').hidden && (wasPressed('escape') || wasPressed('p')) && now - pausedAt > 250) setPaused(!paused);
  if (scene && !paused && !manual && (mode === 'ride' || mode === 'explore')) scene.update(dt);
  endFrame();
  requestAnimationFrame(frame);
}

// ---------- Boot ----------
initInput(canvas);
initHud();
$('engine').textContent = `RENDERED WITH 67JS ${VERSION}${quality.low ? ' · LIGHT MODE' : ''}`;
refreshMenu();
const begin = () => { sound.unlock(); sound.startHum(); $('menu').hidden = true; };
$('start').onclick = () => { begin(); newCampaign(); };
$('continue').onclick = () => {
  begin();
  const res = loadJSON(RESUME_KEY);
  if (res) return resume(res);
  const save = loadJSON(SAVE_KEY);
  if (!save) return;
  state = { ...freshState(), ...save };
  beginSector(state.sectorIndex);
  startRide();
};
$('endless').onclick = () => { begin(); startEndless(Number($('seed').value) || 0); };
$('sound').onclick = () => {
  sound.setEnabled(!sound.enabled);
  $('sound').textContent = sound.enabled ? 'SOUND ON' : 'SOUND OFF';
};
$('resume').onclick = () => setPaused(false);
$('quit').onclick = () => { saveResume(); setPaused(false); toMenu(); };
$('pause').onclick = () => setPaused(true);
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && mode === 'explore' && !paused && !input.touch && $('modal').hidden) setPaused(true);
});
addEventListener('resize', () => scene?.resize());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { saveResume(); setPaused(true); }
});
addEventListener('pagehide', saveResume);
requestAnimationFrame(frame);

// For automated checks.
window.__underflow = {
  get state() { return state; },
  get mode() { return mode; },
  get scene() { return scene; },
  startExplore, enterSafeRoom, startRide, newCampaign, startEndless, beginSector, events,
  setState(patch) { Object.assign(state, patch); },
  step(n, dt = 1 / 30) {
    manual = true;
    for (let i = 0; i < n && scene && !paused && (mode === 'ride' || mode === 'explore'); i++) {
      quality.skipRender = i < n - 1;
      scene.update(dt);
      endFrame();
    }
    quality.skipRender = false;
  },
  press(key) { input.pressed.add(key); },
  hold(key, on) { on ? input.keys.add(key) : input.keys.delete(key); },
};
