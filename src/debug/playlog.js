// Playtest log and frame-time measurement. Nothing leaves the browser: the log is copied by the player from the
// pause menu and handed to whoever is running the playtest. It records what an observer would want to know:
// where people died and of what, what hurt them, which rescues they made or missed, which routes they took,
// how long sections took, and how the frames were delivered.

const KEY = 'underflow-playlog';
let log = [];
try { log = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { log = []; }
const started = Date.now();

export const playlog = {
  record(type, data = {}) {
    const t = Math.round((Date.now() - started) / 1000);
    // Continuous damage (fumes, a held grip) is merged into one entry per source.
    const last = log[log.length - 1];
    if (type === 'damage' && last?.type === 'damage' && last.reason === data.reason && t - last.t <= 2) { last.n += data.n; last.t = t; return; }
    log.push({ t: Math.round((Date.now() - started) / 1000), type, ...data });
    if (log.length > 600) log.splice(0, log.length - 600);
    if (type !== 'damage' || log.length % 10 === 0) try { localStorage.setItem(KEY, JSON.stringify(log)); } catch {}
  },
  clear() {
    log = [];
    try { localStorage.removeItem(KEY); } catch {}
  },
  /** A readable summary first, then the raw events. */
  export() {
    const count = (type) => log.filter((e) => e.type === type);
    const hurt = {};
    for (const e of count('damage')) hurt[e.reason] = (hurt[e.reason] || 0) + e.n;
    const lines = [
      'UNDERFLOW PLAYTEST LOG',
      `Deaths: ${count('death').length} · ${count('death').map((e) => `${e.sector}: ${e.cause}`).join(' | ') || 'none'}`,
      `What hurt (total damage): ${Object.entries(hurt).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v)}`).join(' · ') || 'nothing'}`,
      `Rescues made: ${count('rescue').length} · missed: ${count('missed').length}`,
      `Routes: ${count('route').map((e) => e.label).join(' · ') || 'main line only'}`,
      `Sections: ${count('section').map((e) => `${e.label} ${e.seconds}s`).join(' · ')}`,
      `Frames: ${count('frames').slice(-1).map((e) => `avg ${e.avg} ms · p95 ${e.p95} ms · p99 ${e.p99} ms · slow ${e.slow}`)[0] || 'not measured'}`,
      '',
      JSON.stringify(log),
    ];
    return lines.join('\n');
  },
};

/** Frame-time statistics over a rolling window: averages hide hitches, so report the slow tail too. */
export function createFrameStats(size = 600) {
  const buf = new Float32Array(size);
  let n = 0, i = 0;
  return {
    push(ms) { buf[i] = ms; i = (i + 1) % size; n = Math.min(size, n + 1); },
    stats(budget) {
      if (!n) return null;
      const a = Array.from(buf.subarray(0, n)).sort((x, y) => x - y);
      const avg = a.reduce((s, x) => s + x, 0) / n;
      const pct = (p) => a[Math.min(n - 1, Math.floor(n * p))];
      return { avg: avg.toFixed(1), p95: pct(0.95).toFixed(1), p99: pct(0.99).toFixed(1), slow: a.filter((x) => x > budget * 1.5).length, n };
    },
  };
}
