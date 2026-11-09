// UNDERFLOW: game flow.
// Campaign: eight attractions. Each is a ride (raft) → holding pool → optional dock (on foot) → service gate →
// arrival bay → Safe Room. Skipping the dock takes the bypass: no checkpoint, straight into the next sector.
// Endless: seeded, escalating sectors with a score and per-seed records.
import '67js/addons/world-material-shader';
import '67js/addons/liquid-shader';
import { VERSION } from '67js';
import { SECTORS, REFERENCE_CHAPTER } from './sectors.js';
import { buildPlan, buildEndlessPlan, populate } from './plans.js';
import { PRESETS, section, bay } from './track.js';
import { createRide } from './ride.js';
import { createExplore } from './explore.js';
import { createSafeRoom } from './saferoom.js';
import { createMenuScene } from './menuscene.js';
import { initInput, input, endFrame, releaseLock, wasPressed, pollGamepad } from './input.js';
import { initHud, hud } from './hud.js';
import { sound } from './audio.js';
import { quality } from './quality.js';
import { rng } from './math.js';
import { playlog, createFrameStats } from './playlog.js';
import { facility, recordSector, recordDeath, note, nameVisitor, commitVisitors, authorExpedition, saveFacility } from './memory.js';
import { settings } from './settings.js';
import { showModal, hideModal, applyDisplaySettings, ledgerView, showSafeRoom, showDocument, showKeypad, settingsView, logbookView } from './ui.js';
import { CREW, crewById, loadLoops, saveLoop } from './crew.js';

const SAVE_KEY = 'underflow-save-v2';
const RESUME_KEY = 'underflow-resume-v2';
const RECORD_KEY = 'underflow-endless-records';
const canvas = document.getElementById('world');
const $ = (id) => document.getElementById(id);

