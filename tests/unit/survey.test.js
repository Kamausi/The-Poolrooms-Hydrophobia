import { describe, it, expect } from 'vitest';
import { createSurvey, visit, coverage, render, mark, seenList } from '../../src/survey.js';

const ROOM = ['#######', '#..#..#', '#.~#..#', '#.....#', '#######'];
const at = (x, z) => ROOM[z]?.[x] ?? '#';
const isWall = (x, z) => at(x, z) === '#';
const open = []; ROOM.forEach((r, z) => [...r].forEach((c, x) => { if (c !== '#') open.push([x, z]); }));

describe('the survey map', () => {
  it('starts blank and records only what can be seen in straight lines, never through a wall', () => {
    const s = createSurvey(7, 5);
    expect(coverage(s, open)).toBe(0);
    expect(visit(s, 1, 1, isWall)).toBe(4); // itself, east one (wall after), south two
    expect(s.seen[1 * 7 + 4]).toBe(0); // the other side of the dividing wall
    expect(visit(s, 1, 1, isWall)).toBe(0);
  });
  it('a wall is not a place: standing "in" one records nothing', () => { expect(visit(createSurvey(7, 5), 0, 0, isWall)).toBe(0); });
  it('coverage reaches 1 when every walkable cell has been seen', () => {
    const s = createSurvey(7, 5);
    for (const [x, z] of open) visit(s, x, z, isWall, 0);
    expect(coverage(s, open)).toBe(1);
  });
  it('draws seen floor, water, bordering walls, you and the raft, and nothing else', () => {
    const s = createSurvey(7, 5);
    visit(s, 1, 1, isWall);
    const rows = render(s, at, isWall, { you: [1, 1, 2], raft: [1, 3] });
    const text = rows.join('\n');
    expect(text).toContain('▼'); expect(text).toContain('R'); expect(text).toContain('█');
    expect(text).not.toContain('≈'); // the water cell at (2,2) is not in line of sight from (1,1)
    visit(s, 1, 2, isWall);
    expect(render(s, at, isWall).join('\n')).toContain('≈');
    expect(Math.max(...rows.map((r) => r.length))).toBeLessThan(7); // the unseen east room is trimmed away
  });
  it('a mark shows only once its cell is seen', () => {
    const s = createSurvey(7, 5);
    mark(s, 'P', 5, 1);
    visit(s, 1, 1, isWall);
    expect(render(s, at, isWall).join('')).not.toContain('P');
    visit(s, 5, 1, isWall);
    expect(render(s, at, isWall).join('')).toContain('P');
  });
  it('round-trips through a save', () => {
    const s = createSurvey(7, 5); visit(s, 4, 2, isWall);
    const t = createSurvey(7, 5, seenList(s));
    expect(render(t, at, isWall)).toEqual(render(s, at, isWall));
  });
});
