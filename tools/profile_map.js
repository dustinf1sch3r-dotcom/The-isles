// the profiler in the real page: opens index.html?prof=1, loads a save, plays at 16x (the fastest ordinary speed), collects the console summaries
// for at least <ticks> weeks, and prints them with the share of rendering against simulation per frame.
// usage: node tools/profile_map.js <index.html> <save.sav> [ticks=500]
// The browser clock is often coarse (100 us for a page from a file): if so the split between systems inside a tick is not trustworthy here, only
// rendering against the whole simulation is, and the split comes from node (tools/profile.js).
const { chromium } = require('playwright');
const [html, sav, ticksArg] = process.argv.slice(2), NEED = +(ticksArg || 500);
if (!html || !sav) { console.log('usage: node tools/profile_map.js <index.html> <save.sav> [ticks=500]'); process.exit(1); }
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const sums = [], errs = [];
  p.on('console', m => { const t = m.text(); if (t.startsWith('[prof]')) sums.push(t); else if (m.type() === 'error') errs.push(t); });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + html + '?prof=1'); await p.waitForTimeout(2500);
  const res = await p.evaluate(() => { let s = [], last = performance.now(), min = Infinity; for (let i = 0; i < 10000; i++) { const t = performance.now(); if (t !== last) { min = Math.min(min, t - last); last = t; } } return min; });
  console.log('browser clock resolution: smallest nonzero performance.now() step over 10,000 samples = ' + (res * 1000).toFixed(1) + ' microseconds' + (res * 1000 > 20 ? ' (coarser than 20: the split inside a tick is not trustworthy here)' : ''));
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.evaluate(() => document.getElementById('loadFileBtn').click())]);
  await fc.setFiles(sav); await p.waitForTimeout(4000);
  await p.evaluate(() => { while ((document.getElementById('speed').textContent || '') !== '16×') document.getElementById('speed').click(); });
  const tix = () => sums.reduce((s, t) => s + (+(/ (\d+) ticks/.exec(t) || [0, 0])[1]), 0);
  const t0 = Date.now();
  while (tix() < NEED && Date.now() - t0 < 900000) {
    // a decision card stops play: pick its first open option (as balance.js does), then press play again
    await p.evaluate(() => { const m = document.getElementById('modal'); if (m && m.style.display !== 'none') { const o = m.querySelector('.opt:not(.off):not([disabled])') || m.querySelector('[data-x]'); if (o) o.click(); } else { const pl = document.getElementById('play'); if (pl.textContent === '▶') pl.click(); } });
    await p.waitForTimeout(400); if ((Date.now() - t0) % 30000 < 700) console.error('  ... ' + tix() + ' ticks after ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  }
  console.log('speed shown: ' + await p.evaluate(() => document.getElementById('speed').textContent) + ', wall seconds ' + ((Date.now() - t0) / 1000).toFixed(0));
  console.log(sums.join('\n'));
  // whole-run share of rendering against simulation
  let ticks = 0, frames = 0, sim = 0, ren = 0;
  for (const t of sums) { const n = +/ (\d+) ticks/.exec(t)[1], f = +(/ (\d+) frames/.exec(t) || [0, 0])[1]; ticks += n; frames += f;
    for (const l of t.split('\n').slice(1)) { const m = /^\s+(\S+)\s+([\d.]+) ms\/tick/.exec(l); if (!m) continue; if (m[1] === 'rendering') ren += +m[2] * n; else sim += +m[2] * n; } }
  console.log('\nwhole run: ' + ticks + ' ticks, ' + frames + ' frames drawn while playing');
  console.log('simulation ' + (sim / ticks).toFixed(2) + ' ms/tick, ' + (sim / Math.max(1, frames)).toFixed(2) + ' ms/frame; rendering ' + (ren / ticks).toFixed(2) + ' ms/tick, ' + (ren / Math.max(1, frames)).toFixed(2) + ' ms/frame');
  console.log('share of simulation + rendering time: rendering ' + (100 * ren / (sim + ren)).toFixed(1) + '%, simulation ' + (100 * sim / (sim + ren)).toFixed(1) + '%');
  console.log('page errors: ' + errs.length + (errs.length ? '\n' + errs.slice(0, 5).join('\n') : ''));
  await b.close();
})();
