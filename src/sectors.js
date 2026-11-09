// Campaign 1: eight attractions, each with its own ride, level, rules and voice.
//
// ride: tokens read by plans.js. "type:feature,feature". Types are track presets (channel, lazy, flume,
//   lift, tube, overflow, loop) plus "junction:routeA|routeB" (a pass-through pool with two gated routes)
//   and "dock" (a holding pool: moor and explore, or take the bypass). "dock:repair|water|retrieval|winch"
//   changes what the stop on foot is for (see DOCK_KINDS in plans.js); "reservoir" is still water to paddle.
// map: the on-foot level at the dock. Legend:
//   #  wall            .  floor           ~  water (wadeable)     x  deep water (impassable)
//   d  drainable water (dry if the ride's valve was opened)      w  tidal floor (floods during waves)
//   D  dock: tether post and your raft    P  power cell (one candidate chosen per run)
//   S  service panel: restores the circuit that opens the service gate
//   s  scrap parts     h  supply locker (charge cell or filter)   l  document
//   u  Undertow habitat (one chosen)      b  Bloom    f  Floater   m  Marco    g  Grout source
//   L  Lifeguard tower (in water)         F  fake shelter          o  fountain panel (distracts the Undertow)
//   j  water jet       > < ^ v  pump current        C  pump control          Q  water-level control
//   B  sunken platform (floats at high water)      T  looping doorway (T pairs swap you)
//   K  keypad door     n  depth marking (code digit, visible under inspection)
//   R  reflection on the water (rooftop)            G  gate opened by the reflected sensor
//   r  water crossed by a Lane Rope (wraps you until its floats are shot)

