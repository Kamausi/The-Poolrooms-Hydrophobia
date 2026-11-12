// UNDERFLOW's post chain: up to four full-screen passes that run on the finished frame, after the engine's own
// bloom, exposure and view transform. Colours here are display-referred (0 to 1).
//
//   optics   what the lens does: wet beads bending the view, chromatic fringing toward the corners, horizontal
//            streaks off the fixtures, dirt that only shows where there is glare
//   grade    what the picture means: a filmic contrast curve, a teal/warm split tone, colour draining with Drift,
//            the blue-green of being under water, red closing in when you are hurt or nearly gone; and wet tile:
//            a darker band and a mineral line on the walls just above the water (found from depth)
//   fxaa     edge smoothing
//   finish   a light sharpen, then dither so dark gradients do not band
//
// Pure: fragments are text and uniforms are numbers. The scenes hand the list to the engine's user-pass addon.
// The engine allows 4 passes, 4096 bytes and 16 uniforms each, no preprocessor lines, counted loops only.

const NOISE = `
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}`;

export const FRAGMENTS = {
  optics: `${NOISE}
vec3 glare(vec2 uv) { vec3 c = texture(sceneColor, uv).rgb; return c * smoothstep(0.72, 1.0, max(c.r, max(c.g, c.b))); }
vec4 userPass(vec2 uv) {
  vec2 p = uv;
  if (wet > 0.0) {
    // Beads of water on the lens: each cell may hold one, sliding down slowly, bending what is behind it.
    vec2 g = uv * vec2(resolution.x / resolution.y, 1.0) * 9.0;
    vec2 cell = floor(g);
    float r = hash21(cell + 7.0);
    vec2 f = fract(g) - 0.5 + vec2(0.0, (fract(r * 3.1 + time * (0.02 + r * 0.04)) - 0.5) * 0.5);
    float bead = smoothstep(0.08 + 0.2 * r, 0.0, length(f)) * step(0.55, r);
    p += f * bead * wet * 0.07;
  }
  vec2 d = p - 0.5;
  float a = aberration * dot(d, d);
  vec3 c = vec3(texture(sceneColor, p + d * a).r, texture(sceneColor, p).g, texture(sceneColor, p - d * a).b);
  if (streak > 0.0 || dirt > 0.0) {
    vec3 s = vec3(0.0);
    float px = 6.0 / resolution.x;
    for (int i = 1; i < 9; i++) {
      float o = float(i) * px;
      s += (glare(p + vec2(o, 0.0)) + glare(p - vec2(o, 0.0))) * (1.0 - float(i) / 9.0);
    }
    c += s * streak * 0.05 * vec3(0.75, 0.92, 1.0);
    c += s * dirt * 0.07 * vnoise(uv * 14.0) * vnoise(uv * 5.0 + 3.0);
  }
  return vec4(c, 1.0);
}`,
  grade: `
float gh(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float gn(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(gh(vec2(i, 3.0)), gh(vec2(i + 1.0, 3.0)), f); }
vec4 userPass(vec2 uv) {
  vec3 c = texture(sceneColor, uv).rgb;
  if (damp > 0.0 && depthAt(uv) < 0.9999) {
    // Wet tile: walls are darker for a hand's height above the water, with an uneven edge and a pale mineral line.
    vec3 wp = worldPointAt(uv);
    float wall = 1.0 - smoothstep(0.3, 0.6, abs(worldNormalAt(uv).y));
    float along = wp.x + wp.z;
    float top = waterLevel + 0.55 * (0.55 + 0.45 * gn(along * 0.7));
    float band = (1.0 - smoothstep(top - 0.12, top + 0.05, wp.y)) * step(waterLevel - 0.05, wp.y) * wall * damp;
    c *= mix(1.0, 0.66, band);
    float line = smoothstep(0.05, 0.0, abs(wp.y - (waterLevel + 0.07))) * wall * damp;
    c += vec3(0.06, 0.06, 0.05) * line * gn(along * 5.0);
  }
  c = mix(c, c * c * (3.0 - 2.0 * c), contrast);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, c * mix(shadowTint, highTint, smoothstep(0.15, 0.75, l)), split);
  c = mix(c, vec3(l) * vec3(0.86, 1.0, 0.9), drift * 0.55);
  if (under > 0.0) {
    float far = smoothstep(0.9, 1.0, depthAt(uv));
    c = mix(c, c * vec3(0.35, 0.8, 0.85) + vec3(0.0, 0.05, 0.07) * far, under);
  }
  float edge = smoothstep(0.25, 0.85, length(uv - 0.5) * 1.35);
  float red = clamp(hurt + lowHealth * (0.6 + 0.4 * sin(time * 5.0)), 0.0, 1.0);
  l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, vec3(l * 1.1 + 0.05, l * 0.25, l * 0.2), edge * red * 0.5);
  return vec4(clamp(c, 0.0, 1.0), 1.0);
}`,
  fxaa: `
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec4 userPass(vec2 uv) {
  vec2 px = 1.0 / resolution;
  vec3 m = texture(sceneColor, uv).rgb;
  float lm = luma(m);
  float nw = luma(texture(sceneColor, uv + vec2(-1.0, -1.0) * px).rgb);
  float ne = luma(texture(sceneColor, uv + vec2(1.0, -1.0) * px).rgb);
  float sw = luma(texture(sceneColor, uv + vec2(-1.0, 1.0) * px).rgb);
  float se = luma(texture(sceneColor, uv + vec2(1.0, 1.0) * px).rgb);
  float lo = min(lm, min(min(nw, ne), min(sw, se)));
  float hi = max(lm, max(max(nw, ne), max(sw, se)));
  if (hi - lo < max(0.03, hi * 0.125)) return vec4(m, 1.0);
  vec2 dir = vec2(-((nw + ne) - (sw + se)), (nw + sw) - (ne + se));
  float reduce = max((nw + ne + sw + se) * 0.03125, 0.0078125);
  dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + reduce), vec2(-8.0), vec2(8.0)) * px;
  vec3 a = 0.5 * (texture(sceneColor, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture(sceneColor, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture(sceneColor, uv - dir * 0.5).rgb + texture(sceneColor, uv + dir * 0.5).rgb);
  float lb = luma(b);
  return vec4((lb < lo || lb > hi) ? a : b, 1.0);
}`,
  finish: `
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec4 userPass(vec2 uv) {
  vec2 px = 1.0 / resolution;
  vec3 c = texture(sceneColor, uv).rgb;
  vec3 n = texture(sceneColor, uv + vec2(px.x, 0.0)).rgb + texture(sceneColor, uv - vec2(px.x, 0.0)).rgb + texture(sceneColor, uv + vec2(0.0, px.y)).rgb + texture(sceneColor, uv - vec2(0.0, px.y)).rgb;
  c += (c - n * 0.25) * sharpen;
  float t = fract(time);
  float d = hash21(gl_FragCoord.xy + t * 61.0) + hash21(gl_FragCoord.xy * 1.7 + 13.0 + t * 17.0) - 1.0;
  c += d * dither / 255.0;
  return vec4(clamp(c, 0.0, 1.0), 1.0);
}`,
};

