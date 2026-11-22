// What the player has been doing lately, so the on-foot omens answer it instead of arriving at random. Each habit is a
// slowly decaying average (0..1):
//
// - scanning: the inspection beam is on;
// - rushing: moving fast;
// - hurt: taking damage (recent intensity);
// - lingering: standing still with somewhere to be.
//
// `weigh` turns the habits into weights per omen kind. It manipulates expectation, never difficulty: no weight
// brings an enemy, and after intensity the omens hold off (a protected recovery) rather than pile on.
//   scanning a lot → things that happen outside the beam (a light dying behind you, the extra footstep);
//   rushing → misdirection (a voice, your name, the extra footstep), not more doors to stop at;
//   lingering → the slow ones (a handle trying itself, a crack of light under a door, the machinery falling silent).
// Pure and unit-tested.

const RATE = { scanning: 1 / 12, rushing: 1 / 10, hurt: 1 / 20, lingering: 1 / 15 }; // per second

export function createHabits() {
  const h = { scanning: 0, rushing: 0, hurt: 0, lingering: 0 };
  return {
    h,
    /** One frame of behaviour. `hurt` is damage taken this frame (health points). */
    observe({ dt, scanning = false, speed = 0, hurt = 0, still = false, fast = 4.5 }) {
      const ease = (k, target) => { const a = Math.min(1, dt * RATE[k] * 4); h[k] += (target - h[k]) * a; };
      ease('scanning', scanning ? 1 : 0);
      ease('rushing', speed > fast ? 1 : 0);
      ease('lingering', still ? 1 : 0);
      h.hurt = Math.min(1, h.hurt * Math.exp(-dt * RATE.hurt * 3) + hurt / 40);
      return h;
    },
    /** How much longer to wait before the next omen (1 normally, up to 2.5 after a hard fight). */
    recovery() { return 1 + 1.5 * h.hurt; },
  };
}

/** Which habit each omen kind answers. */
export const ANSWERS = {
  lights: 'scanning', extraStep: 'scanning',
  echo: 'rushing', name: 'rushing',
  handle: 'lingering', crack: 'lingering', keyhole: 'lingering', silence: 'lingering', drain: 'lingering',
  forced: null,
};

/**
 * On the raft the same habits answer the raft's omens: scanning or looking back brings what happens behind and above
 * you (the lights dying in banks, footsteps on the walkway); rushing (boosting, fast water) brings the platform that
 * crashes in ahead; lingering (braking, near-still water) brings the slow ones (a rub along the hull, something under
 * the raft). Speeds on the raft are faster, so `RAFT_SPEED` is what counts as rushing there.
 */
export const RAFT_ANSWERS = { lights: 'scanning', footsteps: 'scanning', platform: 'rushing', rub: 'lingering', beneath: 'lingering' };
export const RAFT_SPEED = 10;

/** Weights for `kinds` (each at least 1, up to 4 when it answers the strongest habit). `answers` defaults to on foot. */
export function weigh(kinds, habits, answersTable = ANSWERS) {
  return kinds.map((k) => {
    const answers = answersTable[k];
    return 1 + (answers ? 3 * habits[answers] : 0) + (k === 'extraStep' ? 1.5 * habits.rushing : 0);
  });
}

/** Weighted choice with the caller's (seeded) random. */
export function pickWeighted(kinds, weights, random) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < kinds.length; i++) { r -= weights[i]; if (r <= 0) return kinds[i]; }
  return kinds[kinds.length - 1];
}
