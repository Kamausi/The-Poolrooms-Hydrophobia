# UNDERFLOW · The facility remembers

The Poolrooms remember what expeditions did, then reconstruct those events incorrectly. The mechanical history stays accurate; the facility's written account of it does not. That is the game's themes of disappearance, counting and being rounded to zero, expressed through the world itself.

The reference point is Dimension 9's evolving-world process, as you described it: 15 hand-made rooms that informed a written specification (atmosphere, room rules, lore, art preferences); a serverless application running Opus 5.5 that proposes additional content, partly informed by where players travel and linger; generated concept art and props; tested code; and a creator who reviews batches, gives feedback and updates the direction. The useful lesson is the reviewed, rule-guided pipeline. It is not a claim that systems are invented and published live during a player's session. I have not checked that account independently.

## The contract

- **One accepted world per expedition.** It is authored when the expedition departs. Retries, including a death before the first Safe Room, continue that expedition with that world. Only a new departure adopts persistent changes.
- **History and current state are different facts.** History counts every decision ("you flooded this room once"). Current state is the latest resolved outcome ("this room is drained now"). Authoring reads current state.
- **Three accounts, kept apart:**
  - what the facility did: `facility.history`, the variations authored per expedition;
  - what the crew witnessed: the ledger, written only when the crew sees a change, close up and looking at it;
  - what the facility claims: its records, which are wrong.
- **A rescue becomes a lasting fact at the next Safe Room.** It is named at once but stays pending until then. If the expedition fails before that, the pending rescue is lost with the run. What survives a failed expedition is what was committed at Safe Rooms and what was witnessed.
- **Deaths make a place observant, not harder.** Nothing in memory raises threat. Pressure stays with the live director, which can see the crew's condition.

## What is built (`src/memory.js`, with hooks in `main.js`, `ride.js`, `explore.js`, `ui.js`)

### A persistent record
Kept in the browser across expeditions (`underflow-facility`). Per attraction it counts restorations, water diversions (flooded or drained), bypassed docks, docks left early, deaths, damage, interest, visits and room feedback. It also lists every visitor you brought to safety, by name.

### Three systems, three jobs
| System | Responsibility | When |
|---|---|---|
| World authoring (`authorExpedition`) | Proposes this expedition's variations from memory | When an expedition departs |
| The director (`director.js`) | Threats, pressure, recovery | During the expedition |
| Shared rules | Movement, shooting, rescues, objectives, state | Always |

The Attendant fronts all of it without explaining any of it: "The service corridor has been extended to accommodate your return."

### Consequences, authored between expeditions
- **A repaired system opens the building:** where you restored a dock and the place held your interest, the next expedition's ride gains an *extended service corridor*. What was a short passage is now a fully lit, operating pool hall, and the Attendant announces it.
- **Diverted water stays where you last left it:** a flooded outcome floods a familiar room on foot; a drained one lowers the water and leaves a teal waterline on the ceiling above the dock, everything below it cleaner.
- **Repairs are remembered wrongly:** the yellow tape you wrapped is still on the machine. A plate on the dock wall reads "PUMP REPAIRED · 2006 · CREDIT: DRAINER CREW SEVEN". The wrench marks are only in the caption.
- **A second changing room with the same lockers:** a row of six lockers numbered 0415–0420, with the same broken door, missing tile and discarded cup as the dock wall. In 0417 sits a folded orange vest with a readable collar tag carrying the name of someone you rescued, or your wristband number if there is no one.
- **Records disagree with the ledger:** a Safe Room shows an attendance sheet that says your rescued visitor was never admitted, a maintenance terminal that lists them inspecting the room decades ago, or a staff photograph with them in a Pumphouse vest, already wet. Your ledger says otherwise, in your handwriting.
- **A death is remembered, physically:**
  - a flotation vest caught where it happened (against the channel wall on the raft, or on the floor on foot);
  - "DON'T STAY HERE" in handwriting on the dock wall;
  - an incident report that says no incident occurred;
  - an abandoned cache beside the vest, with a filter, a dressing and a patch kit;
  - the Attendant on arrival: "Welcome back, guest. We kept your place."

  Difficulty is unchanged.
