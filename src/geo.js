// ===== ISLES SIM CORE =====
// 1 tick = 1 week. Grid cell = 5 km (2,500 ha). Map = 1,000 x 1,000 km with ~240,000 km² of land on two main islands.
// Environment is continuous fields; people have continuous positions.
const SIM = (() => {
  const N = 200, CELL = 5000, WORLD = N * CELL, HA = (CELL * CELL) / 10000;

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function makeNoise(rand) {
    const perm = new Uint16Array(512), vals = new Float32Array(256);
    for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = rand(); }
    for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
    const sm = t => t * t * (3 - 2 * t);
    function n2(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
      const v00 = vals[perm[X + perm[Y]]], v10 = vals[perm[X + 1 + perm[Y]]], v01 = vals[perm[X + perm[Y + 1]]], v11 = vals[perm[X + 1 + perm[Y + 1]]];
      const u = sm(xf), v = sm(yf);
      return (v00 * (1 - u) + v10 * u) * (1 - v) + (v01 * (1 - u) + v11 * u) * v;
    }
    return (x, y, oct = 4) => { let s = 0, a = 1, f = 1, t = 0; for (let o = 0; o < oct; o++) { s += a * n2(x * f, y * f); t += a; a *= 0.5; f *= 2; } return s / t; };
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sum = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const NB8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  // Cells are irregular: each cell's centre sits at a random point inside its 5-km slot (a jittered mesh),
  // so distances, rivers, ranges and borders follow an organic network instead of a square grid.
  let PX = null, PY = null;
  const JIT = 0.76;
  function cellAt(x, y) {
    const sx = Math.floor(x / CELL), sy = Math.floor(y / CELL); let best = 0, bd = Infinity;
    for (let yy = sy - 1; yy <= sy + 1; yy++) for (let xx = sx - 1; xx <= sx + 1; xx++) {
      if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx, d = (PX[j] - x) ** 2 + (PY[j] - y) ** 2; if (d < bd) { bd = d; best = j; }
    }
    return best;
  }
  const cdist = (i, j) => Math.hypot(PX[i] - PX[j], PY[i] - PY[j]) / CELL;

  // ---------- seasons (s in [0,1), 0 = 1 Jan) ----------
  const seasonOf = w => (w % 52) / 52;
  const tempOffset = s => Math.sin(2 * Math.PI * (s - 0.29));   // multiply by local seasonal amplitude
  const growWeight = T => clamp((T - 4) / 14, 0, 1);
  const foodWeight = s => 0.25 + 0.75 * Math.PI * Math.max(0, Math.sin(2 * Math.PI * (s - 0.45)));
  const fishRun = s => 0.4 + 2.6 * Math.max(0, Math.sin(2 * Math.PI * (s - 0.55))) + 0.5 * Math.max(0, Math.sin(2 * Math.PI * (s - 0.2)));
  const SEASON_NAMES = ['Winter', 'Spring', 'Summer', 'Autumn'];
  const seasonName = w => { const s = seasonOf(w); return SEASON_NAMES[s < 0.17 || s >= 0.92 ? 0 : s < 0.42 ? 1 : s < 0.67 ? 2 : 3]; };

  // ---------- demography: hunter-gatherer Siler mortality (Gurven & Kaplan 2007 forager fit) ----------
  const siler = x => 0.422 * Math.exp(-1.131 * x) + 0.013 + 0.000147 * Math.exp(0.086 * x);
  function kcalDay(a, male) {
    if (a < 1) return 450; if (a < 4) return 1100; if (a < 9) return 1500; if (a < 14) return 1900;
    if (a < 18) return male ? 2600 : 2100; if (a < 60) return male ? 2700 : 2200; return male ? 2200 : 1800;
  }
  function workerEq(a) { if (a < 10) return 0; if (a < 15) return 0.4; if (a < 60) return 1; if (a < 70) return 0.5; return 0.1; }
  function vulnerability(a) { return a < 5 ? 2.0 : a < 15 ? 0.8 : a < 60 ? 0.6 : 1.6; }

  const FORAGE_R = 10000;       // m, foraging radius around a camp
  const DECAY_R = 6000;         // distance at which foraging returns halve
  const PLANT_CATCH = 0.35, GAME_CATCH = 0.02, FISH_CATCH = 0.3, SHELL_CATCH = 0.04, SEAL_CATCH = 0.012;
  const KCAL_PER_KG_GAME = 750;
  const LABOR_KCAL = 4600 * 7;

  // ---------- biomes ----------
  const BIOMES = [
    { name: 'Sea', game: '' }, { name: 'Lake', game: '' },
    { name: 'Tundra & alpine', game: 'reindeer, hare, ptarmigan' },
    { name: 'Boreal pine & birch', game: 'elk, reindeer, beaver' },
    { name: 'Mixed forest', game: 'red deer, elk, boar' },
    { name: 'Broadleaf forest', game: 'red deer, boar, aurochs, roe deer' },
    { name: 'Grassland & scrub', game: 'aurochs, wild horse, red deer' },
    { name: 'Heath & moorland', game: 'red deer, grouse, hare' },
    { name: 'Bog & fen', game: 'waterfowl, elk, beaver, eel' },
    { name: 'Dunes & saltmarsh', game: 'seals, wildfowl, seabirds' },
  ];
  const GROVES = ['', 'Hazel woods', 'Crab apple', 'Wild cherry & sloe', 'Bilberry & cloudberry'];
  const DEPOSITS = {
    flint: { name: 'Flint', icon: '◆' }, amber: { name: 'Amber', icon: '●' }, axe: { name: 'Axe-stone', icon: '▲' },
    ochre: { name: 'Red ochre', icon: '■' }, salt: { name: 'Salt', icon: '✦' }, grain: { name: 'Wild grain', icon: 'ψ' }, copper: { name: 'Copper', icon: '⬢' }, tin: { name: 'Tin', icon: '⬡' }, whale: { name: 'Whale grounds', icon: '◗' }, clay: { name: 'Potter\'s clay', icon: '◒' },
  };

  // ---------- world generation ----------
  function createWorld(seed) {
    const rand = mulberry32(seed), noise = makeNoise(rand), n = N * N, F = () => new Float32Array(n), U = () => new Uint8Array(n);
    const W = { seed, rand, week: 0, clans: [], tribes: [], confeds: [], sites: [], pending: [], player: null, places: new Map(), settlements: [], roads: new Map(), roadsVer: 0, deposits: [], ents: new Map(), nextId: 1, nextPid: 1, history: [], events: [], weather: 1,
      land: U(), comp: new Int16Array(n), lake: U(), isRiver: U(), coast: U(), shelf: U(), biome: U(), groveType: U(), chalk: U(),
      elev: F(), slope: F(), hand: F(), acc: F(), flow: F(), down: new Int32Array(n).fill(-1), T0: F(), amp: F(), rainAnn: F(), inland: F(), seaDist: F(),
      sand: F(), clay: F(), depth: F(), om: F(), nit: F(), water: F(), whc: F(), mAvg: F(), grass: F(), shrub: F(), forest: F(), conif: F(),
      edible: F(), game: F(), harvest: F(), runoff: F(), kc: F(), grove: F(), fish: F(), shell: F(), shellK: F(), depAt: new Map(), px: F(), py: F(), farm: F(), wildGrain: F(), seaRich: F(), seal: F(), sealK: F() };
    for (let i = 0; i < n; i++) { W.px[i] = ((i % N) + 0.5 + (rand() - 0.5) * JIT) * CELL; W.py[i] = (((i / N) | 0) + 0.5 + (rand() - 0.5) * JIT) * CELL; }
    PX = W.px; PY = W.py;

    // --- two islands: warped ellipses, separated by a channel ---
    const ell = (cx, cy, rx, ry, rot) => (x, y) => { const dx = x - cx, dy = y - cy, c = Math.cos(rot), s = Math.sin(rot); const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry; return 1 - Math.sqrt(u * u + v * v); };
    const mc = [0.52 + (rand() - 0.5) * 0.1, 0.5 + (rand() - 0.5) * 0.06];
    const E1 = ell(mc[0], mc[1], 0.15 + rand() * 0.04, 0.36 + rand() * 0.05, (rand() - 0.5) * 0.7);
    const side = rand() < 0.5 ? -1 : 1;
    const E2 = ell(mc[0] + side * (0.28 + rand() * 0.05), mc[1] + (rand() - 0.5) * 0.35, 0.08 + rand() * 0.04, 0.12 + rand() * 0.05, rand() * Math.PI);
    const v1 = new Float32Array(n), v2 = new Float32Array(n);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const fx = W.px[y * N + x] / WORLD, fy = W.py[y * N + x] / WORLD;
      const wx = fx + (noise(fx * 3, fy * 3, 3) - 0.5) * 0.16, wy = fy + (noise(fx * 3 + 7, fy * 3 + 3, 3) - 0.5) * 0.16;
      const d = (noise(fx * 10 + 20, fy * 10, 5) - 0.5) * 0.55 + (noise(fx * 26, fy * 26 + 40, 3) - 0.5) * 0.18;
      v1[y * N + x] = E1(wx, wy) + d; v2[y * N + x] = E2(wx, wy) + d * 1.1;
    }
    // threshold chosen so that land ≈ 240,000 km² (9,600 cells)
    const vals = Array.from({ length: n }, (_, i) => Math.max(v1[i], v2[i])).sort((a, b) => b - a), th = vals[9600];
    const gap = 0.05 + rand() * 0.05;
    for (let i = 0; i < n; i++) {
      const x = i % N, y = (i / N) | 0; if (x < 2 || y < 2 || x > N - 3 || y > N - 3) continue;
      const v = Math.max(v1[i], v2[i]);
      if (v > th && !(Math.abs(v1[i] - v2[i]) < gap && Math.min(v1[i], v2[i]) > th - 0.25)) W.land[i] = 1;
    }
    // fill enclosed water (it becomes land; lakes come from hydrology), label islands
    {
      const sea = U(), q = []; for (let i = 0; i < n; i++) { const x = i % N, y = (i / N) | 0; if ((x === 0 || y === 0 || x === N - 1 || y === N - 1) && !W.land[i]) { sea[i] = 1; q.push(i); } }
      while (q.length) { const i = q.pop(), x = i % N, y = (i / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx; if (!sea[j] && !W.land[j]) { sea[j] = 1; q.push(j); } } }
      for (let i = 0; i < n; i++) if (!sea[i]) W.land[i] = 1;
      const comps = []; const lab = new Int32Array(n).fill(-1);
      for (let i = 0; i < n; i++) if (W.land[i] && lab[i] < 0) {
        const cells = [i]; lab[i] = comps.length; for (let k = 0; k < cells.length; k++) { const c = cells[k], x = c % N, y = (c / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx; if (W.land[j] && lab[j] < 0) { lab[j] = comps.length; cells.push(j); } } }
        comps.push(cells);
      }
      const order = comps.map((c, k) => k).sort((a, b) => comps[b].length - comps[a].length);
      order.forEach((k, r) => { for (const c of comps[k]) W.comp[c] = r + 1; });
      W.islands = order.map(k => comps[k].length);
    }
    // distance to coast (inland) and distance from land (sea)
    const bfs = (src, pass) => { const d = new Float32Array(n).fill(1e9), q = []; for (let i = 0; i < n; i++) if (src(i)) { d[i] = 0; q.push(i); } for (let k = 0; k < q.length; k++) { const i = q[k], x = i % N, y = (i / N) | 0; for (const [dx, dy] of NB8) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx; const dd = d[i] + cdist(i, j); if (pass(j) && d[j] > dd + 1e-6) { d[j] = dd; q.push(j); } } } return d; };
    const isCoastLand = i => { if (!W.land[i]) return false; const x = i % N, y = (i / N) | 0; for (const [dx, dy] of NB8) { const j = (y + dy) * N + x + dx; if (j >= 0 && j < n && !W.land[j]) return true; } return false; };
    for (let i = 0; i < n; i++) W.coast[i] = isCoastLand(i) ? 1 : 0;
    W.inland = bfs(i => W.coast[i], j => W.land[j]);
    W.seaDist = bfs(i => W.land[i], j => !W.land[j]);
    for (let i = 0; i < n; i++) if (!W.land[i] && W.seaDist[i] <= 6) W.shelf[i] = W.seaDist[i] <= 3 ? 1 : 2; // 1 inshore, 2 offshore (boats only)
    // width of the straits between islands (km), for sea crossings by canoe
    { const cc = []; for (let i = 0; i < n; i++) if (W.coast[i]) cc.push(i); W.gap = {};
      for (let a = 0; a < cc.length; a++) for (let b = a + 1; b < cc.length; b++) { const ca = W.comp[cc[a]], cb = W.comp[cc[b]]; if (ca === cb) continue; const k = Math.min(ca, cb) + '-' + Math.max(ca, cb), d = cdist(cc[a], cc[b]) * CELL / 1000; if (!(k in W.gap) || d < W.gap[k]) W.gap[k] = d; } }

    // --- relief: highlands concentrated on one side (as in western/northern Britain) ---
    const ha = rand() * Math.PI * 2, hdx = Math.cos(ha), hdy = Math.sin(ha);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, fx = W.px[i] / WORLD, fy = W.py[i] / WORLD;
      if (!W.land[i]) { W.elev[i] = -20 - 12 * W.seaDist[i]; continue; }
      const hl = clamp(0.25 + smooth(-0.12, 0.25, (fx - mc[0]) * hdx + (fy - mc[1]) * hdy) * 0.6 + (noise(fx * 2.5 + 30, fy * 2.5, 3) - 0.5) * 0.9, 0, 1);
      const ridge = 1 - Math.abs(2 * noise(fx * 7 + 11, fy * 7 + 5, 5) - 1);
      const inl = W.inland[i];
      W.elev[i] = 4 + 120 * Math.pow(Math.min(1, inl / 14), 0.7) + hl * (180 + 1050 * Math.pow(ridge, 2.4)) * Math.min(1, inl / 2.5)
        + 70 * (noise(fx * 14, fy * 14 + 60, 3) - 0.5) * Math.min(1, inl / 2);
      if (W.elev[i] < 2) W.elev[i] = 2;
    }
    // smooth the relief a little (5-km cells average out small pits)
    for (let pass = 0; pass < 2; pass++) { const e0 = W.elev.slice(); for (const i of Array.from({ length: n }, (_, k) => k)) { if (!W.land[i]) continue; const x = i % N, y = (i / N) | 0; let s2 = e0[i] * 2, c2 = 2; for (const [dx, dy] of NB8) { const j = (y + dy) * N + x + dx; if (j >= 0 && j < n && W.land[j]) { s2 += e0[j]; c2++; } } W.elev[i] = s2 / c2; } }
    // --- hydrology: priority-flood from the sea; deep fills become lakes ---
    {
      const orig = W.elev.slice(), done = U(), heap = [];
      const push = (i, h) => { heap.push([h, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
      for (let i = 0; i < n; i++) if (!W.land[i]) { done[i] = 1; if (W.seaDist[i] <= 1.5) push(i, 0); }
      while (heap.length) {
        const [h, i] = pop(), x = i % N, y = (i / N) | 0;
        for (const [dx, dy] of NB8) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
          const j = yy * N + xx; if (done[j]) continue; done[j] = 1;
          if (W.elev[j] <= h) W.elev[j] = h + 0.05; push(j, W.elev[j]);
        }
      }
      const fills = []; for (let i = 0; i < n; i++) if (W.land[i] && !W.coast[i]) fills.push(W.elev[i] - orig[i]);
      fills.sort((a, b) => b - a); const lth = Math.max(20, fills[180] || 0);
      for (let i = 0; i < n; i++) if (W.land[i] && !W.coast[i] && W.elev[i] - orig[i] > lth) W.lake[i] = 1;
    }
    W.landIdx = []; for (let i = 0; i < n; i++) if (W.land[i]) W.landIdx.push(i);
    W.shelfIdx = []; for (let i = 0; i < n; i++) if (W.shelf[i]) W.shelfIdx.push(i);
    for (const i of W.landIdx) {
      const x = i % N, y = (i / N) | 0; let best = -1, bd = 0;
      for (const [dx, dy] of NB8) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
        const j = yy * N + xx, ej = W.land[j] ? W.elev[j] : -1, drop = (W.elev[i] - ej) / cdist(i, j);
        if (drop > bd) { bd = drop; best = j; }
      }
      W.down[i] = best;
      const g = (a, b) => W.land[b] ? W.elev[b] : 0;
      const ex = g(i, y * N + Math.min(N - 1, x + 1)) - g(i, y * N + Math.max(0, x - 1)), ey = g(i, Math.min(N - 1, y + 1) * N + x) - g(i, Math.max(0, y - 1) * N + x);
      W.slope[i] = Math.min(0.6, 3 * Math.hypot(ex, ey) / (2 * CELL)); // ×3: local slopes are steeper than 5-km averages
    }
    W.order = W.landIdx.slice().sort((a, b) => W.elev[b] - W.elev[a]);
    for (const i of W.order) { W.acc[i] += 1; const d = W.down[i]; if (d >= 0 && W.land[d]) W.acc[d] += W.acc[i]; }
    for (const i of W.landIdx) W.isRiver[i] = W.acc[i] >= 28 ? 1 : 0;
    const rElev = new Float32Array(n);
    for (let k = W.order.length - 1; k >= 0; k--) { const i = W.order[k], d = W.down[i]; rElev[i] = (W.isRiver[i] || W.lake[i] || d < 0 || !W.land[d]) ? W.elev[i] : rElev[d]; }
    for (const i of W.landIdx) W.hand[i] = W.elev[i] - rElev[i];

    // --- climate: latitude ~49.5°N (south) to ~60.5°N (north), westerlies, rain shadow ---
    for (let y = 0; y < N; y++) {
      let westDist = 1e9, uw = 0;
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        if (!W.land[i]) { westDist = 0; uw *= 0.9; continue; }
        westDist += CELL / 1000; const e = W.elev[i];
        const cont = clamp(W.inland[i] * CELL / 1000 / 110, 0, 1);
        W.T0[i] = 6.2 + 5.6 * (W.py[i] / WORLD) - 6.0 * e / 1000 + 0.9 * (1 - cont);
        W.amp[i] = 5.2 + 2.6 * cont;
        W.rainAnn[i] = clamp(500 + 620 * Math.exp(-westDist / 110) + 0.9 * e - 0.5 * Math.max(0, uw - e) + (noise(x / 20 + 300, y / 20, 3) - 0.5) * 200, 420, 3200);
        uw = Math.max(uw * 0.93, e);
      }
    }
    // --- geology & soils ---
    for (const i of W.landIdx) {
      const x = W.px[i] / CELL, y = W.py[i] / CELL, e = W.elev[i], nz = noise(x / 6 + 200, y / 6, 3);
      const chalkBand = noise(x / 14 + 500, y / 14 + 100, 4);
      W.chalk[i] = (e < 260 && W.slope[i] < 0.25 && chalkBand > 0.58 && chalkBand < 0.7 && W.T0[i] > 7) ? 1 : 0;
      const sandy = noise(x / 9 + 700, y / 9 + 40, 3) > 0.62;
      if (W.hand[i] < 4 || W.lake[i]) { W.sand[i] = 0.15 + 0.15 * nz; W.clay[i] = 0.3 + 0.12 * (1 - nz); W.depth[i] = 1.4 + 0.3 * nz; W.om[i] = 5; }
      else if (W.chalk[i]) { W.sand[i] = 0.2; W.clay[i] = 0.2; W.depth[i] = 0.35 + 0.15 * nz; W.om[i] = 3.5; }
      else if (W.rainAnn[i] > 1450 && e > 200 && W.slope[i] < 0.25) { W.sand[i] = 0.35; W.clay[i] = 0.15; W.depth[i] = 0.7; W.om[i] = 12; } // blanket peat
      else if (sandy) { W.sand[i] = 0.72; W.clay[i] = 0.06; W.depth[i] = 0.9; W.om[i] = 2; }
      else {
        const s = W.slope[i];
        W.sand[i] = clamp(0.3 + 0.35 * nz + s * 0.4, 0.1, 0.85); W.clay[i] = clamp(0.28 - 0.15 * nz - s * 0.2, 0.05, 0.45);
        W.depth[i] = clamp(1.2 - s * 2.5 + (nz - 0.5) * 0.4 - e / 1600, 0.08, 1.4); W.om[i] = 3;
      }
      W.nit[i] = W.om[i] > 9 ? 12 : W.om[i] * 12 * (1 - 0.5 * W.sand[i]);
      W.whc[i] = W.depth[i] * 1000 * (0.07 + 0.14 * W.clay[i] + 0.08 * (1 - W.sand[i] - W.clay[i])) + W.om[i] * 4;
      if (W.chalk[i]) W.whc[i] *= 0.7;
      W.water[i] = W.whc[i] * 0.6; W.mAvg[i] = 0.6;
      W.game[i] = 10; W.edible[i] = 1500;
      W.conif[i] = clamp((15.8 - (W.T0[i] + W.amp[i])) / 3, 0, 1);
      const Ts0 = W.T0[i] + W.amp[i];
      if (W.depth[i] > 0.45 && Ts0 > 10.5 && W.om[i] < 10 && !W.lake[i]) { W.forest[i] = 0.6; W.shrub[i] = 0.15; W.grass[i] = 0.1; } else { W.grass[i] = 0.35; W.shrub[i] = 0.25; W.forest[i] = 0.02; }
    }
    // --- groves: fruit & nut trees in suitable climates ---
    for (const i of W.landIdx) {
      if (W.lake[i]) continue;
      const x = W.px[i] / CELL, y = W.py[i] / CELL, Ts = W.T0[i] + W.amp[i], T = W.T0[i], p = noise(x / 5 + 900, y / 5 + 900, 3);
      if (p < 0.55) continue;
      let type = 0;
      if (Ts < 11.5 || (W.om[i] > 9 && Ts < 14)) type = 4;
      else if (T > 9.2 && W.elev[i] < 150 && noise(x / 4 + 50, y / 4, 2) > 0.62) type = 3;
      else if (T > 8.4 && W.elev[i] < 220 && noise(x / 4 + 80, y / 4 + 30, 2) > 0.5) type = 2;
      else if (Ts >= 12 && T > 5) type = 1;
      if (!type) continue;
      W.groveType[i] = type; W.grove[i] = clamp((p - 0.55) * 1.6, 0, 0.3) * (type === 4 ? 0.6 : 1);
    }
    // --- coasts: shellfish beds in sheltered bays & estuaries ---
    for (const i of W.landIdx) {
      if (!W.coast[i] || W.elev[i] > 120) continue;
      const x = i % N, y = (i / N) | 0; let sea = 0; for (const [dx, dy] of NB8) { const j = (y + dy) * N + x + dx; if (!W.land[j]) sea++; }
      const shelter = sea >= 1 && sea <= 5 ? 1 : 0.55, mouth = W.isRiver[i] ? 1.6 : 1;
      W.shellK[i] = clamp(shelter * mouth * (0.4 + noise(x / 4 + 400, y / 4, 2)) * 6e6 * (W.T0[i] > 6 ? 1 : 0.7), 0, 1e7); W.shell[i] = W.shellK[i] * 0.8;
    }
    // fishing banks: shoals where cold water upwells teem with cod, herring and mackerel
    for (const i of W.shelfIdx) { const x = W.px[i] / CELL, y = W.py[i] / CELL; W.seaRich[i] = 0.6 + 1.7 * Math.pow(noise(x / 9 + 600, y / 9 + 300, 3), 1.6) * 1.6; }
    for (const i of W.shelfIdx) W.fish[i] = fishK(W, i, 0.6);
    // seal colonies & seabird cliffs along rocky and remote shores
    for (const i of W.landIdx) if (W.coast[i]) { const x = W.px[i] / CELL, y = W.py[i] / CELL, rock = W.slope[i] > 0.05 || W.elev[i] > 40 ? 1 : 0.55; W.sealK[i] = rock * (0.3 + noise(x / 6 + 800, y / 6, 2)) * 3.5e6; W.seal[i] = W.sealK[i]; }
    // --- mineral & trade deposits ---
    placeDeposits(W, noise);
    // --- spin up vegetation & soils without people ---
    for (let k = 0; k < 52 * 12; k++) { stepEnv(W); W.week++; }
    W.week = 0; classifyBiomes(W);
    return W;
  }

  function fishK(W, i, s) {
    if (!W.land[i]) return (W.seaDist[i] <= 1.5 ? 650000 : W.seaDist[i] <= 3 ? 450000 : 320000) * (W.seaRich[i] || 1);
    if (W.lake[i]) return 350000;
    if (W.isRiver[i]) return 12000 * Math.sqrt(W.acc[i]) * fishRun(s);
    return 0;
  }

  const n2 = () => N * N;
  function placeDeposits(W, noise) {
    const rand = W.rand, far = (i, list, km) => list.every(d => cdist(d.cell, i) * CELL / 1000 >= km);
    const add = (type, i, q, note) => { const d = { type, cell: i, x: W.px[i], y: W.py[i], q, note }; W.deposits.push(d); if (!W.depAt.has(i)) W.depAt.set(i, []); W.depAt.get(i).push(d); };
    const pickCells = (pred, count, km, type, q, note) => { const c = W.landIdx.filter(pred).sort(() => rand() - 0.5); const got = []; for (const i of c) { if (got.length >= count) break; if (far(i, got.map(g => ({ cell: g })), km)) { got.push(i); add(type, i, q(), note); } } return got.length; };
    // deposits come in clusters — one district rich in amber, another in copper — so peoples must trade for what they lack
    const cluster = (pred, nC, per, spreadKm, sepKm, type, q, note) => {
      const cand = W.landIdx.filter(pred).sort(() => rand() - 0.5), centres = [];
      for (const i of cand) { if (centres.length >= nC) break; if (centres.every(c => cdist(c, i) * CELL / 1000 >= sepKm)) centres.push(i); }
      let n = 0;
      for (const c0 of centres) {
        const k = per[0] + Math.floor(rand() * (per[1] - per[0] + 1)), near = cand.filter(i => cdist(i, c0) * CELL / 1000 <= spreadKm).sort(() => rand() - 0.5), got = [c0];
        for (const i of near) { if (got.length >= k) break; if (got.every(j => cdist(i, j) * CELL / 1000 >= 9)) got.push(i); }
        for (const i of got) { add(type, i, q(), note); n++; }
      }
      return n;
    };
    // flint from chalk downs (best), beach flint and chert elsewhere
    cluster(i => W.chalk[i] && !W.lake[i], 2, [3, 5], 45, 200, 'flint', () => 0.85 + rand() * 0.15, 'chalk downland flint');
    cluster(i => W.coast[i] && W.elev[i] < 90, 1, [2, 3], 40, 100, 'flint', () => 0.55 + rand() * 0.15, 'beach pebble flint');
    if (rand() < 0.6) pickCells(i => W.comp[i] === 2, 1, 50, 'flint', () => 0.7, 'chert outcrop');
    // amber washes up on one stretch of the eastern shore
    cluster(i => { if (!W.coast[i]) return false; const x = i % N, y = (i / N) | 0; for (let k = 1; k <= 3; k++) if (x + k < N && W.land[y * N + x + k]) return false; return x > N * 0.45; }, 1, [3, 5], 50, 200, 'amber', () => 0.7 + rand() * 0.3, 'amber washed up on the shore');
    cluster(i => W.elev[i] > 380 && W.slope[i] > 0.12, 1 + (rand() < 0.5 ? 1 : 0), [2, 4], 35, 180, 'axe', () => 0.8 + rand() * 0.2, 'hard greenstone for polished axes');
    cluster(i => !W.lake[i] && W.sand[i] > 0.4, 2, [2, 3], 35, 180, 'ochre', () => 0.6 + rand() * 0.4, 'red ochre pigment');
    cluster(i => W.coast[i] && W.shellK[i] > 0 && W.T0[i] > 8, 1 + (rand() < 0.5 ? 1 : 0), [2, 3], 40, 200, 'salt', () => 0.7 + rand() * 0.3, 'salt from saltmarsh pans');
    // wild emmer & barley: rare stands on warm, dry-ish, deep floodplain soils of a river valley
    const grainOK = (i, strict) => !W.lake[i] && !W.coast[i] && W.comp[i] === 1 && (W.isRiver[i] || W.hand[i] < 4) && W.slope[i] < 0.08 && W.depth[i] > (strict ? 1.1 : 0.8) && W.T0[i] > (strict ? 9.5 : 8.5) && W.rainAnn[i] < (strict ? 900 : 1100);
    if (!pickCells(i => grainOK(i, true), 1, 150, 'grain', () => 1, 'wild emmer & barley in the river valley')) pickCells(i => grainOK(i, false), 1, 150, 'grain', () => 1, 'wild emmer & barley in the river valley');
    // copper in the uplands, stream tin on a rocky stretch of coast, whales offshore
    cluster(i => W.elev[i] > 250 && W.slope[i] > 0.06 && !W.lake[i], 2, [3, 5], 40, 220, 'copper', () => 0.7 + rand() * 0.3, 'copper ore in the hills');
    if (!pickCells(i => W.coast[i] && W.elev[i] > 50 && W.slope[i] > 0.06, 1 + (rand() < 0.5 ? 1 : 0), 150, 'tin', () => 0.8 + rand() * 0.2, 'stream tin on a rocky coast')) pickCells(i => W.coast[i], 1, 150, 'tin', () => 0.8, 'stream tin on the coast');
    { const sea = []; for (let i = 0; i < n2(); i++) if (!W.land[i] && W.seaDist[i] >= 1.2 && W.seaDist[i] <= 4) sea.push(i); sea.sort(() => rand() - 0.5);
      const got = []; for (const i of sea) { if (got.length >= 6 + Math.floor(rand() * 3)) break; if (got.every(j => cdist(i, j) * CELL / 1000 > 100)) { got.push(i); add('whale', i, 1, 'whales pass close to shore in spring and autumn'); } } }
    // potter's clay lies in the banks of lowland rivers: common enough, but not everywhere
    cluster(i => !W.lake[i] && !W.coast[i] && (W.isRiver[i] || W.hand[i] < 3) && W.slope[i] < 0.05 && W.elev[i] < 260, 7, [2, 4], 30, 110, 'clay', () => 0.6 + rand() * 0.4, 'good potter\'s clay in the river banks');
    // dense wild stands spread along the valley floor around the find
    for (const d of W.deposits) if (d.type === 'grain') for (const i of W.landIdx) { const km = cdist(i, d.cell) * CELL / 1000; if (km < 22 && W.hand[i] < 8 && !W.lake[i]) W.wildGrain[i] = Math.max(W.wildGrain[i], 0.18 * (1 - km / 22)); }
  }

  // ---------- biomes (re-classified yearly as vegetation changes) ----------
  function classifyBiomes(W) {
    for (const i of W.landIdx) {
      const Ts = W.T0[i] + W.amp[i], f = W.forest[i], s = W.shrub[i], g = W.grass[i];
      let b;
      if (W.lake[i]) b = 1;
      else if (Ts < 10.5 || W.elev[i] > 750) b = 2;
      else if ((W.hand[i] < 1.5 && W.mAvg[i] > 0.9 && W.slope[i] < 0.03) || (W.om[i] > 9 && W.mAvg[i] > 0.9)) b = 8;
      else if (W.coast[i] && W.elev[i] < 40 && f < 0.3) b = 9;
      else if (f > 0.33) b = W.conif[i] > 0.6 ? 3 : W.conif[i] > 0.25 ? 4 : 5;
      else if (s >= g && (W.sand[i] > 0.55 || W.nit[i] < 25)) b = 7;
      else b = 6;
      W.biome[i] = b;
    }
    for (let i = 0; i < N * N; i++) if (!W.land[i]) W.biome[i] = 0;
  }

  // ---------- environment step (weekly) ----------
  function stepEnv(W) {
    const s = seasonOf(W.week), tS = tempOffset(s), fw = foodWeight(s), rand = W.rand, run = fishRun(s);
    if (W.week % 4 === 0) W.weather = clamp(W.weather * 0.5 + (0.3 + rand() * 1.4) * 0.5, 0.2, 2.2);
    const rainSeason = 1 + 0.3 * Math.cos(2 * Math.PI * (s - 0.9));
    W.runoff.fill(0);
    for (const i of W.landIdx) {
      const T = W.T0[i] + W.amp[i] * tS, gw = growWeight(T), Ts = W.T0[i] + W.amp[i];
      if (W.lake[i]) { W.fish[i] += (fishK(W, i, s) - W.fish[i]) * 0.08; continue; }
      let g = W.grass[i], sh = W.shrub[i], f = W.forest[i], cover = g + sh + f;
      const rain = W.rainAnn[i] / 52 * rainSeason * W.weather, whc = W.whc[i];
      let w = W.water[i] + rain * (0.55 + 0.45 * cover);
      W.runoff[i] = rain * (0.45 - 0.45 * cover);
      const pet = Math.max(0, T) * 0.34 * 7;
      w -= pet * (w / whc) * (0.25 + 0.75 * cover);
      if (w > whc) { const ex = w - whc; W.runoff[i] += ex; W.nit[i] -= W.nit[i] * 0.02 * Math.min(1, ex / whc); w = whc; }
      if (W.hand[i] < 1.5) w = Math.max(w, whc * 0.8); else if (W.hand[i] < 5) w = Math.max(w, whc * 0.5);
      if (w < 0) w = 0; W.water[i] = w;
      const m = w / whc; W.mAvg[i] += (m - W.mAvg[i]) / 52;
      const Kc = clamp(Math.min(1.6 * W.mAvg[i], W.nit[i] / 35, W.depth[i] / 0.35, (Ts - 6) / 6), 0, 1);
      W.kc[i] = Kc;
      const free = Kc - cover;
      const forestOK = W.mAvg[i] > 0.38 && W.depth[i] > 0.45 && Ts > 10.5 && !(W.om[i] > 10 && W.mAvg[i] > 0.85);
      let dg = 0.09 * gw * (g + 0.004) * free, ds = 0.028 * gw * (sh + 0.002) * free, df = forestOK ? 0.012 * gw * (f + 0.001) * free : -0.01 * f;
      if (free < 0) { const k = 1 + free / Math.max(cover, 1e-4); dg = g * (k - 1) * 0.2; ds = sh * (k - 1) * 0.2; df = f * (k - 1) * 0.2; }
      const gs = Kc > 0.35 ? 0.004 * gw * g * Math.min(1, sh * 8 + 0.02) : 0;
      const sf = forestOK ? 0.003 * gw * sh * Math.min(1, f * 8 + 0.02) : 0;
      g = Math.max(0, g + dg - gs - 0.003 * gw * g * f); sh = Math.max(0, sh + ds + gs - sf); f = Math.max(0, f + df + sf);
      W.grass[i] = g; W.shrub[i] = sh; W.forest[i] = f; cover = g + sh + f;
      // nutrients & organic matter; waterlogged soils barely decompose -> peat builds up
      const prod = 0.05 * gw * cover, decomp = W.om[i] * 0.0016 * gw * (W.mAvg[i] > 0.93 && W.rainAnn[i] > 1100 ? 0.3 : 1);
      W.om[i] += prod * 0.12 - decomp;
      W.nit[i] = clamp(W.nit[i] + decomp * 300 + 0.04 - prod * 30, 0, 140);
      const ero = W.slope[i] * (rain / 30) * (1 - cover) * (1 - cover) * 0.0015;
      if (ero > 0 && W.depth[i] > 0.05) { W.depth[i] -= ero; W.om[i] -= W.om[i] * ero / 0.3; if (W.depth[i] < 0.05) W.depth[i] = 0.05; }
      // wild plant food incl. fruit & nut groves (kcal / ha)
      const groveProd = W.grove[i] * (W.groveType[i] === 4 ? 9000 : 20000) * Math.min(1, (sh + f) * 1.5) + W.wildGrain[i] * 120000;
      W.edible[i] = W.edible[i] * 0.95 + (g * 2500 + sh * 6000 + f * 1500 * (1 - 0.5 * W.conif[i]) + groveProd) / 52 * fw * gw;
      // game (kg/ha): cooler, poorer land carries fewer animals
      const K = (3 + 28 * g + 22 * sh + 10 * f) * clamp(Ts / 16, 0.4, 1), G = W.game[i];
      W.game[i] = Math.max(0.05, G + 0.35 / 52 * G * (1 - G / K));
      W.harvest[i] *= 0.97;
      // river fish (salmon & trout runs) and shellfish
      if (W.isRiver[i]) W.fish[i] += (12000 * Math.sqrt(W.acc[i]) * run - W.fish[i]) * 0.4;
      if (W.shellK[i] > 0) W.shell[i] = Math.max(1000, W.shell[i] + 0.6 / 52 * W.shell[i] * (1 - W.shell[i] / W.shellK[i]));
      if (W.sealK[i] > 0) W.seal[i] = Math.max(5000, W.seal[i] + 0.12 / 52 * W.seal[i] * (1 - W.seal[i] / W.sealK[i]));
    }
    for (const i of W.shelfIdx) W.fish[i] += (fishK(W, i, s) - W.fish[i]) * 0.1;
    W.flow.fill(0);
    for (const i of W.order) { W.flow[i] += W.runoff[i]; const d = W.down[i]; if (d >= 0 && W.land[d]) W.flow[d] += W.flow[i]; }
    if (W.week % 2 === 0) {
      const g2 = W._g2 || (W._g2 = new W.game.constructor(W.game.length)); g2.set(W.game);
      for (const i of W.landIdx) { const x = i % N, y = (i / N) | 0; if (x < 1 || y < 1 || x > N - 2 || y > N - 2) continue; let s4 = 0, c4 = 0; let j = i - 1; if (W.land[j] && !W.lake[j]) { s4 += g2[j]; c4++; } j = i + 1; if (W.land[j] && !W.lake[j]) { s4 += g2[j]; c4++; } j = i - N; if (W.land[j] && !W.lake[j]) { s4 += g2[j]; c4++; } j = i + N; if (W.land[j] && !W.lake[j]) { s4 += g2[j]; c4++; } if (c4) W.game[i] = 0.84 * g2[i] + 0.16 * s4 / c4; }
    }
    if (W.week % 52 === 51) classifyBiomes(W);
  }
