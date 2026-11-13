# UNDERFLOW — Systems Design

> **The founding rule:** every sector contains something you change from the raft, something you discover on foot, and a consequence that connects the two.

This document turns the story bible into systems. Its central idea: **the waterpark is one interconnected machine, and every ride changes the environment you will eventually step into.** The raft protects you while it carries you somewhere you can't control. Getting off gives you freedom and takes that protection away.

It builds on [STORY_AND_LORE.md](STORY_AND_LORE.md). Where this direction and the story bible disagree, section 11 lists the conflict and a recommendation; nothing in the story bible has been overwritten.

---

## 1. The fantasy: a facility that never closed

The park works. Pumps run. Towels come out of dispensers. Announcements play on schedule. Someone replaces the fluorescent tubes and repairs what you break while you're elsewhere. The water is warm.

But there is no staff, every exit route leads back into an attraction, and **the guest counter changes when you're alone.**

The recurring mystery is **occupancy**. The facility insists it can't close until every guest has left. The player keeps finding evidence that "guest", "left" and "outside" mean something different to the system. This fits the existing canon: the Attendant counts riders, the Lifeguard counts heads and is always one over, and the canon ending is a loop.

Questions to keep open for most of the game:
- Why does the facility still register occupied rafts?
- Who keeps repairing areas you've damaged?
- Why do some attractions only appear when their lights are off?
- Why are Safe Rooms built to withstand pressure *from the inside*?
- What happens when the guest counter reaches zero?

The player can learn how a pump works without learning what maintains it.

### The rhythm
| Situation | What the player controls | Where the tension comes from |
|---|---|---|
| On the raft | Aim, machinery, route switches, limited braking and positioning | Decisions while the world keeps moving |
| On foot | Movement, pace, exploration, resources | You can go anywhere reachable, but must find your own way back |
| In a Safe Room | Preparation, equipment, route choice | You know enough to anticipate the next risk |

**Anticipation → commitment → vulnerability → relief.** That rhythm must survive any layout change.

---

## 2. The raft is a possession, not a vehicle

The raft should be the most familiar thing in the game, and increasingly uncomfortable to depend on. Its parts:

- **Blaster mount**: recharges the blaster while seated.
- **Locker**: a few supply slots.
- **Mooring tether**: holds the raft at a dock while you explore.
- **Route indicator**: reads nearby facility signals and shows the next branch.
- **Pressure brake**: works only in certain channels.
- **Maintenance panel**: upgrades appear on the raft physically.

Damage and repairs stay visible: a patched seam, a cracked route display, a replacement headlamp.

### Channel types
| Channel | What it asks of the player |
|---|---|
| **Lazy channel** | Observe, look for hidden targets, listen to announcements |
| **Fast flume** | Quick route decisions, hazards, short shooting sequences |
| **Raft lift** | A slow climb past windows into inaccessible rooms. You can't leave. Someone is standing in each window. |
| **Holding pool** | Temporary freedom: rotate, inspect branches, choose a departure |
| **Pressure tube** | Narrow; sight and sound become unreliable |
| **Overflow section** | Unstable channels through parts of the park that are usually underwater |

### Branches communicate a choice
- **Public attractions:** better lit, clearly signed, longer.
- **Maintenance routes:** equipment, mechanical hazards, chances to change the facility.
- **Overflow routes:** shortcuts through uncertain water with few docks.

A switch target throws a visible gate several seconds ahead, so the player sees where the raft is going. Missing a switch gives a *different* journey (longer, an extra hazard, a missed opportunity), not death. Lethal outcomes need strong warning and a fair chance to respond.

---

## 3. The blaster is a maintenance instrument

The Arc Blaster (Dez built it from fluorescent ballasts) talks to the machinery built into the park. The cheerful targets turn out to be access points to a much larger control system. That's why the same tool throws switches, reveals markings and disrupts entities.

### Three functions
| Function | Purpose | Cost |
|---|---|---|
| **Signal pulse** (current fire) | Targets, switches, mechanisms | Recharges; heavy use builds heat and noise |
| **Inspection beam** | Reveal maintenance markings, identify odd targets, examine residue | Needs sustained attention; makes you visible |
| **Disruption burst** | Interrupt an entity or force an emergency mechanism | Uses scarce charge cells; attracts attention |

The pulse always recovers. A player who spent everything on defence can still solve the critical machinery.

### Target language: shape and colour
| Shape | Meaning |
|---|---|
| **Arrow** | Route gates and current direction |
| **Ring / wheel** | Pressure, pumps, water level (the drain valve in the current build) |
| **Bar** | Lights, shutters, conveyors |
| **Linked** | Sequences needing observation or timing |
| **Unmarked anomaly** | Something that reacts to the blaster, and nobody knows why |

