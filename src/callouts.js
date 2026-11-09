// Callouts: a tap of Ping marks what you aim at (or checks the radio); holding it opens a strip of six calls.
// Move the aim left or right to choose, release to send. The call is marked where you aim and spoken on the
// radio by you, and a crewmate acknowledges it. Same input on keyboard and controller.
import { isDown } from './input.js';
import { hud } from './hud.js';
import { sound } from './audio.js';

export const CALLOUTS = [
  { id: 'go', label: 'GO HERE', line: 'Go here. This way.', reply: ['Moving.', 'On you.'] },
  { id: 'danger', label: 'DANGER HERE', line: 'Danger — there. Don\'t go near it.', reply: ['Seen it.', 'Giving it room.'] },
  { id: 'help', label: 'HELP ME', line: 'I need help. Here, now.', reply: ['Coming to you.', 'Hold on. On my way.'] },
  { id: 'wait', label: 'WAIT', line: 'Wait. Everyone hold.', reply: ['Holding.', 'Waiting on you.'] },
  { id: 'regroup', label: 'REGROUP', line: 'Regroup on me.', reply: ['Coming in.', 'With you.'] },
  { id: 'supplies', label: 'SUPPLIES HERE', line: 'Supplies here.', reply: ['Noted.', 'Good find.'] },
];
const HOLD_OPEN = 0.3;

/**
 * Per frame. aimX: a horizontal aim value that moves with the player's aim (ride: input.aim[0]; on foot: yaw).
 * step: how far aimX moves per slot. ping(): the existing tap behaviour. call(c): mark and voice a callout.
 */
export function createCallouts({ ping, call, step }) {
  let held = 0, open = false, base = 0, pick = 0;
  return {
    update(dt, aimX) {
      if (isDown('b')) {
        held += dt;
        if (!open && held >= HOLD_OPEN) { open = true; base = aimX; sound.uiMove?.(); }
        if (open) {
          const i = Math.max(0, Math.min(CALLOUTS.length - 1, 2 + Math.round((aimX - base) / step)));
          if (i !== pick) { pick = i; sound.uiMove?.(); }
          hud.callouts(CALLOUTS.map((c) => c.label), pick);
        }
        return;
      }
      if (held > 0) {
        if (open) { hud.callouts(null); call(CALLOUTS[pick]); } else ping();
        held = 0; open = false; pick = 2;
      }
    },
    get open() { return open; },
  };
}
