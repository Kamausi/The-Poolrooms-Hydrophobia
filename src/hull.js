// The raft as a thing that can be hurt: four air chambers, punctures with causes you can name, field
// patches, the Safe Room compressor, and the marks that stay. Also the two worst things that can happen on
// the water: going over the side, and the whole raft turning over.
//
// Chambers: left and right (the sides), bow (front) and stern (rear). A leak drains one chamber. A soft side
// lists the raft and pulls it toward that wall; a soft bow or stern can't climb a launch lip; under a quarter
// pressure the water starts coming over. state.raft stays the average, for everything that reads one number.

export const CHAMBERS = ['left', 'right', 'bow', 'stern'];
/** A field patch and a hand pump give basic control; only a compressor fills a chamber. */
export const FIELD_MAX = 70;
export const CHAMBER_NAME = { left: 'LEFT SIDE', right: 'RIGHT SIDE', bow: 'FRONT', stern: 'REAR' };
/** Where each chamber is, relative to the rider: x right, z forward (metres). Used for hiss pan and bubbles. */
export const CHAMBER_AT = { left: [-0.95, 0.3], right: [0.95, 0.3], bow: [0, 1.5], stern: [0, -0.6] };

/** Why chambers fail. Each is something the player can see happen and learn to avoid. */
export const CAUSES = {
  // rate: pressure lost per second. A fresh leak empties a chamber in two to four minutes: time to choose.
  scrape: { label: 'a broken tile edge', rate: 0.35 },
  ladder: { label: 'a submerged ladder', rate: 0.6 },
  entity: { label: 'something with teeth', rate: 0.5 },
  landing: { label: 'a rough landing on debris', rate: 0.45 },
  rope: { label: 'a rope dragging on a fixture', rate: 0.3 },
  lifting: { label: 'an old patch lifting at one corner', rate: 0.25 },
};

export function ensureHull(state) {
  if (!state.chambers) {
    const v = state.raft ?? 100;
    state.chambers = { left: v, right: v, bow: v, stern: v };
  }
  state.leaks ||= [];
  state.hullMarks ||= []; // { chamber, kind: 'patch' | 'scuff', u: 0..1 along the chamber, cause }
  state.patchKits ??= 2;
  syncRaft(state);
}

export function syncRaft(state) {
  const c = state.chambers;
  state.raft = (c.left + c.right + c.bow + c.stern) / 4;
}

/** Spread a change over every chamber (old single-number repairs and hits still work). */
export function addAll(state, n) {
  ensureHull(state);
  for (const k of CHAMBERS) state.chambers[k] = Math.max(0, Math.min(100, state.chambers[k] + n));
  syncRaft(state);
}

/** The Safe Room compressor: seals every leak with a bench patch, then fills every chamber. Marks stay. */
export function compressorRefill(state) {
  ensureHull(state);
  for (const l of state.leaks) state.hullMarks.push({ chamber: l.chamber, kind: 'patch', u: l.u, cause: l.cause, bench: true });
  state.leaks = [];
  for (const k of CHAMBERS) state.chambers[k] = 100;
  if (state.hullMarks.length > 9) state.hullMarks.splice(0, state.hullMarks.length - 9);
  syncRaft(state);
}

/**
 * The hull while riding. ctx: { hud, sound, random, events }.
 * Returns an object the ride calls every frame and on every hit.
 */
