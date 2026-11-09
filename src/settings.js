// Player options, stored per browser. Read anywhere; the pause menu edits them.

const KEY = 'underflow-settings';
const DEFAULTS = {
  grain: true, // film grain on the picture
  distortion: true, // Drift wash, vignette pulses, camera roll from the Passenger
  sway: true, // raft bob and on-foot head bob
  captions: true, // captions for directional sound cues
  aimAssist: true, // touch only: snap to the nearest target near your finger
  sensitivity: 1,
  steer: 1, // raft steering sensitivity
  camera: 1, // camera shake, roll and impact motion (0 = none)
  paddleToggle: false, // V toggles paddling instead of holding
  braceToggle: false, // Ctrl/C toggles brace instead of holding
  bindings: {}, // action id → key, for anything the player has rebound
  padBindings: {}, // action id → controller button index
  textScale: 1, // subtitles, captions, prompts and panels
  damageAssist: 1, // incoming damage multiplier (an assist, not a difficulty label)
  highContrast: false, // opaque panels and caption backing, a heavier reticle
  tips: true, // first-time contextual tips
  perfOverlay: false, // frame-time overlay: average, 95th and 99th percentile, slow frames
  fpsCap: 0, // 0 = display rate (60 FPS tier); 30 = the constrained 30 FPS profile
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
  paddleToggle: 'Paddle: toggle instead of hold',
  braceToggle: 'Brace: toggle instead of hold',
  highContrast: 'High contrast (opaque panels, heavier reticle)',
  tips: 'First-time tips',
  perfOverlay: 'Performance overlay (frame times)',
};

/** Rebindable actions. key is the action's default key, which the game reads; bindings remap physical keys onto it. */
export const ACTIONS = [
  ['left', 'Steer / move left', 'a'], ['right', 'Steer / move right', 'd'], ['forward', 'Forward / swim', 'w'], ['back', 'Back / brake / backstroke', 's'],
  ['hop', 'Hop / jump', ' '], ['brace', 'Brace', 'c'], ['use', 'Use / rescue / line', 'e'], ['shove', 'Shove', 'z'],
  ['ping', 'Ping / radio check', 'b'], ['cycle', 'Next blaster profile', 'tab'], ['scan', 'Inspection beam', 'q'], ['burst', 'Disruption burst', 'f'],
  ['boost', 'Boost / paddle burst / run', 'shift'], ['recharge', 'Recharge', 'r'], ['paddle', 'Paddle / prod', 'v'], ['patch', 'Patch and pump', 'g'],
  ['lookback', 'Look back', 'x'], ['dressing', 'Field dressing', 'h'], ['autopilot', 'Ride Control', 't'],
];
