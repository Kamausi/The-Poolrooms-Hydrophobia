// Overlays: the shared modal, the Safe Room, the logbook, documents, the keypad, settings.
import { settings, saveSettings, SETTING_LABELS } from './settings.js';
import { COMFORTS } from './sectors.js';
import { ROUTES } from './plans.js';
import { CREW, crewById, fadingCrew } from './crew.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

export function showModal(title, body, actions, label = 'FIELD MANUAL') {
  $('modal-label').textContent = label;
  $('modal-title').textContent = title;
  const target = $('modal-body');
  target.replaceChildren();
  if (typeof body === 'string') for (const para of body.split('\n\n')) target.append(el('p', null, para));
  else target.append(body);
  const bar = $('modal-actions');
  bar.replaceChildren();
  for (const [text, fn, primary] of actions) {
    const b = el('button', primary ? 'primary' : '', text);
    b.onclick = fn;
    bar.append(b);
  }
  $('modal').hidden = false;
  bar.querySelector('button')?.focus();
}
export function hideModal() {
  $('modal').hidden = true;
}

/** Capability upgrades: each changes what you notice or which routes you can attempt. */
export const UPGRADES = [
  { id: 'lens', name: 'Inspection lens', text: 'Wider, longer inspection beam.', cost: 3 },
  { id: 'depth', name: 'Depth sensor', text: 'Tells safe water from deep, connected water. Shows the wake\'s distance on foot.', cost: 3 },
  { id: 'tether', name: 'Stronger tether', text: 'Holds the raft at junction pools too, so you can look before you choose.', cost: 2 },
  { id: 'recorder', name: 'Signal recorder', text: 'Remembers target sequences. Numbered targets show their order.', cost: 3 },
  { id: 'headlamp', name: 'Raft headlamp', text: 'Lights dark channels and shows what is behind each upcoming gate.', cost: 3 },
  { id: 'valve', name: 'Valve tool', text: 'Drain a flooded passage by hand from the dock (V).', cost: 2 },
];
/** Supplies converted into items. */
export const RECIPES = [
  { id: 'cell', name: 'Charge cell', text: 'For the disruption burst.', cost: 2, can: (s) => s.cells < 3, apply: (s) => (s.cells += 1) },
  { id: 'filter', name: 'Filter', text: 'Chlorine protection.', cost: 1, can: (s) => s.filters < 3, apply: (s) => { s.filters += 1; if (s.filter <= 0) s.filter = 100; } },
  { id: 'patch', name: 'Raft patch', text: '+35% raft hull. You will see the patch.', cost: 2, can: (s) => s.raft < 100, apply: (s) => { s.raft = Math.min(100, s.raft + 35); s.patches = Math.min(3, (s.patches || 0) + 1); } },
  { id: 'medkit', name: 'Field dressing', text: '+40 vitals.', cost: 2, can: (s) => s.health < 100, apply: (s) => (s.health = Math.min(100, s.health + 40)) },
];

/**
 * The Safe Room. state: the run. nextPlan: the next sector's ride plan (for the route terminal).
 * nextSector: its data. onLeave(): continue. onSave(): persist after changes.
 */
