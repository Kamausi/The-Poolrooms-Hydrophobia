# 0002 · All sound is synthesised until there is a sound team

**Decision.** `audio.js` builds every sound with Web Audio: water, machinery, the Blooms, the Attendant's chime, the music phases and the per-space reverb (`setSpace`). There are no audio files.

**Why.** The sound language (warnings before commitment, ducking under warnings, rooms that ring or deaden) can be designed and tested now, and the build stays one file. Recorded sound and voice need people this project does not have.

**What would change it.** A sound designer or recorded performances. The cue names in `audio.js` are the list to replace, one for one.
