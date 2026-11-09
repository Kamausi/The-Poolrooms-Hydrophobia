# UNDERFLOW · Art direction

**Stale institutional beauty.** An empty aquatic complex that is still operating, though its layout and procedures no longer make sense: yellowed porcelain, exhausted fluorescent light, deep water, worn safety equipment, and occasional details that are unmistakably wrong. The earlier concept board had too much comfortable daylight, open visibility and relaxed human presence; this direction replaces it.

What is implemented in the build is marked **(built)**, with the file it lives in.

## Palette (built: `src/style.css` tokens, `src/sectors.js`, `src/labels.js`)

| Name | Hex | Use |
|---|---|---|
| Dead porcelain | `#D8D8CA` | Tiles, ceilings, old signs, UI text. Slightly yellow-green, never clean white. |
| Stale fluorescent | `#AAA881` | The cast of older lighting, discoloured grout, shallow Yellow Channel water; UI labels. |
| Faded pool teal | `#4D7472` | Rails, waterline bands, older doors, UI borders. |
| Deep water | `#112B31` | Reservoir depth, submerged structures, UI panels. |
| Drain black | `#080D10` | Openings under the water, unlit passages, machinery interiors, fog, UI backing. |
| Worn safety yellow | `#B19A50` | The raft, flotation, selected rails and maintenance markings. Aged, damp, patched. |
| Warning coral | `#C45A50` | Immediate danger, damaged equipment, attack wind-ups (a Bloom's heart, the Lifeguard's whistle cord). |
| Checkpoint green | `#86AA8A` | Safe Rooms, recovery, confirmed safe systems. |
| Blacklight violet | `#A78CDE` | Anomalous targets, concealed markings, unusual blaster readings. |

Most of any frame is muted surfaces, water and unresolved depth. Accents occupy small, deliberate places.

## Typography (built: `index.html`, `src/style.css`, `src/labels.js`)

| Role | Font |
|---|---|
| Wordmark, chapter titles | Barlow Condensed 600, uppercase, 0.08–0.12em tracking |
| Facility signage, short headings | Barlow Condensed 500 |
| Menus, descriptions, subtitles, crew text | IBM Plex Sans 400/500 |
| Depth readings, counts, records, timers | IBM Plex Mono 400/500 |
| Graffiti and notes | Authored hands (Caveat, Reenie Beanie, Shadows Into Light, Nanum Pen Script). M. always writes in the same hand; maintenance types. |

Sizes scale with the viewport: about 18–22 px main UI, 24–28 px subtitles and 16–18 px labels at 1080p.

**The wordmark (built):** tall condensed capitals in dirty ivory; a thin teal waterline across the lower third; the letters below it displaced and softened as if seen through water. Readable first; the wrongness second.

**In-world type (built):** ordinary lettering carrying wrong information. The arrival-bay counter and the Safe Room terminal read `GUESTS ADMITTED: 04 · GUESTS RETURNED: 03 · DISCREPANCY: NONE`; every depth marker reads 1.2 M.

## Lighting (built: `src/ride.js`, `src/explore.js`, `src/saferoom.js`)

- **Bleached under fixtures, dark between:** brighter, shorter-range lamps and a lower ambient, so water, column bases and doorways go unreadable between fittings.
- **Bright-but-wrong rooms:** pool halls stay brightly lit; their unease is emptiness, repetition and distance.
- **Machinery loads the lights:** when a pump changes pitch, the lights sag and flutter for a moment.
- **The reservoir** takes a cold white instead of the sector's fluorescent.
- **Safe Rooms:** neutral-warm task light, dry matte surfaces, dark matte machinery, checkpoint-green strips at hand height, a green SAFE ROOM sign, and signs of people (mugs, a radio, a kettle on a pump housing, a cot). Through the glass: the deep, stale pool hall.

## Sectors (built: `src/sectors.js`)

| Area | Palette and light | Feeling |
|---|---|---|
Three broad visual families, mapped to every area in the build:

| Area | Family | Palette and light (from `sectors.js`) | Feeling |
|---|---|---|---|
| 1 · Welcome Pools | Yellow Channel | dirty ivory tile, stale yellow-green light, faded blue band | familiar, low, repetitive, apparently supervised |
| 2 · Lazy River (and its Blue Reservoir section) | Blue Reservoir | grey-green tile, warm calm stretches, cold white over the reservoir | slow, warm, tempting, then vast |
| 3 · Wave Hall | Blue Reservoir | cold grey tile, petroleum water, cold white light | big, exposed, hard to measure |
| 4 · Family Splash Zone | Yellow Channel | warm ivory, rose grout, a faded red-brown band | cheerful signage over something wrong |
| 5 · Blacklight Pavilion | (its own) | near-black violet tile, violet light | anomaly made visible |
| 6 · Filtration Works (and its reservoir section) | Last Drain | bone tile, charcoal grout, a coral band, near-black water | heavy, compressed, hydraulic |
| 7 · Hotel Baths | Last Drain | tan tile, brown grout, warm-stale light | old luxury, sealed |
| 8 · Rooftop Lagoon | (its own) | pale tile, overcast sky | open air that is still inside |
| The Closed Wave Pool (reference chapter) | Blue Reservoir | cold grey tile, petroleum water | still, scaled up, a sign under the water |
| Safe Rooms | — | neutral ivory, warm task light, matte machinery, checkpoint green | finite, dry, functional, occupied |

