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

Square tile grids with batch variation (a few tiles from a different firing), grout darkened where moisture never leaves, hairline cracks and drip stains. A faded waterline band runs along every channel wall; now and then it continues at the wrong height. The normal pattern is established before it is broken. Things you interact with look like fittings, not game objects: signal targets are lit rings on dark wall plates, and gate markers are worn safety-yellow channel buoys with a black band and a small lamp.

## The tool in your hand (built: `src/blaster.js`)

A maintenance instrument, not a toy. It has a matte painted receiver, a vented heat shroud, a worn safety-yellow carry handle, a raked grip, a charge window set into the side, an inspection lens in its own housing, and a muzzle collar. A worn work glove is closed on the grip, and the sleeve is navy waterproof with a reflective band. Edges are lightly bevelled so they read; nothing is glossy.

## The raft and the crew (built: `src/ride.js`, `src/crewfigure.js`)

The raft is worn safety yellow with a rope trim, black straps, a strapped supply case, and every scuff and patch it has ever had. From the first Safe Room onward the crew rides in it with you, each with a distinct silhouette and the only warm colours in the frame: Mars compact in a short jacket, Dez in navy workwear, Tubs broad in a padded vest, June tall in a long pale waterproof. Each reads by silhouette before colour: Mars in a safety helmet, Dez in a brimmed cap, Tubs in a beanie, June in a hood. One figure build serves every place they appear: seated on the gunwale with their hands on the rope, walking your trail on foot (legs, boots, a stride driven by how far they actually move, arms swinging against the legs), and standing or sitting in the Safe Room. They duck when you brace, sway with the paddle, and their seat is empty when the manifest forgets them.

## Entities (built: `src/ride.js`, `src/explore.js`)

Swelling, flattening, folding, loss of anatomy, made of rubber, fabric, water and porcelain. Blooms are translucent waterlogged masses: faceted folds that shift on their own slow beats around a faint coral heart, with short strands hanging from them. The heart brightens as they swell to attack, and they collapse into folds when they die. The climber rises out of the water and hauls itself over the tube: pale and wet, its head hanging and its arms too long, reaching into the raft. The Undertow is a flattened form under the surface. Grout moves through the seams (and clicks first). The Lifeguard is a rigid outline in a faded red uniform, arms straight down, pale hands and one coral whistle cord, readable by posture before face.

## Interface (built: `src/style.css`, `src/hud.js`)

Dark petroleum panels, dirty ivory text, thin teal borders, short monospaced readings, coral only for danger and green only for recovery. The reticle has a dark outline so it reads on dark water and pale tile. The middle of the frame belongs to the world and the reticle. Announcements sit in the upper third, interaction prompts just below the reticle on a thin teal-edged strip, and speech and sound captions at the bottom. The control list shows for a few seconds when a mode starts or after pausing, then fades. Steady facts (raft fit, who is piloting) live in the Safe Room and pause, not on the HUD. On short screens the decorative counters drop away. The world can lie (contradictory counters, false announcements, unverified voices); crew status, controls and prompts never do.

## Main menu (built: `src/menuscene.js`)

The title over a nearly static scene: a low tiled corridor, shallow black-green water, one fluorescent fitting lighting part of the floor (it buzzes and occasionally dips), an empty raft with folded vests just past the light. Far down the corridor a small green EXIT sign is reflected in the water. There is no sign above it.

## Prototype vs finished
- **Refraction:** 67js has a `liquid` material (a pass after the opaque scene, with refraction, absorption and Fresnel reflection). UNDERFLOW uses it in one place: a thin layer of water over the Closed Wave Pool's lit exit sign. A staged headless capture confirms it reads as a pale green glow under water. The first attempt put the sign under the channel's opaque water plane, where it could not be seen at all. The capture is a software render; it has not been seen in motion on a GPU. Channel water still uses the flat `water` ripple material.
- **High-Drift hands:** a primitive glove and cuff swell, pale and shift as Drift rises (`blaster.js`). This is prototype deformation, not a finished hand asset.
- **Characters:** no authored skeletal animation. Movement is procedural: sway, leaning into turns, bracing, jolts, the Bloom's swell, lunge and collapse.
- **Bright effects:** signals, pickups and lock marks moved onto the palette (checkpoint green, coral) and were dimmed. The muzzle flash is smaller and dimmer (emission 12 → 4.5), and the beam is dimmer (14 → 8). In a staged firing capture, the beam is a thin line and the Blooms' coral hearts remain the strongest colour in the frame. Motion on a GPU is still unreviewed.
- **Crew on foot:** a staged capture confirms a crewmate following your yellow thread behind you.
- **Not built:** condensation on glass; anatomical tile in the final drain (the drain is reached through the ending text, not a level).