- **Skipped docks wait:** four extra fittings lit over the dock, and a polished brass ring on the tether post.

Every one of these is in the room before any caption explains it. A caption appears only when you are close and looking, and only then does the ledger record it.

### Validation and caching
Every authored map change is checked for playability: the dock must still reach every cell candidate and the machine. A failing candidate falls back to the last accepted map if that still passes, and otherwise to the authored base map, so an expedition always has content. The accepted world is stored with the expedition, so a retry sees the same world.

### Consistency within an expedition
Variations are fixed when the expedition departs and do not change until it returns. Every room keeps its accepted layout; necessary routes stay open; Grout's live alterations keep their own warnings and rules. Larger changes appear on the next departure.

### Learning from more than time spent
The record counts deliberate signals, not lingering: optional vignettes explored, documents read and puzzles solved (interest); and explicit Safe Room field notes ("It stayed with me", "I got lost", "Too quiet, in a good way"). Interest and "stayed with me" make a place a candidate for expansion; "I got lost" works against it.

### The Pumphouse field ledger (the discovery catalogue)
In the pause menu: places, machinery identified, entity behaviours observed, visitors brought to safety, and changes noticed between expeditions. It is kept across expeditions and is the one record that is never wrong. It contains observations only: a change enters it when the crew witnesses it, never at departure. Visitors are entered when committed at a Safe Room, each with a unique id, with names drawn from first × last name lists so a long history does not repeat. New entries are announced as they are made. The unease comes from the gap between the ledger and the facility's own documents.

## Generation rules

The creative directive (`DIRECTIVE` in `memory.js`):

> Maintain a public aquatic facility that has outgrown the people it was built to serve. Keep the pumps running. Keep the signs confident. Make each space appear to have had an ordinary purpose. Build from porcelain, water, rubber, painted metal, fluorescent light, and the evidence of repeated maintenance. Let the crew understand what they need to do while remaining uncertain about where they are. Introduce contradictions through scale, repetition, water levels, reflections, records, and human absence. Remember the expedition's actions. Express their consequences through later rooms and machinery. Allow the facility's written account of those actions to become increasingly incorrect. Preserve opportunities for cooperation, recognisable danger, and dependable refuge. Leave some rooms quiet. Make the water inviting enough that stopping feels tempting.

- **Architecture:** public aquatic and maintenance spaces; tile grids, waterline bands, pool fittings, drains, changing rooms, hydraulic machinery; ordinary construction convincing; selected connections, distances and elevations impossible; routes readable by players and AI crew.
- **Visual:** the ART_DIRECTION.md palette (#D8D8CA, #4D7472, #112B31, #080D10, #B19A50; small coral, green and violet accents), sour fluorescent light, unresolved depth, Barlow and IBM Plex lettering, sparse signs of people.
- **Horror:** establish familiarity before disturbing it; anomalies relate to water, maintenance, repetition, bodies or missing people; quiet rooms have something worth observing; threats keep their warnings and counterplay; the facility's account can be unreliable; teammate status and controls never are.

## Content that evolves at different rates

| Content | Approach | Status |
|---|---|---|
| Room arrangements | Combine approved architecture, machinery and routes | Built for water levels and the extended corridor; a general room generator is not |
| Environmental records | Notices, attendance discrepancies, graffiti within lore rules | Built (false records, plaques, lockers, notices) |
| Route consequences | From diversions, repairs, discoveries | Built (in-expedition and between expeditions) |
| Variations on existing entities | Approved appearances and behaviours, keeping attack rules | None yet. Where people died the place leaves evidence (a vest, a warning, a notice, a cache) and is no harder |
| New entities | A full production pass before play | Not automated, by design |
| Major revelations and endings | Authored | Authored |

## Not built
- **An automated content pipeline** in which a model proposes rooms and props between expeditions, then automated playability tests, human review of batches, and a cache of accepted content served ahead of play. The in-game authoring here is deterministic and rule-based. It is the consumer such a pipeline would feed: it takes accepted variations, validates them and falls back when one fails.
- **A shared world history across players.** Memory is per browser. A shared history needs a server, and four-player expeditions need the online layer (see PRODUCTION.md).
