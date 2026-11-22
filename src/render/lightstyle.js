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
  // On the raft (raftZone below): the plain channel is the base; calm water is warm and soft, where stopping is
  // tempting; the reservoir is cold and far.
  channel: { tint: [1, 1, 1], intensity: 1, range: 9.5, failing: 0.12 },
  calm: { tint: [1.05, 0.92, 0.72], intensity: 0.9, range: 9.5, failing: 0.08 },
  reservoir: { tint: [0.9, 1.02, 1.12], intensity: 1.1, range: 13, failing: 0.04 },
};

/**
 * The kind of space a raft section is, for its light: tubes, flumes and chutes are corridors; pools, bays and halls
 * are halls; the reservoir is its own; calm stretches are calm; the sky has no fixtures; anything else is a channel.
 */
export function raftZone(sec) {
  if (sec.sky || sec.open) return 'dry';
  if (sec.reservoir) return 'reservoir';
  if (sec.hall || sec.type === 'pool' || sec.type === 'bay') return 'hall';
  if (['tube', 'flume', 'descent', 'drop', 'overflow'].includes(sec.type)) return 'tile';
  if (sec.calm) return 'calm';
  return 'channel';
}

/** A raft lamp's light in its section's style: `intensity` and `range` are the lamp's own, scaled by the style. */
export function raftLight(sec, base, { intensity, range }) {
  const s = STYLES[raftZone(sec)];
  return { color: base.map((c, i) => Math.min(1, c * s.tint[i])), intensity: intensity * s.intensity, range: range * s.range / STYLES.channel.range };
}

/** The light a fixture gives in a zone: { color, intensity, range, failing }. `base` is the sector's lamp colour. */
export function lightFor(zone, base) {
  const s = STYLES[zone] || STYLES.room;
  return { color: base.map((c, i) => Math.min(1, c * s.tint[i])), intensity: 10 * s.intensity, range: s.range, failing: s.failing };
}

/** Whether a tube with this seed (0..1) is a failing one in its style. */
export const isFailing = (seed, style) => seed > 1 - style.failing;
