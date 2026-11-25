// ===== GOD-CAMERA UI =====
(() => {
  const { N, CELL, WORLD, FORAGE_R, BIOMES, GROVES, DEPOSITS, GOOD_NAMES } = SIM;
  const $ = s => document.querySelector(s);
  const cv = $('#map'), ctx = cv.getContext('2d'), bgc = $('#bg'), bgx = bgc.getContext('2d'); let bgKey = '', baseVer = 0, detailVer = 0;
  const R = 600, SC = R / N;
  const base = document.createElement('canvas'); base.width = base.height = R;
  const bctx = base.getContext('2d'), img = bctx.createImageData(R, R), landL = new Float32Array(R * R);
  const show = { people: true, names: true, res: true, wild: true, roads: true, kult: false, every: false };
  const LOD_FAR = 8, LOD_MID = 28; // zoomed = screen px per 10 km: a phone's whole-isles view is about 5, the default about 16, a close look 60
  let lastTab = 'log', sheet = 'half', lastTopB = 0, modalDismiss = null;
  let houseTab = 'overview', tribeTab = 'overview', W, shade, jx, jy, layer = 'terrain', running = true, speedIx = 1, tide = '', tideAt = 0, tideN = -1, sel = null, selCell = null, panel = 'log', expanded = false;
  const SPEEDS = [{ l: '½×', wps: 4 }, { l: '1×', wps: 13 }, { l: '4×', wps: 52 }, { l: '16×', wps: 208 }];
  const cam = { s: 1, ox: 0, oy: 0 };
  let dirty = true, lastPaintWeek = -1, lastPaintTime = 0, simAcc = 0;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // ---------- field sampling on the irregular mesh ----------
  // Every pixel is covered by one triangle of the cell mesh; values are blended by barycentric weights,
  // so fields, biome borders and coastlines come out smooth and organic instead of square.
  let TA, TW, det, tex, landF, lakeF, vShade, rivers = [];
  function sampler(field) {
    return (px, py) => { const k3 = (py * R + px) * 3; return TW[k3] * field[TA[k3]] + TW[k3 + 1] * field[TA[k3 + 1]] + TW[k3 + 2] * field[TA[k3 + 2]]; };
  }
  const nearest = (px, py) => { const k3 = (py * R + px) * 3; let m = 0; if (TW[k3 + 1] > TW[k3 + m]) m = 1; if (TW[k3 + 2] > TW[k3 + m]) m = 2; return TA[k3 + m]; };
  function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(hash2(xi, yi, s), hash2(xi + 1, yi, s), u), lerp(hash2(xi, yi + 1, s), hash2(xi + 1, yi + 1, s), u), v); }
  let QT, SD = 0, UX, UY;
  // multi-octave value noise in world metres; finer octaves only when pixels are small enough to show them
  function detailNoise(wx, wy, mpp) {
    let s = 0, tot = 0, amp = 1, f = 1 / 15000;
    for (let o = 0; o < 7; o++) { if (1 / f < mpp * 1.5) break; s += amp * vnoise(wx * f, wy * f, SD + o); tot += amp; amp *= 0.7; f *= 2.2; }
    return tot ? s / tot : 0.5;
  }
  function texNoise(wx, wy, mpp) { const f1 = 1 / Math.max(2500, mpp * 2.5), f2 = f1 * 2.3; return vnoise(wx * f1, wy * f1, SD + 20) * 0.6 + vnoise(wx * f2, wy * f2, SD + 21) * 0.4; }
  // domain warp: bends straight triangle edges into natural, wandering borders
  function warp(wx, wy) { return [wx + (vnoise(wx / 14000, wy / 14000, SD + 40) - 0.5) * 7000 + (vnoise(wx / 3500, wy / 3500, SD + 41) - 0.5) * 2200, wy + (vnoise(wx / 14000, wy / 14000, SD + 42) - 0.5) * 7000 + (vnoise(wx / 3500, wy / 3500, SD + 43) - 0.5) * 2200]; }
  function locate(wx, wy, out) {
    const sx = Math.floor(wx / CELL), sy = Math.floor(wy / CELL);
    for (let qy = sy - 1; qy <= sy; qy++) for (let qx = sx - 1; qx <= sx; qx++) {
      if (qx < 0 || qy < 0 || qx >= N - 1 || qy >= N - 1) continue;
      const q = (qy * (N - 1) + qx) * 6;
      for (let t = 0; t < 6; t += 3) {
        const a = QT[q + t], b = QT[q + t + 1], c = QT[q + t + 2], ax = W.px[a], ay = W.py[a], bx = W.px[b], by = W.py[b], cx = W.px[c], cy = W.py[c];
        const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy), w0 = ((by - cy) * (wx - cx) + (cx - bx) * (wy - cy)) / den, w1 = ((cy - ay) * (wx - cx) + (ax - cx) * (wy - cy)) / den, w2 = 1 - w0 - w1;
        if (w0 >= -1e-6 && w1 >= -1e-6 && w2 >= -1e-6) { out[0] = a; out[1] = b; out[2] = c; out[3] = w0; out[4] = w1; out[5] = w2; return true; }
      }
    }
    const i = SIM.cellAt(wx, wy); out[0] = out[1] = out[2] = i; out[3] = 1; out[4] = out[5] = 0; return false;
  }
  function prep() {
    SD = W.seed % 997;
    const n = N * N, sc = R / WORLD;
    TA = new Int32Array(R * R * 3); TW = new Float32Array(R * R * 3); const has = new Uint8Array(R * R);
    const tri = (a, b, c) => {
      const ax = W.px[a] * sc - 0.5, ay = W.py[a] * sc - 0.5, bx = W.px[b] * sc - 0.5, by = W.py[b] * sc - 0.5, cx = W.px[c] * sc - 0.5, cy = W.py[c] * sc - 0.5;
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-9) return;
      const x0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx))), x1 = Math.min(R - 1, Math.floor(Math.max(ax, bx, cx))), y0 = Math.max(0, Math.ceil(Math.min(ay, by, cy))), y1 = Math.min(R - 1, Math.floor(Math.max(ay, by, cy)));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const w0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den, w1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den, w2 = 1 - w0 - w1;
        if (w0 < -1e-5 || w1 < -1e-5 || w2 < -1e-5) continue;
        const k = y * R + x, k3 = k * 3; TA[k3] = a; TA[k3 + 1] = b; TA[k3 + 2] = c; TW[k3] = w0; TW[k3 + 1] = w1; TW[k3 + 2] = w2; has[k] = 1;
      }
    };
    const dd = (a, b) => (W.px[a] - W.px[b]) ** 2 + (W.py[a] - W.py[b]) ** 2;
    const QT0 = () => { if (QT && QT._w === W) return; QT = new Int32Array((N - 1) * (N - 1) * 6); QT._w = W;
      for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++) { const a = y * N + x, b = a + 1, c = a + N, d = a + N + 1, q = (y * (N - 1) + x) * 6; if (dd(a, d) < dd(b, c)) QT.set([a, b, d, a, d, c], q); else QT.set([a, b, c, b, d, c], q); } };
    { const out = [0, 0, 0, 0, 0, 0]; QT0(); for (let k = 0; k < R * R; k++) { const [wx, wy] = warp((k % R + 0.5) / sc, (((k / R) | 0) + 0.5) / sc); locate(wx, wy, out); TA[k * 3] = out[0]; TA[k * 3 + 1] = out[1]; TA[k * 3 + 2] = out[2]; TW[k * 3] = out[3]; TW[k * 3 + 1] = out[4]; TW[k * 3 + 2] = out[5]; has[k] = 1; } }
    for (let k = 0; k < R * R; k++) if (!has[k]) { const i = SIM.cellAt((k % R + 0.5) / sc, (((k / R) | 0) + 0.5) / sc); TA[k * 3] = TA[k * 3 + 1] = TA[k * 3 + 2] = i; TW[k * 3] = 1; TW[k * 3 + 1] = TW[k * 3 + 2] = 0; }
    // fine detail noise in world space (coast crinkles, ground texture) — consistent at every zoom
    det = new Float32Array(R * R); tex = new Float32Array(R * R);
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) { const k = y * R + x, wx = (x + 0.5) / sc, wy = (y + 0.5) / sc; det[k] = detailNoise(wx, wy, 1 / sc); tex[k] = texNoise(wx, wy, 1 / sc); }
    UX = new Float32Array(n); UY = new Float32Array(n); for (let i = 0; i < n; i++) { const [a, b] = unwarp(W.px[i], W.py[i]); UX[i] = a; UY[i] = b; }
    landF = new Float32Array(n); lakeF = new Float32Array(n); for (let i = 0; i < n; i++) { landF[i] = W.land[i]; lakeF[i] = W.lake[i]; }
    // smooth (per-vertex) hill shading
    vShade = new Float32Array(n); const E = i => W.land[i] ? W.elev[i] : 0;
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = y * N + x, gx = (E(i + 1) - E(i - 1)) / Math.max(1, W.px[i + 1] - W.px[i - 1]), gy = (E(i + N) - E(i - N)) / Math.max(1, W.py[i + N] - W.py[i - N]);
      const nx = -gx * 22, ny = -gy * 22, l = Math.hypot(nx, ny, 1); vShade[i] = clamp((nx * -0.62 + ny * -0.62 + 0.5) / l, 0, 1.3);
    }
    const ss = sampler(vShade); shade = new Float32Array(R * R); for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) shade[y * R + x] = ss(x, y) * (0.9 + 0.2 * tex[y * R + x]);
    // river courses as chains of cells, drawn as smooth curves
    const up = new Int32Array(n); rivers = [];
    const isR = i => W.land[i] && W.isRiver[i] && !W.lake[i];
    for (const i of W.landIdx) if (isR(i)) { const d = W.down[i]; if (d >= 0 && isR(d)) up[d]++; }
    const seen = new Uint8Array(n);
    for (const s of W.landIdx) {
      if (!isR(s) || up[s] > 0) continue;
      const chain = [s]; seen[s] = 1; let c = s;
      for (let g = 0; g < 400; g++) { const d = W.down[c]; if (d < 0) break; chain.push(d); if (!isR(d) || seen[d]) break; seen[d] = 1; c = d; }
      if (chain.length > 1) rivers.push(chain);
    }
  }
  function ramp(stops, t) { t = clamp(t, 0, 1) * (stops.length - 1); const i = Math.min(stops.length - 2, t | 0), f = t - i; return mix(stops[i], stops[i + 1], f); }
  const RAMPS = {
    soil: [[120, 80, 50], [170, 130, 70], [190, 175, 80], [110, 150, 60], [40, 100, 50]],
    water: [[200, 160, 110], [220, 210, 150], [120, 180, 170], [50, 120, 180], [30, 60, 140]],
    game: [[50, 45, 60], [100, 70, 110], [170, 100, 120], [230, 160, 110], [250, 230, 160]],
    impact: [[40, 70, 50], [120, 120, 60], [210, 140, 50], [220, 70, 40], [140, 20, 30]],
  };
  // biome colours (natural view), by season
  function vegColor(b, s, conif) {
    const summer = s > 0.33 && s < 0.72, autumn = s >= 0.72 && s < 0.88, winter = !summer && !autumn;
    switch (b) {
      case 2: return [138, 140, 118];
      case 3: return [36, 68, 54];
      case 4: return winter ? [62, 70, 56] : autumn ? [92, 90, 46] : [44, 82, 50];
      case 5: return winter ? [96, 86, 70] : autumn ? [132, 104, 46] : [54, 100, 46];
      case 6: return summer ? [146, 166, 82] : [164, 152, 108];
      case 7: return s > 0.58 && s < 0.75 ? [132, 92, 124] : [120, 100, 86];
      case 8: return [104, 112, 78];
      case 9: return [196, 186, 146];
      default: return [120, 130, 90];
    }
  }
  const BIOME_FLAT = [[30, 60, 100], [70, 130, 190], [175, 180, 170], [40, 95, 85], [75, 125, 60], [60, 150, 60], [190, 205, 100], [160, 110, 160], [120, 105, 70], [230, 210, 150]];
  const GROVE_COL = [null, [215, 175, 60], [235, 110, 90], [200, 60, 120], [120, 110, 230]];

  function paint() { paintInto(img, R, R, TA, TW, det, tex, shade); bctx.putImageData(img, 0, 0); baseVer++; }
  let baseJob = null;
  function paintStep(budget) { // repaint the base map a slice of rows at a time
    if (!baseJob) return; const t0 = performance.now();
    while (baseJob.y < R && performance.now() - t0 < budget) { paintInto(img, R, R, TA, TW, det, tex, shade, baseJob.y, Math.min(R, baseJob.y + 24)); baseJob.y += 24; }
    if (baseJob.y >= R) { bctx.putImageData(img, 0, 0); baseJob = null; baseVer++; }
  }
  function paintInto(target, RW, RH, TA, TW, det, tex, shade, Y0 = 0, Y1 = RH) {
    const s = SIM.seasonOf(W.week), tS = SIM.tempOffset(s), d = target.data;
    const sampler = f => (px, py) => { const k3 = (py * RW + px) * 3; return TW[k3] * f[TA[k3]] + TW[k3 + 1] * f[TA[k3 + 1]] + TW[k3 + 2] * f[TA[k3 + 2]]; };
    const nearest = (px, py) => { const k3 = (py * RW + px) * 3; let m = 0; if (TW[k3 + 1] > TW[k3 + m]) m = 1; if (TW[k3 + 2] > TW[k3 + m]) m = 2; return TA[k3 + m]; };
    const S = k => sampler(W[k]), sl = sampler(landF), slk = sampler(lakeF);
    const sg = S('grass'), ss = S('shrub'), sf = S('forest'), sClay = S('clay'), sOm = S('om'), sT = S('T0'), sA = S('amp'), sDep = S('depth'), sEl = S('elev');
    const sN = S('nit'), sWat = S('water'), sWhc = S('whc'), sGame = S('game'), sHar = S('harvest'), sSea = S('seaDist'), sFarm = S('farm'), sWG = S('wildGrain');
    const SEA_SHALLOW = [214, 222, 208], SEA_MID = [196, 210, 204], SEA_DEEP = [180, 198, 198], LAKE = [190, 208, 206], COAST = [62, 78, 96];
    const LAND = [[246, 236, 198], [238, 225, 178], [229, 213, 158], [218, 200, 142], [204, 185, 126]], BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const parch = layer === 'terrain' || layer === 'food';
    for (let y = Y0; y < Y1; y++) for (let x = 0; x < RW; x++) {
      const k = y * RW + x, k3 = k * 3, sh = shade[k], dn = det[k] - 0.5;
      const L = sl(x, y) + dn * 0.44; if (target === img) landL[k] = L;
      let c;
      if (L < 0.5) { // sea, with lighter shallows hugging the coast
        const dd = sSea(x, y) + dn * 1.5, bay = BAY[(x & 3) + ((y & 3) << 2)] / 16; // a flat inked sea in three dithered tones, with a dark line where it meets the land
        c = dd < 2 ? mix(SEA_SHALLOW, SEA_MID, clamp(dd / 2, 0, 1)) : mix(SEA_MID, SEA_DEEP, clamp((dd - 2) / 4, 0, 1)); if (L > 0.43) c = mix(c, [236, 236, 216], clamp((L - 0.43) / 0.035, 0, 1) * 0.55); if (L > 0.468) c = mix(c, COAST, clamp((L - 0.468) / 0.03, 0, 1) ** 1.5); // a pale wash, lighter against the inked shore
        if (layer === 'food' && L <= 0.468) { const i = nearest(x, y); if (!W.land[i] && W.shelf[i] && W.fish[i] / 900000 > 0.25 + bay * 0.5) c = [150, 186, 176]; }
        d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = 255; continue;
      }
      if (slk(x, y) + dn * 0.3 > 0.5) { if (target === img) landL[k] = 0.3;
        c = mix(COAST, LAKE, clamp((slk(x, y) + dn * 0.3 - 0.5) / 0.07, 0, 1)); d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = 255; continue;
      }
      if (layer === 'terrain' || layer === 'food') {
        const clay = sClay(x, y), om = sOm(x, y), dep = sDep(x, y), dk = clamp(1 - om * 0.04, 0.6, 1);
        let bare = [lerp(196, 156, clay * 2) * dk, lerp(170, 126, clay * 2) * dk, lerp(128, 96, clay * 2) * dk];
        if (dep < 0.3) bare = mix(bare, [150, 148, 145], (0.3 - dep) / 0.3);
        let vc = [0, 0, 0], ws = 0;
        for (let m = 0; m < 3; m++) { const v = TA[k3 + m], w = TW[k3 + m]; if (w <= 0 || !W.land[v] || W.lake[v]) continue; const col = vegColor(W.biome[v], s); vc[0] += col[0] * w; vc[1] += col[1] * w; vc[2] += col[2] * w; ws += w; }
        vc = ws > 0 ? vc.map(v => v / ws) : vegColor(W.biome[nearest(x, y)], s);
        const cov = Math.min(1, sg(x, y) + ss(x, y) + sf(x, y));
        c = mix(bare, vc, clamp(cov + (tex[k] - 0.5) * 0.25, 0, 1));
        { const fm = sFarm(x, y); if (fm > 0.01) { const stripe = ((x + y * 0.5) % 6) < 3 ? 1 : 0.85; c = mix(c, s > 0.42 && s < 0.66 ? [214, 184, 96].map(v => v * stripe) : [150, 124, 84].map(v => v * stripe), clamp(fm * 9, 0, 0.85)); } }
        const T = sT(x, y) + sA(x, y) * tS + dn * 2.5; if (T < -0.5) c = mix(c, [242, 244, 248], clamp((-0.5 - T) / 3, 0, 0.92));
        const el = sEl(x, y); c = c.map(v => v * (0.95 + el / 5000) * (0.93 + 0.14 * tex[k]));
        const l = 0.5 + 0.6 * sh; c = c.map(v => v * l);
        { // watercolour: green washes in the low country, deeper under trees; tan on the uplands; pale rock above; soft shade on the lee of hills
          const wood = clamp(sf(x, y) + ss(x, y) * 0.4, 0, 1), fm = sFarm(x, y), el2 = sEl(x, y), up = clamp((el2 - 170) / 430, 0, 1), hi = clamp((el2 - 760) / 500, 0, 1);
          let g0 = mix([203, 201, 148], [150, 160, 104], wood);                       // meadow to woodland
          g0 = mix(g0, mix([226, 204, 150], [200, 176, 122], wood * 0.5), up);         // the uplands go tan
          g0 = mix(g0, [234, 222, 190], hi);                                           // and the heights pale
          if (T < -0.5) g0 = mix(g0, [246, 244, 236], clamp((-0.5 - T) / 3, 0, 0.9));
          const lt = 0.84 + 0.3 * sh + (tex[k] - 0.5) * 0.07;
          c = g0.map(v => v * lt); if (L < 0.535) c = mix(COAST, c, clamp((L - 0.5) / 0.035, 0, 1) ** 0.7); // the shore line, soft-edged like a brush stroke
          if (up > 0.25 && sh < 0.44 && ((x + y) & 3) === 0) c = c.map(v => v * 0.9);  // a mapmaker's hatching on the shaded slopes
          if (fm > 0.012) c = mix(c, (s > 0.42 && s < 0.66 ? [226, 196, 110] : [196, 168, 112]).map(v => v * (((x + y * 2) % 5) < 2 ? 0.9 : 1)), clamp(fm * 9, 0, 0.8)); // fields
        }
        if (layer === 'food') {
          c = c.map(v => v * 0.9);
          { const wg = sWG(x, y); if (wg > 0.005) c = mix(c, [250, 220, 90], clamp(wg * 5, 0, 0.9)); }
          for (let m = 0; m < 3; m++) { const v = TA[k3 + m], w = TW[k3 + m]; if (w <= 0) continue;
            if (W.groveType[v]) c = mix(c, GROVE_COL[W.groveType[v]], clamp(W.grove[v] * 3.2, 0, 0.85) * w * 1.4 * (0.8 + 0.4 * tex[k]));
            if (W.shellK[v] > 0) c = mix(c, [255, 140, 200], clamp(W.shell[v] / 6e6, 0.15, 0.85) * w * 1.3);
            if (W.sealK[v] > 0) c = mix(c, [205, 180, 140], clamp(W.seal[v] / 3.5e6, 0.1, 0.7) * w); }
        }
      } else if (layer === 'biome') {
        let vc = [0, 0, 0], ws = 0;
        for (let m = 0; m < 3; m++) { const v = TA[k3 + m], w = TW[k3 + m]; if (w <= 0 || !W.land[v]) continue; const col = BIOME_FLAT[W.biome[v]]; vc[0] += col[0] * w; vc[1] += col[1] * w; vc[2] += col[2] * w; ws += w; }
        c = (ws > 0 ? vc.map(v => v / ws) : BIOME_FLAT[W.biome[nearest(x, y)]]).map(v => v * (0.72 + 0.35 * sh));
      } else {
        let t;
        if (layer === 'soil') t = sN(x, y) / 100; else if (layer === 'water') t = sWat(x, y) / Math.max(1, sWhc(x, y));
        else if (layer === 'game') t = Math.sqrt(sGame(x, y) / 40); else t = Math.sqrt(sHar(x, y) / 30000);
        c = ramp(RAMPS[layer], t).map(v => v * (0.7 + 0.35 * sh));
      }
      if (!parch) { const lum = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; c = mix(c, [lum * 1.1 + 30, lum * 1.0 + 22, lum * 0.72 + 10], 0.4); } // data views, washed in sepia
      if (L < 0.535) c = parch ? [247, 238, 204] : mix([240, 228, 186], c, (L - 0.5) / 0.035); // a pale strand along the shore
      d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = 255;
    }
  }

  // ---------- full-resolution detail of the current view (drawn when zoomed in and the camera rests) ----------
  const detailCv = document.createElement('canvas'), dctx = detailCv.getContext('2d');
  let detail = null, camMoved = 0, detailWeek = -1;
  let detailJob = null;
  function startDetail(key) {
    const w = Math.ceil(wide() ? $('.panel').getBoundingClientRect().left + 10 : cv.clientWidth), h = Math.ceil(wide() ? cv.clientHeight : Math.min(cv.clientHeight, $('.panel').getBoundingClientRect().top + 30));
    const q = 0.5, RW = Math.ceil(w * q), RH = Math.ceil(h * q); // two screen points to a painted pixel: the ground reads as pixel art at every zoom
    detailJob = { key, q, RW, RH, y: 0, s: cam.s, ox: cam.ox, oy: cam.oy, TA: new Int32Array(RW * RH * 3), TW: new Float32Array(RW * RH * 3), det: new Float32Array(RW * RH), tex: new Float32Array(RW * RH), sh: new Float32Array(RW * RH), im: new ImageData(RW, RH), week: W.week };
  }
  function detailStep(budget) {
    const J = detailJob; if (!J) return; const t0 = performance.now(), out = [0, 0, 0, 0, 0, 0], mpp = 1 / (J.s * J.q);
    while (J.y < J.RH && performance.now() - t0 < budget) {
      const y1 = Math.min(J.RH, J.y + 16);
      for (let y = J.y; y < y1; y++) for (let x = 0; x < J.RW; x++) {
        const k = y * J.RW + x, wx = ((x + 0.5) / J.q - J.ox) / J.s, wy = ((y + 0.5) / J.q - J.oy) / J.s;
        if (wx < 0 || wy < 0 || wx >= WORLD || wy >= WORLD) { J.TW[k * 3] = 1; continue; }
        const [vx, vy] = warp(wx, wy); locate(vx, vy, out); J.TA[k * 3] = out[0]; J.TA[k * 3 + 1] = out[1]; J.TA[k * 3 + 2] = out[2]; J.TW[k * 3] = out[3]; J.TW[k * 3 + 1] = out[4]; J.TW[k * 3 + 2] = out[5];
        J.det[k] = detailNoise(wx, wy, mpp); J.tex[k] = texNoise(wx, wy, mpp);
        J.sh[k] = (out[3] * vShade[out[0]] + out[4] * vShade[out[1]] + out[5] * vShade[out[2]]) * (0.9 + 0.2 * J.tex[k]);
      }
      paintInto(J.im, J.RW, J.RH, J.TA, J.TW, J.det, J.tex, J.sh, J.y, y1); J.y = y1;
    }
    if (J.y >= J.RH) {
      detailCv.width = J.RW; detailCv.height = J.RH; dctx.putImageData(J.im, 0, 0);
      detail = { s: J.s * J.q, ox: J.ox * J.q, oy: J.oy * J.q, q: J.q, key: J.key, at: performance.now() }; detailWeek = J.week; detailJob = null; detailVer++;
    }
  }

  // ---------- camera ----------
  const wide = () => cv.clientWidth >= 820, phone = () => !wide();
  function viewRect() {
    const w = cv.clientWidth, h = cv.clientHeight, top = $('.top').getBoundingClientRect().bottom + 4;
    if (wide()) return { x0: 0, y0: top, x1: $('.panel').getBoundingClientRect().left - 8, y1: h - 8 };
    return { x0: 0, y0: top, x1: w, y1: h - Math.min($('.panel').getBoundingClientRect().height, h * 0.9) - 8 };
  }
  // parts of the screen the names must keep clear of (the buttons laid over the map), measured from the page, not on every frame
  let zoneAt = -1e9, zoneKey = '', zoneBoxes = [];
  function clearZones(w, h) {
    const t = performance.now(), k = w + 'x' + h; if (k === zoneKey && t - zoneAt < 300) return zoneBoxes;
    const out = []; for (const el of [$('.tools'), $('#actBtn'), ...(phone() ? [$('#play'), $('#speed'), $('#skipBtn')] : [])]) { if (!el) continue; const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) out.push([(r.left + r.right) / 2, (r.top + r.bottom) / 2, r.width + 8, r.height + 8]); }
    zoneKey = k; zoneAt = t; return zoneBoxes = out;
  }
  function fit() {
    const V = viewRect(), w = V.x1 - V.x0, top = V.y0, avail = Math.max(200, V.y1 - V.y0);
    // fit the land, not the whole sea square
    let x0 = N, x1 = 0, y0 = N, y1 = 0; for (const i of W.landIdx) { const x = i % N, y = (i / N) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const bw = (x1 - x0 + 3) * CELL, bh = (y1 - y0 + 3) * CELL;
    cam.s = Math.min(w / bw, avail / bh);
    cam.s *= 0.97; cam.ox = V.x0 + w / 2 - ((x0 + x1 + 1) / 2) * CELL * cam.s; cam.oy = top + avail / 2 - ((y0 + y1 + 1) / 2) * CELL * cam.s;
  }
  // the painted land is domain-warped, so map features are drawn at the matching (un-warped) spot
  const unwarp = (x, y) => { const [wx, wy] = warp(x, y); return [2 * x - wx, 2 * y - wy]; };
  const toScreen = (x, y) => { const [ux, uy] = unwarp(x, y); return [cam.ox + ux * cam.s, cam.oy + uy * cam.s]; };
  const toWorld = (sx, sy) => warp((sx - cam.ox) / cam.s, (sy - cam.oy) / cam.s);
  const cellS = i => [cam.ox + UX[i] * cam.s, cam.oy + UY[i] * cam.s];
  // camps glide toward their simulated position instead of jumping week to week
  function easeCamps(dt) {
    const k = Math.min(1, dt * 3.5);
    for (const c of W.clans) {
      // a camp is drawn where it is pitched, not where its people happen to be walking: trips to the gathering and back are not shown,
      // and a move to a new site is one short glide. Small shifts of a few km are ignored.
      const sx = c.settled || c.tx == null ? c.x : c.tx, sy = c.settled || c.ty == null ? c.y : c.ty;
      if (c.bx == null) { c.bx = c.atGathering && c.home ? c.home[0] : sx; c.by = c.atGathering && c.home ? c.home[1] : sy; }
      else if (!c.atGathering && Math.hypot(sx - c.bx, sy - c.by) > (c.settled ? 500 : 6000)) { c.bx = sx; c.by = sy; }
      if (c.rx == null || Math.hypot(c.bx - c.rx, c.by - c.ry) > 300000) { c.rx = c.bx; c.ry = c.by; }
      c.rx += (c.bx - c.rx) * k; c.ry += (c.by - c.ry) * k;
      const [a, b] = unwarp(c.rx, c.ry); c.ux = a; c.uy = b;
    }
    for (const t of W.tribes) {
      const h = t.home || SIM.tribeCenter(t); if (!h) continue;
      // label anchor: between the homeland and where the camps are, eased slowly so it doesn't jitter
      const tx = h[0], ty = h[1]; // the name sits on the homeland and stays there
      if (t.ax == null || Math.hypot(tx - t.ax, ty - t.ay) > 300000) { t.ax = tx; t.ay = ty; }
      t.ax += (tx - t.ax) * Math.min(1, dt * 1.2); t.ay += (ty - t.ay) * Math.min(1, dt * 1.2);
    }
  }
  const cs = c => c.ux != null ? [cam.ox + c.ux * cam.s, cam.oy + c.uy * cam.s] : toScreen(c.x, c.y);
  const anchor = t => t.ax != null ? toScreen(t.ax, t.ay) : toScreen(...SIM.tribeCenter(t));
  function zoomAt(sx, sy, f) { const ns = clamp(cam.s * f, 0.0001, 0.02); f = ns / cam.s; cam.ox = sx - (sx - cam.ox) * f; cam.oy = sy - (sy - cam.oy) * f; cam.s = ns; }
  function centerOn(x, y, minScale) { const V = viewRect(); if (minScale && cam.s < minScale) cam.s = minScale; const [ux, uy] = unwarp(x, y); cam.ox = (V.x0 + V.x1) / 2 - ux * cam.s; cam.oy = (V.y0 + V.y1) / 2 - uy * cam.s; }
  function resize() { const dpr = Math.min(1.5, window.devicePixelRatio || 1); for (const [c, g] of [[cv, ctx], [bgc, bgx]]) { c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); } bgKey = ''; }

  const clanCol = (c, a = 1) => `hsla(${show.kult && c.tribe.kult ? c.tribe.kult.hue : c.tribe.hue},40%,${Math.round(40 + (c.light - 45) * 0.6)}%,${a})`; // hide tents, dyed in the tribe's colour
  const selTribe = () => !sel ? null : sel.kind === 'tribe' ? sel : sel.kind === 'place' ? sel.tribe : sel.kind === 'clan' ? sel.tribe : (sel.kind === 'family' || sel.kind === 'person') ? sel.clan && sel.clan.tribe : null;
  const selClan = () => !sel ? null : sel.kind === 'clan' ? sel : (sel.kind === 'family' || sel.kind === 'person') ? sel.clan : null;
  const opCol = (o, a = 1) => o > 15 ? `rgba(62,118,48,${a})` : o < -15 ? `rgba(168,52,34,${a})` : `rgba(112,98,80,${a})`;
  const DEP_COL = { flint: '#dfe6ee', amber: '#f2a531', axe: '#6fd08f', ochre: '#d0553f', salt: '#ffffff', grain: '#f5d36a', copper: '#d9823f', tin: '#b4c6d6', whale: '#9cc8ec', furs: '#b98a5a', shells: '#f0e4d0', metal: '#d9823f', bronze: '#c9a24a' };

  // ---------- territories: rounded hulls around each tribe's camps ----------
  function hull(P) {
    if (P.length < 3) return P.slice();
    const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  // Minkowski sum of a convex polygon and a disc: arcs at the corners joined by offset edges
  function blobPath(g, H, rad) {
    g.beginPath();
    if (H.length === 1) { g.arc(H[0][0], H[0][1], rad, 0, Math.PI * 2); return; }
    if (H.length === 2) { const [a, b] = H, ang = Math.atan2(b[1] - a[1], b[0] - a[0]); g.arc(b[0], b[1], rad, ang - Math.PI / 2, ang + Math.PI / 2); g.arc(a[0], a[1], rad, ang + Math.PI / 2, ang + Math.PI * 1.5); g.closePath(); return; }
    const n = H.length;
    for (let i = 0; i < n; i++) {
      const p0 = H[(i - 1 + n) % n], p1 = H[i], p2 = H[(i + 1) % n];
      const a1 = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) - Math.PI / 2, a2 = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) - Math.PI / 2;
      g.arc(p1[0], p1[1], rad, a1, a2, false);
    }
    g.closePath();
  }
  function drawTerritories(st, scf) {
    drawOwnership(st);
  }
  // each patch of land is held by the nearest camp within reach: neighbours' lands meet at a border and never overlap
  const ownCv = document.createElement('canvas'), octx = ownCv.getContext('2d'); let ownImg = null, ownBuf = null, ownV = null, ownH = null, ownR = null, ownD = null, ownKey = '', ownCam = '', ownMove = 0;
  const hsl2rgb = (h, s, l) => { const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
  // ---- tribal lands grow outward from each people's home over the country itself: they stop at the shore, and rivers and ridges make their edges ----
  let terrOwner = null, terrV = null, terrH = null, terrKey = '', terrVer = 0, terrAt = 0;
  // the claims are kept by the simulation (they grow with a people's numbers and fade when no one walks the land); here they are only read
  function buildTerr() {
    if (!W.claim) SIM.claimsYear(W, true);
    const tribes = W.tribes, n = N * N, key = W.seed + '#' + W.claimVer + '#' + tribes.length;
    if (key === terrKey) return; terrKey = key; terrVer++;
    if (!terrOwner || terrOwner.length !== n) { terrOwner = new Int16Array(n); terrV = new Float32Array(n); terrH = new Float32Array(n); }
    const ix = new Map(); for (let ti = 0; ti < tribes.length; ti++) ix.set(tribes[ti].id, ti);
    const cl = W.claim, cs = W.claimS, hf = W._held;
    for (let i = 0; i < n; i++) { const o = cl[i], ti = o >= 0 ? ix.get(o) : undefined; if (ti == null) { terrOwner[i] = -1; terrV[i] = 0; terrH[i] = 0; } else { terrOwner[i] = ti; terrV[i] = 0.2 + 0.8 * cs[i] / 255; terrH[i] = !hf || hf[i] ? 1 : 0; } }
  }
  function drawOwnership(st) {
    const tnow = performance.now(); if (tnow - terrAt > 400) { terrAt = tnow; buildTerr(); }
    // on a large screen the lands are drawn coarser while the map is being moved, and sharpened when it comes to rest
    const camK = cam.ox + ',' + cam.oy + ',' + cam.s; if (camK !== ownCam) { ownCam = camK; ownMove = tnow; }
    const big = cv.clientWidth > 700, q = big ? (tnow - ownMove < 160 ? 5 : 3) : 2, w = Math.ceil(cv.clientWidth / q), h = Math.ceil(cv.clientHeight / q), tribes = W.tribes;
    if (ownCv.width !== w || ownCv.height !== h || !ownImg) { ownCv.width = w; ownCv.height = h; ownImg = octx.createImageData(w, h); ownBuf = new Int16Array(w * h); ownV = new Float32Array(w * h); ownH = new Float32Array(w * h); ownR = new Uint8Array(w * h); ownD = new Uint8Array(w * h); ownKey = ''; }
    // redrawn only when the view, the selection or the lands themselves change
    const rm = realmMap(tribes);
    const key = [cam.ox, cam.oy, cam.s, st ? st.id : 0, hover && hover.e ? hover.e.id : 0, show.kult, terrVer, baseVer, rm.sig].join();
    if (key !== ownKey && terrOwner) { ownKey = key;
      // the map's wobble is smooth, so it is worked out on a coarse grid and filled in between
      const G = 8, gw = Math.ceil(w / G) + 2, gh = Math.ceil(h / G) + 2, wxg = new Float32Array(gw * gh), wyg = new Float32Array(gw * gh);
      for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) { const [a, b] = toWorld(gx * G * q, gy * G * q); wxg[gy * gw + gx] = a / CELL - 0.5; wyg[gy * gw + gx] = b / CELL - 0.5; }
      const mk = R / (WORLD * cam.s), land = W.land, lake = W.lake;
      for (let y = 0, k = 0; y < h; y++) { const gy = Math.floor(y / G), ty = y / G - gy, my = (y * q - cam.oy) * mk - 0.5, my0 = Math.floor(my), fy1 = my - my0;
        for (let x = 0; x < w; x++, k++) {
          // sea and lake: no colour at all
          const mx = (x * q - cam.ox) * mk - 0.5, mx0 = Math.floor(mx), fx1 = mx - mx0;
          if (mx0 < 0 || my0 < 0 || mx0 >= R - 1 || my0 >= R - 1) { ownBuf[k] = -2; continue; }
          const m = my0 * R + mx0, Lv = (landL[m] * (1 - fx1) + landL[m + 1] * fx1) * (1 - fy1) + (landL[m + R] * (1 - fx1) + landL[m + R + 1] * fx1) * fy1;
          if (Lv < 0.5) { ownBuf[k] = -2; continue; }
          const gx = Math.floor(x / G), tx = x / G - gx, g = gy * gw + gx;
          const fx = (wxg[g] * (1 - tx) + wxg[g + 1] * tx) * (1 - ty) + (wxg[g + gw] * (1 - tx) + wxg[g + gw + 1] * tx) * ty, fy = (wyg[g] * (1 - tx) + wyg[g + 1] * tx) * (1 - ty) + (wyg[g + gw] * (1 - tx) + wyg[g + gw + 1] * tx) * ty;
          const cx = clamp(Math.floor(fx), 0, N - 2), cy = clamp(Math.floor(fy), 0, N - 2), ax = clamp(fx - cx, 0, 1), ay = clamp(fy - cy, 0, 1), c00 = cy * N + cx;
          // which people holds the nearest dry cell, and how firmly, blended over the four cells around this point
          let O = -1, bw = 0, ws = 0;
          for (let n4 = 0; n4 < 4; n4++) { const j = c00 + (n4 & 1) + (n4 >> 1) * N, wgt = ((n4 & 1) ? ax : 1 - ax) * ((n4 >> 1) ? ay : 1 - ay); if (!land[j] || lake[j]) continue; ws += wgt; if (terrOwner[j] >= 0 && wgt > bw) { bw = wgt; O = terrOwner[j]; } }
          if (O < 0 || ws <= 0) { ownBuf[k] = -1; continue; }
          let v = 0, hd = 0; for (let n4 = 0; n4 < 4; n4++) { const j = c00 + (n4 & 1) + (n4 >> 1) * N, wgt = ((n4 & 1) ? ax : 1 - ax) * ((n4 >> 1) ? ay : 1 - ay); if (!land[j] || lake[j]) continue; if (terrOwner[j] === O) { v += wgt * (terrV[j] + 0.06); hd += wgt * terrH[j]; } else v -= wgt * 0.3; }
          v /= ws; if (v <= 0) { ownBuf[k] = -1; continue; }
          ownBuf[k] = O; ownV[k] = v; ownH[k] = hd / ws; } }
      if (rm.sig) realmDist(ownBuf, ownR, ownD, w, h, rm.of);
      const zf = Math.min(1.7, Math.max(1, Math.sqrt(0.0016 / cam.s))), rbw = Math.max(2, Math.round(6 * zf / q)), rgp = Math.max(1, Math.round(2.6 * zf / q)); // the outline is about 6 px at the default zoom and 10 px when the whole isles are in view on a phone (up to 9 px at rest on a large screen); a kingdom's gap grows with it (offsets stay under the 255 limit of ownD: worst case (2*5+2)*10 = 120)
      const fillC = tribes.map(t => hsl2rgb(show.kult && t.kult ? t.kult.hue : t.hue, 0.55, 0.45)), edgeC = tribes.map(t => hsl2rgb(show.kult && t.kult ? t.kult.hue : t.hue, 0.6, 0.28)), a = ownImg.data, hv = hover && hover.e;
      for (let y = 0, k = 0; y < h; y++) for (let x = 0; x < w; x++, k++) {
        const o = ownBuf[k], p = k * 4; if (o < 0) { a[p + 3] = 0; continue; }
        const t = tribes[o], on = t === st; let n, edge = false;
        // a firm line where the land ends against another people or against country nobody holds; none along the shore, which is its own line
        if (x > 0 && (n = ownBuf[k - 1]) !== o && n !== -2) edge = true; else if (x < w - 1 && (n = ownBuf[k + 1]) !== o && n !== -2) edge = true; else if (y > 0 && (n = ownBuf[k - w]) !== o && n !== -2) edge = true; else if (y < h - 1 && (n = ownBuf[k + w]) !== o && n !== -2) edge = true;
        const c = edge ? edgeC[o] : fillC[o], hl = 0.3 + 0.7 * Math.min(1, ownH[k] * 1.4), fa = ((on ? 78 : t === hv ? 58 : show.kult ? 60 : 30) + 40 * Math.max(0, 1 - ownV[k] / 0.3)) * hl, ea = (on ? 240 : 165) * (0.55 + 0.45 * hl); // land still claimed but no longer walked is paler // the wash is strongest just inside the border, as on a tinted map
        a[p] = c[0]; a[p + 1] = c[1]; a[p + 2] = c[2]; a[p + 3] = edge ? ea : fa;
        if (rm.sig && ownR[k]) realmPx(a, p, ownR[k], ownD[k], edge, rm, rbw, rgp);
      }
      octx.putImageData(ownImg, 0, 0);
    }
    ctx.imageSmoothingEnabled = true; ctx.drawImage(ownCv, 0, 0, w * q, h * q);
  }
  // ---- realms: one outline round the outer edge of the union of the member tribes' lands, made from the same raster as the tribal lands ----
  function realmMap(tribes) {
    const of = new Uint8Array(tribes.length), info = [null], ink = [null], wash = [null]; let sig = '';
    if (W.confeds.length) {
      const ix = new Map(); for (let i = 0; i < tribes.length; i++) ix.set(tribes[i].id, i);
      for (const cf of W.confeds) { if (info.length > 250) break; const r = info.length; sig += cf.id + (cf.kingdom ? 'k' : 'c') + cf.hue + ':';
        for (const id of cf.members.keys()) { const i = ix.get(id); if (i != null) { of[i] = r; sig += id + ','; } }
        info.push(cf); ink.push(hsl2rgb(cf.hue, 0.4, 0.13)); wash.push(hsl2rgb(cf.hue, 0.5, 0.5)); sig += ';'; } }
    return { of, info, ink, wash, sig };
  }
  // realm of each pixel, and its distance in tenths of a pixel from the realm's outer edge (10 = the outermost pixel)
  function realmDist(ob, R, D, w, h, of) {
    const n = w * h; for (let k = 0; k < n; k++) { R[k] = ob[k] >= 0 ? of[ob[k]] : 0; D[k] = 255; }
    { const L = 5, fill = []; // small holes of nobody's land inside one realm are not outlined: they count as the realm's
      for (let y = L, k; y < h - L; y++) for (let x = L; x < w - L; x++) { k = y * w + x; if (R[k]) continue; let r = 0, ok = true;
        for (const st of [-1, 1, -w, w]) { let f = 0; for (let j = 1; j <= L; j++) { const v = R[k + st * j]; if (v) { f = v; break; } } if (!f || (r && f !== r)) { ok = false; break; } r = f; }
        if (ok) fill.push(k, r); }
      for (let j = 0; j < fill.length; j += 2) R[fill[j]] = fill[j + 1]; }
    for (let y = 0, k = 0; y < h; y++) for (let x = 0; x < w; x++, k++) { const r = R[k]; if (!r) continue;
      if ((x > 0 && R[k - 1] !== r) || (x < w - 1 && R[k + 1] !== r) || (y > 0 && R[k - w] !== r) || (y < h - 1 && R[k + w] !== r)) D[k] = 10;
      else if ((y > 0 && ((x > 0 && R[k - w - 1] !== r) || (x < w - 1 && R[k - w + 1] !== r))) || (y < h - 1 && ((x > 0 && R[k + w - 1] !== r) || (x < w - 1 && R[k + w + 1] !== r)))) D[k] = 14; }
    for (let y = 0, k = 0; y < h; y++) for (let x = 0; x < w; x++, k++) { const r = R[k]; if (!r || D[k] <= 10) continue; let d = D[k];
      if (x > 0 && R[k - 1] === r && D[k - 1] + 10 < d) d = D[k - 1] + 10; if (y > 0) { if (R[k - w] === r && D[k - w] + 10 < d) d = D[k - w] + 10; if (x > 0 && R[k - w - 1] === r && D[k - w - 1] + 14 < d) d = D[k - w - 1] + 14; if (x < w - 1 && R[k - w + 1] === r && D[k - w + 1] + 14 < d) d = D[k - w + 1] + 14; } D[k] = Math.min(250, d); }
    for (let y = h - 1, k = w * h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--, k--) { const r = R[k]; if (!r || D[k] <= 10) continue; let d = D[k];
      if (x < w - 1 && R[k + 1] === r && D[k + 1] + 10 < d) d = D[k + 1] + 10; if (y < h - 1) { if (R[k + w] === r && D[k + w] + 10 < d) d = D[k + w] + 10; if (x < w - 1 && R[k + w + 1] === r && D[k + w + 1] + 14 < d) d = D[k + w + 1] + 14; if (x > 0 && R[k + w - 1] === r && D[k + w - 1] + 14 < d) d = D[k + w - 1] + 14; } D[k] = Math.min(250, d); }
  }
  // paint one pixel of realm land: a faint wash of the realm's hue, and its inked outline (doubled for a kingdom) just inside the tribal border, with soft edges
  function realmPx(a, p, r, d, edge, rm, bw, gp) {
    const cf = rm.info[r], ink = rm.ink[r], w = rm.wash[r], c1 = (bw * 10 - d) / 10 + 0.5;
    let cv = c1 > 1 ? 1 : c1 < 0 ? 0 : c1;
    if (cf.kingdom) { const c2 = Math.min(d - (bw + gp) * 10, (2 * bw + gp) * 10 - d) / 10 + 0.5; if (c2 > cv) cv = c2 > 1 ? 1 : c2; }
    if (d <= 10 && edge) cv = 0;
    const m = 0.16 * (1 - cv);
    a[p] = (a[p] * (1 - m) + w[0] * m) * (1 - cv) + ink[0] * cv; a[p + 1] = (a[p + 1] * (1 - m) + w[1] * m) * (1 - cv) + ink[1] * cv; a[p + 2] = (a[p + 2] * (1 - m) + w[2] * m) * (1 - cv) + ink[2] * cv;
    a[p + 3] = Math.min(255, (a[p + 3] + 16 * (1 - cv)) * (1 - cv) + 242 * cv);
  }
  function territoryKm2(t) {
    if (t.landC != null) return t.landC * 25;
    const r = FORAGE_R * 0.75, H = hull(t.clans.map(c => [c.x, c.y]));
    let A = 0, P = 0; for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length]; A += a[0] * b[1] - b[0] * a[1]; P += H.length > 1 ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0; }
    return (Math.abs(A) / 2 + (H.length > 2 ? P : H.length === 2 ? P : 0) * r / (H.length === 2 ? 1 : 1) + Math.PI * r * r) / 1e6;
  }

  function drawBg() {
    const ctx = bgx, w = cv.clientWidth, h = cv.clientHeight, zoomed = cam.s * FORAGE_R;
    ctx.fillStyle = '#b4c6c6'; ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(base, cam.ox, cam.oy, WORLD * cam.s, WORLD * cam.s);
    if (detail && cam.s * WORLD / R > 1.15) { const f = cam.s / detail.s * detail.q; ctx.drawImage(detailCv, cam.ox - detail.ox / detail.q * f, cam.oy - detail.oy / detail.q * f, detailCv.width / detail.q * f, detailCv.height / detail.q * f); }
    if (layer === 'terrain' || layer === 'food') drawFieldPatches(ctx, w, h); // fields first, so a river is never hidden by them
    // rivers: smooth curves, batched into a few strokes by width
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const buckets = new Map();
    for (const ch of rivers) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const P = new Array(ch.length);
      for (let m = 0; m < ch.length; m++) { const p = cellS(ch[m]); P[m] = p; if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      if (x1 < -10 || y1 < -10 || x0 > w + 10 || y0 > h + 10) continue;
      for (let m = 0; m < P.length - 1; m++) {
        const lw = Math.round(clamp(Math.sqrt(W.acc[ch[m]]) * cam.s * 105, 0.6, 5.5) * 2) / 2;
        let path = buckets.get(lw); if (!path) { path = new Path2D(); buckets.set(lw, path); }
        const a = m === 0 ? P[0] : [(P[m - 1][0] + P[m][0]) / 2, (P[m - 1][1] + P[m][1]) / 2], end = m === P.length - 2 ? P[m + 1] : [(P[m][0] + P[m + 1][0]) / 2, (P[m][1] + P[m + 1][1]) / 2];
        path.moveTo(a[0], a[1]); if (m === 0) path.lineTo(end[0], end[1]); else path.quadraticCurveTo(P[m][0], P[m][1], end[0], end[1]);
      }
    }
    ctx.strokeStyle = 'rgba(48,66,90,0.92)'; for (const [lw, path] of buckets) { ctx.lineWidth = lw + 1.2; ctx.stroke(path); } // rivers in blue-black ink
    ctx.strokeStyle = 'rgb(150,178,190)'; for (const [lw, path] of buckets) { if (lw < 2) continue; ctx.lineWidth = lw - 0.6; ctx.stroke(path); }
    if (layer === 'terrain' || layer === 'food') drawSymbols(ctx, w, h);
    // roads, paths, tracks and sea lanes, worn in by use
    if (show.roads) { const lv = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], lane = new Path2D(), zs = clamp(zoomed / 8, 0.7, 1.8);
      for (const [k, v] of W.roads) {
        const L = SIM.roadLevel(v); if (!L || (L < 2 && zoomed < LOD_FAR)) continue; // from far out only paths and roads
        const a = Math.floor(k / 40000), b = k % 40000, [x1, y1] = cellS(a), [x2, y2] = cellS(b);
        if ((x1 < -20 && x2 < -20) || (y1 < -20 && y2 < -20) || (x1 > w + 20 && x2 > w + 20) || (y1 > h + 20 && y2 > h + 20)) continue;
        const p = W.land[a] && W.land[b] ? lv[L] : lane; p.moveTo(x1, y1); p.lineTo(x2, y2);
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.setLineDash([2, 4]); ctx.strokeStyle = 'rgba(94,70,36,0.55)'; ctx.lineWidth = 1.1; ctx.stroke(lane);
      ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(120,84,44,0.55)'; ctx.lineWidth = 1 * zs; ctx.stroke(lv[1]); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(132,92,48,0.85)'; ctx.lineWidth = 1.5 * zs; ctx.stroke(lv[2]);
      ctx.strokeStyle = 'rgba(84,58,28,0.95)'; ctx.lineWidth = 3.4 * zs; ctx.stroke(lv[3]); ctx.strokeStyle = 'rgba(214,170,104,0.95)'; ctx.lineWidth = 1.5 * zs; ctx.stroke(lv[3]);
    }
  }
  // is the whole of a patch drawn at (sx, sy), half a width hw and half a height hh, on dry land? (the land mask of the base image)
  function fieldOnLand(sx, sy, hw, hh) {
    const q = R / (WORLD * cam.s);
    for (const [dx, dy] of [[0, 0], [-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]]) { const px = Math.floor((sx + dx - cam.ox) * q), py = Math.floor((sy + dy - cam.oy) * q); if (px < 0 || py < 0 || px >= R || py >= R || landL[py * R + px] < 0.57) return false; }
    return true;
  }
  // fields on the map: patches of ploughed strips and of standing grain in every cleared cell. The list of cleared cells is rebuilt
  // once a year or when fields change; the patches are drawn with the cached background and sit by hash, so they never move or flicker.
  let fieldList = { key: '', cells: [] };
  function fieldCells() {
    const key = (W.farmVer | 0) + ':' + Math.floor(W.week / 52) + ':' + W.seed;
    if (fieldList.key !== key) { const cells = []; for (const i of W.landIdx) if (W.farm[i] > 0.05 && !W.lake[i] && W.elev[i] < 520 && W.slope[i] < 0.08) cells.push(i); fieldList = { key, cells }; }
    return fieldList.cells;
  }
  // the river cells: for each, the cells before and after it along its river, so a field patch can be kept off the water
  let riverNb = null, riverNbSrc = null;
  function riverCellsOf() {
    if (riverNbSrc !== rivers) { riverNb = new Map(); for (const ch of rivers) for (let m = 0; m < ch.length; m++) { let a = riverNb.get(ch[m]); if (!a) riverNb.set(ch[m], a = []); a.push([m ? ch[m - 1] : -1, ch[m], m < ch.length - 1 ? ch[m + 1] : -1]); } riverNbSrc = rivers; }
    return riverNb;
  }
  function drawFieldPatches(ctx, w, h) {
    const cells = fieldCells(); if (!cells.length) return; const rn = riverCellsOf();
    const sp = ART.sprites, px = CELL * cam.s, wpx = clamp(px * 0.8, 8, 26), k0 = wpx / 18, nslot = px < 12 ? 1 : px < 24 ? 2 : px < 40 ? 3 : 4, slots = nslot === 1 ? [[0, 0]] : [[-0.23, -0.2], [0.23, 0.2], [0.24, -0.22], [-0.22, 0.24]];
    for (const i of cells) {
      const [cx, cy] = cellS(i); if (cx < -30 || cy < -30 || cx > w + 30 || cy > h + 30) continue;
      const gx = i % N, gy = (i / N) | 0, p = clamp(W.farm[i] * 2.2, 0.3, 1), regional = hash2(gx >> 1, gy >> 1, 40);
      let rsegs = null; // the stretches of river that pass this cell or its neighbours, as screen lines with their drawn width
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = rn.get(i + dy * N + dx); if (!a) continue; for (const t of a) { const lw = clamp(Math.sqrt(W.acc[t[1]]) * cam.s * 105, 0.6, 5.5), c1 = cellS(t[1]); if (!rsegs) rsegs = []; if (t[0] >= 0) rsegs.push([cellS(t[0]), c1, lw]); if (t[2] >= 0) rsegs.push([c1, cellS(t[2]), lw]); } }
      for (let s = 0; s < nslot; s++) {
        if (s > 0 && hash2(gx, gy, 21 + s) > p) continue;
        const j1 = hash2(gx, gy, 31 + s), j2 = hash2(gx, gy, 51 + s), k = k0 * (0.85 + 0.3 * j2); let sx = cx + (slots[s][0] + (j1 - 0.5) * 0.18) * px, sy = cy + (slots[s][1] + (j2 - 0.5) * 0.18) * px;
        if (!fieldOnLand(sx, sy, 9 * k, 5 * k)) continue;
        if (rsegs) { // a patch never lies over a river: one that would is moved to the bank, or left out if there is no room
          const near = (x, y) => { let bd = 1e9, bx = 0, by = 0; for (const g of rsegs) { const dx = g[1][0] - g[0][0], dy = g[1][1] - g[0][1], l = dx * dx + dy * dy, u = l ? clamp(((x - g[0][0]) * dx + (y - g[0][1]) * dy) / l, 0, 1) : 0, qx = g[0][0] + u * dx, qy = g[0][1] + u * dy, d = Math.hypot(x - qx, y - qy) - g[2] / 2 - 5 * k - 1; if (d < bd) { bd = d; bx = qx; by = qy; } } return [bd, bx, by]; };
          let ok = false; for (let it = 0; it < 3; it++) { const [d, qx, qy] = near(sx, sy); if (d >= 0) { ok = true; break; } const vx = sx - qx, vy = sy - qy, vl = Math.hypot(vx, vy) || 1; sx += (vl > 0.01 ? vx / vl : 1) * (-d + 0.5); sy += (vl > 0.01 ? vy / vl : 0) * (-d + 0.5); }
          if (!ok || Math.hypot(sx - cx, sy - cy) > px * (nslot === 1 ? 1.2 : 0.75) || !fieldOnLand(sx, sy, 9 * k, 5 * k)) continue; }
        ART.stamp(ctx, sp[(regional * 0.6 + hash2(gx, gy, 41 + s) * 0.4) < 0.5 ? 'field' : 'field_g'], sx, sy, k);
      }
    }
  }
  // the furniture of an old map: little trees where woods stand, peaks on the high ground, tufts on the moor, ripples at sea.
  // They sit on a grid fixed to the land, so they do not swim when the map is moved.
  function drawSymbols(ctx, w, h) {
    let step = 1250; while (step * cam.s < 19) step *= 2;
    const k = step * cam.s > 44 ? 2 : 1, x0 = Math.floor(-cam.ox / cam.s / step) - 1, x1 = Math.ceil((w - cam.ox) / cam.s / step) + 1, y0 = Math.floor(-cam.oy / cam.s / step) - 1, y1 = Math.ceil((h - cam.oy) / cam.s / step) + 1, sp = ART.sprites, sb = step / 1250;
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const h1 = hash2(gx * sb, gy * sb, 11), h2 = hash2(gx * sb, gy * sb, 12), h3 = hash2(gx * sb, gy * sb, 13);
      const dx = (gx + 0.15 + 0.7 * h1) * step, dy = (gy + 0.15 + 0.7 * h2) * step; if (dx < 0 || dy < 0 || dx >= WORLD || dy >= WORLD) continue;
      const [wx, wy] = warp(dx, dy), cx = Math.floor(wx / CELL), cy = Math.floor(wy / CELL); if (cx < 0 || cy < 0 || cx >= N || cy >= N) continue;
      const i = cy * N + cx, sx = cam.ox + dx * cam.s, sy = cam.oy + dy * cam.s; let nm = null;
      if (!W.land[i]) { if (h3 < 0.2 && W.seaDist[i] > 1) nm = 'wave'; }
      else if (W.lake[i]) continue;
      else { const e = W.elev[i], sl = W.slope[i], b = W.biome[i], f = W.forest[i];
        const fmv = W.farm[i]; // cleared ground carries no wood; the edge of a clearing thins out instead of ending at a line
        if (fmv > 0.02 && (fmv > 0.1 || hash2(gx * sb, gy * sb, 14) > (0.1 - fmv) / 0.08 * 0.7)) continue;
        if (fmv <= 0.02 && (W.farm[i - 1] > 0.1 || W.farm[i + 1] > 0.1 || W.farm[i - N] > 0.1 || W.farm[i + N] > 0.1) && hash2(gx * sb, gy * sb, 16) < 0.5 && (b === 4 || b === 5 || b === 3)) continue;
        if (e > 800 || (e > 620 && sl > 0.085)) nm = h3 < 0.55 ? 'peak' : 'peak2';
        else if (e > 520 && sl > 0.05) nm = h3 < 0.3 ? 'peak2' : h3 < 0.75 ? 'hill' : null;
        else if (b === 3) nm = h3 < f + 0.25 ? 'pine' : null;
        else if (b === 4) nm = h3 < f + 0.2 ? (h1 < 0.5 ? 'pine' : 'tree') : null;
        else if (b === 5) nm = h3 < f + 0.2 ? 'tree' : null;
        else if (b === 6) nm = h3 < 0.3 ? 'bush' : h3 < 0.5 ? 'tuft' : null;
        else if (b === 7) nm = h3 < 0.55 ? 'tuft' : null;
        else if (b === 8) nm = h3 < 0.55 ? 'reed' : null;
        else if (b === 2) nm = h3 < 0.3 ? 'hill' : h3 < 0.5 ? 'tuft' : null;
        else if (sl > 0.07) nm = 'hill'; }
      if (nm && sp[nm]) ART.stamp(ctx, sp[nm], sx, sy, k);
    }
  }
  // ---- fog of war: the house knows only what its people have seen or heard of ----
  // Unknown country is bare parchment: nothing of the land shows through. The fog is one opaque sheet of paper with the known land
  // let through it (alpha: 1 in unknown country, soft and a little ragged at the edge of the known); it is rebuilt only when the
  // known land grows. Beyond the edge of the world the same paper is laid flat.
  const FR = 480, fogCv = document.createElement('canvas'); fogCv.width = fogCv.height = FR;
  const fctx = fogCv.getContext('2d'); let fogVer = -1, fogImg = null;
  const fogOn = () => { const P = W.player; return !!(P && !P.over && P.known); };
  // is the point on the screen in country the house knows nothing of (or off the edge of the world)?
  const unknownPt = (sx, sy) => { if (!fogOn()) return false; const [x, y] = toWorld(sx, sy); return x < 0 || y < 0 || x >= WORLD || y >= WORLD || !SIM.knows(W, x, y); };
  const PAPER = [241, 231, 198];
  // what does not change with the known land (which cell each pixel looks at, its wobble, its grain) is worked out once
  let fogSD = -1, fogKnown = null, fogC1 = null, fogC2 = null, fogWob = null, fogMot = null;
  function fogStatic() {
    const n = FR * FR, step = WORLD / FR; fogC1 = new Int32Array(n); fogC2 = new Int32Array(n); fogWob = new Float32Array(n); fogMot = new Float32Array(n);
    for (let py = 0; py < FR; py++) for (let px = 0; px < FR; px++) {
      const i = py * FR + px, [x, y] = warp((px + 0.5) * step, (py + 0.5) * step);
      fogC1[i] = clamp(Math.floor(y / CELL), 0, N - 1) * N + clamp(Math.floor(x / CELL), 0, N - 1);
      // the second look is nudged by a slow wobble, so the edge gives way a little here and there, never outward
      fogC2[i] = clamp(Math.floor((y + (vnoise(px / 8, py / 8, 96) - 0.5) * CELL * 0.9) / CELL), 0, N - 1) * N + clamp(Math.floor((x + (vnoise(px / 8, py / 8, 95) - 0.5) * CELL * 0.9) / CELL), 0, N - 1);
      fogWob[i] = (vnoise(px / 7, py / 7, 93) - 0.5) * 0.2;
      fogMot[i] = (vnoise(px / 11, py / 11, 81) - 0.5) * 3.2 + (vnoise(px / 3.5, py / 3.5, 82) - 0.5) * 2.4 + (hash2(px, py, 5) - 0.5) * 2.4; // a slow mottling and a fine grain, a few levels either way
    }
  }
  function buildFog() {
    const P = W.player, k = P.known, a = new Float32Array(FR * FR);
    if (!fogC1 || fogSD !== SD) { fogStatic(); fogSD = SD; }
    for (let i = 0; i < FR * FR; i++) a[i] = k[fogC1[i]] && k[fogC2[i]] ? 0 : 1;
    // the edge is blurred over about a cell: two passes of a five-pixel box (a pixel is 5/12 of a cell)
    const b = new Float32Array(FR * FR), r = 2;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < FR; y++) for (let x = 0; x < FR; x++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < FR) { s += a[y * FR + xx]; n++; } } b[y * FR + x] = s / n; }
      for (let y = 0; y < FR; y++) for (let x = 0; x < FR; x++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < FR) { s += b[yy * FR + x]; n++; } } a[y * FR + x] = s / n; }
    }
    if (!fogImg) fogImg = fctx.createImageData(FR, FR);
    const D = fogImg.data;
    for (let i = 0; i < FR * FR; i++) {
      const wob = fogWob[i], t = clamp((a[i] + wob - 0.1) / 0.35, 0, 1), cover = t * t * (3 - 2 * t); // fully paper from the true edge outward; the known side fades into it
      const m = fogMot[i];
      D[i * 4] = PAPER[0] + m; D[i * 4 + 1] = PAPER[1] + m; D[i * 4 + 2] = PAPER[2] + m * 0.8; D[i * 4 + 3] = Math.round(cover * 255);
    }
    fctx.putImageData(fogImg, 0, 0);
  }
  function drawFog() {
    const P = W.player; if (!P || P.over || !P.known) return;
    if (fogVer !== P.knownVer || fogKnown !== P.known) { buildFog(); fogVer = P.knownVer; fogKnown = P.known; } // a new world or a loaded game has a new set of known cells
    const w = cv.clientWidth, h = cv.clientHeight, x0 = cam.ox, y0 = cam.oy, S = WORLD * cam.s, x1 = x0 + S, y1 = y0 + S;
    ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true; ctx.fillStyle = `rgb(${PAPER[0]},${PAPER[1]},${PAPER[2]})`;
    // beyond the edge of the world: plain paper, the same as the rim of the sheet
    if (y0 > 0) ctx.fillRect(0, 0, w, Math.min(h, y0)); if (y1 < h) ctx.fillRect(0, Math.max(0, y1), w, h - Math.max(0, y1));
    const ya = Math.max(0, y0), yb = Math.min(h, y1);
    if (yb > ya) { if (x0 > 0) ctx.fillRect(0, ya, Math.min(w, x0), yb - ya); if (x1 < w) ctx.fillRect(Math.max(0, x1), ya, w - Math.max(0, x1), yb - ya); }
    ctx.drawImage(fogCv, x0, y0, S, S);
  }
  // ---- wildlife and wild foods: drawn where they really are, thinning out where they are hunted down ----
  const SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif';
  const HERD_BY_BIOME = { 2: ['reindeer'], 3: ['deer', 'reindeer'], 4: ['deer', 'boar', 'hind'], 5: ['boar', 'deer', 'aurochs'], 6: ['aurochs', 'horse', 'hind'], 7: ['horse', 'hind'], 8: ['duck', 'deer'], 9: ['hind'] };
  const GROVE_ICON = [null, 'hazel', 'apple', 'cherry', 'berry'];
  const MON_SPRITE = { 'carved rocks': 'rockart', 'stone circle': 'stones', 'long barrow': 'barrow', 'shrine of the Mother': 'shrine', 'sacred grove': 'grove', 'totem pole': 'pole' };
  let grpOf = new Map(), mkOf = new Map(), crowdOn = false; // per frame, kept out of the world so a save never carries them
  let herdCache = { key: '', list: [] }, foodCache = { key: '', list: [] };
  const blockFor = minPx => { const px = CELL * cam.s; let B = 1; while (B * px < minPx && B < 32) B *= 2; return B; };
  function herds() {
    const B = blockFor(wide() ? 74 : 94), key = B + ':' + Math.floor(W.week / 520) + ':' + W.seed + ':' + (W.farmVer | 0); // herds are marked where the game is; the marks are redrawn once in ten years
    if (herdCache.key === key) return herdCache.list;
    const list = [], ppl = new Float32Array(N * N), nearP = new Uint8Array(N * N);
    for (const c of W.clans) { if (!c.alive || !c.people.length) continue; const cx = clamp(Math.floor(c.x / CELL), 0, N - 1), cy = clamp(Math.floor(c.y / CELL), 0, N - 1), r = c.settled ? 3 : 2; ppl[cy * N + cx] += c.people.length * (c.settled ? 1.5 : 1);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < N && y < N) nearP[y * N + x] = 1; } }
    for (let by = 0; by < N; by += B) for (let bx = 0; bx < N; bx += B) {
      let best = -1, bg = 0, sum = 0, n = 0, sea = -1, sf = 0, sl = -1, sv = 0, lk = -1, folk = 0;
      for (let y = by; y < Math.min(N, by + B); y++) for (let x = bx; x < Math.min(N, bx + B); x++) {
        const i = y * N + x; folk += ppl[i];
        if (W.lake[i]) { if (lk < 0 || hash2(x, y, 4) > 0.8) lk = i; }
        else if (W.land[i]) { if (W.farm[i] > 0.02) continue; sum += W.game[i]; n++; const g = nearP[i] ? 0 : W.game[i] * (0.6 + 0.8 * hash2(x, y, 5)); if (g > bg) { bg = g; best = i; } if (W.sealK[i] > 0) { const v = W.seal[i] / W.sealK[i]; if (v > sv) { sv = v; sl = i; } } }
        else if (W.shelf[i]) { const f = W.fish[i] * (0.6 + 0.8 * hash2(x, y, 6)); if (f > sf) { sf = f; sea = i; } }
      }
      const h = hash2(bx, by, 11);
      if (best >= 0 && n >= B * B * 0.12) { const avg = sum / n, crowd = folk / n, cnt = (avg > 15 ? 3 : avg > 8 ? 2 : avg > 3 ? 1 : 0) - (crowd > 1.2 ? 2 : crowd > 0.4 ? 1 : 0) - (crowd > 0.15 && h < 0.35 ? 1 : 0); if (cnt > 0) { const o = HERD_BY_BIOME[W.biome[best]] || ['hind']; list.push({ i: best, sp: o[Math.floor(hash2(bx, by, 9) * o.length)], cnt, h }); } }
      if (sea >= 0 && sf > 380000 && h > 0.4) list.push({ i: sea, sp: 'shoal', cnt: 1, h, sea: true });
      if (sl >= 0 && sv > 0.35 && h > 0.3) list.push({ i: sl, sp: 'sealion', cnt: 1, h });
      if (lk >= 0 && h > 0.45) list.push({ i: lk, sp: 'duck', cnt: 1, h });
    }
    herdCache = { key, list }; return list;
  }
  function wildFoods() {
    const B = blockFor(layer === 'food' ? 64 : 104), key = B + ':' + W.seed + ':' + Math.floor(W.week / 52) + layer;
    if (foodCache.key === key) return foodCache.list;
    const list = [];
    for (let by = 0; by < N; by += B) for (let bx = 0; bx < N; bx += B) {
      let gv = 0, gi = -1, sv = 0, si = -1;
      for (let y = by; y < Math.min(N, by + B); y++) for (let x = bx; x < Math.min(N, bx + B); x++) {
        const i = y * N + x; if (!W.land[i]) continue;
        if (W.groveType[i] && W.grove[i] > gv) { gv = W.grove[i]; gi = i; }
        if (W.shellK[i] > 0 && W.shell[i] > sv) { sv = W.shell[i]; si = i; }
      }
      if (gi >= 0 && gv > 0.1) list.push({ i: gi, ic: GROVE_ICON[W.groveType[gi]] });
      if (si >= 0 && sv > 1.2e6) list.push({ i: si, ic: 'shell' });
    }
    foodCache = { key, list }; return list;
  }
  const VCACHE = new WeakMap(), VC = S => { let o = VCACHE.get(S); if (!o) VCACHE.set(S, o = {}); return o; }; // drawing caches kept beside each village, never in the village itself, so a save never carries them
  function draw() {
    const w = cv.clientWidth, h = cv.clientHeight, zoomed = cam.s * FORAGE_R;
    const key = `${cam.s},${cam.ox},${cam.oy},${baseVer},${detailVer},${layer},${w},${h},${W.roadsVer},${show.roads},${W.farmVer | 0}`;
    if (key !== bgKey) { drawBg(); bgKey = key; }
    ctx.clearRect(0, 0, w, h);
    const st = selTribe(), sc = selClan(), scf = sel && sel.kind === 'confed' ? sel : st && st.confed;
    const P = W.player, pc = P && !P.over && P.head.alive ? P.head.clan : null, now = performance.now();
    const icons = [], on = (x, y, m = 30) => x > -m && y > -m && x < w + m && y < h + m;
    const sites = [], mons = [], vills = [], camps = [];
    // less detail the farther out: with more than 25 camps and villages in view, the whole-isles view shows one mark for each people,
    // and the middle view joins the camps of one people that stand close together. The 'Every camp' switch turns it all off.
    // only camps the player knows and can see count (not the fog, not what lies under the sheet); it turns on above 25 and off again at 20 or fewer, so a drag does not make the map flip
    let nOn = 0, nV = 0; const VR0 = viewRect(); if (!show.every && zoomed < LOD_MID) for (const c of W.clans) if (c.people.length && SIM.knows(W, c.x, c.y)) { const [x, y] = cs(c); if (x >= VR0.x0 && x <= VR0.x1 && y >= VR0.y0 && y <= VR0.y1) nOn++; }
    if (!show.every && zoomed < LOD_FAR) for (const S of W.settlements || []) { if (!S.clans || !S.clans.length || !SIM.knows(W, S.clans[0].x, S.clans[0].y)) continue; const [x, y] = cs(S.clans[0]); if (x >= VR0.x0 && x <= VR0.x1 && y >= VR0.y0 && y <= VR0.y1) nV++; } // many known villages at the whole-isles view are joined too
    crowdOn = !show.every && zoomed < LOD_MID && (nOn > 25 || (crowdOn && nOn > 20) || (zoomed < LOD_FAR && (nV >= 8 || (crowdOn && nV >= 6))));
    const crowd = crowdOn, far = crowd && zoomed < LOD_FAR, mid = crowd && !far, marks = [], tmk = new Map(), tseen = new Map(); mkOf = tmk; grpOf = new Map();
    const hovE = hover && hover.e, own = c => c === sc || c === pc || c === hovE, seenAdd = (t, x, y, r) => { let a = tseen.get(t); if (!a) tseen.set(t, a = []); a.push([x, y, r]); }; // the marks drawn and seen of each people: its names are written beside these
    try {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (selCell != null) { const [x, y] = cellS(selCell); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, Math.max(5, cam.s * CELL * 0.55), 0, Math.PI * 2); ctx.stroke(); }
    // herds, shoals and seals
    if ((show.wild && !far) || layer === 'game') {
      const ah = clamp(12 + zoomed * 0.75, 15, 26), t = now / 1000;
      for (const hd of herds()) {
        if (mid && layer !== 'game' && hd.cnt < 2 && hd.h < 0.6) continue; // the middle view keeps only the larger herds
        let [x, y] = cellS(hd.i); if (!on(x, y)) continue;
        const drift = hd.sea ? 5 : 2.4;
        const nm = 'a_' + hd.sp + (hd.h > 0.5 ? '_l' : '');
        for (let k = hd.cnt - 1; k >= 0; k--) ART.put(ctx, nm, x + (k === 0 ? 0 : (k === 1 ? -0.95 : 0.9) * ah), y + (k === 0 ? 0 : (k === 1 ? -0.4 : -0.3) * ah), ah * (k ? 0.84 : 1));
      }
    }
    // the peoples' lands
    // villages: where they lie and how big; the trodden ground, ditch and palisade go under the land tint, the houses over it
    const seaDir = S => { // which way the nearest sea lies from a village (a unit vector) and how far, found once and kept
      let wx = 0, wy = 0; for (const c of S.clans) { wx += c.x; wy += c.y; } wx /= S.clans.length; wy /= S.clans.length;
      if (VC(S).sea && Math.hypot(VC(S).sea.x - wx, VC(S).sea.y - wy) < CELL) return VC(S).sea.d;
      let best = 99, vx = 0, vy = 0; const found = [];
      for (let q = 0; q < 16; q++) { const a = q / 16 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); for (let d = 0.5; d <= 8; d += 0.5) { const i = SIM.cellAt(wx + ca * d * CELL, wy + sa * d * CELL); if (i == null || !W.land[i]) { found.push([ca, sa, d]); if (d < best) best = d; break; } } }
      for (const [ca, sa, d] of found) if (d <= best + 1) { vx += ca; vy += sa; }
      const m = Math.hypot(vx, vy); VC(S).sea = { x: wx, y: wy, d: m > 0.01 ? [vx / m, vy / m] : null, near: best }; return VC(S).sea.d; };
    const NR = 40, C72 = [], S72 = [], A40 = [], C40 = [], S40 = []; for (let k = 0; k < 24; k++) for (const o of [-0.3, 0, 0.3]) { const a = (k + 0.5 + o) / 24 * Math.PI * 2; C72.push(Math.cos(a)); S72.push(Math.sin(a)); } for (let i = 0; i < NR; i++) { const a = i / NR * Math.PI * 2; A40.push(a); C40.push(Math.cos(a)); S40.push(Math.sin(a)); } const SI40 = [], ST40 = []; for (let i = 0; i < NR; i++) { const u = A40[i] / (Math.PI / 12) - 0.5, f = Math.floor(u); SI40.push(((f % 24) + 24) % 24); ST40.push(u - f); }
    const ONES = Array(24).fill(1), SHN = 48, shoreProf = (S, ux, uy, capM) => { // how far the dry land runs from a village, along 48 rays, in the map's own world units (metres), stepping a cell (then half a cell at the shore) through the same warp the roads use. Found once and kept: nothing in the key changes with zoom or pan
      const h = CELL * 0.5; capM = Math.ceil(capM / h) * h; const kx = Math.round(ux / 500), ky = Math.round(uy / 500), kn = S.clans.length, o = VC(S).shp; if (o && o.kx === kx && o.ky === ky && o.kn === kn && o.kc === capM) return o;
      const p = new Float64Array(SHN);
      for (let r = 0; r < SHN; r++) { const dq = r * 4 / SHN, q = Math.floor(dq), f = dq - q, vx = [1 - f, -f, f - 1, f][q], vy = [f, 1 - f, -f, f - 1][q], vl = Math.hypot(vx, vy), ca = vx / vl, sa = vy / vl; let last = 0, wet = false;
        const dry = d => { const [wx, wy] = warp(ux + ca * d, uy + sa * d), i = SIM.cellAt(wx, wy); return i != null && !!W.land[i]; };
        for (let d = h; d <= capM; d += CELL) { if (dry(d)) { last = d; continue; } wet = true; if (d - h > last && dry(d - h)) last = d - h; break; } // a step of a cell, then half a cell back at the first sea
        p[r] = wet ? last + CELL * 0.25 : capM * 3; }
      return VC(S).shp = { kx, ky, kn, kc: capM, p, min: Math.min(...p) }; };
    const shoreAt = (p, x, y) => { const m = Math.abs(x) + Math.abs(y); if (m === 0) return p[0]; const q = y / m, d = y >= 0 ? (x >= 0 ? q : 2 - q) : (x < 0 ? 2 - q : 4 + q), u = d * (SHN / 4), i = u | 0, t = u - i, a = p[i >= SHN ? 0 : i], b = p[i + 1 >= SHN ? 0 : i + 1]; return a + (b - a) * t; }; // the dry distance (m) in the direction (x, y); the rays are spaced evenly in the 'diamond angle' (y/(|x|+|y|) round the four quadrants), which needs no trig
    const vl = [], vring = (t, V, which) => { const o = V[which]; for (let i = 0; i < NR; i++) i ? t.lineTo(V.cx + o[2 * i], V.cy + o[2 * i + 1]) : t.moveTo(V.cx + o[0], V.cy + o[1]); t.closePath(); }, vpoly = (sx, sy, rx, ry, hsh, t) => { if (!t) { t = ctx; ctx.beginPath(); } for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = 0.9 + 0.16 * (((hsh >> (k * 3)) & 7) / 7); k ? t.lineTo(sx + Math.cos(a) * rx * rr, sy + Math.sin(a) * ry * rr) : t.moveTo(sx + Math.cos(a) * rx * rr, sy + Math.sin(a) * ry * rr); } t.closePath(); };
    const TAUa = Math.PI * 2, angN = a => ((a % TAUa) + TAUa) % TAUa, roadNb = { W: null, ver: -1, m: null };
    const roadIndex = () => { if (roadNb.W !== W || roadNb.ver !== W.roadsVer) { const m = new Map(), put = (a, b, L, v) => { let o = m.get(a); if (!o) m.set(a, o = []); o.push([b, L, v]); }; for (const [k, v] of W.roads) { const L = SIM.roadLevel(v); if (!L) continue; const a = Math.floor(k / 40000), b = k % 40000; if (!W.land[a] || !W.land[b]) continue; put(a, b, L, v); put(b, a, L, v); } roadNb.W = W; roadNb.ver = W.roadsVer; roadNb.m = m; } return roadNb.m; }; // cell -> the road stretches that leave it (land only), built once for each change of the roads
    const scAt = (arr, a, plain) => { const u = angN(a) / (Math.PI / 12) - 0.5, i = Math.floor(u), t = u - i, p = arr[(i + 24) % 24], q = arr[(i + 25) % 24]; return plain ? p + (q - p) * t : p > 0 && q > 0 ? p + (q - p) * t : p > 0 ? p : q > 0 ? q : 1; }; // the scale (share of the ring that stands on dry ground) in the direction a, smoothed between sector centres; where no sector stands, 1
    const gateOk = V => { const w = (V.gp + 2) * V.da; for (let q = -2; q <= 2; q++) if (!V.s1[Math.floor(angN(V.ga + q * w / 2) / (Math.PI / 12)) % 24]) return false; return true; }; // a gate stands only where the wall on both sides of it stands
    const cutArc = (A, B, ga, w) => { let out = [[A, B]]; for (const s of [-TAUa, 0, TAUa]) { const g0 = ga + s - w, g1 = ga + s + w, nx = []; for (const [a, b] of out) { if (g1 <= a || g0 >= b) nx.push([a, b]); else { if (g0 > a) nx.push([a, g0]); if (g1 < b) nx.push([g1, b]); } } out = nx; } return out; }; // the arc A..B without the stretch ga +- w (angles in 0..TAU, the stretch may wrap)
    const palSplit = (V, A, B) => { // the front arc A..B as stretches on whole posts: mid = the wall is pulled in by the shore there (drawn behind the houses), else drawn over their feet as ever
      if (V.inl) return [[A, B, false]]; const out = [], da = V.da, ga = V.ga; let u = A, j = Math.ceil((A - ga) / da + 1e-6);
      while (u < B - 1e-9) { let w = ga + j * da; if (w <= u + 1e-9) { j++; continue; } if (w > B) w = B; const m = scAt(V.s1, (u + w) / 2) < 0.999, l = out[out.length - 1]; if (l && l[2] === m) l[1] = w; else out.push([u, w, m]); u = w; j++; }
      return out; };
    // where the houses of a village stand (one layout rule, small hash jitter), and the size of the ring of posts and the ditch outside them
    const vlayout = (S, sx, sy, R2, hsh, hall, pal, ditch, zoomed) => {
      const sp = ART.sprites, fishing = S.type === 'fishing', mixed = S.type === 'mixed', TAU = Math.PI * 2;
      const jit = i => (((Math.imul(hsh ^ (i * 40503), 2654435761) >>> 9) & 255) / 255) - 0.5;
      const kz = zoomed < 16 ? 0.55 + 0.45 * zoomed / 16 : 1 + (zoomed - 16) / 62, k = clamp(Math.min(kz, Math.max(0.7, R2 / 10)) * (R2 < 14 ? Math.max(0.75, R2 / 14) : 1), 0.7, 1.6);
      const sea = fishing || mixed ? seaDir(S) : null, sa = sea ? Math.atan2(sea[1], sea[0]) : 0, flip = sea && sea[0] < 0 ? '_l' : '';
      const houseK = i => jit(i + 20) > -0.12 ? 'vhouse' : 'vlong';
      const cap = R2 < 10 ? 3 : zoomed < 20 ? 4 : zoomed < 28 ? 5 : 7, nh = Math.min(clamp(Math.round(S.pop / 18), 3, 7), cap), hp = [], lane = (hsh & 1) && !hall && !sea, hallW = hall ? sp.vhall._lw * k * 1.25 : 0, wk = 12 * k;
      const nf = fishing ? nh : mixed ? Math.ceil(nh / 2) : 0; // huts on the shore side; the rest are houses
      if (lane) { const ang = ((hsh >> 4) & 7) / 7 * 0.5 - 0.25, per = Math.ceil(nh / 2), step = Math.max(wk * 1.05, Math.min(R2 * 1.5 / per, wk * 1.6)), gapy = Math.max(wk * 0.5, R2 * 0.3);
        for (let i = 0; i < nh; i++) { const row = i % 2 ? 1 : -1, j = (i >> 1) - (per - 1) / 2, u = j * step + jit(i) * 2 * k, v = row * gapy + jit(i + 9) * 2 * k; hp.push([sx + u * Math.cos(ang) - v * Math.sin(ang), sy + (u * Math.sin(ang) + v * Math.cos(ang)) * 0.85, houseK(i)]); } }
      else { const rr = Math.max(R2 * 0.62, wk * 0.5, hallW * 0.5 + wk * 0.45), a0 = (hsh & 15) * 0.4;
        for (let i = 0; i < nh; i++) {
          let a = a0 + i / nh * TAU + jit(i) * 0.25, nm = houseK(i);
          if (sea && i < nf) { const spread = Math.min(2.4, 0.55 * nf + 0.5); a = sa + (nf > 1 ? (i / (nf - 1) - 0.5) * spread : 0) + jit(i) * 0.15; nm = 'vhut' + flip; }
          else if (sea) { const m = nh - nf; a = sa + Math.PI + (m > 1 ? ((i - nf) / (m - 1) - 0.5) * 1.8 : 0) + jit(i) * 0.15; }
          const arc = sea && i < nf ? Math.min(Math.max(rr, nf * wk * 0.85 / Math.min(2.4, 0.55 * nf + 0.5)), R2 * 0.85) : rr, r = Math.min(arc * (1 + jit(i + 9) * 0.22), sea && i < nf ? R2 * 0.85 : R2 * 1.1); hp.push([sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.7, nm]); } }
      if (hall) hp.push([sx, sy - wk * 0.1, 'vhall']);
      const fp = hp.map(([hx, hy, nm]) => { const s = sp[nm], kk = nm === 'vhall' ? k * 1.25 : k; return [hx, hy, s._lw * kk, s._lh * kk]; });
      const pP = pal ? clamp(5 * k, 2.8, 9) : 0; // the front posts' height: the footprint box takes it, so the front wall stands clear of the front houses
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [hx, hy, w, h] of fp) { x0 = Math.min(x0, hx - w / 2); x1 = Math.max(x1, hx + w / 2); y0 = Math.min(y0, hy - h * 0.2); y1 = Math.max(y1, hy + h * 0.42 + pP); }
      let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; { const sh = Math.hypot(cx - sx, cy - sy), mx = R2 * 0.5; if (sh > mx) { cx = sx + (cx - sx) * mx / sh; cy = sy + (cy - sy) * mx / sh; } } // the drawing centre: the middle of the houses' footprints (a little off the village point at most), so the ring hugs them
      let fx = 0, fyu = 0, fyd = 0, bot = cy + R2 * 0.8 * 0.7, mg = 2.5 * k; for (const [hx, hy, w, h] of fp) { fx = Math.max(fx, Math.abs(hx - cx) + w / 2); fyu = Math.max(fyu, cy - hy + h * 0.2); fyd = Math.max(fyd, hy + h * 0.42 + pP - cy); bot = Math.max(bot, hy + h * 0.5); } // the farthest footprint across, up and down: the ring is fitted to it
      let rx = Math.max(fx + mg, R2 * 0.6, 14 * k), ry = Math.max(fyu, fyd) + mg; if (ry < rx * 0.45) ry = rx * 0.45; else if (ry > rx * 0.9) rx = ry / 0.9;
      { let sc = 1; for (const [hx, hy, w, h] of fp) { const ax = Math.abs(hx - cx), bx = ax + w * 0.3, by = cy - hy + h * 0.2, fxc = ax + w / 2, fyc = hy + h * 0.42 + pP - cy; sc = Math.max(sc, Math.hypot(bx / rx, by / ry), Math.hypot(fxc / rx, fyc / ry)); } sc = Math.min(sc, 1.3); rx *= sc; ry *= sc; } // no house corner left outside the ring
      let lg; { // the figures names were always placed by (the box of a village, where its name goes): kept as they were before the wall was fitted, so no name moves for it
        let mx0 = 0, my0 = 0, lx0 = 1e9, lx1 = -1e9, ly0 = 1e9, ly1 = -1e9; for (const [hx, hy] of hp) { mx0 += hx; my0 += hy; lx0 = Math.min(lx0, hx); lx1 = Math.max(lx1, hx); ly0 = Math.min(ly0, hy); ly1 = Math.max(ly1, hy); }
        let lcx = mx0 / hp.length * 0.75 + (lx0 + lx1) / 2 * 0.25, lcy = my0 / hp.length * 0.75 + (ly0 + ly1) / 2 * 0.25; { const sh = Math.hypot(lcx - sx, lcy - sy), mx = R2 * 0.35; if (sh > mx) { lcx = sx + (lcx - sx) * mx / sh; lcy = sy + (lcy - sy) * mx / sh; } }
        let ext = 0, lbot = lcy + R2 * 0.8 * 0.7; for (const [hx, hy, w, h] of fp) { ext = Math.max(ext, Math.hypot(hx - lcx, (hy + h * 0.42 - lcy) / 0.7) + w * 0.3); lbot = Math.max(lbot, hy + h * 0.5); }
        lg = { cx: lcx, cy: lcy, rp: Math.min(Math.max(R2 * 0.75, ext * 1.12 + 1.5), R2 * 1.4), bot: lbot }; }
      // the shore: a canoe drawn only where the water is at hand (never a canoe left on dry land)
      if (sea && VC(S).sea && VC(S).sea.near * CELL * cam.s < R2 * 1.7 + 6) { const r = (VC(S).sea.near - 0.35) * CELL * cam.s; if (r > R2 * 0.3) { const cy = sy + sea[1] * r; hp.push([sx + sea[0] * r, cy, 'vcanoe' + flip]); bot = Math.max(bot, cy + 3); lg.bot = Math.max(lg.bot, cy + 3); } }
      // lg keeps the pre-fit centre, radius and bottom on purpose: the placed box and the name spots are tuned on them, and fitted figures moved village names
      let ux = 0, uy = 0; for (const c of S.clans) { if (c.ux != null) { ux += c.ux; uy += c.uy; } else { const q = unwarp(c.x, c.y); ux += q[0]; uy += q[1]; } } ux /= S.clans.length; uy /= S.clans.length;
      const fit = zoomed >= 5.3, shpo = fit ? shoreProf(S, ux, uy, 1.5 * (1.7 * Math.min(42, Math.sqrt(S.pop) * 1.34) + 8) / 5.3e-4) : { p: null, min: Infinity }, shp = shpo.p, shs = cam.s * 0.97, smin = shpo.min * shs, shpx = fit ? (x, y) => shoreAt(shp, x, y) * shs : () => Infinity; // the shore profile, as screen px at this zoom
      const sectors = (rrx, rry, lo, ring) => { const ox = cx - sx, oy = cy - sy; if (Math.hypot(ox, oy) + Math.max(rrx, rry) <= smin) return ONES; // a ring that lies wholly inside the nearest shore needs no more tests
        const cs_ = VC(S).shc || (VC(S).shc = {}), hc = CELL * 0.5, iw = 1 / cam.s, rw = rrx * iw, rh = rry * iw, qx = ox * iw, qy = oy * iw, hit = cs_[ring]; if (hit && hit.pr === shpo && hit.lo === lo && Math.abs(rw / hit.rw - 1) < 0.05 && Math.abs(rh / hit.rh - 1) < 0.05 && Math.abs(qx - hit.qx) < hc && Math.abs(qy - hit.qy) < hc) return hit.v; // the ring's shape in world units holds (size to 5%, centre to half a cell): the shares hold, no shore work
        const v = [], fsolve = (ex, ey, D) => { const a = ex * ex + ey * ey, c = ox * ox + oy * oy - D * D; if (c > 0) return 0; const b = ox * ex + oy * ey, d = b * b - a * c; return d < 0 ? 0 : Math.min(1, Math.max(0, (Math.sqrt(d) - b) / a)); }; // the share f of the ray offset E at which |O + f E| meets the shore at distance D
        for (let k = 0; k < 24; k++) { let m = 1; for (let o = 0; o < 3 && m > 0; o++) { const ex = C72[k * 3 + o] * rrx, ey = S72[k * 3 + o] * rry, px = ox + ex, py = oy + ey, D = shpx(px, py); if (px * px + py * py <= D * D) continue; let f = fsolve(ex, ey, D); if (f > 0) f = fsolve(ex, ey, shpx(ox + f * ex, oy + f * ey)); m = Math.min(m, f, 0.999); } if (m < 1) { const dry = f => { for (let o = 0; o < 3; o++) { const px = ox + C72[k * 3 + o] * rrx * f, py = oy + S72[k * 3 + o] * rry * f, D = shpx(px, py); if (px * px + py * py > D * D) return false; } return true; }; // the quick share is checked against the shore line itself; where the shore is too ragged for it, the share is found by bisection as it always was
          if (m >= lo && !(dry(lo) && dry(m))) { m = lo; if (dry(lo)) { let a = lo, b = 1; for (let i = 0; i < (lo < 0.5 ? 4 : 5); i++) { const c = (a + b) / 2; if (dry(c)) a = c; else b = c; } m = a; } } else if (m < lo) m = 0; } v.push(m >= 1 ? 1 : m >= lo ? m : lo < 0.5 ? lo : 0); }
        cs_[ring] = { pr: shpo, lo, rw, rh, qx, qy, v }; return v; }; // for each of 24 sectors the largest share (1 down to lo) of the ellipse that is dry along its ray, 0 where none: the least of 3 rays, each solved against the shore line twice (no bisection), and kept while the ring's world shape holds
      const V = { k, hp, jit, sea, bot, cx, cy, ph: 0, rx, ry, lg }; const s2 = sectors(rx, ry, 0.2, 'w'); V.s1 = new Array(24); V.inl = true; for (let q = 0; q < 24; q++) { const x = s2[q]; V.s1[q] = x >= 0.5 - 1e-9 ? x : 0; if (x !== 1) V.inl = false; } if (!V.inl) { const kn = []; for (let m = 0; m < 10; m++) kn.push(0.9 + 0.16 * (((hsh >> ((m % 9) * 3)) & 7) / 7)); const sc40 = []; for (let i = 0; i < NR; i++) { const p = s2[SI40[i]], q = s2[(SI40[i] + 1) % 24]; sc40.push(p + (q - p) * ST40[i]); } const mk = (mult, jt) => { const o = []; for (let i = 0; i < NR; i++) { const s = sc40[i], u = i * 9 / NR, m = Math.floor(u), j = jt ? kn[m] + (kn[m + 1] - kn[m]) * (u - m) : 1, bl = clamp((s - 0.9) / 0.1, 0, 1), r = s * Math.min(j, 1) * (1 - bl) + mult * j * bl; o.push(C40[i] * rx * r, S40[i] * ry * r); } return o; }; V.rt = mk(1, true); V.re = mk(1.1, false); } // the trodden ground and its edge, as offsets from the drawing centre
      if (pal) { // the ring of posts: tips every 2.3 k px
        const per = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))), n = clamp(Math.round(per * 0.86 / (2.6 * k)), 18, 150), da = TAU / n;
        V.ph = clamp(5 * k, 2.8, 9); V.n = n; V.da = da;  bot = Math.max(bot, cy + ry + 0.5); }
      if (pal || ditch) { // the gate faces the way out: toward the strongest road that leaves the village, else the land side, else the front
        let wx = 0, wy = 0, vsx = 0, vsy = 0; for (const c of S.clans) { wx += c.x; wy += c.y; } wx /= S.clans.length; wy /= S.clans.length;
        const par = (dx, dy) => angN(Math.atan2(dy / ry, dx / rx)), nrm = a => { const nx = Math.cos(a) / rx, ny = Math.sin(a) / ry, nl = Math.hypot(nx, ny) || 1; return [nx / nl, ny / nl]; };
        const dry = a => { if (!V.s1) return true; const q = Math.floor(angN(a) / (TAU / 24)); return !!(V.s1[(q + 23) % 24] && V.s1[q % 24] && V.s1[(q + 1) % 24]); };
        let pick = null, sd = null; const c0i = SIM.cellAt(wx, wy), gkx = Math.round(Math.log(rx) * 1.5), gky = Math.round(Math.log(ry) * 1.5), gc = VC(S).gc; // the way out is kept while the roads and the ring's size (to about 90%) hold, as long as it still stands on dry ground
        if (gc && gc.rv === W.roadsVer && gc.c === c0i && gc.kx === gkx && gc.ky === gky && dry(gc.sd.a)) sd = gc.sd;
        if (!sd) { for (const c of S.clans) { const p = cs(c); vsx += p[0]; vsy += p[1]; } vsx /= S.clans.length; vsy /= S.clans.length; }
        const nb = sd ? null : roadIndex();
        if (!sd && c0i != null && nb.size) { const m = Math.min(8, Math.ceil(rx * 1.3 / (CELL * cam.s)) + 1), mj = Math.min(8, Math.ceil(ry * 1.3 / (CELL * cam.s)) + 1), ci = c0i % N, cj = (c0i / N) | 0, cand = [], inside = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;
          for (let dj = -mj; dj <= mj; dj++) for (let di = -m; di <= m; di++) { const x = ci + di, y = cj + dj; if (x < 0 || y < 0 || x >= N || y >= N) continue; const i = y * N + x, es = nb.get(i); if (!es) continue; const [ax, ay] = cellS(i);
            for (const [j, L, v] of es) { const [bx, by] = cellS(j); if (Math.max(ax, bx) - vsx < cx - rx || Math.min(ax, bx) - vsx > cx + rx || Math.max(ay, by) - vsy < cy - ry || Math.min(ay, by) - vsy > cy + ry) continue; const dl = Math.hypot(bx - ax, by - ay) || 1; let was = inside(ax - vsx, ay - vsy);
              for (let q = 1; q <= 12; q++) { const px = ax + (bx - ax) * q / 12 - vsx, py = ay + (by - ay) * q / 12 - vsy, now = inside(px, py); if (was && !now) { cand.push([L * 1000 + Math.min(v, 999), par(px - cx, py - cy), [(bx - ax) / dl, (by - ay) / dl], L]); break; } was = now; } } }
          cand.sort((p, q) => q[0] - p[0]); for (const c of cand) if (dry(c[1])) { pick = c; break; } }
        if (sd) { } else if (pick) sd = { a: pick[1], d: pick[2], L: pick[3] };
        else { const sv = seaDir(S), vs = VC(S).sea; if (sv && vs && vs.near <= 3) { const a0 = Math.atan2(-sv[1], -sv[0]); for (const o of [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4]) { const a = par(Math.cos(a0 + o), Math.sin(a0 + o)); if (dry(a)) { sd = { a, d: nrm(a), L: 0 }; break; } } }
          if (!sd) sd = { a: Math.PI / 2, d: nrm(Math.PI / 2), L: 0 }; }
        VC(S).gc = { rv: W.roadsVer, c: c0i, kx: gkx, ky: gky, sd };
        V.ga = sd.a; V.gv = sd.L; let gd = sd.d; { const nn = nrm(V.ga), dn = gd[0] * nn[0] + gd[1] * nn[1]; if (dn < 0.3) { const bx = gd[0] + nn[0] * 0.7, by = gd[1] + nn[1] * 0.7, bl = Math.hypot(bx, by); gd = [bx / bl, by / bl]; } } V.gu = gd; }
      if (pal) { const sp = Math.hypot(rx * Math.sin(V.ga), ry * Math.cos(V.ga)), da = V.da; V.gp = Math.max(1, Math.round(Math.max(4.2 * k, 3.4) / (sp * da))); while (V.gp < 3 && 2 * V.gp * sp * da < 6) V.gp++; V.gp = Math.min(V.gp, Math.max(1, Math.floor(Math.PI * 0.3 / da) - 2)); }
      if (pal) { lg.bot = Math.max(lg.bot, lg.cy + lg.rp * 0.7 + 0.5); V.gok = gateOk(V); }
      if (ditch) { const dw = clamp(2.2 + 0.9 * k, 2.5, 3.5); V.dw = dw; const off = 3.4 + dw / 2 + 1.2 * k; V.rd = rx + off / 0.7; V.rdy = ry + off; bot = Math.max(bot, cy + V.rdy + dw / 2); lg.bot = Math.max(lg.bot, lg.cy + (lg.rp + off / 0.7) * 0.7 + dw / 2); }
      if (pal) { // the trodden way out of the gate, along the gate's direction (the road's, where a road leaves): out past the ditch, cut short where the sea is
        const ca = Math.cos(V.ga), sa2 = Math.sin(V.ga), gs = scAt(V.s1, V.ga), gx0 = cx + ca * rx * gs, gy0 = cy + sa2 * ry * gs, gd = V.gu, nn = [ca / rx, sa2 / ry], nl = Math.hypot(nn[0], nn[1]) || 1, dn = Math.max(0.5, (gd[0] * nn[0] + gd[1] * nn[1]) / nl), off = ditch ? 3.4 + V.dw / 2 + 1.2 * k : 3;
        const dry = d => { const px = gx0 + gd[0] * d - sx, py = gy0 + gd[1] * d - sy; return Math.hypot(px, py) <= shpx(px, py); };
        let len = Math.max(R2 * 0.5, off / dn + 4); while (len > 0 && !(dry(len) && dry(len * 0.5) && dry(len * 0.8))) len -= R2 * 0.1; V.gl = len < 3 ? 0 : len; }
      V.bot = bot; if (V.rd) { V.s0 = sectors(V.rd, V.rdy, 0.5, 'd'); V.inl0 = V.s0 === ONES || V.s0.every(x => x === 1); }
      if (pal && V.n) { V.fs = []; for (const [a, b] of cutArc(0, Math.PI, V.ga, V.gp * V.da)) for (const q of palSplit(V, a, b)) V.fs.push(q); V.gm = !V.inl && scAt(V.s1, V.ga) < 0.999; V.hm = V.fs.some(q => q[2]) || V.gm; } // the front wall's stretches, worked out once with the layout: which the shore pulled in
      { let nb = lg.bot; for (let i = 0; i < 48; i++) { const t = i / 48 * TAU, sn = Math.sin(t); if (pal) nb = Math.max(nb, cy + ry * sn * scAt(V.s1, t) + 0.5); if (V.rd) nb = Math.max(nb, cy + V.rdy * sn * scAt(V.s0, t) + V.dw / 2 + 0.5); } V.nb = nb; } // where the village's own name must start: below its real wall and ditch (the box keeps the old figures)
      return V; };
    // the layout is worked out once for a village at the origin and kept while its size (to half a px, and a quarter of a zoom step) holds; a pan only moves it
    const vplace = (S, sx, sy, R2, hsh, hall, pal, ditch) => {
      const rq = Math.round(R2 * 2) / 2, zq = Math.round(zoomed * 4) / 4, c0 = S.clans[0], f = (hall ? 1 : 0) + (pal ? 2 : 0) + (ditch ? 4 : 0) + (S.metal || 0) * 8, cb = Math.round(Math.log(cam.s) * 16), px = Math.round(c0.x / 500), py = Math.round(c0.y / 500); let mux = 0, muy = 0; for (const c of S.clans) { mux += c.ux != null ? c.ux : c.x; muy += c.uy != null ? c.uy : c.y; } const sk = Math.round(mux / S.clans.length / 500), sl = Math.round(muy / S.clans.length / 500); // sk: the shore profile's own centre (the clans' eased mean), so a village that glides takes the shore of where it stands
      let L = VC(S).vl; if (!L || L.rq !== rq || L.zq !== zq || L.cb !== cb || L.hsh !== hsh || L.pop !== S.pop || L.f !== f || L.type !== S.type || L.nc !== S.clans.length || L.px !== px || L.py !== py || L.sk !== sk || L.sl !== sl || L.rv !== W.roadsVer) { L = vlayout(S, 0, 0, rq, hsh, hall, pal, ditch, zq); L.rq = rq; L.zq = zq; L.cb = cb; L.hsh = hsh; L.pop = S.pop; L.f = f; L.type = S.type; L.nc = S.clans.length; L.px = px; L.py = py; L.sk = sk; L.sl = sl; L.rv = W.roadsVer; VC(S).vl = L; }
      const V = { gok: L.gok, k: L.k, hp: L.hp.map(h => [sx + h[0], sy + h[1], h[2]]), cx: sx + L.cx, cy: sy + L.cy, rx: L.rx, ry: L.ry, ph: L.ph, n: L.n, da: L.da, ga: L.ga, gv: L.gv, gu: L.gu, gp: L.gp, gl: L.gl, dw: L.dw, rd: L.rd, rdy: L.rdy, s1: L.s1, s0: L.s0, inl: L.inl, inl0: L.inl0, rt: L.rt, re: L.re, bot: sy + L.bot, nb: sy + L.nb, fs: L.fs, gm: L.gm, hm: L.hm, lg: { cx: sx + L.lg.cx, cy: sy + L.lg.cy, rp: L.lg.rp, bot: sy + L.lg.bot } }; return V; }; // a plain object of one shape (copying every field of the layout was the dearest line of the draw)
    // the ditch and its bank: ground, so drawn in plan, in the hatching the map gives its hills, a causeway left before the gate
    const drawDitch = (S, sx, sy, V, M) => { // adds this village's ditch, bank and hatching to the paths of its width (all the villages are stroked together). It is pulled in to the shore like the wall
      const { rd, rdy, dw, ga } = V, TAU = Math.PI * 2, rb = rd - dw / 2, mask = V.s0, cw = (V.gp ? (V.gp + 2) * V.da : 0.35), st = TAU / 24, ivs = [], key = Math.round(dw * 4); let D = M.get(key); if (!D) M.set(key, D = { dw: key / 4, band: new Path2D(), bank: new Path2D(), hatch: new Path2D() });
      for (let q = 0; q < 24; q++) { if (!mask[q]) continue; for (const iv of cutArc(q * st, (q + 1) * st, ga, cw)) ivs.push(iv); }
      const line = (path, a, b, ax, ay) => { const n = Math.max(1, Math.ceil((b - a) / (TAU / 48))); for (let i = 0; i <= n; i++) { const t = a + (b - a) * i / n, g = scAt(V.s0, t), x = sx + Math.cos(t) * ax * g, y = sy + Math.sin(t) * ay * g; i ? path.lineTo(x, y) : path.moveTo(x, y); } };
      if (V.inl0) for (const [a, b] of ivs) { D.band.moveTo(sx + Math.cos(a) * rd, sy + Math.sin(a) * rdy); D.band.ellipse(sx, sy, rd, rdy, 0, a, b); D.bank.moveTo(sx + Math.cos(a) * rb, sy + Math.sin(a) * (rdy - dw / 2)); D.bank.ellipse(sx, sy, rb, rdy - dw / 2, 0, a, b); }
      else for (const [a, b] of ivs) { line(D.band, a, b, rd, rdy); line(D.bank, a, b, rb, rdy - dw / 2); }
      const rx = rb, ry = rdy - dw / 2, m = clamp(Math.round(5.34 * Math.sqrt(rd * rdy / 0.7) / 3.2), 12, 160);
      for (let j = 0; j < m; j++) { const a = (j + 0.5) / m * TAU; if (!mask[Math.floor(a / st) % 24] || Math.abs(((a - ga + 3 * Math.PI) % TAU) - Math.PI) < cw) continue; const ca = Math.cos(a), sa = Math.sin(a), g = scAt(V.s0, a), bx = sx + ca * rx * g, by = sy + sa * ry * g, nx = ca / rx, ny = sa / ry, nl = Math.hypot(nx, ny), L = clamp(dw * 1.0, 2.4, 3.4) * (j & 1 ? 0.8 : 1); D.hatch.moveTo(bx, by); D.hatch.lineTo(bx + nx / nl * L, by + ny / nl * L); } };
    const ditchFlush = M => { ctx.lineCap = 'butt'; for (const D of M.values()) { ctx.strokeStyle = 'rgba(96,72,44,0.58)'; ctx.lineWidth = D.dw; ctx.stroke(D.band); ctx.strokeStyle = 'rgba(58,40,24,0.75)'; ctx.lineWidth = 0.7; ctx.stroke(D.bank); ctx.strokeStyle = 'rgba(92,66,36,0.75)'; ctx.lineWidth = 0.5; ctx.stroke(D.hatch); } ctx.lineCap = 'round'; };
    { const vpos = [], vseen = new Set(); for (const S of W.settlements || []) { if (!S.clans || !S.clans.length || vseen.has(S)) continue; vseen.add(S); let sx = 0, sy = 0; for (const c of S.clans) { const p = cs(c); sx += p[0]; sy += p[1]; } vpos.push([S, sx / S.clans.length, sy / S.clans.length]); }
      for (const [S] of vpos) S._sx = null;
      const vsorted = vpos.slice().sort((a, b) => a[1] - b[1]); vsorted.forEach((e, q) => { e.si = q; }); const tint = new Path2D(), edgeP = new Path2D(), edgeO = new Path2D(), dM = new Map(), gpath = new Path2D();
      for (let vi = 0; vi < vpos.length; vi++) { const [S, sx, sy] = vpos[vi];
        if (!on(sx, sy, 60) || (!show.people && sel !== S)) continue;
        if (far && sel !== S && hovE !== S && !(pc && S.clans.includes(pc)) && !(st && S.tribe === st)) continue; // far out, a village is part of its people's one mark
        let gap = 1e9; if (!far) { const i = vpos[vi].si; for (let j = i - 1; j >= 0 && sx - vsorted[j][1] < gap; j--) { const d = Math.hypot(vsorted[j][1] - sx, vsorted[j][2] - sy); if (d < gap) gap = d; } for (let j = i + 1; j < vsorted.length && vsorted[j][1] - sx < gap; j++) { const d = Math.hypot(vsorted[j][1] - sx, vsorted[j][2] - sy); if (d < gap) gap = d; } } // the nearest other village, looked for along the sorted row
        const R2 = Math.max(6, Math.min(clamp(Math.sqrt(S.pop) * clamp(zoomed / 6, 0.9, 3.2), 11, 42), gap / 2 / 1.25 - 1)); S._sx = sx; S._sy = sy; S._r = R2;
        let hsh = VC(S).hsh; if (hsh === undefined || VC(S).hsn !== S.name) { hsh = 0; for (const ch of S.name) hsh = (hsh * 31 + ch.charCodeAt(0)) | 0; VC(S).hsh = hsh; VC(S).hsn = S.name; }
        let wpal = false, wditch = false, whall = false; for (const c of S.clans) { const w = c.works; if (w) { if (w.pal) wpal = true; if (w.ditch) wditch = true; if (w.hall) whall = true; } } S._hall = whall;
        const V = vplace(S, sx, sy, R2, hsh, S._hall, wpal, wditch); vl.push([S, sx, sy, R2, hsh, V]);
        if (V.inl) vpoly(V.cx, V.cy, V.rx, V.ry, hsh, tint); else vring(tint, V, 'rt'); // trodden earth (a village wholly on dry ground keeps its plain ring)
        const ep = pc && S.clans.includes(pc) ? edgeP : edgeO; if (V.inl) { ep.moveTo(V.cx + V.rx * 1.1, V.cy); ep.ellipse(V.cx, V.cy, V.rx * 1.1, V.ry * 1.1, 0, 0, Math.PI * 2); } else vring(ep, V, 're'); // the edge of the village
        if (V.rd) drawDitch(S, V.cx, V.cy, V, dM);
        if (V.n && V.gok) { const ca = Math.cos(V.ga), sa = Math.sin(V.ga), gs = scAt(V.s1, V.ga), gx = V.cx + ca * V.rx * gs, gy = V.cy + sa * V.ry * gs, ux = V.gu[0], uy = V.gu[1], l0 = Math.max(2, R2 * 0.12), l1 = V.gl; if (l1 > 4 && !(V.gv >= 1 && show.roads)) { gpath.moveTo(gx - ux * l0, gy - uy * l0); gpath.lineTo(gx + ux * l1, gy + uy * l1); } } // the trodden way out of the gate
      }
      ctx.fillStyle = zoomed < 28 ? 'rgba(150,118,66,0.38)' : 'rgba(150,118,66,0.3)'; ctx.fill(tint); ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(29,21,14,0.2)'; ctx.stroke(edgeO); ctx.strokeStyle = 'rgba(29,21,14,0.4)'; ctx.stroke(edgeP); ditchFlush(dM); ctx.lineCap = 'round'; { const zs = clamp(zoomed / 8, 0.7, 1.8), gw = Math.max(2, 1.5 * zs); ctx.strokeStyle = 'rgba(84,58,28,0.6)'; ctx.lineWidth = gw + 1.2; ctx.stroke(gpath); ctx.strokeStyle = 'rgba(132,92,48,0.95)'; ctx.lineWidth = gw; ctx.stroke(gpath); } }
    if (show.people) drawTerritories(st, scf);
    if (st) { // how the selected tribe stands with the others
      const [cx, cy] = anchor(st);
      for (const o of W.tribes) if (o !== st) {
        const r = st.rel.get(o.id); if (!r || !SIM.knowsTribe(W, o)) continue; const op = r.op - r.grudge; if (Math.abs(op) < 20 && !r.allied) continue;
        const [bx, by] = anchor(o); ctx.strokeStyle = r.allied ? 'rgba(255,215,110,0.85)' : opCol(op, 0.55); ctx.lineWidth = r.allied ? 2.5 : 1.5; ctx.setLineDash(r.allied ? [] : [6, 5]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // monuments
    for (const m of W.monuments || []) { const [x, y] = toScreen(m.x, m.y); m._sx = null; if (far || !on(x, y)) continue;
      if (zoomed <= 2.5 && m.kind !== 'stone circle' && m.kind !== 'long barrow') continue;
      const ms = clamp(13 + zoomed * 0.6, 16, 24); ART.put(ctx, MON_SPRITE[m.kind] || 'stones', x, y, ms); m._sx = x; m._sy = y; if (SIM.knows(W, m.x, m.y)) mons.push([m, x, y, ms]); }
    if (far) { const acc = new Map(); // one mark for each people we know: where its camps are on the whole, as big as its numbers
      for (const c of W.clans) { if (!c.people.length || !show.people || (st && c.tribe === st) || !SIM.knows(W, c.x, c.y)) continue; const [x, y] = cs(c), m = c.people.length;
        let a = acc.get(c.tribe); if (!a) acc.set(c.tribe, a = { t: c.tribe, x: 0, y: 0, n: 0, v: 0 }); a.x += x * m; a.y += y * m; a.n += m; if (c.settled) a.v += m; }
      const list = [...acc.values()].filter(a => a.n > 0 && SIM.knowsTribe(W, a.t)).sort((a, b) => a.y - b.y);
      for (const a of list) { a.px = a.x / a.n; a.py = a.y / a.n; a.M = clamp(6 + Math.sqrt(a.n) * 1.0, 13, 24); }
      const big = list.slice().sort((a, b) => b.n - a.n); // the larger peoples keep their place; a smaller mark is moved aside, a little, where two would lie on each other
      for (let k = 1; k < big.length; k++) { const a = big[k]; for (let it = 0; it < 4; it++) { let moved = false; for (let j = 0; j < k; j++) { const o = big[j], dx = a.px - o.px, dy = a.py - o.py, d = Math.hypot(dx, dy) || 0.01, want = (a.M + o.M) * 0.62; if (d < want) { a.px += dx / d * (want - d); a.py += dy / d * (want - d) * 0.8; moved = true; } } if (!moved) break; } }
      for (const a of list) { const x = a.px, y = a.py; if (!on(x, y, 30)) continue; const t = a.t, M = a.M, hov = hovE === t, col = `hsla(${show.kult && t.kult ? t.kult.hue : t.hue},40%,52%,1)`;
        if (hov) { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.arc(x, y, M * 0.9 + 4, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = 'rgba(120,80,40,0.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(x, y + M * 0.1, M * 0.78, M * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
        if (a.v * 2 > a.n) { ctx.beginPath(); ctx.ellipse(x, y + M * 0.1, M * 0.78, M * 0.5, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(150,118,66,0.3)'; ctx.fill();
          const hv = ART.sprites.vhouse, hk = M / 18, hw = hv._lw * hk + 2.4; ART.stamp(ctx, hv, x, y - M * 0.12, hk * 0.95); ART.stamp(ctx, hv, x - hw * 0.5, y + M * 0.14, hk); ART.stamp(ctx, hv, x + hw * 0.5, y + M * 0.14, hk); }
        else { const n = a.n > 120 ? 3 : a.n > 45 ? 2 : 1, tk = M / 17, tc = ART.sprites.vtent, tw = tc._lw * tk + 2.4; if (n > 1) ART.stamp(ctx, tc, x - tw * 0.55, y + M * 0.05, tk * 0.86); if (n > 2) ART.stamp(ctx, tc, x + tw * 0.55, y + M * 0.05, tk * 0.8); ART.stamp(ctx, tc, x, y - (n > 1 ? M * 0.1 : -M * 0.08), tk); }
        a.mk = [x, y, M]; tmk.set(t, a); marks.push([x, y, M * 0.8, M * 0.6]); seenAdd(t, x, y, M * 0.8); } }
    // villages: permanent places, a huddle of little houses in the map's own ink and wash; the posts stand round them
    const palAcc = () => new Map(), palBk = (M, k, back) => { const key = Math.round(k * 20); let P = M.get(key); if (!P) { const kk = key / 20, sa = clamp((kk - 1) / 0.4, 0, 1) * (back ? 0.2 : 0.35); M.set(key, P = { k: kk, fill: new Path2D(), tips: new Path2D(), foot: new Path2D(), seam: sa > 0.02 ? new Path2D() : null, sa, gate: new Path2D(), gateB: new Path2D(), lint: new Path2D() }); } return P; }; // the posts of every village are gathered by house size and drawn together, one fill and a few strokes for all of them
    const palBand = (sx, sy, V, A, B, back, P) => { // a run of posts between angles A and B (A < B), added to the paths P: bottom edge on the ground ellipse, top edge raised, a pointed tip for each post
      const { rx: rp, ry, ph, k, da, ga } = V, d = Math.min(ph * 0.4, 1.7 * k), ev = [[A, 0]]; // 0 = end or valley, 1 = tip
      for (let j = Math.ceil((A - ga) / da - 1e-6); ga + j * da < B - 1e-6; j++) { const v = ga + j * da, t = v + da / 2; if (v > A + 1e-6) ev.push([v, 0]); if (t > A + 1e-6 && t < B - 1e-6) ev.push([t, 1]); }
      ev.push([B, 0]); if (ev.length < 3) return;
      const f = P.fill, t = P.tips, n = ev.length, X = new Array(n), Y = new Array(n), YT = new Array(n);
      for (let i = 0; i < n; i++) { const sc = scAt(V.s1, ev[i][0]); X[i] = sx + Math.cos(ev[i][0]) * rp * sc; Y[i] = sy + Math.sin(ev[i][0]) * ry * sc; YT[i] = Y[i] - ph + (ev[i][1] ? 0 : d); }
      f.moveTo(X[0], Y[0]); for (let i = 1; i < n; i++) f.lineTo(X[i], Y[i]); for (let i = n - 1; i >= 0; i--) f.lineTo(X[i], YT[i]); // (a fill closes its own paths)
      t.moveTo(X[0], Y[0]); for (let i = 0; i < n; i++) t.lineTo(X[i], YT[i]); t.lineTo(X[n - 1], Y[n - 1]); // the tips and the ends, in full ink
      P.foot.moveTo(X[0], Y[0]); for (let i = 1; i < n; i++) P.foot.lineTo(X[i], Y[i]); // the foot, lighter far out so the ring does not close into a black hoop (the back wall has a light one, so its posts do not stand apart)
      if (P.seam) for (let i = 0; i < n; i++) if (ev[i][1]) { P.seam.moveTo(X[i], Y[i]); P.seam.lineTo(X[i], YT[i]); } };
    const backA = k => { const t = clamp((k - 0.8) / 0.4, 0, 1); return [0.65 - 0.2 * t, 0.7 - 0.2 * t]; }, gateT = k => clamp((k - 0.88) / 0.14, 0, 1); // the back wall's fill and ink strength (stronger far out, so a small ring still reads as a ring); how far a back gate's taller posts have come up
    const palFlush = (M, back) => {
      for (const P of M.values()) { const k = P.k, lw = clamp(0.62 * Math.max(0.9, k), 0.6, 0.7), [fa, ia] = backA(k);
        ctx.fillStyle = back ? `rgba(150,118,80,${fa})` : '#b39060'; ctx.fill(P.fill); ctx.lineJoin = 'miter'; ctx.miterLimit = 3; ctx.strokeStyle = back ? `rgba(29,21,14,${ia})` : '#1d150e'; ctx.lineWidth = back ? 0.5 : lw; ctx.stroke(P.tips);
        { const ba = back ? 0.3 : 0.3 + 0.6 * clamp((k - 0.7) / 0.5, 0, 1); ctx.strokeStyle = `rgba(29,21,14,${ba})`; ctx.lineWidth = lw * (back ? 0.7 : 0.8); ctx.stroke(P.foot); }
        if (P.seam) { ctx.strokeStyle = `rgba(29,21,14,${P.sa})`; ctx.lineWidth = 0.4; ctx.stroke(P.seam); }
        if (back) { const la = gateT(k); if (la > 0.02) { ctx.strokeStyle = `rgba(29,21,14,${ia * la})`; ctx.lineWidth = 0.9; ctx.lineCap = 'butt'; ctx.stroke(P.lint); ctx.lineCap = 'round'; } }
        if (back) { ctx.fillStyle = `rgba(150,118,80,${fa})`; ctx.fill(P.gateB); ctx.strokeStyle = `rgba(29,21,14,${ia})`; ctx.lineWidth = 0.5; ctx.stroke(P.gateB); } // a back gate: exactly the back wall's ink, alpha and line
        else { ctx.fillStyle = '#b39060'; ctx.fill(P.gate); ctx.strokeStyle = '#1d150e'; ctx.lineWidth = lw; ctx.stroke(P.gate); } // a front gate: the front wall's ink and line
        ctx.lineJoin = 'round'; } };
    const gateH = (V, back) => V.ph * (1 + (back ? 0.35 * gateT(V.k) : 0.9 - 0.55 * clamp((V.k - 0.8) / 0.5, 0, 1))); // a back gate's posts stand at most 1.35 times the wall's, and only from k 0.9; a front gate's ease from 1.9 times far out to 1.35 close in
    const palGate = (sx, sy, V, P, back) => { // two posts either side of the gap, a third taller
      const { rx: rp, ry, k, da, ga, gp } = V, hh = gateH(V, back), w = Math.max(2.6, 2 * k), g = back ? P.gateB : P.gate;
      for (const sg of [-1, 1]) for (const o of [0.35, 1.35]) { const a = ga + sg * (gp + o) * da, sc = scAt(V.s1, a), x = sx + Math.cos(a) * rp * sc, y = sy + Math.sin(a) * ry * sc; g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - hh + w * 0.8); g.lineTo(x, y - hh); g.lineTo(x + w / 2, y - hh + w * 0.8); g.lineTo(x + w / 2, y); g.closePath(); } };
    const palLintel = (sx, sy, V, P) => { // the beam across the gate: drawn before the houses, so their roofs stand over it
      const { rx: rp, ry, da, ga, gp } = V, hh = gateH(V, true), pts = [];
      for (const sg of [-1, 1]) { const a = ga + sg * (gp + 0.35) * da; { const sc = scAt(V.s1, a); pts.push([sx + Math.cos(a) * rp * sc, sy + Math.sin(a) * ry * sc - hh * 0.86]); } }
      P.lint.moveTo(pts[0][0], pts[0][1]); P.lint.lineTo(pts[1][0], pts[1][1]); };
    const palEnd = (sx, sy, V, a, back) => { // a taller post at each end of a stretch left open to the sea, so the opening reads as a gate
      const { rx: rp, ry, ph, k } = V, hh = ph * 1.2, w = Math.max(1.5, 1.8 * k), sc = scAt(V.s1, a), x = sx + Math.cos(a) * rp * sc, y = sy + Math.sin(a) * ry * sc, [fa, ia] = backA(k);
      ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - hh + w * 0.8); ctx.lineTo(x, y - hh); ctx.lineTo(x + w / 2, y - hh + w * 0.8); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fillStyle = back ? `rgba(150,118,80,${fa})` : '#b39060'; ctx.fill(); ctx.strokeStyle = back ? `rgba(29,21,14,${ia})` : '#1d150e'; ctx.lineWidth = back ? 0.5 : 0.65; ctx.lineJoin = 'miter'; ctx.stroke(); ctx.lineJoin = 'round'; };
    const palRuns = (S, sx, sy, V, A, B, back, P, ends, split) => { // the posts between A and B, but not where the ring stands in the sea
      const mask = V.s1, st = Math.PI * 2 / 24; let run = null, afterSea = false; if (split) { const q0 = Math.floor(A / st + 1e-9); if (Math.abs(A - q0 * st) < 1e-9 && !mask[(((q0 - 1) % 24) + 24) % 24] && mask[((q0 % 24) + 24) % 24]) afterSea = true; } // a cut made inside the wall keeps the end post of a sea gap that lies beside it
      for (let q = Math.floor(A / st); q * st < B; q++) { const a0 = Math.max(A, q * st), a1 = Math.min(B, (q + 1) * st), ok = mask[((q % 24) + 24) % 24];
        if (ok) { if (run) run[1] = a1; else { run = [a0, a1]; if (afterSea) ends.push([sx, sy, V, a0, back]); } afterSea = false; } else { if (run) { palBand(sx, sy, V, run[0], run[1], back, P); if (a0 > run[1] - 1e-9) ends.push([sx, sy, V, run[1], back]); run = null; } afterSea = true; } }
      if (run) { palBand(sx, sy, V, run[0], run[1], back, P); if (split) { const q1 = Math.round(B / st); if (Math.abs(B - q1 * st) < 1e-9 && !mask[((q1 % 24) + 24) % 24] && mask[(((q1 - 1) % 24) + 24) % 24]) ends.push([sx, sy, V, run[1], back]); } } };
    { const TAU = Math.PI * 2, sp = ART.sprites, back = palAcc(), front = palAcc(), ends = [], mid = palAcc(), ends2 = []; // three passes: the backs of all the rings, then the houses, then the fronts
      for (const [S, sx, sy, R2, hsh, V] of vl) {
        if (sel === S || (hover && hover.e === S)) { if (V.inl) vpoly(V.cx, V.cy, V.rx, V.ry, hsh); else { ctx.beginPath(); vring(ctx, V, 'rt'); } ctx.strokeStyle = 'rgba(29,21,14,0.35)'; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.stroke(); }
        if (V.n) { const P = palBk(back, V.k, true), ok = V.gok; for (const [a, b] of cutArc(Math.PI, TAU, V.ga, V.gp * V.da)) palRuns(S, V.cx, V.cy, V, a, b, true, P, ends); if (ok && Math.abs(Math.sin(V.ga)) > 0.85 && gateT(V.k) > 0.03) palLintel(V.cx, V.cy, V, P); if (ok && Math.sin(V.ga) < 0 && gateT(V.k) > 0.03) palGate(V.cx, V.cy, V, P, true); } } // the back of the ring; a gate in it is a gap here, its posts in full ink
      for (const [S, sx, sy, R2, hsh, V] of vl) { if (!V.hm) continue; let P = null;
        for (const [a, b, m] of V.fs) if (m) { if (!P) P = palBk(mid, V.k, false); palRuns(S, V.cx, V.cy, V, a, b, false, P, ends2, true); }
        if (V.gm && V.gok && Math.sin(V.ga) >= 0) palGate(V.cx, V.cy, V, P || palBk(mid, V.k, false), false); } // the stretches of the front wall the shore pulled in: front ink, but under the houses, so a hut at the water stands over them
      palFlush(back, true); for (const e of ends) palEnd(e[0], e[1], e[2], e[3], e[4]); ends.length = 0;
      palFlush(mid, false); for (const e of ends2) palEnd(e[0], e[1], e[2], e[3], e[4]);
      for (const [S, sx, sy, R2, hsh, V] of vl) {
        const k = V.k, hp = V.hp; hp.sort((p, q) => p[1] - q[1]); for (const [hx, hy, nm] of hp) ART.stamp(ctx, sp[nm], hx, hy, nm === 'vhall' ? k * 1.25 : k); }
      for (const [S, sx, sy, R2, hsh, V] of vl) {
        if (V.n) { const P = palBk(front, V.k, false); for (const [a, b, m] of V.fs) if (!m) palRuns(S, V.cx, V.cy, V, a, b, false, P, ends, !V.inl); if (V.gok && !V.gm && Math.sin(V.ga) >= 0) palGate(V.cx, V.cy, V, P, false); } } // the front, over the houses' feet
      palFlush(front, false); for (const e of ends) palEnd(e[0], e[1], e[2], e[3], e[4]);
      for (const [S, sx, sy, R2, hsh, V] of vl) {
        if (S.metal) ART.put(ctx, S.metal === 2 ? 'bronze' : 'metal', sx + R2 * 0.95, sy - R2 * 0.75, 14);
        if (SIM.knows(W, S.clans[0].x, S.clans[0].y)) { vills.push([S, sx, sy, R2, V.lg.bot, V]); seenAdd(S.tribe, sx, sy, R2 * 1.5); } } }
    // wandering camps (tents); canoes on the water
    let gl = null, gskip = null;
    if (mid) { gskip = new Set(); const cell = new Map(); // camps of one people within about 28 px of each other (one square of a grid) are drawn as one mark
      const vt = new Map(); for (const v of vills) { let a = vt.get(v[0].tribe); if (!a) vt.set(v[0].tribe, a = []); a.push(v); }
      for (const c of W.clans) { if (c.settled || !c.people.length || own(c) || (st && c.tribe === st)) continue;
        const [x, y] = cs(c); if (!on(x, y, 40) || !W.land[SIM.cellAt(c.rx ?? c.x, c.ry ?? c.y)]) continue;
        const vs = vt.get(c.tribe); if (vs && vs.some(v => Math.hypot(v[1] - x, v[2] - y) < v[3] + 6)) { gskip.add(c); continue; } // a camp lying on a village of its own people is part of the village
        const k = c.tribe.id + ':' + Math.floor((x - cam.ox) / 28) + ":" + Math.floor((y - cam.oy) / 28); let g = cell.get(k); if (!g) cell.set(k, g = { t: c.tribe, cl: [], n: 0, x: 0, y: 0, lead: null });
        const m = c.people.length; g.cl.push(c); g.n += m; g.x += x * m; g.y += y * m; if (!g.lead || m > g.lead.people.length) g.lead = c; }
      gl = new Map();
      for (const g of cell.values()) if (g.cl.length > 1) { g.x /= g.n; g.y /= g.n; gl.set(g.lead, g); for (const c of g.cl) if (c !== g.lead) gskip.add(c); } }
    for (const c of W.clans) {
      if (c.settled) { c._r = 0; continue; }
      if (gskip && gskip.has(c)) { c._r = 0; continue; }
      let [x, y] = cs(c); c._r = 0; if (!on(x, y, 40) || (!show.people && c !== sc && c !== pc)) continue;
      if (far && !own(c) && !(st && c.tribe === st)) continue; // far out, only your own clan, the one you chose and the chosen people's camps are drawn one by one
      const grp = gl && gl.get(c); if (grp) { x = grp.x; y = grp.y; grpOf.set(c, grp); }
      if (!W.land[SIM.cellAt(c.rx ?? c.x, c.ry ?? c.y)]) { ART.canoe(ctx, x, y, Math.atan2(c.ty - c.y, c.tx - c.x), clanCol(c)); c._r = 9; continue; }
      const size = grp ? grp.n : c.people.length, ts = clamp(9 + Math.sqrt(size) * 0.9 * clamp(zoomed / 7, 0.8, 1.9), 12, 25); c._r = ts * 0.62;
      if (hover && hover.e === c) { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.arc(x, y, ts * 0.9 + 5, 0, Math.PI * 2); ctx.fill(); }
      if (c === sc || (zoomed > 14 && st && c.tribe === st)) { ctx.strokeStyle = clanCol(c, 0.8); ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(x, y, FORAGE_R * cam.s, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      if (c === sc && Math.hypot(c.tx - c.x, c.ty - c.y) > 1) { const [tx, ty] = toScreen(c.tx, c.ty); ctx.strokeStyle = clanCol(c); ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); }
      const n = size > 34 ? 3 : size > 16 ? 2 : 1, ring = c === sc ? '#ffffff' : (grp ? grp.cl.some(q => q.cond < 0.7) : c.cond < 0.7) ? 'rgba(176,58,40,0.85)' : null, tk = ts / 14, tc = ART.sprites.vtent;
      if (ring) { const rx = tc._lw * tk * 0.78 * (n > 1 ? 1.45 : 1), ry = rx * 0.4, ey = y + tc._lh * tk * 0.4; ctx.beginPath(); ctx.ellipse(x, ey, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = ring === '#ffffff' ? 'rgba(29,21,14,0.45)' : 'rgba(255,240,205,0.6)'; ctx.lineWidth = 4.2; ctx.stroke(); ctx.strokeStyle = ring; ctx.lineWidth = ring === '#ffffff' ? 2.4 : 2.1; ctx.stroke(); }
      if (n > 1) ART.stamp(ctx, tc, x - ts * 0.55, y - ts * 0.04, tk * 0.84); if (n > 2) ART.stamp(ctx, tc, x + ts * 0.55, y - ts * 0.02, tk * 0.78);
      ART.stamp(ctx, tc, x, y + (n > 1 ? ts * 0.1 : 0), tk);
      if (SIM.knows(W, c.x, c.y)) { camps.push([grp ? { name: grp.cl.length + ' camps', people: { length: grp.n } } : c, x, y, ts]); seenAdd(c.tribe, x, y, ts * 0.75); }
    }
    // traders on the road
    for (const r of W.traders || []) { const [x, y] = toScreen(r.x, r.y); r._sx = null; if (!on(x, y) || !SIM.knows(W, r.x, r.y) || (far && !(pc && r.home === pc))) continue; ART.put(ctx, pc && r.home === pc ? 'trader_me' : 'trader', x, y - 4, 19); r._sx = x; r._sy = y - 4; }
    // gathering places: a fire in a ring of stones
    for (const s of W.sites) {
      const [x, y] = toScreen(s.x, s.y); s._sx = null; if (!on(x, y) || (far && sel !== s)) continue; s._sx = x; const active = W.gathering && W.clans.some(c => c.atGathering && c.tribe.site === s), r = clamp(15 + zoomed * 0.6, 18, 26);
      if (active) { const gl = ctx.createRadialGradient(x, y, 2, x, y, r * 1.4); gl.addColorStop(0, 'rgba(255,200,90,0.5)'); gl.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, Math.PI * 2); ctx.fill(); }
      if (sel === s) { ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(29,21,14,0.4)'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.stroke(); }
      ART.stamp(ctx, ART.sprites.vhearth, x, y, r / 17); if (SIM.knows(W, s.x, s.y)) sites.push([s, x, y, r, active]);
    }
    // wild foods (closer in, or always on the Food view) and the resources: always on top of the people
    if (show.res && (layer === 'food' || zoomed > 15)) { const fz = layer === 'food' ? 19 : 17; for (const f of wildFoods()) { const [x, y] = cellS(f.i); if (!on(x, y)) continue; ART.put(ctx, f.ic, x, y, fz); icons.push([x, y, fz, fz]); } }
    for (const d of W.deposits) d._sx = null;
    if (show.res && !far) { const rz = clamp(11 + zoomed * 0.9, 18, 30), mine = new Set(P && P.claims ? P.claims.map(k => k.d) : []);
      for (const d of W.deposits) {
        let [x, y] = toScreen(d.x, d.y); if (!on(x, y)) continue;
        for (const [, vx, vy, vr] of vills) if (Math.hypot(vx - x, vy - y) < vr * 0.9 + rz * 0.4) { x = vx + vr * 0.9 + rz * 0.35; y = vy - vr * 0.6; break; }
        for (const [, cx, cy, ts] of camps) if (Math.hypot(cx - x, cy - y) < ts * 0.8 + rz * 0.3) { x = cx + ts * 0.8 + rz * 0.4; y = cy - ts * 0.5; break; }
        if (d.type === 'whale') ART.put(ctx, 'a_whale', x, y, rz * 0.9); else ART.put(ctx, d.type, x, y, rz);
        if (mine.has(d)) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rz / 2 + 2.5, 0, Math.PI * 2); ctx.stroke(); }
        d._sx = x; d._sy = y; icons.push([x, y, rz, rz]);
      } }
    // your house
    if (pc) { const [x, y] = cs(pc), bob = Math.sin(now / 320) * 1.6, r0 = pc.settled ? 12 : (pc._r || 8) + 4; ART.put(ctx, 'star', x, y - r0 - 11 - bob, 19); icons.push([x, y - r0 - 11, 19, 19]); }
    } catch (err) { window.__drawErr = (window.__drawErr || 0) + 1; window.__lastDrawErr = String(err && err.stack || err); const dpr = cv.width / Math.max(1, cv.clientWidth); for (let k = 0; k < 8; k++) ctx.restore(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    drawFog(); // always: never let a hiccup reveal the unknown
    drawPlacePick();
    // ---- names, written last and kept clear of icons and of each other ----
    const km = cam.s * 1000, opts = [10, 25, 50, 100, 200], L = opts.find(v => v * km > 50) || 200, VR = viewRect(), by = VR.y1 - 10 - (wide() ? 0 : 58), bx = wide() ? 14 : 12; // on the phone the scale and the compass ride above the bottom controls
    icons.push([bx + L * km / 2, by - 7, L * km + 12, 24]); icons.push([bx + 24, by - 52, 60, 60]); // the compass
    const placed = icons.slice(), fits = (cx, cy, tw, th) => cx - tw / 2 >= VR.x0 + 2 && cx + tw / 2 <= VR.x1 - 2 && cy - th / 2 >= VR.y0 + 2 && cy + th / 2 <= VR.y1 - 2 && !placed.some(p => Math.abs(p[0] - cx) < (p[2] + tw) / 2 + 2 && Math.abs(p[1] - cy) < (p[3] + th) / 2 + 1);
    const ZB = clearZones(w, h); for (const z of ZB) placed.push(z); // names are kept clear of the buttons
    const inkCol = f => { const m = /hsl\(([\d.]+),\s*([\d.]+)%/.exec(f || ''); return m ? `hsl(${m[1]},${Math.min(62, +m[2])}%,24%)` : '#3a2a14'; };
    const ink = (label, x, y, font, fill, lw = 3.4) => { ctx.font = font; ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(247,238,206,0.94)'; ctx.strokeText(label, x, y); ctx.fillStyle = inkCol(fill); ctx.fillText(label, x, y); };
    if (W.beasts) { const bh = clamp(20 + zoomed * 1.1, 24, 40), SP = { bear: 'bear', boar: 'boar', aurochs: 'aurochs', wolf: 'wolf', stag: 'wstag', whale: 'whale' }, tt = now / 1000;
      for (const b of W.beasts) { b._sx = null; if (!b.alive || !(b.name || b.kills) || !SIM.knows(W, b.x, b.y) || (far && !(pc && (pc.tribe.myths || []).some(m => m.beast === b.id)))) continue; let [x, y] = toScreen(b.x, b.y); if (!on(x, y)) continue;
        ART.put(ctx, 'a_' + SP[b.kind] + (b.id % 2 ? '_l' : ''), x, y, bh);
        const nm = SIM.beastNm(b); ink(nm[0].toUpperCase() + nm.slice(1), x, y + bh * 0.62 + 6, `italic 600 ${zoomed > 8 ? 13 : 11}px Georgia, serif`, '#5a1e12', 3); icons.push([x, y, bh, bh]); b._sx = x; b._sy = y; b._r = bh * 0.6; } }
    for (const t of W.tribes) t._lab = null; for (const cf of W.confeds) cf._lab = null;
    const knownAt = (x, y) => { if (x < cam.ox || y < cam.oy || x > cam.ox + WORLD * cam.s || y > cam.oy + WORLD * cam.s) return false; const [wx, wy] = toWorld(x, y); return SIM.knows(W, wx, wy); };
    const foggy = (x, y, tw) => { if (show.every || !knownAt(x, y)) return show.every ? false : true; let u = 0; for (const dy of [-6, 0, 6]) for (const dx of [-0.45, -0.2, 0, 0.2, 0.45]) if (!knownAt(x + dx * tw, y + dy) && ++u > 3) return true; return false; }; // a name may not lie mostly on unknown parchment (15 points of its box)
    if (show.names || st || scf) {
      ctx.lineJoin = 'round';
      // one rule for every name: write it only where its people can be seen, touching what it names, clear of the fog, of the buttons and of the other marks and names
      const tidy = !show.every, hT = hovE && (W.tribes.includes(hovE) ? hovE : hovE.tribe && W.tribes.includes(hovE.tribe) ? hovE.tribe : null), mine = pc && pc.tribe, hot = t => t === st || t === hT;
      const okPt = (x, y) => x >= VR.x0 + 2 && x <= VR.x1 - 2 && y >= VR.y0 + 2 && y <= VR.y1 - 2 && !ZB.some(z => Math.abs(x - z[0]) < z[2] / 2 && Math.abs(y - z[1]) < z[3] / 2);
      const landAt = (x, y) => { if (x < cam.ox || y < cam.oy || x > cam.ox + WORLD * cam.s || y > cam.oy + WORLD * cam.s) return false; const [wx, wy] = toWorld(x, y); return !!W.land[SIM.cellAt(wx, wy)]; }; // a realm's name is written on its land, not on the sea
      const offLand = (x, y, tw) => { if (!tidy) return false; let sea = 0; for (const dy of [-6, 0, 6]) for (const dx of [-0.45, -0.2, 0, 0.2, 0.45]) if (!landAt(x + dx * tw, y + dy) && ++sea > 8) return true; return false; }; // nor mostly on the sea
      const hardOk = (x, y, tw, th) => x - tw / 2 >= VR.x0 + 2 && x + tw / 2 <= VR.x1 - 2 && y - th / 2 >= VR.y0 + 2 && y + th / 2 <= VR.y1 - 2 && ![...ZB, [bx + L * km / 2, by - 7, L * km + 12, 24], [bx + 24, by - 52, 60, 60]].some(z => Math.abs(z[0] - x) < (z[2] + tw) / 2 && Math.abs(z[1] - y) < (z[3] + th) / 2); // the buttons, the scale bar and the compass are never written over
      const vbx = []; // the boxes of the villages, drawn walls and all
      let nMk = 0; // placed[] holds marks and icons first, then names: a name over a name costs more than a name over a mark
      const clashN = (x, y, tw, th) => { let n = 0; placed.forEach((p, i) => { if (Math.abs(p[0] - x) < (p[2] + tw) / 2 + 2 && Math.abs(p[1] - y) < (p[3] + th) / 2 + 1) n += i < nMk ? 0.35 : 1.4; }); return n; };
      const seenOf = t => (tseen.get(t) || []).filter(m => okPt(m[0], m[1])); // the marks of a people that are drawn, known and in the open part of the screen
      const capT = !tidy ? 1e9 : zoomed < LOD_FAR ? 8 : crowd ? 14 : 1e9, capR = !tidy ? 1e9 : zoomed < LOD_FAR ? 3 : crowd ? 4 : 1e9; // at the whole-isles view only a few names are written, the most important first
      const placeRealmOld = cf => { // 'Every camp': the realm's name as it was, over the capital (or the middle of its peoples when far out)
        const ts = SIM.confedTribes(W, cf); if (!ts.length || !cf.capital.clans.length || !cf.capital.clans.some(c => SIM.knows(W, c.x, c.y))) return false;
        let [cx, cy] = anchor(cf.capital), big = false; cy -= 40;
        if (far) { let sx = 0, sy = 0, sn = 0; for (const t of ts) { const a = tmk.get(t); if (a) { sx += a.x; sy += a.y; sn += a.n; } } if (sn) { cx = sx / sn; cy = sy / sn; big = true; } }
        const label = cf.name.replace(/^the /, 'The '), lf = `italic ${cf.kingdom ? 700 : 600} ${big ? (cf.kingdom ? 19 : 17) : cf.kingdom ? 17 : 15}px ${SERIF}`; ctx.font = lf; const tw = ctx.measureText(label).width + 26, th = big ? 24 : 20;
        if (big) { cx = clamp(cx, VR.x0 + tw / 2 + 6, VR.x1 - tw / 2 - 6); cy = clamp(cy, VR.y0 + th / 2 + 4, VR.y1 - th / 2 - 4); }
        if (big) { let ok = false; for (const [dx, dy] of [[0, 0], [0, -26], [0, 26], [0, -52], [0, 52]]) if (fits(cx + dx, cy + dy, tw, th)) { cx += dx; cy += dy; ok = true; break; } if (!ok) return false; }
        else if (!fits(cx, cy, tw, th)) return false;
        placed.push([cx, cy, tw, th]); cf._lab = [cx, cy, tw, th];
        ART.put(ctx, 'crown', cx - tw / 2 + 9, cy - 1, big ? 18 : 15); ctx.textAlign = 'left'; ink(label, cx - tw / 2 + 21, cy, lf, cf === scf ? '#fff' : '#ffe3a0', 4); ctx.textAlign = 'center'; return true;
      };
      const placeRealm = cf => { // the realm's name: small, light, spaced out; in the freest spot among its peoples' marks, or not at all
        if (!tidy) return placeRealmOld(cf);
        const ts = SIM.confedTribes(W, cf); if (!ts.length) return false;
        const ms = []; for (const t of ts) for (const m of seenOf(t)) ms.push(m); if (ms.length < 2) return false;
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, mx = 0, my = 0; for (const m of ms) { x0 = Math.min(x0, m[0]); x1 = Math.max(x1, m[0]); y0 = Math.min(y0, m[1]); y1 = Math.max(y1, m[1]); mx += m[0]; my += m[1]; } mx /= ms.length; my /= ms.length;
        const label = cf.name.replace(/^the /, 'The '), lf = `italic ${cf.kingdom ? 700 : 600} ${cf.kingdom ? 16 : 14.5}px ${SERIF}`, sp = 'letterSpacing' in ctx; ctx.font = lf; if (sp) ctx.letterSpacing = '1.5px';
        const tw = ctx.measureText(label).width + 22, th = 19; if (sp) ctx.letterSpacing = '0px';
        const mxm = tw * 0.45, mym = 50, wd = x1 - x0 + 2 * mxm, ht = y1 - y0 + 2 * mym; let best = null, bd = 1e9; // the box of its marks, with room round it for a long name
        for (const fy of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9]) for (const fx of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9]) { const x = x0 - mxm + wd * fx, y = y0 - mym + ht * fy; if (!fits(x, y, tw, th) || foggy(x, y, tw) || !landAt(x - tw * 0.4, y) || !landAt(x, y) || !landAt(x + tw * 0.4, y)) continue; const d = Math.hypot(x - mx, y - my); if (d < bd) { bd = d; best = [x, y]; } }
        if (!best) return false; const [cx, cy] = best;
        placed.push([cx, cy, tw, th]); cf._lab = [cx, cy, tw, th];
        ctx.save(); ctx.globalAlpha = 1; ART.put(ctx, 'crown', cx - tw / 2 + 8, cy - 1, 12); ctx.font = lf; if (sp) ctx.letterSpacing = '1.5px'; ctx.textAlign = 'left'; ctx.lineWidth = 3.6; ctx.strokeStyle = 'rgba(247,238,206,0.95)'; ctx.strokeText(label, cx - tw / 2 + 16, cy); ctx.fillStyle = `hsla(${cf.hue},${cf === scf ? 55 : 46}%,${cf === scf ? 16 : 22}%,1)`; ctx.fillText(label, cx - tw / 2 + 16, cy); ctx.restore(); ctx.textAlign = 'center'; return true;
      };
      const showAll = zoomed > 5 || W.tribes.length <= 14, tsz = new Map(W.tribes.map(t => [t, SIM.tribeSize(t)])), isCap = t => t.confed && t.confed.capital === t;
      const placeTribe = (t, force) => { // a people's name on a ribbon beside one of its marks that is drawn and seen
        let ms; const tk = tmk.get(t);
        if (tidy) { ms = seenOf(t); if (!ms.length) return false;
          let cx = 0, cy = 0, cn = 0; if (t === mine && pc) { const p = cs(pc); cx = p[0]; cy = p[1]; cn = 1; } else for (const m of ms) { cx += m[0] * m[2] * m[2]; cy += m[1] * m[2] * m[2]; cn += m[2] * m[2]; } cx /= cn || 1; cy /= cn || 1;
          ms = ms.slice().sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy)).slice(0, 4); if (t === mine && pc) { const p = cs(pc); if (okPt(p[0], p[1])) ms.unshift([p[0], p[1], 12]); } } // the house itself is the first place to write beside
        else { if (!t.clans.some(c => SIM.knows(W, c.x, c.y))) return false; const [ax, ay] = tk ? tk.mk : anchor(t); ms = [[ax, ay, tk ? tk.mk[2] : 0]]; }
        const name = t.name, num = String(tsz.get(t)), hov = hT === t, fN = `italic 600 ${t === st ? 15 : 13.5}px ${SERIF}`, fS = '600 10.5px system-ui,sans-serif';
        ctx.font = fN; const wN = ctx.measureText(name).width; ctx.font = fS; const wS = ctx.measureText(num).width; let tw = 17 + wN + 5 + wS, cmpct = false;
        const slots = (r, w, compact) => { const hw = w / 2 + r * 0.5, q = r * 0.4; return compact ? [[0, -19 - q], [0, 21 + q], [-hw, 0], [hw, 0], [0, -35 - q], [0, 37 + q], [-hw, -15], [hw, -15], [-hw, 15], [hw, 15]] : [[0, -19 - q], [0, 21 + q], [0, -27 - q], [0, 29 + q], [0, -35 - q], [0, 37 + q], [-hw, 0], [hw, 0], [-hw, -17], [hw, -17], [-hw, 17], [hw, 17], [-hw, -27], [hw, -27], [-hw, 27], [hw, 27]]; }; // nearest first; none farther than about 40 px, so a name touches its mark
        const oldSlots = () => [[0, -19], [0, 21], [0, -35], [0, 37], ...(t === mine ? [[0, -51], [0, 53], [tw / 2 + 12, -19], [-tw / 2 - 12, -19], [tw / 2 + 12, 21], [-tw / 2 - 12, 21]] : [])]; // 'Every camp': the old places
        let pick = null;
        for (const m of ms) { for (const [dx, dy] of !tidy && !tk ? oldSlots() : slots(m[2], tw, false)) if (fits(m[0] + dx, m[1] + dy, tw + 30, tidy ? 19 : 17) && !foggy(m[0] + dx, m[1] + dy, tw + 30) && !offLand(m[0] + dx, m[1] + dy, tw + 30)) { pick = [m[0] + dx, m[1] + dy]; break; } if (pick) break; }
        if (!pick && (tidy ? t !== mine : tk && t !== st)) { tw = 17 + wN; cmpct = true; // crowded: the number is left off so the name may still be written
          for (const m of ms) { for (const [dx, dy] of slots(m[2], tw, true)) if (fits(m[0] + dx, m[1] + dy, tw, tidy ? 19 : 17) && !foggy(m[0] + dx, m[1] + dy, tw) && !offLand(m[0] + dx, m[1] + dy, tw)) { pick = [m[0] + dx, m[1] + dy]; break; } if (pick) break; }
          if (!pick) { tw = 17 + wN + 5 + wS; cmpct = false; } }
        if (!pick && force && !tidy) pick = [ms[0][0], ms[0][1] + (t === mine && t !== st ? 21 : -19)]; // 'Every camp': as it was
        if (!pick && force) { // your own people's name is always written: the cheapest place near the house's mark (or one of the next nearest marks), clear of the buttons and the sheet; overlaps, fog and sea cost distance, so it stays close
          let bc = 1e9; ms.slice(0, 3).forEach((m, i) => { for (const d of [0, 8, 16, 24, 34, 46, 62, 80, 100]) if (d + i * 30 < bc) for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2 - Math.PI / 2, x = m[0] + Math.cos(a) * (d + (tw / 2 + 10) * Math.abs(Math.cos(a))), y = m[1] + Math.sin(a) * (d + m[2] * 0.4 + 19);
            if (!hardOk(x, y, tw + 30, tidy ? 19 : 17)) continue; let c = Math.hypot(x - m[0], y - m[1]) + i * 30; if (c >= bc) continue; c += clashN(x, y, tw + 30, tidy ? 19 : 17) * 45 + (vbx.some(p => Math.abs(p[0] - x) < (p[2] + tw + 30) / 2 && Math.abs(p[1] - y) < (p[3] + 19) / 2) ? 260 : 0); if (c >= bc) continue; if (foggy(x, y, tw + 30)) c += 170; if (c >= bc) continue; if (offLand(x, y, tw + 30)) c += 60; if (c < bc) { bc = c; pick = [x, y]; } } }); }
        if (!pick) return false;
        const pw = cmpct ? 0 : 30, ax = clamp(pick[0], VR.x0 + tw / 2 + pw / 2 + 2, VR.x1 - tw / 2 - pw / 2 - 2), cy = pick[1]; placed.push([ax, cy, tw + pw, tidy ? 19 : 17]); t._lab = [ax, cy, tw, 19];
        const x0 = ax - tw / 2;
        if (!cmpct) { // a ribbon behind the name of each people
          const bx0 = Math.round(x0 - 8), bx1 = Math.round(x0 + tw + 8), by0 = Math.round(cy - 10), by1 = Math.round(cy + 10);
          ctx.beginPath(); ctx.moveTo(bx0 - 7, by0 + 3); ctx.lineTo(bx0, by0 + 3); ctx.lineTo(bx0, by0); ctx.lineTo(bx1, by0); ctx.lineTo(bx1, by0 + 3); ctx.lineTo(bx1 + 7, by0 + 3); ctx.lineTo(bx1 + 3, cy + 1); ctx.lineTo(bx1 + 7, by1); ctx.lineTo(bx1 - 4, by1); ctx.lineTo(bx1 - 4, by1 - 3); ctx.lineTo(bx0 + 4, by1 - 3); ctx.lineTo(bx0 + 4, by1); ctx.lineTo(bx0 - 7, by1); ctx.lineTo(bx0 - 3, cy + 1); ctx.closePath();
          ctx.fillStyle = t === st || hov ? '#f4e6b4' : '#e0c98c'; ctx.fill(); ctx.strokeStyle = '#5e4624'; ctx.lineWidth = t === st ? 2 : 1.4; ctx.stroke(); }
        ART.put(ctx, SIM.faithOf(t), x0 + 7, cy, 14);
        ctx.textAlign = 'left'; ink(name, x0 + 17, cy - 1, fN, `hsl(${t.hue},78%,86%)`, cmpct ? 3.4 : 0.01); if (!cmpct) ink(num, x0 + 17 + wN + 5, cy - 0.5, fS, '', 0.01); ctx.textAlign = 'center'; return true;
      };
      // what to write, in the order of its importance: your own people, your realm, the one you chose, the realms' capitals, then the largest peoples
      const jobs = [];
      for (const cf of W.confeds) { if (!show.names && cf !== scf) continue; jobs.push({ cf, p: !tidy ? -1 : mine && mine.confed === cf ? 1 : cf === scf ? 2 : 3.5, n: cf.members ? cf.members.size : 0 }); }
      for (const t of W.tribes) { if (!show.names && t !== st) continue; if (!showAll && !hot(t) && t !== mine && tsz.get(t) < 100 && !isCap(t)) continue; jobs.push({ t, p: t === mine ? 0 : hot(t) ? 2 : isCap(t) ? 3 : 4, n: tsz.get(t) }); }
      jobs.sort((a, b) => a.p - b.p || b.n - a.n);
      if (tidy) { for (const m of marks) placed.push(m); for (const [, x, y, ts] of camps) placed.push([x, y, ts * 1.5, ts * 0.95]); for (const [, x, y, r, bot, V] of vills) { const g = V.lg, w = Math.max(r * 2.4, 2 * g.rp + 4), top = g.cy - Math.max(r * 0.95, g.rp * 0.7 + V.ph + 1), h = Math.max(r * 1.9, (bot || y) - top), bx = [g.cx, top + h / 2, w, h]; V.box = bx; vbx.push(bx); placed.push(bx); } } // names never sit over a mark
      nMk = placed.length; let nT = 0, nR = 0, pushed = tidy;
      for (const j of jobs) {
        if (!pushed && !j.cf) { for (const m of marks) placed.push(m); pushed = true; } // 'Every camp': the old way, marks are kept clear of the banners but not of the realm names
        if (j.cf) { if (nR >= capR && !(mine && mine.confed === j.cf)) continue; if (placeRealm(j.cf)) nR++; }
        else { const force = j.t === mine || j.t === st; if (nT >= capT && !force) continue; if (placeTribe(j.t, force)) nT++; }
      }
      // with the map coloured by culture, each people's name sits over its lands
      if (show.kult) { const acc = new Map();
        for (const t of W.tribes) { if (!t.kult) continue; for (const c of t.clans) { if (!SIM.knows(W, c.x, c.y)) continue; const [x, y] = cs(c), n = c.people.length, a = acc.get(t.kult) || [0, 0, 0]; a[0] += x * n; a[1] += y * n; a[2] += n; acc.set(t.kult, a); } }
        for (const [K, a] of acc) { if (a[2] < 1) continue; const x = a[0] / a[2], y = a[1] / a[2] - 34, f = `italic 600 17px ${SERIF}`; ctx.font = f; const tw = ctx.measureText(K.name).width + 10;
          if (!on(x, y, 40) || !fits(x, y, tw, 22) || foggy(x, y, tw)) continue; placed.push([x, y, tw, 22]); ink(K.name, x, y, f, `hsl(${K.hue},80%,82%)`, 4.5); } }
    }
    if (show.names) {
      for (const [S, sx, sy, R2, bot, V] of vills) { const hot = sel === S || (hover && hover.e === S); if (!(zoomed > 7 || S.pop >= 150 || hot)) continue;
        const lab = S.name, f = `600 11.5px ${SERIF}`; ctx.font = f; const lx = V.lg.cx, tw = ctx.measureText(lab).width + 6, bb = V.box, ys = [(V.nb != null ? V.nb : (bot || sy + R2 * 0.56)) + 9, bb ? bb[1] - bb[3] / 2 - 8 : sy - R2 * 0.8 - 10]; const oldY = (bot || sy + R2 * 0.56) + 9, moved = V.nb != null && V.nb > (bot || 0) + 0.5; if (moved) ys.push(oldY); // last of all, the old spot (on the wall rather than no name)
        const bi = bb ? placed.indexOf(bb) : -1; if (bi >= 0) placed.splice(bi, 1); // a village's own box never blocks its own name
        let y = ys.find(q => fits(lx, q, tw, 13) && !foggy(lx, q, tw)); // below the village, or else above it
        if (y != null && moved && ![oldY, ys[1]].some(q => fits(lx, q, tw, 13) && !foggy(lx, q, tw))) y = null; // a name the old spots would have lost stays lost: moving the names down must not crowd out another
        if (y == null) { if (!hot) { if (bi >= 0) placed.push(bb); continue; } y = ys[0]; } if (bi >= 0) placed.push(bb); placed.push([lx, y, tw, 13]); ink(lab, lx, y, f, '#fff2d6'); }
      for (const [s, x, y, r, active] of sites) { if (!(zoomed > 9 || sel === s || active)) continue; const f = `italic 600 11px ${SERIF}`; ctx.font = f; const tw = ctx.measureText(s.name).width + 6, yy = y + r * 0.55 + 8;
        if (!fits(x, yy, tw, 12) && sel !== s) continue; placed.push([x, yy, tw, 12]); ink(s.name, x, yy, f, '#ffe6a0'); }
      for (const [c, x, y, ts] of camps) { if (!(zoomed > 16 || c === sc)) continue; const lab = c.name.replace(/,$/, ''), f = '500 10.5px system-ui,sans-serif'; ctx.font = f; const tw = ctx.measureText(lab).width + 6, yy = y + ts * 0.62 + 9;
        if (!fits(x, yy, tw, 12) && c !== sc) continue; placed.push([x, yy, tw, 12]); ink(lab, x, yy, f, '#f0ece2', 3); }
      for (const [m, x, y, ms] of mons) { if (!(zoomed > 11 || (hover && hover.e === m))) continue; const f = `italic 600 10px ${SERIF}`; ctx.font = f; const tw = ctx.measureText(m.name).width + 6, yy = y + ms * 0.5 + 7;
        if (!fits(x, yy, tw, 11)) continue; placed.push([x, yy, tw, 11]); ink(m.name, x, yy, f, '#efe6cf', 3); }
    }
    // scale
    ctx.strokeStyle = 'rgba(247,238,206,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by); ctx.lineTo(bx + L * km, by); ctx.lineTo(bx + L * km, by - 4); ctx.stroke();
    ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.textAlign = 'left'; ink(`${L} km`, bx + 4, by - 9, '600 11px Georgia, serif', '#ece5d6', 3); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    // the edge of the sheet, darkened with age, and a compass
    { const w = cv.clientWidth, h = cv.clientHeight, e = 22;
      for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, e, 0, 0, 0, e, h], [w, 0, w - e, 0, w - e, 0, e, h], [0, 0, 0, e, 0, 0, w, e], [0, h, 0, h - e, 0, h - e, w, e]]) { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(84,58,24,0.42)'); g.addColorStop(1, 'rgba(84,58,24,0)'); ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh); }
      if (ART.sprites.compass) ART.stamp(ctx, ART.sprites.compass, bx + 24, by - 52, 2); }
  }

  // ---------- panels ----------
  const yr = w => Math.floor(w / 52) + 1;
  const pct = v => Math.round(v * 100) + '%';
  const bar = (v, col) => `<div class="bar"><i style="width:${clamp(v, 0, 1) * 100}%;background:${col}"></i></div>`;
  const link = (e, label) => e && e.alive !== false ? `<a data-e="${e.id}">${esc(label)}</a>` : esc(label);
  const famLabel = f => `House of ${f.name}`;
  const GLYPH = { '◆': 'flint', '●': 'amber', '▲': 'axe', '■': 'ochre', '✦': 'salt', 'ψ': 'grain', '⬢': 'copper', '⬡': 'tin', '◗': 'whale', '◒': 'clay', '🜁': 'spirits', '🦌': 'totem', '♀': 'mother', '⌓': 'ancestors', '☉': 'sky', '♣': 'grove', '𐌉': 'pole', '◎': 'stones' };
  const GLYPH_RE = new RegExp(Object.keys(GLYPH).join('|'), 'gu');
  const iconize = (s, size = 15) => String(s).replace(GLYPH_RE, m => ART.img(GLYPH[m], size));
  const depIc = (k, size = 16) => ART.img(k === 'whale' ? 'whale' : k, size);
  const faithIc = (t, size = 16) => ART.img(SIM.faithOf(t), size);
  // the food of a clan as the top bar, the strip, the Stores tile and the alerts tell it: SIM.foodDays (the store and the grain together). The colour is the old top-bar rule (how well fed the clan is).
  // A camp with nothing in store whose range feeds it, and which is well fed, says "from the land" instead of "0 days".
  function foodState(c) {
    const days = SIM.foodDays(c), land = days < 1 && c.cond >= 0.85 && (c.supply || 0) >= 1.1;
    return { days, land, cls: c.cond < 0.7 ? 'bad' : c.cond < 0.85 ? 'warn' : 'good' };
  }
  const dayWord = n => `${n} day${n === 1 ? '' : 's'}`, foodWords = fs => fs.land ? 'from the land' : dayWord(fs.days);
  let advOpen = false, tabsKey = '', tabsX = 0;
  // the house at a glance, two lines at most on the phone: the food (and why it is short), the heir, the seat, and the first sentence of the top warning (the whole alert stays in the list below; a tap goes to it)
  function houseStrip(h, c, t, heir, alTx, foodLow) {
    const fs = foodState(c), first = alTx.length ? (String(alTx[0]).replace(/<[^>]*>/g, '').match(/^.*?[.!?](?=\s|$)/) || [String(alTx[0]).replace(/<[^>]*>/g, '')])[0].trim() : '';
    let seat = ''; try { const si = typeof SIM.seatInfo === 'function' ? SIM.seatInfo(W) : null; if (si && si.pct != null) seat = `${t.headman === h ? 'Keeping the seat' : 'Chance at the seat'}: about ${si.pct}%`; } catch (e) { seat = ''; }
    if (!seat) seat = t.headman === h ? 'Leads the tribe' : c.head === h ? (SIM.isMatri(t) ? 'Clan mother' : 'Head of the clan') : `Not the head of the ${c.name} clan`;
    return `<div class="glance"><div class="gl1"><span class="gf ${fs.cls}">Food <b>${foodWords(fs)}</b></span><span class="gh">${heir ? `Heir <b>${esc(heir.name)}</b>, ${Math.floor(heir.age)}` : '<b>No heir</b>'}</span></div>` +
      (foodLow ? `<div class="gl2"><span class="gw ${fs.cls}" data-warn>${esc(SIM.foodWhy(W, c))}</span></div>` : `<div class="gl2"><span class="gs">${esc(seat)}</span>${first ? `<span class="gw" data-warn>${esc(first)}</span>` : ''}</div>`) + `</div>`;
  }
  function updateTop() {
    let tot = 0; for (const c of W.clans) tot += c.people.length;
    const P = W.player, playing = P && !P.over && P.head.alive && P.head.clan;
    $('#actBtn').style.display = P && !P.over ? '' : 'none'; $('#homeBtn').style.display = P && !P.over ? '' : 'none';
    $('#date').innerHTML = `${SIM.seasonName(W.week)}, year ${yr(W.week)}${W.gathering ? '<small>gathering season</small>' : ''}`;
    let hud;
    if (playing) { const c = P.head.clan;
      const fs = foodState(c);
      hud = `<span class="${fs.cls}"><i>Food</i><b>${foodWords(fs)}</b></span><span><i>Clan</i><b>${SIM.freeCount(c)}</b></span><span><i>Spears</i><b>${SIM.warriors({ clans: [c] })}</b></span><span class="r"><i>Renown</i><b>${Math.round(P.renown)}</b></span>`; }
    else hud = `<span><i>${P && P.over ? `The House of ${esc(P.house)} has ended` : 'Watching the isles'}</i></span>`;
    $('#hud').innerHTML = hud;
    if (P && P.hist.length !== tideN) { if (tideN >= 0 && P.hist.length > tideN && playing) { tide = P.hist[P.hist.length - 1].t; tideAt = performance.now(); } tideN = P.hist.length; }
    const tideOn = tide && performance.now() - tideAt < 9000; $('#popcount').classList.toggle('tide', !!tideOn);
    if (tideOn) $('#popcount').textContent = tide; else $('#popcount').textContent = `${tot.toLocaleString()} people in ${W.tribes.length} tribe${W.tribes.length === 1 ? '' : 's'}${running && ySpeed ? `, ${ySpeed < 1 ? ySpeed.toFixed(1) : Math.round(ySpeed)} years a second` : ''}`;
    const tb = Math.round($('.top').getBoundingClientRect().bottom); if (tb !== lastTopB) { lastTopB = tb; document.documentElement.style.setProperty('--topb', tb + 'px'); }
  }
  function crumbs() {
    if (sel && (sel.kind === 'clan' || sel.kind === 'tribe')) return '';
    const t = selTribe(), c = selClan(), parts = [];
    if (t && sel !== t) parts.push(link(t, `the ${t.name}`)); if (c && sel !== c) parts.push(link(c, `${c.name} clan`));
    if (sel && sel.kind === 'person' && sel.fam) parts.push(link(sel.fam, famLabel(sel.fam)));
    return parts.length ? `<div class="crumbs">${parts.join(' <span>›</span> ')}</div>` : '';
  }
  function pactLine(a, b, who) {
    const p = SIM.pactRoute(W, a, b); if (!p) return ''; const lv = ['no way yet', 'a track', 'a path', 'a road'][p.level], head = `${who ? `The ${esc(b.name)}: t` : 'T'}rade pact to year ${yr(p.until)}`;
    if (!p.ends) return `<div class="muted">${head}</div>`;
    const A = esc(p.ends[0].name), B = esc(p.ends[1].name);
    return `<div class="muted">${head}: ${!p.level ? `no way yet between ${A} and ${B}` : p.mode === 'shore' ? `${lv} runs down to the water from ${A} and from ${B}` : `${lv} runs from ${A} to ${B}`}</div>`;
  }
  function pactRest(seen) { let s = ''; const t = W.player.head.clan.tribe; for (const [oid] of t.rel) { const o = W.ents.get(oid); if (o && o.kind === 'tribe' && !seen.has(o)) s += pactLine(t, o, true); } return s ? `<div class="k sec">Trade pacts</div>${s}` : ''; }
  function relRows(e, kind, max = 8) {
    const rows = [];
    for (const [oid, r] of e.rel) { const o = W.ents.get(oid); if (!o || o.kind !== kind || o === e) continue; rows.push([o, r.op - r.grudge, r]); }
    if (!rows.length) return '<div class="muted">No dealings yet.</div>';
    rows.sort((a, b) => (b[2].allied - a[2].allied) || Math.abs(b[1]) - Math.abs(a[1]));
    return rows.slice(0, max).map(([o, op, r]) => {
      const name = kind === 'family' ? famLabel(o) : kind === 'clan' ? `${o.name}${o.tribe !== e.tribe ? ` (${o.tribe.name})` : ''}` : `the ${o.name}`;
      const word = r.allied ? 'allies' : op > 50 ? 'close friends' : op > 15 ? 'friendly' : op > -15 ? 'neutral' : op > -50 ? 'hostile' : (kind === 'tribe' && e.atWar && e.atWar.has(o.id)) ? 'at war' : 'enemies';
      const ties = kind === 'tribe' && (r.kin || r.feasts || r.trade) ? `<div class="ties">${r.kin ? `💍 ${r.kin} marriages` : ''}${r.feasts ? ` · 🔥 ${r.feasts} feasts` : ''}${r.trade ? ` · ⇄ ${r.trade} trades` : ''}</div>` : '';
      const last = r.hist.length ? r.hist[r.hist.length - 1] : null;
      return `<div class="rel"><div class="rh">${link(o, name)}<span style="color:${r.allied ? '#f3cf6a' : opCol(op)}">${word}${r.grudge > 15 ? ' · blood owed' : ''}</span></div>
        <div class="rbar"><i style="left:${op < 0 ? 50 + op / 2 : 50}%;width:${Math.abs(op) / 2}%;background:${opCol(op)}"></i></div>${ties}${kind === 'tribe' ? pactLine(e, o) : ''}
        ${last ? `<div class="muted">Y${yr(last.w)}: ${esc(last.t)}</div>` : ''}</div>`;
    }).join('');
  }
  const histList = (e, n = 10) => e.hist.length ? e.hist.slice(-n).reverse().map(h => `<div class="ev"><span class="yr">Y${yr(h.w)}</span>${iconize(esc(h.t))}</div>`).join('') : '<div class="muted">Nothing remembered yet.</div>';
  const counts = ps => { let m = 0, f = 0, k = 0, e = 0, sl = 0; for (const q of ps) { if (q.slave) { sl++; continue; } if (q.age < 15) k++; else if (q.age >= 55) e++; else if (q.sex === 'M') m++; else f++; } return `${m} m${m === 1 ? 'a' : 'e'}n · ${f} wom${f === 1 ? 'a' : 'e'}n · ${k} child${k === 1 ? '' : 'ren'}${e ? ` · ${e} elders` : ''}${sl ? ` · <span style="color:#8a4a1a">${sl} slaves</span>` : ''}`; };
  // standing orders and who may share your sources: set once, and the game acts on them without stopping
  function dealingsTab() {
    const D = SIM.dealings(W), pol = SIM.policy(W); if (!D) return '';
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-pol="${key}" data-v="${v}" class="${pol[key] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    let html = `<div class="lede">Give your orders once. The game follows them by itself and tells you what happened in a short note, so it only stops for what you ask it to.</div>
      <div class="k sec" style="margin-top:4px">Standing orders</div>
      <div class="ord"><div class="k">When one of your blood is killed</div>${seg('blood', [['revenge', 'Take revenge'], ['comp', 'Ask compensation'], ['forgive', 'Let it go'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When a clan swears vengeance on you</div>${seg('threat', [['comp', 'Pay them'], ['guard', 'Post guards'], ['ignore', 'Do nothing'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When raiders come for your camp</div>${seg('raid', [['fight', 'Stand and fight'], ['pay', 'Pay them off'], ['flee', 'Flee'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When a quarrel with another house turns ugly</div>${seg('quarrel', [['peace', 'Make peace'], ['stand', 'Stand our ground'], ['fight', 'Fight'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When the clans meet at a gathering</div>${seg('gather', [['gifts', 'Gifts or a feast'], ['trade', 'Trade'], ['keep', 'Keep apart'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When a sign is seen</div>${seg('omen', [['offer', 'Offer'], ['quiet', 'Keep quiet'], ['sign', 'Just a sign'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When the clan outgrows its home</div>${seg('split', [['letgo', 'Let a clan go'], ['hold', 'Hold together'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When a friend comes in need</div>${seg('friend', [['give', 'Give'], ['send', 'Send away'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When sickness comes</div>${seg('sick', [['scatter', 'Scatter'], ['tend', 'Tend them'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When exiles ask for shelter</div>${seg('exiles', [['place', 'Take them in'], ['feed', 'Feed them'], ['turn', 'Turn away'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When one asks for your oath</div>${seg('oath', [['swear', 'Swear it'], ['friendship', 'Friendship only'], ['refuse', 'Refuse'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When a lost child is found</div>${seg('found', [['take', 'Take the child'], ['other', 'Another house'], ['refuse', 'Not ours'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When a rival clan head strikes at your seat</div>${seg('seat', [['face', 'Face the challenge'], ['buy', 'Buy their support'], ['step', 'Step aside'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When someone mocks you before the clans</div>${seg('slight', [['gift', 'Open hands'], ['kind', 'Answer in kind'], ['pass', 'Let it pass'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When an oath you swore is called in</div>${seg('oathback', [['keep', 'Keep it'], ['food', 'Send food'], ['break', 'Break it'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When a people ask for their exiles back</div>${seg('exback', [['refuse', 'Refuse'], ['pay', 'Pay the price'], ['hand', 'Hand them over'], ['ask', 'Ask me']])}</div>
      <div class="ord"><div class="k">When a lost child is claimed</div>${seg('foundback', [['choose', 'Let the child choose'], ['send', 'Send the child home'], ['keep', 'Keep the child'], ['ask', 'Ask me']])}</div>
      <div class="k sec">Clans you deal with</div>
      <div class="muted" style="margin-bottom:2px">Choose who may work the sources your house has claimed. On automatic, your house shares with its own tribe and with any people who are not its enemies, and keeps enemies out.</div>`;
    if (!D.length) return html + '<div class="muted" style="margin-top:8px">No other clans nearby yet.</div>' + pactRest(new Set());
    const pactSeen = new Set(); const cards = D.map(d => { const o = d.clan, flags = [];
      if (d.at.length) flags.push(`${d.at.map(k => depIc(k, 15)).join('')}works your ${[...new Set(d.at.map(k => DEPOSITS[k].name.toLowerCase()))].join(' and ')}`);
      if (d.theirGrudge >= 12) flags.push('<span style="color:#a03a20">holds a blood grudge against you</span>');
      if (d.ourGrudge >= 12) flags.push('<span style="color:#5a3a1e">owes your clan blood</span>');
      const word = d.op > 50 ? 'close friends' : d.op > 15 ? 'friendly' : d.op > -15 ? 'neutral' : d.op > -50 ? 'hostile' : 'enemies';
      return `<div class="card"><div class="rh"><span><span class="dot" style="background:hsl(${o.tribe.hue},70%,55%);margin-right:6px"></span>${link(o, o.name + ' clan')} <span class="muted">${d.same ? 'your tribe' : 'the ' + esc(o.tribe.name)}, ${o.people.length} people, ${d.km} km</span></span><span style="color:${opCol(d.op)}">${word}</span></div>
        ${flags.length ? `<div class="muted" style="margin:3px 0 0">${flags.join('. ')}.</div>` : ''}${d.same || pactSeen.has(o.tribe) ? '' : (pactSeen.add(o.tribe), pactLine(W.player.head.clan.tribe, o.tribe))}
        <div class="dealrow"><div class="seg sm">${[['auto', `Automatic (${d.set === 'auto' ? (d.mode === 'share' ? 'sharing' : 'kept out') : 'off'})`], ['share', 'Share'], ['keep', 'Keep out']].map(([v, l]) => `<button data-deal="${o.id}" data-v="${v}" class="${d.set === v ? 'on' : ''}">${v === 'auto' && d.set !== 'auto' ? 'Automatic' : l}</button>`).join('')}</div>
        ${d.theirGrudge >= 12 ? `<button class="lnk" data-settle="${o.id}">Pay compensation</button>` : ''}${d.ourGrudge >= 12 ? `<button class="lnk" data-forgive="${o.id}">Forgive them</button>` : ''}</div></div>`; }).join(''); return html + cards + pactRest(pactSeen);
  }
  // one tile: how a clan or tribe is led, what happens when its leader dies, and who would follow today
  const ruleTile = e => { const R = SIM.ruleInfo(W, e);
    return `<div class="tiles"><div class="tile" style="grid-column:1/-1"><div class="k">How it is led</div><div class="v">${esc(R.name)}</div><div class="muted">${esc(R.text)}${R.since != null ? ` Since year ${yr(R.since)}.` : ''}</div>${R.heir ? `<div class="muted"><b>Would follow today:</b> ${esc(R.heir.who.name)}, ${esc(R.heir.how)}</div>` : ''}</div></div>`; };
  // the Fields tile: how far the village's cleared ground reaches
  const sows = c => c.settled && (c.live === 'farm' || (c.live === 'fishing' && c.tribe.stage >= 2)); // a village that keeps fields
  function fieldsTile(c) {
    if (!c.settled || c.tribe.stage < 2) return '';
    if (c.live === 'fishing') return `<div class="tiles"><div class="tile" style="grid-column:1/-1"><div class="k">Fields</div><div class="v">Small fields by the shore</div><div class="muted">half the fields of a farming village${SIM.canTakeFarming(W, c) ? ' · Take up farming (under Act) lets the village clear more' : ''}</div></div></div>`;
    const F = SIM.fieldInfo(W, c);
    return `<div class="tiles"><div class="tile" style="grid-column:1/-1"><div class="k">Fields</div><div class="v">${esc(F.step[0].toUpperCase() + F.step.slice(1))}</div><div class="muted">${F.n} stretch${F.n === 1 ? '' : 'es'} of cleared ground · soil ${pct(c.soil)}${F.lv >= F.cap ? ' · too few hands to clear more' : ''}</div></div></div>`;
  }
  function clanMakeup(h) {
    const c = h.clan, fams = SIM.familiesOf(c).sort((a, b) => (b.head === h || (b.head && b.head.dyn)) - (a.head === h || (a.head && a.head.dyn)) || c.people.filter(q => q.fam === b).length - c.people.filter(q => q.fam === a).length);
    const mine = h.fam;
    const F = SIM.clanFlow(W, 10), pl = (n, w) => `${n} ${w}`;
    const flow = F.years ? `<div class="card"><div class="rh">The clan's numbers, last ${F.years} year${F.years === 1 ? '' : 's'}</div><div class="muted">
        <b style="color:#476428">In:</b> ${[pl(F.born, 'born'), F.marriedIn ? pl(F.marriedIn, 'married in') : '', F.joined ? pl(F.joined, 'joined') : '', F.slaves ? pl(F.slaves, 'slaves taken') : ''].filter(Boolean).join(', ')}<br>
        <b style="color:#a03a20">Out:</b> ${[pl(F.died, 'died') + (F.infants ? ` (${F.infants} infants${F.killed ? ', ' + F.killed + ' killed' : ''})` : F.killed ? ` (${F.killed} killed)` : ''), F.marriedOut ? pl(F.marriedOut, 'married out') : '', F.split ? `${F.split} left to found a new clan` : '', F.left ? pl(F.left, 'moved away') : '', F.captured ? pl(F.captured, 'carried off') : ''].filter(Boolean).join(', ')}<br>
        ${F.women} wom${F.women === 1 ? 'a' : 'e'}n of childbearing age, ${F.wives} of them married. ${F.women <= 2 ? 'That is very few: the clan can hardly grow until more women marry in or a household joins. ' : ''}The clan splits when it passes ${F.splitAt} people.</div></div>` : '';
    return fieldsTile(c) + flow + ruleTile(c) + `<div class="muted" style="margin:4px 0">${link(c, 'The ' + c.name + ' clan')}: ${counts(c.people)} · head ${c.head ? esc(c.head.name) + (c.head === h ? ' (you)' : '') : '—'} · ${SIM.warriors({ clans: [c] })} fighting men</div>` +
      (c.people.some(q => q.slave) ? `<div class="card"><div class="rh">Slaves<span class="badge">${c.people.filter(q => q.slave).length}</span></div><div class="muted">${[...new Set(c.people.filter(q => q.slave).map(q => q.owner))].filter(Boolean).map(o => `${esc(o.name)}: ${c.people.filter(q => q.slave && q.owner === o).length}`).join(' · ')}</div></div>` : '') +
      fams.map(f => { const ps = c.people.filter(q => q.fam === f && !q.slave), op = mine && f !== mine ? SIM.opinion(f, mine) : null, ours = ps.some(q => q.dyn);
        return `<div class="card"><div class="rh">${ours ? '★ ' : ''}${link(f, famLabel(f))}<span class="badge">${ps.length}</span></div><div class="muted">${f.head ? `head ${esc(f.head.name)}, ${Math.floor(f.head.age)} · ` : ''}${counts(ps)}</div>${op != null ? `<div class="mini"><span>feeling for you</span><div class="rbar"><i style="left:${op < 0 ? 50 + Math.max(-100, op) / 2 : 50}%;width:${Math.min(100, Math.abs(op)) / 2}%;background:${opCol(op)}"></i></div></div>` : ''}</div>`; }).join('');
  }
  // the Seat list: who stands with whom for the seat that matters to the house today (SIM.seatInfo)
  function seatBlock(si) {
    if (!si) return '';
    return `<div class="k sec" style="margin-top:4px">${esc(si.title)}</div><div class="lede" style="margin:0 0 4px">${esc(si.line)}</div>${si.rumour ? `<div class="lede" style="margin:6px 0 0;color:#a03a20">${esc(si.rumour)}</div>` : ''}${si.plot ? `<div class="lede" style="margin:6px 0 0">${esc(si.plot)}</div>` : ''}<div style="height:6px"></div>`;
  }
  // one short line for a clan's card: how it leans for the seat, why, and whose talk won it
  function seatLean(si, o) {
    const r = si && si.rows.find(x => x.clan === o); if (!r) return '';
    const col = { you: 60, 'leans you': 30, undecided: 0, 'leans them': -30, them: -60 };
    return `<div class="muted" style="margin-top:2px"><span style="color:${opCol(col[r.lean])};font-weight:600">${esc(r.leanWord)}</span> · ${esc(r.reason)}${r.wonBy ? ` · <b>${r.wonBy === 'you' ? 'won by your talk' : 'won by ' + esc(r.wonBy) + '\'s talk'}</b>` : ''}</div>`;
  }
  function tribeMakeup(h) {
    const c = h.clan, t = c.tribe, si = SIM.seatInfo(W);
    return seatBlock(si) + ruleTile(t) + `<div class="muted" style="margin:4px 0">${link(t, 'The ' + t.name)}: ${SIM.tribeSize(t)} people in ${t.clans.length} clan${t.clans.length > 1 ? 's' : ''} · ${t.headman ? titleWord(t.headman, 'headman') : 'headman'} ${t.headman ? esc(t.headman.name) + (t.headman === h ? ' (you)' : '') : '—'} · ${SIM.warriors(t)} fighting men${t.confed ? ` · part of ${esc(t.confed.name)}` : ''}</div>` +
      t.clans.slice().sort((a, b) => (b === c) - (a === c) || b.people.length - a.people.length).map(o => { const op = o === c ? null : SIM.opinion(o, c), km = Math.round(Math.hypot(o.x - c.x, o.y - c.y) / 1000);
        return `<div class="card"><div class="rh">${o === c ? '★ ' : ''}${link(o, o.name + ' clan')}<span class="badge">${o.people.length}</span></div><div class="muted">${o.head ? `head ${esc(o.head.name)}${t.headman === o.head ? ' (leads the tribe)' : ''}, weight ${SIM.leadWeight(o.head).toFixed(2)} · ` : ''}${counts(o.people)} · ${o.settled ? `village ${esc(o.village || '')}` : 'camp'}${o === c ? '' : ` · ${km} km away`} · food ${SIM.foodDays(o)} days${o.cond < 0.7 ? ' · <span style="color:#a83a22">hungry</span>' : ''}</div>${seatLean(si, o)}${op != null ? `<div class="mini"><span>feeling for your clan</span><div class="rbar"><i style="left:${op < 0 ? 50 + Math.max(-100, op) / 2 : 50}%;width:${Math.min(100, Math.abs(op)) / 2}%;background:${opCol(op)}"></i></div></div>` : ''}</div>`; }).join('');
  }
  // ---------- the realm: a confederacy or kingdom, as the simulation describes it (SIM.realmInfo) or, until it does, as worked out here from what exists ----------
  const realmWord = cf => SIM.realmWord && cf ? SIM.realmWord(cf) : cf && cf.kingdom ? 'kingdom' : 'confederacy';
  const rulerWord = (cf, q) => SIM.rulerWord && cf ? SIM.rulerWord(cf, q) : cf && cf.kingdom ? (q && q.sex === 'F' ? 'Queen' : 'King') : 'High chief';
  const RULE_NAMES = ['A following', 'The tribes choose', 'By blood'];
  const RULE_TEXTS = [
    'The tribes follow the high chief himself. When he dies the realm falls apart, and each tribe goes its own way.',
    'When the high chief dies the tribes choose. The strongest tribe has the loudest voice, and its leader is likely to be chosen.',
    'The rule passes by blood. When the ruler dies, the next of the ruling line takes the place, and the tribes keep to it.'];
  const opWord = o => o > 50 ? 'close friends' : o > 15 ? 'friendly' : o > -15 ? 'neutral' : o > -50 ? 'hostile' : 'enemies';
  function realmInfo(cf) {
    if (SIM.realmInfo) { const r = SIM.realmInfo(W, cf); if (r) return r; }
    const cap = cf.capital, rule = cf.rule == null ? 1 : cf.rule, k = cf.king, rw = rulerWord(cf, k);
    const tribes = SIM.confedTribes(W, cf).map(t => {
      const m = cf.members.get(t.id) || { status: 'ally', joined: cf.founded }, st = m.status, feeling = t === cap ? 100 : SIM.opinion(t, cap);
      let stay = st === 'core' ? 0.95 : st === 'subject' ? 0.3 + feeling / 200 : 0.5 + feeling / 100;
      if (st !== 'core') stay += rule === 0 ? -0.2 : rule === 2 ? 0.15 : 0; stay = Math.max(0.05, Math.min(0.95, stay));
      return { t, status: st, statusWord: st === 'core' ? 'founding tribe' : st, joined: m.joined, people: SIM.tribeSize(t), warriors: SIM.warriors(t), leader: t.headman || null, feeling, stay, stayWord: stay >= 0.65 ? 'would stay' : stay >= 0.35 ? 'wavering' : 'would leave' };
    }).sort((a, b) => (b.t === cap) - (a.t === cap) || b.people - a.people);
    return { kind: cf.kingdom ? 'kingdom' : 'confederacy', name: cf.name, since: cf.founded, kingdomSince: cf.kingdom || 0, rule, ruleName: RULE_NAMES[rule] || RULE_NAMES[1], ruleText: RULE_TEXTS[rule] || RULE_TEXTS[1],
      ruler: k, rulerWord: rw, ruledSince: cf.ruledSince || cf.founded, heir: null, next: null, kingdomNeeds: null, tribes,
      wars: [...cf.wars.keys()].map(id => W.ents.get(id)).filter(Boolean), past: (cf.kings || []).slice(0, -1) };
  }
  const heirTile = (R, heir) => R.rule === 0 ? ['None', 'the tribes would part'] : R.heir ? [R.heir.who ? esc(R.heir.who.name) : '—', esc(R.heir.how || '') + (R.heir.child ? ' (a child)' : '')] : heir ? [esc(heir.name), `his son, ${Math.floor(heir.age)}`] : ['—', 'no son of age: trouble ahead'];
  // how it is held: the ladder of ways, what the way means, and who would follow if the ruler died today
  function heldBlock(cf, R) {
    const steps = R.kind === 'kingdom' ? [...RULE_NAMES, 'Kingdom'] : RULE_NAMES, rk = R.rule, kg = R.kind === 'kingdom';
    const cell = (l, on, past) => `<div style="flex:1;min-width:0;text-align:center;padding:5px 2px;font-size:12px;line-height:1.2;border:1px solid var(--rule);${on ? 'background:var(--amber);color:var(--amber-ink);font-weight:650;border-color:var(--amber)' : past ? 'color:var(--chalk)' : 'color:var(--dust)'}">${esc(l)}</div>`;
    const ladder = `<div style="display:flex;gap:2px;margin:4px 0 6px">${steps.map((l, i) => cell(l, i === rk || (kg && i === 3), i < rk)).join('')}</div>`;
    const others = R.tribes.filter(x => x.t !== cf.capital), n = w => others.filter(x => x.stayWord === w).length;
    const rn = R.ruler ? R.ruler.name : 'the ruler';
    const heirTxt = R.rule === 0 ? `The tribes would part: there is no one to follow ${esc(rn)}, and each would go its own way.`
      : R.heir && R.heir.who ? `<b>${link(R.heir.who, R.heir.who.name)}</b> would follow${R.heir.how ? ', ' + esc(R.heir.how) : ''}${R.heir.child ? ', a child' : ''}.`
      : R.heir ? `${R.heir.how ? esc(R.heir.how[0].toUpperCase() + R.heir.how.slice(1)) : 'Someone'} would follow${R.heir.child ? ', a child' : ''}.` : 'No one is plainly in line to follow.';
    const stayTxt = others.length ? `Of the other ${others.length} tribe${others.length > 1 ? 's' : ''}: ${n('would stay')} would stay, ${n('wavering')} ${n('wavering') === 1 ? 'is' : 'are'} wavering, ${n('would leave')} would leave.` : '';
    return `<div class="k sec">How it is held</div>${ladder}<div class="muted" style="font-size:12.5px;margin-bottom:6px">${esc(R.ruleText)}</div>
      <div class="row2" style="display:block"><b>If ${esc(rn)} died today:</b> ${heirTxt}${stayTxt ? ` <span class="muted">${stayTxt}</span>` : ''}</div>`;
  }
  const checkList = needs => needs.map(x => `<div class="row2"><span>${esc(x.text)}</span><span style="margin-left:auto;${x.ok ? '' : 'color:var(--dust)'}">${x.ok ? '<b>met</b>' : 'not yet'}</span></div>`).join('');
  function realmTab(h, cf) {
    const R = realmInfo(cf), k = R.ruler, rw = R.rulerWord, cap = cf.capital, kg = R.kind === 'kingdom', ts = R.tribes;
    const stayCol = w => w === 'would leave' ? 'var(--blood)' : w === 'wavering' ? 'var(--dust)' : 'var(--chalk)';
    let face = ''; try { face = k && k.clan ? ART.faceImg(k, k.clan.tribe.hue, 58, 'hd', true) : ''; } catch (e) { face = ''; }
    const yrsRuled = Math.max(0, Math.floor((W.week - R.ruledSince) / 52));
    let o = `<div class="ph"><span class="dot" style="background:hsl(${cf.hue},75%,60%)"></span><b>${esc(R.name.replace(/^the /, 'The '))}</b><span class="muted">${kg ? 'kingdom' : 'confederacy'} since year ${yr(kg && R.kingdomSince ? R.kingdomSince : R.since)}${kg && R.kingdomSince && R.since < R.kingdomSince ? `, a confederacy from year ${yr(R.since)}` : ''}</span></div>`;
    if (k && k === h) o += `<div class="muted" style="margin:0 0 4px">You rule it, as ${esc(rw.toLowerCase())}.</div>`;
    if (k) o += `<div class="row2" style="align-items:center;flex-wrap:nowrap;gap:10px">${face}<div><div class="k">${esc(rw)}</div><div class="v">${link(k, k.name)}${k === h ? ' (you)' : ''}</div><div class="muted">${Math.floor(k.age)} years old · has ruled ${yrsRuled < 1 ? 'less than a year' : yrsRuled + ' year' + (yrsRuled > 1 ? 's' : '')}${k.clan ? ` · of the ${link(k.clan.tribe, k.clan.tribe.name)}` : ''}</div></div></div>`;
    o += heldBlock(cf, R);
    if (R.next) { const nx = R.next; o += `<div class="k sec">The next step: ${esc(nx.label)}</div>${checkList(nx.needs || [])}<div class="muted" style="margin-top:4px">${nx.odds != null ? `The chance is about ${Math.round(nx.odds * 100)}%. ` : ''}${(R.mine != null ? R.mine : k === h) ? 'The deed is under Act.' : 'Only the ' + esc(rw.toLowerCase()) + ' can do this.'}</div>`; }
    if (R.kingdomNeeds && !kg) o += `<div class="k sec">What a kingdom needs</div>${checkList(R.kingdomNeeds)}${(R.mine != null ? R.mine : k === h) ? '' : '<div class="muted" style="margin-top:4px">Only the ' + esc(rw.toLowerCase()) + ' can raise a kingdom.</div>'}`;
    o += `<div class="k sec">The tribes</div><div class="tiles" style="grid-template-columns:1fr 1fr 1fr;gap:0 10px">${[['Tribes', ts.length], ['People', ts.reduce((s, x) => s + x.people, 0).toLocaleString()], ['Warriors', ts.reduce((s, x) => s + x.warriors, 0).toLocaleString()]].map(([a, b]) => `<div class="tile"><div class="k">${a}</div><div class="v">${b}</div></div>`).join('')}</div>`;
    o += ts.map(x => `<div class="card"><div class="rh"><span><span class="dot" style="background:hsl(${x.t.hue},70%,55%);margin-right:6px"></span>${link(x.t, 'the ' + x.t.name)}${x.t === cap ? ' <span class="muted">rules</span>' : ''}</span><span class="badge">${esc(x.statusWord)}</span></div>
      <div class="muted">${x.people} people · ${x.warriors} warriors · ${x.leader ? 'led by ' + link(x.leader, x.leader.name) : 'no leader'} · joined year ${yr(x.joined)}${x.t === cap ? '' : x.status === 'subject' ? ' · pays tribute' : ' · sends a light tribute'}${x.t !== cap ? ` · <span style="color:${opCol(x.feeling)}">${opWord(x.feeling)}</span> toward the ${esc(cap.name)}` : ''}</div>
      <div style="font-size:12.5px;color:${stayCol(x.stayWord)}">${esc(x.stayWord[0].toUpperCase() + x.stayWord.slice(1))}${' if the ' + esc(rw.toLowerCase()) + ' died today'}</div></div>`).join('');
    o += `<div class="k sec">Wars</div>${R.wars.length ? R.wars.map(t => `<div class="row2">⚔ ${link(t, 'the ' + t.name)} <span class="muted">${SIM.warriors(t)} warriors${R.warText && R.warText[t.id] ? ' · ' + (R.warFrom && R.warFrom[t.id] != null ? 'since year ' + yr(R.warFrom[t.id]) + '; ' : '') + esc(R.warText[t.id]) : ''}</span></div>`).join('') : '<div class="muted">At peace.</div>'}`;
    o += `<div class="k sec">Earlier rulers</div><div class="muted">${R.past && R.past.length ? R.past.map(esc).join(' → ') : 'None before this one.'}</div>`;
    return o;
  }
  const titleWord = (q, x) => x === 'king' ? rulerWord(q && q.clan && q.clan.tribe.confed, q).toLowerCase() : q && q.sex === 'F' ? ({ 'clan head': 'clan mother', headman: 'headwoman' }[x] || x) : x;
  const titlesFor = q => SIM.titlesOf(q).map(x => titleWord(q, x));
  function personLine(q) {
    const st = SIM.lifeStage(q.age), icon = { infant: '👶', child: q.sex === 'F' ? '👧' : '👦', adult: q.sex === 'F' ? '👩' : '👨', elder: q.sex === 'F' ? '👵' : '👴' }[st];
    const tags = [];
    if (q.spouse && q.spouse.alive) tags.push(`${q.sex === 'F' ? 'wife of' : 'husband of'} ${esc(q.spouse.name)}${q.wives === 2 ? ' +1' : ''}`);
    if (q.slave) tags.push(`<span style="color:#8a4a1a">slave of ${q.owner ? esc(q.owner.name) : '—'}${q.origin ? `, taken from the ${esc(q.origin.name)}` : ''}</span>`); else if (q.nSlaves) tags.push(`owns ${q.nSlaves} slave${q.nSlaves > 1 ? 's' : ''}`);
    if (q.job) tags.push(`<span style="color:#7a5a10">${q.job}</span>`); if (q.preg > 0) tags.push('pregnant'); if (q.clan && q.clan.head === q) tags.push(titleWord(q, 'clan head')); if (q.clan && q.clan.tribe.headman === q) tags.push(`<b>${titleWord(q, 'headman')}</b>`);
    if (q.age < 15 && q.mother) tags.push(`child of ${esc(q.mother.name)}${q.mother.alive ? '' : ' †'}`);
    return `<div class="pp" data-p="${q.id}">${icon} <b>${esc(q.name)}</b> <span class="muted">${q.sex === 'F' ? '♀' : '♂'} ${Math.floor(q.age)} · ${st}${tags.length ? ' · ' + tags.join(' · ') : ''}</span></div>`;
  }
  const pyramidHTML = () => `<div class="k sec">Age pyramid <span class="muted">(men ◀ ▶ women)</span></div><canvas id="pyr" width="600" height="170"></canvas>`;
  function drawPyramid(people) {
    const c = $('#pyr'); if (!c) return; const g = c.getContext('2d'), w = c.width, h = c.height, mid = w / 2, bins = 16, bh = h / bins;
    const F = new Array(bins).fill(0), M = new Array(bins).fill(0); for (const q of people) { const b = Math.min(bins - 1, Math.floor(q.age / 5)); (q.sex === 'F' ? F : M)[b]++; }
    const mx = Math.max(1, ...F, ...M); g.clearRect(0, 0, w, h); g.font = '15px system-ui'; g.textAlign = 'center';
    for (let b = 0; b < bins; b++) { const y = h - (b + 1) * bh, lw = M[b] / mx * (mid - 40), rw = F[b] / mx * (mid - 40); g.fillStyle = '#6a9fe0'; g.fillRect(mid - 22 - lw, y + 1, lw, bh - 2); g.fillStyle = '#e07fa6'; g.fillRect(mid + 22, y + 1, rw, bh - 2); if (b % 2 === 0) { g.fillStyle = '#6c563c'; g.fillText(b * 5, mid, y + bh - 1); } }
  }
  function demoStats(people) { let k = 0, a = 0, e = 0, m = 0, f = 0; for (const q of people) { if (q.age < 15) k++; else if (q.age < 60) a++; else e++; q.sex === 'F' ? f++ : m++; } return `${k} children · ${a} adults · ${e} elders · ${m}♂ ${f}♀`; }
  const goodsChips = g => Object.entries(g).filter(([, v]) => v > 0).map(([k, v]) => `<span class="chip">${ART.img(k === 'shells' ? 'beads' : k, 17)}${GOOD_NAMES[k] || k}<b>${v}</b></span>`).join('') || '<span class="muted">none</span>';
  function dietBar(c) {
    const b = SIM.foodBreakdown(W, c.x, c.y, c.tool, c.tribe.boats), tot = Object.values(b).reduce((s, v) => s + v, 0) || 1;
    const cols = { plants: '#8fbf5a', groves: '#d7af3c', game: '#c0764a', fish: '#4ac0d0', shellfish: '#f08cc8', seals: '#b9a07a' }, names = { plants: 'wild plants', groves: 'fruit & nuts', game: 'game', fish: 'fish', shellfish: 'shellfish', seals: 'seals & seabirds' };
    return `<div class="stack">${Object.entries(b).map(([k, v]) => `<i style="width:${v / tot * 100}%;background:${cols[k]}"></i>`).join('')}</div><div class="muted">${Object.entries(b).filter(([, v]) => v / tot > 0.02).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span style="color:${cols[k]}">■</span> ${names[k]} ${Math.round(v / tot * 100)}%`).join(' · ')}</div>`;
  }
  function nearbyDeposits(x, y, r) { return W.deposits.filter(d => Math.hypot(d.x - x, d.y - y) < r); }

  function renderPanel() {
    const el = $('#panelBody'); let html = '', pyr = null;
    if (sel && sel.alive === false) sel = null;
    if (sel && sel.kind === 'person' && (!sel.alive || !sel.clan || !sel.clan.alive)) sel = null;
    if (!sel && ['tribe', 'clan', 'family', 'person', 'site', 'confed', 'place'].includes(panel)) panel = W.player ? 'house' : 'log';
    if (panel === 'tribe') {
      const t = sel, size = SIM.tribeSize(t), people = t.clans.flatMap(c => c.people);
      const allies = W.tribes.filter(o => o !== t && SIM.isAllied(t, o) && !SIM.sameConfed(t, o));
      const foes = W.tribes.filter(o => o !== t && SIM.opinion(t, o) < -40);
      const fed = t.clans.reduce((a, c) => a + c.cond * c.people.length, 0) / Math.max(1, size), tools = t.clans.reduce((a, c) => a + c.tool * c.people.length, 0) / Math.max(1, size);
      const srcs = new Set(); for (const c of t.clans) for (const d of nearbyDeposits(c.x, c.y, FORAGE_R + 6000)) srcs.add(d.type);
      const goods = { flint: 0, amber: 0, axe: 0, ochre: 0, salt: 0 }; for (const c of t.clans) for (const k in goods) goods[k] += c.goods[k];
      const cf = t.confed, cfm = cf && cf.members.get(t.id);
      const tile = (k, v, sub, extra) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div>${sub ? `<div class="muted">${sub}</div>` : ''}${extra || ''}</div>`;
      const tabs = ['overview', 'clans', 'relations', 'history'];
      if (!tabs.includes(tribeTab)) tribeTab = 'overview';
      html = crumbs() + `<div class="ph"><span class="dot" style="background:hsl(${t.hue},70%,55%)"></span><b>The ${esc(t.name)}</b>
        ${cf ? `<span class="badge" style="border-color:hsl(${cf.hue},60%,32%)">${cfm.status === 'core' ? '👑 heart of' : cfm.status === 'subject' ? '⛓ subject of' : 'member of'} ${link(cf, cf.name)}</span>` : ''}
        <span class="muted">tribe since year ${yr(t.founded)}${t.parent && W.ents.get(t.parent) ? ` · split from the ${esc(W.ents.get(t.parent).name)}` : ''}</span></div>
        <div class="tabs2">${tabs.map(k => `<button data-tab="${k}" class="${k === tribeTab ? 'on' : ''}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>`;
      if (tribeTab === 'overview') {
        const b = SIM.kingshipBid(W, t);
        html += `<div class="k sec">People</div><div class="tiles">
          ${tile('People', `${size}<span class="muted"> / ${SIM.tribeMax(t)}</span>`, demoStats(people) + (SIM.slaveCount(t) ? ` · +${SIM.slaveCount(t)} slaves` : ''), bar(size / SIM.tribeMax(t), `hsl(${t.hue},70%,55%)`))}
          ${tile('Camps and land', t.clans.length, `${Math.round(territoryKm2(t)).toLocaleString()} km² claimed${t.landC ? `, ${Math.round(100 * (t.landH || 0) / t.landC)}% of it still held` : ''}${(n => n ? `<br>${n} village${n === 1 ? ' of another people stands' : 's of other peoples stand'} on ${W.player && W.player.head && W.player.head.clan && W.player.head.clan.tribe === t ? 'our' : 'their'} land` : '')(SIM.landLive(W, t).length)}`)}
          ${tile('Settlements', (W.settlements || []).filter(s => s.tribe === t).length, 'village' + ((W.settlements || []).filter(s => s.tribe === t).length === 1 ? '' : 's'))}
          ${tile('Height', (() => { let m = 0, n = 0; for (const c of t.clans) { m += SIM.statureCm(c)[0] * c.people.length; n += c.people.length; } return Math.round(m / Math.max(1, n)) + ' cm'; })(), 'average man')}
        </div>
        <div class="k sec">Livelihood</div><div class="tiles">
          ${tile('Fed', pct(fed), fed > 0.9 ? 'well fed' : fed > 0.75 ? 'getting by' : 'hungry', bar(fed, fed > 0.85 ? '#5fc46a' : fed > 0.7 ? '#e0b84a' : '#e0584a'))}
          ${tile('Way of life', SIM.STAGES[t.stage], t.stage < 3 ? `grain domestication ${Math.round(Math.min(1, t.dom / 0.55) * 100)}%` : `${t.clans.filter(c => c.settled).length} settled clan${t.clans.filter(c => c.settled).length === 1 ? '' : 's'}`, bar(Math.min(1, t.dom / 0.55), '#d7af3c'))}
          ${tile('Boats', SIM.BOAT_STAGES[SIM.boatStage(t)], SIM.boatStage(t) === 2 ? 'offshore, whaling, crossings' : SIM.boatStage(t) === 1 ? 'inshore fishing' : '', bar(t.boats, '#6fb7d9'))}
          ${tile('Wealth', Math.round(SIM.tribeWealth(t)), 'amber, axes, salt…')}
        </div>
        <div class="k sec">Craft and war</div><div class="tiles">
          ${tile('Stone tools', pct(tools), srcs.has('flint') || srcs.has('axe') ? 'own quarry' : 'by trade', bar(tools, '#cfd6e0'))}
          ${tile('Metal', SIM.METAL_STAGES[SIM.metalStage(t)], SIM.metalStage(t) ? `${t.clans.filter(c => c.goods.metal + c.goods.bronze > 0).length} clan${t.clans.filter(c => c.goods.metal + c.goods.bronze > 0).length === 1 ? '' : 's'} armed` : t.clans.some(c => c.settled) ? 'needs copper ore' : 'needs settled villages', bar(t.metal, '#d9823f'))}
          ${tile('Weapons', SIM.weaponsName(t), (t.flintW || 0) < 0.5 && !t.clans.some(c => c.goods.metal + c.goods.bronze > 0) ? 'needs a supply of good flint' : 'an edge in raids and war', bar(t.flintW || 0, '#cfd6e0'))}
          ${tile('Warriors', SIM.warriors(t), 'men of fighting age')}
          ${tile('Fighting strength', Math.round(SIM.tribeVigor(t) * 100) + '%', t.stage === 3 ? 'farmers: smaller, sicker' : 'hardy foragers')}
        </div>
        ${(() => { const me = W.player && !W.player.over && W.player.head.clan ? W.player.head.clan.tribe : null, K = SIM.kultInfo(W, t, me); if (!K) return '';
          const jobs = {}; let nj = 0; for (const c of t.clans) for (const q of c.people) if (q.job) { jobs[q.job] = (jobs[q.job] || 0) + 1; nj++; }
          const wk = {}; for (const c of t.clans) if (c.settled && c.works) for (const k in c.works) wk[k] = (wk[k] || 0) + 1;
          const wtxt = Object.entries(wk).map(([k, n]) => `${SIM.WORKS[k].name.toLowerCase()}${n > 1 ? ' ×' + n : ''}`).join(', ');
          return `<div class="k sec">People and tongue</div><div class="tiles">
          ${tile('Culture', `<span class="dot" style="background:hsl(${K.hue},70%,55%)"></span>${esc(K.name)}`, `${K.tribes} tribe${K.tribes === 1 ? '' : 's'}, ${K.n.toLocaleString()} people${K.parent ? ` · grew out of the ${esc(K.parent)} peoples` : ' · one of the first peoples'}${K.assim ? ` · taking up ${esc(K.assim)} ways` : ''}`)}
          ${tile('Speech', esc(K.name) + (K.dialect ? ' <span class="muted">dialect</span>' : ''), K.u != null ? `To your ears: ${K.word}` : K.kin.length ? `Kindred tongues: ${K.kin.slice(0, 4).map(esc).join(', ')}` : 'No kindred tongue is spoken anywhere', K.u != null ? bar(K.u, K.u > 0.6 ? '#5fc46a' : K.u > 0.3 ? '#e0b84a' : '#e0584a') : '')}
          ${tile('Makers', K.carve || K.pots ? esc(K.style.motif) : 'No craftsmen yet', `${K.pots ? esc(K.style.pot) + ' pots · ' : ''}they wear ${esc(K.style.adorn)} · they tell of ${esc(K.style.tale)}`)}
          ${tile('Society', SIM.SOCIETY[SIM.societyOf(t)], (nj ? Object.entries(jobs).map(([j, n]) => `${n} ${j}${n > 1 ? 's' : ''}`).join(', ') : 'no one lives by a craft') + (wtxt ? ' · ' + wtxt : ''))}
        </div>`; })()}
        ${t.myths && t.myths.length ? `<div class="k sec">Stories they tell</div><div class="muted" style="margin-bottom:4px">None of it need be true. All of it is believed, and acted on.</div>${t.myths.slice().reverse().map(m => `<div class="myth"><b>${esc(m.title)}</b>${m.kind === 'hero' && m.dyn && W.player && !W.player.over && W.player.head.clan && W.player.head.clan.tribe === t ? ' <span class="badge">of your house</span>' : ''}${m.kind === 'beast' ? (b => ` <span class="badge">${b && b.alive ? 'still out there' : b && b.slain ? 'slain, year ' + b.slain.y : 'not seen for years'}</span>`)((W.beasts || []).find(b => b.id === m.beast)) : ''}<div class="muted">${esc(m.text)}</div></div>`).join('')}` : ''}
        <div class="k sec">Custom and belief</div><div class="tiles">
          ${tile('Customs & faith', `${faithIc(t, 18)}${SIM.FAITHS[SIM.faithOf(t)].name}`, `${SIM.isMatri(t) ? 'matrilineal — clan mothers lead; husbands join the wife\'s clan' : 'patrilineal — men lead; wives join the husband\'s clan'} · ${SIM.FAITHS[SIM.faithOf(t)].short.toLowerCase()}${t.blessing && t.blessing.until > W.week ? ' · <b>blessed</b>' : ''}`, `<div class="scale"><i style="left:calc(${Math.round(((t.culture && t.culture.patri) ?? 0.5) * 100)}% - 2px)"></i></div><div class="muted" style="display:flex;justify-content:space-between;font-size:12px"><span>mothers lead</span><span>fathers lead</span></div>`).replace('class="tile"', 'class="tile" style="grid-column:1/-1"')}
        </div>
        <div class="k sec">Population over time</div><canvas id="spark" width="600" height="90"></canvas>
        <div class="k sec">Leadership</div>
        <div class="row2">${t.headman ? `<b>${esc(t.headman.name)}</b> <span class="muted">${cf && cf.king === t.headman ? '👑 ' + titleWord(t.headman, 'king') : titleWord(t.headman, 'headman')}, ${Math.floor(t.headman.age)}, of the ${link(t.headman.clan, t.headman.clan.name)} clan · ${SIM.kinOf(t.headman, t)} close kin in the tribe</span>` : '<span class="muted">no headman</span>'}</div>
        ${ruleTile(t)}
        ${b && !cf ? `<div class="bid"><div class="rh"><b>Bid to unite the tribes</b><span>${b.total.toFixed(1)} / ${b.need.toFixed(1)}</span></div><div class="muted">Uniting tribes into a confederacy needs a bid of ${b.need.toFixed(1)}, at least 2 allies, and a well-peopled land.</div>
          ${bar(b.total / b.need, b.total >= b.need ? '#f3cf6a' : '#a08850')}
          <div class="bidparts">${[['prestige', 'his prestige'], ['wealth', 'tribal wealth'], ['kin', 'his kin'], ['clans', 'clan backing'], ['tribe', 'tribe size'], ['allies', 'allied tribes']].map(([k, l]) => `<span><i style="width:${Math.min(1, b.parts[k] / 1.2) * 100}%"></i>${l} ${b.parts[k].toFixed(1)}</span>`).join('')}</div></div>` : ''}
        <div class="tiles2"><div><div class="k">Gathering place</div>${t.site ? link(t.site, t.site.name) : '—'}</div>
          <div><div class="k">Allies</div>${allies.length ? allies.map(o => link(o, o.name)).join(', ') : '—'}</div>
          <div><div class="k">Enemies</div>${foes.length ? foes.map(o => link(o, o.name) + (t.atWar.has(o.id) ? ' ⚔' : '')).join(', ') : '—'}</div></div>
        <div class="k sec">Resources in our lands</div><div>${[...srcs].map(k => `<span class="chip">${depIc(k)}${DEPOSITS[k].name}</span>`).join('') || '<span class="muted">no stone, amber or salt sources — must trade</span>'}</div>
        <div class="k sec">Goods held</div><div>${goodsChips(goods)}</div>`;
      } else if (tribeTab === 'clans') {
        html += t.clans.slice().sort((a, b) => b.people.length - a.people.length).map(c => `<div class="card">
          <div class="rh">${link(c, c.name + ' clan')}<span class="muted">${c.people.length} people · ${SIM.familiesOf(c).length} households</span></div>
          <div class="mini"><span>fed</span>${bar(c.cond, c.cond > 0.85 ? '#5fc46a' : c.cond > 0.7 ? '#e0b84a' : '#e0584a')}<span>tools</span>${bar(c.tool, '#cfd6e0')}</div>
          <div class="muted">${c.head ? `head ${esc(c.head.name)} (${Math.floor(c.head.age)})` : 'no head'}${c === (t.headman && t.headman.clan) ? ' · <b>headman\'s clan</b>' : ''} · in ${BIOMES[W.biome[SIM.cellAt(c.x, c.y)]].name.toLowerCase()}</div></div>`).join('') +
          `<div class="k sec">How the clans feel about each other</div>${clanMatrix(t)}`;
      } else if (tribeTab === 'relations') {
        html += relRows(t, 'tribe', 14);
      } else {
        html += histList(t, 30) + pyramidHTML(); pyr = people;
      }
      setTimeout(() => drawSpark(t), 0);
    } else if (panel === 'place') {
      const S = sel, cl = (S.clans || []).filter(c => c.alive);
      const g = { flint: 0, amber: 0, axe: 0, ochre: 0, salt: 0, copper: 0, tin: 0, metal: 0, bronze: 0 }; for (const c of cl) for (const k in g) g[k] += c.goods[k];
      const grain = cl.reduce((s, c) => s + c.grain, 0), need = cl.reduce((s, c) => s + SIM.needsWeek(c), 0) / 7 || 1;
      const farms = cl.filter(c => c.live === 'farm'), sowFish = cl.filter(c => c.live === 'fishing' && c.tribe.stage >= 2), soilOf = a => a.reduce((s, c) => s + (c.soil == null ? 1 : c.soil), 0) / a.length, soil = farms.length ? soilOf(farms) : null;
      const kindName = S.type === 'fishing' ? 'Fishing village' : S.type === 'mixed' ? 'Farming & fishing village' : 'Farming village';
      html = `<div class="crumbs">${link(S.tribe, 'the ' + S.tribe.name)}</div><div class="ph"><span class="dot" style="background:${S.type === 'fishing' ? '#3e5c70' : '#6e5136'}"></span><b>🏘 ${esc(S.name)}</b><span class="muted">${kindName} · founded year ${yr(S.founded)}${S.abandoned && !cl.length ? ' · abandoned' : ''}</span></div>
        <div class="tiles">
          <div class="tile"><div class="k">People</div><div class="v">${S.pop || 0}</div><div class="muted">peak ${S.peak} · ${cl.length} clan${cl.length === 1 ? '' : 's'}</div></div>
          <div class="tile"><div class="k">${farms.length ? 'Grain stores' : 'Dried fish'}</div><div class="v">${farms.length ? Math.round(grain / need) + ' days' : Math.round(cl.reduce((s, c) => s + c.store, 0) / need) + ' days'}</div><div class="muted">${farms.length ? `field soil ${pct(soil)}` : `smoked & dried${sowFish.length ? ` · small fields, soil ${pct(soilOf(sowFish))}` : ''}`}</div></div>
          <div class="tile"><div class="k">Crafts</div><div class="v">${S.metal === 2 ? 'Bronze' : S.metal === 1 ? 'Copper' : 'Stone'}</div><div class="muted">${S.metal === 2 ? 'bronze-casting' : S.metal === 1 ? 'copper-smelting' : 'no metalworking yet'}</div></div>
        </div>
        <div class="k sec">Clans living here</div>${cl.map(c => `<div class="row2">${link(c, c.name + ' clan')} <span class="muted">${c.people.length} people · ${c.live === 'fishing' ? 'fishers' : 'farmers'} · fed ${pct(c.cond)}</span></div>`).join('') || '<div class="muted">No one lives here now.</div>'}
        <div class="k sec">Goods in the village</div><div>${goodsChips(g)}</div>
        <div class="k sec">History of ${esc(S.name)}</div>${histList(S, 12)}
        ${cl[0] ? `<div class="k sec">From the clans' memory</div>${cl.flatMap(c => c.hist).sort((a, b) => b.w - a.w).slice(0, 10).map(h => `<div class="ev"><span class="yr">Y${yr(h.w)}</span>${esc(h.t)}</div>`).join('')}` : ''}`;
    } else if (panel === 'house') {
      const P = W.player;
      if (!P) html = '<div class="lede">You are watching without a house. Open the menu and start a new world to choose one.</div>';
      else {
        const h = P.head, alive = h.alive && h.clan, mem = SIM.dynMembers(W), BC = SIM.bloodCount(W);
        const story = () => `<div class="card"><div class="muted">${SIM.legacyHTML(SIM.legacy(W))}</div></div><div class="k sec">Heads of the house</div>${P.heads.map(x => `<div class="row2"><b>${esc(x.name)}</b> <span class="muted">year ${yr(x.from)} to ${x.to ? yr(x.to) : 'now'}${x.titles.length ? ', ' + x.titles.join(', ') : ''}</span></div>`).join('')}
          <div class="k sec">The saga of the house</div>${P.hist.length ? (() => { const by = new Map(); for (const e of P.hist.slice(-160)) { const y = yr(e.w); if (!by.has(y)) by.set(y, []); by.get(y).push(e.t); } return [...by.entries()].reverse().map(([y, ts]) => `<div class="ev"><span class="yr">Year ${y}</span>${iconize(esc(ts.join(' ')))}</div>`).join(''); })() : '<div class="muted">Nothing yet.</div>'}`;
        html = `<div class="ph">${!P.over && P.head && P.head.alive && P.head.clan ? ART.faceImg(P.head, P.head.clan.tribe.hue, 58, 'hd', true) : ''}<b>House of ${esc(P.house)}</b><span class="muted">${P.over ? 'ended' : `${Math.round(P.renown)} renown, ${P.heads.length} generation${P.heads.length === 1 ? '' : 's'}`}</span></div>`;
        if (!alive) html += '<div class="lede">The house has no living head.</div>' + story();
        else {
          const c = h.clan, t = c.tribe, heir = SIM.clanHeir(W, c, h), F = SIM.FAITHS[SIM.faithOf(t)], fd = SIM.foodDays(c), matri = SIM.isMatri(t);
          const foodCol = c.cond > 0.85 ? '#476428' : c.cond > 0.7 ? '#8a5a10' : '#a83a22', tt = titlesFor(h);
          html += `<div class="lede"><b>${esc(h.name)}</b>, ${Math.floor(h.age)}${tt.length ? ', ' + tt.join(' and ') : ''}. ${link(c, c.name)} clan of ${link(t, 'the ' + t.name)}${t.confed ? `, in ${esc(t.confed.name)}` : ''}.</div>`;
          // what needs your attention
          const al = [], alTx = [], alert = (cls, txt) => { al.push(`<div class="alert ${cls}">${txt}</div>`); alTx.push(txt); };
          if (c.cond < 0.7) alert('', `Your clan is going hungry. Food for ${fd} days.`); else if (c.cond < 0.85) alert('warn', `Food is short: ${fd} days left.`);
          { const fw = c.people.filter(q => q.sex === 'F' && !q.slave && q.age >= 16 && q.age < 45).length; if (fw <= 2 && SIM.freeCount(c) < 30) alert('warn', `Only ${fw || 'no'} wom${fw === 1 ? 'a' : 'e'}n of childbearing age in the clan. Invite a household to join, or marry your sons.`); }
          { const F0 = SIM.clanFlow(W, 1); if (F0.splitAt && F0.free >= F0.splitAt - 4) alert('warn', `The clan is close to splitting: ${F0.free} people, and it splits above ${F0.splitAt}.${c.settled && !(c.works && c.works.hall) ? ' A great hall lets a village grow much larger.' : ''}`); }
          if (!heir) alert('', `No heir in the clan. If ${esc(h.name)} dies, the house ends. Under Act you can call one of the blood home, or adopt a child of the clan.`); else if (heir.age < 15) alert('warn', `Your heir ${esc(heir.name)} is only ${Math.floor(heir.age)}.`);
          const feud = W.clans.filter(o => o !== c && (o.rel.get(c.id) || {}).grudge >= 20 && Math.hypot(o.x - c.x, o.y - c.y) < 60000);
          if (feud.length) alert('', `Blood is owed: the ${feud.slice(0, 2).map(o => esc(o.name)).join(' and the ')} clan${feud.length > 1 ? 's' : ''} may seek revenge. You can settle it under Dealings.`);
          const riv = (P.claims || []).filter(k => W.clans.some(o => o.claim === k.d && o !== c && SIM.dealMode(W, o) === 'keep'));
          if (riv.length) alert('warn', `Unwelcome rivals are working your ${[...new Set(riv.map(k => DEPOSITS[k.d.type].name.toLowerCase()))].join(' and ')}.`);
          if (t.confed && t.confed.king === h && t.confed.wars.size) alert('warn', 'Your realm is at war.');
          if (c.guardUntil > W.week) alert('ok', 'Guards are posted around the camp.');
          if (P.quietUntil && P.quietUntil > W.week) alert('', `Keeping the quiet after the sign: ${(n => n + (n > 1 ? ' yrs' : ' yr'))(Math.max(1, Math.ceil((P.quietUntil - W.week) / 52)))} left. No raid, expedition, voyage, trading journey, migration or new claim until then.`);
          if (P.omenIgnored) alert('', `${esc(P.omenIgnored.by)} waved a sign away. If a bad year comes before year ${Math.ceil(P.omenIgnored.until / 52)}, the clan will blame the house.`);
          for (const b of W.beasts || []) if (b.alive && (b.name || b.kills) && Math.hypot(b.x - c.x, b.y - c.y) < (SIM.BEASTS[b.kind].sea ? 75000 : 45000)) { const nm = SIM.beastNm(b); alert(b.kills ? 'warn' : '', `${esc(nm[0].toUpperCase() + nm.slice(1))}${b.name ? ', ' + SIM.BEASTS[b.kind].a + ',' : ''} is ${Math.round(Math.hypot(b.x - c.x, b.y - c.y) / 1000)} km from your ${c.settled ? 'village' : 'camp'}${b.kills ? ` and has killed ${b.kills}` : ''}. Under Act you can hunt it${c.shun && c.shun.id === b.id && c.shun.until > W.week ? '; its ground is forbidden to the clan for now' : ''}.`); }
          if (t.blessing && t.blessing.until > W.week) alert('ok', `The tribe is blessed: ${esc(F.boon.split(':')[0].toLowerCase())}.`);
          const strip = !wide() && houseTab === 'overview'; // on the phone the Overview opens with a strip that carries the top warning, and lists the rest below it
          const foodLow = foodState(c).cls !== 'good'; // under 0.85 fed: the same line as the alert
          if (!strip) html += al.length ? `<div class="alerts">${al.join('')}</div>` : '';
          if (!P.over && wide()) html += `<button class="actbig" data-act>Choose a deed</button>`;
          const tabs = [['overview', 'Overview'], ['deal', 'Dealings'], ['family', 'Family'], ['clan', `Clan ${SIM.freeCount(c)}`], ['tribe', `Tribe ${SIM.tribeSize(t)}`], ['story', 'Story']];
          if (t.confed) tabs.splice(5, 0, ['realm', 'Realm']);
          if (!tabs.some(x => x[0] === houseTab)) houseTab = 'overview';
          html += `<div class="tabs2">${tabs.map(([k, l]) => `<button data-htab="${k}" class="${k === houseTab ? 'on' : ''}">${l}</button>`).join('')}</div>`;
          if (houseTab === 'overview') {
            const ch = c.head, hm = t.headman;
            if (strip) html += houseStrip(h, c, t, heir, alTx, foodLow) + (al.length ? `<div class="alerts">${al.join('')}</div>` : '');
            { const adv = SIM.advice(W); if (adv) { const rg = SIM.ring(W), sp = rg.find(r => r.role === 'lore') || rg[0], first = (adv.text.match(/^.*?[.!?](?=\s|$)/) || [adv.text])[0], rest = adv.text.slice(first.length), dl = adv.deed ? ` <button class="lnk" data-act="${esc(String(adv.deed))}">Open deeds</button>` : '';
              html += sp ? `<div class="says adv${advOpen ? ' open' : ''}" data-adv>${ART.faceImg(sp.q, c.tribe.hue, phone() ? 44 : 64)}<div class="bubble"><span class="who">${esc(sp.q.name)}</span>${iconize(esc(first))}<span class="a2">${iconize(esc(rest))}${dl}</span></div></div>` : `<div class="counsel"><span class="k">Counsel</span>${iconize(esc(adv.text))}${dl}</div>`; }
              const am = (P.amb || []).filter(a => !a.done), done = (P.amb || []).filter(a => a.done).slice(-2), tr = (h.traits || []).map(k => SIM.TRAITS[k]);
              html += `<div class="k sec" style="margin-top:4px">${esc(h.name)}${tr.length ? ' ' + esc(tr[0].name) : ''}</div>${tr.length ? `<div class="muted" style="margin:-2px 0 6px">${tr.map(x => esc(x.does)).join('. ')}.${P.lineage ? ` Of the line of ${esc((P.lineageOf || []).join(' and '))}, told of at the fires: standing +${P.lineage.toFixed(2)} for all of the blood.` : ''}</div>` : ''}` +
                am.map(a => `<div class="row2"><span class="amb"></span>${esc(a.text)} <span class="muted" style="margin-left:auto">+${a.r} renown</span></div>`).join('') + done.map(a => `<div class="row2 muted"><span class="amb done"></span>${esc(a.text)} <span style="margin-left:auto">done by ${esc(a.by)}</span></div>`).join(''); }
            { const cs0 = P.cast || {}, rowC = (q, kind, since) => q && q.alive && q.fam && h.fam ? `<div class="row2">${link(q, q.name)} <span class="muted">${kind}, ${esc(q.clan.name)} clan, these ${Math.max(1, Math.floor((W.week - (since || W.week)) / 52))} years</span><span style="margin-left:auto;width:70px">${bar((SIM.opinion(q.fam, h.fam) + 100) / 200, kind === 'your enemy' ? '#e0584a' : '#5fc46a')}</span></div>` : '';
              const rows = rowC(cs0.friend, 'your friend', cs0.friendSince) + rowC(cs0.rival, 'your enemy', cs0.rivalSince); if (rows) html += `<div class="k sec" style="margin-top:8px">People in your life</div>${rows}`; }
            if (c.treasures && c.treasures.length) html += `<div class="k sec" style="margin-top:8px">Treasures of the ${esc(c.name)}</div><div class="muted" style="margin-bottom:4px">Each one raises the standing of whoever leads the clan (+0.05, up to three). Raiders want them. Under Act you can give one away.</div>${c.treasures.map(tr => `<div class="myth"><b>${esc(tr.name[0].toUpperCase() + tr.name.slice(1))}</b><div class="muted">${esc(tr.hist.map((x, i) => i ? x : x[0].toUpperCase() + x.slice(1)).join('; '))}.</div></div>`).join('')}`;
            html += `<div class="k sec" style="margin-top:8px">Stores</div><div class="tiles">
                <div class="tile"><div class="k">Food</div><div class="v" style="color:${foodCol}">${fd} day${fd === 1 ? '' : 's'}</div><div class="muted">${c.grain > 0 ? (() => { const gw = Math.round(c.grain / Math.max(1, SIM.needsWeek(c))); return gw < 1 ? 'less than a week of grain, ' : `${gw} week${gw === 1 ? '' : 's'} of grain, `; })() : ''}${pct(c.cond)} fed</div>${bar(c.cond, foodCol)}</div>
                <div class="tile"><div class="k">Tools</div><div class="v">${c.tool >= 1.15 ? 'Bronze' : c.tool >= 1 ? 'Copper' : c.tool > 0.8 ? 'Good flint' : c.tool > 0.55 ? 'Fair stone' : 'Poor stone'}</div><div class="muted">${pct(c.tool)} as good as fine flint</div>${bar(c.tool / 1.2, '#cfd6e0')}</div>
              </div>
              <div style="margin-top:8px">${goodsChips(c.goods)}</div>
              ${(P.claims || []).length ? `<div class="k sec">Sources your house works</div>` + P.claims.map((k, i) => `<div class="row2">${depIc(k.d.type)}<b>${DEPOSITS[k.d.type].name}</b> <span class="muted">${esc(k.d.note)}, ${Math.round(Math.hypot(k.d.x - c.x, k.d.y - c.y) / 1000)} km away. ${k.got || 0} brought back since year ${yr(k.since)}${k.trouble ? `, <span style="color:#a83a22">${k.trouble} trips driven off</span>` : ''}</span> <a data-release="${i}" style="margin-left:auto;cursor:pointer;color:#a03a20">give up</a></div>`).join('') : ''}
              <div class="k sec">Standing</div><div class="tiles">
                <div class="tile"><div class="k">Heir</div><div class="v">${heir ? esc(heir.name) : 'None'}</div><div class="muted">${heir ? `${SIM.relWord(heir, h)}, ${Math.floor(heir.age)}` : 'the line is at risk'}</div></div>
                <div class="tile"><div class="k">Of the blood</div><div class="v">${c.people.filter(q => q.dyn).length} <span class="muted" style="font-size:13px">in your clan</span></div><div class="muted">${BC.tribe} of the blood in your tribe (${BC.all} across the isles). Only those in your clan can inherit</div></div>
                <div class="tile"><div class="k">${matri ? 'Clan mother' : 'Clan head'}</div><div class="v">${ch ? esc(ch.name) + (ch === h ? ' (you)' : '') : 'None'}</div><div class="muted">${SIM.freeCount(c)} people, ${SIM.warriors({ clans: [c] })} spears${ch && ch !== h ? ` · standing ${SIM.prestige(ch).toFixed(2)}, yours ${SIM.prestige(h).toFixed(2)}` : ch === h ? ` · standing ${SIM.prestige(h).toFixed(2)}` : ''}</div></div>
                <div class="tile"><div class="k">${hm ? titleWord(hm, 'headman')[0].toUpperCase() + titleWord(hm, 'headman').slice(1) : 'Headman'}</div><div class="v">${hm ? esc(hm.name) + (hm === h ? ' (you)' : '') : 'None'}</div><div class="muted">${SIM.tribeSize(t)} people in ${t.clans.length} clan${t.clans.length > 1 ? 's' : ''}${hm && ch && hm.clan !== c ? ` · weight ${SIM.leadWeight(hm).toFixed(2)}, your clan's ${SIM.leadWeight(ch).toFixed(2)}` : ''}</div></div>
              </div>
              <div class="k sec">Way of life</div><div class="tiles">
                <div class="tile"><div class="k">Livelihood</div><div class="v">${SIM.STAGES[t.stage]}</div>${bar(Math.min(1, t.dom / 0.55), '#d7af3c')}<div class="muted">${(() => { const g = SIM.grainInfo(W, c), pc = Math.round(Math.min(1, t.dom / 0.55) * 100); return g.state === 'farm' ? 'settled farmers' : g.state === 'sown' ? `sowing their own fields · ${pc}% of the way to farming` : g.state === 'at' ? `wild grain grows within reach of the camp · ${pc}% of the way to farming` : g.state === 'trip' ? `your people walk ${g.km} km ${g.dir} to reap wild grain each summer · ${pc}%. Camp beside it to learn faster` : g.state === 'far' ? (g.reach ? `the wild grain you know of is ${g.km} km ${g.dir}: too far to reap. Move camp to within 50 km` : `the wild grain you know of lies across the sea, ${g.km} km ${g.dir}`) : 'no wild grain known. Explore, or learn sowing from farming neighbours'; })()}</div></div>
                <div class="tile"><div class="k">Boats</div><div class="v">${SIM.BOAT_STAGES[SIM.boatStage(t)]}</div>${bar(t.boats, '#6fb3e0')}</div>
                <div class="tile"><div class="k">Weapons</div><div class="v">${SIM.weaponsName(t)}</div>${bar(t.flintW || 0, '#cfd6e0')}</div>
                <div class="tile"><div class="k">Faith</div><div class="v">${faithIc(t, 18)}${F.name}</div><div class="muted">${matri ? 'clan mothers lead' : 'men lead'}</div></div>
              </div>
              <label class="setline"><input type="checkbox" id="askAll" ${P.askAll ? 'checked' : ''}> <span>Ask me about every marriage. Otherwise sons and daughters are matched with friendly clans.</span></label>`;
          } else if (houseTab === 'family') {
            // the whole of the blood in the clan, grouped by how each stands to the head: the same people stay on this page when the head marries or dies, only their place changes
            const here = c.people.filter(q => q !== h && !q.slave && q.alive), isCh = q => q.father === h || q.mother === h, isSib = q => !!((h.father && q.father === h.father) || (h.mother && q.mother === h.mother)), kidOf = (q, f) => !!((q.father && f(q.father)) || (q.mother && f(q.mother)));
            const seen = new Set([h]), grp = (title, list) => { const L = list.filter(q => !seen.has(q)); L.forEach(q => seen.add(q)); return L.length ? `<div class="k sec">${title} (${L.length})</div>` + L.sort((a, b) => b.age - a.age).slice(0, 30).map(q => personLine(q)).join('') : ''; };
            const wives = c.people.filter(q => q.spouse === h || h.spouse === q), away = mem.filter(q => q.alive && q.clan !== c).length, living = W.clans.reduce((n, o) => n + o.people.filter(q => q.father === h || q.mother === h).length, 0), sl = SIM.houseSlaves(W);
            html += `<div class="lede">${esc(h.name)} has had <b>${h.kids || 0}</b> child${(h.kids || 0) === 1 ? '' : 'ren'}, <b>${living}</b> living.${wives.length ? ` ${h.sex === 'F' ? 'Husband' : wives.length > 1 ? 'Wives' : 'Wife'}: ${wives.map(q => `${esc(q.name)}${q.sex === 'F' ? ` (${q.kids || 0} born)` : ''}`).join(', ')}.` : ''}</div>
              <div class="muted" style="margin:2px 0 6px">The house is everyone of ${esc(P.house)}'s blood, and it stays the same house when its head changes. ${heir ? `If ${esc(h.name)} dies, ${esc(heir.name)} (${esc(SIM.relWord(heir, h))}, ${Math.floor(heir.age)}) leads it.` : 'There is no heir in the clan yet.'}${away ? ` ${away} more of the blood live in other clans.` : ''}</div>
              ${(grp(h.sex === 'F' ? 'Husband' : wives.length > 1 ? 'Wives' : 'Wife', wives) + grp('Children', here.filter(isCh)) + grp('Grandchildren', here.filter(q => kidOf(q, isCh))) + grp('Parents', here.filter(q => q === h.father || q === h.mother)) + grp('Brothers and sisters', here.filter(isSib)) + grp('Their children', here.filter(q => kidOf(q, isSib))) + grp('Others of the blood in the clan', here.filter(q => q.dyn))) || '<div class="muted">No family in the clan.</div>'}
              ${sl.length ? `<div class="k sec">Slaves of the house (${sl.length})</div><div class="muted" style="margin-bottom:4px">They belong to men of your blood and pass to the heir. They are not counted in the clan or tribe, cannot fight or marry, and may escape.</div>` + sl.slice(0, 30).map(q => personLine(q)).join('') : ''}`;
          } else if (houseTab === 'deal') html += dealingsTab();
          else if (houseTab === 'clan') html += clanMakeup(h);
          else if (houseTab === 'tribe') html += tribeMakeup(h);
          else if (houseTab === 'realm' && t.confed) html += realmTab(h, t.confed);
          else html += story();
        }
      }
    } else if (panel === 'confed') {
      const cf = sel, ts = SIM.confedTribes(W, cf), k = cf.king, cap = cf.capital, R = realmInfo(cf), rw = rulerWord(cf, k);
      const heir = k && cap.clans.flatMap(c => c.people).filter(q => q.alive && q.sex === 'M' && q.father === k).sort((a, b) => b.age - a.age)[0];
      html = `<div class="ph"><span class="dot" style="background:hsl(${cf.hue},75%,60%)"></span><b>👑 ${esc(cf.name.replace(/^the /, 'The '))}</b><span class="muted">${realmWord(cf)} since year ${yr(R.kind === 'kingdom' && R.kingdomSince ? R.kingdomSince : R.since)}</span></div>
        <div class="tiles">
          <div class="tile"><div class="k">${esc(rw)}</div><div class="v">${esc(k.name)}</div><div class="muted">${Math.floor(k.age)} · of the ${link(cap, cap.name)}</div>${bar(Math.min(1, SIM.prestige(k)), '#e0c060')}</div>
          <div class="tile"><div class="k">Heir</div><div class="v">${heirTile(R, heir)[0]}</div><div class="muted">${heirTile(R, heir)[1]}</div></div>
          <div class="tile"><div class="k">People</div><div class="v">${SIM.confedPeople(W, cf)}</div><div class="muted">${ts.length} tribes · ${ts.reduce((s, t) => s + SIM.warriors(t), 0)} warriors</div></div>
        </div>
        ${heldBlock(cf, R)}
        <div class="k sec">Member tribes</div>` +
        ts.map(t => { const m = cf.members.get(t.id), op = t === cap ? 100 : SIM.opinion(t, cap); return `<div class="card"><div class="rh">${link(t, 'the ' + t.name)}<span class="badge">${m.status === 'core' ? '👑 heartland' : m.status === 'subject' ? '⛓ subject' : 'ally'}</span></div>
          ${t !== cap ? `<div class="mini"><span>loyalty</span><div class="rbar"><i style="left:${op < 0 ? 50 + op / 2 : 50}%;width:${Math.abs(op) / 2}%;background:${opCol(op)}"></i></div></div>` : ''}
          <div class="muted">${SIM.tribeSize(t)} people · joined year ${yr(m.joined)}${t === cap ? '' : m.status === 'subject' ? ' · pays tribute' : ' · sends a light tribute'}</div></div>`; }).join('') +
        `<div class="k sec">Wars</div>${cf.wars.size ? [...cf.wars.keys()].map(id => W.ents.get(id)).filter(Boolean).map(t => `<div class="row2">⚔ ${link(t, 'the ' + t.name)} <span class="muted">${SIM.warriors(t)} warriors${R.warText && R.warText[t.id] ? ' · ' + (R.warFrom && R.warFrom[t.id] != null ? 'since year ' + yr(R.warFrom[t.id]) + '; ' : '') + esc(R.warText[t.id]) : ''}</span></div>`).join('') : '<div class="muted">At peace.</div>'}
        <div class="k sec">Rulers</div><div class="muted">${cf.kings.map(esc).join(' → ')}</div>
        <div class="k sec">Chronicle of the confederacy</div>${histList(cf, 20)}`;
    } else if (panel === 'clan') {
      const c = sel, need = SIM.needsWeek(c), last = c.last, fams = SIM.familiesOf(c), i = SIM.cellAt(c.x, c.y);
      const condCol = c.cond > 0.85 ? '#5fc46a' : c.cond > 0.7 ? '#e0b84a' : '#e0584a';
      const own = nearbyDeposits(c.x, c.y, FORAGE_R + 6000).filter(d => d.type === 'flint' || d.type === 'axe');
      html = crumbs() + `<div class="ph"><span class="dot" style="background:${clanCol(c)}"></span><b>${esc(c.name)} clan</b><span class="muted">of ${link(c.tribe, 'the ' + c.tribe.name)}</span><span class="muted">camp in ${BIOMES[W.biome[i]].name.toLowerCase()} · since year ${yr(c.founded)}${c.atGathering ? ' · at the gathering' : ''}</span></div>
        <div class="grid2">
          <div><div class="k">People</div><div class="v">${c.people.length}</div><div class="muted">${demoStats(c.people)}</div></div>
          <div><div class="k">Fed (rolling)</div><div class="v" style="color:${condCol}">${pct(c.cond)}</div>${bar(c.cond, condCol)}</div>
          <div><div class="k">Stone tools</div><div class="v">${pct(c.tool)}</div>${bar(c.tool, '#cfd6e0')}<div class="muted">${own.length ? `quarry their own ${own.map(d => DEPOSITS[d.type].name.toLowerCase()).join(' & ')}` : c.tool > 0.5 ? 'stone obtained by trade' : 'poor local stone — need flint'}</div></div>
          <div><div class="k">Food stored</div><div class="v">${(c.store / (need / 7)).toFixed(1)} days</div><div class="muted">range holds ${c.supply.toFixed(1)}× needs</div></div>
        </div>
        ${c.tribe.stage >= 1 || c.grain > 0 || c.settled ? `<div class="tiles"><div class="tile"><div class="k">${c.settled ? (c.live === 'fishing' ? 'Fishing village' : 'Village') : 'Way of life'}</div><div class="v">${c.settled ? (() => { const S = (W.settlements || []).find(s => s.clans && s.clans.includes(c)); return S ? link(S, S.name) : esc(c.village); })() : SIM.STAGES[c.tribe.stage]}</div><div class="muted">${c.settled ? 'permanent settlement' : c.toSettle ? 'moving to found a village' : ''}</div></div><div class="tile"><div class="k">Grain stores</div><div class="v">${Math.round(c.grain / Math.max(1, SIM.needsWeek(c) / 7))} days</div><div class="muted">${c.lastCrop ? `last harvest ${Math.round(c.lastCrop / 1e6)}M kcal` : ''}</div></div><div class="tile"><div class="k">${c.settled && sows(c) ? 'Field soil' : 'Cereal in diet'}</div><div class="v">${c.settled && sows(c) ? pct(c.soil == null ? 1 : c.soil) : pct(c.cereal)}</div><div class="muted">men ~${SIM.statureCm(c)[0]} cm</div></div></div>${fieldsTile(c)}` : ''}
        ${c.settled ? (() => { const V = SIM.villageInfo(W, c), cr = V.people;
          return `<div class="k sec">The village</div><div class="tiles">
            <div class="tile"><div class="k">Standing</div><div class="v">${V.rankName}</div><div class="muted">${V.rank < 4 ? ['', 'grows into a village at 28 people with a craftsman', 'a large village needs 65 people and two crafts', 'a town needs 110 people, three crafts and a hall or granary'][V.rank] : 'the greatest kind of settlement'}</div></div>
            <div class="tile"><div class="k">Works</div><div class="v">${V.works.length ? V.works.map(w => esc(w.name)).join(', ') : 'None'}</div><div class="muted">${V.walls > 1 ? `defenders fight ${Math.round((V.walls - 1) * 100)}% harder behind the walls` : 'open to raiders'}</div></div>
            <div class="tile"><div class="k">Craftsmen</div><div class="v">${cr.length || 'None'}</div><div class="muted">${cr.length ? Object.entries(V.jobs).map(([j, n]) => `${n} ${j}${n > 1 ? 's' : ''}`).join(', ') + ' · ' + cr.slice(0, 4).map(x => `${esc(x.q.name)} the ${x.job}`).join(', ') + (cr.length > 4 ? ' and others' : '') : 'craftsmen appear when a village has stood two years and eats well'}${V.clay ? ' · clay to hand' : ' · no potter\'s clay near'}</div></div>
          </div>`; })() : ''}
        <div class="k sec">Leadership</div>${ruleTile(c)}
        <div class="k sec">Food in range right now</div>${dietBar(c)}
        <div class="k sec">Goods held</div><div>${goodsChips(c.goods)}</div>
        ${last ? `<div class="muted" style="margin-top:6px">Last year: ${last.births} born · ${last.deaths} died${last.starv ? ` (${last.starv} hunger)` : ''}${last.killed ? ` (${last.killed} killed)` : ''} · ${pct(last.fed)} of food needs met</div>` : ''}
        <div class="k sec">Households (${fams.length})</div>` +
        fams.map(f => { const mem = c.people.filter(q => q.fam === f); return `<div class="row2">${link(f, famLabel(f))} <span class="muted">${mem.length} people${f.head ? ` · head ${esc(f.head.name)}` : ''}</span></div>`; }).join('') +
        `<div class="k sec">Relations with other clans</div>${relRows(c, 'clan')}
        <div class="k sec">Clan history</div>${histList(c, 14)}` + pyramidHTML();
      pyr = c.people;
    } else if (panel === 'family') {
      const f = sel, mem = f.clan ? f.clan.people.filter(q => q.fam === f).sort((a, b) => b.age - a.age) : [];
      html = crumbs() + `<div class="ph"><b>${famLabel(f)}</b><span class="muted">${mem.length} people · household since year ${yr(f.founded)}</span></div>` + mem.map(personLine).join('') +
        `<div class="k sec">Relations with other households</div>${relRows(f, 'family', 6)}<div class="k sec">Household history</div>${histList(f, 10)}`;
    } else if (panel === 'person') {
      const q = sel, kids = q.clan.people.filter(k => k.mother === q || k.father === q);
      html = crumbs() + personLine(q) +
        `<div class="grid2" style="margin-top:6px"><div><div class="k">Temper</div>${bar(q.temper, '#e07a5a')}</div><div><div class="k">Foraging skill</div>${bar(q.skill, '#6ab0e0')}</div>
         <div><div class="k">Prestige</div>${bar(SIM.prestige(q), '#e0c060')}</div><div><div class="k">Children born</div><div class="v">${q.kids}</div></div></div>
        <div class="k sec">Family</div><div class="muted">Mother: ${q.mother ? esc(q.mother.name) + (q.mother.alive ? '' : ' †') : 'unknown'} · Father: ${q.father ? esc(q.father.name) + (q.father.alive ? '' : ' †') : 'unknown'}</div>
        ${kids.length ? `<div class="muted">Living children in camp: ${kids.map(k => esc(k.name) + ' (' + Math.floor(k.age) + ')').join(', ')}</div>` : ''}`;
    } else if (panel === 'site') {
      const s = sel, users = [...s.users.entries()].map(([id, n]) => [W.ents.get(id), n]).filter(x => x[0]).sort((a, b) => b[1] - a[1]);
      const i = SIM.cellAt(s.x, s.y);
      html = `<div class="ph"><span class="dot" style="background:#8a6a10"></span><b>${esc(s.name)}</b><span class="muted">gathering place since year ${yr(s.founded)} · ${BIOMES[W.biome[i]].name.toLowerCase()}${W.isRiver[i] ? ', on a river' : W.coast[i] ? ', on the shore' : ''}</span></div>
        <div class="grid2"><div><div class="k">Gatherings held</div><div class="v">${s.gatherings}</div></div><div><div class="k">Renown</div><div class="v">${s.prestige.toFixed(1)}</div>${bar(s.prestige / 50, '#f3cf6a')}</div>
        <div><div class="k">Last gathering</div><div class="v">${s.lastYear ? 'Year ' + s.lastYear : '—'}</div><div class="muted">${s.lastPeople ? s.lastPeople + ' people' : ''}</div></div>
        <div><div class="k">Nearby stone & goods</div><div>${nearbyDeposits(s.x, s.y, 30000).map(d => `<span class="chip">${depIc(d.type)}${DEPOSITS[d.type].name}</span>`).join('') || '<span class="muted">none</span>'}</div></div></div>
        <div class="k sec">Tribes who gather here</div>${users.map(([t, n]) => `<div class="row2">${link(t, 'the ' + t.name)} <span class="muted">${n} summer${n === 1 ? '' : 's'}</span></div>`).join('') || '<div class="muted">None yet.</div>'}
        <div class="k sec">Remembered gatherings</div>${histList(s, 16)}`;
    } else if (panel === 'cell' && selCell != null) {
      const i = selCell;
      if (!W.land[i]) {
        html = `<div class="ph"><b>Sea</b><span class="muted">${W.shelf[i] ? 'shallow coastal waters' : 'open sea'} · ${Math.round(-W.elev[i])} m deep</span></div>${W.shelf[i] ? `<div class="grid2"><div><div class="k">Inshore fish</div><div class="v">${Math.round(W.fish[i] / 1000)}k kcal</div><div class="muted">cod, saithe, flatfish within reach of the shore</div></div></div>` : '<div class="muted">Too deep and far for fishing without boats.</div>'}`;
      } else {
        const s = SIM.seasonOf(W.week), T = W.T0[i] + W.amp[i] * SIM.tempOffset(s), silt = 1 - W.sand[i] - W.clay[i], cov = W.grass[i] + W.shrub[i] + W.forest[i];
        const tex = W.om[i] > 9 ? 'peat' : W.chalk[i] ? 'thin chalky soil' : W.clay[i] > 0.35 ? 'clay' : W.sand[i] > 0.6 ? 'sandy' : W.sand[i] > 0.42 ? 'sandy loam' : silt > 0.5 ? 'silt loam' : 'loam';
        const deps = W.depAt.get(i) || [];
        html = `<div class="ph"><b>${BIOMES[W.biome[i]].name}</b><span class="muted">${Math.round(W.elev[i])} m · ${W.lake[i] ? 'lake' : W.isRiver[i] ? 'river valley' : W.coast[i] ? 'coast' : W.slope[i] > 0.2 ? 'steep upland' : 'land'} · ${W.comp[i] === 1 ? 'great isle' : W.comp[i] === 2 ? 'lesser isle' : 'islet'}</span></div>
          ${deps.length ? `<div style="margin-bottom:6px">${deps.map(d => `<span class="chip">${depIc(d.type)}${DEPOSITS[d.type].name} — ${esc(d.note)} (quality ${pct(d.q)})</span>`).join('')}</div>` : ''}
          <div class="grid2">
            <div><div class="k">Climate</div><div class="v">${T.toFixed(0)}°C now</div><div class="muted">summer ${(W.T0[i] + W.amp[i]).toFixed(0)}° · winter ${(W.T0[i] - W.amp[i]).toFixed(0)}° · ${Math.round(W.rainAnn[i])} mm rain</div></div>
            <div><div class="k">Soil</div><div class="v">${tex}</div><div class="muted">${W.depth[i].toFixed(2)} m deep · ${W.om[i].toFixed(1)}% organic · N ${Math.round(W.nit[i])} kg/ha</div></div>
            <div><div class="k">Plant cover</div><div class="v">${pct(Math.min(1, cov))}</div><div class="muted">grass ${pct(W.grass[i])} · shrub ${pct(W.shrub[i])} · trees ${pct(W.forest[i])}${W.forest[i] > 0.1 ? ` (${pct(W.conif[i])} pine)` : ''}</div></div>
            <div><div class="k">Game</div><div class="v">${W.game[i].toFixed(1)} kg/ha</div><div class="muted">${BIOMES[W.biome[i]].game}</div></div>
            ${W.groveType[i] ? `<div><div class="k">Fruit & nuts</div><div class="v">${GROVES[W.groveType[i]]}</div>${bar(W.grove[i] / 0.3, '#d7af3c')}</div>` : ''}
            ${W.isRiver[i] || W.lake[i] ? `<div><div class="k">${W.lake[i] ? 'Lake fish' : 'River fish'}</div><div class="v">${Math.round(W.fish[i] / 1000)}k kcal</div><div class="muted">${W.lake[i] ? 'pike, perch, eel' : 'salmon & trout — big runs in autumn'}</div></div>` : ''}
            ${W.shellK[i] ? `<div><div class="k">Shellfish beds</div><div class="v">${pct(W.shell[i] / W.shellK[i])} of full</div><div class="muted">oysters, mussels, cockles</div></div>` : ''}
          </div>`;
      }
    } else if (panel === 'chart') {
      html = `<div class="ph"><b>History of the isles</b><span class="muted">people (ink) · tribes (blue) · alliances (gold) · confederacies (red)</span></div><canvas id="chart" width="600" height="230"></canvas>`;
    } else if (panel === 'tribes') {
      const ts = W.tribes.filter(t => SIM.knowsTribe(W, t)).sort((a, b) => SIM.tribeSize(b) - SIM.tribeSize(a)), hidden = W.tribes.length - ts.length, sgs = SIM.liveSigns(W), me = W.player && W.player.head.clan ? W.player.head.clan.tribe : null;
      const vs = (W.settlements || []).filter(S => S.clans && S.clans[0] && SIM.knows(W, S.clans[0].x, S.clans[0].y)).sort((a, b) => b.pop - a.pop), gs = W.sites.filter(s => SIM.knows(W, s.x, s.y)).sort((a, b) => b.prestige - a.prestige);
      const stand = t => { if (!me || t === me) return t === me ? '<span class="badge">your tribe</span>' : ''; const o = SIM.opinion(me, t); return SIM.isAllied(me, t) ? `<span style="color:#7a5a10">${SIM.bondWord(W, me, t).replace(/^your /, '')}</span>` : `<span style="color:${opCol(o)}">${o > 15 ? 'friendly' : o < -15 ? 'hostile' : 'neutral'}</span>`; };
      html = `<div class="ph"><b>Peoples you know</b><span class="muted">${hidden ? (sgs.length ? '' : 'There are rumours of others beyond the known lands.') : 'You know every people on the isles.'}</span></div>` +
        (hidden && sgs.length ? sgs.map(g => `<div class="muted" style="margin:2px 0">${g.kind === 'tale' ? `The ${esc(g.name)}, to the ${g.dir}, ${SIM.walkWord(g.km * 1000)} (a trader's tale, year ${yr(g.w)})` : `Signs of strangers to the ${g.dir}, ${SIM.walkWord(g.km * 1000)} (year ${yr(g.w)})`}</div>`).join('') : '') +
        (W.confeds.length ? `<div class="k sec">Confederacies</div>` + W.confeds.filter(cf => SIM.knowsTribe(W, cf.capital)).map(cf => `<div class="row2">${ART.img('crown', 15)}${link(cf, cf.name)} <span class="muted">${rulerWord(cf, cf.king)} ${esc(cf.king.name)}, ${SIM.confedTribes(W, cf).length} tribes, ${SIM.confedPeople(W, cf)} people</span></div>`).join('') : '') +
        (() => { const ks = [...new Set(ts.map(t => t.kult).filter(Boolean))].sort((a, b) => b.n - a.n); if (!ks.length) return '';
          return `<div class="k sec">Cultures and tongues (${ks.length})</div><div class="muted" style="margin-bottom:6px">Peoples who share a tongue trust each other sooner. Speech drifts apart with distance and time.</div>` + ks.map(K => { const mine = me && me.kult === K, first = ts.find(t => t.kult === K), u = me && first ? Math.max(...ts.filter(t => t.kult === K).map(t => SIM.und(me, t))) : null;
            return `<div class="row2"><span class="dot" style="background:hsl(${K.hue},70%,55%)"></span><b>${esc(K.name)}</b> <span class="muted">${ts.filter(t => t.kult === K).length} tribe${ts.filter(t => t.kult === K).length === 1 ? '' : 's'} you know${K.parentName ? `, grew out of ${esc(K.parentName)}` : ''} · ${esc(K.style.motif)}</span> <span style="margin-left:auto;font-size:12px">${mine ? '<span class="badge">your tongue</span>' : u != null ? `<span class="muted">${SIM.speechWord(u)}</span>` : ''}</span></div>`; }).join('') +
            `<div style="margin:8px 0 2px"><button class="lnk" data-kult>${show.kult ? 'Colour the map by tribe again' : 'Colour the map by culture'}</button></div>`; })() +
        `<div class="k sec">Tribes (${ts.length})</div>` + ts.map(t => `<div class="row2"><span class="dot" style="background:hsl(${t.hue},70%,55%)"></span>${link(t, 'the ' + t.name)} <span class="muted">${SIM.tribeSize(t)} people, ${t.clans.length} clan${t.clans.length === 1 ? '' : 's'}${t.kult ? ', ' + esc(t.kult.name) : ''}</span> <span style="margin-left:auto;font-size:12px">${faithIc(t, 15)}${stand(t)}</span></div>`).join('') +
        (vs.length ? `<div class="k sec">Villages (${vs.length})</div>` + vs.slice(0, 25).map(S => `<div class="row2">${ART.img('vhouse', 15)}${link(S, S.name)} <span class="muted">${S.pop} people, ${S.type === 'fishing' ? 'fishing' : S.type === 'mixed' ? 'farming and fishing' : 'farming'}, the ${esc(S.tribe.name)}${S.metal ? (S.metal === 2 ? ', bronze' : ', copper') : ''}</span></div>`).join('') : '') +
        (gs.length ? `<div class="k sec">Gathering places (${gs.length})</div>` + gs.map(s => `<div class="row2">${ART.img('vhearth', 15)}${link(s, s.name)} <span class="muted">${s.gatherings} gatherings, ${s.users.size} tribe${s.users.size === 1 ? '' : 's'}</span></div>`).join('') : '');
    } else {
      const ev = W.events.slice(-40).reverse();
      let tot = 0; for (const c of W.clans) tot += c.people.length;
      html = `<div class="ph"><b>Chronicle of the isles</b><span class="muted">${tot.toLocaleString()} people in ${W.tribes.length} tribes</span></div>` +
        (ev.length ? ev.map(e => `<div class="ev k-${e.kind}" data-id="${e.id ?? ''}"><span class="yr">Y${yr(e.week)}</span>${iconize(esc(e.text))}</div>`).join('') : '<div class="muted">Nothing has happened yet. Tap anything on the map to learn about it.</div>');
    }
    const isTab = ['house', 'log', 'tribes', 'chart'].includes(panel);
    if (isTab) lastTab = panel;
    else html = `<div class="selbar"><button data-back>‹ ${{ house: 'House', log: 'Chronicle', tribes: 'Peoples', chart: 'Chart' }[lastTab] || 'Back'}</button><span class="sp"></span><button data-back title="Close (Esc)">✕</button></div>` + html;
    el.innerHTML = html;
    for (const [id, k] of [['houseBtn', 'house'], ['logBtn', 'log'], ['tribesBtn', 'tribes'], ['chartBtn', 'chart']]) $('#' + id).classList.toggle('on', panel === k);
    el.querySelectorAll('[data-back]').forEach(b => b.onclick = () => closeSel());
    el.querySelectorAll('[data-act]').forEach(ab => ab.onclick = ev => { ev.stopPropagation(); showActions(null, ab.dataset.act || null); });
    el.querySelectorAll('[data-warn]').forEach(w => w.onclick = () => { const a = el.querySelector('.alerts .alert'); if (!a) return; a.scrollIntoView({ block: 'center', behavior: 'smooth' }); a.classList.remove('flash'); void a.offsetWidth; a.classList.add('flash'); });
    el.querySelectorAll('[data-adv]').forEach(a => a.onclick = () => { advOpen = !advOpen; a.classList.toggle('open', advOpen); });
    // a name that heads a row is a target the width of the row
    if (phone()) el.querySelectorAll('.row2, .rel, .pp').forEach(r => { const a = r.querySelector('a[data-e]'); if (!a || r.classList.contains('pp') || r.querySelectorAll('a[data-e]').length > 1) return; const f = [...r.childNodes].find(n => n.nodeType === 1 ? !n.matches('img, .amb') : n.textContent.trim()); if (f === a || (f && f.contains && f.contains(a) && f.firstElementChild === a)) { r.dataset.go = a.dataset.e; r.onclick = ev => { if (ev.target.closest('a, button, input, label')) return; const e = W.ents.get(+r.dataset.go); if (e) open(e, true); }; } });
    if (pyr) drawPyramid(pyr);
    if (panel === 'chart') drawChart();
    el.querySelectorAll('[data-e]').forEach(a => a.onclick = ev => { ev.stopPropagation(); const e = W.ents.get(+a.dataset.e); if (e) open(e, true); });
    el.querySelectorAll('.ev[data-id]').forEach(d => d.onclick = () => { const e = W.ents.get(+d.dataset.id); if (e) open(e, true); });
    el.querySelectorAll('[data-release]').forEach(a => a.onclick = ev => { ev.stopPropagation(); SIM.releaseClaim(W, +a.dataset.release); renderPanel(); });
    { const cb = el.querySelector('#askAll'); if (cb) cb.onchange = () => { W.player.askAll = cb.checked; }; }
    el.querySelectorAll('[data-pol]').forEach(b => b.onclick = () => { SIM.setPolicy(W, b.dataset.pol, b.dataset.v); const st = el.scrollTop; renderPanel(); el.scrollTop = st; });
    el.querySelectorAll('[data-deal]').forEach(b => b.onclick = () => { SIM.setDeal(W, +b.dataset.deal, b.dataset.v); const st = el.scrollTop; renderPanel(); el.scrollTop = st; });
    el.querySelectorAll('[data-kult]').forEach(b => b.onclick = () => { show.kult = !show.kult; const tb = document.querySelector('#togs button[data-s="kult"]'); if (tb) tb.classList.toggle('on', show.kult); renderPanel(); });
    el.querySelectorAll('[data-settle],[data-forgive]').forEach(b => b.onclick = () => { const r = SIM.settleFeud(W, +(b.dataset.settle || b.dataset.forgive), !!b.dataset.forgive); if (r) toast(r); const st = el.scrollTop; renderPanel(); el.scrollTop = st; });
    el.querySelectorAll('[data-htab]').forEach(b => b.onclick = () => { houseTab = b.dataset.htab; renderPanel(); });
    { const key = panel + ':' + (panel === 'house' ? houseTab : tribeTab), same = key === tabsKey; tabsKey = key;
      for (const t2 of el.querySelectorAll('.tabs2')) { // the sub-tab strip sticks to the top of the panel body, fades at the edge that scrolls, and keeps the active tab in view
        const w = document.createElement('div'); w.className = 'tabsw'; t2.parentNode.insertBefore(w, t2); w.appendChild(t2);
        const on = t2.querySelector('button.on'), upd = () => { w.classList.toggle('fl', t2.scrollLeft > 4); w.classList.toggle('fr', t2.scrollLeft + t2.clientWidth < t2.scrollWidth - 4); };
        t2.scrollLeft = same ? tabsX : on ? Math.max(0, on.offsetLeft - (t2.clientWidth - on.offsetWidth) / 2) : 0; upd();
        t2.addEventListener('scroll', () => { tabsX = t2.scrollLeft; upd(); }, { passive: true }); } }
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tribeTab = b.dataset.tab; renderPanel(); $('#panelBody').scrollTop = 0; });
    el.querySelectorAll('.pp[data-p]').forEach(d => d.onclick = () => { let q = null; for (const c of W.clans) { q = c.people.find(p => p.id == d.dataset.p); if (q) break; } if (q) { sel = q; q.kind = 'person'; panel = 'person'; renderPanel(); } });
  }
  function closeSel() { sel = null; selCell = null; panel = lastTab === 'house' && !W.player ? 'log' : lastTab; renderPanel(); $('#panelBody').scrollTop = 0; }
  function drawSpark(t) {
    const c = $('#spark'); if (!c) return; const g = c.getContext('2d'), w = c.width, h = c.height, H = t.popHist;
    g.clearRect(0, 0, w, h); if (H.length < 2) { g.fillStyle = '#6c563c'; g.font = '16px Georgia, serif'; g.fillText('Records begin after a year…', 10, 30); return; }
    const mx = Math.max(...H, 20) * 1.1, X = k => (k / (H.length - 1)) * (w - 50) + 40, Y = v => h - 8 - v / mx * (h - 16);
    g.fillStyle = `hsla(${t.hue},70%,55%,0.25)`; g.beginPath(); g.moveTo(X(0), Y(0)); H.forEach((v, k) => g.lineTo(X(k), Y(v))); g.lineTo(X(H.length - 1), Y(0)); g.fill();
    g.strokeStyle = `hsl(${t.hue},60%,36%)`; g.lineWidth = 3; g.beginPath(); H.forEach((v, k) => k ? g.lineTo(X(k), Y(v)) : g.moveTo(X(k), Y(v))); g.stroke();
    g.fillStyle = '#6c563c'; g.font = '15px system-ui'; g.textAlign = 'right'; g.fillText(Math.round(mx / 1.1), 34, 16); g.fillText('0', 34, h - 6);
    g.textAlign = 'left'; g.fillText(`last ${H.length} yrs`, 44, h - 6);
  }
  function clanMatrix(t) {
    if (t.clans.length < 2) return '<div class="muted">Only one clan.</div>';
    const cs = t.clans.slice(0, 10); let h = '<table class="mx"><tr><td></td>' + cs.map(c => `<th>${esc(c.name.slice(0, 5))}</th>`).join('') + '</tr>';
    for (const a of cs) { h += `<tr><th>${link(a, a.name.slice(0, 7))}</th>`; for (const b of cs) { if (a === b) { h += '<td>·</td>'; continue; } const r = a.rel.get(b.id), o = r ? r.op - r.grudge : 0; h += `<td style="background:${opCol(o, 0.25 + Math.min(0.6, Math.abs(o) / 100))}">${r && r.grudge > 15 ? '🩸' : Math.round(o)}</td>`; } h += '</tr>'; }
    return h + '</table>';
  }
  function drawChart() {
    const c = $('#chart'); if (!c) return; const g = c.getContext('2d'), w = c.width, h = c.height, H = W.history;
    g.clearRect(0, 0, w, h);
    if (H.length < 2) { g.fillStyle = '#6c563c'; g.font = '18px Georgia, serif'; g.fillText('Run the sim for a couple of years…', 20, 40); return; }
    const mp = Math.max(10, ...H.map(d => d.pop)) * 1.1, mt = Math.max(4, ...H.map(d => Math.max(d.tribes, d.allies || 0))) * 1.1, L = 52, B = 24;
    const X = k => L + (k / (H.length - 1)) * (w - L - 10), Y = v => h - B - v * (h - B - 10);
    const line = (f, col, wd) => { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); H.forEach((d, k) => k ? g.lineTo(X(k), Y(f(d))) : g.moveTo(X(k), Y(f(d)))); g.stroke(); };
    line(d => d.tribes / mt, '#2c6a8a', 2); line(d => (d.allies || 0) / mt, '#a8801a', 2); line(d => (d.confeds || 0) * 4 / mt, '#a83a22', 2); line(d => d.pop / mp, '#2f2218', 3);
    g.fillStyle = '#6c563c'; g.font = '16px Georgia, serif'; g.textAlign = 'right'; [0, 0.5, 1].forEach(t => g.fillText(Math.round(mp * t).toLocaleString(), L - 6, Y(t) + 5));
    g.textAlign = 'center'; g.fillText(`year ${Math.round(H[0].year)}`, X(0) + 24, h - 4); g.fillText(`year ${Math.round(H[H.length - 1].year)}`, X(H.length - 1) - 34, h - 4);
  }
  function open(e, focus) {
    sel = e; selCell = null; panel = e.kind; renderPanel(); $('#panelBody').scrollTop = 0; if (sheet === 'peek') setSheet('half');
    if (focus) { const p = e.kind === 'place' ? [e.x, e.y] : e.kind === 'tribe' ? SIM.tribeCenter(e) : e.kind === 'confed' ? SIM.tribeCenter(e.capital) : e.kind === 'family' ? (e.clan ? [e.clan.x, e.clan.y] : null) : [e.x, e.y]; if (p && p[0] != null) centerOn(p[0], p[1], e.kind === 'tribe' ? 0.0012 : 0.0022); }
  }

  // ---------- input ----------
  const pts = new Map(); let gesture = null;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY, x0: e.offsetX, y0: e.offsetY, t: performance.now() }); if (pts.size > 1) gesture = 'pinch'; });
  cv.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    if (pts.size === 1) { cam.ox += e.offsetX - p.x; cam.oy += e.offsetY - p.y; }
    else if (pts.size === 2) { const [a, b] = [...pts.values()], o = a === p ? b : a; const d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(e.offsetX - o.x, e.offsetY - o.y); if (d0 > 0) zoomAt((e.offsetX + o.x) / 2, (e.offsetY + o.y) / 2, d1 / d0); }
    p.x = e.offsetX; p.y = e.offsetY;
  });
  const up = e => { const p = pts.get(e.pointerId); if (!p) return; pts.delete(e.pointerId); if (gesture !== 'pinch' && Math.hypot(p.x - p.x0, p.y - p.y0) < 8 && performance.now() - p.t < 500) tap(p.x, p.y); if (!pts.size) gesture = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  // ---------- picking: everything near the pointer, closest first ----------
  let hover = null;
  function pickAll(sx, sy) {
    const out = [];
    for (const c of W.clans) { if (c.settled || !c._r) continue; const g = grpOf.get(c), [x, y] = g ? [g.x, g.y] : cs(c), d = Math.hypot(x - sx, y - sy); if (d < Math.max(16, (c._r || 4) + 8)) out.push(g ? { e: c.tribe, d, kind: 'tribe', grp: g } : { e: c, d, kind: 'clan' }); }
    for (const s of W.sites) { if (s._sx == null) continue; const [x, y] = toScreen(s.x, s.y), d = Math.hypot(x - sx, y - sy); if (d < 16) out.push({ e: s, d: d + 1, kind: 'site' }); }
    for (const S of W.settlements || []) { if (S._sx == null) continue; const d = Math.hypot(S._sx - sx, S._sy - sy); if (d < Math.max(14, S._r + 4)) out.push({ e: S, d: Math.max(0, d - S._r * 0.5), kind: 'place' }); }
    for (const t of W.tribes) { const M = (mkOf.get(t) || {}).mk; if (M) { const dd = Math.hypot(M[0] - sx, M[1] - sy); if (dd < Math.max(14, M[2] * 0.7 + 4)) out.push({ e: t, d: Math.max(0, dd - M[2] * 0.3), kind: 'tribe' }); } }
    for (const t of W.tribes) { const L = t._lab; if (L && Math.abs(sx - L[0]) < L[2] / 2 && Math.abs(sy - L[1]) < L[3] / 2) out.push({ e: t, d: 0, kind: 'tribe' }); }
    for (const cf of W.confeds) { const L = cf._lab; if (L && Math.abs(sx - L[0]) < L[2] / 2 && Math.abs(sy - L[1]) < L[3] / 2) out.push({ e: cf, d: 0, kind: 'confed' }); }
    for (const d of W.deposits) { if (d._sx == null) continue; const dd = Math.hypot(d._sx - sx, d._sy - sy); if (dd < 14) out.push({ e: d, d: dd + 3, kind: 'deposit' }); }
    for (const m of W.monuments || []) { if (m._sx == null) continue; const dd = Math.hypot(m._sx - sx, m._sy - sy); if (dd < 12) out.push({ e: m, d: dd + 2, kind: 'monument' }); }
    for (const r of W.traders || []) { if (r._sx == null) continue; const dd = Math.hypot(r._sx - sx, r._sy - sy); if (dd < 10) out.push({ e: r, d: dd + 1, kind: 'trader' }); }
    for (const b of W.beasts || []) { if (b._sx == null || !b.alive) continue; const dd = Math.hypot(b._sx - sx, b._sy - sy); if (dd < Math.max(18, b._r + 6)) out.push({ e: b, d: Math.max(0, dd - 6), kind: 'beast' }); }
    // inside a tribe's territory (lowest priority)
    if (!out.length && show.people && !unknownPt(sx, sy)) for (const t of W.tribes) { const H = hull(t.clans.map(cs)), rad = Math.max(7, FORAGE_R * 0.75 * cam.s); blobPath(ctx, H, rad); if (ctx.isPointInPath(sx * (window.devicePixelRatio || 1), sy * (window.devicePixelRatio || 1))) out.push({ e: t, d: 40, kind: 'tribe', area: true }); }
    return out.filter(p => { const e = p.e, x = e.x != null ? e.x : e.clans && e.clans[0] ? (p.kind === 'tribe' ? null : e.clans[0].x) : null; if (p.kind === 'tribe') return SIM.knowsTribe(W, e) && e.clans.some(c => SIM.knows(W, c.x, c.y)); if (p.kind === 'confed') return SIM.knowsTribe(W, e.capital); if (p.kind === 'place') return e.clans && e.clans[0] && SIM.knows(W, e.clans[0].x, e.clans[0].y); return x == null || SIM.knows(W, x, e.y); }).sort((a, b) => a.d - b.d).filter((p, i, a) => p.kind !== 'tribe' || a.findIndex(q => q.kind === 'tribe' && q.e === p.e) === i); // a people's mark, its banner and its joined camps are one choice
  }
  const pickLabel = p => p.kind === 'clan' ? `<b>${esc(p.e.name)} clan</b> <span class="muted">· the ${esc(p.e.tribe.name)} · ${p.e.people.length} people</span>`
    : p.kind === 'tribe' ? `<b>The ${esc(p.e.name)}</b> <span class="muted">· ${p.grp ? p.grp.cl.length + ' camps, ' + p.grp.n + ' people · tribe of' : 'tribe ·'} ${SIM.tribeSize(p.e)} people${p.area ? ' (territory)' : ''}</span>`
    : p.kind === 'confed' ? `<b>${ART.img('crown', 15)}${esc(p.e.name)}</b> <span class="muted">· ${rulerWord(p.e, p.e.king)} ${esc(p.e.king.name)}</span>`
    : p.kind === 'site' ? `<b>${ART.img('vhearth', 16)}${esc(p.e.name)}</b> <span class="muted">gathering place</span>`
    : p.kind === 'place' ? `<b>${esc(p.e.name)}</b> <span class="muted">· ${p.e.type === 'fishing' ? 'fishing village' : p.e.type === 'mixed' ? 'farming & fishing village' : 'farming village'} · ${p.e.pop} people</span>`
    : p.kind === 'trader' ? `<b>${ART.img('trader', 16)}Trader ${esc(p.e.name)}</b> <span class="muted">· from ${esc(p.e.home.village || p.e.home.name)} (${esc(p.e.home.tribe.name)}) ${p.e.leg ? 'heading home from' : 'bound for'} ${esc(p.e.to.village || p.e.to.name)} · carrying ${Object.entries(p.e.pack).map(([g, n]) => n + ' ' + esc(GOOD_NAMES[g].toLowerCase())).join(', ') || (p.e.food ? 'grain' : 'nothing')}</span>`
    : p.kind === 'beast' ? `<b>${esc(capNm(p.e))}</b> <span class="muted">· ${esc(SIM.BEASTS[p.e.kind].a)}${p.e.kills ? ' · has killed ' + p.e.kills : ''}</span>`
    : p.kind === 'monument' ? `<b>${esc(p.e.name)}</b> <span class="muted">· ${esc(p.e.kind)} of the ${esc(p.e.tribeName)} · ${p.e.faith ? 'raised' : 'cut'} in year ${yr(p.e.built)}${p.e.by ? ' by ' + esc(p.e.by) : ''}${p.e.faith ? ' · ' + esc(SIM.FAITHS[p.e.faith].name) : ''}</span>`
    : `<b>${depIc(p.e.type)}${DEPOSITS[p.e.type].name}</b> <span class="muted">${esc(p.e.note)}</span>`;
  const capNm = b => { const nm = SIM.beastNm(b); return nm[0].toUpperCase() + nm.slice(1); };
  // a great beast: what is known of it, what is said of it, and whether your hunters can reach it
  function showBeast(b) {
    const P = W.player, live = P && !P.over && P.head.alive && P.head.clan, c = live ? P.head.clan : null, B = SIM.BEASTS[b.kind], near = c && SIM.beastNear(W, b, c);
    const teller = (c && (c.tribe.myths || []).some(m => m.beast === b.id) ? c.tribe : null) || W.tribes.find(t => (t.myths || []).some(m => m.beast === b.id));
    let text = `${B.a[0].toUpperCase() + B.a.slice(1)}${b.name ? `, named by the ${esc(b.by)} in year ${yr(b.named)}` : ', not yet given a name'}${b.back ? '. The old people say it is the same beast their grandfathers feared, come back' : ''}. First known in year ${yr(b.born)}. ${esc(SIM.beastToll(b, false))}${b.hunts ? ` ${b.hunts} ${b.hunts === 1 ? 'hunt has' : 'hunts have'} failed.` : ''}`;
    if (teller && b.name) text += `<br><br><span class="muted">As the ${esc(teller.name)} tell it:</span><br><i>${esc(SIM.beastTale(W, teller, b))}</i>`;
    const opts = [];
    if (near) { const shun = c.shun && c.shun.id === b.id && c.shun.until > W.week, p0 = Math.round(SIM.beastOdds(W, b, c, false, P.head) * 100), p1 = Math.round(SIM.beastOdds(W, b, c, true, P.head) * 100);
      text += `<br><br>It is ${esc(SIM.beastWhere(b, c))}${shun ? `, and its ground is forbidden to your clan until year ${Math.ceil(c.shun.until / 52)}. Hunting it lifts the ban` : ''}.`;
      const hd = SIM.playerActions(W).find(x => x.id === 'hunt');
      opts.push(hd && hd.ok ? { label: 'Hunt it', hint: `Sending your best hunters: about ${p0}%. Leading the hunt yourself: about ${p1}%`, act: true } : { label: 'Hunt it', off: true, hint: (hd && hd.why) || 'Not possible for now' }); }
    else if (c) text += `<br><br>It is ${Math.round(Math.hypot(b.x - c.x, b.y - c.y) / 1000)} km from your ${c.settled ? 'village' : 'camp'}, too far for your hunters${B.sea && near === false && Math.hypot(b.x - c.x, b.y - c.y) < 75000 ? ' without canoes' : ''}.`;
    opts.push({ label: 'Close' });
    showCard('A great beast', capNm(b), text, opts, k => { const o = opts[k]; closeCard(); if (o && o.act) showActions('hunt'); });
  }
  function openPick(p) { if (p.kind === 'beast') { hidePicker(); showBeast(p.e); return; } if (p.kind === 'trader') { open(p.e.home); hidePicker(); return; } if (p.kind === 'monument') { toast({ title: p.e.name, text: p.e.faith ? `A ${esc(p.e.kind)} of the ${esc(p.e.tribeName)}, raised in year ${yr(p.e.built)}${p.e.by ? ' at the word of ' + esc(p.e.by) : ''}.<br>${esc(SIM.FAITHS[p.e.faith].desc)}` : `Rocks carved with ${esc(p.e.motif || 'spirals')} by ${esc(p.e.by || 'a carver')} of the ${esc(p.e.tribeName)} in year ${yr(p.e.built)}. Every people marks stone in its own way.` }); hidePicker(); return; } if (p.kind === 'deposit') { sel = null; selCell = p.e.cell; panel = 'cell'; renderPanel(); } else open(p.e); hidePicker(); }
  function hidePicker() { $('#picker').style.display = 'none'; }
  function tap(sx, sy) {
    hidePicker();
    if (placePick) return placeTap(sx, sy);
    if (!wide() && sheet === 'full') return setSheet('half'); // tapping the map behind a tall sheet brings the map back
    const all = pickAll(sx, sy), ps = all.filter(p => !p.area);
    if (ps.length === 1 || (ps.length > 1 && ps[1].d - ps[0].d > 7)) return openPick(ps[0]);
    if (ps.length > 1) { // several things under the finger: let the player choose
      const pk = $('#picker'); pk.innerHTML = '<div class="muted" style="padding:2px 6px 4px">Which one?</div>' + ps.slice(0, 7).map((p, k) => `<div class="pick" data-k="${k}">${pickLabel(p)}</div>`).join('');
      pk.style.display = 'block'; const r = pk.getBoundingClientRect();
      pk.style.left = clamp(sx + 12, 6, cv.clientWidth - r.width - 6) + 'px'; pk.style.top = clamp(sy + 12, 6, cv.clientHeight - r.height - 6) + 'px';
      pk.querySelectorAll('.pick').forEach(d => d.onclick = () => openPick(ps[+d.dataset.k]));
      return;
    }
    const [wx, wy] = toWorld(sx, sy);
    if (unknownPt(sx, sy)) { if (sel || panel === 'cell') closeSel(); return toast({ title: 'Unknown country', text: 'Your people have not walked this land, and no one has told you of it.' }); }
    const area = all.find(p => p.area);
    if (area && sel !== area.e) return open(area.e);
    if (sel) return closeSel();                                 // tapping empty ground closes what was open
    if (wx < 0 || wy < 0 || wx >= WORLD || wy >= WORLD || !SIM.knows(W, wx, wy)) { if (panel === 'cell') closeSel(); return; }
    const ci = SIM.cellAt(wx, wy); if (panel === 'cell' && selCell === ci) return closeSel();
    sel = null; selCell = ci; panel = 'cell'; renderPanel(); if (sheet === 'peek') setSheet('half');
  }
  // hover tooltips (mouse)
  cv.addEventListener('pointermove', e => {
    if (placePick) { cv.style.cursor = 'crosshair'; $('#tip').style.display = 'none'; if (placePick.mark && placePick.at) return; hoverPt = toWorld(e.offsetX, e.offsetY); if (placePick.mark && e.pointerType === 'mouse') { const m = $('#pickMsg'); if (m) m.innerHTML = pickLine(hoverPt[0], hoverPt[1]); } return; }
    if (e.pointerType !== 'mouse' || e.buttons) { $('#tip').style.display = 'none'; return; }
    const ps = pickAll(e.offsetX, e.offsetY), p = ps[0] || null; hover = p;
    cv.style.cursor = p && !p.area ? 'pointer' : 'grab';
    const tip = $('#tip');
    if (!p) { tip.style.display = 'none'; return; }
    let extra = '';
    if (p.kind === 'clan') extra = `fed ${Math.round(p.e.cond * 100)}% · tools ${Math.round(p.e.tool * 100)}%${p.e.head ? ` · head ${esc(p.e.head.name)}` : ''}`;
    else if (p.kind === 'tribe') extra = `${p.e.clans.length} camps${p.e.headman ? ` · ${titleWord(p.e.headman, 'headman')} ${esc(p.e.headman.name)}` : ''}${p.e.confed ? ` · ${esc(p.e.confed.name)}` : ''}`;
    else if (p.kind === 'confed') extra = `${SIM.confedTribes(W, p.e).length} tribes · ${SIM.confedPeople(W, p.e)} people`;
    else if (p.kind === 'place') extra = `the ${esc(p.e.tribe.name)} · ${p.e.clans.length} clan${p.e.clans.length > 1 ? 's' : ''}${p.e.metal ? (p.e.metal === 2 ? ' · bronze-casting' : ' · copper-smelting') : ''}`;
    else if (p.kind === 'site') extra = `${p.e.gatherings} gatherings · ${p.e.users.size} tribes`;
    tip.innerHTML = pickLabel(p) + (extra ? `<div class="muted">${extra}</div>` : '') + (ps.length > 1 && !ps[1].area ? `<div class="muted">+${ps.length - 1} more here — click to choose</div>` : '');
    tip.style.display = 'block'; tip.style.left = (e.offsetX + 14) + 'px'; tip.style.top = (e.offsetY + 14) + 'px';
  });
  cv.addEventListener('pointerleave', () => { hover = null; $('#tip').style.display = 'none'; });
  $('#play').onclick = () => { if (modalEv || picking) return; running = !running; $('#play').textContent = running ? '❚❚' : '▶'; };
  $('#skipBtn').onclick = () => { if (!W || picking || modalEv) return; skipping = !skipping; skipFrom = W.week; $('#skipBtn').classList.toggle('on', skipping); if (skipping) { running = false; $('#play').textContent = '▶'; } };
  const setSpeed = i => { speedIx = i; $('#speed').textContent = SPEEDS[speedIx].l; document.querySelectorAll('#speedRow button').forEach(b => { b.classList.toggle('on', +b.dataset.sp === speedIx); b.setAttribute('aria-pressed', +b.dataset.sp === speedIx ? 'true' : 'false'); }); };
  // on the phone the speed is picked straight from a row of four; on a wide screen the button still cycles
  $('#speed').onclick = () => { if (!phone()) return setSpeed((speedIx + 1) % SPEEDS.length); const r = $('#speedRow'); closePops(); setSpeed(speedIx); r.classList.toggle('open'); };
  document.querySelectorAll('#speedRow button').forEach(b => b.onclick = () => { setSpeed(+b.dataset.sp); $('#speedRow').classList.remove('open'); });
  const tabTo = p => { panel = p; sel = null; selCell = null; renderPanel(); $('#panelBody').scrollTop = 0; if (sheet === 'peek') setSheet('half'); };
  $('#chartBtn').onclick = () => tabTo('chart');
  $('#logBtn').onclick = () => tabTo('log');
  $('#tribesBtn').onclick = () => tabTo('tribes');
  $('#houseBtn').onclick = () => { if (!W.player) return tabTo('log'); tabTo('house'); };
  $('#status').onclick = () => { if (W.player) { tabTo('house'); centerOnHouse(); } };
  $('#homeBtn').onclick = () => { closePops(); centerOnHouse(); };
  $('#actBtn').onclick = () => showActions(); window.__act = () => showActions();
  $('#fitBtn').onclick = () => { closePops(); fit(); };
  // the phone's bottom sheet: peek, half, a third stop at 62%, full. A drag on the handle or on a tab row follows the finger and settles on the nearest stop.
  // The map moves with it: the panel grows by so much, the map is panned by half of that, and the point at the middle of the visible map stays there.
  let lastPanelH = null, panelWatch = 0;
  const panelH = () => $('.panel').getBoundingClientRect().height;
  const STOPS = ['peek', 'half', 'mid', 'full'], stopPx = s => s === 'peek' ? 80 + sabPx() : innerHeight * ({ half: 0.42, mid: 0.62, full: 0.82 }[s]);
  const sabPx = () => { const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sab')); return isNaN(v) ? safeBottom() : v; };
  function safeBottom() { const d = document.createElement('div'); d.style.cssText = 'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)'; document.body.appendChild(d); const v = parseFloat(getComputedStyle(d).paddingBottom) || 0; d.remove(); return v; }
  function setSheet(s) { if (phone()) { lastPanelH = panelH(); panelWatch = performance.now() + 700; } sheet = s; expanded = s === 'full'; document.body.classList.toggle('sheet-peek', s === 'peek'); document.body.classList.toggle('sheet-mid', s === 'mid'); document.body.classList.toggle('expanded', s === 'full'); }
  function followPanel(t) { if (t > panelWatch) { lastPanelH = null; return; } if (phone() && lastPanelH != null) { const H = panelH(); cam.oy -= (H - lastPanelH) / 2; lastPanelH = H; } }
  { const pn = $('.panel'); let dr = null, swallow = 0;
    pn.addEventListener('pointerdown', e => { if (!phone() || !e.target.closest('.grab, .tabs, .tabsw')) return; dr = { y0: e.clientY, x0: e.clientX, h0: panelH(), on: false, grab: !!e.target.closest('.grab'), yl: e.clientY, tl: performance.now(), v: 0 }; });
    pn.addEventListener('pointermove', e => {
      if (!dr) return; const dy = e.clientY - dr.y0, dx = e.clientX - dr.x0;
      if (!dr.on) { if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.2) { dr.on = true; try { pn.setPointerCapture(e.pointerId); } catch (x) {} document.body.classList.add('dragging'); lastPanelH = dr.h0; panelWatch = Infinity; } else return; }
      const now = performance.now(); if (now > dr.tl) dr.v = 0.7 * dr.v + 0.3 * (e.clientY - dr.yl) / (now - dr.tl); dr.yl = e.clientY; dr.tl = now;
      document.body.style.setProperty('--sheet', clamp(dr.h0 - dy, stopPx('peek'), innerHeight * 0.84) + 'px');
    });
    const end = e => { if (!dr) return; const d = dr; dr = null;
      if (d.on) { const h = panelH(), proj = h - d.v * 140; let best = 'half'; for (const k of STOPS) if (Math.abs(stopPx(k) - proj) < Math.abs(stopPx(best) - proj)) best = k;
        swallow = performance.now(); document.body.classList.remove('dragging'); document.body.style.removeProperty('--sheet'); lastPanelH = h; panelWatch = performance.now() + 700; setSheet(best); lastPanelH = h; return; }
      if (d.grab && e.type === 'pointerup' && Math.abs(e.clientY - d.y0) < 10) setSheet({ peek: 'half', half: 'mid', mid: 'full', full: 'half' }[sheet]); };
    pn.addEventListener('pointerup', end); pn.addEventListener('pointercancel', end);
    pn.addEventListener('click', e => { if (performance.now() - swallow < 400) { e.stopPropagation(); e.preventDefault(); } }, true); }
  // popovers: map view and menu. Anything opened closes when you tap outside it.
  const closePops = () => { for (const p of document.querySelectorAll('.pop.open')) p.classList.remove('open'); $('#mapMenu').classList.remove('more'); $('#moreBtn').setAttribute('aria-expanded', 'false'); $('#speedRow').classList.remove('open'); for (const b of ['#mapBtn', '#menuBtn', '#noteBtn']) $(b).classList.remove('on'); };
  const togglePop = (id, btn) => { const p = $(id), was = p.classList.contains('open'); closePops(); if (!was) { p.classList.add('open'); $(btn).classList.add('on'); } };
  const sheetToHalf = () => { if (phone() && sheet === 'full') setSheet('half'); }; // the map menu sits above the controls, which a full panel pushes off the screen: bring the panel down first
  $('#mapBtn').onclick = () => { if (!$('#mapMenu').classList.contains('open')) sheetToHalf(); buildLegend(); togglePop('#mapMenu', '#mapBtn'); };
  $('#menuBtn').onclick = () => togglePop('#menu', '#menuBtn');
  $('#noteBtn').onclick = () => { const was = $('#noteList').classList.contains('open'); closePops(); if (!was) { noteList(); $('#noteList').classList.add('open'); $('#noteBtn').classList.add('on'); } };
  $('#moreBtn').onclick = () => { if (phone() && sheet === 'mid') setSheet('half'); sheetToHalf(); const m = $('#mapMenu').classList.toggle('more'); $('#moreBtn').setAttribute('aria-expanded', m ? 'true' : 'false'); if (m) buildLegend(); };
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.pop, .tools, #noteBtn, #speedRow, #speed')) closePops(); if (!e.target.closest('#picker')) hidePicker(); }, true);
  // the help opens with a contents list made from its headings as they stand now, so a new section shows in it by itself
  function openHelp() {
    closePops(); const h = $('#help'), box = h.querySelector('.box'); h.style.display = 'flex';
    const hs = [...box.querySelectorAll('h3')]; let toc = $('#helpToc'); if (toc) toc.remove();
    toc = document.createElement('nav'); toc.id = 'helpToc'; toc.innerHTML = '<b>Contents</b>';
    hs.forEach(x => { const a = document.createElement('a'); a.textContent = x.textContent; a.setAttribute('role', 'button'); a.tabIndex = 0; const go = () => x.scrollIntoView({ block: 'start', behavior: 'smooth' }); a.onclick = go; a.onkeydown = e => { if (e.key === 'Enter') go(); }; toc.appendChild(a); });
    const p0 = box.querySelector('.hhead + p'); if (p0) p0.after(toc); box.scrollTop = 0;
  }
  $('#helpBtn').onclick = openHelp;
  $('#help').addEventListener('click', e => { if (e.target.id === 'help') e.target.style.display = 'none'; });
  $('#saveBtn').onclick = () => { closePops(); saveNow(true); };
  $('#saveFileBtn').onclick = () => { closePops(); saveFile(); };
  $('#loadFileBtn').onclick = () => { closePops(); loadFile(); };
  $('#newBtn').onclick = () => { closePops(); if (picking) return newWorld(Math.floor(Math.random() * 1e9));
    showCard(' ', 'Start a new world?', 'This world, and your house in it, will be lost.', [{ label: 'Start a new world' }, { label: 'Keep playing' }], k => { if (k === 0) { modalEv = null; wasRunning = false; $('#modal').style.display = 'none'; newWorld(Math.floor(Math.random() * 1e9)); } else closeCard(); }); };
  $('#modal').addEventListener('click', e => { if (e.target.id !== 'modal') return; if (performance.now() - cardAt < 600) return; /* the click a phone sends after the tap that opened this card */ if (modalDismiss) modalDismiss(); else { const c = $('#modal .card2'); c.classList.remove('nudge'); void c.offsetWidth; c.classList.add('nudge'); } });
  document.querySelectorAll('#layers button').forEach(b => b.onclick = () => { layer = b.dataset.l; document.querySelectorAll('#layers button').forEach(x => x.classList.toggle('on', x === b)); buildLegend(); dirty = true; });
  document.querySelectorAll('#togs button').forEach(b => b.onclick = () => { const k = b.dataset.s; show[k] = !show[k]; b.classList.toggle('on', show[k]); bgKey = ''; });
  function buildLegend() {
    const ic = (n, t) => `<span>${ART.img(n, 19)}${t}</span>`, sw = (c, t) => `<span><i class="sw" style="background:${c}"></i>${t}</span>`, note = t => `<span class="note">${t}</span>`;
    let h = '';
    if (layer === 'terrain' || layer === 'food' || layer === 'game') {
      h += ['flint', 'amber', 'axe', 'ochre', 'salt', 'copper', 'tin', 'grain'].map(k => ic(k, DEPOSITS[k].name)).join('') + ic('a_whale', 'Whale grounds');
      h += ic('hazel', 'Hazel woods') + ic('apple', 'Crab apples') + ic('cherry', 'Cherry and sloe') + ic('berry', 'Berries') + ic('shell', 'Shellfish beds');
      h += ic('clay', 'Potter\'s clay') + ic('vtent', 'Camp') + ic('vhouse', 'Village') + ic('vpal', 'Palisade') + ic('vditch', 'Ditch and bank') + ic('rockart', 'Carved rocks') + ic('vhearth', 'Gathering place') + ic('stones', 'Stone circle') + ic('barrow', 'Long barrow') + ic('trader', 'Trader') + ic('star', 'Your house');
      h += note('Borders take their tribe\'s colour. A gold ring marks a source your house works.');
      h += note('Deer, boar, aurochs, horses, reindeer, seals and fish show where game is plentiful. They thin out where it is hunted hard.');
      if (layer === 'food') h += sw('#d7af3c', 'Hazel') + sw('#eb6e5a', 'Apple') + sw('#c83c78', 'Cherry, sloe') + sw('#786ee6', 'Berries') + sw('#ff8cc8', 'Shellfish') + sw('#3cc8d2', 'Fishing banks') + sw('#fadc5a', 'Wild grain');
      if (layer === 'game') h += note('Colour shows the weight of game on the land: dark is hunted out, pale is rich.');
    } else if (layer === 'biome') h += sw('#afb4aa', 'Tundra') + sw('#285f55', 'Pine forest') + sw('#4b7d3c', 'Mixed forest') + sw('#3c963c', 'Broadleaf forest') + sw('#becd64', 'Grassland') + sw('#a06ea0', 'Heath') + sw('#786946', 'Bog') + sw('#e6d296', 'Coast');
    else if (layer === 'soil') h += note('Soil nitrogen: brown is poor, green is rich.');
    else if (layer === 'water') h += note('Soil moisture: tan is dry, blue is soaked.');
    else h += note('How hard people have foraged and hunted the land lately: green is untouched, red is worn.');
    $('#legend').innerHTML = h;
  }

  // ---------- the game: choose a house, decision cards ----------
  let wasRunning = false, modalEv = null, picking = false, cardAt = -1e9; // cardAt: when the card on #modal last opened
  function showStart() {
    picking = true; running = false; modalDismiss = null; $('#play').textContent = '▶';
    const C = SIM.houseCandidates(W), gd = W.deposits.find(d => d.type === 'grain');
    const byTribe = new Map(); for (const k of C) { if (!byTribe.has(k.tribe)) byTribe.set(k.tribe, []); byTribe.get(k.tribe).push(k); }
    let html = `<div class="welbtns"><button id="welLoad">Load a game</button><button id="welHelp">How to play</button></div>` + (savedGame && savedGame.meta ? `<div class="pick" id="contBtn" style="margin-bottom:10px;border-color:#7a5a10"><b>Continue the House of ${esc(savedGame.meta.house || '?')}</b> <span class="muted">— year ${savedGame.meta.year}${savedGame.meta.head ? ', led by ' + esc(savedGame.meta.head) : ''}${savedGame.meta.over ? ' (the house has ended)' : ''}</span></div>` : '') + `<h2>Choose your house</h2><p class="muted">You will lead one family line through the generations — its marriages, its feuds, its bids for power. When the head of your house dies, you continue as the heir. If your blood dies out, the game ends.</p>`;
    for (const [t, ks] of byTribe) {
      const c0 = t.clans[0], i = SIM.cellAt(c0.x, c0.y), bi = BIOMES[W.biome[i]].name.toLowerCase();
      const near = []; const [hx, hy] = SIM.tribeCenter(t);
      for (const d of W.deposits) if (Math.hypot(d.x - hx, d.y - hy) < 60000) near.push(depIc(d.type, 15) + (d.type === 'grain' ? 'the wild grain valley' : DEPOSITS[d.type].name.toLowerCase()));
      html += `<div class="tribeblk fold${byTribe.keys().next().value === t ? ' open' : ''}"><div class="rh foldh" role="button" tabindex="0" aria-expanded="${byTribe.keys().next().value === t}"><b style="color:hsl(${t.hue},60%,30%)"><span class="chev">${byTribe.keys().next().value === t ? '▾' : '▸'}</span>The ${esc(t.name)}</b><span class="muted">${SIM.tribeSize(t)} people · ${bi} · ${W.comp[i] === 1 ? 'great isle' : 'lesser isle'}</span></div><div class="foldbody">
        <div class="muted" style="margin:3px 0 1px">${[...new Set(near)].join(' &nbsp; ') || 'No special resources nearby'}</div><div class="muted" style="margin:1px 0 4px">${faithIc(t, 15)}${SIM.FAITHS[SIM.faithOf(t)].name}, ${SIM.isMatri(t) ? 'led by clan mothers' : 'led by men'}</div>` +
        ks.slice(0, 4).map(k => `<div class="pick" data-h="${k.head.id}"><b>House of ${esc(k.head.name)}</b> <span class="muted">— ${esc(k.head.name)}, ${Math.floor(k.head.age)}, of the ${esc(k.clan.name)} clan · ${k.head.sex === 'F' ? 'husband' : 'wife'} ${esc(k.head.spouse.name)} · ${k.kids} child${k.kids === 1 ? '' : 'ren'}${k.clan.head === k.head ? ' · clan head' : ''}</span></div>`).join('') + `</div></div>`;
    }
    html += `<div class="row" style="gap:8px;margin-top:10px"><button id="watchBtn">Just watch the world</button><button id="rerollBtn">Different world</button></div>`;
    const m = $('#modal'); m.querySelector('.card2').innerHTML = html; m.style.display = 'flex';
    m.querySelectorAll('.pick[data-h]').forEach(d => {
      const h = C.find(k => k.head.id == d.dataset.h).head;
      d.onmouseenter = () => { open(h.clan, true); };
      d.onclick = () => { SIM.choosePlayer(W, h); lastSaveWeek = W.week; m.style.display = 'none'; picking = false; running = true; $('#play').textContent = '❚❚'; panel = 'house'; sel = null; renderPanel(); centerOnHouse(); updateTop(); };
    });
    if ($('#contBtn')) $('#contBtn').onclick = () => loadFrom(savedGame.str);
    $('#welLoad').onclick = () => loadFile(); $('#welHelp').onclick = () => openHelp();
    m.querySelectorAll('.fold .foldh').forEach(hd => { const tog = () => { const f = hd.parentNode, on = f.classList.toggle('open'); hd.setAttribute('aria-expanded', on ? 'true' : 'false'); hd.querySelector('.chev').textContent = on ? '▾' : '▸'; }; hd.onclick = tog; hd.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } }; });
    $('#watchBtn').onclick = () => { m.style.display = 'none'; picking = false; running = true; $('#play').textContent = '❚❚'; };
    $('#rerollBtn').onclick = () => { m.style.display = 'none'; picking = false; newWorld(Math.floor(Math.random() * 1e9)); };
  }
  // routine matters that can be answered by a standing order: card type -> [policy key, value for each option in order]
  const ROUTINE_CARDS = ['gathering', 'omen', 'toobig', 'friendneed', 'sickness', 'exiles', 'oath', 'foundling', 'slight'];
  const ROUTINE_POL = { gathering: ['gather', ['gifts', 'trade', 'keep']], omen: ['omen', ['offer', 'quiet', 'sign']], toobig: ['split', ['letgo', 'hold']], friendneed: ['friend', ['give', 'send']], sickness: ['sick', ['scatter', 'tend']], exiles: ['exiles', ['place', 'feed', 'turn']], oath: ['oath', ['swear', 'friendship', 'refuse']], foundling: ['found', ['take', 'other', 'refuse']],
    rivalry: ['seat', ['face', 'buy', 'step']], slight: ['slight', ['gift', 'kind', 'pass']], oathback: ['oathback', ['keep', 'food', 'break']], exilesback: ['exback', ['refuse', 'pay', 'hand']], foundback: ['foundback', ['choose', 'send', 'keep']] };
  function showDecision(ev) {
    SIM.freshCard(W, ev); // a chance on the card is worked out as it is shown
    modalEv = ev; cardAt = performance.now(); wasRunning = running || wasRunning; running = false; $('#play').textContent = '▶';
    const P = W.player;
    modalDismiss = ev.options.length === 1 ? () => choose(0) : null;
    const cmp = phone(), ringS = P && !P.over ? SIM.ringSay(W, ev) : [], hue = P && P.head && P.head.clan ? P.head.clan.tribe.hue : null, first = Math.max(0, ringS.findIndex(r => r.text));
    const html = (modalDismiss ? '<button class="xbtn" data-x title="Close (Esc)">✕</button>' : '') + `<img class="plate" src="${ART.scene(ev.type, ev.type === 'beast' && ev.data && ev.data.b ? ev.data.b.kind : '')}" alt=""><div class="evhead">${P ? `House of ${esc(P.house)}, year ${yr(W.week)}` : ''}</div><h2>${esc(ev.title)}</h2><p>${iconize(ev.text)}</p>` + (ROUTINE_POL[ev.type] && P && !P.over ? '<label class="setline"><input type="checkbox" id="standOrd"><span>From now on, answer such matters the same way</span></label>' : '') +
      ev.options.map((o, k) => `<button class="opt${o.off ? ' off' : ''}" data-k="${k}"${o.off ? ' disabled' : ''}><span class="num">${k + 1}</span><span><b>${esc(o.label)}</b>${o.hint ? `<br><span class="muted">${esc(o.hint)}</span>` : ''}</span></button>`).join('') +
            (ringS.some(r => r.text) ? (cmp ? `<div class="ringbox cmp"><div class="ring">${ringS.map((r, i) => r.text ? `<button class="rf${i === first ? ' on' : ''}" data-r="${i}" title="${esc(r.q.name)}, ${esc(r.title)}" aria-label="${esc(r.q.name)}, ${esc(r.title)}">${ART.faceImg(r.q, hue, 44)}</button>` : '').join('')}</div><div class="rline" id="ringSay"></div></div>`
              : `<div class="ringbox"><div class="bubble" id="ringSay"></div><div class="ring">${ringS.map((r, i) => `<button class="rf${i === first ? ' on' : ''}${r.text ? '' : ' mute'}" data-r="${i}" title="${esc(r.q.name)}">${ART.faceImg(r.q, hue, 50)}</button>`).join('')}</div></div>`) : '');
    const m = $('#modal'); m.querySelector('.card2').innerHTML = html; m.style.display = 'flex';
    if (P && P.head && P.head.clan) { const c = ev.data && (ev.data.byClan || ev.data.foe || (ev.data.q && ev.data.q.clan)) || P.head.clan; if (c && c.x != null) centerOn(c.x, c.y); }
    m.querySelectorAll('.opt').forEach(b => b.onclick = () => choose(+b.dataset.k));
    { const x = m.querySelector('[data-x]'); if (x) x.onclick = () => modalDismiss && modalDismiss(); }
    const say = m.querySelector('#ringSay'); if (say) { const speak = i => { const r = ringS[i]; say.innerHTML = cmp ? `<span class="who">${esc(r.q.name)}</span>, <span class="role">${esc(r.title)}:</span> ${r.text ? esc(r.text) : '<i>has nothing to say on this.</i>'}` : `<span class="who">${esc(r.q.name)}</span><span class="role">${esc(r.title)}</span>${r.text ? esc(r.text) : '<i>has nothing to say on this.</i>'}`; say.style.setProperty('--tail', (i * 52 + 14) + 'px'); m.querySelectorAll('.rf').forEach(b => b.classList.toggle('on', +b.dataset.r === i)); m.querySelectorAll('.opt').forEach(b => b.classList.toggle('fav', +b.dataset.k === r.k)); };
      m.querySelectorAll('.rf').forEach(b => b.onclick = () => speak(+b.dataset.r)); speak(first); if (cmp) say.onclick = () => say.classList.toggle('open'); }
  }
  // ---- player actions (⚑ Act) ----
  // ---- the deeds, in groups. One table: every deed id and the group it is listed under; an id not in it goes under Your house ----
  const GROUPS = ['Your house', 'Your clan', 'Your tribe', 'Other peoples', 'Faith and lore', 'Land and villages'];
  const DEED_GROUP = {
    adopt: 'Your house', recall: 'Your house', claim: 'Your house', treasure: 'Your house', free: 'Your house',
    invite: 'Your clan', challengeClan: 'Your clan', feast: 'Your clan', expedition: 'Your clan', hunt: 'Your clan',
    clanlife: 'Your clan', clanblood: 'Your clan', tribelife: 'Your tribe', tribeblood: 'Your tribe', bindseat: 'Your tribe',
    challenge: 'Your tribe', crown: 'Your tribe', kingdom: 'Your tribe', leaverealm: 'Your tribe', bloodseat: 'Your tribe', plot: 'Your tribe', strike: 'Your tribe', court: 'Your tribe', confront: 'Your tribe',
    raid: 'Other peoples', landask: 'Other peoples', landdrive: 'Other peoples', explore: 'Other peoples', voyage: 'Other peoples', trader: 'Other peoples', ally: 'Other peoples', pact: 'Other peoples', tribute: 'Other peoples', peace: 'Other peoples', gifts: 'Other peoples', war: 'Other peoples', endwar: 'Other peoples',
    rite: 'Faith and lore', walk: 'Faith and lore',
    movecamp: 'Land and villages', movevillage: 'Land and villages', foundvillage: 'Land and villages', settle: 'Land and villages', takefarming: 'Land and villages', fields: 'Land and villages', build: 'Land and villages', migrate: 'Land and villages', canoes: 'Land and villages', monument: 'Land and villages',
  };
  const deedGroup = id => id === 'strike' && W.player && W.player.plot && W.player.plot.kind === 'clan' ? 'Your clan' : DEED_GROUP[id] || 'Your house'; // a strike for the clan's seat is a clan matter
  // a long list of peoples in a deed's text shows its first three; the rest wait behind "and N more"
  const FOLD_MARK = ['Peoples you know of but cannot raid: ', 'Known peoples: '];
  function foldHint(h) {
    for (const mk of FOLD_MARK) { const i = h.indexOf(mk); if (i < 0) continue; const j = i + mk.length, tail = h.slice(j), end = tail.lastIndexOf('.'), list = end >= 0 ? tail.slice(0, end) : tail, after = end >= 0 ? tail.slice(end) : '', items = list.split('; ');
      if (items.length <= 3) return null; return { hint: h.slice(0, j) + items.slice(0, 3).join('; ') + after, n: items.length - 3, more: items.slice(3).join('; ') }; }
    return null;
  }
  function showCard(head, title, text, opts, onPick, cfg) {
    const P = W.player; modalEv = { act: true, pick: onPick, n: opts.length }; cardAt = performance.now();
    if (!wasRunning) wasRunning = running; running = false; $('#play').textContent = '▶';
    modalDismiss = () => { modalEv = null; closeCard(); };
    const ph = phone(), groups = ph && cfg && cfg.groups;
    const optHtml = (o, k) => `<button class="opt${o.off ? ' off' : ''}" data-k="${k}"${o.off ? ' disabled' : ''}><span class="num">${o.icon || k + 1}</span><span><b>${esc(o.label)}</b>${o.hint ? `<br><span class="muted">${esc(o.hint)}</span>` : ''}</span></button>` + (o.fold ? `<button class="moreb" data-more="${k}">and ${o.fold.n} more: tap to see all</button>` : '');
    let body;
    if (groups) {
      const ix = opts.map((o, k) => [o, k]); body = '';
      for (const g of GROUPS) { const it = ix.filter(([o]) => !o.off && (o.group || 'Your house') === g); if (it.length) body += `<div class="ghead">${g}</div>` + it.map(([o, k]) => optHtml(o, k)).join(''); }
      const off = ix.filter(([o]) => o.off);
      if (off.length) body += `<button class="notnow" data-notnow aria-expanded="false"><span>Not now (${off.length})</span><span>▾</span></button><div class="notnowbox"><div class="ghead">Not now</div>${off.map(([o, k]) => optHtml(o, k)).join('')}</div>`;
    } else body = opts.map(optHtml).join('');
    const hd = ph ? `<div class="ahead"><h2>${esc(title)}</h2><button class="xbtn" data-x title="Close (Esc)" aria-label="Close">✕</button></div><div class="evhead">${head || (P ? `House of ${esc(P.house)}, year ${yr(W.week)}` : '')}</div>`
      : `<button class="xbtn" data-x title="Close (Esc)">✕</button><div class="evhead">${head || (P ? `House of ${esc(P.house)}, year ${yr(W.week)}` : '')}</div><h2>${esc(title)}</h2>`;
    const html = hd + (text ? `<p>${iconize(text)}</p>` : '') + body;
    const m = $('#modal'); m.querySelector('.card2').innerHTML = html; m.style.display = 'flex'; m.querySelector('.card2').scrollTop = 0;
    m.querySelectorAll('.opt').forEach(b => b.onclick = () => choose(+b.dataset.k));
    m.querySelectorAll('[data-more]').forEach(b => b.onclick = () => { const o = opts[+b.dataset.more]; b.outerHTML = `<div class="foldlist">${esc(o.fold.more)}</div>`; });
    m.querySelectorAll('[data-notnow]').forEach(b => b.onclick = () => { const box = b.nextElementSibling, on = box.classList.toggle('open'); b.setAttribute('aria-expanded', on ? 'true' : 'false'); b.lastElementChild.textContent = on ? '▴' : '▾'; if (on) box.scrollIntoView({ block: 'nearest' }); });
    m.querySelector('[data-x]').onclick = () => modalDismiss && modalDismiss();
  }
  function closeCard() { modalEv = null; modalDismiss = null; $('#modal').style.display = 'none'; if (!W.pending.length) { running = wasRunning; wasRunning = false; $('#play').textContent = running ? '❚❚' : '▶'; } if (panel === 'house') renderPanel(); updateTop(); }
  function showResult(r) { if (!r) return closeCard(); W.lastResult = null; const c = W.player && W.player.head && W.player.head.clan; if (c) centerOn(c.x, c.y); showCard(null, r.title, r.text, [{ label: 'Continue' }], () => closeCard()); }
  // ---- notices ----
  // On the phone a notice is a one-line chip stacked above the bottom controls: tap to read it whole, swipe it away or press its cross. On a wide screen it is the toast it always was.
  // Every notice, whichever way it is shown, also goes into a log of the last 30, with its date; the bell in the top bar counts the ones not yet looked at.
  const NOTE_LOG = []; let noteUnread = 0;
  const noteDate = () => W ? `${SIM.seasonName(W.week)}, year ${yr(W.week)}` : '';
  function clearNotes() { NOTE_LOG.length = 0; noteUnread = 0; noteBadge(); $('#toasts').innerHTML = ''; if ($('#noteList').classList.contains('open')) noteList(); } // a new world or a loaded game starts with no notices
  function noteBadge() { const b = $('#noteBtn'), n = $('#noteN'); if (!b) return; n.textContent = noteUnread > 99 ? '99+' : String(noteUnread); b.classList.toggle('has', noteUnread > 0); b.setAttribute('aria-label', noteUnread ? `Notices, ${noteUnread} new` : 'Notices'); }
  function noteList() {
    const el = $('#noteList'), n = noteUnread;
    el.innerHTML = `<div class="nh"><span>Notices</span><button data-x aria-label="Close">✕</button></div>` + (NOTE_LOG.length ? NOTE_LOG.map((e, i) => `<div class="nr${i < n ? ' new' : ''}"><b>${esc(e.title)}</b><small>${esc(e.date)}</small>${iconize(e.text)}</div>`).join('') : '<div class="none">Nothing yet.</div>');
    el.querySelector('[data-x]').onclick = () => closePops();
    noteUnread = 0; noteBadge();
  }
  function toast(r) {
    NOTE_LOG.unshift({ title: r.title, text: r.text, date: noteDate() }); if (NOTE_LOG.length > 30) NOTE_LOG.pop();
    if ($('#noteList').classList.contains('open')) { noteList(); } else { noteUnread++; noteBadge(); }
    const box = $('#toasts');
    if (!phone()) while (box.children.length > 2) box.firstChild.remove();
    else { let live = [...box.children].filter(x => !x.classList.contains('gone')); while (live.length > 2) { const old = live.find(x => !x.classList.contains('open')); if (!old) break; old.remove(); live = live.filter(x => x !== old); } } // a fourth notice puts out the oldest chip that is not open; one being read stays
    const el = document.createElement('div');
    if (!phone()) {
      el.className = 'toast'; el.innerHTML = `<b>${esc(r.title)}</b><br>${iconize(r.text)}`;
      box.appendChild(el); setTimeout(() => el.classList.add('out'), 7000); setTimeout(() => el.remove(), 7800);
      el.onclick = () => el.remove(); return;
    }
    el.className = 'toast'; el.innerHTML = `<div class="tc"><b>${esc(r.title)}</b><div class="tx">${iconize(r.text)}</div></div><button class="tx-x" aria-label="Dismiss">✕</button>`;
    box.appendChild(el);
    let t1 = setTimeout(() => el.classList.add('out'), 7000), t2 = setTimeout(() => el.remove(), 7800), x0 = null, dx = 0, moved = false;
    const gone = dir => { el.classList.add('gone'); clearTimeout(t1); clearTimeout(t2); el.style.transform = `translateX(${dir * 420}px)`; el.style.opacity = '0'; setTimeout(() => el.remove(), 220); };
    el.querySelector('.tx-x').onclick = ev => { ev.stopPropagation(); gone(1); };
    el.querySelector('.tc').onclick = () => { if (moved) { moved = false; return; } const o = el.classList.toggle('open'); clearTimeout(t1); clearTimeout(t2); el.classList.remove('out'); if (!o) { t1 = setTimeout(() => el.classList.add('out'), 7000); t2 = setTimeout(() => el.remove(), 7800); } }; // read whole it stays until it is dismissed
    el.addEventListener('pointerdown', e => { if (e.target.closest('.tx-x')) return; x0 = e.clientX; dx = 0; moved = false; });
    el.addEventListener('pointermove', e => { if (x0 == null) return; dx = e.clientX - x0; if (Math.abs(dx) > 10) { moved = true; el.style.transform = `translateX(${dx}px)`; el.style.opacity = String(Math.max(0.25, 1 - Math.abs(dx) / 220)); } });
    const end = () => { if (x0 == null) return; const d = dx; x0 = null; if (Math.abs(d) > 60) gone(d > 0 ? 1 : -1); else { el.style.transform = ''; el.style.opacity = ''; } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  // ---- choosing a place on the map ----
  let placePick = null;
  // the village deeds mark a spot first and build on "Build here"; the other picks act on the first tap
  const MARK_PICKS = ['movevillage', 'settle', 'foundvillage'];
  const PICK_HELP = 'Tap the map inside the dashed circle, on land your people know.';
  function startPlacePick(a, j) {
    const c = W.player.head.clan; modalEv = null; $('#modal').style.display = 'none';
    placePick = { id: a.id, k: j, maxKm: a.targets[j].pick.maxKm, x: c.x, y: c.y, mark: MARK_PICKS.includes(a.id), at: null, clan: a.id === 'foundvillage' && a.targets[j].clan || null };
    const b = $('#pickbar'); b.innerHTML = `<div class="pbt"><b>${esc(a.label)}</b><div id="pickMsg" class="muted">${PICK_HELP}</div></div><button id="pickGo" style="display:none">Build here</button><button id="pickCancel">Cancel</button>`; b.style.display = 'flex';
    $('#pickCancel').onclick = ev => { ev.stopPropagation(); endPlacePick(); closeCard(); };
    $('#pickGo').onclick = ev => { ev.stopPropagation(); const pp = placePick; if (!pp || !pp.at) return; const [x, y] = pp.at; const bad = SIM.checkPlace(W, pp.id, x, y); if (bad) { pp.at = null; ev.target.style.display = 'none'; $('#pickMsg').innerHTML = `<span style="color:#a83a22">✗ ${esc(bad)}</span>`; return; } endPlacePick(); showResult(SIM.doAction(W, pp.id, pp.k, 0, { x, y })); };
    centerOn(c.x, c.y, Math.min(cam.s, 0.0016));
  }
  function endPlacePick() { placePick = null; hoverPt = null; $('#pickbar').style.display = 'none'; }
  // the line shown for a spot: the refusal, or the ground for fields
  function pickLine(x, y) {
    const err = SIM.checkPlace(W, placePick.id, x, y); if (err) return `<span style="color:#a83a22">✗ ${esc(err)}</span>`;
    const g = SIM.groundAt(W, placePick.id, x, y, placePick.clan); return g ? esc(g.text) : placePick.mark ? 'Fit ground for a village.' : PICK_HELP;
  }
  function placeTap(sx, sy) {
    const [x, y] = toWorld(sx, sy), err = SIM.checkPlace(W, placePick.id, x, y), m = $('#pickMsg'), go = $('#pickGo');
    hoverPt = [x, y];
    if (err) { placePick.at = null; if (go) go.style.display = 'none'; if (m) m.innerHTML = pickLine(x, y); return; }
    if (!placePick.mark) { const pp = placePick; endPlacePick(); return showResult(SIM.doAction(W, pp.id, pp.k, 0, { x, y })); }
    placePick.at = [x, y]; placePick.mo = W.week >> 2; if (m) m.innerHTML = pickLine(x, y); if (go) go.style.display = '';
  }
  function drawPlacePick() {
    if (!placePick) return;
    if (placePick.mark && placePick.at && placePick.mo !== (W.week >> 2)) { // play runs while a mark stands: the line is drawn again once a month (the ground and the places change), not every frame
      placePick.mo = W.week >> 2; const [mx, my] = placePick.at, m = $('#pickMsg'); if (SIM.checkPlace(W, placePick.id, mx, my)) { placePick.at = null; const go = $('#pickGo'); if (go) go.style.display = 'none'; } if (m) m.innerHTML = pickLine(mx, my);
    } const [cx, cy] = toScreen(placePick.x, placePick.y), r = placePick.maxKm * 1000 * cam.s;
    ctx.save(); ctx.strokeStyle = 'rgba(255,227,160,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,227,160,0.07)'; ctx.fill();
    const hp = placePick.mark && placePick.at ? placePick.at : hoverPt;
    if (hp) { const ok = !SIM.checkPlace(W, placePick.id, hp[0], hp[1]); const [hx, hy] = toScreen(hp[0], hp[1]); ctx.strokeStyle = ok ? '#7de07d' : '#e0584a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hx - 9, hy); ctx.lineTo(hx + 9, hy); ctx.moveTo(hx, hy - 9); ctx.lineTo(hx, hy + 9); ctx.stroke(); ctx.beginPath(); ctx.arc(hx, hy, 12, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  let hoverPt = null;
  function showActions(openId, focusId) {
    const P = W.player; if (!P || P.over || modalEv || picking) return;
    const A = SIM.playerActions(W); if (!A.length) return;
    const h = P.head;
    const direct = typeof openId === 'string' ? A.find(a => a.id === openId && a.ok && a.targets) : null;
    const sorted = A.slice().sort((a, b) => (b.ok ? 1 : 0) - (a.ok ? 1 : 0));
    showCard(null, `What will ${h.name} do?`, `<span class="muted">Greyed-out deeds are not possible right now; each says why.</span>`,
      sorted.map(a => { const t = a.ok ? a.hint : (a.why || 'Not possible for now'), f = phone() ? foldHint(t) : null; return { icon: a.icon, label: a.label, hint: f ? f.hint : t, fold: f, off: !a.ok, group: deedGroup(a.id) }; }),
      k => {
        const a = k === -1 ? direct : sorted[k]; if (!a) return closeCard();
        if (a.targets) {
          showCard(null, a.label, esc(a.hint), [...a.targets.map(tg => ({ label: tg.label, hint: tg.hint })), { icon: '←', label: 'Back' }], j => {
            if (j >= a.targets.length) { modalEv = null; return showActions(); }
            if (a.targets[j].pick) return startPlacePick(a, j);
            if (a.forces && a.forces.length > 1) {
              return showCard(null, a.id === 'landask' ? 'Whose warriors will stand behind your envoy?' : 'Whom will you call to arms?', `Against ${esc(a.targets[j].label)} — ${esc(a.targets[j].hint)}`, [...a.forces.map(f => ({ label: `${f.label} — ${f.n} warriors`, hint: f.hint })), { icon: '←', label: 'Back' }], f => {
                if (f >= a.forces.length) { modalEv = null; return showActions(); }
                showResult(SIM.doAction(W, a.id, j, f));
              });
            }
            showResult(SIM.doAction(W, a.id, j, 0));
          });
          const r0 = a.targets[0] && a.targets[0].ref; if (r0) { const x = r0.x != null ? r0.x : r0.clans && r0.clans[0] && r0.clans[0].x, y = r0.y != null ? r0.y : r0.clans && r0.clans[0] && r0.clans[0].y; if (x != null) centerOn(x, y); }
        } else showResult(SIM.doAction(W, a.id, 0));
      }, { groups: true });
    if (direct) modalEv.pick(-1);
    else if (focusId) { // open at the deed an advice line named: its box opened if it sits in Not now, the sheet scrolled to it, the deed marked for a moment
      const k = sorted.findIndex(a => a.id === focusId), m = $('#modal'), b = k >= 0 ? m.querySelector(`.opt[data-k="${k}"]`) : null;
      if (b) { const nn = b.closest('.notnowbox'); if (nn && !nn.classList.contains('open')) { const tg = nn.previousElementSibling; if (tg) tg.click(); } b.scrollIntoView({ block: 'center' }); b.classList.add('hl'); setTimeout(() => b.classList.remove('hl'), 1800); }
    }
  }
  function choose(k) {
    const ev = modalEv; if (!ev) return;
    if (ev.act) { if (k >= ev.n) return; const b = $('#modal').querySelector(`.opt[data-k="${k}"]`); if (b && b.disabled) return; modalEv = null; ev.pick(k); return; }
    modalEv = null; modalDismiss = null;
    { const cb = $('#modal').querySelector('#standOrd'), rp = ROUTINE_POL[ev.type]; if (cb && cb.checked && rp && rp[1][k]) SIM.setPolicy(W, rp[0], rp[1][k]); }
    SIM.resolve(W, ev, k); $('#modal').style.display = 'none';
    const lr = W.lastResult, quick = phone() && lr && ROUTINE_CARDS.includes(ev.type) && (lr.text || '').replace(/<[^>]*>/g, '').length < 220 && !/<table|<br|<li/i.test(lr.text || ''); // a routine matter with a short plain answer is a notice, not a second card
    if (lr && !quick && (lr.text || '').length > 200) { const r = W.lastResult; if (panel === 'house') renderPanel(); updateTop(); return showResult(r); } // a long account (who backed whom, and why) gets a card that waits to be read
    if (W.lastResult) { toast(W.lastResult); W.lastResult = null; }
    if (!W.pending.length) { running = wasRunning; wasRunning = false; $('#play').textContent = running ? '❚❚' : '▶'; }
    if (panel === 'house') renderPanel(); updateTop();
  }
  window.addEventListener('keydown', e => { if (placePick && e.key === 'Escape') { endPlacePick(); closeCard(); return; }
    if (e.key === 'Escape') { if (document.querySelector('.pop.open') || $('#speedRow').classList.contains('open')) return closePops(); if ($('#help').style.display === 'flex') { $('#help').style.display = 'none'; return; } if ($('#picker').style.display === 'block') return hidePicker(); if ($('#modal').style.display === 'flex') { if (modalDismiss) modalDismiss(); return; } if (sel || panel === 'cell') return closeSel(); return; } if (modalEv && /^[1-9]$/.test(e.key)) choose(+e.key - 1); if (!modalEv && (e.key === 'a' || e.key === 'A') && e.target === document.body) showActions(); if (e.key === ' ' && !modalEv && !picking && e.target === document.body) { e.preventDefault(); $('#play').click(); } });
  function centerOnHouse() { const P = W.player; if (P && P.head && P.head.clan) centerOn(P.head.clan.x, P.head.clan.y, 0.0016); }

  const STORE = {
    db: null,
    open() { return new Promise(res => { try { const r = indexedDB.open('the-isles', 1); r.onupgradeneeded = () => r.result.createObjectStore('saves'); r.onsuccess = () => res(STORE.db = r.result); r.onerror = () => res(null); r.onblocked = () => res(null); } catch (e) { res(null); } }); },
    async gz(str) { try { if (typeof CompressionStream === 'undefined') return null; const cs = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip')); return await new Response(cs).arrayBuffer(); } catch (e) { return null; } },
    async gunz(buf) { const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')); return await new Response(ds).text(); },
    async put(str, meta) {
      const z = await STORE.gz(str), val = z ? { z, meta } : { s: str, meta }; let ok = false;
      try { const db = STORE.db || await STORE.open(); if (db) ok = await new Promise(res => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(val, 'auto'); tx.oncomplete = () => res(true); tx.onerror = tx.onabort = () => res(false); }); } catch (e) { ok = false; }
      if (!ok) { try { localStorage.setItem('the-isles.save', str); ok = true; } catch (e) { ok = false; } }
      if (ok) { try { localStorage.setItem('the-isles.meta', JSON.stringify(meta)); } catch (e) {} }
      return ok;
    },
    async get() {
      try { const db = STORE.db || await STORE.open(); if (db) { const v = await new Promise(res => { const rq = db.transaction('saves').objectStore('saves').get('auto'); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); }); if (v) return { str: v.z ? await STORE.gunz(v.z) : v.s, meta: v.meta }; } } catch (e) {}
      try { const str = localStorage.getItem('the-isles.save'); if (str) return { str, meta: SIM.saveInfo(str) }; } catch (e) {}
      return null;
    },
  };
  let lastSaveWeek = -1, saving = false, savedGame = null, skipping = false, skipFrom = 0;
  async function saveNow(manual) {
    if (saving || !W || !W.player || picking) { if (manual) toast({ title: 'Nothing to save yet', text: 'Choose a house first.' }); return false; }
    saving = true; let ok = false;
    try { const str = SIM.saveGame(W), P = W.player; lastSaveWeek = W.week; ok = await STORE.put(str, { house: P.house, head: P.head ? P.head.name : '', year: yr(W.week), seed: W.seed, over: P.over, at: Date.now() }); } catch (e) { ok = false; }
    saving = false;
    if (manual) toast(ok ? { title: 'Game saved', text: `The House of ${esc(W.player.house)}, year ${yr(W.week)}. It is saved in this browser; use "Save to a file" to keep a copy elsewhere.` } : { title: 'Could not save here', text: 'This browser would not store the game. Use "Save to a file" instead.' });
    return ok;
  }
  function loadFrom(str) {
    $('#loading').style.display = 'flex'; $('#modal').style.display = 'none';
    setTimeout(() => {
      try { W = SIM.loadGame(str); } catch (e) { $('#loading').style.display = 'none'; toast({ title: 'That save could not be read', text: esc(String(e && e.message || e)) }); return showStart(); }
      prep(); clearNotes(); detail = null; modalEv = null; wasRunning = false; picking = false; running = false; $('#play').textContent = '▶'; lastSaveWeek = W.week;
      sel = null; panel = W.player ? 'house' : 'log'; selCell = null; dirty = true; renderPanel(); updateTop(); if (W.player && !W.player.over) centerOnHouse(); else fit();
      $('#loading').style.display = 'none'; toast({ title: 'Welcome back', text: W.player ? `The House of ${esc(W.player.house)}, year ${yr(W.week)}. The game is paused: press play when you are ready.` : `Year ${yr(W.week)}.` });
    }, 40);
  }
  function saveFile() { if (!W || !W.player || picking) return toast({ title: 'Nothing to save yet', text: 'Choose a house first.' });
    try { const blob = new Blob([SIM.saveGame(W)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `isles-${W.player.house}-year-${yr(W.week)}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast({ title: 'Save file written', text: 'Look in your downloads. Load it again from the menu.' }); }
    catch (e) { toast({ title: 'Could not write a file', text: 'This app would not let the page download a file.' }); } }
  function loadFile() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => loadFrom(String(rd.result)); rd.readAsText(f); }; inp.click(); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && W && W.player && !picking && W.week !== lastSaveWeek) saveNow(false); });
  function newWorld(seed) {
    $('#loading').style.display = 'flex';
    setTimeout(() => {
      W = SIM.createWorld(seed); SIM.seedFirstPop(W, 4); prep(); clearNotes(); detail = null; modalEv = null; wasRunning = false;
      sel = null; panel = 'log'; selCell = null; dirty = true; renderPanel(); updateTop(); fit();
      $('#loading').style.display = 'none'; showStart();
    }, 40);
  }

  let lastT = performance.now(), lastPanel = 0, panelTouchAt = -1e9, lastCamKey = '', lastDetail = 0; // panelTouchAt: when a finger or the mouse last pressed, moved or scrolled on the panel
  let frameN = 0, lastStepFrame = 0, stepMs = 2, lastSeason = -1, simBudget = 9, ySpeed = 0, simAt = performance.now(), simWeeks = 0;
  function frame(t) {
    const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
    if (W) {
      // simulation gets a fixed slice of each frame so the map stays smooth; heavy years just run a bit slower
      if (dt > 0.03) simBudget = Math.max(4, simBudget - 1); else if (dt < 0.02) simBudget = Math.min(10, simBudget + 0.25);
      if (skipping) { // run the quiet years at full tilt, and stop the moment something asks for you
        const t0 = performance.now(); frameN++;
        while (performance.now() - t0 < 26 && !W.pending.length && !(W.notices && W.notices.length) && W.week - skipFrom < 520 && !(W.player && W.player.over)) { SIM.step(W); simWeeks++; }
        if (W.pending.length || (W.notices && W.notices.length) || W.week - skipFrom >= 520 || (W.player && W.player.over) || modalEv) { const yrs = ((W.week - skipFrom) / 52).toFixed(1); skipping = false; $('#skipBtn').classList.remove('on'); if (W.week - skipFrom >= 520) toast({ title: 'Ten quiet years', text: 'Nothing needed you. Press skip again, or play on.' }); updateTop(); if (panel === 'house') renderPanel(); }
      }
      else if (running) {
        simAcc += dt * SPEEDS[speedIx].wps; const t0 = performance.now(); frameN++;
        // a single week can cost more than the frame budget once the isles are crowded: then run one week every few frames
        const mustStep = frameN - lastStepFrame >= Math.max(1, Math.ceil(stepMs / Math.max(4, simBudget)));
        let steps = 0;
        while (simAcc >= 1) {
          const over = performance.now() - t0 + stepMs > simBudget;
          if (over && (steps > 0 || !mustStep)) break;
          steps++;
          const s0 = performance.now(); SIM.step(W); stepMs = stepMs * 0.9 + (performance.now() - s0) * 0.1; simAcc -= 1; simWeeks++; lastStepFrame = frameN;
        }
        if (simAcc > 2) simAcc = 2;
      }
      if (t - simAt > 1000) { ySpeed = simWeeks / 52 / ((t - simAt) / 1000); simWeeks = 0; simAt = t; }
      if (W.player && !picking && !saving && !modalEv && !skipping && W.week - lastSaveWeek >= 260) saveNow(false); // autosave every five years
      if (!modalEv && !picking && W.pending.length) showDecision(W.pending[0]);
      if (W.notices && W.notices.length) { const n = W.notices.shift(); toast({ title: n.title, text: esc(n.text) }); }
      easeCamps(dt); followPanel(t);
      // repaint the land only when the season changes (or a layer is switched), a slice at a time
      const season = Math.floor(W.week / 13);
      const PR = SIM.prof.on && running; let r0 = PR ? performance.now() : 0, rPaint = 0, rDetail = 0; // profiler: land painting, detail jobs and draw() are the rendering
      if (dirty) { paint(); detail = null; detailJob = null; detailVer++; dirty = false; lastSeason = season; }
      else if (season !== lastSeason && !baseJob) { baseJob = { y: 0 }; lastSeason = season; if (detail) detail.stale = true; }
      paintStep(3);
      if (PR) { const r1 = performance.now(); rPaint = r1 - r0; r0 = r1; }
      const zoomedIn = cam.s * WORLD / R > 1.15, camKey = cam.s + ',' + cam.ox + ',' + cam.oy;
      if (camKey !== lastCamKey) { lastCamKey = camKey; camMoved = t; if (detailJob && detailJob.key !== camKey) detailJob = null; }
      if (zoomedIn && !pts.size && t - camMoved > 180 && !detailJob && (!detail || detail.key !== camKey || (detail.stale && t - (detail.at || 0) > 4000))) startDetail(camKey);
      if (detailJob) detailStep(6);
      if (PR) { const r1 = performance.now(); rDetail = r1 - r0; r0 = r1; }
      draw();
      if (PR) SIM.prof.render(performance.now() - r0, rPaint, rDetail);
      const now = performance.now();
      if (now - lastPanel > 1500) { updateTop(); if (running && now - panelTouchAt > 2000 && (panel !== 'log' || W.events.length !== lastEvN)) { const st = $('#panelBody').scrollTop; renderPanel(); $('#panelBody').scrollTop = st; lastEvN = W.events.length; } lastPanel = now; }
    }
    requestAnimationFrame(frame);
  }
  let lastEvN = -1;
  const pb = $('#panelBody');
  // the panel is not redrawn under a finger: it waits until 2 s after the last press, move or scroll on it. It never waits on a lift or leave, which a phone may not send after a scroll.
  const touchPanel = () => { panelTouchAt = performance.now(); };
  pb.addEventListener('pointerdown', touchPanel); pb.addEventListener('pointerup', touchPanel); pb.addEventListener('pointercancel', touchPanel); pb.addEventListener('pointermove', e => { if (e.buttons || e.pointerType !== 'mouse') touchPanel(); }); pb.addEventListener('scroll', touchPanel, { passive: true });
  pb.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') panelTouchAt = -1e9; });
  // keep looking at the same spot when the window or phone toolbar changes size (don't jump out to the whole map)
  window.addEventListener('resize', () => { const w0 = cv.clientWidth, h0 = cv.clientHeight; resize(); if (!W) return; cam.ox += (cv.clientWidth - w0) / 2; cam.oy += (cv.clientHeight - h0) / 2; try { draw(); } catch (e) {} });
  resize();
  try { const pq = new URLSearchParams(location.search); if (pq.has('prof') && pq.get('prof') !== '0') SIM.prof.on = true; } catch (e) {} // ?prof or ?prof=1 times the systems; the summaries go to the console
  STORE.get().then(v => { savedGame = v && v.str ? v : null; }).catch(() => {}).then(() => newWorld(Math.floor(Math.random() * 1e9)));
  requestAnimationFrame(frame);
  window.__dbg = { get W() { return W; }, scr: (x, y) => toScreen(x, y), get cam() { return cam; }, get show() { return show; }, get grp() { return grpOf; }, get mk() { return mkOf; }, get crowd() { return crowdOn; }, herdsN: () => { herdCache.key = ''; return herds().reduce((n, h) => n + (h.sea || h.sp === 'duck' || h.sp === 'sealion' ? 0 : h.cnt), 0); }, probe: (sx, sy) => { const [x, y] = toWorld(sx, sy), gx = Math.floor(x / CELL), gy = Math.floor(y / CELL), P = W.player; const fx = Math.floor((sx - cam.ox) / cam.s / WORLD * FR), fy = Math.floor((sy - cam.oy) / cam.s / WORLD * FR); return { x, y, gx, gy, known: P.known[gy * N + gx], fogA: fogImg ? fogImg.data[(fy * FR + fx) * 4 + 3] : -1, land: W.land[gy * N + gx], dpr: window.devicePixelRatio, cssW: cv.clientWidth, cvW: cv.width }; }, check: (sx, sy) => { if (!placePick) return false; const [x, y] = toWorld(sx, sy); return !SIM.checkPlace(W, placePick.id, x, y); }, reset: () => { modalEv = null; $('#modal').style.display = 'none'; W.pending = []; running = false; wasRunning = false; $('#play').textContent = '▶'; }, open: e => open(e, true), fit: () => fit(), paint: () => { paint(); }, zoom: (x, y, f) => zoomAt(x, y, f), center: (x, y, s) => { cam.s = s; centerOn(x, y); } };
})();
