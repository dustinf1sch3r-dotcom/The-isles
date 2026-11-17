// Map screenshots at phone size (390 x 844, 2x), the same spots and zooms on every build, so two builds can be compared shot by shot.
// usage: node tools/map_shots.js <index.html> <outdir> <save.sav>
// Spots: H the house's own village; F the largest fishing village; P a village with a palisade and a hall (a ditch if any);
// Q a village with a palisade only; C the thickest group of camps; G the nearest gathering place; plus the whole isles (fit).
// A save from a late game (many villages) shoots every spot; a save whose name contains 'early5' shoots only H.
const { chromium } = require('playwright');
const fs = require('fs');
const [html, out, sav] = process.argv.slice(2);
if (!sav) { console.log('usage: node tools/map_shots.js <index.html> <outdir> <save.sav>'); process.exit(1); }
const tag = sav.includes('early5') ? 'e5' : 'r7';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + html); await p.waitForTimeout(2500);
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.evaluate(() => document.getElementById('loadFileBtn').click())]);
  await fc.setFiles(sav); await p.waitForTimeout(4000);
  await p.addStyleTag({ content: '#toasts{display:none !important}' });
  await p.evaluate(() => { const W = window.__dbg.W; while (W.pending && W.pending.length) W.pending.shift(); const c = document.querySelector('.card .x, #cardClose'); if (c) c.click(); });
  // fixed spots, picked the same way on every build (the save is the same, so the spots are the same)
  const spots = await p.evaluate(() => {
    const W = window.__dbg.W, pc = W.player.head.clan, out = { H: [pc.x, pc.y] };
    const vs = (W.settlements || []).filter(S => S.clans && S.clans.length).map(S => { let x = 0, y = 0; for (const c of S.clans) { x += c.x; y += c.y; } x /= S.clans.length; y /= S.clans.length;
      const wk = k => S.clans.some(c => c.works && c.works[k]); return { S, x, y, pop: S.pop, type: S.type, pal: wk('pal'), hall: wk('hall'), ditch: wk('ditch') }; });
    const far = v => Math.hypot(v.x - pc.x, v.y - pc.y) > 150000;
    const fish = vs.filter(v => v.type === 'fishing' && far(v)).sort((a, b) => b.pop - a.pop)[0]; if (fish) out.F = [fish.x, fish.y, fish.S.name];
    const walled = vs.filter(v => v.pal && v.hall && far(v)).sort((a, b) => (b.ditch - a.ditch) || (b.pop - a.pop))[0]; if (walled) out.P = [walled.x, walled.y, walled.S.name];
    const camps = W.clans.filter(c => !c.settled && c.people && c.people.length && W.land[window.SIM ? 0 : 0] !== undefined);
    let best = null, bn = -1; for (const c of camps) { const n = camps.filter(o => Math.hypot(o.x - c.x, o.y - c.y) < 60000).length; if (n > bn && far(c)) { bn = n; best = c; } }
    if (best) out.C = [best.x, best.y, best.name];
    const palOnly = vs.filter(v => v.pal && !v.ditch && !v.hall && far(v)).sort((a, b) => b.pop - a.pop)[0]; if (palOnly) out.Q = [palOnly.x, palOnly.y, palOnly.S.name];
    const site = (W.sites || []).slice().sort((a, b) => Math.hypot(a.x - pc.x, a.y - pc.y) - Math.hypot(b.x - pc.x, b.y - pc.y))[0]; if (site) out.G = [site.x, site.y];
    out.info = { yr: Math.floor(W.week / 52) + 1, villages: vs.length, camps: camps.length, settled: !!pc.settled };
    return out;
  });
  console.log(tag, JSON.stringify(spots));
  const plan = tag === 'r7'
    ? [['H', [0.0006, 0.0008, 0.0016, 0.0031, 0.009]], ['F', [0.0016, 0.0031, 0.009]], ['P', [0.0016, 0.0031, 0.0045, 0.009, 0.016]], ['Q', [0.0031, 0.009]], ['C', [0.0016, 0.004]], ['G', [0.0016, 0.004]]]
    : [['H', [0.0016, 0.004, 0.009]]];
  for (const [k, zs] of plan) { const s = spots[k]; if (!s) { console.log('no spot', k); continue; }
    for (const z of zs) { await p.evaluate(a => window.__dbg.center(a[0], a[1], a[2]), [s[0], s[1], z]); await p.waitForTimeout(1300);
      await p.screenshot({ path: `${out}/${tag}_${k}_${z}.png`, clip: { x: 0, y: 0, width: 390, height: 425 } }); } }
  await p.evaluate(() => document.getElementById('fitBtn').click()); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/${tag}_fit.png`, clip: { x: 0, y: 0, width: 390, height: 425 } });
  const de = await p.evaluate(() => window.__drawErr || 0);
  console.log('drawErr', de, 'errors', JSON.stringify(errs)); await b.close();
})();
