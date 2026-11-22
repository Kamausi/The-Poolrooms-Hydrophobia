// How a frame's time is turned into simulation steps: a long frame is split into equal steps no longer than `max`
// (so springs, waves, ropes and floating bodies never see a step large enough to go unstable), with at most `cap`
// of them (bounded catch-up: after a stall the game drops the extra time instead of spiralling into ever-longer frames).
// Normal frames are one step of their own length, so a 144 Hz screen gets 144 smooth updates. Pure and unit-tested.

/** @returns {{ steps: number, dt: number, dropped: number }} steps of length dt, and the seconds dropped */
export function planSteps(seconds, { max = 1 / 30, cap = 3 } = {}) {
  const t = Math.max(0, seconds || 0);
  if (t === 0) return { steps: 0, dt: 0, dropped: 0 };
  const want = Math.ceil(t / max - 1e-9);
  const steps = Math.min(cap, Math.max(1, want));
  const used = Math.min(t, steps * max);
  return { steps, dt: used / steps, dropped: t - used };
}
