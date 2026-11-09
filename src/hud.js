// The DOM overlay drawn over the 67js canvas.
import { settings } from './settings.js';
import { labelForDefaultKey, bindingLabel } from './input.js';
import { crewById } from './crew.js';

const $ = (id) => document.getElementById(id);
const el = {};
const queue = [];
let speaking = 0;
let captionTimer = 0;
let hintTimer = 0;
let objectiveTimer = 0, tickerTimer = 0;
let crisis = null; // the crewmate in trouble, if any: the HUD makes them impossible to miss
let lastRoster = '';
const HINT_SECONDS = 7;
let player = 'MARS';
let last = null; // the run's state, for lines that depend on Drift and the manifest
const CREW_NAMES = ['MARS', 'DEZ', 'TUBS', 'JUNE'];
/** "E · Board", "HOLD E", "hold G", "Z / tap B": key letters become the player's current binding, in brackets. */
function withBindings(text) {
  const L = (k) => `[${labelForDefaultKey(k)}]`;
  return text
    .replace(/^([A-Z]) · /, (_, k) => `${L(k)} `)
    .replace(/\b(HOLD|Hold|hold|tap|press|Press) ([A-Z])\b/g, (_, w, k) => `${w} ${L(k)}`)
    .replace(/\b([A-Z]) \/ /g, (_, k) => `${L(k)} / `)
    .replace(/ · ([A-Z]) (shove|to|for|·)/g, (_, k, w) => ` · ${L(k)} ${w}`);
}
/** During a crisis only lines about it get through: anything naming the crewmate, or the rescue's verbs. */
function aboutCrisis(kind, text) {
  if (kind === 'attendant') return false;
  if (kind !== 'crew') return true; // voices, Drift and Marco are threats in their own right
  return new RegExp(`${crewById(crisis.id).name}|grab|line|grip|pull|hold|shoot|help`, 'i').test(text);
}
const garble = (text, amount) => text.replace(/[A-Z0-9]/g, (c) => (Math.random() < amount ? '·' : c));

