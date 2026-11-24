// The facility expected you (expected.js): at every dock a reservation for this crew by the mooring, booked the week
// Crew Seven went down, and a mark from Crew Seven to one of you by name. Both read with the inspection beam, into
// the field notes and the ledger.
const { open, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 640, height: 360 });
  await page.click('#start-exp'); await page.click('#start');
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.querySelector('#modal-body .choice')?.click(); document.querySelector('#modal-actions button')?.click(); });
  await page.waitForTimeout(300);
  const out = await page.evaluate(() => { const u = window.__underflow, res = [];
    for (const i of [0, 1, 2, 3]) {
      u.beginSector(i); u.startRide(); u.startExplore(); u.setState({ health: 1e6, drift: 0 }); u.sim(1);
      const E = window.__explore, X = E.expected;
      const read = (thing) => { if (!thing) return null; const eye = [thing.pos[0] + 2, thing.pos[1], thing.pos[2] + 2];
        // Stand in front of it: two metres out along the wall's normal, looking back at it.
        let text = '';
        for (const n of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const e = [thing.pos[0] + n[0] * 2, thing.pos[1], thing.pos[2] + n[1] * 2]; const d = [-n[0], 0, -n[1]];
          for (let k = 0; k < 40; k++) text = E.scanTick(1 / 30, e, d);
          if (/RESERVATION ·|MARK ·/.test(text)) return text; }
        return text; };
      const board = read(X.board), mark = read(X.mark);
      res.push({ sector: i, board: X.board?.text, boardRead: board, mark: X.mark && { to: X.mark.to, from: X.mark.from }, markRead: mark,
        signs: E.parts.filter((p) => /^Sign (RESERVED|MARS|JUNE|DEZ|TUBS)/.test(p.name)).length,
        noted: (u.state.readings || []).filter((r) => r.label === 'RESERVATION' || r.label === 'CREW SEVEN').length });
    }
    const ledger = localStorage.getItem('underflow-facility') || '';
    return { res, ledger: { board: /booked the week Crew Seven went down/.test(ledger), mark: /a mark from .* on Crew Seven, written to/.test(ledger) } }; });
  check('every dock has a reservation for this crew by the mooring, booked six weeks ago, party of four', out.res.every((r) => /PARTY OF 4/.test(r.board || '') && /TEAGUE/.test(r.board) && r.signs >= 2), JSON.stringify(out.res));
  check('each dock\'s Crew Seven mark is to a different crewmate in turn, from the one tied to them', out.res.map((r) => r.mark?.to).join() === 'mars,june,dez,tubs' && out.res[0].mark.from === 'Caleb', JSON.stringify(out.res.map((r) => r.mark)));
  check('both read with the beam into the field notes, and the ledger keeps them', out.res.every((r) => /WEEK CREW SEVEN WENT DOWN/.test(r.boardRead || '') && /^MARK · TO/.test(r.markRead || '') && r.noted >= 2) && out.ledger.board && out.ledger.mark, JSON.stringify({ reads: out.res.map((r) => [r.boardRead, r.markRead, r.noted]), ledger: out.ledger }));
  await finish(browser, errors);
})();
