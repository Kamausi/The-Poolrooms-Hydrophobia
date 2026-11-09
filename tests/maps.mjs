// Every map is solvable: from the dock, the cell candidates (P) and the machine (S) are reachable once puzzle doors open;
// quiet rooms (Q), caches (C) and the restroom (R) are reachable before; puzzle doors are approachable from outside.
import { SECTORS as S0, REFERENCE_CHAPTER } from '../src/sectors.js'; const SECTORS = [...S0, REFERENCE_CHAPTER];
let bad = 0;
for (const s of SECTORS) {
  const g = s.map.map(r => [...r]);
  const H = g.length, W = g[0].length;
  if (!g.every(r => r.length === W)) { console.log(s.id, 'ragged rows'); bad++; continue; }
  const find = ch => { const o=[]; g.forEach((r,z)=>r.forEach((c,x)=>c===ch&&o.push([x,z]))); return o; };
  const T = find('T');
  const reach = (start, open) => {
    const seen = new Set([start.join()]); const q=[start];
    while (q.length) { const [x,z]=q.shift();
      const nb=[[x+1,z],[x-1,z],[x,z+1],[x,z-1]];
      const ti=T.findIndex(([a,b])=>a===x&&b===z); if (ti>=0 && T[ti^1]) nb.push(T[ti^1]);
      for (const [nx,nz] of nb) { const c=g[nz]?.[nx]; if(!c||c==='#'||c==='x'||c==='o') continue;
        if (c==='B'&&!open) continue; if (c==='K'&&!open) continue; if (c==='G'&&!open) continue;
        const k=nx+','+nz; if(!seen.has(k)){seen.add(k);q.push([nx,nz]);} } }
    return seen; };
  const D=find('D')[0]; const closed=reach(D,false), opened=reach(D,true);
  const need = (label, cells, set) => { for (const c of cells) if(!set.has(c.join())) { console.log(s.id, label, c, 'UNREACHABLE'); bad++; } };
  need('P', find('P'), opened); need('S', find('S'), opened);
  need('Q', find('Q'), closed); need('C', find('C'), closed); need('R-area', find('R'), closed);
  // keypad must be approachable from outside; gate likewise
  for (const [x,z] of [...find('K'),...find('G')]) if(![[x+1,z],[x-1,z],[x,z+1],[x,z-1]].some(c=>closed.has(c.join()))) { console.log(s.id,'puzzle door not approachable',x,z); bad++; }
  for (const ch of 'DPS') if (!find(ch).length) { console.log(s.id,'missing',ch); bad++; }
  console.log(s.id.padEnd(22), `${W}x${H}`, 'P', find('P').length, 'u', find('u').length, 'docs', find('l').length, closed.size, opened.size);
}
console.log(bad ? `PROBLEMS: ${bad}` : 'ALL MAPS SOLVABLE');
process.exit(bad ? 1 : 0);
