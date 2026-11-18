// times each system of the simulation per tick (movement, food, births/deaths, social/clan, conflict, trade/goods, environment, bookkeeping).
// usage: node tools/profile.js <save.sav | seed> <ticks> [--triple] [--every 100]
// --triple first makes a world with three times the clans and people (two copies of every clan but the player's), see SIM.prof.triple in src/soc.js.
// Rendering is browser only: see tools/profile_map.js.
const fs = require('fs'), path = require('path');
const S = require(path.join(__dirname, '..', 'build', 'sim.js'));
const args = process.argv.slice(2), flags = new Set(), pos = [];
let every = 100;
for (let i = 0; i < args.length; i++) { if (args[i] === '--triple') flags.add('triple'); else if (args[i] === '--every') every = +args[++i]; else pos.push(args[i]); }
if (pos.length < 2) { console.log('usage: node tools/profile.js <save.sav | seed> <ticks> [--triple] [--every 100]'); process.exit(1); }
const src = pos[0], TICKS = +pos[1];
let W;
if (fs.existsSync(src)) W = S.loadGame(fs.readFileSync(src, 'utf8'));
else { const seed = +src; W = S.createWorld(seed); S.seedFirstPop(W); const cs = S.houseCandidates(W); S.choosePlayer(W, cs[seed % Math.min(5, cs.length)].head); }
const stat = W => ({ pop: W.clans.reduce((s, c) => s + c.people.length, 0), clans: W.clans.length, week: W.week });
const fmt = s => `pop ${s.pop}, clans ${s.clans}, week ${s.week}`;
console.log('loaded:', fmt(stat(W)));
if (flags.has('triple')) { const r = S.prof.triple(W); console.log('tripled: added', r.clans, 'clans and', r.people, 'people ->', fmt(stat(W))); }
const start = stat(W);
const P = S.prof; P.reset(); P.every = every; P.on = true;
const t0 = process.hrtime.bigint();
for (let i = 0; i < TICKS; i++) { S.step(W); while (W.pending.length) S.resolve(W, W.pending[0], 0); if (W.notices) W.notices.length = 0; }
const wall = Number(process.hrtime.bigint() - t0) / 1e6;
P.on = false;
const snap = P.snapshot(), run = snap.run, n = Math.max(1, run.ticks);
console.log('\n=== whole run: ' + run.ticks + ' ticks ===');
console.log('start:', fmt(start), '| end:', fmt(stat(W)));
console.log(P.text(run, W, 'run'));
console.log('per function (ms/tick, share of total, system):');
let tot = 0; for (const k in run.sys) tot += run.sys[k];
for (const [f, v] of Object.entries(run.fn).sort((a, b) => b[1] - a[1])) console.log('  ' + f.padEnd(16) + (v / n).toFixed(4).padStart(9) + ' ms/tick ' + (100 * v / tot).toFixed(1).padStart(5) + '%');
console.log('total ms/tick (sum of systems): ' + (tot / n).toFixed(3) + ' | wall ms/tick incl. event resolution: ' + (wall / n).toFixed(3));