The Blacklight Pavilion keeps its violet; the Rooftop Lagoon's sky is overcast.

## Architecture and surfaces (built: `src/textures.js`, `src/ride.js`)

Square tile grids with batch variation (a few tiles from a different firing), grout darkened where moisture never leaves, hairline cracks and drip stains. The tiles have relief: recessed grout, bevelled edges that catch the lamps, each tile set very slightly off true, and a faint glaze wear from a CC0 detail map. The Safe Room floor is diamond plate. A faded waterline band runs along every channel wall; now and then it continues at the wrong height. The normal pattern is established before it is broken. Things you interact with look like fittings, not game objects: signal targets are lit rings on dark wall plates, and gate markers are worn safety-yellow channel buoys with a black band and a small lamp.

## The tool in your hand (built: `src/blaster.js`)

A maintenance instrument, not a toy. It has a matte painted receiver, a vented heat shroud, a worn safety-yellow carry handle, a raked grip, a charge window set into the side, an inspection lens in its own housing, and a muzzle collar. A worn work glove is closed on the grip, and the sleeve is navy waterproof with a reflective band. Edges are lightly bevelled so they read; nothing is glossy.

## The raft and the crew (built: `src/ride.js`, `src/crewfigure.js`)

The raft is worn safety yellow with a rope trim, black straps, a strapped supply case, and every scuff and patch it has ever had. From the first Safe Room onward the crew rides in it with you, each with a distinct silhouette and the only warm colours in the frame: Mars compact in a short jacket, Dez in navy workwear, Tubs broad in a padded vest, June tall in a long pale waterproof. Each reads by silhouette before colour: Mars in a safety helmet, Dez in a brimmed cap, Tubs in a beanie, June in a hood. One figure build serves every place they appear: seated on the gunwale with their hands on the rope, walking your trail on foot (legs, boots, a stride driven by how far they actually move, arms swinging against the legs), and standing or sitting in the Safe Room. They duck when you brace, sway with the paddle, and their seat is empty when the manifest forgets them. Guests in the water use the same figure in faded grey with a park flotation vest, face down, arms spread, legs trailing under the surface. The raft's straps are flat bands wrapped around the tube.

## Entities (built: `src/ride.js`, `src/explore.js`)

Swelling, flattening, folding, loss of anatomy, made of rubber, fabric, water and porcelain. Blooms are translucent waterlogged masses: faceted folds that shift on their own slow beats around a faint coral heart, with short strands hanging from them. The heart brightens as they swell to attack, and they collapse into folds when they die. The climber rises out of the water and hauls itself over the tube: pale and wet, its head hanging and its arms too long, reaching into the raft. The Undertow is a flattened form under the surface. Grout moves through the seams (and clicks first). The Lifeguard is a rigid outline in a faded red uniform, arms straight down, pale hands and one coral whistle cord, readable by posture before face.

## Interface (built: `src/style.css`, `src/hud.js`, `src/ui.js`, `src/callouts.js`, `index.html`)

Aging aquatic-facility equipment used in an emergency: dark enamel panels, ivory lettering, inspection labels, a pressure gauge, small rectangular warning lamps. The interface has three layers:

| Layer | What it is | How horror touches it |
|---|---|---|
| Player HUD | Health, equipment, teammates, interactions | It reacts to danger but always stays accurate and readable |
| Physical equipment | The blaster's display, the raft's gauge, the wristband | Condensation forms behind the blaster's display glass as Drift rises (behind the numbers, never over them); the pressure needle trembles while something grips the raft; the wristband's printing smears and blurs |
| Facility interfaces | Terminals, counters, manifests, receipts | They contradict what the crew can see: the counter says three returned with four present, the route terminal prints the arrival before the raft leaves, the compressor's receipt is dated the day before you arrived, a turnstile greets a rescued visitor by a name nobody gave it |

The pause menu, save confirmations, quantities and crew status never lie.

**Colour keeps one meaning per accent.** Safety yellow is attention or pending, coral critical, green recovery, violet inspection or anomaly. Warning *text* stays ivory (about 10:1 on petrol); coral marks the strip, border, symbol or lamp, because on its own it is about 3.5:1 and too low for words.

