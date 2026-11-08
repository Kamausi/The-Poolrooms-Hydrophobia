// Builds a sector's ride plan (see track.js) from its tokens, and fills each section with encounters.
import { section, pool, bay, drop } from './track.js';

/** The three route identities a junction can offer. */
export const ROUTES = {
  public: { label: 'PUBLIC ATTRACTION', note: 'better lit · clearly signed · longer' },
  maintenance: { label: 'MAINTENANCE', note: 'equipment · machinery · mechanical hazards' },
  overflow: { label: 'OVERFLOW', note: 'shortcut · uncertain water · few docks' },
};

function routeSections(route, random, threat, theme) {
  if (route === 'public') {
    return [
      populate(section('lazy', { length: 120 }), random, threat * 0.6, ['signals', 'anomaly'], theme),
      populate(section('lazy', { length: 100 }), random, threat * 0.6, ['signals', 'cache'], theme),
    ];
  }
  if (route === 'maintenance') {
    return [
      populate(section('flume'), random, threat, ['linked', 'cache'], theme),
      populate(section('tube'), random, threat, ['bar'], theme),
    ];
  }
  return [populate(section('overflow', { length: 95 }), random, threat * 1.2, ['wake', 'cache'], theme)];
}

/** Encounters for a section. at = metres from the section start. */
export function populate(sec, random, threat, features = [], theme = {}) {
  const E = sec.encounters;
  const len = sec.length;
  const spot = (lo = 0.15, hi = 0.85) => len * (lo + random() * (hi - lo));
  const blooms = (n) => {
    for (let k = 0; k < n; k++) E.push({ at: spot(0.1, 0.95), kind: 'blooms', count: 1 + Math.floor(random() * (1 + threat * 1.5)) });
  };
  const base = {
    channel: () => { blooms(Math.round(len / 35 * threat)); E.push({ at: spot(), kind: 'signal' }); if (random() < 0.5 * threat) E.push({ at: spot(0.3, 0.9), kind: 'rope' }); },
    lazy: () => { blooms(Math.round(len / 60 * threat)); E.push({ at: spot(), kind: 'signal' }); if (random() < 0.5) E.push({ at: spot(), kind: 'anomaly' }); if (random() < 0.45) E.push({ at: spot(), kind: 'floater', survivor: random() < 0.55 }); },
    flume: () => { blooms(Math.round(len / 30 * threat)); if (random() < 0.7) E.push({ at: spot(0.3, 0.9), kind: 'rope' }); },
    tube: () => { blooms(Math.round(len / 45 * threat)); E.push({ at: spot(0.4, 0.8), kind: 'undertow' }); },
    overflow: () => { blooms(Math.round(len / 30 * threat)); E.push({ at: spot(0.5, 0.9), kind: 'undertow' }); if (random() < 0.5) E.push({ at: spot(), kind: 'floater', survivor: random() < 0.45 }); },
    lift: () => {},
    loop: () => { E.push({ at: len * 0.5, kind: 'lockerRoom' }); },
  }[sec.type];
  base?.();
  for (const f of features) {
    if (f === 'valve') E.push({ at: spot(0.35, 0.6), kind: 'valve', covered: theme.grout && random() < 0.5 });
    else if (f === 'signals') E.push({ at: spot(), kind: 'signal' }, { at: spot(), kind: 'signal' });
    else if (f === 'anomaly') E.push({ at: spot(), kind: 'anomaly' });
    else if (f === 'cache') E.push({ at: spot(), kind: 'cache', item: random() < 0.5 ? 'cell' : random() < 0.5 ? 'filter' : 'parts' });
    else if (f === 'linked') E.push({ at: spot(0.2, 0.5), kind: 'linked', order: shuffle([1, 2, 3], random) });
    else if (f === 'bar') { sec.dark = true; E.push({ at: 6, kind: 'bar' }); }
    else if (f === 'wake') { E.push({ at: len * 0.15, kind: 'wake' }); E.push({ at: len * 0.8, kind: 'spillway' }); }
    else if (f === 'lifeguard') E.push({ at: spot(0.4, 0.6), kind: 'lifeguard' });
    else if (f === 'unloading') E.push({ at: len * 0.55, kind: 'unloading' });
    else if (f === 'distantRaft') E.push({ at: 4, kind: 'distantRaft' });
    else if (f === 'clouds') sec.clouds = true;
    else if (f === 'uv') sec.uv = true;
    else if (f === 'blooms') blooms(3);
  }
  return sec;
}

