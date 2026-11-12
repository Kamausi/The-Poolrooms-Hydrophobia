// Brief lights from gameplay: a muzzle flash, an impact, a Bloom bursting. A fixed set of slots is reused, so a
// firefight never creates or destroys lights; when all are lit, the dimmest is taken over. Pure.

/** @param {{ slots?: number }} [o] */
export function createLightPool({ slots = 4 } = {}) {
  const pool = Array.from({ length: slots }, () => ({ on: false, position: [0, 0, 0], color: [1, 1, 1], peak: 0, range: 1, born: 0, life: 1 }));
  let now = 0;
  const level = (l) => (l.on ? l.peak * Math.max(0, 1 - (now - l.born) / l.life) ** 2 : 0);
  return {
    tick(dt) { now += dt; for (const l of pool) if (l.on && now - l.born >= l.life) l.on = false; },
    /** A light that starts at `intensity` and fades over `life` seconds. Returns the slot used. */
    flash(position, { color = [1, 0.9, 0.7], intensity = 6, range = 6, life = 0.08 } = {}) {
      const slot = pool.find((l) => !l.on) || pool.reduce((a, b) => (level(b) < level(a) ? b : a));
      Object.assign(slot, { on: true, position: [...position], color, peak: intensity, range, born: now, life });
      return slot;
    },
    /** The lights to hand the renderer this frame, brightest first. */
    lights() {
      return pool.filter((l) => l.on && level(l) > 0.05).sort((a, b) => level(b) - level(a))
        .map((l) => ({ position: l.position, color: l.color, intensity: level(l), radius: 0.15, range: l.range }));
    },
    get size() { return pool.length; },
  };
}

/** Merge gameplay lights into a frame's list without going over the engine's limit: the scene's own lights keep
 * their places, the pool fills what is left (at least one slot is always kept for a flash). */
export function mergeLights(scene, flashes, max = 16) {
  const room = Math.max(1, max - scene.length);
  return scene.slice(0, max - Math.min(room, flashes.length)).concat(flashes.slice(0, room));
}
