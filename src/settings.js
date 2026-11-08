// Player options, stored per browser. Read anywhere; the pause menu edits them.

const KEY = 'underflow-settings';
const DEFAULTS = {
  grain: true, // film grain on the picture
  distortion: true, // Drift wash, vignette pulses, camera roll from the Passenger
  sway: true, // raft bob and on-foot head bob
  captions: true, // captions for directional sound cues
  aimAssist: true, // touch only: snap to the nearest target near your finger
  sensitivity: 1,
};

export const settings = { ...DEFAULTS };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}'));
} catch {}

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
}

export const SETTING_LABELS = {
  grain: 'Film grain',
  distortion: 'Drift distortion and camera roll',
  sway: 'Raft and head sway',
  captions: 'Sound captions',
  aimAssist: 'Touch aim assist',
};
