// Automatic resolution: keep frame time near the target by lowering the internal render scale, and bring it back
// when there is room. Pure: feed it frame times, read the scale. The scenes apply it to the renderer.
//
// It moves down quickly (two bad seconds) and up slowly (five good ones), in small steps, so the picture does
// not pump. It never goes below half of the device's base scale.

/**
 * @param {{ target?: number, min?: number, max?: number }} [o] target: frame time in ms to hold.
 */
export function createAutoRes({ target = 16.7, min = 0.5, max = 1 } = {}) {
  let scale = max, sum = 0, n = 0, bad = 0, good = 0, t = 0;
  return {
    get scale() { return scale; },
    set target(v) { target = v; },
    reset() { scale = max; bad = good = sum = n = t = 0; },
    /** One frame of ms milliseconds. Returns the new scale when it changed, otherwise null. */
    push(ms) {
      // A hitch (a tab switch, a shader compile) is not a trend.
      if (ms > 250) return null;
      sum += ms; n += 1; t += ms;
      if (t < 1000) return null;
      const avg = sum / n;
      sum = n = t = 0;
      if (avg > target * 1.15) { bad += 1; good = 0; } else if (avg < target * 0.8) { good += 1; bad = 0; } else { bad = 0; good = 0; }
      const before = scale;
      if (bad >= 2) { scale = Math.max(min, Math.round((scale - 0.1) * 100) / 100); bad = 0; }
      else if (good >= 5) { scale = Math.min(max, Math.round((scale + 0.05) * 100) / 100); good = 0; }
      return scale !== before ? scale : null;
    },
  };
}