export const SECTORS = [
  {
    id: 'welcome-pools', name: 'THE WELCOME POOLS', depth: 8,
    tile: '#d6d2b6', grout: '#8c8962', stain: '#6c673c', water: '#2b9a8c', fog: '#10150f', lamp: '#d8d6a6', band: '#557a86',
    ride: ['channel:unloading', 'ramp', 'lazy:valve', 'junction:public|maintenance', 'hall:stairway,setpiece', 'dock'],
    explore: { lifeguard: null, dark: 0.2 },
    valve: 'the flooded passage across the middle of the changing rooms',
    map: [
      '#############',
      '#D...#...P..#',
      '#.~~.#.~~~..#',
      '#.~~.dd~u~..#',
      '#.~~.#.~~~.l#',
      '#..s.#..b...#',
      '###.###.##.##',
      '#h.....F#..S#',
      '#.~~~..l#.P.#',
      '#.~o~.....s.#',
      '#############',
    ],
    attendant: {
      start: 'Welcome back, guest. Please remain seated until the unloading station.',
      dock: 'Holding pool. Guests may disembark at their own risk.',
      explore: 'The changing rooms are cleaned hourly. Please leave them as you found them.',
    },
    crew: [
      ['MARS', 'Count off. Dez? Tubs? June? Good. Nobody drifts, nobody stays.'],
      ['DEZ', 'Raft split at the junction. You are on the east channel alone. Radio stays on.'],
      ['TUBS', 'Everything here is a ride. Rides have switches. The blaster talks to them.'],
      ['JUNE', 'Check your wrist. There is a band on it. I did not put it there.'],
    ],
    graffiti: ['CREW 4 WAS HERE. THE WATER IS WARM. DON\'T SIT DOWN.', 'IT SAID MY NAME OVER THE SPEAKER. I NEVER TOLD IT MY NAME.', '||||  ||||  ||  days? hours? the lights never change'],
  },
  {
    id: 'lazy-river', name: 'THE LAZY RIVER', depth: 14,
    tile: '#cdd2c2', grout: '#7c8a7a', stain: '#526157', water: '#22897b', fog: '#0b1514', lamp: '#d9dcbf', band: '#4d7472',
    ride: ['lazy:distantRaft', 'ramp:hall,stranded,crate', 'loop:silent', 'fork:rescue', 'lazy:valve,lifeguard', 'junction:public|overflow', 'parallel', 'reservoir', 'dock:repair'],
    explore: { lifeguard: 'swim', dark: 0.35 },
    valve: 'the river crossing into the island kiosk',
    map: [
      '#############',
      '#D..........#',
      '#.~~~~~~~~~.#',
      '#.~#######~.#',
      '#.~#P.l.s#~.#',
      '#.~#..g..#~.#',
      '#.~###d###~.#',
      '#.~u~~f~r~~.#',
      '#..b..m..L~.#',
      '#s...h...~~S#',
      '#############',
    ],
    attendant: {
      start: 'Relax and let the current do the work.',
      dock: 'The kiosk is open. The kiosk has always been open.',
      explore: 'A lifeguard is on duty. Swimming is not permitted during the maintenance cycle.',
    },
    crew: [
      ['JUNE', 'I mapped this river last time. Same bends. It goes somewhere else now.'],
      ['JUNE', 'There is a raft ahead of us. It is not getting closer. We are doing the same speed.'],
      ['MARS', 'Lifeguard chair. Watch its lamp. Don\'t fire while it\'s lit.'],
      ['DEZ', 'Lift ahead. Nothing to do on a lift but look out the windows. Don\'t.'],
    ],
    graffiti: ['THE OTHER RAFT HAS SOMEONE IN IT. IT HAS ALWAYS HAD SOMEONE IN IT.', 'my fingers have been pruned for a week. they don\'t un-prune.', 'CALEB T. — CREW 7 — HEADING DOWN. TELL MARS NOT TO FOLLOW.'],
  },
  {
    id: 'wave-hall', name: 'THE WAVE HALL', depth: 19,
    tile: '#cbd4d2', grout: '#7d9194', stain: '#566e78', water: '#17705f', fog: '#09161a', lamp: '#e1eaec', band: '#3f6f86',
    ride: ['hall:stairway,ballast', 'fork:sluice', 'lazy:valve', 'junction:maintenance|overflow', 'fork:bulkhead', 'ramp', 'dock:winch'],
    explore: { lifeguard: 'run', waves: true, dark: 0.25 },
    valve: 'nothing you can see. The hall floods on its own schedule',
    map: [
      '#############',
      '#D....l....P#',
      '#...........#',
      '#wwwwwwwwwww#',
      '#wwwwwwwwwww#',
      '#~~~~~f~~~r~#',
      '#~~u~~~~~L~~#',
      '#~~~~~~~~~~~#',
      '#x.xxxxxxx.x#',
      '#..s.h.l..S.#',
      '#############',
    ],
    attendant: {
      start: 'Wave Hall: next wave in ten seconds. And ten seconds. And ten seconds.',
      dock: 'Please wait on the beach for the all-clear.',
      explore: 'No running on deck.',
    },
    crew: [
      ['DEZ', 'The wave machine is fine. Nothing wrong with it. That is what scares me.'],
      ['TUBS', 'Wave pools run on a cycle. Learn the cycle, cross between waves.'],
      ['JUNE', 'Every wave leaves something closer to the beach. Something with arms.'],
      ['MARS', 'Don\'t run near the chair. It\'s the only rule it cares about here.'],
    ],
    graffiti: ['EVERYBODY CAME BACK.', 'IT COMES IN WITH THE WAVES. IT DOES NOT GO OUT WITH THEM.', 'I counted 4,113 waves. Then I stopped counting. Then they stopped.', 'WALK. DON\'T RUN. IT CAN HEAR YOU RUN.'],
  },
  {
    id: 'splash-zone', name: 'THE FAMILY SPLASH ZONE', depth: 23,
    tile: '#d8d6c8', grout: '#a28c84', stain: '#7a5e56', water: '#2ea7a0', fog: '#111315', lamp: '#e2dec6', band: '#8a5a52',
    ride: ['channel:blooms', 'ramp', 'lazy:valve,anomaly', 'junction:public|maintenance', 'lift', 'dock:retrieval'],
    // The one painted children's room in the campaign: clouds on the tiles, three slides into the water, nobody.
    explore: { lifeguard: 'fire', jets: true, dark: 0.2, kids: [3, 7, 9, 8] },
    valve: 'the paddling pool around the play tower',
    map: [
      '#############',
      '#D..j...j..P#',
      '#.~~~~.~~~~.#',
      '#.~j~~.~~j~.#',
      '#.~~~~.~~~~.#',
      '#..j..j..j..#',
      '#.###.#.###.#',
      '#.#s..h..l#.#',
      '#.#.dddd~.#.#',
      '#...~u~~~..S#',
      '#############',
    ],
    attendant: {
      start: 'Splash Zone! Fun for the whole family. Please keep track of your family.',
      dock: 'Parents, please collect your children from the play tower.',
      explore: 'No blaster discharge while the warning lamp is lit.',
    },
    crew: [
      ['TUBS', 'Ride routine: jets, pause, jets. It skipped a pause. Rides don\'t skip.'],
      ['DEZ', 'The jets are on timers. Mostly. Some of them fire for nobody.'],
      ['JUNE', 'I can hear someone laughing on the slides. Small someone.'],
      ['TUBS', 'Lamp on the chair means hold your fire. Lamp off, do what you like.'],
    ],
    graffiti: ['THE BUCKET TIPS EVERY 4 MINUTES. NOBODY IS UNDER IT. SOMETHING GETS WET.', 'HEIGHT REQUIREMENT: you must be this tall —— it keeps moving the line', 'the slide photo has five of us in it. there were four.'],
  },
  {
    id: 'blacklight-pavilion', name: 'THE BLACKLIGHT PAVILION', depth: 29,
    tile: '#2a2140', grout: '#120c1f', stain: '#08050f', water: '#160b33', fog: '#06030c', lamp: '#a78cde', band: '#a78cde',
    ride: ['tube:uv', 'channel:uv,linked', 'lazy:valve,uv', 'junction:maintenance|public', 'fork:bulkhead', 'dock:water'],
    explore: { lifeguard: null, uv: true, dark: 0.55, keypad: true },
    valve: 'the pool under the mural',
    map: [
      '#############',
      '#D....#....n#',
      '#.~~~.#.~~~.#',
      '#.~n~...~~~.#',
      '#.~~~.#.~u~.#',
      '#.....#.....#',
      '###K###.#####',
      '#..P#.......#',
      '#.l.#.~~~~n.#',
      '#.s.#.~f~~.S#',
      '#############',
    ],
    attendant: {
      start: 'The Blacklight Pavilion: please look closely.',
      dock: 'Some exhibits are only visible to guests who look for them.',
      explore: 'The code is posted for all guests. Please look closely.',
    },
    crew: [
      ['MARS', 'If anyone stops answering, I read your name until you do.'],
      ['DEZ', 'Hold right-click to scan. The inspection beam shows what the dark hides. It also shows you to them.'],
      ['JUNE', 'Some of those glowing shapes are moving between the walls.'],
      ['MARS', 'Numbered targets ahead. Scan the sensor first so we know the order.'],
    ],
    graffiti: ['THE CODE IS ON THE POOLS. YOU HAVE TO LOOK WITH THE LIGHT.', 'there is a mural of us on the wall. it was painted before we got here.', 'DON\'T SCAN THE THINGS THAT SCAN BACK'],
  },
  {
    id: 'filtration-works', name: 'THE FILTRATION WORKS', depth: 35,
    tile: '#cfcab8', grout: '#3a3c38', stain: '#262826', water: '#0b2d26', fog: '#07090a', lamp: '#dedac9', band: '#c45a50',
    ride: ['tube:bar', 'fork:sluice', 'overflow:valve', 'junction:maintenance|overflow', 'flume', 'reservoir', 'dock:repair'],
    explore: { lifeguard: null, currents: true, bridge: true, dark: 0.35 },
    valve: 'the overflow channel by the pump hall',
    map: [
      '#############',
      '#D..>>>>>v..#',
      '#.###.##.v#.#',
      '#.#h..#P.v#.#',
      '#.#...#..v#.#',
      '#.##.###.v#.#',
      '#....Qxx<<..#',
      '#.##.#BB.##.#',
      '#.l#.#ux.#C.#',
      '#..s.#xx..gS#',
      '#############',
    ],
    attendant: {
      start: 'Filtration Works: staff only. All guests are staff.',
      dock: 'Pressure is nominal. Pressure is always nominal.',
      explore: 'Please restart the pumps when you have finished.',
    },
    crew: [
      ['DEZ', 'I signed off on Crew Seven\'s raft. Same welds as ours. The same welds.'],
      ['DEZ', 'Shoot the bar targets to throw the breakers. Lights on in the tubes. Pumps too, probably.'],
      ['TUBS', 'If you stop a pump, restart it before we launch. No pump, no water. No water, no ride.'],
      ['JUNE', 'The machinery is loud enough to hide things. Then it stops, and you hear them.'],
    ],
    graffiti: ['THE FILTERS ARE FULL OF HAIR. NOT ALL OF IT IS HAIR.', 'RAISE THE WATER TO CROSS. SOMETHING ELSE CROSSES TOO.', 'pump 3 has been restarted by someone 41 times today. I have been here alone all day.'],
  },
  {
    id: 'hotel-baths', name: 'THE HOTEL BATHS', depth: 41,
    tile: '#c6b9a0', grout: '#5e5240', stain: '#3a2f22', water: '#145247', fog: '#0b0a08', lamp: '#e4d5b0', band: '#4d7472',
    ride: ['channel', 'loop', 'lazy:valve', 'junction:public|maintenance', 'parallel', 'lift', 'dock:water'],
    explore: { lifeguard: 'run', loops: true, dark: 0.4 },
    valve: 'the bath in room 2',
    map: [
      '#############',
      '#D..#...#..l#',
      '#.~.T.~.T.~.#',
      '#.~.#...#.~.#',
      '#..s#.P.#...#',
      '#.####.####.#',
      '#...#...#..S#',
      '#.~.....dd~.#',
      '#.u.#...#.f.#',
      '#..h#.l.#...#',
      '#############',
    ],
    attendant: {
      start: 'Welcome to the Hotel Baths. Your room is ready. Your room has always been ready.',
      dock: 'Guests are reminded that room numbers are for guidance only.',
      explore: 'Please do not run in the corridors.',
    },
    crew: [
      ['JUNE', 'The map is right. The rooms are where I drew them. We are not.'],
      ['TUBS', 'We passed that locker room already. Same lockers. Different things in them.'],
      ['JUNE', 'One thing in there stays the same every pass. Find it and break it on the right pass.'],
      ['MARS', 'The doors loop. Walk through one and you come out the other side of the building.'],
    ],
    graffiti: ['ROOM 214 LOOKS OUT OVER THE ROOFTOP. THERE IS NO ROOFTOP.', 'i went through the door 30 times. i came out 30 times. once i came out first.', 'THE LOCKER LIGHT IS ON WHEN IT\'S REAL'],
  },
  {
    id: 'rooftop-lagoon', name: 'THE ROOFTOP LAGOON', depth: 0,
    tile: '#dcdfd8', grout: '#a3b0b7', stain: '#7a8c97', water: '#3aa9b4', fog: '#a7b8bf', lamp: '#f2f2ea', band: '#4d7472',
    sky: { top: '#7f9eb0', bottom: '#d3dad6' }, openSky: true,
    ride: ['lift', 'lazy:clouds', 'ramp', 'lazy:valve,lifeguard', 'junction:public|overflow', 'reservoir:ballast', 'dock:winch'],
    explore: { lifeguard: 'swim', reflection: true, openSky: true, dark: 0 },
    valve: 'the lagoon\'s south shelf',
    map: [
      '#############',
      '#D....~~~~..#',
      '#.~~~.~R~~.l#',
      '#.~u~.~~~~..#',
      '#.~~~...Q...#',
      '#..s.......P#',
      '#.~~~~~~~~~.#',
      '#.~~~f~~~L~.#',
      '#.dddd~~~~~G#',
      '#....h....#S#',
      '#############',
    ],
    attendant: {
      start: 'Rooftop Lagoon: enjoy the fresh air. The air is changed every forty seconds.',
      dock: 'Please do not lean over the parapet. There is nothing to see.',
      explore: 'The view is for guests only.',
    },
    crew: [
      ['TUBS', 'Every ride ends where it started. I told Crew Seven\'s rider that. I trained her.'],
      ['MARS', 'Sky. Actual sky. Don\'t look at it too long.'],
      ['JUNE', 'The clouds just jumped back. Same clouds. Same order.'],
      ['DEZ', 'There\'s a sensor in the reflection that isn\'t on the balcony. Get the water level right and scan it.'],
    ],
    graffiti: ['WE FOUND THE SURFACE. THE SURFACE FOUND US.', 'the towers out there have windows. someone is in every window. they are all waving.', 'YOU HAVE BEEN HERE BEFORE. CHECK THE HANDWRITING.'],
  },
];

