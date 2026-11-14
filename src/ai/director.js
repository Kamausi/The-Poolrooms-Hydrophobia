// The pacing director, after Left 4 Dead's: build intensity, sustain a peak, let it subside, then give the
// players a real rest. Quiet is part of the design: it is when the Poolrooms gets to be unsettling.
//
//   relax    nothing spawns. Ambient unease only (distant splashes, machinery, a sound that may not matter).
//   warning  a readable cue that pressure is coming: a pump changes pitch, something moves under a grate.
//   buildup  groups arrive, growing, from more than one direction.
//   peak     sustained pressure for a few seconds once intensity tops out.
//   fade     no new arrivals; survivors finish the fight.
//   recover  the swarm disperses, supplies become reachable, the crew reacts. Then relax again.
//
// In the crew's words these are observation, anticipation, pressure, resolution and recovery. The director
// watches everything that demands attention, not only enemies: a rescue, a repair, a hard manoeuvre or a
// player in the water all count against the pressure budget (busy), so a swarm never lands on top of a rescue.
// It changes the spacing of peaks, not enemy strength.
//
// It tracks two different things. Pressure (intensity) is immediate survival: attacks, grabs, damage, hard
// steering. Dread is unresolved: unexplained movement, an impossible room, a sound with no source. Dread does
// not spawn anything. An omen holds the director: no warning, no swarm, while the crew looks, listens and
// imagines. A quiet room is allowed to stay quiet.

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
    dread: 0,
    hold: 0, // seconds during which nothing escalates: an omen is playing out
  };
  const pick = (list) => list[Math.floor(random() * list.length)];

  return {
    get phase() { return d.phase; },
    get intensity() { return d.intensity; },
    get dread() { return d.dread; },
    get holding() { return d.hold > 0; },
    /** Something unexplained happened: dread rises, and nothing new arrives for a while so it can be noticed. */
    omen(amount = 0.25, hold = 10) {
      d.dread = Math.min(1, d.dread + amount);
      d.hold = Math.max(d.hold, hold);
    },
    /** The phase in the crew's vocabulary. */
    get label() { return { relax: 'OBSERVATION', warning: 'ANTICIPATION', buildup: 'PRESSURE', peak: 'PRESSURE', fade: 'RESOLUTION', recover: 'RECOVERY' }[d.phase]; },
    /** A crescendo: the players did something loud on purpose (a power panel, a pump). */
    crescendo() {
      d.phase = 'buildup';
      d.t = 0;
      d.forced = true;
      d.nextSpawn = 0;
    },
    /** Report what is happening to the player. Returns actions for the scene to carry out. */
    update(dt, { hurt = 0, enemies = 0, nearby = 0, busy = 0 }) {
      const actions = [];
      d.dread = Math.max(0, d.dread - dt * 0.012);
      if (d.hold > 0) {
        // Held: time passes but nothing escalates. A fight already running is allowed to finish.
        d.hold -= dt;
        if (d.phase === 'relax' || d.phase === 'warning') return actions;
        if (d.phase === 'buildup') { d.nextSpawn = Math.max(d.nextSpawn, 1); }
      }
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
        if (d.nextSpawn <= 0 && busy >= 0.8 && !d.forced) d.nextSpawn = 1.5; // something else is the crisis right now
        else if (d.nextSpawn <= 0) {
          d.nextSpawn = 3.2 + random() * 2.5 - Math.min(1.5, level * 0.2);
          const size = 2 + Math.floor(d.t / 6) + Math.floor(level / 2) + (d.forced ? 2 : 0);
          actions.push({ type: 'spawn', count: Math.max(1, Math.round(Math.min(7, size) * (1 - Math.min(0.6, busy * 0.5)))), flank: random() < 0.55 || d.forced });
        }
        if (d.intensity > 0.85 || d.t > (d.forced ? 18 : 24)) { d.phase = 'peak'; d.t = 0; d.peakFor = 5 + random() * 3; }
      } else if (d.phase === 'peak') {
        d.nextSpawn -= dt;
        if (d.nextSpawn <= 0 && busy >= 0.8) d.nextSpawn = 1.5;
        else if (d.nextSpawn <= 0) {
          d.nextSpawn = 2.5;
          actions.push({ type: 'spawn', count: 2 + Math.floor(level / 3), flank: true });
        }
        if (d.t > d.peakFor) { d.phase = 'fade'; d.t = 0; }
      } else if (d.phase === 'fade') {
        // Recovery begins when the crew actually has breathing room: the fight is over and nobody needs rescuing.
        if ((enemies === 0 && busy < 0.5) || d.t > 20) {
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
  // Each of them notices a different kind of thing.
  ['MARS', 'People first. Everyone answer. Then we go back for the cell.'],
  ['DEZ', 'That intake\'s underwater. Why is it drawing air?'],
  ['TUBS', 'It stopped us between unload points. Rides don\'t do that. Somebody made it do that.'],
  ['JUNE', 'I marked this wall. On the other side. We haven\'t been on the other side.'],
];

/** Banter for the quiet stretches only. A grab or a rescue ends it mid-line. */
export const BANTER = [
  [['DEZ', 'Do not kick that panel.'], ['TUBS', 'I was looking at it.'], ['DEZ', 'You look with your feet.']],
  [['TUBS', 'If we get out, I\'m suing the slide.'], ['JUNE', 'Which part?'], ['TUBS', 'The whole slide. All of it. The water too.']],
  [['MARS', 'Sound off.'], ['DEZ', 'Here.'], ['JUNE', 'Here.'], ['TUBS', 'Here, and hungry, and here.']],
];
