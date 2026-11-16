// A whole session on a controller and nothing else: an emulated standard gamepad (navigator.getGamepads) drives the
// menus, the raft, the Select chords, pause, the dock on foot and rebinding. The game runs in real time here (no
// manual stepping), because the pad is read by the frame loop.
const { chromium } = require('playwright');
const { check, finish, BASE } = require('./lib.cjs');

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 200)); });
  await page.addInitScript(() => {
    const pad = { id: 'Emulated standard gamepad', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    window.__pad = pad;
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad, null, null, null] });
  });
  await page.goto(`${BASE}/?quality=low`);
  await page.waitForFunction(() => !!window.__underflow, null, { timeout: 120000 });
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForFunction(() => !!window.__underflow, null, { timeout: 120000 });
  await page.waitForTimeout(800);

  const set = (i, on) => page.evaluate(([i, on]) => { const b = window.__pad.buttons[i]; b.pressed = on; b.value = on ? 1 : 0; window.__pad.timestamp++; }, [i, on]);
  const axis = (i, v) => page.evaluate(([i, v]) => { window.__pad.axes[i] = v; window.__pad.timestamp++; }, [i, v]);
  const wait = (ms) => page.waitForTimeout(ms);
  // Long enough to be seen at the few frames a second software rendering manages.
  const tap = async (i, hold = 600) => { await set(i, true); await wait(hold); await set(i, false); await wait(500); };
  const chord = async (i) => { await set(8, true); await wait(500); await tap(i); await set(8, false); await wait(600); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  /** Wait (up to 4 s) until `fn` is true in the page: frames are slow here, so poll rather than guess a delay. */
  const until = async (fn) => { for (let k = 0; k < 40; k++) { if (await ev(fn)) return true; await wait(100); } return false; };
  const A = 0, B = 1, X = 2, Y = 3, LB = 4, RT = 7, SELECT = 8, START = 9, R3 = 11, UP = 12, DOWN = 13;

  /** Move focus with the D-pad until it rests on `selector`, then press A. */
  const choose = async (selector, tries = 24) => {
    const seen = [];
    for (let k = 0; k < tries; k++) {
      if (await ev((s) => !!document.activeElement?.matches?.(s), selector)) { await tap(A); return true; }
      seen.push(await ev(() => document.activeElement?.id || (document.activeElement?.textContent || '').slice(0, 14)));
      await tap(DOWN, 400);
    }
    console.log('choose failed', selector, JSON.stringify(seen.slice(0, 12)));
    return false;
  };

  // ---- Settings with the controller: reach a slider with the D-pad, change it with left/right, back out with B.
  const RIGHT = 15;
  const openedSettings = await choose('#settings-btn');
  await wait(600);
  let slider = null;
  for (let k = 0; k < 40 && !slider; k++) {
    slider = await ev(() => { const el = document.activeElement; return el && el.type === 'range' ? { v: el.value, label: el.closest('label')?.textContent?.slice(0, 40) || el.id || 'slider' } : null; });
    if (!slider) await tap(DOWN, 300);
  }
  if (slider) await tap(RIGHT, 400);
  const changed = await ev(() => document.activeElement?.type === 'range' ? document.activeElement.value : null);
  await tap(B);
  const backAtMenu = await until(() => document.getElementById('modal').hidden && !!document.getElementById('start-exp')?.offsetParent);
  check('settings: the D-pad reaches a slider, right changes it, B backs out to the menu', openedSettings && slider && changed !== null && changed !== slider.v && backAtMenu, JSON.stringify({ openedSettings, slider, changed, backAtMenu }));

  // ---- Menus: a new expedition with the D-pad and A only.
  const startExp = await choose('#start-exp');
  await wait(400);
  const start = await choose('#start');
  await wait(800);
  const pick = await choose('#modal-body .choice');
  await wait(300);
  const confirm = await choose('#modal-actions button');
  await page.waitForFunction(() => window.__underflow.mode === 'ride', null, { timeout: 60000 }).catch(() => {});
  const inRide = await ev(() => window.__underflow.mode);
  check('a new expedition starts from the main menu with the D-pad and A alone', startExp && start && pick && confirm && inRide === 'ride', JSON.stringify({ startExp, start, pick, confirm, inRide }));

  // ---- The raft.
  await wait(1500);
  const charge0 = await ev(() => window.__underflow.state.charge);
  await set(RT, true); await wait(1200); await set(RT, false); await wait(200);
  const charge1 = await ev(() => window.__underflow.state.charge);
  const off0 = await ev(() => window.__ride.offset);
  await axis(0, 1); await wait(3000); await axis(0, 0);
  const off1 = await ev(() => window.__ride.offset);
  await set(A, true); let jumped = 0;
  for (let k = 0; k < 8; k++) { await wait(80); jumped = Math.max(jumped, await ev(() => window.__ride.jumpY)); }
  await set(A, false); await wait(600);
  const aim0 = await ev(() => [...window.__underflow.input.aim]);
  await axis(2, 1); await wait(2000); await axis(2, 0);
  const aim1 = await ev(() => [...window.__underflow.input.aim]);
  check('on the raft: right trigger fires, left stick steers, A hops, right stick aims', charge1 < charge0 && Math.abs(off1 - off0) > 0.2 && jumped > 0.05 && aim1[0] > aim0[0] + 0.15, JSON.stringify({ charge0, charge1, off0, off1, jumped, aim0, aim1 }));

  // Pull the stick back: the raft is told to brake (on a section that brakes) or backstroke (paddling).
  await axis(1, 1); await until(() => window.__underflow.input.move[1] < -0.5);
  const back = await ev(() => window.__underflow.input.move[1]);
  await axis(1, 0); await wait(200);
  check('pulling the left stick back is read as back / brake', back < -0.5, String(back));

  // The Select chords: Ride Control, the helm, and dressing on Select alone.
  const auto0 = await ev(() => !!window.__underflow.state.autopilot);
  await chord(X); const auto1 = await ev(() => !!window.__underflow.state.autopilot);
  await chord(X); const auto2 = await ev(() => !!window.__underflow.state.autopilot);
  await chord(Y); const helm1 = await ev(() => window.__underflow.state.helm || null);
  await chord(Y); const helm2 = await ev(() => window.__underflow.state.helm || null);
  const scanDuringChord = await (async () => { await set(SELECT, true); await wait(400); await set(Y, true); await wait(600); const s = await ev(() => window.__underflow.input.scanning); await set(Y, false); await wait(400); await set(SELECT, false); await wait(600); return s; })();
  if (await ev(() => !!window.__underflow.state.helm)) await chord(Y); // that chord handed the helm over again: take it back
  check('Select+X switches Ride Control on and off; Select+Y hands over the helm and takes it back; the chord does not also scan', !auto0 && auto1 && !auto2 && helm1 && !helm2 && !scanDuringChord, JSON.stringify({ auto0, auto1, auto2, helm1, helm2, scanDuringChord }));
  await ev(() => window.__underflow.setState({ health: 40, dressings: 2 }));
  const dress0 = await ev(() => window.__underflow.state.dressings);
  await tap(SELECT, 600); await wait(1500);
  const dress1 = await ev(() => window.__underflow.state.dressings);
  const label = await ev(() => ['helm', 'autopilot', 'override'].map((a) => window.__underflow.bindingLabel(a)).join('|'));
  check('Select on its own still applies a field dressing; prompts name the chord', dress1 < dress0 && label === 'Select + Y|Select + X|Select + A', JSON.stringify({ dress0, dress1, label }));

  // ---- Pause with Start, navigate it, resume with B.
  await tap(START);
  const paused = await until(() => !document.getElementById('paused').hidden);
  const focusMoves = await (async () => { await tap(DOWN, 400); const a = await ev(() => document.activeElement?.textContent || ''); await tap(DOWN, 400); const b = await ev(() => document.activeElement?.textContent || ''); return a !== b && !!a; })();
  await tap(B);
  const resumed = await until(() => document.getElementById('paused').hidden);
  check('Start pauses, the D-pad moves through the pause menu, B resumes', paused && focusMoves && resumed, JSON.stringify({ paused, focusMoves, resumed }));

  // ---- On foot, with no mouse and no pointer lock.
  await ev(() => { window.__underflow.setState({ health: 1e6 }); window.__underflow.startExplore(); });
  await page.waitForFunction(() => window.__underflow.mode === 'explore', null, { timeout: 60000 }).catch(() => {});
  await wait(1500);
  const E = await ev(() => !!window.__explore);
  const p0 = await ev(() => [...window.__explore.player.pos]);
  await axis(1, -1); await wait(2500); await axis(1, 0); await wait(300);
  const p1 = await ev(() => [...window.__explore.player.pos]);
  const yaw0 = await ev(() => window.__explore.player.yaw);
  await axis(2, 1); await wait(3500); await axis(2, 0); await wait(300);
  const yaw1 = await ev(() => window.__explore.player.yaw);
  const locked = await ev(() => window.__underflow.input.locked);
  const c0 = await ev(() => window.__underflow.state.charge);
  await set(RT, true); await wait(1000); await set(RT, false); await wait(200);
  const c1 = await ev(() => window.__underflow.state.charge);
  const prompt = await ev(() => document.getElementById('prompt')?.textContent || '');
  check('on foot without pointer lock: the left stick walks, the right stick turns you right, the trigger fires, and nobody is asked to click', E && Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) > 1 && yaw1 < yaw0 - 0.15 && !locked && c1 < c0 && !/CLICK/.test(prompt), JSON.stringify({ moved: Math.hypot(p1[0] - p0[0], p1[2] - p0[2]).toFixed(2), turn: (yaw1 - yaw0).toFixed(2), locked, c0, c1, prompt }));
  await set(Y, true);
  const scanning = await until(() => window.__underflow.input.scanning);
  await set(Y, false); await wait(200);
  const lamp0 = await ev(() => window.__underflow.state.lamp?.mode);
  await tap(DOWN); const lamp1 = await ev(() => window.__underflow.state.lamp?.mode);
  await chord(B); const placed = await ev(() => !!window.__explore.lampPlaced);
  await chord(B); const picked = await ev(() => !window.__explore.lampPlaced);
  await tap(R3);
  const map = await ev(() => !document.getElementById('survey').hidden);
  await tap(R3); await wait(300);
  const lampLabel = await ev(() => ['lamp', 'lampPlace', 'map'].map((a) => window.__underflow.bindingLabel(a)));
  check('on foot: Y scans, D-pad down cycles the lamp, Select+B sets it down and picks it up, R3 opens the survey map, and the prompts name those buttons', scanning && lamp1 !== lamp0 && placed && picked && map && lampLabel.join('|') === 'D-pad down|Select + B|R3', JSON.stringify({ scanning, lamp0, lamp1, placed, picked, map, lampLabel }));

  // ---- A Safe Room with the controller: its sheet is navigable and A on the launch button leaves it.
  await ev(() => window.__underflow.enterSafeRoom());
  await until(() => window.__underflow.mode === 'safe' && !document.getElementById('modal').hidden);
  const inSafe = await ev(() => window.__underflow.mode);
  const launched = await choose('#modal-actions button', 40);
  const leftSafe = await until(() => window.__underflow.mode === 'ride');
  check('in a Safe Room the D-pad reaches the launch button and A leaves on the raft', inSafe === 'safe' && launched && leftSafe, JSON.stringify({ inSafe, launched, leftSafe }));

  // ---- Rebinding a controller button from the settings, with the controller.
  await ev(() => { const u = window.__underflow; u.input.padCapture = (i) => { (u.settings.padBindings ||= {}).hop = i; }; });
  await tap(LB); await until(() => window.__underflow.settings.padBindings?.hop !== undefined);
  const bound = await ev(() => window.__underflow.settings.padBindings?.hop);
  await ev(() => { window.__underflow.settings.padBindings = {}; });
  check('rebinding takes the next controller button pressed', bound === LB, JSON.stringify({ bound }));

  await finish(browser, errors);
})();