/** Things the Attendant and Marco say during play. {name} and {band} are filled in at high Drift. */
export const AMBIENT = {
  attendant: [
    'Please remain seated.',
    'Guests who leave the raft do so at their own risk.',
    'The water is perfectly safe.',
    'The park will close when all guests have left.',
    'Lost property may be collected at the Main Drain.',
    'Occupancy is currently: one. Two. One.',
  ],
  personal: [
    'Guest {band}, {name}, please remain seated.',
    '{name}. You have been here before.',
    'Guest {band}, your party is waiting for you downstream.',
  ],
  marco: ['Marco…', 'Marco?', 'Ma…rco…', 'MARCO.'],
  drift: ['You could stop here. It is warm.', 'Nobody is counting you anymore.', 'Sit down. The raft will come back for you.'],
};

/** Small comforts in Safe Rooms, one picked per visit. */
export const COMFORTS = [
  'There is a pair of dry socks on the bench, folded, in your size.',
  'The vending machine rattles. It has one can left. It\'s cold.',
  'A radio on the shelf is tuned to a station you don\'t recognise. Someone is reading out the weather for a town that doesn\'t exist.',
  'There is a chair placed directly under the vent. Warm, dry air. You sit for a minute.',
  'A towel dispenser hums and pushes out one white towel. It\'s warm, like it came out of a dryer.',
];

