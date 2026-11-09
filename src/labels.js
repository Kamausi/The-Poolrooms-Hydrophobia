// Text drawn onto canvases and used as 67js texture maps: signs, rule boards, depth markings.

const cache = new Map();

/**
 * A sign texture. Each distinct text makes one texture (and one 67js batch), so signs are cached by content.
 * style: 'sign' (dark board, pale text), 'rule' (white board, red text), 'depth' (tile with painted numbers),
 * 'uv' (black with glowing violet text), 'safe' (green board).
 */
export function labelTexture(text, style = 'sign', width = 512, height = 128) {
  const key = `${style}|${width}x${height}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  const palette = {
    // The UNDERFLOW palette: dead porcelain, faded pool teal, deep water, worn safety yellow, warning coral,
    // checkpoint green and blacklight violet. Official, credible lettering; the information is what is wrong.
    sign: ['#112b31', '#d8d8ca', '#4d7472'],
    rule: ['#d8d8ca', '#c45a50', '#c45a50'],
    depth: ['#d8d8ca', '#2c4f5c', '#aaa881'],
    uv: ['#080d10', '#a78cde', '#3a2a60'],
    safe: ['#1d3a28', '#d8eedb', '#86aa8a'],
    amber: ['#1a1608', '#b19a50', '#6d5f2c'],
    count: ['#080d10', '#d8d8ca', '#4d7472'],
    hand: ['#d8d8ca', '#3a2620', '#d8d8ca'], // handwriting scrawled on tile
  }[style] || ['#112b31', '#d8d8ca', '#4d7472'];
  g.fillStyle = palette[0];
  g.fillRect(0, 0, width, height);
  g.strokeStyle = palette[2];
  g.lineWidth = Math.max(4, height * 0.05);
  g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, width - g.lineWidth, height - g.lineWidth);
  g.fillStyle = palette[1];
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lines = String(text).split('\n');
  let size = height / (lines.length + 0.6);
  const face = style === 'hand' ? '500 SIZEpx "Caveat", "Shadows Into Light", cursive' : style === 'count' || style === 'depth' ? '500 SIZEpx "IBM Plex Mono", monospace' : '500 SIZEpx "Barlow Condensed", "Arial Narrow", Impact, sans-serif';
  g.font = face.replace('SIZE', size);
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  if (widest > width * 0.9) {
    size *= (width * 0.9) / widest;
    g.font = face.replace('SIZE', size);
  }
  lines.forEach((line, i) => g.fillText(line, width / 2, height / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
  const texture = { image: canvas, colorSpace: 'srgb' };
  cache.set(key, texture);
  return texture;
}

/** The material for a sign with UV mapping across one face (box mapping off). */
export function signMaterial(text, style = 'sign', emission = 0.6, width = 512, height = 128) {
  const map = labelTexture(text, style, width, height);
  return { color: [1, 1, 1], metallic: 0, roughness: 0.6, map, emission, emissiveColor: [1, 1, 1], emissiveMap: map };
}

/** A unit quad in the XY plane facing +Z, with UVs, for signs and decals. */
export function quad() {
  return {
    positions: new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };
}
