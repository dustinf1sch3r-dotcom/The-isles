// places_moves: forced tests that a village which moves keeps its name, and a clan that leaves a village for ground far away is called afresh.  node tools/places_moves.js [seed] [years]   (SIM=<sim.js> to test another build)
const S = require(process.env.SIM || require('path').join(__dirname, '..', 'build', 'sim.js'));
const seed = +(process.argv[2] || 2), YEARS = +(process.argv[3] || 90);
const mk = () => { const W = S.createWorld(seed); S.seedFirstPop(W); const cs = S.houseCandidates(W); S.choosePlayer(W, cs[seed % Math.min(5, cs.length)].head); return W; };
const run = (W, w) => { for (let i = 0; i < w; i++) { S.step(W); while (W.pending.length) S.resolve(W, W.pending[0], 0); if (W.notices) W.notices.length = 0; } };
const lines = (W, n) => W.events.filter(e => e.text.includes(n) && /abandoned|raise the village|build the village/.test(e.text)).length;
const histL = (r) => r ? r.hist.filter(h => /abandoned|founded/.test(h.t)).map(h => h.t) : [];
let fails = 0; const chk = (ok, m) => { console.log((ok ? 'ok   ' : 'FAIL ') + m); if (!ok) fails++; };
const free = (W, c, d) => { for (let k = 0; k < 400; k++) { const a = k * 2.399, r = d * (0.7 + (k % 7) / 14), x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r; if (x < 3000 || y < 3000 || x > S.WORLD - 3000 || y > S.WORLD - 3000) continue; if (!W.land[S.cellAt ? S.cellAt(x, y) : Math.floor(y / S.CELL) * S.N + Math.floor(x / S.CELL)]) continue; if (W.clans.some(o => o !== c && o.settled && Math.hypot(o.x - x, o.y - y) < 12000)) continue; return { x, y }; } return null; };
for (const mode of ['soil', 'deed']) {
  const W = mk(); run(W, 52 * YEARS); const pc = W.player.head.clan;
  if (!pc.settled) { console.log(mode, 'player not settled at year', YEARS); continue; }
  const n = pc.village, rec = W.places.get(n), ev0 = lines(W, n), h0 = histL(rec).length, x0 = pc.x, y0 = pc.y;
  if (mode === 'soil') pc.soil = 0.3; else { const p = free(W, pc, 15000); if (!p) { console.log('no site'); continue; } const R = S.doAction(W, 'movevillage', 0, null, p); console.log('  deed:', R && R.title); }
  let moved = false; for (let i = 0; i < 52 * 3; i++) { run(W, 1); if (Math.hypot(pc.x - x0, pc.y - y0) > 5000) moved = true; }
  console.log(`  ${mode}: moved ${moved} (${Math.round(Math.hypot(pc.x - x0, pc.y - y0) / 1000)} km), settled ${pc.settled}, ${n} -> ${pc.village}`);
  chk(moved, mode + ': the village moved'); chk(pc.village === n, mode + ': the name is kept');
  chk(lines(W, n) === ev0 && histL(W.places.get(n)).length === h0, mode + ': no new abandoned or founded line for it (events ' + ev0 + '->' + lines(W, n) + ', record notes ' + h0 + '->' + histL(W.places.get(n)).length + ')');
}
// a clan of a two-clan village leaves and settles 30 km away while the other stays
{
  const W = mk(); run(W, 52 * YEARS); const pc = W.player.head.clan;
  const rec = W.settlements.find(r => r.clans && r.clans.filter(c => c.settled && c.live === 'farm' && c !== pc).length >= 2 && !r.clans.includes(pc));
  if (!rec) console.log('no two-clan village at year', YEARS); else {
    const N = rec.name, [a, b] = rec.clans.filter(c => c.settled && c.live === 'farm'); const p = free(W, b, 30000);
    console.log('  village', N, 'clans', a.name, b.name, 'leaver goes to', p && [Math.round(p.x / 1000), Math.round(p.y / 1000)], 'from', [Math.round(b.x / 1000), Math.round(b.y / 1000)]);
    b.settled = false; b.toSettle = true; b.tx = p.x; b.ty = p.y;
    let done = false; for (let i = 0; i < 52 * 4 && !done; i++) { run(W, 1); if (b.settled) done = true; }
    console.log(`  settled ${done} at ${Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 1000)} km from the stayer; stayer ${a.village}, leaver ${b.village}`);
    chk(done, 'leaver settled'); chk(a.village === N, 'the one that stays keeps ' + N); chk(b.village !== N, 'the one that leaves is called afresh');
    run(W, 2); chk(W.settlements.filter(r => r.name === N).length === 1, 'one record of that name listed');
  }
}
console.log(fails ? 'FAILED ' + fails : 'all passed');
