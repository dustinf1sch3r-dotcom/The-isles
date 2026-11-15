// Measures raiding and reprisal. The player raids at every chance (raid deed, target 0, force 0); every decision is answered with option 0.
// A player raid counts as answered only when a payback card names that very raid (its week). Vengeance and blood matters are counted as they are queued for the standing orders.
// usage: node tools/raids.js 2,8,14,21 100   (ISLES_SIM=<path to sim.js> to measure another build)
const S = require(process.env.ISLES_SIM || require('path').join(__dirname, '..', 'build', 'sim.js'));
const seeds = (process.argv[2] || '2,8,14,21').split(',').map(Number), Y = +(process.argv[3] || 100), NOPLAYERRAIDS = process.argv[4] === 'quiet';
const T = { raids: 0, wins: 0, raided: 0, paybackCards: 0, vengeance: 0, blood: 0, houseRaidDead: 0, worldRaids: 0, worldPaybacks: 0, withReprisal: 0, houses: 0, peaces: 0 };
for (const seed of seeds) {
  const W = S.createWorld(seed); S.seedFirstPop(W); const cs = S.houseCandidates(W); S.choosePlayer(W, cs[seed % Math.min(5, cs.length)].head); const P = W.player;
  const R = { raids: 0, wins: 0, raided: 0, paybackCards: 0, vengeance: 0, blood: 0, houseRaidDead: 0 }, mine = []; // mine: {w, tribe, hit}
  // vengeance and blood matters go to the standing orders (W.autoQ), not W.pending: count them as they are queued
  let aq = [], wrap = v => { const o = v.push.bind(v); v.push = x => { const e = Array.isArray(x) ? x[0] : x; if (e && (e.type === 'vengeance' || e.type === 'blood')) R[e.type]++; return o(x); }; return v; };
  Object.defineProperty(W, 'autoQ', { get() { return aq; }, set(v) { aq = wrap(v || []); }, configurable: true }); W.autoQ = [];
  let dyn = new Set(), y = 1;
  for (; y <= Y && !P.over; y++) {
    for (let w = 0; w < 52; w++) {
      S.step(W);
      while (W.pending.length) {
        const e = W.pending[0]; if (e.type === 'raided') { R.raided++; if (e.data.payback) { R.paybackCards++; for (const r of mine) if (r.w === e.data.payback.w && r.tribe === e.data.att.tribe.name) r.hit = true; } } if (e.type === 'vengeance') R.vengeance++; if (e.type === 'blood') R.blood++;
        S.resolve(W, e, 0);
      }
      if (W.notices) W.notices.length = 0;
      if (!P.over && P.head.alive && P.head.clan && !NOPLAYERRAIDS) {
        const a = S.playerActions(W).find(x => x.id === 'raid');
        if (a && a.ok && a.targets && a.targets.length) { const o = a.targets[0].ref, res = S.doAction(W, 'raid', 0, 0, null); R.raids++; if (res && res.title === 'The raid succeeds') R.wins++; mine.push({ w: W.week, tribe: o.tribe.name, hit: false }); }
      }
      const now = new Set(); for (const c of W.clans) for (const q of c.people) if (q.dyn) now.add(q);
      for (const q of dyn) if (!q.alive && /raid/.test(q.cause || '')) R.houseRaidDead++; dyn = now;
    }
  }
  const hit = mine.filter(r => r.hit && W.week - r.w >= 0).length, old = mine.filter(r => W.week - r.w >= 52 * 6).length, oldHit = mine.filter(r => W.week - r.w >= 52 * 6 && r.hit).length;
  const wr = (W.nRaids || 0) - R.raids, wp = W.nPaybacks || 0;
  console.log(`seed ${seed} yrs ${y - 1} | player raids ${R.raids} won ${R.wins} | raided cards ${R.raided} (paybacks ${R.paybackCards}) vengeance ${R.vengeance} blood ${R.blood} | house dead in raids ${R.houseRaidDead} | raids answered within 6 yrs: ${hit}/${mine.length} (of those 6+ yrs old: ${oldHit}/${old}) | world raids ${wr} world paybacks ${wp} peaces ${W.nPeaces || 0} | house ended ${P.over}`);
  T.raids += R.raids; T.wins += R.wins; T.raided += R.raided; T.paybackCards += R.paybackCards; T.vengeance += R.vengeance; T.blood += R.blood; T.houseRaidDead += R.houseRaidDead; T.worldRaids += wr; T.worldPaybacks += wp; T.withReprisal += hit; T.houses += P.over ? 1 : 0; T.peaces += W.nPeaces || 0; T.n = (T.n || 0) + mine.length;
}
console.log('TOTAL', JSON.stringify(T));