/** Which passes each quality tier runs. The light tier has no chain at all. */
export const TIER_PASSES = { low: [], medium: ['grade', 'finish'], high: ['optics', 'grade', 'fxaa', 'finish'], ultra: ['optics', 'grade', 'fxaa', 'finish'] };

const clamp01 = (v) => Math.max(0, Math.min(1, v || 0));

/**
 * The chain for this frame.
 * @param {string} tier low | medium | high | ultra
 * @param {{ drift?: number, health?: number, hurt?: number, wet?: number, under?: number, warm?: boolean, damp?: number, waterLevel?: number,
 *   reduceFlash?: boolean, distortion?: boolean }} g drift and health are 0..100; hurt, wet and under are 0..1
 * @returns {{ name: string, fragment: string, uniforms: Record<string, number | number[]> }[]}
 */
export function buildChain(tier, g = {}) {
  const drift = clamp01((g.drift || 0) / 100), health = g.health ?? 100;
  const calm = g.reduceFlash ? 0.4 : 1; // the "reduce flashes" setting also softens the red
  const lens = g.distortion === false ? 0 : 1; // and "distortion" off removes fringing and beads
  const uniforms = {
    optics: { aberration: lens * (0.012 + drift * 0.05 + clamp01(g.hurt) * 0.05), streak: tier === 'ultra' ? 1 : 0.7, dirt: 0.8, wet: lens * clamp01(g.wet) },
    grade: {
      contrast: 0.35, split: 0.6,
      shadowTint: g.warm ? [0.96, 1.0, 1.02] : [0.9, 1.01, 1.07], highTint: g.warm ? [1.07, 1.01, 0.9] : [1.04, 1.01, 0.95],
      damp: clamp01(g.damp), waterLevel: g.waterLevel ?? 0,
      drift, under: clamp01(g.under), hurt: clamp01(g.hurt) * calm, lowHealth: health < 35 ? clamp01((35 - health) / 35) * calm : 0,
    },
    fxaa: {},
    finish: { sharpen: tier === 'medium' ? 0.15 : 0.3, dither: 1 },
  };
  return (TIER_PASSES[tier] || []).map((name) => ({ name, fragment: FRAGMENTS[name], uniforms: uniforms[name] }));
}

