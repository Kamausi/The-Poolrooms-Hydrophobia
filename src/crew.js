// The Drainer crew, the roll call, and what survives a loop.

export const CREW = [
  {
    id: 'mars', name: 'Mars', full: 'Mars Teague', role: 'Crew lead',
    belief: 'Everyone can survive if someone keeps the crew together.',
    challenge: 'Leadership can become control, especially when someone wants to stay.',
    link: 'Her younger brother Caleb was on Crew Seven.',
    stay: 'You told me not to let you stay. So I\'m not letting you.',
  },
  {
    id: 'dez', name: 'Dez', full: 'Desmond Okoro', role: 'Engineer',
    belief: 'Every failure has a cause that can be isolated and repaired.',
    challenge: 'A repaired machine can produce an impossible result.',
    link: 'He signed off the repair on Crew Seven\'s raft. It came back with the repair intact and nobody in it.',
    stay: 'Get up. That\'s not a fault, that\'s you giving in. I can\'t fix that from here, so you have to.',
  },
  {
    id: 'tubs', name: 'Tubs', full: 'Tobias "Tubs" Ferrante', role: 'Ride expert',
    belief: 'Understanding a ride\'s routine makes it predictable.',
    challenge: 'The facility knows the routine too, and sometimes changes it on purpose.',
    link: 'He trained Crew Seven\'s rider on the slide. He told her the ride always brings you back.',
    stay: 'Ride\'s not over. Hands and feet inside the raft. Come on. Up.',
    // The nickname: at the theme park he was the one who climbed into the log-flume tub to clear a jam mid-cycle.
  },
  {
    id: 'june', name: 'June', full: 'June Abernathy', role: 'Mapper',
    belief: 'A recorded route makes a place understandable.',
    challenge: 'The map can stay accurate while the destination changes.',
    link: 'Her partner Priya was Crew Seven\'s mapper. They argued the night before; Priya volunteered.',
    stay: 'I have you on the map. You\'re not allowed to go off it. Stand up.',
  },
];

export const crewById = (id) => CREW.find((c) => c.id === id) || CREW[0];

/** Roll call order; the one whose name fades first shifts each sector, never the player. */
export function fadingCrew(state) {
  if (state.sectorIndex < 3 || state.endless) return null;
  const others = CREW.filter((c) => c.id !== state.character && !state.forgotten.includes(c.id));
  if (!others.length) return null;
  return others[(state.sectorIndex + state.band.charCodeAt(0)) % others.length];
}

// ---------- Loop memory: what survives into the next expedition ----------
const LOOP_KEY = 'underflow-loops';
export function loadLoops() {
  try {
    return JSON.parse(localStorage.getItem(LOOP_KEY) || 'null') || { loops: 0, rescued: 0, notes: [], route: false, ending: null };
  } catch {
    return { loops: 0, rescued: 0, notes: [], route: false, ending: null };
  }
}
export function saveLoop(state, ending) {
  const mem = loadLoops();
  mem.loops += 1;
  mem.rescued += state.rescued;
  mem.ending = ending;
  // June's route survives as long as the crew kept her counted; a note in your hand always survives.
  mem.route = mem.route || !state.forgotten.includes('june');
  mem.notes.push(`Loop ${mem.loops}: ${crewById(state.character).name} reached the Main Drain. ${state.rescued} rescued. ${state.forgotten.length ? `Lost count of ${state.forgotten.map((id) => crewById(id).name).join(', ')}.` : 'Nobody left uncounted.'}`);
  try { localStorage.setItem(LOOP_KEY, JSON.stringify(mem)); } catch {}
  return mem;
}
