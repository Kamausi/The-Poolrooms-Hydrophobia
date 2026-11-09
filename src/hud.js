// The DOM overlay drawn over the 67js canvas.
import { settings } from './settings.js';

const $ = (id) => document.getElementById(id);
const el = {};
const queue = [];
let speaking = 0;
let captionTimer = 0;
let hintTimer = 0;
const HINT_SECONDS = 7;
let player = 'MARS';
let last = null; // the run's state, for lines that depend on Drift and the manifest
const CREW_NAMES = ['MARS', 'DEZ', 'TUBS', 'JUNE'];
const garble = (text, amount) => text.replace(/[A-Z0-9]/g, (c) => (Math.random() < amount ? '·' : c));

const IDS = ['hud', 'sector-name', 'objective', 'score', 'score-wrap', 'cleared', 'depth', 'vitals', 'vitals-bar', 'drift', 'drift-bar', 'charge', 'charge-max', 'charge-state', 'mode', 'crosshair', 'subtitle', 'toast', 'prompt', 'damage', 'driftfx', 'scrap', 'hint', 'band', 'guests', 'route', 'raft', 'chambers', 'roster', 'filter', 'filters', 'cells', 'heat-bar', 'caption', 'scan', 'raft-panel'];

export function initHud() {
  for (const id of IDS) el[id] = $(id);
  el.fading = document.querySelectorAll('.hud-tl, #cleared, #depth');
}

