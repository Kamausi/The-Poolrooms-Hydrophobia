# Credits for third-party assets

Everything not listed here is made in this repository: code, synthesised sound, procedural textures and geometry.

## Sound: Oculus Audio Pack 01 (CC BY 4.0)

> "Oculus Audio Pack 01" by Oculus VR, LLC (https://developers.meta.com/vr/downloads/package/oculus-audio-pack-1/), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Files renamed to the UCS naming convention; OGG previews transcoded from the original WAVs.

Taken from the Meta Open Sound repository (github.com/facebookincubator/meta-open-sound, `corpora/oculus-audio-pack`).

**Changes made for UNDERFLOW:** each file was mixed to mono, re-encoded as MP3, trimmed of leading and trailing silence and normalised. Loops were cut and their ends crossfaded into their starts so they repeat without a seam. The files are in `public/audio/` and the transcoding script's file list is in `public/audio/manifest.json`.

The credit also appears on the main menu.

| In the game | Source files |
|---|---|
| `water-lap` (open water bed) | WATRLap_WaterLapping_LOOP_01 |
| `bubbles` (drains, tubes) | WATRBubl_WaterBubbles_LOOP_01 |
| `machine-room` (Safe Room) | AMBInd_RoomToneMachineRoom_LOOP_01 |
| `pump-hum` (pump rooms) | MACHMisc_MachineHum_LOOP_02 |
| `vent` (fluorescent and vent hum) | MACHHvac_HVAC_LOOP_01 |
| `underwater` (overboard, muffled moments) | AMBUndwtr_Underwater_LOOP_01 |
| `drone` (rises with Drift) | DSGNDron_DroneCreepy_OS_01 |
| `oar` (paddle strokes) | BOATRow_RowboatOarRowing_OS_01–03 |
| `step-tile`, `step-metal` (footsteps) | FEETHmn_ShoeConcreteWalk_OS_01–05, FEETHmn_ShoeMetalWalk_OS_01–03 |
| `valve`, `lever`, `switch`, `hydraulic` | WATRPlmb_ValveTurn_OS_01, MECHLvr_LeverPull_OS_01–02, MECHSwtch_SwitchSmallOn_OS_01, MACHInd_Hydraulic_OS_01 |
| `hatch-open`, `hatch-close` (bulkheads, gates) | DOORMetl_HatchOpen_OS_01, DOORMetl_HatchClose_OS_01 |
| `metal-hit` (impacts) | METLImpt_MetalHitSurface_OS_01–03 |
| `creature`, `creature-far` (Blooms; something far off) | CREAMnstr_CreatureCreepy_OS_01–03, CREAMnstr_CreatureCreepyReverb_OS_01–02 |
| `whispers` (high Drift) | VOXWhsp_WhispersCreepyReverb_OS_01 |
| `scrape` (Grout, scraping) | METLFric_ScratchCreepyReverb_OS_01, METLFric_ScratchCreepy_OS_01 |
| `chains` (the winch) | CHAINMvmt_ChainsCreepy_OS_01 |
| `sting` (the disruption burst) | DSGNImpt_ImpactCreepyReverb_OS_01–02 |
| `gear`, `ui-confirm`, `ui-back` | CLOTHMvmt_MovementWithGear_OS_01–02, UIClick_MetalConfirm_OS_01, UIClick_MetalBack_OS_01 |

## Normal maps: @pmndrs/assets (CC0 1.0)

From the npm package `@pmndrs/assets` 1.7.0 (CC0 1.0, public domain; no credit required, given anyway). Two of its normal maps, resized to 256 px:

| In the game | Source | Where |
|---|---|---|
| `src/assets/normal-0000.webp` | `normals/0000` (fine drips and bumps) | Blended faintly into the tile relief as glaze wear |
| `src/assets/normal-0008.webp` | `normals/0008` (diamond plate) | The Safe Room's floor grating |

The tile relief itself (recessed grout, bevelled edges, tiles set slightly off true) is generated in `src/textures.js` from the same grid as the tile colour texture.

## Generated textures

Higgsfield (Z Image model): four surface textures generated for UNDERFLOW from text prompts written for it, used in `src/surfaces.js` (stained ceiling tiles, aqua pool floor tile, painted steel, painted cloud tiles). Two more ship as well: raft PVC (made greyscale so it keeps the raft's colour) and wet concrete. Two are kept in `assets/generated/` but not shipped (porcelain wall tile, and a creature skin that came out looking like corrugated plastic). Their use is governed by the account holder's Higgsfield terms, not an open licence.

## Models: Poly Haven (CC0)

Twenty-one props from Poly Haven (polyhaven.com), CC0. Credit is not required, and it is given here. Each was packed into one GLB with smaller textures and simplified with gltfpack, and is loaded by `src/props.js`.

- Industrial Wall Lamp by Kuutti Siitonen: https://polyhaven.com/a/industrial_wall_lamp
- Korean Fire Extinguisher 01 by UM JOORIN: https://polyhaven.com/a/korean_fire_extinguisher_01
- Metal Tool Chest by Yann Kervran, John Hutcheson: https://polyhaven.com/a/metal_tool_chest
- Metal Trash Can by GurJas Studios: https://polyhaven.com/a/metal_trash_can
- Mounted Fluorescent Lights by Ulan Cabanilla: https://polyhaven.com/a/mounted_fluorescent_lights
- Painted Wooden Bench by Kirill Sannikov: https://polyhaven.com/a/painted_wooden_bench
- Plastic Monobloc Chair 01 by Kuutti Siitonen: https://polyhaven.com/a/plastic_monobloc_chair_01
- Power Box 01 by Rico Cilliers, Yann Kervran: https://polyhaven.com/a/power_box_01
- Tool Cart by Savva Zakharov: https://polyhaven.com/a/tool_cart
- Utility Box 02 by James Ray Cock: https://polyhaven.com/a/utility_box_02
- Vintage Electric Kettle by SV Garip: https://polyhaven.com/a/vintage_electric_kettle
- Worn Metal Rack by Luca B: https://polyhaven.com/a/worn_metal_rack
- Plastic Crate 02 by Fabi_G: https://polyhaven.com/a/plastic_crate_02
- Modular Industrial Pipes 01 by Jorge Camacho: https://polyhaven.com/a/modular_industrial_pipes_01
- Roller Shutter Door by MP: https://polyhaven.com/a/rollershutter_door
- Medical Box by Ulan Cabanilla: https://polyhaven.com/a/medical_box
- Garden Hose Wall Mounted 01 by Kuutti Siitonen: https://polyhaven.com/a/garden_hose_wall_mounted_01
- Fire Alarm by Slinc: https://polyhaven.com/a/fire_alarm
- Boombox by Thomas Paul Mouilleron: https://polyhaven.com/a/boombox
- Tire Pump by Garrison Gager: https://polyhaven.com/a/tire_pump
- Metal Jerrycan by Sean Buckley: https://polyhaven.com/a/metal_jerrycan

## Generated models

Higgsfield: ten textured 3D models made for UNDERFLOW. Each started from a generated reference image (Z Image or GPT Image 2.6) and was turned into a mesh by Tripo 3D H3.1 at a game triangle count with PBR maps: supply locker, pool ladder, gate valve, floor drain, work lamp, ring buoy, the blaster, the lifeguard tower and a starting block. The rubber duck was made with SAM 3D. The geometry is used as generated: textures were re-encoded smaller, and the ring buoy was rotated flat. The reference images are kept in `assets/generated/models/`. Earlier versions of seven of them were made with SAM 3D, or simplified heavily from very dense meshes, and looked rough; they were replaced. Their use is governed by the account holder's Higgsfield terms, not an open licence.