Green Signal rings (Crew Seven's heal beacons) stay as they are: they were painted by people, not built by the park.

Advanced targets: track one for a few seconds while moving; one rotating behind machinery you must stop first; one visible only in a reflection, under shallow water, or during a fluorescent flicker.

**The reward for a good shot is a changed situation**, not points: a bridge lowered, lights restored ahead. Score stays for a challenge/endless mode.

**Shots should sometimes be uncomfortable.** A target powers a corridor *and* starts a pump that carries something toward it. Draining a pool reveals footprints that were underwater. The player understands what they did; the uncertainty is in what it disturbed.

---

## 4. Getting off is the player's decision

If every dock forces you off, the raft is just a level transition. If staying aboard is always safe, exploring has no point.

### Inspect before committing
Approaching a dock, a short holding channel lets the player see what's there: a working Safe Room beacon, a charging station behind a gate, equipment in a lifeguard office, a maintenance diagram, a window over a future slide, or a figure standing between them and something valuable.

### Staying aboard has a cost
- The next route needs a part found off the slide.
- Hazardous channels slowly use up protective filters.
- A damaged raft part makes some routes riskier.
- Deeper water means fewer maintained docks.
- Exploring reveals which route actually leads to a checkpoint.

Skipping a dock must be recoverable. The player manages a journey, not a series of mandatory stops.

### The raft behaves predictably
At a proper dock the tether holds. At an unstable junction a gauge shows how long the platform can hold pressure. If a sequence lets the raft drift off, the level must offer a way to recover it or another launch point. Losing the raft can be a great horror set piece when the level supports it.

---

## 5. Water connects everything

Water level, movement, clarity and connections decide which passages are open, how much noise you make, which targets are reachable, which entities can enter a room, whether floating objects make a crossing, how the raft reaches the next sector, and what shows in reflections. The best puzzles change several of these at once.

### Consequences that cross between modes
| On the raft | On foot | On the way back |
|---|---|---|
| Hit a drainage target | A flooded corridor becomes walkable | The lower slide loses water and closes |
| Restore a circuit | Lights and doors work in a dead attraction | A dormant conveyor starts moving rafts |
| Open an overflow gate | Supplies drift into a reachable holding pool | Something downstream gains a route upstream |
| Disable a pump | A dangerous current stops | You must restart it to launch again |

### Puzzle seeds
- **The depth markings.** Inconsistent depth numbers are actually the water levels that line submerged symbols up with an observation window. The result is a route code.
- **The floating bridge.** A platform lies on the floor of a drained chamber. Raising the water floats it up to a doorway, and also connects the room to an occupied pool.
- **The impossible return.** You ride past the same locker room again and again; its contents change slightly. Find the system that *doesn't* change across the loop and disable it on the right pass.
- **The reflected switch.** A target exists only in a reflection under a balcony. Change the water level until the reflection lines up with a real sensor.

Surreal, but always tied to observable rules.

---

## 6. Sectors are attractions with rules

Each sector is built around one attraction and one dominant environmental behaviour.

| Sector | Look | Main idea | Horror |
|---|---|---|---|
| **Welcome Pools** | Cream tile, faded signs, warm light | Routing, docking, basic machinery | Everything is ready for guests who never arrive |
| **Lazy River** | Broad channels, artificial daylight | Long sightlines, branch choices | A distant raft keeps the same position for an impossible length of time |
| **Wave Hall** | Huge indoor pool, far wall barely visible | Move between wave cycles; change their timing | Each wave leaves something closer to shore |
| **Family Splash Zone** | Oversized play structures, bright shallows | Elevated paths, tipping buckets, timed jets | Equipment responds to an unseen participant |
| **Blacklight Pavilion** | Dark slides, UV murals, fluorescent targets | Read hidden markings; tell real signals from false | Some glowing shapes move between surfaces |
| **Filtration Works** | Pipe galleries, tanks, gantries | Manage pressure, reconnect routes | Machinery hides movement until it stops |
| **Hotel Baths** | Repeating spa rooms, numbered doors, underwater windows | Spatial loops and room relationships | One bath overlooks somewhere you haven't reached yet |
| **Rooftop Lagoon** | Open sky, distant towers, still pools | Navigate by reflection and landmark | After hours under ceilings, a sky. Then the clouds repeat on the announcement cycle. |

The current build's sectors map onto this: **The Yellow Channel** is the Welcome Pools (where the Backrooms bleeds in), **The Blue Reservoir** a Lazy River / Wave Hall hybrid, **The Last Drain** the approach to the Filtration Works.

### Procedural, within limits
Authored landmarks, encounters and puzzle structures stay fixed. Their connections and conditions vary: the same pump station approached from its roof, basement or a flooded channel; a route dark because of an earlier choice; supplies in one of several plausible stores; an entity in one of several suitable habitats. **Once you enter a sector, its geography is stable** unless an identifiable event changes it. Remembering a place must pay off.

---

## 7. Entities have rules you can learn

Each entity needs a warning, a behaviour and practical counterplay. **The blaster buys time, reveals information or changes an encounter. Permanent victory comes from understanding how the entity relates to the environment.**

### The Undertow (expanded)
Lives in connected bodies of deep enough water. You rarely see a body: a wake moving against the current, a shadow passing a drain, a disturbance arriving before its sound.
- **Raft:** follows your wake; repeated firing draws it; impacts against the underside warn of an attack; spillways, wash gates or a disruption burst break pursuit. *(Current build: still-water patch that holds the raft.)*
- **Foot:** fast movement through deep water attracts it; dry islands and shallow ledges protect you; a fountain or an object released into another channel distracts it. *(Current build: it follows you through water cells and can't enter drained ones.)*
- Depth markings become strategic information.

### The Lifeguard (expanded)
Enforces **posted rules**, consistently within an encounter, with rising severity. Possible rules: no running on deck; no entering the pool during a maintenance cycle; no blaster fire while the warning lamp is lit. First violation: a whistle and a visible response. Later: pursuit. Counterplay: comply, break line of sight, or change the machinery that sets the area's cycle. On the raft it watches quiet passages where firing is dangerous, so a tempting optional target becomes a real choice. *(Current build: one rule, "not in the water near my tower"; shoot the lamp to blind it.)*

### The Passenger (new)
Something that gradually boards your raft. Fits the body-horror canon: it's what's left of a rider who folded.
1. The opposite cushion dips.
2. Water drips from an empty seat.
3. The restraint closes by itself.
4. A reflection shows someone sitting behind you.
5. The raft lists to one side.

The sequence is always the same, so experienced players catch it early. An inspection lamp at some docks shows whether the raft is occupied; a disruption burst weakens it long enough to reach a cleansing station.

### Grout (expanded)
A dark growth moving through wet tile seams in unlit areas. It begins as set dressing; then a patch appears on the wrong side of a doorway. It spreads along connected wet surfaces; working light and dry barriers stop it; it can cover a target or narrow a passage; shooting disperses it briefly but not its source. You beat it with lighting, drainage and route planning.

Marco and the Floater from the story bible stay; give each one learnable rule in the same format.

---

## 8. Safe Rooms keep their promise

A **real** Safe Room is always safe. Players learn its signature: a distinctive mechanical beacon, a pressure-sealed door, a ventilation tone, a physical route terminal, a checkpoint confirmation. The park can contain fake and abandoned shelters, but an authenticated Safe Room honours its promise.

Inside: Drift fully resets; basic equipment gets a minimum recharge; discoveries and route progress are recorded; supplies become a few useful items; equipment can be modified; the terminal gives partial information about the next routes. Small comforts make it memorable: dry socks, a rattling vending machine, a radio on an unfamiliar station, a chair under a vent.

### Route terminal (imperfect but useful)
```
NORTH FLUME     pressure stable · lighting limited · dock status unknown
SERVICE BYPASS  short · machinery working · equipment storage
UPPER ATTRACTION beacon working · OCCUPANCY READING IRREGULAR
GUESTS CHECKED IN: 2
```

### Upgrades add capabilities, not numbers
An inspection lens; a depth sensor (safe water vs dangerous channels); a stronger tether; a signal recorder for target sequences; a raft headlamp for upcoming branches; a manual valve tool. *(The current build's three upgrades are numeric placeholders: charge, recharge speed, damage.)*

---

## 9. Two meters: body and composure

- **Vitals** (physical): injuries and hazardous environments.
- **Drift** (composure): isolation, encounters, disorientation, long exposure to unsettling spaces, and the warm water.

Low composure changes perception: announcements become personal, reflections lag slightly, footsteps continue after you stop, a distant figure is hard to tell from equipment, signs briefly say something else.

**Some instruments are always reliable:** equipment readouts, the pause menu, accessibility settings and confirmed checkpoint status. Players must be able to reason while their character is frightened. *(Current build: Drift now fades only the decorative HUD; vitals, charge and prompts stay fully readable.)*

**Pressure is local.** Some areas allow slow inspection; others force a decision (rising water, a failing filter, an approaching entity). Constant pressure everywhere would make careful exploration pointless.

---

## 10. A sector, start to finish: "Family Leisure — Pool C"

1. **Arrival.** A bright channel; soft announcements about a family attraction. Through glass, a maintenance corridor waist-deep in water. An optional ring target by a drain lowers it, visibly, as you pass.
2. **The decision.** A holding pool. A sign points to a Safe Room beyond the changing rooms; a beacon seems to work, but the corridor is dark. Continue, or tether and go in.
3. **Exploration.** The changing area leads to that corridor. Drained: a shallow route with exposed maintenance markings. Not drained: a slower raised perimeter path. Both work.
4. **Puzzle.** The Safe Room approach needs power, routed through a filtration office reached by raising a service platform with the pool controls. A charge cell and an optional inspection lens are on the way.
5. **Encounter.** Restoring power starts a pump. A dark wake moves through the deep channel under the platform. Use what you know about depth and disturbance to reach the dock.
6. **Return ride.** The circuit opened a closed slide gate. Launch, pass the new machinery, make a few routing shots into the Safe Room's arrival bay.
7. **Relief.** The bulkhead closes. Water sounds fade. The blaster charges. Checkpoint confirmed. The terminal reads **GUESTS CHECKED IN: 2**.

---

## 11. How this direction was combined with the story bible

Both are in the game. Where they touched, they were combined rather than one replacing the other.

| Topic | In the game |
|---|---|
| Who you are | Mars of the Drainer crew (co-op needs a crew) **and** you wake in a raft with a numbered wristband, having passed the unloading station three times. The wristband number appears in announcements and the ending. |
| The guest counter | The facility's head count. It is on the HUD and the Safe Room terminal, and it goes up every Safe Room although you are alone. |
| Score | Hidden in the campaign; good shots change the situation instead. Endless mode shows a score. |
| Sanity | Drift is composure. Vitals are the body. Instruments stay readable at any Drift. |
| Docks | Optional. Each sector ends at a holding pool: moor and explore, force the gate with a burst, or take the bypass. |
| Underwake | Kept the name Undertow, with the expanded rules. |
| Sectors | The three earlier sectors became the first steps of eight attractions. |
| Sector length | Not yet at 15–25 minutes; it needs tuning with real players. |

## 12. Presentation

Readable tile patterns and depth markings; beautiful, unsettling pools of light; strong spatial sound (pumps, drains, whistles, footsteps, distant rafts); short near-silences; restrained camera; optional grain, distortion and ride effects; captions for important directional sounds; touch aim assist that still keeps target choice deliberate. Pausing and resuming in the browser must keep your place; Safe Rooms stay the in-world checkpoints.

---

## 13. What the build implements

Everything in sections 1–12 is implemented except where noted under **Not yet**.

- **Facility:** occupancy counter, wristband, personal announcements, repairs done while you are not looking (lamps you shoot out come back), documents about guest counts, closures and work orders.
- **Raft:** blaster mount (charge trickles back while seated, faster recharge), locker (charge cells, filters, parts), mooring at holding pools, route indicator, pressure brake (S, flumes and tubes), maintenance panel and visible hull patches, integrity that can list the raft or sink it.
- **Channels:** lazy channel, fast flume, raft lift (windows with figures), holding pool, junction pool, pressure tube (muffled sound, ribs, dark until its breaker is thrown), overflow (shallow, flickering, debris, uses filters), spillway drop, arrival bay, looping locker room.
- **Branches:** junction pools with two gated exits labelled public / maintenance / overflow. Arrow targets throw the gates; you see them move and see the stub of the route you didn't take.
- **Blaster:** signal pulse with heat, overheat and noise; inspection beam (right-click/Q) that reads sensors, seats, rules and hidden things; disruption burst (F) that spends a charge cell, stuns or pushes back entities, and can force a locked gate.
- **Targets:** arrow (gates), ring (drain valve; locker-room pump), bar (tube breaker, lifeguard breaker), linked sequences with a scannable maintenance sensor, unmarked anomalies only visible to the beam or in a flicker, supply crates, grout-covered targets.
- **Uncomfortable shots:** the tube breaker turns the lights on and starts the pumps, which brings an Undertow; restoring power on foot wakes the deep water; raising the water floats the bridge and lets the Undertow cross.
- **Docks:** inspect from the holding pool (beacon state, what is on the platform, the inspection lamp checks the raft for a Passenger); moor, force, or bypass. The bypass skips the checkpoint and burns filters.
- **On foot, by attraction:** Welcome Pools (tutorial, fake shelter, fountain); Lazy River (island kiosk, Lifeguard: no swimming during the cycle); Wave Hall (14-second waves flood the tidal floor and carry Floaters ashore, Lifeguard: no running); Splash Zone (timed jets that sometimes fire for nobody, Lifeguard: no discharge while lit); Blacklight Pavilion (UV markings, keypad code painted on the pools, visible only to the beam); Filtration Works (pump currents, pump control that must be restarted before launch, water level and floating bridge); Hotel Baths (looping doorways); Rooftop Lagoon (open sky, clouds that jump back every forty seconds, lagoon level and a sensor that exists only in the reflection).
- **Entities:** Blooms; Undertow (still patch ahead, pursuing wake with warning impacts, broken by spillways or bursts; on foot it follows you through connected water, sped up by noise and running, lured by fountains); Lifeguard (posted rule, whistle, then pursuit until you break line of sight; cut its breaker to stop the cycle); Passenger (five stages from a dipping cushion to a listing raft; scan the seat to see it; bursts and Safe Rooms push it back); Grout (spreads through wet, dark tile; light, draining and bursts stop it); Marco (directional voice, a throat in the wall if you follow it, then it moves); Floaters (survivor or trap, scans unreliable).
- **Safe Rooms:** arrival bay with pressure door, beacon and vent tone (fake shelters lack them); Drift reset, minimum recharge, Passenger cleansed; logbook; workbench (cells, filters, raft patches, dressings); six capability upgrades (lens, depth sensor, stronger tether, signal recorder, headlamp, valve tool); route terminal with partial information and a preset for the next junction.
- **Modes and presentation:** eight-sector campaign ending in "The Loop"; endless mode with seeds, records and shareable links; resume exactly where you left off after closing the tab; settings for grain, distortion and camera roll, sway, captions, touch aim assist and look sensitivity; captions for directional sounds; stereo-panned sound; touch aim assist.

**Not yet:** online co-op and AI crewmates; Campaigns 2–4 and the other two endings; the impossible-return puzzle beyond the looping locker room; reflections that lag behind you; sector length tuned with players.

---

## 14. Crew rules: rescue, solo play, fair encounters

### Solo play has explicit rescue rules (implemented)
Radio companions cannot physically rescue you, so nothing waits on a teammate who isn't there.
- **Full Drift:** you sit down in the water and can't move. Hold **Space** to remember why you're leaving while a crewmate talks you back on the radio. That restores you to Drift 70. After **15 seconds** without that, you have stayed: a clear failure and a checkpoint restart. No indefinite incapacitation.
- **Undertow on foot:** tap **Space** to kick free, shoot the still water, or burst. **On the raft:** it holds the raft for a few seconds and lets go; spillways and bursts break pursuit.
- **Lane Rope on foot:** tap Space to pull free, or shoot its floats. It looks like a racing lane line: runs of red and white disc floats on a steel cable; each run is one float you can pop (`src/lanerope.js`).

### AI crewmates (next): rescue is the defining feature
Valve's own write-ups on Left 4 Dead's survivor bots single out rescuing incapacitated players as the hard problem, with predictability and trust as explicit goals. The AI crew will have a small, dependable vocabulary: **Stay close · Hold here · Help them · Follow my route · Return to the raft.** They say what they intend ("Going for June." / "I can't reach you from this side." / "Clear that rope and I can get across." / "I'm staying on the dry ledge."), so a delayed rescue reads as understandable rather than broken. Pulling someone up from full Drift uses the rescuer's line from `crew.js` ("You told me not to let you stay.").

### Playing well grants access, and takes you deeper (implemented)
A sector with a signal rating of 1200 or more earns a **maintenance override** (press O at a locked gate) and **full route data** on the terminal, and routes the next sector deeper (+10% threat). Reading a name back also adds a little risk (+5%). Good play helps your objective and pulls you further in.

### The Lifeguard's violation is defined (implemented)
Riding the raft is always permitted. On foot, breaking the posted rule **while exposed to it** starts a warning (a short whistle and a countdown). Getting out of the water, stopping running, or breaking line of sight during the warning ends it. Only after 2.5 seconds does it whistle for real; a second violation brings pursuit, which ends when you break line of sight for 5 seconds. The "no discharge while the lamp is lit" rule is a discrete act, so it applies at once, with the lamp visible and the sign posted.

### Every entity in both modes, adapted

| Entity | Raft | Foot |
|---|---|---|
| Undertow | Still patch ahead; pursuing wake that grips the raft | Pulls you through connected water |
| Lane Rope | Blocks the channel; catches the raft | Wraps you at a water crossing |
| Grout | Grows over targets you need | Spreads and changes passages after a caption warning |
| Marco ("the Caller") | Misleading route advice at junctions, in a crewmate's voice | Draws you away to a throat in the wall |
| Floater | A rescue chance while moving: steer over them (or regret it) | Close inspection and an extraction decision |

### Rescues and headcounts feed the endings (implemented)
Survivors pulled out on the raft or on foot are counted. Names read back at roll call are counted. Leaving nobody uncounted, reading back at least two names and rescuing at least two people opens **Count Heads** at the Main Drain.

---

## 15. The core: Left 4 Dead in the Backrooms

**The moment-to-moment game is cooperative survival:** explore strange places, fight through sudden danger, protect the crew, reach the next Safe Room. The raft is UNDERFLOW's signature; Drift is the threat that belongs to this setting. Names, lore, body horror and endings reinforce that experience; they don't replace it.

### Pacing director (implemented, `src/director.js`)
After Valve's Left 4 Dead director: build intensity, sustain a peak, let it subside, then rest.

| Phase | What happens |
|---|---|
| **Relax** (26–46 s, shorter deeper in) | Nothing spawns. Unease only: distant splashes, machinery you can't reach, a drain gurgling, a chair scraping somewhere above. Scheduled swarms on the raft are skipped. |
| **Warning** (4 s) | A readable cue: a pump changes pitch, movement under the grates, the water level twitches. |
| **Build-up** | Groups arrive every 3–5 s, growing, often from several directions. |
| **Peak** | A few seconds of sustained pressure once intensity tops out (from damage taken and enemies close by). |
| **Fade** | No new arrivals; finish the fight. |
| **Recovery** | Survivors sink back into the grates, supplies drift into reach, the crew reacts (practical, scared, sometimes funny). |

A **crescendo** (L4D's term for a loud action the players choose) forces a build-up: restoring the service circuit is now a 5-second hold (E) that the swarm answers, and getting hit sets it back. Cover yourself, or clear the room first.

### Combat that makes the crew matter (implemented)
- **Blooms swarm:** they arrive in groups from ahead, from the overflow grates on both walls, and from behind the raft; on foot they come from different quarters and spread around you instead of queueing. Every hit reads: a white flash, a squash, a shove backwards, a stagger. Rear swarms chase the raft faster than it moves; hold **X** to turn and fight them.
- **Healing decisions:** field dressings are carried (crafted at the workbench), applied with **H** over a few seconds during which you can't fire.
- **Cooperative function of each entity:**

| Entity | Function in a fight |
|---|---|
| Blooms | Swarm pressure: advance, surround, force repositioning |
| Undertow | Rescue emergency: restrains or drags someone away from support |
| Lane Rope | Separation and obstruction |
| Marco (the Caller) | Misdirection: pulls someone out of a defensible position |
| Grout | Route pressure after a readable warning |
| Floater | A rescue decision that needs observation and protection |
| Lifeguard | Rare escalation from manageable to major |

### The raft is a shared fighting position
Jobs during an encounter: shoot the switch before the junction, clear the rope, protect the rear, break the Undertow's grip, decide on the dock. In co-op, **any player can take any job**, so the team still works when someone is hurt or busy. Solo, they are all yours.

### Backrooms architecture (implemented)
- **Pool halls** (`hall` sections): vast, clean, empty, bright; decks with rows of plastic chairs facing the water, depth markings, pool rules, high observation windows, slides that disappear into walls with no room behind them, and a big window onto another enormous pool where a different raft is crossing. They are beautiful enough to understand staying: Drift rises twice as fast in them.
- **Changing rooms** (`loop` sections): locker banks that run on longer than the building should allow.
- **On foot:** rooms with something in them and nothing to take: three chairs facing a wall; wet sandals at a pool edge; warm folded towels; an open locker numbered 0417 with a folded vest; a radio reading the weather for a town that doesn't exist; a drain that goes quiet as if it noticed you.

### The pool-hall scene (implemented in the Welcome Pools)
The raft drifts through a bright hall of empty chairs and still water. June: the stairway in the upper window should be *below* them. Nothing attacks for a while. Then a lane rope snaps taut, Blooms burst from the grates on both walls and behind, the director goes to a crescendo, and the Undertow takes the edge of the raft. After the dock and the pump room, June unfolds her map: the stairway is drawn where they saw it, in handwriting none of them recognise.

### Drift (rebalanced)
Builds mainly from **prolonged immersion** (the longer you stay in, the faster), **stillness** (six seconds without moving), **separation** (far from the raft), **the dark**, **beautiful spaces**, and entity encounters. A dry baseline is close to zero, so scouting a side room or examining an object stays cheap. When you sit down, the camera lowers until your eyes are nearly at the surface.

### Safe Room payoff (implemented)
The Safe Room is rendered behind its panel: hard white tile, two loud vibrating pumps (with a pump-room drone you learn to welcome), harsh light, a reinforced, barred window onto an enormous empty pool. Pursuit ends; recovery, crafting and route choice are there. And it stays slightly wrong: the maintenance clock advances irregularly, sometimes backwards; an announcement continues through the door; earlier crews argue with each other in layers of graffiti; a map marks a room nobody remembers passing.

### Lore larger than the crew
The Attendant, the Lifeguard, the water system and the architecture behave on their own schedules (the director, the clouds, the repairs, the other raft through the window). The Mars reveal explains what happened to Mars, not what the Backrooms is.

---

## 16. The raft as a movement game

Each influence has one job:
- **Backrooms:** the environment, uncertainty, isolation, psychological horror.
- **Left 4 Dead:** crew relationships, hordes, specials, rescues, Safe Room progression.
- **River-rafting party games:** raft movement, obstacles, hops, alternate paths, cooperative navigation.
- **Arcade rail shooters:** aiming, defensive actions, target locking, branching, audiovisual feedback.

UNDERFLOW adapts mechanics, not content: no names, characters, art or music from any of them.

| Mechanic | Where it comes from | UNDERFLOW version (implemented) |
|---|---|---|
| Side-to-side raft steering, jumps, airborne pickups, marker gates, elevated routes | River-rafting party games | Weighted lateral steering (A/D, left stick) with currents you can read from foam streaks; **Space hops** over low ropes, floating debris and still water; **ramps** (water piled against a lip, foam, chevrons) launch the raft onto **service aqueducts** above the building; Crew Seven ID tags and salvage hang in the air above them; orange **gate markers** reward a clean line |
| Actions change the route | Branching space shooters, light-gun games with rescue routes | **Forks** decided by what you did: shoot the **sluice** control (bypass), protect a **stranded Drainer** (they open a gate further on), beat a **closing bulkhead** (boost), take the **ramp** (upper route); each decision tells you why in plain words |
| Steer and aim independently, evade signalled attacks, return projectiles | Run-and-gun rail shooters | Aim never steers; **Spitter Blooms** telegraph (purple flash, tick) and throw globs: shoot them, steer away, **brace** to block, or brace *as it arrives* to send it back into the Spitter |
| Multi-target lock-on | Rail shooters with homing volleys | **Hold right mouse** and sweep: each lock costs one charge (max 6); release for a linked volley that hits each target twice |
| Cover and recharge | Cover-based light-gun games | **Brace (Ctrl or C)**: duck behind the hull, recharge fast in the cradle, take almost nothing from the front; Undertow, rear attacks and collisions still need other answers |
| Actions become music | Synaesthetic rail shooters | A **pump pulse** on a 100 bpm grid follows the director (quiet in rest, driving at a peak); hits, gates, rope snaps, valves, landings and parries queue tonal accents on the next eighth note, while the shot itself is always instant; as Drift rises the whole mix softens and a consonant pad fades in |
| Forms with different strengths | Rail shooters with transformations | **Raft fits** chosen at the workbench: Light hull (handling, higher hops), Shielded hull (bracing blocks almost everything), Cradle hull (+8 charge, faster braced recharge) |
| Ride photos | Theme-park log flumes | The park photographs you at the top of each launch and in the pool hall; the Safe Room shows the photo, and someone is sitting in your empty seat |

### Pilot and passengers
Solo, you are the pilot. **T hands the raft to Ride Control:** the park steers well, threads gates, avoids debris, lines up ramps and calls the jumps ("Please brace for the splash"), but Drift rises slowly while you let it. In co-op one player pilots; passengers lean, brace, assist the jump and protect the pilot. A coordinated jump is one shared manoeuvre, never four separate impulses, and required routes stay playable with AI crew.

### The twin channel
In a **twin channel**, the crew's raft rides beside yours behind a glass partition with gaps. Blooms gather behind them; cover them through the gaps. If they come through mostly unhurt, Dez patches you an override.

### The Lazy River overflow run (implemented)
A broad hall; water piling against the outer wall. Take the launch and you land on an aqueduct running across the top of the building, with an ID tag hanging over it and a stranded Drainer on a ledge below, working a service door while Blooms go for them. Protect them and they release a gate further on. Then the water slows into a completely silent changing room, lockers in every direction, and one locker holds the supply crate you already picked up upstairs.

### Controls

| Action | Keyboard and mouse | Controller | Touch |
|---|---|---|---|
| Steer / move | A / D (WASD on foot) | Left stick | Left half of the screen |
| Aim / look | Mouse | Right stick | Drag on the right half |
| Fire | Left mouse | Right trigger | FIRE |
| Lock (raft) / scan (foot) | Hold right mouse | Left trigger / Y scans | LOCK / SCAN |
| Scan anywhere | Q | Y | SCAN |
| Hop | Space | A | HOP |
| Brace | Ctrl or C | B | BRACE |
| Use, rescue | E | X | USE |
| Burst | F | LB | BURST |
| Boost | Shift | RB | BOOST |
| Look back | Hold X | R3 | — |
| Recharge | R | D-pad up | R |
| Dressing | H | Select | — |
| Ride Control | T | — | — |
| Paddle (raft) / prod (foot) | Hold V | L3 toggles | PADDLE |
| Patch and pump | Hold G | D-pad down | PATCH |
| Blaster profile | 1–5, Tab, mouse wheel | D-pad right | ⟳ |
| Focus / magnify (Disruptor: acquire) | Hold right mouse | Left trigger | LOCK |
| Shove | Z | Tap B (hold B braces) | SHOVE |
| Ping / radio check | B or middle mouse | D-pad left | PING |

Every key is rebindable in the pause menu (Settings → Keys); paddle and brace can be toggles; steering sensitivity and camera motion (shake, roll, impacts) are sliders. The scan beam stays on Q; on foot, right mouse still scans.

### Boundaries kept
Quiet channels stay; manoeuvres are announced (piled water, chevrons, Ride Control's call) and not stacked on a precise shot and a rescue at the same instant; camera motion is restrained (most of the rocking is in the raft and water); a missed launch gives a playable lower route (louder, darker), not a death.

## 17. The raft as a boat: paddles, air, and the water outside it

Reference points: the timing and shared steering of team rafting games, the chamber damage and field repairs of survival rafting, and the man-overboard rescues of co-op river games. The crew stays at four; none of this adds a seat.

### Paddling (implemented)
Hold **V** (L3 toggles on a controller; PADDLE on touch). The blaster goes down while you paddle: you choose between moving and fighting. One hold is a steady stroke rhythm, so there is nothing to mash. A/D strokes one side and the raft turns harder; S backstrokes. Paddling near a wall pushes off it with the blade instead of scraping the tile. Elsewhere a paddle adds a little speed; in **still water** (the Blue Reservoir section type) it is how you move at all. The pilot has authority: when you shoot instead, the crew paddles for you at a slower pace, and alone, nobody does.

### Air chambers and punctures (implemented: `src/hull.js`)
Four chambers: left, right, front, rear, each with its own gauge on the HUD (a dot while it hisses). Every leak has a cause you can see and learn to avoid: a broken tile edge on a wall scrape, a submerged ladder, a Bloom or Floater, a rough landing on debris, a lane rope dragging. A leak hisses from its side (panned), bubbles rise at the waterline, and the chamber drains over two to four minutes. Effects are physical: a soft side lists the raft and pulls it into that wall; a soft front or rear can't climb a launch lip (the upper route is lost); under a quarter pressure, water comes over the side; two soft chambers and a hard hit turn the raft over. Every scuff and patch stays visible on the hull, and the bench patches from the Safe Room look different from field patches.

### Field repairs and the compressor (implemented)
Hold **G**: listen for the hiss, press a patch kit over it, then pump the chamber back up. Getting hit sets the step back; letting go keeps finished steps. With no kits you can only pump against the leak. Kits come from the workbench (1 part), supply containers, and repair docks. The **Safe Room compressor** seals every open hole with a bench patch and refills all four chambers; it is loud, and something knocks back.

### Choices the damage makes
Patch now (blaster down) or keep shooting; take the upper route or accept the low channel with a soft front; dock early at a repair stop; hold the opposite stick against a soft side's pull. The crew calls these out once each, practically.

### Overboard (implemented)
A hard hit on a soft chamber when you aren't braced, or the Undertow taking the trailing edge, can put you in the water. The camera drops to the surface behind the raft. Swim (W, A/D), kick free when something takes your ankle (Space), and catch the **line** a crewmate throws or the **grab handle** on the rear (E). Drift rises fast in the water. If your crew has been forgotten from the manifest, nobody throws a line: self-recovery or a clear checkpoint failure after about twenty seconds.

### Capsize (implemented, rare)
Once per ride at most. The raft turns over; under it, the light through the hull is the wrong colour and something pats the hull from below. The crew rights it: charge is gone, and a cell, a filter or a dressing may be lost.

### Counterweight (implemented)
When the Undertow grabs the trailing edge, hold a direction to throw your weight against it and shoot the grip (look back with X). Too long and the edge goes under with you on it.

### The paddle on foot (implemented)
Press V on foot: shove a Bloom back with the blade, hook a part from out of reach, or sound the surface ahead (dry tile, knee-deep water, or deep water where something closes on the blade).

### Exploration stops that restore or reroute the raft (implemented)
Each dock has a kind (`dock:repair|water|retrieval|winch` in a sector's ride tokens): **repair** (find a compressor fitting; restoring the compressor refills the raft, issues kits, and powers the gate back onto the slide; a route diagram and a pile of eleven discarded vests are on the platform), **water control** (a pump fuse raises the holding pool so the raft can reach the high outlet), **retrieval** (an optional supply container knocked onto the deck, with patch kits, a filter and a cell), and **winch** (the gate collapsed behind the raft; an eight-second hand winch while the swarm comes). Endless mode picks kinds at random.

### The Lido campsite (implemented)
In the Lido Safe Rooms (sectors 5–7), a bucket toss made from a mop bucket and chair legs: five wooden pieces, a swinging marker, chalk tallies on the wall going back further than anyone has been there. Nothing rides on it.

### Horror on the water (implemented)
A faint hiss in silence when every gauge reads steady; an old patch lifting at one corner; the raft turning slowly while every paddle is straight; the safety line pulled tight into the water with all four aboard; something moving under the flexible floor; the blade striking something soft that moves away, going in to the shoulder without finding a bottom, or being held for a moment; a familiar scrape repeating at the same point on a different slide; everyone stopping paddling at once to listen; a knock from under a fresh patch as you push off.

### The Blue Reservoir (implemented: Lazy River and Filtration Works)
Calm water that needs paddling. A scrape on the left side (a ladder that shouldn't be there) and a hiss; patch while steering for the maintenance platform; an overflow grate Blooms; the Undertow catches the trailing edge and the job changes to counterweight; dock. The platform has a compressor, a route diagram, and discarded vests. Restoring the compressor powers the gate back onto the slide; the raft is firm again with fresh patches, and when you push off, something knocks on the new patch from underneath.

## 18. Arcade decisions, Left 4 Dead's cooperation (implemented)

The hierarchy: the Backrooms sets the world; Left 4 Dead sets teamwork and the rhythm of pressure and relief; rafting sets navigation, balance and attachment to the raft; arcade shooters set the clarity of aiming, firing, defending and deciding. Every arcade mechanic is kept for the decision it creates, on ordinary controls.

### Four profiles and a tool (`src/blaster.js` PROFILES)
| Profile | Job | Cost |
|---|---|---|
| Pulse | accurate shots, switches, weak points; focus magnifies | ordinary charge, which always comes back |
| Repeater | sustained pressure on approaching Blooms | eats the shared reserve fast; heat |
| Scatter | close threats, knockback, clearing a grip on a teammate | reserve; 12 m range; a long cycle |
| Disruptor | splits rope anchors, tears Ballast's growths, interrupts machinery; focus acquires a volley | expensive shots, time to acquire |
| Hook line | catches supplies and Floaters, pulls against a grip, hooks a crewmate's vest, reaches across gaps on foot | the line is loaded for a second: no shooting |

One specialist reserve (shown on the HUD) feeds Repeater, Scatter and Disruptor, so a long Repeater burst leaves less for a Disruptor emergency. The equipped profile is always on the HUD; looking at a crate never turns a shot into a hook throw. Targeted damage changes behaviour: a low shot ruptures a Bloom's buoyant sac and it goes under; splitting a Lane Rope at a wall anchor drops the whole line; tearing Ballast's growths loose exposes its core.

### Telegraphs (Virtua Cop's lesson)
A Bloom about to burst swells, brightens and breathes (a wet inhalation, panned). A Lane Rope announces itself with float segments knocking, then silence. The Lifeguard's chair creaks before the whistle. Ballast's water bulges with a hollow intake before it surges. Undertow grabs start with the intake and end with a rush of water and a gasp. Warnings duck the music and hum so they read over the water; captions say what the sound reveals.

### Arm's length (directional encounters)
A **climber** takes one side of the raft: the raft lists toward it; hold the opposite direction to counterbalance until it slips, then **shove** it off (or Scatter it). Ignore it and it bites the side chamber and may take you over. Shove is dependable the first time and weaker if you spam it (fatigue recovers in a few seconds); it staggers Blooms close in and knocks spitter shots back, and it never disables the Lifeguard.

### Rescues change the route (House of the Dead 2) and observation (Silent Scope)
In the reservoir and some pool halls, a person hangs by a restraint beside a far maintenance window. Focus (right mouse) resolves it and reads it ("a strap at the wrist"); shoot the strap. The survivor opens the service spillway: the dock's service gate is open without the circuit, and supplies come down. Focus also reads Floaters: breathing (a survivor) or not breathing (turned toward the light).

### Tug-of-war (camp games, as fiction)
The Undertow takes a crewmate over the side. Hold E to keep the line in the band (too slack and they go under; too tight and it slips through your hands), and shoot the grip beside them (Scatter clears it fastest; the hook can catch their vest). Fail and they come back up in the other channel, cold and quiet (hurt until the next Safe Room).

### Ballast (a rare, defeatable heavy threat)
A submerged mass tangled in old life vests and hose, anchored between the walls. It holds the raft in the room and pulls it toward itself; every few seconds the water bulges and it surges down its lane. Tear the three anchoring growths loose (the Disruptor is made for this), then shoot the exposed core. In the Wave Hall's pool hall and the Rooftop's reservoir; 40% of endless reservoirs. The Lifeguard stays the unkillable enforcer.

### The crew covers you (AI crewmates)
While you paddle, patch, swim, pull a line or lie incapacitated, the crew fires on the nearest Bloom from the raft (faster, and on your pinged target first). Forgotten crew don't shoot; alone, nobody does. Crew status is on the HUD roster with shapes and words, not only colour: ● present, ✕ grabbed, ◐ drifting or hurt, ▲ down.

### Pacing that watches everything
The director counts a rescue, a repair, a climber, a crewmate in the Undertow, a player in the water or down, Ballast, a flume and water over the side against its pressure budget: while something else is the crisis, no new swarm lands; swarms shrink while you are busy. Recovery starts only when the fight is over and nobody needs rescuing. It changes the spacing of peaks, not enemy strength. In the crew's vocabulary: observation, anticipation, pressure, resolution, recovery. The Attendant speaks in the quiet after danger ("Your party has qualified for the lower attractions.", and after a rescue, "Thank you for returning your passenger to the designated seating area."), not during it.

### Conditions and rescues
| Condition | You can | The crew / you alone |
|---|---|---|
| Undertow grip (raft trailing edge) | counterweight, look back and shoot | hook line pulls against it |
| Incapacitated (first fall per checkpoint) | fire Pulse at reduced power from the floor | a crewmate reaches you in 5 s and takes 4 s; alone, hold E for 5 s; hits set it back; 30 s to bleed out; the second fall is death |
| Overboard | swim, kick, grab line or handle | a thrown line; alone, the handle or a clear checkpoint failure; the Lifeguard counts a swimmer |
| Overwhelmed by Drift | hold Space | (on foot, June: lift her out) |

A rescue or revive gives three seconds' grace from immediate recapture.

### Communication you can trust, so deception is fair
Crew speech over the radio is labelled with the speaker and RADIO. Speech in the environment is unverified and reads the same whoever said it: "VOICE · LEFT PASSAGE". The Caller (Marco) borrows a crewmate's words, never their radio, never the roster, never a status marker. **Ping** (B) marks what you aim at for the crew; within half a minute of an unverified voice it becomes a radio check, and the real crewmate says it wasn't them. Pings, captions and authored voices carry it all; no microphone needed.

### Friendly fire
The crew is not physically targetable in this build: seated on the raft they are protected, and a shove never knocks a teammate overboard. When AI crew walk the levels, modest friendly damage on foot (with rebukes), none while seated, and a strict expert setting.

### Exploration
- **Fumes are a condition, not a clock:** filters drain only in marked stagnant pockets (a faint green haze over the water), in the vapour a pump releases for forty seconds when you start it, and everywhere over water in High Water. Quiet exploration has room again.
- **Pressure diagram puzzle** (water-control and repair stops): three valves A, B, C in separate rooms; the diagram at the dock gives the order, which changes every run. A wrong valve dumps the pressure, loudly. The diagram shows four pumps; the fourth is only ever seen through a submerged window, in a room that occupies the corridor you just walked.
- **Architecture that carries encounters:** every depth marker reads 1.2 m, including the one beside a bottomless shaft; a pool clock that advances only while nobody looks at it; the same maintenance notice in every attraction, one more name each time (the last one is yours).
- **Grout leaves evidence:** fine ceramic clicks, then a grind and a caption when a passage changes. It never removes the route back; it can cut the thread.
- **The thread (the Labyrinth):** a line paid out from the raft behind you on foot, so you can always find the way back. A 3,000-year-old maze story: tie the thread at the door. A note in the Lazy River Safe Room says so in your handwriting.
- **June in the water** (sectors 5–8): after a fight she stops answering, and you find her sitting in the warm water, looking relieved. Hold E to lift her out. Board without her and the count closes over her. Either way, the Attendant thanks "all three guests" for staying together.

### Character, humour, story in objects
Each crewmate notices a different kind of thing (Mars people, Dez machinery, Tubs ride behaviour, June space). Banter happens only in the quiet and stops mid-line if anyone is grabbed. Across the attractions: a maintenance sheet with four signatures and four mugs; a roster of three beside a photograph of four; "I don't remember her name. I remember how she knocks."; graffiti that reads "EVERYBODY CAME BACK." and, below it, "Everybody we could remember."; in the reservoir Safe Rooms, a photograph of the observation gallery on opening day with your raft in it, patches in the same places.

### Raft fittings
Three positions on a fixed footprint, fitted only in Safe Rooms: reinforced bow housing, better retrieval gear, emergency pressure reservoir, compact filtration unit, sealed storage. Field patches give basic control (a hand pump tops out at 70%); a compressor does the rest. Brace before a landing and the hull takes it.

### Expeditions
Campaigns open with a Pumphouse dispatch sheet (route, crew, last maintenance status, a photograph that matters later). Endings, deaths in challenges and custom routes show an expedition record: crew recovered, teammates freed, revives, repairs (and how many under pressure), supplies hauled in, survivors, names read back, routes discovered, then the score.

## 19. Variants, custom routes, and Versus

- **Challenges** (menu → CHALLENGES): Pump Defence (hold a maintenance chamber through five loud pump cycles; the pump stalls if you leave it), High Water (endless with the levels up: harder threats, tidal floors permanently under, fumes over all water), Last Departure (one attraction to its Safe Room in four minutes), Shared Expedition (a seeded run whose link is copied for sharing; encounters still answer to how you play).
- **Route builder** (menu → ROUTE BUILDER): write a ride as section tokens (`channel lazy:valve reservoir:ballast junction:public|overflow fork:rescue dock:repair`), choose an attraction's look and rules, ride it, and copy a link (`?route=…&base=…`) that opens the same route for anyone. Unknown tokens are rejected with a message.
- **Versus (not built):** four Drainers against four players controlling Undertow (exploit an exposed position), Marco (redirect attention with authored calls), Lane Rope (a temporary obstruction) and Grout (alter a limited part of the route), then swap. Rules to hold: entities spawn out of sight; attacks don't overlap on one Drainer; Grout can never remove every exit; scoring compares objectives, legitimate progress and extraction on matched routes; the cooperative director's recovery rules are replaced by a competitive ruleset. It needs the online layer, which does not exist yet.

### Reference notes
Redbeet's *Raft* and *Raft Survival Simulator* (published on the Nintendo eShop by GAMETOTOP.CC) are separate titles. Steam Workshop custom campaigns are a *Left 4 Dead 2* feature. Melee fatigue was added to the original *Left 4 Dead*'s Versus mode in a 2009 update, not as a universal rule. The Backrooms Wiki has several canons; UNDERFLOW keeps its own continuity (Drift, the Attendant, the Pumphouse, the Lido and its own entities) rather than importing a roster.

## 20. Sector problems: the Yellow Channel loop and the Last Drain surge (implemented)

- **Welcome Pools (the Yellow Channel):** restoring the circulation opens the service gate. Its marked outlet, "CIRCULATION OUTLET", runs back into the pool hall you already passed: the same chairs facing the same wall, the stairway now on the other side. The crew works out that the whole circuit is a loop.
- **Filtration Works (the Last Drain):** starting the compressor triggers a pressure surge. Someone has to stay at the mechanism for twenty seconds while the swarm comes; leaving stalls it. Hold it, and the escape route stays exposed and shallow. Board before it passes, and the line lets go and the way out floods behind you.

## 21. Fear: dread, omens, creatures (implemented)

The facility maintains itself for people who are becoming something else. Fear here is built from three layers that are kept apart on purpose:

- **Dread, separate from pressure.** The director (`src/director.js`) has a dread value raised by omens. `omen(amount, hold)` holds the pacing: while held, relax and warning do not progress and no buildup wave spawns, so an omen is never immediately "paid off" by a swarm. After a discovery the HUD hushes the Attendant and banter (`hud.hush`), leaving room for a crewmate to say "did you hear that?". Lines a beat depends on are forced through the hush.
- **Omens on the raft** (`ride.js`): banks of lights dying in order toward you, a platform crash, footsteps on the deck above, something rubbing under the hull and then shootable beneath it.
- **Omens on foot** (`explore.js`): the service door (handle turns, it opens a crack, water runs out of the keyhole, or it is forced: hold E to keep it shut and it stops pushing, then is found open later with wet prints; leave it and Blooms come through), lights going out toward you, an extra footstep, a drain breathing, your own radio call echoing back, your name.
- **Blooms** wait collapsed on the floor like dropped vinyl, breathe when you are near, fill unevenly (one side chamber, the body, the other chamber), then lunge. A hit that doesn't kill collapses a chamber.
- **The locker.** One supply locker can hold someone folded inside, breathing, holding the cell. Not an ambush. You can close it; later it stands empty.
- **The Lifeguard** watches the pool, not you. It turns only when you give it a reason, in a fixed order the player can learn: the lamp flares, the head turns, the hand comes up to the whistle, then the whistle. After a second violation it hunts: pursuit while it sees you, a search where it lost you (turning its head), sometimes coming through the service door to cut you off, then giving up and climbing back. Gunfire it can't see brings it down to look once it has already whistled. If it reaches you it grabs your vest strap and drags you toward the water under its tower: tap SPACE to twist free, burst it, or a crewmate within reach pulls you loose. It moves slower than you walk; breaking line of sight works.
- **Drift in stages:** the glove strap bites into a filling glove (30+), the knuckles round off (50+), and past 55 the hand breathes on its own. The crew says what they see at 38, 55 and 72.
- **People.** A lucid survivor in the water asks you not to pull quickly: hold E to bring them out slowly. In the Safe Room they ask for a towel. Locker 0417's contents are "returned" by the Attendant while you are still carrying them.
- **Wrongness, mostly ordinary:** a vest with six armholes, a ladder whose rungs close up toward the floor and continue into it, a bench worn into four hollows, a filter card that calls removing a guest "cleaning", a chair splinted for someone who no longer bends, POOL DEPTH 1.2 M / RECOVERY DEPTH 18.6 M, and a notice asking you to report guests who have stopped casting a reflection.
- **The Closed Wave Pool benchmark:** an empty lifeguard chair with wet prints going up its ladder; look away for a few seconds and its lamp is on and it is occupied, facing the pool. A wave display advances over flat water. Something crosses under the surface against the waves. From the Safe Room window, four disturbances walk your route again, one waits where you stood still longest, then a fifth follows.

Deaths never raise danger. Tests: `omens.cjs`, `doors.cjs`, `hunt.cjs`, `dread.cjs`. None of this has been checked for whether it is frightening; that needs people (`docs/PRODUCTION.md`).

## 22. The Closed Wave Pool as a level, the helm, and borrowed behaviour (implemented)

**One recognizable place.** The chapter is a wave basin with rooms around it that you keep seeing from new angles: the arrival dock (south), the basin (centre, the short way across, the Undertow in it), the raised maintenance gallery (north and east, dry, with a tiled parapet and rail over the water), the changing-room annex (west: the pressure key, lockers, obstructed sightlines, dormant Blooms at arm's length) and pump control (north, with an observation window onto the gallery). Round tiled columns stand in the basin. The Lifeguard's tower stands in one of two places, different between expeditions.

**The inspection lamp.** This Lifeguard's rule is the lamp: it turns slowly round the basin and lays a pool of light on the floor, the gallery included. Standing in it starts the usual sequence (lamp, head, hand, whistle). You time the gallery between passes, or wade under it.

**The water decision: a safer walk back, or a safer raft.** At pump control the machine states both outcomes before you commit. *Drain the basin into the exit channel*: the water goes, the Undertow with it, and you walk back across dry tile; the raft leaves on the discharge, fast and rough. *Keep it circulating and open the bypass*: the basin stays deep and turns, carrying you sideways as you wade; the raft leaves calm. The result is physical and stays visible all the way back.

**Pump control: overlapping jobs.** Turning the diverter takes twelve seconds. Let go of E and the crewmate posted at the machine keeps it turning, slower, unless a Bloom is on them; another watches the approach, another the window. While attention is on the machine the room gets loud, the service door's handle moves, and past halfway the lamp leaves the tower and comes round. Finish it or reposition: the objective never changes.

**The helm.** One helmsman at a time, named in the raft panel (`HELM · YOU` / `HELM · DEZ`). `Y` hands the helm to a crewmate who is able (not grabbed, hurt or forgotten); they steer for the line and call the jumps while you aim. Steer hard yourself and it is yours again. This is separate from Ride Control (`T`), which is the facility steering and costs composure. Keyboard only so far: no controller binding yet.

**Borrowed behaviour (uncanny).** The facility has learned what people do, less certainly why.
- *The Lifeguard's rounds.* In the sectors where it sits a chair, it periodically climbs down with a clipboard and inspects the pool ladders: both hands to the rails, a foot on the first rung, its weight onto it, a note. The last ladder was removed; four mounting holes remain. It performs the whole inspection there anyway. On its rounds it only looks where it is going: stay behind it. In front of it, it stops, its head comes round, and you have about two seconds to get out of sight.
- *The voice with a habit.* Marco's call sometimes has a body: a figure by a far wall performing one of your crew's habits where it makes no sense (Tubs bracing a hand on a raft edge that is not there; June reading a wristband; Dez wiping a tool; Mars turning to count the last person), on an exact two-second loop. Walk up to it and it is gone. It is never an authenticated teammate.
- *"Was that right?"* A survivor you pulled out slowly sits on the Safe Room bench. The first time you do anything at the sheet, they repeat your blaster check with empty hands, then stop and look at them.

These use the prototype figures (boxes and capsules). The effect the brief describes needs a believable human baseline (faces, hands, clothing contact, authored animation) so that a wrong performance reads as intended and not as unfinished art; that work is not done, and nobody has been asked whether these read as disturbing or as rough. Tests: `level.cjs`, `uncanny.cjs`.

## 23. Score, FLOW, Service Credit, and the raft as an arcade body (implemented)

The rail controls locomotion; the player controls attention, aim, survival and line. Scoring exists to make that mastery visible, and it stays in the campaign.

**Two layers** (`src/score.js`, pure and unit-tested):

| | What | Rules |
|---|---|---|
| Expedition Score | Never spent. One shared number for the crew | Every award is its base value × FLOW |
| FLOW | ×1.0 to ×8.0 | Rises with consecutive skilled actions (a kill, a precise shot, a clean gate, a save). Decays only on the raft while the director is pressing and nothing skilled has happened for four seconds. **Frozen on foot and in quiet stretches**: silence and exploration never cost it. A hit knocks it down in proportion, never to zero; a crewmate going down halves the excess |
| Service Credit | Spendable | A tenth of each award's base value, unmultiplied. Spent at the Safe Room's emergency cabinet (dressing 300, cell 250, patch kit 400, filter 250) |

The "signal rating" that earns a maintenance override is the unmultiplied sector total, so FLOW does not change that balance. High performance never makes the director spawn more.

**Presentation.** A feed of up to three lines under the reticle (`+150 PRECISION`), gone in under two seconds. The score and FLOW sit with the facility readouts and rest when nothing is happening. Settings → Interface → Score display: 0 immersive (never shown), 1 standard (wakes with the action), 2 arcade (always). While a room is hushed after a discovery the feed says nothing; the score is still recorded.

**Debrief.** At each Safe Room: sector score, accuracy, max FLOW, crew saves, guests rescued, raft condition, the expedition total, and a grade S to D. The weights depend on what the sector asked: a rail sector weighs score and accuracy; an exploration sector weighs crew and raft condition, so a careful walk is not marked down for not being a speedrun. The Attendant gives its verdict as a qualification ("Your party has qualified for advanced circulation").

**Rafting is scored, not only shooting.** PERFECT LINE through the centre of a gate (a pass between the buoys still counts, for less); CLEAN HOP over debris or still water; CLEAN LANDING after real air time, off the walls, on a firm stern; NEAR MISS past debris with a hand's width to spare; AIR SHOT for a kill while airborne.

**The raft as an inflatable body.**
- A hop pressed up to 0.14 s early is held and used the moment the raft can leave the water.
- The hull is a spring: it stretches as it leaves, flattens and rebounds on a landing, folds against a wall on a scrape. Soft chambers make the spring slow and the tube visibly flatter. The camera compresses with a landing (scaled by the camera-motion setting).
- The view opens a little with speed and closes under braking; focus overrides both.

**The blaster's hand feel** (`FEEL` in `src/blaster.js`). Each profile has its own kick, recovery, muzzle rise and wander: Pulse is sharp and settles at once; the Repeater rattles sideways more as it heats; Scatter shoves and takes a long moment to come back; the Disruptor releases and settles slowly. Only the tool moves; the reticle does not, so aim stays dependable.

**On foot.** Movement has a little weight: quick to start, quicker to stop on tile, and it carries on in water.

**Attack slots.** On foot only two Blooms (three from the Filtration Works on) may commit at once. The others circle just out of reach until a slot frees. Five around you is a threat you can read, not five unavoidable hits.

**Hesitation.** Standing still for a while raises a hesitation signal; moving lets it fall. It only shortens the wait for the next omen. It never spawns anything: confusion is meant to be frightening, not punished. Omens rotate by kind (door, light, presence, sound, voice), so the same kind never comes twice running.

**Feel signatures: what is built and what is not.**

| Action | Input | Tool / body | Camera | Sound | World | Not built |
|---|---|---|---|---|---|---|
| Fire (per profile) | immediate | per-profile kick, rise, wander | none on the reticle | per-profile shot | beam, spark, target reaction | haptics, hit-stop |
| Hop | buffered 0.14 s | hull stretches | rises | splash | ripple | crew pressing together (needs co-op) |
| Landing | — | hull flattens, rebounds | compresses | splash, accent | ripple, CLEAN LANDING | crew rebound animation |
| Scrape | — | hull folds, chamber damage | shake | scrape | — | directional jolt |
| Shove | immediate | weapon thrust (existing) | — | contact | knockback | haptics |
| Walk / wade | immediate | — | step bob (existing) | tile, metal steps | — | wet-tile and deep-water step sounds |

**From the same briefs, not built:** a free-aim reticle envelope on the raft (controller aim help and threat markers came later, section 28; early extraction, section 29); score-qualified routes beyond the existing override; per-player contribution lines (there is one player); leaderboards. Token lines, drops, assessments, the Lost & Found and haptic patterns came later (sections 25 and 27). Tests: `tests/unit/score.test.js`, `tests/score.cjs`, `tests/feel.cjs`. Whether any of this feels good is a question for people playing it.

## 24. Things worth picking up, and the work lamp (implemented)

**Rule:** power-ups make you more capable, collectibles make you more informed, and a few artifacts make you wonder whether those are different. Everything is a physical object; nothing glows every five metres.

**Per dock** (`src/collectibles.js`, pure and unit-tested; placed by `explore.js`): at most two collectibles the ledger does not already hold and one power-up, on cells away from the dock, the same on a retry.

| Set | Items | What it is for |
|---|---|---|
| LOST GUESTS | 6 wristbands | The same number decades apart; a pass dated tomorrow; one with your number while you wear yours |
| THE HEADCOUNT | 5 records | The facility's counts disagree with each other. With all five the ledger can say it: the facility has counted five since before you arrived, and there are four of you |
| DRY THINGS | 4 objects found dry under water | Each takes 20 Drift off you, and a crewmate asks why you look better. Counted in `state.dryCount`; nothing reads that count yet |
| DUCKS | 4 | Relief. One is warm; one is always facing you |

A collectible is worth 250 (a dry thing 750) to the Expedition Score, is written in the field ledger and the journal's COLLECTED line, and persists across expeditions. Completing a set pays 2,500 once.

**Power-ups**, taken as objects: an OVERCHARGE CELL (25 s of fast recharge, then the tool runs hot), a DRY PACK (45 s in which Drift does not rise out of the water), a PRESSURE CANISTER (fills the softest chamber when you board). What is active shows as bracketed stamps under the player's vitals: `[DRY 31] [CANISTER ×1] [LAMP UV 82%]`.

**The work lamp.** `L` cycles off, white, UV. `K` sets it down or picks it up. White lasts about four minutes, UV two and a half; it recharges at the raft. Light is a decision, not a chore:
- a lit lamp near you counts as light for composure (the dark raises Drift);
- under UV a dormant Bloom on the floor shows what it is, and painted depth markings show without the scan beam;
- a lit lamp in your hand lets the Lifeguard see you from further; in the dark with it off you are harder to see;
- a lamp left burning on the floor draws Blooms that have not committed to you: a decoy, at the cost of your light.

**Not built from these briefs** (the lighting circuit in section 26 came later): reflections and shadows as puzzle elements, perspective alignment, private versus shared hallucinations (one player), warm tokens and unclaimed vests, score-qualified side rooms for collectibles. The lamp's cycle has a controller button on foot (section 30); setting it down is keyboard only. Tests: `tests/unit/collectibles.test.js`, `tests/finds.cjs`.

## 25. The raft's arcade layer (implemented)

- **Token lines.** Every half-minute or so, away from rooms, seven worn-yellow service tokens lie on the water in a curve from where the raft is to where the line wants it: the next gate if one is coming, otherwise a lane of the channel. Each is worth 5 Service Credit; taking all seven is a FULL LINE. They are level design drawn on the water: the line tells you to start moving now.
- **Drops.** After a fight the facility sometimes lets something go downstream (45% of recoveries, outside rooms). Drive through it or shoot it. DOUBLE FLOW: everything pays twice for thirty seconds. FULL CELL: the tool is full and cool, plus a cell. MAX PRESSURE: every chamber that still holds air goes to 100. SYSTEM PURGE: every drain in the channel lets go and what is in the water is dispersed. Each has its own colour, sound and one line from the Attendant.
- **Assessments.** Once a sector, about twenty seconds in, the Attendant selects your party for a circulation assessment: reach the next dock as firm as you are now, reach FLOW ×3, or take two perfect lines. Participation is voluntary. Passing pays 1,500 (multiplied by FLOW) and 150 credit; only the hull test can be failed, and failing costs nothing.

Not built: token lines that deliberately lead somewhere wrong, drops on foot, assessments with stranger conditions (darkness, a named profile), and "three guests have qualified" when there are four. Test: `tests/arcade.cjs`.

## 26. The lighting circuit: light decides which room you are in (implemented)

Every enclosed dock has a **lighting relay** on a wall a short walk from the raft, labelled `LIGHTING · MAIN · EMERGENCY`. Use it (E) or shoot it. It switches the whole dock between two authored states:

| | Main | Emergency |
|---|---|---|
| Light | The fixtures | Fixtures out; a few dim coral strips where they were. Shapes, not distances |
| Architecture | One particular wall between two rooms is a wall | That wall is a doorway, with a service cache in it (a cell and 100 credit) |
| Cost | — | The dark raises Drift unless you carry the work lamp |

Nothing animates. The light changes and the room is different; the crew says so once ("That was a wall. I had my hand on it."). The first time through the doorway is a ROUTE FOUND. The relay is never placed beside the doorway it opens, so you switch it and then go and look. You cannot switch back to main while standing in the doorway. The base map is never altered, so the dock stays solvable under either state.

This is the first **facility state**; power loss (section 31) is the second and high Drift (section 32) the third. Not built: flooded and remembered states, a bridge that exists only under one circuit, reflections and shadows that disagree with the room, perspective alignment, and rooms that differ per player. Test: `tests/circuit.cjs`.

## 27. Automatic resolution, controller vibration, and the Lost & Found (implemented)

**Automatic resolution** (`src/autores.js`, pure). The game averages frame time over one-second windows. Two consecutive windows more than 15% over the target (16.7 ms, or 33.3 ms on the 30 FPS profile) lower the internal render scale by 0.1; five consecutive windows under 80% of the target raise it by 0.05. The floor is half the tier's own pixel ratio. A single frame over 250 ms is ignored as a hitch. The scenes apply the scale to the renderer without rebuilding anything, a new scene starts at the scale the last one settled on, and the performance overlay shows it. It is off on the software-rendering tier (already at its floor), while paused, and can be switched off in settings. Changes are written to the playtest log.

**Controller vibration** (`src/haptics.js`). Each action has its own short dual-rumble pattern: the four blaster profiles differ in length and weight (the Repeater is a tick, Scatter a shove), and there are patterns for taking damage (scaled by the hit), a clean hop, a clean landing, a near miss, a facility drop and the Lifeguard's grab. A weaker pattern never cuts a stronger one short. Strength is a setting; zero is off.

**The Lost & Found** (`src/collectibles.js`). A hatch in the Safe Room's emergency cabinet returns one item per visit for 150 Service Credit. You do not choose what comes back: usually a supply, sometimes more credit than you paid, sometimes one wet sock, rarely a dressing with your handwriting on it. No outcome costs anything but the fee, because a Safe Room is safe.

Limits: the resolution controller is tested as logic and the scale change is tested on the canvas, but it has never run its loop on a real GPU, so the thresholds are unproven. Vibration has not been felt on a physical controller; the tests check the patterns and that the request is made, not that anything shook. Not built: an automatic quality tier beyond resolution (shadows, lamps, bloom), trigger-specific vibration (ambient occlusion, haze and eye adaptation came later, section 34), and patterns for most on-foot actions. Tests: `tests/unit/autores.test.js`, `tests/unit/haptics.test.js`, `tests/unit/collectibles.test.js`, `tests/score.cjs`.

## 28. Controller aim help and threat markers (implemented)

Both are screen-space geometry in `src/aim.js` (pure).

**Aim help, controller only, on the raft.** When the reticle is within a small radius of a target, the shot bends part of the way toward it: strongest on the target, nothing at the edge of the radius, never a snap and never across the screen. The right stick also slows as the reticle crosses a target, so a thumb can stop on it. The reticle is drawn where the shot will go, so the help is visible. One setting scales both (0 is off). Mouse aim is untouched; touch keeps its own snap.

**Threat markers.** A Bloom that has noticed you, is within 12 m and is outside the view gets a wedge on the rim pointing toward it; one directly behind is drawn at the bottom. At most three, the nearest first, larger when closer. Blooms that have not noticed you get no marker: the HUD reports what is coming, not what is waiting. A setting turns them off.

Limits: the assist strengths are untuned guesses, never tried with a physical controller. Markers cover Blooms and thrown projectiles on the raft (a projectile outranks anything merely approaching) and, on foot, a Bloom that has committed to you within 10 m; ones still circling get none. The Lifeguard gets one while it is pursuing you from out of view, and outranks the rest; while it only watches, does its rounds or searches, it has none. The Undertow and other entities have no marker. Tests: `tests/unit/aim.test.js`, `tests/arcade.cjs`.

## 29. Early extraction (implemented)

You could always board the raft at a dock without restoring its circuit; now it is a stated decision. The boarding prompt says what leaving costs before you commit: the bypass exit instead of the service gate, everything earned is kept, and the sector grade stops at B. The debrief adds an EARLY EXTRACTION row and the Attendant notes that the party left before the attraction concluded. A poor grade is not raised by it. Going back and restoring the circuit before boarding clears the mark.

Not built: extraction anywhere but the moored raft, a countdown or pursuit that makes leaving hard, partial payouts tied to how much of the objective was done. Tests: `tests/unit/score.test.js`, `tests/unit/memory.test.js`, `tests/score.cjs`.

The facility remembers it. On the next expedition a dock you left early (and have never restored) carries a notice by the mooring: YOUR PARTY STOPPED HERE, PLEASE CONTINUE, with the visit number. It changes nothing about the map or the difficulty, and it goes away once the circuit has been restored.

## 30. The survey map (implemented)

On foot, M opens a small map in the corner (`src/survey.js`, pure). It is drawn only from where you have stood: the cell you are in and the open cells in the four straight lines from it, up to two cells, stopping at a wall. Walls appear only where they border something seen. It shows you with your facing, the raft, and the service panel and the gate once their cells have been seen. Nothing on it is ever false, so it is the one thing on a dock that can be relied on.

Seeing 85% of the cells you can walk to completes the survey: a SURVEYED award once per dock, a line in the field ledger. The map stays open while the world keeps moving. It is saved with a resume.

Not built: the map on the raft, marks for finds or hazards, and the map disagreeing with a room under a different facility state within one visit (the lighting circuit's hidden cell is simply drawn once you have stood by it). Tests: `tests/unit/survey.test.js`, `tests/finds.cjs`.

On a controller every button has a job on the raft, so on foot the two with nothing to do there are reused (`src/padmap.js`): look-back (R3 by default) opens the map and patch (D-pad down) cycles the work lamp. Setting the lamp down has no controller button. The tables are unit-tested (`tests/unit/padmap.test.js`); no physical controller has been used.

## 31. Power loss: the relay trips (implemented)

The lighting relay takes three throws. The third brings a warning (the housing is hot); the fourth does not switch anything: a breaker lets go and the dock loses power. The fixtures and the emergency strips are both out, every lit sign goes dark, and the relay refuses to switch. Blacklight lettering was never on the circuit, so it is the only writing left. The architecture stays as it was at the moment the power went: if the doorway was open it stays open. Your work lamp, the Lifeguard's lamp and anything that glows on its own are unaffected. The dark raises Drift as it does under emergency light.

To bring it back, start a reset at the relay (E) and stay there for four seconds; step away and it winds back. A reset restores the circuit that was live, clears the throw count and is scored once as machinery. The crew reacts the first time, and the ledger notes that the relay trips on the fourth throw. A blackout is saved with a resume.

**Blooms hunt by your light in it.** With the power out, a Bloom that has not committed to you and is more than a few metres away loses you while your work lamp is off or set down somewhere else: it drifts slowly to where it last had you and waits there. Carry the lamp lit and they find you again, from farther than usual. One already on top of you is not fooled. So in a blackout the lamp is a trade: light keeps Drift down and tells them where you are; a lamp left burning on the floor still draws them to it.

It is caused only by the player and warned one throw ahead. The Lifeguard and other entities do not change behaviour in a blackout. Not built: a blackout the facility causes itself, different sound under power loss beyond the trip and a brief duck, and signage that changes meaning rather than only going dark. Test: `tests/circuit.cjs`.

## 32. High Drift: the signs are about you (implemented)

On foot, when Drift reaches 70 the lit signs on the dock stop being about the building. Each one that is allowed to change is swapped, in place and without any animation, for a panel in the same official lettering that reads GUEST and your wristband number, then PLEASE REMAIN, then YOU ARE EXPECTED, with as many lines as the sign it replaced. They change back when Drift falls below 55. The crew says it once ("Don't read the signs. Read the map.") and the ledger records it.

The rule for which signs may change is in `src/driftsign.js` (pure). Anything you need to read to solve a room never changes: valve and pump labels, the pressure diagram and its order, the lighting relay, locker and plate numbers, and the notice the facility leaves after an early extraction. Handwriting and blacklight paint are not the facility's and do not change either. So the state unsettles a room without withholding information, and the survey map stays right throughout.

Not built: the state changing sound or architecture, signs that give wrong directions (deliberately: that would be unfair without a way to check), the same state on the raft, and any difference between what you and a crewmate see. Tests: `tests/unit/driftsign.test.js`, `tests/circuit.cjs`.

## 33. The survey is remembered (implemented)

A survey is kept only if it gets back to the raft: boarding saves it in the facility's memory (campaign only). On the next expedition the same dock's map opens with that survey already on it as a separate layer, drawn `∘`, with a legend line. It is never mixed with what has been seen this time and does not count toward completing the survey; a remembered cell becomes an ordinary seen cell when you see it again.

If the facility has changed the dock since, the layers disagree and the map shows it: a remembered cell that is a wall now is drawn `?`. The first time the open map shows one, a caption says so and the ledger records it. So the map can contradict the room without ever being wrong about either: it shows what the last crew walked and what this crew has seen, and labels which is which.

Limits: a dock whose map changed size between expeditions starts blank; a survey is lost if the crew does not board (a death, a spillway); only the most recent survey of each dock is kept, merged with what it had remembered. The facility's authored variations rarely turn floor into wall, so the `?` is rare in play; the browser test produces one by marking a wall as remembered. Tests: `tests/unit/survey.test.js`, `tests/finds.cjs`.

## 34. The render chain: tiers, ambient occlusion, haze, eye adaptation, the post chain, a benchmark (implemented)

**Tiers** (`src/tiers.js`, pure; `src/quality.js` applies them). LOW is the light tier for software renderers. MEDIUM, HIGH and ULTRA add a depth target and progressively more: samples, pixel budget (the device ratio is capped per tier), lamps, bloom, ambient occlusion, haze and its step count, and post passes. The setting is Auto, Low, Medium, High or Ultra; `?quality=` in the URL overrides it. **Auto** starts on HIGH with a GPU and LOW without, and works with automatic resolution (section 27): when the render scale is already at its floor and frames are still long for four seconds it drops a whole tier; after thirty very good seconds at full scale it climbs back, never above HIGH. Lamps, bloom, AO, haze and the post chain change on the next frame; samples, shading and the depth target change when the next scene is built.

**From the engine, on tiers with depth:** ambient occlusion (HIGH and up) and one haze volume that follows the eye, tinted with the sector's fog colour. The engine scatters only a directional light through fog, so indoors the haze reads as depth and damp air, not beams from the fixtures.

**Eye adaptation** (`src/exposure.js`, pure, every tier). The light reaching the eye is estimated from the frame's own light list; exposure follows it between 0.85 and 1.45, slowly into the dark and only part of the way, quickly back under light.

**The post chain** (`src/postchain.js`, pure text and numbers; the engine runs up to four custom passes on the finished frame):

| Pass | Tiers | What it does |
|---|---|---|
| optics | HIGH, ULTRA | Light shafts: each pixel gathers glare along the line toward the brightest fixture on screen, so the lamp over the water spills light through the haze (the source is chosen from the frame's own lights, `shaftSource`; a setting turns it off); water beads on the lens that bend the view (after going overboard, capsizing, or a hard landing; they run off over a few seconds); chromatic fringing toward the corners that grows with Drift and with a hit; horizontal streaks off bright fixtures; lens dirt that shows only where there is glare |
| grade | MEDIUM and up | A filmic contrast curve; a teal-shadow, warm-highlight split tone; colour draining toward grey-green with Drift; a blue-green tint under water; red closing in from the edges when hit and pulsing at low health; and wet tile on the raft route, a darker band and a pale mineral line on walls just above the water, found from depth |
| fxaa | HIGH, ULTRA | Edge smoothing |
| finish | MEDIUM and up | A light sharpen, then dither so dark gradients do not band |

"Reduce flashes" softens the red; the distortion setting removes fringing and beads; one setting turns the whole chain off. Film grain, vignette, saturation, temperature and bloom were already the engine's and are unchanged.

**Benchmark.** `?bench` (or `?bench=30` for seconds) rides the first attraction on Ride Control and then shows the GPU, tier, resolution, render scale, average, median, 99th-percentile and worst frame time, and any errors (`src/bench.js`); the result is also in the playtest log.

Limits. All of this has been drawn only by a software renderer in headless tests: the passes compile and run with no renderer diagnostics, and I compared screenshots with the chain on and off, in high Drift and at low health. Nobody has looked at it on a real GPU, the strengths are first guesses, and the cost on real hardware is unmeasured (`?bench` exists to measure it). From the reference chain, not built: shadow-aware volumetrics (the shafts are screen-space and are not blocked by anything off screen), planar reflections, a procedural sky, motion blur and depth of field (the engine has both; unused), generated PBR material sets, per-surface wetness that changes roughness and footsteps (the wet band is a screen-space tint; the engine's material hook is not a public entry point), tiers that also scale shadows, reflections, entity detail and particles, showcase modes (`?show=`), and any of this on the menu and Safe Room scenes. Tests: `tests/unit/tiers.test.js`, `tests/unit/postchain.test.js`, `tests/unit/exposure.test.js`, `tests/unit/bench.test.js`, `tests/render.cjs` (the only browser file that runs a tier with depth).

## 35. Springs, the pressure budget, spawn scoring, showcase modes (implemented)

Written for UNDERFLOW from a description of another game's systems; see `docs/THIRD_PARTY_CODE.md` for what was and was not taken.

**Springs** (`src/spring.js`, pure). A damped spring with substeps, stable at 30 FPS and on a long frame, and a rig of named channels. The blaster's viewmodel now uses one: a shot kicks its push, lift and roll channels, and each profile's settle rate sets the spring's stiffness, so Scatter shoves further, overshoots and settles slowly while Pulse snaps back. The aim itself is not displaced: the shot goes where the reticle is. The raft and the camera still use their earlier, hand-tuned motion; moving them onto springs is not done.

**The pressure budget** (`src/pressure.js`, pure). Who may commit an attack right now, by kind: melee 2, grab 1, ranged 2, disruptive 1, each with a short cool-down after a slot is given back (waived for a lone attacker). On foot, Blooms take melee slots before they close in (three in the deep sectors), replacing the earlier hand-rolled count; the rest circle. On the raft, spitters take a ranged slot before they wind up; without one they hold the shot. Grab and disruptive slots exist but no entity uses them yet: the Undertow, the Lifeguard and Ballast are single entities with their own pacing.

**Spawn scoring** (`src/spawnscore.js`, pure). Candidates are scored for distance (a band, nothing close), being out of sight, being ahead of where you are looking, and not having been used in the last twenty seconds. Waves on foot now use it; flanking waves keep their spread-by-direction rule. The raft spawns ahead on the track and does not use it.

**Showcase modes.** `?show=NAME` sets up a fixed scene, pauses and labels it, for screenshots and visual review: `menu`, `water`, `architecture`, `entities`, `drift`, `hurt`, `overboard`, `omen`, `dock`, `emergency`, `blackout`, `lamp`, `signs`, `survey`, `saferoom`. Combine with `?quality=` to compare tiers. The menu and Safe Room scenes now use the same grade and finish passes as the game on tiers with depth.

**Shot lights** (`src/lightpool.js`, pure). Every shot on the raft and on foot lights the room for a moment: a flash at the muzzle in the profile's colour (brighter for Scatter) and a smaller one where it lands, fading in a tenth of a second. The lights come from a fixed pool of four that is reused; when all four are lit the dimmest is taken over. They are merged into the frame's lights without going past the engine's sixteen, always keeping room for at least one flash.

Not built from the same brief: perception for entities other than Blooms on foot (section 37; the Lifeguard has its own states already), effect and entity pools (Blooms, shots and drops already use fixed part lists), procedural material generation, and a fully contextual HUD (parts of it already adapt). Tests: `tests/unit/feelai.test.js`, `tests/systems.cjs`, `tests/shows.cjs`.

## 36. The voice pool and the limiter (implemented)

Sound already had buses (effects, music, ambience, each with its own volume), a muffle filter shared by everything, and a convolution reverb per acoustic space. What it lacked was a limit. Now every one-shot, recorded or synthesised, asks a voice pool (`src/voicepool.js`, pure) for room: at most 24 at once, and at most three copies of the same sound. When the pool is full, a more important sound takes the place of the least important one playing, which is stopped; an equal or lesser one is simply not played. Being hurt, the Lifeguard's whistle and the Undertow's grip and release are critical; gate, burst, the heavy profiles, the radio and doors are high; footsteps, ticks, bubbles, Grout's clicks and breathing are low; everything else is normal. Beds and music are not counted. A compressor on the master output keeps a scatter blast in a tiled room loud without clipping.

Not built: per-voice distance attenuation and HRTF panning (sounds are panned left-right only), occlusion through walls, and per-space sends other than the one convolver. Tests: `tests/unit/voicepool.test.js`, `tests/audio.cjs`. Nobody has listened to it on speakers or headphones.

## 37. Perception: Blooms on foot have to find you (implemented)

Before this, every Bloom on foot within 18 m came straight for you. Now each one has a perceiver (`src/perception.js`, pure) and has to sense you first.

- **Seeing**: only in line of sight (walls and columns block it), within 26 m, faster when you are close and lit. With the power out, only a carried lamp makes you visible. Within 3.5 m it knows at once.
- **Hearing**: shots and other noise carry through walls, out to 14 m.
- **States**: unaware below 0.3 (it stays where it is), suspicious (it goes slowly to where it last sensed you), aware (it comes for you, and only then may it take an attack slot). An aware Bloom holds on for six seconds after losing you, then cools.

A wave arrives suspicious, heading for where you were when it spawned, so it still comes looking; a Bloom lying dormant on the floor starts knowing nothing. Blackout blindness (section 31) and the lamp lure still take precedence.

So staying out of sight and not firing now keeps Blooms off you, and a shot tells every Bloom in earshot roughly where you are. This changes on-foot difficulty and pacing, and nobody has played it. Not built: the same model for the Lifeguard (which has its own hunt states), Marco, the Undertow and the raft. Tests: `tests/unit/perception.test.js`, `tests/systems.cjs`.

## 38. Shadows, the hand lamp, and a second bloom (implemented)

**Shadows** (`src/shadows.js`, pure). On HIGH the single nearest fixture casts shadows, on ULTRA the two nearest, on the raft and on foot. The engine's shadow atlas has 24 tiles (six per point light, one per spot light), so the choice never asks for more than fits; dim or short-range lights (shot flashes, emergency strips) never cast. The engine redraws a shadow only when its light moves, so a room you stand still in costs one pass.

**The hand lamp.** On tiers with shadows, the work lamp carried in white mode is now a spot light from just below and right of the eye, along the view, casting shadows: a cone that throws column and doorway shadows across the tile. A little fill light stays at the hand. Set down, or in UV, it is a point light as before.

**A second bloom.** The lens pass adds a wide, soft ring of glare around bright fixtures on top of the engine's own bloom, so a lamp glows in damp air.

Each has a setting. Checked by a headless screenshot of the blackout-with-lamp and dock showcases on a software renderer, and by a test that the frame asks for the right shadow casters with no renderer diagnostics. The cost of shadows on real hardware is unmeasured. Not built: shadows on LOW and MEDIUM, the Lifeguard's lamp as a spot light, reflections in the water, a procedural sky, generated materials. Tests: `tests/unit/shadows.test.js`, `tests/render.cjs`.

## 39. 3D props and instancing (implemented)

**Props.** `src/props.js` loads every GLB prop once at start, inlined so the single-file build carries them. There are 48: ten generated for UNDERFLOW with Higgsfield (starting block, floor drain, supply locker, pool ladder, rubber duck, gate valve, lifeguard chair, blaster body, work lamp, ring buoy) and thirty-eight CC0 models from Poly Haven (security camera, caged hanging lamp, wheelchair, generator, toolbox, drain cleaner, searchlight, wet-floor sign, wall clock, megaphone, metal stool, broom, chemical jug, bleach and cleaner bottles, cardboard box, bin bag, first aid kit, hose reel, fire alarm, radio, raft pump, jerrycan, roller shutter, ceiling light fixture, wall lamp, electrical cabinet, junction box, extinguisher, bins, bench, plastic chair, tool chest, tool cart, parts rack, kettle, equipment crate, pipe sections). A model's meshes are baked into one frame, and pieces that share a material are merged, so a prop costs as many parts as it has materials. `placeModel` stands a model on the floor at a yaw and height. `placeModelBasis` moves it in any frame; the first-person blaster uses it to follow the camera with the same springs as before. On a landing the moored raft fills the middle of the dock, so the dock dressing lines the side wall (`row(t, depth)` in `explore.js`) and stays out of the raft's footprint; `tests/models.cjs` checks every dock prop against it. Every placement keeps a primitive fallback for a scene built before its model has loaded.

**Instancing.** 67js draws parts that share one geometry object and the same texture maps as one instanced batch. Colour, emission and roughness travel per instance. Two things make that happen here:

- All placements of a model share its geometry and texture descriptors. A placement gets its own copy of the material's scalar values, so a locker can dim when opened and a valve can change colour, without breaking the batch.
- `src/shapes.js` returns one geometry per distinct `box`, `cylinder`, `sphere` and `torus` call. Previously each call built a new geometry, so every slab, rail and lamp panel was its own batch. Nothing in the game edits geometry after creation; size, placement and deformation are part matrices.

Measured in the headless browser, the raft scene's 1,551 parts dropped from 526 batches to 92, and the on-foot scenes (618–829 parts) from 131–203 batches to 73–87. The 80-odd light fixtures in a dock add no batches. `tests/models.cjs` checks the counts and that the props load and stand in place. Frame-time gains have not been measured on target GPUs.

**Materials.** Rails and gallery rails are brushed stainless: a factor material with an anisotropic lobe (`anisotropy: 0.6`). The observation windows are transmissive glass (`transmission: 0.92`, `ior: 1.52`, a faint green absorption) instead of a blended sheet. Both need the engine's material-layer shader addon, imported in `src/explore.js`. The landing slab where you dock is wet concrete, and the raft hulls carry a PVC seam detail map. Both are generated surfaces in `src/surfaces.js`; the PVC map is greyscale, so each raft keeps its own colour. `tests/models.cjs` checks that these materials are applied. How they look on a real GPU has not been checked.

**Drains.** The generated drain grate is reused three ways: the shower-drain vignette, main drains in about one basin cell in eight, and an overflow grate along every deck edge that meets the pool. The overflow grates are stretched along the coping into narrow gutters; `placeModel` takes separate width and depth scales for that. All are sunk so only the slotted top shows. They share one geometry, so a basin's worth of grates adds one batch. `tests/models.cjs` counts them. Behind the gutter, about one edge cell in three carries a deck marking read from the deck toward the water, alternating 1.2 M and NO DIVING. Each text is one shared material, so every marking of a kind draws in one batch.
