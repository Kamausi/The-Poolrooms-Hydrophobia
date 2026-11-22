// Reynolds steering for people on foot: arrive (go to a point and slow down into it instead of stopping dead),
// separation (keep out of each other's space) and the sum of the two as an acceleration with a limit, so a
// crewmate's path bends smoothly round the others and the player. Positions are [x, y, z]; steering is on x and z.
// Pure and unit-tested: no DOM, no renderer.

const len = (x, z) => Math.hypot(x, z);

/**
 * Arrive: the velocity wanted to reach `target` from `pos`, at `maxSpeed` until within `slow` metres, then easing
 * to a stop at the target (Reynolds, "Steering Behaviors for Autonomous Characters", 1999).
 */
export function arrive(pos, target, { maxSpeed = 3.6, slow = 1.6, stop = 0.15 } = {}) {
  const dx = target[0] - pos[0], dz = target[2] - pos[2], d = len(dx, dz);
  if (d < stop) return [0, 0];
  const speed = maxSpeed * Math.min(1, d / slow);
  return [(dx / d) * speed, (dz / d) * speed];
}

/** Separation: a push away from every neighbour closer than `radius`, stronger the closer it is. */
export function separation(pos, neighbours, { radius = 0.9, strength = 4 } = {}) {
  let x = 0, z = 0;
  for (const n of neighbours) {
    if (!n) continue;
    const dx = pos[0] - n[0], dz = pos[2] - n[2], d = len(dx, dz);
    if (d >= radius) continue;
    // Two people in the same spot: pick a side from the index so they still part.
    const ux = d > 1e-6 ? dx / d : 1, uz = d > 1e-6 ? dz / d : 0;
    const k = strength * (1 - d / radius);
    x += ux * k; z += uz * k;
  }
  return [x, z];
}

/**
 * One step for an agent { pos, vel }: wanted velocity = arrive + separation, reached at no more than `accel`
 * (m/s²) and no faster than `maxSpeed`. Returns the agent (changed in place) and whether it is moving.
 */
export function steer(agent, target, neighbours, dt, { maxSpeed = 3.6, accel = 14, slow = 1.6, radius = 0.9 } = {}) {
  agent.vel ||= [0, 0];
  const [ax, az] = arrive(agent.pos, target, { maxSpeed, slow });
  const [sx, sz] = separation(agent.pos, neighbours, { radius });
  let wx = ax + sx, wz = az + sz;
  const wl = len(wx, wz);
  if (wl > maxSpeed) { wx *= maxSpeed / wl; wz *= maxSpeed / wl; }
  let cx = wx - agent.vel[0], cz = wz - agent.vel[1];
  const cl = len(cx, cz), lim = accel * dt;
  if (cl > lim) { cx *= lim / cl; cz *= lim / cl; }
  agent.vel[0] += cx; agent.vel[1] += cz;
  agent.pos[0] += agent.vel[0] * dt;
  agent.pos[2] += agent.vel[1] * dt;
  return { agent, moving: len(agent.vel[0], agent.vel[1]) > 0.25 };
}