export function showSafeRoom(state, sector, nextSector, nextPlan, onLeave, onSave, access = {}) {
  const body = el('div');
  const comfort = COMFORTS[(state.guests + state.sectorIndex) % COMFORTS.length];
  body.append(el('p', null, `The bulkhead seals behind you. The vent hums. The lights are too bright for anything that lives in the water. ${comfort}`));
  body.append(el('p', 'mono', `CHECKPOINT CONFIRMED · DRIFT RESET · RAFT CLEANSED · GUESTS CHECKED IN: ${state.guests}`));
  // Recovery you can see: hard floor, moving air, a record that says you are here.
  if (state.arrivalDrift > 65) body.append(el('p', null, `When you came in, your name on the manifest was a smudge and the door took two tries to notice you. Under the hard white light the letters come back: ${crewById(state.character).full.toUpperCase()}. Your wristband reads ${state.band} again.`));

  // Roll call: the crew counts off before every launch. Later, the facility starts disagreeing.
  const roll = el('div', 'choices');
  roll.append(el('p', 'mono', 'ROLL CALL · THE MANIFEST'));
  const fading = fadingCrew(state);
  let resolved = !fading;
  for (const c of CREW) {
    if (c.id === state.character) { roll.append(el('p', null, `${c.full} · you · present`)); continue; }
    if (state.forgotten.includes(c.id)) { roll.append(el('p', 'mono', `— — — — —  · NO RECORD (you can still hear them on the radio)`)); continue; }
    if (fading && c.id === fading.id) {
      const row = el('div', 'choices');
      row.append(el('p', null, `${c.full.replace(/[a-z]/g, (ch) => (Math.random() < 0.5 ? '·' : ch))} · the terminal counts ${CREW.length - state.forgotten.length - 1}. ${c.name} answers on the radio: "Here. I'm here. Say my name."`));
      const read = el('button', 'choice');
      read.append(el('b', null, `Read ${c.name}'s name back into the manifest`), el('span', null, 'Takes the time, and the noise carries: the next sector is a little harder. Their name stays.'));
      const accept = el('button', 'choice');
      accept.append(el('b', null, 'Accept the terminal\'s count'), el('span', null, `The door will open on schedule. ${c.name} will come through the radio without an identifier from now on.`));
      read.onclick = () => {
        state.recognized += 1;
        state.pressure = Math.min(1.6, (state.pressure || 1) + 0.05);
        row.replaceChildren(el('p', null, `${c.full} · present. The letters hold.`));
        resolved = true;
        launch?.removeAttribute('disabled');
        onSave();
      };
      accept.onclick = () => {
        state.forgotten.push(c.id);
        row.replaceChildren(el('p', 'mono', '— — — — —  · NO RECORD'));
        resolved = true;
        launch?.removeAttribute('disabled');
        onSave();
      };
      row.append(read, accept);
      roll.append(row);
      continue;
    }
    roll.append(el('p', null, `${c.full} · "Here."`));
  }
  body.append(roll);

  // Playing well earns access, and carries you deeper.
  if (access.earned) body.append(el('p', 'mono', `SIGNAL RATING ${access.sectorScore} · MAINTENANCE OVERRIDE ISSUED (${state.overrides} held · press O at a locked gate) · FULL ROUTE DATA · NEXT SECTOR ROUTED DEEPER`));
  else if (access.sectorScore != null) body.append(el('p', 'mono', `SIGNAL RATING ${access.sectorScore} · 1200 earns an override and full route data`));

  // The Lido: people who stopped trying to leave.
  if (sector.index >= 4 && sector.index <= 6 && !sector.endless) {
    const vance = el('div');
    vance.append(el('p', 'mono', 'THE LIDO · MRS. VANCE'));
    vance.append(el('p', null, [
      'Mrs. Vance is already here, hands folded in her lap because they no longer unfold. She has kept this pump room running for years. "Filters are on the shelf, take two. You\'re going to clear the drain? Everyone down there is asleep, dear. They are not suffering. You are the ones suffering."',
      '"The Pumphouse thinks the park is broken. It isn\'t. It is doing exactly what it was built for: keeping guests. Learn how it works and it will keep you kindly. Fight it and it keeps you anyway."',
      '"Caleb Teague came through here. He asked about the chair. I told him not to sit in it. Somebody always does."',
    ][sector.index - 4]));
    if (!state.vanceFilters?.[sector.index]) {
      (state.vanceFilters ||= {})[sector.index] = true;
      state.filters = Math.min(3, state.filters + 2);
      state.filter = 100;
    }
    body.append(vance);
  }

  const wall = el('div', 'graffiti');
  for (const line of sector.graffiti || []) {
    const p = el('p', null, line);
    p.style.transform = `rotate(${(Math.random() - 0.5) * 5}deg)`;
    wall.append(p);
  }
  if (sector.graffiti?.length) body.append(wall);

  // Workbench
  const bench = el('div', 'choices');
  const partsLabel = el('p', 'mono');
  bench.append(partsLabel);
  const refresh = () => {
    partsLabel.textContent = `WORKBENCH · ${state.scrap} PARTS · VITALS ${Math.ceil(state.health)} · RAFT ${Math.ceil(state.raft)}% · CELLS ${state.cells} · FILTERS ${state.filters}`;
    bench.querySelectorAll('button').forEach((b) => b.refresh());
  };
  for (const r of RECIPES) {
    const b = el('button', 'choice');
    b.append(el('b', null, r.name), el('span', null, r.text), el('i', null, `${r.cost} PARTS`));
    b.refresh = () => (b.disabled = state.scrap < r.cost || !r.can(state));
    b.onclick = () => {
      state.scrap -= r.cost;
      r.apply(state);
      refresh();
      onSave();
    };
    bench.append(b);
  }
  const mods = el('p', 'mono', 'EQUIPMENT · CAPABILITY MODIFICATIONS');
  bench.append(mods);
  for (const u of UPGRADES) {
    const b = el('button', 'choice');
    const tag = el('i');
    b.append(el('b', null, u.name), el('span', null, u.text), tag);
    b.refresh = () => {
      const owned = state.upgrades.includes(u.id);
      tag.textContent = owned ? 'FITTED' : `${u.cost} PARTS`;
      b.disabled = owned || state.scrap < u.cost;
    };
    b.onclick = () => {
      state.scrap -= u.cost;
      state.upgrades.push(u.id);
      refresh();
      onSave();
    };
    bench.append(b);
  }
  body.append(bench);

  // Route terminal: partial information about the next routes.
  if (nextSector && nextPlan) {
    const term = el('div', 'terminal');
    const junction = nextPlan.items.find((it) => it.type === 'pool' && it.junction);
    const full = state.upgrades.includes('headlamp') || access.earned || state.memory?.route;
    const dock = nextPlan.items.find((it) => it.type === 'pool' && it.dock);
    const lines = [`ROUTE TERMINAL · NEXT: ${nextSector.name} · ${nextSector.depth} M`];
    const status = (route) => {
      const known = full;
      if (route === 'public') return `lighting good · signage clear · ${known ? 'longer, gentle' : 'length unknown'}`;
      if (route === 'maintenance') return `machinery working · equipment storage · ${known ? 'flume and pressure tube' : 'hazards unknown'}`;
      return `pressure ${known ? 'unstable' : 'unknown'} · few docks · shortcut`;
    };
    if (junction) junction.exits.forEach((ex) => lines.push(`${ex.side < 0 ? '◀' : '▶'} ${ROUTES[ex.route].label.padEnd(18)} ${status(ex.route)}`));
    if (dock) lines.push(`DOCK · ${dock.dock.beacon}${dock.dock.figure ? ' · OCCUPANCY READING IRREGULAR' : ''}`);
    lines.push(`GUESTS CHECKED IN: ${state.guests}`);
    term.textContent = lines.join('\n');
    body.append(el('p', 'mono', 'DISPATCH · PRESET THE FIRST JUNCTION'));
    body.append(term);
    if (junction) {
      const routes = el('div', 'choices');
      junction.exits.forEach((ex, i) => {
        const b = el('button', `choice route${(nextPlan.choices[junction.id] ?? 0) === i ? ' selected' : ''}`);
        b.append(el('b', null, `${ex.side < 0 ? '◀ LEFT' : 'RIGHT ▶'} · ${ex.label}`), el('span', null, ex.note));
        b.onclick = () => {
          nextPlan.choices[junction.id] = i;
          routes.querySelectorAll('.route').forEach((x) => x.classList.remove('selected'));
          b.classList.add('selected');
          onSave();
        };
        routes.append(b);
      });
      body.append(routes);
    }
  }

  body.append(logbookView(state));
  refresh();
  showModal('A moment above water.', body, [[nextSector ? 'COUNT OFF AND LAUNCH ↗' : 'OPEN THE LAST DOOR ↗', onLeave, true]], 'SAFE ROOM · AUTHENTICATED');
  const launch = document.querySelector('#modal-actions button');
  if (!resolved) {
    launch.setAttribute('disabled', '');
    launch.title = 'Finish the roll call first';
  }
}

