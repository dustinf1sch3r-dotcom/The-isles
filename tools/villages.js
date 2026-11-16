// villages in the world over 200 years, option 0 on every decision: how many were founded by daughter clans, villages at years 100/150/200, clans, population.
// usage: node tools/villages.js [seeds=2,7,21,33] [years=200]   (ISLES_SIM=path to another build/sim.js to compare)
const S = require(process.env.ISLES_SIM || require('path').join(__dirname, '..', 'build', 'sim.js'));
const seeds = (process.argv[2] || '2,7,21,33').split(',').map(Number), YEARS = +(process.argv[3] || 200);
for (const seed of seeds) {
  const W = S.createWorld(seed); S.seedFirstPop(W); const cs = S.houseCandidates(W); S.choosePlayer(W, cs[seed % Math.min(5, cs.length)].head); const P = W.player; const row = {};
  for (let y = 1; y <= YEARS; y++) {
    for (let w = 0; w < 52; w++) { S.step(W); while (W.pending.length) S.resolve(W, W.pending[0], 0); if (W.notices) W.notices.length = 0; }
    if (y === 100 || y === 150 || y === 200 || y === YEARS) row[y] = { vill: W.clans.filter(c => c.settled).length, clans: W.clans.length, pop: W.clans.reduce((s, c) => s + c.people.length, 0) };
  }
  console.log('seed', seed, 'daughter villages founded', W.foundN || 0, 'walking now', W.clans.filter(c => c.founding).length, 'house ended', !!P.over, JSON.stringify(row));
}
