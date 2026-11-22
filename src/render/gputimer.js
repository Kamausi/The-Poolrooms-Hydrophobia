// GPU time per frame for the `?bench` report, with the WebGL 2 timer query (EXT_disjoint_timer_query_webgl2). The
// renderer calls begin() and end() around its frame and collect() after; results arrive a few frames late, so a small
// ring of queries is kept and collect() returns the newest finished one (ms), or null. Browsers that do not expose the
// extension (many hide it, as it can be used to time things it should not) get no timer at all: `createGpuTimer`
// returns null and the report says GPU time is not available.

/** @param {WebGL2RenderingContext} gl */
export function createGpuTimer(gl) {
  const ext = gl?.getExtension?.('EXT_disjoint_timer_query_webgl2');
  if (!ext) return null;
  const ring = [], free = [];
  let active = null, last = null;
  return {
    begin() {
      if (active) return;
      active = free.pop() || gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT, active);
    },
    end() {
      if (!active) return;
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      ring.push(active);
      active = null;
    },
    collect() {
      // A disjoint event (the GPU was interrupted) makes every pending result meaningless.
      if (gl.getParameter(ext.GPU_DISJOINT_EXT)) { while (ring.length) free.push(ring.shift()); return last; }
      while (ring.length && gl.getQueryParameter(ring[0], gl.QUERY_RESULT_AVAILABLE)) {
        const q = ring.shift();
        last = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
        free.push(q);
      }
      if (ring.length > 8) free.push(ring.shift()); // never let a stalled queue grow
      return last;
    },
  };
}
