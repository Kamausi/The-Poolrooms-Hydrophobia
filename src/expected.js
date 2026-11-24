// The narrative change the audit asked for: Crew Seven, and the facility expecting you. Crew Seven are already the
// story's spine (crew.js, the ending, the ID tags on the raft); what was missing is that the park was ready for this
// crew before it came. Two things, at every dock:
//
// - The reservation board by the mooring. It holds a party under the crew's surnames, the size of the crew that set
//   out, booked six weeks ago: the week Crew Seven went down, before anyone at the Pumphouse knew there would be a
//   rescue. A crewmate the crew no longer remembers is still on it: the facility does not forget a booking.
// - A Crew Seven mark on a wall, written to one of you by name by the person on Crew Seven you are tied to (Caleb to
//   Mars, Priya to June, the rider Tubs trained, the crew whose raft Dez signed off). Each dock's mark is to the next
//   crewmate in turn, only one who is here.
//
// Both are read with the inspection beam, so they enter the field notes. Pure and unit-tested.

const SURNAME = { mars: 'TEAGUE', dez: 'OKORO', tubs: 'FERRANTE', june: 'ABERNATHY' };
const ORDER = ['mars', 'june', 'dez', 'tubs'];

/** Crew Seven, to each of you: who wrote it and what it says. Short enough for a wall. */
export const SEVEN_MARKS = {
  mars: { from: 'Caleb', text: 'MARS\nI KEPT COUNT LIKE YOU TAUGHT ME\nIT KEPT COMING OUT ONE SHORT\n— C.' },
  june: { from: 'Priya', text: 'JUNE\nTHE MAP IS RIGHT\nWE MOVED\n— P.' },
  dez: { from: 'Crew Seven', text: 'DEZ\nTHE WELDS HELD\nIT WAS NEVER THE WELDS\n— CREW 7' },
  tubs: { from: 'Crew Seven\'s rider', text: 'TUBS\nYOU WERE RIGHT\nIT ALWAYS BRINGS YOU BACK\n— R.' },
};

/**
 * The reservation board. `party` is the crew that set out (ids), `forgotten` those the crew no longer remembers.
 * Returns { text, reading, count, names }: the sign as drawn, and what the beam reads.
 */
export function reservation({ party, forgotten = [] }) {
  const names = party.map((id) => SURNAME[id] || id.toUpperCase());
  const count = party.length;
  const text = `RESERVED\nPARTY OF ${count} · DRAINERS\n${names.join(' · ')}\nBOOKED SIX WEEKS AGO`;
  const kept = party.filter((id) => forgotten.includes(id)).map((id) => SURNAME[id] || id.toUpperCase());
  const reading = `RESERVATION · PARTY OF ${count} · ${names.join(', ')} · BOOKED THE WEEK CREW SEVEN WENT DOWN${kept.length ? ` · STILL LISTED: ${kept.join(', ')}` : ''}`;
  return { text, reading, count, names };
}

/**
 * This dock's Crew Seven mark: to the crewmate whose turn it is (by attraction index, in the order Mars, June, Dez,
 * Tubs), skipping anyone not `present`. Returns { to, from, text } or null when nobody it could be to is here.
 */
export function sevenMark(sectorIndex, present) {
  for (let k = 0; k < ORDER.length; k++) {
    const id = ORDER[(sectorIndex + k) % ORDER.length];
    if (present.includes(id)) return { to: id, ...SEVEN_MARKS[id] };
  }
  return null;
}

/** What the crew says when the beam reads either: practical, and frightened by the date. */
export const CREW_ON_BOARD = 'It\'s booked for all of us. Six weeks ago. Nobody knew we were coming six weeks ago.';
export const crewOnMark = (m) => (m.to === 'mars' ? 'That\'s his handwriting. That\'s Caleb\'s.' : m.to === 'june' ? 'That\'s Priya. That\'s how she signs the maps.' : m.to === 'dez' ? 'I checked those welds three times. Who told them it was me?' : 'I said that to her on the slide. Word for word.');