**Type** follows the table above. Functional HUD text is about 26 px at 1080p and scales with a HUD-size and a text-size setting.

**One HUD on the raft and on foot:**
- **Upper left:** sector and objective. Prominent when it changes, a single line after six seconds.
- **Upper right:** the facility's readouts, quieter.
- **Lower left:** the three teammates (symbol, name, condition in words), above your own entry (name, what you carry, health, Drift).
- **Lower right:** blaster charge and profile; four fixed quick-use slots (dressing, filter, cell, patch) showing the current key and quantity, with empty slots staying in place; the raft's pressure gauge while aboard.
- **Centre:** the reticle and one prompt.
- **Lower centre:** subtitles with a source label (`JUNE · RADIO`, `THE ATTENDANT · PA`, `VOICE · NEARBY`) and sound captions, in their own band.
- **Upper centre:** one urgent event, only when there is one.

**Quiet vs crisis.** In quiet passages, score lines go to a small ticker by the equipment rather than across the screen. When a teammate is grabbed or down:
- their entry grows and takes a coral strip;
- an urgent banner with a blinking lamp appears;
- a marker sits at the edge of the view on their side;
- the PA and banter that isn't about the rescue hold back.

A persistent-HUD option keeps everything full size.

**Reticle.** Small and ivory with a dark outline. Shape carries the state:
- open brackets at something usable;
- a lock frame when a volley is ready;
- a progress arc while an action is held;
- a brief impact mark on a hit.

It never shakes. Prompts name the action and show the player's current binding on the current device (`HOLD [E] — pull`).

**Callouts.** A tap of Ping marks what you aim at or checks the radio. Holding it opens a strip of six calls: go here, danger here, help me, wait, regroup, supplies here. Moving the aim chooses one and releasing sends it as a marked radio call the crew acknowledges.

## Main menu (built: `src/menuscene.js`, `index.html`, `src/main.js`)

The menu is the first room: a low, fixed view down a tiled maintenance dock with shallow black-green water. One fluorescent fitting works and dips now and then. The raft is tied to a post with four life vests folded on it, and far down the corridor a green EXIT sign is reflected in the water with no sign above it.

Now and then:
- the tether tightens while the raft doesn't move;
- something passes behind a wired-glass window;
- a service-door light comes on with nobody near it;
- the lifeguard chair at the far end is occupied on some later visits.

The entries never move:
- **Continue Expedition:** shows the real save's place, whether you were on the raft or on foot, your character, and who is with you.
- **Start Expedition:** opens the campaign, the reference chapter, endless mode, challenges and the route builder.
- **Expedition Records.**
- **Settings.**
- **Credits.**

Focus moves at once. The selected plate fills ivory, a short description follows it, and selection clicks mechanically.

## Safe Room and journal (built: `src/ui.js`)

The workbench is a numbered maintenance sheet:
1. **Supplies.** Each item reads as a transaction: "Carrying: 1 → 2 · Cost: 2 parts".
2. **Raft and equipment.** The compressor, the raft's fit, fittings and modifications.
3. **Next route.** What is known about each exit, then "Last inspected: record unavailable". Undiscovered encounters stay unknown.

The pause journal keeps three accounts apart so they can be compared: crew observations, facility records (including the false records about people you saved), and a route map that marks surveys that may be out of date.

## Prototype vs finished
- **Refraction:** 67js has a `liquid` material (a pass after the opaque scene, with refraction, absorption and Fresnel reflection). UNDERFLOW uses it in one place: a thin layer of water over the Closed Wave Pool's lit exit sign. A staged headless capture confirms it reads as a pale green glow under water. The first attempt put the sign under the channel's opaque water plane, where it could not be seen at all. The capture is a software render; it has not been seen in motion on a GPU. Channel water still uses the flat `water` ripple material.
- **High-Drift hands:** a primitive glove and cuff swell, pale and shift as Drift rises (`blaster.js`). This is prototype deformation, not a finished hand asset.
- **Characters:** no authored skeletal animation. Movement is procedural: sway, leaning into turns, bracing, jolts, the Bloom's swell, lunge and collapse.
- **Bright effects:** signals, pickups and lock marks moved onto the palette (checkpoint green, coral) and were dimmed. The muzzle flash is smaller and dimmer (emission 12 → 4.5), and the beam is dimmer (14 → 8). In a staged firing capture, the beam is a thin line and the Blooms' coral hearts remain the strongest colour in the frame. Motion on a GPU is still unreviewed.
- **Crew on foot:** a staged capture confirms a crewmate following your yellow thread behind you.
- **Not built:** condensation on glass; anatomical tile in the final drain (the drain is reached through the ending text, not a level).
