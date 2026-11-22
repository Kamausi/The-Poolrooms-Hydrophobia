// Acoustic zones on foot and the dynamic mix, from the audit ("acoustic zones, filtering for submerged spaces, dynamic
// mixing"). Pure and unit-tested; audio.js applies the result.
//
// Zones: a dock is not one room. Where you stand decides the reverb, from the map itself: a narrow run between walls
// is a tiled corridor (it rings), a wide floor or a pool hall is a hall (long and wet), anything smaller and enclosed is
// a room, and under an open sky it is dry. The rooms themselves are acoustics.js's (Sabine's formula per kind). A
// zone has to hold for a moment before the reverb changes, so walking along a boundary does not flicker it.
//
// The mix: speech reads over everything (music and ambience step back while someone is talking), a fight thins the
// ambience, and under water the music and ambience are nearly gone (the muffle and the underwater bed carry it).

/** How long a new zone must hold before the reverb follows it (seconds). */
export const ZONE_HOLD = 0.8;

/**
 * The acoustic zone at cell (x, z). `open(x, z)` says whether a cell is open space (floor or water), `water(x, z)`
 * whether it holds water. Returns a key of acoustics.js ROOMS: 'tile' (corridor), 'hall', 'room' or 'dry'.
 * @param {number} x @param {number} z
 * @param {{ open: (x: number, z: number) => boolean, water?: (x: number, z: number) => boolean, openSky?: boolean }} o
 */
export function zoneAt(x, z, { open, water = (_x, _z) => false, openSky = false }) {
  if (openSky) return 'dry';
  let near = 0, wet = 0;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    if (!open(x + dx, z + dz)) continue;
    near++;
    if (water(x + dx, z + dz)) wet++;
  }
  if (near >= 17 || wet >= 6) return 'hall';
  // A corridor: open along one axis, closed across it, here and on both sides.
  const run = (ax, az) => open(x + ax, z + az) || open(x - ax, z - az);
  const across = (ax, az) => !open(x + az, z + ax) && !open(x - az, z - ax);
  if ((run(1, 0) && across(1, 0)) || (run(0, 1) && across(0, 1))) return 'tile';
  return 'room';
}

/** Keeps the current zone until a different one has held for `hold` seconds. */
export function createZoneTracker(hold = ZONE_HOLD) {
  const s = { zone: null, pending: null, t: 0 };
  return {
    s,
    step(zone, dt) {
      if (s.zone === null) { s.zone = zone; return zone; }
      if (zone === s.zone) { s.pending = null; s.t = 0; return s.zone; }
      if (zone !== s.pending) { s.pending = zone; s.t = 0; }
      s.t += dt;
      if (s.t >= hold) { s.zone = zone; s.pending = null; s.t = 0; }
      return s.zone;
    },
  };
}

/**
 * The mix as gains for the music and the ambience beds (0..1, applied on top of the volume settings).
 * `speaking`: a line is on screen; `phase`: the director's phase; `under`: your head is under water.
 */
export function mixFor({ speaking = false, phase = 'relax', under = false } = {}) {
  let music = 1, beds = 1;
  if (speaking) { music *= 0.45; beds *= 0.6; }
  if (phase === 'peak' || phase === 'buildup') beds *= 0.7;
  if (under) { music *= 0.3; beds *= 0.15; }
  return { music, beds };
}