/**
 * The reference chapter: one complete sequence held to the finished standard. Arrival in a still wave pool,
 * a navigation choice (shoot the diverter for the maintenance landing), exploration with a visible purpose,
 * a loud commitment, a return through the route you made, and a Safe Room that overlooks what you did.
 */
export const REFERENCE_CHAPTER = {
  id: 'closed-wave-pool', name: 'THE CLOSED WAVE POOL', depth: 22, chapter: true,
  tile: '#cdd3cf', grout: '#7a8c8e', stain: '#55696f', water: '#167a69', fog: '#08141a', lamp: '#e3e6da', band: '#3f6f86',
  ride: ['channel', 'hall:wavepool,diverter', 'dock:divert'],
  // One recognizable place: a wave basin with rooms around it you keep seeing from new angles.
  // West: the changing-room annex (pressure key, lockers, doors, a close Bloom ambush). North and east: the raised
  // maintenance gallery, a dry route overlooking the basin under the inspection lamp. North: pump control.
  // Centre: the basin, the short way across, with the Undertow in it. South: the arrival dock. The tower (L) moves.
  explore: { lifeguard: 'inspect', dark: 0.2, basin: true },
  valve: 'the wave generator',
  map: [
    '#################',
    '#h..yyyyyyyyyyyy#',
    '#.#b.##...S####y#',
    '#P.#.#........oy#',
    '#..b..~~~~~~~~~y#',
    '#.#...~~~~u~~~~y#',
    '#.h.#.~~L~~~~L~y#',
    '#l...~~~~~~~~~~y#',
    '#..#.~~~~~~~~~~y#',
    '#P...~~~~~~~~~.y#',
    '#s.......D.....y#',
    '#################',
  ],
  attendant: {
    start: 'The wave pool is closed for maintenance. Waves begin in zero seconds.',
    dock: 'Guests are asked not to approach the wave generator.',
    explore: 'The wave pool is closed. The wave pool has always been closed.',
  },
  crew: [
    ['JUNE', 'There\'s an exit sign under the water. Lit. Somebody wants us to see it.'],
    ['DEZ', 'If we take pressure off the generator, the water comes off that exit. That\'s the whole trick.'],
    ['TUBS', 'The display says the waves start in zero seconds. It has said that for a while.'],
    ['MARS', 'Landing on the left has equipment. The dock is easier. Pilot\'s call.'],
  ],
  graffiti: ['THE WAVES NEVER STARTED. WE WAITED ANYWAY.', 'the exit sign is real. the exit isn\'t. — M.'],
  index: 2,
};
