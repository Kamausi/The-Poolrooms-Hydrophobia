// The pacing director, after Left 4 Dead's: build intensity, sustain a peak, let it subside, then give the
// players a real rest. Quiet is part of the design: it is when the Poolrooms gets to be unsettling.
//
//   relax    nothing spawns. Ambient unease only (distant splashes, machinery, a sound that may not matter).
//   warning  a readable cue that pressure is coming: a pump changes pitch, something moves under a grate.
//   buildup  groups arrive, growing, from more than one direction.
//   peak     sustained pressure for a few seconds once intensity tops out.
//   fade     no new arrivals; survivors finish the fight.
//   recover  the swarm disperses, supplies become reachable, the crew reacts. Then relax again.

const WARNINGS = [
  '[a pump changes pitch — somewhere close]',
  '[something moving under the grates]',
  '[the water level twitches]',
  '[overflow grates gurgling — all around]',
  '[the fluorescent hum drops a note]',
];
const UNEASE = [
  '[a splash, far away]',
  '[machinery running somewhere you can\'t reach]',
  '[a shower drain gurgles, then stops]',
  '[a single footstep on wet tile — far off]',
  '[a plastic chair scraping, somewhere above]',
  '[a whistle, very faint, very far away]',
];

export function createDirector(random, { relax = [32, 48], level = 0 } = {}) {
  const d = {
    phase: 'relax',
    t: 0,
    intensity: 0,
    relaxFor: relax[0] * 0.5, // a short first rest
    nextSpawn: 0,
    nextUnease: 8 + random() * 8,
    peakFor: 0,
    forced: false,
  };
  const pick = (list) => list[Math.floor(random() * list.length)];

  return {
    get phase() { return d.phase; },
    get intensity() { return d.intensity; },
    /** A crescendo: the players did something loud on purpose (a power panel, a pump). */
    crescendo() {
      d.phase = 'buildup';
      d.t = 0;
      d.forced = true;
      d.nextSpawn = 0;
    },
    /** Report what is happening to the player. Returns actions for the scene to carry out. */
    update(dt, { hurt = 0, enemies = 0, nearby = 0 }) {
      const actions = [];
      d.t += dt;
      d.intensity = Math.min(1, d.intensity + hurt * 0.025 + nearby * 0.04 * dt);
      if (d.phase === 'relax' || d.phase === 'fade') d.intensity = Math.max(0, d.intensity - dt * 0.08);
      else d.intensity = Math.max(0, d.intensity - dt * 0.02);

      if (d.phase === 'relax') {
        d.nextUnease -= dt;
        if (d.nextUnease <= 0) {
          d.nextUnease = 10 + random() * 14;
          actions.push({ type: 'unease', caption: pick(UNEASE) });
        }
        if (d.t > d.relaxFor) {
          d.phase = 'warning';
          d.t = 0;
          actions.push({ type: 'warn', caption: pick(WARNINGS) });
        }
      } else if (d.phase === 'warning') {
        if (d.t > 4) { d.phase = 'buildup'; d.t = 0; d.nextSpawn = 0; }
      } else if (d.phase === 'buildup') {
        d.nextSpawn -= dt;
        if (d.nextSpawn <= 0) {
          d.nextSpawn = 3.2 + random() * 2.5 - Math.min(1.5, level * 0.2);
          const size = 2 + Math.floor(d.t / 6) + Math.floor(level / 2) + (d.forced ? 2 : 0);
          actions.push({ type: 'spawn', count: Math.min(7, size), flank: random() < 0.55 || d.forced });
        }
        if (d.intensity > 0.85 || d.t > (d.forced ? 18 : 24)) { d.phase = 'peak'; d.t = 0; d.peakFor = 5 + random() * 3; }
      } else if (d.phase === 'peak') {
        d.nextSpawn -= dt;
        if (d.nextSpawn <= 0) {
          d.nextSpawn = 2.5;
          actions.push({ type: 'spawn', count: 2 + Math.floor(level / 3), flank: true });
        }
        if (d.t > d.peakFor) { d.phase = 'fade'; d.t = 0; }
      } else if (d.phase === 'fade') {
        if (enemies === 0 || d.t > 12) {
          d.phase = 'relax';
          d.t = 0;
          d.forced = false;
          d.relaxFor = relax[0] + random() * (relax[1] - relax[0]) - level * 1.5;
          actions.push({ type: 'recover' });
        }
      }
      return actions;
    },
  };
}

/** What the crew says once a fight is over: practical, scared, sometimes funny. */
export const AFTERMATH = [
  ['DEZ', 'Everyone still got all their fingers? Count them. Actually count them.'],
  ['TUBS', 'That\'s the worst ride I\'ve ever worked, and I worked the Log Plunge in August.'],
  ['JUNE', 'I\'m marking that room. Not going back through it.'],
  ['MARS', 'Sound off. Good. Breathe. We keep moving.'],
  ['TUBS', 'Somebody should write a complaint. Who do we complain to? I\'m serious.'],
  ['DEZ', 'Blaster\'s hot. Give it a second. Give me a second, too.'],
  ['JUNE', 'They scattered back into the grates. The map says there are no grates there.'],
];
