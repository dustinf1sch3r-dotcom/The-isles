// Land taken by a village: how often a village is raised on another people's claim, how much land goes with it, and what is done about it.
// node tools/land.js [seeds] [years]   (default seeds 2,7,21,33,5,14, 200 years). ISLES_SIM=<sim.js> measures another build (the base has no records: seizures are counted from the claim map the same way for both).
// The player answers option 0 to every card, except that a world demand against its own village is refused (so the world's drives against the player also happen).
const S = require(process.env.ISLES_SIM || require('path').join(__dirname, '..', 'build', 'sim.js'));
const seeds = (process.argv[2] || '2,7,21,33,5,14').split(',').map(Number), YEARS = +(process.argv[3] || 200), N = 200, CELL = 5000;
const tot = { years: 0, seizeP: 0, seizeW: 0, lostP: 0, lostW: 0, gone5: 0, nW: 0, nP: 0, vill: 0, villForeign: 0, cards: {}, rec: 0, back: 0, ask: 0, askYes: 0, drive: 0, driveWon: 0, expel: 0, pAsk: 0, pAskYes: 0, pDrive: 0, pDriveWon: 0, seizeRec: 0, seizeRecP: 0, pop: 0 };
for (const seed of seeds) {
  const W = S.createWorld(seed); S.seedFirstPop(W); const cs0 = S.houseCandidates(W); S.choosePlayer(W, cs0[seed % Math.min(5, cs0.length)].head); const P = W.player;
  const cellOf = (x, y) => Math.min(N - 1, Math.max(0, Math.floor(y / CELL))) * N + Math.min(N - 1, Math.max(0, Math.floor(x / CELL)));
  let prevClaim = null, prevPos = new Map(), track = [], yearsRun = 0, cards = {}, ev = [];
  for (let y = 1; y <= YEARS && !P.over; y++) {
    for (let w = 0; w < 52; w++) {
      S.step(W);
      while (W.pending.length) { const e = W.pending[0]; cards[e.type] = (cards[e.type] || 0) + 1; S.resolve(W, e, e.type === 'landdemand' ? 1 : 0); }
      if (W.notices) W.notices.length = 0;
    }
    if (P.over) break; yearsRun = y;
    const cl = W.claim, pt = P.head && P.head.clan ? P.head.clan.tribe : null, now = new Map();
    for (const c of W.clans) {
      if (!c.settled || !c.alive || !c.tribe) continue; now.set(c.id, { x: c.x, y: c.y, sa: c.settledAt });
      const cell = cellOf(c.x, c.y), isP = pt && c.tribe === pt; tot.vill++; if (cl[cell] >= 0 && cl[cell] !== c.tribe.id) tot.villForeign++;
      const pv = prevPos.get(c.id);
      if (prevClaim && (!pv || Math.hypot(pv.x - c.x, pv.y - c.y) > 1500 || pv.sa !== c.settledAt)) {
        const A = prevClaim[cell];
        if (A >= 0 && A !== c.tribe.id) { const At = W.ents.get(A);
          if (At && At.alive && At.clans.length) {
            const cx = Math.floor(c.x / CELL), cy = Math.floor(c.y / CELL), cells = [];
            for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) { const xx = cx + dx, yy = cy + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N || Math.hypot(dx, dy) > 8) continue; const i = yy * N + xx; if (prevClaim[i] === A) cells.push(i); }
            const e = { y, onP: !!(pt && At === pt), B: c.tribe.id, cells, c, pos: [c.x, c.y], lost5: null, gone: null }; ev.push(e); track.push(e); } } }
    }
    for (const T of track) { const dt = y - T.y; if (dt < 0 || dt > 5) continue; const same = T.c.alive && T.c.settled && Math.hypot(T.c.x - T.pos[0], T.c.y - T.pos[1]) < 1500; if (!same && T.gone == null) T.gone = dt; if (dt === 5) T.lost5 = T.cells.filter(i => cl[i] === T.B).length; }
    prevClaim = Int32Array.from(cl); prevPos = now;
  }
  const done = ev.filter(e => e.lost5 != null), sum = a => a.reduce((x, y) => x + y, 0);
  const R = { seizeP: ev.filter(e => e.onP).length, seizeW: ev.filter(e => !e.onP).length, lostP: sum(done.filter(e => e.onP).map(e => e.lost5)), nP: done.filter(e => e.onP).length, lostW: sum(done.filter(e => !e.onP).map(e => e.lost5)), nW: done.filter(e => !e.onP).length, gone5: done.filter(e => e.gone != null).length };
  let pop = 0; for (const t of W.tribes) if (t.alive) pop += S.tribeSize(t);
  console.log(`seed ${seed} yrs ${yearsRun}${P.over ? ' (house ended)' : ''} | seizures: on player ${R.seizeP}, on world ${R.seizeW} | cells lost within 5 yrs: player ${R.nP ? (R.lostP / R.nP).toFixed(1) : '-'} per seizure, world ${R.nW ? (R.lostW / R.nW).toFixed(1) : '-'} | village gone within 5 yrs ${R.gone5}/${done.length} | records ${W.nLandSeize || 0} (on player ${W.nLandSeizeP || 0}) | world asks ${(W.nLandAsk || 0) - (W.nLandPAsk || 0)} yes ${(W.nLandAskYes || 0) - (W.nLandPAskYes || 0)} | world drives ${(W.nLandDrive || 0) - (W.nLandPDrive || 0)} won ${(W.nLandDriveWon || 0) - (W.nLandPDriveWon || 0)} | expelled ${W.nLandExpel || 0} | cells back ${W.nLandCells || 0} | player deeds/cards: ask ${W.nLandPAsk || 0} yes ${W.nLandPAskYes || 0}, drive ${W.nLandPDrive || 0} won ${W.nLandPDriveWon || 0} | cards ${['landtaken', 'landdemand', 'landattack'].map(k => k + ' ' + (cards[k] || 0)).join(', ')} | pop ${pop}`);
  tot.years += yearsRun; for (const k of ['seizeP', 'seizeW', 'lostP', 'lostW', 'nP', 'nW', 'gone5']) tot[k] += R[k]; tot.rec += W.nLandSeize || 0; tot.seizeRecP += W.nLandSeizeP || 0; tot.back += W.nLandCells || 0; /* the counters count the player's too: taken out here */ tot.ask += (W.nLandAsk || 0) - (W.nLandPAsk || 0); tot.askYes += (W.nLandAskYes || 0) - (W.nLandPAskYes || 0); tot.drive += (W.nLandDrive || 0) - (W.nLandPDrive || 0); tot.driveWon += (W.nLandDriveWon || 0) - (W.nLandPDriveWon || 0); tot.expel += W.nLandExpel || 0; tot.pAsk += W.nLandPAsk || 0; tot.pAskYes += W.nLandPAskYes || 0; tot.pDrive += W.nLandPDrive || 0; tot.pDriveWon += W.nLandPDriveWon || 0; tot.pop += pop;
  for (const k in cards) tot.cards[k] = (tot.cards[k] || 0) + cards[k];
}
console.log(`TOTAL ${seeds.length} seeds, ${tot.years} years | seizures (claim-map count): on player ${tot.seizeP}, on world ${tot.seizeW} | cells lost in 5 yrs per seizure: player ${tot.nP ? (tot.lostP / tot.nP).toFixed(1) : '-'}, world ${tot.nW ? (tot.lostW / tot.nW).toFixed(1) : '-'} | villages gone in 5 yrs ${tot.gone5}/${tot.nP + tot.nW} | villages standing on foreign claim at year ends ${tot.villForeign}/${tot.vill}`);
console.log(`records ${tot.rec} (on player ${tot.seizeRecP}) | world asks ${tot.ask} yes ${tot.askYes} | world drives ${tot.drive} won ${tot.driveWon} | expelled ${tot.expel} | cells given back ${tot.back} | player: ask ${tot.pAsk} yes ${tot.pAskYes}, drive ${tot.pDrive} won ${tot.pDriveWon} | cards ${JSON.stringify(tot.cards)} | world pop ${tot.pop}`);
