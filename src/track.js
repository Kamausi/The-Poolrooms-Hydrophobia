// The slide as data. A sector's ride is a plan: a list of channel sections, holding pools with gated
// exits, and an ending (a Safe Room arrival bay, or a spillway drop). The Track turns the plan and the
// player's gate choices into a sampled centre line that ride.js lays geometry along every frame.

export const STEP = 0.5; // metres between centre-line samples

/** Channel types. Lengths in metres; speed in m/s; half = half width; climb = total rise over the section. */
export const PRESETS = {
  channel: { length: 80, speed: 8.5, half: 3.2, height: 5, wiggle: 0.35, cycles: 1, lamps: 'normal', label: 'CHANNEL' },
  lazy: { length: 110, speed: 5.2, half: 4.4, height: 5.8, wiggle: 0.45, cycles: 1, lamps: 'bright', label: 'LAZY CHANNEL', calm: true },
  flume: { length: 75, speed: 12.5, half: 2.3, height: 3.6, wiggle: 0.7, cycles: 1.5, climb: -7, lamps: 'normal', brake: true, label: 'FAST FLUME' },
  lift: { length: 64, speed: 2.4, half: 2.7, height: 4.6, wiggle: 0, climb: 18, lamps: 'sparse', belt: true, windows: true, label: 'RAFT LIFT' },
  tube: { length: 72, speed: 9, half: 1.9, height: 3, wiggle: 0.5, cycles: 1.2, lamps: 'dark', brake: true, filter: true, ribs: true, muffle: true, label: 'PRESSURE TUBE' },
  overflow: { length: 85, speed: 7.5, half: 3.4, height: 4.2, wiggle: 0.55, cycles: 1, lamps: 'flicker', shallow: true, filter: true, debris: true, label: 'OVERFLOW' },
  loop: { length: 60, speed: 6, half: 3.4, height: 5, wiggle: 0, lamps: 'normal', label: 'LOCKER ROOM PASSAGE' },
};

let nextId = 1;
export function section(type, extra = {}) {
  return { id: nextId++, type, ...PRESETS[type], ...extra, encounters: extra.encounters || [] };
}
/** A holding pool. holding: the raft stops and waits; otherwise it slows through and you switch gates in passing. */
export function pool(exits, extra = {}) {
  return { id: nextId++, type: 'pool', length: 40, half: 7, height: 7, speed: extra.holding ? 0 : 3.2, lamps: 'bright', label: extra.holding ? 'HOLDING POOL' : 'JUNCTION POOL', exits, encounters: [], ...extra };
}
export const bay = (extra = {}) => ({ id: nextId++, type: 'bay', length: 34, half: 5, height: 6, speed: 3, lamps: 'bright', label: 'ARRIVAL BAY', encounters: [], ...extra });
export const drop = (extra = {}) => ({ id: nextId++, type: 'drop', length: 26, half: 2.6, height: 4, speed: 9, lamps: 'dark', label: 'SPILLWAY', encounters: [], ...extra });

const ROOM_TYPES = new Set(['pool', 'bay', 'drop']);
const smooth = (a, b, t) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
export const EXIT_OFFSET = 3.5;

export class Track {
  /** items: the plan. choices: { [poolId]: exitIndex }. */
  constructor(items, choices = {}) {
    this.items = items;
    this.choices = choices;
    this.build();
  }

  choose(poolId, exitIndex) {
    if (this.choices[poolId] === exitIndex) return false;
    this.choices[poolId] = exitIndex;
    this.build();
    return true;
  }

  /** Insert items after the given section (used by the looping locker room). */
  insertAfter(sec, newItems) {
    const insert = (list) => {
      const i = list.indexOf(sec);
      if (i >= 0) {
        list.splice(i + 1, 0, ...newItems);
        return true;
      }
      for (const it of list) if (it.exits) for (const ex of it.exits) if (insert(ex.sections)) return true;
      return false;
    };
    insert(this.items);
    this.build();
  }

