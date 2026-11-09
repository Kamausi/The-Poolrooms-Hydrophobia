// Sound: recorded where a recording exists (samples.js, the Oculus Audio Pack), synthesised everywhere else and
// as the fallback while recordings load. Beds (water, machinery, the vent, underwater, the drone) follow the space.
import { loadSamples, playSample, createBed, hasSample } from './samples.js';

let ctx = null;
let master = null;
let hum = null;
let pumpLoop = null;
let enabled = true;
let muffle = null;
let bus = null; // everything except the hum goes through here, so tubes can muffle it
let verb = null, verbGain = null, space = null;
let bedBus = null;
const beds = {};
const bedLevel = {}; // what each bed should be at; applied once its recording has loaded
const SPACES = { tile: [1.3, 0.28, 3.2], hall: [3.4, 0.38, 2.2], tube: [0.5, 0.2, 6], room: [0.9, 0.22, 3.6], dry: [0.25, 0.05, 6], reservoir: [4.5, 0.42, 1.8] };
function impulse(seconds, decay) {
  const len = Math.ceil(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  muffle = ctx.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = 20000;
  bus = ctx.createGain();
  bus.connect(muffle).connect(master);
  // Room acoustics: a convolver fed from the bus. Tiled corridors ring, reservoirs are long, tubes are dull,
  // the Safe Room is dry.
  verb = ctx.createConvolver();
  verbGain = ctx.createGain();
  verbGain.gain.value = 0;
  bus.connect(verb).connect(verbGain).connect(master);
  // Beds skip the reverb (they are already recorded in a room) but go dull with everything else.
  bedBus = ctx.createGain();
  bedBus.connect(muffle);
  loadSamples(ctx);
  setInterval(applyBeds, 500);
  return ctx;
}

function applyBeds() {
  if (!ctx) return;
  for (const [name, level] of Object.entries(bedLevel)) {
    if (!hasSample(name)) continue;
    // Underwater sits outside the muffle: it is the sound of being under.
    beds[name] ||= createBed(ctx, name === 'underwater' ? master : bedBus, name);
    if (Math.abs(beds[name].level - level) > 0.001 || level > 0) beds[name].set(enabled ? level : 0);
  }
}
function bed(name, level) {
  bedLevel[name] = level;
  applyBeds();
}
/** A recorded one-shot, panned; false if it hasn't loaded, so the caller synthesises instead. */
function rec(name, { pan = 0, ...o } = {}) {
  if (!enabled || !ensure()) return false;
  return playSample(ctx, out(pan), name, o);
}
// Bed levels per acoustic space: open water rings louder in big rooms; the Safe Room is machinery and a vent.
const SPACE_BEDS = {
  tile: { 'water-lap': 0.14, bubbles: 0.04, 'machine-room': 0, vent: 0.04 },
  hall: { 'water-lap': 0.2, bubbles: 0.03, 'machine-room': 0, vent: 0.03 },
  reservoir: { 'water-lap': 0.24, bubbles: 0.02, 'machine-room': 0, vent: 0 },
  tube: { 'water-lap': 0.08, bubbles: 0.12, 'machine-room': 0, vent: 0 },
  room: { 'water-lap': 0.08, bubbles: 0.03, 'machine-room': 0.06, vent: 0.06 },
  dry: { 'water-lap': 0, bubbles: 0, 'machine-room': 0.32, vent: 0.14 },
};

function noiseBuffer(seconds) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function out(pan) {
  if (!pan) return bus;
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(bus);
  return p;
}

function tone({ type = 'sine', from = 440, to = from, time = 0.15, gain = 0.2, delay = 0, pan = 0 }) {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + time);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + time);
  osc.connect(g).connect(out(pan));
  osc.start(t);
  osc.stop(t + time + 0.02);
}

function noise({ time = 0.3, gain = 0.3, freq = 800, q = 0.8, type = 'bandpass', delay = 0, pan = 0 }) {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(time);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + time);
  src.connect(filter).connect(g).connect(out(pan));
  src.start(t);
}

