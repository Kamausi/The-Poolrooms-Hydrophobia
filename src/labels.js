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
    sign: ['#14211b', '#e9efd8', '#3b4a3f'],
    rule: ['#f2f0e8', '#a3241a', '#a3241a'],
    depth: ['#dfe6e2', '#1f3a52', '#9fb0a8'],
    uv: ['#06020c', '#d29bff', '#3a1660'],
    safe: ['#0d3a1c', '#b8ffcb', '#2f8f4f'],
    amber: ['#2a1d05', '#ffcf5a', '#7a5a12'],
  }[style] || ['#14211b', '#e9efd8', '#3b4a3f'];
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
  g.font = `700 ${size}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif`;
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  if (widest > width * 0.9) {
    size *= (width * 0.9) / widest;
    g.font = `700 ${size}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif`;
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
