// Synthesised sound: no audio files to load. Everything is built from oscillators and filtered noise.

let ctx = null;
let master = null;
let hum = null;
let enabled = true;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  return ctx;
}

function noiseBuffer(seconds) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function tone({ type = 'sine', from = 440, to = from, time = 0.15, gain = 0.2, delay = 0 }) {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + time);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + time);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + time + 0.02);
}

function noise({ time = 0.3, gain = 0.3, freq = 800, q = 0.8, type = 'bandpass', delay = 0 }) {
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
  src.connect(filter).connect(g).connect(master);
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
  setHum(drift) {
    if (!hum) return;
    hum.g.gain.value = 0.03 + drift * 0.07;
    hum.filter.frequency.value = 220 - drift * 120;
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
  whistle() {
    tone({ type: 'sine', from: 2900, to: 3100, time: 0.5, gain: 0.12 });
    tone({ type: 'sine', from: 3100, to: 2700, time: 0.7, gain: 0.12, delay: 0.55 });
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
