// One authored tile family, many rooms. The procedural wall tile (textures.js) draws the same grid everywhere; these
// numbers decide how it has aged in a given place: how many tiles come from a different firing batch, how worn the
// glaze is, how much damp has darkened the grout, and how many hairline cracks and drip stains; a room that stood
// flooded is damper still. (An old water line belongs on the wall at a height, not in a texture that repeats, so it
// is not drawn here.) Repetition stays visible (it is the Poolrooms), but no two attractions,
// and no two expeditions through a changed room, look exactly alike. Pure and unit-tested.

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * @param {{ index?: number, depth?: number, id?: string }} sector
 * @param {{ seed?: number, age?: number, humidity?: number, flooded?: number }} [o]
 *   age 0 (new) to 1 (abandoned for decades); defaults from how deep the attraction is.
 *   humidity 0 to 1; defaults from the attraction (the Filtration Works and the Hotel Baths are damp).
 *   flooded 0 (never) to 1 (stood under water for a long time): more stains and drips, and a different set of tiles.
 */
export function tileFlavour(sector, { seed = 0, age, humidity, flooded = 0 } = {}) {
  const depth = sector.depth ?? 10;
  const a = clamp01(age ?? Math.min(1, depth / 40));
  const damp = clamp01(humidity ?? ({ 'filtration-works': 0.9, 'hotel-baths': 0.75, 'lazy-river': 0.55 }[sector.id] ?? 0.4));
  const f = clamp01(flooded);
  return {
    // A seed that changes with the room's state, so a flooded version of a room is a different set of tiles.
    seed: (Math.round(depth * 97) + 13 + seed * 7919 + Math.round(f * 3) * 104729) >>> 0,
    batchTiles: Math.round(3 + a * 8),              // tiles from another firing, slightly off in colour
    batchStrength: 0.08 + a * 0.08,
    glaze: 0.24 - a * 0.14,                          // the glaze highlight dulls with wear
    stainPatches: Math.round(2 + damp * 5 + f * 2), // grout darkened where the moisture never leaves
    stainAlpha: 0.1 + damp * 0.14,
    cracks: Math.round(2 + a * 7),
    drips: Math.round(4 + damp * 8 + f * 4),
    dripAlpha: 0.08 + damp * 0.16,
  };
}