export function logbookView(state) {
  const wrap = el('div');
  wrap.append(el('p', 'mono', `LOGBOOK · ${state.logbook.length} DOCUMENTS`));
  const list = el('div', 'logbook');
  if (!state.logbook.length) list.append(el('p', null, 'Nothing recorded yet. Documents you read on foot are kept here.'));
  for (const doc of state.logbook) {
    const a = el('article');
    a.append(el('h3', null, doc.title), el('p', null, doc.text));
    list.append(a);
  }
  wrap.append(list);
  return wrap;
}

export function showDocument(doc, onClose) {
  const body = el('div');
  const p = el('p', null, doc.text);
  p.style.whiteSpace = 'pre-wrap';
  body.append(p);
  showModal(doc.title, body, [['CLOSE · RECORDED IN THE LOGBOOK', onClose, true]], 'FOUND DOCUMENT');
}

export function showKeypad(code, onSuccess, onClose) {
  const body = el('div');
  let entry = '';
  const display = el('p', 'keypad-display', '___');
  const pad = el('div', 'keypad');
  const update = () => (display.textContent = (entry + '___').slice(0, 3));
  const press = (d) => {
    if (entry.length >= 3) return;
    entry += d;
    update();
    if (entry.length === 3) {
      if (entry === code) {
        display.textContent = 'OPEN';
        setTimeout(() => { removeEventListener('keydown', onKey); onSuccess(); }, 400);
      } else {
        display.textContent = 'XXX';
        setTimeout(() => { entry = ''; update(); }, 600);
      }
    }
  };
  for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '']) {
    const b = el('button', null, d);
    if (!d) b.style.visibility = 'hidden';
    b.onclick = () => press(d);
    pad.append(b);
  }
  const onKey = (e) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
  };
  addEventListener('keydown', onKey);
  body.append(el('p', null, 'Three digits. The pavilion says the code is posted for all guests, if you look closely.'), display, pad);
  showModal('Keypad', body, [['STEP BACK', () => { removeEventListener('keydown', onKey); onClose(); }]], 'MAINTENANCE DOOR');
}

export function settingsView(onChange) {
  const wrap = el('div', 'settings');
  for (const [key, label] of Object.entries(SETTING_LABELS)) {
    const row = el('label');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = !!settings[key];
    box.onchange = () => {
      settings[key] = box.checked;
      saveSettings();
      onChange?.();
    };
    row.append(box, document.createTextNode(label));
    wrap.append(row);
  }
  const sens = el('label');
  const slider = el('input');
  Object.assign(slider, { type: 'range', min: 0.3, max: 2.5, step: 0.1, value: settings.sensitivity });
  slider.oninput = () => {
    settings.sensitivity = Number(slider.value);
    saveSettings();
  };
  sens.append(document.createTextNode('Look sensitivity'), slider);
  wrap.append(sens);
  return wrap;
}
