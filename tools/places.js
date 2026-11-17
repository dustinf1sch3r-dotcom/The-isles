// places: do two villages ever share a name or a record? node tools/places.js [seeds] [years]   (SIM=<path to sim.js> to test another build)
// Plays unattended (always option 0); every 25 years prints: places in W.settlements; records listed twice; settled living clans in no listed record;
// names held by two or more living places; renames done by updateSettlements (W.placeRenames).
const S = require(process.env.SIM || require('path').join(__dirname, '..', 'build', 'sim.js'));
const seeds = (process.argv[2] || '2,7,14,21,33').split(',').map(Number), YEARS = +(process.argv[3] || 200);
let bad = 0;
for (const seed of seeds) {
  const W = S.createWorld(seed); S.seedFirstPop(W); const cs = S.houseCandidates(W); S.choosePlayer(W, cs[seed % Math.min(5, cs.length)].head); const P = W.player;
  console.log('seed', seed);
  for (let y = 1; y <= YEARS && !P.over; y++) {
    for (let w = 0; w < 52; w++) { S.step(W); while (W.pending.length) S.resolve(W, W.pending[0], 0); if (W.notices) W.notices.length = 0; }
    if (y % 25) continue;
    const L = W.settlements || [], cnt = new Map(); for (const r of L) cnt.set(r, (cnt.get(r) || 0) + 1);
    const twice = [...cnt.values()].filter(n => n > 1).length;
    const inRec = new Set(); for (const r of L) for (const c of r.clans || []) inRec.add(c);
    const orphan = W.clans.filter(c => c.alive !== false && c.settled && !inRec.has(c)).length;
    const live = [...new Set(L)].filter(r => r.clans && r.clans.length), nm = new Map(); for (const r of live) nm.set(r.name, (nm.get(r.name) || 0) + 1);
    const dup = [...nm.values()].filter(n => n > 1).length;
    bad += twice + orphan;
    console.log(`  y${y}: places ${L.length}, listed twice ${twice}, orphan clans ${orphan}, shared names ${dup}, renames ${W.placeRenames || 0}`);
  }
}
console.log('bad (twice+orphan)', bad);
