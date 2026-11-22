// A lighting style for each kind of space on foot, from the audit ("a different lighting style for each kind of
// space"). The kind of space is the acoustic zone (audio/zones.js), read from the map, so what you see and what you
// hear agree: a corridor rings and is lit by cold, failing tubes close together; a pool hall is bright and warm with a
// long throw; a room off a hall is dim and yellow; the open roof has no fixtures at all.
//
// The sector's lamp colour stays the base (sectors.js, docs/ART_DIRECTION.md): the style tints it, scales its
// intensity and reach, and decides how many of its tubes are failing. Pure and unit-tested.

/** zone → { tint, intensity (× the base 10), range (m), failing (share of tubes that flicker) } */
export const STYLES = {
  tile: { tint: [0.86, 0.97, 1.08], intensity: 0.8, range: 7.5, failing: 0.25 }, // corridor: cold, close, failing
  hall: { tint: [1.06, 1.0, 0.9], intensity: 1.25, range: 13, failing: 0.06 }, // pool hall: bright, warm, far
  room: { tint: [1.12, 0.94, 0.76], intensity: 0.65, range: 7, failing: 0.12 }, // room: dim and yellow
  dry: { tint: [1, 1, 1], intensity: 1, range: 9.5, failing: 0.12 }, // open sky: no fixtures are placed
};

/** The light a fixture gives in a zone: { color, intensity, range, failing }. `base` is the sector's lamp colour. */
export function lightFor(zone, base) {
  const s = STYLES[zone] || STYLES.room;
  return { color: base.map((c, i) => Math.min(1, c * s.tint[i])), intensity: 10 * s.intensity, range: s.range, failing: s.failing };
}

/** Whether a tube with this seed (0..1) is a failing one in its style. */
export const isFailing = (seed, style) => seed > 1 - style.failing;