export const hud = {
  show(on) {
    el.hud.hidden = !on;
  },
  sector(sector, objective) {
    el['sector-name'].textContent = sector.endless ? `ENDLESS · DEPTH ${sector.index + 1} · ${sector.name}` : `SECTOR 0${sector.index + 1} · ${sector.name}`;
    el.objective.textContent = objective;
  },
  objective(text) {
    el.objective.textContent = text;
  },
  setPlayer(name) {
    player = String(name).toUpperCase();
  },
  stats(state) {
    last = state;
    el['score-wrap'].hidden = !state.endless;
    el.score.textContent = String(Math.floor(state.score)).padStart(5, '0');
    // The facility stops acknowledging you as Drift rises: your band blurs, the raft stops counting you.
    const fade = Math.max(0, (state.drift - 65) / 35);
    el.band.textContent = `WRISTBAND ${fade > 0 ? garble(state.band, fade * 0.8) : state.band} · ${fade > 0.6 ? garble(player, fade * 0.6) : player}`;
    const aboard = (state.mounted ? 1 : 0) + (state.passenger?.stage > 0 && state.mounted ? 1 : 0) - (state.drift > 85 && state.mounted ? 1 : 0);
    el.guests.textContent = `GUESTS CHECKED IN: ${state.guests}${state.mounted ? ` · RAFT OCCUPANCY ${aboard}` : ''}`;
    // The crew on the radio: dependable state, never faked by the Caller. Shapes and words, not only colour.
    if (state.crewState) el.roster.textContent = Object.entries(state.crewState).map(([id, st]) => (state.forgotten?.includes(id) ? '▯ — — —' : `${st === 'ok' ? '●' : st === 'down' ? '▲' : st === 'grabbed' ? '✕' : '◐'} ${id.toUpperCase()} ${st === 'ok' ? '' : st.toUpperCase()}`.trim())).join(' · ');
    el.cleared.textContent = `${state.cleared} ENTITIES DISPERSED`;
    el.cleared.hidden = !state.endless;
    el.vitals.textContent = Math.ceil(state.health);
    el['vitals-bar'].style.width = `${Math.min(100, state.health)}%`;
    el['vitals-bar'].classList.toggle('low', state.health < 30);
    el.drift.textContent = Math.floor(state.drift);
    el['drift-bar'].style.width = `${state.drift}%`;
    el.charge.textContent = state.charge;
    el['charge-max'].textContent = `/ ${state.maxCharge}`;
    const prof = state.profile && state.profile !== 'pulse' ? `${state.profile.toUpperCase()} · RESERVE ${Math.floor(state.special ?? 0)}` : 'PULSE';
    el['charge-state'].textContent = state.downed ? 'INCAPACITATED · PULSE ONLY' : state.overheated ? 'OVERHEATED' : state.recharging ? 'RECHARGING…' : state.charge === 0 ? '[R] RECHARGE' : `${prof}${state.mounted ? ' · MOUNT' : ''}`;
    el['heat-bar'].style.width = `${Math.min(100, state.heat)}%`;
    el['heat-bar'].classList.toggle('low', state.heat > 75);
    el.scrap.textContent = `${state.scrap} PARTS`;
    el.cells.textContent = '▮'.repeat(state.cells) + '▯'.repeat(Math.max(0, 3 - state.cells)) + ` · DRESSINGS ${state.dressings || 0}`;
    el.raft.textContent = `${Math.ceil(state.raft)}%`;
    el.raft.classList.toggle('warn', state.raft < 40);
    if (state.chambers) {
      // Four chambers, each its own gauge: a leak shows as a falling bar on one side, with a dot while it hisses.
      const bars = (v) => '▮'.repeat(Math.round(v / 25)) + '▯'.repeat(4 - Math.round(v / 25));
      const leaking = new Set((state.leaks || []).map((l) => l.chamber));
      const c = state.chambers;
      el.chambers.textContent = [['L', 'left'], ['R', 'right'], ['F', 'bow'], ['B', 'stern']].map(([k, n]) => `${k}${leaking.has(n) ? '•' : ' '}${bars(c[n])}`).join(' ') + ` · PATCH ×${state.patchKits ?? 0}`;
      el.chambers.classList.toggle('warn', leaking.size > 0);
    }
    el.filter.textContent = `${Math.ceil(state.filter)}%`;
    el.filters.textContent = String(state.filters);
    // Drift fades decoration only. Vitals, charge, raft and prompts are instruments: they stay readable.
    const d = state.drift / 100;
    for (const c of el.fading) c.style.opacity = String(1 - d * 0.6);
    el.driftfx.style.opacity = settings.distortion ? String(Math.max(0, d - 0.25) * 1.1) : '0';
  },
  depth(text) {
    el.depth.textContent = text;
  },
  mode(text) {
    el.mode.textContent = text;
  },
  /** The control list: shown when a mode starts and after pausing, then it fades so the frame stays clear. */
  hint(text) {
    el.hint.textContent = text;
    this.reshowHint();
  },
  reshowHint() {
    hintTimer = settings.tips === false ? 0 : HINT_SECONDS;
    el.hint.classList.toggle('show', hintTimer > 0);
  },
  route(lines) {
    el.route.replaceChildren(...lines.map((line) => {
      const p = document.createElement('p');
      p.textContent = line;
      return p;
    }));
  },
  crosshair(ndcX, ndcY, centered) {
    const x = centered ? 50 : (ndcX * 0.5 + 0.5) * 100;
    const y = centered ? 50 : (-ndcY * 0.5 + 0.5) * 100;
    el.crosshair.style.left = `${x}%`;
    el.crosshair.style.top = `${y}%`;
    el.scan.style.left = `${x}%`;
    el.scan.style.top = `calc(${y}% + 26px)`;
  },
  hitmarker() {
    el.crosshair.classList.remove('hit');
    void el.crosshair.offsetWidth;
    el.crosshair.classList.add('hit');
  },
  damage() {
    el.damage.classList.remove('flash');
    void el.damage.offsetWidth;
    el.damage.classList.add('flash');
  },
  /** Inspection beam readout under the crosshair. */
  scan(text) {
    el.scan.textContent = text || '';
  },
  /** A caption for an important sound, with where it came from. */
  caption(text) {
    if (!settings.captions) return;
    el.caption.textContent = text;
    el.caption.classList.add('show');
    captionTimer = 2.8;
  },
  /** Radio and PA lines. Queued so they never overlap. kind: crew | attendant | marco | drift */
  say(speaker, text, kind = 'crew') {
    // In callouts Marco is "the Caller", so it never sounds like Mars.
    // Speech the game can't verify reads the same whoever said it: a voice, a place. Only the radio identifies.
    if (kind === 'marco' || kind === 'voice') speaker = speaker.startsWith('VOICE') ? speaker : 'VOICE · NEARBY';
    if (CREW_NAMES.includes(speaker) && last) {
      if (speaker === player) {
        speaker = `${speaker} (YOU)`;
        // Your own replies get shorter as you drift.
        if (last.drift > 50) text = `${text.split(/[.!?]/)[0]}…`;
      } else if (last.forgotten?.includes(speaker.toLowerCase())) {
        speaker = '[NO IDENTIFIER]';
        text = garble(text, 0.25);
      } else if (kind === 'crew') speaker = `${speaker} · RADIO`;
    }
    if (queue.some((q) => q.text === text)) return;
    queue.push({ speaker, text, kind });
  },
  toast(text) {
    el.toast.textContent = text;
    el.toast.classList.remove('show');
    void el.toast.offsetWidth;
    el.toast.classList.add('show');
  },
  prompt(text) {
    el.prompt.textContent = text || '';
    el.prompt.hidden = !text;
  },
  clearSpeech() {
    queue.length = 0;
    speaking = 0;
    el.subtitle.classList.remove('show');
  },
  update(dt) {
    if (hintTimer > 0) {
      hintTimer -= dt;
      if (hintTimer <= 0) el.hint.classList.remove('show');
    }
    if (captionTimer > 0) {
      captionTimer -= dt;
      if (captionTimer <= 0) el.caption.classList.remove('show');
    }
    if (speaking > 0) {
      speaking -= dt;
      if (speaking <= 0) el.subtitle.classList.remove('show');
      return;
    }
    const next = queue.shift();
    if (!next) return;
    el.subtitle.className = `show ${next.kind}`;
    const who = document.createElement('b');
    who.textContent = next.speaker;
    const line = document.createElement('span');
    line.textContent = next.text;
    el.subtitle.replaceChildren(who, line);
    speaking = 2.2 + next.text.length * 0.045;
  },
};
