// Things you find on foot. Each is recorded in the logbook the first time you read it.
// The recurring mystery is occupancy: the park will not close until every guest has left.

export const DOCUMENTS = [
  { id: 'log-1', title: 'MAINTENANCE LOG · POOL C', text: '06:00 Guests on site: 0. 06:15 Guests on site: 0. 06:30 Guests on site: 1. 06:45 Guests on site: 0. 07:00 Guests on site: 4. Nobody came through the turnstile.' },
  { id: 'lost-1', title: 'LOST PROPERTY TAG #2291', text: 'Child\'s armband, orange. Found: lazy river, east bend. Date found: 14 June 1987. Date logged: tomorrow.' },
  { id: 'photo-1', title: 'RIDE PHOTO · FLUME 3', text: 'Four riders in a raft, mid-splash, mouths open. Someone has circled a fifth face in the water behind them in red pen and written: WHO.' },
  { id: 'map-1', title: 'PARK MAP (DAMAGED)', text: 'One attraction has been painted over in tile-white. Under raking light you can read part of the name: THE ... DRAIN. Below it, in small print: Exit.' },
  { id: 'sched-1', title: 'LIFEGUARD ROTA', text: 'Pool 9: 06:00–22:00. Pool 11: 06:00–22:00. Pool 14: always. There is no Pool 14 on any diagram in this building.' },
  { id: 'work-1', title: 'WORK ORDER 7716', text: 'Replace fluorescent tube, corridor B. Reported by: guest. Completed by: — . Completed: before reported.' },
  { id: 'close-1', title: 'CLOSURE NOTICE', text: 'The park will close when all guests have left. Guests are reminded that the park cannot close while guests remain. Thank you for your patience.' },
  { id: 'log-2', title: 'PUMPHOUSE FIELD NOTE · DEZ', text: 'The blaster frequencies match the park\'s own maintenance channel. The targets aren\'t decorations. They\'re switches. Someone built a control system and dressed it up as a game.' },
  { id: 'lost-2', title: 'LOST PROPERTY TAG #0417', text: 'Wristband, white, numbered 0417. Found: unloading station. Owner: still on site.' },
  { id: 'log-3', title: 'OCCUPANCY PRINTOUT', text: 'GUESTS CHECKED IN: 2\nGUESTS CHECKED OUT: 0\nGUESTS CHECKED IN: 2\nGUESTS CHECKED IN: 2\nDISCREPANCY: NONE' },
  { id: 'photo-2', title: 'STAFF PHOTO, FADED', text: 'A row of lifeguards in red shorts, all smiling. The sunglasses are the same on every one of them. So are the faces.' },
  { id: 'note-1', title: 'NOTE, FOLDED VERY SMALL', text: 'If you\'re reading this you came down the slide too. Don\'t trust the shelters with the amber light. The real ones hum. The real ones have the green beacon. — C.' },
  { id: 'work-2', title: 'WORK ORDER 7717', text: 'Re-flood changing rooms after guest drained them. Priority: routine. Note: guest drains them every time.' },
  { id: 'sched-2', title: 'WAVE SCHEDULE', text: 'Waves every 14 seconds. Do not enter the tidal zone during a wave. Things that enter during a wave are counted as guests.' },
  { id: 'log-4', title: 'FILTER LOG', text: 'Filter 3 replaced. Contents: hair (not all hair), 14 teeth, a wedding ring, a wristband numbered 0417.' },
  { id: 'note-2', title: 'NOTE IN MARS\'S HANDWRITING', text: 'You\'re going to find this. You always find this. The locker light is on when it\'s real. The clouds repeat. Count the vests. — M.' },
  { id: 'close-2', title: 'CLOSING CHECKLIST', text: '☑ Lights off. ☑ Pumps off. ☐ All guests have left. ☐ All guests have left. ☐ All guests have left.' },
  { id: 'photo-3', title: 'GUEST BOARD', text: 'A corkboard of polaroids, one per guest. The newest four are you and your crew, taken from above, on the raft, today.' },
];

/** The document for the n-th 'l' cell in a sector's map. */
export function documentFor(sectorIndex, n) {
  return DOCUMENTS[(sectorIndex * 2 + n * 5) % DOCUMENTS.length];
}