// ---------- The machinery as music ----------
// A pump pulse on a fixed grid (100 bpm). Player actions queue tonal accents that land on the next eighth
// note; the shot itself always sounds immediately. Intensity follows the pacing director; Drift softens it all.
const music = { next: 0, step: 0, queue: [], phase: 'relax', intensity: 0, drift: 0, bus: null, filter: null, pad: null };
const STEP = 60 / 100 / 2;
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];
function musicBus() {
  if (music.bus || !ensure()) return music.bus;
  music.filter = ctx.createBiquadFilter();
  music.filter.type = 'lowpass';
  music.filter.frequency.value = 6000;
  music.bus = ctx.createGain();
  music.bus.gain.value = 0.9;
  music.bus.connect(music.filter).connect(muffle);
  const pad = ctx.createGain();
  pad.gain.value = 0;
  [220, 330, 440].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(pad); o.start(); });
  pad.connect(music.filter);
  music.pad = pad;
  return music.bus;
}
function note(t, freq, { type = 'sine', time = 0.2, gain = 0.06 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + time);
  o.connect(g).connect(music.bus);
  o.start(t);
  o.stop(t + time + 0.02);
}
function noiseAt(t, { time = 0.08, gain = 0.04, freq = 6000 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(time);
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + time);
  src.connect(f).connect(g).connect(music.bus);
  src.start(t);
}