const IDS = ['player-name', 'carry', 'urgent', 'helpmark', 'slots', 'needle', 'ticker', 'hud', 'sector-name', 'objective', 'score', 'score-wrap', 'cleared', 'depth', 'vitals', 'vitals-bar', 'drift', 'drift-bar', 'charge', 'charge-max', 'charge-state', 'mode', 'crosshair', 'subtitle', 'toast', 'prompt', 'damage', 'driftfx', 'scrap', 'hint', 'band', 'guests', 'route', 'raft', 'chambers', 'roster', 'filter', 'filters', 'cells', 'heat-bar', 'caption', 'scan', 'raft-panel'];

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
    this.objective(objective);
  },
  /** A new objective is prominent for a few seconds, then compacts to one line (unless the HUD is persistent). */
  objective(text) {
    if (el.objective.textContent === text) return;
    el.objective.textContent = text;
    el.objective.parentElement.classList.remove('compact');
    objectiveTimer = 6;
  },
  /** What you are carrying for the crew's objective, shown on your own entry. */
  carry(text) {
    el.carry.textContent = text ? ` · ${text}` : '';
  },
  /** A crewmate who needs you, off to one side: a marker at that edge of the view. side: -1 left, 1 right, 0 none. */
  help(side, who = '') {
    el.helpmark.hidden = !side;
    if (!side) return;
    el.helpmark.className = `mono ${side < 0 ? 'left' : 'right'}`;
    el.helpmark.textContent = side < 0 ? `◀ ${who.toUpperCase()}` : `${who.toUpperCase()} ▶`;
  },
  /** Routine score lines go to a small ticker by the equipment, never across the middle of the screen. */
  ticker(text) {
    el.ticker.textContent = text;
    el.ticker.classList.add('show');
    tickerTimer = 2.2;
  },
  /**
   * Reticle states, carried by shape as well as colour: interact (open brackets), lock (a lock frame),
   * progress 0..1 (an arc while an action is held).
   */
  reticle({ interact = false, lock = false, progress = 0 } = {}) {
    el.crosshair.classList.toggle('interact', interact);
    el.crosshair.classList.toggle('lock', lock);
    el.crosshair.classList.toggle('holding', progress > 0);
    el.crosshair.style.setProperty('--p', String(Math.max(0, Math.min(1, progress))));
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
    // The crew: dependable state, never faked by the Caller. Shapes and words, not only colour.
    if (state.crewState) {
      const entries = Object.entries(state.crewState);
      const key = JSON.stringify([entries, state.forgotten]);
      if (key !== lastRoster) {
        lastRoster = key;
        el.roster.replaceChildren(...entries.map(([id, st]) => {
          const row = document.createElement('p');
          const gone = state.forgotten?.includes(id);
          row.className = `mate s-${gone ? 'gone' : st}`;
          const sym = document.createElement('i');
          sym.textContent = gone ? '▯' : { ok: '●', hurt: '◐', down: '▲', grabbed: '✕' }[st] || '●';
          const name = document.createElement('b');
          name.textContent = gone ? '— — —' : crewById(id).name.toUpperCase();
          const cond = document.createElement('span');
          cond.textContent = gone ? '' : ({ ok: '', hurt: 'HURT', down: 'DOWN', grabbed: 'GRABBED' }[st] ?? st.toUpperCase());
          row.append(sym, name, cond);
          return row;
        }));
      }
      const trouble = entries.find(([id, st]) => (st === 'grabbed' || st === 'down') && !state.forgotten?.includes(id));
      crisis = trouble ? { id: trouble[0], st: trouble[1] } : null;
      el.urgent.hidden = !crisis;
      if (crisis) el.urgent.textContent = `${crisis.st === 'grabbed' ? '✕' : '▲'} ${crewById(crisis.id).name.toUpperCase()} · ${crisis.st === 'grabbed' ? 'GRABBED' : 'DOWN'}`;
      document.body.classList.toggle('crisis', !!crisis);
    }
    el['player-name'].textContent = player;
    // Fixed quick-use positions: an empty slot stays where it was, with the key that uses it.
    const slotData = { dressing: [state.dressings || 0, bindingLabel('dressing')], filter: [state.filters || 0, 'AUTO'], cell: [state.cells || 0, bindingLabel('burst')], patch: [state.patchKits ?? 0, bindingLabel('patch')] };
    for (const node of el.slots.children) {
      const [n, keyName] = slotData[node.dataset.slot];
      node.classList.toggle('empty', n <= 0);
      node.querySelector('i').textContent = keyName;
      node.querySelector('span').textContent = n > 0 ? `×${n}` : '—';
    }
    // The raft's pressure gauge: a needle over a dial, with a redline. It trembles when something grips the raft.
    const strain = state.hullStrain ? (Math.random() - 0.5) * 9 : 0;
    el.needle.setAttribute('transform', `rotate(${-90 + Math.max(0, Math.min(100, state.raft)) * 1.8 + strain} 32 36)`);
    document.body.classList.toggle('aboard', !!state.mounted);
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
    // Condensation behind the blaster's display glass as Drift rises; the reading itself stays legible.
    document.body.style.setProperty('--fog', String(Math.max(0, Math.min(1, (state.drift - 40) / 60))));
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
    hintTimer = settings.tips === false ? 0 : settings.hudPersistent ? 1e9 : HINT_SECONDS;
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
    if (kind === 'attendant' && !speaker.includes('·')) speaker = `${speaker} · PA`;
    // Optional lines yield while a crewmate is in trouble: the PA, and banter that isn't about the rescue.
    if (crisis && !aboutCrisis(kind, text)) return;
    if (queue.some((q) => q.text === text)) return;
    queue.push({ speaker, text, kind });
  },
  toast(text) {
    el.toast.textContent = text;
    el.toast.classList.remove('show');
    void el.toast.offsetWidth;
    el.toast.classList.add('show');
  },
  /** One prompt at a time, naming the action; key letters are rewritten to whatever is bound, on the current device. */
  prompt(text) {
    const t = text ? withBindings(text) : '';
    if (el.prompt.textContent !== t) el.prompt.textContent = t;
    el.prompt.hidden = !t;
  },
  clearSpeech() {
    queue.length = 0;
    speaking = 0;
    el.subtitle.classList.remove('show');
  },
  update(dt) {
    if (objectiveTimer > 0) {
      objectiveTimer -= dt;
      if (objectiveTimer <= 0 && !settings.hudPersistent) el.objective.parentElement.classList.add('compact');
    }
    if (tickerTimer > 0) {
      tickerTimer -= dt;
      if (tickerTimer <= 0) el.ticker.classList.remove('show');
    }
    if (crisis) for (let i = queue.length - 1; i >= 0; i--) if (!aboutCrisis(queue[i].kind, queue[i].text)) queue.splice(i, 1);
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
