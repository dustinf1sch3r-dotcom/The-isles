// Cards shown (stops) per year by type, seeds 5,8,11,14 for 150 years, always answering option 0.
// Mode 1: every standing order at 'ask'. Mode 2: every routine order set to its first option (needs the standing orders of this build).
const S = require(process.env.ISLES_SIM || require('path').join(__dirname, '..', 'build', 'sim.js'));
const seeds = [5, 8, 11, 14], YEARS = +process.argv[2] || 150, FIRST = { gather: 'gifts', omen: 'offer', split: 'letgo', friend: 'give', sick: 'scatter', exiles: 'place', oath: 'swear', found: 'take' };
function run(auto) {
  const by = {}; let years = 0, quiet = 0, notes = 0;
  for (const seed of seeds) {
    const W = S.createWorld(seed); S.seedFirstPop(W, 4); const cs = S.houseCandidates(W); S.choosePlayer(W, cs[seed % Math.min(5, cs.length)].head); const P = W.player;
    if (S.policy) for (const k of ['blood', 'threat', 'raid', 'quarrel']) S.setPolicy(W, k, 'ask');
    if (auto) for (const k in FIRST) S.setPolicy(W, k, FIRST[k]);
    let seen = null, kept = 0;
    for (let wk = 0; wk < 52 * YEARS && !P.over; wk++) {
      S.step(W);
      { const h = P.hist, li = seen ? h.lastIndexOf(seen) : -1; for (let i = h.length - 1; i > li && i >= 0; i--) if (/^By standing order/.test(h[i].t)) kept++; seen = h[h.length - 1]; }
      let n = 0; while (W.pending.length && n++ < 20) { const e = W.pending[0]; by[e.type] = (by[e.type] || 0) + 1; S.resolve(W, e, 0); }
      if (W.notices && W.notices.length) { quiet += W.notices.length; W.notices.length = 0; }
    }
    years += Math.floor(W.week / 52); notes += kept;
  }
  const tot = Object.values(by).reduce((a, b) => a + b, 0);
  console.log((auto ? 'ROUTINE ORDERS SET' : 'ALL ASK') + `: ${years} player-years, ${tot} cards = ${(tot / years).toFixed(2)} per year; notices ${quiet}; stops (cards + notices) ${tot + quiet} = ${((tot + quiet) / years).toFixed(2)} per year; routine matters answered by order (house notes) ${notes}`);
  console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / years).toFixed(3)}`).join(', '));
}
run(false); if (!process.env.ASK_ONLY && S.policy) run(true);
