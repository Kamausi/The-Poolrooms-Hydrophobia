// What the AI believes, as text, for `?debug=ai`: each entity's perception (awareness, state, seconds since it last
// sensed you, where it thinks you are), what it intends (pursuit mode, whether it holds an attack slot, a burst
// winding up), and what the omens are reading from the player. Pure: the scene hands in plain data; the caller
// puts the text on screen. Unit-tested.

const f1 = (v) => (typeof v === 'number' ? v.toFixed(1) : '-');
const at = (p) => (p ? `${f1(p[0])},${f1(p[2])}` : '-');

/** @param {{ blooms?: any[], lifeguard?: any, followers?: any[], habits?: any, attendant?: any, learned?: any, observer?: any, phase?: string, me?: number[] }} w */
export function describeAI(w) {
  const lines = [`DIRECTOR ${w.phase || '-'}`];
  if (w.habits) lines.push(`PLAYER   scan ${f1(w.habits.scanning)} rush ${f1(w.habits.rushing)} hurt ${f1(w.habits.hurt)} linger ${f1(w.habits.lingering)}`);
  if (w.observer && w.observer.mode !== 'waiting') {
    const o = w.observer;
    lines.push(`OBSERVER ${o.mode}${o.at && w.me ? ` ${f1(Math.hypot(o.at[0] - w.me[0], o.at[2] - w.me[2]))} m` : ''} · moves ${o.moves} · ${o.seen ? `seen, out of sight ${f1(o.lostT)}s` : `unnoticed ${f1(o.hereT)}s`}`);
  }
  if (w.attendant) {
    const a = w.attendant, d = a.d;
    lines.push(`ATTENDANT trust ${a.trust} · ${d ? `${d.kind}${d.lie ? ' (FALSE: says ' + d.count + ' guests)' : ''} ${f1(a.t)}s` : `next in ${Math.max(0, a.cool).toFixed(0)}s`}${w.learned ? ` · burst dodged ${w.learned.stepAways}x${w.learned.spent ? ', exception used' : ''}` : ''}`);
  }
  (w.blooms || []).forEach((b, i) => {
    if (!b.active) return;
    const d = w.me ? Math.hypot(b.pos[0] - w.me[0], b.pos[2] - w.me[2]) : NaN;
    const perc = b.perc ? `${b.perc.state} ${f1(b.perc.awareness)} sensed ${f1(b.perc.sinceSensed)}s ago, thinks you are at ${at(b.perc.lastKnown)}` : 'no senses yet';
    const intent = [b.pur?.mode || (b.dormant ? 'dormant' : '-'), b.commit ? 'HOLDS A SLOT' : '', b.windup ? `SWELLING ${f1(b.windup)}s` : '', b.blind ? 'blind' : ''].filter(Boolean).join(' · ');
    lines.push(`BLOOM ${i}  ${f1(d)} m · ${perc} · ${intent}`);
  });
  if (w.lifeguard) lines.push(`LIFEGUARD ${w.lifeguard.state || '-'} · warnings ${w.lifeguard.violations ?? 0} · at ${at(w.lifeguard.pos)}`);
  (w.followers || []).forEach((f) => lines.push(`CREW ${String(f.id).toUpperCase()} at ${at(f.pos)} · speed ${f1(f.vel ? Math.hypot(...f.vel) : 0)} · ${f.route?.path ? `route ${f.route.path.length} cells` : 'direct'}`));
  return lines.join('\n');
}
