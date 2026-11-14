// Benchmark numbers from a list of frame times. Pure: main.js collects the frames during a fixed ride.

/** @param {number[]} frames frame times in ms @returns {{ frames: number, average: number, median: number, p99: number, fps: number, worst: number } | null} */
export function summarize(frames) {
  if (!frames.length) return null;
  const sorted = [...frames].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  const average = frames.reduce((a, b) => a + b, 0) / frames.length;
  const r = (v) => Math.round(v * 100) / 100;
  return { frames: frames.length, average: r(average), median: r(at(0.5)), p99: r(at(0.99)), fps: r(1000 / average), worst: r(sorted[sorted.length - 1]) };
}

/** The report as text, for the screen and for pasting. */
export function report(info, stats) {
  const lines = ['UNDERFLOW BENCHMARK', `GPU          ${info.gpu}`, `quality      ${info.tier}${info.auto ? ' (auto)' : ''}`, `resolution   ${info.width} x ${info.height} · device ratio ${info.dpr} · render scale ${Math.round(info.scale * 100)}%`];
  if (stats) lines.push(`frames       ${stats.frames}`, `average      ${stats.average} ms (${stats.fps} FPS)`, `median       ${stats.median} ms`, `99th pct     ${stats.p99} ms`, `worst        ${stats.worst} ms`);
  lines.push(`errors       ${info.errors.length ? info.errors.join(' | ') : 'none'}`);
  return lines.join('\n');
}
