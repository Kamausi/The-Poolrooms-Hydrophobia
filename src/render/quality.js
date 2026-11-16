// Render quality. A tier (tiers.js) says what is drawn: low is for software renderers (no GPU), medium, high and
// ultra add the depth target, ambient occlusion, haze, the post chain, more lamps and more samples.
// ?quality=low|medium|high|ultra in the URL overrides the player's setting and the detection.
import '67js/addons/view-transform-shader'; // the AgX curve's shader code
import '67js/addons/world-material-shader'; // the engine asks for it once the view-transform shader is registered
import { createGpuTimer } from './gputimer.js';
import { TIERS, resolveTier, tierRatio, SETTING_TIERS } from './tiers.js';
import { settings } from '../settings.js';

function detectSoftware() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    quality.gpu = String(name);
    return /swiftshader|llvmpipe|software|basic render/i.test(String(name));
  } catch {
    return false;
  }
}

const forced = new URLSearchParams(location.search).get('quality');
const benchMode = new URLSearchParams(location.search).has('bench');

/** Mutable: setTier replaces the fields. Scenes read it every frame, and read `renderer` when they are built. */
export const quality = { gpu: 'unknown', forced: forced && TIERS[forced] ? forced : null };
const software = detectSoftware();

/** Apply a tier. Lamps, bloom, AO, haze and the post chain change at once; samples, shading and depth on the next scene. */
export function setTier(name) {
  const t = TIERS[name] || TIERS.high;
  const base = { samples: t.samples, pixelRatio: tierRatio(name, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1), shading: t.shading, ...(t.depth ? { depth: true } : {}) };
  // Read when a scene builds its renderer: the tier's options, the player's tone curve (the engine's view transform:
  // ACES, or AgX, which rolls bright saturated colour off instead of clipping it) and, under ?bench, a GPU timer.
  Object.defineProperty(quality, 'renderer', {
    configurable: true, enumerable: true,
    get: () => ({ ...base, viewTransform: settings.agx ? 'agx' : 'aces', ...(benchMode ? { createGpuTimer } : {}) }),
  });
  Object.assign(quality, {
    tier: TIERS[name] ? name : 'high', low: name === 'low',
    shadows: t.shadows, ao: t.ao, haze: t.haze, hazeSteps: t.hazeSteps, lights: t.lights, bloom: t.bloom, reflection: t.reflection, reflectionEvery: 1, particles: 1,
  });
  return quality.tier;
}

/** Re-read the player's setting (called at boot and when the setting changes). Returns whether Auto is in charge. */
export function applyQualitySetting() {
  const r = resolveTier({ forced: quality.forced, setting: settings.qualityTier ?? 0, software });
  quality.auto = r.auto;
  quality.software = software;
  setTier(r.tier);
  return r.auto;
}
applyQualitySetting();
export { SETTING_TIERS };
