// Room acoustics from the room instead of hand-set numbers. Sabine's reverberation time, RT60 = 0.161·V / A, where
// V is the volume (m³) and A the absorption area: the sum over surfaces of area × absorption coefficient. Glazed tile
// and water hardly absorb anything, so a tiled hall rings for seconds; an acoustic ceiling or a crowd of soft things
// soaks it up. How much of what you hear is reverb follows from the critical distance, d_c = 0.057·√(V / RT60):
// closer than that you hear the source, further away mostly the room.
//
// Coefficients are typical mid-frequency (500 Hz–1 kHz) values for each surface. Pure and unit-tested.

/** Air attenuation constant (1/m) for Sabine's 4·m·V term. */
export const AIR = 0.0025;

/** Absorption coefficients (0 reflects everything, 1 is an open window). */
export const ABSORB = { tile: 0.015, water: 0.01, concrete: 0.03, steel: 0.05, ceiling: 0.55, stainedCeiling: 0.35, plaster: 0.05, fabric: 0.45, open: 1 };

/**
 * Sabine RT60 (s) and absorption area for a box room w × h × l (m) with one material on the floor, the walls and
 * the ceiling (keys of ABSORB). `extra` adds absorption area (m²) for what is in the room (furniture, people).
 */
export function sabine({ w, h, l, floor = 'tile', walls = 'tile', ceiling = 'tile', extra = 0 }) {
  const V = w * h * l;
  // Air absorbs too (4·m·V, m ≈ 0.0025 /m near 1–2 kHz): it is what keeps a big tiled hall from ringing forever.
  const A = w * l * (ABSORB[floor] + ABSORB[ceiling]) + 2 * h * (w + l) * ABSORB[walls] + extra + 4 * AIR * V;
  return { V, A, rt60: (0.161 * V) / A };
}

/** Critical distance (m): where the direct sound and the reverberant field are equally loud. */
export const criticalDistance = (V, rt60) => 0.057 * Math.sqrt(V / rt60);

/**
 * What the convolver needs: impulse length (s, the RT60 clamped to what is worth computing), wet level (how much of
 * a source `listen` metres away is reverb, at most 0.45, and less for short tails) and the envelope exponent
 * (a dead room's tail drops off faster at first).
 */
export function reverbFor(room, { listen = 2 } = {}) {
  const { V, A, rt60 } = sabine(room);
  const dc = criticalDistance(V, rt60), x = (listen / dc) ** 2; // reverberant over direct energy
  const meanAbsorb = A / (2 * (room.w * room.l + room.h * (room.w + room.l)));
  return {
    rt60,
    seconds: Math.max(0.2, Math.min(5, rt60)),
    // A mixing choice on top of the physics: a short tail is heard as body, not as reverb, so it is mixed lower.
    wet: Math.max(0.04, Math.min(0.45, 0.45 * (x / (1 + x)) * Math.min(1, rt60 / 1.5))),
    decay: Math.max(1.6, Math.min(6, 1.6 + meanAbsorb * 12)),
  };
}

/**
 * The game's spaces as rooms. Corridors are tiled boxes under stained acoustic ceilings; halls are large and tiled
 * all round; tubes are narrow concrete; the Safe Room is small, carpeted and full of soft things; reservoirs are
 * huge concrete and water.
 */
export const ROOMS = {
  tile: { w: 4, h: 3.2, l: 16, floor: 'tile', walls: 'tile', ceiling: 'stainedCeiling' },
  hall: { w: 18, h: 7, l: 30, floor: 'water', walls: 'tile', ceiling: 'tile', extra: 60 }, // doorways and arches out
  tube: { w: 2.4, h: 2.4, l: 8, floor: 'water', walls: 'concrete', ceiling: 'concrete', extra: 6 },
  room: { w: 5, h: 3, l: 6, floor: 'tile', walls: 'plaster', ceiling: 'ceiling', extra: 2 },
  dry: { w: 4, h: 2.6, l: 5, floor: 'fabric', walls: 'plaster', ceiling: 'ceiling', extra: 6 },
  reservoir: { w: 30, h: 10, l: 60, floor: 'water', walls: 'concrete', ceiling: 'concrete' },
};