export function createHull(state, { hud, sound, random }) {
  ensureHull(state);
  const h = {
    repair: null, // { leak, step: 'locate' | 'patch' | 'pump', t }
    hissTimer: 0,
    washTimer: 4,
    knockAt: -1, // a knock under a fresh patch, when the raft next pushes off
    phantomUsed: false,
    liftUsed: false,
    overboard: null,
    capsize: null,
    capsized: false,
  };

  function puncture(chamber, cause, extra = {}) {
    const c = CAUSES[cause] || CAUSES.scrape;
    const existing = state.leaks.find((l) => l.chamber === chamber);
    if (existing) {
      existing.rate = Math.min(1.5, existing.rate + c.rate * 0.4);
      return existing;
    }
    const leak = { chamber, cause, rate: c.rate * (0.8 + random() * 0.4), u: random(), t: 0, ...extra };
    state.leaks.push(leak);
    state.hullMarks.push({ chamber, kind: 'scuff', u: leak.u, cause });
    if (state.hullMarks.length > 9) state.hullMarks.shift();
    sound.hiss(pan(chamber), 0.14);
    hud.caption(`[a hiss — ${CHAMBER_NAME[chamber].toLowerCase()} chamber. ${c.label}.]`);
    return leak;
  }

  const pan = (chamber) => (chamber === 'left' ? -0.85 : chamber === 'right' ? 0.85 : 0);

  /** A hit on the raft: drops pressure in one chamber, and sometimes opens it. */
  function hit(chamber, amount, cause, openChance = 0.35) {
    state.chambers[chamber] = Math.max(0, state.chambers[chamber] - amount);
    if (cause && random() < openChance) puncture(chamber, cause);
    syncRaft(state);
  }

  /** What the chamber pressures do to the ride this frame. */
  function effects() {
    const c = state.chambers;
    const sideDiff = (c.left - c.right) / 100; // negative: left is softer
    const ends = Math.min(c.bow, c.stern) / 100;
    const lowest = Math.min(c.left, c.right, c.bow, c.stern);
    return {
      pull: sideDiff * 2.6, // lateral acceleration toward the soft side
      list: sideDiff * 0.14, // camera roll and raft tilt toward the soft side
      sag: (1 - state.raft / 100) * 0.12,
      hopScale: 0.55 + 0.45 * ends, // a soft bow or stern can't climb
      speedScale: 0.82 + 0.18 * (state.raft / 100),
      awash: lowest < 25,
      lowest,
      soft: Object.entries(c).filter(([, v]) => v < 50).map(([k]) => k),
    };
  }

  /** Leaks drain; air hisses; low chambers let water over. Returns 'capsize' when the raft should turn over. */
  /** @param {number} dt @param {{ silence?: boolean, onWash?: () => void }} [opts] */
  function update(dt, { silence = false, onWash = undefined } = {}) {
    for (const l of state.leaks) {
      l.t += dt;
      // A holed chamber settles at the water's pressure: soft, useless, but a leak alone never sinks the raft.
      if (state.chambers[l.chamber] > 12) state.chambers[l.chamber] = Math.max(12, state.chambers[l.chamber] - l.rate * dt);
    }
    syncRaft(state);
    h.hissTimer -= dt;
    if (h.hissTimer <= 0 && state.leaks.length) {
      h.hissTimer = 0.7;
      for (const l of state.leaks) if (state.chambers[l.chamber] > 1) sound.hiss(pan(l.chamber), 0.025 + l.rate * 0.05);
    }
    // In silence, sometimes a hiss with no leak behind it. Inspect the hull and find nothing.
    if (silence && !state.leaks.length && !h.phantomUsed && random() < dt * 0.05) {
      h.phantomUsed = true;
      sound.hiss(random() < 0.5 ? -0.7 : 0.7, 0.03);
      hud.caption('[a faint hiss — somewhere in the hull? Every gauge reads steady.]');
    }
    // An old patch lifts at one corner.
    if (!h.liftUsed && state.hullMarks.some((m) => m.kind === 'patch') && random() < dt * 0.004) {
      h.liftUsed = true;
      const m = state.hullMarks.filter((x) => x.kind === 'patch')[0];
      puncture(m.chamber, 'lifting');
      hud.say('TUBS', 'That\'s my patch. That\'s the one I did. It\'s lifting at the corner.', 'crew');
    }
    const fx = effects();
    if (fx.awash) {
      h.washTimer -= dt;
      if (h.washTimer <= 0) {
        h.washTimer = 5 + random() * 4;
        sound.splash();
        hud.caption('[water comes over the soft side — warm, and up to your shins]');
        onWash?.();
      }
    }
    return fx;
  }

  /**
   * Field repair: hold to find the hiss, press the patch over it, then pump. Letting go keeps finished steps.
   * blocked: getting hit sets the step back. Returns { active, prompt }.
   */
  function updateRepair(dt, holdingKey, hurt, underPressure = false) {
    const leak = h.repair && (h.repair.step !== 'locate' || state.leaks.includes(h.repair.leak)) ? h.repair.leak : [...state.leaks].sort((a, b) => state.chambers[a.chamber] - state.chambers[b.chamber])[0];
    if (!leak && !h.repair) {
      if (holdingKey) {
        // Nothing open: the hand pump still tops up the softest chamber.
        const k = CHAMBERS.reduce((a, b) => (state.chambers[a] <= state.chambers[b] ? a : b));
        if (state.chambers[k] < FIELD_MAX) {
          state.chambers[k] = Math.min(FIELD_MAX, state.chambers[k] + dt * 6);
          syncRaft(state);
          return { active: true, prompt: `HAND PUMP · ${CHAMBER_NAME[k]} ${Math.round(state.chambers[k])}%` };
        }
        return { active: false, prompt: state.raft < 99 ? `FIELD PUMP TOPS OUT AT ${FIELD_MAX}% · THE COMPRESSOR DOES THE REST` : 'THE HULL IS FIRM' };
      }
      return { active: false, prompt: '' };
    }
    if (!holdingKey) {
      if (h.repair && h.repair.step === 'locate') h.repair = null;
      return { active: false, prompt: leak ? `G · HOLD TO PATCH THE ${CHAMBER_NAME[leak.chamber]}` : '' };
    }
    if (!h.repair || h.repair.leak !== leak) h.repair = { leak, step: 'locate', t: 0 };
    const r = h.repair;
    if (hurt) {
      r.t = Math.max(0, r.t - 0.8);
      hud.caption('[the patch slips — hold it]');
    }
    r.t += dt;
    if (r.step === 'locate') {
      if (r.t > 0.8) { r.step = state.patchKits > 0 ? 'patch' : 'pump'; r.t = 0; if (state.patchKits <= 0) hud.toast('NO PATCH KITS · YOU CAN ONLY PUMP AGAINST THE LEAK'); }
      return { active: true, prompt: `LISTENING FOR THE HISS · ${CHAMBER_NAME[leak.chamber]}` };
    }
    if (r.step === 'patch') {
      if (r.t > 1.4) {
        r.step = 'pump';
        r.t = 0;
        state.patchKits -= 1;
        state.leaks = state.leaks.filter((l) => l !== leak);
        const scuff = state.hullMarks.find((m) => m.chamber === leak.chamber && m.kind === 'scuff' && Math.abs(m.u - leak.u) < 0.01);
        if (scuff) scuff.kind = 'patch';
        else state.hullMarks.push({ chamber: leak.chamber, kind: 'patch', u: leak.u, cause: leak.cause });
        sound.patch();
        h.knockAt = 1; // the next push-off
      }
      return { active: true, prompt: `PRESSING THE PATCH DOWN · ${Math.round((r.t / 1.4) * 100)}%` };
    }
    // Pump: restore pressure in that chamber.
    state.chambers[leak.chamber] = Math.min(FIELD_MAX, state.chambers[leak.chamber] + dt * (state.leaks.includes(leak) ? 7 : 22));
    syncRaft(state);
    if (state.chambers[leak.chamber] >= FIELD_MAX - 0.5 || (!state.leaks.includes(leak) && r.t > 2.5)) {
      h.repair = null;
      if (state.stats) { state.stats.repairs += 1; if (underPressure) state.stats.pressureRepairs += 1; }
      hud.toast(`${CHAMBER_NAME[leak.chamber]} HOLDING · ${FIELD_MAX}% IS ALL A HAND PUMP GIVES · A COMPRESSOR DOES THE REST`);
      return { active: false, prompt: '' };
    }
    return { active: true, prompt: `PUMPING · ${CHAMBER_NAME[leak.chamber]} ${Math.round(state.chambers[leak.chamber])}%` };
  }

  return { state: h, puncture, hit, effects, update, updateRepair, pan };
}
