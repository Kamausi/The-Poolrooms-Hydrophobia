// Overlays: the shared modal, the Safe Room, the logbook, documents, the keypad, settings.
import { settings, saveSettings, SETTING_LABELS, ACTIONS } from './settings.js';
import { sound } from './audio.js';
import { input, applyBindings, PAD_ACTIONS, PAD_NAMES } from './input.js';
import { COMFORTS, SECTORS } from './sectors.js';
import { ROUTES } from './plans.js';
import { CREW, crewById, fadingCrew } from './crew.js';
import { ensureHull, compressorRefill, CHAMBER_NAME } from './hull.js';
import { facility, sectorMem, saveFacility, falseRecord } from './memory.js';

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
/** Raft configurations: handling, protection or capacity, chosen at the workbench. */
/** Fixed raft footprint: three equipment positions. Fitting happens here and at maintenance docks, never mid-channel. */
export const RAFT_GEAR = [
  { id: 'bow', name: 'Reinforced bow housing', text: 'Front-chamber hits do less and rarely open a leak.' },
  { id: 'hookgear', name: 'Better retrieval gear', text: 'Hook line reaches 24 m and reels in faster.' },
  { id: 'reservoir', name: 'Emergency pressure reservoir', text: 'Once per ride, the softest chamber gets +45 when one drops below a quarter.' },
  { id: 'filtration', name: 'Compact filtration unit', text: 'Filters last longer in hazardous water; the Safe Room pump room tops one up.' },
  { id: 'storage', name: 'Sealed storage', text: 'Carry four charge cells and four dressings instead of three.' },
];
export const capOf = (s) => ((s.gear || []).includes('storage') ? 4 : 3);
export const RAFT_FITS = [
  { id: 'standard', name: 'Standard hull', text: 'Balanced. What Dez built.' },
  { id: 'handling', name: 'Light hull', text: 'Steers faster and hops higher. Thinner.' },
  { id: 'protection', name: 'Shielded hull', text: 'Bracing blocks almost everything from the front. Heavier.' },
  { id: 'capacity', name: 'Cradle hull', text: '+8 blaster charge and a faster recharge cradle when braced.' },
];
/**
 * The Lido throwing game: five wooden pieces at a bucket. Stop the swinging marker in the middle.
 * Nothing rides on it. The chalk tallies on the wall go back further than anyone has been here.
 */
