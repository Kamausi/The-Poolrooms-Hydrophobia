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
- **Lane Rope on foot:** tap Space to pull free, or shoot its floats.

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
