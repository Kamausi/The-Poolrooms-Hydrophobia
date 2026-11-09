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
| The Yellow Channel (Welcome Pools) | dirty ivory, stale yellow-green light, faded blue waterline bands | familiar, low, repetitive, apparently supervised |
| The Blue Reservoir (Lazy River, Wave Hall, the reservoir sections) | desaturated cyan, petroleum blue, cold white highlights, dark depth | vast, exposed, hard to measure |
| The Last Drain (Filtration Works, and the drain at the end) | bone white, charcoal, tarnished metal, a coral band | heavy, compressed, hydraulic; the tile starts to suggest anatomy |
| Safe Rooms | neutral ivory, warm light, matte machinery, checkpoint green | finite, dry, functional, occupied |

The Blacklight Pavilion keeps its violet; the Rooftop Lagoon's sky is overcast.

## Architecture and surfaces (built: `src/textures.js`, `src/ride.js`)

Square tile grids with batch variation (a few tiles from a different firing), grout darkened where moisture never leaves, hairline cracks and drip stains. A faded waterline band runs along every channel wall; now and then it continues at the wrong height. The normal pattern is established before it is broken.

## The raft and the crew (built: `src/ride.js`)

The raft is worn safety yellow with a rope trim, black straps, a strapped supply case, and every scuff and patch it has ever had. From the first Safe Room onward the crew rides in it with you, each with a distinct silhouette and the only warm colours in the frame: Mars compact in a short jacket, Dez in navy workwear, Tubs broad in a padded vest, June tall in a long pale waterproof. They duck when you brace, sway with the paddle, and their seat is empty when the manifest forgets them.

## Entities (built: `src/ride.js`, `src/explore.js`)

Swelling, flattening, folding, loss of anatomy, made of rubber, fabric, water and porcelain. Blooms are translucent waterlogged masses with a faint coral heart that brightens as they swell to attack, and collapse into folds when they die. The Undertow is a flattened form under the surface. Grout moves through the seams (and clicks first). The Lifeguard is a rigid outline in a faded red uniform, arms straight down, pale hands and one coral whistle cord, readable by posture before face.

## Interface (built: `src/style.css`)

Dark petroleum panels, dirty ivory text, thin teal borders, short monospaced readings, coral only for danger and green only for recovery. The reticle has a dark outline so it reads on dark water and pale tile. The world can lie (contradictory counters, false announcements, unverified voices); crew status, controls and prompts never do.

## Main menu (built: `src/menuscene.js`)

The title over a nearly static scene: a low tiled corridor, shallow black-green water, one fluorescent fitting lighting part of the floor (it buzzes and occasionally dips), an empty raft with folded vests just past the light. Far down the corridor a small green EXIT sign is reflected in the water. There is no sign above it.

## Not yet built
- Refraction along submerged edges and condensation crawling across glass (needs shader work beyond 67js's current material set).
- Softening around the hands at high Drift (the blaster sags out of view instead).
- Anatomical tile in the final drain itself (the drain is reached through the ending text, not a level).