  build() {
    const xs = [], ys = [], zs = [], yaws = [], pitches = [], offs = [];
    this.ranges = [];
    this.rooms = [];
    this.encounters = [];
    let axis = [0, 0, 0];
    let yaw = Math.PI; // heading -Z
    let s = 0;
    const push = (p, y, pitch, off) => {
      xs.push(p[0]); ys.push(p[1]); zs.push(p[2]); yaws.push(y); pitches.push(pitch); offs.push(off);
    };

    const walk = (sec) => {
      const n = Math.max(1, Math.round(sec.length / STEP));
      const s0 = s;
      const yaw0 = yaw;
      const phase = (sec.id * 1.37) % (Math.PI * 2);
      const climb = sec.climb || 0;
      const pitch = Math.atan2(climb, sec.length);
      const room = ROOM_TYPES.has(sec.type);
      let side = 0;
      if (sec.type === 'pool') side = sec.exits[this.choices[sec.id] ?? sec.defaultExit ?? 0]?.side ?? 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        if (!room) yaw = yaw0 + (sec.turn || 0) * t + (sec.wiggle || 0) * (Math.sin(Math.PI * 2 * (sec.cycles || 1) * t + phase) - Math.sin(phase));
        const off = sec.type === 'pool' ? side * EXIT_OFFSET * smooth(0.55, 1, t) : 0;
        const r = [-Math.cos(yaw), 0, Math.sin(yaw)];
        push([axis[0] + r[0] * off, axis[1], axis[2] + r[2] * off], yaw, pitch, off);
        axis = [axis[0] + Math.sin(yaw) * STEP, axis[1] + climb / n, axis[2] + Math.cos(yaw) * STEP];
        s += STEP;
      }
      const range = { s0, s1: s, sec };
      this.ranges.push(range);
      for (const e of sec.encounters) this.encounters.push({ s: s0 + e.at, e, sec });
      if (room) {
        const room = { s0, s1: s, sec, yaw, side };
        // The pool's frame is its own straight axis, not the bent centre line.
        room.origin = [axis[0] - Math.sin(yaw) * sec.length, axis[1], axis[2] - Math.cos(yaw) * sec.length];
        this.rooms.push(room);
        if (sec.type === 'pool') {
          // Continue from the chosen exit's mouth, and remember the other exit for its stub.
          const r = [-Math.cos(yaw), 0, Math.sin(yaw)];
          room.end = [...axis];
          axis = [axis[0] + r[0] * side * EXIT_OFFSET, axis[1], axis[2] + r[2] * side * EXIT_OFFSET];
        }
      }
    };

    const walkList = (list) => {
      for (const item of list) {
        walk(item);
        if (item.type === 'pool') {
          const chosen = item.exits[this.choices[item.id] ?? item.defaultExit ?? 0];
          if (chosen && walkList(chosen.sections)) return true;
        }
        if (item.type === 'bay' || item.type === 'drop') return true;
      }
      return false;
    };
    walkList(this.items);
    this.length = s;
    this.xs = xs; this.ys = ys; this.zs = zs; this.yaws = yaws; this.pitches = pitches; this.offs = offs;
    this.encounters.sort((a, b) => a.s - b.s);
  }

  /** Centre line at distance s. */
  at(s) {
    const f = Math.min(Math.max(s / STEP, 0), this.xs.length - 1.001);
    const i = Math.floor(f), t = f - i;
    const j = Math.min(i + 1, this.xs.length - 1);
    const l = (a) => a[i] + (a[j] - a[i]) * t;
    let dy = this.yaws[j] - this.yaws[i];
    if (dy > Math.PI) dy -= Math.PI * 2;
    if (dy < -Math.PI) dy += Math.PI * 2;
    return { p: [l(this.xs), l(this.ys), l(this.zs)], yaw: this.yaws[i] + dy * t, pitch: this.pitches[i] };
  }
  /** Right-hand vector (horizontal) at s. */
  right(s) {
    const yaw = this.at(s).yaw;
    return [-Math.cos(yaw), 0, Math.sin(yaw)];
  }
  /** A point beside the centre line: offset metres to the right, y metres above the water. */
  lateral(s, offset, y) {
    const a = this.at(s);
    const r = [-Math.cos(a.yaw), 0, Math.sin(a.yaw)];
    return [a.p[0] + r[0] * offset, a.p[1] + y, a.p[2] + r[2] * offset];
  }
  sectionAt(s) {
    for (const r of this.ranges) if (s >= r.s0 && s < r.s1) return r;
    return this.ranges[this.ranges.length - 1];
  }
  roomAt(s, margin = 0) {
    return this.rooms.find((r) => s >= r.s0 - margin && s < r.s1 + margin) || null;
  }
  /** The next room whose end is ahead of s. */
  nextRoom(s, type) {
    return this.rooms.find((r) => r.s1 > s && (!type || r.sec.type === type)) || null;
  }
  /** Ranges from s onward, for the route indicator. */
  ahead(s, count = 4) {
    return this.ranges.filter((r) => r.s1 > s).slice(0, count);
  }
}
