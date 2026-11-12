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
  volEffects: 1, volMusic: 0.8, volAmbience: 1, // per-category volume
  flashReduce: false, // dimmer damage flash and muzzle flash
  hudScale: 1, // HUD size, separate from text size
  subtitleBacking: true, // a dark band behind subtitles
  scoreDisplay: 1, // 0 immersive (never), 1 standard (in action), 2 arcade (always, with the feed)
  qualityTier: 0, // 0 auto · 1 low · 2 medium · 3 high · 4 ultra
  postChain: true,
  shafts: true,
  shadows: true, // fixtures and the hand lamp cast shadows (high quality and up) // light shafts from the fixtures (high quality and up) // lens effects, colour grade, edge smoothing, sharpen and dither (medium tier and up)
  ambientOcclusion: true, // contact darkening in corners and where things meet (full render tier only)
  haze: true, // haze over the water (full render tier only)
  autoExposure: true, // the picture adapts to how much light there is, like an eye
  autoRes: true, // lower the internal resolution when frames run long, raise it again when there is room
  padAssist: 0.6, // controller aim help on the raft: 0 off … 1 strongest (magnetism and stick friction)
  threatWedges: true, // rim markers for threats that are close and out of view
  rumble: 1, // controller vibration strength (0 = off)
  hudPersistent: false, // keep the objective, roster and controls at full size instead of letting them settle
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
  threatWedges: 'Threat markers at the edge of the view (close threats you cannot see)',
  autoRes: 'Automatic resolution (hold the frame rate by lowering render scale)',
  postChain: 'Post-processing (lens, grade, edge smoothing; medium quality and up)',
  shafts: 'Light shafts from the fixtures (high quality and up)',
  shadows: 'Shadows from the nearest fixtures and the work lamp (high quality and up)',
  ambientOcclusion: 'Ambient occlusion (high quality and up)',
  haze: 'Haze over the water (high quality and up)',
  autoExposure: 'Eye adaptation (exposure follows the light)',
  flashReduce: 'Reduce flashes (damage and muzzle)',
  subtitleBacking: 'Subtitle backing (dark band behind speech)',
  hudPersistent: 'Persistent HUD (contextual information never compacts or fades)',
};

/** Rebindable actions. key is the action's default key, which the game reads; bindings remap physical keys onto it. */
export const ACTIONS = [
  ['left', 'Steer / move left', 'a'], ['right', 'Steer / move right', 'd'], ['forward', 'Forward / swim', 'w'], ['back', 'Back / brake / backstroke', 's'],
  ['hop', 'Hop / jump', ' '], ['brace', 'Brace', 'c'], ['use', 'Use / rescue / line', 'e'], ['shove', 'Shove', 'z'],
  ['ping', 'Ping / radio check', 'b'], ['cycle', 'Next blaster profile', 'tab'], ['scan', 'Inspection beam', 'q'], ['burst', 'Disruption burst', 'f'],
  ['boost', 'Boost / paddle burst / run', 'shift'], ['recharge', 'Recharge', 'r'], ['paddle', 'Paddle / prod', 'v'], ['patch', 'Patch and pump', 'g'],
  ['lookback', 'Look back', 'x'], ['dressing', 'Field dressing', 'h'], ['autopilot', 'Ride Control', 't'], ['helm', 'Hand over / take the helm', 'y'], ['lamp', 'Work lamp: off / white / UV', 'l'], ['lampPlace', 'Work lamp: set down / pick up', 'k'], ['map', 'Survey map (on foot)', 'm'],
];
