// Recorded sounds from the Oculus Audio Pack (CC BY 4.0, credited in docs/CREDITS.md and the menu), transcoded
// to mono MP3 in public/audio. They load in the background; until a sound has loaded, or if it never does,
// audio.js falls back to its synthesised version, so the game never waits on a file.
//
// The single-file build inlines the files as data URIs in window.__UNDERFLOW_AUDIO (see scripts/single-html.mjs).

const buffers = {}; // name → [AudioBuffer, …] (variants)
let started = false;

function sources() {
  const inline = typeof window !== 'undefined' && window.__UNDERFLOW_AUDIO;
  if (inline) return Promise.resolve({ manifest: inline.manifest, url: (n) => inline.files[n] });
  const base = `${import.meta.env.BASE_URL}audio/`;
  return fetch(`${base}manifest.json`).then((r) => r.json()).then((manifest) => ({ manifest, url: (n) => `${base}${n}.mp3` }));
}

/** Start loading every sound. Safe to call more than once; each sound becomes available as it decodes. */
export function loadSamples(ctx) {
  if (started || !ctx) return;
  started = true;
  sources().then(({ manifest, url }) => {
    for (const [name, files] of Object.entries(manifest)) {
      for (const f of files) {
        fetch(url(f))
          .then((r) => r.arrayBuffer())
          .then((data) => new Promise((ok, fail) => ctx.decodeAudioData(data, ok, fail)))
          .then((buf) => { (buffers[name] ||= []).push(buf); })
          .catch(() => {});
      }
    }
  }).catch(() => {});
}

export const hasSample = (name) => !!buffers[name]?.length;
export const loadedSamples = () => Object.keys(buffers);
// For checks against the single-file build, where modules can't be imported from outside.
if (typeof window !== 'undefined') window.__underflowAudio = { loaded: loadedSamples };

/**
 * Play a one-shot through `dest`. Picks a variant at random and varies pitch slightly, so repeats don't
 * sound mechanical. Returns false when the sound isn't loaded, so the caller can synthesise instead.
 */
export function playSample(ctx, dest, name, { gain = 0.5, rate = 1, vary = 0.06, delay = 0 } = {}) {
  const list = buffers[name];
  if (!ctx || !list?.length) return false;
  const src = ctx.createBufferSource();
  src.buffer = list[Math.floor(Math.random() * list.length)];
  src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * vary);
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(dest);
  src.start(ctx.currentTime + delay);
  return src;
}

/**
 * A looping bed whose level can be set at any time. The loop is created the first time its sound is
 * available and a level above zero is asked for; levels glide, so beds never click in or out.
 */
export function createBed(ctx, dest, name) {
  let src = null, g = null, target = 0;
  return {
    set(level, glide = 0.6) {
      target = level;
      if (!src && level > 0 && hasSample(name)) {
        src = ctx.createBufferSource();
        src.buffer = buffers[name][0];
        src.loop = true;
        g = ctx.createGain();
        g.gain.value = 0;
        src.connect(g).connect(dest);
        src.start(ctx.currentTime, Math.random() * src.buffer.duration);
      }
      if (g) g.gain.setTargetAtTime(target, ctx.currentTime, glide);
    },
    get level() { return target; },
  };
}