const freshState = (extra = {}) => ({
  sectorIndex: 0, health: 100, drift: 0, charge: 24, maxCharge: 24, rechargeTime: 1.4, recharging: false,
  heat: 0, noise: 0, overheated: false, damage: 1, score: 0, cleared: 0, scrap: 0, cells: 1, filters: 1, filter: 100,
  raft: 100, patches: 0, patchKits: 2, chambers: null, leaks: [], hullMarks: [], upgrades: [], logbook: [], power: {}, drained: {}, attempt: 0, guests: 1,
  band: String(1000 + Math.floor(Math.random() * 8999)).padStart(4, '0'), name: 'Mars', crewLine: 0,
  passenger: { stage: 0, t: 0 }, ride: null, sectorKey: 's0', endless: false, seed: 0, sitting: false,
  stats: { freed: 0, revives: 0, repairs: 0, pressureRepairs: 0, survivors: 0, routes: [], shared: 0, shoves: 0 },
  gear: [], profile: 'pulse', special: 60, crewState: {}, downed: null, downUsed: false, protectT: 0, challenge: null, custom: null, highWater: false,
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
  // A custom or shared route: one attraction's look, the player's own ride tokens.
  if (state.custom?.chapter) return { ...REFERENCE_CHAPTER, index: REFERENCE_CHAPTER.index, custom: true };
  if (state.custom) return { ...SECTORS[state.custom.base] , index, ride: state.custom.tokens, custom: true, crew: [] };
  if (!state.endless) {
    // The facility's accepted variation for this expedition: fixed at departure, the same for every retry.
    const base = SECTORS[index];
    const v = state.variants?.[index];
    if (!v) return { ...base, index };
    const ride = v.extend ? [...base.ride.slice(0, -1), 'hall:extended', base.ride[base.ride.length - 1]] : base.ride;
    return { ...base, index, ride, map: v.map || base.map, variant: v };
  }
  // Endless: a seeded attraction per depth, with a random ride and harder threats.
  const r = rng(state.seed * 131 + index * 7919);
  const base = SECTORS[Math.floor(r() * SECTORS.length)];
  const { tokens, threat } = buildEndlessPlan(r, index);
  return { ...base, index, endless: true, ride: tokens, threat, name: base.name, depth: base.depth + index * 6, crew: [] };
}
function planFor(sector) {
  const random = rng(5000 + sector.index * 97 + state.attempt * 13 + state.seed * 3);
  return { items: buildPlan(sector, random, (sector.threat || 1) * (state.pressure || 1) * (state.highWater ? 1.3 : 1)), choices: {} };
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
  // Capture the position now (not the last periodic snapshot) when the scene can say where it is.
  const fresh = scene?.snapshot?.();
  if (fresh) lastPosition = fresh;
  if (!lastPosition || (mode !== 'ride' && mode !== 'explore')) return;
  try { localStorage.setItem(RESUME_KEY, JSON.stringify({ state: snapshot(), position: lastPosition })); } catch {}
}
function clearResume() {
  try { localStorage.removeItem(RESUME_KEY); } catch {}
}

const pick1 = (list) => list[Math.floor(Math.random() * list.length)];

/** What this expedition did, crediting the pilot, the rescuer and the carrier as well as the best shot. */
function expeditionRecord() {
  const st = state.stats || {};
  const crew = Object.entries(state.crewState || {}).filter(([id]) => !state.forgotten.includes(id)).length + 1;
  return [
    'EXPEDITION RECORD',
    `Crew recovered: ${crew} of 4${state.forgotten.length ? ` (no record: ${state.forgotten.map((id) => crewById(id).name).join(', ')})` : ''}`,
    `Teammates freed: ${st.freed || 0} · Revives: ${st.revives || 0}`,
    `Repairs: ${st.repairs || 0}, ${st.pressureRepairs || 0} of them under pressure · Supplies hauled in: ${st.shared || 0}`,
    `Survivors rescued: ${state.rescued} · Names read back: ${state.recognized}`,
    `Routes discovered: ${(st.routes || []).length ? st.routes.join(' · ') : 'the main line only'}`,
    `Entities dispersed: ${state.cleared} · Score: ${Math.round(state.score)}`,
  ].join('\n');
}

// ---------- Events from scenes ----------
const events = {
  damage(n, reason, quiet = false) {
    if (mode !== 'ride' && mode !== 'explore') return;
    if (n < 999) n *= settings.damageAssist ?? 1;
    playlog.record('damage', { reason: reason || 'unknown', n: Math.round(n * 10) / 10 });
    if (n >= 999) state.fatal = true;
    else if (state.protectT > 0) return; // just rescued or revived: a moment's grace
    else if (state.downed) { state.downed.bleed -= n * 0.25; state.downed.revive = Math.max(0, state.downed.revive - 1); if (!quiet) sound.hurt(); return; }
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
    state.protectT = Math.max(0, (state.protectT || 0) - dt);
    if (state.fatal && state.health > 0 && !state.downed) state.fatal = false; // only ever true on the way to death
    // Everyone brought back gets a name at once; it becomes a lasting fact at the next Safe Room.
    while ((state.namedRescues || 0) < state.rescued) {
      const v = nameVisitor(state.sectorKey, (state.pendingVisitors || []).length);
      state.namedRescues = (state.namedRescues || 0) + 1;
      (state.pendingVisitors ||= []).push(v);
      (state.visitorsThisRun ||= []).push(v.name);
      hud.toast(`${v.name.toUpperCase()} · SAFE ONCE YOU REACH A SAFE ROOM`);
    }
    // Incapacitated: once per checkpoint, the first fall is not death. Pulse only, from the floor.
    if (state.health <= 0 && !state.fatal && !state.downed && !state.downUsed) {
      state.sitting = false; // a fall wakes you out of the warm water
      const crew = Object.keys(state.crewState || {}).filter((c) => !state.forgotten.includes(c) && state.crewState[c] !== 'hurt');
      state.downed = { bleed: 30, revive: 0, crew: crew.length ? crew[0] : null, t: 0 };
      state.downUsed = true;
      state.health = 1;
      state.profile = 'pulse';
      hud.toast(crew.length ? `INCAPACITATED · ${crew[0].toUpperCase()} IS COMING · keep shooting` : 'INCAPACITATED · nobody is coming · HOLD E to get yourself up');
      if (crew.length) hud.say(crew[0].toUpperCase(), 'You\'re down — stay down, keep shooting, I\'m coming to you!', 'crew');
      sound.hurt();
    }
    if (state.downed) {
      const d = state.downed;
      d.t += dt;
      d.bleed -= dt;
      // A crewmate gets to you, then takes four seconds. Alone, you hold E for five, and getting hit sets it back.
      if (d.crew && d.t > 5) d.revive += dt / 4;
      else if (!d.crew && input.keys.has('e')) d.revive += dt / 5;
      hud.prompt(d.crew ? (d.t > 5 ? `${d.crew.toUpperCase()} IS PULLING YOU UP ${'▮'.repeat(Math.round(d.revive * 10))}${'▯'.repeat(10 - Math.round(d.revive * 10))} · ${Math.ceil(d.bleed)} s` : `INCAPACITATED · ${d.crew.toUpperCase()} IS ON THE WAY · keep them off you · ${Math.ceil(d.bleed)} s`) : `INCAPACITATED · HOLD E to get yourself up ${'▮'.repeat(Math.round(d.revive * 10))}${'▯'.repeat(10 - Math.round(d.revive * 10))} · ${Math.ceil(d.bleed)} s`);
      if (d.revive >= 1) {
        state.downed = null;
        state.health = 30;
        state.protectT = 3;
        state.stats.revives += 1;
        hud.toast('BACK ON YOUR FEET · NEXT TIME IS THE LAST TIME');
        if (d.crew) hud.say(d.crew.toUpperCase(), pick1(['Up. Up. I\'ve got you.', 'You owe me a towel. Get up.', 'Don\'t do that again. I mean it.']), 'crew');
      } else if (d.bleed <= 0) {
        state.downed = null;
        state.health = 0;
        state.fatal = true;
        state.lastHurt = d.crew ? `${d.crew[0].toUpperCase() + d.crew.slice(1)} didn't get there in time.` : 'You couldn\'t get up, and nobody was coming.';
      }
    }
    // Last Departure: a ride against the clock.
    if (state.challenge?.kind === 'departure' && mode === 'ride') {
      state.challenge.left -= dt;
      if (state.challenge.left <= 0) { state.fatal = true; state.health = 0; state.lastHurt = 'The last departure left without you.'; }
      else if (!state.downed && !state.sitting) hud.depth(`LAST DEPARTURE · ${Math.ceil(state.challenge.left)} s`);
    }
    hud.stats(state);
    if (state.health <= 0) die();
  },
  /** Challenge finished (Pump Defence, Last Departure). */
  challengeDone(label) {
    if (mode !== 'ride' && mode !== 'explore') return;
    mode = 'end';
    releaseLock();
    scene?.dispose();
    scene = null;
    hud.show(false);
    showModal('Challenge complete.', `${label}\n\nSCORE ${Math.round(state.score)} · ENTITIES DISPERSED ${state.cleared}\n\n${expeditionRecord()}`, [['AGAIN ↗', () => { hideModal(); startChallenge(state.challenge.kind); }, true], ['MENU', toMenu]], 'CHALLENGE');
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
  /** Scenes report observations for the playtest log. */
  log(type, data) { playlog.record(type, data); },
  board() {
    // With the circuit restored, the dock's service gate is the one standing open.
    if (state.power[state.sectorKey]) {
      const dock = state.ride.items.find((it) => it.type === 'pool' && it.dock);
      const i = dock?.exits.findIndex((ex) => ex.route === 'service');
      if (dock && i >= 0) state.ride.choices[dock.id] = i;
      // What the crew did on foot rewrites the way out: a flooded outlet or an exposed one.
      if (!state.endless && !state.custom && !(state.memDone ||= {})[`r${state.sectorKey}`]) { state.memDone[`r${state.sectorKey}`] = true; recordSector(state.sectorKey, 'restored'); }
      // The Welcome Pools: the restored circulation's marked outlet runs back through the hall you passed.
      const exW = dock?.exits[i];
      if (state.sectorIndex === 0 && !state.endless && !state.custom && exW && !exW.looped) {
        exW.looped = true;
        const r0 = rng(777 + state.attempt);
        exW.sections = [section('channel', { length: 30, half: 2.6, label: 'CIRCULATION OUTLET' }), populate(section('hall', { length: 80, label: 'THE POOL HALL (AGAIN)' }), r0, 0.4, ['deja']), ...exW.sections];
      }
      const mod = state.routeMod?.[state.sectorKey];
      if (mod && !state.endless && !state.custom && !state.memDone[`m${state.sectorKey}`]) { state.memDone[`m${state.sectorKey}`] = true; recordSector(state.sectorKey, mod); }
      const ex = dock?.exits[i];
      if (mod && ex && !ex.modded) {
        ex.modded = mod;
        const r = rng(4242 + state.sectorIndex * 7 + state.attempt);
        ex.sections = mod === 'drained'
          ? [populate(section('channel', { length: 75, half: 2.6, shallow: true, lamps: 'sparse', label: state.custom?.chapter ? 'THE EXPOSED EXIT' : 'EXPOSED OUTLET' }), r, 0.5, ['cache', 'cache']), bay()]
          : [populate(section('overflow', { length: 75, half: 2.6, label: state.custom?.chapter ? 'THE WAVES' : 'FLOODED OUTLET' }), r, 1.4, ['wake']), bay()];
        hud.toast(mod === 'drained' ? 'THE WAY OUT IS THE ONE YOU EXPOSED' : 'THE WAY OUT IS THE ONE YOU FLOODED');
      }
    }
    startRide({ resumeS: state.ridePosition?.s, departed: state.ridePosition?.departed });
  },
  safeRoom() { playlog.record('section', { label: state.sectorKey, seconds: Math.round((performance.now() - (state.sectorStart || performance.now())) / 1000) }); enterSafeRoom(); },
  /** Optional spaces explored, documents read, puzzles solved: what the facility expands next time. */
  interest(n = 1) { if (!state.endless && !state.custom) recordSector(state.sectorKey, 'interest', n); },
  /** The crew's ledger: only ever what actually happened. */
  ledger(kind, item) { if (note(kind, item)) hud.toast(`FIELD LEDGER · ${item.toUpperCase()}`); },
  drop() {
    if (!state.endless && !state.custom) recordSector(state.sectorKey, 'bypassed');
    // The bypass: no checkpoint, no heal. The spillway drops you into the next sector.
    hud.toast('SPILLWAY · NO CHECKPOINT');
    sound.splash();
    nextSector(false);
  },
  read(doc) {
    if (!state.logbook.some((d) => d.id === doc.id)) { state.logbook.push(doc); events.interest(1); }
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
  state.sectorStart = performance.now();
  state.crewLine = 0;
  state.ridePosition = null;
  const sector = sectorAt(index);
  state.ride = state.nextPlan && state.nextPlanIndex === index ? state.nextPlan : planFor(sector);
  state.nextPlan = null;
}

function startRide(opts = {}) {
  const sector = sectorAt(state.sectorIndex);
  $('menu').hidden = true;
  mode = 'ride';
  paused = false;
  state.charge = Math.max(state.charge, Math.floor(state.maxCharge / 2));
  state.recharging = false;
  state.sitting = false;
  hud.clearSpeech();
  hud.show(true);
  hud.sector(sector, opts.resumeS ? 'Choose your gate. Depart with SPACE.' : 'Shoot what moves. Scan what hides. Watch the route.');
  hud.mode('● ON THE RAFT');
  hud.hint('A/D steer · SPACE hop · CLICK fire · RIGHT-CLICK focus (Disruptor: lock) · 1–5 / TAB profile · CTRL/C brace · Z shove · B ping · Q scan · F burst · SHIFT boost · HOLD V paddle · HOLD G patch · X look back · T ride control');
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
  $('menu').hidden = true;
  mode = 'explore';
  paused = false;
  hud.clearSpeech();
  hud.show(true);
  hud.sector(sector, 'Find the power cell. Restore the service gate. Return to the raft.');
  hud.mode('● ON FOOT');
  hud.hint('WASD move · MOUSE look · CLICK fire · 1–5 / TAB profile · RIGHT-CLICK or Q scan · Z shove · B ping · F burst · E use · H dressing · V paddle · SHIFT run');
  document.body.dataset.mode = 'explore';
  swap(() => createExplore(canvas, state, sector, events, opts));
}

function enterSafeRoom() {
  $('menu').hidden = true;
  mode = 'safe';
  releaseLock();
  clearResume();
  const sector = sectorAt(state.sectorIndex);
  // The room itself is rendered behind the overlay: hard light, loud pumps, a window onto an empty pool.
  const present = Object.keys(state.crewState || {}).filter((c) => !(state.forgotten || []).includes(c) && state.crewState[c] !== 'grabbed');
  swap(() => createSafeRoom(canvas, sector, { drained: !!(state.custom?.chapter && state.routeMod?.[state.sectorKey] === 'drained'), crew: present }));
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
  state.downUsed = false;
  state.downed = null;
  if (!state.endless && !state.custom) { recordSector(state.sectorKey, 'visits'); note('places', sector.name); commitVisitors(state.pendingVisitors); state.pendingVisitors = []; }
  state.fatal = false;
  for (const c of Object.keys(state.crewState || {})) if (state.crewState[c] === 'hurt') state.crewState[c] = 'ok';
  if (state.challenge?.kind === 'departure') return events.challengeDone('You made the last departure.');
  if (state.custom?.chapter) {
    hud.show(false);
    mode = 'end';
    const drained = state.routeMod?.[state.sectorKey] === 'drained';
    return showModal('The Closed Wave Pool.', `The bulkhead closes. The pumps are loud, the floor is dry. Through the glass, ${drained ? 'the wave pool is drained to its tiles: the lit exit sign stands in an empty basin, pointing at a wall' : 'the wave pool is running at last, every wave arriving at a beach nobody is on'}.\n\nOn the wall, a maintenance photograph of this room. It was taken from somewhere beneath the floor.\n\n${expeditionRecord()}`, [['PLAY THE CHAPTER AGAIN ↗', () => { hideModal(); startCustom({ chapter: true, tokens: REFERENCE_CHAPTER.ride, base: 0 }); }, true], ['MENU', toMenu]], 'REFERENCE CHAPTER');
  }
  if (state.custom) {
    hud.show(false);
    mode = 'end';
    return showModal('Route complete.', `${state.custom.name || 'A custom route'} · ${state.custom.tokens.join(' → ')}\n\n${expeditionRecord()}`, [['RIDE IT AGAIN ↗', () => { hideModal(); startCustom(state.custom); }, true], ['COPY ROUTE LINK', () => navigator.clipboard?.writeText(routeLink(state.custom))], ['MENU', toMenu]], 'CUSTOM ROUTE');
  }
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

GUESTS CHECKED IN: ${state.guests} · ENTITIES DISPERSED: ${state.cleared} · DOCUMENTS: ${state.logbook.length} · LOOPS: ${mem.loops}

${expeditionRecord()}`, [['RIDE AGAIN ↗', () => { hideModal(); newCampaign(); }, true], ['MENU', toMenu]], kind === 'loop' ? 'THE LOOP' : kind === 'seal' ? 'SEAL THE DRAIN' : 'COUNT HEADS');
}

function die() {
  if (mode !== 'ride' && mode !== 'explore') return;
  playlog.record('death', { sector: state.sectorKey, cause: state.lastHurt || 'unknown', mode });
  // Where and how: so the place can remember it physically next time (a vest at the spot, a warning).
  if (!state.endless && !state.custom) recordDeath(state.sectorKey, { mode, s: mode === 'ride' ? scene?.position : null, f: mode === 'ride' && scene?.trackLength ? scene.position / scene.trackLength : null, pos: mode === 'explore' ? lastPosition?.pos : null, cause: state.lastHurt || 'unknown' });
  mode = 'dead';
  releaseLock();
  hud.prompt('');
  sound.gurgle();
  clearResume();
  if (state.challenge || state.custom) {
    const kind = state.challenge?.kind;
    showModal('The water took you.', `${state.lastHurt || 'You stopped moving.'}\n\n${expeditionRecord()}`, [
      ['TRY AGAIN ↗', () => { hideModal(); state.custom ? startCustom(state.custom) : startChallenge(kind); }, true],
      ['MENU', toMenu],
    ], state.custom ? 'CUSTOM ROUTE' : 'CHALLENGE');
    return;
  }
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
      // A retry continues the same expedition: same accepted world, same expedition number. Uncommitted
      // rescues are lost with the run.
      const keep = { variants: state.variants, expedition: state.expedition, regrouped: state.regrouped };
      if (save) state = { ...freshState(), ...save, memory: state.memory, ...keep, pendingVisitors: [] };
      else state = freshState({ band: state.band, character: state.character, name: state.name, memory: state.memory, ...keep });
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
  // A new expedition departs: the facility authors this expedition's world from what earlier ones did.
  facility.expeditions += 1;
  saveFacility();
  state.expedition = facility.expeditions;
  state.variants = authorExpedition(SECTORS); // the ledger notes changes only when the crew witnesses them
  hud.setPlayer(me.name);
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  clearResume();
  beginSector(0);
  const others = CREW.filter((c) => c.id !== id).map((c) => c.name);
  const remembered = memory.loops
    ? `\n\nSomething is different this time. The Pumphouse flood gauge reads lower than it should. There is a note in the raft's locker in your own handwriting.${memory.route ? ' June\'s route from last time is folded inside it.' : ''}`
    : '';
  const dispatch = `PUMPHOUSE DISPATCH · ROUTE: OVERFLOW (WELCOME POOLS → MAIN DRAIN)
ASSIGNED CREW: ${CREW.map((c) => c.full).join(' · ')}
LAST KNOWN MAINTENANCE STATUS: Crew Seven, six weeks overdue. Raft returned empty.
PHOTO CLIPPED TO THE SHEET: four Drainers at a picnic table by the wave pool. One of them has turned away from the camera. You'll understand it later.

`;
  showModal('Remain seated.', `${dispatch}You wake in a raft. The water is warm. There is a numbered wristband on your arm: ${state.band}. You don't remember putting it on.

The Arc Blaster is tethered to the seat. The announcements say to remain seated until the unloading station.

You have already passed the unloading station three times. Each time, it was farther underwater.

${others.join(', ')}: their voices crackle on the radio. The raft split at the junction. They are on the other channel. Count off before every launch. If anyone stops answering, read their name back.${remembered}`, [['ENTER THE FLOW ↗', () => { hideModal(); startRide(); }, true]], `${me.full.toUpperCase()} · WRISTBAND ${state.band} · CHECKED IN`);
}

/** Challenge variants on the same spaces, signals and controls. */
const CHALLENGES = {
  pump: { name: 'Pump Defence', text: 'Hold a maintenance chamber on foot while the pump runs five loud cycles.' },
  highwater: { name: 'High Water', text: 'Endless, with the water up: more Drift, harder threats, tidal floors permanently flooded.' },
  departure: { name: 'Last Departure', text: 'Ride one attraction to its Safe Room before the last departure leaves: four minutes.' },
  shared: { name: 'Shared Expedition', text: 'One seed, one route and objective layout, shared by link. Encounters still answer to how you play.' },
};
function startChallenge(kind) {
  const keep = { character: state.character || 'mars', name: state.name || 'Mars', memory: state.memory };
  if (kind === 'highwater') {
    state = freshState({ ...keep, endless: true, highWater: true, seed: Math.floor(Math.random() * 99999) + 1, challenge: { kind } });
    hud.setPlayer(state.name);
    beginSector(0);
    hud.toast('HIGH WATER · the levels are up everywhere');
    return startRide();
  }
  if (kind === 'shared') {
    const seed = Math.floor(Math.random() * 99999) + 1;
    navigator.clipboard?.writeText(`${location.origin}${location.pathname}?seed=${seed}`);
    hud.toast(`SHARED EXPEDITION · SEED ${seed} · LINK COPIED`);
    return startEndless(seed);
  }
  const index = 1 + Math.floor(Math.random() * 6);
  state = freshState({ ...keep, sectorIndex: index, challenge: kind === 'pump' ? { kind, cycle: 0, t: 0 } : { kind, left: 240 } });
  hud.setPlayer(state.name);
  beginSector(index);
  if (kind === 'pump') return startExplore({ challenge: 'pump' });
  hud.toast('LAST DEPARTURE · FOUR MINUTES · DOCKS ARE OPTIONAL, TIME IS NOT');
  startRide();
}

/** Custom routes: ride tokens anyone can write, share as a link, and ride. */
const TOKEN_TYPES = new Set([...Object.keys(PRESETS), 'ramp', 'fork', 'junction', 'dock']);
function parseRoute(text) {
  const tokens = text.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  const bad = tokens.filter((t) => !TOKEN_TYPES.has(t.split(':')[0]));
  if (!tokens.length) return { error: 'An empty route.' };
  if (bad.length) return { error: `Unknown section${bad.length > 1 ? 's' : ''}: ${bad.join(', ')}` };
  if (!tokens.some((t) => t.startsWith('dock'))) tokens.push('dock');
  return { tokens };
}
function routeLink(custom) {
  return `${location.origin}${location.pathname}?route=${encodeURIComponent(custom.tokens.join(' '))}&base=${custom.base}`;
}
function startCustom(custom) {
  state = freshState({ character: state.character || 'mars', name: state.name || 'Mars', memory: state.memory, custom, regrouped: !!custom.chapter });
  hud.setPlayer(state.name);
  beginSector(0);
  hud.toast(`CUSTOM ROUTE · ${custom.tokens.length} SECTIONS`);
  startRide();
}
function routeBuilder(prefill) {
  const body = document.createElement('div');
  const help = document.createElement('p');
  help.textContent = `Write a ride as sections, in order. Types: ${[...TOKEN_TYPES].join(', ')}. Add features after a colon (lazy:valve,lifeguard · reservoir:ballast · junction:public|overflow · fork:rescue · dock:repair). A dock is added at the end if you leave it out.`;
  const area = document.createElement('textarea');
  area.className = 'route-text';
  area.value = prefill || SECTORS[2].ride.join(' ');
  const base = document.createElement('select');
  SECTORS.forEach((sec, i) => { const o = document.createElement('option'); o.value = i; o.textContent = `Look and rules: ${sec.name}`; base.append(o); });
  base.value = new URLSearchParams(location.search).get('base') || '2';
  const err = document.createElement('p');
  err.className = 'mono small';
  body.append(help, area, base, err);
  const go = (copy) => {
    const r = parseRoute(area.value);
    if (r.error) { err.textContent = r.error; return; }
    const custom = { tokens: r.tokens, base: Number(base.value), name: 'A shared route' };
    if (copy) { navigator.clipboard?.writeText(routeLink(custom)); err.textContent = 'Link copied.'; return; }
    hideModal();
    begin();
    startCustom(custom);
  };
  showModal('Route builder.', body, [['RIDE IT ↗', () => go(false), true], ['COPY LINK', () => go(true)], ['MENU', toMenu]], 'CUSTOM ROUTES');
}
function challengeMenu() {
  const body = document.createElement('div');
  const list = document.createElement('div');
  list.className = 'choices';
  for (const [id, c] of Object.entries(CHALLENGES)) {
    const b = document.createElement('button');
    b.className = 'choice';
    const n = document.createElement('b'); n.textContent = c.name;
    const t = document.createElement('span'); t.textContent = c.text;
    b.append(n, t);
    b.onclick = () => { hideModal(); begin(); startChallenge(id); };
    list.append(b);
  }
  const versus = document.createElement('p');
  versus.className = 'mono small';
  versus.textContent = 'VERSUS (four Drainers against four player-controlled entities) needs the online layer, which is not built yet. Its rules are written down in docs/SYSTEMS_DESIGN.md section 19.';
  body.append(list, versus);
  showModal('Challenges.', body, [['ROUTE BUILDER', () => routeBuilder()], ['MENU', toMenu]], 'VARIANTS');
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
  if (p.mode === 'explore') startExplore({ pos: p.pos, yaw: p.yaw, hasCell: p.hasCell, restore: p.taken });
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
  swap(() => createMenuScene(canvas));
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
  if (!on) hud.reshowHint();
  if (on) {
    releaseLock();
    const box = $('pause-extra');
    const copy = document.createElement('button');
    copy.textContent = 'COPY PLAYTEST LOG';
    copy.className = 'bind';
    copy.onclick = () => { navigator.clipboard?.writeText(playlog.export()); copy.textContent = 'COPIED · paste it to whoever runs the playtest'; };
    box.replaceChildren(settingsView(), logbookView(state), ledgerView(), copy);
  }
}

const frames = createFrameStats();
let perfT = 0, lastLogged = 0;
function frame(now) {
  // The constrained 30 FPS profile: deliver every other display frame, evenly.
  if (settings.fpsCap === 30 && now - last < 1000 / 30 - 2) { requestAnimationFrame(frame); return; }
  const ms = now - last;
  const dt = Math.min(0.05, ms / 1000);
  last = now;
  if (mode === 'ride' || mode === 'explore') frames.push(ms);
  perfT -= dt;
  if (perfT <= 0) {
    perfT = 0.5;
    const st = frames.stats(settings.fpsCap === 30 ? 33.3 : 16.7);
    $('perf').hidden = !settings.perfOverlay;
    if (settings.perfOverlay && st) $('perf').textContent = `${settings.fpsCap === 30 ? '30' : '60'} FPS TIER · avg ${st.avg} ms · p95 ${st.p95} · p99 ${st.p99} · slow ${st.slow}/${st.n}${performance.memory ? ` · heap ${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : ''}`;
    if (st && now - lastLogged > 60000) { lastLogged = now; playlog.record('frames', st); }
  }
  pollGamepad(dt);
  input.context = mode === 'explore' ? 'explore' : 'ride';
  if ($('modal').hidden && (wasPressed('escape') || wasPressed('p')) && now - pausedAt > 250) setPaused(!paused);
  if (scene && !paused && !manual && (mode === 'ride' || mode === 'explore' || mode === 'safe' || mode === 'menu')) scene.update(dt);
  if (!paused && (mode === 'ride' || mode === 'explore')) sound.music(state.directorPhase || 'relax', state.drift);
  $('modal').classList.toggle('safe', mode === 'safe');
  endFrame();
  requestAnimationFrame(frame);
}

// ---------- Boot ----------
initInput(canvas);
applyDisplaySettings();
// If the graphics device is reset (driver update, sleep, too many tabs), save and offer a clean resume.
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  saveResume();
  showModal('The graphics device was reset.', 'Your exact position was saved. Reload to pick up where you were.', [['RELOAD AND RESUME ↗', () => location.reload(), true]], 'RECOVERY');
});
initHud();
$('engine').textContent = `RENDERED WITH 67JS ${VERSION}${quality.low ? ' · LIGHT MODE' : ''}`;
refreshMenu();
swap(() => createMenuScene(canvas));
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
$('challenges').onclick = () => { $('menu').hidden = true; challengeMenu(); };
$('routes').onclick = () => { $('menu').hidden = true; routeBuilder(); };
$('chapter').onclick = () => { begin(); startCustom({ chapter: true, tokens: REFERENCE_CHAPTER.ride, base: 0 }); };
{
  const shared = new URLSearchParams(location.search).get('route');
  if (shared) { $('routes').textContent = 'RIDE THE SHARED ROUTE'; $('routes').onclick = () => { $('menu').hidden = true; routeBuilder(shared); }; }
}
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
  startExplore, enterSafeRoom, startRide, newCampaign, startEndless, beginSector, events, startChallenge, startCustom, parseRoute, expeditionRecord,
  setState(patch) { Object.assign(state, patch); },
  step(n, dt = 1 / 30) {
    manual = true;
    for (let i = 0; i < n && scene && !paused && ['ride', 'explore', 'safe', 'menu'].includes(mode); i++) {
      quality.skipRender = i < n - 1;
      scene.update(dt);
      endFrame();
    }
    quality.skipRender = false;
  },
  press(key) { input.pressed.add(key); },
  hold(key, on) { on ? input.keys.add(key) : input.keys.delete(key); },
};
