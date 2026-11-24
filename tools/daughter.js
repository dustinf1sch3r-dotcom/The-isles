// Founds a daughter village on each save given (listed site, then a picked site) and fails if the deed throws or gives no card.
// node tools/daughter.js save1.sav save2.sav ...   (fuzz.js never reaches this deed)
const S = require('../build/sim.js'), fs = require('fs'); let bad = 0, done = 0;
for (const f of process.argv.slice(2)) for (const pick of [false, true]) {
  const W = S.loadGame(fs.readFileSync(f, 'utf8')), P = W.player, a = P && P.head && P.head.alive && S.playerActions(W).find(a => a.id === 'foundvillage'); if (!a || !a.ok) continue;
  const k = a.targets.findIndex(t => !!t.pick === pick); if (k < 0) continue; let place = null; const c = P.head.clan;
  if (pick) for (let r = 12000; r <= a.targets[k].pick.maxKm * 1000 && !place; r += 3000) for (let t = 0; t < 16 && !place; t++) { const x = c.x + r * Math.cos(t * .39), y = c.y + r * Math.sin(t * .39); if (!S.checkPlace(W, 'foundvillage', x, y)) place = { x, y }; }
  if (pick && !place) continue;
  try { const R = S.doAction(W, 'foundvillage', k, 0, place); done++; if (!R || R.title !== 'A daughter village') { bad++; console.log(f, pick ? 'picked' : 'listed', 'BAD', R && R.title); } else console.log(f.split('/').pop(), pick ? 'picked' : 'listed', /ground/.test(R.text) ? 'ground line' : 'no line (fishing)'); }
  catch (e) { bad++; console.log(f, 'THROW', e.message); }
}
console.log('daughter villages founded', done, 'bad', bad); process.exit(bad || !done ? 1 : 0);
