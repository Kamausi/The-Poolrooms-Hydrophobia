import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const reg = JSON.parse(fs.readFileSync(path.join(root, 'assets/registry.json'), 'utf8'));
const credits = fs.readFileSync(path.join(root, 'docs/CREDITS.md'), 'utf8');
const shipped = [
  ...fs.readdirSync(path.join(root, 'public/audio')).filter((f) => f.endsWith('.mp3')).map((f) => `public/audio/${f}`),
  ...fs.readdirSync(path.join(root, 'src/assets')).map((f) => `src/assets/${f}`),
  ...(fs.existsSync(path.join(root, 'public/assets')) ? fs.readdirSync(path.join(root, 'public/assets'), { recursive: true }).filter((f) => /\.\w+$/.test(String(f))).map((f) => `public/assets/${f}`) : []),
];

describe('asset registry', () => {
  it('lists every third-party file the game ships', () => {
    const listed = new Set(reg.entries.flatMap((e) => e.files));
    expect(shipped.filter((f) => !listed.has(f))).toEqual([]);
  });
  it('lists no file that is missing from disk', () => {
    expect(reg.entries.flatMap((e) => e.files).filter((f) => !fs.existsSync(path.join(root, f)))).toEqual([]);
  });
  it('every entry has an allowed licence, a source and a link; attribution licences name a creator', () => {
    for (const e of reg.entries) {
      expect(reg.allowed, e.id).toContain(e.license);
      expect(e.source && e.url, e.id).toBeTruthy();
      if (e.license !== 'CC0-1.0') expect(e.creator, e.id).toBeTruthy();
    }
  });
  it('docs/CREDITS.md names every source in the registry', () => {
    for (const s of new Set(reg.entries.map((e) => e.source.split(' (')[0].replace(/ \d[\d.]*$/, '')))) expect(credits, s).toContain(s);
  });
});
