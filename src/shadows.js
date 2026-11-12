// Which lights cast shadows this frame. The engine has one shadow atlas of 24 tiles: a point light takes six, a
// spot light one, and asking for more throws. So the few fixtures closest to the eye cast shadows and the rest
// light without them; a carried lamp is a spot light and always casts. Pure.

export const ATLAS_TILES = 24;
export const tilesFor = (points, spots) => points * 6 + spots;

/**
 * @param {{ position: number[], range?: number, intensity?: number, castShadow?: boolean }[]} points the frame's point lights
 * @param {number[]} eye
 * @param {number} count how many point lights may cast (from the quality tier)
 * @param {number} spots spot lights that will cast this frame
 * @returns the same lights, the chosen ones marked castShadow: true, never past the atlas
 */
export function assignShadows(points, eye, count, spots = 0) {
  const room = Math.max(0, Math.floor((ATLAS_TILES - spots) / 6));
  const n = Math.min(count, room, 3);
  const order = points.map((l, i) => ({ i, d: Math.hypot(l.position[0] - eye[0], l.position[1] - eye[1], l.position[2] - eye[2]) }))
    .filter(({ i }) => (points[i].range ?? 10) >= 6 && (points[i].intensity ?? 1) > 1.5)
    .sort((a, b) => a.d - b.d).slice(0, n).map(({ i }) => i);
  const pick = new Set(order);
  return points.map((l, i) => (pick.has(i) ? { ...l, castShadow: true } : l.castShadow ? { ...l, castShadow: false } : l));
}

/**
 * A hand-held lamp as a spot light: from just right of and below the eye, along the view.
 * @param {number[]} eye @param {number[]} forward unit view direction @param {number[]} right unit right
 */
export function handLamp(eye, forward, right, { color = [1, 0.95, 0.85], intensity = 14, range = 14, shadow = true } = {}) {
  const position = [eye[0] + right[0] * 0.22 - forward[0] * 0.05, eye[1] - 0.28, eye[2] + right[2] * 0.22 - forward[2] * 0.05];
  return { position, direction: [...forward], angle: 0.5, penumbra: 0.45, color, intensity, radius: 0.05, range, castShadow: shadow };
}
