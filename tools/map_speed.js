// Map drawing speed: time spent in each animation-frame callback (the whole map draw) over a 60-frame zoom sweep and a 60-frame pan,
// several builds interleaved, 3 reps each. Noise between runs is about 5 to 10%, so run it twice before trusting a small difference.
// usage: node tools/map_speed.js <save.sav> <label=index.html> [<label=index.html> ...]
const { chromium } = require('playwright');
const sav = process.argv[2];
const builds = process.argv.slice(3).map(a => a.split('='));
if (!sav || !builds.length) { console.log('usage: node tools/map_speed.js <save.sav> <label=index.html> ...'); process.exit(1); }
async function run(b, html) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__cb = [];
    window.requestAnimationFrame = f => raf(t => { const t0 = performance.now(); f(t); window.__cb.push(performance.now() - t0); }); });
  await p.goto('file://' + html); await p.waitForTimeout(2500);
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.evaluate(() => document.getElementById('loadFileBtn').click())]);
  await fc.setFiles(sav); await p.waitForTimeout(4000);
  await p.evaluate(() => { const W = window.__dbg.W; while (W.pending && W.pending.length) W.pending.shift(); });
  const res = {};
  for (const [name, z0, mode] of [['zoom 0.0016', 0.0016, 'zoom'], ['zoom 0.0006', 0.0006, 'zoom'], ['pan 0.0016', 0.0016, 'pan'], ['pan 0.004', 0.004, 'pan']]) {
    res[name] = await p.evaluate(async a => { const [z0, mode] = a, D = window.__dbg, pc = D.W.player.head.clan, nf = () => new Promise(r => requestAnimationFrame(r));
      D.center(pc.x, pc.y, z0); for (let i = 0; i < 10; i++) await nf(); window.__cb.length = 0;
      for (let i = 0; i < 60; i++) { if (mode === 'zoom') D.center(pc.x, pc.y, z0 * Math.pow(1.015, i)); else D.center(pc.x + i * 400, pc.y, z0); await nf(); }
      const c = window.__cb.slice(); c.sort((x, y) => x - y); const mean = c.reduce((s, x) => s + x, 0) / c.length; return { mean, p90: c[Math.floor(c.length * 0.9)], max: c[c.length - 1] }; }, [z0, mode]);
  }
  const de = await p.evaluate(() => window.__drawErr || 0); await p.close(); return { res, de };
}
(async () => { const b = await chromium.launch(); const acc = {};
  for (let rep = 0; rep < 3; rep++) for (const [lab, html] of builds) { const { res, de } = await run(b, html); if (de) console.log(lab, 'drawErr', de);
    for (const k in res) { const a = (acc[lab] = acc[lab] || {}); (a[k] = a[k] || []).push(res[k]); } }
  for (const [lab] of builds) for (const k in acc[lab]) { const r = acc[lab][k], m = f => (r.reduce((s, x) => s + x[f], 0) / r.length).toFixed(2);
    console.log(lab.padEnd(8), k.padEnd(12), 'mean', m('mean'), 'p90', m('p90'), 'max', m('max'), 'ms'); }
  await b.close(); })();
