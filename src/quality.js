// Render quality. Software renderers (no GPU) get 67js's 'light' shading and fewer lamps.
// ?quality=low|high in the URL overrides the detection.

function detectSoftware() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software|basic render/i.test(String(name));
  } catch {
    return false;
  }
}

const forced = new URLSearchParams(location.search).get('quality');
const low = forced ? forced === 'low' : detectSoftware();

export const quality = {
  low,
  renderer: low
    ? { samples: 1, pixelRatio: 0.6, shading: 'light' }
    : { samples: 2, pixelRatio: Math.min(devicePixelRatio || 1, 1.5), shading: 'full' },
  lights: low ? 4 : 10,
  bloom: low ? 0 : 0.45,
};
