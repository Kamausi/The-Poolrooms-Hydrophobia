// What an entity does with what it knows. perception.js says how aware it is and where it last sensed you; this
// turns that into a behaviour with a goal and a pace:
//
//   unaware      nothing to go on: stay put (or at home)
//   suspicious   something caught its attention: turn toward it, hold a moment
//   investigate  walk to where it last sensed you, slowly
//   observe      arrived and found nothing: stand and look
//   warn         it knows, and says so first (the Lifeguard's whistle); entities without a warning skip it
//   pursue       it knows where you are: go there at full pace
//   search       it lost you: circle the place it last had you
//   return       gave up: go back where it came from
//
// It never reads your real position after losing you: only the last place it sensed you. Pure and unit-tested; the
// scenes move the entity toward `goal` at `pace` (0..1 of its top speed).

export const MODES = ['unaware', 'suspicious', 'investigate', 'observe', 'warn', 'pursue', 'search', 'return'];

/** Per-entity timing, in seconds and metres. */
export const PROFILES = {
  // Blooms: no warning, lose you quickly, search briefly around the spot, then drift back to their grate.
  bloom: { warn: 0, notice: 0.6, lose: 1.2, observe: 1.5, search: 6, searchRadius: 2.5, arrive: 0.8 },
  // The Lifeguard: always warns first, looks longer, searches wider.
  lifeguard: { warn: 1.5, notice: 1, lose: 2, observe: 3, search: 10, searchRadius: 4, arrive: 1 },
};

const PACE = { unaware: 0, suspicious: 0, investigate: 0.5, observe: 0, warn: 0, pursue: 1, search: 0.6, return: 0.45 };

/**
 * @param {{ home?: number[] | null, profile?: keyof typeof PROFILES | object }} [o]
 */
export function createPursuit({ home = null, profile = 'bloom' } = {}) {
  const p = typeof profile === 'string' ? PROFILES[profile] : profile;
  return { mode: 'unaware', t: 0, goal: null, pace: 0, home: home ? [...home] : null, searchAt: null, angle: 0, warned: false, profile: p };
}

const flat = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

function enter(pu, mode) {
  if (pu.mode !== mode) { pu.mode = mode; pu.t = 0; }
}

/**
 * One frame. `perc` is a perceiver from perception.js (state, lastKnown, sinceSensed); `at` is where the entity is.
 * Sets pu.mode, pu.goal (a point, or null to stay put) and pu.pace. Returns the mode.
 * @param {ReturnType<typeof createPursuit>} pu
 * @param {{ state: string, lastKnown: number[] | null, sinceSensed: number }} perc
 * @param {number[]} at
 * @param {number} dt
 */
export function advance(pu, perc, at, dt) {
  const P = pu.profile;
  pu.t += dt;
  const fresh = perc.state === 'aware' && perc.sinceSensed < P.lose;
  if (fresh) {
    // It knows where you are right now. Warn first, once per encounter, if this entity warns.
    if (P.warn > 0 && !pu.warned && pu.mode !== 'pursue') {
      enter(pu, 'warn');
      if (pu.t >= P.warn) { pu.warned = true; enter(pu, 'pursue'); }
    } else enter(pu, 'pursue');
  } else if (pu.mode === 'pursue' || pu.mode === 'warn') {
    // Lost you: run on to the last place it had you, then search there.
    if (!perc.lastKnown || flat(at, perc.lastKnown) < P.arrive) { pu.searchAt = perc.lastKnown ? [...perc.lastKnown] : [...at]; enter(pu, 'search'); }
  } else if (perc.state === 'suspicious' && perc.lastKnown && pu.mode !== 'search' && pu.mode !== 'observe') {
    if (pu.mode === 'unaware' || pu.mode === 'return') enter(pu, 'suspicious');
    if (pu.mode === 'suspicious' && pu.t >= P.notice) enter(pu, 'investigate');
    if (pu.mode === 'investigate' && flat(at, perc.lastKnown) < P.arrive) enter(pu, 'observe');
  } else if (pu.mode === 'investigate') {
    // Interest faded on the way: still finish the walk, then look.
    if (!perc.lastKnown || flat(at, perc.lastKnown) < P.arrive) enter(pu, 'observe');
  } else if (pu.mode === 'suspicious' && perc.state === 'unaware') {
    enter(pu, pu.home ? 'return' : 'unaware');
  }
  if (pu.mode === 'observe' && pu.t >= P.observe && !fresh) { pu.searchAt = perc.lastKnown ? [...perc.lastKnown] : [...at]; enter(pu, 'search'); }
  if (pu.mode === 'search' && pu.t >= P.search) { pu.warned = false; enter(pu, pu.home ? 'return' : 'unaware'); }
  if (pu.mode === 'return' && (!pu.home || flat(at, pu.home) < P.arrive)) enter(pu, 'unaware');

  // Goal for the mode.
  switch (pu.mode) {
    case 'pursue': pu.goal = perc.lastKnown ? [...perc.lastKnown] : null; break;
    case 'investigate': pu.goal = perc.lastKnown ? [...perc.lastKnown] : null; break;
    case 'suspicious': case 'observe': case 'warn': pu.goal = null; break;
    case 'search': {
      // Circle the spot, one lap about every eight seconds.
      pu.angle += dt * 0.8;
      const c = pu.searchAt || at;
      pu.goal = [c[0] + Math.cos(pu.angle) * P.searchRadius, c[1], c[2] + Math.sin(pu.angle) * P.searchRadius];
      break;
    }
    case 'return': pu.goal = pu.home ? [...pu.home] : null; break;
    default: pu.goal = null;
  }
  pu.pace = PACE[pu.mode];
  return pu.mode;
}
