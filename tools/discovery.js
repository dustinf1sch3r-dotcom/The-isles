// how soon does the house meet another people? passive (no deeds) and explorer (explore deed whenever it is ready, target 0)
// usage: node tools/discovery.js 5,8,11,14,2,7,21,33 80
const S = require(process.env.ISLES_SIM || require('path').join(__dirname, '..', 'build', 'sim.js'));
const seeds = (process.argv[2] || '5,8,11,14').split(',').map(Number), Y = +(process.argv[3] || 80);
function run(seed, explorer) {
  const W = S.createWorld(seed); S.seedFirstPop(W); const cs = S.houseCandidates(W); S.choosePlayer(W, cs[0].head); const P = W.player;
  const mine = () => P.head.clan && P.head.clan.tribe;
  let first = null, sent = 0, dead = 0, meetBy = null;
  for (let y = 1; y <= Y && !P.over; y++) for (let w = 0; w < 52; w++) {
    S.step(W); while (W.pending.length) S.resolve(W, W.pending[0], 0);
    if (W.notices) W.notices.splice(0);
    if (P.over) break;
    if (first == null) { const t = mine(); if (t && W.tribes.some(o => o !== t && S.knowsTribe(W, o))) { first = y; meetBy = sent; } }
    if (explorer && first == null && P.head.alive && P.head.clan) {
      const a = S.playerActions(W).find(x => x.id === 'explore');
      if (a && a.ok) { sent++; const R = S.doAction(W, 'explore', 0, 0, null); if (R) { const m = /(\d+) of our men did not come back/.exec(R.text); if (m) dead += +m[1]; if (/never returned/.test(R.text)) dead++; } }
    }
  }
  return { first, sent: meetBy != null ? meetBy : sent, dead, signs: (P.signs || []).length };
}
const rows = [];
for (const seed of seeds) {
  const p = run(seed, false), e = run(seed, true);
  rows.push({ seed, p, e });
  console.log(`seed ${seed}: passive first known ${p.first == null ? 'never(' + Y + ')' : 'y' + p.first} | explorer first known ${e.first == null ? 'never(' + Y + ')' : 'y' + e.first}, expeditions ${e.sent}, men lost ${e.dead}`);
}
const mean = f => (rows.reduce((a, r) => a + f(r), 0) / rows.length).toFixed(1);
console.log(`means (never counts as ${Y}): passive ${mean(r => r.p.first == null ? Y : r.p.first)} | explorer ${mean(r => r.e.first == null ? Y : r.e.first)}, expeditions ${mean(r => r.e.sent)}, men lost ${mean(r => r.e.dead)}`);
