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
import { createSafeRoom } from './saferoom.js';
import { initInput, input, endFrame, releaseLock, wasPressed, pollGamepad } from './input.js';
import { initHud, hud } from './hud.js';
import { sound } from './audio.js';
import { quality } from './quality.js';
import { rng } from './math.js';
import { showModal, hideModal, showSafeRoom, showDocument, showKeypad, settingsView, logbookView } from './ui.js';
import { CREW, crewById, loadLoops, saveLoop } from './crew.js';

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
  dressings: 1, fit: 'standard', autopilot: false, tags: [], photos: [], strandedSaved: {}, character: 'mars', rescued: 0, recognized: 0, forgotten: [], overrides: 0, sectorScore: 0, pressure: 1, sitT: 0, resolve: 0, memory: null,
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
  return { items: buildPlan(sector, random, (sector.threat || 1) * (state.pressure || 1)), choices: {} };
}
const keyFor = (index) => `${state.endless ? 'e' : 's'}${index}`;

// ---------- Saving ----------
function snapshot() {
  // Photos are large; they stay in memory for this session only.
  return JSON.parse(JSON.stringify({ ...state, cameraUp: undefined, photos: undefined }));
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
    state.sectorScore += n;
    if (label) hud.toast(state.endless ? `+${n} · ${label}` : label);
  },
  cleared() { state.cleared += 1; },
  tick(dt) {
    // Full Drift: you sit down in the warm water. Space or firing pulls you back.
    // Solo rule: nobody is physically there to pull you up. You get one clear way out (hold SPACE while
    // a crewmate talks you back on the radio) and one clear failure (fifteen seconds and you have stayed).
    if (state.drift >= 100 && !state.sitting) {
      state.sitting = true;
      state.sitT = 0;
      state.resolve = 0;
      hud.say('THE ATTENDANT', 'There. Isn\'t that better?', 'drift');
      const friend = CREW.filter((c) => c.id !== state.character && !state.forgotten.includes(c.id))[0];
      if (friend) hud.say(friend.name.toUpperCase(), friend.stay, 'crew');
    }
    if (state.sitting) {
      state.sitT += dt;
      state.resolve = Math.max(0, state.resolve + (input.keys.has(' ') ? dt / 2.5 : -dt / 5));
      const left = Math.max(0, 15 - state.sitT);
      hud.prompt(`YOU SAT DOWN IN THE WATER · HOLD SPACE to remember why you're leaving ${'▮'.repeat(Math.round(state.resolve * 10))}${'▯'.repeat(10 - Math.round(state.resolve * 10))} · ${Math.ceil(left)} s`);
      if (state.resolve >= 1) {
        state.sitting = false;
        state.drift = 70;
        hud.toast('YOU STOOD UP');
      } else if (left <= 0) {
        state.lastHurt = 'You stayed. It was warm, and nobody was counting you anymore.';
        state.health = 0;
      }
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
  state.sectorScore = 0;
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
  hud.hint('A/D steer · SPACE hop · CLICK fire · HOLD RIGHT-CLICK lock, release volley · CTRL/C brace · Q scan · F burst · SHIFT boost · S brake · X look back · T ride control');
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
  hud.hint('WASD move · MOUSE look · CLICK fire · RIGHT-CLICK or Q scan · F burst · E use · H dressing · SHIFT run');
  document.body.dataset.mode = 'explore';
  swap(() => createExplore(canvas, state, sector, events, opts));
}

function enterSafeRoom() {
  mode = 'safe';
  releaseLock();
  clearResume();
  const sector = sectorAt(state.sectorIndex);
  // The room itself is rendered behind the overlay: hard light, loud pumps, a window onto an empty pool.
  swap(() => createSafeRoom(canvas, sector));
  // Composure fully recovers; equipment gets a minimum recharge; the raft is cleansed.
  state.arrivalDrift = state.drift;
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
    return showEndingChoice();
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
  // Playing well earns access (an override, full route data) and carries you deeper: the next sector is harder.
  const earned = state.sectorScore >= 1200;
  if (earned) {
    state.overrides += 1;
    state.pressure = Math.min(1.6, (state.pressure || 1) + 0.1);
  }
  const access = { earned, sectorScore: state.sectorScore };
  state.sectorScore = 0;
  saveNow();
  showSafeRoom(state, sector, nextSec, state.nextPlan, () => { hideModal(); nextSector(true); }, saveNow, access);
}

function nextSector() {
  hideModal();
  const next = state.sectorIndex + 1;
  if (!state.endless && next >= SECTORS.length) return showEndingChoice();
  if (state.endless) recordEndless();
  beginSector(next);
  startRide();
}

/** The Main Drain. Three endings, each with clear consequences. Count Heads is earned by keeping people counted. */
function showEndingChoice() {
  mode = 'end';
  hud.show(false);
  clearResume();
  const me = crewById(state.character);
  const counted = state.forgotten.length === 0 && state.recognized >= 2 && state.rescued >= 2;
  const body = document.createElement('div');
  const p = (t) => { const e = document.createElement('p'); e.textContent = t; body.append(e); };
  p('The last bulkhead opens onto the Main Drain: a grate the size of a cathedral, and in it everyone the park stopped counting, folded small, fused, breathing. Crew Seven is there. Caleb\'s face smiles when Mars says his name over the radio.');
  p(`You kept ${state.recognized} name${state.recognized === 1 ? '' : 's'} on the manifest by reading them back. You pulled ${state.rescued} survivor${state.rescued === 1 ? '' : 's'} out of the water.${state.forgotten.length ? ` You let the count close over ${state.forgotten.map((id) => crewById(id).name).join(' and ')}.` : ''}`);
  const cs = document.createElement('p');
  cs.className = 'mono';
  cs.textContent = counted ? 'THE CHAIR IS EMPTY. YOU HAVE BEEN COUNTING ALL ALONG.' : 'COUNT HEADS · needs: nobody left uncounted, two names read back, two people rescued';
  body.append(cs);
  showModal('The Main Drain.', body, [
    ['CLEAR THE DRAIN · THE LOOP ↗', () => ending('loop'), true],
    ['SEAL THE DRAIN', () => ending('seal')],
    ...(counted ? [['COUNT HEADS', () => ending('count')]] : []),
  ], `${me.full.toUpperCase()} · GUESTS CHECKED IN: ${state.guests}`);
}

function ending(kind) {
  const mem = saveLoop(state, kind);
  const me = crewById(state.character);
  const T = {
    loop: ['You found the surface.', `You clear the drain. Everything the park was holding goes down at once, Crew Seven with it, and the water drops. Upstairs, the Pumphouse floods recede for the first time in months.

You climb a ladder into yellow light and damp carpet and come out at the top of the Welcome Pools. A raft is waiting: dry, four life vests folded on the seat, a wristband numbered ${state.band} on the cushion. The tag is in your handwriting. The empty raft that started all this was yours, sent back up by someone who wanted the next crew to come prepared.

Survived: the four of you, and ${state.rescued} rescued. Remained: Crew Seven, now somewhere below the drain. Changed: the water is falling. What you learned stays: ${mem.route ? 'June\'s route is in the raft\'s locker' : 'a note in your handwriting'}.`],
    seal: ['The water keeps rising, slower.', `You close the drain with Pumphouse equipment. Crew Seven stays where it is: lost, but whole, still breathing in the grate.

Nobody goes down. The loop breaks here: there will be no empty raft for the next crew. The water upstairs keeps rising, slower now, and the Pumphouse will have to live with it.

You climb back the long way. It takes days. Survived: the four of you and ${state.rescued} rescued. Remained: everyone in the drain. Changed: the flood slowed; the loop stopped.`],
    count: ['Count heads.', `${me.name} climbs the Lifeguard's chair. It is not the Lifeguard's: it is a control station, and the Lifeguard is only what enforces it. The previous occupant left a voice in the announcements and nothing else.

From the chair, you can read the whole park's count. You read it out loud. Every name. The ones folded in the drain, the ones on the manifests, Crew Seven, Caleb, Priya. Each one you read stops being zero.

The doors start registering people. The drain loosens on its own. The park can close, because for the first time everyone in it has been counted.

You stay in the chair until the count is done. The credits run under the Attendant's voice, and it is yours.

Survived: everyone counted. Remained: you, for now. Changed: the park knows who is here.`],
  }[kind];
  showModal(T[0], `${T[1]}

GUESTS CHECKED IN: ${state.guests} · ENTITIES DISPERSED: ${state.cleared} · DOCUMENTS: ${state.logbook.length} · LOOPS: ${mem.loops}`, [['RIDE AGAIN ↗', () => { hideModal(); newCampaign(); }, true], ['MENU', toMenu]], kind === 'loop' ? 'THE LOOP' : kind === 'seal' ? 'SEAL THE DRAIN' : 'COUNT HEADS');
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
      if (save) state = { ...freshState(), ...save, memory: state.memory };
      else state = freshState({ band: state.band, character: state.character, name: state.name, memory: state.memory });
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
  const memory = loadLoops();
  mode = 'intro';
  const body = document.createElement('div');
  const intro = document.createElement('p');
  intro.textContent = 'Four Drainers went down the slide. The raft split at the junction. Who woke up alone on this channel?';
  body.append(intro);
  const list = document.createElement('div');
  list.className = 'choices';
  for (const c of CREW) {
    const b = document.createElement('button');
    b.className = 'choice';
    const n = document.createElement('b'); n.textContent = `${c.full} · ${c.role}`;
    const t = document.createElement('span'); t.textContent = `Believes: ${c.belief} ${c.link}`;
    b.append(n, t);
    b.onclick = () => beginCampaignAs(c.id, memory);
    list.append(b);
  }
  body.append(list);
  showModal('Who is on the raft?', body, [['MENU', toMenu]], memory.loops ? `LOOP ${memory.loops + 1}` : 'DRAINER CREW EIGHT');
}

function beginCampaignAs(id, memory) {
  const me = crewById(id);
  state = freshState({ character: id, name: me.name, memory });
  hud.setPlayer(me.name);
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  clearResume();
  beginSector(0);
  const others = CREW.filter((c) => c.id !== id).map((c) => c.name);
  const remembered = memory.loops
    ? `\n\nSomething is different this time. The Pumphouse flood gauge reads lower than it should. There is a note in the raft's locker in your own handwriting.${memory.route ? ' June\'s route from last time is folded inside it.' : ''}`
    : '';
  showModal('Remain seated.', `You wake in a raft. The water is warm. There is a numbered wristband on your arm: ${state.band}. You don't remember putting it on.

The Arc Blaster is tethered to the seat. The announcements say to remain seated until the unloading station.

You have already passed the unloading station three times. Each time, it was farther underwater.

${others.join(', ')}: their voices crackle on the radio. The raft split at the junction. They are on the other channel. Count off before every launch. If anyone stops answering, read their name back.${remembered}`, [['ENTER THE FLOW ↗', () => { hideModal(); startRide(); }, true]], `${me.full.toUpperCase()} · WRISTBAND ${state.band} · CHECKED IN`);
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
  hud.setPlayer(state.name);
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
  pollGamepad(dt);
  input.context = mode === 'explore' ? 'explore' : 'ride';
  if ($('modal').hidden && (wasPressed('escape') || wasPressed('p')) && now - pausedAt > 250) setPaused(!paused);
  if (scene && !paused && !manual && (mode === 'ride' || mode === 'explore' || mode === 'safe')) scene.update(dt);
  if (!paused && (mode === 'ride' || mode === 'explore')) sound.music(state.directorPhase || 'relax', state.drift);
  $('modal').classList.toggle('safe', mode === 'safe');
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
  hud.setPlayer(state.name);
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
