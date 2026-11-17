// ===== MAP ART: a small hand-drawn icon set, rendered once to sprites =====
const ART = (() => {
  const TAU = Math.PI * 2, S = 3, sprites = {}, urls = {};
  const INK = '#1d150e', BONE = '#efe6d0';
  const P = d => new Path2D(d);
  // PIXEL ART ON PARCHMENT: every icon is drawn small, snapped to a short sepia palette with hard-edged pixels, and given a dark outline
  const PAL = [[58, 42, 20], [94, 70, 36], [136, 104, 58], [184, 154, 96], [214, 192, 132], [236, 222, 172], [248, 240, 208], [124, 116, 62], [84, 80, 44], [176, 88, 56], [120, 56, 36], [206, 150, 130], [112, 118, 112], [176, 180, 160], [210, 168, 72]];
  const OUT = [58, 42, 20];
  function pixelize(src, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    let d; try { d = g.getImageData(0, 0, w, h); } catch (e) { return c; }
    const a = d.data, solid = new Uint8Array(w * h);
    for (let i = 0, k = 0; i < a.length; i += 4, k++) {
      if (a[i + 3] < 105) { a[i + 3] = 0; continue; }
      solid[k] = 1; const l = 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2], r = a[i] + (l - a[i]) * 0.22 + 4, gg = a[i + 1] + (l - a[i + 1]) * 0.22, b = (a[i + 2] + (l - a[i + 2]) * 0.22) * 0.9;
      let best = 0, bd = 1e9; for (let p = 0; p < PAL.length; p++) { const q = PAL[p], dd = (q[0] - r) * (q[0] - r) * 0.9 + (q[1] - gg) * (q[1] - gg) * 1.2 + (q[2] - b) * (q[2] - b) * 0.7; if (dd < bd) { bd = dd; best = p; } }
      a[i] = PAL[best][0]; a[i + 1] = PAL[best][1]; a[i + 2] = PAL[best][2]; a[i + 3] = 255;
    }
    for (let y = 0, k = 0; y < h; y++) for (let x = 0; x < w; x++, k++) { if (solid[k]) continue;
      if ((x > 0 && solid[k - 1]) || (x < w - 1 && solid[k + 1]) || (y > 0 && solid[k - w]) || (y < h - 1 && solid[k + w])) { const i = k * 4; a[i] = OUT[0]; a[i + 1] = OUT[1]; a[i + 2] = OUT[2]; a[i + 3] = 255; } }
    g.putImageData(d, 0, 0); return c;
  }
  // INK AND WASH: every icon is drawn large, its colours thinned like watercolour on warm paper, and given a fine ink contour
  const HI = 4;
  function wash(src, w, h, plain) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const t = document.createElement('canvas'); t.width = w; t.height = h; const tg = t.getContext('2d'); tg.drawImage(src, 0, 0);
    let d; try { d = tg.getImageData(0, 0, w, h); } catch (e) { g.drawImage(src, 0, 0); return c; }
    const a = d.data;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) { if (!a[i + 3]) continue;
      const l = 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2], n = 0.965 + 0.05 * (Math.sin(x * 0.043 + y * 0.017) * Math.sin(y * 0.051 - x * 0.013) * 0.5 + 0.5); // uneven, like a wash that pooled
      a[i] = Math.min(255, (a[i] + (l - a[i]) * 0.3) * 0.97 * n + 6); a[i + 1] = Math.min(255, (a[i + 1] + (l - a[i + 1]) * 0.3) * 0.93 * n + 4); a[i + 2] = Math.min(255, (a[i + 2] + (l - a[i + 2]) * 0.3) * 0.84 * n); }
    tg.putImageData(d, 0, 0);
    if (!plain) { // the contour: the silhouette in ink, nudged outward all round, under the colour
      const k = document.createElement('canvas'); k.width = w; k.height = h; const kg = k.getContext('2d'); kg.drawImage(src, 0, 0); kg.globalCompositeOperation = 'source-in'; kg.fillStyle = 'rgba(46,32,18,0.85)'; kg.fillRect(0, 0, w, h);
      const r = HI * 0.3; for (let q = 0; q < 8; q++) g.drawImage(k, Math.cos(q * Math.PI / 4) * r, Math.sin(q * Math.PI / 4) * r); }
    g.drawImage(t, 0, 0); return c;
  }
  // res: how large one drawing unit is on the map (1 = a 24-unit icon is 24 map pixels); the sprite itself is kept HI times finer
  function mk(name, w, h, fn, res = 1, plain) {
    const R = res * HI, pw = Math.round((w * res + 2) * HI), ph = Math.round((h * res + 2) * HI), t = document.createElement('canvas'); t.width = pw; t.height = ph;
    const tg = t.getContext('2d'); tg.translate(HI, HI); tg.scale(R, R); tg.lineJoin = 'round'; tg.lineCap = 'round'; fn(tg);
    const c = wash(t, pw, ph, plain); c._lw = Math.round(w * res) + 2; c._lh = Math.round(h * res) + 2; if (name) sprites[name] = c; return c;
  }
  // sprites written out pixel by pixel
  const CH = { k: [58, 42, 20], d: [94, 70, 36], b: [136, 104, 58], t: [184, 154, 96], p: [214, 192, 132], l: [236, 222, 172], w: [248, 240, 208], g: [124, 116, 62], G: [84, 80, 44], r: [176, 88, 56], R: [120, 56, 36], s: [150, 138, 100], y: [210, 168, 72] };
  function px(name, rows, tint) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length)), c = document.createElement('canvas'); c.width = w; c.height = h; c._w = w; c._h = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const ch = rows[y][x]; if (ch === '.' || ch === ' ') continue; const q = ch === 'X' ? tint : CH[ch]; if (!q) continue; g.fillStyle = `rgb(${q[0]},${q[1]},${q[2]})`; g.fillRect(x, y, 1, 1); }
    c._lw = w; c._lh = h; if (name) sprites[name] = c; return c;
  }
  const fs = (g, p, fill, stroke, lw = 0.8) => { if (fill) { g.fillStyle = fill; g.fill(p); } if (stroke) { g.strokeStyle = stroke === INK ? 'rgba(29,21,14,0.7)' : stroke; g.lineWidth = stroke === INK ? lw * 0.55 : lw * 0.75; g.stroke(p); } };
  const line = (g, pts, col, lw) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.strokeStyle = col; g.lineWidth = col === INK ? lw * 0.8 : lw; g.stroke(); };
  const ell = (g, x, y, rx, ry, rot, fill, stroke, lw) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 0.8; g.stroke(); } };
  const token = () => {}; // no disc behind the symbol: on parchment each icon stands on its own, outlined in ink

  // ---------- pictograms (24 × 24) ----------
  const PIC = {
    flint(g) { fs(g, P('M12 4.2 L16.8 11.4 Q17.6 17.2 12 19.8 Q6.4 17.2 7.2 11.4 Z'), '#c3cfda', '#4c5864', 0.9); line(g, [12, 4.2, 10.8, 12, 12, 19.8], '#6d7a86', 0.7); line(g, [10.8, 12, 7.4, 12.6], '#6d7a86', 0.7); line(g, [10.8, 12, 16.6, 10.6], '#6d7a86', 0.7); line(g, [11.4, 16, 15.6, 16.6], '#6d7a86', 0.6); },
    amber(g) { fs(g, P('M12 4.6 C15.6 8.4 17.8 11.6 17.8 14.2 A5.8 5.8 0 0 1 6.2 14.2 C6.2 11.6 8.4 8.4 12 4.6 Z'), '#f4a22a', '#8a4a08', 0.9); ell(g, 9.9, 13.2, 1.3, 2.5, -0.35, 'rgba(255,244,205,0.8)'); },
    axe(g) { line(g, [7.2, 19.6, 15.2, 5.6], '#c49a62', 2.3); fs(g, P('M11.6 8.2 L16.6 5.2 Q20.2 8 19.4 13 L13.2 11.2 Z'), '#86d6a2', '#285f3e', 0.9); line(g, [17.6, 6.6, 18.6, 12], '#d6f4e0', 0.7); },
    ochre(g) { g.strokeStyle = '#d95a40'; g.lineWidth = 1.9; for (const [x, y] of [[7.9, 9], [10.3, 6.6], [13.1, 6.2], [15.7, 7.8]]) { g.beginPath(); g.moveTo(12, 14); g.lineTo(x, y); g.stroke(); } g.beginPath(); g.moveTo(13.5, 15); g.lineTo(17.8, 12.4); g.stroke(); ell(g, 12, 14.8, 3.7, 3.9, 0, '#d95a40'); },
    salt(g) { const d = (x, y, r) => { const p = P(`M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y} Z`); fs(g, p, '#fbfdff', '#7b90a4', 0.8); line(g, [x, y - r, x, y + r], '#c2d0dc', 0.5); }; d(9, 14.6, 3.5); d(15, 13.4, 3.9); d(11.8, 8.4, 3.1); },
    copper(g) { fs(g, P('M5.8 7 Q9 8.8 12 8.8 Q15 8.8 18.2 7 Q16.6 12 18.2 17 Q15 15.2 12 15.2 Q9 15.2 5.8 17 Q7.4 12 5.8 7 Z'), '#e08a44', '#6a3610', 0.9); line(g, [8.4, 10.6, 15.6, 10.6], '#f6c08a', 0.9); },
    tin(g) { const b = (x, y, w) => { g.beginPath(); g.roundRect(x, y, w, 4.4, 2); g.fillStyle = '#d6e0e8'; g.fill(); g.strokeStyle = '#55636f'; g.lineWidth = 0.8; g.stroke(); line(g, [x + 1.6, y + 1.4, x + w - 2.4, y + 1.4], '#ffffff', 0.7); }; b(5.6, 13.4, 12.8); b(7.6, 8.2, 8.8); },
    grain(g) { line(g, [12, 20, 12, 8], '#e3c256', 1.1); for (let k = 0; k < 4; k++) { ell(g, 10, 8.2 + k * 2.7, 1.25, 2, -0.6, '#f3d262', '#7e5f10', 0.5); ell(g, 14, 9.4 + k * 2.7, 1.25, 2, 0.6, '#f3d262', '#7e5f10', 0.5); } ell(g, 12, 5.8, 1.2, 2, 0, '#f3d262', '#7e5f10', 0.5); line(g, [10, 6.6, 8.6, 3.6], '#e3c256', 0.5); line(g, [14, 7.6, 15.6, 4.4], '#e3c256', 0.5); },
    whale(g) { fs(g, P('M12 17.4 C11.6 13 10.4 10.4 5.6 8.2 C8.6 7.2 11 8.2 12 10.4 C13 8.2 15.4 7.2 18.4 8.2 C13.6 10.4 12.4 13 12 17.4 Z'), '#a6d0f0', '#27506e', 0.9); line(g, [6, 18.6, 8, 17.6, 10, 18.6, 12, 17.6, 14, 18.6, 16, 17.6, 18, 18.6], '#a6d0f0', 0.9); },
    hazel(g) { ell(g, 12, 13.6, 4.7, 5.3, 0, '#c58442', '#3a240c', 0.9); fs(g, P('M7.1 12.6 A4.9 5.2 0 0 1 16.9 12.6 Q12 10.6 7.1 12.6 Z'), '#74502a', '#3a240c', 0.8); line(g, [12, 7.4, 12.6, 5.6], '#74502a', 1); },
    apple(g) { fs(g, P('M12 9.2 C8.4 6.8 5.6 10 6.4 13.8 C7.2 17.6 10 19 12 17.8 C14 19 16.8 17.6 17.6 13.8 C18.4 10 15.6 6.8 12 9.2 Z'), '#e6604e', '#6e1d14', 0.9); line(g, [12, 9.2, 12.8, 5.8], '#5a3a1a', 1); ell(g, 15, 6.4, 2.2, 1.1, -0.5, '#86c060', '#2e5a1e', 0.5); },
    cherry(g) { line(g, [9, 14, 12.6, 6, 15, 13], '#8a6a3a', 0.9); ell(g, 8.8, 15.4, 3, 3, 0, '#b84484', '#4c1236', 0.8); ell(g, 15.2, 14.4, 3, 3, 0, '#b84484', '#4c1236', 0.8); ell(g, 7.8, 14.4, 0.8, 0.8, 0, 'rgba(255,255,255,0.6)'); },
    berry(g) { for (const [x, y] of [[9.2, 14], [14.8, 14], [12, 9.6]]) { ell(g, x, y, 2.9, 2.9, 0, '#877ef0', '#2c2670', 0.8); ell(g, x - 0.9, y - 0.9, 0.7, 0.7, 0, 'rgba(255,255,255,0.6)'); } },
    shell(g) { fs(g, P('M12 18.4 L5.6 10.8 A7.6 7.6 0 0 1 18.4 10.8 Z'), '#f6b0d4', '#7e3460', 0.9); for (const x of [7.4, 9.8, 12, 14.2, 16.6]) line(g, [12, 18, x, 7.6 + Math.abs(x - 12) * 0.5], '#b05c8c', 0.6); },
    seal(g) { fs(g, P('M4.2 16.6 C5.4 11.4 9.6 9.6 13 10.6 C15 8.4 18.6 8.8 19.8 11.4 C18.4 12 17.4 12.6 16.8 14 C15.6 16.8 10.6 18.2 4.2 16.6 Z'), '#d3bb94', '#4a3a22', 0.9); fs(g, P('M4.4 16.4 L2.6 14 L5.6 14.6 Z'), '#d3bb94', '#4a3a22', 0.8); ell(g, 17.4, 10.8, 0.6, 0.6, 0, '#201810'); },
    fish(g) { fs(g, P('M4.6 12 C7.6 7.4 13.8 7.4 16.8 12 C13.8 16.6 7.6 16.6 4.6 12 Z'), '#62d4e4', '#14505c', 0.9); fs(g, P('M16.4 12 L20.2 8.6 L20.2 15.4 Z'), '#62d4e4', '#14505c', 0.9); ell(g, 7.6, 11.2, 0.7, 0.7, 0, '#0c2c34'); line(g, [10.4, 9.4, 11.4, 12, 10.4, 14.6], '#14505c', 0.6); },
    furs(g) { fs(g, P('M12 4.8 L15 7.4 L19.4 6.8 L17.6 11.4 L19.6 17.6 L14.6 16.4 L12 19.6 L9.4 16.4 L4.4 17.6 L6.4 11.4 L4.6 6.8 L9 7.4 Z'), '#b88a58', '#4a2e12', 0.9); line(g, [12, 8, 12, 16], '#7a5630', 0.7); },
    beads(g) { g.beginPath(); g.arc(12, 11, 6, 0.15 * Math.PI, 0.85 * Math.PI); g.strokeStyle = '#b9a58a'; g.lineWidth = 0.7; g.stroke(); for (let k = 0; k < 6; k++) { const a = (0.15 + k * 0.14) * Math.PI; ell(g, 12 + Math.cos(a) * 6, 11 + Math.sin(a) * 6, 1.5, 1.5, 0, '#f6ecd8', '#6e5c40', 0.6); } },
    metal(g) { line(g, [8, 18.6, 9.6, 14.4], '#8a623a', 2.2); fs(g, P('M9 14.6 L10.6 13.8 L17.4 5.2 L15.4 13 L11.4 16 Z'), '#e69a54', '#6a3610', 0.9); line(g, [10.8, 14.4, 16.6, 6.6], '#f8cfa0', 0.6); },
    bronze(g) { line(g, [6.6, 18.6, 9, 15.4], '#8a623a', 2.2); line(g, [6.8, 14, 10.8, 17], '#e8c860', 1.5); fs(g, P('M8.4 15.4 L16.6 5 L18.6 5.6 L10.4 16.6 Z'), '#ecc95e', '#6e5210', 0.9); line(g, [10, 15.2, 17.2, 6], '#fff0b0', 0.6); },
    clay(g) { fs(g, P('M5.4 16.6 Q5 11.6 9.4 10.4 Q11 7 14.6 8.6 Q18.8 9 18.8 13.6 Q19.4 17.4 15 17.8 Q9 18.6 5.4 16.6 Z'), '#c0714a', '#5e2c14', 0.9); line(g, [8.6, 13.2, 11.6, 12.2], '#e6a884', 0.9); line(g, [13.2, 15.2, 16, 14.4], '#8e4c2c', 0.9); },
    pots(g) { fs(g, P('M8.6 5.8 L15.4 5.8 L14.6 8.2 C18.6 10.2 18.8 16.6 14.6 19.2 L9.4 19.2 C5.2 16.6 5.4 10.2 9.4 8.2 Z'), '#d08a58', '#5e2c14', 0.9); line(g, [7.2, 11.6, 16.8, 11.6], '#5e2c14', 0.6); line(g, [7.4, 14.4, 9.3, 13, 11.1, 14.4, 12.9, 13, 14.7, 14.4, 16.6, 13], '#f6dcb6', 0.7); },
    leather(g) { fs(g, P('M6.2 5.4 L10 7 L14 7 L17.8 5.4 L16.6 10.4 L18.6 18.4 L14.4 16.8 L9.6 16.8 L5.4 18.4 L7.4 10.4 Z'), '#a06a3c', '#3e220e', 0.9); for (const y of [9.6, 12, 14.4]) line(g, [10, y, 14, y], '#d6a876', 0.6); },
    art(g) { ell(g, 12, 12.4, 6.4, 6.8, 0, '#d6ccb6', '#4a4436', 0.9); g.beginPath(); for (let a = 0; a < TAU * 2.2; a += 0.2) { const r = 0.6 + a * 0.36, x = 12 + Math.cos(a) * r, y = 12.4 + Math.sin(a) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = '#c2523a'; g.lineWidth = 1.1; g.stroke(); },
    // faiths
    spirits(g) { g.beginPath(); for (let a = 0; a < TAU * 2.6; a += 0.15) { const r = 0.9 + a * 0.52; const x = 12 + Math.cos(a) * r, y = 12 + Math.sin(a) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = '#9fe0b4'; g.lineWidth = 1.4; g.stroke(); },
    totem(g) { ell(g, 12, 15, 2.6, 3.6, 0, '#e6b87a', '#4a2e12', 0.8); for (const s of [-1, 1]) { line(g, [12 + s * 1.6, 12.4, 12 + s * 5.6, 7.6, 12 + s * 6.4, 4.4], '#efe0c0', 1.2); line(g, [12 + s * 4, 9.6, 12 + s * 3.2, 6], '#efe0c0', 1.1); line(g, [12 + s * 5.6, 7.6, 12 + s * 8, 7], '#efe0c0', 1.1); } },
    mother(g) { ell(g, 12, 6.4, 1.9, 1.9, 0, '#f2a8c4', '#6e2c4a', 0.7); fs(g, P('M12 8.4 C8.6 9.4 7.4 12.4 8.8 14.4 C6.6 16.4 8.4 19.8 12 19.8 C15.6 19.8 17.4 16.4 15.2 14.4 C16.6 12.4 15.4 9.4 12 8.4 Z'), '#f2a8c4', '#6e2c4a', 0.8); },
    ancestors(g) { g.fillStyle = '#d9d2c2'; g.strokeStyle = '#3c362c'; g.lineWidth = 0.8; for (const x of [6.4, 15]) { g.beginPath(); g.roundRect(x, 10, 2.8, 9.4, 0.8); g.fill(); g.stroke(); } g.beginPath(); g.roundRect(4.6, 6.6, 14.8, 3.6, 1); g.fill(); g.stroke(); },
    sky(g) { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; line(g, [12 + Math.cos(a) * 6, 12 + Math.sin(a) * 6, 12 + Math.cos(a) * 8.6, 12 + Math.sin(a) * 8.6], '#f6d264', 1.3); } ell(g, 12, 12, 4.2, 4.2, 0, '#f6d264', '#7e5f10', 0.8); },
  };
  const RES = ['flint', 'amber', 'axe', 'ochre', 'salt', 'copper', 'tin', 'grain', 'whale', 'clay'], FOOD = ['hazel', 'apple', 'cherry', 'berry', 'shell', 'seal', 'fish'], GOODS = ['furs', 'beads', 'metal', 'bronze', 'pots', 'leather', 'art'], FAITH = ['spirits', 'totem', 'mother', 'ancestors', 'sky'];
  for (const k of RES.concat(GOODS)) mk(k, 24, 24, g => { token(g); PIC[k](g); });
  for (const k of FOOD) mk(k, 24, 24, g => { token(g, 10.4, '#b9c7a0'); PIC[k](g); });
  for (const k of FAITH) mk(k, 24, 24, g => { token(g, 10.4, '#8a7f6c'); PIC[k](g); });

  // ---------- animals (30 × 24, feet on y = 21, facing right) ----------
  function quad(g, o) {
    const gy = 21, bcx = o.cx ?? 13, bcy = gy - o.leg - o.bh / 2 + 0.8, parts = [];
    const add = fn => { const p = new Path2D(); fn(p); parts.push(p); };
    add(p => p.ellipse(bcx, bcy, o.bl / 2, o.bh / 2, 0, 0, TAU));
    if (o.hump) add(p => p.ellipse(bcx + o.bl * 0.22, bcy - o.bh * 0.26, o.bl * 0.27, o.bh * 0.5, 0, 0, TAU));
    if (o.rump) add(p => p.ellipse(bcx - o.bl * 0.26, bcy - o.bh * 0.05, o.bl * 0.24, o.bh * 0.5, 0, 0, TAU));
    for (const [x, lean] of [[bcx - o.bl / 2 + 1.3, -0.5], [bcx - o.bl / 2 + 3.1, 0.3], [bcx + o.bl / 2 - 3.3, -0.3], [bcx + o.bl / 2 - 1.5, 0.5]]) add(p => { p.moveTo(x - o.lw / 2, bcy); p.lineTo(x + o.lw / 2, bcy); p.lineTo(x + lean + o.lw * 0.4, gy); p.lineTo(x + lean - o.lw * 0.4, gy); p.closePath(); });
    const nx = bcx + o.bl / 2 - 1.8, ny = bcy - o.bh * 0.12, hx = o.hx, hy = o.hy, dx = hx - nx, dy = hy - ny, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L, w0 = o.nw, w1 = o.nw * 0.62;
    add(p => { p.moveTo(nx + px * w0, ny + py * w0); p.lineTo(hx + px * w1, hy + py * w1); p.lineTo(hx - px * w1, hy - py * w1); p.lineTo(nx - px * w0, ny - py * w0); p.closePath(); });
    add(p => p.ellipse(hx + o.hl * 0.45, hy + o.hl * 0.2, o.hl, o.hr, o.ha ?? 0.4, 0, TAU));
    if (o.tail) add(p => { const tx = bcx - o.bl / 2 + 0.4, ty = bcy - o.bh * 0.25; p.moveTo(tx, ty - 0.6); p.lineTo(tx - o.tail[0], ty + o.tail[1]); p.lineTo(tx + 0.9, ty + 0.9); p.closePath(); });
    if (o.pre) o.pre(g, { bcx, bcy, hx, hy });
    g.strokeStyle = o.col; g.lineWidth = 0.5; for (const p of parts) g.stroke(p);
    g.fillStyle = o.col; for (const p of parts) g.fill(p);
    { g.save(); g.clip(parts[0]); ell(g, bcx, bcy - o.bh * 0.62, o.bl * 0.6, o.bh * 0.42, 0, 'rgba(255,240,215,0.13)'); ell(g, bcx, bcy + o.bh * 0.62, o.bl * 0.6, o.bh * 0.34, 0, 'rgba(0,0,0,0.16)'); g.restore(); }
    if (o.post) o.post(g, { bcx, bcy, hx, hy, nx, ny });
  }
  const bone = (g, pts, lw = 0.9) => { line(g, pts, '#d6ccb4', lw * 0.8); };
  const ANIMALS = {
    deer: g => quad(g, { bl: 12, bh: 5, leg: 7, lw: 1.1, nw: 1.5, hx: 21, hy: 7.4, hl: 2, hr: 1.2, col: '#9a6e4a', belly: '#d9a274', tail: [0.6, 1.6],
      post: (g, m) => { for (const s of [0, 1.3]) { bone(g, [m.hx + 0.2 + s * 0.5, m.hy - 0.8, m.hx - 0.8 + s, m.hy - 4, m.hx + 0.6 + s, m.hy - 6.4]); bone(g, [m.hx - 0.6 + s, m.hy - 3.2, m.hx - 2.4 + s, m.hy - 4.6], 0.8); bone(g, [m.hx - 0.4 + s, m.hy - 4.6, m.hx + 1.8 + s, m.hy - 4.4], 0.8); } } }),
    wstag: g => quad(g, { bl: 12, bh: 5, leg: 7, lw: 1.1, nw: 1.5, hx: 21, hy: 7.4, hl: 2, hr: 1.2, col: '#f1ead2', belly: '#fbf6e6', tail: [0.6, 1.6],
      post: (g, m) => { for (const s of [0, 1.3]) { bone(g, [m.hx + 0.2 + s * 0.5, m.hy - 0.8, m.hx - 0.8 + s, m.hy - 4, m.hx + 0.6 + s, m.hy - 6.4]); bone(g, [m.hx - 0.6 + s, m.hy - 3.2, m.hx - 2.4 + s, m.hy - 4.6], 0.8); bone(g, [m.hx - 0.4 + s, m.hy - 4.6, m.hx + 1.8 + s, m.hy - 4.4], 0.8); } } }),
    hind: g => quad(g, { bl: 10.5, bh: 4.4, leg: 6.2, lw: 1, nw: 1.3, hx: 19.6, hy: 8.8, hl: 1.8, hr: 1.1, col: '#a67c58', belly: '#e2b48c', tail: [0.5, 1.4], post: (g, m) => { fs(g, P(`M${m.hx - 0.2} ${m.hy - 0.8} L${m.hx - 0.8} ${m.hy - 3} L${m.hx + 0.8} ${m.hy - 1.2} Z`), '#a67c58', null, 0.6); } }),
    reindeer: g => quad(g, { bl: 12, bh: 5.4, leg: 6.2, lw: 1.2, nw: 1.8, hx: 21, hy: 9.6, hl: 2.1, hr: 1.3, col: '#a39a8c', belly: '#e8e2d6', tail: [0.5, 1.2],
      post: (g, m) => { ell(g, m.nx + 0.6, m.ny + 1, 1.8, 2.4, 0.3, '#ece6da'); for (const s of [0, 1.2]) { bone(g, [m.hx + s * 0.4, m.hy - 1, m.hx - 2.6 + s, m.hy - 4.4, m.hx - 1.4 + s, m.hy - 7.4, m.hx + 1.2 + s, m.hy - 8.2]); bone(g, [m.hx - 2.2 + s, m.hy - 3.8, m.hx - 4.2 + s, m.hy - 5], 0.8); bone(g, [m.hx + 0.4 + s * 0.4, m.hy - 1.2, m.hx + 2.6 + s * 0.4, m.hy - 3], 0.8); } } }),
    boar: g => quad(g, { bl: 13, bh: 6.6, leg: 3.8, lw: 1.3, nw: 2.6, hx: 20.6, hy: 14.6, hl: 2.6, hr: 1.5, ha: 0.25, col: '#54453d', tail: [1.2, -1.2], hump: true,
      pre: (g, m) => { g.fillStyle = INK; for (let k = 0; k < 6; k++) { const x = m.bcx - 3.6 + k * 1.7; g.beginPath(); g.moveTo(x, m.bcy - 2.6); g.lineTo(x + 0.8, m.bcy - 5.2); g.lineTo(x + 1.6, m.bcy - 2.6); g.fill(); } },
      post: (g, m) => { bone(g, [m.hx + 2.6, m.hy + 1, m.hx + 2.2, m.hy - 0.6], 0.7); fs(g, P(`M${m.hx - 1.4} ${m.hy - 1.6} L${m.hx - 1.8} ${m.hy - 3.4} L${m.hx - 0.2} ${m.hy - 2} Z`), '#51403a', INK, 0.6); } }),
    aurochs: g => quad(g, { bl: 14.5, bh: 7.2, leg: 5, lw: 1.5, nw: 2.6, hx: 22.4, hy: 11.4, hl: 2.5, hr: 1.7, ha: 0.7, col: '#43352d', hump: true, tail: [1, 4.8],
      post: (g, m) => { line(g, [m.bcx - 5, m.bcy - 3.2, m.bcx + 2, m.bcy - 3.8], '#b99a78', 0.7); for (const s of [0, 0.9]) { g.beginPath(); g.moveTo(m.hx + 0.2 + s, m.hy - 1.4); g.quadraticCurveTo(m.hx + 3.2 + s, m.hy - 2.6, m.hx + 2.4 + s, m.hy - 5.6); g.strokeStyle = '#d6ccb4'; g.lineWidth = 0.9; g.stroke(); } } }),
    horse: g => quad(g, { bl: 12.5, bh: 5.4, leg: 6.6, lw: 1.2, nw: 2, hx: 21.2, hy: 7.4, hl: 2.5, hr: 1.2, ha: 0.75, col: '#b39c76', belly: '#e8d6b4', rump: true,
      pre: (g, m) => { g.beginPath(); g.moveTo(m.bcx - 6, m.bcy - 1.4); g.quadraticCurveTo(m.bcx - 8.6, m.bcy + 1, m.bcx - 7.6, m.bcy + 6.4); g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.3; g.stroke(); },
      post: (g, m) => { line(g, [m.nx - 0.6, m.ny - 1.6, m.hx - 1.2, m.hy - 0.8], '#3a2a1c', 1.6); line(g, [m.hx - 0.6, m.hy - 1.4, m.hx + 0.2, m.hy - 2.6], '#3a2a1c', 0.8); } }),
    bear: g => quad(g, { bl: 14.5, bh: 8.2, leg: 4, lw: 2, nw: 3.2, hx: 21.6, hy: 12.6, hl: 2.5, hr: 2, ha: 0.3, col: '#3d2e25', hump: true,
      post: (g, m) => { ell(g, m.hx - 0.4, m.hy - 2, 0.9, 0.9, 0, '#3d2e25'); ell(g, m.hx + 1.2, m.hy - 2.1, 0.8, 0.8, 0, '#3d2e25'); ell(g, m.hx + 2.8, m.hy + 0.9, 1.1, 0.8, 0, '#6a5546'); } }),
    wolf: g => quad(g, { bl: 12, bh: 4.6, leg: 5.8, lw: 1, nw: 1.8, hx: 20.6, hy: 9.4, hl: 2.4, hr: 1.2, ha: 0.35, col: '#857f73', belly: '#c9c2b2', tail: [3.4, 3],
      post: (g, m) => { fs(g, P(`M${m.hx - 1} ${m.hy - 1} L${m.hx - 0.6} ${m.hy - 3.2} L${m.hx + 0.6} ${m.hy - 1.2} Z`), '#857f73', INK, 0.5); fs(g, P(`M${m.hx + 0.4} ${m.hy - 1.1} L${m.hx + 1} ${m.hy - 3} L${m.hx + 1.8} ${m.hy - 0.9} Z`), '#857f73', INK, 0.5); } }),
    duck: g => { line(g, [4, 18.6, 8, 17.8, 12, 18.6, 16, 17.8, 20, 18.6], '#bfe0f0', 0.9); const b = P('M5.4 14.6 C7 11.4 13.6 11 16.6 13.4 C16.4 16.6 8.4 17.6 5.4 14.6 Z'); fs(g, b, '#8a6f52', INK, 0.9); const h = new Path2D(); h.ellipse(17.2, 10.4, 2, 1.9, 0, 0, TAU);  line(g, [15.6, 13, 16.6, 11.4], '#2f6a4a', 1.8); g.fillStyle = '#2f6a4a'; g.fill(h); fs(g, P('M18.8 10 L21.6 10.8 L18.8 11.4 Z'), '#e8b040', INK, 0.5); line(g, [8, 14.4, 12.6, 13.6], '#e6dcc8', 0.9); },
    sealion: g => { fs(g, P('M3.6 18.4 C5 12.4 10.4 10.6 14 12 C15.6 8.6 20.6 8.4 22.4 11.6 C20.6 12.4 19.4 13 18.6 14.8 C17.2 18.4 10.6 20.4 3.6 18.4 Z'), '#bfa880', INK, 1); fs(g, P('M4 18.2 L1.6 15.2 L5.6 16 Z'), '#bfa880', INK, 0.9); fs(g, P('M12.6 17.4 L14.4 20.4 L16.2 17 Z'), '#a8926c', INK, 0.8); },
    shoal: g => { const f = (x, y, s, c) => { g.save(); g.translate(x, y); g.scale(s, s); fs(g, P('M-6 0 C-3.4 -3.6 3 -3.6 5.4 0 C3 3.6 -3.4 3.6 -6 0 Z'), c, '#0e3a48', 0.9 / s); fs(g, P('M5 0 L8.4 -2.8 L8.4 2.8 Z'), c, '#0e3a48', 0.9 / s); g.restore(); }; f(9, 8, 0.72, '#a9c6cc'); f(18, 12.4, 0.82, '#93b7c0'); f(9.6, 17, 0.66, '#bcd3d6'); },
    whale: g => { fs(g, P('M2.6 15 C5.6 9.4 14.6 8.4 20.6 11.6 C22.6 12.6 24.2 12 26.4 9.4 C27 12.8 25.6 15 23 15.8 C16 18.8 7.4 18.6 2.6 15 Z'), '#51657a', INK, 1); fs(g, P('M4 15.6 C8 17.6 14 17.8 19 16.4 C14 19 7.6 18.6 4 15.6 Z'), 'rgba(200,214,224,0.55)'); g.strokeStyle = '#d8f0ff'; g.lineWidth = 0.9; for (const [a, b] of [[-1.6, -4.4], [0, -5.4], [1.6, -4.4]]) { g.beginPath(); g.moveTo(8, 9.6); g.quadraticCurveTo(8 + a * 0.4, 7, 8 + a, 9.6 + b + 3); g.stroke(); } },
  };
  for (const k in ANIMALS) mk('a_' + k, 30, 24, ANIMALS[k], 0.7);
  // mirrored copies so herds can face either way
  for (const k in ANIMALS) { const s = sprites['a_' + k], c = document.createElement('canvas'); c.width = s.width; c.height = s.height; c._lw = s._lw; c._lh = s._lh; const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(s, 0, 0); sprites['a_' + k + '_l'] = c; }

  // ---------- places & people ----------
  mk('fire', 24, 24, g => { for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; ell(g, 12 + Math.cos(a) * 8.4, 14 + Math.sin(a) * 5.2, 1.7, 1.4, 0, '#cfc8b8', INK, 0.8); } line(g, [8, 16.4, 16, 13.6], INK, 2.8); line(g, [8, 16.4, 16, 13.6], '#7a5630', 1.6); line(g, [8, 13.6, 16, 16.4], INK, 2.8); line(g, [8, 13.6, 16, 16.4], '#7a5630', 1.6); fs(g, P('M12 3.6 C14.6 7 16 9.2 16 11.6 A4 4 0 0 1 8 11.6 C8 9.8 9.2 8.8 10 7.2 C10.6 8.4 11 8.8 11.4 9 C11 7 11.2 5.2 12 3.6 Z'), '#f08a2c', INK, 0.9); fs(g, P('M12 8.6 C13.2 10 13.8 11 13.8 12 A1.8 1.8 0 0 1 10.2 12 C10.2 11 11 10 12 8.6 Z'), '#ffe07a'); });
  mk('trader', 24, 24, g => { line(g, [17.6, 6.4, 17.6, 20.6], INK, 1.9); line(g, [17.6, 6.4, 17.6, 20.6], '#b98b54', 1); const body = P('M9 11 Q12 9.4 14.6 11 L15.4 16.6 L13.6 21 L12 21 L12 17.4 L10.4 21 L8.8 21 L9.4 16.4 Z'); fs(g, body, '#d8c49a', INK, 1); g.beginPath(); g.roundRect(5.4, 10.4, 4.6, 6.4, 1.4); g.fillStyle = '#8a5a30'; g.fill(); g.strokeStyle = INK; g.lineWidth = 0.9; g.stroke(); ell(g, 12, 7.2, 2.4, 2.4, 0, '#e6c8a0', INK, 0.9); });
  mk('trader_me', 24, 24, g => { g.drawImage(sprites.trader, -1, -1, 26, 26); ell(g, 12, 7.2, 2.4, 2.4, 0, '#ffd34d', INK, 0.9); });
  mk('shrine', 24, 24, g => { ell(g, 12, 20, 6.4, 1.8, 0, 'rgba(0,0,0,0.35)'); ell(g, 12, 6.2, 2.2, 2.2, 0, '#f2a8c4', INK, 0.9); fs(g, P('M12 8.4 C8.2 9.6 7 12.8 8.6 14.8 C6.4 17 8.4 20.4 12 20.4 C15.6 20.4 17.6 17 15.4 14.8 C17 12.8 15.8 9.6 12 8.4 Z'), '#f2a8c4', INK, 0.9); });
  mk('grove', 24, 24, g => { const t = (x, y, r, c) => { line(g, [x, y + r - 1, x, y + r + 3.4], INK, 2.2); line(g, [x, y + r - 1, x, y + r + 3.4], '#6a4a2a', 1.1); ell(g, x, y, r, r * 1.05, 0, c, INK, 0.9); }; t(7.4, 11, 4.2, '#4f8f4a'); t(16.6, 11.6, 4, '#5a9a50'); t(12, 8, 4.8, '#6aac5c'); });
  mk('pole', 24, 24, g => { ell(g, 12, 21, 4, 1.2, 0, 'rgba(0,0,0,0.35)'); g.beginPath(); g.roundRect(10.2, 5, 3.6, 16, 1.2); g.fillStyle = '#b07a44'; g.fill(); g.strokeStyle = INK; g.lineWidth = 0.9; g.stroke(); fs(g, P('M10.2 8.4 L4.4 6 L5.4 10.6 L10.2 11.4 Z'), '#d0553f', INK, 0.8); fs(g, P('M13.8 8.4 L19.6 6 L18.6 10.6 L13.8 11.4 Z'), '#d0553f', INK, 0.8); for (const y of [13.4, 17]) line(g, [10.4, y, 13.6, y], INK, 0.7); ell(g, 11.2, 7, 0.5, 0.5, 0, INK); ell(g, 12.8, 7, 0.5, 0.5, 0, INK); });
  mk('stones', 24, 24, g => { ell(g, 12, 15, 9.4, 5, 0, 'rgba(0,0,0,0.22)'); const pts = []; for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + 0.3; pts.push([12 + Math.cos(a) * 8, 13.6 + Math.sin(a) * 4.4]); } pts.sort((a, b) => a[1] - b[1]); for (const [x, y] of pts) { g.beginPath(); g.roundRect(x - 1.3, y - 4.6, 2.6, 5.6, 0.9); g.fillStyle = '#d9d4c6'; g.fill(); g.strokeStyle = INK; g.lineWidth = 0.8; g.stroke(); } });
  mk('rockart', 24, 24, g => { ell(g, 12, 18.4, 9, 3, 0, 'rgba(0,0,0,0.22)'); fs(g, P('M3.4 17.6 Q3 10.4 8.6 8.2 Q14 5.4 18.4 8.8 Q21.6 11.6 20.6 17.6 Z'), '#b9b2a2', INK, 0.9); for (const [x, y, r] of [[9, 13, 2.6], [15.4, 12.4, 2]]) { g.strokeStyle = '#c2523a'; g.lineWidth = 0.9; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); ell(g, x, y, 0.8, 0.8, 0, '#c2523a'); } });
  mk('barrow', 24, 24, g => { fs(g, P('M2.6 17 C5 9.4 19 9.4 21.4 17 Z'), '#7f9e5c', INK, 0.9); line(g, [5, 14.6, 8, 12.4], '#a6c084', 0.8); g.beginPath(); g.roundRect(10, 13, 4, 4, 0.6); g.fillStyle = '#2a2018'; g.fill(); g.fillStyle = '#d9d2c2'; g.strokeStyle = INK; g.lineWidth = 0.7; g.beginPath(); g.roundRect(8.8, 11.8, 6.4, 1.6, 0.5); g.fill(); g.stroke(); });
  mk('star', 24, 24, g => { const p = new Path2D(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 4.4 : 10; k ? p.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r) : p.moveTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r); } p.closePath(); fs(g, p, '#ffd34d', INK, 1.3); });
  mk('crown', 24, 24, g => { fs(g, P('M4.6 17.4 L4 8.4 L8.4 12 L12 6.4 L15.6 12 L20 8.4 L19.4 17.4 Z'), '#f3cf6a', INK, 1.1); line(g, [5.4, 15.2, 18.6, 15.2], '#b98a20', 0.9); });

  // tents and houses take the tribe's colour, so they are drawn live
  const tentFn = tint => g => { line(g, [7, 0.5, 7, 3.2], INK, 0.6); fs(g, P('M7.2 0.6 L11.2 1.7 L7.2 2.9 Z'), tint, INK, 0.5);
    fs(g, P('M7 2.6 L12.8 11.2 L1.2 11.2 Z'), '#ead9ae', INK, 0.9); fs(g, P('M7 2.6 L12.8 11.2 L8.6 11.2 Z'), 'rgba(140,100,52,0.34)');
    fs(g, P('M7 6.4 L8.3 11.2 L5.7 11.2 Z'), '#4a3520'); line(g, [6.1, 1.9, 7.7, 3.5], INK, 0.5); line(g, [7.9, 1.9, 6.3, 3.5], INK, 0.5); line(g, [4.7, 7.2, 3.5, 11], 'rgba(120,90,50,0.6)', 0.35); };
  const tents = {};
  const stamp = (g, c, x, y, k) => { const w = (c._lw || c.width) * k, h = (c._lh || c.height) * k; g.imageSmoothingEnabled = true; g.drawImage(c, x - w / 2, y - h / 2, w, h); };
  function hueRGB(h, s, l) { const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
  function tent(g, x, y, s, col, ring) {
    const m = /hsla?\(([\d.]+)/.exec(col || ''), hb = m ? Math.round(+m[1] / 20) * 20 % 360 : -1, c = tents[hb] || (tents[hb] = mk(null, 14, 12, tentFn(hb < 0 ? '#b0583a' : `rgb(${hueRGB(hb, 0.55, 0.42).join(',')})`)));
    const k = Math.max(0.8, s / 11);
    if (ring) { g.strokeStyle = ring; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y + c._lh * k * 0.42, c._lw * k * 0.62, c._lh * k * 0.26, 0, 0, TAU); g.stroke(); }
    stamp(g, c, x, y, k);
  }
  const thatch = (g, x0, x1, y0, y1, col) => { for (let x = x0; x <= x1; x += 1.25) line(g, [x, y0 + Math.abs(x - (x0 + x1) / 2) * 0.28, x + (x - (x0 + x1) / 2) * 0.12, y1], col, 0.3); };
  const hutFn = (roof, straw) => g => { fs(g, P('M2 5 L12 5 L11.6 8.7 L2.4 8.7 Z'), '#ecdfbc', INK, 0.7); fs(g, P('M6 6 L7.8 6 L7.8 8.7 L6 8.7 Z'), '#4a3520');
    fs(g, P('M0.5 5.3 Q2.4 1 7 0.5 Q11.6 1 13.5 5.3 Z'), roof, INK, 0.8); thatch(g, 2.4, 11.6, 1.5, 5, straw); };
  mk('hut', 14, 9, hutFn('#cdaa68', '#8f6f38')); mk('hut_f', 14, 9, hutFn('#bdb48e', '#7c7556'));
  mk('hall', 19, 10, g => { fs(g, P('M2.4 5.4 L16.6 5.4 L16.2 9.6 L2.8 9.6 Z'), '#ecdfbc', INK, 0.7); for (const x of [5.4, 11.6]) fs(g, P(`M${x} 6.6 L${x + 1.9} 6.6 L${x + 1.9} 9.6 L${x} 9.6 Z`), '#4a3520');
    fs(g, P('M0.5 5.7 L4 1.1 L15 1.1 L18.5 5.7 Z'), '#a8553a', INK, 0.8); thatch(g, 3, 16, 1.6, 5.4, '#6e2f1c'); for (const x of [4, 15]) { line(g, [x - 0.8, 0.2, x + 0.6, 2], INK, 0.5); line(g, [x + 0.8, 0.2, x - 0.6, 2], INK, 0.5); } });
  mk('canoe', 12, 7, g => { line(g, [4.6, 0.5, 4.6, 4.4], INK, 0.5); fs(g, P('M4.8 0.7 L7.6 1.6 L4.8 2.7 Z'), '#b0583a', INK, 0.4);
    fs(g, P('M0.4 3.6 Q1.2 4.5 2.2 4.6 L9.8 4.6 Q10.8 4.5 11.6 3.6 Q10.6 6.5 8.6 6.5 L3.4 6.5 Q1.4 6.5 0.4 3.6 Z'), '#8f6a3a', INK, 0.7); line(g, [2.2, 5.3, 9.8, 5.3], '#5e4222', 0.35); });
  function hut(g, x, y, s, roof) { const nm = roof === 'hall' ? 'hall' : roof === 'fish' ? 'hut_f' : 'hut'; stamp(g, sprites[nm], x, y, Math.max(0.8, s / 9)); }
  function canoe(g, x, y, ang) { const c = sprites.canoe; g.save(); g.translate(Math.round(x), Math.round(y)); if (Math.cos(ang || 0) < 0) g.scale(-1, 1); g.imageSmoothingEnabled = true; g.drawImage(c, -c._lw, -c._lh, c._lw * 2, c._lh * 2); g.restore(); }
  // the furniture of the map itself
  // the furniture of the map, drawn as a mapmaker would: small, inked, with a thin wash
  mk('pine', 10, 11, g => { line(g, [5, 8.6, 5, 10.8], '#6a4a2a', 0.9); for (const [y, w] of [[6.6, 4.4], [4.2, 3.4], [1.9, 2.3]]) { fs(g, P(`M5 ${y - 3.4} L${5 + w} ${y + 2} L${5 - w} ${y + 2} Z`), '#74834a', INK, 0.6); fs(g, P(`M5 ${y - 3.4} L${5 + w} ${y + 2} L5.4 ${y + 2} Z`), 'rgba(58,70,34,0.45)'); } });
  mk('tree', 11, 11, g => { line(g, [5.5, 7.4, 5.5, 10.8], '#6a4a2a', 1); line(g, [5.5, 9, 4.2, 10.8], '#6a4a2a', 0.5);
    const cr = new Path2D(); cr.ellipse(5.5, 4.6, 4.9, 4.2, 0, 0, TAU); fs(g, cr, '#869556', INK, 0.7); ell(g, 6.9, 5.5, 3, 2.9, 0, 'rgba(62,76,36,0.4)'); ell(g, 4.2, 3.2, 1.8, 1.3, 0, 'rgba(236,232,180,0.4)'); });
  // villages and camps in the map's own hand: small houses seen from the side, same ink and wash as the trees
  const WALL = '#e6d8b4', THATCH = '#c4a46a', SHADE = 'rgba(120,88,50,0.45)', DOOR = '#3a2a18';
  mk('vhouse', 12, 10, g => { fs(g, P('M2 5.2 L10 5.2 L9.8 9.2 L2.2 9.2 Z'), WALL, INK, 0.7); fs(g, P('M6.2 5.2 L10 5.2 L9.8 9.2 L6.2 9.2 Z'), SHADE);
    fs(g, P('M5.2 6.8 L6.8 6.8 L6.8 9.2 L5.2 9.2 Z'), DOOR);
    fs(g, P('M0.7 5.6 Q2.2 3.2 6 0.5 Q9.8 3.2 11.3 5.6 Z'), THATCH, INK, 0.7); fs(g, P('M6 0.5 Q9.8 3.2 11.3 5.6 L6.6 5.6 Z'), SHADE); for (const x of [3, 4.6, 7.4, 9]) line(g, [x, 5.2, 6 + (x - 6) * 0.35, 1.8], 'rgba(110,80,40,0.55)', 0.3); });
  mk('vlong', 16, 9, g => { fs(g, P('M1.6 5.2 L14.4 5.2 L14.2 8.6 L1.8 8.6 Z'), WALL, INK, 0.7); fs(g, P('M8.6 5.2 L14.4 5.2 L14.2 8.6 L8.6 8.6 Z'), SHADE);
    fs(g, P('M6.6 6.4 L8.2 6.4 L8.2 8.6 L6.6 8.6 Z'), DOOR);
    fs(g, P('M0.4 5.6 L3.4 1.2 L12.6 1.2 L15.6 5.6 Z'), THATCH, INK, 0.7); fs(g, P('M8 3.4 L15.6 5.6 L12.6 1.2 L8 1.2 Z'), SHADE); for (const x of [3, 5.6, 8.2, 10.8, 13]) line(g, [x, 5.4, 3.4 + (x - 0.4) * 0.8, 1.6], 'rgba(110,80,40,0.5)', 0.3); });
  mk('vhall', 20, 12, g => { fs(g, P('M2 6.8 L18 6.8 L17.8 11 L2.2 11 Z'), WALL, INK, 0.7); fs(g, P('M10.4 6.8 L18 6.8 L17.8 11 L10.4 11 Z'), SHADE);
    for (const x of [5.2, 11.8]) fs(g, P(`M${x} 8 L${x + 1.8} 8 L${x + 1.8} 11 L${x} 11 Z`), DOOR);
    fs(g, P('M0.5 7.2 L4.4 2 L15.6 2 L19.5 7.2 Z'), THATCH, INK, 0.7); fs(g, P('M10 7.2 L19.5 7.2 L15.6 2 L10 2 Z'), SHADE); for (const x of [3, 6, 9, 12, 15, 17.6]) line(g, [x, 6.9, 4.4 + (x - 0.5) * 0.58, 2.4], 'rgba(110,80,40,0.5)', 0.3);
    line(g, [4.4, 2, 15.6, 2], INK, 0.7); for (const x of [4.4, 15.6]) { line(g, [x - 0.9, 0.2, x + 0.7, 2.2], INK, 0.5); line(g, [x + 0.9, 0.2, x - 0.7, 2.2], INK, 0.5); } });
  mk('vfish', 18, 10, g => { fs(g, P('M1.4 5.4 L8.4 5.4 L8.2 9.2 L1.6 9.2 Z'), WALL, INK, 0.7); fs(g, P('M5 5.4 L8.4 5.4 L8.2 9.2 L5 9.2 Z'), SHADE); fs(g, P('M3.3 6.8 L4.7 6.8 L4.7 9.2 L3.3 9.2 Z'), DOOR);
    fs(g, P('M0.4 5.8 Q1.6 3.4 4.9 0.8 Q8.2 3.4 9.4 5.8 Z'), THATCH, INK, 0.7); fs(g, P('M4.9 0.8 Q8.2 3.4 9.4 5.8 L5.5 5.8 Z'), SHADE);
    fs(g, P('M10 7.2 Q11 9.6 13 9.6 L16 9.6 Q17.4 9.4 17.8 7 Q14 8 10 7.2 Z'), '#a98458', INK, 0.6); line(g, [11, 8.2, 16.6, 8.2], 'rgba(60,40,20,0.5)', 0.3); });
  mk('vhut', 16, 10, g => { fs(g, P('M1.4 5.4 L8.4 5.4 L8.2 9.2 L1.6 9.2 Z'), WALL, INK, 0.7); fs(g, P('M5 5.4 L8.4 5.4 L8.2 9.2 L5 9.2 Z'), SHADE); fs(g, P('M3.3 6.8 L4.7 6.8 L4.7 9.2 L3.3 9.2 Z'), DOOR);
    fs(g, P('M0.4 5.8 Q1.6 3.4 4.9 0.8 Q8.2 3.4 9.4 5.8 Z'), THATCH, INK, 0.7); fs(g, P('M4.9 0.8 Q8.2 3.4 9.4 5.8 L5.5 5.8 Z'), SHADE);
    line(g, [11, 3.4, 11, 9.4], INK, 0.6); line(g, [15, 3.4, 15, 9.4], INK, 0.6); line(g, [10.4, 4, 15.6, 4], INK, 0.6); for (const x of [11.8, 13, 14.2]) line(g, [x, 4, x, 6.4], '#8a7a62', 0.7); });
  mk('vtent', 13, 8, g => { fs(g, P('M0.8 7.4 Q0.9 2.4 6.5 1.3 Q12.1 2.4 12.2 7.4 Z'), '#cdb27a', INK, 0.7); fs(g, P('M6.5 1.3 Q12.1 2.4 12.2 7.4 L6.5 7.4 Z'), SHADE);
    fs(g, P('M5.2 7.4 Q5.3 4.6 6.5 4.4 Q7.7 4.6 7.8 7.4 Z'), DOOR); line(g, [2.6, 6.2, 3.4, 3.2], 'rgba(110,80,40,0.5)', 0.3); line(g, [10, 5.8, 9.2, 3.2], 'rgba(110,80,40,0.4)', 0.3); line(g, [5.9, 0.1, 7.1, 1.5], INK, 0.5); line(g, [7.1, 0.1, 5.9, 1.5], INK, 0.5); });
  for (const nm of ['vfish', 'vhut']) { const s = sprites[nm], c = document.createElement('canvas'); c.width = s.width; c.height = s.height; c._lw = s._lw; c._lh = s._lh; const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(s, 0, 0); sprites[nm + '_l'] = c; }
  mk('vhearth', 12, 11, g => { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; ell(g, 6 + Math.cos(a) * 4.2, 7.6 + Math.sin(a) * 2.3, 1.1, 0.85, 0, '#c4c0b2', INK, 0.55); }
    fs(g, P('M6 3.6 Q8.4 6 7.4 8 Q6 8.8 4.6 8 Q3.6 6 6 3.6 Z'), '#c8742e', INK, 0.4); ell(g, 6, 7.4, 0.9, 1.1, 0, '#e8b050');
    g.beginPath(); g.moveTo(6, 3); g.bezierCurveTo(4.6, 2, 7.4, 1, 6, 0.1); g.strokeStyle = 'rgba(29,21,14,0.55)'; g.lineWidth = 0.35; g.stroke(); });
  mk('bush', 8, 5, g => { const b = new Path2D(); b.ellipse(4, 3, 3.6, 2, 0, 0, TAU); fs(g, b, '#8d9a60', INK, 0.5); ell(g, 5, 3.5, 2, 1.2, 0, 'rgba(62,76,36,0.4)'); });
  const hatch = (g, pts) => { for (const [x, y, len] of pts) line(g, [x, y, x + len * 0.42, y + len], 'rgba(92,66,36,0.75)', 0.3); };
  mk('peak', 16, 8, g => { fs(g, P('M0.5 7.7 L5.6 1.5 L7.3 3 L9.5 0.5 L15.5 7.7 Z'), '#efe5c6'); fs(g, P('M9.5 0.5 L15.5 7.7 L10.6 7.7 L8.6 4.2 Z'), 'rgba(170,138,88,0.55)'); fs(g, P('M5.6 1.5 L7.3 3 L8 7.7 L6.2 7.7 Z'), 'rgba(170,138,88,0.4)');
    line(g, [0.5, 7.7, 5.6, 1.5, 7.3, 3, 9.5, 0.5, 15.5, 7.7], INK, 0.75); hatch(g, [[10.2, 2.2, 2.2], [11.2, 3.2, 2.4], [12.2, 4.4, 2.2], [13.2, 5.6, 1.6], [6.2, 2.9, 2], [6.9, 4.2, 2.2]]); }, 1, true);
  mk('peak2', 16, 6, g => { fs(g, P('M0.5 5.7 L4.6 1 L7.4 3.4 L10.4 1.6 L15.5 5.7 Z'), '#efe5c6'); fs(g, P('M4.6 1 L7.4 3.4 L7 5.7 L5.4 5.7 Z'), 'rgba(170,138,88,0.45)'); fs(g, P('M10.4 1.6 L15.5 5.7 L11.4 5.7 Z'), 'rgba(170,138,88,0.5)');
    line(g, [0.5, 5.7, 4.6, 1, 7.4, 3.4, 10.4, 1.6, 15.5, 5.7], INK, 0.7); hatch(g, [[5.4, 2.2, 1.8], [6.2, 3.3, 1.8], [11.4, 2.8, 1.6], [12.6, 3.8, 1.5]]); }, 1, true);
  mk('hill', 12, 3, g => { g.beginPath(); g.moveTo(0.6, 2.8); g.quadraticCurveTo(6, -1.6, 11.4, 2.8); g.strokeStyle = 'rgba(96,70,38,0.85)'; g.lineWidth = 0.45; g.stroke(); hatch(g, [[7.4, 0.9, 1.3], [8.6, 1.3, 1.2], [9.7, 1.9, 0.9]]); }, 1, true);
  mk('tuft', 7, 3, g => { for (const [x, d] of [[2.2, -0.9], [3.5, 0], [4.8, 0.9]]) line(g, [x, 2.8, x + d, 0.5], 'rgba(96,84,40,0.8)', 0.35); }, 1, true);
  mk('reed', 7, 4, g => { for (const x of [1.4, 3.5, 5.6]) { line(g, [x, 3.8, x, 0.8], 'rgba(86,90,50,0.85)', 0.35); ell(g, x, 0.9, 0.35, 0.7, 0, 'rgba(110,78,40,0.9)'); } line(g, [0.4, 3.8, 6.6, 3.8], 'rgba(70,96,110,0.6)', 0.3); }, 1, true);
  // cleared fields: a small patch of ploughed strips, and one with the grain standing
  const fieldPatch = (g, ground, line1, ears) => {
    const A = [1, 2.6], B = [12.6, 0.9], C = [14.4, 6.1], D = [2.6, 8.2], lp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    fs(g, P(`M${A} L${B} L${C} L${D} Z`), ground, 'rgba(58,40,20,0.85)', 0.6);
    for (let k = 1; k < 8; k++) { const t = k / 8, a = lp(A, B, t), d = lp(D, C, t); line(g, [a[0], a[1], d[0], d[1]], line1, 0.36); if (ears && k % 2) for (let m = 1; m < 5; m++) { const q = lp(a, d, m / 5); line(g, [q[0], q[1], q[0] + 0.15, q[1] - 0.7], ears, 0.28); } }
  };
  mk('field', 16, 9.2, g => fieldPatch(g, '#c4975a', 'rgba(84,54,24,0.9)'), 1, true);
  mk('field_g', 16, 9.2, g => fieldPatch(g, '#e0cd7c', 'rgba(118,118,46,0.85)', 'rgba(150,112,30,0.95)'), 1, true);
  mk('wave', 10, 2, g => { g.strokeStyle = 'rgba(74,104,122,0.7)'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(0.4, 1.4); g.quadraticCurveTo(1.6, 0.2, 2.8, 1.4); g.quadraticCurveTo(4, 0.2, 5.2, 1.4); g.moveTo(5.6, 1.6); g.quadraticCurveTo(6.8, 0.4, 8, 1.6); g.quadraticCurveTo(8.8, 0.9, 9.6, 1.4); g.stroke(); }, 1, true);
  mk('compass', 30, 30, g => { g.strokeStyle = '#5e4624'; g.lineWidth = 1; g.beginPath(); g.arc(15, 15, 9.5, 0, TAU); g.stroke();
    const arm = (a, len, wd, c1, c2) => { g.save(); g.translate(15, 15); g.rotate(a); g.fillStyle = c1; g.beginPath(); g.moveTo(0, -len); g.lineTo(wd, 0); g.lineTo(0, 0); g.closePath(); g.fill(); g.fillStyle = c2; g.beginPath(); g.moveTo(0, -len); g.lineTo(-wd, 0); g.lineTo(0, 0); g.closePath(); g.fill(); g.restore(); };
    for (let k = 0; k < 4; k++) arm(k * Math.PI / 2 + Math.PI / 4, 8, 2.2, '#b89a60', '#886a3a');
    for (let k = 0; k < 4; k++) arm(k * Math.PI / 2, 14, 3, k === 0 ? '#b0583a' : '#f0e4b8', k === 0 ? '#7c3824' : '#5e4624'); });
  sprites.tent = mk(null, 14, 12, tentFn('#b0583a'));
  // ---------- faces: every person gets an inked portrait, drawn from who they are ----------
  const faces = {}, ageBk = a => a < 16 ? 0 : a < 22 ? 1 : a < 34 ? 2 : a < 50 ? 3 : a < 65 ? 4 : 5;
  function face(q, hue, lead) {
    const ageB = ageBk(q.age), key = q.id + ':' + ageB + ':' + (hue == null ? 'n' : Math.round(hue / 20)) + (lead ? 'L' : '');
    if (faces[key]) return faces[key];
    let sd = ((q.id | 0) * 2654435761 + 97) >>> 0; const rnd = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296, pk = a => a[Math.floor(rnd() * a.length)];
    const F = q.sex === 'F', kid = ageB === 0, old = ageB >= 4, vold = ageB === 5;
    const skin = pk(['#e9c8a6', '#e0b890', '#d4a680', '#c89a72', '#ecd2b6', '#dcae84']), dark = 'rgba(120,70,40,0.28)';
    let hair = pk(['#3a2a1c', '#5a3a22', '#7a4a26', '#2a211a', '#96683a', '#a04a28', '#4a3424']); if (vold) hair = '#dcd6c8'; else if (old && rnd() < 0.65) hair = '#a39c90';
    const fw = (kid ? 13 : 14.5) + rnd() * 2.6, top = (kid ? 14 : 11) + rnd() * 2, jw = (F || kid ? 6.5 : 8.5) + rnd() * 2.5, chin = kid ? 50 : 52.5 + rnd() * 1.5, style = Math.floor(rnd() * 3), eyeY = kid ? 33 : 31.5;
    const beard = !F && ageB >= 2 && (ageB >= 3 ? rnd() < 0.8 : rnd() < 0.5), bald = !F && old && style === 2, smile = rnd() * 2 - 0.6, band = rnd() < 0.3;
    const cloth = hue == null ? '#b9a27a' : `hsl(${hue},${32 + rnd() * 12}%,${40 + rnd() * 10}%)`;
    const c = mk(null, 64, 76, g => {
      const ink = (p, lw = 0.9) => { g.strokeStyle = 'rgba(46,30,18,0.9)'; g.lineWidth = lw; g.stroke(p); };
      // long hair falls behind the shoulders
      if ((F && style !== 2) || (!F && style === 1 && !kid)) { const p = P(`M${32 - fw - 2} 26 C${32 - fw - 7} 44 ${32 - fw - 5} 60 ${32 - fw + 2} 66 L${32 + fw - 2} 66 C${32 + fw + 5} 60 ${32 + fw + 7} 44 ${32 + fw + 2} 26 Z`); fs(g, p, hair); ink(p, 0.8); }
      // shoulders and tunic
      const sh = P('M4 77 Q6 61 22 57 L42 57 Q58 61 60 77 Z'); fs(g, sh, cloth); ink(sh);
      fs(g, P('M24 57.5 Q32 68 40 57.5 Q32 61 24 57.5 Z'), skin); line(g, [24, 57.5, 32, 66.5, 40, 57.5], 'rgba(46,30,18,0.8)', 0.7);
      if (lead) { g.strokeStyle = '#b8862a'; g.lineWidth = 1.6; g.beginPath(); g.arc(32, 57, 9.5, 0.25, Math.PI - 0.25); g.stroke(); ell(g, 23.2, 60.4, 1.5, 1.5, 0, '#d9a23a', 'rgba(46,30,18,0.8)', 0.5); ell(g, 40.8, 60.4, 1.5, 1.5, 0, '#d9a23a', 'rgba(46,30,18,0.8)', 0.5); }
      else if (F && rnd() < 0.6) for (let k = 0; k < 7; k++) { const a = 0.5 + k * 0.36; ell(g, 32 + Math.cos(a) * 9.5, 57 + Math.sin(a) * 7.5, 1, 1, 0, k % 2 ? '#c8652e' : '#e6d9b0', 'rgba(46,30,18,0.7)', 0.4); }
      // neck, ears, head
      fs(g, P('M26.5 44 L37.5 44 L38.5 58 Q32 62 25.5 58 Z'), skin); fs(g, P('M26.5 48 L37.5 48 L38 54 Q32 57 26 54 Z'), dark);
      for (const s of [-1, 1]) ell(g, 32 + s * (fw + 0.4), eyeY + 2, 2.2, 3.4, 0, skin, 'rgba(46,30,18,0.85)', 0.7);
      const head = P(`M${32 - fw} ${eyeY - 1} C${32 - fw} ${top - 2} ${32 + fw} ${top - 2} ${32 + fw} ${eyeY - 1} C${32 + fw} ${eyeY + 12} ${32 + jw} ${chin - 1.5} 32 ${chin} C${32 - jw} ${chin - 1.5} ${32 - fw} ${eyeY + 12} ${32 - fw} ${eyeY - 1} Z`);
      fs(g, head, skin); for (const s of [-1, 1]) ell(g, 32 + s * (fw - 5), eyeY + 8.5, 4, 3, 0, 'rgba(206,96,70,0.2)');
      fs(g, P(`M${32 + fw} ${eyeY - 1} C${32 + fw} ${eyeY + 12} ${32 + jw} ${chin - 1.5} 32 ${chin} C${32 + jw - 3} ${chin - 5} ${32 + fw - 4} ${eyeY + 8} ${32 + fw} ${eyeY - 1} Z`), dark); ink(head, 1);
      // beard and moustache
      if (beard) { const bl = chin + 3 + rnd() * 7, b = P(`M${32 - fw + 0.6} ${eyeY + 6} C${32 - fw + 1} ${eyeY + 14} ${32 - jw - 1} ${bl - 2} 32 ${bl} C${32 + jw + 1} ${bl - 2} ${32 + fw - 1} ${eyeY + 14} ${32 + fw - 0.6} ${eyeY + 6} C${32 + fw - 4} ${eyeY + 11} ${32 + 6} ${eyeY + 11.5} 32 ${eyeY + 11.5} C${32 - 6} ${eyeY + 11.5} ${32 - fw + 4} ${eyeY + 11} ${32 - fw + 0.6} ${eyeY + 6} Z`); fs(g, b, hair); ink(b, 0.8);
        for (let k = -3; k <= 3; k++) line(g, [32 + k * 2.6, eyeY + 14, 32 + k * 2.9, bl - 2 - Math.abs(k) * 1.2], 'rgba(46,30,18,0.35)', 0.4); }
      // eyes, brows
      for (const s of [-1, 1]) { const ex = 32 + s * 6.4; ell(g, ex, eyeY, kid ? 2.7 : 2.4, kid ? 1.7 : 1.25, 0, '#f6efdc', 'rgba(46,30,18,0.85)', 0.6); ell(g, ex + s * 0.2, eyeY, 1.15, 1.15, 0, pk(['#3a2a1c', '#4a5a4a', '#5a4630', '#3c4a5c']));
        line(g, [ex - 2.9, eyeY - 0.6, ex, eyeY - 1.7, ex + 2.9, eyeY - 0.6], 'rgba(46,30,18,0.9)', 0.7);
        line(g, [ex - 3.4, eyeY - 4 + (s < 0 ? 0.6 : -0.2) * (F ? 0.4 : 1), ex + 3.4, eyeY - 4 + (s < 0 ? -0.2 : 0.6) * (F ? 0.4 : 1)], vold ? '#a8a296' : hair, F ? 0.9 : 1.5);
        if (old) { line(g, [ex + s * 3.2, eyeY + 0.4, ex + s * 5, eyeY + 1.6], 'rgba(46,30,18,0.5)', 0.4); line(g, [ex + s * 3.2, eyeY - 0.2, ex + s * 5.2, eyeY - 0.8], 'rgba(46,30,18,0.5)', 0.4); line(g, [ex - 2.4, eyeY + 2.6, ex + 2.2, eyeY + 3], 'rgba(46,30,18,0.4)', 0.4); } }
      if (old) for (const y of [top + 5.5, top + 8]) line(g, [26, y, 32, y - 0.6, 38, y], 'rgba(46,30,18,0.4)', 0.4);
      // nose and mouth
      g.strokeStyle = 'rgba(46,30,18,0.85)'; g.lineWidth = 0.75; g.beginPath(); g.moveTo(32.8, eyeY + 1.5); g.quadraticCurveTo(30.2, eyeY + 8, 30.4, eyeY + 9.4); g.quadraticCurveTo(32, eyeY + 10.6, 34, eyeY + 9.6); g.stroke();
      g.beginPath(); g.moveTo(27.6, eyeY + 14.4 - smile * 0.3); g.quadraticCurveTo(32, eyeY + 14.6 + smile, 36.4, eyeY + 14.4 - smile * 0.3); g.lineWidth = 0.9; g.stroke();
      if (!beard) { g.beginPath(); g.moveTo(29.6, eyeY + 16.6); g.quadraticCurveTo(32, eyeY + 17.4, 34.4, eyeY + 16.6); g.strokeStyle = 'rgba(46,30,18,0.35)'; g.lineWidth = 0.5; g.stroke(); if (F) fs(g, P(`M28.4 ${eyeY + 14.6} Q32 ${eyeY + 16.8 + smile * 0.5} 35.6 ${eyeY + 14.6} Q32 ${eyeY + 15.4 + smile} 28.4 ${eyeY + 14.6} Z`), 'rgba(176,74,58,0.5)'); }
      else { const m = P(`M25.6 ${eyeY + 13.6} Q29 ${eyeY + 10.8} 32 ${eyeY + 12} Q35 ${eyeY + 10.8} 38.4 ${eyeY + 13.6} Q35 ${eyeY + 13} 32 ${eyeY + 13.4} Q29 ${eyeY + 13} 25.6 ${eyeY + 13.6} Z`); fs(g, m, hair); ink(m, 0.5); }
      if (old && !beard) for (const s of [-1, 1]) line(g, [32 + s * 4.4, eyeY + 9.5, 32 + s * 6, eyeY + 14.5], 'rgba(46,30,18,0.4)', 0.4);
      // hair on top
      if (!bald) { const part = style === 0 ? 0 : (rnd() - 0.5) * 8, fr = eyeY - (kid ? 9 : 10.5) + rnd() * 2,
        cap = P(`M${32 - fw - 1.6} ${eyeY + (F ? 3 : 1)} C${32 - fw - 3.4} ${top - 9} ${32 + fw + 3.4} ${top - 9} ${32 + fw + 1.6} ${eyeY + (F ? 3 : 1)} C${32 + fw - 1} ${fr + 3} ${32 + part + 5} ${fr - 1} ${32 + part} ${fr + 1.4} C${32 + part - 5} ${fr - 1} ${32 - fw + 1} ${fr + 3} ${32 - fw - 1.6} ${eyeY + (F ? 3 : 1)} Z`);
        fs(g, cap, hair); ink(cap, 0.9); for (let k = -3; k <= 3; k++) line(g, [32 + part + k * 2.2, fr + 0.6, 32 + k * 4.4, top - 5.5 + Math.abs(k) * 1.1], 'rgba(46,30,18,0.3)', 0.4);
        if (F && style === 2) { ell(g, 32, top - 6.5, 6.5, 5.2, 0, hair, 'rgba(46,30,18,0.9)', 0.9); line(g, [26.5, top - 3, 37.5, top - 3], cloth, 1.4); }
        if (F && style === 1) for (const s of [-1, 1]) { const bx = 32 + s * (fw + 1.5); for (let k = 0; k < 5; k++) ell(g, bx + s * (k % 2 ? 0.7 : -0.3), eyeY + 8 + k * 5.2, 2.6, 3.1, 0, hair, 'rgba(46,30,18,0.85)', 0.6); ell(g, bx, eyeY + 34.5, 1.6, 1.6, 0, cloth, 'rgba(46,30,18,0.8)', 0.5); } }
      else { for (const s of [-1, 1]) { const tu = P(`M${32 + s * (fw + 1.4)} ${eyeY + 3} C${32 + s * (fw + 3.4)} ${eyeY - 3} ${32 + s * (fw - 1)} ${eyeY - 9} ${32 + s * (fw - 2.4)} ${eyeY - 7} C${32 + s * (fw - 1)} ${eyeY - 3} ${32 + s * fw} ${eyeY} ${32 + s * (fw + 1.4)} ${eyeY + 3} Z`); fs(g, tu, hair); ink(tu, 0.6); } }
      if (band && !bald && !kid) line(g, [32 - fw - 0.6, eyeY - 6.4, 32, eyeY - 8, 32 + fw + 0.6, eyeY - 6.4], cloth, 1.7);
    }, 0.75, true);
    return (faces[key] = c);
  }
  const faceUrls = {};
  const faceImg = (q, hue, h = 52, cls = '', lead) => { const c = face(q, hue, lead), k = q.id + ':' + (hue == null ? 'n' : Math.round(hue / 20)) + ':' + ageBk(q.age) + (lead ? 'L' : ''); return `<img class="face ${cls}" src="${faceUrls[k] || (faceUrls[k] = c.toDataURL())}" width="${Math.round(h * c.width / c.height)}" height="${h}" alt="">`; };

  // ---------- scenes: a painted strip at the head of each decision ----------
  const scenes = {};
  function scene(kind, sub) {
    const key = kind + ':' + (sub || ''); if (scenes[key]) return scenes[key];
    const W = 640, H = 230, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
    let sd = 7 + key.length * 131; for (const ch of key) sd = (sd * 31 + ch.charCodeAt(0)) >>> 0; const rnd = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
    const mood = /omen|foundling/.test(kind) ? 'night' : /raided|landattack|landtaken|war|vengeance|blood|quarrel|slight|challenge|rivalry|badblood|exilesback|oathback/.test(kind) ? 'red' : /sickness|famine/.test(kind) ? 'grey' : /gathering|marriage|friendneed|succession|path|exiles|oath|foundback/.test(kind) ? 'dusk' : 'day';
    const SKY = { night: ['#2c3850', '#5a6480', '#9a94a0'], red: ['#c9a084', '#e2c4a0', '#f0dfc0'], grey: ['#aab0ac', '#c8c8bc', '#e2dcc8'], dusk: ['#8a90a8', '#d8b08c', '#f0d8a8'], day: ['#a8c4cc', '#cfdcd0', '#efe6c8'] }[mood];
    const sky = g.createLinearGradient(0, 0, 0, H * 0.7); sky.addColorStop(0, SKY[0]); sky.addColorStop(0.6, SKY[1]); sky.addColorStop(1, SKY[2]); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 9; k++) { g.fillStyle = `rgba(255,250,235,${0.05 + rnd() * 0.08})`; g.beginPath(); g.ellipse(rnd() * W, rnd() * H * 0.45, 60 + rnd() * 120, 8 + rnd() * 16, 0, 0, TAU); g.fill(); } // thin cloud washes
    if (mood === 'night') { for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(250,244,220,${0.4 + rnd() * 0.5})`; g.fillRect(rnd() * W, rnd() * H * 0.5, 1.6, 1.6); }
      g.fillStyle = kind === 'omen' ? '#c4553a' : '#f0e6c4'; g.beginPath(); g.arc(470, 62, 34, 0, TAU); g.fill(); g.strokeStyle = 'rgba(46,30,18,0.7)'; g.lineWidth = 2; g.stroke(); g.fillStyle = 'rgba(60,20,10,0.18)'; g.beginPath(); g.arc(482, 54, 9, 0, TAU); g.arc(458, 74, 6, 0, TAU); g.fill(); }
    else if (mood === 'dusk' || mood === 'red') { g.fillStyle = mood === 'red' ? 'rgba(190,70,40,0.5)' : 'rgba(240,190,110,0.7)'; g.beginPath(); g.arc(150, H * 0.6, 44, 0, TAU); g.fill(); }
    // far hills, near hills, the ground: washes with an inked edge
    const ridge = (y0, amp, col, edge) => { const p = new Path2D(); p.moveTo(-10, H); p.lineTo(-10, y0); let x = -10; while (x < W + 40) { const nx = x + 50 + rnd() * 80; p.quadraticCurveTo((x + nx) / 2, y0 - amp * (0.3 + rnd()), nx, y0 + (rnd() - 0.5) * amp * 0.5); x = nx; } p.lineTo(W + 40, H); p.closePath(); g.fillStyle = col; g.fill(p); g.strokeStyle = edge; g.lineWidth = 1.6; g.stroke(p); };
    const G = { night: ['#4a546a', '#3c4a50', '#34403a'], red: ['#b89878', '#a89468', '#8c8454'], grey: ['#a4a898', '#96987e', '#84866a'], dusk: ['#9a8e90', '#96936c', '#7c8452'], day: ['#a8b89c', '#a2ae78', '#8c9c5c'] }[mood];
    ridge(H * 0.52, 34, G[0], 'rgba(46,30,18,0.45)'); ridge(H * 0.66, 24, G[1], 'rgba(46,30,18,0.6)'); ridge(H * 0.82, 12, G[2], 'rgba(46,30,18,0.75)');
    const sp = (name, x, y, h, flip) => { const s = sprites[name]; if (!s) return; const w = h * s.width / s.height; g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.imageSmoothingEnabled = true; g.drawImage(s, -w / 2, -h, w, h); g.restore(); };
    const spears = (x, n, lean) => { for (let k = 0; k < n; k++) { const sx = x + k * 13 + rnd() * 5, top = 70 + rnd() * 30; g.strokeStyle = 'rgba(46,30,18,0.9)'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(sx, H - 8); g.lineTo(sx + lean * 14, top); g.stroke(); g.fillStyle = '#c9c4b4'; g.beginPath(); g.moveTo(sx + lean * 14 - 4, top + 2); g.lineTo(sx + lean * 16, top - 16); g.lineTo(sx + lean * 14 + 5, top + 2); g.closePath(); g.fill(); g.lineWidth = 1.2; g.stroke(); } };
    const camp = (x, n) => { for (let k = 0; k < n; k++) sp('tent', x + k * 62 + rnd() * 10, H - 18 - (k % 2) * 10, 62 + rnd() * 14); };
    const woods = (x0, x1, n) => { for (let k = 0; k < n; k++) sp(rnd() < 0.6 ? 'pine' : 'tree', x0 + (x1 - x0) * rnd(), H - 30 - rnd() * 34, 54 + rnd() * 40); };
    if (kind === 'beast' && sub === 'whale') { g.fillStyle = '#7f9aa4'; g.fillRect(0, H * 0.62, W, H); for (let k = 0; k < 60; k++) { g.strokeStyle = `rgba(240,244,236,${0.25 + rnd() * 0.4})`; g.lineWidth = 1.4; const x = rnd() * W, y = H * 0.66 + rnd() * H * 0.32; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 9, y - 5, x + 18, y); g.stroke(); } sp('a_whale', 330, H - 26, 120); sp('canoe', 110, H - 40, 46); sp('canoe', 540, H - 60, 38, true); }
    else if (kind === 'beast') { woods(0, 250, 7); woods(430, 640, 6); sp('a_' + ({ bear: 'bear', boar: 'boar', aurochs: 'aurochs', wolf: 'wolf', stag: 'wstag', whale: 'whale' }[sub] || 'bear'), 330, H - 12, sub === 'whale' ? 110 : 130); }
    else if (kind === 'omen' || kind === 'foundling') { camp(60, 3); woods(300, 420, 3); }
    else if (mood === 'red') { camp(380, 3); spears(40, 9, 1); spears(520, 5, -1); }
    else if (kind === 'gathering' || kind === 'marriage' || kind === 'friendneed' || kind === 'exiles' || kind === 'oath' || kind === 'foundback') { camp(40, 3); camp(430, 3); sp('fire', 320, H - 14, 96); }
    else if (mood === 'grey') { sp('hut', 150, H - 18, 74); sp('hut', 250, H - 30, 62); woods(420, 620, 3); }
    else if (kind === 'grain' || kind === 'toobig' || kind === 'milestone') { g.fillStyle = 'rgba(226,190,96,0.75)'; g.beginPath(); g.ellipse(430, H - 24, 190, 26, 0, 0, TAU); g.fill(); for (let x = 260; x < 600; x += 16) { g.strokeStyle = 'rgba(150,110,40,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, H - 6); g.lineTo(x + 20, H - 46); g.stroke(); } sp('hall', 140, H - 22, 80); sp('hut', 240, H - 16, 60); sp('hut', 50, H - 14, 58); }
    else { woods(0, 200, 4); camp(250, 3); woods(500, 640, 3); }
    // paper grain and a darkened edge, so it sits in the page like a tipped-in plate
    for (let k = 0; k < 1400; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '70,48,22' : '255,248,225'},${rnd() * 0.05})`; g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 3, 1.5); }
    return (scenes[key] = c.toDataURL('image/jpeg', 0.86));
  }
  // draw a sprite centred at x,y with the given on-screen height
  function put(g, name, x, y, h, alpha) {
    const s = sprites[name]; if (!s) return; const k = h / (s._lh || s.height);
    if (alpha != null) g.globalAlpha = alpha; stamp(g, s, x, y, k); if (alpha != null) g.globalAlpha = 1;
  }
  const url = name => urls[name] || (urls[name] = sprites[name] ? sprites[name].toDataURL() : '');
  const img = (name, size = 18) => sprites[name] ? `<img class="ic" src="${url(name)}" width="${Math.round(size * sprites[name].width / sprites[name].height)}" height="${size}" alt="">` : '';
  return { sprites, put, img, url, tent, hut, canoe, stamp, px, face, faceImg, scene, RES, FOOD, GOODS, FAITH, ANIMALS: Object.keys(ANIMALS) };
})();
