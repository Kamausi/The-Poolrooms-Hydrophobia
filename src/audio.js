// Synthesised sound: no audio files to load. Everything is built from oscillators and filtered noise.

let ctx = null;
let master = null;
let hum = null;
let pumpLoop = null;
let enabled = true;
let muffle = null;
let bus = null; // everything except the hum goes through here, so tubes can muffle it

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
  return ctx;
}

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
    } else if (!on && pumpLoop) {
      pumpLoop.src.stop();
      pumpLoop.osc.stop();
      pumpLoop = null;
    }
  },
  burstBig() {
    noise({ time: 0.8, gain: 0.5, freq: 300, q: 0.4 });
    tone({ type: 'sawtooth', from: 900, to: 60, time: 0.6, gain: 0.18 });
  },
  thump(pan = 0) {
    tone({ type: 'sine', from: 70, to: 35, time: 0.35, gain: 0.45, pan });
    noise({ time: 0.2, gain: 0.25, freq: 160, type: 'lowpass', pan });
  },
  pump(pan = 0) {
    for (let i = 0; i < 4; i++) noise({ time: 0.5, gain: 0.18, freq: 90, type: 'lowpass', delay: i * 0.45, pan });
  },
  footstep(pan = 0, wet = false) {
    noise({ time: 0.12, gain: wet ? 0.2 : 0.12, freq: wet ? 900 : 1600, q: 1.2, pan });
  },
  vent() {
    noise({ time: 2.5, gain: 0.08, freq: 400, type: 'lowpass' });
  },
  laugh(pan = 0) {
    [0, 0.14, 0.3].forEach((d, i) => tone({ type: 'triangle', from: 600 + i * 40, to: 520, time: 0.1, gain: 0.04, delay: d, pan }));
  },
  gate() {
    noise({ time: 0.9, gain: 0.25, freq: 220, type: 'lowpass' });
    tone({ type: 'square', from: 110, to: 140, time: 0.6, gain: 0.04 });
  },
  wrong() {
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
    noise({ time: 1.2, gain: 0.3, freq: 120, type: 'lowpass' });
    tone({ type: 'square', from: 70, to: 55, time: 1.2, gain: 0.05 });
  },
  gurgle() {
    for (let i = 0; i < 5; i++) tone({ type: 'sine', from: 90 + Math.random() * 80, to: 40, time: 0.18, gain: 0.12, delay: i * 0.11 });
  },
};
