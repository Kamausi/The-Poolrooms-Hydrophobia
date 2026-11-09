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
