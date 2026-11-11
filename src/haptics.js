// Controller rumble as another information channel. Each action has its own short pattern, so the hand can tell
// a Pulse shot from a Scatter blast, a landing from a scrape, a hit from a grab. Uses the Gamepad API's
// dual-rumble actuator where the browser and controller have one; otherwise does nothing.
// Not verified on a physical controller.
import { settings } from './settings.js';

/** kind → [duration ms, weak 0..1 (high-frequency motor), strong 0..1 (low-frequency motor)] */
export const PATTERNS = {
  pulse: [35, 0.5, 0.1],
  repeater: [22, 0.35, 0.05],
  scatter: [140, 0.6, 1],
  disruptor: [180, 0.9, 0.7],
  hook: [70, 0.3, 0.4],
  shove: [90, 0.3, 0.9],
  hurt: [160, 0.5, 0.9],
  landing: [130, 0.2, 1],
  scrape: [220, 0.6, 0.4],
  hop: [40, 0.3, 0.2],
  grab: [400, 0.2, 0.8],
  token: [18, 0.4, 0],
  drop: [200, 0.7, 0.5],
  whistle: [260, 0.9, 0.2],
};

let lastAt = 0, lastStrength = 0;

/** Play a pattern. Returns the effect that was requested (for tests), or null if rumble is off or unknown. */
export function rumble(kind, scale = 1) {
  const p = PATTERNS[kind];
  const k = (settings.rumble ?? 1) * scale;
  if (!p || k <= 0) return null;
  const effect = { duration: p[0], weakMagnitude: Math.min(1, p[1] * k), strongMagnitude: Math.min(1, p[2] * k) };
  // A small pattern never cuts a big one short.
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const strength = effect.strongMagnitude + effect.weakMagnitude * 0.5;
  if (now < lastAt && strength < lastStrength) return effect;
  lastAt = now + effect.duration; lastStrength = strength;
  try {
    const pad = typeof navigator !== 'undefined' && navigator.getGamepads?.().find((g) => g && g.connected);
    pad?.vibrationActuator?.playEffect?.('dual-rumble', { startDelay: 0, ...effect });
  } catch { /* no actuator: nothing to do */ }
  return effect;
}
