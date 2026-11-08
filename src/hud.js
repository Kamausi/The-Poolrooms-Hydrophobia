// The DOM overlay drawn over the 67js canvas.

const $ = (id) => document.getElementById(id);
const el = {};
const queue = [];
let speaking = 0;

export function initHud() {
  for (const id of ['hud', 'sector-name', 'objective', 'score', 'cleared', 'depth', 'vitals', 'vitals-bar', 'drift', 'drift-bar', 'charge', 'charge-max', 'charge-state', 'mode', 'crosshair', 'subtitle', 'toast', 'prompt', 'damage', 'driftfx', 'scrap', 'hint']) el[id] = $(id);
}

export const hud = {
  show(on) {
    el.hud.hidden = !on;
  },
  sector(sector, objective) {
    el['sector-name'].textContent = `SECTOR 0${sector.index + 1} · ${sector.name}`;
    el.objective.textContent = objective;
  },
  objective(text) {
    el.objective.textContent = text;
  },
  stats(state) {
    el.score.textContent = String(Math.floor(state.score)).padStart(5, '0');
    el.cleared.textContent = `${state.cleared} ENTITIES DISPERSED`;
    el.vitals.textContent = Math.ceil(state.health);
    el['vitals-bar'].style.width = `${state.health}%`;
    el['vitals-bar'].classList.toggle('low', state.health < 30);
    el.drift.textContent = Math.floor(state.drift);
    el['drift-bar'].style.width = `${state.drift}%`;
    el.charge.textContent = state.charge;
    el['charge-max'].textContent = `/ ${state.maxCharge}`;
    el['charge-state'].textContent = state.recharging ? 'RECHARGING…' : state.charge === 0 ? '[R] RECHARGE' : 'ARC BLASTER / MK.II';
    el.scrap.textContent = `${state.scrap} PARTS`;
    // Drift fades the HUD and washes the screen, as described in the story bible.
    const d = state.drift / 100;
    el.hud.style.opacity = String(1 - d * 0.55);
    el.driftfx.style.opacity = String(Math.max(0, d - 0.25) * 1.1);
  },
  depth(text) {
    el.depth.textContent = text;
  },
  mode(text) {
    el.mode.textContent = text;
  },
  hint(text) {
    el.hint.textContent = text;
  },
  crosshair(ndcX, ndcY, centered) {
    const x = centered ? 50 : (ndcX * 0.5 + 0.5) * 100;
    const y = centered ? 50 : (-ndcY * 0.5 + 0.5) * 100;
    el.crosshair.style.left = `${x}%`;
    el.crosshair.style.top = `${y}%`;
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
  /** Radio and PA lines. Queued so they never overlap. kind: crew | attendant | marco | drift */
  say(speaker, text, kind = 'crew') {
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
    if (speaking > 0) {
      speaking -= dt;
      if (speaking <= 0) el.subtitle.classList.remove('show');
      return;
    }
    const next = queue.shift();
    if (!next) return;
    el.subtitle.className = `show ${next.kind}`;
    el.subtitle.innerHTML = '';
    const who = document.createElement('b');
    who.textContent = next.speaker;
    const line = document.createElement('span');
    line.textContent = next.text;
    el.subtitle.append(who, line);
    speaking = 2.2 + next.text.length * 0.045;
  },
};
