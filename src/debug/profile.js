// Where a frame's time goes, by subsystem: scenes mark sections (simulation, render, audio, input), and the profiler
// keeps a rolling window per section so the ?bench report and the performance overlay can say which part of the game
// a slow frame was spent in. Pure: the caller passes the clock. Unit-tested.

export function createProfiler({ window = 240 } = {}) {
  const runs = new Map(); // name → { open, samples: number[], frame }
  const get = (n) => { let r = runs.get(n); if (!r) { r = { open: null, samples: [], frame: 0 }; runs.set(n, r); } return r; };
  return {
    begin(name, now) { get(name).open = now; },
    end(name, now) { const r = get(name); if (r.open != null) { r.frame += now - r.open; r.open = null; } },
    /** Close the frame: each section's time this frame joins its window. */
    frame() { for (const r of runs.values()) { r.samples.push(r.frame); if (r.samples.length > window) r.samples.shift(); r.frame = 0; } },
    /** Per section: average and 99th percentile ms over the window, largest average first. */
    report() {
      const out = [];
      for (const [name, r] of runs) {
        if (!r.samples.length) continue;
        const s = [...r.samples].sort((a, b) => a - b), avg = r.samples.reduce((a, b) => a + b, 0) / r.samples.length;
        out.push({ name, avg: Math.round(avg * 100) / 100, p99: Math.round(s[Math.min(s.length - 1, Math.floor(s.length * 0.99))] * 100) / 100 });
      }
      return out.sort((a, b) => b.avg - a.avg);
    },
  };
}

/** One shared profiler for the game. */
export const profiler = createProfiler();
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/** Time `fn` under `name` in the shared profiler and return what it returns. */
export function timed(name, fn) { profiler.begin(name, clock()); try { return fn(); } finally { profiler.end(name, clock()); } }