function lidoGame(state, onSave) {
  const wrap = el('div', 'choices lido');
  wrap.append(el('p', 'mono', 'THE CAMPSITE · BUCKET TOSS'));
  wrap.append(el('p', null, `Somebody built this out of a mop bucket, chair legs and five pieces of sanded wood. The wall beside it is chalk tally marks, hundreds, in groups of four. Mrs. Vance's best is 4. ${state.lidoBest != null ? `Yours is ${state.lidoBest}.` : 'There is room on the wall for your name.'}`));
  const meter = el('div', 'lido-meter');
  const mark = el('i');
  meter.append(mark);
  const status = el('p', 'mono', 'PIECES 5 · IN THE BUCKET 0');
  const btn = el('button', 'choice');
  btn.append(el('b', null, 'Throw'), el('span', null, 'Throw when the marker is over the bucket.'));
  let left = 5, made = 0, t = Math.random() * 6, raf = 0;
  const step = () => {
    if (!wrap.isConnected && t > 0.5) return;
    t += 0.035 + (5 - left) * 0.006;
    mark.style.left = `${50 + Math.sin(t) * 46}%`;
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  btn.onclick = () => {
    if (left <= 0) return;
    left -= 1;
    const hit = Math.abs(Math.sin(t)) < 0.16;
    if (hit) made += 1;
    status.textContent = `PIECES ${left} · IN THE BUCKET ${made}${hit ? ' · CLUNK' : ' · it skids across the tile'}`;
    if (left === 0) {
      cancelAnimationFrame(raf);
      btn.disabled = true;
      state.lidoBest = Math.max(state.lidoBest ?? 0, made);
      wrap.append(el('p', null, made >= 4 ? 'Mrs. Vance claps, slowly, with hands that do not open. "Put your mark up, dear. Next to the others."' : made ? 'You chalk your tally up with the others. Somebody has already chalked the same number, in your handwriting, lower on the wall.' : 'Nothing. Mrs. Vance says the bucket moves when you are not looking. She is not joking.'));
      onSave();
    }
  };
  wrap.append(meter, status, btn);
  return wrap;
}

/** Supplies converted into items. */
export const RECIPES = [
  { id: 'cell', name: 'Charge cell', text: 'For the disruption burst.', cost: 2, can: (s) => s.cells < capOf(s), apply: (s) => (s.cells += 1) },
  { id: 'filter', name: 'Filter', text: 'Chlorine protection.', cost: 1, can: (s) => s.filters < 3, apply: (s) => { s.filters += 1; if (s.filter <= 0) s.filter = 100; } },
  { id: 'patch', name: 'Field patch kit', text: 'Carried. Hold G on the raft: find the hiss, press it down, pump it up.', cost: 1, can: (s) => (s.patchKits || 0) < 4, apply: (s) => (s.patchKits = (s.patchKits || 0) + 1) },
  { id: 'medkit', name: 'Field dressing', text: 'Carried. Press H to apply (+40 vitals over a few seconds, no firing while you do).', cost: 2, can: (s) => (s.dressings || 0) < capOf(s), apply: (s) => (s.dressings = (s.dressings || 0) + 1) },
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
  // The first Safe Room: the crew regroups. From here they ride in your raft.
  if (!state.regrouped && !state.endless) {
    state.regrouped = true;
    body.append(el('p', null, 'The others are already here: soaked, arguing about the junction, alive. Tubs has the kettle on a pump housing. From here, the four of you ride one raft.'));
  }
  // Real relief: dry clothes, machine noise, people making an effort to stay awake.
  if (state.regrouped && !state.endless) body.append(el('p', null, ['Dry overalls hang on the pipe by the heater. Tubs is pacing so he doesn\'t fall asleep; June counts tiles out loud.', 'Somebody has the kettle going on a pump housing. Dez is stripping the blaster with his eyes half shut, talking to keep them open.', 'Mars makes everyone change into dry socks before anyone sits down. Nobody argues. The pumps are loud enough to be company.'][(state.sectorIndex + state.guests) % 3]));
  body.append(el('p', 'mono small', `PUMPHOUSE COUNTER · GUESTS ADMITTED: 04 · GUESTS RETURNED: ${String(Math.max(1, 4 - (state.forgotten || []).length - 1)).padStart(2, '0')} · DISCREPANCY: NONE`));
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

  // The maintenance sheet: three numbered sections, read like an inspection form. Supplies, the raft and its
  // equipment, the next route. Transactions say exactly what changes; the room supplies the atmosphere.
  const sheet = el('div', 'sheet');
  const section = (n, title) => { const sec = el('section', 'sheet-sec'); sec.append(el('h3', 'sheet-head', `${n} · ${title}`)); sheet.append(sec); return sec; };
  const s1 = section('1', 'SUPPLIES');
  const s2 = section('2', 'RAFT AND EQUIPMENT');
  const s3 = section('3', 'NEXT ROUTE');
  body.append(sheet);

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

  // The compressor: every chamber back to full, every open hole under a bench patch. The marks stay on the hull.
  ensureHull(state);
  const air = el('div', 'choices');
  const airBtn = el('button', 'choice');
  const leaks = state.leaks.length;
  airBtn.append(el('b', null, 'Run the compressor'), el('span', null, `${leaks ? `${leaks} open leak${leaks > 1 ? 's' : ''} (${state.leaks.map((l) => CHAMBER_NAME[l.chamber].toLowerCase()).join(', ')}). ` : ''}Seals and refills all four chambers. It is loud. Through the floor, something answers it.`), el('i', null, `RAFT ${Math.ceil(state.raft)}%`));
  airBtn.disabled = state.raft >= 99.5 && !leaks;
  airBtn.onclick = () => {
    compressorRefill(state);
    airBtn.disabled = true;
    airBtn.querySelector('i').textContent = 'RAFT 100%';
    // The receipt the compressor prints is dated the day before the crew arrived.
    air.append(el('p', 'mono small receipt', `REPAIR RECEIPT · COMPRESSOR, ${sector.name} · WORK SIGNED ${state.name.toUpperCase()} · DATED THE DAY BEFORE YOU ARRIVED`));
    const marks = state.hullMarks.filter((m) => m.kind === 'patch').length;
    air.append(el('p', null, `The chambers go hard under your hands. ${marks ? `${marks} patch${marks > 1 ? 'es' : ''} on the hull now, every one of them somebody\'s work. ` : ''}When the compressor cuts out, three knocks come back up through the floor. Nobody mentions it.`));
    onSave();
  };
  air.append(el('p', 'mono', 'COMPRESSOR · SERVICE AIR'), airBtn);
  s2.append(air);

  // The Lido's campsite: a throwing game somebody made out of a bucket and chair legs. Scores in chalk.
  if (sector.index >= 4 && sector.index <= 6 && !sector.endless) body.append(lidoGame(state, onSave));

  // Live details: the room is safe, and still wrong.
  const live = el('div', 'safe-live mono small');
  const clock = el('p');
  const outside = el('p');
  live.append(clock, outside);
  body.append(live);
  let mins = 3 * 60 + 14;
  let attached = false;
  const ANNOUNCE = ['"…remain seated until…"', '"…the park will close when…"', '"…guest, your party is waiting…"', '"…lost property may be collected…"', '"…occupancy is currently…"'];
  const tick = () => {
    if (!body.isConnected) { if (attached) clearInterval(timer); return; }
    attached = true;
    // The maintenance clock advances irregularly. Sometimes backwards.
    mins += [1, 0, 1, 2, -17, 1, 27][Math.floor(Math.random() * 7)];
    clock.textContent = `MAINTENANCE CLOCK ${String(Math.floor(((mins % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((mins % 60) + 60) % 60).padStart(2, '0')}`;
    if (Math.random() < 0.35) outside.textContent = `THROUGH THE DOOR: ${ANNOUNCE[Math.floor(Math.random() * ANNOUNCE.length)]}`;
  };
  const timer = setInterval(tick, 2200);
  setTimeout(tick, 0);
  if (state.sawStairway?.[state.sectorKey]) body.append(el('p', null, 'June unfolds her map. The stairway from the pool hall is drawn on it now, where you saw it, above you. The handwriting is not hers. It isn\'t anyone\'s you know.'));
  else body.append(el('p', null, 'The map on the wall marks a room called "Pool 14". None of you remember passing it. The pencil line from it leads here.'));

  const wall = el('div', 'graffiti');
  const REPLIES = ['Everybody we could remember.', 'why not. it\'s warm', 'BECAUSE I SAID SO. — M.', 'who is M', 'it\'s me, you idiot. it\'s always me', 'stop writing on the walls — maintenance', 'maintenance isn\'t real', 'then who keeps painting over this'];
  (sector.graffiti || []).forEach((line, i) => {
    // Each writer has a hand, and keeps it: M. always writes in the same hand; maintenance types.
    const handOf = (t) => (/— M\.|it's me, you idiot|BECAUSE I SAID/.test(t) ? 'hand-m' : /maintenance/i.test(t) ? 'hand-maint' : ['hand-a', 'hand-b', 'hand-c'][[...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) % 3]);
    const p = el('p', handOf(line), line);
    p.style.transform = `rotate(${(Math.random() - 0.5) * 5}deg)`;
    wall.append(p);
    // Earlier crews argue with each other, in layers.
    const replyText = line === 'EVERYBODY CAME BACK.' ? REPLIES[0] : REPLIES[1 + ((i + sector.index * 2) % (REPLIES.length - 1))];
    const reply = el('p', `reply ${handOf(replyText)}`, `↳ ${line === 'EVERYBODY CAME BACK.' ? REPLIES[0] : REPLIES[1 + ((i + sector.index * 2) % (REPLIES.length - 1))]}`);
    reply.style.transform = `rotate(${(Math.random() - 0.5) * 7}deg)`;
    wall.append(reply);
  });
  if (sector.graffiti?.length) body.append(wall);
  // The story that runs across the attractions, in objects. Nobody explains it.
  const STORY = {
    0: ['A maintenance sheet by the door: four signatures. Four mugs hang on hooks below it. One is still warm.', 'MAINTENANCE SHEET · WELCOME POOLS', 'Four signatures, four mugs, a shift that never ended. The last entry: "Pumps nominal. Everyone accounted for."'],
    1: ['Pinned over the bench: a note in the raft locker\'s handwriting about an old story. A maze with something at the centre, and a thread to find the way back. Someone has underlined "the way back".', 'THE THREAD', 'Every maze story is the same story: a long corridor, a thing at the centre, and the one rule that matters. Tie the thread at the door. Pay it out behind you. When the corridors start to look like the inside of your own head, follow the line back to the raft and do not look at what is following you. — in your handwriting'],
    5: ['A staff roster lists three workers on the pump crew. The photograph pinned beside it shows four at the same table, and the fourth is looking at whoever is holding the camera.', 'ROSTER AND PHOTOGRAPH · FILTRATION', 'Roster: three names. Photograph: four people. Nobody on the crew can say who the fourth is, and all of them say they remember her.'],
    7: ['Scratched under the bench, very small: "I don\'t remember her name. I remember how she knocks."', 'UNDER THE BENCH', '"I don\'t remember her name. I remember how she knocks." Three knocks, from underneath. You have heard them.'],
  }[sector.index];
  if (STORY && !sector.endless) {
    body.append(el('p', null, STORY[0]));
    if (!state.logbook.some((d) => d.id === `story-${sector.index}`)) state.logbook.push({ id: `story-${sector.index}`, title: STORY[1], text: STORY[2] });
  }
  if ([1, 5].includes(sector.index) && !sector.endless) body.append(el('p', null, 'On the wall hangs an old photograph of the reservoir\'s observation gallery, from the day it opened. There is a raft on the water in the photograph. It is yours. The patches are in the same places.'));
  // The facility's records about the people you saved: official, confident, wrong. The ledger knows better.
  if (!sector.endless && facility.visitors.length) {
    const v = facility.visitors[(sector.index + facility.expeditions) % facility.visitors.length];
    body.append(el('p', 'mono small', falseRecord(v, sector.name)));
    body.append(el('p', null, `Your field ledger says ${v.name} was brought to safety on expedition ${v.expedition}. The ledger is in your handwriting.`));
  }
  // What did this place do to you? The facility listens; it expands what unsettles and simplifies what loses people.
  if (!sector.endless) {
    const fb = el('div', 'choices');
    fb.append(el('p', 'mono small', 'FIELD NOTE · THIS ATTRACTION'));
    for (const [k, t] of [['unsettling', 'It stayed with me'], ['lost', 'I got lost'], ['quiet', 'Too quiet, in a good way']]) {
      const b = el('button', 'bind');
      b.textContent = t;
      b.onclick = () => { const m = sectorMem(state.sectorKey); (m.feedback ||= {})[k] = (m.feedback[k] || 0) + 1; saveFacility(); fb.replaceChildren(el('p', 'mono small', 'NOTED IN THE LEDGER')); };
      fb.append(b);
    }
    body.append(fb);
  }
  if (state.stats) body.append(el('p', 'mono small', `TEAMMATES FREED ${state.stats.freed} · REVIVES ${state.stats.revives} · REPAIRS ${state.stats.repairs} (${state.stats.pressureRepairs} under pressure) · SURVIVORS ${state.stats.survivors}`));

  // Workbench
  const bench = el('div', 'choices');
  const partsLabel = el('p', 'mono');
  bench.append(partsLabel);
  const modsBox = el('div', 'choices');
  const refresh = () => {
    partsLabel.textContent = `WORKBENCH · ${state.scrap} PART${state.scrap === 1 ? '' : 'S'} ON THE BENCH`;
    bench.querySelectorAll('button').forEach((b) => b.refresh());
    modsBox.querySelectorAll('button').forEach((b) => b.refresh());
  };
  // How many of each the crew is carrying, for the transaction line.
  const HELD = { cell: 'cells', filter: 'filters', patch: 'patchKits', medkit: 'dressings' };
  for (const r of RECIPES) {
    const b = el('button', 'choice');
    const deal = el('span', 'deal mono');
    b.append(el('b', null, r.name), deal, el('span', null, r.text), el('i', null, 'MAKE'));
    b.refresh = () => {
      const have = state[HELD[r.id]] || 0;
      const can = r.can(state);
      deal.textContent = can ? `Carrying: ${have} → ${have + 1} · Cost: ${r.cost} part${r.cost > 1 ? 's' : ''}` : `Carrying: ${have} · full`;
      b.disabled = state.scrap < r.cost || !can;
    };
    b.onclick = () => {
      state.scrap -= r.cost;
      r.apply(state);
      refresh();
      onSave();
    };
    bench.append(b);
  }
  const mods = el('p', 'mono', 'EQUIPMENT · CAPABILITY MODIFICATIONS');
  modsBox.append(mods);
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
    modsBox.append(b);
  }
  s1.append(bench);

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
    // The terminal is already printing the arrival before the raft has left.
    lines.push('', `ARRIVAL CONFIRMED · ${nextSector.name} · PARTY OF ${1 + Object.keys(state.crewState || {}).length - (state.forgotten || []).length} · ALL GUESTS ACCOUNTED FOR`);
    term.textContent = lines.join('\n');
    s3.append(el('p', 'mono', 'DISPATCH · PRESET THE FIRST JUNCTION'));
    s3.append(term);
    if (junction) {
      const routes = el('div', 'choices');
      junction.exits.forEach((ex, i) => {
        const b = el('button', `choice route${(nextPlan.choices[junction.id] ?? 0) === i ? ' selected' : ''}`);
        // What is known, then what is not: an undiscovered encounter stays unknown.
        b.append(el('b', null, `${ex.side < 0 ? '◀ LEFT' : 'RIGHT ▶'} · ${ex.label}`), el('span', null, full || state.memory?.route ? ex.note : 'Known: the channel continues.'), el('span', 'mono small unknown', 'Last inspected: record unavailable'));
        b.onclick = () => {
          nextPlan.choices[junction.id] = i;
          routes.querySelectorAll('.route').forEach((x) => x.classList.remove('selected'));
          b.classList.add('selected');
          onSave();
        };
        routes.append(b);
      });
      s3.append(routes);
    }
  } else s3.append(el('p', 'mono small', 'NO FURTHER ROUTES ON FILE.'));

  // Raft fit: one configuration at a time, chosen here, not juggled during a fight.
  const fits = el('div', 'choices');
  fits.append(el('p', 'mono', 'RAFT FIT'));
  for (const f of RAFT_FITS) {
    const b = el('button', `choice route${(state.fit || 'standard') === f.id ? ' selected' : ''}`);
    b.append(el('b', null, f.name), el('span', null, f.text));
    b.onclick = () => {
      state.fit = f.id;
      state.maxCharge = 24 + (f.id === 'capacity' ? 8 : 0);
      state.charge = state.maxCharge;
      fits.querySelectorAll('.route').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      onSave();
    };
    fits.append(b);
  }
  s2.append(fits);

  // Equipment positions: three, on a raft that has to fit through the same pipes as before.
  const gearBox = el('div', 'choices');
  state.gear ||= [];
  const gearLabel = el('p', 'mono');
  gearBox.append(gearLabel);
  const gearRefresh = () => {
    gearLabel.textContent = `RAFT FITTINGS · ${state.gear.length}/3 POSITIONS · 3 PARTS EACH · ${state.scrap} PARTS`;
    gearBox.querySelectorAll('button').forEach((b) => b.refresh());
  };
  for (const g of RAFT_GEAR) {
    const b = el('button', 'choice');
    const tag = el('i');
    b.append(el('b', null, g.name), el('span', null, g.text), tag);
    b.refresh = () => {
      const on = state.gear.includes(g.id);
      tag.textContent = on ? 'FITTED · click to remove' : '3 PARTS';
      b.disabled = !on && (state.gear.length >= 3 || state.scrap < 3);
    };
    b.onclick = () => {
      if (state.gear.includes(g.id)) state.gear = state.gear.filter((x) => x !== g.id);
      else { state.scrap -= 3; state.gear.push(g.id); }
      gearRefresh();
      onSave();
    };
    gearBox.append(b);
  }
  gearRefresh();
  s2.append(gearBox, modsBox);
  if (state.gear.includes('filtration')) { state.filters = Math.min(3, state.filters + 1); }

  // The ride photo. The park takes one at the top of every launch.
  const photo = (state.photos || []).filter((ph) => ph.sector === state.sectorKey).pop();
  if (photo) {
    const wrap = el('div');
    wrap.append(el('p', 'mono', `RIDE PHOTO · ${photo.label}`));
    const c = document.createElement('canvas');
    c.style.width = '100%';
    c.style.border = '6px solid #f2efe6';
    const img = new Image();
    img.onload = () => {
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      // Someone is sitting in the empty seat.
      g.globalAlpha = 0.5;
      g.fillStyle = '#d8dcd4';
      const x = c.width * 0.5, y = c.height * 0.8, u = c.height * 0.09;
      g.beginPath(); g.ellipse(x, y - u * 1.6, u * 0.45, u * 0.55, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(x - u * 0.55, y - u, u * 1.1, u * 1.6);
      g.globalAlpha = 1;
      g.fillStyle = '#f2efe6';
      g.font = `${Math.round(c.height * 0.05)}px "IBM Plex Mono", monospace`;
      g.fillText(`UNDERFLOW PARK · GUEST ${state.band}`, c.width * 0.03, c.height * 0.95);
    };
    img.src = photo.url;
    wrap.append(c, el('p', null, ['The empty seat appears occupied.', 'There are more of you in it than there were.', 'Your life vest has someone else\'s number on it.', 'It shows the raft coming from a route nobody took.'][state.guests % 4]));
    body.append(wrap);
  }

  body.append(logbookView(state));
  refresh();
  showModal('A moment above water.', body, [[nextSector ? 'COUNT OFF AND LAUNCH ↗' : 'OPEN THE LAST DOOR ↗', onLeave, true]], 'SAFE ROOM · AUTHENTICATED');
  const launch = document.querySelector('#modal-actions button');
  document.querySelector('#modal .panel').scrollTop = 0;
  launch.blur();
  if (!resolved) {
    launch.setAttribute('disabled', '');
    launch.title = 'Finish the roll call first';
  }
}

/**
 * The Pumphouse field ledger: the crew's own discovery catalogue, kept across every expedition. It is the one
 * record in the game that is never wrong. The facility's documents will disagree with it.
 */
export function ledgerView() {
  const wrap = el('div');
  const L = facility.ledger;
  wrap.append(el('p', 'mono', `PUMPHOUSE FIELD LEDGER · ${facility.expeditions} EXPEDITION${facility.expeditions === 1 ? '' : 'S'} · VERIFIED BY THE CREW`));
  const list = el('div', 'logbook');
  for (const [k, title] of [['places', 'PLACES'], ['machinery', 'MACHINERY IDENTIFIED'], ['behaviours', 'ENTITY BEHAVIOURS OBSERVED'], ['visitors', 'VISITORS BROUGHT TO SAFETY'], ['changes', 'CHANGES NOTICED BETWEEN EXPEDITIONS']]) {
    const a = el('article');
    a.append(el('h3', null, `${title} · ${L[k].length}`), el('p', null, L[k].length ? L[k].join(' · ') : '—'));
    list.append(a);
  }
  wrap.append(list);
  return wrap;
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

/**
 * The journal, in three parts kept apart so contradictions can be compared: what the crew witnessed, what the
 * facility's documents claim, and the route as surveyed (with what may have changed since).
 */
export function journalView(state) {
  const wrap = el('div', 'journal');
  const tabs = el('div', 'tabs');
  const pane = el('div', 'tab-pane');
  const facilityRecords = () => {
    const box = el('div');
    box.append(logbookView(state));
    if (facility.visitors.length) {
      box.append(el('p', 'mono', 'FACILITY RECORDS ABOUT PEOPLE YOU BROUGHT BACK'));
      for (const v of facility.visitors.slice(-4)) box.append(el('p', 'mono small', falseRecord(v, SECTORS[Number(String(v.sector).replace(/\D/g, '')) || 0]?.name || 'THE PUMPHOUSE')));
    }
    return box;
  };
  const routeMap = () => {
    const box = el('div', 'logbook');
    box.append(el('p', 'mono', 'ROUTE MAP · AS SURVEYED BY THE CREW'));
    SECTORS.forEach((sec, i) => {
      const a = el('article');
      const mem = facility.sectors[`s${i}`];
      let status;
      if (state.endless) status = 'Endless mode: no survey kept';
      else if (i < state.sectorIndex) status = 'SURVEYED';
      else if (i === state.sectorIndex) status = 'YOU ARE HERE';
      else if (i === state.sectorIndex + 1) status = 'NEXT · known only as far as the dock';
      else status = 'NOT SURVEYED';
      a.append(el('h3', null, `${String(i + 1).padStart(2, '0')} · ${sec.name}`), el('p', null, status));
      // The map can stay accurate while the place changes.
      if (mem?.water && i <= state.sectorIndex) a.append(el('p', 'mono small unknown', `Survey may be out of date: the water was left ${mem.water} on a previous expedition`));
      if (mem?.deaths && i <= state.sectorIndex) a.append(el('p', 'mono small unknown', 'Marked by an earlier crew: DON\'T STAY HERE'));
      box.append(a);
    });
    return box;
  };
  const TABS = [['CREW OBSERVATIONS', ledgerView], ['FACILITY RECORDS', facilityRecords], ['ROUTE MAP', routeMap]];
  TABS.forEach(([label, make], i) => {
    const t = el('button', 'tab', label);
    t.onclick = () => { tabs.querySelectorAll('.tab').forEach((x) => x.classList.remove('on')); t.classList.add('on'); pane.replaceChildren(make()); };
    tabs.append(t);
    if (i === 0) { t.classList.add('on'); pane.append(make()); }
  });
  wrap.append(tabs, pane);
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

/** Settings that change the page itself: text size and contrast. */
export function applyDisplaySettings() {
  document.documentElement.style.setProperty('--text-scale', String(settings.textScale || 1));
  document.documentElement.style.setProperty('--hud-scale', String(settings.hudScale || 1));
  document.body.classList.toggle('contrast', !!settings.highContrast);
  document.body.classList.toggle('hud-persistent', !!settings.hudPersistent);
  document.body.classList.toggle('subtitle-backing', !!settings.subtitleBacking);
  document.body.classList.toggle('flash-reduce', !!settings.flashReduce);
}

export function settingsView(onChange) {
  const wrap = el('div', 'settings');
  // Six categories, in the order a player looks for them. Each control saves at once.
  const group = (title) => { const g = el('section', 'settings-group'); g.append(el('h3', 'sheet-head', title)); wrap.append(g); return g; };
  const check = (g, key) => {
    const row = el('label');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = !!settings[key];
    box.onchange = () => { settings[key] = box.checked; saveSettings(); applyDisplaySettings(); preview?.refresh(); onChange?.(); };
    row.append(box, document.createTextNode(SETTING_LABELS[key] || key));
    g.append(row);
  };
  const range = (g, label, key, min, max, step = 0.1, after) => {
    const row = el('label');
    const sl = el('input');
    Object.assign(sl, { type: 'range', min, max, step, value: settings[key] ?? 1 });
    sl.oninput = () => { settings[key] = Number(sl.value); saveSettings(); applyDisplaySettings(); after?.(); preview?.refresh(); };
    row.append(document.createTextNode(label), sl);
    g.append(row);
  };
  let preview = null;

  const controls = group('CONTROLS');
  range(controls, 'Look sensitivity', 'sensitivity', 0.3, 2.5);
  range(controls, 'Steering sensitivity', 'steer', 0.4, 2);
  check(controls, 'paddleToggle');
  check(controls, 'braceToggle');

  const iface = group('INTERFACE');
  range(iface, 'Text size', 'textScale', 0.85, 1.6);
  range(iface, 'HUD size', 'hudScale', 0.8, 1.4);
  for (const k of ['subtitleBacking', 'highContrast', 'hudPersistent', 'captions', 'tips']) check(iface, k);
  // Live preview: a subtitle and a quick-use slot, drawn with the current settings.
  preview = el('div', 'settings-preview');
  const sub = el('p', 'prev-sub');
  sub.append(el('b', null, 'JUNE · RADIO'), el('span', null, '"The gate is open. Come back."'));
  const cap = el('p', 'prev-cap mono', '[Wet footsteps behind you]');
  const slot = el('div', 'slot');
  slot.append(el('i', null, 'H'), el('b', null, 'DRESSING'), el('span', null, '×2'));
  preview.append(sub, cap, slot);
  preview.refresh = () => { sub.classList.toggle('backed', !!settings.subtitleBacking); cap.hidden = !settings.captions; };
  preview.refresh();
  iface.append(preview);

  const audio = group('AUDIO');
  range(audio, 'Effects volume', 'volEffects', 0, 1, 0.05, () => sound.setVolumes());
  range(audio, 'Music volume', 'volMusic', 0, 1, 0.05, () => sound.setVolumes());
  range(audio, 'Ambience volume (water, machinery)', 'volAmbience', 0, 1, 0.05, () => sound.setVolumes());

  const cam = group('CAMERA AND EFFECTS');
  range(cam, 'Camera motion (shake, roll, impacts)', 'camera', 0, 1);
  for (const k of ['sway', 'distortion', 'grain', 'flashReduce']) check(cam, k);

  const assist = group('GAMEPLAY ASSISTANCE');
  range(assist, 'Incoming damage (assist)', 'damageAssist', 0.3, 1);
  check(assist, 'aimAssist');

  const display = group('DISPLAY');
  {
    const row = el('label');
    const sel = el('select');
    for (const [v, t] of [[0, 'Frame rate: display (60 FPS tier)'], [30, 'Frame rate: 30 FPS profile']]) { const o = el('option', null, t); o.value = v; sel.append(o); }
    sel.value = String(settings.fpsCap || 0);
    sel.onchange = () => { settings.fpsCap = Number(sel.value); saveSettings(); };
    row.append(sel);
    display.append(row);
  }
  check(display, 'perfOverlay');
  // Key bindings: click an action, press a key.
  const keys = el('div', 'bindings');
  keys.append(el('p', 'mono', 'KEYS · click, then press a key'));
  const name = (k) => (k === ' ' ? 'SPACE' : k.toUpperCase());
  for (const [id, label, def] of ACTIONS) {
    const b = el('button', 'bind');
    const show = () => (b.textContent = `${label} · ${name(settings.bindings[id] || def)}`);
    show();
    b.onclick = () => {
      b.textContent = `${label} · press a key…`;
      input.capture = (k) => {
        if (k === 'escape') { show(); return; }
        settings.bindings[id] = k;
        saveSettings();
        applyBindings();
        show();
      };
    };
    keys.append(b);
  }
  const reset = el('button', 'bind');
  reset.textContent = 'Reset all keys';
  reset.onclick = () => { settings.bindings = {}; saveSettings(); applyBindings(); keys.querySelectorAll('.bind').forEach((x) => x.onclick !== reset.onclick); wrap.replaceWith(settingsView(onChange)); };
  keys.append(reset);
  controls.append(keys);
  // Controller buttons: choose an action, press a button.
  const pads = el('div', 'bindings');
  pads.append(el('p', 'mono', 'CONTROLLER · choose, then press a button'));
  for (const [id, label, def] of PAD_ACTIONS) {
    const b = el('button', 'bind');
    const show = () => (b.textContent = `${label} · ${PAD_NAMES[settings.padBindings?.[id] ?? def] || '?'}`);
    show();
    b.onclick = () => {
      b.textContent = `${label} · press a controller button…`;
      input.padCapture = (i) => { (settings.padBindings ||= {})[id] = i; saveSettings(); show(); };
    };
    pads.append(b);
  }
  const padReset = el('button', 'bind');
  padReset.textContent = 'Reset controller buttons';
  padReset.onclick = () => { settings.padBindings = {}; saveSettings(); wrap.replaceWith(settingsView(onChange)); };
  pads.append(padReset);
  controls.append(pads);
  return wrap;
}
