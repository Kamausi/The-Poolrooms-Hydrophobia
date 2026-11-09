# 0005 · Recorded sound where a free recording fits, synthesis everywhere else

Supersedes [0002](0002-synthesised-audio.md).

**Decision.** `src/samples.js` loads recorded sounds from the Oculus Audio Pack 01 (CC BY 4.0, credited in `docs/CREDITS.md` and on the menu). `audio.js` plays the recording when it has loaded and its synthesised version otherwise. The water, machinery, vent, underwater and Drift beds are recordings; the blaster, UI tones, music and the Attendant's chime stay synthesised.

**Why.** Real water and machinery carry the Poolrooms in a way oscillators don't, and the pack is free to use with a credit. The fallback means a missing or slow file never silences a cue, and the game never waits on audio.

**What would change it.** A sound designer and recorded performances: replace files one for one under `public/audio/`, keeping the names in `manifest.json`.
