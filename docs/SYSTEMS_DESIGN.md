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
