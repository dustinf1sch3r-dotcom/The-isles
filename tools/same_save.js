// proves two sims give identical worlds from a save: node tools/same_save.js <simA.js> <simB.js> <save.sav> [years=20] [every=5]
// Both play the save on, resolving every decision with option 0, and the saveGame hashes are compared every `every` years.
// For a change that reorders or skips W.rand() calls, first replace those draws in copies of both sims with the same
// fixed function of what they are drawn for (see "Testing a change" in HANDOFF.md); then the worlds must still be identical.
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const [a, b, sv, Y = 20, E = 5] = process.argv.slice(2);
if (!a || !b || !sv) { console.log('usage: node tools/same_save.js <simA.js> <simB.js> <save.sav> [years] [every]'); process.exit(1); }
const A = require(path.resolve(a)), B = require(path.resolve(b));
const h = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const txt = fs.readFileSync(sv, 'utf8'), wa = A.loadGame(txt), wb = B.loadGame(txt);
function yr(S, W) { for (let w = 0; w < 52; w++) { S.step(W); while (W.pending.length) S.resolve(W, W.pending[0], 0); } }
let bad = 0; const t0 = Date.now();
for (let y = 1; y <= +Y; y++) {
  yr(A, wa); yr(B, wb);
  if (y % +E === 0 || y === +Y) {
    const ha = h(A.saveGame(wa)), hb = h(B.saveGame(wb));
    console.log('year', y, ha, hb, ha === hb ? 'same' : 'DIFFERENT', Math.round((Date.now() - t0) / 1000) + 's');
    if (ha !== hb) { bad++; break; }
  }
}
console.log(bad ? 'NOT identical' : 'identical');
