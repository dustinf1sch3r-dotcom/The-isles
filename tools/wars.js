// realm wars over many years, answering option 0 to every decision (or WARCALL=1 to keep the house's men at home when asked).
// usage: node tools/wars.js 2,7,21,33 200     (ISLES_SIM=path runs another build; the base has no `warcall` cards or hold-backs)
// counts are read from the chronicle lines the sim writes as the game goes (hooked on push, so the 300-line cap loses none)
const S = require(process.env.ISLES_SIM || require('path').join(__dirname, '..', 'build', 'sim.js'));
const seeds = (process.argv[2] || '2,7,21,33').split(',').map(Number), YEARS = +(process.argv[3] || 200), ANS = +(process.env.WARCALL || 0);
const tot = {};
for (const seed of seeds) {
  const W = S.createWorld(seed); S.seedFirstPop(W); const cs = S.houseCandidates(W); S.choosePlayer(W, cs[seed % Math.min(5, cs.length)].head); const P = W.player;
  const c = { declared: 0, battlesWon: 0, battlesLost: 0, submitted: 0, gaveUp: 0, calledOff: 0, warcall: 0, pressed: 0, holdPlayerTribe: 0, onPlayerTribe: 0 }, firstWarcall = [];
  const push = W.events.push.bind(W.events);
  W.events.push = function (e) {
    const t = e.text || '';
    if (/goes to war to subjugate/.test(t)) { c.declared++; const hc = P.head && P.head.clan; if (hc && hc.tribe && t.indexOf('subjugate the ' + hc.tribe.name + '.') > 0) c.onPlayerTribe = (c.onPlayerTribe || 0) + 1; }
    else if (/in the last battle\)/.test(t)) { c.submitted++; c.battlesWon++; }
    else if (/^Battle: .* defeat the/.test(t)) c.battlesWon++;
    else if (/^Battle: the .* repel/.test(t)) c.battlesLost++;
    else if (/ abandons (his|her) war/.test(t)) c.gaveUp++;
    else if (/called off the war/.test(t)) c.calledOff++;
    else if (/clan keeps its men at home/.test(t)) c.holdPlayerTribe++;
    return push(e);
  };
  let y = 1;
  for (; y <= YEARS && !P.over; y++) for (let w = 0; w < 52; w++) {
    S.step(W);
    while (W.pending.length) { const e = W.pending[0]; if (e.type === 'warcall') { c.warcall++; firstWarcall.push(y); S.resolve(W, e, ANS); } else { if (e.type === 'pressed') c.pressed++; S.resolve(W, e, 0); } }
    if (W.notices) W.notices.length = 0;
  }
  c.holdWorld = W.nHoldBack || 0; c.realmsAlive = W.confeds.length; c.endYear = y - 1; c.houseOver = !!P.over; if (firstWarcall.length) c.warcallYears = firstWarcall.join(',');
  console.log('seed', seed, JSON.stringify(c));
  for (const k in c) if (typeof c[k] === 'number') tot[k] = (tot[k] || 0) + c[k];
}
console.log('total', JSON.stringify(tot));