function shuffle(list, random) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** What the holding pool shows about its dock, before you commit. */
function dockInfo(random, index) {
  const pick = (a) => a[Math.floor(random() * a.length)];
  return {
    beacon: pick(['SAFE ROOM BEACON: ACTIVE', 'SAFE ROOM BEACON: ACTIVE · ENTRANCE CORRIDOR DARK']),
    sight: pick(['A charging station behind a locked gate.', 'A lifeguard office with its light on.', 'A maintenance diagram taped to the glass.', 'A figure standing on the platform. It is not moving.', 'An observation window over a slide you have not ridden yet.']),
    figure: index > 0 && random() < 0.4,
  };
}

/**
 * The ride for a sector. threat scales hazards (route choice and endless depth raise it).
 * Returns the item list for a Track.
 */
export function buildPlan(sector, random, threat = 1) {
  const theme = { grout: sector.id === 'filtration-works' || sector.id === 'hotel-baths' };
  const items = [];
  sector.ride.forEach((token, i) => {
    const [type, rest = ''] = token.split(':');
    const features = rest ? rest.split(',') : [];
    if (type === 'junction') {
      const [a, b] = rest.split('|');
      items.push(pool([
        { side: -1, route: a, label: ROUTES[a].label, note: ROUTES[a].note, sections: routeSections(a, random, threat, theme) },
        { side: 1, route: b, label: ROUTES[b].label, note: ROUTES[b].note, sections: routeSections(b, random, threat, theme) },
      ], { holding: false, junction: true }));
    } else if (type === 'dock') {
      items.push(pool([
        {
          side: -1, route: 'bypass', label: 'BYPASS · NO CHECKPOINT', note: 'skip the dock · overflow drop to the next sector',
          sections: [populate(section('overflow', { length: 70 }), random, threat * 1.3, ['wake'], theme), drop()],
        },
        {
          side: 1, route: 'service', label: 'SERVICE GATE · SAFE ROOM', note: 'needs power from the dock level', locked: 'power',
          sections: [populate(section('flume', { length: 60 }), random, threat * 0.7, ['linked', 'signals'], theme), bay()],
        },
      ], { holding: true, dock: dockInfo(random, i), defaultExit: 0 }));
    } else {
      items.push(populate(section(type, sector.openSky ? { sky: true } : {}), random, threat, features, theme));
    }
  });
  if (sector.openSky) for (const it of items) if (it.type !== 'pool') it.sky = true;
  // Exit mouths are 3.5 m either side of a pool's axis, so the first stretch after a gate stays narrow.
  for (const it of items) if (it.exits) for (const ex of it.exits) if (ex.sections[0]) ex.sections[0].half = Math.min(ex.sections[0].half, 2.6);
  return items;
}

/** An endless-mode plan: random attraction sections, two junctions, then a dock. */
export function buildEndlessPlan(random, depthIndex) {
  const threat = 1 + depthIndex * 0.25;
  const types = ['channel', 'lazy', 'flume', 'tube', 'overflow', 'lift', 'loop'];
  const pick = () => types[Math.floor(random() * types.length)];
  const tokens = [pick(), `${pick()}:valve`, `junction:${['public', 'maintenance', 'overflow'].sort(() => random() - 0.5).slice(0, 2).join('|')}`, pick(), 'dock'];
  return { tokens, threat };
}
