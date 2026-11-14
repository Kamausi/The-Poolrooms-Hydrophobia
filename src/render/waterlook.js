// Water optics per attraction: what the engine's `water` sheet needs so that depth reads by colour alone.
// 67js fades everything under the largest water sheet by exp(-absorption * depth) per colour channel
// (Beer-Lambert) and lifts it toward the water colour by `turbidity` (scattering). Indoor pool water is clear,
// so the absorption is low and blue-green leaning: shallow water shows the tile almost untinted, a metre turns
// it aqua, two metres teal, and deep water goes dark. Pure and unit-tested; the scenes apply the result.

/** sRGB hex to linear RGB. */
export function linearHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [16, 8, 0].map((s) => { const c = ((n >> s) & 255) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
}

/** Per-attraction character: how clean the water is. Unknown ids get the clean-pool default. */
const TURBIDITY = { 'filtration-works': 0.3, 'hotel-baths': 0.12, 'blacklight-pavilion': 0.08, 'lazy-river': 0.06 };

/**
 * The water's optics for one attraction.
 * `scatter` is the colour light picks up on its way back out (the sheet's colour); `absorption` is per metre,
 * derived from that colour so the water darkens toward its own hue: its weakest channel goes first.
 * `strength` scales how fast it darkens (1 = a clean indoor pool).
 * @param {{ id?: string, water: string }} sector
 * @param {{ strength?: number }} [options]
 */
export function waterOptics(sector, { strength = 1 } = {}) {
  const scatter = linearHex(sector.water);
  // Transmittance after one metre: shaped by the water's hue (its weakest channel goes first) and capped at 0.7
  // so the whole spectrum fades with depth too: two metres of clean water should read clearly darker than the
  // shallow end, not just bluer.
  const peak = Math.max(...scatter, 1e-4);
  const oneMetre = scatter.map((c) => 0.7 * (0.3 + 0.7 * (c / peak)));
  const absorption = oneMetre.map((t) => Math.min(3, Math.max(0.02, -Math.log(t) * strength)));
  const turbidity = TURBIDITY[sector.id] ?? 0.03;
  return { scatter, absorption, turbidity };
}

/** Light left after `depth` metres: exp(-absorption * depth), per channel. */
export const transmittance = (absorption, depth) => absorption.map((a) => Math.exp(-a * depth));

/** Perceived brightness of a linear colour (Rec. 709 weights). */
export const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