export const sound = {
  unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  },
  setEnabled(on) {
    enabled = on;
    if (master) master.gain.value = on ? 0.55 : 0;
    applyBeds();
  },
  get enabled() {
    return enabled;
  },
  /** The 60 Hz fluorescent hum under everything. Louder with Drift. */
  startHum() {
    if (!ensure() || hum) return;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;
    osc2.type = 'sine';
    osc2.frequency.value = 120;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    g.gain.value = 0.035;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(g).connect(master);
    osc.start();
    osc2.start();
    hum = { osc, osc2, g, filter };
  },
  setHum(drift, silent = false) {
    if (!hum) return;
    hum.g.gain.value = silent ? 0.002 : 0.03 + drift * 0.07;
    hum.filter.frequency.value = 220 - drift * 120;
  },
  /** Pressure tubes and underwater moments: everything goes dull. */
  setMuffle(on) {
    if (muffle) muffle.frequency.value = on ? 650 : 20000;
    bed('underwater', on ? 0.4 : 0);
  },
  fire: () => tone({ type: 'square', from: 1800, to: 420, time: 0.07, gain: 0.05 }),
  empty: () => tone({ type: 'square', from: 140, to: 90, time: 0.08, gain: 0.08 }),
  recharge: () => tone({ type: 'sine', from: 200, to: 1200, time: 0.6, gain: 0.08 }),
  hit: () => tone({ type: 'triangle', from: 900, to: 1400, time: 0.06, gain: 0.08 }),
  burst() {
    noise({ time: 0.45, gain: 0.35, freq: 500, q: 0.6 });
    tone({ type: 'sine', from: 180, to: 40, time: 0.35, gain: 0.25 });
  },
  splash: () => noise({ time: 0.6, gain: 0.3, freq: 1200, q: 0.4 }),
  heal() {
    tone({ type: 'sine', from: 520, to: 520, time: 0.25, gain: 0.08 });
    tone({ type: 'sine', from: 780, to: 780, time: 0.35, gain: 0.07, delay: 0.08 });
  },
  hurt() {
    tone({ type: 'sawtooth', from: 160, to: 50, time: 0.3, gain: 0.25 });
    noise({ time: 0.25, gain: 0.25, freq: 300, type: 'lowpass' });
  },
  whistle(pan = 0) {
    tone({ type: 'sine', from: 2900, to: 3100, time: 0.5, gain: 0.12, pan });
    tone({ type: 'sine', from: 3100, to: 2700, time: 0.7, gain: 0.12, delay: 0.55, pan });
  },
  /** Advance the machinery grid. phase: the director's phase; drift 0..100. */
  music(phase, drift) {
    // The drone creeps in as Drift rises: the facility leaning on you.
    const dr = Math.max(0, Math.min(1, (drift - 45) / 55)) * 0.3;
    if (Math.abs((bedLevel.drone || 0) - dr) > 0.01) bed('drone', dr);
    if (!enabled || !ensure() || !musicBus()) return;
    music.phase = phase;
    const d = drift / 100;
    music.filter.frequency.value = 6000 - d * 5200;
    music.pad.gain.value = Math.max(0, d - 0.45) * 0.05;
    if (music.next < ctx.currentTime) music.next = ctx.currentTime + 0.05;
    const loud = { relax: 0.25, warning: 0.5, buildup: 0.8, peak: 1, fade: 0.6 }[phase] ?? 0.3;
    while (music.next < ctx.currentTime + 0.12) {
      const t = music.next;
      const beat = music.step % 2 === 0;
      if (beat && (phase !== 'relax' || music.step % 8 === 0)) note(t, 48, { type: 'sine', time: 0.25, gain: 0.14 * loud });
      if (!beat && (phase === 'peak' || phase === 'buildup')) noiseAt(t, { gain: 0.025 * loud });
      if (phase === 'peak' && music.step % 4 === 2) note(t, 96, { type: 'square', time: 0.08, gain: 0.02 });
      for (const a of music.queue.splice(0, 3)) {
        const i = a.i % SCALE.length;
        const base = { hit: 440, gate: 660, snap: 110, valve: 880, land: 70, parry: 990, shot: 0, low: 82 }[a.kind] ?? 440;
        if (base) note(t, base * 2 ** ((a.kind === 'hit' ? SCALE[i] : 0) / 12), { type: a.kind === 'snap' || a.kind === 'land' ? 'triangle' : 'sine', time: a.kind === 'valve' ? 0.4 : 0.18, gain: 0.05 });
        if (a.kind === 'valve') noiseAt(t, { time: 0.4, gain: 0.05, freq: 2500 });
      }
      music.next += STEP;
      music.step += 1;
    }
  },
  /** Queue a musical accent for an action (it lands on the next eighth note). */
  accent(kind) {
    if (kind === 'shot') return;
    music.queue.push({ kind, i: music.queue.length + music.step });
    if (music.queue.length > 6) music.queue.shift();
  },
  /** Immediate tick, rising with n (lock acquisition, warnings). */
  tick(n = 1) {
    tone({ type: 'square', from: 500 + n * 90, to: 520 + n * 90, time: 0.05, gain: 0.04 });
  },
  /** The pump room: a loud, steady, low machine drone. Safety sounds like this. */
  pumpRoom(on) {
    if (!ensure()) return;
    if (on && !pumpLoop) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(2);
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 140;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 47;
      const g = ctx.createGain();
      g.gain.value = 0.16;
      src.connect(f).connect(g);
      osc.connect(f);
      g.connect(master);
      src.start();
      osc.start();
      pumpLoop = { src, osc, g };
      // The recorded machine hum carries it once loaded; the synthesised drone stays underneath, quieter.
      if (hasSample('pump-hum')) g.gain.value = 0.06;
      bed('pump-hum', 0.26);
    } else if (!on && pumpLoop) {
      pumpLoop.src.stop();
      pumpLoop.osc.stop();
      pumpLoop = null;
      bed('pump-hum', 0);
    }
  },
  burstBig() {
    rec('sting', { gain: 0.35 });
    noise({ time: 0.8, gain: 0.5, freq: 300, q: 0.4 });
    tone({ type: 'sawtooth', from: 900, to: 60, time: 0.6, gain: 0.18 });
  },
  thump(pan = 0) {
    rec('metal-hit', { gain: 0.22, rate: 0.7, pan });
    tone({ type: 'sine', from: 70, to: 35, time: 0.35, gain: 0.45, pan });
    noise({ time: 0.2, gain: 0.25, freq: 160, type: 'lowpass', pan });
  },
  pump(pan = 0) {
    if (rec('hydraulic', { gain: 0.5, rate: 0.8, pan })) return;
    for (let i = 0; i < 4; i++) noise({ time: 0.5, gain: 0.18, freq: 90, type: 'lowpass', delay: i * 0.45, pan });
  },
  footstep(pan = 0, wet = false) {
    if (rec('step-tile', { gain: wet ? 0.22 : 0.3, rate: wet ? 0.85 : 1, vary: 0.08, pan })) {
      if (wet) noise({ time: 0.18, gain: 0.08, freq: 900, q: 0.8, pan }); // the slap of water over the shoe
      return;
    }
    noise({ time: 0.12, gain: wet ? 0.2 : 0.12, freq: wet ? 900 : 1600, q: 1.2, pan });
  },
  vent() {
    noise({ time: 2.5, gain: 0.08, freq: 400, type: 'lowpass' });
  },
  laugh(pan = 0) {
    [0, 0.14, 0.3].forEach((d, i) => tone({ type: 'triangle', from: 600 + i * 40, to: 520, time: 0.1, gain: 0.04, delay: d, pan }));
  },
  gate() {
    if (rec('hydraulic', { gain: 0.45 })) { rec('hatch-open', { gain: 0.35, delay: 0.35 }); return; }
    noise({ time: 0.9, gain: 0.25, freq: 220, type: 'lowpass' });
    tone({ type: 'square', from: 110, to: 140, time: 0.6, gain: 0.04 });
  },
  wrong() {
    if (rec('ui-back', { gain: 0.35, rate: 0.85 })) return;
    tone({ type: 'square', from: 220, to: 160, time: 0.25, gain: 0.08 });
  },
  jet(pan = 0) {
    noise({ time: 0.7, gain: 0.25, freq: 2500, q: 0.5, pan });
  },
  chime() {
    tone({ type: 'sine', from: 660, to: 660, time: 0.5, gain: 0.07 });
    tone({ type: 'sine', from: 550, to: 550, time: 0.7, gain: 0.07, delay: 0.35 });
  },
  pickup: () => tone({ type: 'triangle', from: 600, to: 1500, time: 0.15, gain: 0.1 }),
  door() {
    if (rec('hatch-close', { gain: 0.55, rate: 0.9 })) return;
    noise({ time: 1.2, gain: 0.3, freq: 120, type: 'lowpass' });
    tone({ type: 'square', from: 70, to: 55, time: 1.2, gain: 0.05 });
  },
  gurgle() {
    for (let i = 0; i < 5; i++) tone({ type: 'sine', from: 90 + Math.random() * 80, to: 40, time: 0.18, gain: 0.12, delay: i * 0.11 });
  },
  /** Air leaving a chamber: thin, high, panned to where the hole is. gain scales with the leak. */
  hiss(pan = 0, gain = 0.05) {
    noise({ time: 0.6, gain, freq: 5200 + Math.random() * 1500, q: 2.5, type: 'bandpass', pan });
  },
  /** A paddle stroke: the blade going in, then the pull. */
  stroke(pan = 0) {
    if (rec('oar', { gain: 0.5, rate: 1.05, pan })) return;
    noise({ time: 0.25, gain: 0.12, freq: 700, q: 0.7, pan });
    noise({ time: 0.5, gain: 0.06, freq: 300, type: 'lowpass', delay: 0.15, pan });
  },
  /** Something knocking on the hull from underneath. */
  knock(count = 2, pan = 0) {
    for (let i = 0; i < count; i++) {
      tone({ type: 'sine', from: 95, to: 60, time: 0.12, gain: 0.25, delay: i * 0.42, pan });
      noise({ time: 0.08, gain: 0.12, freq: 220, type: 'lowpass', delay: i * 0.42, pan });
    }
  },
  /** Pressing a patch down and pumping the chamber back up. */
  patch() {
    noise({ time: 0.3, gain: 0.1, freq: 1800, q: 1.2 });
    tone({ type: 'triangle', from: 180, to: 260, time: 0.25, gain: 0.06, delay: 0.1 });
  },
  scatter() {
    noise({ time: 0.22, gain: 0.32, freq: 900, q: 0.5 });
    tone({ type: 'square', from: 300, to: 60, time: 0.18, gain: 0.08 });
    noise({ time: 0.12, gain: 0.08, freq: 3000, delay: 0.32 }); // the cycle
  },
  disrupt() {
    tone({ type: 'sawtooth', from: 90, to: 900, time: 0.25, gain: 0.08 });
    tone({ type: 'sine', from: 1400, to: 120, time: 0.4, gain: 0.06, delay: 0.05 });
  },
  hookThrow() {
    noise({ time: 0.4, gain: 0.08, freq: 1500, q: 1.5 });
    tone({ type: 'triangle', from: 600, to: 300, time: 0.2, gain: 0.04 });
  },
  shove() {
    noise({ time: 0.15, gain: 0.2, freq: 260, type: 'lowpass' });
  },
  ping() {
    tone({ type: 'sine', from: 1320, to: 1320, time: 0.12, gain: 0.05 });
    tone({ type: 'sine', from: 1760, to: 1760, time: 0.12, gain: 0.04, delay: 0.1 });
  },
  radio() {
    noise({ time: 0.12, gain: 0.05, freq: 2500, q: 3 });
  },
  // The entities' audio language: presence, commitment, release. Learn these.
  intake(pan = 0) { // Undertow: hollow suction under the water
    tone({ type: 'sine', from: 70, to: 40, time: 1.1, gain: 0.12, pan });
    noise({ time: 1, gain: 0.05, freq: 180, type: 'lowpass', pan });
  },
  release(pan = 0) { // a grip lets go: a rush of water and a gasp
    noise({ time: 0.6, gain: 0.2, freq: 600, q: 0.4, pan });
    tone({ type: 'sine', from: 500, to: 900, time: 0.25, gain: 0.04, delay: 0.3, pan });
  },
  floatKnock(pan = 0) { // Lane Rope: float segments knocking together
    for (let i = 0; i < 4; i++) tone({ type: 'triangle', from: 320 + i * 20, to: 260, time: 0.06, gain: 0.07, delay: i * 0.13, pan });
  },
  clicks(pan = 0) { // Grout: fine ceramic clicks moving across a surface
    for (let i = 0; i < 7; i++) noise({ time: 0.02, gain: 0.08, freq: 6500, q: 4, delay: i * 0.06 + Math.random() * 0.03, pan: pan + (i - 3) * 0.05 });
  },
  grind(pan = 0) { // Grout: a passage changing
    if (rec('scrape', { gain: 0.3, rate: 0.55, pan })) return;
    noise({ time: 1.4, gain: 0.14, freq: 140, type: 'lowpass', pan });
    tone({ type: 'sawtooth', from: 55, to: 45, time: 1.4, gain: 0.03, pan });
  },
  chair(pan = 0) { // the Lifeguard shifting in its chair before the whistle
    tone({ type: 'sawtooth', from: 180, to: 140, time: 0.35, gain: 0.04, pan });
  },
  breath(pan = 0) { // Blooms: wet inhalations
    if (rec('creature', { gain: 0.2, rate: 0.72, vary: 0.1, pan })) return;
    noise({ time: 0.5, gain: 0.07, freq: 500, q: 1.2, pan });
  },
  /** Menu: a short mechanical click as the selection moves, a heavier one to confirm. */
  uiMove() { if (!rec('switch', { gain: 0.16, rate: 1.3 })) tone({ type: 'square', from: 1200, to: 1200, time: 0.015, gain: 0.02 }); },
  uiConfirm() { if (!rec('ui-confirm', { gain: 0.3 })) tone({ type: 'square', from: 700, to: 500, time: 0.05, gain: 0.04 }); },
  /** Mechanical cues with recordings: a valve wheel, a lever, a small switch. Fall back to a tick. */
  valve(pan = 0) { if (!rec('valve', { gain: 0.5, pan })) tone({ type: 'square', from: 300, to: 260, time: 0.12, gain: 0.05, pan }); },
  lever(pan = 0) { if (!rec('lever', { gain: 0.5, pan })) tone({ type: 'square', from: 180, to: 120, time: 0.15, gain: 0.06, pan }); },
  switchOn() { if (!rec('switch', { gain: 0.4 })) tone({ type: 'square', from: 900, to: 900, time: 0.03, gain: 0.05 }); },
  /** Distant, reverberant: something large moving somewhere in the building. */
  farCreature(pan = 0) { rec('creature-far', { gain: 0.18, rate: 0.8, pan }); },
  whispers(pan = 0) { rec('whispers', { gain: 0.16, pan }); },
  chains(pan = 0) { rec('chains', { gain: 0.3, pan }); },
  gear() { rec('gear', { gain: 0.25 }); },
  /** Set the room's acoustics: 'tile', 'hall', 'reservoir', 'tube', 'room' or 'dry'. */
  setSpace(kind) {
    if (!ensure() || kind === space || !SPACES[kind]) return;
    space = kind;
    for (const [name, level] of Object.entries(SPACE_BEDS[kind] || {})) bed(name, level);
    const [seconds, wet, decay] = SPACES[kind];
    verb.buffer = impulse(seconds, decay);
    verbGain.gain.setTargetAtTime(wet, ctx.currentTime, 0.2);
  },
  /** Briefly pull the music and the hum down so a warning reads over the water. */
  duck(seconds = 1.2) {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const g of [music.bus?.gain, hum?.g.gain]) {
      if (!g) continue;
      const v = g.value;
      g.cancelScheduledValues(t);
      g.setValueAtTime(v * 0.35, t);
      g.linearRampToValueAtTime(v, t + seconds);
    }
  },
  scrape(pan = 0) {
    if (rec('scrape', { gain: 0.32, pan })) return;
    noise({ time: 0.7, gain: 0.18, freq: 2400, q: 0.6, pan });
    tone({ type: 'sawtooth', from: 140, to: 90, time: 0.6, gain: 0.03, pan });
  },
};
