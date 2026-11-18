  // =====================================================================
  //  PEOPLE & SOCIETY
  //  Person -> Family (household) -> Clan (extended kin group = a camp on the map) -> Tribe (5-10 clans, <=150)
  //  Every Family / Clan / Tribe keeps relations (opinion, grudge, shared history) with others at its level.
  // =====================================================================
  const SYL = ['ka','lu','mi','ro','ta','ne','si','ba','do','ri','ya','ko','ma','te','na','bi','sa','wo','le','gu','ha','ze','pi','an','or','el','tu','ve'];
  function makeName(rand, n) { n = n || 2 + (rand() < 0.4 ? 1 : 0); let s = ''; for (let k = 0; k < n; k++) s += SYL[Math.floor(rand() * SYL.length)]; return s[0].toUpperCase() + s.slice(1); }
  // every person is made with the same set of fields (the later ones empty), so that all of them share one shape in memory and the weekly passes over the people stay quick; an empty field is not written to a save
  const personShell = () => ({ id: 0, name: '', sex: '', age: 0, mother: null, father: null, spouse: null, fam: null, clan: null, alive: true, preg: 0, pp: -1, nursing: null, kids: 0, born: 0, temper: 0, skill: 0,
    dyn: undefined, lineage: undefined, nSlaves: undefined, reserved: undefined, wives: undefined, job: undefined, widowed: undefined, lastMate: undefined, giftPrestige: undefined, slave: undefined, owner: undefined, origin: undefined, originClan: undefined, taken: undefined, foundling: undefined, traits: undefined, did: undefined, pathAsked: undefined, cause: undefined, died: undefined, adopted: undefined, toldHead: undefined });
  function makePerson(W, sex, age, mother, father) {
    const tp = mother && father ? (mother.temper + father.temper) / 2 : mother ? mother.temper : 0.5;
    const P = personShell(); P.id = W.nextPid++; P.name = nameIn(mother && mother.clan && mother.clan.tribe ? mother.clan.tribe.kult : W._kult, W.rand); P.sex = sex; P.age = age; P.mother = mother || null; P.father = father || null; P.born = W.week - Math.round(age * 52);
    P.temper = clamp(tp + (W.rand() - 0.5) * 0.3, 0, 1); P.skill = clamp(0.5 + (W.rand() - 0.5) * 0.6, 0.1, 1); return P;
  }
  // fecundability by age (fraction of peak): adolescent subfecundity, perimenopausal decline
  function fecund(a) { if (a < 15) return 0; if (a < 17) return 0.1; if (a < 19) return 0.35; if (a < 21) return 0.75; if (a < 30) return 1; if (a < 35) return 0.85; if (a < 40) return 0.55; if (a < 45) return 0.15; if (a < 50) return 0.01; return 0; }
  const CONCEIVE_WK = 0.024;     // weekly conception chance, fully fecund, well-fed, married, not nursing
  const LACT_WKS = 105;          // lactational amenorrhea after a birth (lengthens when hungry)
  const lifeStage = a => a < 3 ? 'infant' : a < 15 ? 'child' : a < 60 ? 'adult' : 'elder';
  const TRIBE_MAX = 350;
  const tribeMax = t => 300 + (t.id * 37) % 101; // each people has its own breaking point, somewhere between three and four hundred

  // ---------- entities, relations, history ----------
  function ent(W, kind, props) { const e = Object.assign({ id: W.nextId++, kind, rel: new Map(), hist: [], founded: W.week, alive: true }, props); W.ents.set(e.id, e); return e; }
  function kill(W, e) { e.alive = false; W.ents.delete(e.id); }
  function rel(a, b) { let r = a.rel.get(b.id); if (!r) { r = { op: 0, grudge: 0, hist: [], t: 0, kin: 0, feasts: 0, trade: 0, allied: false }; a.rel.set(b.id, r); b.rel.set(a.id, r); } return r; }
  const opinion = (a, b) => { const r = a.rel.get(b.id); return r ? r.op - r.grudge : 0; };
  function affect(W, a, b, d, text, grudge) {
    if (!a || !b || a === b) return; const r = rel(a, b);
    r.op = clamp(r.op + d, -100, 100); if (grudge) r.grudge = clamp(r.grudge + grudge, 0, 100);
    if (text) { r.hist.push({ w: W.week, t: text }); if (r.hist.length > 10) r.hist.shift(); }
  }
  function note(W, e, text) { e.hist.push({ w: W.week, t: text }); if (e.hist.length > 40) e.hist.shift(); }
  function logEvent(W, text, e, kind) { W.events.push({ week: W.week, text, id: e ? e.id : null, kind: kind || 'info' }); if (W.events.length > 300) W.events.shift(); if (text[0] !== 'A' || text.slice(0, 7) !== 'A story') mythHook(W, text, e); }
  const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];

  function newFamily(W, clan, head) { return ent(W, 'family', { name: head.name, clan, head }); }
  function newClan(W, tribe, x, y, people, name, parent) {
    if (name && tribe && tribe.clans) { const base = name; for (const sfx of ['a', 'i', 'o', 'an', 'or', 'en', 'ul']) { if (!tribe.clans.some(k => k.name === name)) break; name = base + sfx; } }
    const c = ent(W, 'clan', { name, tribe, x, y, tx: x, ty: y, people, store: 0, cond: 0.95, supply: 2, parent: parent || null,
      light: 45 + W.rand() * 25, tool: 0.6, grain: 0, cereal: 0, settled: false, soil: 1, village: null, goods: { flint: 0, amber: 0, axe: 0, ochre: 0, salt: 0, furs: 0, shells: 0, copper: 0, tin: 0, metal: 0, bronze: 0, clay: 0, pots: 0, leather: 0, art: 0 }, live: null, fishYears: 0, yr: { births: 0, deaths: 0, starv: 0, infD: 0, killed: 0, intake: 0, need: 0 }, last: null, lowWeeks: 0, head: null });
    for (const q of people) q.clan = c;
    { const pc = parent != null ? W.ents.get(parent) : null; if (pc && pc.rule === 2) { c.rule = 1; c.ruleSince = W.week; note(W, c, `Its head holds the seat for life, as in the ${pc.name} clan.`); } }
    tribe.clans.push(c); W.clans.push(c); return c;
  }
  function newTribe(W, name, hue, parent, kult) { const pt = parent != null ? W.ents.get(parent) : null, K = kult || (pt && pt.kult) || W._kult || newKult(W, 0, null, hue); const t = ent(W, 'tribe', { kult: K, drift: pt && pt.kult === K ? pt.drift || 0 : 0, myths: pt && pt.myths ? pt.myths.map(m => ({ ...m })) : null, craft: pt && pt.craft ? { ...pt.craft } : { pot: 0, tan: 0, art: 0 }, walled: !!(pt && pt.walled), culture: newCulture(W.rand), name: name || tribeNameIn(W, K), hue, clans: [], parent: parent || null, headman: null, atWar: new Set(), seen: new Set(), site: null, home: null, popHist: [], confed: null, warLosses: 0, dom: 0, stage: 0, boats: 0, metal: 0, bronzeAge: false }); if (pt && t.myths) for (const m of t.myths) { if (m.kind === 'hero') { if (!m.text.includes('forebears the ' + pt.name)) m.text = m.text.split('led the ' + pt.name).join('led our forebears the ' + pt.name); } else m.text = m.text.split('the ' + pt.name).join('the ' + t.name); } W.tribes.push(t); return t; }
  const freeCount = c => { let n = 0; for (const q of c.people) if (!q.slave) n++; return n; };
  const clanSize = c => freeCount(c);
  const tribeSize = t => t.clans.reduce((s, c) => s + freeCount(c), 0);
  const slaveCount = t => t.clans.reduce((s, c) => s + c.people.length - freeCount(c), 0);
  function familiesOf(c) { const s = new Set(); for (const q of c.people) if (q.fam && q.fam.alive) s.add(q.fam); return [...s]; }
  const famMembers = (f) => f.clan ? f.clan.people.filter(q => q.fam === f) : [];
  const isAdult = q => q.age >= 16;

  // ---------- founding ----------
  function makeFamily(W, clan, people) { W._kult = clan.tribe.kult || W._kult;
    // a couple with children of plausible ages; sometimes a widowed elder parent lives with them
    const age = 20 + W.rand() * 18;
    const h = makePerson(W, 'M', age + 2 + W.rand() * 5), w = makePerson(W, 'F', age);
    h.spouse = w; w.spouse = h; const f = newFamily(W, clan, h); h.fam = w.fam = f; people.push(h, w);
    let a = w.age - 19 - W.rand() * 2;
    while (a > 0) { if (W.rand() < 0.65) { const c = makePerson(W, W.rand() < 0.512 ? 'M' : 'F', a, w, h); c.fam = f; people.push(c); w.kids++; h.kids = (h.kids || 0) + 1; if (a < 2.5) { w.nursing = c; w.pp = W.week + Math.round((2.6 - a) * 52); } } a -= 3 + W.rand() * 2; }
    if (W.rand() < 0.3) { const e = makePerson(W, W.rand() < 0.6 ? 'F' : 'M', 52 + W.rand() * 15); e.fam = f; people.push(e); }
    return f;
  }
  function seedFirstPop(W, nTribes = 4) {
    PX = W.px; PY = W.py; stampWorld(W);
    const placed = [], phs = [0, 1, 2, 3, 4].sort(() => W.rand() - 0.5); // each founding people has its own sounds
    for (let t = 0; t < nTribes; t++) {
      // the last founding tribe settles the second island, so both islands are peopled
      const wantComp = t === nTribes - 1 ? 2 : 1, gdep = t === 0 ? W.deposits.find(d => d.type === 'grain') : null;
      let best = null, bs = -Infinity;
      for (let k = 0; k < 500; k++) {
        const i = W.landIdx[Math.floor(W.rand() * W.landIdx.length)];
        if (gdep) { const km = cdist(i, gdep.cell) * CELL / 1000; if (km < 8 || km > 35) continue; }
        if (W.comp[i] !== wantComp || W.lake[i]) continue;
        const x = W.px[i], y = W.py[i];
        if (placed.some(p => Math.hypot(p[0] - x, p[1] - y) < (nTribes > 3 ? 140000 : 220000))) continue;
        const sc = siteScore(W, x, y, null, 1) * (0.7 + W.rand() * 0.6);
        if (sc > bs) { bs = sc; best = [x, y]; }
      }
      if (!best) continue; placed.push(best);
      const tribe = newTribe(W, null, (28 + t * (360 / nTribes) + W.rand() * 30) % 360, null, newKult(W, phs[t % phs.length], null, (205 + t * (360 / nTribes)) % 360)); tribe.kult.hearth = tribe; tribe.home = best.slice();
      tribe.culture = [{ faith: 'mother', matri: true, patri: 0.15 }, { faith: 'spirits', matri: false, patri: 0.8 }, (m => ({ faith: 'totem', matri: m, patri: m ? 0.3 : 0.7 }))(W.rand() < 0.5)][t % 3]; // the founding peoples differ in custom and belief
      const nClans = 3;
      for (let k = 0; k < nClans; k++) {
        const people = [], nf = 3 + Math.floor(W.rand() * 2);
        const c = newClan(W, tribe, best[0], best[1], people, 'clan');
        for (let j = 0; j < nf; j++) makeFamily(W, c, people);
        for (const q of people) q.clan = c;
        c.name = familiesOf(c)[0].name; c.store = 7 * 2000 * people.length;
        note(W, c, `The ${c.name} clan is one of the founding clans of the ${tribe.name}.`);
      }
      rebuildBuckets(W);
      for (const c of tribe.clans) { relocate(W, c, 8000, 25000); c.x = c.tx; c.y = c.ty; rebuildBuckets(W); }
      for (const a of tribe.clans) for (const b of tribe.clans) if (a.id < b.id) affect(W, a, b, 25 + W.rand() * 15, 'Old marriage ties between founding clans');
      updateLeaders(W, tribe, true);
      const bi = BIOMES[W.biome[cellAt(best[0], best[1])]].name.toLowerCase();
      logEvent(W, `The ${tribe.name} — ${tribeSize(tribe)} people in ${nClans} clans — make their home in the ${bi} of the ${W.comp[cellAt(best[0], best[1])] === 1 ? 'great isle' : 'lesser isle'}. They speak ${tribe.kult.name}.`, tribe, 'big');
      note(W, tribe, `The ${tribe.name} arrive with ${nClans} clans.`);
    }
  }

  // ---------- spatial index of camps ----------
  const BUCKET = 30000;
  function rebuildBuckets(W) { const B = new Map(); for (const c of W.clans) { const k = Math.floor(c.x / BUCKET) + Math.floor(c.y / BUCKET) * 1000; if (!B.has(k)) B.set(k, []); B.get(k).push(c); } W.buckets = B; }
  function nearClans(W, x, y, r) {
    const out = [], bx0 = Math.floor((x - r) / BUCKET), bx1 = Math.floor((x + r) / BUCKET), by0 = Math.floor((y - r) / BUCKET), by1 = Math.floor((y + r) / BUCKET);
    for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) { const L = W.buckets && W.buckets.get(bx + by * 1000); if (L) for (const c of L) if (c.alive && Math.hypot(c.x - x, c.y - y) <= r) out.push(c); }
    return out;
  }

  // ---------- foraging: plants, game, fish, shellfish, fruit & nut groves ----------
  // Each cell's share of the camp's range (smooth disc) times a distance-decay weight.
  // a camp that stays put forages the same cells with the same weights every week: keep the list (by position) instead of working it out twice a week
  const FL_CACHE = new WeakMap();
  function forageList(W, c) {
    let L = FL_CACHE.get(c);
    if (L && L.x === c.x && L.y === c.y && L.px === PX) return L;
    const idx = [], ev = []; forageCells(W, c.x, c.y, (i, e) => { idx.push(i); ev.push(e); });
    L = { x: c.x, y: c.y, px: PX, idx, ev }; FL_CACHE.set(c, L); return L;
  }
  function forageCells(W, x, y, fn) {
    const cx = x / CELL - 0.5, cy = y / CELL - 0.5, r = FORAGE_R / CELL + 1;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(N - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(N - 1, Math.ceil(cy + r));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const ii = yy * N + xx, dx = PX[ii] - x, dy = PY[ii] - y, d = Math.hypot(dx, dy);
      const cov = clamp((FORAGE_R + CELL * 0.5 - d) / CELL, 0, 1); if (cov <= 0) continue;
      fn(yy * N + xx, cov / (1 + (d * d) / (DECAY_R * DECAY_R)));
    }
  }
  // kcal/week obtainable from a cell, split by source; tool = stone-tool quality (flint etc.)
  // how much of the sea a people can work: wading/lines inshore; dugouts more; seagoing canoes reach offshore waters
  const seaF = (s, b) => s === 1 ? 0.5 + 0.8 * b : s === 2 && b >= 0.6 ? 0.6 * b : 0;
  function cellFood(W, i, e, tool, boats = 0) {
    const t = 0.55 + 0.45 * Math.min(1.25, tool);
    if (!W.land[i]) return W.shelf[i] ? W.fish[i] * FISH_CATCH * seaF(W.shelf[i], boats) * t * e : 0;
    if (W.lake[i]) return W.fish[i] * FISH_CATCH * t * e;
    let k = W.edible[i] * HA * PLANT_CATCH * e + W.game[i] * HA * KCAL_PER_KG_GAME * GAME_CATCH * t * e;
    if (W.isRiver[i]) k += W.fish[i] * FISH_CATCH * t * e;
    if (W.shellK[i]) k += W.shell[i] * SHELL_CATCH * e;
    if (W.sealK[i]) k += W.seal[i] * SEAL_CATCH * (0.6 + 0.4 * Math.min(1, boats * 2)) * e;
    return k;
  }
  function foodBreakdown(W, x, y, tool, boats = 0) {
    const t = 0.55 + 0.45 * Math.min(1.25, tool), o = { plants: 0, groves: 0, game: 0, fish: 0, shellfish: 0, seals: 0 };
    forageCells(W, x, y, (i, e) => {
      if (!W.land[i]) { if (W.shelf[i]) o.fish += W.fish[i] * FISH_CATCH * seaF(W.shelf[i], boats) * t * e; return; }
      if (W.lake[i]) { o.fish += W.fish[i] * FISH_CATCH * t * e; return; }
      const ed = W.edible[i] * HA * PLANT_CATCH * e, base = W.grass[i] * 2500 + W.shrub[i] * 6000 + W.forest[i] * 1500 * (1 - 0.5 * W.conif[i]), gr = W.grove[i] * (W.groveType[i] === 4 ? 9000 : 20000) * Math.min(1, (W.shrub[i] + W.forest[i]) * 1.5), gp = ed * gr / Math.max(1, base + gr);
      o.plants += ed - gp; o.groves += gp; o.game += W.game[i] * HA * KCAL_PER_KG_GAME * GAME_CATCH * t * e;
      if (W.isRiver[i]) o.fish += W.fish[i] * FISH_CATCH * t * e; if (W.shellK[i]) o.shellfish += W.shell[i] * SHELL_CATCH * e; if (W.sealK[i]) o.seals += W.seal[i] * SEAL_CATCH * (0.6 + 0.4 * Math.min(1, boats * 2)) * e;
    });
    return o;
  }
  function potential(W, x, y, tool = 0.6, boats = 0) { let P = 0; forageCells(W, x, y, (i, e) => { P += cellFood(W, i, e, tool, boats); }); return P; }
  function siteScore(W, x, y, self, _s, tool) {
    const i = cellAt(x, y); if (!W.land[i] || W.lake[i]) return -Infinity;
    let P = potential(W, x, y, tool ?? (self ? self.tool : 0.6), self ? self.tribe.boats : 0);
    const wet = W.isRiver[i] || W.coast[i] || W.hand[i] < 5 ? 1 : W.hand[i] < 25 ? 0.85 : 0.65;
    P *= wet * (W.slope[i] > 0.3 ? 0.6 : 1) * (BIOMES[W.biome[i]] && W.biome[i] === 8 ? 0.8 : 1);
    for (const o of nearClans(W, x, y, 2 * FORAGE_R)) {
      if (o === self) continue; const d = Math.hypot(o.x - x, o.y - y);
      const hostile = self && o.tribe !== self.tribe ? Math.max(0, -opinion(self.tribe, o.tribe)) / 100 : 0;
      P -= needsWeek(o) * (1.3 + 2 * hostile) * (1 - d / (2 * FORAGE_R));
    }
    // valuable stone close by is a draw
    for (const dd of W.deposits) if ((dd.type === 'flint' || dd.type === 'axe') && self && self.tool < 0.8 && Math.hypot(dd.x - x, dd.y - y) < FORAGE_R + 3000) P *= 1.15;
    return P;
  }
  const sameIsland = (W, c, x, y) => W.comp[cellAt(x, y)] === W.comp[cellAt(c.x, c.y)];
  // a people can reach land across a strait if their boats can make the crossing (dugouts ~20 km, seagoing canoes ~70 km)
  function canReach(W, c, x, y) { const a = W.comp[cellAt(c.x, c.y)], b = W.comp[cellAt(x, y)]; if (a === b) return true; if (!a || !b) return false; const g = W.gap[Math.min(a, b) + '-' + Math.max(a, b)], bt = (c.tribe || c).boats || 0; return g != null && ((bt >= 0.6 && g <= 70) || (bt >= 0.3 && g <= 20)); }

  function personKcal(q) {
    let k = kcalDay(q.age, q.sex === 'M');
    if (q.preg > 0) k += 300;
    if (q.nursing && q.nursing.alive && q.nursing.age < 2.5) k += q.nursing.age < 1 ? 500 : 300;
    return k;
  }
  function eatStore(c, k) { const a = Math.min(c.store, k); c.store -= a; if (k > a) c.grain = Math.max(0, (c.grain || 0) - (k - a)); } // a cost in food: fresh food first, then what is stored
  function needsWeek(c) { let k = 0; for (const q of c.people) k += personKcal(q); return k * 7; }
  function labor(c) { let w = 0; for (const q of c.people) w += workerEq(q.age) * (0.6 + 0.6 * q.skill) * (q.sex === 'F' ? (q.nursing && q.nursing.alive && q.nursing.age < 1 ? 0.6 : 0.85) : 1) * (q.job ? 0.6 : 1); return w; }

  function die(W, c, q, cause, byClan, by) {
    heroCandidate(W, q, c);
    q.alive = false; q.cause = cause; q.died = W.week; c.yr.deaths++; if (by) q.killedBy = by;
    if (q.dyn && byClan && W.player && !W.player.over) bloodEvent(W, q, byClan);
    { const P = W.player; if (P && !P.over && P.head && q !== P.head) { const H = P.head, hc = H.clan, far = hc && c && c.tribe !== hc.tribe, sp = H.spouse === q || q.spouse === H, kid = q.mother === H || q.father === H;
      if (sp) houseNote(W, `${q.name}, ${q.sex === 'F' ? 'wife' : 'husband'} of ${H.name}, died at ${Math.floor(q.age)} (${cause}).`);
      else if (q.dyn && q.age >= 5 && !houseNear(W, q)) { if (c === hc) houseCount(W, 'sumD'); } // a more distant kinsman: counted for the year, not listed
      else if (q.dyn && q.age >= 5) houseNote(W, far ? `${q.name}, of our blood among the ${c.tribe.name}, died at ${Math.floor(q.age)} (${cause}).` : c !== hc && c ? `${q.name} of our house, living with the ${c.name} clan, died at ${Math.floor(q.age)} (${cause}).` : `${q.name} of our house died at ${Math.floor(q.age)} (${cause}).`);
      else if (kid && q.age < 5) houseNote(W, `${q.name}, ${q.sex === 'F' ? 'daughter' : 'son'} of ${H.name}, died ${q.age < 2 ? 'in infancy' : 'a small child'}.`);
      else if (q.dyn && q.age < 5 && ((q.mother && (q.mother.mother === H || q.mother.father === H)) || (q.father && (q.father.mother === H || q.father.father === H)))) houseNote(W, `${q.name}, ${q.sex === 'F' ? 'granddaughter' : 'grandson'} of ${H.name}, died ${q.age < 2 ? 'in infancy' : 'a small child'}.`);
      else if (q.foundling && c === hc) houseNote(W, `${q.name}, the foundling, died at ${Math.floor(q.age)} (${cause}).`);
      else if (q.slave && q.owner && q.owner.dyn) houseNote(W, `${q.name}, a slave of ${q.owner.name}, died${q.age >= 1 ? ' at ' + Math.floor(q.age) : ''} (${cause}).`); } }
    if (q.sex === 'M') { for (const w of c.people) if (w.spouse === q) { w.spouse = null; w.widowed = W.week; } q.spouse = null; }
    else if (q.spouse) { const m = q.spouse; if (m.spouse === q) m.spouse = c.people.find(w => w !== q && w.alive && w.spouse === m) || null; m.wives = Math.max(0, (m.wives || 1) - 1); if (!m.spouse) m.widowed = W.week; }
    if (q.age < 1) c.yr.infD++;
    if (q === c.head) note(W, c, `${q.name}, head of the ${c.name} clan, dies (${cause}) at ${Math.floor(q.age)}.`);
    if (q.fam) q.fam.lastDeath = W.week;
  }

  // The 3x test world for profiling (not used by the game): every living clan but the player's gets two copies, in the same tribe, 3 to 6 km off.
  // Each copy has its own persons (links inside the clan point at the copies, a spouse outside becomes null, other links stay), its own families, and the clan's goods, stores and village name.
  function profTriple(W) {
    const pc = W.player && W.player.head && W.player.head.clan, base = W.clans.filter(c => c.alive && c.people.length && c !== pc), SKIP = new Set(['id', 'kind', 'rel', 'hist', 'founded', 'alive', 'name', 'tribe', 'x', 'y', 'tx', 'ty', 'people', 'parent', 'head', 'favored', 'atGathering']);
    const cp = v => Array.isArray(v) ? v.slice() : v instanceof Map ? new Map(v) : v && typeof v === 'object' && !v.kind && !('sex' in v) ? Object.assign({}, v) : v; // a person or an entity is a link, kept as it is
    let nc = 0, np = 0;
    for (const c of base) for (let k = 0; k < 2; k++) {
      const m = new Map(), fm = new Map(), rnd = mulberry32((W.seed | 0) + c.id * 7 + k), ang = rnd() * 6.2832, dist = 3000 + rnd() * 3000;
      const live = c.people.filter(q => q.alive), kids = [];
      for (const q of live) { const n = personShell(); n.id = W.nextPid++; for (const f of Object.keys(q)) if (f !== 'id' && f !== 'dyn') n[f] = cp(q[f]); m.set(q, n); kids.push(n); }
      const pos = landNear(W, c.x + Math.cos(ang) * dist, c.y + Math.sin(ang) * dist), clan = newClan(W, c.tribe, pos[0], pos[1], kids, c.name, null);
      for (const f of Object.keys(c)) if (!SKIP.has(f)) clan[f] = cp(c[f]);
      clan.head = m.get(c.head) || null; clan.atGathering = false; clan.tx = clan.x; clan.ty = clan.y;
      for (const q of live) { const n = m.get(q);
        for (const f of ['mother', 'father', 'nursing', 'lastMate', 'owner']) if (n[f] && m.has(n[f])) n[f] = m.get(n[f]);
        if (n.spouse) n.spouse = m.get(n.spouse) || null; // a spouse in another clan: none, so marriages stay two-sided
        if (n.fam) { let f = fm.get(n.fam); if (!f) { const o = n.fam; f = ent(W, 'family', { name: o.name, clan, head: m.get(o.head) || o.head }); for (const x of Object.keys(o)) if (!(x in f) && x !== 'rel' && x !== 'hist') f[x] = cp(o[x]); fm.set(o, f); } n.fam = f; }
        n.clan = clan; }
      nc++; np += kids.length;
    }
    return { clans: nc, people: np };
  }

  // ---------- profiler: milliseconds per system per tick (off by default; with it off each timed spot costs one boolean test) ----------
  // A lap timer: pm(name) adds the time since the last mark to that function, so the functions add up to the whole tick.
  // PROF lives here in module scope, never on W, so saves and the world are untouched.
  const pnow = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const FN_SYS = {
    'pop.move': 'movement', decideMove: 'movement', tribeHomeUpdate: 'movement',
    'pop.food': 'food', farmingMonth: 'food', harvest: 'food', gameCap: 'food',
    'pop.births': 'births/deaths',
    updateLeaders: 'social/clan', marriages: 'social/clan', seekSpouses: 'social/clan', households: 'social/clan', disputes: 'social/clan', sharing: 'social/clan',
    clanFission: 'social/clan', clanMerge: 'social/clan', tribeFission: 'social/clan', tribeMerge: 'social/clan', decayRelations: 'social/clan',
    updateSettlements: 'social/clan', foundingMonth: 'social/clan', planGatherings: 'social/clan', endGatherings: 'social/clan', confedYear: 'social/clan', ruleYear: 'social/clan',
    removeClan: 'social/clan',
    revenge: 'conflict', interTribe: 'conflict', warParties: 'conflict', paybackMonth: 'conflict', slaveMonth: 'conflict', landScan: 'conflict', claimsTrips: 'conflict', aiClaims: 'conflict',
    acquireGoods: 'trade/goods', procure: 'trade/goods', procureOre: 'trade/goods', exchange: 'trade/goods', traderMonth: 'trade/goods', seaMonth: 'trade/goods',
    stepEnv: 'environment',
    rebuildBuckets: 'bookkeeping', fogMonth: 'bookkeeping', sightYear: 'bookkeeping', playerEvents: 'bookkeeping', playerMonth: 'bookkeeping', runAuto: 'bookkeeping', yearEnd: 'bookkeeping', loop: 'bookkeeping',
    draw: 'rendering', paint: 'rendering', detail: 'rendering'
  };
  const SYS_ORDER = ['movement', 'food', 'births/deaths', 'social/clan', 'conflict', 'trade/goods', 'environment', 'bookkeeping', 'rendering'];
  const sysOf = f => FN_SYS[f] || 'bookkeeping';
  const pwin = () => ({ ticks: 0, frames: 0, fn: {} });
  let PT = 0;
  const PROF = {
    on: false, every: 100,
    win: pwin(), run: pwin(),
    onSummary: text => console.log(text),
    reset() { this.win = pwin(); this.run = pwin(); },
    render(draw, paint, detail) { const w = this.win.fn; w.draw = (w.draw || 0) + draw; w.paint = (w.paint || 0) + paint; w.detail = (w.detail || 0) + detail; this.win.frames++; },
    snapshot() {
      const mk = (a, b) => { const fn = {}, sys = {}; for (const k of SYS_ORDER) sys[k] = 0; for (const w of b ? [a, b] : [a]) for (const f in w.fn) { fn[f] = (fn[f] || 0) + w.fn[f]; sys[sysOf(f)] += w.fn[f]; } return { ticks: a.ticks + (b ? b.ticks : 0), frames: a.frames + (b ? b.frames : 0), sys, fn }; };
      return { window: mk(this.win), run: mk(this.run, this.win) };
    },
    triple: profTriple,
    text(s, W, label) { // s: one {ticks, frames, sys, fn} block
      let tot = 0; for (const k of SYS_ORDER) tot += s.sys[k];
      const f2 = x => x.toFixed(3), n = Math.max(1, s.ticks);
      const out = [`[prof] ${label || 'last'} ${s.ticks} ticks${s.frames ? ', ' + s.frames + ' frames' : ''}${W ? ', pop ' + W.clans.reduce((a, c) => a + c.people.length, 0) + ', clans ' + W.clans.length : ''}, total ${f2(tot / n)} ms/tick`];
      for (const k of SYS_ORDER) { if (!s.sys[k] && k === 'rendering') continue; out.push(`  ${k.padEnd(14)} ${f2(s.sys[k] / n).padStart(8)} ms/tick ${(tot ? 100 * s.sys[k] / tot : 0).toFixed(1).padStart(5)}%${k === 'rendering' && s.frames ? '  (' + f2(s.sys[k] / s.frames) + ' ms/frame)' : ''}`); }
      return out.join('\n');
    }
  };
  const pm = name => { const t = pnow(), w = PROF.win.fn; w[name] = (w[name] || 0) + (t - PT); PT = t; };
  function profFlush(W) {
    const w = PROF.win, r = PROF.run; r.ticks += w.ticks; r.frames += w.frames; for (const f in w.fn) r.fn[f] = (r.fn[f] || 0) + w.fn[f];
    const s = { ticks: w.ticks, frames: w.frames, sys: {}, fn: w.fn }; for (const k of SYS_ORDER) s.sys[k] = 0; for (const f in w.fn) s.sys[sysOf(f)] += w.fn[f];
    PROF.win = pwin(); PROF.onSummary(PROF.text(s, W));
  }

  // ---------- weekly clan (camp) step: forage, eat, births, deaths ----------
  const setTimeout0 = f => f();
  // a natural ceiling on the people a land can keep: hunting ground thinned past what it regrows starves the camps that live on it, and a crowded country breeds sickness
  const GP_D1 = 0.35, GP_D2 = 0.7, GP_F = 0.5, GP_M = 0.02, GMIN = 0.4; // hunting-ground pressure: the thinning at which it starts and is full, the fall in births, the added hunger deaths; the game is never hunted below this share of its ceiling
  const DENS_AREA = 1963, DENS_D0 = 0.12, DENS_K = 0.01, DENS_WEEK = 12; // crowding sickness: people within 25 km per km2 (1,963 km2 of country), the density it starts at, its deaths
  function stepPop(W, c) {
    const rand = W.rand;
    if (!c.people.length) return;
    const PF = PROF.on;
    { const ti = cellAt(c.tx, c.ty); if (!W.land[ti] || W.lake[ti]) { const p = landNear(W, c.tx, c.ty); c.tx = p[0]; c.ty = p[1]; } }
    const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
    if (d < 1) { const ci0 = cellAt(c.x, c.y); if (!W.land[ci0] || W.lake[ci0]) { const p = landNear(W, c.x, c.y); c.x = c.tx = p[0]; c.y = c.ty = p[1]; } }
    if (d > 1) { const st = Math.min(d, 30000); c.x += dx / d * st; c.y += dy / d * st; }
    if (PF) pm('pop.move');
    let nk = 0, lab = 0; // a week of the clan's food and its labour, summed in one pass over the people (same sums as needsWeek and labor)
    for (const q of c.people) { nk += personKcal(q); lab += workerEq(q.age) * (0.6 + 0.6 * q.skill) * (q.sex === 'F' ? (q.nursing && q.nursing.alive && q.nursing.age < 1 ? 0.6 : 0.85) : 1) * (q.job ? 0.6 : 1); }
    const need = nk * 7, tool = c.tool;
    // stored grain covers up to 80% of the diet; it barely spoils
    const grainUse = Math.min(c.grain, need * 0.8); c.grain = Math.min(need * 100, (c.grain - grainUse) * keepG(c)); c.store += grainUse; // rot, mice, and the limits of pits and baskets
    c.cereal += (grainUse / Math.max(1, need) - c.cereal) * 0.02;
    const ct = c.tribe, fa = faithOf(ct), bl = blessed(ct) ? ct.blessing.type : null;
    const huntF = (fa === 'spirits' ? 1.08 : 1) * (bl === 'spirits' ? 1.1 : 1);
    const boats = c.tribe.boats; let P = 0, coastal = false, sw = 0, sg = 0; const FLs = forageList(W, c), KE = W._gKe && W._gKe.length === N * N ? W._gKe : keffAll(W);
    for (let k = 0; k < FLs.idx.length; k++) {
      const i = FLs.idx[k]; P += cellFood(W, i, FLs.ev[k], tool, boats); if (!W.land[i] && W.shelf[i] === 1) coastal = true;
      if (W.land[i] && !W.lake[i]) { const e = FLs.ev[k]; sw += e; sg += e * Math.min(1, W.game[i] / KE[i]); } // how much of the hunting ground's game stands, against what it could carry
    }
    c.coastal = coastal; const depl = sw > 0 ? 1 - sg / sw : 0, press = clamp((depl - GP_D1) / (GP_D2 - GP_D1), 0, 1) * (1 - c.cereal); // a clan that lives on its own grain feels the wild stock less
    // autumn: foragers lay in nuts, dried meat and smoked fish against the winter
    const sn = seasonOf(W.week), cache = !c.settled && sn > 0.6 && sn < 0.9 ? 2.5 : 0;
    const target = Math.max(0, need * (1.85 + cache) - c.store);
    const take = Math.min(P, target, lab * LABOR_KCAL);
    let spared = 0;
    if (P > 0 && take > 0) {
      const frac = take / P, t = 0.55 + 0.45 * Math.min(1.25, tool);
      for (let k = 0; k < FLs.idx.length; k++) {
        const i = FLs.idx[k], e = FLs.ev[k]; let got = 0;
        if (!W.land[i]) { if (W.shelf[i]) { const f = W.fish[i] * FISH_CATCH * seaF(W.shelf[i], boats) * t * e * frac; W.fish[i] -= f; got += f; c.fishCatch = (c.fishCatch || 0) + f; } }
        else if (W.lake[i]) { const f = W.fish[i] * FISH_CATCH * t * e * frac; W.fish[i] -= f; got += f; }
        else {
          const tp = W.edible[i] * PLANT_CATCH * e * frac; let tg = W.game[i] * GAME_CATCH * t * e * frac * huntF;
          { const room = Math.max(0, W.game[i] - GMIN * KE[i]); if (tg > room) { spared += (tg - room) * HA * KCAL_PER_KG_GAME; tg = room; } } // the herd is never hunted below what it regrows from
          W.edible[i] -= tp; W.game[i] -= tg; got += tp * HA + tg * HA * KCAL_PER_KG_GAME;
          if (W.isRiver[i]) { const f = W.fish[i] * FISH_CATCH * t * e * frac; W.fish[i] -= f; got += f; }
          if (W.shellK[i]) { const f = W.shell[i] * SHELL_CATCH * e * frac; W.shell[i] -= f; got += f; c.shellfish = (c.shellfish || 0) + f; }
          if (W.sealK[i]) { const f = W.seal[i] * SEAL_CATCH * (0.6 + 0.4 * Math.min(1, boats * 2)) * e * frac; W.seal[i] -= f; got += f; }
        }
        W.harvest[i] += got / HA;
      }
    }
    c.tool = Math.max(0.3, c.tool - (c.tool > 1 ? 0.002 : 0.004)); // metal tools last longer // stone tools wear out, get lost, need replacing
    c.store += take - Math.min(take, spared);
    const eaten = Math.min(c.store, need); c.store -= eaten; { const kp = c.live === 'fishing' ? 0.95 : boats >= 0.3 && coastal ? 0.9 : (sn > 0.6 || sn < 0.17) ? 0.93 : 0.85; c.store *= kp + (1 - kp) * 0.2 * potF(c); } // drying & smoking fish; cold keeps the winter cache
    const ratio = need > 0 ? eaten / need : 1;
    c.cond += (ratio - c.cond) * 0.12; c.cond = clamp(c.cond, 0.15, 1);
    c.supply += (P / Math.max(need, 1) - c.supply) * 0.15;
    c.yr.intake += eaten; c.yr.need += need;
    const size = c.people.length, ci = cellAt(c.x, c.y);
    W.forest[ci] = Math.max(0, W.forest[ci] - 0.00003 * size);
    W.nit[ci] = Math.min(140, W.nit[ci] + 0.0015 * size); W.om[ci] += 0.00002 * size;
    if (PF) pm('pop.food');

    const hunger = Math.max(0, 0.86 - c.cond) / 0.86, starvHaz = 3.0 * hunger * hunger;
    const fertMult = clamp((c.cond - 0.5) / 0.4, 0, 1) * (1 - GP_F * press), dens = c.dens || 0, crowdK = dens > DENS_D0 ? DENS_K * (dens - DENS_D0) / DENS_D0 : 0;
    const born = []; let anyDead = false;
    for (const q of c.people) {
      q.age += 1 / 52;
      const base = siler(q.age), ms = (starvHaz + GP_M * press) * vulnerability(q.age);
      let h = base * (fa === 'spirits' ? 0.95 : 1) * (bl === 'spirits' ? 0.92 : 1) + ms;
      if (c.settled) h += crowdDisease(c, q.age);  // villages breed infectious disease
      const cx = crowdK * (q.age < 5 ? 3 : 1); h += cx;
      if (q.age < 2.5 && q.mother && !q.mother.alive) h += 1.6; // orphaned infants rarely survive without a nursing mother
      if (rand() < 1 - Math.exp(-h / 52)) {
        const starve = rand() < ms / h; if (starve) c.yr.starv++;
        const sick = !starve && cx > 0 && rand() < cx / (h - ms);
        die(W, c, q, starve ? 'hunger' : sick ? 'a spreading fever' : q.age < 5 ? 'childhood illness' : q.age > 55 ? 'old age' : pick(q.age < 14 ? ['illness', 'illness', 'fever', 'an accident'] : q.sex === 'F' ? (q.age < 45 ? ['illness', 'illness', 'injury', 'fever', 'childbirth'] : ['illness', 'illness', 'injury', 'fever']) : ['illness', 'illness', 'injury', 'fever', 'a hunting accident'], rand));
        anyDead = true; continue;
      }
      if (q.sex === 'F' && q.age >= 15 && q.age < 50) {
        if (q.preg > 0) {
          if (--q.preg === 0) {
            if (rand() < 0.04 * (1 + 3 * hunger)) continue;
            if (rand() < 0.012) { die(W, c, q, 'childbirth'); anyDead = true; }
            const ch = makePerson(W, rand() < 0.512 ? 'M' : 'F', 0, q, q.spouse || q.lastMate || null); if ((ch.father && ch.father.dyn) || (q.dyn)) { ch.dyn = true; const P0 = W.player; if (P0 && !P0.over && P0.head.alive) { const hd = P0.head, f0 = ch.father; if (q === hd || f0 === hd) houseNote(W, `A ${ch.sex === 'F' ? 'daughter' : 'son'}, ${ch.name}, was born to ${hd.name}${q !== hd ? ' and ' + q.name : f0 ? ' and ' + f0.name : ''}.`); else if (q.mother === hd || q.father === hd || (f0 && (f0.mother === hd || f0.father === hd))) houseNote(W, `A grand${ch.sex === 'F' ? 'daughter' : 'son'}, ${ch.name}, was born to ${hd.name}'s ${q.mother === hd || q.father === hd ? 'daughter ' + q.name : 'son ' + f0.name}.`); else if (inHouseClan(W, c)) houseCount(W, 'sumB'); } } if (q.slave) { ch.slave = true; ch.owner = q.owner; ch.origin = q.origin; ch.taken = W.week; }
            ch.fam = q.fam; ch.clan = c; born.push(ch);
            q.nursing = ch; q.kids++; if (ch.father) ch.father.kids = (ch.father.kids || 0) + 1; q.pp = W.week + Math.round(LACT_WKS * (1 - 0.5 * c.cereal - (c.live === 'fishing' ? 0.2 : 0)) * (1 + 0.8 * hunger) * (0.8 + rand() * 0.4)); // porridge weans babies sooner -> shorter birth spacing
            c.yr.births++;
          }
        } else {
          if (q.nursing && !q.nursing.alive && q.pp > W.week + 10) q.pp = W.week + 10;
          const mated = (q.spouse && q.spouse.alive ? 1 : 0.06) * (c.settled ? (c.live === 'farm' ? 1.35 : 1.15) : 1); // sedentary, well-fed women conceive more readily
          if (W.week >= q.pp && rand() < CONCEIVE_WK * fecund(q.age) * fertMult * mated * (fa === 'mother' ? 1.04 : 1) * (bl === 'mother' ? 1.08 : 1)) { q.preg = 39; q.lastMate = q.spouse; }
        }
      }
    }
    if (anyDead || born.length) { c.people = c.people.filter(q => q.alive); for (const ch of born) c.people.push(ch); }
    if (c.cond < 0.65) c.lowWeeks++; else c.lowWeeks = 0;
    if (c.lowWeeks === 6) { note(W, c, `Hunger in the ${c.name} camp (${Math.round(c.cond * 100)}% of needs met).`); if (!c.hungerLog || W.week - c.hungerLog > 156) { c.hungerLog = W.week; logEvent(W, `The ${c.name} clan of the ${c.tribe.name} is going hungry.`, c, 'hunger'); } }
    if (PF) pm('pop.births');
  }

  // ---------- leadership ----------
  function prestige(q) { const a = q.age; const ageF = a < 25 ? 0 : a < 45 ? (a - 25) / 20 : a < 65 ? 1 : Math.max(0, 1 - (a - 65) / 15); return ageF * (0.4 + q.skill) * (1.1 - q.temper * 0.4) + q.kids * 0.03 + (q.giftPrestige || 0) + (q.lineage || 0) + (q.clan && q.clan.head === q && q.clan.treasures ? Math.min(0.15, 0.05 * q.clan.treasures.length) : 0) + Math.min(0.3, (q.nSlaves || 0) * 0.03) + (q.clan && q.clan.goods ? (q.clan.goods.amber * 0.04 + q.clan.goods.axe * 0.03 + q.clan.goods.metal * 0.04 + q.clan.goods.bronze * 0.06) * ageF : 0); }
  // =====================================================================
  //  HOW A CLAN OR TRIBE IS LED
  //  c.rule / t.rule: 0 by standing (as ever), 1 leader for life, 2 a leading house (clan) or a chiefly clan (tribe).
  //  c.ruleSince / t.ruleSince: the week it took that form. c.headSince / t.headSince: the week the present leader sat.
  // =====================================================================
  let RULE_WHY = ''; // set by ruleClan: why the seat went as it did, for the house's note
  const RULE_FACTOR = [1, 0.75, 0.5]; // a seat held for life, or by birth, is harder to take: the share of the usual chance that is left
  const RULE_P = { clan01: 0.06, clan12: 0.04, tribe01: 0.07, tribe12: 0.04 }; // the chance each year that a clan or tribe that has what it needs takes the next step
  const ruleOf = e => (e && e.rule) || 0;
  const ruleFactor = e => RULE_FACTOR[ruleOf(e)] || 1;
  const yearsSince = (W, w) => w == null ? 1e9 : (W.week - w) / 52; // a missing week (an old save) means long ago
  const CLAN_RULES = ['By standing', 'Head for life', 'A leading house'], TRIBE_RULES = ['By standing', 'Leader for life', 'A chiefly clan'];
  function clanBest(c, ls, la, excl) { // the eligible person of greatest standing
    let best = null, bp = -1;
    for (const q of c.people) if (q !== excl && q.alive !== false && q.sex === ls && !q.slave && q.age >= la) { const p = prestige(q); if (p > bp) { bp = p; best = q; } }
    if (!best) for (const q of c.people) if (q !== excl && q.alive !== false && !q.slave && q.age >= 20) { const p = prestige(q); if (p > bp) { bp = p; best = q; } }
    return best;
  }
  function tribeBest(t, excl) {
    let hb = null, hp = -1; for (const c of t.clans) if (c.head && c.head !== excl) { const p = prestige(c.head) * (1 + c.people.length / 60); if (p > hp) { hp = p; hb = c.head; } }
    return hb;
  }
  // was q the head of the player's house until just now (it died or left the clan, and the house passed on)?
  function wasHouseHead(W, q) {
    const P = W.player; if (!P || P.over || !q || !q.dyn || P.heads.length < 2) return false;
    const prev = P.heads[P.heads.length - 2]; return prev.name === q.name && prev.to != null && W.week - prev.to <= 12;
  }
  // who follows a clan's head under "a leading house": the house's own heir if it is the head of the player's house, else a grown child,
  // grandchild, brother or sister, or their child, of the sex that leads, living in the clan and 16 or more
  function ruleHeir(W, c, old) {
    if (!old) return null;
    const ls = leaderSex(c.tribe), P = W.player, live = P && !P.over && P.head.alive;
    const ok = q => q && q !== old && q.alive !== false && !q.slave && q.clan === c && q.sex === ls && q.age >= 16;
    if (live && old === P.head) { const n = clanHeir(W, c, old); if (ok(n)) return { who: n, how: 'house' }; }
    else if (live && P.head.clan === c && wasHouseHead(W, old) && ok(P.head)) return { who: P.head, how: 'house' };
    const sibOf = x => x && x !== old && ((old.father && x.father === old.father) || (old.mother && x.mother === old.mother));
    const eldest = a => a.sort((x, y) => (x.age >= 70) - (y.age >= 70) || y.age - x.age)[0];
    const mem = c.people.filter(ok);
    const steps = [q => q.father === old || q.mother === old,
      q => (q.father && (q.father.father === old || q.father.mother === old)) || (q.mother && (q.mother.father === old || q.mother.mother === old)),
      sibOf, q => sibOf(q.father) || sibOf(q.mother)];
    for (const f of steps) { const h = eldest(mem.filter(f)); if (h) return { who: h, how: relWord(h, old) }; }
    return null;
  }
  // the clan's seat when it is not held by standing alone. Returns who sits afterwards.
  function ruleClan(W, t, c, ls, la, best, quiet) {
    RULE_WHY = ''; const R = ruleOf(c), inc = c.head;
    if (c.favored && best === c.favored) return best; // named by a challenge won: the seat is his
    const sits = inc && inc.alive && inc.clan === c && !inc.slave && inc.sex === ls && inc.age >= (R === 2 ? 16 : la) && inc.age < 70;
    if (sits) {
      if (R === 1 && best && best !== inc && prestige(best) > 2 * prestige(inc)) { // thrown down by a rival of more than double the standing
        RULE_WHY = `${best.name}'s standing was more than double ${inc.name}'s, and the clan would not be led by the lesser`;
        if (!quiet) note(W, c, `${inc.name} is thrown down as head of the ${c.name} clan: ${best.name} stands more than twice as high.`);
        return best; }
      return inc;
    }
    if (R === 2) { const h = ruleHeir(W, c, inc);
      if (h) { RULE_WHY = h.how === 'house' ? `${h.who.name} is the head of the house that holds the seat of the ${c.name} clan` : `the seat of the ${c.name} clan passes by birth from ${inc.name}, and ${h.who.name} is ${h.how}`; return h.who; } }
    if (best && best === inc && inc.alive && inc.age >= 70) best = clanBest(c, ls, la, inc) || best; // one of 70 does not choose himself again
    return best;
  }
  function ruleTribe(W, t, hb, quiet) {
    const R = ruleOf(t), inc = t.headman;
    const sits = inc && inc.alive && !inc.slave && inc.clan && inc.clan.tribe === t && inc.clan.head === inc && inc.age < 70;
    if (sits) {
      if (R === 1 && hb && hb !== inc && leadWeight(hb) > 2 * leadWeight(inc)) {
        if (!quiet) note(W, t, `${inc.name} is thrown down as leader of the ${t.name}: ${hb.name} of the ${hb.clan.name} clan stands more than twice as high.`);
        return hb; }
      return inc;
    }
    if (R === 2) { const sc = t.seat != null ? W.ents.get(t.seat) : null;
      if (sc && sc.alive && sc.tribe === t) { if (sc.head && sc.head.alive && !sc.head.slave && sc.head.clan === sc) return sc.head; }
      else if (t.seat != null) { if (!quiet) note(W, t, `The ${sc ? 'clan that held the leadership has left us' : 'clan that held the leadership is no more'}: the clans must choose.`); t.seat = null; } }
    if (hb && hb === inc && inc.alive && inc.age >= 70) hb = tribeBest(t, inc) || hb;
    return hb;
  }
  // remember when the present leader took the seat, and keep a tribe's chiefly clan the clan of its leader
  function trackSeat(W, e, quiet, forced) {
    const who = e.kind === 'clan' ? e.head : e.headman;
    if (e.headWho === undefined) { e.headWho = who; if (W.week - e.founded < 8) e.headSince = W.week; }
    else if (e.headWho !== who) { e.headWho = who; e.headSince = W.week; }
    if (e.kind === 'tribe' && !forced && ruleOf(e) === 2 && who && who.clan && e.seat !== who.clan.id) {
      e.seat = who.clan.id; if (!quiet) note(W, e, `The ${who.clan.name} clan now holds the leadership of the ${e.name}.`); }
  }
  // the chance that the clans side with a, from a tally (the same number the roll in headshipTally gives)
  function tallyChance(T) {
    const tot = T.rows.reduce((s, r) => s + r.n, 0); let d = new Array(tot + 1).fill(0); d[0] = 1;
    for (const r of T.rows) { const nd = new Array(tot + 1).fill(0); for (let i = 0; i <= tot; i++) if (d[i]) { nd[i + r.n] += d[i] * r.pa; nd[i] += d[i] * (1 - r.pa); } d = nd; }
    let p = 0; for (let i = 0; i <= tot; i++) { const wb = tot - i; if (i > wb || (i === wb && T.sa >= T.sb)) p += d[i]; } return p;
  }
  // a challenge to the tribe's leader: the clans must side with you, and a seat held for life or by a clan makes that harder
  const challengeChance = (W, t, a, b) => tallyChance(headshipTally(W, t, a, b, false)) * ruleFactor(t);
  const keepChance = (W, t, a, b) => 1 - (1 - tallyChance(headshipTally(W, t, a, b, false))) * ruleFactor(t);
  const keepLine = (W, t, a, b) => `<br><br>Your chance of keeping the seat is about ${Math.round(keepChance(W, t, a, b) * 100)}%${ruleOf(t) ? ` (the ${t.name} hold their leader ${ruleOf(t) === 1 ? 'for life' : 'in one clan'}, so a rival's chance is cut to ${ruleOf(t) === 1 ? 'three quarters' : 'half'})` : ''}.`;

  // ---------- what each step needs: '' when met, else the first thing missing ----------
  const sonWord = ls => ls === 'F' ? 'daughter' : 'son';
  function clanLifeNeed(W, c) {
    const n = freeCount(c), y = yearsSince(W, c.headSince);
    if (!c.settled && n < 35) return `The clan must live in a village or number 35 free people (it has ${n})`;
    if (y < 6) return `The head must have led the clan for 6 years (${Math.floor(y)} so far)`;
    return '';
  }
  function clanBloodNeed(W, c) {
    const y = yearsSince(W, c.ruleSince), ls = leaderSex(c.tribe), h = c.head;
    if (ruleOf(c) !== 1) return 'The clan must first hold its head for life';
    if (y < 15) return `The clan has held its head for life for ${Math.floor(y)} of 15 years`;
    if (!(c.works && (c.works.hall || c.works.gran))) return 'The village needs a great hall or a granary';
    if (!h || !c.people.some(q => q.alive !== false && !q.slave && q.sex === ls && q.age >= 16 && (q.father === h || q.mother === h))) return `The head needs a grown ${sonWord(ls)} in the clan`;
    return '';
  }
  function tribeLifeNeed(W, t) {
    const n = tribeSize(t), y = yearsSince(W, t.headSince);
    if (t.clans.length < 3) return `The tribe needs at least 3 clans (it has ${t.clans.length})`;
    if (n < 100) return `The tribe needs at least 100 people (it has ${n})`;
    if (y < 6) return `The leader must have led the tribe for 6 years (${Math.floor(y)} so far)`;
    return '';
  }
  function tribeBloodNeed(W, t) {
    const y = yearsSince(W, t.ruleSince), n = tribeSize(t), h = t.headman;
    if (ruleOf(t) !== 1) return 'The tribe must first hold its leader for life';
    if (y < 20) return `The tribe has held its leader for life for ${Math.floor(y)} of 20 years`;
    if (n < 180) return `The tribe needs at least 180 people (it has ${n})`;
    if (t.stage !== 3) return 'The tribe must live in settled villages';
    if (!h || !h.clan || ruleOf(h.clan) !== 2) return 'The leader\'s own clan must be led by a leading house first';
    return '';
  }
  // the head's chance of carrying the households (or the clans) with them: how they feel, weighted by their numbers, and the head's standing
  function ruleDeedChance(W, e, h) {
    let s = 0, n = 0;
    if (e.kind === 'clan') { for (const f of familiesOf(e)) if (f !== h.fam) { const m = e.people.filter(q => q.fam === f && !q.slave).length; s += m * (h.fam ? opinion(f, h.fam) : 0); n += m; } }
    else for (const o of e.clans) if (o !== h.clan) { const m = freeCount(o); s += m * opinion(o, h.clan); n += m; }
    return clamp(0.3 + (n ? s / n : 0) / 150 + prestige(h) * 0.25, 0.05, 0.9);
  }
  const DEED_RULES = { clanlife: ['clan', 1], clanblood: ['clan', 2], tribelife: ['tribe', 1], tribeblood: ['tribe', 2] };
  function ruleDeeds(W, h, c, t, ready, yl) {
    const out = [], lsC = leaderSex(t), mk = (id, icon, label, hint, need, e) => { const p = ruleDeedChance(W, e, h), rd = ready(id, 5);
      out.push({ id, icon, label, hint: `${hint} About ${Math.round(p * 100)}%. If they refuse, they think less of your house and you lose standing, and you cannot ask again for 5 years`, ok: !need && rd, why: need || (!rd ? `Wait (${yl(id, 5)})` : ''), data: { p } }); };
    if (c.head === h) {
      if (ruleOf(c) === 0) mk('clanlife', '📜', 'Ask the houses to follow you for life', `The households of the ${c.name} clan are asked to let you hold the seat until you die, or reach 70, and let no rival take it merely by standing higher.`, clanLifeNeed(W, c), c);
      else if (ruleOf(c) === 1) mk('clanblood', '🌳', 'Name your child to follow you', `The households are asked to give the seat of the ${c.name} clan to your ${sonWord(lsC)}, and then to the blood of your house.`, clanBloodNeed(W, c), c);
    }
    if (t.headman === h && c.head === h) {
      if (ruleOf(t) === 0) mk('tribelife', '📜', 'Ask the clans to follow you for life', `The clans of the ${t.name} are asked to let you lead them until you die, or reach 70, and let no rival take the seat merely by standing higher.`, tribeLifeNeed(W, t), t);
      else if (ruleOf(t) === 1) mk('tribeblood', '🌳', 'Make your clan the chiefly clan', `The clans are asked to give the leadership of the ${t.name} to the ${c.name} clan, so that its head leads after you.`, tribeBloodNeed(W, t), t);
    }
    return out;
  }
  function ruleDeed(W, id, A) {
    const P = W.player, h = P.head, c = h.clan, t = c.tribe, [kind, to] = DEED_RULES[id], e = kind === 'clan' ? c : t, p = A.data.p;
    if (W.rand() < p) {
      setRule(W, e, to, 'player'); P.renown += kind === 'clan' ? 2 : 4;
      return { title: kind === 'clan' ? (to === 1 ? 'Head for life' : 'The seat stays in your house') : (to === 1 ? 'Leader for life' : 'The chiefly clan'),
        text: kind === 'clan' ? (to === 1 ? `The households of the ${c.name} clan agree: ${h.name} will lead until ${h.sex === 'F' ? 'she' : 'he'} dies, and no rival will take the seat merely by standing higher.` : `The households agree that the seat of the ${c.name} clan will pass by birth, from ${h.name} to ${h.sex === 'F' ? 'her' : 'his'} child, and so down the house.`)
          : (to === 1 ? `The clans of the ${t.name} agree: ${h.name} will lead until ${h.sex === 'F' ? 'she' : 'he'} dies, and no rival will take the seat merely by standing higher.` : `The clans agree that the leadership of the ${t.name} belongs to the ${c.name} clan: whoever heads it will lead the tribe.`) };
    }
    const st = prestige(h); h.giftPrestige = Math.max(-0.5, (h.giftPrestige || 0) - 0.06); P.renown -= 1;
    if (kind === 'clan') { for (const f of familiesOf(c)) if (f !== h.fam && h.fam) affect(W, f, h.fam, -6, `${h.name} asked for the seat ${to === 1 ? 'for life' : 'for ' + (h.sex === 'F' ? 'her' : 'his') + ' child'}`, 4); }
    else for (const o of t.clans) if (o !== c) affect(W, o, c, -6, `${h.name} asked the clans for the leadership ${to === 1 ? 'for life' : 'for the ' + c.name + ' clan'}`, 4);
    houseNote(W, `${h.name} asked the ${kind === 'clan' ? 'houses of the clan' : 'clans of the tribe'} to ${kind === 'clan' ? (to === 1 ? 'follow ' + (h.sex === 'F' ? 'her' : 'him') + ' for life' : 'give the seat to ' + (h.sex === 'F' ? 'her' : 'his') + ' child') : (to === 1 ? 'follow ' + (h.sex === 'F' ? 'her' : 'him') + ' for life' : 'make the ' + c.name + ' clan the chiefly clan')} and was refused.`);
    return { title: `${kind === 'clan' ? 'The households' : 'The clans'} refuse`, text: `${kind === 'clan' ? 'The households' : 'The clans'} will not have it, and think the less of ${h.name} for asking. The chance was about ${Math.round(p * 100)}%: the feeling of ${kind === 'clan' ? 'the households' : 'the clans'} toward your house, weighted by their numbers, and your standing (${st.toFixed(2)}). Gifts and feasts, kin among them and years of fair leading raise it. You cannot ask again for 5 years.` };
  }
  // a clan or tribe takes up a new way of choosing its leader (how: 'dice' by itself, 'player' by the deed, 'wander' falls back)
  function setRule(W, e, to, how) {
    const from = ruleOf(e), isC = e.kind === 'clan', P = W.player, ph = P && !P.over && P.head.alive ? P.head : null, lead = isC ? e.head : e.headman;
    e.rule = to; e.ruleSince = W.week;
    if (!isC && to === 2 && lead && lead.clan) e.seat = lead.clan.id;
    const ls = leaderSex(isC ? e.tribe : e), nm = lead ? lead.name : 'the leader';
    const text = how === 'wander' ? (isC ? `Wandering again, the ${e.name} clan no longer holds its ${ls === 'F' ? 'clan mother' : 'head'} to the seat for life: whoever stands highest leads.` : '')
      : isC ? (to === 1 ? `The ${e.name} clan agree that ${nm} shall lead for life.` : `The seat of the ${e.name} clan is now held by one house: after ${nm}, it passes by birth.`)
      : (to === 1 ? `The ${e.name} agree that ${nm} shall lead for life.` : `The leadership of the ${e.name} now belongs to the ${lead && lead.clan ? lead.clan.name : 'chiefly'} clan.`);
    note(W, e, text);
    if (!isC) logEvent(W, text, e, 'big');
    const mine = ph && ph.clan && (isC ? ph.clan === e : ph.clan.tribe === e);
    if (mine && how === 'player') houseNote(W, text);
    else if (mine && (lead !== ph || how === 'wander')) {
      houseNote(W, text); notice(W, isC ? `The ${e.name} clan changes its way` : `The ${e.name} change their way`, `${text} ${to === 1 ? 'A leader chosen now keeps the seat until death or the age of 70, unless thrown down.' : to === 2 ? (isC ? 'When the head dies, the seat goes to the head\'s own blood.' : 'When the leader dies, the head of the chiefly clan leads the tribe.') : 'The seat will go to whoever stands highest.'}`); }
  }
  // once a year: wandering clans lose their custom, and settled ones and large tribes slowly take it up
  function ruleYear(W) {
    const P = W.player, ph = P && !P.over && P.head.alive ? P.head : null;
    for (const t of [...W.tribes]) {
      if (!t.alive) continue;
      for (const c of t.clans) {
        const R = ruleOf(c), hd = c.head;
        if (c.settled) { c.wasSet = true; c.wander = 0; } else if (c.wasSet) { c.wander = (c.wander || 0) + 1; if (R > 0 && c.wander >= 10) { setRule(W, c, 0, 'wander'); c.wasSet = false; continue; } }
        if (!hd || !hd.alive || hd.clan !== c || (ph && hd === ph)) continue; // the player's own head decides by a deed
        if (R === 0 && !clanLifeNeed(W, c) && W.rand() < RULE_P.clan01) setRule(W, c, 1, 'dice');
        else if (R === 1 && !clanBloodNeed(W, c) && W.rand() < RULE_P.clan12) setRule(W, c, 2, 'dice');
      }
      const hm = t.headman; if (!hm || !hm.alive || (ph && hm === ph)) continue;
      const R = ruleOf(t);
      if (R === 0 && !tribeLifeNeed(W, t) && W.rand() < RULE_P.tribe01) setRule(W, t, 1, 'dice');
      else if (R === 1 && !tribeBloodNeed(W, t) && W.rand() < RULE_P.tribe12) setRule(W, t, 2, 'dice');
    }
  }
  // for the screen: how a clan or tribe is led, what happens when the leader dies, and who would follow today
  function ruleInfo(W, e) {
    const isC = e.kind === 'clan', R = ruleOf(e), ls = leaderSex(isC ? e.tribe : e), lead = isC ? (ls === 'F' ? 'clan mother' : 'head') : 'leader';
    const text = isC ? [`When the ${lead} dies, the clan chooses whoever stands highest, and the seat can change hands in any year.`,
      `The ${lead} keeps the seat until death, the age of 70, or being thrown down by a rival of more than twice the standing. When it falls open, the clan chooses whoever stands highest.`,
      `When the ${lead} dies or grows old (70), the seat goes to the ${lead}'s grown ${sonWord(ls)}, or failing that a grandchild, a brother or sister, or their child: one of the ${ls === 'F' ? 'women' : 'men'}, 16 or more. If none is grown, the clan chooses by standing, and that ${lead}'s house leads from then on.`][R]
      : [`When the leader dies, the clans choose the clan head of greatest standing, and a large clan adds weight. The seat can change hands in any year.`,
      `The leader keeps the seat until death, the age of 70, or being thrown down by a rival of more than twice the weight. When it falls open, the clans choose as before.`,
      `The leadership belongs to the ${(e.seat != null && W.ents.get(e.seat) ? W.ents.get(e.seat).name : 'chiefly')} clan: when the leader dies or grows old (70), the new head of that clan leads the tribe, however the clan chooses its head. If that clan dies out or leaves, the tribe chooses, and the winner's clan holds the seat from then on.`][R];
    let heir = null;
    if (R === 2 && isC && e.head) { const h = ruleHeir(W, e, e.head); if (h) heir = { who: h.who, how: h.how === 'house' ? relWord(h.who, e.head) : h.how }; }
    else if (R === 2 && !isC) { const sc = e.seat != null ? W.ents.get(e.seat) : null;
      if (sc && sc.alive && sc.tribe === e && sc.head) { if (sc.head !== e.headman) heir = { who: sc.head, how: `${sc.head.sex === 'F' ? 'mother' : 'head'} of the ${sc.name} clan, which holds the seat` };
        else if (ruleOf(sc) === 2) { const h = ruleHeir(W, sc, sc.head); if (h) heir = { who: h.who, how: `${h.how === 'house' ? relWord(h.who, sc.head) : h.how}, to head the ${sc.name} clan and so lead the tribe` }; } } }
    return { rule: R, name: (isC ? CLAN_RULES : TRIBE_RULES)[R], text, since: R && e.ruleSince != null ? e.ruleSince : null, heir };
  }
  // a head of 70 lays the seat down (under "head for life" or "a leading house"): the words for the notes
  const gaveTo = (who, old) => { const w = relWord(who, old); return w.startsWith('of ') ? `${who.name}, ${w}` : `${w} ${who.name}`; };
  const agedSeatWords = (c, old, who) => `${old.name}, grown old, ${ruleOf(c) === 2 && RULE_WHY ? 'gave the seat to ' + gaveTo(who, old) : 'laid down the seat of the ' + c.name + ' clan, and the clan chose ' + who.name}.`;
  function updateLeaders(W, t, quiet) {
    for (const c of t.clans) {
      const ls = leaderSex(t), la = ls === 'F' ? 30 : 25;
      let best = null, bp = -1; for (const q of c.people) if (q.sex === ls && !q.slave && q.age >= la) { const p = prestige(q); if (p > bp) { bp = p; best = q; } }
      if (!best) for (const q of c.people) if (!q.slave && q.age >= 20) { const p = prestige(q); if (p > bp) { bp = p; best = q; } }
      { const inc = c.head; if (best && inc && inc !== best && inc.alive && inc.clan === c && !inc.slave && inc.sex === ls && inc.age >= la && inc.age < 70 && prestige(inc) > 0 && bp < prestige(inc) * 1.08 + 0.03) best = inc; } // the sitting head keeps the seat unless clearly outdone
      if (c.favored && c.favored.alive && c.favored.clan === c) best = c.favored; else c.favored = null;
      if (c.rule) best = ruleClan(W, t, c, ls, la, best, quiet); else RULE_WHY = '';
      { const inc = c.head; if (!c.rule && t.rule && inc && inc === t.headman && !(c.favored && c.favored === best) && inc.alive && inc.clan === c && !inc.slave && inc.sex === ls && inc.age >= la && inc.age < 70) best = inc; } // a tribe that holds its leader for life: his clan does not set him aside by standing
      if (best !== c.head) { const old0 = c.head, aged = !!(c.rule && old0 && old0.alive && old0.clan === c && old0.age >= 70 && best), gave = aged ? agedSeatWords(c, old0, best) : '';
        if (!quiet && best) note(W, c, aged ? gave : `${best.name} becomes head of the ${c.name} clan.`);
        const P = W.player, ph = P && !P.over && P.head.alive ? P.head : null;
        const fixed = ph && (c.favored === best ? 'named' : ph.sex !== ls ? 'sex' : ph.age < la ? 'age' : ''); // a standing reason is told once to each head of the house, not at every change
        if (!quiet && aged && ph && ph.clan === c && (ph === old0 || ph === best)) { houseNote(W, gave); notice(W, `${best.name} now leads the ${c.name} clan`, `${gave} ${ruleOf(c) === 2 ? 'The seat of the clan goes by birth.' : 'A head for life lays the seat down at 70.'}${ph === old0 ? ' You still lead the house.' : ''}`); }
        else if (!quiet && best && ph && ph.clan === c && best !== ph && (fixed ? ph.toldHead !== fixed : W.week - (P.lastHeadNote || -1e9) > 52 * 3)) { P.lastHeadNote = W.week; ph.toldHead = fixed || ph.toldHead;
          const why = RULE_WHY ? RULE_WHY : c.favored === best ? `${best.name} was named by the last head` : ph.sex !== ls ? `among the ${t.name}, clans are led by ${ls === 'F' ? 'women' : 'men'}` : ph.age < la ? `${ph.name} is ${Math.floor(ph.age)}, and a clan ${ls === 'F' ? 'mother' : 'head'} must be at least ${la}` : (standingWhy(best, ph).join('; ') || 'there was little between them');
          houseNote(W, `${best.name} became head of our clan, not ${ph.name}: ${why}.`);
          notice(W, `${best.name} now leads the ${c.name} clan`, `${RULE_WHY ? 'The ' + c.name + ' clan keeps its own custom. ' : 'A clan follows whoever has the greatest standing. '}${best.name} (standing ${prestige(best).toFixed(2)}) was chosen over ${ph.name} (${prestige(ph).toFixed(2)}): ${why}.`); }
        c.head = best; }
      trackSeat(W, c, quiet);
    }
    if (t.confed && t.confed.capital === t && t.confed.king && t.confed.king.alive && t.confed.king.clan && t.confed.king.clan.tribe === t) { t.headman = t.confed.king; trackSeat(W, t, quiet, true); return; }
    if (t.favored && t.favored.alive && t.favored.clan && t.favored.clan.tribe === t) { t.headman = t.favored; trackSeat(W, t, quiet); return; } else t.favored = null;
    let hb = null, hp = -1; for (const c of t.clans) if (c.head) { const p = prestige(c.head) * (1 + c.people.length / 60); if (p > hp) { hp = p; hb = c.head; } }
    { const inc = t.headman; if (hb && inc && inc !== hb && inc.alive && inc.clan && inc.clan.tribe === t && inc.clan.head === inc && hp < prestige(inc) * (1 + inc.clan.people.length / 60) * 1.08 + 0.03) hb = inc; } // the sitting leader keeps the seat unless clearly outdone
    if (t.rule) hb = ruleTribe(W, t, hb, quiet);
    if (hb !== t.headman) {
      const old = t.headman; t.headman = hb; const agedT = !!(t.rule && old && old.alive && old.age >= 70 && old.clan && old.clan.tribe === t && hb);
      const ph = W.player && !W.player.over && W.player.head;
      if (!quiet && ph && ph.alive && hb && ph !== hb && ph.clan && ph.clan.tribe === t && ph.age >= 25 && prestige(ph) >= prestige(hb) * 0.9 && W.week - (W.player.lastChAsk || -1e9) > 52 * 8 && (W.player.lastChAsk = W.week)) pushEvent(W, { type: 'challenge', key: hb.id, title: `A new headman for the ${t.name}`, text: `${old ? (old.alive ? `${old.name} has lost the trust of the clans, and ` : `${old.name} is gone, and `) : ''}${hb.name} of the ${hb.clan.name} clan is set to lead the ${t.name}${ph.clan.head && ph.clan !== hb.clan ? `, ahead of ${ph.clan.head.name} of your clan: ${headmanWhy(hb, ph.clan.head)}` : ''}. ${ph.name} has a following of ${ph.sex === 'F' ? 'her' : 'his'} own. Will ${ph.sex === 'F' ? 'she' : 'he'} challenge for the leadership?<br><br>${tallyLine(headshipTally(W, t, ph, hb, false), hb, challengeChance(W, t, ph, hb))}`, data: { tribe: t, rival: hb }, options: [{ label: `Challenge ${hb.name}`, hint: `Every clan backs one of you: friendship, standing and kin decide. Failure breeds enmity. Your chance is about ${Math.round(challengeChance(W, t, ph, hb) * 100)}%${ruleOf(t) ? ` (the ${t.name} hold their leader ${ruleOf(t) === 1 ? 'for life' : 'in one clan'}: ${ruleOf(t) === 1 ? 'three quarters' : 'half'} of the usual)` : ''}` }, { label: `Support ${hb.name}`, hint: `Goodwill from ${hb.sex === 'F' ? 'her' : 'his'} clan` }] });
      if (!quiet && hb) {
        note(W, t, agedT ? `${old.name}, grown old, laid down the leadership of the ${t.name}; ${hb.name} of the ${hb.clan.name} clan leads now.` : `${hb.name} of the ${hb.clan.name} clan is now headman of the ${t.name}.`);
        if (agedT && ph && ph.alive && ph.clan && ph.clan.tribe === t && hb.clan === ph.clan) houseNote(W, `${old.name}, grown old, laid down the leadership of the ${t.name}; ${hb.name} of our clan leads now.`);
        // the house is told when another clan is chosen to lead, and why
        { const P = W.player; if (ph && ph.alive && ph.clan && ph.clan.tribe === t && hb.clan !== ph.clan && ph.clan.head && !W.pending.some(e => e.type === 'challenge' && e.data && e.data.rival === hb) && P.lastLeadTold !== hb && W.week - (P.lastLeadNote || -1e9) > 52 * 2) { P.lastLeadNote = W.week; P.lastLeadTold = hb;
          const mine = ph.clan.head, why = t.rule === 2 && t.seat === hb.clan.id ? `the leadership of the ${t.name} belongs to the ${hb.clan.name} clan` : headmanWhy(hb, mine);
          houseNote(W, agedT ? `${old.name}, grown old, laid down the leadership of the ${t.name}; ${hb.name} of the ${hb.clan.name} clan took ${old.sex === 'F' ? 'her' : 'his'} place.` : `${hb.name} of the ${hb.clan.name} clan was chosen to lead the ${t.name}, not our clan: ${why}.`);
          notice(W, `${hb.name} now leads the ${t.name}`, `${agedT ? old.name + ' has grown old and laid down the leadership. ' : 'Your clan was passed over. '}${t.rule === 2 && t.seat === hb.clan.id ? 'The leadership of the tribe belongs to the ' + hb.clan.name + ' clan.' : 'A tribe follows the clan head with the greatest standing, and a large clan adds weight.'} ${hb.name} of the ${hb.clan.name} (weight ${leadWeight(hb).toFixed(2)}) came ahead of ${mine.name} of your clan (${leadWeight(mine).toFixed(2)}): ${why}.${mine === ph ? ' You can challenge under Act.' : ''}`); } }
        if (old && !old.alive && old.clan && old.clan !== hb.clan && old.clan.alive && W.rand() < 0.35) {
          affect(W, old.clan, hb.clan, -15, `Dispute over who would lead after ${old.name} died`);
          logEvent(W, `Succession quarrel among the ${t.name}: the ${old.clan.name} clan resents ${hb.name}'s rise.`, t, 'conflict');
        }
      }
    }
    trackSeat(W, t, quiet);
  }

  // ---------- marriage (clan exogamy, mostly within the tribe) ----------
  function marriages(W, t) {
    const rand = W.rand, bachelors = [];
    for (const c of t.clans) for (const q of c.people) if (!q.reserved && !q.slave && q.sex === 'M' && q.age >= 19 && q.age < 65 && (!q.spouse || ((q.wives || 1) < 2 && q.age >= 25))) bachelors.push(q);
    // men from nearby friendly tribes are also eligible occasionally
    const seenC = new Set();
    for (const k of t.clans) for (const c of nearClans(W, k.x, k.y, 40000)) {
      if (c.tribe === t || seenC.has(c) || opinion(t, c.tribe) <= 0) continue; seenC.add(c);
      const p = isAllied(t, c.tribe) ? 0.5 : 0.2;
      for (const q of c.people) if (!q.reserved && !q.slave && q.sex === 'M' && !q.spouse && q.age >= 20 && q.age < 55 && rand() < p) bachelors.push(q);
    }
    const ancC = new Map(); // each person's near ancestors, worked out once for the whole round
    for (const c of t.clans) for (const w of c.people) {
      if (w.reserved || w.slave || w.sex !== 'F' || w.spouse || w.age < 16 || w.age > 45 || (w.widowed && W.week - w.widowed < 20) || rand() > 0.2) continue;
      let best = null, bs = -Infinity;
      for (const m of bachelors) {
        if ((m.spouse && (m.wives || 1) >= 2) || closeKinC(ancC, m, w) || (m.spouse && W.player && W.player.head === w)) continue;               // incest taboo
        const poly = m.spouse ? -28 + prestige(m) * 15 : 0;                             // a second wife (polygyny) is possible but less likely
        const exo = m.clan === w.clan ? -22 : 0;                                       // clan exogamy (relaxed when there is no one else)
        const diff = Math.max(0, Math.abs((m.age - 4) - w.age) - 4);
        const sc = poly + exo - diff * 2 + opinion(m.clan, w.clan) * 0.4 + (m.clan.tribe === t ? 15 : isAllied(t, m.clan.tribe) ? 8 : 0) + m.clan.goods.amber * 1.5 + opinion(m.fam || m.clan, w.fam || w.clan) * 0.2 + prestige(m) * 10 + rand() * 12;
        if (sc > bs) { bs = sc; best = m; }
      }
      if (!best || bs < -45) continue;
      marry(W, best, w);
    }
  }
  function closeKinC(C, a, b) { // closeKin with the ancestor sets kept in C
    const anc = q => { let s = C.get(q); if (!s) { s = new Set([q]); for (const p of [q.mother, q.father]) if (p) { s.add(p); if (p.mother) s.add(p.mother); if (p.father) s.add(p.father); } C.set(q, s); } return s; };
    const A = anc(a); for (const x of anc(b)) if (A.has(x)) return true; return false;
  }
  function closeKin(a, b) {
    const anc = q => { const s = new Set([q]); for (const p of [q.mother, q.father]) if (p) { s.add(p); if (p.mother) s.add(p.mother); if (p.father) s.add(p.father); } return s; };
    const A = anc(a); for (const x of anc(b)) if (A.has(x)) return true; return false;
  }
  // where a couple will live: by the custom of her people, unless a dwindling clan needs them, or the house would lose its last blood
  function uxorilocal(W, m, w, second) {
    const wc = w.clan, mc = m.clan; if (wc === mc) return false;
    { const P0 = W.player; if (P0 && !P0.over && P0.head && P0.head.alive) { if (P0.head === w) return true; if (P0.head === m) return false; } } // the head of the player's house never marries away
    if (second) return false;
    if (wc.head === w && mc.head !== m) return true; if (mc.head === m && wc.head !== w) return false; // the head of a clan does not marry out of it
    let uxori = isMatri(wc.tribe);
    if (wc.tribe === mc.tribe) {
      if (!uxori && freeCount(wc) < 14 && freeCount(mc) >= freeCount(wc) + 6 && !m.dyn && m !== mc.head) uxori = true;
      else if (uxori && freeCount(mc) < 14 && freeCount(wc) >= freeCount(mc) + 6 && !w.dyn && w !== wc.head) uxori = false;
    }
    const P1 = W.player; if (P1 && !P1.over && P1.head.alive) {
      const last = q => q.dyn && q !== P1.head && q.clan === P1.head.clan && !q.clan.people.some(x => x.dyn && x !== q && x !== P1.head && !x.slave && x.age >= 12);
      if (!uxori && last(w)) uxori = true; else if (uxori && last(m)) uxori = false;
      if (P1.head === w && !uxori && !clanHeir(W, wc, w)) uxori = true; else if (P1.head === m && uxori && !clanHeir(W, mc, m)) uxori = false; // a head with no heir beside them does not leave the house's clan
    }
    return uxori;
  }
  function marry(W, m, w) {
    const wc = w.clan, mc = m.clan, wf = w.fam;
    const second = !!m.spouse; w.spouse = m; if (!second) { m.spouse = w; m.wives = 1; } else m.wives = 2;
    // a new household (or her husband's, if she is a co-wife); she and her young children move to his clan (patrilocal)
    // residence follows custom, but a couple settles with the clan that badly needs them: a dwindling clan keeps its own and takes in the spouse
    const uxori = uxorilocal(W, m, w, second);
    if (uxori) { // the husband comes to live with his wife's clan
      const P0 = W.player, f0 = w.fam && w.fam.clan === wc && (w.fam.head === w || (P0 && !P0.over && P0.head === w)) ? w.fam : newFamily(W, wc, w); w.fam = f0; m.fam = f0;
      { const PX = W.player; if (PX && !PX.over && PX.head.alive && m.dyn && m !== PX.head && wc !== mc && mc === PX.head.clan) { if (houseNear(W, m)) houseNote(W, `${m.name} of our house married ${w.name} and went to live with the ${wc.name} clan.`); else houseCount(W, 'sumM'); } }
      mc.people.splice(mc.people.indexOf(m), 1); wc.people.push(m); m.clan = wc;
      for (const k of wc.people.filter(k => k.mother === w && k.age < 13)) k.fam = f0;
      if (P0 && !P0.over && P0.head === m) { const heir = clanHeir(W, mc, m); if (heir) { P0.heads[P0.heads.length - 1].to = W.week; P0.head = heir; P0.heads.push({ name: heir.name, from: W.week, to: null, titles: [] }); houseNote(W, `${m.name} married ${w.name} and went to live with her people, the ${wc.name} clan, as is their custom. ${heir.name}, ${relWord(heir, m)}, now leads the house.`); } }
      affect(W, wc, mc, 8, `${m.name} (${mc.name}) married ${w.name} (${wc.name})`);
      note(W, f0, `${m.name} of the ${mc.name} clan comes to live with ${w.name} of the ${wc.name} clan.`);
      if (mc.tribe !== wc.tribe) { affect(W, mc.tribe, wc.tribe, 10, `${m.name} of the ${mc.tribe.name} married into the ${wc.tribe.name}`); rel(mc.tribe, wc.tribe).kin++; W.gatherMarriages = (W.gatherMarriages || 0) + 1; }
      return;
    }
    const oldMf = m.fam, keep = m.fam && m.fam.clan === mc && (second || m.fam.head === m || (W.player && !W.player.over && W.player.head === m)), wKeeps = W.player && !W.player.over && W.player.head === w && wc === mc && w.fam && w.fam.clan === wc, f = wKeeps ? w.fam : keep ? m.fam : newFamily(W, mc, m); m.fam = f; // a woman who leads the house and marries within the clan keeps her household; he joins it
    const PH = W.player && !W.player.over ? W.player.head : null; // children of the house's own line stay with their father's clan
    const movers = [w, ...wc.people.filter(k => k.mother === w && k.age < 13 && k !== PH && !(k.father && k.father.dyn && wc.people.includes(k.father) || (k.father && !k.father.alive && k.dyn && k.father.clan === wc)))];
    { const PX = W.player, lv = movers.filter(k => k.dyn); if (PX && !PX.over && PX.head.alive && wc !== mc && wc === PX.head.clan && w !== PX.head && lv.length) { const kids = movers.filter(k => k !== w), lvN = lv.filter(k => houseNear(W, k)); if (w.dyn ? houseNear(W, w) : lvN.length) houseNote(W, w.dyn ? `${w.name} of our house married ${m.name} and went to live with the ${mc.name} clan${kids.length ? `, taking ${kids.length === 1 ? 'a child' : kids.length + ' children'} with ${w.sex === 'F' ? 'her' : 'him'}` : ''}.` : `${nameList(lvN)}, of our blood, went with their mother ${w.name}, who married into the ${mc.name} clan.`); else houseCount(W, 'sumM'); } }
    for (const k of movers) { k.fam = f; if (wc !== mc) { wc.people.splice(wc.people.indexOf(k), 1); mc.people.push(k); k.clan = mc; } }
    // a woman leading the house marries out to her husband's clan: the house stays with its clan
    const P = W.player;
    if (P && !P.over && P.head === w && wc !== mc) { const heir = clanHeir(W, wc, w); if (heir) { P.heads[P.heads.length - 1].to = W.week; P.head = heir; P.heads.push({ name: heir.name, from: W.week, to: null, titles: [] }); houseNote(W, `${w.name} married ${m.name} and went to live in the ${mc.name} clan. ${heir.name}, ${relWord(heir, w)}, now leads the house in the ${wc.name} clan.`); } }
    affect(W, mc, wc, 8, `${m.name} (${mc.name}) married ${w.name} (${wc.name})`);
    if (oldMf && oldMf !== f) affect(W, f, oldMf, 30); if (wf) affect(W, f, wf, 30); if (oldMf && wf) affect(W, oldMf, wf, 12, `${m.name} married ${w.name}`);
    if (second && P && !P.over && P.head === m) houseNote(W, `${m.name} took a second wife, ${w.name}${wc !== mc ? ` of the ${wc.name} clan` : ''}.`);
    note(W, f, second ? `${m.name} takes a second wife, ${w.name} of the ${wc.name} clan.` : `${m.name} of the ${mc.name} clan marries ${w.name} of the ${wc.name} clan.`);
    if (mc.tribe !== wc.tribe) {
      affect(W, mc.tribe, wc.tribe, 10, `${w.name} of the ${wc.tribe.name} married into the ${mc.tribe.name}`); rel(mc.tribe, wc.tribe).kin++;
      note(W, mc.tribe, `${w.name} of the ${wc.tribe.name} marries into the ${mc.name} clan.`);
      if (rel(mc.tribe, wc.tribe).kin === 1) logEvent(W, `First marriage between the ${mc.tribe.name} and the ${wc.tribe.name}: ${w.name} weds ${m.name}.`, mc.tribe, 'peace');
      W.gatherMarriages = (W.gatherMarriages || 0) + 1;
    }
  }

  // ---------- orphans, adoption, household upkeep ----------
  function households(W, t) {
    for (const c of t.clans) {
      let groups = null; // members of each house, grouped in one pass (regrouped after an orphaned house is taken in)
      const group = () => { groups = new Map(); for (const q of c.people) { const g = groups.get(q.fam); if (g) g.push(q); else groups.set(q.fam, [q]); } };
      for (const f of familiesOf(c)) {
        if (!groups) group();
        const mem = groups.get(f) || [];
        if (mem.some(isAdult)) { if (!f.head.alive || f.head.clan !== c || f.head.fam !== f) f.head = mem.filter(isAdult).sort((a, b) => b.age - a.age)[0]; continue; }
        // no adult left: children are taken in by kin in the clan (best-liked family)
        const fams = familiesOf(c).filter(g => g !== f && c.people.some(q => q.fam === g && isAdult(q)));
        if (!fams.length) continue;
        fams.sort((a, b) => opinion(f, b) - opinion(f, a));
        const g = fams[0]; for (const q of mem) q.fam = g; groups = null;
        { const P1 = W.player, yh = P1 && !P1.over && mem.includes(P1.head) && P1.head.age < 16 ? P1.head : null, ad = yh && (g.head && g.head.alive && g.head.clan === c ? g.head : c.people.find(q => q.fam === g && isAdult(q)));
          if (ad) { const hp = yh.sex === 'F' ? 'her' : 'his', par = yh.father === ad ? 'father' : yh.mother === ad ? 'mother' : null, gp = (yh.father && (yh.father.father === ad || yh.father.mother === ad)) || (yh.mother && (yh.mother.father === ad || yh.mother.mother === ad)) ? 'grand' + (ad.sex === 'M' ? 'father' : 'mother') : null, rw = par ? `${hp} ${par}` : gp ? `${hp} ${gp}` : relWord(ad, yh); houseNote(W, `Young ${yh.name} now lives in the household of ${ad.name}${rw.startsWith('of ') ? (ad.dyn ? ', of the blood' : '') : ', ' + rw}.`); } }
        note(W, g, `Took in the orphaned children of the house of ${f.name}.`); affect(W, c, c, 0);
        kill(W, f);
      }
      // adult children who are unmarried stay with parents; widowed elders join a married child's household
    }
  }

  // ---------- disputes & violence inside the tribe ----------
  const CAUSES = [
    ['food', 'quarrel over sharing meat'], ['marriage', 'a broken betrothal'], ['sorcery', 'an accusation of sorcery after a death'],
    ['insult', 'an insult at a gathering'], ['adultery', 'an accusation of adultery'], ['theft', 'stolen tools'], ['hunt', 'a dispute over a kill']];
  function disputes(W, t) {
    const rand = W.rand, fams = []; for (const c of t.clans) for (const f of familiesOf(c)) fams.push(f);
    if (fams.length < 2) return;
    const hunger = t.clans.reduce((s, c) => s + Math.max(0, 0.9 - c.cond), 0) / t.clans.length;
    const crowd = tribeSize(t) / tribeMax(t);
    const rate = 0.012 * fams.length * (1 + 4 * hunger + crowd);
    let n = Math.floor(rate) + (rand() < rate % 1 ? 1 : 0);
    while (n-- > 0) {
      const a = pick(fams, rand); let b = pick(fams, rand); if (a === b) continue;
      // disputes happen between people who are near each other: same clan or neighbouring camps
      if (a.clan !== b.clan && Math.hypot(a.clan.x - b.clan.x, a.clan.y - b.clan.y) > 30000 && rand() < 0.7) continue;
      let cause = pick(CAUSES, rand);
      if (hunger > 0.15 && rand() < 0.5) cause = CAUSES[0];
      if (a.lastDeath && W.week - a.lastDeath < 12 && rand() < 0.4) cause = CAUSES[2];
      const ha = a.head, hb = b.head; const temper = ((ha ? ha.temper : 0.5) + (hb ? hb.temper : 0.5)) / 2;
      const sev = rand() * (0.5 + temper) * (1 - opinion(a, b) / 150);
      const txt = `${cause[1]}`;
      if (sev < 0.55) { affect(W, a, b, -6, txt); if (a.clan !== b.clan) affect(W, a.clan, b.clan, -2); continue; }
      // serious: the headman tries to mediate
      const hm = t.headman, med = hm ? 0.35 + 0.6 * Math.min(1, prestige(hm)) : 0.3;
      if (sev < 0.88 || rand() < med * 0.45) {
        if (rand() < med) { affect(W, a, b, -6, `${txt} — settled by ${hm ? hm.name : 'the elders'}`); note(W, a, `Dispute with the house of ${b.name} (${cause[1]}) settled by ${hm ? hm.name : 'the elders'}.`); }
        else { affect(W, a, b, -18, txt); if (a.clan !== b.clan) affect(W, a.clan, b.clan, -8, `${txt} between the houses of ${a.name} and ${b.name}`); note(W, a, `Bitter quarrel with the house of ${b.name}: ${cause[1]}.`); note(W, b, `Bitter quarrel with the house of ${a.name}: ${cause[1]}.`); }
        continue;
      }
      // violence — unless it is the house's own household, which chooses for itself
      { const PH = W.player && !W.player.over && W.player.head.alive ? W.player.head : null;
        if (PH && PH.fam && (a === PH.fam || b === PH.fam)) { const o = a === PH.fam ? b : a, tr = GIFTABLE.find(g => PH.clan.goods[g] > 0);
          pushEvent(W, { type: 'quarrel', key: o.id, title: `A quarrel with the house of ${o.name}`, text: `What began as ${txt} between your household and the house of ${o.name}${o.clan !== PH.clan ? ` of the ${o.clan.name} clan` : ', of your own clan,'} has turned ugly. Men are reaching for their spears.`, data: { a, b, txt },
            options: [{ label: 'Make peace', hint: tr ? `Give them ${GOOD_NAMES[tr].toLowerCase()} and swallow the insult. No blood` : 'Send food and swallow the insult. No blood' }, { label: 'Stand our ground', hint: 'Shouting and shoving, and lasting ill will, but no one dies' }, { label: 'Fight', hint: `Blood may be spilled on either side. ${PH.name} could be among the dead` }] });
          continue; } }
      fight(W, a, b, txt);
    }
  }
  function fight(W, a, b, txt) {
    const rand = W.rand, men = famMembers(b).filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 60), att = famMembers(a).filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 60);
    if (!men.length || !att.length) { affect(W, a, b, -20, `${txt} came to blows`); return; }
    const killer = pick(att, rand);
    if (rand() < 0.42) {
      const v = pick(men, rand); die(W, b.clan, v, `killed by ${killer.name}`, a.clan, killer); b.clan.people = b.clan.people.filter(q => q.alive); b.clan.yr.killed++;
      affect(W, b, a, -45, `${killer.name} killed ${v.name} (${txt})`, 50);
      if (a.clan !== b.clan) affect(W, b.clan, a.clan, -25, `${killer.name} of the ${a.clan.name} killed ${v.name} of the ${b.clan.name}`, 35);
      note(W, b, `${v.name} was killed by ${killer.name} of the house of ${a.name}.`); note(W, b.clan, `${v.name} killed by ${killer.name} of the ${a.clan.name} clan (${txt}).`);
      logEvent(W, `Killing among the ${b.clan.tribe.name}: ${killer.name} (${a.clan.name}) kills ${v.name} (${b.clan.name}) after ${txt}.`, b.clan, 'blood');
    } else { affect(W, a, b, -22, `${txt} came to blows`); if (a.clan !== b.clan) affect(W, a.clan, b.clan, -10, `Fight between the houses of ${a.name} and ${b.name}`); note(W, b, `Fight with the house of ${a.name} over ${txt}.`); }
  }

  // ---------- feuds & revenge (clan level, within and between tribes) ----------
  function revenge(W) {
    const rand = W.rand;
    for (const c of W.clans) for (const [oid, r] of c.rel) {
      const o = W.ents.get(oid); if (!o || o.kind !== 'clan' || r.grudge < 22) continue;
      { const P0 = W.player; if (P0 && !P0.over && P0.head.alive && c === P0.head.clan && pol(W).blood !== 'revenge') continue; } // the house's clan takes revenge only on the house's word
      if (Math.hypot(o.x - c.x, o.y - c.y) > 60000) continue;
      if (c.tribe !== o.tribe && peaceHeld(W, c.tribe, o.tribe)) continue; // a peace holds the blood-feud too
      // who holds the grudge? the side that suffered last (recorded via history order); approximate: either side may act
      const avengers = c.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 55), targets = o.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 60 && !kinOfHouse(W, q, c));
      if (!avengers.length || !targets.length) continue;
      // vengeance needs men to carry it out: a clan bled white by a raid is slow to strike back
      const able = clamp(avengers.length / Math.max(1, targets.length), 0.2, 1.2);
      if (rand() < 0.003 * r.grudge / 40 * able * (isMatri(c.tribe) ? 0.6 : 1) * (faithOf(c.tribe) === 'totem' && c.tribe === o.tribe ? 0.6 : 1)) {
        const P = W.player, pc = P && !P.over && P.head.alive ? P.head.clan : null;
        // the house is warned before blood is spilled, and can act
        if (o === pc && (!r.warned || W.week - r.warned > 52 * 5)) {
          r.warned = W.week;
          pushEvent(W, { type: 'vengeance', key: c.id, title: 'Blood vengeance sworn', text: `The ${c.name} clan of the ${c.tribe.name} have sworn to avenge their dead on the ${o.name}. Their men are watching our camp.`, data: { c, o },
            options: [{ label: 'Offer compensation', hint: 'Food and something of value — the feud may end' }, { label: 'Post guards', hint: 'For two years, most attempts on our people fail — and the avenger may die' }, { label: 'Let them come', hint: 'Do nothing' }] });
          continue;
        }
        // a chance for elders to settle it with compensation instead
        const sameTribe = c.tribe === o.tribe, hm = c.tribe.headman;
        if (rand() < (sameTribe ? 0.55 + (hm ? 0.3 * Math.min(1, prestige(hm)) : 0) : 0.4) + (isMatri(c.tribe) ? 0.2 : 0) + (faithOf(c.tribe) === 'totem' ? 0.1 : 0)) {
          r.grudge *= 0.2; r.op += 15; clearWrong(c, o); r.hist.push({ w: W.week, t: `Feud settled with gifts of compensation${hm ? `, arranged by ${hm.name}` : ''}` });
          note(W, c, `Feud with the ${o.name} clan ended with compensation.`); note(W, o, `Feud with the ${c.name} clan ended with compensation.`);
          logEvent(W, `The ${c.name} and ${o.name} clans end their feud with compensation.`, c, 'peace');
          continue;
        }
        const k = pick(avengers, rand);
        // leaders go about with kin and followers around them: harder to reach than an ordinary man
        const wt = q => (q === o.head ? 0.35 : 1) * (q === o.tribe.headman ? 0.5 : 1) * (o.tribe.confed && o.tribe.confed.king === q ? 0.3 : 1);
        let tot = 0; for (const q of targets) tot += wt(q); let x = rand() * tot, v = targets[0]; for (const q of targets) { x -= wt(q); if (x <= 0) { v = q; break; } }
        if (o.guardUntil > W.week && rand() < 0.7) {
          const caught = rand() < 0.5; if (caught) { die(W, c, k, `killed by guards while seeking revenge on the ${o.name}`, o); c.people = c.people.filter(q => q.alive); }
          note(W, o, `Our guards ${caught ? `killed ${k.name} of the ${c.name}` : `drove off ${k.name} of the ${c.name}`}, who came for revenge.`);
          if (pc === o && P) houseNote(W, `The guards ${caught ? `killed ${k.name}` : `drove off ${k.name}`} of the ${c.name}, who came seeking blood.`);
          r.grudge = Math.max(0, r.grudge - 10); continue;
        }
        die(W, o, v, `killed in revenge by ${k.name}`, c, k); o.people = o.people.filter(q => q.alive); o.yr.killed++;
        r.grudge = Math.max(0, r.grudge - 40); affect(W, o, c, -20, `${k.name} of the ${c.name} killed ${v.name} in revenge`, 18); // a life for a life mostly settles it
        if (!sameTribe) affect(W, o.tribe, c.tribe, -10, `Revenge killing of ${v.name}`, 6);
        note(W, c, `${k.name} takes revenge on the ${o.name} clan, killing ${v.name}.`); note(W, o, `${v.name} killed in revenge by ${k.name} of the ${c.name} clan.`);
        logEvent(W, `Blood feud: ${k.name} (${c.name}) kills ${v.name} (${o.name}) in revenge.`, o, 'blood');
      }
    }
  }

  // ---------- cooperation: food sharing between clans ----------
  function sharing(W, t) {
    for (const c of t.clans) {
      if (c.cond > 0.75) continue;
      const need = needsWeek(c);
      const donors = t.clans.filter(o => o !== c && o.store > needsWeek(o) * 0.8 && Math.hypot(o.x - c.x, o.y - c.y) < 45000 && opinion(o, c) > -15);
      if (!donors.length) continue;
      const d = donors.sort((a, b) => opinion(b, c) - opinion(a, c))[0], gift = Math.min(d.store * 0.4, need);
      d.store -= gift; c.store += gift;
      affect(W, c, d, 9, `The ${d.name} shared food during hunger`);
      if (W.rand() < 0.3) note(W, c, `The ${d.name} clan shared food with us in a hungry time.`);
    }
  }

  // ---------- clan fission & merger ----------
  // ---- daughter villages: which houses go, where they go, and how they are sent ----
  const FOUND_MIN = 12000, FOUND_MAX = 50000, FOUND_APART = 8000, FOUND_YEARS = 8;
  // the houses a clan can spare: those least close to its head's own, never his household nor his parents' or children's
  function spareHouses(c, H, keep) {
    const leave = new Set(); if (!H || !H.fam) return leave;
    const kin = new Set([H.fam]); for (const p of [H.father, H.mother]) if (p && p.fam) kin.add(p.fam);
    for (const k of keep || []) if (k && k.clan === c && k.fam) { kin.add(k.fam); for (const p of [k.father, k.mother]) if (p && p.fam) kin.add(p.fam); }
    const sizeOf = () => c.people.filter(q => leave.has(q.fam) || (q.slave && q.owner && leave.has(q.owner.fam))).length;
    for (const f of familiesOf(c).filter(f => !kin.has(f) && !c.people.some(q => q.fam === f && (q.father === H || q.mother === H || (keep || []).some(k => k && (q.father === k || q.mother === k))))).sort((x, y) => opinion(x, H.fam) - opinion(y, H.fam))) { leave.add(f); if (sizeOf() > c.people.length * 0.33) leave.delete(f); else if (sizeOf() >= c.people.length * 0.25) break; }
    return leave;
  }
  const leaversOf = (c, leave) => c.people.filter(q => leave.has(q.fam) || (q.slave && q.owner && leave.has(q.owner.fam)));
  // why a spot will not do for a daughter village of clan c (null if it will); the same words for the deed, the map and the world
  function siteWhy(W, c, x, y, shown) { // shown: a spot the player picked is judged on the km the game shows (rounded), so the text never contradicts itself
    const i = cellAt(x, y), km0 = Math.hypot(x - c.x, y - c.y) / 1000, km = shown ? Math.round(km0) : km0;
    if (km < FOUND_MIN / 1000) return `That is only ${Math.round(km0)} km from the village. A daughter village must stand at least ${FOUND_MIN / 1000} km away.`;
    if (km > FOUND_MAX / 1000) return `That is ${Math.round(km0)} km away. A daughter village must stand within ${FOUND_MAX / 1000} km.`;
    if (x < 3000 || y < 3000 || x >= WORLD - 3000 || y >= WORLD - 3000 || !W.land[i] || W.lake[i]) return 'That is water. Choose a spot on land.';
    if (!canReach(W, c, x, y)) return 'The clan cannot walk to that land — it lies across the sea.';
    if (c.live === 'fishing' && W.seaDist[i] > 2) return 'A fishing village must stand on the shore.';
    for (const o of nearClans(W, x, y, FOUND_APART)) if (o.settled) return `Another village, ${o.village || 'the ' + o.name + ' clan'}, stands within ${FOUND_APART / 1000} km.`;
    for (const o of W.clans) if (o.alive && o.toSettle && !o.settled && Math.hypot(o.tx - x, o.ty - y) <= FOUND_APART) return `A village is already being raised within ${FOUND_APART / 1000} km.`;
    return null;
  }
  // the best sites for a daughter village in the ring round clan c, by the farming ground (the same scoring the world uses); no randomness
  function foundSites(W, c, o) {
    o = o || {}; const out = [], fish = c.live === 'fishing', memo = new Map();
    for (let a = 0; a < 24; a++) for (const r of [14, 20, 26, 32, 38, 44, 50]) {
      const ang = a * Math.PI / 12 + (r % 3) * 0.05, x = c.x + Math.cos(ang) * r * 1000, y = c.y + Math.sin(ang) * r * 1000;
      if (siteWhy(W, c, x, y) || landKeepOff(W, c, cellAt(x, y))) continue;
      if (o.known && !knows(W, x, y)) continue;
      if (o.home && (!inHome(c.tribe, x, y, 25000) || landBlocked(W, c.tribe, cellAt(x, y), memo))) continue;
      let crowd = 0; for (const q of nearClans(W, x, y, 15000)) if (q.settled) crowd++;
      let rich = 0; if (fish) { const b = foodBreakdown(W, x, y, c.tool, c.tribe.boats); rich = (b.fish + b.shellfish + b.seals) / Math.max(1, needsWeek(c) * 0.4); if (rich <= 1.3) continue; } // the sea alone must feed them, by the world's own test for a fishing village
      const sc = ((fish ? rich * 0.3 : farmSuit(W, x, y)) / (1 + crowd)) * (1 - r / 400);
      if (sc > 0) out.push({ x, y, km: r, sc });
    }
    out.sort((p, q) => q.sc - p.sc); const pick = [];
    for (const s of out) { if (pick.length >= (o.n || 1)) break; if (pick.every(p => Math.hypot(p.x - s.x, p.y - s.y) >= 12000)) pick.push(s); }
    return pick;
  }
  // the player's head and heir stay home when their own clan sends a village away, whoever leads the clan or the tribe
  const keepOf = (W, c) => { const P = W.player; return P && !P.over && P.head.alive && P.head.clan === c ? [P.head, houseHeir(W)] : []; };
  // can clan c send a daughter village away now? null if so, else the plain reason; plan carries the houses
  function foundWhy(W, c, plan) {
    const H = c.head;
    if (!c.settled) return `The ${c.name} clan does not live in a village`;
    if (!H || !H.fam) return `The ${c.name} clan has no head to lead the rest`;
    const fams = familiesOf(c).filter(f => f !== H.fam), n = freeCount(c), cap = splitCap(W, c);
    if (fams.length < 3) return `The ${c.name} clan has only ${fams.length} house${fams.length === 1 ? '' : 's'} besides its head's; a daughter village needs 3 or more`;
    if (n < cap * 0.75) return `The ${c.name} clan counts ${n}; a daughter village needs ${Math.ceil(cap * 0.75)} or more (the village holds ${cap})`;
    if (c.foundAt != null && W.week - c.foundAt < yrs(FOUND_YEARS)) { const v = Math.ceil((yrs(FOUND_YEARS) - (W.week - c.foundAt)) / 52); return `The ${c.name} clan sent a daughter village away not long ago (${v} yr${v === 1 ? '' : 's'})`; }
    const leave = spareHouses(c, H, keepOf(W, c)), lv = leaversOf(c, leave);
    if (lv.length < 6) return `The houses of the ${c.name} clan are too few to spare for a village (${lv.length} would go; 6 are needed)`;
    if (c.people.length - lv.length < 6 || lv.length > c.people.length * 0.38) return `Too many would have to go from the ${c.name} clan to leave it whole`;
    if (plan) { plan.leave = leave; plan.leavers = lv; }
    return null;
  }
  const goName = (pl, o) => { const cnt = f => pl.leavers.filter(q => q.fam === f).length, fs = [...pl.leave].sort((a, b) => cnt(b) - cnt(a)).map(f => f.name), one = fs.length === 1; return (one ? 'the house of ' : 'the houses of ') + (fs.length > 3 ? `${fs.slice(0, 2).join(', ')} and others` : nameList(fs.map(n => ({ name: n })))); };
  // send the houses in `leave` out of clan c as a new clan of the tribe; it walks to `site` and builds a village there
  function foundDaughter(W, c, leave, site, nm) {
    const t = c.tribe, lv = leaversOf(c, leave); c.people = c.people.filter(q => !lv.includes(q));
    const nc = newClan(W, t, c.x, c.y, lv, nm, c.id), share = lv.length / (lv.length + c.people.length);
    nc.store = c.store * share; c.store -= nc.store; nc.grain = (c.grain || 0) * share; c.grain -= nc.grain; nc.cereal = c.cereal; nc.cond = c.cond;
    for (const f of leave) f.clan = nc;
    for (const [oid, r] of c.rel) { const o = W.ents.get(oid); if (o && o !== nc) { const r2 = rel(nc, o); r2.op = r.op; r2.grudge = r.grudge; } }
    startFounding(W, nc, c, site); return nc;
  }
  function startFounding(W, nc, c, site) {
    nc.toSettle = true; nc.founding = true; nc.tx = site[0]; nc.ty = site[1]; if (c.live === 'fishing') nc.live = 'fishing';
    wear(W, c.x, c.y, site[0], site[1], nc.people.length / 25);
  }
  // a daughter clan that has walked to its site raises its village
  function foundingMonth(W) {
    for (const c of W.clans) if (c.founding && c.toSettle && !c.settled && c.alive && Math.hypot(c.tx - c.x, c.ty - c.y) < 1500) {
      const fish = c.live === 'fishing'; c.toSettle = false; c.founding = false; c.settled = true; c.live = fish ? 'fishing' : 'farm'; c.settledAt = W.week; c.soil = 1; c.village = villageAt(W, c, c.tribe, fish ? 'haven' : 'vill'); c.daughterVillage = true; W.foundN = (W.foundN || 0) + 1;
      note(W, c, `Built the village of ${c.village}.`); logEvent(W, `🏘 The ${c.name} clan (${c.tribe.name}) raise the village of ${c.village}${c.parent != null && W.ents.get(c.parent) ? `, a daughter village of ${W.ents.get(c.parent).village || 'the ' + W.ents.get(c.parent).name + ' clan'}` : ''}.`, c, 'settle');
      const P = W.player, pc = c.parent != null ? W.ents.get(c.parent) : null; if (P && !P.over && P.head.alive && pc && P.head.clan === pc) houseNote(W, `The ${c.name} clan, sent from our village, raised ${c.village}.`);
    }
  }
  function clanFission(W, t) {
    for (const c of [...t.clans]) {
      const mineC = W.player && !W.player.over && W.player.head.alive && W.player.head.clan === c;
      const lf = mineC && c.letSplit && c.splitDone !== c.letSplit && W.week - c.letSplit < 52; // leave was given: a daughter clan must go within the year, whatever the count has done since
      if (mineC && c.letSplit && c.splitDone !== c.letSplit && W.week - c.letSplit >= 52 && c.splitTold !== c.letSplit) { c.splitTold = c.letSplit; houseNote(W, `No daughter clan left the ${c.name} clan, though leave was given.`); notice(W, 'No daughter clan went', `The outer houses of the ${c.name} clan did not go. ${c.splitWhy || 'No house could go without breaking the clan.'}`); }
      if (!lf && c.people.length < (mineC ? 26 : 14)) continue; // too few to part, whatever the houses are
      const fams = familiesOf(c); if (fams.length < 3 || freeCount(c) < (mineC ? 26 : 14)) { if (lf) c.splitWhy = fams.length < 3 ? 'Too few houses were left to part.' : 'The clan had dwindled, and no house could be spared.'; continue; }
      // find the most hostile pair of households
      let worst = null, wv = 0;
      for (const a of fams) if (a.rel.size) for (const b of fams) if (a.id < b.id) { const o = opinion(a, b); if (o < wv) { wv = o; worst = [a, b]; } }
      const conflict = wv < (faithOf(t) === 'totem' ? -60 : -40) && !(c.peaceMade && W.week - c.peaceMade < 260), tooBig = freeCount(c) > splitCap(W, c), sent = tooBig && c.letSplit && W.week - c.letSplit < 156;
      const byConflict = conflict && W.rand() < 0.25, bySize = !byConflict && (lf || tooBig && (sent || W.rand() < 0.15)); if (!byConflict && !bySize) continue;
      const [A, B] = worst || [c.head && c.head.fam ? c.head.fam : fams[0], pick(fams.filter(f => f !== (c.head && c.head.fam)), W.rand) || fams[1]];
      const PH = W.player && !W.player.over && W.player.head.alive && W.player.head.clan === c ? W.player.head : null;
      // a clan head of the house can make peace between the quarrelling houses before the clan breaks
      // a clan that has outgrown its camp: its head of the house chooses whether a daughter clan goes or the clan is held together
      if (PH && bySize && c.head === PH && !(c.letSplit && W.week - c.letSplit < 156) && !(c.holdTogether && W.week - c.holdTogether < 52 * 8)) { if (!W.pending.some(e => e.type === 'toobig')) pushEvent(W, { type: 'toobig', key: c.id, title: 'The clan has outgrown its home', text: `The ${c.name} clan now counts ${freeCount(c)} people, more than ${c.settled ? 'the village' : 'one camp'} can easily hold (${splitCap(W, c)}). The outer houses talk of founding a clan of their own nearby.`, data: { c }, options: [{ label: 'Let a daughter clan go', hint: 'About a third of the clan leaves and founds a new clan of your tribe: kin, and usually friends' }, { label: 'Hold the clan together', hint: `Your word keeps them for eight years, up to ${Math.round(splitCap(W, c, true) * 1.4)} people${freeCount(c) > Math.round(splitCap(W, c, true) * 1.4) ? ` (the clan already counts ${freeCount(c)}, so even so it will not hold)` : ''}. A crowded ${c.settled ? 'village' : 'camp'} eats its range bare: watch the food` }] }); continue; }
      if (PH && conflict && c.head === PH && !(c.letGo && W.week - c.letGo < 104)) { if (!W.pending.some(e => e.type === 'badblood')) pushEvent(W, { type: 'badblood', key: c.id, title: 'Bad blood in the clan', text: `The houses of ${A.name} and ${B.name} can no longer bear the sight of each other. If nothing is done the clan will break, and the house of ${B.name} will take its friends away with it.`, data: { c, A, B }, options: [{ label: 'Make peace between them', hint: `A feast of reconciliation and gifts to both houses: about ${Math.round(needsWeek(c) * 2 / Math.max(1, needsWeek(c) / 7))} days of the clan's food` }, { label: 'Let them go', hint: `The house of ${B.name} and those who side with it will leave and found their own clan` }] }); continue; }
      const leave = new Set([B]), lean = new Map();
      for (const f of fams) if (f !== A && f !== B) { const ob = opinion(f, B) + (W.rand() - 0.5) * 20, oa = opinion(f, A); if (ob > oa) { leave.add(f); lean.set(f, ob - oa); } }
      const sizeOf = () => c.people.filter(q => leave.has(q.fam) || (q.slave && q.owner && leave.has(q.owner.fam)));
      let leavers = sizeOf();
      if (lf && PH && (leavers.includes(PH) || leavers.length < 6 || leavers.length > c.people.length * 0.38)) { // the quarrel's choice does not fit: send the houses least close to the head's own, never the head's household
        leave.clear(); for (const f of spareHouses(c, PH, keepOf(W, c))) leave.add(f); leavers = sizeOf(); }
      if (PH) { // the house's own clan: its household never leaves unasked, and the greater part of the clan stays with it
        if (leavers.includes(PH)) continue;
        const waver = [...lean.keys()].sort((x, y) => lean.get(x) - lean.get(y));
        while (leavers.length > c.people.length * 0.33 && waver.length) { leave.delete(waver.shift()); leavers = sizeOf(); }
        if (leavers.length > c.people.length * 0.38) continue;
      }
      if (leavers.length < 6 || c.people.length - leavers.length < 6) { if (lf) c.splitWhy = leavers.length < 6 ? 'The outer houses were too small to found a clan.' : 'Too few would have been left behind.'; continue; }
      c.people = c.people.filter(q => !leavers.includes(q));
      const nc = newClan(W, t, c.x, c.y, leavers, B.name, c.id); nc.store = c.store * leavers.length / (leavers.length + c.people.length); c.store -= nc.store; nc.cond = c.cond; { const sh = leavers.length / (leavers.length + c.people.length); nc.grain = (c.grain || 0) * sh; c.grain -= nc.grain; nc.cereal = c.cereal; if (!conflict) c.foundAt = W.week; }
      for (const f of leave) f.clan = nc;
      for (const [oid, r] of c.rel) { const o = W.ents.get(oid); if (o && o !== nc) { const r2 = rel(nc, o); r2.op = r.op; r2.grudge = r.grudge; } }
      affect(W, nc, c, conflict ? wv * 0.6 : 20, conflict ? `Split in anger: the houses of ${A.name} and ${B.name}` : `The ${nc.name} branched off as the clan grew`, conflict ? 10 : 0);
      { const vs = !conflict && c.settled ? foundSites(W, c, { home: true })[0] : null; if (vs) startFounding(W, nc, c, [vs.x, vs.y]); else relocate(W, nc, 15000, 40000); } // a village that grows too big founds a daughter village on good ground; a quarrel scatters
      const why = conflict ? `after bad blood between the houses of ${A.name} and ${B.name}` : 'as the clan grew too large';
      note(W, c, `The house of ${B.name} and its allies left to form the ${nc.name} clan, ${why}.`); note(W, nc, `Founded when the house of ${B.name} broke away from the ${c.name} clan, ${why}.`);
      logEvent(W, `The ${c.name} clan of the ${t.name} splits — ${leavers.length} people form the ${nc.name} clan ${why}.`, nc, conflict ? 'conflict' : 'info');
      if (PH) { { const bl = leavers.filter(q => q.dyn && !q.slave), sl = leavers.filter(q => q.slave && q.owner && q.owner.dyn); if (c.letSplit) c.splitDone = c.letSplit; houseNote(W, `${leavers.length} people left our clan to found the ${nc.name} clan, ${why}. ${c.people.length} of us remain.${bl.length ? ` Of our blood, ${bl.length > 3 ? bl.length + ' went, among them ' + nameList(bl) : nameList(bl) + ' went'} with them.` : ''}${sl.length ? ` ${sl.length === 1 ? sl[0].name + ', a slave of the house, went' : sl.length + ' slaves of the house went'} with them.` : ''}`); }
        notice(W, `${leavers.length} people leave the clan`, `The house of ${B.name} and its friends have founded the ${nc.name} clan, ${why}. ${c.people.length} people remain with you.${conflict ? '' : ` A camp splits when it passes 42 people and a village when it passes 60; a great hall lets a village hold together past 100.`}`); }
    }
  }
  function clanMerge(W, t) {
    for (const c of [...t.clans]) {
      if (c.people.length >= 8 || !c.alive) continue;
      { const PH = W.player && !W.player.over && W.player.head; if (PH && PH.clan === c && (c.people.length >= 3 || t.clans.length === 1)) continue; } // the house's clan holds together while it can
      const others = t.clans.filter(o => o !== c);
      let target = others.sort((a, b) => opinion(c, b) - opinion(c, a))[0];
      if (!target) { // last clan of a dying tribe: join the friendliest nearby tribe
        let bs = -30; for (const o of W.clans) if (o.tribe !== t) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (d > 150000 || !canReach(W, c, o.x, o.y)) continue; const s = opinion(t, o.tribe) - d / 3000; if (s > bs) { bs = s; target = o; } }
        if (!target) continue;
        if (Math.hypot(target.x - c.x, target.y - c.y) > 25000 && c.people.length) { // walk over and join their tribe as a clan
          const nt = target.tribe; t.clans.splice(t.clans.indexOf(c), 1); nt.clans.push(c); c.tribe = nt; c.tx = target.x + (W.rand() - 0.5) * 10000; c.ty = target.y + (W.rand() - 0.5) * 10000; c.settled = false;
          if (W.land[cellAt(c.tx, c.ty)] === 0) { c.tx = target.x; c.ty = target.y; }
          wear(W, c.x, c.y, c.tx, c.ty, c.people.length / 15);
          { const PX = W.player; if (PX && !PX.over && PX.head.alive && PX.head.clan === c) { const rd = c.raidedAt && W.week - c.raidedAt < 52 * 15;
            houseNote(W, `Our clan, the last of the ${t.name}${rd ? ', worn down by raids' : ''}, went to live with the ${nt.name}.`);
            notice(W, `We go to the ${nt.name}`, `The ${c.name} clan was all that was left of the ${t.name}${rd ? ', worn down by raids' : ''}. It is walking to the ${target.name} clan and will live among the ${nt.name}, following their leader and their ways.`); } }
          note(W, nt, `The last of the ${t.name}, the ${c.name} clan, came to join us.`); logEvent(W, `The last clan of the ${t.name}, the ${c.name}, walk to join the ${nt.name}.`, c, 'info');
          W.tribes.splice(W.tribes.indexOf(t), 1); t.clans = []; if (t.confed) leaveConfed(W, t, null); kill(W, t); continue;
        }
      }
      if (c.people.length === 0) { removeClan(W, c); continue; }
      { const PX = W.player; if (PX && !PX.over && PX.head.alive && PX.head.clan === c) { const rd = c.raidedAt && W.week - c.raidedAt < 52 * 15, tn = target.tribe !== t ? ` of the ${target.tribe.name}` : '';
        houseNote(W, `Our clan was too few to stand alone${rd ? ', worn down by raids,' : ''} and joined the ${target.name} clan${tn}.`);
        notice(W, `The ${c.name} clan joins the ${target.name}`, `Only ${c.people.length} were left of the ${c.name} clan${rd ? ', worn down by raids' : ''}, too few to stand alone. You and yours now live as part of the ${target.name} clan${tn}${target.head ? `, and ${target.head.name} leads it` : ''}.`); } }
      for (const q of c.people) { q.clan = target; target.people.push(q); }
      for (const f of familiesOf(target)) if (f.clan === c) f.clan = target;
      target.store += c.store;
      note(W, target, `The remnants of the ${c.name} clan (${c.people.length}) joined us.`);
      logEvent(W, `The dwindling ${c.name} clan merges into the ${target.name} clan${target.tribe !== t ? ` of the ${target.tribe.name}` : ''}.`, target, 'info');
      c.people = []; removeClan(W, c);
    }
  }
  function removeClan(W, c) {
    const t = c.tribe; t.clans.splice(t.clans.indexOf(c), 1); W.clans.splice(W.clans.indexOf(c), 1); kill(W, c);
    if (!t.clans.length) { if (t.confed) leaveConfed(W, t, null); W.tribes.splice(W.tribes.indexOf(t), 1); kill(W, t); logEvent(W, `The ${t.name} are no more.`, null, 'big'); }
  }
  function relocate(W, c, rmin, rmax) {
    let best = null, bs = -Infinity;
    for (let k = 0; k < 30; k++) {
      const ang = W.rand() * Math.PI * 2, r = rmin + W.rand() * (rmax - rmin);
      const x = clamp(c.x + Math.cos(ang) * r, 3000, WORLD - 3000), y = clamp(c.y + Math.sin(ang) * r, 3000, WORLD - 3000);
      if (!sameIsland(W, c, x, y) || !inHome(c.tribe, x, y)) continue;
      const sc = siteScore(W, x, y, c); if (sc > bs) { bs = sc; best = [x, y]; }
    }
    if (best) { wear(W, c.x, c.y, best[0], best[1], c.people.length / 25); c.tx = best[0]; c.ty = best[1]; }
  }
  // ---------- migration: a whole tribe moves to new lands ----------
  function crowdAt(W, x, y, t, r = 70000) { let n = 0; for (const o of nearClans(W, x, y, r)) if (o.tribe !== t) n += o.people.length * (1 - Math.hypot(o.x - x, o.y - y) / r); return n; }
  function findHomeland(W, t, from, dmin, dmax) {
    const ref = t.clans[0]; let best = null, bs = -Infinity; const memo = new Map();
    for (let k = 0; k < 70; k++) {
      const a = W.rand() * 6.283, r = dmin + W.rand() * (dmax - dmin), x = clamp(from[0] + Math.cos(a) * r, 8000, WORLD - 8000), y = clamp(from[1] + Math.sin(a) * r, 8000, WORLD - 8000);
      const i = cellAt(x, y); if (!W.land[i] || W.lake[i] || !canReach(W, ref, x, y) || landBlocked(W, t, i, memo)) continue;
      // good food, and as few other people as possible within ~70 km
      const sc = (t.stage === 3 ? farmSuit(W, x, y) * 1e7 : potential(W, x, y, 0.7, t.boats)) / (1 + crowdAt(W, x, y, t) / 40) * (1 - r / 600000);
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    return best;
  }
  function migrateTribe(W, t, dmin, dmax, why, destGiven) {
    const from = t.home || tribeCenter(t), dest = destGiven || findHomeland(W, t, from, dmin, dmax);
    if (!dest) return false;
    // the house's own tribe does not move without its say
    const P = W.player, pc = P && !P.over && P.head.alive && P.head.clan;
    if (!destGiven && pc && pc.tribe === t) {
      const km = Math.round(Math.hypot(dest[0] - from[0], dest[1] - from[1]) / 1000), dir = compass(dest[0] - from[0], dest[1] - from[1]), lead = t.headman === P.head;
      t.migrating = W.week; // don't ask again for a while
      pushEvent(W, { type: 'tribemove', key: t.id, title: `The ${t.name} want to move on`, text: `${why ? why[0].toUpperCase() + why.slice(1) + '. ' : ''}The clans of the ${t.name} talk of leaving for new lands ${km} km ${dir}: ${describePlace(W, dest[0], dest[1], pc)}.${(P.claims || []).length && km > 150 ? ' <b>The sources your house works would be left far behind.</b>' : ''}`, data: { t, dest, why },
        options: lead ? [{ label: 'Lead them there', hint: `${km} km ${dir}` }, { label: 'Stay where we are', hint: 'As leader, you keep the tribe here' }] : [{ label: 'Go with the tribe', hint: `${km} km ${dir}` }, { label: 'Stay behind', hint: t.clans.length > 1 ? `Your clan stays and becomes a people of its own` : 'Your clan stays' }] });
      return true;
    }
    t.home = dest; t.migrating = W.week;
    for (const c of t.clans) { const a = W.rand() * 6.283, r = 6000 + W.rand() * 22000; let x = clamp(dest[0] + Math.cos(a) * r, 3000, WORLD - 3000), y = clamp(dest[1] + Math.sin(a) * r, 3000, WORLD - 3000); if (!W.land[cellAt(x, y)] || landBlocked(W, t, cellAt(x, y), null)) { x = dest[0]; y = dest[1]; } wear(W, c.x, c.y, x, y, c.people.length / 15); c.tx = x; c.ty = y; c.atGathering = false; }
    const km = Math.round(Math.hypot(dest[0] - from[0], dest[1] - from[1]) / 1000), dir = compass(dest[0] - from[0], dest[1] - from[1]);
    const crossed = t.clans[0] && W.comp[cellAt(dest[0], dest[1])] !== W.comp[cellAt(t.clans[0].x, t.clans[0].y)];
    if (crossed) { why = `crossing the sea in their canoes${why ? '; ' + why : ''}`; for (const c of t.clans) c.sailing = W.week; }
    const bi = BIOMES[W.biome[cellAt(dest[0], dest[1])]].name.toLowerCase();
    note(W, t, `Migrated ${km} km ${dir} to new lands in the ${bi}${why ? ` (${why})` : ''}.`);
    logEvent(W, `The ${t.name} migrate ${km} km ${dir} into the ${bi}${why ? ` — ${why}` : ''}.`, t, 'big');
    return true;
  }
  const compass = (dx, dy) => ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  function tribeHomeUpdate(W, t) {
    if (!t.clans.length) return; const c = tribeCenter(t);
    if (!t.home) t.home = c;
    else if (!t.migrating || W.week - t.migrating > 52 * 3) { t.home[0] += (c[0] - t.home[0]) * 0.15; t.home[1] += (c[1] - t.home[1]) * 0.15; }
    // crowded and hungry while open land lies elsewhere? move on rather than fight
    const fed = t.clans.reduce((a, k) => a + k.cond, 0) / t.clans.length, crowd = crowdAt(W, t.home[0], t.home[1], t);
    if ((fed < 0.8 || crowd > tribeSize(t) * 0.8) && (!t.migrating || W.week - t.migrating > 52 * 15) && W.rand() < 0.3 && !t.confed) {
      const dest = findHomeland(W, t, t.home, 70000, 220000);
      if (dest && crowdAt(W, dest[0], dest[1], t) < crowd * 0.4) migrateTribe(W, t, 70000, 220000, fed < 0.8 ? 'hunger drove them on' : 'their lands had grown crowded');
    }
  }

  // ---------- tribe fission & merger ----------
  const TRIBE_SUFFIX = ['i', 'a', 'ans', 'u', 'ek', 'ori'];
  function tribeFission(W, t) {
    if (t.clans.length < 2) return;
    let worst = null, wv = 0;
    for (const a of t.clans) for (const b of t.clans) if (a.id < b.id) { const o = opinion(a, b); if (o < wv) { wv = o; worst = [a, b]; } }
    const size = tribeSize(t), tooBig = size > tribeMax(t) || t.clans.length > (t.stage === 3 ? 26 : 22), conflict = wv < -50;
    if (!tooBig && !(conflict && W.rand() < 0.12)) return;
    let A, B;
    if (conflict) [A, B] = worst;
    else { // peaceful: the camps farthest apart drift into separate tribes
      let md = -1; for (const a of t.clans) for (const b of t.clans) if (a.id < b.id) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > md) { md = d; A = a; B = b; } }
    }
    const leave = [B];
    for (const c of t.clans) if (c !== A && c !== B) {
      const sb = opinion(c, B) - Math.hypot(c.x - B.x, c.y - B.y) / 1500, sa = opinion(c, A) - Math.hypot(c.x - A.x, c.y - A.y) / 1500;
      if (sb > sa) leave.push(c);
    }
    if (leave.length === t.clans.length) return;
    { const P = W.player, pc = P && !P.over && P.head.alive && P.head.clan; // the house is not carried off by a split it had no say in
      if (pc && leave.includes(pc)) { const stay = t.clans.filter(c => !leave.includes(c)); leave.length = 0; leave.push(...stay); } }
    const nLeave = leave.reduce((s, c) => s + c.people.length, 0);
    if (nLeave < 20 || size - nLeave < 20) return; // too few to stand alone as a tribe
    const nt = newTribe(W, null, (t.hue + (W.rand() < 0.5 ? -1 : 1) * (40 + W.rand() * 60) + 360) % 360, t.id);
    for (const c of leave) { t.clans.splice(t.clans.indexOf(c), 1); nt.clans.push(c); c.tribe = nt; }
    let between = 0; for (const a of leave) for (const b of t.clans) between += opinion(a, b); between /= leave.length * t.clans.length;
    affect(W, nt, t, conflict ? between : 30, conflict ? `Broke apart after strife between the ${A.name} and ${B.name} clans` : 'Parted peacefully as kin', conflict ? 20 : 0);
    for (const [oid, r] of t.rel) { const o = W.ents.get(oid); if (o && o !== nt && o.kind === 'tribe') { const r2 = rel(nt, o); r2.op = r.op * 0.7; } }
    updateLeaders(W, t, true); updateLeaders(W, nt, true);
    const why = conflict ? `after strife between the ${A.name} and ${B.name} clans` : `as the ${t.name} grew too many to hold together`;
    note(W, t, `The ${leave.map(c => c.name).join(', ')} ${leave.length === 1 ? 'clan' : 'clans'} left and became the ${nt.name}, ${why}.`);
    note(W, nt, `Formed when the ${leave.map(c => c.name).join(', ')} ${leave.length === 1 ? 'clan' : 'clans'} broke from the ${t.name}, ${why}.`);
    logEvent(W, `A new tribe: the ${nt.name} (${tribeSize(nt)} people) break away from the ${t.name} ${why}.`, nt, 'big');
    { const P = W.player; if (P && !P.over && P.head.clan && P.head.clan.tribe === t) houseNote(W, `The ${leave.map(c => c.name).join(', ')} ${leave.length === 1 ? 'clan' : 'clans'} left the ${t.name} to become the ${nt.name}.`); }
    nt.home = tribeCenter(nt); t.home = tribeCenter(t); nt.dom = t.dom; nt.stage = t.stage; nt.boats = t.boats; nt.metal = t.metal; nt.bronzeAge = t.bronzeAge; nt.flintW = t.flintW; nt.copperArms = t.copperArms; nt.culture = Object.assign({}, t.culture);
    if (nt.stage === 3) for (const c of nt.clans) if (c.live !== 'fishing') { c.settled = false; c.toSettle = false; c.founding = false; }
    // with land to spare, the newcomers move off to lands of their own instead of crowding their old kin
    if (!migrateTribe(W, nt, nt.stage === 3 ? 40000 : 80000, nt.stage === 3 ? 150000 : 250000, conflict ? 'to put distance between them and their old foes' : 'seeking lands of their own')) relocateTribeNear(W, nt);
  }
  function relocateTribeNear(W, t) { for (const c of t.clans) relocate(W, c, 10000, 30000); }
  // sizes of tribes, counted once in a monthly pass (nothing but a merge changes them while that pass runs; a merge clears the list)
  let TSZ = { W: null, w: -1, m: new Map() };
  const tribeSizeMonth = (W, o) => { if (TSZ.W !== W || TSZ.w !== W.week) TSZ = { W, w: W.week, m: new Map() }; let v = TSZ.m.get(o); if (v === undefined) { v = tribeSize(o); TSZ.m.set(o, v); } return v; };
  function tribeMerge(W, t) {
    if (!t.alive || tribeSizeMonth(W, t) > 35) return;
    let best = null, bs = 25;
    const ts = tribeSizeMonth(W, t);
    for (const o of W.tribes) {
      if (o === t || W.week - Math.max(t.founded, o.founded) < 52 * 10 || tribeSizeMonth(W, o) + ts > tribeMax(o)) continue; // cheap tests first; sizes are counted once a month
      const near = t.clans.some(a => o.clans.some(b => Math.hypot(a.x - b.x, a.y - b.y) < 50000)); if (!near) continue;
      const s = opinion(t, o) + (isAllied(t, o) ? 15 : 0); if (s > bs) { bs = s; best = o; }
    }
    if (!best || W.rand() > 0.25) return;
    const PW = W.player, mineT = PW && !PW.over && PW.head.alive && PW.head.clan && PW.head.clan.tribe === t, rdT = mineT && t.clans.some(c => c.raidedAt && W.week - c.raidedAt < 52 * 15), joinedUs = PW && !PW.over && PW.head.alive && PW.head.clan && PW.head.clan.tribe === best;
    TSZ.w = -1;
    for (const c of t.clans) { c.tribe = best; best.clans.push(c); }
    if (t.confed) leaveConfed(W, t, null);
    note(W, best, `The ${t.name} (${tribeSize(t)} people) joined us.`);
    { const P = W.player; if (joinedUs) { houseNote(W, `The ${t.name}, too few to stand alone, joined our people, the ${best.name}.`); notice(W, `The ${t.name} join us`, `The ${t.name} were too few to stand alone. Their clans are now clans of the ${best.name}, with yours.`); } if (mineT) { houseNote(W, `Our people, the ${t.name}, were too few to stand alone${rdT ? ', worn down by raids,' : ''} and joined the ${best.name}.`); notice(W, `We join the ${best.name}`, `The ${t.name} were too few to stand alone${rdT ? ', worn down by raids' : ''}. Your clan is now one of the clans of the ${best.name}: it follows their leader (${best.headman ? best.headman.name : 'chosen by the clans'}) and lives by their ways and speech.`); } }
    logEvent(W, `The ${t.name}, too few to stand alone, join the ${best.name}.`, best, 'big');
    t.clans = []; W.tribes.splice(W.tribes.indexOf(t), 1); kill(W, t);
  }

  // ---------- encounters between tribes ----------
  // Once a tribe passes ~100 people it has the young men, the ambitious leaders and the wants (slaves, grain,
  // treasure) to send war parties against weaker, unfriendly neighbours — not just tit-for-tat feuding.
  function warParties(W) {
    const rand = W.rand, P = W.player;
    for (const t of W.tribes) {
      const size = tribeSize(t); if (size < 100 || t.clans.length < 2) continue;
      const hm = t.headman, temper = hm ? hm.temper : 0.5;
      const p = 0.012 * Math.min(3, size / 100) * (0.6 + temper) * (t.stage === 3 ? 1.3 : 1) * (isMatri(t) ? 0.5 : 1) * (faithOf(t) === 'sky' ? 1.4 : 1) * (faithOf(t) === 'spirits' && !isMatri(t) ? 1.1 : 1);
      if (rand() > p) continue;
      // the raiding clan: the headman's, or the strongest; the player's own clan only goes when the player leads it
      const pc = P && !P.over && P.head.alive && P.head.clan;
      const leadC = (hm && hm.clan && hm.clan !== pc ? hm.clan : null) || t.clans.filter(c => c !== pc).sort((a, b) => warriorsOf(b) - warriorsOf(a))[0];
      if (!leadC || warriorsOf(leadC) < 3) continue;
      let best = null, bs = 0;
      for (const o of nearClans(W, leadC.x, leadC.y, 80000)) {
        if (o.tribe === t || isAllied(t, o.tribe) || sameConfed(t, o.tribe) || peaceHeld(W, t, o.tribe) || !canReach(W, leadC, o.x, o.y)) continue;
        const op = opinion(t, o.tribe); if (op > 10) continue;
        const weak = tribeSize(t) / Math.max(10, tribeSize(o.tribe)), wealth = o.store + o.grain / 2 + (o.goods.amber + o.goods.bronze + o.goods.metal + o.goods.furs) * 1e6;
        const sc = (weak > 1 ? Math.min(3, weak) : weak * 0.3) * (1 + wealth / 2e7) * (1 + o.people.length / 30) * (1 - op / 60) / (1 + Math.hypot(o.x - leadC.x, o.y - leadC.y) / 40000) / walls(o) * (und(t, o.tribe) < 0.2 ? 1.25 : 1);
        if (sc > bs) { bs = sc; best = o; }
      }
      if (!best) continue;
      // friendly clans of the tribe send their young men along
      const party = warMuster(W, t, leadC, pc);
      logEvent(W, `⚔ A war party of the ${t.name} (${party} warriors under ${leadC.head ? leadC.head.name : 'the ' + leadC.name}) sets out against the ${best.name} ${best.settled ? 'village' : 'camp'} of the ${best.tribe.name}.`, t, 'blood');
      raid(W, leadC, leadC, best, false, party / Math.max(1, warriorsOf(leadC)));
      W.nWarParties = (W.nWarParties || 0) + 1;
    }
  }
  const warriorsOf = c => { let n = 0; for (const q of c.people) if (q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50) n++; return n; };
  function interTribe(W) {
    const rand = W.rand;
    for (const a of W.clans) for (const b of nearClans(W, a.x, a.y, 2 * FORAGE_R)) {
      if (a.id >= b.id || a.tribe === b.tribe) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const overlap = 1 - d / (2 * FORAGE_R); if (rand() > 0.25 * overlap) continue;
      const ta = a.tribe, tb = b.tribe, op = opinion(ta, tb), allied = isAllied(ta, tb);
      const hunger = Math.max(0, 0.9 - a.cond) + Math.max(0, 0.9 - b.cond);
      const temper = ((a.head ? a.head.temper : .5) + (b.head ? b.head.temper : .5)) / 2;
      // covet: one side holds stone or amber the other lacks
      const covet = ((a.tool < 0.6 && b.goods.flint + b.goods.axe > 0) || (b.tool < 0.6 && a.goods.flint + a.goods.axe > 0) ? 0.08 : 0) + (a.grain > needsWeek(a) * 6 || b.grain > needsWeek(b) * 6 ? 0.06 : 0);
      if (!allied && !sameConfed(ta, tb) && !peaceHeld(W, ta, tb) && op < -35 && rand() < 0.04 + temper * 0.08 + hunger * 0.3 + covet) { raid(W, hunger > 0 && a.cond < b.cond ? a : rand() < 0.5 ? a : b, a, b); continue; }
      if (!allied && hunger > 0.3 && rand() < 0.4) {
        affect(W, ta, tb, -7, `Clash over foraging grounds between the ${a.name} and ${b.name} camps`);
        affect(W, a, b, -7, 'Trespass on foraging grounds');
        if (rand() < 0.25) logEvent(W, `Tension: the ${ta.name} and ${tb.name} quarrel over shrinking foraging grounds.`, ta, 'conflict');
        continue;
      }
      const kind = rand();
      if (op > -20 && kind < 0.45 * (0.45 + 0.55 * und(ta, tb))) exchange(W, a, b);
      else if (kind < 0.7) { affect(W, ta, tb, 4, rand() < 0.15 ? `Gift exchange between the ${a.name} and ${b.name} camps` : null); affect(W, a, b, 4); }
      else if (kind < 0.85) { affect(W, ta, tb, 7, `Joint hunt by the ${a.name} and ${b.name}`); affect(W, a, b, 6); note(W, a, `Hunted together with the ${b.name} clan of the ${tb.name}.`); }
      else affect(W, ta, tb, 3);
    }
    for (const a of W.tribes) for (const b of W.tribes) {
      if (a.id >= b.id) continue; const r = a.rel.get(b.id); if (!r) continue;
      const o = r.op - r.grudge, war = a.atWar.has(b.id);
      if (war && sameConfed(a, b)) { a.atWar.delete(b.id); b.atWar.delete(a.id); continue; } // one realm: no war between its tribes
      if (!war && o < -60 && !sameConfed(a, b) && !(r.peaceUntil > W.week)) { a.atWar.add(b.id); b.atWar.add(a.id); if (r.allied) breakAlliance(W, a, b, 'war'); note(W, a, `War with the ${b.name}.`); note(W, b, `War with the ${a.name}.`); logEvent(W, `War breaks out between the ${a.name} and the ${b.name}.`, a, 'blood'); }
      if (war && o > -25) { a.atWar.delete(b.id); b.atWar.delete(a.id); r.grudge *= 0.4; if (!(r.peaceUntil > W.week + 5 * 52)) { r.peaceUntil = W.week + 5 * 52; r.peaceFrom = W.week; delete r.peaceBy; } W.nPeaces = (W.nPeaces || 0) + 1; affect(W, a, b, 10, 'Peace made'); note(W, a, `Peace with the ${b.name}.`); note(W, b, `Peace with the ${a.name}.`); logEvent(W, `The ${a.name} and the ${b.name} make peace.`, a, 'peace'); }
      if (r.allied && o < 0) breakAlliance(W, a, b, 'quarrels');
    }
  }
  // ---- the odds of a raid, from the very numbers the raid rolls with ----
  // the raid wins when ratio * (0.6 + 0.8 u) > 1, u being a roll between 0 and 1 (see raidCore)
  const raidDefBonus = def => def.settled && faithOf(def.tribe) === 'ancestors' ? 1.25 : 1;
  function raidRatio(W, att, def, defBonus, attBonus) {
    const wA = att.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50).length, wD = def.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 55).length;
    return wA * (attBonus || 1) * vigor(att) / Math.max(1, wD * vigor(def) * (defBonus || 1) * walls(def) * (def.ward && def.ward.kind === 'war' && def.ward.until > W.week ? 1.25 : 1));
  }
  const raidBonus = (c, h, F) => F.n / Math.max(1, myWarriors(c)) * (hasTrait(h, 'bold') ? 1.15 : 1); // the party's weight against the clan's own men, as the deed sets it
  function raidChance(W, att, def, bonus) {
    if (att.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50).length < 2) return 0;
    const r = raidRatio(W, att, def, raidDefBonus(def), bonus == null ? undefined : bonus * 1.25); // a raid comes as a surprise: the party counts a quarter more
    return r <= 0 ? 0 : clamp(1 - (1 / r - 0.6) / 0.8, 0, 1);
  }
  // the defenders' odds when a war party comes to the player's camp and the card says "stand and fight": the card rolls with this same bonus (no surprise there)
  const CARD_DEF = 1.35;
  function driveOffChance(W, att, def, attBonus, ratio0) {
    if (warriorsOf(att) < 2) return 1; // raidCore does nothing with fewer than two attackers
    const r = ratio0 != null ? ratio0 : raidRatio(W, att, def, CARD_DEF, attBonus);
    return 1 - (r <= 0 ? 0 : clamp(1 - (1 / r - 0.6) / 0.8, 0, 1));
  }
  // a peace between two tribes binds both sides until r.peaceUntil
  const peaceHeld = (W, a, b) => { const r = a && b && a.rel.get(b.id); return !!(r && r.peaceUntil > W.week); };
  const clearWrong = (a, b) => { if (a.wrong && a.wrong.c === b.id) delete a.wrong; if (b.wrong && b.wrong.c === a.id) delete b.wrong; };
  // the word for what another people is to us, for text: only a sworn alliance is "allies"
  function bondWord(W, t, o) {
    const r = t.rel.get(o.id); if (r && r.allied) return 'your allies';
    if (!sameConfed(t, o)) return '';
    const cf = t.confed, st = x => { const m = cf.members.get(x.id); return m ? m.status : ''; };
    if (cf.capital === t && st(o) === 'subject') return 'your subjects';
    if (cf.capital === o && st(t) === 'subject') return 'your overlords';
    return 'of your realm';
  }
  // the war party a clan can muster: its own men and half of those of friendly clans of its tribe within 60 km (the player's clan never joins)
  function warMuster(W, t, leadC, pc) {
    let party = warriorsOf(leadC); for (const o of t.clans) if (o !== leadC && o !== pc && opinion(o, leadC) > -10 && Math.hypot(o.x - leadC.x, o.y - leadC.y) < 60000) party += Math.floor(warriorsOf(o) * 0.5);
    return party;
  }
  // a clan that was raided remembers it for six years and may strike back (monthly, from the same place as warParties)
  function paybackMonth(W) {
    const P = W.player, pc = P && !P.over && P.head.alive && P.head.clan;
    for (const c of [...W.clans]) {
      const wr = c.wrong; if (!wr || !c.alive) continue;
      const A = W.ents.get(wr.c);
      if (W.week - wr.w > 52 * 6 || !A || !A.alive || A.kind !== 'clan' || !A.people.length || A.tribe === c.tribe || isAllied(c.tribe, A.tribe) || peaceHeld(W, c.tribe, A.tribe)) { delete c.wrong; continue; }
      if (c === pc) continue; // the house's own clan strikes back only when the house leads it out
      if (!canReach(W, c, A.x, A.y) || Math.hypot(A.x - c.x, A.y - c.y) > Math.max(80000, (wr.km + 20) * 1000) || warriorsOf(c) < 2) continue;
      const party = warMuster(W, c.tribe, c, pc), ratio = party / Math.max(1, warriorsOf(A));
      const p = 0.06 * clamp((ratio - 0.4) / 0.8, 0, 1);
      if (p <= 0 || W.rand() >= p) continue;
      delete c.wrong; W.nPaybacks = (W.nPaybacks || 0) + 1;
      logEvent(W, `The ${c.name} clan (${c.tribe.name}) strike back at the ${A.name} clan, who raided them.`, c.tribe, 'blood');
      raid(W, c, c, A, false, party / Math.max(1, warriorsOf(c)), { w: wr.w });
    }
  }
  // a people the house knows of that the raid deed does not offer, and why not
  function seenYear(W) { const P = W.player; if (!P || P.over || !P.known || !P.head.alive || !P.head.clan) return; for (const o of W.tribes) if (o.alive && o.clans.some(x => knows(W, x.x, x.y))) o.seenW = W.week; }
  function raidWhyNot(W, c, offered) {
    const t = c.tribe, out = [];
    for (const o of W.tribes) {
      if (o === t || !o.alive || !o.clans.length || offered.has(o) || !knowsTribe(W, o)) continue;
      const near = o.clans.filter(x => Math.hypot(x.x - c.x, x.y - c.y) <= 160000), cen = tribeCenter(o), km = Math.round(Math.hypot(cen[0] - c.x, cen[1] - c.y) / 1000);
      if (km > 260) continue;
      let why;
      if (peaceHeld(W, t, o)) { const r = t.rel.get(o.id); const py = Math.floor((r.peaceFrom != null ? r.peaceFrom : r.peaceUntil - 520) / 52) + 1, py2 = Math.floor(r.peaceUntil / 52) + 1; why = `${r.peaceBy === 'player' ? 'you made peace with them' : 'the two peoples have been at peace'}${r.peaceBy === 'player' ? ' in' : ' since'} year ${py} (it holds until year ${py2})`; }
      else if (isAllied(t, o)) why = 'they are ' + bondWord(W, t, o);
      else if (!near.length) why = `their nearest camp is ${Math.round(Math.min(...o.clans.map(x => Math.hypot(x.x - c.x, x.y - c.y))) / 1000)} km away, past the 160 km a raiding party can go`;
      else if (!near.some(x => knows(W, x.x, x.y))) { const y = o.seenW == null ? null : Math.floor((W.week - o.seenW) / 52); why = y == null ? 'no camp of theirs has been seen' : y < 1 ? 'no camp of theirs lies on land you have seen' : `no camp of theirs has been seen for ${y} year${y === 1 ? '' : 's'}`; }
      else if (!near.some(x => x.people.length > 3)) why = 'too few of them are left';
      else why = 'there are richer camps to strike first';
      out.push({ o, km, dir: compass(cen[0] - c.x, cen[1] - c.y), why });
    }
    return out.sort((a, b) => a.km - b.km).slice(0, 5);
  }
  function raid(W, att, a, b, byPlayer, attBonus, payback) {
    const def = att === a ? b : a;
    const P = W.player;
    if (!byPlayer && P && !P.over && P.head.alive && P.head.clan === def && att.tribe !== def.tribe) {
      pushEvent(W, { type: 'raided', key: att.id + ':' + W.week, title: attBonus > 1.4 ? 'A war party!' : 'Raiders!', text: `Warriors of the ${att.name} clan (${att.tribe.name}) are coming for the ${def.name} ${def.settled ? 'village' : 'camp'} — ${Math.round(att.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50).length * (attBonus || 1))} of them against your ${def.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 55).length}.${payback ? ` They come to pay back the raid of year ${Math.floor(payback.w / 52) + 1}.` : ''} What will ${P.head.name} do?`, data: { att, def, attBonus, ratio: raidRatio(W, att, def, CARD_DEF, attBonus), payback: payback ? { w: payback.w } : null },
        options: [{ label: 'Stand and fight', hint: `About ${Math.round(driveOffChance(W, att, def, attBonus, raidRatio(W, att, def, CARD_DEF, attBonus)) * 100)}% to drive them off. Defenders fight hard on their own ground` }, { label: 'Pay them off', hint: 'Costs half the food, 30% of the grain and one of amber, salt, an axe, metal or bronze, if you have any. No blood spilled' }, { label: def.settled ? 'Hide the people in the marshes' : 'Flee with what we can carry', hint: `Costs 80% of the food and 60% of the grain${def.settled ? '' : '; the camp moves 15 to 35 km'}. Lives are saved` }] });
      return;
    }
    return raidCore(W, att, a, b, def.settled && faithOf(def.tribe) === 'ancestors' ? 1.25 : 1, attBonus == null ? undefined : attBonus * 1.25, !!payback); // surprise; the dead guard their villages
  }
  function raidCore(W, att, a, b, defBonus, attBonus, payback, ratio0) {
    const def = att === a ? b : a, rand = W.rand; att.tribe.warYr = (att.tribe.warYr || 0) + 1; def.tribe.warYr = (def.tribe.warYr || 0) + 0.5; W.nRaids = (W.nRaids || 0) + 1;
    const warriorsA = att.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50), warriorsD = def.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 55);
    if (warriorsA.length < 2) return;
    const fallen = warriorsD.filter(q => !kinOfHouse(W, q, att)); // the house's own blood among the defenders is not killed by its own kin's raid
    const strength = (ratio0 != null ? ratio0 : raidRatio(W, att, def, defBonus, attBonus)) * (0.6 + rand() * 0.8);
    let killedD = 0, killedA = 0;
    const big = attBonus != null && !payback; // a war party led by the player: more men, more blood
    const kd = strength > 1 ? 1 + (rand() < 0.4 ? 1 : 0) + (big ? Math.floor(rand() * Math.min(3 + attBonus, strength * 1.5)) : 0) : rand() < 0.4 ? 1 : 0, ka = strength < 1 ? 1 + (big && rand() < 0.5 ? 1 : 0) : rand() < 0.25 ? 1 : 0;
    for (let k = 0; k < kd && fallen.length; k++) { const v = fallen.splice(Math.floor(rand() * fallen.length), 1)[0]; die(W, def, v, `killed in a raid by the ${att.tribe.name}`, att); killedD++; def.yr.killed++; }
    const PH = W.player && !W.player.over && W.player.head; if (big && PH) { const i = warriorsA.indexOf(PH); if (i >= 0) warriorsA.splice(i, 1); } // the leader's own risk is rolled separately
    for (let k = 0; k < ka && warriorsA.length; k++) { const v = warriorsA.splice(Math.floor(rand() * warriorsA.length), 1)[0]; die(W, att, v, `killed raiding the ${def.tribe.name}`, def); killedA++; att.yr.killed++; }
    def.people = def.people.filter(q => q.alive); att.people = att.people.filter(q => q.alive);
    const wl = walls(def) > 1 ? 0.6 : 1, loot = strength > 1 ? (def.store * (big ? 0.8 : 0.5) + (big ? needsWeek(def) * 0.3 : 0)) * wl : 0; def.store -= Math.min(def.store, loot); att.store += loot;
    if (strength > 1 && def.grain > 0) { const gl = def.grain * (def.works && def.works.gran ? 0.22 : 0.4) * wl; def.grain -= gl; att.grain += gl; }
    let tookGoods = '';
    if (strength > 1) for (const g of ['bronze', 'metal', 'amber', 'axe', 'flint']) if (def.goods[g] > 0) { const k = Math.ceil(def.goods[g] / 2); def.goods[g] -= k; att.goods[g] += k; tookGoods = tookGoods || g; }
    if (strength > 1 && def.tool > att.tool) att.tool = Math.max(att.tool, def.tool * 0.9);
    if (att.goods.flint > 0 && rand() < 0.5) att.goods.flint--;
    if (strength > 1) treasureTaken(W, att, def);
    let captives = [];
    if (strength > 1) { const nCap = big ? Math.floor(rand() * Math.min(2 + attBonus, 1 + strength)) : rand() < 0.5 ? 1 + (rand() < 0.3 ? 1 : 0) : 0; if (nCap) captives = takeCaptives(W, att, def, wl < 1 ? Math.ceil(nCap / 2) : nCap, (W.player && !W.player.over && big && W.player.head.clan === att) ? W.player.head : att.head || att.people.find(q => q.sex === 'M' && !q.slave && q.age >= 20)); }
    for (const al of W.tribes) if (al !== def.tribe && al !== att.tribe && isAllied(al, def.tribe)) { const bw = bondWord(W, al, def.tribe); affect(W, al, att.tribe, -12, bw === 'your allies' ? `Raided our allies the ${def.tribe.name}` : bw === 'your subjects' ? `Raided our subjects the ${def.tribe.name}` : bw === 'your overlords' ? `Raided our overlords the ${def.tribe.name}` : `Raided the ${def.tribe.name} of our realm`, 5); }
    affect(W, def.tribe, att.tribe, -20, `The ${att.name} clan raided the ${def.name} camp`, Math.min(60, 12 + killedD * 8));
    affect(W, def, att, -25, `Raid on our camp${killedD ? `, ${killedD} killed` : ''}`, Math.min(60, 15 + killedD * 8));
    if (killedA) affect(W, att, def, -10, `Lost ${killedA} warrior${killedA > 1 ? 's' : ''} raiding the ${def.name}`, killedA * 20);
    note(W, def, `Raided by the ${att.name} clan of the ${att.tribe.name}${killedD ? ` — ${killedD} killed` : ''}${loot ? ', food stolen' : ''}${tookGoods ? `, ${tookGoods} taken` : ''}.`);
    note(W, att, `Raided the ${def.name} camp of the ${def.tribe.name}${killedD ? `, killing ${killedD}` : ''}${killedA ? `, losing ${killedA}` : ''}${captives.filter(q => q.slave).length ? `, carrying off ${captives.filter(q => q.slave).length} captive${captives.filter(q => q.slave).length > 1 ? 's' : ''}` : ''}.`);
    credit(att.head, 'raids'); logEvent(W, `Raid! The ${att.name} clan (${att.tribe.name}) strikes the ${def.name} camp (${def.tribe.name})${killedD + killedA ? ` — ${killedD + killedA} dead` : ''}.`, def, 'blood');
    def.raidedAt = W.week;
    if (!payback) def.wrong = { c: att.id, t: att.tribe.id, w: W.week, km: Math.round(Math.hypot(att.x - def.x, att.y - def.y) / 1000) }; // a wrong to pay back; a payback itself leaves the score even
    if (strength > 1.5 && def.works && def.works.pal && rand() < 0.5) { delete def.works.pal; note(W, def, `Our palisade was burned by the ${att.tribe.name}.`); logEvent(W, `The palisade of ${def.village || 'the ' + def.name + ' village'} is burned by the ${att.tribe.name}.`, def, 'blood'); if (W.player && !W.player.over && W.player.head.clan === def) houseNote(W, `Our palisade was burned by the ${att.tribe.name}.`); }
    if (!def.settled) relocate(W, def, 12000, 30000);
    return { win: strength > 1, killedD, killedA, loot, tookGoods, captives };
  }

  // ---------- camp movement ----------
  const HOME_R = 45000;
  const inHome = (t, x, y, extra = 0) => !t.home || Math.hypot(x - t.home[0], y - t.home[1]) <= (t.homeR || HOME_R) + extra; // the range grows with the people (see claimsYear)
  function decideMove(W, c) {
    if (Math.hypot(c.tx - c.x, c.ty - c.y) > 1) return;
    if (W.gathering && c.tribe.site && c.atGathering) return;
    if (c.settled || c.toSettle) return;
    if (c.holdUntil && W.week < c.holdUntil) { // the head chose this camp: stay, unless the land cannot feed the clan
      if (c.supply > 1.0 || c.cond > 0.8) return;
      c.holdUntil = 0; const P = W.player; if (P && !P.over && P.head.alive && P.head.clan === c) { houseNote(W, 'The land around the camp could not feed us, and the clan moved on.'); notice(W, 'The camp moves on', 'The land around the camp you chose could not feed the clan, so it has gone looking for better ground.'); }
    }
    if (c.tribe.stage === 2 && c.grain > needsWeek(c) * 4 && W.rand() < 0.7) return; // tending fields keeps cultivators close
    // drifted outside the tribal lands (e.g. after a raid): head back toward home
    if (!inHome(c.tribe, c.x, c.y, 15000)) { const h = c.tribe.home, a = W.rand() * 6.283, r = W.rand() * 25000; c.tx = clamp(h[0] + Math.cos(a) * r, 3000, WORLD - 3000); c.ty = clamp(h[1] + Math.sin(a) * r, 3000, WORLD - 3000); if (!W.land[cellAt(c.tx, c.ty)]) { c.tx = h[0]; c.ty = h[1]; } return; }
    if (c.supply > 2.6 || W.week - (c.lastMove || -99) < 8) return;
    const cur = siteScore(W, c.x, c.y, c);
    let best = null, bs = cur;
    for (let k = 0; k < 12; k++) {
      const ang = W.rand() * Math.PI * 2, r = 6000 + W.rand() * 34000;
      const x = clamp(c.x + Math.cos(ang) * r, 3000, WORLD - 3000), y = clamp(c.y + Math.sin(ang) * r, 3000, WORLD - 3000);
      if (!sameIsland(W, c, x, y) || !inHome(c.tribe, x, y)) continue;
      let kin = 0; for (const o of c.tribe.clans) if (o !== c) kin += Math.max(0, 1 - Math.hypot(o.x - x, o.y - y) / 70000);
      const sc = siteScore(W, x, y, c) * (1 - r / 150000) * (c.tribe.clans.length > 1 ? 0.85 + 0.15 * Math.min(1, kin) : 1);
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    if (best && bs > cur * 1.35) { wear(W, c.x, c.y, best[0], best[1], c.people.length / 25); c.tx = best[0]; c.ty = best[1]; c.lastMove = W.week; }
  }

  // ---------- alliances ----------
  const isAllied = (a, b) => { const r = a && b && a.rel.get(b.id); return !!(r && r.allied) || sameConfed(a, b); };
  const sameConfed = (a, b) => !!(a && b && a.confed && a.confed === b.confed);
  function formAlliance(W, a, b, site) {
    const r = rel(a, b); r.allied = true; r.hist.push({ w: W.week, t: `Alliance sworn${site ? ` at ${site.name}` : ''}` });
    note(W, a, `Swore alliance with the ${b.name}${site ? ` at ${site.name}` : ''}.`); note(W, b, `Swore alliance with the ${a.name}${site ? ` at ${site.name}` : ''}.`);
    logEvent(W, `Alliance: the ${a.name} and the ${b.name} — bound by ${r.kin} marriages, ${r.feasts} shared feasts and ${r.trade} exchanges — swear friendship${site ? ` at ${site.name}` : ''}.`, a, 'gather');
  }
  function breakAlliance(W, a, b, why) {
    const r = rel(a, b); if (!r.allied) return; r.allied = false; r.hist.push({ w: W.week, t: `Alliance broken (${why})` });
    note(W, a, `Alliance with the ${b.name} broken (${why}).`); note(W, b, `Alliance with the ${a.name} broken (${why}).`);
    logEvent(W, `The alliance between the ${a.name} and the ${b.name} breaks down (${why}).`, a, 'conflict');
  }
  const tribeCenter = t => { let x = 0, y = 0, n = 0; for (const c of t.clans) { x += c.x * c.people.length; y += c.y * c.people.length; n += c.people.length; } return n ? [x / n, y / n] : [0, 0]; };

  // ---------- stone, amber & other goods ----------
  const GOOD_NAMES = { flint: 'Flint', axe: 'Polished greenstone axes', amber: 'Amber', ochre: 'Red ochre', salt: 'Salt', furs: 'Furs', shells: 'Shell beads', copper: 'Copper ore', tin: 'Tin', metal: 'Copper tools & ornaments', bronze: 'Bronze', clay: 'Potter\'s clay', pots: 'Pottery', leather: 'Leather', art: 'Carvings & ornaments' };
  const GIFTABLE = ['bronze', 'metal', 'amber', 'art', 'axe', 'salt', 'ochre', 'furs', 'shells', 'pots', 'leather'], TRADEABLE = ['flint', 'amber', 'salt', 'ochre', 'furs', 'shells', 'axe', 'metal', 'pots', 'leather', 'art', 'clay'];
  const foodDays = c => Math.round((c.store + c.grain) / Math.max(1, needsWeek(c) / 7));
  function acquireGoods(W, c) {
    if (c.goods.bronze > 0) { c.tool = Math.max(c.tool, 1.2); if (W.rand() < 0.03) c.goods.bronze--; } else if (c.goods.metal > 0) { c.tool = Math.max(c.tool, 1.05); if (W.rand() < 0.04) c.goods.metal--; }
    // everyday wealth: prime furs from a good hunting season, beads from shell middens
    if (!c.goods.furs && c.goods.furs !== 0) c.goods.furs = 0; if (!c.goods.shells && c.goods.shells !== 0) c.goods.shells = 0;
    if (c.supply > 1.2 && W.rand() < 0.12 && c.live !== 'farm') c.goods.furs = Math.min(5, c.goods.furs + 1);
    if (c.coastal && (c.shellfish || 0) > 0 && W.rand() < 0.1) c.goods.shells = Math.min(5, c.goods.shells + 1);
    for (const d of W.deposits) {
      if (Math.abs(d.x - c.x) > FORAGE_R + 6000 || Math.abs(d.y - c.y) > FORAGE_R + 6000 || Math.hypot(d.x - c.x, d.y - c.y) > FORAGE_R + 6000) continue;
      const g = c.goods;
      if (d.type === 'flint') { c.tool = Math.max(c.tool, d.q); g.flint = Math.min(8, g.flint + 2); }
      else if (d.type === 'axe') { c.tool = Math.max(c.tool, 0.95 * d.q); g.axe = Math.min(4, g.axe + 1); }
      else if (d.type === 'grain' || d.type === 'whale') continue;
      else g[d.type] = Math.min(d.type === 'tin' ? 4 : 6, g[d.type] + 1);
      const t = c.tribe;
      if (!t.seen.has(d.type)) {
        t.seen.add(d.type); t.sources = t.sources || new Set(); t.sources.add(d.type);
        note(W, t, `The ${c.name} clan found ${DEPOSITS[d.type].name.toLowerCase()} (${d.note}).`);
        logEvent(W, `The ${t.name} discover ${DEPOSITS[d.type].name.toLowerCase()} — ${d.note}.`, t, 'trade');
      }
    }
  }
  // special trips to a known quarry within a few days' walk, if no hostile camp guards it
  function procure(W, c) {
    if (c.tool > 0.6 || c.atGathering) return;
    let best = null, bd = 65000;
    for (const d of W.deposits) {
      if (d.type !== 'flint' && d.type !== 'axe') continue;
      const dist = Math.hypot(d.x - c.x, d.y - c.y); if (dist > bd || !canReach(W, c, d.x, d.y)) continue;
      if (nearClans(W, d.x, d.y, 15000).some(o => o.tribe !== c.tribe && opinion(c.tribe, o.tribe) < -20)) continue;
      bd = dist; best = d;
    }
    if (!best || W.rand() > 0.5) return;
    c.tool = Math.max(c.tool, best.q * 0.95); c.goods[best.type] = Math.min(best.type === 'axe' ? 4 : 8, c.goods[best.type] + 1); wear(W, c.x, c.y, best.x, best.y, 1.5);
    const t = c.tribe;
    if (!t.seen.has(best.type)) { t.seen.add(best.type); note(W, t, `The ${c.name} clan began making trips to the ${best.note} ${Math.round(bd / 1000)} km away.`); logEvent(W, `The ${t.name} begin fetching ${DEPOSITS[best.type].name.toLowerCase()} from a source ${Math.round(bd / 1000)} km away.`, t, 'trade'); }
  }
  function exchange(W, a, b) {
    const did = [];
    for (const [g, h] of [[a, b], [b, a]]) {
      for (const st of ['flint', 'axe']) if (g.goods[st] > 0 && h.tool < 0.78) { g.goods[st]--; h.tool = Math.max(h.tool, st === 'axe' ? 0.85 : 0.88); did.push([g, h, st]); break; }
      for (const pg of ['amber', 'ochre', 'salt', 'furs', 'shells', 'metal', 'bronze', 'pots', 'leather', 'art']) if (g.goods[pg] > 1 && h.goods[pg] === 0 && W.rand() < 0.5) { g.goods[pg]--; h.goods[pg]++; did.push([g, h, pg]); }
      if (h.settled && h.tribe.metal >= 0.2) for (const ore of ['copper', 'tin']) if (g.goods[ore] > 0 && h.goods[ore] < 2 && !(g.settled && g.tribe.metal >= 0.2)) { g.goods[ore]--; h.goods[ore]++; did.push([g, h, ore]); }
    }
    if (!did.length) return false;
    wear(W, a.x, a.y, b.x, b.y, 0.8);
    const ta = a.tribe, tb = b.tribe, what = [...new Set(did.map(d => d[2]))].map(k => GOOD_NAMES[k].toLowerCase()).join(' and ');
    affect(W, a, b, 5, `Traded ${what}`);
    if (ta !== tb) { affect(W, ta, tb, 6, `The ${a.name} and ${b.name} traded ${what}`); rel(ta, tb).trade++; W.gatherTrades = (W.gatherTrades || 0) + 1; }
    for (const [g, h, good] of did) {
      if (h.tribe.seen.has(good)) continue; h.tribe.seen.add(good);
      note(W, h.tribe, `${GOOD_NAMES[good]} first reached us through the ${g.name} clan${g.tribe !== h.tribe ? ` of the ${g.tribe.name}` : ''}.`);
      if (g.tribe !== h.tribe) logEvent(W, `${GOOD_NAMES[good]} reaches the ${h.tribe.name} for the first time, traded from the ${g.tribe.name}.`, h.tribe, 'trade');
    }
    return true;
  }

  // ---------- seasonal gatherings ----------
  const GATHER_PLAN = 27, GATHER_END = 34;   // clans converge in late July, disperse by late August
  function siteName(W, x, y, t) {
    const i = cellAt(x, y), nm = makeName(W.rand, 2);
    if (W.isRiver[i]) return `${nm} Ford`; if (W.coast[i]) return `${nm} Strand`; if (W.groveType[i] === 1) return `${nm} Hazelwood`;
    if (W.groveType[i] === 2) return `${nm} Appleyard`; if (W.elev[i] > 300) return `${nm} Height`; return `${nm} Meadow`;
  }
  function foundSite(W, t, cx, cy) {
    let best = null, bs = -Infinity; const ref = t.clans[0];
    for (let k = 0; k < 40; k++) {
      const ang = W.rand() * Math.PI * 2, r = W.rand() * 30000, x = clamp(cx + Math.cos(ang) * r, 3000, WORLD - 3000), y = clamp(cy + Math.sin(ang) * r, 3000, WORLD - 3000);
      const i = cellAt(x, y); if (!W.land[i] || W.lake[i] || !sameIsland(W, ref, x, y)) continue;
      const sc = potential(W, x, y, 0.8) * (W.isRiver[i] ? 1.3 : 1) * (1 - r / 90000);
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    if (!best) best = [ref.x, ref.y];
    const st = ent(W, 'site', { name: siteName(W, best[0], best[1], t), x: best[0], y: best[1], users: new Map(), prestige: 1, gatherings: 0, founder: t.id, lastYear: null, lastTribes: [] });
    W.sites.push(st); note(W, st, `First chosen as a gathering place by the ${t.name}.`); note(W, t, `Chose ${st.name} as our summer gathering place.`);
    return st;
  }
  function planGatherings(W) {
    for (const t of W.tribes) {
      if (!t.clans.length) continue;
      const [cx, cy] = tribeCenter(t); let best = null, bs = -Infinity;
      for (const st of W.sites) {
        const d = Math.hypot(st.x - cx, st.y - cy); if (d > 90000 || !sameIsland(W, t.clans[0], st.x, st.y)) continue;
        let friend = 0, n = 0, enemy = false;
        for (const [tid] of st.users) { const o = W.ents.get(tid); if (!o || o === t) continue; const op = opinion(t, o); if (op < -30 || t.atWar.has(o.id)) enemy = true; friend += op + (isAllied(t, o) ? 30 : 0); n++; }
        if (enemy) continue;
        const crowd = st.lastTribes ? st.lastTribes.filter(id => id !== t.id).length : 0;
        if (crowd >= 4 && !st.users.has(t.id)) continue;
        const sc = st.prestige * 3 + (n ? friend / n * 0.3 : 0) - d / 4000 + (st.users.has(t.id) ? 12 : 0);
        if (sc > bs) { bs = sc; best = st; }
      }
      if (!best) best = foundSite(W, t, cx, cy);
      t.site = best;
      for (const c of t.clans) {
        if (c.settled || Math.hypot(c.x - best.x, c.y - best.y) > 60000) continue;
        c.home = [c.x, c.y]; c.atGathering = true;
        const a = W.rand() * Math.PI * 2, r = 1500 + W.rand() * 4000;
        c.tx = best.x + Math.cos(a) * r; c.ty = best.y + Math.sin(a) * r; wear(W, c.x, c.y, c.tx, c.ty, c.people.length / 20);
      }
    }
  }
  // a lone small band has no one left at home it may marry: its young people go looking, far if they must, and bring a spouse back
  function seekSpouses(W, t) {
    if (t.clans.length !== 1) return; const c = t.clans[0]; if (freeCount(c) >= 26) return; const rand = W.rand;
    const singles = c.people.filter(q => !q.slave && !q.reserved && !q.spouse && q.age >= 17 && q.age < 42); if (!singles.length) return;
    const pool = []; for (const o of nearClans(W, c.x, c.y, 160000)) { if (o.tribe === t || opinion(t, o.tribe) < -15 || freeCount(o) < 16) continue; for (const q of o.people) if (!q.slave && !q.reserved && !q.spouse && !q.dyn && q !== o.head && q.age >= 16 && q.age < 42 && !o.people.some(k => k.mother === q && k.age < 13)) pool.push(q); }
    const P = W.player, mine = P && !P.over && P.head.alive && P.head.clan === c;
    for (const s of singles) { if (s.spouse || rand() > 0.3) continue;
      const cand = pool.filter(q => q.sex !== s.sex && !q.spouse && q.clan !== c && !closeKin(s, q) && Math.abs(q.age - s.age) < 12); if (!cand.length) continue;
      const q = pick(cand, rand), m = s.sex === 'M' ? s : q, w = s.sex === 'M' ? q : s, oc = q.clan;
      oc.people.splice(oc.people.indexOf(q), 1); c.people.push(q); q.clan = c; // the newcomer joins the seeker's people, whatever the custom
      marry(W, m, w); affect(W, t, oc.tribe, 8, `${q.name} of the ${oc.tribe.name} married into the ${t.name}`); rel(t, oc.tribe).kin++;
      if (mine) houseNote(W, `${s.name} went looking for a ${s.sex === 'M' ? 'wife' : 'husband'} and came home with ${q.name} of the ${oc.tribe.name}.`); }
  }
  function marriagesAt(W, clans) {
    const rand = W.rand, men = [];
    for (const c of clans) for (const q of c.people) if (!q.reserved && !q.slave && q.sex === 'M' && q.age >= 19 && q.age < 65 && (!q.spouse || ((q.wives || 1) < 2 && q.age >= 25))) men.push(q);
    for (const c of clans) for (const w of c.people) {
      if (w.reserved || w.slave || w.sex !== 'F' || w.spouse || w.age < 16 || w.age > 45 || rand() > 0.45) continue;
      let best = null, bs = -Infinity;
      for (const m of men) {
        if ((m.spouse && (m.wives || 1) >= 2) || closeKin(m, w) || (m.spouse && W.player && W.player.head === w) || m.clan === w.clan && rand() < 0.7) continue;
        const diff = Math.max(0, Math.abs((m.age - 4) - w.age) - 4), poly = m.spouse ? -28 + prestige(m) * 15 : 0;
        const sc = poly - diff * 2 + opinion(m.clan, w.clan) * 0.4 + opinion(m.clan.tribe, w.clan.tribe) * 0.2 + (m.clan.tribe === w.clan.tribe ? 6 : isAllied(m.clan.tribe, w.clan.tribe) ? 6 : 0) + m.clan.goods.amber * 1.5 + rand() * 14 - (m.clan.tribe === w.clan.tribe ? 0 : (1 - und(m.clan.tribe, w.clan.tribe)) * 8);
        if (sc > bs) { bs = sc; best = m; }
      }
      if (best && bs > -40) marry(W, best, w);
    }
  }
  function resolveGathering(W, st) {
    const clans = W.clans.filter(c => c.atGathering && c.tribe.site === st && Math.hypot(c.x - st.x, c.y - st.y) < 15000);
    if (!clans.length) return;
    const tribes = [...new Set(clans.map(c => c.tribe))], people = clans.reduce((s, c) => s + c.people.length, 0);
    W.gatherMarriages = 0; W.gatherTrades = 0;
    marriagesAt(W, clans);
    for (let k = 0; k < clans.length * 2; k++) { const a = pick(clans, W.rand), b = pick(clans, W.rand); if (a !== b) exchange(W, a, b); }
    // feasting & shared ritual bind the clans and tribes together
    for (const a of clans) for (const b of clans) if (a.id < b.id) affect(W, a, b, a.tribe === b.tribe ? 4 : 3);
    const formed = [], fights = [];
    for (const a of tribes) for (const b of tribes) {
      if (a.id >= b.id) continue;
      const r = rel(a, b); r.feasts++; affect(W, a, b, 8, `Feasted together at ${st.name}`);
      const op = r.op - r.grudge;
      if (op < 10 && W.rand() < 0.15) {
        const fa = SIM_famOf(pick(clans.filter(c => c.tribe === a), W.rand), W.rand), fb = SIM_famOf(pick(clans.filter(c => c.tribe === b), W.rand), W.rand);
        if (fa && fb) { fight(W, fa, fb, `a brawl at the ${st.name} gathering`); fights.push(`${a.name}–${b.name}`); }
      }
      const bond = r.kin * 4 + r.feasts * 2.5 + r.trade * 1.5;
      const nA = t => W.tribes.filter(o => o !== t && isAllied(t, o)).length;
      if (!r.allied && r.kin >= 3 && bond >= 60 && r.op - r.grudge > 45 && und(a, b) >= 0.2 && nA(a) < 3 && nA(b) < 3) { formAlliance(W, a, b, st); formed.push(`${a.name} & ${b.name}`); }
    }
    st.gatherings++; st.prestige = st.prestige * 0.92 + 0.3 + people / 100 + (tribes.length - 1) * 0.8;
    for (const t of tribes) st.users.set(t.id, (st.users.get(t.id) || 0) + 1);
    st.lastYear = Math.floor(W.week / 52) + 1; st.lastTribes = tribes.map(t => t.id); st.lastPeople = people;
    const summary = `${tribes.map(t => 'the ' + t.name).join(', ')} gathered — ${people} people; ${W.gatherMarriages} marriages, ${W.gatherTrades} exchanges between tribes${formed.length ? `; alliance sworn (${formed.join(', ')})` : ''}${fights.length ? `; fighting broke out` : ''}.`;
    note(W, st, summary[0].toUpperCase() + summary.slice(1));
    for (const t of tribes) if (tribes.length > 1) note(W, t, `Gathered at ${st.name} with ${tribes.filter(o => o !== t).map(o => 'the ' + o.name).join(', ')}.`);
    const combo = tribes.map(t => t.id).sort().join(',');
    st.combos = st.combos || new Set();
    if (tribes.length > 1 && !formed.length && (!st.combos.has(combo) || W.gatherMarriages >= 3 || fights.length)) logEvent(W, `${st.combos.has(combo) ? 'Gathering' : 'First great gathering'} at ${st.name}: ${tribes.map(t => 'the ' + t.name).join(', ')} — ${people} people, ${W.gatherMarriages} marriage${W.gatherMarriages === 1 ? '' : 's'}${W.gatherTrades ? `, ${W.gatherTrades} exchanges` : ''}${fights.length ? ', and a brawl' : ''}.`, st, 'gather');
    else if (tribes.length === 1 && st.gatherings === 1) logEvent(W, `The ${tribes[0].name} hold their first summer gathering at ${st.name}.`, st, 'gather');
    st.combos.add(combo);
  }
  const SIM_famOf = (c, rnd) => { if (!c) return null; const f = familiesOf(c); return f.length ? f[Math.floor(rnd() * f.length)] : null; };
  function endGatherings(W) {
    const P = W.player;
    if (P && !P.over && P.head.alive && P.head.clan && P.head.clan.atGathering && W.week - P.lastGather > 52 * 4 && W.rand() < 0.6) {
      const c = P.head.clan, st = c.tribe.site, clans = W.clans.filter(o => o.atGathering && o.tribe.site === st && Math.hypot(o.x - st.x, o.y - st.y) < 15000);
      const tribes = [...new Set(clans.map(o => o.tribe))], treasure = GIFTABLE.reduce((s, g) => s + (c.goods[g] || 0), 0), days = foodDays(c);
      const theirs = {}; for (const o of clans) if (o !== c) for (const g of TRADEABLE) if ((o.goods[g] || 0) > 1 && !(c.goods[g] > 0)) theirs[g] = 1;
      const bring = GIFTABLE.concat(['flint', 'copper', 'tin']).filter(g => c.goods[g] > 0).map(g => `${c.goods[g]} ${GOOD_NAMES[g].toLowerCase()}`);
      if (st && clans.length > 1 && (treasure || Object.keys(theirs).length || days > 14)) { P.lastGather = W.week; pushEvent(W, { type: 'gathering', key: W.week, title: `The gathering at ${st.name}`, text: `${clans.length} clan${clans.length === 1 ? '' : 's'} of ${tribes.map(o => 'the ' + o.name).join(', ')}, ${clans.reduce((s, o) => s + o.people.length, 0)} people in all, have come together at ${st.name}.<br><br><b>Your clan brings:</b> ${bring.length ? bring.join(', ') : 'no treasures'} · food for ${days} days${c.grain > 0 ? ' (incl. grain)' : ''}.<br><b>Others offer:</b> ${Object.keys(theirs).map(g => GOOD_NAMES[g].toLowerCase()).join(', ') || 'nothing you lack'}.<br><br>How will ${P.head.name} make ${P.head.sex === 'F' ? 'her' : 'his'} mark?`, data: { st, clans }, options: [treasure ? { label: 'Give lavish gifts', hint: `Spend ${treasure > 3 ? 'up to 3 of your ' + treasure + ' treasures' : treasure === 1 ? 'your one valuable thing' : 'your ' + treasure + ' valuables'} and a feast — goodwill and renown` } : { label: 'Feast the other clans', hint: days > 10 ? 'Spend food on a feast — goodwill, modest renown' : 'You have little to give — small goodwill' }, { label: 'Trade', hint: Object.keys(theirs).length ? `Swap surplus goods${days > 14 ? ' and food' : ''} for what you lack` : 'Little on offer that you lack' }, { label: 'Keep to ourselves' }] }); }
    }
    for (const st of W.sites) { fogGathering(W, st, W.clans.filter(o => o.atGathering && o.tribe.site === st)); resolveGathering(W, st); }
    for (const c of W.clans) if (c.atGathering) { c.atGathering = false; if (c.home && sameIsland(W, c, c.home[0], c.home[1])) { c.tx = c.home[0]; c.ty = c.home[1]; } }
  }

  // =====================================================================
  //  GRAIN & FARMING
  //  Wild emmer/barley grows in one river valley. Tribes that keep harvesting it slowly domesticate it:
  //  stage 1 wild harvest → 2 sowing & tending → 3 farming villages. Farmers store grain, settle for good,
  //  wean babies earlier (shorter birth spacing → population boom), but a cereal diet and crowded villages
  //  leave them shorter, sicker and weaker in a fight. Fields exhaust their soil over decades.
  // =====================================================================
  const STAGES = ['Foragers', 'Wild-grain gatherers', 'Cultivators', 'Farmers'];
  function crowdDisease(c, age) { const n = c.people.length; return 0.0005 + 0.001 * Math.min(2, n / 50) + (age < 5 ? 0.006 * Math.min(1, n / 60) : 0); }
  // weapons: fire-hardened wood → flint-tipped spears & arrows → copper daggers & axes → bronze
  const arms = c => 1 + 0.2 * (c.tribe.flintW || 0) * (c.goods.flint > 0 || c.tool >= 0.8 ? 1 : 0.5) + 0.18 * Math.min(1, (c.goods.metal || 0) / 2) + 0.4 * Math.min(1, (c.goods.bronze || 0) / 2) + 0.08 * Math.min(1, (c.goods.leather || 0) / 3);
  const weaponsName = t => { const cl = t.clans; if (cl.some(c => c.goods.bronze > 0)) return 'Bronze swords & spears'; if (cl.some(c => c.goods.metal > 0)) return 'Copper daggers & axes'; return (t.flintW || 0) >= 0.5 ? 'Flint spears & arrows' : (t.flintW || 0) > 0.1 ? 'Wooden spears, some tipped with flint' : 'Wooden spears & clubs'; };
  const vigor = c => (1 - 0.32 * clamp(c.cereal || 0, 0, 1)) * arms(c) * (faithOf(c.tribe) === 'sky' ? 1.06 : 1) * (blessed(c.tribe) && c.tribe.blessing.type === 'sky' ? 1.1 : 1);
  const tribeVigor = t => { let s = 0, n = 0; for (const c of t.clans) { s += vigor(c) * c.people.length; n += c.people.length; } return n ? s / n : 1; };
  const statureCm = c => [Math.round(168 - 10 * clamp(c.cereal, 0, 1)), Math.round(156 - 8 * clamp(c.cereal, 0, 1))];
  function farmSuit(W, x, y) {
    const i = cellAt(x, y); if (!W.land[i] || W.lake[i] || W.biome[i] === 2) return 0;
    return clamp(W.nit[i] / 60, 0.3, 1.2) * clamp(W.depth[i] / 0.8, 0.3, 1) * (W.slope[i] < 0.1 ? 1 : 0.5) * (W.T0[i] > 7.5 ? 1 : 0.55) * (W.isRiver[i] || W.hand[i] < 5 ? 1.25 : 0.85) * (W.om[i] > 9 ? 0.5 : 1);
  }
  function villageSite(W, c, rmin, rmax, force, strict) {
    let best = null, bs = -Infinity; const memo = new Map();
    for (let k = 0; k < 30; k++) {
      const a = W.rand() * 6.283, r = rmin + W.rand() * (rmax - rmin), x = clamp(c.x + Math.cos(a) * r, 3000, WORLD - 3000), y = clamp(c.y + Math.sin(a) * r, 3000, WORLD - 3000);
      if (!sameIsland(W, c, x, y) || (c.tribe.home && Math.hypot(x - c.tribe.home[0], y - c.tribe.home[1]) > (c.tribe.homeR || HOME_R) + 25000)) continue;
      if (!force && landBlocked(W, c.tribe, cellAt(x, y), memo)) continue; // ground another people holds, unless we are much stronger and at odds with them
      if (landKeepOff(W, c, cellAt(x, y)) || (strict && foreignHeld(W, c.tribe, cellAt(x, y)))) continue; // a clan sent away keeps off the land of those who sent it; the player's elders keep off all held ground
      const sc = villageScore(W, c, x, y);
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    return best;
  }
  const VILLAGE_END = ['-by', 'stead', 'ham', 'thorp', 'wick', 'ton'];
  function settleClan(W, c, force, strict) {
    const v = villageSite(W, c, 0, 20000, force, strict) || (!force && (landBlocked(W, c.tribe, cellAt(c.x, c.y), null) || landKeepOff(W, c, cellAt(c.x, c.y))) || (strict && foreignHeld(W, c.tribe, cellAt(c.x, c.y))) ? null : [c.x, c.y]);
    if (!v) return; // no ground that is free: the clan stays a camp for now
    c.tx = v[0]; c.ty = v[1]; c.toSettle = true; return true;
  }
  const grainDeposits = W => W.deposits.filter(d => d.type === 'grain');
  const GRAIN_TRIP = 50000; // a few days' walk: near enough to go and reap the wild grain each summer
  function grainAccess(W, c) { let g = 0; forageCells(W, c.x, c.y, (i, e) => { if (W.wildGrain[i] > 0) g = Math.max(g, W.wildGrain[i] * Math.min(1, e * 2)); }); return g; }
  function farmingMonth(W) {
    const gd = grainDeposits(W), wk4 = Math.floor((W.week % 52) / 4);
    for (const t of W.tribes) {
      if (!t.clans.length) continue;
      const users = t.clans.filter(c => grainAccess(W, c) > 0.04);
      const resisting = t.resistUntil && W.week < t.resistUntil;
      if (t.stage < 3) {
        const trip = users.length >= 3 ? [] : t.clans.filter(c => !users.includes(c) && gd.some(d => Math.hypot(d.x - c.x, d.y - c.y) < GRAIN_TRIP && canReach(W, c, d.x, d.y)));
        if (trip.length && !t.grainTrip) { t.grainTrip = true; t.seen.add('grain'); note(W, t, 'Began walking to the wild grain each summer to reap it.'); logEvent(W, `🌾 The ${t.name} begin walking to the valley of the wild grain each summer to reap it.`, t, 'grain');
          const P = W.player; if (P && !P.over && P.head.alive && P.head.clan && P.head.clan.tribe === t) { houseNote(W, 'Our people began walking to the wild grain each summer.'); notice(W, 'Summer walks to the wild grain', 'The wild grain is a few days away, so your people go there each summer to reap it. That slowly teaches them to sow. Camping beside it is faster: use Move camp.'); } }
        if (wk4 === 7) for (const c of trip) { c.grain += needsWeek(c) * 1.5; if (W.rand() < 0.3) wear(W, c.x, c.y, gd[0].x, gd[0].y, 1); } // the reapers come home with sacks of grain
        if ((users.length || trip.length) && !resisting) t.dom += 0.0002 * Math.min(3, users.length + trip.length * 0.6) * (faithOf(t) === 'mother' ? 1.3 : 1);
        else if (t.dom >= 0.3 && !resisting) t.dom += 0.0001 * Math.min(3, t.clans.length);
        else t.dom = Math.max(0, t.dom - 0.00004);
        // learning from farming neighbours (kin, trade, gatherings)
        if (t.dom < 0.3 && !resisting && W.week % 52 === 0) {
          const h = t.home || tribeCenter(t);
          if (farmSuit(W, h[0], h[1]) > 0.7) for (const o of W.tribes) {
            if (o === t || o.stage < 3) continue; const r = t.rel.get(o.id);
            if ((r && (r.kin >= 2 || r.op > 25)) && o.clans.some(a => t.clans.some(b => Math.hypot(a.x - b.x, a.y - b.y) < 50000))) { t.dom = Math.max(t.dom, 0.25); t.learnedFrom = o.name; }
          }
        }
      }
      const prev = t.stage;
      t.stage = t.dom >= 0.55 ? 3 : t.dom >= 0.3 ? 2 : t.dom >= 0.05 ? 1 : 0;
      if (t.stage > prev) {
        const where = gd.length ? `in the valley of the wild grain` : '';
        if (t.stage === 1) { note(W, t, `Began gathering the wild grain ${where}.`); logEvent(W, `🌾 The ${t.name} begin harvesting wild emmer and barley ${where}.`, t, 'grain'); }
        if (t.stage === 2) { note(W, t, `Began sowing grain — the first tended fields.`); logEvent(W, `🌾 The ${t.name} begin to sow and tend grain${t.learnedFrom ? `, learned from the ${t.learnedFrom}` : ''} — the first fields.`, t, 'grain'); }
        if (t.stage === 3) { note(W, t, `Settled for good in farming villages.`); logEvent(W, `🏠 The ${t.name} give up the wandering life and settle in permanent farming villages.`, t, 'grain'); }
        if (W.player && W.player.head && W.player.head.clan && W.player.head.clan.tribe === t && t.stage >= 2) pushGrainEvent(W, t);
      }
      if (t.stage === 3) for (const c of t.clans) {
        if (c.live === 'fishing' || c.founding) continue; // a daughter clan raises its village in foundingMonth
        if (!c.settled && !c.toSettle) settleClan(W, c);
        if (c.toSettle && Math.hypot(c.tx - c.x, c.ty - c.y) < 1000) {
          c.toSettle = false; c.settled = true; c.live = 'farm'; c.settledAt = c.settledAt || W.week; c.soil = 1; c.village = villageAt(W, c, c.tribe, 'vill');
          note(W, c, `Built the village of ${c.village}.`);
        }
      }
    }
  }
  // =====================================================================
  //  NEW FIELDS: a settled farming clan clears ground beyond its home fields (c.fieldLv steps, c.plots cells).
  //  Cleared ground wears the soil more slowly and gives a little more grain, shows on the map, and drives the game
  //  (and in time the great beasts) away. The world's own clans do it by themselves.
  // =====================================================================
  const FIELD_STEPS = ['the home fields', 'fields out to the first stream', 'fields to the second stream', 'fields to the foot of the hills', 'fields from one side of the valley to the other'];
  const FIELD_GAP = 52 * 4, FIELD_WEAR = 0.25, FIELD_CROP = 0.06, FIELD_REACH = 25000;
  const fieldLv = c => c.fieldLv || 0;
  const fieldMetal = c => (c.goods && (c.goods.bronze > 0 || c.goods.metal > 0)) ? 1 : 0;
  const fieldCap = c => 1 + Math.floor(freeCount(c) / 25) + fieldMetal(c);
  const fieldFarmer = c => !!(c.alive !== false && c.settled && c.live === 'farm' && c.tribe && c.tribe.stage >= 2);
  const fieldStep = lv => FIELD_STEPS[Math.min(lv, FIELD_STEPS.length - 1)];
  // cells beside the cleared ground that suit a field: gentle, low, dry, not a village
  function fieldCandidates(W, c) {
    const ci = cellAt(c.x, c.y), x0 = ci % N, y0 = (ci / N) | 0, own = c.plots && c.plots.length ? c.plots : [ci], ownSet = new Set(own), vil = new Set(), out = [];
    for (const o of W.clans) if (o !== c && o.alive && o.settled) vil.add(cellAt(o.x, o.y));
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = x0 + dx, y = y0 + dy; if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1 || Math.hypot(dx, dy) > 4.3) continue;
      const j = y * N + x; if (ownSet.has(j) || !W.land[j] || W.lake[j] || vil.has(j) || W.biome[j] === 2 || W.slope[j] > 0.1 || W.elev[j] > 650) continue;
      if (farmSuit(W, (x + 0.5) * CELL, (y + 0.5) * CELL) < 0.25) continue;
      let adj = 99; for (const p of own) adj = Math.min(adj, Math.hypot((p % N) - x, ((p / N) | 0) - y)); if (adj > 1.5) continue;
      out.push({ j, sc: W.slope[j] * 10 + Math.max(0, W.elev[j] - W.elev[ci]) / 120 + adj * 0.25 + Math.hypot(dx, dy) * 0.1 + (W.farm[j] > 0.25 ? 0.6 : 0) - (W.isRiver[j] ? 0.15 : 0) });
    }
    return out.sort((a, b) => a.sc - b.sc);
  }
  function addPlots(W, c, n) {
    if (!c.plots || !c.plots.length) c.plots = [cellAt(c.x, c.y)]; let got = 0;
    for (; got < n; got++) { const cand = fieldCandidates(W, c).slice(0, 4); if (!cand.length) break; let best = null, bs = Infinity; for (const k of cand) { const s = k.sc + W.rand() * 0.5; if (s < bs) { bs = s; best = k; } } c.plots.push(best.j); }
    if (got) W.farmVer = (W.farmVer || 0) + 1;
    return got;
  }
  // the map's field wash is kept up in every plot, weaker toward the outer ones
  function spreadFarm(W, c) {
    const P = c.plots; if (!P || P.length < 2 || P[0] !== cellAt(c.x, c.y)) return; const v = Math.max(W.farm[P[0]], 0.3);
    for (let k = 1; k < P.length; k++) { const j = P[k], tgt = v * Math.max(0.3, 0.85 - 0.08 * (k - 1)); if (W.land[j] && W.farm[j] < tgt) W.farm[j] = tgt; }
  }
  // a village that has moved starts again one step lower, with new plots about the new houses
  function syncFields(W, c, ci) {
    if (!c.plots || !c.plots.length) { c.plots = [ci]; return; }
    if (c.plots[0] === ci || Math.hypot(c.tx - c.x, c.ty - c.y) > 1500) return;
    const lv = Math.max(0, fieldLv(c) - 1); c.fieldLv = lv; c.plots = [ci]; c.fieldFor = freeCount(c);
    for (let k = 0; k < lv; k++) addPlots(W, c, 2 + (W.rand() < 0.5 ? 1 : 0));
    W.farmVer = (W.farmVer || 0) + 1;
  }
  // raises c.fieldLv by one; returns the number of cells added (0 = nothing done)
  function clearFields(W, c) {
    const n = addPlots(W, c, 2 + (W.rand() < 0.5 ? 1 : 0)); if (!n) return 0;
    c.fieldLv = fieldLv(c) + 1; c.fieldAt = W.week; c.fieldFor = freeCount(c); eatStore(c, needsWeek(c) * 3);
    note(W, c, `Cleared new ground: ${fieldStep(c.fieldLv)}.`); spreadFarm(W, c); return n;
  }
  function fieldInfo(W, c) {
    const lv = fieldLv(c), cap = fieldCap(c), n = c.plots ? c.plots.length : 1;
    return { lv, cap, n, step: fieldStep(lv), farm: fieldFarmer(c), wear: 1 / (1 + FIELD_WEAR * lv), crop: 1 + FIELD_CROP * lv };
  }
  function fieldWhy(W, c, h) {
    const lv = fieldLv(c), free = freeCount(c), m = fieldMetal(c), cd = W.player && W.player.cool || {}, since = cd.fields != null ? W.week - cd.fields : 1e9;
    if (!c.settled) return 'A camp moves with the seasons and clears no fields; only a village that farms does';
    if (c.live !== 'farm') return c.live === 'fishing' ? 'This village lives from the sea; only a farming village clears fields' : 'This village does not farm; only a farming village clears fields';
    if (!(c.tribe && c.tribe.stage >= 2)) return 'Your people do not yet sow grain; fields come with the sowing';
    if (!fieldFarmer(c)) return 'Only a farming village can clear new fields';
    if (c.head && c.head !== h) return `${c.head.name} leads the clan, and clears new fields when the clan is short of grain`;
    if (since < FIELD_GAP) { const y = Math.ceil((FIELD_GAP - since) / 52); return `The last clearing was not long ago (${y} yr${y === 1 ? '' : 's'})`; }
    if (lv >= fieldCap(c)) return `Too few hands for more land: ${free} people hold ${fieldStep(lv)}; the next step needs ${25 * (lv - m)} people${m ? '' : ' (or copper tools)'}`;
    if (fieldCandidates(W, c).length < 2) return 'No good ground is left to clear around the village';
    if (c.store + (c.grain || 0) < needsWeek(c) * 3) return 'The clan has less than three weeks of food in store, and the clearing eats that much';
    return '';
  }
  // ---- the world's own clans ----
  function fieldsYear(W) {
    const P = W.player, pc = P && !P.over && P.head.alive ? P.head.clan : null, byDeed = pc && pc.head === P.head ? pc : null;
    W.fieldsMade = W.fieldsMade || 0;
    for (const c of W.clans) {
      if (!c.alive || !fieldFarmer(c) || c === byDeed) continue;
      if (c.fieldFor == null) { c.fieldFor = freeCount(c); continue; }
      if (fieldLv(c) >= fieldCap(c) || W.week - (c.fieldAt != null ? c.fieldAt : -1e9) < FIELD_GAP || c.store + (c.grain || 0) < needsWeek(c) * 3) continue;
      const short = c.cond < 0.9 || (c.grain || 0) < needsWeek(c) * 10, grown = freeCount(c) >= c.fieldFor * 1.25 + 2;
      if (!(short || grown) || W.rand() >= 0.1) continue;
      if (clearFields(W, c)) { W.fieldsMade++; if (c === pc) houseNote(W, `${c.head ? c.head.name : 'The clan'} had new fields cleared for ${c.village || 'the village'}: ${fieldStep(c.fieldLv)}.`); driveBeasts(W, c); }
    }
    thinYear(W);
  }
  // ---- the game thins where many live and where fields lie ----
  const THIN_R = 5, THIN_D0 = 60; // reach in cells (25 km), and the crowd (people, weighted by nearness) at which the game's ceiling is halved
  function thinYear(W) {
    const n = N * N, dens = W._dens && W._dens.length === n ? W._dens : (W._dens = new Float32Array(n)), near = W._near && W._near.length === n ? W._near : (W._near = new Uint8Array(n));
    dens.fill(0); near.fill(0);
    for (const c of W.clans) {
      if (!c.alive) continue; const ci = cellAt(c.x, c.y), x0 = ci % N, y0 = (ci / N) | 0, w = c.settled && c.live === 'farm' ? freeCount(c) : 0; // only farming villages thin the game: foragers and fishers live on it, and the balance with them must hold
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) { const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue; const d = Math.hypot(dx, dy); if (d > 5.01) continue; const j = y * N + x; if (c.settled && d <= 4.01) near[j] = 1; if (w && d < THIN_R) dens[j] += w * (1 - d / THIN_R); }
    }
    const cells = [], fs = []; let held = 0, nv = 0;
    for (const i of W.landIdx) {
      if (W._held && W._held[i]) held++; if (near[i]) nv++;
      if (W.lake[i]) continue; const f = Math.max(0.2, (1 / (1 + dens[i] / THIN_D0)) * (1 - 0.6 * Math.min(1, W.farm[i] * 1.5))); if (f < 0.97) { cells.push(i); fs.push(f); }
    }
    W._capCells = Int32Array.from(cells); W._capF = Float32Array.from(fs);
    const fd = W._capFD && W._capFD.length === n ? W._capFD : (W._capFD = new Float32Array(n)); fd.fill(1); for (let k = 0; k < cells.length; k++) fd[cells[k]] = fs[k]; // the same, dense, for a quick lookup (not saved)
    const L = W.landIdx.length || 1; W._fill = clamp(1.3 * held / L + 2 * nv / L, 0, 0.92);
  }
  // the ceiling that game grows back toward (geo.js: 3 + 28 grass + 22 shrub + 10 forest, by warmth) is lowered in those cells; once a month
  function gameCap(W) {
    keffAll(W);
    const L = W._capCells, F = W._capF; if (!L) return;
    for (let k = 0; k < L.length; k++) { const i = L[k], K = (3 + 28 * W.grass[i] + 22 * W.shrub[i] + 10 * W.forest[i]) * clamp((W.T0[i] + W.amp[i]) / 16, 0.4, 1) * F[k]; if (W.game[i] > K) W.game[i] = Math.max(0.05, K); }
  }
  // the game each cell can carry (the ceiling geo.js grows it back toward, lowered where farms and crowds thin it); made once a month for every cell (not saved)
  function keffAll(W) {
    const n = N * N, F = W._capFD && W._capFD.length === n ? W._capFD : null, K = W._gKe && W._gKe.length === n ? W._gKe : (W._gKe = new Float32Array(n));
    for (const i of W.landIdx) K[i] = Math.max(0.05, (3 + 28 * W.grass[i] + 22 * W.shrub[i] + 10 * W.forest[i]) * clamp((W.T0[i] + W.amp[i]) / 16, 0.4, 1) * (F ? F[i] : 1));
    return K;
  }
  // ---- fewer great beasts as the land fills ----
  const beastFill = W => W._fill || 0;
  const beastCap = W => Math.max(1, Math.round(Math.min(4, 1 + Math.floor(W.clans.length / 12)) * (1 - beastFill(W))));
  const beastChance = W => 0.11 * (1 - beastFill(W));
  // a new beast keeps a day's walk from any village, and from fields cleared to the second step
  function wildFar(W, x, y, km) {
    const r = (km || 25) * 1000;
    for (const c of W.clans) { if (!c.alive || !c.settled) continue; if (Math.hypot(c.x - x, c.y - y) < r) return false;
      if (fieldLv(c) >= 2 && c.plots) for (const j of c.plots) if (Math.hypot((j % N + 0.5) * CELL - x, ((j / N | 0) + 0.5) * CELL - y) < r) return false; }
    return true;
  }
  // a great beast with its ground within reach of fields at the second step is driven off: to wild country well away, or out of the tale
  function driveBeasts(W, by) {
    const P = W.player, pc = P && !P.over && P.head.alive ? P.head.clan : null, out = [];
    for (const b of W.beasts || []) {
      if (!b.alive || BEASTS[b.kind].sea) continue;
      const hit = W.clans.find(c => c.alive && c.settled && fieldLv(c) >= 2 && c.plots && c.plots[0] === cellAt(c.x, c.y) && c.plots.some(j => Math.hypot((j % N + 0.5) * CELL - b.x, ((j / N | 0) + 0.5) * CELL - b.y) < FIELD_REACH)); if (!hit) continue;
      const B = BEASTS[b.kind], told = !!b.name, nm = beastNm(b), mine = pc && b.name && beastNear(W, b, pc), at = { x: b.x, y: b.y };
      let best = null, bd = Infinity; const bx = Math.floor(b.x / CELL), by0 = Math.floor(b.y / CELL), vil = W.clans.filter(c => c.alive && c.settled);
      for (let dy = -20; dy <= 20; dy++) for (let dx = -20; dx <= 20; dx++) { const x = bx + dx, y = by0 + dy; if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1) continue; const d = Math.hypot(dx, dy); if (d >= bd || d > 20) continue;
        const j = y * N + x; if (!W.land[j] || W.lake[j] || !B.biomes.includes(W.biome[j]) || W.farm[j] > 0.02) continue; const px = (x + 0.5) * CELL, py = (y + 0.5) * CELL;
        if (vil.some(c => Math.hypot(c.x - px, c.y - py) < 30000 || (fieldLv(c) >= 2 && c.plots && c.plots.some(q => Math.hypot((q % N + 0.5) * CELL - px, ((q / N | 0) + 0.5) * CELL - py) < 30000)))) continue;
        bd = d; best = [px, py]; }
      if (best) { b.x = best[0]; b.y = best[1]; b.driven = (b.driven || 0) + 1; }
      else { b.alive = false; b.gone = true; b.driven = 1; b.goneAt = W.week; }
      if (told) beastStory(W, b);
      note(W, hit, best ? `${nm[0].toUpperCase() + nm.slice(1)} was driven from the new fields.` : `${nm[0].toUpperCase() + nm.slice(1)} was not seen again after the new fields were cleared.`);
      if (mine) { const N1 = nm[0].toUpperCase() + nm.slice(1), t = best ? `${N1} has been driven from the new fields. Hunters say it now ranges ${beastWhere(b, pc)}.` : `${N1} has not been seen since the new fields were cleared.`;
        houseNote(W, best ? `${N1} was driven off by the new fields.` : `${N1} has not been seen since the new fields were cleared.`); notice(W, best ? `${N1} is driven off` : `${N1} is gone`, t); }
      out.push({ b, moved: !!best });
    }
    return out;
  }
  function harvest(W) {
    const gd = grainDeposits(W), wx = W.weather;
    for (const c of W.clans) {
      const t = c.tribe, ci = cellAt(c.x, c.y), lab = labor(c);
      if (t.stage >= 2) {
        if (c.live === 'fishing') continue;
        const metalT = c.goods.bronze > 0 ? 1.3 : c.goods.metal > 0 || c.tool >= 1 ? 1.2 : 1; // copper axes clear more land, sickles reap faster
        if (c.settled) syncFields(W, c, ci);
        const fields = Math.min(c.people.length * 0.4 * metalT, lab * 1.1 * metalT) * (c.settled ? 1 : 0.35);
        const soilF = (c.settled ? c.soil : 1) * clamp(W.nit[ci] / 55, 0.4, 1.2);
        const crop = fields * (0.4 + 2.6 * Math.min(1, t.dom)) * 1e6 * soilF * (c.settled ? 1 + FIELD_CROP * fieldLv(c) : 1) * clamp(1.3 - Math.abs(wx - 1) * 0.6, 0.4, 1.2);
        c.grain += crop; c.lastCrop = crop;
        if (c.settled) {
          c.soil = Math.max(0.2, c.soil - 0.012 / (1 + FIELD_WEAR * fieldLv(c)));
          W.farm[ci] = Math.min(1, W.farm[ci] + fields / HA * 25); spreadFarm(W, c);
          if (c.soil < 0.4) { // worn-out fields: move the village to fresh ground
            const v = villageSite(W, c, 8000, 25000);
            if (v) { c.settled = false; c.tx = v[0]; c.ty = v[1]; c.toSettle = true; note(W, c, `The fields of ${c.village} were worn out; the clan moved to break new ground.`); }
          }
        }
      } else if (grainAccess(W, c) > 0.04) {
        const crop = Math.min(c.people.length * 0.6, 25) * 0.45e6 * clamp(1.3 - Math.abs(wx - 1) * 0.6, 0.4, 1.2);
        c.grain += crop; c.lastCrop = crop;
      }
    }
    for (const i of W.landIdx) if (W.farm[i] > 0) W.farm[i] *= 0.85; // untended fields go back to scrub
  }

  // =====================================================================
  //  BOATS, FISHING VILLAGES, METAL, SETTLEMENTS
  // =====================================================================
  const BOAT_STAGES = ['No boats', 'Dugout canoes', 'Seagoing canoes'];
  const METAL_STAGES = ['Stone', 'Copper', 'Bronze'];
  const boatStage = t => t.boats >= 0.6 ? 2 : t.boats >= 0.3 ? 1 : 0;
  const metalStage = t => t.metal >= 0.6 && t.bronzeAge ? 2 : t.metal >= 0.3 ? 1 : 0;
  const HAVEN_END = ['mouth', 'haven', 'wick', 'sand', 'ness', 'holm'];

  const BOAT_TXT = [null, t => `The ${t.name} now carve dugout canoes from great logs.<br><br><b>What this opens up:</b><br>• Fishing and sealing from boats along the shore — more food for coastal camps (see the clan's diet)<br>• Short crossings of narrow straits (up to about 20 km)<br>• <b>Act → Lead a sea voyage</b>: chart the coasts, find tin, amber and shell beds, meet coastal peoples<br>• Coastal clans with rich waters may build a <b>permanent fishing village</b><br>• In time, the sea teaches the making of seagoing canoes.`, t => `The ${t.name} now build hide-and-timber canoes for the open sea.<br><br><b>What this opens up:</b><br>• Offshore fishing banks — much more fish<br>• Whale hunts where whales gather (◗ on the map) — a feast for the whole tribe<br>• Crossings to the other isle (up to about 70 km of open water)<br>• Longer <b>sea voyages</b> from the Act menu, and migration across the sea.`];
  function seaMonth(W) {
    const s = seasonOf(W.week), whaleSeason = (s > 0.2 && s < 0.38) || (s > 0.7 && s < 0.85);
    for (const t of W.tribes) {
      if (!t.clans.length) continue;
      // --- boatbuilding: coastal clans learn by doing; neighbours copy ---
      // anyone living by the sea, a big river or a lake learns to hollow out a log; the sea teaches seagoing craft
      let coastal = 0, river = 0; for (const c of t.clans) { const ci = cellAt(c.x, c.y); if (c.coastal || W.seaDist[ci] <= 4) coastal++; else if (W.acc[ci] > 400 || W.lake[ci]) river++; }
      const prevB = boatStage(t);
      if (coastal + river) t.boats = Math.min(1, t.boats + (t.boats < 0.3 ? 0.0007 * Math.min(3, coastal + river * 0.5) : coastal ? 0.0003 * Math.min(3, coastal) : 0));
      if (W.week % 52 === 0) for (const o of W.tribes) if (o !== t && o.boats > t.boats + 0.1 && coastal && opinion(t, o) > 0 && o.clans.some(a => t.clans.some(b => Math.abs(a.x - b.x) < 50000 && Math.abs(a.y - b.y) < 50000))) t.boats = Math.min(o.boats, t.boats + 0.05);
      const nb = boatStage(t);
      if (nb > prevB) {
        if (nb === 1) { note(W, t, 'Began to carve dugout canoes from great logs.'); logEvent(W, `🛶 The ${t.name} carve their first dugout canoes — better fishing along the shore.`, t, 'sea');
          milestone(W, t, 'Dugout canoes', BOAT_TXT[1](t)); }
        if (nb === 2) { note(W, t, 'Built seagoing canoes of hide and timber.'); logEvent(W, `⛵ The ${t.name} build seagoing canoes — they can fish offshore, hunt whales and cross the straits.`, t, 'sea');
          milestone(W, t, 'Seagoing canoes', BOAT_TXT[2](t)); }
      }
      // --- whaling from seagoing canoes ---
      if (nb === 2 && whaleSeason) for (const c of t.clans) {
        const wd = W.deposits.find(d => d.type === 'whale' && Math.hypot(d.x - c.x, d.y - c.y) < FORAGE_R + 20000);
        if (!wd || W.rand() > 0.05 * Math.min(1.2, c.tool) * (c.people.length > 15 ? 1 : 0.5)) continue;
        const meat = 25e6, near = nearClans(W, c.x, c.y, 30000).filter(o => o.tribe === t);
        for (const o of near) o.store += meat / near.length;
        if (c.head) c.head.giftPrestige = (c.head.giftPrestige || 0) + 0.04;
        for (const o of near) if (o !== c) affect(W, o, c, 4, 'Shared a whale');
        note(W, c, `Killed a whale and feasted for weeks.`);
        if (!t.lastWhaleLog || W.week - t.lastWhaleLog > 52 * 15) { t.lastWhaleLog = W.week; logEvent(W, `🐋 Hunters of the ${c.name} clan (${t.name}) kill a whale — the whole tribe feasts.`, c, 'sea'); }
      }
      // --- fishing villages: rich waters + boats let foragers stay put ---
      for (const c of t.clans) {
        if (c.settled || c.toSettle) { if (c.live === 'fishing') { c.lowSupplyM = c.supply < 1.1 ? (c.lowSupplyM || 0) + 1 : 0; if (c.lowSupplyM > 36) { c.settled = false; c.live = null; c.fishYears = 0; note(W, c, `The waters around ${c.village} were fished out; the clan took to wandering again.`); logEvent(W, `${c.village}, the fishing village of the ${c.name}, is abandoned — the waters are fished out.`, c, 'sea'); } } continue; }
        if (!c.coastal || t.boats < 0.3 || W.week % 12 !== 0) continue;
        // can the sea alone feed them, year in, year out?
        const b = foodBreakdown(W, c.x, c.y, c.tool, t.boats), aq = (b.fish + b.shellfish + b.seals) / Math.max(1, needsWeek(c));
        c.fishYears = aq > 1.3 ? c.fishYears + 0.25 : Math.max(0, c.fishYears - 0.125);
        if (c.fishYears >= 8 && !landBlocked(W, t, cellAt(c.x, c.y), null) && !landKeepOff(W, c, cellAt(c.x, c.y))) {
          c.settled = true; c.live = 'fishing'; c.settledAt = W.week; c.village = freshName(W, c.tribe, 'haven'); c.tx = c.x; c.ty = c.y;
          note(W, c, `Settled for good at ${c.village}, living from the sea.`);
          logEvent(W, `🏘 The ${c.name} clan (${t.name}) build a permanent fishing village: ${c.village}.`, c, 'settle');
        }
      }
    }
  }

  // --- metal: ore can be gathered by anyone; smelting needs a settled village and its fires, kilns and labour ---
  function metalYear(W) {
    for (const t of W.tribes) {
      if (!t.clans.length) continue;
      { // flint weapons: knappers learn to make spear points and arrowheads where good flint is to hand
        const share = t.clans.reduce((n, c) => n + (c.goods.flint > 0 || c.tool >= 0.85 ? 1 : c.goods.axe > 0 ? 0.5 : 0), 0) / t.clans.length, before = t.flintW || 0;
        t.flintW = clamp(before + (share > 0 ? 0.04 + 0.08 * share : -0.01), 0, 1);
        if (before < 0.5 && t.flintW >= 0.5) { milestone(W, t, 'Flint weapons', 'Our knappers now make flint spear points and arrowheads. Warriors fight about a fifth better while the clan has good flint — keep a supply (claim a quarry from the Act menu).'); note(W, t, 'Armed with flint-tipped spears and arrows.'); logEvent(W, `🏹 The ${t.name} arm their hunters and warriors with flint-tipped spears and arrows — a deadly edge in a fight.`, t, 'metal'); }
      }
      if (metalStage(t) >= 1 && !t.copperArms && t.clans.some(c => c.goods.metal > 0)) { t.copperArms = true; milestone(W, t, 'Copper daggers and axes', 'Copper daggers make our warriors deadlier, and copper axes and sickles let farmers clear and reap a fifth more land. Tools stay sharp while the clan holds copper goods.'); logEvent(W, `🗡 The ${t.name} carry the first copper daggers and axes — stronger in war, quicker at clearing land.`, t, 'metal'); note(W, t, 'Our warriors carry copper daggers; copper axes clear the forest.'); }
      const smiths = t.clans.filter(c => c.settled && c.goods.copper > 0);
      const prev = metalStage(t);
      if (smiths.length) t.metal = Math.min(1, t.metal + 0.0045 * Math.min(3, smiths.length));
      // settled neighbours who trade with metalworkers pick up the craft
      if (!smiths.length && t.clans.some(c => c.settled)) for (const o of W.tribes) if (o !== t && o.metal >= 0.3 && (rel(t, o).trade > 0 || isAllied(t, o)) && o.clans.some(a => t.clans.some(b => Math.hypot(a.x - b.x, a.y - b.y) < 60000))) { t.metal = Math.max(t.metal, Math.min(0.25, t.metal + 0.03)); break; }
      if (t.metal >= 0.6 && !t.bronzeAge && t.clans.some(c => c.settled && c.goods.tin > 0)) t.bronzeAge = true;
      const ms = metalStage(t);
      if (ms > prev) {
        if (ms === 1) { note(W, t, 'Learned to smelt copper in village furnaces.'); logEvent(W, `🔥 The ${t.name} smelt copper for the first time — copper axes, awls and ornaments.`, t, 'metal'); }
        if (ms === 2) { note(W, t, 'Learned to alloy copper with tin: bronze.'); logEvent(W, `⚔ The ${t.name} cast bronze — harder tools and deadly weapons.`, t, 'metal'); }
      }
      if (ms >= 1) for (const c of smiths) {
        const g = c.goods; g.copper--;
        if (ms === 2 && g.tin > 0) { g.tin--; g.bronze = Math.min(8, g.bronze + 1); c.tool = Math.max(c.tool, 1.15); }
        else { g.metal = Math.min(8, g.metal + 1); c.tool = Math.max(c.tool, 1.0); }
      }
    }
    // a settled place stays known on the map: group nearby villages into settlements
    updateSettlements(W);
  }
  function procureOre(W, c) {
    if (!c.settled || W.week % 12 !== 0) return; // villagers make trips (or trade) for ore; smelting needs the village
    for (const [type, range, cap] of [['copper', 180000, 3], ['tin', 260000, 2]]) {
      if (c.goods[type] >= cap || W.rand() > 0.6) continue;
      let best = null, bd = range;
      for (const d of W.deposits) if (d.type === type) { const dist = Math.hypot(d.x - c.x, d.y - c.y); if (dist < bd && canReach(W, c, d.x, d.y) && !nearClans(W, d.x, d.y, 15000).some(o => o.tribe !== c.tribe && opinion(c.tribe, o.tribe) < -20)) { bd = dist; best = d; } }
      if (best) { c.goods[type]++; wear(W, c.x, c.y, best.x, best.y, 2.5); if (!c.tribe.seen.has(type)) { c.tribe.seen.add(type); note(W, c.tribe, `The ${c.name} began bringing ${type === 'tin' ? 'tin' : 'copper ore'} from ${Math.round(bd / 1000)} km away.`); } }
    }
  }

  // --- settlements: clusters of permanent villages, each a named place with its own memory ---
  function updateSettlements(W) {
    const vs = W.clans.filter(c => c.settled);
    const seen = new Set(), out = [], groups = [];
    const GR = 9000, gk = (x, y) => Math.floor(x / GR) * 100003 + Math.floor(y / GR), grid = new Map(), vi = new Map(); // a grid of the villages, so that each is compared only with those beside it
    vs.forEach((o, i) => { vi.set(o, i); const k = gk(o.x, o.y), L = grid.get(k); if (L) L.push(o); else grid.set(k, [o]); });
    for (const c of vs) {
      if (seen.has(c)) continue;
      const grp = [c]; seen.add(c);
      for (let k = 0; k < grp.length; k++) {
        const g = grp[k], gx = Math.floor(g.x / GR), gy = Math.floor(g.y / GR), cand = [];
        for (let ax = gx - 1; ax <= gx + 1; ax++) for (let ay = gy - 1; ay <= gy + 1; ay++) { const L = grid.get(ax * 100003 + ay); if (L) for (const o of L) if (!seen.has(o)) cand.push(o); }
        cand.sort((a, b) => vi.get(a) - vi.get(b)); // the village list's own order, as before
        for (const o of cand) if (!seen.has(o) && Math.hypot(o.x - g.x, o.y - g.y) < 9000) { seen.add(o); grp.push(o); }
      }
      grp.sort((a, b) => (a.settledAt || 0) - (b.settledAt || 0));
      groups.push(grp);
    }
    // two groups that carry one name: one keeps the place's record, the other is called by a fresh name (the player's village is never the one)
    const byName = new Map(), pc = W.player && W.player.head && W.player.head.clan;
    for (const grp of groups) { const n = grp[0].village || grp[0].name, L = byName.get(n); if (L) L.push(grp); else byName.set(n, [grp]); }
    for (const [n, L] of byName) {
      if (L.length < 2) continue;
      const prev = W.places.get(n), pset = new Set(prev && prev.clans || []);
      const score = g => [g.includes(pc) ? 1 : 0, g.filter(o => pset.has(o)).length, -(g[0].settledAt || 0)];
      let keep = L[0], ks = score(keep);
      for (const g of L) { if (g === keep) continue; const gs = score(g); for (let i = 0; i < 3; i++) { if (gs[i] !== ks[i]) { if (gs[i] > ks[i]) { keep = g; ks = gs; } break; } } }
      for (const g of L) if (g !== keep) {
        const nn = freshName(W, g[0].tribe, g.some(o => o.live === 'farm') ? 'vill' : 'haven'); for (const o of g) o.village = nn;
        g.renamedFrom = n; W.placeRenames = (W.placeRenames || 0) + 1;
      }
    }
    for (const grp of groups) {
      const name = grp[0].village || grp[0].name;
      let rec = W.places.get(name);
      if (!rec) { rec = ent(W, 'place', { name, kinds: new Set(), peak: 0 }); W.places.set(name, rec); if (grp.renamedFrom) note(W, rec, `Called ${name} now, to tell it from ${grp.renamedFrom}.`); else note(W, rec, `${name} founded by the ${grp[0].name} clan of the ${grp[0].tribe.name}.`); }
      const pop = grp.reduce((s, o) => s + o.people.length, 0);
      rec.clans = grp; rec.pop = pop; rec.x = grp.reduce((s, o) => s + o.x, 0) / grp.length; rec.y = grp.reduce((s, o) => s + o.y, 0) / grp.length;
      rec.tribe = grp[0].tribe; rec.type = grp.some(o => o.live === 'farm') ? (grp.some(o => o.live === 'fishing') ? 'mixed' : 'farm') : 'fishing';
      rec.metal = metalStage(rec.tribe) && grp.some(o => o.goods.copper + o.goods.metal + o.goods.bronze > 0) ? metalStage(rec.tribe) : 0;
      if (pop > rec.peak) { if (rec.peak < 100 && pop >= 100) note(W, rec, `${name} grew past a hundred souls.`); rec.peak = pop; }
      if (rec.metal && !rec.kinds.has('metal' + rec.metal)) { rec.kinds.add('metal' + rec.metal); note(W, rec, rec.metal === 2 ? 'Bronze-smiths began working here.' : 'Copper was first smelted here.'); }
      rec.alive = true; rec.lastSeen = W.week; if (!out.includes(rec)) out.push(rec);
    }
    const outSet = new Set(out);
    for (const [name, rec] of W.places) if (!outSet.has(rec) && rec.lastSeen !== W.week && rec.clans) {
      if (rec.clans.some(c => c.alive && c.toSettle)) continue; /* moving to fresh fields, not abandoned */ if (!rec.abandoned) { rec.abandoned = W.week; note(W, rec, `${name} was abandoned.`); } rec.clans = []; }
    W.settlements = out;
  }

  // =====================================================================
  //  ROADS — worn into the land by people moving: camp moves, migrations, quarry & ore trips, trade,
  //  summer gatherings, and traffic between settlements. Routes bend around lakes and steep climbs.
  //  Edge traffic fades unless used, so tracks come and go; busy ones become paths, then roads.
  // =====================================================================
  // A way that exists is cheaper to walk: a step along a road costs x0.35, a path x0.5, a track x0.75, so new trips follow old ways.
  const ROUTE_DISC = [1, 0.75, 0.5, 0.35], ROUTE_BOX_M = 15000, ROUTE_BOX_SHARE = 0.35, ROUTE_MAX_OPEN = 6000;
  const rtG = new Float64Array(N * N), rtSeen = new Int32Array(N * N), rtPar = new Int32Array(N * N), rtDone = new Int32Array(N * N); let rtStamp = 0;
  const rtHeapI = [], rtHeapF = [];
  function rtPush(i, f) { let k = rtHeapI.length; rtHeapI.push(i); rtHeapF.push(f); while (k > 0) { const p = (k - 1) >> 1; if (rtHeapF[p] <= f) break; rtHeapI[k] = rtHeapI[p]; rtHeapF[k] = rtHeapF[p]; k = p; } rtHeapI[k] = i; rtHeapF[k] = f; }
  function rtPop() {
    const top = rtHeapI[0], li = rtHeapI.pop(), lf = rtHeapF.pop(), n = rtHeapI.length; if (n) { let k = 0; for (;;) { let c = 2 * k + 1; if (c >= n) break; if (c + 1 < n && rtHeapF[c + 1] < rtHeapF[c]) c++; if (rtHeapF[c] >= lf) break; rtHeapI[k] = rtHeapI[c]; rtHeapF[k] = rtHeapF[c]; k = c; } rtHeapI[k] = li; rtHeapF[k] = lf; }
    return top;
  }
  // least-cost walk (A*) over the 8-neighbour grid inside a corridor round start and goal; null if it fails (the caller then walks greedily)
  // The terrain part of a step never changes in a world (land, climb, slope, lake, marsh), so it is worked out once per directed step and kept.
  const rtBase = new Float64Array(N * N * 8), RTX = NB8.map(d => d[0]), RTY = NB8.map(d => d[1]); let rtBaseW = null;
  function routeSearch(W, start, goal) {
    if (rtBaseW !== W) { rtBase.fill(-1); rtBaseW = W; }
    const gx = PX[goal], gy = PY[goal], dist = Math.sqrt((gx - PX[start]) ** 2 + (gy - PY[start]) ** 2), pad = Math.max(ROUTE_BOX_M, dist * ROUTE_BOX_SHARE);
    const bx0 = Math.min(PX[start], gx) - pad, bx1 = Math.max(PX[start], gx) + pad, by0 = Math.min(PY[start], gy) - pad, by1 = Math.max(PY[start], gy) + pad;
    const st = ++rtStamp, roads = W.roads, hd = ROUTE_DISC[3], anyRoad = roads.size > 0; rtHeapI.length = 0; rtHeapF.length = 0;
    rtG[start] = 0; rtSeen[start] = st; rtPar[start] = -1; rtPush(start, dist * hd);
    let opened = 0;
    while (rtHeapI.length) {
      const i = rtPop(); if (rtDone[i] === st) continue; rtDone[i] = st;
      if (i === goal) { const out = []; for (let c = goal; c >= 0; c = rtPar[c]) out.push(c); return out.reverse(); }
      if (++opened > ROUTE_MAX_OPEN) return null;
      const x = i % N, y = (i / N) | 0, gi = rtG[i], landI = W.land[i];
      for (let d = 0; d < 8; d++) {
        const xx = x + RTX[d], yy = y + RTY[d]; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
        const j = yy * N + xx; if (rtDone[j] === st || PX[j] < bx0 || PX[j] > bx1 || PY[j] < by0 || PY[j] > by1) continue;
        let cost = rtBase[i * 8 + d];
        if (cost < 0) {
          const step = cdist(i, j) * CELL; cost = step;
          if (W.land[j]) cost += Math.max(0, W.elev[j] - (landI ? W.elev[i] : 0)) * 30 + W.slope[j] * step * 3 + (W.lake[j] ? step * 4 : 0) + (W.biome[j] === 8 ? step * 0.6 : 0);
          else cost += step * 0.5; // open water: canoes
          rtBase[i * 8 + d] = cost;
        }
        if (anyRoad) { const v = roads.get(i < j ? i * 40000 + j : j * 40000 + i); if (v > 3) cost *= ROUTE_DISC[v > 30 ? 3 : v > 10 ? 2 : 1]; }
        const ng = gi + cost; if (rtSeen[j] === st && rtG[j] <= ng) continue;
        rtSeen[j] = st; rtG[j] = ng; rtPar[j] = i; rtPush(j, ng + Math.sqrt((PX[j] - gx) ** 2 + (PY[j] - gy) ** 2) * hd);
      }
    }
    return null;
  }
  function routeCells(W, x0, y0, x1, y1) {
    const a = cellAt(x0, y0), b = cellAt(x1, y1); if (a === b) return [a];
    return routeSearch(W, a, b) || routeGreedy(W, x0, y0, x1, y1);
  }
  function routeGreedy(W, x0, y0, x1, y1) {
    let i = cellAt(x0, y0); const goal = cellAt(x1, y1), gx = PX[goal], gy = PY[goal], out = [i], seen = new Set([i]);
    const maxSteps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / CELL * 2) + 4;
    for (let s = 0; i !== goal && s < maxSteps; s++) {
      const x = i % N, y = (i / N) | 0; let best = -1, bs = Infinity;
      for (const [dx, dy] of NB8) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
        const j = yy * N + xx; if (seen.has(j)) continue;
        const step = cdist(i, j) * CELL; let cost = step + Math.hypot(PX[j] - gx, PY[j] - gy);
        if (W.land[j]) cost += Math.max(0, W.elev[j] - (W.land[i] ? W.elev[i] : 0)) * 30 + W.slope[j] * step * 3 + (W.lake[j] ? step * 4 : 0) + (W.biome[j] === 8 ? step * 0.6 : 0);
        else cost += step * 0.5; // open water: canoes
        if (cost < bs) { bs = cost; best = j; }
      }
      if (best < 0) break; seen.add(best); out.push(best); i = best;
    }
    return out;
  }
  function wear(W, x0, y0, x1, y1, w) {
    if (!(w > 0) || Math.hypot(x1 - x0, y1 - y0) < 3000) return;
    const p = routeCells(W, x0, y0, x1, y1);
    for (let k = 1; k < p.length; k++) { const a = p[k - 1], b = p[k], key = a < b ? a * 40000 + b : b * 40000 + a; W.roads.set(key, (W.roads.get(key) || 0) + w); }
  }
  // =====================================================================
  //  PACT ROADS — a trade pact between two tribes wears a way between their chief places every year.
  //  Ends are remembered on the relation record (r.way = [idLow, keyLow, idHigh, keyHigh]; key 'p:Name' for a village place,
  //  'c:id' for a camp) so that one line forms. Yearly wear: 6 between two villages, 3 if either end is a camp.
  //  A constant yearly wear w settles at 4w for a faint way (traffic 10 or less, fade x0.8) and about w / 0.12 for a busy one (fade x0.88); a track shows above 3.
  //  A sea lane is worn 2 a year between villages (settles at 8) and 1 with a camp at an end (settles at 4), so that either shows as a track when no other boat uses the water.
  // =====================================================================
  const PACT_W = 6, PACT_SIGN_W = 4, PACT_LANE_W = 2, PACT_YEARS = 20;
  const roadKey = (a, b) => a < b ? a * 40000 + b : b * 40000 + a;
  function pactResolve(W, t, key) {
    if (!key) return null;
    if (key[0] === 'p') { const rec = W.places.get(key.slice(2)); return rec && rec.alive && !rec.abandoned && rec.tribe === t && rec.x != null ? { key, x: rec.x, y: rec.y, name: rec.name, village: true } : null; }
    const c = W.ents.get(+key.slice(2)); if (!c || c.kind !== 'clan' || !c.alive || c.tribe !== t || !c.people.length) return null;
    return { key, x: c.x, y: c.y, name: c.settled ? (c.village || c.name) : `the ${c.name} camp`, village: !!c.settled };
  }
  function pactPick(W, a, b) {
    const S = W.settlements || [], sa = S.filter(s => s.tribe === a && s.alive), sb = S.filter(s => s.tribe === b && s.alive);
    const chief = (t, ss) => { if (ss.length) { const s = ss.slice().sort((p, q) => q.pop - p.pop)[0]; return 'p:' + s.name; } const c = t.clans.filter(k => k.alive && k.people.length).sort((p, q) => q.people.length - p.people.length)[0]; return c ? 'c:' + c.id : null; };
    let ka = chief(a, sa), kb = chief(b, sb); if (!ka || !kb) return null;
    if (sa.length && sb.length) {
      const ea = pactResolve(W, a, ka), eb = pactResolve(W, b, kb); let bd = Infinity, bp = null;
      for (const p of sa) for (const q of sb) { const d = Math.hypot(p.x - q.x, p.y - q.y); if (d < bd) { bd = d; bp = [p, q]; } }
      if (ea && eb && bp && bd < 0.7 * Math.hypot(ea.x - eb.x, ea.y - eb.y)) { ka = 'p:' + bp[0].name; kb = 'p:' + bp[1].name; }
    }
    return [ka, kb];
  }
  // the two ends [for a, for b] or null; keeps the remembered ends unless one is gone or a clearly nearer pair exists
  function pactEnds(W, a, b, r, store) {
    const lo = a.id < b.id ? a : b, hi = lo === a ? b : a; let ends = null;
    const w = r.way, cur = w && w[0] === lo.id && w[2] === hi.id ? [pactResolve(W, lo, w[1]), pactResolve(W, hi, w[3])] : null;
    const pk = pactPick(W, lo, hi), np = pk ? [pactResolve(W, lo, pk[0]), pactResolve(W, hi, pk[1])] : null;
    if (cur && cur[0] && cur[1]) { ends = cur; if (np && np[0] && np[1] && (np[0].key !== cur[0].key || np[1].key !== cur[1].key) && Math.hypot(np[0].x - np[1].x, np[0].y - np[1].y) < 0.6 * Math.hypot(cur[0].x - cur[1].x, cur[0].y - cur[1].y)) ends = np; }
    else if (np && np[0] && np[1]) ends = np;
    if (!ends) return null;
    if (store) r.way = [lo.id, ends[0].key, hi.id, ends[1].key];
    return lo === a ? ends : [ends[1], ends[0]];
  }
  // the edges a pact wears between ends e0 (lower tribe id) and e1, each with a share of the yearly wear.
  // Mostly water (over a third of the steps): wear a way from each end to its own shore, and a thin sea lane only if canoes exist.
  function pactPlan(W, e0, e1, canoes) {
    const cells = routeCells(W, e0.x, e0.y, e1.x, e1.y), n = cells.length; if (n < 2 || Math.hypot(e1.x - e0.x, e1.y - e0.y) < 3000) return { edges: [], mode: 'none' };
    const wet = j => !W.land[cells[j]]; let water = 0; for (let j = 1; j < n; j++) if (wet(j - 1) || wet(j)) water++;
    const edges = [], add = (j0, j1, f) => { for (let j = j0 + 1; j <= j1; j++) edges.push([roadKey(cells[j - 1], cells[j]), f]); };
    if (water / (n - 1) <= 0.35) { add(0, n - 1, 1); return { edges, mode: 'land' }; }
    let f = 0, l = n - 1; while (f < n && !wet(f)) f++; while (l >= 0 && !wet(l)) l--;
    add(0, Math.max(0, f - 1), 1); add(Math.min(n - 1, l + 1), n - 1, 1);
    if (canoes && f < n && l >= 0) add(Math.max(0, f - 1), Math.min(n - 1, l + 1), PACT_LANE_W / PACT_W);
    return { edges, mode: 'shore' };
  }
  const pactWet = (a, b) => boatStage(a) >= 1 || boatStage(b) >= 1;
  function pactWearEnds(W, ends, a, b, w) {
    const lo = a.id < b.id, plan = pactPlan(W, lo ? ends[0] : ends[1], lo ? ends[1] : ends[0], pactWet(a, b));
    for (const [k, f] of plan.edges) W.roads.set(k, (W.roads.get(k) || 0) + w * f);
    return plan;
  }
  // at signing: remember the ends, wear a track at once, redraw the map; returns a sentence for the deed's result
  function pactSign(W, a, b, r) {
    const ends = pactEnds(W, a, b, r, true);
    if (!ends) { // say why, so that the pact never ends in silence
      const bare = [a, b].find(t => !t.clans.some(k => k.alive && k.people.length));
      return bare ? ` No way is being trodden yet: the ${bare.name} have no village or camp that traders could set out from.` : ` No way is being trodden yet: no village or camp of the ${a.name} or the ${b.name} could be fixed on as the end of one.`;
    }
    const plan = pactWearEnds(W, ends, a, b, PACT_SIGN_W); W.roadsVer = (W.roadsVer || 0) + 1; pactCache.m.clear();
    const A = ends[0].name, B = ends[1].name, cap = x => x[0].toUpperCase() + x.slice(1);
    if (plan.mode === 'none') return Math.hypot(ends[1].x - ends[0].x, ends[1].y - ends[0].y) < 3000 ? ` ${cap(A)} and ${B} lie too close for a way to show; the traders will simply walk between them.` : ` No way could be traced between ${A} and ${B}, so none is being trodden yet.`;
    if (plan.mode === 'shore') return ` The sea lies between ${A} and ${B}, so a way is being trodden from each down to its own shore.`;
    return ` A way is being trodden between ${A} and ${B}. Keep the pact, and the feet of the traders will make it a path.`;
  }
  // once a year, with the other wear: every standing pact keeps its way worn
  function pactRoadsYear(W) {
    for (const a of W.tribes) for (const [oid, r] of a.rel) {
      if (oid <= a.id || !r.pact) continue; const b = W.ents.get(oid); if (!b || b.kind !== 'tribe' || !b.alive) continue;
      const ends = pactEnds(W, a, b, r, true); if (ends) pactWearEnds(W, ends, a, b, ends[0].village && ends[1].village ? PACT_W : PACT_W / 2);
    }
  }
  // for the interface: the pact's ends for a and b, the present state of the way and its length in km (track or better)
  const pactCache = { W: null, ver: -1, m: new Map() };
  function pactRoute(W, a, b) {
    const r = a && b && a.rel.get(b.id); if (!r || !r.pact) return null;
    if (pactCache.W !== W || pactCache.ver !== W.roadsVer) { pactCache.W = W; pactCache.ver = W.roadsVer; pactCache.m.clear(); }
    const ck = a.id + ',' + b.id + ',' + r.pact; if (pactCache.m.has(ck)) return pactCache.m.get(ck);
    const ends = pactEnds(W, a, b, r, false); let out = { until: r.pact, ends: null, level: 0, mode: 'none', km: 0 };
    if (ends) {
      const lo = a.id < b.id, plan = pactPlan(W, lo ? ends[0] : ends[1], lo ? ends[1] : ends[0], pactWet(a, b));
      let lv = plan.edges.length ? 9 : 0, km = 0; for (const [k, f] of plan.edges) { const v = W.roads.get(k) || 0; if (f === 1) { lv = Math.min(lv, roadLevel(v)); if (v > 3) km += cdist(Math.floor(k / 40000), k % 40000) * CELL / 1000; } }
      out = { until: r.pact, ends, level: lv === 9 ? 0 : lv, mode: plan.mode, km };
    }
    pactCache.m.set(ck, out); return out;
  }
  // the world's own tribes: two on good terms who already trade or are allied sometimes agree a pact by themselves (8% a year while eligible)
  function aiPact(W, a, b, r) {
    if (r.pact || r.op < 10 || a.atWar.has(b.id) || !(r.allied || r.trade >= 1)) return;
    const P = W.player, pt = P && P.head && P.head.clan ? P.head.clan.tribe : null; if (a === pt || b === pt) return;
    if (W.rand() > 0.08) return;
    const ends = pactEnds(W, a, b, r, false); if (!ends || Math.hypot(ends[0].x - ends[1].x, ends[0].y - ends[1].y) > 150000) return;
    W.pactsMade = (W.pactsMade || 0) + 1; r.pact = W.week + 52 * PACT_YEARS; r.hist.push({ w: W.week, t: 'Trade pact agreed' }); const way = pactSign(W, a, b, r);
    note(W, a, `A trade pact was agreed with the ${b.name}.${way}`); note(W, b, `A trade pact was agreed with the ${a.name}.${way}`);
    logEvent(W, `The ${a.name} and the ${b.name} agree a trade pact for twenty years.${way}`, a, 'gather');
  }
  function roadsYear(W) {
    // villages trade with their neighbours and kin: the busiest routes of all
    const S = W.settlements || [];
    for (const a of S) {
      const near = S.filter(b => b !== a && Math.hypot(b.x - a.x, b.y - a.y) < 70000 && (b.tribe === a.tribe || isAllied(a.tribe, b.tribe) || rel(a.tribe, b.tribe).trade > 0)).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y)).slice(0, 3);
      for (const b of near) if (a.id < b.id) wear(W, a.x, a.y, b.x, b.y, Math.min(a.pop, b.pop) / 12);
    }
    pactRoadsYear(W);
    for (const [k, v] of W.roads) { const nv = v * (v > 10 ? 0.88 : 0.8); if (nv < 0.5) W.roads.delete(k); else W.roads.set(k, nv); }
    W.roadsVer = (W.roadsVer || 0) + 1;
  }
  const roadLevel = v => v > 30 ? 3 : v > 10 ? 2 : v > 3 ? 1 : 0; // track, path, road

  // =====================================================================
  //  CONFEDERATIONS & KINGS
  //  A headman with enough wealth, kin, clan backing, tribal strength and allies can unite tribes
  //  into a confederation and rule as king. He can subjugate neighbours by war; on his death the
  //  confederation may splinter.
  // =====================================================================
  const warriors = t => { let n = 0; for (const c of t.clans) for (const q of c.people) if (q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50) n++; return n; };
  const tribeWealth = t => { let w = 0; for (const c of t.clans) { const g = c.goods; w += g.amber * 3 + g.axe * 2 + g.salt + g.ochre + g.flint * 0.5 + g.copper + g.tin + g.metal * 3 + g.bronze * 5; } return w; };
  function kinOf(h, t) {
    let n = 0;
    for (const c of t.clans) for (const q of c.people) {
      if (q === h) continue;
      if (q.father === h || q.mother === h || (q.father && q.father.father === h) || (h.father && q.father === h.father) || h.spouse === q || q.spouse === h) n++;
    }
    return n;
  }
  // how strong a claim this headman has to unite tribes under him — shown in the UI as his "bid for kingship"
  function kingshipBid(W, t) {
    const h = t.headman; if (!h || !h.alive) return null;
    const hc = h.clan;
    let clanBack = 0, n = 0; for (const c of t.clans) if (c !== hc) { clanBack += opinion(c, hc); n++; }
    clanBack = n ? clanBack / n : 20;
    const allies = W.tribes.filter(o => o !== t && isAllied(t, o) && !sameConfed(t, o) && opinion(o, t) > 30);
    const parts = {
      prestige: Math.min(1.2, prestige(h)),
      wealth: Math.min(1.5, tribeWealth(t) / 40),
      kin: Math.min(1, kinOf(h, t) / 14),
      clans: clamp((clanBack + 20) / 80, 0, 1),
      tribe: Math.min(1.3, tribeSize(t) / 150),
      allies: Math.min(1.5, allies.length * 0.5),
      gods: faithOf(t) === 'sky' ? 0.5 : 0,
    };
    const total = Math.floor(Object.values(parts).reduce((a, b) => a + b, 0) * 10 + 1e-9) / 10; // shown to one decimal, so rounded down: a bid that reads as enough is enough
    return { total, parts, allies, need: 4.2 };
  }
  const confedName = (W, t) => pick([`the ${t.name} Confederacy`, `the League of the ${t.name}`, `the ${makeName(W.rand, 2)} Confederacy`, `the Realm of the ${t.name}`], W.rand);
  function newConfed(W, t, king, others) {
    const cf = ent(W, 'confed', { name: confedName(W, t), capital: t, king, kings: [king.name], members: new Map(), wars: new Map(), hue: t.hue, peak: 0, rule: 0, ruleSince: W.week, rulerSince: W.week });
    W.confeds.push(cf);
    joinConfed(W, cf, t, 'core');
    for (const o of others) joinConfed(W, cf, o, 'ally');
    const names = [t, ...others].map(o => 'the ' + o.name).join(', ');
    note(W, cf, `Founded when ${king.name}, headman of the ${t.name}, united ${names}.`);
    logEvent(W, `👑 ${king.name} of the ${t.name} unites ${names} into ${cf.name} and is raised as high chief.`, cf, 'king');
    return cf;
  }
  function joinConfed(W, cf, t, status) {
    if (t.confed && t.confed !== cf) leaveConfed(W, t, null);
    t.confed = cf; cf.members.set(t.id, { status, joined: W.week }); realmPeace(W, cf, t);
    if (status !== 'core') sightJoin(W, cf, t, status);
    if (status !== 'core') realmTold(W, cf, t, status);
    if (status !== 'core') note(W, t, status === 'subject' ? `Forced to submit to ${cf.name}.` : `Joined ${cf.name} under ${rulerMid(cf)} ${cf.king.name}.`);
  }
  function leaveConfed(W, t, why) {
    const cf = t.confed; if (!cf) return; realmDropped(W, cf, t, why); t.leftFrom = cf.id; t.leftAt = W.week; t.confed = null; cf.members.delete(t.id);
    if (why) { note(W, t, `Broke away from ${cf.name} (${why}).`); note(W, cf, `The ${t.name} broke away (${why}).`); }
    if (cf.capital === t || cf.members.size < 2) dissolveConfed(W, cf, cf.capital === t ? 'its heartland tribe was lost' : 'too few tribes remained');
  }
  function dissolveConfed(W, cf, why) {
    if (!cf.alive) return;
    realmEnding(W, cf, why);
    for (const id of [...cf.members.keys()]) { const t = W.ents.get(id); if (t) { t.confed = null; t.leftFrom = cf.id; t.leftAt = W.week; } }
    const hadWars = cf.wars.size; cf.members.clear(); for (const id of [...cf.wars.keys()]) warOver(W, cf, id); cf.wars.clear(); W.confeds.splice(W.confeds.indexOf(cf), 1); kill(W, cf);
    logEvent(W, `${cf.name[0].toUpperCase() + cf.name.slice(1)} falls apart — ${why}.${hadWars ? ' Its wars end with it.' : ''}`, null, 'king');
  }
  const confedTribes = (W, cf) => [...cf.members.keys()].map(id => W.ents.get(id)).filter(Boolean);
  const confedPeople = (W, cf) => confedTribes(W, cf).reduce((s, t) => s + tribeSize(t), 0);

  function tryFoundConfeds(W) {
    let total = 0; for (const c of W.clans) total += c.people.length;
    if (W.tribes.length < 6 || total < 900) return;  // only once the land holds many tribes
    for (const t of W.tribes) {
      if (t.confed || W.rand() > 0.35) continue;
      const b = kingshipBid(W, t); if (!b || b.total < b.need || b.allies.length < 2) continue;
      const h = t.headman, ph = prestige(h);
      // allies whose own headmen are not greater men themselves agree to follow him
      const followers = b.allies.filter(o => !o.confed && (!o.headman || prestige(o.headman) < ph * 1.1) && opinion(o, t) > 30 && !(o === realmPlayerTribe(W) && W.player.head === o.headman)).slice(0, 5);
      if (followers.length < 2) continue;
      if (isHead(W, h)) { if (W.week - W.player.lastCrown > 52 * 5) { W.player.lastCrown = W.week; pushEvent(W, { type: 'crown', key: h.id, title: 'A confederacy within reach', text: `${h.name} stands above the other leaders of the ${t.name}. The leaders of ${followers.map(o => 'the ' + o.name).join(', ')} would follow ${h.sex === 'F' ? 'her' : 'him'}. ${h.sex === 'F' ? 'She' : 'He'} could unite them into a confederacy as high chief — but at first the tribes follow the person and not the seat, and the confederacy ends when ${h.sex === 'F' ? 'she' : 'he'} dies. Later ${h.sex === 'F' ? 'she' : 'he'} may bind them to the seat, and in time raise a kingdom.`, data: { tribe: t, followers }, options: [{ label: 'Unite the tribes', hint: 'Found a confederacy with you as high chief' }, { label: 'Not yet', hint: 'Ask again in five years' }] }); } continue; }
      const ncf = newConfed(W, t, h, followers), my = realmPlayerTribe(W);
      if (my && !my.confed && b.allies.includes(my) && W.player.head === my.headman) realmInvite(W, ncf, my);
    }
  }

  const WAR_QUIT = 0.4, WAR_CRUSH = 2.5, REALM_TRIB = 0.15; // a lost battle ends the host's war with this chance (always from the third battle); a victory this many times over ends it at once; the share of stored food a subject clan gives each year
  // a war begins: its record is opened, and clans of the attacked tribe that are at odds with its leader may hold back their men
  function warBegin(W, cf, t) {
    const L = (cf.warLog = cf.warLog || {})[t.id] = { from: W.week, won: 0, lost: 0, hold: [], stand: null };
    const lc = t.headman && t.headman.clan, myT = realmPlayerTribe(W), pc = myT === t ? W.player.head.clan : null;
    if (lc) for (const c of t.clans) if (c !== lc && c !== pc && opinion(c, lc) < -30 && W.rand() < 0.3) {
      L.hold.push(c.id); W.nHoldBack = (W.nHoldBack || 0) + 1; for (const o of t.clans) if (o !== c) affect(W, o, c, -12, `Kept its men at home when the realm marched`);
      if (myT === t) logEvent(W, `The ${c.name} clan keeps its men at home.`, t, 'blood');
    }
  }
  // a war is over (won, lost, called off, or ended with its realm)
  function warOver(W, cf, tid) { cf.wars.delete(tid); if (cf.warLog) delete cf.warLog[tid]; }
  const warText = (cf, tid) => { const L = cf.warLog && cf.warLog[tid]; return L ? `${L.won} ${L.won === 1 ? 'battle' : 'battles'} won and ${L.lost} lost` : 'under way'; };
  const warFrom = (cf, tid) => { const L = cf.warLog && cf.warLog[tid]; return L ? L.from : null; };
  // the two sides of a realm's battle, used by the roll and by every chance shown. Clans that hold back (this war's `hold`, and `omit`) send no men.
  function warSides(W, cf, def, omit) {
    // attacker strength: the king's tribes (allies send fewer, subjects fewer still)
    const sA = confedTribes(W, cf).reduce((s, t) => { const st = cf.members.get(t.id).status; return s + warriors(t) * tribeVigor(t) * (st === 'core' ? 1 : st === 'ally' ? 0.6 : 0.4); }, 0);
    const att = cf.capital, out = warHeld(cf, def, omit); let dw = warriors(def); for (const c of def.clans) if (out.has(c.id)) dw -= warriorsOf(c);
    let sD = dw * tribeVigor(def); for (const o of W.tribes) if (o !== def && isAllied(o, def) && !sameConfed(o, att)) sD += warriors(o) * 0.4;
    return { sA, sD };
  }
  const warHeld = (cf, def, omit) => { const L = cf.warLog && cf.warLog[def.id], s = new Set(L && L.hold || []); if (omit) s.add(omit.id); return s; };
  // the chance that one battle goes the realm's way: the same sum the battle rolls (win when sA/sD * (0.6 + 0.8u) > 1)
  function battleOdds(W, cf, def, omit) { const { sA, sD } = warSides(W, cf, def, omit); return sA <= 0 ? 0 : clamp(1 - (Math.max(1, sD) / sA - 0.6) / 0.8, 0, 1); }
  const WAR_DLOSS_LOST = [0.1, 0.22], WAR_DLOSS_WON = [0.03, 0.08]; // the share of the defenders' men that falls in a battle the host wins / the host loses
  const warFall = r => { const f = Math.round(1 / r[1]), g = Math.round(1 / r[0]); return `one in ${g} to one in ${f}`; };
  function battle(W, att, def, cf) {
    const { sA, sD } = warSides(W, cf, def);
    const r = (sA / Math.max(1, sD)) * (0.6 + W.rand() * 0.8);
    const win = r > 1;
    const lose = (t, frac) => { let k = 0; const men = [], hb = t === def ? warHeld(cf, def) : new Set(); for (const c of t.clans) if (!hb.has(c.id)) for (const q of c.people) if (q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50) men.push([c, q]); const n = Math.round(men.length * frac); for (let i = 0; i < n && men.length; i++) { const [c, q] = men.splice(Math.floor(W.rand() * men.length), 1)[0]; die(W, c, q, `killed in battle`); c.yr.killed++; k++; } for (const c of t.clans) c.people = c.people.filter(q => q.alive); return k; };
    const dyn0 = W.player ? dynMembers(W) : [];
    const dL = lose(def, win ? WAR_DLOSS_LOST[0] + W.rand() * (WAR_DLOSS_LOST[1] - WAR_DLOSS_LOST[0]) : WAR_DLOSS_WON[0] + W.rand() * (WAR_DLOSS_WON[1] - WAR_DLOSS_WON[0])), aL = lose(att, win ? 0.03 + W.rand() * 0.04 : 0.08 + W.rand() * 0.1);
    affect(W, def, att, -20, `Battle with ${rulerMid(cf)} ${cf.king.name}'s warriors`, 10 + dL * 3);
    let caps = 0; if (win && def.clans.length && cf.king.clan) { const dc = pick(def.clans, W.rand); caps = takeCaptives(W, cf.king.clan, dc, 1 + Math.floor(W.rand() * 4), cf.king).length; }
    { const fell = dyn0.filter(q => !q.alive); if (fell.length) houseNote(W, `In the battle between the ${def.name} and ${rulerMid(cf)} ${cf.king.name}'s host (${win ? 'the host won' : 'the host was beaten'}), ${nameList(fell)}${fell.length > 3 ? ` and ${fell.length - 3} more` : ''} of our blood fell.`); }
    return { win, r, dL, aL, caps };
  }
  function confedYear(W) {
    tryFoundConfeds(W);
    for (const cf of [...W.confeds]) {
      if (!cf.alive) continue;
      let cap = cf.capital;
      if (!cap.alive) { dissolveConfed(W, cf, 'its heartland tribe was lost'); continue; }
      for (const id of [...cf.members.keys()]) { const t = W.ents.get(id); if (!t || !t.alive) cf.members.delete(id); }
      // --- the king's death: succession, and perhaps splintering ---
      if (!cf.king.alive || !cf.king.clan || cf.king.clan.tribe !== cap) { succession(W, cf); if (!cf.alive) continue; cap = cf.capital; }
      const king = cf.king;
      realmYear(W, cf); if (!cf.alive) continue;
      const tl = [];
      // --- tribute from subjects, gifts and feasting with allies ---
      for (const t of confedTribes(W, cf)) {
        const m = cf.members.get(t.id); if (t === cap) continue;
        if (m.status === 'subject') realmPay(W, cf, t, m, tl);
        else affect(W, t, cap, 3, `Feasting under the ${rulerWord(cf).toLowerCase()}`);
      }
      if (!cf.alive) continue;
      realmRisings(W, cf, tl);
      if (!cf.alive) continue;
      // --- voluntary joining by friendly neighbours ---
      for (const t of W.tribes) {
        if (t.confed || W.rand() > 0.12) continue;
        if (opinion(t, cap) > 40 && confedTribes(W, cf).some(o => isAllied(o, t) || opinion(o, t) > 40) && nearConfed(W, cf, t, 90000)) {
          if (!realmInvite(W, cf, t)) { joinConfed(W, cf, t, 'ally'); logEvent(W, `The ${t.name} join ${cf.name} of their own will.`, cf, 'king'); }
        }
      }
      // --- wars of subjugation ---
      let held = null; const K0 = king;
      const grudge = W.tribes.some(x => x.alive && x.leftFrom === cf.id && W.week - x.leftAt < 52 * 8);
      if (!cf.wars.size && W.rand() < (grudge ? 0.35 : 0.12 + king.temper * 0.25)) {
        const myStr = confedTribes(W, cf).reduce((s, t) => s + warriors(t), 0);
        let target = null, ts = -Infinity;
        for (const t of W.tribes) {
          if (t.confed === cf || (t.leftAt != null && W.week - t.leftAt < 52) || !nearConfed(W, cf, t, 80000) || (t.confed && t.confed !== cf && W.rand() < 0.6)) continue;
          const op = opinion(cap, t), str = warriors(t);
          if (op > 25 || str * 1.6 > myStr) continue;
          const sc = -op + tribeWealth(t) * 2 - str + (t.leftFrom === cf.id && W.week - t.leftAt < 52 * 8 ? 60 : 0);
          if (sc > ts) { ts = sc; target = t; }
        }
        if (target && realmPressed(W, cf, target)) target = null;
        if (target && isHead(W, king)) { pushEvent(W, { type: 'war', key: target.id, title: 'A war of conquest?', text: `The ${target.name} (${tribeSize(target)} people, ${warriors(target)} warriors) are weaker than your realm. Your warriors could force them to submit and pay tribute — but war costs lives${target.stage === 3 ? ', though their farmers are poor fighters' : ''}, and their allies will hate you for it.`, data: { cf, target }, options: [{ label: `Make war on the ${target.name}`, hint: `Your realm has ${confedTribes(W, cf).reduce((s, x) => s + warriors(x), 0)} warriors; each battle about ${Math.round(battleOdds(W, cf, target) * 100)}% to go your way if it were fought today. One battle a year; they submit after two victories or one crushing one.` }, { label: 'Keep the peace' }] }); }
        else if (target) {
          cf.wars.set(target.id, 0); target.warLosses = 0; warBegin(W, cf, target); if (realmWarcall(W, cf, target)) held = target.id;
          note(W, cf, `${rulerWord(cf)} ${king.name} made war on the ${target.name}.`); note(W, target, `${rulerWord(cf)} ${king.name} of ${cf.name} made war on us.`);
          logEvent(W, `⚔ ${rulerWord(cf)} ${king.name} of ${cf.name} goes to war to subjugate the ${target.name}.`, cf, 'blood');
          for (const o of W.tribes) if (o !== target && isAllied(o, target) && !sameConfed(o, cap)) affect(W, o, cap, -15, `Attacked our allies the ${target.name}`);
        }
      }
      for (const [tid, n] of [...cf.wars]) {
        const t = W.ents.get(tid); if (!t || !t.alive || t.confed === cf) { warOver(W, cf, tid); continue; }
        if (held === tid) continue; // the house of the attacked tribe is still being asked: the first battle waits for the next year
        const b = battle(W, cap, t, cf);
        cf.wars.set(tid, n + 1); { const L = (cf.warLog = cf.warLog || {})[tid] || (cf.warLog[tid] = { from: W.week - n * 52, won: 0, lost: 0 }); if (b.win) L.won++; else L.lost++; }
        if (b.win) {
          t.warLosses++;
          note(W, cf, `Victory over the ${t.name}: ${b.dL} of theirs fell and ${b.aL} of ours.`);
          if (t.warLosses >= 2 || b.r > WAR_CRUSH) {
            warOver(W, cf, tid); joinConfed(W, cf, t, 'subject'); t.warLosses = 0;
            logEvent(W, `The ${t.name} submit to ${rulerMid(cf)} ${king.name} and must pay tribute to ${cf.name} (${b.dL} of the ${t.name} and ${b.aL} of the host fell in the last battle).`, cf, 'king');
          } else logEvent(W, `Battle: ${rulerWord(cf)} ${king.name}'s warriors defeat the ${t.name} (${b.dL} of the ${t.name} and ${b.aL} of the host fell).`, t, 'blood');
        } else {
          { const L = cf.warLog && cf.warLog[tid], P = W.player, pc = L && L.stand != null ? W.ents.get(L.stand) : null, lc = t.headman && t.headman.clan; if (P && !P.over && pc && pc.alive && pc.tribe === t) { P.renown += 2; if (lc) affect(W, lc, pc, 8, `Stood with us against the ${rulerWord(cf).toLowerCase()}`); houseNote(W, `The ${t.name} turned back ${rulerMid(cf, K0)} ${K0.name}'s host, and our men stood in the field. Our house gains 2 renown.`); } }
          note(W, cf, `Defeat at the hands of the ${t.name}: ${b.aL} of ours fell and ${b.dL} of theirs.`);
          logEvent(W, `Battle: the ${t.name} repel ${rulerMid(cf)} ${king.name}'s warriors (${b.aL} of the host and ${b.dL} of the ${t.name} fell; the host may yet return).`, t, 'blood');
          if (n >= 2 || W.rand() < WAR_QUIT) { warOver(W, cf, tid); affect(W, t, cap, 10, `The ${rulerWord(cf).toLowerCase()} gave up ${heHer(king)} war`); logEvent(W, `${rulerWord(cf)} ${king.name} abandons ${heHer(king)} war against the ${t.name}.`, cf, 'king'); }
        }
      }
      cf.peak = Math.max(cf.peak, confedPeople(W, cf));
    }
  }
  function nearConfed(W, cf, t, r) { for (const a of confedTribes(W, cf)) for (const c of a.clans) for (const d of t.clans) if (Math.abs(c.x - d.x) < r && Math.abs(c.y - d.y) < r && Math.hypot(c.x - d.x, c.y - d.y) < r && sameIsland(W, c, d.x, d.y)) return true; return false; }
  // =====================================================================
  //  HOW A CONFEDERACY IS HELD
  //  rule 0: the tribes follow the ruler, and the realm ends with him or her. Rule 1: the tribes choose the next
  //  ruler from their own leaders. Rule 2: the seat passes by blood. After rule 2 a ruler may found a kingdom.
  //  A confederacy from an old save has no rule: it counts as rule 1.
  // =====================================================================
  const REALM_RULES = ['A following', 'The tribes choose', 'By blood'];
  const realmRule = cf => cf.rule == null ? 1 : cf.rule;
  const realmWord = cf => cf && cf.kingdom ? 'kingdom' : 'confederacy';
  const rulerWord = (cf, q) => { if (!cf || !cf.kingdom) return 'High chief'; const p = q || cf.king; return p && p.sex === 'F' ? 'Queen' : 'King'; };
  const rulerMid = (cf, q) => cf && cf.kingdom ? rulerWord(cf, q) : 'high chief'; // before a name in mid-sentence: "high chief Taqmee", "King Taqmee"
  const rulerOf = (cf, q) => `${rulerWord(cf, q).toLowerCase()} of ${cf.name}`;
  const rulerSince = cf => cf.rulerSince != null ? cf.rulerSince : cf.founded;
  const ruleSinceOf = cf => cf.ruleSince != null ? cf.ruleSince : cf.founded;
  const realmMine = (W, cf) => { const P = W.player; return !!(P && !P.over && P.head && P.head.alive && P.head.clan && cf.members.has(P.head.clan.tribe.id)); };
  const heHer = q => q && q.sex === 'F' ? 'her' : 'his', himHer = q => q && q.sex === 'F' ? 'her' : 'him';
  // the sitting leader of a tribe, or failing that its clan head of the greatest standing
  function realmLeader(t, not, W) {
    if (not && W && t.headman === not) { const a = realmAfter(W, t, not); if (a) return a; }
    const ok = q => q && q.alive && q !== not && q.clan && q.clan.tribe === t;
    if (ok(t.headman)) return t.headman;
    let b = null, bp = -1; for (const c of t.clans) if (ok(c.head)) { const p = prestige(c.head); if (p > bp) { bp = p; b = c.head; } }
    return b;
  }
  // the tribes choose: the strongest tribe among the founding and allied ones carries it, with no dice
  function realmChoose(W, cf, old) {
    const all = [], isW = (q, t) => q && q.alive && q.sex === 'M' && q.clan && q.clan.tribe === t && q.age >= 16 && q.age < 50;
    for (const t of confedTribes(W, cf)) {
      const m = cf.members.get(t.id); if (!m || m.status === 'subject') continue;
      const l = realmLeader(t, old, W); if (!l) continue;
      all.push({ who: l, tribe: t, w: Math.max(0, warriors(t) - (isW(old, t) ? 1 : 0)) * tribeVigor(t) * (0.6 + prestige(l)) * (t === cf.capital ? 1.15 : 1) });
    }
    all.sort((a, b) => b.w - a.w); const best = all[0] || null; if (best) best.all = all;
    return best;
  }
  // who would take the seat if the ruler died now (under the rule given, or the confederacy's own): null if the confederacy would end
  function realmHeir(W, cf, rule) {
    const old = cf.king, cap = cf.capital, r = rule == null ? realmRule(cf) : rule;
    if (r === 0 || !old) return null;
    if (r === 2) {
      const S = leaderSex(cap); let who = null, child = false;
      if (cf.heirNamed && cf.heirNamed.alive && cf.heirNamed.clan && cf.heirNamed.clan.tribe === cap) who = cf.heirNamed; // the head of the player's house has just died: the new head follows
      else if (isHead(W, old) && old.clan && old.clan.alive) { const x = clanHeir(W, old.clan, old); if (x && x.clan && x.clan.tribe === cap) who = x; } // the house's own heir, found as the house finds it
      else {
        const pool = cap.clans.flatMap(c => c.people).filter(q => q.alive && !q.slave && q !== old && q.sex === S), byAge = a => a.sort((x, y) => y.age - x.age)[0] || null;
        const kid = q => q.father === old || q.mother === old, sib = q => (old.father && q.father === old.father) || (old.mother && q.mother === old.mother);
        const grand = q => (q.father && (q.father.father === old || q.father.mother === old)) || (q.mother && (q.mother.father === old || q.mother.mother === old));
        const grown = pool.filter(q => !realmChild(q)), young = pool.filter(q => realmChild(q));
        who = byAge(grown.filter(kid)) || byAge(grown.filter(grand)) || (s => byAge(s.filter(q => q.age < 60)) || byAge(s))(grown.filter(sib)) || byAge(young.filter(kid)) || byAge(young.filter(grand));
      }
      if (who) { child = realmChild(who); return { who, how: relWord(who, old), child, tribe: cap, rule: 2, blood: true }; }
      const c = realmChoose(W, cf, old); // no one of the blood: the tribes choose, and the rule falls back
      return c ? { who: c.who, how: `no heir of the blood; leader of the foremost tribe in the choosing, the ${c.tribe.name}`, child: realmChild(c.who), tribe: c.tribe, rule: 1, fallback: true } : null;
    }
    const c = realmChoose(W, cf, old);
    return c ? { who: c.who, how: `leader of the foremost tribe in the choosing, the ${c.tribe.name}`, child: realmChild(c.who), tribe: c.tribe, rule: 1 } : null;
  }
  // the chance that a tribe stays when the ruler dies, given the heir (from realmHeir)
  function realmStay(W, cf, t, H) {
    if (!H) return 0;
    const nc = H.tribe; if (t === nc) return 1;
    const m = cf.members.get(t.id), sub = !!m && m.status === 'subject';
    let base, w, top = 0.95;
    if (H.rule === 2) {
      if (cf.kingdom && !H.child) { base = sub ? 0.85 : 0.97; w = 0.3; top = 0.99; } else { base = sub ? 0.6 : 0.85; w = 0.5; }
      if (H.child) base -= 0.25;
    } else { base = sub ? 0.3 : 0.6; w = 1; }
    const rl = t.rel.get(nc.id), ph = H.child ? 0.6 : prestige(H.who); // a child's want of standing is already paid for by the 0.25
    return clamp(base + (opinion(t, nc) / 200 + (rl ? rl.kin * 0.02 : 0) + (ph - 0.6) * 0.5) * w, 0.05, top);
  }
  function succession(W, cf) {
    const old = cf.king, rule = realmRule(cf), word = rulerWord(cf, old), P = W.player, mine = realmMine(W, cf), myT = mine ? P.head.clan.tribe : null, nm = cf.name;
    const H = realmHeir(W, cf);
    if (!H) {
      dissolveConfed(W, cf, rule === 0 ? `${word} ${old.name} died, and the tribes had followed ${heHer(old)} person and not the seat, so each went its own way` : `${word} ${old.name} died with no one to take ${heHer(old)} place`);
      if (mine) houseNote(W, `${word} ${old.name} of ${nm} died, and the confederacy ended.`);
      return;
    }
    const gone = [], was = cf.capital;
    for (const t of confedTribes(W, cf)) { if (t === H.tribe) continue; if (W.rand() > realmStay(W, cf, t, H)) gone.push(t); }
    cf.king = H.who; cf.kings.push(H.who.name); cf.capital = H.tribe; H.tribe.headman = H.who; cf.rulerSince = W.week;
    const mm = cf.members.get(H.tribe.id); if (mm) mm.status = 'core';
    const nw = rulerWord(cf, H.who), kid = H.child ? ' (still a child)' : '';
    note(W, cf, `${word} ${old.name} died; ${H.who.name}, ${H.how}, took the seat${H.tribe !== was ? ` and the seat moved to the ${H.tribe.name}` : ''}${kid}.`);
    for (const t of gone) { t.leftFrom = cf.id; t.leftAt = W.week; t.confed = null; cf.members.delete(t.id); note(W, t, `Broke away from ${nm} on the death of ${rulerMid(cf, old)} ${old.name}.`); }
    if (H.fallback) { cf.rule = 1; cf.ruleSince = W.week; note(W, cf, 'With no heir of the blood, the tribes chose, and the seat is held by their choice from now on.'); }
    if (cf.members.size < 2) { dissolveConfed(W, cf, `${word} ${old.name} died and the tribes went their own ways`); if (mine) houseNote(W, `${word} ${old.name} died, and the realm fell apart.`); return; }
    if (H.rule === 1) cf.chose = (cf.chose || 0) + 1;
    logEvent(W, `${word} ${old.name} of ${nm} is dead. ${H.who.name}, ${H.how}${kid}, takes the seat as ${nw.toLowerCase()}${H.fallback ? ' (no heir of the blood, so the tribes chose, and the realm is held by their choice from now on)' : ''}${gone.length ? ` — but ${gone.map(t => 'the ' + t.name).join(', ')} break away` : ' and the tribes hold together'}.`, cf, 'king');
    if (mine) {
      const left = gone.includes(myT);
      houseNote(W, `${word} ${old.name} of ${nm} died. ${H.who.name}, ${H.how}, now holds the seat${left ? ', and our people broke away' : ''}.`);
      if (left) notice(W, `The ${myT.name} break away`, `${word} ${old.name} is dead and the ${myT.name} will not follow ${H.who.name}. They stand alone again.`);
    }
    if (H.fallback && mine) houseNote(W, 'There was no heir of the blood, so the tribes chose.');
  }
  // =====================================================================
  //  REALM FIXES: subjects, risings, tribute, leaving, who would follow, what the war list shows, what the house is told
  // =====================================================================
  const REALM_CHILD = 16; // a child heir is one under sixteen, here and on the house's own succession card
  const realmChild = q => !!q && q.age < REALM_CHILD;
  let REALM_SENT = null, REALM_QUIET = false; // what a kingdom's tribes sent this year (a tribe's tribute is told once); and "the player decided this, no notice"
  const realmCap = s => s[0].toUpperCase() + s.slice(1);
  const realmPlayerTribe = W => { const P = W.player; return P && !P.over && P.head && P.head.alive && P.head.clan ? P.head.clan.tribe : null; };
  const realmSubj = (cf, t) => { const m = cf.members.get(t.id); return !!m && m.status === 'subject'; };
  const realmDays = (rc, x) => { const d = Math.round(x / Math.max(1, needsWeek(rc) / 7)); return d < 1 ? 'a little food' : `food for ${d} day${d > 1 ? 's' : ''}`; };
  const realmTitle = (W, cf) => { const P = W.player, K = cf.king; if (P && !P.over && P.head === K && P.heads.length) P.heads[P.heads.length - 1].rw = rulerWord(cf, K).toLowerCase(); };
  // a tribe that joins a realm is at peace with every tribe of it, and the realm's war on it is over
  function realmPeace(W, cf, t) {
    for (const id of cf.members.keys()) { const o = W.ents.get(id); if (o && o !== t) { t.atWar.delete(o.id); o.atWar.delete(t.id); } }
    warOver(W, cf, t.id); t.warLosses = 0;
  }
  // the strength of the realm's host (without one tribe), as battle() weighs it; and of a tribe that stands alone against it
  const realmHost = (W, cf, skip) => confedTribes(W, cf).reduce((s, x) => { if (x === skip) return s; const st = cf.members.get(x.id).status; return s + warriors(x) * tribeVigor(x) * (st === 'core' ? 1 : st === 'ally' ? 0.6 : 0.4); }, 0);
  const realmHold = (W, cf, t) => { let s = warriors(t) * tribeVigor(t); for (const o of W.tribes) if (o !== t && isAllied(o, t) && !sameConfed(o, cf.capital)) s += warriors(o) * 0.4; return s; };
  // the chance the host puts a rising down (the same number is shown and rolled); a tribe's chance to win free is the rest
  const realmPutDown = (W, cf, t) => { const a = realmHost(W, cf, t), d = realmHold(W, cf, t); return clamp(a / Math.max(1, a + d), 0.1, 0.9); };
  const realmRiseOdds = (W, cf, t) => 1 - realmPutDown(W, cf, t);
  // how likely a tribe is to rise (a subject) or to leave (a free member) this year, and why. Rare, and never without a cause.
  function realmRisk(W, cf, t, m) {
    const cap = cf.capital, K = cf.king, subj = m.status === 'subject', why = []; let p = 0;
    if (t === cap || m.status === 'core' || (m.calmUntil || 0) > W.week || W.week - m.joined < 52 * 3) return { p: 0, why };
    const op = opinion(t, cap);
    if (subj && !(m.light > W.week) && op < -30) { p += 0.01 + (-op - 30) / 2000; why.push('the weight of the tribute'); }
    if (!subj && op < -25) { p += 0.01 + (-op - 25) / 2000; why.push(`ill feeling toward the ${cap.name}`); }
    if (prestige(K) < 0.45) { p += 0.015; why.push('a weak ruler'); }
    if (W.week - rulerSince(cf) < 52 * 3) { p += 0.02; why.push('a new ruler'); }
    if (cf.lostAt != null && W.week - cf.lostAt < 52 * 3) { p += 0.03; why.push(`the losses of the ${cap.name}`); }
    if (!why.length) return { p: 0, why };
    if (realmHold(W, cf, t) < 0.25 * realmHost(W, cf, t)) p *= 0.3; // too weak to hope
    return { p: clamp(p, 0, 0.15), why };
  }
  function realmLoss(W, t, frac) {
    const men = []; for (const c of t.clans) for (const q of c.people) if (q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50) men.push([c, q]);
    const n = Math.round(men.length * frac); let k = 0;
    for (let i = 0; i < n && men.length; i++) { const [c, q] = men.splice(Math.floor(W.rand() * men.length), 1)[0]; die(W, c, q, 'killed in battle'); c.yr.killed++; k++; }
    for (const c of t.clans) c.people = c.people.filter(q => q.alive);
    return k;
  }
  // a rising: the ruler's answer (0 march on them, 1 let them go, 2 lighten the tribute, or for a free member send gifts). The same code for the world's rulers and the player's.
  function realmRiseDo(W, cf, t, how, odds, whyList) {
    const K = cf.king, cap = cf.capital, m = cf.members.get(t.id); if (!m) return null;
    const subj = m.status === 'subject', why = whyList && whyList.length ? whyList.join(', ') : 'old grievances', rm = rulerMid(cf, K), mine = realmMine(W, cf);
    const leave = (hn) => { t.leftFrom = cf.id; t.leftAt = W.week; leaveConfed(W, t, subj ? 'a rising' : 'left'); };
    let chron, own, title;
    if (how === 0) {
      const win = W.rand() < odds, dL = realmLoss(W, t, win ? 0.08 + W.rand() * 0.1 : 0.04 + W.rand() * 0.05), aL = realmLoss(W, cap, win ? 0.03 + W.rand() * 0.04 : 0.06 + W.rand() * 0.08);
      if (win) {
        m.calmUntil = W.week + 52 * (8 + Math.floor(W.rand() * 5)); affect(W, t, cap, -12, 'Their rising was put down', 8);
        chron = `Revolt! The ${t.name} rose against ${rm} ${K.name} (${why}) and were put down: ${dL} of the ${t.name} and ${aL} of the host fell. They keep their place, and will not rise again for some years.`;
        own = `The ${t.name} are put down: ${dL} of theirs fell and ${aL} of ours. They keep their place and will not rise again for some years. The chance was about ${Math.round(odds * 100)}%.`; title = 'The rising is put down';
      } else {
        affect(W, t, cap, -15, 'The rising was not put down', 15); leave();
        chron = `Revolt! The ${t.name} rose against ${rm} ${K.name} (${why}), and the host could not put them down: ${dL} of the ${t.name} and ${aL} of the host fell, and the ${t.name} are free.`;
        own = `The host fails: ${dL} of theirs fell and ${aL} of ours, and the ${t.name} are free of you and hate you. The chance to put them down was about ${Math.round(odds * 100)}%.`; title = 'The rising wins free';
      }
    } else if (how === 1) {
      affect(W, t, cap, 6, 'Let go in peace'); leave();
      chron = `${realmCap(rm)} ${K.name} let the ${t.name} go (${why}).`; own = `You let the ${t.name} go in peace. The realm is the smaller for it, and they do not hate you.`; title = 'They are let go';
    } else if (subj) {
      m.light = W.week + 52 * 10; m.calmUntil = W.week + 52 * 8; affect(W, t, cap, 12, 'Their tribute was lightened'); K.giftPrestige = (K.giftPrestige || 0) - 0.03;
      chron = `${realmCap(rm)} ${K.name} lightened the tribute of the ${t.name} (${why}).`; own = `The ${t.name} pay half the tribute for ten years, and keep quiet for eight. Some think you weak for it (standing falls a little).`; title = 'The tribute is lightened';
    } else {
      const rc = K.clan, g = rc ? GIFTABLE.find(x => rc.goods[x] > 0) : null; if (g) rc.goods[g]--; if (rc) eatStore(rc, needsWeek(rc) * 2);
      m.calmUntil = W.week + 52 * 8; affect(W, t, cap, 15, 'Gifts to keep us');
      chron = `${realmCap(rm)} ${K.name} sent gifts to the ${t.name}, who had thought of leaving (${why}).`; own = `Gifts${g ? ' of ' + GOOD_NAMES[g].toLowerCase() : ''} and two weeks of your clan's food go to the ${t.name}. They stay, and will not speak of leaving for eight years.`; title = 'Gifts to keep them';
    }
    note(W, cf, chron); logEvent(W, chron, cf, 'blood');
    if (mine && !isHead(W, K)) houseNote(W, chron);
    return { title, text: own, house: own };
  }
  function realmRise(W, cf, t, m, risk) {
    const K = cf.king, cap = cf.capital, subj = m.status === 'subject', odds = realmPutDown(W, cf, t), pct = Math.round(odds * 100);
    if (isHead(W, K)) {
      m.calmUntil = W.week + 52 * 2; // while the card waits
      pushEvent(W, { type: 'rising', key: t.id, title: subj ? `The ${t.name} rise against you` : `The ${t.name} would leave`, text: `The ${t.name} (${tribeSize(t)} people, ${warriors(t)} warriors) are restless under the ${cap.name}: ${risk.why.join(', ')}. They mean to ${subj ? 'throw off your rule' : 'leave the realm'}. Your host has ${confedTribes(W, cf).reduce((s, x) => s + warriors(x), 0)} warriors.`, data: { cf, t, odds, why: risk.why },
        options: [{ label: `March on them`, hint: `About ${pct}% to put them down. Warriors will fall on both sides; if you fail they are free and hate you` }, { label: 'Let them go', hint: 'They leave in peace, and the realm is the smaller' }, subj ? { label: 'Lighten the tribute', hint: 'They pay half for ten years and keep quiet for eight; some think you weak' } : { label: 'Send gifts', hint: 'A valuable and two weeks of your clan\'s food; they stay for eight years' }] });
      return;
    }
    const how = risk.why.includes('the weight of the tribute') && W.rand() < 0.25 ? 2 : odds >= 0.4 ? 0 : 1;
    realmRiseDo(W, cf, t, how, odds, risk.why);
  }
  function realmRiseAnswer(W, ev, k) {
    const { cf, t, odds, why } = ev.data; if (!cf.alive || !t.alive || !cf.members.has(t.id)) return;
    const R = realmRiseDo(W, cf, t, k, odds, why); if (!R) return; houseNote(W, R.house); W.lastResult = { title: R.title, text: R.text };
  }
  // the tribute of one subject, to the ruler's clan, as before (and half of it while it is lightened); told once a year in realmTributeNote
  function realmPay(W, cf, t, m, tl) {
    const to = cf.king.clan, from = t.clans.length ? pick(t.clans, W.rand) : null, light = m.light > W.week, gave = []; let food = 0;
    for (const g of ['amber', 'axe', 'salt', 'ochre', 'flint']) if (from && to && from.goods[g] > 0 && W.rand() < (light ? 0.25 : 0.5)) { from.goods[g]--; to.goods[g] = Math.min(10, to.goods[g] + 1); gave.push((GOOD_NAMES[g] || g).toLowerCase()); }
    if (from && to) { const f = from.store * (light ? REALM_TRIB / 2 : REALM_TRIB); from.store -= f; to.store += f; food = f; }
    affect(W, t, cf.capital, light ? -1 : -4, `Tribute paid to the ${rulerWord(cf).toLowerCase()}`);
    tl.push({ t, food, gave });
  }
  function realmTributeNote(W, cf, tl) {
    const K = cf.king, rc = K && K.clan, P = W.player, myT = realmPlayerTribe(W), sent = REALM_SENT || new Map(); REALM_SENT = null;
    if (!tl.length || !rc || !P || P.over) return;
    const line = x => { const fd = x.food + (sent.get(x.t.id) || 0), parts = []; if (fd > 0) parts.push(realmDays(rc, fd)); if (x.gave.length) parts.push(x.gave.join(', ')); return `the ${x.t.name} (${parts.join(', ') || 'nothing: they had little to give'})`; };
    if (P.head === K) houseNote(W, `Tribute came to the ${rc.name} clan from our subjects: ${tl.map(line).join('; ')}.`);
    else { const mine = tl.find(x => x.t === myT); if (mine) houseNote(W, `The ${myT.name} sent tribute to ${rulerMid(cf, K)} ${K.name}: ${line(mine).replace(/^the [^(]*\(/, '').replace(/\)$/, '')}.`); }
  }
  function realmRisings(W, cf, tl) {
    const myT = realmPlayerTribe(W), cap = cf.capital, w = warriors(cap);
    if (cf.capW != null && cf.capW >= 5 && w <= cf.capW * 0.8) cf.lostAt = W.week; cf.capW = w;
    for (const t of confedTribes(W, cf)) {
      if (!cf.alive) return; const m = cf.members.get(t.id); if (!m || t === cap || m.status === 'core' || t === myT) continue;
      const r = realmRisk(W, cf, t, m); if (r.p > 0 && W.rand() < r.p) realmRise(W, cf, t, m, r);
    }
    if (cf.alive) realmTributeNote(W, cf, tl); else REALM_SENT = null;
  }
  // ---- the player's own tribe: asked, or told, when it is taken into a realm, pressed to submit, or let go ----
  function realmInvite(W, cf, t) { // true when the matter is in the player's hands (a card, or put off), false when the tribe's own leader may simply decide
    const P = W.player, myT = realmPlayerTribe(W); if (!myT || t !== myT || P.head !== t.headman) return false;
    if (W.week - (P.lastInvite || -1e9) < 52 * 5) return true;
    P.lastInvite = W.week; const K = cf.king;
    pushEvent(W, { type: 'realminvite', key: cf.id, title: `${realmCap(cf.name)} asks the ${t.name}`, text: `${K.name}, ${rulerOf(cf, K)}, asks the ${t.name} to join ${cf.name} as an ally. ${cf.members.size} tribes, ${confedPeople(W, cf)} people and ${confedTribes(W, cf).reduce((s, x) => s + warriors(x), 0)} warriors stand with ${heHer(K)}. An ally keeps its own leaders and sends no tribute, but fights for the realm, and when the ${rulerWord(cf).toLowerCase()} dies it may stay or go. You may leave later (under Act).`, data: { cf, t },
      options: [{ label: 'Join as an ally', hint: `The ${t.name} become a member of ${cf.name}` }, { label: 'Refuse', hint: `They think a little less of us; they will not ask again for five years` }] });
    return true;
  }
  function realmInviteAnswer(W, ev, k) {
    const { cf, t } = ev.data, P = W.player; P.lastInvite = W.week; if (!cf.alive || !t.alive || t.confed) return;
    if (k === 0) { REALM_QUIET = true; joinConfed(W, cf, t, 'ally'); REALM_QUIET = false; logEvent(W, `The ${t.name} join ${cf.name} at the asking of ${rulerMid(cf)} ${cf.king.name}.`, cf, 'king'); houseNote(W, `${P.head.name} took the ${t.name} into ${cf.name}, as an ally.`); W.lastResult = { title: 'The tribes are one', text: `The ${t.name} are allies of ${cf.name} now.` }; }
    else { affect(W, cf.capital, t, -4, 'Refused to join'); houseNote(W, `${P.head.name} refused to bring the ${t.name} into ${cf.name}.`); }
  }
  function realmPressed(W, cf, t) { // the realm marches on the player's tribe: true when the player has been asked (or the matter is put off)
    const P = W.player, myT = realmPlayerTribe(W); if (!myT || t !== myT) return false;
    const K = cf.king;
    if (P.head !== t.headman) return false; // the house is asked in realmWarcall, once the war has begun
    if (W.week - (P.lastPressed || -1e9) < 52 * 4) return true;
    P.lastPressed = W.week; const odds = realmRiseOdds(W, cf, t), host = confedTribes(W, cf).reduce((s, x) => s + warriors(x), 0);
    pushEvent(W, { type: 'pressed', key: cf.id, title: `${realmCap(cf.name)} marches on the ${t.name}`, text: `${realmCap(rulerMid(cf, K))} ${K.name} of ${cf.name} comes against the ${t.name} with ${host} warriors. You have ${warriors(t)}. You may bow now and pay tribute, or stand and fight.`, data: { cf, t, odds },
      options: [{ label: 'Submit', hint: `The ${t.name} become subjects and pay tribute each year; no blood is shed` }, { label: 'Stand and fight', hint: `About ${Math.round(odds * 100)}% to turn them back. If we fail, our men die and we submit all the same` }] });
    return true;
  }
  function realmWarcall(W, cf, t) { // a realm marches on the tribe of the player's house and the head of the house is not its leader: the house is asked whether its men stand with the tribe
    const P = W.player, myT = realmPlayerTribe(W); if (!myT || t !== myT || P.head === t.headman || !P.head.clan) return false;
    if (!warriorsOf(P.head.clan)) return false; // no men of fighting age: nothing to ask
    if (t.headman && t.headman.clan === P.head.clan) { houseNote(W, `${realmCap(rulerMid(cf, cf.king))} ${cf.king.name} of ${cf.name} marched on the ${t.name}. ${t.headman.name}, of our own clan, leads the tribe, and our men follow ${himHer(t.headman)} to the field.`); return false; }
    const K = cf.king, pc = P.head.clan, host = confedTribes(W, cf).reduce((s, x) => s + warriors(x), 0), lead = t.headman ? `${t.headman.name}, who leads us, will meet them in the field.` : 'Those who lead us will meet them in the field.';
    const withUs = Math.round((1 - battleOdds(W, cf, t)) * 100), without = Math.round((1 - battleOdds(W, cf, t, pc)) * 100);
    pushEvent(W, { type: 'warcall', key: t.id, title: `War on the ${t.name}`, text: `${realmCap(rulerMid(cf, K))} ${K.name} of ${cf.name} marches on the ${t.name} with ${host} warriors. ${lead} The ${pc.name} clan has ${warriorsOf(pc) === 1 ? '1 man of fighting age. Shall he go?' : `${warriorsOf(pc)} men of fighting age. Shall they go?`}`, data: { cf, t, clan: pc },
      options: [{ label: 'Send our men to stand with the tribe', hint: `Each battle about ${withUs}% to go our way, as things stand. In a battle lost, ${warFall(WAR_DLOSS_LOST)} of the men who fight may fall; in a battle won, ${warFall(WAR_DLOSS_WON)}.` }, { label: 'Keep our men at home', hint: `None of ours can fall. Each battle about ${without}% without our men, as things stand; the other clans will not forget it.` }] });
    return true;
  }
  function realmWarcallAnswer(W, ev, k) {
    const { cf, t, clan } = ev.data, P = W.player;
    if (!cf.alive || !t.alive || !cf.wars.has(t.id)) { const tx = `The war on the ${t.name} was over before the ${clan.name} clan's men were called.`; houseNote(W, tx); W.lastResult = { title: 'Too late', text: tx }; return; }
    const L = cf.warLog && cf.warLog[t.id]; if (!L) { const tx = `The war on the ${t.name} was over before the ${clan.name} clan's men were called.`; houseNote(W, tx); W.lastResult = { title: 'Too late', text: tx }; return; }
    if (k === 0) { L.stand = clan.id; const tx = `${P.head.name} sent the ${clan.name} clan's men to stand with the ${t.name} against ${rulerMid(cf)} ${cf.king.name}.`; houseNote(W, tx); W.lastResult = { title: 'Our men march', text: `${tx} The chance of each battle going our way is about ${Math.round((1 - battleOdds(W, cf, t)) * 100)}%.` }; return; }
    const odds = Math.round((1 - battleOdds(W, cf, t, clan)) * 100); L.hold = (L.hold || []).filter(id => id !== clan.id).concat(clan.id);
    for (const o of t.clans) if (o !== clan) affect(W, o, clan, -12, `Kept its men at home when the realm marched`);
    const tx = `${P.head.name} kept the ${clan.name} clan's men at home while the ${t.name} faced ${rulerMid(cf)} ${cf.king.name}. The other clans will not forget it.`; houseNote(W, tx); W.lastResult = { title: 'Our men stay home', text: `${tx} The chance of each battle going our way is about ${odds}%, without our men.` };
  }
  function realmPressedAnswer(W, ev, k) {
    const { cf, t, odds } = ev.data, P = W.player; if (!cf.alive || !t.alive || t.confed) return;
    const K = cf.king, cap = cf.capital; let win = false, dL = 0, aL = 0;
    if (k === 1) { win = W.rand() < odds; dL = realmLoss(W, t, win ? 0.06 + W.rand() * 0.06 : 0.1 + W.rand() * 0.1); aL = realmLoss(W, cap, win ? 0.08 + W.rand() * 0.08 : 0.03 + W.rand() * 0.04); }
    if (win) { affect(W, t, cap, -10, 'We turned them back', 6); const tx = `The ${t.name} turned back ${rulerMid(cf, K)} ${K.name}: ${dL} of ours fell and ${aL} of theirs. We stay free.`; logEvent(W, `The ${t.name} turn back ${rulerMid(cf, K)} ${K.name}'s warriors (${dL} of the ${t.name} and ${aL} of the host fell).`, t, 'blood'); houseNote(W, tx); W.lastResult = { title: 'Turned back', text: `${tx} The chance was about ${Math.round(odds * 100)}%.` }; return; }
    REALM_QUIET = true; joinConfed(W, cf, t, 'subject'); REALM_QUIET = false;
    const tx = k === 1 ? `The ${t.name} fought and were beaten (${dL} of ours fell and ${aL} of theirs) and bowed to ${K.name}.` : `The ${t.name} bowed to ${K.name} without a fight.`;
    logEvent(W, `The ${t.name} submit to ${rulerMid(cf, K)} ${K.name} and must pay tribute to ${cf.name}.`, cf, 'king'); houseNote(W, tx); W.lastResult = { title: 'The ' + t.name + ' submit', text: `${tx} They pay tribute each year.${k === 1 ? ` The chance of turning them back was about ${Math.round(odds * 100)}%.` : ''}` };
  }
  function realmTold(W, cf, t, status) { // the tribe of the player's house joins or submits without the player deciding: the house is told who decided
    if (REALM_QUIET) return; const myT = realmPlayerTribe(W); if (!myT || t !== myT) return;
    const P = W.player, who = t.headman && t.headman !== P.head ? `${t.headman.name}, who leads the ${t.name}, ` : `Those who lead the ${t.name} `, K = cf.king;
    const tx = status === 'subject' ? `${who}bowed to ${rulerMid(cf, K)} ${K.name} of ${cf.name}. The ${t.name} are now subjects and pay tribute. Each year one of their clans, drawn by lot, must give the ${K.clan ? K.clan.name + ' clan' : 'ruling clan'} ${Math.round(REALM_TRIB * 100)}% of its stored food and, of each of amber, axes, salt, ochre and flint it holds, one piece at an even chance.` : `${who}took the ${t.name} into ${cf.name} under ${rulerMid(cf, K)} ${K.name}.`;
    houseNote(W, tx); notice(W, status === 'subject' ? `The ${t.name} are made subjects` : `The ${t.name} join ${cf.name}`, tx);
  }
  function realmDropped(W, cf, t, why) {
    if (REALM_QUIET) return; const myT = realmPlayerTribe(W); if (!myT || t !== myT) return;
    const tx = `The ${t.name} are no longer part of ${cf.name}${why ? ` (${why})` : ''}.`; houseNote(W, tx); notice(W, `The ${t.name} leave ${cf.name}`, tx);
  }
  // what becomes of a realm's wars and alliances when it ends: the wars end with it; alliances sworn by oath stand; tribes that were only members are free
  function realmEnding(W, cf, why) {
    const myT = realmPlayerTribe(W); if (!myT || !cf.members.has(myT.id)) return;
    const wars = [...cf.wars.keys()].map(id => W.ents.get(id)).filter(Boolean), sworn = [], loose = [], n = a => a.map(x => 'the ' + x).join(', ');
    for (const o of confedTribes(W, cf)) { if (o === myT) continue; const r = myT.rel.get(o.id); (r && r.allied ? sworn : loose).push(o.name); }
    const tx = `${realmCap(cf.name)} is ended (${why}). ${wars.length ? `Its ${wars.length > 1 ? 'wars' : 'war'} on ${n(wars.map(o => o.name))} ended with it. ` : ''}${sworn.length ? `The alliances sworn with ${n(sworn)} stand.` : 'No alliance had been sworn with any of its tribes.'}${loose.length ? ` ${realmCap(n(loose))} joined it without an oath and are no longer our allies.` : ''}`;
    houseNote(W, tx); notice(W, `${realmCap(cf.name)} ends`, tx);
  }
  const realmWarAllies = (W, cf, target) => { for (const o of W.tribes) if (o !== target && isAllied(o, target) && !sameConfed(o, cf.capital)) affect(W, o, cf.capital, -15, `Attacked our allies the ${target.name}`); };
  // the peoples the ruler knows of, nearest first: those the host may march on, and why it may not march on the others
  function realmWarList(W, cf) {
    const cap = cf.capital, K = cf.king, host = confedTribes(W, cf).reduce((s, x) => s + warriors(x), 0), ok = [], no = [], c0 = K && K.clan ? K.clan : cap.clans[0];
    const km = o => { let b = Infinity; for (const a of confedTribes(W, cf)) for (const c of a.clans) for (const d of o.clans) { const x = Math.hypot(c.x - d.x, c.y - d.y); if (x < b) b = x; } return Math.round(b / 1000); };
    for (const o of W.tribes) {
      if (!o.alive || !o.clans.length || o === cap || !knowsTribe(W, o)) continue;
      const k = km(o), row = { o, km: k };
      if (o.confed === cf) { no.push(Object.assign(row, { why: `already of your realm, ${cf.members.get(o.id).status === "ally" ? "an ally" : "a " + cf.members.get(o.id).status}` })); continue; }
      if (!nearConfed(W, cf, o, 90000)) { no.push(Object.assign(row, { why: k <= 90 ? `across the water, ${k} km` : `too far, ${k} km; the host goes no further than 90` })); continue; }
      if (o.leftAt != null && W.week - o.leftAt < 52) { no.push(Object.assign(row, { why: 'they left a realm only lately; the host will not march within the year' })); continue; }
      if (cf.wars.has(o.id)) { no.push(Object.assign(row, { why: 'already at war with them' })); continue; }
      const tc = tribeCenter(o), dir = c0 ? compass(tc[0] - c0.x, tc[1] - c0.y) : '', ow = warriors(o), oc = o.confed;
      row.hint = `${tribeSize(o)} people · ${ow} warriors (your host has ${host}) · ${k} km ${dir}${o.stage === 3 ? ' · farmers' : ''} · ${ow * 1.6 > host ? 'stronger than your host can be sure of beating' : 'weaker than your host'} · each battle about ${Math.round(battleOdds(W, cf, o) * 100)}% to go your way if it were fought today${oc ? ` · of ${oc.name}: its tribes will fight beside them and its people will hate you for it; if they are beaten they leave it${oc.capital === o ? ', and it would fall apart' : ''}` : ''}`;
      ok.push(row);
    }
    ok.sort((a, b) => a.km - b.km); no.sort((a, b) => a.km - b.km);
    return { ok, no, host };
  }
  // ---- who would follow ----
  // the leader a tribe would have if `old` (its present leader) died: as updateLeaders finds one, by standing and the weight of the clan
  function realmAfter(W, t, old) {
    const ls = leaderSex(t), la = ls === 'F' ? 30 : 25, heads = [];
    for (const c of t.clans) {
      let h = c.head;
      if (!h || h === old || !h.alive) {
        let b = null, bp = -1; for (const q of c.people) if (q !== old && q.alive && q.sex === ls && !q.slave && q.age >= la) { const p = prestige(q); if (p > bp) { bp = p; b = q; } }
        if (!b) for (const q of c.people) if (q !== old && q.alive && !q.slave && q.age >= 20) { const p = prestige(q); if (p > bp) { bp = p; b = q; } }
        if (ruleOf(c) === 2) { const hh = ruleHeir(W, c, old || h); if (hh) b = hh.who; } // a clan that keeps its seat in one house
        if (c.favored && c.favored.alive && c.favored !== old && c.favored.clan === c) b = c.favored;
        h = b;
      }
      if (h) heads.push(h);
    }
    if (t.favored && t.favored.alive && t.favored !== old && t.favored.clan && t.favored.clan.tribe === t) return t.favored;
    if (ruleOf(t) === 2 && t.seat != null) { const h = heads.find(x => x.clan && x.clan.id === t.seat); if (h) return h; }
    let hb = null, hp = -1; for (const h of heads) { const p = (prestige(h) + (h.clan.head !== h && h.clan.treasures ? Math.min(0.15, 0.05 * h.clan.treasures.length) : 0)) * (1 + // a head's standing counts the clan's treasures, so a clan's new head is weighed as head
       (h.clan.people.length - (old && old.alive && old.clan === h.clan ? 1 : 0)) / 60); if (p > hp) { hp = p; hb = h; } }
    return hb;
  }
  // a feast of eight weeks of the clan's food. A clan that lives from the day's catch keeps about a week in store at best, so a well fed one
  // may pay with a lean season: it spends what it keeps and the rest is taken from its own condition
  function realmFeastNeed(c) {
    const base = 'Food for a great feast: eight weeks of the clan\'s food'; if (!c) return { text: base, ok: false };
    const wk = needsWeek(c), have = c.store + (c.grain || 0), days = Math.round(have / Math.max(1, wk / 7)), lean = c.live !== 'farm' && c.cond >= 0.85 && have >= wk;
    return { text: `${base} (${days} day${days === 1 ? '' : 's'} kept${have >= wk * 8 ? '' : c.live !== 'farm' ? '; a clan that lives from the day\'s catch may pay the rest with a lean season if it is well fed and keeps a week' : ''})`, ok: have >= wk * 8 || lean };
  }
  function realmFeastPay(c) { const wk = needsWeek(c), feast = wk * 8, have = c.store + (c.grain || 0), got = Math.min(have, feast); eatStore(c, got); if (got < feast) c.cond = Math.max(0.5, c.cond - 0.2 * (feast - got) / feast); }
  // the ruler's own tribe sees where its leader stands in the choosing, and the way to win the seat
  function realmChoosingText(W, cf, ch) {
    const myT = realmPlayerTribe(W), K = cf.king; if (!myT || !cf.members.has(myT.id) || myT === cf.capital) return '';
    if (realmSubj(cf, myT)) return ' As subjects, your people have no voice in the choosing.';
    const i = ch.findIndex(x => x.tribe === myT); if (i < 0) return '';
    const ord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][i] || `number ${i + 1}`;
    return i === 0 ? ` Your people stand first in the choosing: if ${K.name} died today, ${ch[0].who.name} would take the seat.` : ` Your people stand ${ord} in the choosing (weight ${ch[i].w.toFixed(1)} against ${ch[0].w.toFixed(1)} for the ${ch[0].tribe.name}). More warriors in good heart, or a leader of higher standing, would raise it.`;
  }
  // the head of the player's house has died and a new head is named: if the old head ruled a confederacy, the seat is settled at once
  function realmHouseDeath(W, old, heir) {
    const cf = old.clan && old.clan.tribe && old.clan.tribe.confed;
    if (!cf || !cf.alive || cf.king !== old) return;
    cf.heirNamed = heir; succession(W, cf); delete cf.heirNamed;
  }
  // a great hall or a monument at the ruler's village
  function realmHallOrMon(W, cf) {
    const c = cf.king && cf.king.clan; if (!c || !c.settled) return false; // a camp of foragers has neither
    if (c.works && c.works.hall) return true;
    return (W.monuments || []).some(m => m.alive !== false && m.faith && m.tribe === cf.capital.id && Math.hypot(m.x - c.x, m.y - c.y) < 30000);
  }
  // the chance that a step along the spectrum is won: the member tribes' feeling toward the ruling tribe (weighted by people), the ruler's standing and the years ruled
  function realmOdds(W, cf, r) {
    const cap = cf.capital; let w = 0, s = 0;
    for (const t of confedTribes(W, cf)) { if (t === cap) continue; const n = Math.max(1, tribeSize(t)); w += n; s += opinion(t, cap) * n; }
    const feel = w ? s / w : 0, yrs = (W.week - rulerSince(cf)) / 52, pr = prestige(cf.king);
    return r === 0 ? clamp(0.25 + feel / 200 + (pr - 0.6) * 0.4 + Math.min(0.15, Math.max(0, yrs - 5) * 0.01), 0.05, 0.85)
      : clamp(0.1 + feel / 250 + (pr - 0.6) * 0.3 + Math.min(0.1, Math.max(0, yrs - 10) * 0.01), 0.03, 0.6);
  }
  const realmLast = (W, cf, id) => { let l = cf.triedAt != null ? cf.triedAt : -1e9; const P = W.player; if (P && P.cool && P.cool[id] != null && P.cool[id] >= cf.founded && P.head === cf.king) l = Math.max(l, P.cool[id]); return l; };
  // the next step along the spectrum (or null at rule 2): its needs are what decides whether it may be tried
  function realmNext(W, cf) {
    const r = realmRule(cf); if (r >= 2) return null;
    const id = r === 0 ? 'bindseat' : 'bloodseat', yr = (W.week - rulerSince(cf)) / 52, needs = [];
    if (r === 0) needs.push({ text: `Five years as ruler (${Math.floor(yr)} so far)`, ok: yr >= 5 });
    else {
      const yh = (W.week - ruleSinceOf(cf)) / 52, chose = (cf.chose || 0) >= 1;
      needs.push({ text: chose ? 'The tribes have chosen once and held together' : `The tribes choosing for ten years (${Math.floor(yh)} so far), or once and held together`, ok: yh >= 10 || chose });
      const H = realmHeir(W, cf, 2), blood = !!(H && H.blood && !H.child);
      needs.push({ text: blood ? `A grown heir of the blood: ${H.who.name}` : H && H.blood ? `A grown heir of the blood (${H.who.name} is still a child)` : 'A grown heir of the blood', ok: blood });
      needs.push({ text: 'A great hall in the ruler\'s village, or a monument of the ruling tribe standing near it', ok: realmHallOrMon(W, cf) });
    }
    const last = realmLast(W, cf, id), wait = 5 - (W.week - last) / 52;
    if (last > -1e8) needs.push({ text: wait > 0 ? `Five years since the last try (${Math.ceil(wait)} more)` : 'Five years since the last try', ok: wait <= 0 });
    return { id, label: r === 0 ? 'Bind the tribes to the seat' : 'Make the seat pass by blood', needs, odds: realmOdds(W, cf, r) };
  }
  function realmKingdomNeeds(W, cf) {
    const cap = cf.capital, K = cf.king, c = K && K.clan, n = cf.members.size, ppl = confedPeople(W, cf), yr = (W.week - cf.founded) / 52, succ = Math.max(0, cf.kings.length - 1);
    const feast = c ? needsWeek(c) * 8 : 0, have = c ? c.store + (c.grain || 0) : 0;
    return [
      { text: 'The seat passing by blood', ok: realmRule(cf) === 2 },
      { text: `Three tribes or more (${n})`, ok: n >= 3 },
      { text: `400 people or more (${ppl})`, ok: ppl >= 400 },
      { text: succ >= 1 ? 'One ruler already succeeded' : `Fifteen years standing (${Math.floor(yr)} so far), or one ruler succeeded`, ok: yr >= 15 || succ >= 1 },
      { text: 'Settled villages for the ruling tribe', ok: cap.stage === 3 },
      { text: 'A great hall in the ruler\'s village (a monument will not do)', ok: !!(c && c.settled && c.works && c.works.hall) },
      realmFeastNeed(c),
    ];
  }
  // a change of rule or a kingdom is written in the confederacy's chronicle, the world's, and (for a member tribe of the player's) the house's
  function realmTell(W, cf, title, text, chron) {
    note(W, cf, chron); logEvent(W, chron, cf, 'king');
    if (realmMine(W, cf) && !isHead(W, cf.king)) { houseNote(W, text); notice(W, title, text); } // the player as ruler has the result card and a house note from the deed
  }
  function realmChange(W, cf, to) {
    const K = cf.king, w = rulerWord(cf, K), nm = cf.name;
    cf.rule = to; cf.ruleSince = W.week;
    if (to === 1) realmTell(W, cf, 'The tribes are bound to the seat', `${nm[0].toUpperCase() + nm.slice(1)} is now bound to the seat: when ${K.name} dies, the tribes will choose the next ${w.toLowerCase()} from among their own leaders.`, `${w} ${K.name} bound the tribes to the seat: after ${himHer(K)}, the tribes will choose.`);
    else realmTell(W, cf, 'The seat will pass by blood', `${nm[0].toUpperCase() + nm.slice(1)} is now held by blood: after ${K.name}, the seat will pass to ${heHer(K)} heir.`, `${w} ${K.name} made the seat pass by blood: after ${himHer(K)}, ${heHer(K)} heir will follow.`);
  }
  // one try at the next step, at the stated chance; the same code for the player and for the world's own rulers
  function realmTry(W, cf, nx, odds) {
    const r = realmRule(cf), K = cf.king, cap = cf.capital, mineR = isHead(W, K), P = W.player;
    if (r >= 2) return { win: false, left: null };
    cf.triedAt = W.week;
    if (W.rand() < odds) { realmChange(W, cf, r + 1); if (mineR) P.renown += r === 0 ? 8 : 12; K.giftPrestige = (K.giftPrestige || 0) + 0.03; return { win: true }; }
    const ts = confedTribes(W, cf).filter(t => t !== cap);
    for (const t of ts) affect(W, t, cap, r === 0 ? -6 : -9, `${K.name} tried to hold the seat by ${r === 0 ? 'binding us to it' : 'blood'}`);
    K.giftPrestige = Math.max(-0.3, (K.giftPrestige || 0) - 0.06); if (mineR) P.renown -= r === 0 ? 3 : 5;
    const w = rulerWord(cf, K); note(W, cf, `${w} ${K.name} tried to ${r === 0 ? 'bind the tribes to the seat' : 'make the seat pass by blood'}, and failed.`);
    logEvent(W, `${w} ${K.name} of ${cf.name} fails to ${r === 0 ? 'bind the tribes to the seat' : 'make the seat pass by blood'}.`, cf, 'king');
    const worst = ts.sort((a, b) => opinion(a, cap) - opinion(b, cap))[0]; let left = null;
    if (worst && W.rand() < clamp(0.2 - opinion(worst, cap) / 250, 0.05, 0.5)) { left = worst; leaveConfed(W, worst, `they resented ${heHer(K)} grasp at the seat`); }
    if (!left && realmMine(W, cf) && !mineR) houseNote(W, `${w} ${K.name} tried to ${r === 0 ? 'bind the tribes to the seat' : 'make the seat pass by blood'} and failed; the tribes think less of the ${cap.name}.`);
    return { win: false, left };
  }
  function realmFoundKingdom(W, cf) {
    const K = cf.king, c = K.clan, cap = cf.capital;
    realmFeastPay(c);
    cf.was = cf.name; cf.kingdom = W.week; cf.name = `the Kingdom of the ${cap.name}`;
    for (const t of confedTribes(W, cf)) if (t !== cap) affect(W, t, cap, 4, 'Feasted at the raising of a kingdom');
    K.giftPrestige = (K.giftPrestige || 0) + 0.1;
    const w = rulerWord(cf, K), nm = cf.name;
    realmTitle(W, cf); realmTell(W, cf, 'A kingdom is raised', `${cf.was[0].toUpperCase() + cf.was.slice(1)} is now ${nm}, and ${K.name} is ${w.toLowerCase()}. The tribes feasted together.`, `${K.name} of the ${cap.name} raised ${nm} from ${cf.was} and is ${w.toLowerCase()}.`);
  }
  // each year a kingdom's tribes that are not hungry send the ruler's clan a little food: about a week of its food in all, never over a tenth of what a sender holds
  function realmTribute(W, cf) {
    const K = cf.king, rc = K && K.clan; if (!rc) return;
    const P = W.player, myT = P && !P.over && P.head.alive && P.head.clan ? P.head.clan.tribe : null, snd = [];
    for (const t of confedTribes(W, cf)) {
      if (t === cf.capital || !t.clans.length) continue;
      let n = 0, s = 0; for (const c of t.clans) { n += c.people.length; s += c.cond * c.people.length; }
      if (!n || s / n < 0.85) continue; // a hungry tribe sends nothing
      const gv = t.clans.slice().sort((x, y) => y.store + y.grain - x.store - x.grain)[0]; if (gv && gv.store > 0) snd.push({ t, gv });
    }
    if (!snd.length) return;
    const per = needsWeek(rc) / snd.length, day = Math.max(1, needsWeek(rc) / 7), food = x => { const d = Math.round(x / day); return d < 1 ? 'a little food' : `food for ${d} day${d > 1 ? 's' : ''}`; }; let total = 0, mineGave = null; REALM_SENT = new Map();
    for (const s of snd) { const amt = Math.max(0, Math.min(per, s.gv.store * 0.1)); s.gv.store -= amt; rc.store += amt; total += amt; REALM_SENT.set(s.t.id, amt); if (s.t === myT && !realmSubj(cf, s.t)) mineGave = amt; }
    const fr = snd.filter(s => !realmSubj(cf, s.t)), ft = fr.reduce((a, s) => a + REALM_SENT.get(s.t.id), 0);
    if (P && !P.over && P.head === K) { if (fr.length) houseNote(W, `Tribute came to the ${rc.name} clan from ${fr.length} tribe${fr.length > 1 ? 's' : ''} of ${cf.name}: ${food(ft)}.`); }
    else if (mineGave != null) houseNote(W, `The ${myT.name} sent tribute to ${rulerMid(cf, K)} ${K.name}: ${food(mineGave)}.`);
  }
  // the world's own rulers: a kingdom at about one chance in five a year once its needs are met; otherwise a step along the spectrum, at most once in five years
  function realmYear(W, cf) {
    realmTitle(W, cf);
    const K = cf.king;
    if (!isHead(W, K)) {
      if (!cf.kingdom && realmKingdomNeeds(W, cf).every(n => n.ok)) { if (W.rand() < 0.2) realmFoundKingdom(W, cf); }
      else {
        const nx = realmNext(W, cf);
        if (nx && nx.needs.every(n => n.ok) && W.rand() < 0.5) realmTry(W, cf, nx, nx.odds);
      }
    }
    if (cf.alive && cf.kingdom) realmTribute(W, cf);
  }
  // the deeds of a ruler: the next step along the spectrum, and a kingdom
  function realmDeeds(W, A, h, t) {
    const cf = t.confed; if (!cf || cf.king !== h || cf.capital !== t) return;
    const nx = realmNext(W, cf), un = ns => { const x = ns.find(n => !n.ok); return x ? 'Needs: ' + x.text : ''; };
    if (nx) {
      const pct = Math.round(nx.odds * 100), bind = nx.id === 'bindseat';
      A.push({ id: nx.id, icon: bind ? '🔗' : '👪', label: nx.label, hint: bind ? `At present the tribes follow you, and ${cf.name} ends when you die. Bind them to the seat and they will choose your successor from their own leaders. About ${pct}% to succeed; a failure costs standing, and a tribe may leave.` : `At present the tribes choose each new ruler. Make the seat pass to your heir by blood, and they will mostly stay. About ${pct}% to succeed; a failure costs standing, and a tribe may leave.`, ok: nx.needs.every(n => n.ok), why: un(nx.needs), data: { odds: nx.odds } });
    }
    if (realmRule(cf) === 0) A.push({ id: 'bloodseat', icon: '👪', label: 'Make the seat pass by blood', hint: 'The step after that: once the tribes choose their ruler, make the seat pass to your heir by blood, so that the tribes seldom leave.', ok: false, why: 'First the tribes must be bound to the seat' });
    if (!cf.kingdom) {
      const ns = realmKingdomNeeds(W, cf), c = h.clan;
      A.push({ id: 'kingdom', icon: '👑', label: 'Found a kingdom', hint: `Raise ${cf.name} to a kingdom, with you as ${h.sex === 'F' ? 'queen' : 'king'}. It costs a great feast: eight weeks of your clan's food (a clan that lives from the catch pays what it keeps and the rest in a lean season). Nothing is left to chance: when the needs are met, it is done. Tribes then seldom leave when a grown heir follows, and each year send you a little tribute.`, ok: ns.every(n => n.ok), why: un(ns) });
    }
  }
  // the deed of a tribe that is a member of someone else's realm: to leave it, or (a subject) to rise against its ruler
  function realmMemberDeeds(W, A, h, t) {
    const cf = t.confed; if (!cf || cf.capital === t || !cf.members.has(t.id)) return;
    const m = cf.members.get(t.id), K = cf.king, cap = cf.capital, subj = m.status === 'subject', lead = t.headman === h, rm = rulerMid(cf, K), yrs = (W.week - m.joined) / 52, calm = (m.calmUntil || 0) > W.week;
    const why = !lead ? `Only the leader of the ${t.name} can take them out of ${cf.name}` : yrs < 3 && subj ? `The ${t.name} submitted only ${Math.floor(yrs) < 1 ? 'lately' : Math.floor(yrs) + ' years ago'}, and the defeat is fresh` : calm && subj ? 'You cannot rise again so soon after the last time' : '';
    if (subj) { const odds = realmRiseOdds(W, cf, t), pct = Math.round(odds * 100);
      A.push({ id: 'leaverealm', icon: '⛓', label: `Rise against ${rm} ${K.name}`, hint: `Throw off ${K.name}'s rule and the tribute with it. About ${pct}% to win free (their host has ${confedTribes(W, cf).reduce((s, x) => s + (x === t ? 0 : warriors(x)), 0)} warriors against your ${warriors(t)}). If it fails, some of your warriors fall, the ${cap.name} think worse of you, your standing falls, and you cannot try again for eight years. If it wins, the ${cap.name} may come against you again.`, ok: !why, why, data: { odds } }); }
    else A.push({ id: 'leaverealm', icon: '🚪', label: `Leave the ${realmWord(cf)}`, hint: `Take the ${t.name} out of ${cf.name}. A people that joined freely may go. The ${cap.name} will think much worse of you (goodwill −25, and a grudge), and ${K.name}, if the realm is much the stronger, may march on you: about one year in three for eight years. Your standing falls a little.`, ok: !why, why });
  }
  function realmLeave(W, h, t, A) {
    const P = W.player, cf = t.confed; if (!cf || cf.capital === t || !cf.members.has(t.id)) return null;
    const m = cf.members.get(t.id), K = cf.king, cap = cf.capital, subj = m.status === 'subject', rm = rulerMid(cf, K), nm = cf.name;
    REALM_QUIET = true;
    if (subj) {
      const odds = A.data && A.data.odds != null ? A.data.odds : realmRiseOdds(W, cf, t), win = W.rand() < odds, pct = Math.round(odds * 100);
      const dL = realmLoss(W, t, win ? 0.06 + W.rand() * 0.06 : 0.08 + W.rand() * 0.08), aL = realmLoss(W, cap, win ? 0.06 + W.rand() * 0.06 : 0.03 + W.rand() * 0.04);
      if (win) {
        t.leftFrom = cf.id; t.leftAt = W.week; affect(W, cap, t, -20, `They rose against ${K.name}`, 15); P.renown += 6;
        leaveConfed(W, t, 'a rising'); REALM_QUIET = false;
        const tx = `${h.name} led the ${t.name} against ${rm} ${K.name} and won free of ${nm}: ${dL} of ours fell and ${aL} of theirs.`;
        logEvent(W, `Revolt! The ${t.name} throw off ${rm} ${K.name}'s rule and leave ${nm} (${dL} of the ${t.name} and ${aL} of the host fell).`, t, 'blood'); houseNote(W, tx);
        return { title: 'The rising wins free', text: `${tx} The ${cap.name} will not forget it. The chance was about ${pct}%.` };
      }
      m.calmUntil = W.week + 52 * 8; affect(W, cap, t, -10, `They rose against ${K.name}`, 8); P.renown -= 5; REALM_QUIET = false;
      const tx = `${h.name} led the ${t.name} against ${rm} ${K.name} and was beaten: ${dL} of ours fell and ${aL} of theirs. The ${t.name} stay subject.`;
      logEvent(W, `Revolt! The ${t.name} rose against ${rm} ${K.name} and were put down (${dL} of the ${t.name} and ${aL} of the host fell).`, cap, 'blood'); houseNote(W, tx);
      return { title: 'The rising fails', text: `${tx} You cannot try again for eight years. The chance was about ${pct}%.` };
    }
    t.leftFrom = cf.id; t.leftAt = W.week; affect(W, cap, t, -25, `They left ${nm}`, 10); P.renown -= 4;
    leaveConfed(W, t, 'chose to go'); REALM_QUIET = false;
    const tx = `${h.name} took the ${t.name} out of ${nm}. The ${cap.name} think much worse of us now.`;
    logEvent(W, `The ${t.name} leave ${nm}.`, t, 'king'); houseNote(W, tx);
    return { title: `The ${t.name} leave`, text: `${tx} ${K.name} may yet march on the ${t.name} if the realm is much the stronger.` };
  }
  function realmDeed(W, id, h, t, A) {
    const P = W.player, cf = t.confed;
    if (id === 'leaverealm') return realmLeave(W, h, t, A);
    if ((id === 'bindseat' || id === 'bloodseat') && realmRule(cf) !== (id === 'bindseat' ? 0 : 1)) return { title: 'Already so', text: `${cf.name} is already held ${realmRule(cf) === 2 ? 'by blood' : 'so'}.` };
    if (id === 'kingdom') {
      realmFoundKingdom(W, cf); P.renown += 20; houseNote(W, `${h.name} raised ${cf.name} and became ${rulerWord(cf, h).toLowerCase()}.`);
      return { title: 'A kingdom is raised', text: `The tribes feast for days. ${cf.was[0].toUpperCase() + cf.was.slice(1)} is now ${cf.name}, and ${h.name} is ${rulerWord(cf, h).toLowerCase()}. When ${h.name} dies, the seat will pass to ${heHer(h)} heir and the tribes will seldom leave.` };
    }
    const r = realmRule(cf), odds = A.data && A.data.odds != null ? A.data.odds : realmNext(W, cf).odds, pct = Math.round(odds * 100), R = realmTry(W, cf, null, odds);
    if (R.win) {
      houseNote(W, `${h.name} ${r === 0 ? 'bound the tribes to the seat' : 'made the seat pass by blood'}.`);
      return r === 0 ? { title: 'The tribes are bound to the seat', text: `The headmen swear on the seat, not on you alone. When you die the tribes will choose the next high chief from among their own leaders, and the strongest tribe will carry it. The chance was about ${pct}%.` }
        : { title: 'The seat will pass by blood', text: `The headmen agree that your heir shall follow you. The tribes will mostly stay when you die, unless your heir is a child. The chance was about ${pct}%.` };
    }
    houseNote(W, `${h.name} tried to ${r === 0 ? 'bind the tribes to the seat' : 'make the seat pass by blood'} and failed.`);
    return { title: r === 0 ? 'The binding fails' : 'The claim of blood fails', text: `The headmen will not be bound. The tribes think less of the ${t.name}, and your standing falls${R.left ? `; the ${R.left.name} have gone their own way` : ''}. You can try again in five years. The chance was about ${pct}%.` };
  }
  // what the screen shows of a confederacy: the same numbers the sim uses
  function realmInfo(W, cf) {
    const r = realmRule(cf), cap = cf.capital, K = cf.king, H = realmHeir(W, cf), nx = realmNext(W, cf), w = rulerWord(cf, K).toLowerCase();
    const sw = s => s >= 0.7 ? 'would stay' : s >= 0.4 ? 'wavering' : 'would leave', ord = { core: 0, ally: 1, subject: 2 };
    const ruleText = r === 0 ? `The tribes follow ${K.name}, not the seat. When the ${w} dies, ${cf.name} ends and every tribe goes its own way.`
      : r === 1 ? `When the ${w} dies, the tribes choose the next from among their own leaders. The tribe that counts most carries it: what counts is its warriors, their vigour and the standing of its leader, and the ruling tribe counts a little more. Each tribe may stay or leave.`
      : `When the ${w} dies, the seat passes to ${heHer(K)} heir by blood, and the tribes mostly stay. With only a child to follow, or no heir, more may leave; with no heir at all the tribes choose.`;
    const tribes = confedTribes(W, cf).map(t => { const m = cf.members.get(t.id), s = realmStay(W, cf, t, H); return { t, status: m.status, statusWord: m.status === 'core' ? 'founding tribe' : m.status, joined: m.joined, people: tribeSize(t), warriors: warriors(t), leader: realmLeader(t, null), feeling: t === cap ? 0 : opinion(t, cap), stay: s, stayWord: sw(s) }; })
      .sort((a, b) => (a.t === cap ? -1 : b.t === cap ? 1 : 0) || ord[a.status] - ord[b.status] || b.people - a.people);
    const chs = realmChoose(W, cf, K), choosing = chs ? chs.all.map((x, i) => ({ tribe: x.tribe, leader: x.who, weight: x.w, rank: i + 1 })) : [];
    for (const x of tribes) { const c = choosing.find(y => y.tribe === x.t); x.weight = c ? c.weight : null; x.rank = c ? c.rank : null; }
    const hold = H ? 1 - tribes.filter(x => x.t !== H.tribe).reduce((p, x) => p * (1 - x.stay), 1) : 0, holdTxt = !H ? '' : hold < 0.5 ? `, but the realm would not hold: too few tribes would stay` : hold < 0.8 ? `, though the realm might not hold (${Math.round(hold * 100)}% that it does)` : '';
    const ruleText2 = ruleText + (r === 1 && chs ? realmChoosingText(W, cf, chs.all) : '');
    return { mine: isHead(W, K), hold, choosing, kind: cf.kingdom ? 'kingdom' : 'confederacy', name: cf.name, since: cf.founded, kingdomSince: cf.kingdom || 0, rule: r, ruleName: REALM_RULES[r], ruleText: ruleText2,
      ruler: K, rulerWord: rulerWord(cf, K), ruledSince: Math.max(0, rulerSince(cf)), heir: H ? { who: H.who, how: H.how + holdTxt, child: !!H.child } : null,
      next: nx ? { id: nx.id, label: nx.label, needs: nx.needs, odds: nx.odds } : null, kingdomNeeds: cf.kingdom ? null : realmKingdomNeeds(W, cf),
      tribes, wars: [...cf.wars.keys()].map(id => W.ents.get(id)).filter(Boolean), warText: Object.fromEntries([...cf.wars.keys()].map(id => [id, warText(cf, id)])), warFrom: Object.fromEntries([...cf.wars.keys()].map(id => [id, warFrom(cf, id)])), past: cf.kings.slice(0, -1) };
  }

  // =====================================================================
  //  THE PLAYER'S HOUSE
  //  The player leads one family line (patrilineal) through the generations. The sim runs on its own;
  //  at moments that matter to the house it pauses with a decision card.
  // =====================================================================
  function houseCandidates(W) {
    const out = [];
    for (const c of W.clans) for (const f of familiesOf(c)) {
      const m = f.head; if (!m || m.sex !== 'M' || !m.spouse || m.age < 22 || m.age > 44) continue;
      const h = isMatri(c.tribe) && m.spouse.alive && m.spouse.clan === c && m.spouse.age >= 18 && m.spouse.age < 44 ? m.spouse : m; // where descent runs through the mothers, she founds the house
      out.push({ head: h, clan: c, tribe: c.tribe, kids: c.people.filter(q => q.father === h || q.mother === h).length });
    }
    // a house needs children to carry it on: offer the households that have at least two, if there are enough of them
    for (const n of [2, 1]) { const f = out.filter(o => o.kids >= n); if (f.length >= 6) return f; }
    return out;
  }
  function choosePlayer(W, head) {
    W.player = { house: head.name, head, renown: 0, heads: [{ name: head.name, from: W.week, to: null, titles: [] }], hist: [], over: false, asked: new Map(), lastFamine: -999, lastGather: -999, lastCrown: -999 };
    head.dyn = true; for (const c of W.clans) for (const q of c.people) if (q.father === head || q.mother === head || (head.sex === 'M' ? (head.father && q.father === head.father) || (q.father && q.father.father === head) : (head.mother && q.mother === head.mother) || (q.mother && q.mother.mother === head))) q.dyn = true;
    houseNote(W, `${head.name} of the ${head.clan.name} clan (${head.clan.tribe.name}) founds the House of ${head.name}.`);
    fogMonth(W);
  }
  function nameList(a) { const n = a.slice(0, 3).map(q => q.name); return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : n[0] || ''; }
  function houseNote(W, t) { const P = W.player; if (!P) return; P.hist.push({ w: W.week, t }); if (P.hist.length > 400) P.hist.shift(); }
  // ---- the house's log tells of the head's near kin and the house's own deeds; the rest of the blood is counted once a year ----
  let HEIR_C = { W: null, w: -1, h: null, who: null };
  function houseHeir(W) { const P = W.player, H = P && P.head; if (!H || !H.clan) return null; if (HEIR_C.W !== W || HEIR_C.w !== W.week || HEIR_C.h !== H) HEIR_C = { W, w: W.week, h: H, who: clanHeir(W, H.clan, H) }; return HEIR_C.who; }
  function houseNear(W, q) { // the head, the head's spouse, parents, brothers and sisters, children, grandchildren, and the heir (wherever they live)
    const P = W.player; if (!P || P.over || !P.head || !P.head.alive || !q) return false; const H = P.head;
    if (q === H || q.spouse === H || H.spouse === q || q === H.mother || q === H.father) return true;
    if ((H.mother && q.mother === H.mother) || (H.father && q.father === H.father) || q.mother === H || q.father === H) return true;
    const m = q.mother, f = q.father; if ((m && (m.mother === H || m.father === H)) || (f && (f.mother === H || f.father === H))) return true;
    return houseHeir(W) === q;
  }
  const inHouseClan = (W, c) => { const P = W.player; return !!(P && !P.over && P.head && P.head.alive && P.head.clan && c === P.head.clan); };
  // a report that comes every year is told once, and again only when it has really changed (a different order of size, or nothing sent)
  function houseNoteChanged(W, key, level, text) {
    const P = W.player; if (!P) return; const T = P.told || (P.told = {}), prev = T[key];
    if (prev != null && Math.abs(prev - level) < Math.max(2, Math.abs(prev) * 0.5)) return;
    T[key] = level; houseNote(W, text);
  }
  function houseCount(W, k) { const P = W.player; if (P) P[k] = (P[k] || 0) + 1; }
  function houseSummary(W) { // one line a year for the more distant blood of the head's own clan
    const P = W.player; if (!P) return; const d = P.sumD || 0, b = P.sumB || 0, m = P.sumM || 0; P.sumD = P.sumB = P.sumM = 0; if (P.over || !(d + b + m)) return;
    const W9 = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'], nw = n => n < 13 ? W9[n] : String(n), cl = [];
    if (d) cl.push([d, 'died']); if (b) cl.push([b, b === 1 ? 'was born' : 'were born']); if (m) cl.push([m, 'married away']);
    const first = cl[0], head = nw(first[0]); houseNote(W, `${head[0].toUpperCase() + head.slice(1)} more of our blood in the clan ${first[1]} this year${cl.slice(1).map(c => '; ' + nw(c[0]) + ' ' + c[1]).join('')}.`);
  }
  const dynMembers = W => { const out = []; for (const c of W.clans) for (const q of c.people) if (q.dyn) out.push(q); return out; };
  // the blood living in the player's own tribe, and across the isles (the first drives renown; the second is only told)
  const bloodCount = W => { const P = W.player, h = P && P.head, t = h && h.clan && h.clan.tribe; let all = 0, tribe = 0; for (const c of W.clans) { let n = 0; for (const q of c.people) if (q.dyn) n++; all += n; if (t && c.tribe === t) tribe += n; } return { tribe, all }; };
  function titlesOf(q) { const t = []; if (!q || !q.clan || !q.alive) return t; if (q.clan.head === q) t.push('clan head'); if (q.clan.tribe.headman === q) t.push('headman'); const cf = q.clan.tribe.confed; if (cf && cf.king === q) t.push('king'); return t; }
  const isHead = (W, q) => W.player && !W.player.over && W.player.head === q;
  const MINOR = new Set(['marriage', 'gathering', 'scouts', 'opportunity', 'challenge', 'sickness']);
  function pushEvent(W, ev) {
    if (!W.player || W.player.over) return;
    if (W.pending.some(e => e.type === ev.type && e.key === ev.key)) return;
    const P = W.player;
    const autoK = AUTOKEY[ev.type], autoV = autoK && pol(W)[autoK], autoI = autoV && autoV !== 'ask' ? AUTOIX[autoK][autoV] : undefined;
    if (autoI !== undefined && !ROUTINE.has(ev.type)) { (W.autoQ = W.autoQ || []).push([ev, autoI]); return; }
    if (MINOR.has(ev.type)) {
      // don't bury the player in decisions: at most one minor matter every ~9 months
      if (W.week - (P.lastMinor || -1e9) < 40 || W.pending.length) { if (ev.type === 'sickness') { if (autoI !== undefined && ev.options[autoI] && !ev.options[autoI].off) (W.autoQ = W.autoQ || []).push([ev, autoI]); else { ev.id = -1; resolve(W, ev, 1); W.lastResult = null; } } return; }
      P.lastMinor = W.week;
    }
    if (autoI !== undefined && ev.options[autoI] && !ev.options[autoI].off) { (W.autoQ = W.autoQ || []).push([ev, autoI]); return; }
    ev.id = (W.evId = (W.evId || 0) + 1); ev.week = W.week; W.pending.push(ev);
  }
  const relWord = (q, h) => { const p = h.sex === 'F' ? 'her' : 'his', sb = (a, b) => a && b && a !== b && ((a.father && a.father === b.father) || (a.mother && a.mother === b.mother)), sx = a => a.sex === 'M' ? 'brother' : 'sister'; return (q.father === h || q.mother === h) ? `${p} ${q.sex === 'M' ? 'son' : 'daughter'}` : ((h.father && q.father === h.father) || (h.mother && q.mother === h.mother)) ? `${p} ${q.sex === 'M' ? 'brother' : 'sister'}` : ((q.father && (q.father.father === h || q.father.mother === h)) || (q.mother && (q.mother.father === h || q.mother.mother === h))) ? `${p} grand${q.sex === 'M' ? 'son' : 'daughter'}` : sb(q.father, h) ? `${p} ${sx(q.father)}'s ${q.sex === 'M' ? 'son' : 'daughter'}` : sb(q.mother, h) ? `${p} ${sx(q.mother)}'s ${q.sex === 'M' ? 'son' : 'daughter'}` : sb(q, h.father) ? `${p} father's ${sx(q)}` : sb(q, h.mother) ? `${p} mother's ${sx(q)}` : `of ${p} blood`; };

  function playerMonth(W) {
    const P = W.player; if (!P || P.over) return;
    { const hd = P.head; if (hd.alive && hd.clan) { const cur = P.heads[P.heads.length - 1]; for (const x of titlesOf(hd)) if (!cur.titles.includes(x)) { cur.titles.push(x); houseNote(W, `${hd.name} became ${x === 'king' ? rulerOf(hd.clan.tribe.confed, hd) : x === 'headman' ? `headman of the ${hd.clan.tribe.name}` : `head of the ${hd.clan.name} clan`}.`); } } }
    // --- succession ---
    if (!P.head.alive || !P.head.clan) {
      const old = P.head, mem = dynMembers(W).filter(q => !q.slave);
      const byAge = a => a.sort((x, y) => y.age - x.age);
      // the house stays with its clan if anyone of the blood is left there; a child heir is guided by the elders
      // only someone of the blood living in the house's own clan can inherit
      const oc = old.clan && old.clan.alive ? old.clan : null;
      let heir = oc ? clanHeir(W, oc, old) : null;
      if (!heir && (!oc || !oc.people.length)) { // the clan itself is gone (merged into another): the house lives on where most of its blood now lives
        const by = new Map(); for (const q of mem) if (q.clan && q.clan.alive) by.set(q.clan, (by.get(q.clan) || 0) + 1);
        const best = [...by.entries()].sort((a, b) => b[1] - a[1])[0]; if (best) heir = clanHeir(W, best[0], old);
      }
      P.heads[P.heads.length - 1].to = W.week;
      if (!heir) {
        P.over = true; houseNote(W, `With the death of ${old.name}, the House of ${P.house} has died out.`);
        logEvent(W, `The House of ${P.house} has died out.`, null, 'king');
        W.pending.push({ id: (W.evId = (W.evId || 0) + 1), type: 'end', title: `The House of ${P.house} has ended`, text: `${old.name} died (${old.cause || 'unknown'}) at ${Math.floor(old.age)} and left no one of the blood in the ${old.clan ? old.clan.name : 'house\'s'} clan to take ${old.sex === 'F' ? 'her' : 'his'} place. Your house lasted ${Math.floor(W.week / 52) - Math.floor(P.heads[0].from / 52)} years across ${P.heads.length} generations of leaders and earned ${Math.round(P.renown)} renown.<br><br>${legacyHTML(legacy(W))}<br><br>The world goes on without you — you can keep watching, or start a new game.`, options: [{ label: 'Keep watching' }] });
        return;
      }
      const rw = relWord(heir, old);
      P.head = heir; P.heads.push({ name: heir.name, from: W.week, to: null, titles: [] });
      houseNote(W, `${old.name} died (${old.cause || 'unknown'}) at ${Math.floor(old.age)}. ${heir.name}, ${rw}, now leads the house.`);
      pushEvent(W, { type: 'succession', key: heir.id, title: `${old.name} is dead`, text: `${old.name} died at ${Math.floor(old.age)} (${old.cause || 'unknown'}). ${heir.name}, ${rw}, aged ${Math.floor(heir.age)}, now leads the House of ${P.house}${heir.age < 16 ? ' — still a child, guided by the elders of the clan' : ''}.`, options: [{ label: 'Carry the house forward' }] });
      realmHouseDeath(W, old, heir);
    }
    const h = P.head, c = h.clan, t = c.tribe;
    ambitionCheck(W);
    if (c.toSettle && !c.settled && Math.hypot(c.tx - c.x, c.ty - c.y) < 1500) { c.toSettle = false; c.settled = true; c.live = c.live || 'farm'; c.settledAt = c.settledAt || W.week; c.soil = 1; c.village = villageAt(W, c, t, 'vill'); credit(P.head, 'village', c.village);
      note(W, c, `Built the village of ${c.village}.`); logEvent(W, `🏘 The ${c.name} clan (${t.name}) build the village of ${c.village}.`, c, 'settle'); houseNote(W, `The village of ${c.village} was built.`); notice(W, `The village of ${c.village} stands`, `The ${c.name} clan have reached the spot and raised their houses. ${c.village} is your home now: stores, fields, and room to grow.`); }
    if (W.week % 52 === 20 && !c.settled && !c.toSettle && !P.toldSettle) { const a = playerActions(W).find(x => x.id === 'settle'); if (a && a.ok) { P.toldSettle = true; houseNote(W, 'We could found a village now.'); notice(W, 'You could found a village', `${t.stage >= 2 ? 'Your people sow grain now' : 'These waters are rich enough to live from'}. A village stays in one place, stores food, has more children and can grow far larger than a camp. Open Act and choose "${a.label}" when you are ready.`); } }
    const close = q => q === h || q.father === h || q.mother === h || (q.father && (q.father.father === h || q.father.mother === h)) || (q.mother && (q.mother.father === h || q.mother.mother === h)) || (h.father && q.father === h.father) || (h.mother && q.mother === h.mother);
    const dynAll = dynMembers(W); for (const q of dynAll) q.reserved = !q.spouse && close(q);
    // --- marriages of the house's young people ---
    if (!W.pending.some(e => e.type === 'marriage')) {
      const mem = dynAll.filter(q => q.reserved && !q.slave && ((q.sex === 'M' && q.age >= 18 && q.age < 55) || (q.sex === 'F' && q.age >= 16 && q.age < 40)) && (!P.asked.has(q.id) || W.week - P.asked.get(q.id) > 104) && (!q.widowed || W.week - q.widowed > 26));
      const q = mem.sort((a, b) => (b === h) - (a === h) || b.age - a.age)[0];
      if (q) marriageEvent(W, q);
    }
    // --- hunger ---
    if (c.lowWeeks >= 6 && W.week - P.lastFamine > 104) {
      P.lastFamine = W.week;
      const foe = nearClans(W, c.x, c.y, 45000).filter(o => o.tribe !== t && !isAllied(t, o.tribe) && !peaceHeld(W, t, o.tribe)).sort((a, b) => b.store + b.grain - a.store - a.grain)[0];
      pushEvent(W, { type: 'famine', key: W.week, title: `Hunger in the ${c.name} camp`, text: `The ${c.name} clan is going hungry — only ${Math.round(c.cond * 100)}% of what people need is being eaten. Children and the old will die first. What will ${h.name} do?`,
        data: { foe }, options: [
          foe ? { label: `Raid the ${foe.name} camp of the ${foe.tribe.name}`, hint: `${foe.people.length} people · take their food${foe.grain > 0 ? ' and grain' : ''} — and their enmity` } : null,
          { label: 'Beg food from our kin', hint: 'Other clans share — at the cost of some pride' },
          { label: 'Move the camp to new ground', hint: 'Travel 25–50 km in search of better foraging' },
        ].filter(Boolean) });
    }
  }
  // heirs within the clan: sons, then other men of the blood (a boy is guided by the elders), and only then women
  function clanHeir(W, c, old) {
    const mem = c.people.filter(q => q.alive && q.dyn && !q.slave && q !== old), byAge = a => a.sort((x, y) => y.age - x.age)[0];
    const S = isMatri(c.tribe) ? 'F' : 'M', child = q => q.father === old || q.mother === old; // daughters inherit among the matrilineal peoples
    const sib = q => !!old && ((old.father && q.father === old.father) || (old.mother && q.mother === old.mother)), grand = q => (q.father && child(q.father)) || (q.mother && child(q.mother)), nib = q => (q.father && sib(q.father)) || (q.mother && sib(q.mother));
    const prime = a => byAge(a.filter(q => q.age < 60)) || byAge(a), grown = mem.filter(q => q.sex === S && q.age >= 15);
    return byAge(grown.filter(child)) || byAge(grown.filter(grand)) || prime(grown.filter(sib)) || prime(grown.filter(nib)) || prime(grown)
      || byAge(mem.filter(q => child(q) && q.sex === S)) || (g2 => byAge(g2.filter(child)) || prime(g2.filter(sib)) || prime(g2))(mem.filter(q => q.age >= 15)) || byAge(mem.filter(q => q.sex === S)) || byAge(mem) || null;
  }
  // sons (and daughters) of the house are matched without asking: any neutral or friendly clan, near enough to visit
  function autoMatch(W, q) {
    const want = q.sex === 'M' ? 'F' : 'M', t = q.clan.tribe; let best = null, bs = -Infinity;
    for (const o of nearClans(W, q.clan.x, q.clan.y, 90000)) {
      if (o.tribe !== t && (opinion(t, o.tribe) < -10 || opinion(o.tribe, t) < -10)) continue;
      if (opinion(q.clan, o) < -10 || opinion(o, q.clan) < -10) continue;
      for (const p of o.people) {
        if (p.sex !== want || p.reserved || p.slave || p.spouse || closeKin(p, q)) continue;
        if (want === 'F' ? (p.age < 16 || p.age > 32) : (p.age < 19 || p.age > 45)) continue;
        const diff = Math.abs((want === 'F' ? q.age - 4 : q.age + 4) - p.age);
        const sc = -diff * 3 + opinion(o, q.clan) * 0.3 + (o.tribe !== t ? 8 + Math.max(0, opinion(t, o.tribe)) * 0.2 + (isAllied(t, o.tribe) ? 6 : 0) : 4) + (o === q.clan ? -20 : 0)
          + (o.goods.amber + o.goods.axe + o.goods.salt + (o.goods.metal || 0) * 2) + prestige(o.head || p) * 6 + W.rand() * 6;
        if (sc > bs) { bs = sc; best = p; }
      }
    }
    return best;
  }
  function marriageCandidates(W, q) {
    const want = q.sex === 'M' ? 'F' : 'M';
    const pool = [];
    for (const o of nearClans(W, q.clan.x, q.clan.y, 70000)) for (const p of o.people) {
      if (p.sex !== want || p.reserved || p.slave || closeKin(p, q)) continue;
      if (p.spouse && W.player && q === W.player.head) continue; // the head of the house takes no place as a second wife
      if (want === 'F' ? (p.spouse || p.age < 16 || p.age > 38) : (p.age < 19 || p.age > 60 || (p.spouse && ((p.wives || 1) >= 2 || prestige(p) < 0.6)))) continue;
      if (Math.abs(p.age - q.age) > (W.player && q === W.player.head ? 22 : 15)) continue;
      pool.push(p);
    }
    const sameT = pool.filter(p => p.clan.tribe === q.clan.tribe && p.clan !== q.clan), otherT = pool.filter(p => p.clan.tribe !== q.clan.tribe), own = pool.filter(p => p.clan === q.clan);
    const wealth = p => p.clan.goods.amber * 3 + p.clan.goods.axe * 2 + p.clan.goods.salt + p.clan.people.length / 10 + prestige(p.clan.head || p) * 3;
    const out = [];
    const a = sameT.sort((x, y) => wealth(y) - wealth(x))[0]; if (a) out.push(a);
    const b = otherT.sort((x, y) => opinion(q.clan.tribe, y.clan.tribe) - opinion(q.clan.tribe, x.clan.tribe))[0]; if (b) out.push(b);
    const rest = pool.filter(p => !out.includes(p)); if (rest.length) out.push(rest[Math.floor(W.rand() * rest.length)]);
    if (!out.length && own.length) out.push(own[0]);
    return out.slice(0, 3);
  }
  function marriageEvent(W, q) {
    const P = W.player, cands = marriageCandidates(W, q);
    if (!cands.length && (W.player.askAll || q === W.player.head)) { P.asked.set(q.id, W.week - (q === P.head ? 78 : 0)); return; } // a head with no match looks again in half a year
    if (!P.askAll && q !== P.head) { // the family arranges it: the best match among clans that wish us well
      const b = autoMatch(W, q);
      if (!b) { P.asked.set(q.id, W.week - 78); return; } // look again in half a year
      const ev = { type: 'marriage', data: { q, cands: [b] } }; W.pending.push(ev); resolve(W, ev, 0); return;
    }
    const who = q === P.head ? `${q.name}, head of your house,` : `${q.name} (${Math.floor(q.age)}), ${relWord(q, P.head)},`;
    const hint = p => {
      const bits = [`${p.clan.name} clan · ${p.clan.people.length} people`];
      if (p.clan.tribe !== q.clan.tribe) bits.push(`ties to the ${p.clan.tribe.name}${isAllied(q.clan.tribe, p.clan.tribe) ? ` (${bondWord(W, q.clan.tribe, p.clan.tribe).replace(/^your /, '')})` : opinion(q.clan.tribe, p.clan.tribe) < -15 ? ' (on bad terms)' : ''}`);
      const g = p.clan.goods, rich = [g.amber ? `amber ×${g.amber}` : '', g.axe ? `axes ×${g.axe}` : '', g.salt ? `salt ×${g.salt}` : ''].filter(Boolean).join(', '); if (rich) bits.push(rich);
      { const ux = q.sex === 'M' ? uxorilocal(W, q, p, !!q.spouse) : uxorilocal(W, p, q, !!p.spouse), stays = p.clan === q.clan || (q.sex === 'M' ? !ux : ux); bits.unshift(stays ? `${p.sex === 'F' ? 'she' : 'he'} comes to live with your clan` : `${q.sex === 'F' ? 'she' : 'he'} GOES to live with the ${p.clan.name} clan`); }
      if (p.spouse) bits.push('would be a second wife');
      if (p.clan.tribe.stage >= 2) bits.push(STAGES[p.clan.tribe.stage].toLowerCase());
      if (p.clan.head === p || (p.father && p.father === p.clan.head)) bits.push(p.clan.head === p ? 'clan head' : "clan head's child");
      return bits.join(' · ');
    };
    pushEvent(W, { type: 'marriage', key: q.id, title: `A match for ${q.name}`, text: `${who} is of an age to marry. Children of the marriage are of the house's blood, but only blood living in your own clan can inherit the house: each match says where the couple will live. Whom shall ${q.sex === 'F' ? 'she' : 'he'} marry?`,
      data: { q, cands }, options: [...cands.map(p => ({ label: `${p.name}, ${Math.floor(p.age)}, of the ${p.clan.tribe.name}`, hint: hint(p) })), { label: 'Not yet', hint: 'Ask again in two years' }] });
  }
  // is q of the blood of the player's house, and do the raiders or avengers of clan `by` come from the house's own tribe? Then q is spared
  const kinOfHouse = (W, q, by) => { const P = W.player; return !!(q.dyn && P && !P.over && P.head && P.head.clan && by && by.tribe === P.head.clan.tribe); };
  function bloodEvent(W, victim, byClan) {
    if (!W.player || W.player.over || !byClan || !byClan.alive) return;
    { const h = W.player.head; if (!h || !h.clan || (victim.clan !== h.clan && !(victim.father === h || victim.mother === h || h.father && (victim.father === h.father)))) return; } // only kin close enough to call on the head
    if (/raiding|leading a raid|guards while seeking|seeking revenge/.test(victim.cause || '')) return; // fell as the aggressor: no blood debt
    const P = W.player, killer = victim.killedBy || null, kf = killer && killer.fam && killer.fam.alive ? killer.fam : null;
    if (killer && (killer.dyn || (P.head.fam && killer.fam === P.head.fam))) return; // the killer is of the house's own blood or household: there is no one outside it to answer
    if (killer && killer.clan && killer.clan.alive) byClan = killer.clan; // the debtor is the killer's own clan
    const inside = byClan === P.head.clan; if (inside && !killer) return;
    if (inside) { pushEvent(W, { type: 'blood', key: victim.id, title: `${victim.name} has been killed`, text: `${victim.name} of your house (${Math.floor(victim.age)}, ${victim === P.head ? 'its head' : relWord(victim, P.head)}) was ${victim.cause}. ${killer.name}${kf ? ', of the house of ' + kf.name : ''} in your own clan, did it: a matter between the houses of the clan, not a debt of another people. How will ${P.head.alive ? P.head.name : 'the house'} answer?`,
      data: { byClan, killer, kf, victim, inside: true }, options: [{ label: 'Take blood revenge', hint: `A man of ${kf ? 'the house of ' + kf.name : 'their house'} pays with his life: renown, and a feud inside the clan` }, { label: 'Demand amends', hint: `${kf ? 'The house of ' + kf.name : 'The killer\'s house'} makes amends before the elders of the clan. No goods leave the clan; the quarrel between the houses is ended` }, { label: 'Let it go', hint: 'Peace, at a cost to the house\'s standing' }] }); return; }
    pushEvent(W, { type: 'blood', key: victim.id, title: `${victim.name} has been killed`, text: `${victim.name} of your house (${Math.floor(victim.age)}, ${victim === P.head ? 'its head' : relWord(victim, P.head)}) was ${victim.cause}. The ${byClan.name} clan of the ${byClan.tribe.name} owes your house blood. How will ${P.head.alive ? P.head.name : 'the house'} answer?`,
      data: { byClan, killer, kf, victim }, options: [
        { label: 'Take blood revenge', hint: 'Kill a man of their clan — renown, and a feud that may go on' },
        { label: 'Demand compensation', hint: `Ask for ${byClan.goods.amber + byClan.goods.axe + byClan.goods.salt > 0 ? 'amber, axes or salt' : 'food'} — ends it if they pay` },
        { label: 'Let it go', hint: 'Peace, at a cost to the house\'s standing' }] });
  }
  function resolve(W, ev, k) {
    const P = W.player; W.pending = W.pending.filter(e => e !== ev);
    if (!P) return;
    const h = P.head, c = h && h.clan;
    switch (ev.type) {
      case 'marriage': {
        const { q, cands } = ev.data; P.asked.set(q.id, W.week);
        const p = cands[k]; if (!p || !q.alive || !p.alive || q.spouse || (p.sex === 'F' && p.spouse)) return;
        const pcn = p.clan.name, ptn = p.clan.tribe.name, qc = q.clan;
        if (q.sex === 'M') marry(W, q, p); else marry(W, p, q);
        P.renown += 1 + (p.clan.tribe !== q.clan.tribe ? 1 : 0);
        houseNote(W, `${q.name} married ${p.name} of the ${pcn} clan (${ptn})${q.clan !== qc ? ` and went to live with ${q.sex === 'F' ? 'his' : 'her'} people` : p.clan === qc && pcn !== qc.name ? `, who came to live with us` : ''}.`);
        if (p.clan.tribe !== q.clan.tribe) affect(W, q.clan.tribe, p.clan.tribe, 6, `Marriage alliance arranged by the House of ${P.house}`);
        return;
      }
      case 'blood': {
        const { byClan, kf, inside } = ev.data; if (!byClan.alive || !c) return;
        const on = inside && kf ? 'the house of ' + kf.name : 'the ' + byClan.name + ' clan';
        if (k === 0) {
          const avengers = c.people.filter(x => x.sex === 'M' && !x.slave && x.age >= 16 && x.age < 55 && x !== h && !(inside && kf && x.fam === kf));
          let targets = byClan.people.filter(x => x.sex === 'M' && !x.slave && !x.dyn && x.age >= 16 && x.age < 60 && (!inside || (kf && x.fam === kf))); // never the house's own blood, never the avenger's people (inside the clan: only the killer's house)
          if (!inside && kf && targets.some(x => x.fam === kf)) targets = targets.filter(x => x.fam === kf); // the killer's own household first
          if (!avengers.length && h.sex === 'M' && h.age < 55) avengers.push(h); // only if there is no one else
          if (!avengers.length || !targets.length) { houseNote(W, `There was no one to take revenge on ${on}.`); return; }
          // a young kinsman of the house takes up the feud, not its head
          const young = avengers.filter(x => x.age < 40), a = young.find(x => x.dyn) || avengers.find(x => x.dyn) || pick(young.length ? young : avengers, W.rand), v = pick(targets, W.rand);
          if (W.rand() < 0.8) {
            die(W, byClan, v, `killed in revenge by ${a.name}`, null, a); byClan.people = byClan.people.filter(x => x.alive);
            if (inside) { if (kf && h.fam) affect(W, kf, h.fam, -30, `${a.name} killed ${v.name} in revenge`, 20); } else { affect(W, byClan, c, -20, `${a.name} of the House of ${P.house} killed ${v.name} in revenge`, 18); rel(c, byClan).grudge *= 0.2; }
            if (!inside && byClan.tribe !== c.tribe) affect(W, byClan.tribe, c.tribe, -12, `Revenge killing of ${v.name}`, 10);
            P.renown += 4; houseNote(W, `${a.name} avenged the house, killing ${v.name} of ${on}.`);
            logEvent(W, `The House of ${P.house} takes revenge: ${a.name} kills ${v.name} of ${on}.`, c, 'blood');
          } else {
            if (W.rand() < 0.5) { die(W, c, a, `killed seeking revenge on the ${byClan.name}`); c.people = c.people.filter(x => x.alive); P.renown -= 1; houseNote(W, `${a.name} was killed trying to avenge the house on ${on}.`); }
            else { houseNote(W, `${a.name} went to avenge the house on ${on}, but was driven off.`); }
          }
        } else if (k === 1) {
          let paid = '';
          if (inside) { if (kf && h.fam) { const r = rel(kf, h.fam); r.grudge *= 0.25; r.op += 10; } P.renown += 1; houseNote(W, `${kf ? 'The house of ' + kf.name : 'The killer\'s house'}, of our own clan, made amends before the elders for the killing of ${ev.data.victim ? ev.data.victim.name : 'our kinsman'}; no goods left the clan.`); W.lastResult = { title: 'Amends are made', text: `${kf ? 'The house of ' + kf.name : 'The killer\'s house'} stands before the elders of the clan and makes amends. It is a matter between houses of one clan, so no goods pass out of it, and the quarrel between the houses is ended.` }; return; } for (const g of ['amber', 'axe', 'salt', 'flint']) if (byClan.goods[g] > 0 && !paid) { const n = Math.min(2, byClan.goods[g]); byClan.goods[g] -= n; c.goods[g] += n; paid = `${n} ${GOOD_NAMES[g].toLowerCase()}`; }
          if (!paid) { const f = byClan.store * 0.4 + byClan.grain * 0.2; byClan.store *= 0.6; byClan.grain *= 0.8; c.store += f; paid = 'food'; }
          if (opinion(byClan, c) < -30 && W.rand() < 0.35) { affect(W, c, byClan, -10, 'They refused to pay compensation', 10); houseNote(W, `The ${byClan.name} refused to pay for their killing.`); return; }
          const r = rel(c, byClan); r.grudge *= 0.25; r.op += 8; clearWrong(c, byClan); r.hist.push({ w: W.week, t: `Paid ${paid} in compensation to the House of ${P.house}` });
          P.renown += 2; houseNote(W, `The ${byClan.name} paid ${paid} in compensation.`);
        } else { if (inside) { if (kf && h.fam) { const r = rel(kf, h.fam); r.grudge = 0; r.op += 6; } } else { const r = rel(c, byClan); r.grudge = 0; r.op += 12; clearWrong(c, byClan); } P.renown -= 3; houseNote(W, `The house forgave ${on} their killing.`); }
        return;
      }
      case 'gathering': {
        const { st, clans } = ev.data; if (!c) return;
        if (k === 0) {
          let spent = 0; const gave = []; for (const g of GIFTABLE) while (c.goods[g] > 0 && spent < 3) { c.goods[g]--; spent++; gave.push(GOOD_NAMES[g].toLowerCase()); }
          const feast = foodDays(c) > 10, fd0 = foodDays(c); if (feast) { c.store *= 0.5; c.grain *= 0.85; spent += 1; } W._feastDays = fd0 - foodDays(c);
          const tribes = [...new Set(clans.map(x => x.tribe))];
          const gm = hasTrait(h, 'generous') ? 1.5 : 1, gT = Math.round((6 + spent * 2) * gm), gC = Math.round((5 + spent) * gm), nT = tribes.filter(o => o !== t0(c)).length, nC = clans.filter(o => o !== c).length;
          for (const o of tribes) if (o !== t0(c)) affect(W, o, c.tribe, gT, `Lavish gifts from the House of ${P.house} at ${st.name}`);
          for (const o of clans) if (o !== c) affect(W, o, c, gC);
          h.giftPrestige = (h.giftPrestige || 0) + spent * 0.05; W._gift = `<br><br><b>What it bought:</b> ${nC} clan${nC === 1 ? '' : 's'} think better of yours (+${gC} goodwill each)${nT ? `, ${nT} other people${nT === 1 ? '' : 's'} +${gT}` : ''}; ${h.name}'s standing +${(spent * 0.05).toFixed(2)}; renown +${Math.round(1 + spent * 1.5)}.${feast ? `<br><b>What it cost:</b> about ${W._feastDays} day${W._feastDays === 1 ? '' : 's'} of food.` : ''} Goodwill decides who backs you for the leadership, who shares their sources, and who will come when you invite them.`;
          P.renown += 1 + spent * 1.5; houseNote(W, spent ? `At ${st.name}, ${h.name} gave lavish gifts — all spoke of ${h.sex === 'F' ? 'her' : 'his'} generosity.` : `At ${st.name}, ${h.name} shared what little the house had.`);
          W.lastResult = { title: 'Generous gifts', text: spent ? `${h.name} gave ${gave.length ? [...new Set(gave)].join(', ') : ''}${gave.length && feast ? ' and ' : ''}${feast ? 'a great feast' : ''}. The other clans and tribes speak warmly of the House of ${P.house}.` : `${h.name} had little to give, but shared it. A small kindness, remembered by a few.` }; W.lastResult.text += W._gift || ''; W._gift = null;
        } else if (k === 1) {
          const b4 = Object.assign({}, c.goods), t0d = foodDays(c), tool0 = c.tool;
          let n = 0; for (const o of clans) if (o !== c && n < 6 && exchange(W, c, o)) n++;
          // barter surplus food — dried meat, smoked fish, grain — for what we lack
          let paidFood = 0; const need = needsWeek(c);
          for (const g of TRADEABLE) { if (c.goods[g] > 0) continue; const o = clans.find(o => o !== c && (o.goods[g] || 0) > 1); if (!o) continue;
            const price = need * 0.6; if (c.grain > price * 2) c.grain -= price; else if (c.store > price * 2) c.store -= price; else break;
            o.goods[g]--; c.goods[g] = 1; o.store += price; paidFood++; affect(W, o, c, 4, 'Traded food for goods'); if (o.tribe !== c.tribe) rel(o.tribe, c.tribe).trade++; if (paidFood >= 3) break; }
          const got = [], gaveG = []; for (const g in c.goods) { const dlt = c.goods[g] - (b4[g] || 0); if (dlt > 0) got.push(`${dlt} ${GOOD_NAMES[g].toLowerCase()}`); else if (dlt < 0) gaveG.push(`${-dlt} ${GOOD_NAMES[g].toLowerCase()}`); }
          if (c.tool > tool0) got.push('better flint for tools');
          houseNote(W, `At ${st.name}, ${h.name} traded with ${n + paidFood} clans.`); P.renown += (n + paidFood) * 0.5;
          W.lastResult = { title: got.length ? 'A good trade' : 'Little to trade', text: got.length ? `<b>Gained:</b> ${got.join(', ')}.<br><b>Gave:</b> ${gaveG.concat(paidFood ? [`food (${t0d - foodDays(c)} days' worth)`] : []).join(', ') || 'little'}.` : `No one had what you lacked, or you had nothing they wanted. Gather furs in good hunting seasons, beads on the shore, or go on an expedition to a flint, amber or salt source.` };
        }
        return;
      }
      case 'famine': {
        if (!c) return; const { foe } = ev.data, opts = ev.options;
        const choice = opts[k] && opts[k].label;
        if (choice && choice.startsWith('Raid') && foe && foe.alive) { raid(W, c, c, foe); P.renown += 1; houseNote(W, `Driven by hunger, ${h.name} led a raid on the ${foe.name} camp.`); }
        else if (choice && choice.startsWith('Beg')) {
          const donors = W.clans.filter(o => o !== c && (o.tribe === c.tribe || isAllied(o.tribe, c.tribe)) && o.store + o.grain > needsWeek(o) * 2 && Math.hypot(o.x - c.x, o.y - c.y) < 80000).sort((a, b) => opinion(b, c) - opinion(a, c));
          if (donors.length) { const d = donors[0], f = Math.min(needsWeek(c) * 4, d.store * 0.5 + d.grain * 0.3); d.store *= 0.6; d.grain *= 0.8; c.grain += f; affect(W, c, d, 5, 'Gave food in hard times'); P.renown -= 1; houseNote(W, `The ${d.name} clan gave food to the hungry ${c.name}.`); }
          else houseNote(W, 'No one had food to spare.');
        } else { const save = c.tribe.home; c.tribe.home = null; relocate(W, c, 25000, 50000); c.tribe.home = save; c.lastMove = W.week; houseNote(W, `${h.name} led the ${c.name} clan away to new ground.`); }
        return;
      }
      case 'challenge': {
        const { tribe, rival } = ev.data; if (!tribe.alive || !h.alive || h.clan.tribe !== tribe || !rival || !rival.alive || !rival.clan || rival.clan.tribe !== tribe) return;
        if (k === 0) {
          const T = headshipTally(W, tribe, h, rival, true), fr = ruleFactor(tribe), held = T.win && fr < 1 && W.rand() >= fr, txt = tallyHTML(T, h, rival) + (held ? `<br><br>The clans would have chosen ${h.name}, but the ${tribe.name} hold their leader ${ruleOf(tribe) === 1 ? 'for life' : 'in one clan'}, and the old custom held.` : '');
          if (T.win && !held) {
            tribe.favored = h; tribe.headman = h; P.renown += 5;
            if (rival.clan && rival.clan !== c) affect(W, rival.clan, c, -20, `${h.name} took the leadership from ${rival.name}`, 5);
            houseNote(W, `${h.name} won the leadership of the ${tribe.name} from ${rival.name}: clans with ${T.wa} people stood with us, ${T.wb} against.`); note(W, tribe, `${h.name} of the House of ${P.house} took the leadership from ${rival.name}.`);
            logEvent(W, `${h.name} of the House of ${P.house} becomes headman of the ${tribe.name}, pushing aside ${rival.name}.`, tribe, 'king');
            W.lastResult = { title: 'The leadership is yours', text: `The clans of the ${tribe.name} choose ${h.name} over ${rival.name}.<br><br>${txt}` };
          } else {
            if (rival.clan && rival.clan !== c) affect(W, rival.clan, c, -15, `${h.name} tried and failed to unseat ${rival.name}`, 15);
            P.renown -= 3; houseNote(W, `${h.name} challenged ${rival.name} for the leadership and failed: clans with ${T.wb} people stood with ${rival.name}, ${T.wa} with us.`);
            W.lastResult = { title: 'The challenge fails', text: `The clans of the ${tribe.name} keep ${rival.name}.<br><br>${txt}<br><br><span class="muted">${LOSE_ADVICE}</span>` };
          }
        } else { if (rival.clan && rival.clan !== c) affect(W, rival.clan, c, 10, `${h.name} supported ${rival.name} as headman`); P.renown += 1; houseNote(W, `${h.name} pledged support to ${rival.name} as headman.`); }
        return;
      }
      case 'path': {
        const kid = ev.data.kid; if (!kid.alive) return; const k2 = ['bold', 'silver', 'pious', 'shrewd'][k] || 'bold';
        kid.traits = [k2]; kid.skill = Math.min(1, kid.skill + 0.05); houseNote(W, `${kid.name} came of age and was raised to be ${['a hunter and fighter', 'a speaker at the fires', 'a keeper of the rites', 'a maker and trader'][k]}.`);
        W.lastResult = { title: `${kid.name} ${TRAITS[k2].name}`, text: `So it is settled, and ${kid.name} takes to it. If ${kid.sex === 'F' ? 'she' : 'he'} comes to lead the house: ${TRAITS[k2].does.toLowerCase()}.` };
        return;
      }
      case 'friendneed': {
        const q = ev.data.q; if (!q.alive || !q.fam || !h.fam) return;
        if (k === 0) { const hungry = q.clan.cond < 0.9, tr = hungry ? null : GIFTABLE.find(g => c.goods[g] > 0); if (tr) { c.goods[tr]--; q.clan.goods[tr] = (q.clan.goods[tr] || 0) + 1; } else { const amt = Math.min(c.store, needsWeek(c) * 1.5); c.store -= amt; q.clan.store += amt; }
          affect(W, q.fam, h.fam, 30, `${h.name} helped us when we had nothing`); if (q.clan !== c) affect(W, q.clan, c, 8, `${h.name} helped ${q.name} in need`); P.renown += 2;
          houseNote(W, `${h.name} gave ${q.name} what ${q.sex === 'F' ? 'she' : 'he'} needed, and asked nothing for it.`); W.lastResult = { title: 'A debt of the heart', text: `${q.name} takes it without a word and grips your arm. ${q.sex === 'F' ? 'Her' : 'His'} house will stand with yours when the clans choose a leader, and ${q.sex === 'F' ? 'her' : 'his'} clan thinks better of yours (+8).` }; }
        else { affect(W, q.fam, h.fam, -30, `${h.name} turned us away when we were in need`); houseNote(W, `${h.name} sent ${q.name} away empty-handed.`); W.lastResult = { title: `${q.sex === 'F' ? 'She' : 'He'} goes home empty-handed`, text: `${q.name} nods, thanks you for the fire, and leaves. Something has gone out of the friendship (−30).` }; }
        return;
      }
      case 'slight': {
        const q = ev.data.q; if (!q.alive || !q.fam || !h.fam) return;
        if (k === 0) { const tr = GIFTABLE.find(g => c.goods[g] > 0); if (tr) c.goods[tr]--; else eatStore(c, needsWeek(c)); h.giftPrestige = (h.giftPrestige || 0) + 0.06; q.giftPrestige = Math.max(0, (q.giftPrestige || 0) - 0.03); P.renown += 3;
          for (const o of c.tribe.clans) if (o !== c) affect(W, o, c, 4, `${h.name} answered an insult with a gift`);
          houseNote(W, `${h.name} answered ${q.name}'s mockery with a gift to the poorest house at the fire.`); W.lastResult = { title: 'The laughter turns', text: `${h.name} says nothing to ${q.name}, and instead gives ${tr ? GOOD_NAMES[tr].toLowerCase() : 'meat from the stores'} to the poorest house at the fire. Now they laugh at him. Your standing rises (+0.06), the other clans warm to yours (+4), renown +3.` }; }
        else if (k === 1) { const p = clamp(0.5 + (h.skill - q.skill) * 0.8 + (q.temper - h.temper) * 0.3 + (hasTrait(h, 'silver') ? 0.15 : 0) + (hasTrait(h, 'bold') ? 0.08 : 0) - (h.age > 50 ? 0.15 : 0), 0.1, 0.9);
          if (W.rand() < p) { P.renown += 5; q.giftPrestige = Math.max(0, (q.giftPrestige || 0) - 0.04); affect(W, q.fam, h.fam, -12, `${h.name} bested ${q.name} before the clans`); houseNote(W, `${h.name} bested ${q.name} before the whole tribe.`); W.lastResult = { title: `${h.name} has the better of it`, text: `Word for word and then throw for throw, ${h.name} leaves ${q.name} flat on his back in the dust. Renown +5. He hates you the more for it.` }; }
          else { P.renown -= 3; affect(W, q.fam, h.fam, -6, `${q.name} bested ${h.name} before the clans`); houseNote(W, `${q.name} bested ${h.name} before the whole tribe.`); W.lastResult = { title: `${q.name} has the better of it`, text: `${h.name} is quick, but ${q.name} is quicker, and the fire roars with laughter at your cost. Renown −3.` }; } }
        else { P.renown -= 1; houseNote(W, `${h.name} let ${q.name}'s mockery pass.`); W.lastResult = { title: 'It passes', text: `${h.name} smiles and looks into the fire. Some call it wisdom and some call it weakness. Renown −1.` }; }
        return;
      }
      case 'foundling': case 'foundback': case 'exiles': case 'exilesback': case 'oath': case 'oathback': return chainResolve(W, ev, k);
      case 'beast': {
        const b = ev.data.b; if (!b.alive) { W.lastResult = { title: 'Too late', text: `${beastNm(b)} is already gone.` }; return; }
        if (k === 1 && ev.options[1].off) k = 0;
        if (k === 2) { if (b.kind === 'stag') { c.shun = { id: b.id, until: W.week + 52 * 20 }; for (const o of c.tribe.clans) if (o !== c) affect(W, o, c, 3, `${h.name} would not hunt ${b.name}`); }
          else { c.shun = { id: b.id, until: W.week + 52 * 5 }; eatStore(c, needsWeek(c)); }
          b.seen++; houseNote(W, b.kind === 'stag' ? `${h.name} forbade the hunting of ${b.name}.` : `${h.name} forbade the ground where ${b.name} hunts.`);
          W.lastResult = { title: b.kind === 'stag' ? 'It is a sign' : 'The ground is forbidden', text: b.kind === 'stag' ? `No one of the ${c.name} will loose an arrow at ${b.name}. The other clans approve (+3).` : `For five years no one of the ${c.name} goes where ${b.name} hunts. No one dies to it; the hunting is a little poorer. You can still hunt it later, under Act.` }; return; }
        P.cool = P.cool || {}; P.cool.hunt = W.week; W.lastResult = beastHuntPlayer(W, b, k === 1, ev.data.p ? ev.data.p[k === 1 ? 1 : 0] : null); return;
      }
      case 'omen': {
        const pious = hasTrait(h, 'pious');
        if (k === 0) { const tr = GIFTABLE.find(g => c.goods[g] > 0); if (tr) c.goods[tr]--; else eatStore(c, needsWeek(c)); for (const o of c.tribe.clans) if (o !== c) affect(W, o, c, pious ? 7 : 4, `${h.name} made the offering when the sign came`); P.renown += pious ? 3 : 1;
          houseNote(W, `${h.name} made the offering after the sign.`); W.lastResult = { title: 'The offering is made', text: `${tr ? 'A gift of ' + GOOD_NAMES[tr].toLowerCase() : 'A week of food'} goes ${faithOf(c.tribe) === 'ancestors' ? 'into the barrow' : faithOf(c.tribe) === 'sky' ? 'onto the high rock for the birds' : 'into the water'}. The talk dies down, and the other clans think a little better of yours (+${pious ? 7 : 4}).` }; }
        else if (k === 1) { P.quietUntil = W.week + 104; W._acts = null; for (const o of c.tribe.clans) if (o !== c) affect(W, o, c, 2, `${h.name} kept the quiet when the sign came`);
          houseNote(W, `${h.name} kept the quiet for two years after the sign.`); W.lastResult = { title: 'The quiet is kept', text: `For two years no one of the clan raids, trades abroad, explores, claims a new source or moves away. Feasts, gifts, rites and building go on as before. Nothing is lost but the time, and people say ${h.name} knows what is owed.` }; }
        else { P.omenIgnored = { by: h.name, at: W.week, until: W.week + 156 }; houseNote(W, `${h.name} said the sign was only a sign.`); W.lastResult = { title: 'Only a sign', text: `${h.name} laughs and goes back to work. Some laugh too. Others watch, and will remember, if the next three years go badly.` }; }
        return;
      }
      case 'quarrel': {
        const { a, b, txt } = ev.data; if (!a.alive || !b.alive || !a.clan || !b.clan) return; const o = a === h.fam ? b : a;
        if (k === 0) { const tr = GIFTABLE.find(g => c.goods[g] > 0); if (tr) c.goods[tr]--; else eatStore(c, needsWeek(c) * 0.5);
          affect(W, a, b, -3, `${txt}, smoothed over with a gift`); houseNote(W, `A quarrel with the house of ${o.name} (${txt}) was smoothed over with ${tr ? GOOD_NAMES[tr].toLowerCase() : 'a gift of food'}.`);
          W.lastResult = { title: 'Peace is kept', text: `The house of ${o.name} takes the gift. The matter is closed, though not forgotten.` }; }
        else if (k === 1) { affect(W, a, b, -22, `${txt} came to blows`); if (a.clan !== b.clan) affect(W, a.clan, b.clan, -10, `Fight between the houses of ${a.name} and ${b.name}`); houseNote(W, `We stood our ground against the house of ${o.name} (${txt}). No one died, but they will not forget.`);
          W.lastResult = { title: 'No blood, no peace', text: `Men shout, shove and are pulled apart. The house of ${o.name} goes home angry.` }; }
        else { const b4 = h.alive, n0 = famMembers(a).length + famMembers(b).length; fight(W, a, b, txt); const n1 = famMembers(a).length + famMembers(b).length;
          W.lastResult = { title: n1 < n0 ? 'Blood is spilled' : 'It comes to blows', text: n1 < n0 ? `A man lies dead after the fight with the house of ${o.name}. There will be a reckoning.` : `Spears are thrown and heads broken, but no one dies. The house of ${o.name} will remember.` }; }
        return;
      }
      case 'toobig': {
        const cl = ev.data.c; if (!cl.alive) return;
        if (k === 0) { cl.letSplit = W.week; houseNote(W, `${h.name} gave the outer houses leave to found a clan of their own.`); W.lastResult = { title: 'Leave is given', text: `The outer houses will pack and go within the year, and found a clan of your tribe nearby.` }; }
        else { cl.holdTogether = W.week; houseNote(W, `${h.name} held the ${cl.name} clan together.`); W.lastResult = { title: 'The clan stays together', text: `For eight years your word holds the ${cl.name} as one clan, up to ${splitCap(W, cl)} people${freeCount(cl) > splitCap(W, cl) ? ` (it counts ${freeCount(cl)} now, so a daughter clan will go all the same)` : ''}. Beyond that even you cannot keep them. Keep an eye on the food: one ${cl.settled ? 'village' : 'camp'} must now feed them all.` }; }
        return;
      }
      case 'badblood': {
        const { c: cl, A, B } = ev.data; if (!cl.alive || !A.alive || !B.alive) return;
        if (k === 0) { cl.peaceMade = W.week; cl.store = Math.max(0, cl.store - needsWeek(cl) * 2); affect(W, A, B, 45, `Reconciled by ${h.name} at a feast`); P.renown += 2; if (h.giftPrestige != null) h.giftPrestige += 0.03;
          houseNote(W, `${h.name} made peace between the houses of ${A.name} and ${B.name} with a feast. The clan holds together.`);
          W.lastResult = { title: 'The clan holds together', text: `Meat, beer and gifts to both houses, and old words are taken back. The houses of ${A.name} and ${B.name} sit at one fire again. The peace will hold for some years at least.` }; }
        else { cl.letGo = W.week; houseNote(W, `${h.name} let the quarrel between the houses of ${A.name} and ${B.name} run its course.`); }
        return;
      }
      case 'crown': {
        const { tribe, followers } = ev.data;
        if (k === 0 && tribe.alive && tribe.headman === h && !tribe.confed) {
          const f = followers.filter(o => o.alive && !o.confed);
          if (f.length >= 2) { newConfed(W, tribe, h, f); P.renown += 15; houseNote(W, `${h.name} united ${[tribe, ...f].map(o => 'the ' + o.name).join(', ')} and was raised as high chief.`); }
        } else P.lastCrown = W.week;
        return;
      }
      case 'rising': realmRiseAnswer(W, ev, k); return;
      case 'realminvite': realmInviteAnswer(W, ev, k); return;
      case 'pressed': realmPressedAnswer(W, ev, k); return;
      case 'warcall': realmWarcallAnswer(W, ev, k); return;
      case 'war': {
        const { cf, target } = ev.data;
        if (k === 0 && cf.alive && target.alive && !target.confed) { cf.wars.set(target.id, 0); warBegin(W, cf, target); realmWarAllies(W, cf, target); target.warLosses = 0; note(W, target, `${rulerWord(cf)} ${h.name} of ${cf.name} made war on us.`); logEvent(W, `⚔ ${rulerWord(cf)} ${h.name} of ${cf.name} goes to war to subjugate the ${target.name}.`, cf, 'blood'); houseNote(W, `${rulerWord(cf)} ${h.name} went to war against the ${target.name}.`); }
        return;
      }
      case 'vengeance': {
        const { c: av, o } = ev.data; if (!av.alive || !o.alive) return; const r = rel(av, o);
        if (k === 0) { const f = needsWeek(o) * 1.5; if (o.grain > f) o.grain -= f; else o.store = Math.max(0, o.store - f); av.store += f; let gave = ''; for (const g of GIFTABLE) if (o.goods[g] > 0) { o.goods[g]--; av.goods[g] = (av.goods[g] || 0) + 1; gave = GOOD_NAMES[g].toLowerCase(); break; }
          const ok = W.rand() < 0.65 + (gave ? 0.2 : 0); if (ok) { r.grudge *= 0.25; r.op += 15; clearWrong(av, o); houseNote(W, `${h.name} paid compensation to the ${av.name} clan; the feud is settled.`); W.lastResult = { title: 'The feud is settled', text: `The ${av.name} accept food${gave ? ' and ' + gave : ''}. The blood debt is paid.` }; }
          else { r.grudge *= 0.7; houseNote(W, `The ${av.name} took ${h.name}'s compensation, but some still want blood.`); W.lastResult = { title: 'Not enough', text: `The ${av.name} take the gifts, but their young men still want blood.` }; } }
        else if (k === 1) { o.guardUntil = W.week + 104; houseNote(W, `${h.name} posted guards around the ${o.name} camp.`); }
        return;
      }
      case 'quarry': {
        const { k: kk, rival } = ev.data; if (!c || !rival.alive) return;
        if (k === 0) { affect(W, rival, c, 10, `The House of ${P.house} shares the ${DEPOSITS[kk.d.type].name.toLowerCase()} with us`); kk.shared = true; houseNote(W, `${h.name} agreed to share the ${DEPOSITS[kk.d.type].name.toLowerCase()} with the ${rival.name}.`); }
        else if (k === 1) {
          const mine = warriorsOf(c), theirs = warriorsOf(rival), win = W.rand() < mine / (mine + theirs + 0.01) * 1.1;
          if (W.rand() < 0.5) { const side = win ? rival : c, men = side.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50 && q !== h); if (men.length) { const v = pick(men, W.rand); die(W, side, v, `killed in a fight over the ${DEPOSITS[kk.d.type].name.toLowerCase()}`, side === c ? rival : c); side.people = side.people.filter(q => q.alive); } }
          affect(W, rival, c, -25, `Driven from the ${DEPOSITS[kk.d.type].name.toLowerCase()} by the House of ${P.house}`, 25);
          if (rival.tribe !== c.tribe) affect(W, rival.tribe, c.tribe, -10, 'A fight over a quarry', 8);
          if (win) { rival.claim = null; houseNote(W, `${h.name}'s men drove the ${rival.name} from the ${DEPOSITS[kk.d.type].name.toLowerCase()}.`); W.lastResult = { title: 'The source is ours', text: `The ${rival.name} were driven off. They will not forget it.` }; }
          else { houseNote(W, `The ${rival.name} beat off ${h.name}'s men at the ${DEPOSITS[kk.d.type].name.toLowerCase()}.`); W.lastResult = { title: 'Beaten back', text: `The ${rival.name} held their ground. They still work the source, and now there is bad blood.` }; }
        } else { P.claims.splice(P.claims.indexOf(kk), 1); affect(W, rival, c, 8, 'Gave up their claim to us'); houseNote(W, `${h.name} gave up the house's claim to the ${DEPOSITS[kk.d.type].name.toLowerCase()}.`); }
        return;
      }
      case 'rivalry': {
        const { rival, t } = ev.data; if (!c || !rival.alive || !rival.head || t.headman !== h) return;
        const T0 = k === 1 ? headshipTally(W, t, h, rival.head, false) : null, K0 = k === 1 ? Math.round(keepChance(W, t, h, rival.head) * 100) : 0; let gt = '';
        if (k === 1) { let spent = 0; for (const o of t.clans) if (o !== c) { for (const g of GIFTABLE) if (c.goods[g] > 0) { c.goods[g]--; spent++; break; } affect(W, o, c, 10, `Gifts from ${h.name}`); } c.store *= 0.5; c.grain *= 0.8; P.renown -= 1; houseNote(W, `${h.name} bought the clans' support with gifts.`);
          const T1 = headshipTally(W, t, h, rival.head, false), K1 = Math.round(keepChance(W, t, h, rival.head) * 100), mv = T1.rows.filter((r, i) => r.side !== T0.rows[i].side).map(r => `the ${r.clan.name} clan (${r.n})`);
          gt = `<b>The gifts:</b> before them, ${T0.wa} people stood with ${h.name} and ${T0.wb} with ${rival.head.name}. After them, ${T1.wa} and ${T1.wb}. ${mv.length ? 'Clans that changed sides: ' + mv.join(', ') + '.' : 'No clan changed sides.'} ${K0 === K1 ? `Your chance of keeping the seat stayed at about ${K1}%${T1.rows.every((r, i) => Math.abs(r.pa - T0.rows[i].pa) < 1e-9) ? ': the gifts moved no one' : ''}.` : `Warmer feeling moved your chance of keeping the seat from about ${K0}% to about ${K1}%.`} The clans then chose, and what they chose is below.`; }
        if (k === 2) { t.favored = rival.head; t.headman = rival.head; affect(W, rival, c, 20, `${h.name} stepped aside for ${rival.head.name}`); P.renown -= 2; houseNote(W, `${h.name} stepped aside; ${rival.head.name} of the ${rival.name} now leads the ${t.name}.`); return; }
        const T = headshipTally(W, t, h, rival.head, true), fr = ruleFactor(t), kept = T.win || (fr < 1 && W.rand() >= fr), txt = (gt ? gt + '<br><br>' : '') + tallyHTML(T, h, rival.head) + (kept && !T.win ? `<br><br>The clans would have turned to ${rival.head.name}, but the ${t.name} hold their leader ${ruleOf(t) === 1 ? 'for life' : 'in one clan'}, and the old custom held.` : '');
        if (kept) { affect(W, rival, c, -15, `${rival.head.name} was humbled by ${h.name}`, 5); P.renown += 2; houseNote(W, `${h.name} faced down ${rival.head.name} of the ${rival.name}.`); W.lastResult = { title: 'You still lead', text: `The clans stand with ${h.name}. ${rival.head.name} is humbled, for now.<br><br>${txt}` }; }
        else { t.favored = rival.head; t.headman = rival.head; P.renown -= 4; houseNote(W, `The clans turned to ${rival.head.name} of the ${rival.name}; ${h.name} no longer leads the ${t.name}.`); W.lastResult = { title: 'The clans choose another', text: `${rival.head.name} of the ${rival.name} now leads the ${t.name}.<br><br>${txt}<br><br><span class="muted">${LOSE_ADVICE}</span>` }; }
        return;
      }
      case 'tribemove': {
        const { t, dest, why } = ev.data; if (!t.alive || !c) return;
        if (k === 0) { if (c.tribe === t) migrateTribe(W, t, 0, 0, why, dest); houseNote(W, `${h.name} went with the ${t.name} to new lands.`); return; }
        if (t.headman === h || t.clans.length < 2 || c.tribe !== t) { t.migrating = W.week; houseNote(W, `${h.name} kept the ${t.name} in their old lands.`); return; }
        // our clan stays and becomes a people of its own; the rest go
        const nt = newTribe(W, null, (t.hue + 70) % 360, t.id);
        t.clans.splice(t.clans.indexOf(c), 1); nt.clans.push(c); c.tribe = nt;
        for (const f of ['dom', 'stage', 'boats', 'metal', 'bronzeAge', 'flintW', 'copperArms']) nt[f] = t[f]; nt.culture = Object.assign({}, t.culture);
        nt.home = [c.x, c.y]; nt.migrating = W.week; affect(W, nt, t, 25, 'Parted in peace when the tribe moved on');
        updateLeaders(W, nt, true); migrateTribe(W, t, 0, 0, why, dest);
        houseNote(W, `The ${t.name} moved on; ${h.name}'s clan stayed behind and became the ${nt.name}.`); logEvent(W, `The ${c.name} clan stays behind as the ${t.name} move on, becoming the ${nt.name}.`, nt, 'big');
        W.lastResult = { title: `The ${nt.name}`, text: `The other clans leave. The ${c.name} clan stays in its lands as a people of its own, the ${nt.name}.` };
        return;
      }
      case 'landtaken': case 'landdemand': case 'landattack': landCardResolve(W, ev, k); return;
      case 'raided': {
        const { att, def } = ev.data; if (!att.alive || !def.alive) return;
        if (k === 0) { const n0 = def.people.length, a0 = att.people.length, f0 = foodDays(def); raidCore(W, att, att, def, CARD_DEF, ev.data.attBonus, !!ev.data.payback, ev.data.ratio); houseNote(W, `The ${att.name} raided us; ${h.name} stood and fought.`); P.renown += 1;
          { const lostN = Math.max(0, n0 - def.people.length), fell = Math.max(0, a0 - att.people.length), fd = Math.max(0, f0 - foodDays(def)); W.lastResult = { title: fd > 2 || lostN > fell ? 'They broke in' : 'They are driven off', text: `${fell} of theirs fell. ${lostN ? `${lostN} of ours ${lostN === 1 ? 'was' : 'were'} killed or carried off` : 'None of ours was lost'}${fd > 0 ? `, and they took about ${fd} day${fd === 1 ? '' : 's'} of food` : ''}. Renown +1.` }; } }
        else if (k === 1) { const f = def.store * 0.5 + def.grain * 0.3; def.store *= 0.5; def.grain *= 0.7; att.store += f; for (const g of ['amber', 'salt', 'axe', 'metal', 'bronze']) if (def.goods[g] > 0) { def.goods[g]--; att.goods[g]++; break; } affect(W, def, att, -6, 'Paid them off to avoid a raid'); P.renown -= 2; houseNote(W, `${h.name} paid off raiders of the ${att.name} clan.`); W.lastResult = { title: 'They take it and go', text: `Half the fresh food and a share of what is stored goes with them, and something of value if you had any. No one is hurt. Renown −2.` }; }
        else { def.store *= 0.2; def.grain *= 0.4; const save = def.settled; if (!save) relocate(W, def, 15000, 35000); affect(W, def, att, -10, 'Drove us from our camp', 5); P.renown -= 1; houseNote(W, `The ${def.name} fled before raiders of the ${att.name} clan.`); W.lastResult = { title: 'Into the woods', text: `The people scatter before the raiders come. No one is hurt, but most of the food is left behind for them${save ? '' : ', and the camp is pitched again elsewhere'}. Renown −1.` }; }
        return;
      }
      case 'scouts': { if (k === 0 && h.alive && c.head === h) { P.cool = P.cool || {}; P.cool.migrate = W.week; const r = leadClanAway(W, c, ev.data.d); W.lastResult = r; } return; }
      case 'opportunity': {
        const { weak } = ev.data; if (!weak.alive || !c) return;
        if (k === 0) { const n0 = c.people.length, w0 = weak.people.length, f0 = foodDays(c), g0 = GIFTABLE.reduce((a, g) => a + (c.goods[g] || 0), 0); const R1 = raid(W, c, c, weak, true, 1.5) || {}; P.renown += 2; houseNote(W, `${h.name} struck the weakened ${weak.name} camp.`);
          { const cap = (R1.captives || []).length, lostN = Math.max(0, n0 - (c.people.length - cap)), fell = Math.max(0, w0 - weak.people.length - cap), fd = foodDays(c) - f0, tg = GIFTABLE.reduce((a, g) => a + (c.goods[g] || 0), 0) - g0; W.lastResult = { title: 'You strike while they are weak', text: `${fell} of theirs fell and ${lostN} of ours.${fd >= 1 || tg > 0 ? ` You carried off ${[fd >= 1 ? `${fd} day${fd === 1 ? '' : 's'} of food` : '', tg > 0 ? `${tg} thing${tg === 1 ? '' : 's'} of value` : ''].filter(Boolean).join(' and ')}.` : ' There was little to take.'}${cap ? ` ${cap} captive${cap === 1 ? '' : 's'} came back with you.` : ''} Renown +2.` }; } }
        else if (k === 1) { const f = needsWeek(c) * 3; const take = Math.min(c.store + c.grain, f); eatStore(c, take); weak.store += take; affect(W, weak, c, 30, `${h.name} sent food when we were starving`); affect(W, weak.tribe, c.tribe, 18, 'Food in a hard time'); P.renown += 2; houseNote(W, `${h.name} sent food to the starving ${weak.name}, once our enemies.`); }
        return;
      }
      case 'sickness': {
        const cc = ev.data.c; if (!cc.alive) return;
        let n;
        if (k === 0) { n = sicknessToll(W, cc, 0.03); cc.store *= 0.3; cc.grain *= 0.5; }
        else if (k === 1) { n = sicknessToll(W, cc, 0.08); for (const o of cc.tribe.clans) if (o !== cc) affect(W, o, cc, 6, 'They tended their sick with courage'); P.renown += 1; }
        else { n = sicknessToll(W, cc, 0.05); const fs = familiesOf(cc).filter(f => !f.head || !f.head.dyn); const f = pick(fs, W.rand); if (f) { affect(W, f, (familiesOf(cc).find(x => x.head === h) || f), -40, 'Accused of sorcery by the House of ' + P.house, 20); houseNote(W, `The house of ${f.name} was accused of sorcery.`); } }
        houseNote(W, n ? `A fever killed ${n} of the ${cc.name} clan.` : `A fever passed through the ${cc.name} clan without a death.`);
        W.lastResult = { title: 'The fever passes', text: `${n ? n + ' of the ' + cc.name + ' clan died' : 'No one of the ' + cc.name + ' clan died'} before the fever burned itself out.<br><br>${k === 0 ? 'Scattering kept the sickness from spreading, but the stores left behind are lost: about ' + foodDays(cc) + ' days of food remain.' : k === 1 ? 'You stayed with the dying. The stores are whole, the other clans of the tribe think better of yours (+6 goodwill each), and the house gains renown.' : 'A house of your own clan stands accused of sorcery. It will not forgive yours, and the quarrel may yet split the clan.'}` };
        return;
      }
      case 'grain': {
        const { tribe } = ev.data;
        if (ev.stage === 2) {
          if (k === 0) { tribe.dom = Math.min(0.6, tribe.dom + 0.08); houseNote(W, `${h.name} urged the ${tribe.name} to tend the grain fields.`); }
          else { tribe.resistUntil = W.week + 52 * 25; tribe.dom = Math.max(0.2, tribe.dom - 0.05); houseNote(W, `${h.name} held to the old wandering ways.`); }
        }
        return;
      }
    }
  }
  const t0 = c => c.tribe;
  function pushGrainEvent(W, t) {
    const P = W.player; if (!P || P.over) return;
    if (t.stage === 2) pushEvent(W, { type: 'grain', key: 'g2' + t.id, stage: 2, title: 'The first fields', text: `The ${t.name} have begun to sow the grain they once only gathered. Tending fields means staying in one place — more food that keeps through winter, and more children; but a diet of porridge makes people smaller and sicker, and villages are easy to find for raiders. Will ${P.head.name} encourage it?`, data: { tribe: t },
      options: [{ label: 'Tend the fields', hint: 'Speed the move to farming' }, { label: 'Keep to the old ways', hint: 'Halt the change for a generation' }] });
    if (t.stage === 3) pushEvent(W, { type: 'grain', key: 'g3' + t.id, stage: 3, title: 'A settled people', text: `The ${t.name} have given up wandering and are building permanent villages among their fields. Expect many more children — and shorter, sicker people who are weaker in a fight.`, data: { tribe: t }, options: [{ label: 'So be it' }] });
  }
  function playerYear(W) {
    const P = W.player; if (!P || P.over) return;
    const h = P.head; if (!h.alive) return;
    castYear(W);
    const tt = titlesOf(h), cur = P.heads[P.heads.length - 1];
    for (const x of tt) if (!cur.titles.includes(x)) { cur.titles.push(x); houseNote(W, `${h.name} became ${x === 'king' ? rulerOf(h.clan.tribe.confed, h) : x === 'headman' ? `headman of the ${h.clan.tribe.name}` : `head of the ${h.clan.name} clan`}.`); }
    P.renown += (tt.includes('king') ? 8 : tt.includes('headman') ? 3 : tt.includes('clan head') ? 1 : 0) + Math.min(200, bloodCount(W).tribe) * 0.05 + (h.clan.goods.amber * 0.1);
  }

  // =====================================================================
  //  PLAYER ACTIONS — things the head of the house can choose to do at any time (with cooldowns),
  //  plus big interrupting events: raids on your camp, scouts' reports, sickness, a weakened enemy.
  // =====================================================================
  const yrs = n => n * 52;
  function describePlace(W, x, y, self) {
    const i = cellAt(x, y), bi = BIOMES[W.biome[i]].name.toLowerCase(), res = [];
    for (const d of W.deposits) if (Math.hypot(d.x - x, d.y - y) < 40000) res.push(d.type === 'grain' ? 'wild grain' : d.type === 'whale' ? 'whale grounds' : DEPOSITS[d.type].name.toLowerCase());
    const others = nearClans(W, x, y, 60000).filter(o => !self || o.tribe !== self.tribe), ppl = others.reduce((s, o) => s + o.people.length, 0);
    const bt = self ? self.tribe.boats : 0, food = potential(W, x, y, 0.8, bt), here = self ? Math.max(1, potential(W, self.x, self.y, 0.8, bt)) : food, r = food / here;
    return `${bi}${W.coast[i] ? ', on the coast' : W.isRiver[i] ? ', on a river' : ''} · ${r > 1.4 ? 'far richer' : r > 1.1 ? 'richer' : r > 0.9 ? 'about as rich' : r > 0.6 ? 'poorer' : 'much poorer'} foraging than here${farmSuit(W, x, y) > 0.9 ? ' · good farmland' : ''}${res.length ? ' · ' + [...new Set(res)].join(', ') : ''} · ${ppl ? `${ppl} strangers within 60 km` : 'no one else nearby'}`;
  }
  function destinations(W, c) {
    const out = [], from = [c.x, c.y], save = c.tribe.boats;
    for (const [dmin, dmax, label] of [[50000, 110000, 'Nearby'], [110000, 220000, 'Far away'], [60000, 260000, 'Across the sea']]) {
      let best = null, bs = -Infinity;
      for (let k = 0; k < 80; k++) {
        const a = W.rand() * 6.283, r = dmin + W.rand() * (dmax - dmin), x = clamp(from[0] + Math.cos(a) * r, 8000, WORLD - 8000), y = clamp(from[1] + Math.sin(a) * r, 8000, WORLD - 8000);
        const i = cellAt(x, y); if (!W.land[i] || W.lake[i] || !canReach(W, c, x, y)) continue;
        const other = W.comp[i] !== W.comp[cellAt(c.x, c.y)]; if ((label === 'Across the sea') !== other) continue;
        if (out.some(o => Math.hypot(o.x - x, o.y - y) < 40000)) continue;
        const sc = (c.tribe.stage === 3 ? farmSuit(W, x, y) * 3e7 : potential(W, x, y, 0.7, save)) / (1 + crowdAt(W, x, y, c.tribe) / 40);
        if (sc > bs) { bs = sc; best = { x, y }; }
      }
      if (best) { best.label = label; best.km = Math.round(Math.hypot(best.x - c.x, best.y - c.y) / 1000); best.dir = compass(best.x - c.x, best.y - c.y); best.desc = describePlace(W, best.x, best.y, c); out.push(best); }
    }
    return out;
  }
  const myWarriors = c => c.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 55).length;
  // young men of friendly clans in the tribe who'll follow a raid leader with standing
  function volunteers(c) { let n = 0; for (const o of c.tribe.clans) if (o !== c && opinion(o, c) > 5) n += Math.floor(myWarriors(o) * clamp(0.15 + opinion(o, c) / 150, 0, 0.5)); return n; }
  function raidTargets(W, c) {
    return nearClans(W, c.x, c.y, 160000).filter(o => o.tribe !== c.tribe && knows(W, o.x, o.y) && !isAllied(c.tribe, o.tribe) && !peaceHeld(W, c.tribe, o.tribe) && o.people.length > 3)
      .map(o => ({ o, wrongd: !!(c.wrong && c.wrong.c === o.id && W.week - c.wrong.w <= 52 * 6), loot: o.store + o.grain + (o.goods.amber + o.goods.bronze + o.goods.metal) * 2e6, w: o.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 55).length }))
      .sort((a, b) => (b.wrongd - a.wrongd) || (b.loot - a.loot)).slice(0, 5);
  }
  function clanChallengeOdds(W, c, h) { const ch = c.head, fams = familiesOf(c); let back = 0; for (const f of fams) if (h.fam && f !== h.fam) back += opinion(f, h.fam) - (ch.fam ? opinion(f, ch.fam) : 0); return clamp(0.4 + (prestige(h) - prestige(ch)) * 0.9 + back / Math.max(1, fams.length) / 100 + (ch.age > 60 ? 0.15 : 0), 0.1, 0.9) * ruleFactor(c); }
  const relWordT = o => o > 40 ? 'close friends' : o > 15 ? 'friendly' : o < -40 ? 'enemies' : o < -15 ? 'hostile' : 'neither friend nor foe';
  function playerActions(W) {
    const yl = (k, n) => { const v = left(k, n); return v + (v === 1 ? ' yr' : ' yrs'); };
    const P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan) return [];
    const h = P.head, c = h.clan, t = c.tribe, cd = P.cool || (P.cool = {}), now = W.week, A = [];
    const ready = (k, n) => cd[k] == null || now - cd[k] >= yrs(n), left = (k, n) => Math.ceil((yrs(n) - (now - (cd[k] != null ? cd[k] : -1e9))) / 52);
    const adult = h.age >= 16 && h.age < 62;
    const myW = c.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 55).length;
    const vol = volunteers(c);
    // raid
    { const tg = raidTargets(W, c), F = raidForces(W, c, h), ok = adult && F.length && tg.length && ready('raid', 3), wn = raidWhyNot(W, c, new Set(tg.map(x => x.o.tribe))), wnTxt = wn.map(x => `the ${x.o.name} (${x.km} km ${x.dir}): ${x.why}`).join('; ');
      A.push({ id: 'raid', icon: '⚔', label: 'Lead a raiding party', hint: `Take food, grain and valuables from another tribe — you can call ${F.map(f => f.n + ' ' + f.short).join(', ') || 'no one'}.${wnTxt ? ' Peoples you know of but cannot raid: ' + wnTxt + '.' : ''}`, forces: F, ok, why: !adult ? 'Your head is too young or too old to lead a raid' : !F.length ? 'Too few warriors will follow you' : !tg.length ? `No camps of strangers you know of within 160 km — explore to find some.${wnTxt ? ' Known peoples: ' + wnTxt + '.' : ''}` : !ready('raid', 3) ? `Your warriors need rest (${yl('raid', 3)})` : '',
        targets: tg.map(({ o, w, wrongd }) => ({ ref: o, label: `the ${o.name} ${o.settled ? 'village' : 'camp'} of the ${o.tribe.name}`, hint: `${wrongd ? 'They raided you in year ' + (Math.floor(c.wrong.w / 52) + 1) + ' · ' : ''}${F.length ? 'chance of winning ' + F.map(f => `about ${Math.round(raidChance(W, c, o, raidBonus(c, h, f)) * 100)}%${F.length > 1 ? ' with ' + f.n + ' ' + (f.id === 'clan' ? 'of the clan and volunteers' : f.short) : ' with ' + f.n}`).join(', ') + ' · you yourself may fall: ' + F.map(f => `about ${riskPct(raidHeadRisk(true, f.n))}% if you win, ${riskPct(raidHeadRisk(false, f.n))}% if you lose${F.length > 1 ? ' with ' + f.n : ''}`).join(', ') + ' · ' : ''}${opinion(c.tribe, o.tribe) > 15 ? 'They count you as friends: a raid ends that · ' : ''}${o.people.length} people · ${w} fighting men${o.settled ? ' · stored grain' : ''}${o.goods.amber + o.goods.bronze + o.goods.metal ? ' · valuables' : ''} · ${o.tribe.stage === 3 ? 'farmers (weaker fighters)' : 'foragers'}${o.goods.bronze ? ' · bronze weapons!' : ''}${o.works && o.works.pal ? ' · behind a palisade!' : ''}${und(t, o.tribe) < 0.15 ? ' · speech unknown to us' : ''} · they think of you as ${opinion(o.tribe, t) > 15 ? 'friends' : opinion(o.tribe, t) < -15 ? 'enemies' : 'strangers'}` })) }); }
    // land taken by a village of another people: bid it leave, or drive it out (one list of targets for both)
    { const L = landTargets(W, t);
      {
        const F = raidForces(W, c, h), Fa = F.length ? F : [landForce0(W, c, h)], lead = c.head === h || t.headman === h;
        const wh = x => landWhere(W, t, x.c.x, x.c.y), base = x => `${landV(x.c)} of the ${x.c.tribe.name}, ${wh(x).km} km ${wh(x).dir} of ${wh(x).from}`;
        const mid = x => `${landLostNow(W, x.r) ? Math.round(landLostNow(W, x.r) * 25) + ' km² of ours already theirs' : 'no land lost yet'} · ${x.c.people.length} people · ${landMen(W, x.c)}${walls(x.c) > 1 ? ' behind a wall' : ''}${x.r.refused ? ' · they refused you in year ' + (Math.floor(x.r.refused / 52) + 1) : ''}`;
        const fl = f => ' with ' + f.n;
        A.push({ id: 'landask', icon: '🕊', label: 'Demand that they leave our land', hint: `Send an envoy, with your warriors at your back, to bid a village of another people leave the ground it stands on. If they go (goodwill ${landGw('askYes')}, renown +2), they walk to ground beyond our land, or take to the road as wanderers if no ground is free, and the land they took comes back. If they will not, they think the worse of you (goodwill ${landGw('askNo')}). Once in 2 years`, forces: Fa, ok: L.length > 0 && lead && ready('landask', 2),
          why: !L.length ? 'No village of another people stands on our land' : !lead ? 'Only a clan head or the leader of the tribe can send the demand' : `You asked not long ago (${yl('landask', 2)})`,
          targets: L.map(x => ({ ref: x.c, rec: x.r, label: base(x), hint: `chance they leave: ${Fa.map(f => `about ${Math.round(leaveOdds(W, t, x.c, f, h) * 100)}%${fl(f)}`).join(', ')} · ${mid(x)}` })) });
        A.push({ id: 'landdrive', icon: '🔥', label: 'Drive them from our land', hint: `Take spears to a village of another people on our ground. A win: they leave, their wall and hall burn, half their food comes to us and the land is ours again (renown +4, goodwill ${landGw('won')}); a loss costs us more men than them (renown −2, goodwill ${landGw('lost')}). Once in 3 years`, forces: F, ok: L.length > 0 && adult && F.length > 0 && ready('landdrive', 3),
          why: !L.length ? 'No village of another people stands on our land' : !adult ? 'Your head is too young or too old to lead men' : !F.length ? 'Too few warriors will follow you' : `Your warriors need rest (${yl('landdrive', 3)})`,
          targets: L.map(x => ({ ref: x.c, rec: x.r, label: base(x), hint: `${F.length ? 'chance of winning ' + F.map(f => `about ${Math.round(driveOutOdds(W, c, x.c, f) * 100)}%${fl(f)}`).join(', ') + ' · you yourself may fall: ' + F.map(f => `about ${riskPct(raidHeadRisk(true, f.n))}% if you win, ${riskPct(raidHeadRisk(false, f.n))}% if you lose${F.length > 1 ? ' with ' + f.n : ''}`).join(', ') + ' · ' : ''}${mid(x)}` })) });
      } }
    // migrate & found a new tribe
    { const head = c.head === h, fol = head ? c.people.length : houseFollowers(W, c, h).length, ok = adult && h.age >= 18 && fol >= 6 && ready('migrate', 4);
      A.push({ id: 'migrate', icon: '🧭', label: head ? 'Lead your clan to new lands' : 'Lead your household to new lands', hint: head ? (t.clans.length > 1 ? `Break from the ${t.name} and found a new tribe with ${h.name} as its headman` : 'Move your people to a new homeland') : `${fol} people of your house and its friends will follow ${h.name} to found a new clan and tribe`, ok, why: fol < 6 ? 'Too few would follow you' : !adult || h.age < 18 ? 'Your head is not of an age to lead' : !ready('migrate', 4) ? `Your people are still settling in (${yl('migrate', 4)})` : '',
        targets: ok ? [...destinations(W, c).map(d => ({ ref: d, label: `${d.label}: ${d.km} km ${d.dir}`, hint: d.desc })), { pick: { maxKm: 300 }, label: 'Choose a place on the map…', hint: 'Any land you know of within 300 km that your people can reach' }] : [] }); }
    // expeditions: explore the unknown, or fetch goods from a known source
    { const able = h.alive && (adult || myW >= 2), exN = hasTrait(h, 'wanderer') ? 1.5 : 3, rt = able && ready('explore', exN) ? exploreRoutes(W, c) : [];
      A.push({ id: 'explore', icon: '🗺', label: 'Lead an expedition into the unknown', hint: (expLeader(h) ? `${h.name} and young men scout far lands — map them, find resources, meet strangers` : 'Send young men to scout far lands') + `. Up to four men go; each risks about ${riskPct(EXP_RISK)}% (${riskPct(EXP_RISK_SEA)}% across the sea, ${riskPct(EXP_RISK_FOE)}% if they meet enemies)${expLeader(h) ? `; the leader ${riskPct(EXP_RISK * LEADER_RISK)}% (${riskPct(EXP_RISK_SEA * LEADER_RISK)}% across the sea, ${riskPct(EXP_RISK_FOE * LEADER_RISK)}% against enemies)` : ''}.`, ok: able && rt.length > 0, why: !able ? 'No one fit to go' : !ready('explore', exN) ? `Your scouts need rest (${yl('explore', exN)})` : t.boats < 0.3 ? 'You know every land you can reach on foot — you need boats to go further' : 'You know every land you can reach',
        targets: rt.map(r => r.signed ? ({ ref: r, label: `${capFirst(r.dir)} — follow the signs, ${walkWord(r.km * 1000)}${r.across ? ', across the sea' : ''}`, hint: r.sign }) : ({ ref: r, label: `${capFirst(r.dir)} — unknown land from ${r.km} km${r.across ? ', across the sea' : ''}`, hint: `${Math.round(r.unk * 100)}% unknown${r.unk < 0.15 ? ' — you know these lands' : ''}` })) });
      if (t.boats >= 0.3) { const vr = able && ready('voyage', 3) ? voyageRoutes(W, c) : [];
        A.push({ id: 'voyage', icon: '⛵', label: 'Lead a sea voyage', hint: t.boats >= 0.6 ? 'Seagoing canoes — chart far coasts and islands' : 'Dugouts — follow the coast to chart unknown shores', ok: able && vr.length > 0, why: !able ? 'No one fit to go' : !ready('voyage', 3) ? `The canoes need mending (${yl('voyage', 3)})` : 'No unknown shores within reach of our canoes from here',
          targets: vr.map(r => ({ ref: r, label: `${r.dir[0].toUpperCase() + r.dir.slice(1)}, ${r.km} km ${r.open ? 'over open sea' : 'along the coast'}`, hint: `${Math.round(r.unk * 100)}% unknown waters` })) }); }
      const et = able && ready('expedition', 2) ? expeditionTargets(W, c) : [];
      A.push({ id: 'expedition', icon: '🎒', label: 'Lead an expedition to gather goods', hint: 'Fetch flint, amber, salt, ochre, axe-stone or ore from a source you know', ok: able && et.length > 0, why: !able ? 'No one fit to go' : !ready('expedition', 2) ? `Too soon (${yl('expedition', 2)})` : 'You know of no sources within 260 km — explore first',
        targets: et.map(e => ({ ref: e, label: `${DEPOSITS[e.d.type].icon} ${DEPOSITS[e.d.type].name}, ${e.km} km ${compass(e.d.x - c.x, e.d.y - c.y)}`, hint: `${e.d.note} · ${e.guard.length ? `in the land of the ${e.guard[0].tribe.name} (${isAllied(t, e.guard[0].tribe) ? bondWord(W, t, e.guard[0].tribe) + ': they let you pass' : opinion(e.guard[0].tribe, t) > 15 ? 'friendly' : opinion(e.guard[0].tribe, t) < -15 ? 'hostile!' : 'wary'})` : 'no one lives there'}` })) }); }
    // pitch the camp where the head chooses; it stays there until moved again (or until the land cannot feed it)
    if (!c.settled && !c.toSettle) A.push({ id: 'movecamp', icon: '⛺', label: c.head === h || !c.head ? 'Move camp' : `Ask ${c.head.name} to move the camp`, hint: `Choose where your clan camps, up to 80 km away: beside the wild grain, a flint source, the shore. The camp stays there until it is moved again${c.head && c.head !== h ? `. ${c.head.name} leads the clan and may say no` : ''}`, ok: ready('movecamp', c.head === h ? 1 : 2),
      why: c.head === h ? 'The clan has only just pitched camp (1 yr)' : `You asked not long ago (${yl('movecamp', 2)})`, targets: [{ pick: { maxKm: 80 }, label: 'Choose the place on the map…', hint: 'Any land you know of within 80 km that your people can reach' }] });
    // move the village to a site of our choosing (fresh fields, a better shore)
    if (c.settled && c.head === h) A.push({ id: 'movevillage', icon: '🏚', label: `Move ${c.village || 'the village'}`, hint: 'Rebuild on fresh ground within 40 km — new fields, full soil', ok: ready('movevillage', 8), why: `The village was only just built (${yl('movevillage', 8)})`, targets: [{ pick: { maxKm: 40 }, label: 'Choose the new site on the map…', hint: 'Anywhere on land within 40 km. Ground another people holds is theirs: they may demand that you leave' }] });
    // found a daughter village: the head of a village, or the leader of the tribe, sends its younger houses to new ground
    { const lead = t.headman === h, mine = c.head === h, grown = h.age >= 16;
      const cl = [...(mine || lead ? [c] : []), ...(lead ? t.clans.filter(o => o !== c && o.alive) : [])].filter(o => o.settled || o === c), good = [], bad = [];
      for (const o of cl) { const plan = {}, why = foundWhy(W, o, plan), sites = !why ? foundSites(W, o, { known: true, n: o === c ? 3 : 1 }) : []; if (!why && !sites.length) bad.push({ o, why: `No good ground is known within ${FOUND_MAX / 1000} km of ${o.village || 'the village'} that is free of other villages` }); else if (why) bad.push({ o, why }); else good.push({ o, plan, sites }); }
      const targets = []; for (const g of good) { const o = g.o, rest = o.people.length - g.plan.leavers.length;
        for (const st of g.sites) targets.push({ clan: o, ref: { x: st.x, y: st.y }, label: `${o === c ? '' : `The ${o.name} clan: `}${Math.round(st.km)} km ${compass(st.x - o.x, st.y - o.y)}`, hint: `${describePlace(W, st.x, st.y, o)}${landWarn(W, t, st.x, st.y) ? ' · ' + landWarn(W, t, st.x, st.y) : ''} · about ${g.plan.leavers.length} of ${o.people.length} would go, ${goName(g.plan, o)}; ${rest} stay` });
        if (o === c) targets.push({ clan: o, pick: { maxKm: FOUND_MAX / 1000 }, label: 'Choose the site on the map…', hint: `Known land ${FOUND_MIN / 1000} to ${FOUND_MAX / 1000} km away, ${c.live === 'fishing' ? 'on the shore, ' : ''}at least ${FOUND_APART / 1000} km from any other village` }); }
      const nm = bad.find(b => b.o === c) || bad[0];
      A.push({ id: 'foundvillage', icon: '🏘', label: 'Found a daughter village', hint: `Send a quarter to a third of a crowded village — the houses least close to the head's own, never the head's own household or the heir's — to raise a village of their own ${FOUND_MIN / 1000} to ${FOUND_MAX / 1000} km away. They take their share of the food and grain, and stay kin to you. Once in ${FOUND_YEARS} years for each village`, ok: grown && good.length > 0 && (mine || lead), targets,
        why: good.length > 0 && (mine || lead) && grown ? '' : !(mine || lead) ? 'Only a clan head or the leader of the tribe can send a clan\'s houses away' : !grown ? 'Your head is still a child' : !c.settled && !lead ? 'Your clan does not live in a village' : nm ? nm.why : 'No clan of the tribe lives in a village' }); }
    // clear new fields: push the cleared ground out from the village
    if (t.stage >= 2 || c.settled) { const why = fieldWhy(W, c, h), lv = fieldLv(c), wearNow = Math.round(100 / (1 + FIELD_WEAR * lv)), wearNext = Math.round(100 / (1 + FIELD_WEAR * (lv + 1)));
      A.push({ id: 'fields', icon: '🌾', label: 'Clear new fields', hint: `Break new ground beyond the village: ${fieldStep(lv + 1)}. It eats three weeks of the clan's food and can be done once in four years. The land can lie fallow in turn, so the soil wears at ${wearNext}% of the old rate (now ${wearNow}%), and the crop is ${Math.round(FIELD_CROP * 100)}% bigger for each step. The game leaves the cleared ground, and a great beast whose ground lies near it is driven off`, ok: !why, why }); }
    // a small clan can ask a friendly household of the tribe to come and live with it
    { const roomy = freeCount(c) < splitCap(W, c) - 5, inv = roomy ? inviteTargets(W, c) : [], food = c.store + c.grain >= needsWeek(c) * 3, grown = h.age >= 16;
      A.push({ id: 'invite', icon: '🤝', label: 'Invite a household to join us', hint: 'Feast a friendly household of your tribe and ask it to live with your clan: more hands, more wives, more children', ok: grown && inv.length > 0 && food && ready('invite', 4),
        why: !grown ? 'Your head is still a child' : !roomy ? `The clan is near the size at which it splits (${freeCount(c)} of ${splitCap(W, c)}): there is no room for another household` : !inv.length ? 'No household of a friendly clan nearby is free to come. Feasts and gifts at the gatherings win friends' : !food ? 'You need three weeks of food in store for the feast' : `Too soon after the last invitation (${yl('invite', 4)})`,
        targets: inv.map(x => ({ ref: x, label: `The house of ${x.f.name} (${x.o.name} clan), ${x.n} people`, hint: `${x.women} wom${x.women === 1 ? 'a' : 'e'}n of childbearing age, ${x.kids} children · ${x.op > 25 ? 'good friends: likely to come' : x.op > 5 ? 'friendly: may come' : 'lukewarm: may well refuse'}` })) }); }
    // call one of the blood home from another clan, with their household, so the house has an heir beside it
    { const away = dynMembers(W).filter(q => q.alive && !q.slave && q.clan && q.clan.alive && q.clan !== c && q.age >= 15 && q.age < 50 && q !== q.clan.head && (q.clan.tribe === t || opinion(q.clan.tribe, t) > -10)).sort((x, y) => (y.father === h || y.mother === h) - (x.father === h || x.mother === h) || x.age - y.age).slice(0, 6);
      if (away.length) A.push({ id: 'recall', icon: '🏠', label: 'Call one of the blood home', hint: 'Ask a son, daughter or kinsman who married into another clan to come back with their household. Only blood living in your clan can inherit the house', ok: h.age >= 16 && ready('recall', 5),
        why: h.age < 16 ? 'Your head is still a child' : `You asked not long ago (${yl('recall', 5)})`,
        targets: away.map(q => { const kids = q.clan.people.filter(x => (x.father === q || x.mother === q) && x.age < 13).length; return { ref: q, label: `${q.name}, ${relWord(q, h)}, ${Math.floor(q.age)}, living with the ${q.clan.name} clan`, hint: `${q.spouse && q.spouse.alive ? 'married' : 'unmarried'}, ${kids} young child${kids === 1 ? '' : 'ren'}. A gift goes to the clan they leave` }; }) }); }
    // a house with no one of its blood beside its head can take a child of the clan as its own
    if (!c.people.some(q => q.dyn && q !== h && !q.slave) && h.age >= 16) { const S = isMatri(t) ? 'F' : 'M', orph = q => (!q.father || !q.father.alive) + (!q.mother || !q.mother.alive);
      const cand = c.people.filter(q => !q.dyn && !q.slave && q.age >= 2 && q.age < 22 && q !== c.head && !q.spouse).sort((x, y) => (y.sex === S) - (x.sex === S) || orph(y) - orph(x) || y.age - x.age).slice(0, 5);
      A.push({ id: 'adopt', icon: '🧒', label: 'Adopt an heir', hint: 'No one of your blood lives in your clan, so the house would end with its head. Take a child of the clan into the house as your own, with gifts to the family', ok: cand.length > 0 && ready('adopt', 3), why: !cand.length ? 'There is no unmarried child or youth in the clan to adopt' : `You adopted not long ago (${yl('adopt', 3)})`,
        targets: cand.map(q => ({ ref: q, label: `${q.name}, a ${q.sex === 'F' ? 'girl' : 'boy'} of ${Math.floor(q.age)}`, hint: `${orph(q) === 2 ? 'an orphan' : 'of the house of ' + (q.fam ? q.fam.name : 'the clan')}${q.sex === S ? ' · can inherit by the custom of your people' : ''}` })) }); }
    // village works: palisade, ditch, granary, hall
    if (c.settled) { const opts = worksStatus(W, c), able = opts.filter(o => !o.why), lead = c.head === h;
      if (opts.length) A.push({ id: 'build', icon: '🔨', label: lead || !c.head ? 'Build for the village' : `Ask ${c.head.name} to build for the village`, hint: `A palisade against raiders, granaries, a great hall.${opts.some(o => o.why) ? ' Not yet: ' + opts.filter(o => o.why).map(o => `${WORKS[o.k].name}, ${o.why.charAt(0).toLowerCase() + o.why.slice(1)}`).join('; ') + '.' : ''}`, ok: able.length > 0 && ready('build', 2),
        why: !ready('build', 2) ? `The people are resting from the last great work (${yl('build', 2)})` : opts.filter(o => o.why).map(o => `${WORKS[o.k].name}: ${o.why}`).join('; '),
        targets: able.map(o => ({ ref: o.k, label: WORKS[o.k].name, hint: `${WORKS[o.k].hint}. The builders eat about ${Math.round(WORKS[o.k].cost * 7)} days of the village's food.${o.th && o.th.km ? ` The timber must be hauled from woodland ${o.th.km} km away, which costs ${haulDays(c, o.th)} days more: ${Math.round(WORKS[o.k].cost * 7) + haulDays(c, o.th)} in all.` : ''}` })) }); }
    // the sacred: hold a rite of your people's faith; raise a monument
    { const F = FAITHS[faithOf(t)], lead = c.head === h || t.headman === h;
      A.push({ id: 'rite', icon: F.icon, label: lead || !c.head ? `Hold ${F.rite}` : `Ask ${c.head.name} to hold ${F.rite}`, hint: `${F.short}: ${F.boon} For five years.`, ok: ready('rite', 4) && c.cond > 0.75, why: !ready('rite', 4) ? `The last rite was not long ago (${yl('rite', 4)})` : 'The clan is too hungry for feasting' });
      const kind = MON[faithOf(t)][0], canB = t.headman === h && (c.settled || faithOf(t) === 'spirits' || faithOf(t) === 'totem');
      A.push({ id: 'monument', icon: MON[faithOf(t)][1], label: `Raise a ${kind}`, hint: 'A lasting monument at our sacred place — renown, unity, and a gathering place others will come to', ok: canB && ready('monument', 15) && c.cond > 0.8, why: t.headman !== h ? `Only the ${isMatri(t) ? 'headwoman' : 'headman'} can command the whole tribe to build` : !canB ? 'Only settled peoples can raise great monuments of earth and stone' : !ready('monument', 15) ? `The people are still weary from the last great work (${yl('monument', 15)})` : 'The people are too hungry for great works' }); }
    // send a trader to a village that lacks what we have
    if (c.settled || (W.settlements && W.settlements.length >= 2 && c.head === h)) {
      const goods = TRADEABLE.concat(['copper', 'tin', 'bronze']).filter(g => (c.goods[g] || 0) >= 2), mine = (W.traders || []).filter(r => r.home === c).length;
      const tg = W.clans.filter(o => o !== c && o.settled && knows(W, o.x, o.y) && canReach(W, c, o.x, o.y) && Math.hypot(o.x - c.x, o.y - c.y) < 260000 && Math.hypot(o.x - c.x, o.y - c.y) > 10000 && !(o.tribe !== t && opinion(o.tribe, t) < -20))
        .map(o => ({ o, km: Math.round(Math.hypot(o.x - c.x, o.y - c.y) / 1000), want: goods.filter(g => !(o.goods[g] > 0)), offer: TRADEABLE.concat(['copper', 'tin', 'bronze']).filter(g => (o.goods[g] || 0) >= 2 && !(c.goods[g] > 0)) }))
        .sort((a, b) => (b.want.length + b.offer.length) / (1 + b.km / 80) - (a.want.length + a.offer.length) / (1 + a.km / 80)).slice(0, 6);
      A.push({ id: 'trader', icon: '🎒', label: 'Send a trader', hint: goods.length ? `Carry ${goods.map(g => GOOD_NAMES[g].toLowerCase()).join(', ')} to another village and bring back what we lack` : 'You have little surplus to trade', ok: goods.length > 0 && tg.length > 0 && mine < 2, why: !goods.length ? 'Nothing to spare — you need at least 2 of a good' : mine >= 2 ? 'Two traders of your clan, sent by you or by the clan, are already on the road' : 'You know of no villages within 260 km to trade with',
        targets: tg.map(e => ({ ref: e.o, label: `${e.o.village || e.o.name} of the ${e.o.tribe.name}, ${e.km} km ${compass(e.o.x - c.x, e.o.y - c.y)}`, hint: `${e.want.length ? 'they lack ' + e.want.map(g => GOOD_NAMES[g].toLowerCase()).join(', ') : 'they have what you carry'}${e.offer.length ? ' · they have ' + e.offer.map(g => GOOD_NAMES[g].toLowerCase()).join(', ') : ''}` })) });
    }
    // claim a source for the household to work, season after season
    { const ct = adult || myW >= 2 ? claimTargets(W, c) : [], n = (P.claims || []).length;
      A.push({ id: 'claim', icon: '⛏', label: 'Claim a source for the house', hint: `Your household will work it every season — ${n ? `now working ${n}` : 'flint, axe-stone, amber, salt, ochre, ore'}`, ok: ct.length > 0 && n < 4, why: n >= 4 ? 'The house can work at most 4 sources' : 'You know of no unclaimed sources within 180 km — explore first',
        targets: ct.map(e => ({ ref: e, label: `${DEPOSITS[e.d.type].icon} ${DEPOSITS[e.d.type].name}, ${e.km} km ${compass(e.d.x - c.x, e.d.y - c.y)}`, hint: `${e.d.note} · ${e.guard.length ? `in the land of the ${e.guard[0].tribe.name} (${isAllied(t, e.guard[0].tribe) ? bondWord(W, t, e.guard[0].tribe) + ': no trouble from them' : opinion(e.guard[0].tribe, t) > 15 ? 'friendly' : opinion(e.guard[0].tribe, t) < -15 ? 'hostile — expect trouble' : 'wary'})` : 'no one lives there'} · about ${CLAIM_YIELD[e.d.type] * 4} a year` })) }); }
    // build canoes
    { const ci = cellAt(c.x, c.y), water = c.coastal || W.seaDist[ci] <= 4 || W.acc[ci] > 400 || W.lake[ci];
      if (boatStage(t) < 2) A.push({ id: 'canoes', icon: '🛶', label: t.boats < 0.3 ? 'Build the first canoes' : 'Build seagoing canoes', hint: t.boats < 0.3 ? 'Hollow out great logs — fish further out, travel by water' : 'Hide-and-timber boats for the open sea, whales and crossings', ok: water && ready('canoes', 6), why: !water ? 'You camp far from the sea, a big river or a lake' : `Your boatbuilders are at work (${yl('canoes', 6)})` }); }
    // free a slave of the house
    { const sl = houseSlaves(W).filter(q => q.owner === h);
      if (sl.length) A.push({ id: 'free', icon: '🔓', label: 'Free a slave', hint: `${h.name} owns ${sl.length} slave${sl.length > 1 ? 's' : ''}. Free one to join your household — or let them go home`, ok: true, why: '',
        targets: sl.slice(0, 6).map(q => ({ ref: q, label: `${q.name}, ${Math.floor(q.age)} ${q.sex === 'F' ? '♀' : '♂'}`, hint: `taken from the ${q.origin ? q.origin.name : 'strangers'} ${Math.floor(W.week / 52) - Math.floor((q.taken || W.week) / 52)} years ago` })) }); }
    // envoys: alliance, trade pact, tribute, peace
    { const near = W.tribes.filter(o => o !== t && o.clans.length && knowsTribe(W, o) && o.clans.some(x => Math.hypot(x.x - c.x, x.y - c.y) < 260000)), hm = t.headman === h, lead = hm || c.head === h, lw = `Only the ${isMatri(t) ? 'headwoman' : 'headman'} speaks for the whole people`;
      const row = (o, kind) => ({ ref: o, label: `the ${o.name}`, hint: `${tribeSize(o)} people, ${warriors(o)} spears (you ${warriors(t)}) · ${opinion(o, t) > 15 ? 'friendly' : opinion(o, t) < -15 ? 'hostile' : 'neutral'} · ${speechWord(und(t, o))} · ${likely(envoyOdds(W, kind, t, o, h))} (about ${Math.round(envoyOdds(W, kind, t, o, h) * 100)}%)` });
      const al = near.filter(o => !isAllied(t, o) && !t.atWar.has(o.id) && opinion(o, t) > 5).sort((x, y) => opinion(y, t) - opinion(x, t)).slice(0, 5);
      if (near.length) A.push({ id: 'ally', icon: '🤝', label: 'Propose an alliance', hint: 'Send an envoy to a friendly people. Allies come to each other\'s aid, and those who would unite the tribes need allies', ok: hm && al.length > 0 && ready('ally', 3), why: !hm ? lw : !al.length ? 'No people you know thinks well enough of yours. Gifts, marriages and trade win them over' : `Your envoys are only just home (${yl('ally', 3)})`, targets: al.map(o => row(o, 'ally')) });
      const pc = near.filter(o => !t.atWar.has(o.id) && opinion(o, t) > -10 && !(t.rel.get(o.id) && t.rel.get(o.id).pact)).sort((x, y) => opinion(y, t) - opinion(x, t)).slice(0, 5);
      if (near.length) A.push({ id: 'pact', icon: '⚖', label: 'Agree a trade pact', hint: 'For twenty years your clans and theirs meet each year to trade: goods you lack, growing goodwill, and each learns the other\'s speech', ok: lead && pc.length > 0 && ready('pact', 2), why: !lead ? 'Only a clan head or the leader of the tribe can bind the people to a pact' : !pc.length ? 'No people nearby is on speaking terms and without a pact already' : `Too soon (${yl('pact', 2)})`, targets: pc.map(o => row(o, 'pact')) });
      const tb = near.filter(o => !isAllied(t, o) && warriors(t) >= warriors(o) * 1.5 && !(t.rel.get(o.id) && t.rel.get(o.id).tribute)).sort((x, y) => warriors(x) - warriors(y)).slice(0, 5);
      if (near.length) A.push({ id: 'tribute', icon: '🗡', label: 'Demand tribute', hint: 'A weaker people may pay food and valuables each year for ten years rather than face your spears. They will hate you for it', ok: hm && tb.length > 0 && ready('tribute', 4), why: !hm ? lw : !tb.length ? 'No people nearby is weak enough: you need half as many spears again as they have' : `Too soon (${yl('tribute', 4)})`, targets: tb.map(o => row(o, 'tribute')) });
      const pe = near.filter(o => !sameConfed(t, o) && (t.atWar.has(o.id) || opinion(o, t) < -30)).slice(0, 5);
      if (pe.length) A.push({ id: 'peace', icon: '🕊', label: 'Make peace', hint: 'Send an envoy with gifts to end a war or an old hatred', ok: hm && ready('peace', 2), why: !hm ? lw : `Too soon (${yl('peace', 2)})`, targets: pe.map(o => row(o, 'peace')) }); }
    // gifts
    { const g = GIFTABLE.reduce((s, x) => s + (c.goods[x] || 0), 0), others = W.tribes.filter(o => o !== t && knowsTribe(W, o) && o.clans.some(x => Math.hypot(x.x - c.x, x.y - c.y) < 200000)).sort((a, b) => opinion(t, a) - opinion(t, b)).slice(0, 5);
      A.push({ id: 'gifts', icon: '🎁', label: 'Send gifts to another tribe', hint: 'Spend valuables to win friends — a path to alliances', ok: (g > 0 || c.cond > 0.8) && others.length && ready('gifts', 2), why: !g && c.cond <= 0.8 ? 'Your clan has nothing to spare' : !others.length ? 'No other tribes nearby' : !ready('gifts', 2) ? `Too soon (${yl('gifts', 2)})` : '',
        targets: others.map(o => ({ ref: o, label: `the ${o.name}`, hint: `${tribeSize(o)} people · now ${opinion(t, o) > 15 ? 'friendly' : opinion(t, o) < -15 ? 'hostile' : 'neutral'}${isAllied(t, o) ? ' · ' + bondWord(W, t, o).replace(/^your /, '') : ''}` })) }); }
    // feast
    { const fed = c.cond >= 0.85 || c.grain > needsWeek(c) * 4;
      A.push({ id: 'feast', icon: '🔥', label: 'Hold a great feast', hint: 'Spend your stores and a great hunt to win the hearts of the other clans', ok: t.clans.length > 1 && fed && c.store + c.grain >= needsWeek(c) * 3 && ready('feast', 5), why: t.clans.length < 2 ? 'There are no other clans to impress' : c.store + c.grain < needsWeek(c) * 3 ? 'You need three weeks of food in store for a feast' : !fed ? 'Your clan is too hungry to feast others' : !ready('feast', 5) ? `Too soon (${yl('feast', 5)})` : '' }); }
    // give one of the clan's treasures to another people
    if (c.head === h && c.treasures && c.treasures.length) { const os = knownOthers(W, t).filter(o => o.clans.length).slice(0, 4);
      if (os.length) A.push({ id: 'treasure', icon: '💎', label: 'Give a treasure', hint: `Give one of the clan's named treasures to another people. It is the greatest gift there is, and the treasure's story goes with it. You keep the standing a treasure gives only while you hold it`, ok: ready('treasure', 3), why: `Too soon (${yl('treasure', 3)})`,
        targets: os.flatMap(o => c.treasures.slice(0, 3).map(tr => ({ ref: o, tr, label: `${tr.name[0].toUpperCase() + tr.name.slice(1)} to the ${o.name}`, hint: `They are ${relWordT(opinion(o, t))} now. +30 with them` }))) }); }
    // walk one of the people's stories
    if (t.myths && t.myths.length) { const ms = t.myths.slice().reverse().slice(0, 7);
      A.push({ id: 'walk', icon: '🌀', label: 'Walk a story', hint: `Re-enact one of the stories of the ${t.name} before the people. If it goes well the story gives what it promises; if not you lose face; and now and then the one who walks it does not come back. Costs two weeks of food`, ok: adult && ready('walk', 6) && c.cond > 0.75, why: !adult ? `${h.name} is too ${h.age < 16 ? 'young' : 'old'} to walk a story` : !ready('walk', 6) ? `A story is not walked lightly (${yl('walk', 6)})` : 'The clan is too hungry for it',
        targets: ms.map(m => ({ ref: m, label: `“${m.title}”`, hint: `About ${Math.round(walkOdds(W, h, c, t, m) * 100)}%. If it goes well: ${(WALK[m.kind] || WALK.hero).boon}. About one time in fourteen the walker is lost` })) }); }
    // a great beast within reach
    { const bs = (W.beasts || []).filter(b => b.alive && (b.name || b.kills) && beastNear(W, b, c)), men = c.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50).length;
      if (bs.length) A.push({ id: 'hunt', icon: '🐾', label: bs.length > 1 ? 'Hunt a great beast' : `Hunt ${beastNm(bs[0])}`, hint: `${bs.map(b => `${beastNm(b)[0].toUpperCase() + beastNm(b).slice(1)}${b.name ? `, ${BEASTS[b.kind].a},` : ''} is ${beastWhere(b, c)}. ${beastToll(b, false)}`).join(' ')} Whoever kills it will be told of for generations`, ok: men >= 3 && ready('hunt', 3), why: men < 3 ? 'Too few hunters' : `The hunters need rest (${yl('hunt', 3)})`,
        targets: bs.flatMap(b => [{ ref: b, led: false, p: beastOdds(W, b, c, false, h), label: `Send the best hunters after ${beastNm(b)}`, hint: `About ${Math.round(beastOdds(W, b, c, false, h) * 100)}% to kill it${BEASTS[b.kind].kill ? '. If they fail, one of them may not come home' : ''}` }].concat(adult ? [{ ref: b, led: true, p: beastOdds(W, b, c, true, h), label: `Lead the hunt for ${beastNm(b)} yourself`, hint: `About ${Math.round(beastOdds(W, b, c, true, h) * 100)}%. Great renown and a place in the stories${BEASTS[b.kind].kill ? `; if it fails, about one chance in ten that ${h.name} does not come home` : ''}` }] : [])) }); }
    // challenge for leadership
    if (c.head !== h) { const ch = c.head;
      A.push({ id: 'challengeClan', icon: '👊', label: `Challenge ${ch ? ch.name : 'for the clan'}`, hint: ch && h.fam ? `Try to become head of the ${c.name} clan. Your chance is about ${Math.round(clanChallengeOdds(W, c, h) * 100)}%: your standing is ${prestige(h).toFixed(2)} against ${ch.name}'s ${prestige(ch).toFixed(2)}, and the households of the clan weigh in. Failing costs renown and makes an enemy of ${ch.name}'s house${ruleOf(c) ? `. The clan keeps its head ${ruleOf(c) === 1 ? 'for life' : 'in one house'}, so your chance is ${ruleOf(c) === 1 ? 'three quarters' : 'half'} of the usual` : ''}` : `Try to become head of the ${c.name} clan — your standing and your kin decide it`, ok: ch && h.sex === leaderSex(t) && h.age >= (leaderSex(t) === 'F' ? 30 : 25) && ready('challengeClan', 6), why: !ch ? '' : h.sex !== leaderSex(t) ? (isMatri(t) ? 'Among the ' + t.name + ', only women lead the clans' : 'Among the ' + t.name + ', only men lead the clans') : h.age < (leaderSex(t) === 'F' ? 30 : 25) ? (leaderSex(t) === 'F' ? `A clan mother must be at least 30 (${h.name} is ${Math.floor(h.age)})` : `A clan head must be at least 25 (${h.name} is ${Math.floor(h.age)})`) : !ready('challengeClan', 6) ? `Wait (${yl('challengeClan', 6)})` : '' }); }
    else if (t.headman !== h) { const hm = t.headman;
      A.push({ id: 'challenge', icon: '👊', label: `Challenge ${hm ? hm.name : 'for the leadership'}`, hint: hm && hm !== h && hm.clan && hm.clan.tribe === t ? `Every clan backs one of you. ${tallyLine(headshipTally(W, t, h, hm, false), hm, challengeChance(W, t, h, hm))} Your chance is about ${Math.round(challengeChance(W, t, h, hm) * 100)}%${ruleOf(t) ? ` (the ${t.name} hold their leader ${ruleOf(t) === 1 ? 'for life' : 'in one clan'}: ${ruleOf(t) === 1 ? 'three quarters' : 'half'} of the usual)` : ''}.` : 'Try to become headman of the tribe', ok: hm && c.head === h && h.age >= 22 && ready('challenge', 8), why: !hm ? 'There is no headman' : c.head !== h ? 'Only a clan head can challenge' : h.age < 22 ? 'Too young' : !ready('challenge', 8) ? `Wait (${yl('challenge', 8)})` : '' }); }
    // how the clan and the tribe are led: the next step along the way, for the one who holds the seat
    for (const d of ruleDeeds(W, h, c, t, ready, yl)) A.push(d);
    // kingship
    if (t.headman === h && !t.confed) { const b = kingshipBid(W, t), f = b ? b.allies.filter(o => !o.confed) : [];
      A.push({ id: 'crown', icon: '👑', label: 'Unite the tribes', hint: 'Bind your allies into a confederacy, with you as high chief', ok: b && b.total >= b.need && f.length >= 2, why: !b ? '' : b.total < b.need ? `Your bid is ${b.total.toFixed(1)} of ${b.need.toFixed(1)}: renown, warriors, allies and gifts given all raise it` : b.allies.length >= 2 ? 'Two allied peoples must be free to follow you, and some of your allies already follow another ruler' : 'You need at least 2 allied tribes', data: f }); }
    // war (king)
    if (t.confed && t.confed.king === h) { const cf = t.confed, L = realmWarList(W, cf), reasons = L.no.slice(0, 6).map(x => `the ${x.o.name} (${x.why})`);
      A.push({ id: 'war', icon: '🏹', label: 'Make war on a tribe', hint: `Force a people you know of to submit and pay tribute. The nearest are listed first. One battle a year. They submit after two victories, or at once after a crushing one (the host over ${WAR_CRUSH} times as strong on the day). After a defeat the host may go home (${Math.round(WAR_QUIT * 100)} in 100; always after the third battle). The chances change with the numbers.${reasons.length ? ' Not open to war: ' + reasons.join('; ') + '.' : ''}`, ok: L.ok.length > 0 && !cf.wars.size, why: cf.wars.size ? 'You are already at war' : !L.ok.length ? `No people you know of lies within reach${reasons.length ? ': ' + reasons.slice(0, 3).join('; ') : ''}` : '',
        targets: L.ok.slice(0, 6).map(x => ({ ref: x.o, label: `the ${x.o.name}, ${x.km} km`, hint: x.hint })) }); }
    if (t.confed && t.confed.king === h && t.confed.wars.size) { const cf = t.confed, ws = [...cf.wars.keys()].map(id => W.ents.get(id)).filter(Boolean);
      A.push({ id: 'endwar', icon: '🕊', label: ws.length === 1 ? `Call off the war on the ${ws[0].name}` : 'Call off a war', hint: `Bring the host home. You lose 3 renown; the people you were fighting are glad of it and think a little better of the ${cf.capital.name}.`, ok: ws.length > 0, why: ws.length ? '' : 'The war is over already',
        targets: ws.map(o => ({ ref: o, label: `the ${o.name}`, hint: warText(cf, o.id) })) }); }
    realmMemberDeeds(W, A, h, t);
    realmDeeds(W, A, h, t);
    // settle
    if (!c.settled && !c.toSettle) {
      const b = c.coastal && t.boats >= 0.3 ? foodBreakdown(W, c.x, c.y, c.tool, t.boats) : null, aq = b ? (b.fish + b.shellfish + b.seals) / Math.max(1, needsWeek(c)) : 0;
      A.push({ id: 'settle', icon: '🏠', label: t.stage >= 2 ? 'Build a farming village' : 'Build a fishing village', hint: t.stage >= 2 ? 'Stay by your fields for good — grain stores and many children' : 'Live from the sea in one place for good', targets: [{ ref: 'auto', label: 'Let the elders choose the best spot', hint: t.stage >= 2 ? 'Good soil nearby, off other peoples\' land where there is any' : 'Right here on the shore' + (landWarn(W, t, c.x, c.y) ? '. ' + landWarn(W, t, c.x, c.y) : '') }, { pick: { maxKm: 40 }, label: 'Choose the spot on the map…', hint: (t.stage >= 2 ? 'Anywhere on land within 40 km' : 'On the shore, within 40 km') + '. Ground another people holds is theirs: they may demand that you leave' }], ok: t.stage >= 2 || aq > 0.9, why: t.stage < 2 && !(aq > 0.9) ? (t.stage < 2 && !c.coastal ? 'Your people do not yet sow grain, and you are far from rich waters' : 'The waters here are not rich enough, or you lack boats') : '' });
    }
    if (P.quietUntil && now < P.quietUntil) { const n = Math.max(1, Math.ceil((P.quietUntil - now) / 52)); for (const a of A) if (QUIET.includes(a.id)) { a.ok = false; a.why = `The clan is keeping the quiet after the sign (${n} yr${n > 1 ? 's' : ''} left)`; } }
    W._acts = { week: W.week, head: h, A }; return A;
  }
  // who answers the call to arms depends on who is calling: a household head, a clan head, a headman, a king
  function raidForces(W, c, h) {
    const t = c.tribe, F = [], vol = volunteers(c);
    if (c.head === h) { const n = myWarriors(c) + vol; if (n >= 4) F.push({ id: 'clan', n, short: `warriors (${myWarriors(c)} of the clan${vol ? ` and ${vol} volunteers from other clans` : ''})`, mix: `${myWarriors(c)} of the clan${vol ? ` and ${vol} volunteers from other clans` : ''}`, label: `The ${c.name} clan's warriors`, hint: `${myWarriors(c)} of your clan${vol ? ` and ${vol} volunteers from other clans` : ''}` }); }
    else { const n = houseFollowers(W, c, h).filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 55).length + vol; if (n >= 4) F.push({ id: 'house', n, short: 'men of your household and volunteers', label: 'Your household and volunteers', hint: `${n} men answer you — you are not clan head` }); }
    if (t.headman === h && t.clans.length > 1) { let n = 0, cl = 0; for (const o of t.clans) if (o === c || opinion(o, c) > -20) { n += myWarriors(o); cl++; } if (n >= 6) F.push({ id: 'tribe', n, short: 'tribal warriors', label: `Call up the ${t.name}`, hint: `${n} warriors of ${cl} clans — the other clans share the glory, and the blame` }); }
    const cf = t.confed; if (cf && cf.king === h) { let n = 0; const ts = confedTribes(W, cf); for (const o of ts) n += warriors(o); F.push({ id: 'realm', n, short: 'warriors of the realm', label: `Call up ${cf.name}`, hint: `${n} warriors of ${ts.length} tribes march at your word` }); }
    return F;
  }
  // can the head's people go / build here?
  function checkPlace(W, id, x, y) {
    const P = W.player, c = P && P.head.clan; if (!c) return 'No one to lead.';
    const i = cellAt(x, y), km = Math.hypot(x - c.x, y - c.y) / 1000;
    if (x < 0 || y < 0 || x >= WORLD || y >= WORLD || !W.land[i] || W.lake[i]) return 'That is water. Choose a spot on land.';
    if (!knows(W, x, y)) return 'Your people know nothing of that land. Explore it first.';
    if (!canReach(W, c, x, y)) return 'Your people cannot reach that land — it lies across the sea.';
    if (id === 'foundvillage') return siteWhy(W, c, x, y, true);
    if (id === 'movecamp') { if (Math.round(km) > 80) return `That is ${Math.round(km)} km away. A camp can move 80 km at a time.`; if (km < 2) return 'The camp is already there.'; }
    if (id === 'migrate') { if (Math.round(km) > 300) return `That is ${Math.round(km)} km away — too far (300 km at most).`; if (km < 15) return 'That is hardly a move at all. Choose somewhere further away.'; }
    if (id === 'settle' || id === 'movevillage') {
      if (Math.round(km) > 40) return `A village must be built within 40 km of where the clan is now (that is ${Math.round(km)} km).`;
      if (nearClans(W, x, y, 6000).some(o => o.settled && o !== c)) return 'Another village already stands there.';
      if (id === 'settle' && c.tribe.stage < 2 && W.seaDist[i] > 2) return 'A fishing village must stand on the shore.';
    }
    return null;
  }
  function doAction(W, id, k, f, place) { const h0 = W.player && W.player.head, R = doAction0(W, id, k, f, place); if (R && R.title !== 'Not possible' && h0 && id !== 'hunt' && id !== 'walk' && id !== 'treasure' && (id !== 'raid' || /succeeds/.test(R.title)) && !/says no|fails|No pact|Not yet|refuse/.test(R.title)) credit(h0, 'p_' + id); return R; }
  function doAction0(W, id, k, f, place) {
    const P = W.player, h = P.head, c = h.clan, t = c.tribe, A = (W._acts && W._acts.week === W.week && W._acts.head === h ? W._acts.A : playerActions(W)).find(a => a.id === id); // act on exactly the choices the player saw
    if (!A || !A.ok) return { title: 'Not possible', text: A ? A.why : '' };
    const cd = P.cool; cd[id] = W.week;
    // asking the clan's leader: standing and the goodwill between the two houses decide whether they listen
    if ((id === 'movecamp' || id === 'build' || (id === 'rite' && t.headman !== h)) && c.head && c.head !== h) {
      const ch = c.head, p = clamp(0.4 + (ch.fam && h.fam && ch.fam !== h.fam ? opinion(ch.fam, h.fam) : 30) / 100 + prestige(h) * 0.25 + (hasTrait(h, 'silver') ? 0.2 : 0), 0.15, 0.95);
      if (W.rand() > p) { houseNote(W, `${h.name} asked ${ch.name} to ${id === 'movecamp' ? 'move the camp' : id === 'build' ? 'build for the village' : 'hold the rite'}. ${ch.sex === 'F' ? 'She' : 'He'} said no.`);
        return { title: `${ch.name} says no`, text: `${ch.name}, who leads the ${c.name} clan, hears ${h.name} out and decides against it. Standing, and goodwill between your two houses, make ${ch.sex === 'F' ? 'her' : 'him'} likelier to listen. You can ask again in a while.` }; }
      houseNote(W, `${ch.name} agreed when ${h.name} asked to ${id === 'movecamp' ? 'move the camp' : id === 'build' ? 'build for the village' : 'hold the rite'}.`);
    }
    if (id === 'raid') {
      const o = A.targets[k] && A.targets[k].ref; if (!o) return null;
      const b4 = { mine: c.people.length, theirs: o.people.length, store: c.store + c.grain, gd: c.goods.amber + c.goods.bronze + c.goods.metal + c.goods.axe + c.goods.flint };
      const F = A.forces[f || 0] || A.forces[0];
      const odds = Math.round(raidChance(W, c, o, raidBonus(c, h, F)) * 100), R0 = raid(W, c, c, o, true, raidBonus(c, h, F)) || { win: false };
      if (F.id === 'tribe' || F.id === 'realm') { // a great war party: more than one camp is struck, and the other clans remember
        for (const o2 of t.clans) if (o2 !== c) affect(W, o2, c, R0.win ? 5 : -6, R0.win ? `${h.name} led us to victory over the ${o.tribe.name}` : `${h.name} led us to defeat against the ${o.tribe.name}`);
        if (R0.win && F.n > 2 * warriors(o.tribe)) { for (const o3 of o.tribe.clans) if (o3 !== o && Math.hypot(o3.x - o.x, o3.y - o.y) < 40000) { o3.store *= 0.5; affect(W, o3, c, -15, 'Our lands were ravaged', 10); if (!o3.settled) relocate(W, o3, 30000, 60000); } affect(W, o.tribe, t, -15, `${h.name}'s great war party ravaged our lands`, 20); }
      }
      const nCap = (R0.captives || []).length, freed = (R0.captives || []).filter(q => !q.slave), slaves = (R0.captives || []).filter(q => q.slave), lost = b4.mine - (c.people.length - nCap), killed = b4.theirs - o.people.length - nCap, gained = R0.win ? 1 : 0, tre = c.goods.amber + c.goods.bronze + c.goods.metal + c.goods.axe + c.goods.flint - b4.gd;
      let headFell = false;
      if (h.alive && W.rand() < raidHeadRisk(gained > 0, F.n)) { die(W, c, h, `killed leading a raid on the ${o.name}`); c.people = c.people.filter(q => q.alive); headFell = true; }
      P.renown += gained > 0 ? 3 + killed : -1;
      houseNote(W, `${h.name} led a raid on the ${o.name} of the ${o.tribe.name}: ${killed} of theirs fell, ${lost + (headFell ? 1 : 0)} of ours${headFell ? `, and ${h.name} ${h.sex === 'F' ? 'herself' : 'himself'} was slain` : ''}${gained > 0 ? '; we came home with plunder' : '; we came home empty-handed'}.`);
      return { title: gained > 0 ? 'The raid succeeds' : 'The raid fails', text: `${F.n} warriors (${F.mix || F.label.replace(/^Call up /, '')}) struck the ${o.name} ${o.settled ? 'village' : 'camp'}. ${killed} of theirs fell and ${lost + (headFell ? 1 : 0)} of ours.${gained > 0 ? ` You carried off ${(d => d >= 1 ? d + (d === 1 ? ' day' : ' days') + ' of food' : 'a little food')(Math.round((c.store + c.grain - b4.store) / Math.max(1, needsWeek(c) / 7)))}${tre > 0 ? ` and ${tre} valuable thing${tre > 1 ? 's' : ''}` : ''}${o.settled ? ' and grain from their stores' : ''}.` : ' They drove you off.'}${slaves.length ? ` <b>${slaves.length} captive${slaves.length > 1 ? 's' : ''}</b> (${slaves.map(q => `${q.name}, ${Math.floor(q.age)}`).join('; ')}) now belong${slaves.length > 1 ? '' : 's'} to ${h.name}.` : ''}${freed.length ? ` <b>${freed.map(q => q.name).join(' and ')}</b>, of the blood of your house, ${freed.length > 1 ? 'were' : 'was'} among the captives and came home free, not as ${freed.length > 1 ? 'slaves' : 'a slave'}.` : ''} The chance of winning was about ${odds}%.${headFell ? ` <b>${h.name} was killed in the fighting.</b>` : ''} The ${o.tribe.name} will not forget this.` };
    }
    if (id === 'landask' || id === 'landdrive') {
      const tg = A.targets[k]; if (!tg) return null; const F = A.forces[f || 0] || A.forces[0], cl = tg.ref;
      if (!landLive(W, t).includes(tg.rec) || !cl.alive || !cl.settled) { delete cd[id]; return cl.alive && cl.settled && cl.tribe && isAllied(t, cl.tribe) ? { title: 'Not now', text: `The ${cl.tribe.name} are bound to us now. We do not bid friends go.` } : { title: 'Too late', text: `The ${cl.name} clan have already left.` }; }
      return id === 'landask' ? landDoAsk(W, tg.rec, cl, F) : landDoDrive(W, tg.rec, cl, F);
    }
    if (id === 'invite') {
      const x = A.targets[k] && A.targets[k].ref; if (!x || !x.f.alive || x.f.clan !== x.o) return null;
      eatStore(c, needsWeek(c) * 1.5);
      const p = clamp(0.45 + x.op / 80 + prestige(h) * 0.2 + (hasTrait(h, 'silver') ? 0.15 : 0), 0.15, 0.97);
      if (W.rand() > p) { affect(W, x.f, h.fam || c, 4, `${h.name} feasted us`); houseNote(W, `${h.name} asked the house of ${x.f.name} to join us. They chose to stay with their kin.`);
        return { title: 'They stay with their kin', text: `The house of ${x.f.name} eat well at your fire and speak warmly, but they will not leave the ${x.o.name} clan. The feast was not wasted: they think better of you for it.` }; }
      const n = moveFamily(W, x.f, c); if (h.fam) affect(W, x.f, h.fam, 35, `${h.name} took us in`); affect(W, x.o, c, -6, `The house of ${x.f.name} left us for the ${c.name} clan`); P.renown += 1;
      houseNote(W, `The house of ${x.f.name} (${n} people) left the ${x.o.name} clan to live with us.`); note(W, c, `The house of ${x.f.name} came to live with us at the asking of ${h.name}.`);
      return { title: 'A household joins the clan', text: `The house of ${x.f.name}, ${n} people, take down their tents and come to live with the ${c.name} clan. The ${x.o.name} clan are a little sore about it.` };
    }
    if (id === 'recall') {
      const q = A.targets[k] && A.targets[k].ref; if (!q || !q.alive || !q.clan || q.clan === c) return null; const oc = q.clan;
      const tr = GIFTABLE.find(g => c.goods[g] > 0); if (tr) c.goods[tr]--; else eatStore(c, needsWeek(c));
      const heirHere = c.people.some(x => x.dyn && x !== h && x.age >= 15 && !x.slave), p = clamp(0.55 + opinion(oc, c) / 100 + (heirHere ? 0 : 0.25), 0.2, 0.95);
      if (W.rand() > p) { houseNote(W, `${h.name} asked ${q.name} to come home from the ${oc.name} clan. ${q.sex === 'F' ? 'She' : 'He'} chose to stay.`); return { title: `${q.name} stays`, text: `${q.name} has a life among the ${oc.name} now, and will not leave it this year. You can ask again in time; goodwill between the clans makes it likelier.` }; }
      const sp = q.spouse && q.spouse.alive && q.spouse.clan === oc && q.spouse !== oc.head ? q.spouse : null;
      const movers = [q, ...(sp ? [sp] : []), ...oc.people.filter(x => (x.father === q || x.mother === q) && x.age < 13 && x !== q && x !== sp)];
      const f = newFamily(W, c, q.sex === 'M' || !sp ? q : sp);
      for (const x of movers) { const i = oc.people.indexOf(x); if (i >= 0) oc.people.splice(i, 1); c.people.push(x); x.clan = c; x.fam = f; }
      affect(W, oc, c, -5, `${q.name} went back to the ${c.name} clan`); houseNote(W, `${q.name}, ${relWord(q, h)}, came home from the ${oc.name} clan with ${movers.length - 1} of ${q.sex === 'F' ? 'her' : 'his'} household.`);
      return { title: `${q.name} comes home`, text: `${q.name} returns to the ${c.name} clan${movers.length > 1 ? ` with ${movers.length - 1} of ${q.sex === 'F' ? 'her' : 'his'} household` : ''}. The house has its blood beside it again.` };
    }
    if (id === 'adopt') {
      const q = A.targets[k] && A.targets[k].ref; if (!q || !q.alive || q.clan !== c) return null;
      const tr = GIFTABLE.find(g => c.goods[g] > 0); if (tr) c.goods[tr]--; else eatStore(c, needsWeek(c) * 0.5);
      if (q.fam && h.fam && q.fam !== h.fam) affect(W, q.fam, h.fam, 15, `${h.name} adopted ${q.name}`);
      q.dyn = true; q.adopted = true; if (q.age < 15 && h.fam) q.fam = h.fam;
      houseNote(W, `${h.name} adopted ${q.name} (${Math.floor(q.age)}) into the house.`);
      return { title: `${q.name} joins the house`, text: `Before the whole clan ${h.name} names ${q.name} as ${h.sex === 'F' ? 'her' : 'his'} own child. ${q.name} and ${q.sex === 'F' ? 'her' : 'his'} children are of the blood of the house from this day, and can carry it on.` };
    }
    if (id === 'ally' || id === 'pact' || id === 'tribute' || id === 'peace') {
      const o = A.targets[k] && A.targets[k].ref; if (!o || !o.alive) return null; const p = envoyOdds(W, id, t, o, h), yes = W.rand() < p, r = rel(t, o);
      if (id === 'ally') { if (!yes) { affect(W, o, t, -2, 'An alliance refused'); houseNote(W, `The ${o.name} would not swear alliance with us.`); return { title: 'Not yet', text: `The ${o.name} hear your envoy with courtesy and send him home with small gifts and no oath. More goodwill is needed: marriages, gifts${r.pact ? '' : ', a trade pact'}.` }; }
        formAlliance(W, t, o); P.renown += 6; houseNote(W, `${h.name} made an alliance with the ${o.name}.`); return { title: 'An alliance is sworn', text: `Oaths are spoken over a fire and a shared meal. The ${t.name} and the ${o.name} are allies: neither raids the other, each may call on the other in war, and allied peoples can be united under one high chief.` }; }
      if (id === 'pact') { if (!yes) { houseNote(W, `The ${o.name} would not agree a trade pact.`); return { title: 'No pact', text: `The ${o.name} see no gain in it for now. Goodwill, and a little of each other's speech, would help.` }; }
        r.pact = W.week + 52 * 20; const way = pactSign(W, t, o, r); affect(W, o, t, 8, 'A trade pact agreed'); P.renown += 3; houseNote(W, `${h.name} agreed a trade pact with the ${o.name}.${way}`); note(W, t, `A trade pact was agreed with the ${o.name}.${way}`); note(W, o, `A trade pact was agreed with the ${t.name}.${way}`); logEvent(W, `The ${t.name} and the ${o.name} agree a trade pact for twenty years.${way}`, t, 'gather'); return { title: 'A trade pact', text: `For twenty years the clans of the ${t.name} and the ${o.name} will meet each summer to trade. Expect goods you lack to arrive, goodwill to grow year by year, and both peoples to pick up the other's speech.${way}` }; }
      if (id === 'tribute') { if (!yes) { const pk = peaceHeld(W, t, o); affect(W, o, t, pk ? -4 : -22, 'They demanded tribute of us', pk ? 0 : 15); houseNote(W, `The ${o.name} refused us tribute.`); return { title: 'They refuse', text: pk ? `The ${o.name} send your envoy back with cold words. The peace between you holds, but they think less of you (goodwill −4).` : `The ${o.name} send your envoy back with an insult. They will not pay, and they will not forget that you asked (goodwill −22).` }; }
        r.tribute = { to: t.id, until: W.week + 52 * 10 }; affect(W, o, t, -28, 'Forced to pay tribute', 10); P.renown += 8; houseNote(W, `The ${o.name} agreed to pay us tribute.`); return { title: 'Tribute', text: `The ${o.name} will send food and valuables to ${t.headman && t.headman.clan ? 'the ' + t.headman.clan.name + ' clan' : 'your leader'} each year for ten years. They hate you for it (goodwill −28), and will stop the moment they are strong enough.` }; }
      const tr = GIFTABLE.find(g => c.goods[g] > 0); if (tr) c.goods[tr]--; else eatStore(c, needsWeek(c));
      if (!yes) { houseNote(W, `The ${o.name} would not make peace.`); return { title: 'No peace', text: `The ${o.name} keep the gift and their anger. The dead on both sides are too fresh.` }; }
      t.atWar.delete(o.id); o.atWar.delete(t.id); r.grudge = 0; if (r.op < -8) r.op = -8; r.peaceUntil = W.week + 10 * 52; r.peaceFrom = W.week; r.peaceBy = 'player'; P.renown += 4; houseNote(W, `${h.name} made peace with the ${o.name}.`); logEvent(W, `Peace: ${h.name} of the ${t.name} and the ${o.name} lay down the old quarrel.`, t, 'gather');
      return { title: 'Peace', text: `Gifts are exchanged and the dead are named aloud one last time. The war and the old grudges between the ${t.name} and the ${o.name} are laid down. They are wary still, but no longer enemies. For ten years neither side will raid the other.` };
    }
    if (id === 'build') {
      const kk = A.targets[k] && A.targets[k].ref; if (!kk) return null; const D = WORKS[kk];
      const th0 = timberHaul(W, c, kk); build(W, c, kk, h); P.renown += kk === 'hall' ? 4 : kk === 'gran' ? 1 : 2; houseNote(W, `${h.name} had ${D.a} built at ${c.village || 'the village'}.`);
      return { title: D.name, text: `Through the slack months every household gives its days to the work, and ${c.village || 'the village'} now has ${D.a}.${th0 && th0.km ? ` The timber came from woodland ${th0.km} km away, and the hauling cost ${haulDays(c, th0)} days of the village's food besides.` : ''}<br><br>${D.hint}.` };
    }
    if (id === 'rite') {
      const F = FAITHS[faithOf(t)]; t.blessing = { type: faithOf(t), until: W.week + 52 * (hasTrait(h, 'pious') ? 8 : 5) }; t._W = W;
      c.store *= 0.6; for (const o of t.clans) if (o !== c) affect(W, o, c, 8, `Shared in ${F.rite}`);
      if (faithOf(t) === 'totem') for (const a of t.clans) for (const b of t.clans) if (a.id < b.id) affect(W, a, b, 6);
      if (faithOf(t) === 'ancestors') for (const o of t.clans) if (o.settled) o.soil = Math.min(1, o.soil + 0.05);
      P.renown += 3; houseNote(W, `${h.name} led ${F.rite}.`);
      return { title: F.name, text: `${F.desc}<br><br>${h.name} leads ${F.rite}. <b>${F.boon}</b> The blessing lasts five years.` };
    }
    if (id === 'monument') {
      const f = faithOf(t), x = t.site && Math.hypot(t.site.x - c.x, t.site.y - c.y) < 40000 ? t.site.x : c.x + 3000, y = t.site && Math.hypot(t.site.x - c.x, t.site.y - c.y) < 40000 ? t.site.y : c.y + 2000;
      const m = buildMonument(W, t, f, W.land[cellAt(x, y)] ? x : c.x, W.land[cellAt(x, y)] ? y : c.y, h.name);
      for (const o of t.clans) o.store *= 0.7; P.renown += 8; h.giftPrestige = (h.giftPrestige || 0) + 0.08;
      houseNote(W, `${h.name} had the ${t.name} raise ${m.name}, a ${m.kind}.`);
      return { title: m.name, text: `For a whole season every clan of the ${t.name} labours at ${h.name}'s word, and ${m.name} — a ${m.kind} — rises at the sacred place. It will be remembered long after ${h.name} is gone, and draws the clans and their neighbours together.` };
    }
    if (id === 'movecamp') {
      if (!place) return null; const km = Math.round(Math.hypot(place.x - c.x, place.y - c.y) / 1000), dir = compass(place.x - c.x, place.y - c.y);
      c.tx = place.x; c.ty = place.y; c.lastMove = W.week; c.holdUntil = W.week + 52 * 8; wear(W, c.x, c.y, place.x, place.y, c.people.length / 25);
      const gi = grainAccess(W, { x: place.x, y: place.y, tribe: t }) > 0.04;
      houseNote(W, `${h.name} moved the camp ${km} km ${dir}.`);
      return { title: 'The camp moves', text: `The ${c.name} clan strike their tents and walk ${km} km ${dir}. They will camp there until you move them again, unless the land cannot feed them.${gi && t.stage < 2 ? '<br><br>Wild grain grows within reach of the new camp. Reaping it year after year is how a people learns to sow.' : ''}` };
    }
    if (id === 'fields') {
      const n = clearFields(W, c); if (!n) return { title: 'No ground', text: 'There is no good ground left to clear.' };
      const lv = fieldLv(c), driven = driveBeasts(W, c), v = c.village || 'the village';
      houseNote(W, `${h.name} had new fields cleared for ${v}: ${fieldStep(lv)}.`);
      return { title: 'New fields', text: `Through the slack weeks the ${c.name} clan fell the trees, burn the scrub and break new ground. Another ${n} stretches are cleared, and the village now has ${fieldStep(lv)}. It cost three weeks of the clan's food.<br><br>The soil will wear at ${Math.round(100 / (1 + FIELD_WEAR * lv))}% of the old rate, because land can lie fallow in turn, and each year's crop is ${Math.round(FIELD_CROP * lv * 100)}% bigger than the home fields gave. The game has left the cleared ground.${driven.length ? `<br><br>${driven.map(d => `${beastNm(d.b)[0].toUpperCase() + beastNm(d.b).slice(1)} ${d.moved ? 'has been driven from its ground' : 'will not be seen again'}`).join('; ')}.` : ''}` };
    }
    if (id === 'movevillage') {
      if (!place) return null;
      c.tx = place.x; c.ty = place.y; c.soil = 1; c.settledAt = W.week; wear(W, c.x, c.y, place.x, place.y, c.people.length / 10);
      houseNote(W, `${h.name} moved ${c.village || 'the village'} ${Math.round(Math.hypot(place.x - c.x, place.y - c.y) / 1000)} km ${compass(place.x - c.x, place.y - c.y)}.`);
      return { title: 'A new site', text: `The people of ${c.village || 'the village'} pull down their houses and rebuild ${Math.round(Math.hypot(place.x - c.x, place.y - c.y) / 1000)} km ${compass(place.x - c.x, place.y - c.y)}, on fresh ground.${landWarn(W, t, place.x, place.y) ? '<br><br>' + landWarn(W, t, place.x, place.y) : ''}` };
    }
    if (id === 'trader') {
      const o = A.targets[k] && A.targets[k].ref; if (!o) return null; const r = sendTrader(W, c, o, null);
      houseNote(W, `${h.name} sent a trader to ${o.village || o.name} with ${Object.keys(r.pack).map(g => GOOD_NAMES[g].toLowerCase()).join(', ') || 'grain'}.`);
      return { title: 'A trader sets out', text: `A trader leaves for ${o.village || o.name} of the ${o.tribe.name} carrying ${Object.entries(r.pack).map(([g, n]) => `${n} ${GOOD_NAMES[g].toLowerCase()}`).join(', ') || 'grain'}. He will come back with whatever they can spare that you lack — if no one robs him on the way. Watch for him on the roads.` };
    }
    if (id === 'claim') {
      const e = A.targets[k] && A.targets[k].ref; if (!e) return null; P.claims = P.claims || [];
      P.claims.push({ d: e.d, since: W.week }); reveal(W, e.d.x, e.d.y, 15000);
      if (e.guard.length && !isAllied(e.guard[0].tribe, t)) affect(W, e.guard[0].tribe, t, -4, `The House of ${P.house} claimed the ${DEPOSITS[e.d.type].name.toLowerCase()} in our land`);
      houseNote(W, `${h.name} claimed the ${DEPOSITS[e.d.type].name.toLowerCase()} (${e.d.note}) for the house.`);
      return { title: 'A source claimed', text: `From now on the men of ${h.name}'s household go to the ${DEPOSITS[e.d.type].name.toLowerCase()} (${e.d.note}, ${e.km} km away) every season and bring back about ${CLAIM_YIELD[e.d.type]} ${GOOD_NAMES[e.d.type].toLowerCase()} each trip.${e.guard.length ? ` It lies in the land of the ${e.guard[0].tribe.name}, who may not like it.` : ''} You can give up the claim in the House panel.` };
    }
    if (id === 'canoes') {
      const before = boatStage(t); t.boats = Math.min(1, (t.boats < 0.3 ? Math.max(t.boats + 0.15, Math.min(0.3, t.boats + 0.15)) : t.boats + 0.12)); P.renown += 2;
      const after = boatStage(t);
      if (after > before) logEvent(W, after === 1 ? `🛶 The ${t.name} carve their first dugout canoes, urged on by ${h.name}.` : `⛵ The ${t.name} build seagoing canoes, urged on by ${h.name}.`, t, 'sea');
      houseNote(W, `${h.name} set the men of the ${c.name} to boatbuilding.`);
      if (after > before) houseNote(W, after === 1 ? 'Dugout canoes.' : 'Seagoing canoes.');
      return { title: after > before ? (after === 1 ? 'Dugout canoes' : 'Seagoing canoes') : 'Boatbuilding', text: after > before ? BOAT_TXT[after](t) : `The work goes on — ${Math.round(t.boats * 100)}% of the way to ${t.boats < 0.3 ? 'dugout canoes' : t.boats < 0.6 ? 'dugouts' : 'seagoing canoes'}. Another season of effort will get there.` };
    }
    if (id === 'free') {
      const q = A.targets[k] && A.targets[k].ref; if (!q || !q.slave) return null;
      q.slave = false; q.owner = null; q.fam = h.fam && h.fam.alive ? h.fam : null; P.renown += 1;
      if (q.origin && q.origin.alive) affect(W, q.origin, t, 6, `${h.name} freed ${q.name}, one of ours`);
      houseNote(W, `${h.name} freed ${q.name} and took ${q.sex === 'F' ? 'her' : 'him'} into the household.`);
      return { title: 'Freed', text: `${q.name} is a slave no longer and joins ${h.name}'s household as one of the ${c.name} clan.${q.origin && q.origin.alive ? ` The ${q.origin.name} hear of it.` : ''}` };
    }
    if (id === 'voyage') { const r = A.targets[k] && A.targets[k].ref; if (!r) return null; return doVoyage(W, c, h, r); }
    if (id === 'explore') { const r = A.targets[k] && A.targets[k].ref; if (!r) return null; return doExplore(W, c, h, r); }
    if (id === 'expedition') { const e = A.targets[k] && A.targets[k].ref; if (!e) return null; return doExpedition(W, c, h, e); }
    if (place) { const err = checkPlace(W, id, place.x, place.y); if (err) { delete cd[id]; return { title: 'Not there', text: err }; } }
    if (id === 'foundvillage') {
      const tg = A.targets[k]; if (!tg) return null; const o = tg.clan, site = place ? [place.x, place.y] : tg.ref ? [tg.ref.x, tg.ref.y] : null, plan = {}; if (!site) return null;
      if (!o.alive || foundWhy(W, o, plan)) { delete cd[id]; return { title: 'Not possible', text: 'The clan can no longer send a daughter village away.' }; }
      const err = siteWhy(W, o, site[0], site[1], true); if (err) { delete cd[id]; return { title: 'Not there', text: err }; }
      const lv = plan.leavers, big = new Map(); for (const q of lv) if (q.fam) big.set(q.fam, (big.get(q.fam) || 0) + 1);
      const B = [...plan.leave].sort((a, b) => (big.get(b) || 0) - (big.get(a) || 0))[0], H = o.head, bl = lv.filter(q => q.dyn && !q.slave), sl = lv.filter(q => q.slave && q.owner && q.owner.dyn);
      const nc = foundDaughter(W, o, plan.leave, site, B.name), km = Math.round(Math.hypot(site[0] - o.x, site[1] - o.y) / 1000), dir = compass(site[0] - o.x, site[1] - o.y), fish = o.live === 'fishing';
      affect(W, nc, o, 20, `Founded with the blessing of the ${o.name} clan`, 0); o.foundAt = o.letSplit = o.splitDone = W.week;
      const from = o.village || `the ${o.name} clan`, rest = o.people.length, who = o === c ? 'our' : `the ${o.name} clan's`;
      note(W, o, `${h.name} sent ${lv.length} people of ${goName(plan, o)} to raise a daughter village ${km} km ${dir}: the ${nc.name} clan.`); note(W, nc, `Sent out from ${from} with the blessing of the ${o.name} clan, to raise a village ${km} km ${dir}.`);
      logEvent(W, `The ${o.name} clan of ${from} sends ${lv.length} people to found a daughter village: the ${nc.name} clan, ${km} km ${dir}.`, nc, 'info');
      houseNote(W, `${h.name} sent ${lv.length} people of ${who} village to raise the ${nc.name} clan's ${fish ? 'fishing ' : ''}village ${km} km ${dir}. ${rest} stay${o === c ? ' with us' : ''}.${bl.length ? ` Of our blood, ${bl.length > 3 ? bl.length + ' went, among them ' + nameList(bl) : nameList(bl) + ' went'}.` : ''}`);
      return { title: 'A daughter village', text: `${lv.length} people of ${from}, ${goName(plan, o)}, take their share of the stores and set out as the ${nc.name} clan, kin and friends of the ${o.name}. They will walk ${km} km ${dir} and raise a ${fish ? 'fishing ' : ''}village on the ground you chose; it will stand a few weeks after they arrive. ${rest} remain in ${from}${H ? `, under ${H.name}` : ''}.${bl.length ? `<br><br>Of your blood, ${bl.length > 3 ? bl.length + ' go, among them ' + nameList(bl) : nameList(bl) + (bl.length > 1 ? ' go' : ' goes') + ' with them'}.` : ''}${sl.length ? ` ${sl.length === 1 ? sl[0].name + ', a slave of the house, goes' : sl.length + ' slaves of the house go'} too.` : ''}${landWarn(W, t, site[0], site[1]) ? '<br><br>' + landWarn(W, t, site[0], site[1]) : ''}` };
    }
    if (id === 'migrate') {
      const d = place ? { x: place.x, y: place.y, km: Math.round(Math.hypot(place.x - c.x, place.y - c.y) / 1000), dir: compass(place.x - c.x, place.y - c.y), label: 'Chosen' } : A.targets[k] && A.targets[k].ref; if (!d || d.pick) return null;
      if (c.head === h) return leadClanAway(W, c, d);
      const leavers = houseFollowers(W, c, h), fams = new Set(leavers.map(q => q.fam));
      c.people = c.people.filter(q => !leavers.includes(q));
      const nc = newClan(W, t, c.x, c.y, leavers, h.fam ? h.fam.name : nameIn(t.kult, W.rand, 2), c.id); nc.store = c.store * 0.3; c.store *= 0.7; nc.cond = c.cond;
      for (const f of fams) if (f) f.clan = nc;
      for (const g in c.goods) { const m = Math.floor(c.goods[g] * leavers.length / (leavers.length + c.people.length)); nc.goods[g] = m; c.goods[g] -= m; }
      nc.live = c.live; nc.cereal = c.cereal; nc.grain = 0; nc.favored = h; nc.head = h;
      affect(W, nc, c, 15, `${h.name} led his household away in peace`);
      note(W, c, `${h.name} led ${leavers.length} people away to found the ${nc.name} clan.`);
      return leadClanAway(W, nc, d);
    }
    if (id === 'treasure') { const tg = A.targets[k]; if (!tg) return null; const tr = tg.tr, o = tg.ref, i = (c.treasures || []).indexOf(tr); if (i < 0) return null; c.treasures.splice(i, 1);
      const oc = o.headman && o.headman.clan ? o.headman.clan : o.clans[0]; oc.treasures = oc.treasures || []; if (oc.treasures.length >= 6) oc.treasures.shift(); oc.treasures.push(tr); tr.hist.push(`given by ${h.name} of the ${c.name} to the ${o.name} (year ${Math.floor(W.week / 52)})`);
      affect(W, o, t, 30, `${h.name} gave us ${tr.name}`); rel(o, t).trade++; for (const x of o.clans) affect(W, x, c, 12); P.renown += 4; houseNote(W, `${h.name} gave ${tr.name} to the ${o.name}.`);
      return { title: 'A great gift', text: `${tr.name[0].toUpperCase() + tr.name.slice(1)} goes to the ${o.name}, with its whole story told over it. Nothing a people can give says more (+30). Renown +4.` }; }
    if (id === 'gifts') {
      const o = A.targets[k] && A.targets[k].ref; if (!o) return null;
      let n = 0; for (const g of GIFTABLE) while (c.goods[g] > 0 && n < 2) { c.goods[g]--; n++; }
      const furs = !n; if (furs) { n = 1; c.store *= 0.5; c.cond = Math.max(0.5, c.cond - 0.05); }
      affect(W, o, t, 12 * n, `Gifts from ${h.name} of the House of ${P.house}`); rel(o, t).trade++; for (const oc of o.clans) affect(W, oc, c, 6 * n);
      P.renown += n; houseNote(W, `${h.name} sent ${furs ? 'furs and meat' : n + ' valuables'} as gifts to the ${o.name}.`);
      return { title: 'Gifts received', text: `The ${o.name} accept ${h.name}'s ${furs ? 'gifts of furs and dried meat' : n + (n > 1 ? ' gifts' : ' gift')}. Their goodwill toward the ${t.name} grows${opinion(t, o) > 35 ? ' — an alliance may be within reach at the next gathering' : ''}.` };
    }
    if (id === 'feast') {
      const need = needsWeek(c); c.store *= 0.2; c.grain = Math.max(0, c.grain - need * 3); c.cond = Math.max(0.5, c.cond - 0.08);
      for (const o of t.clans) if (o !== c) affect(W, o, c, 14, `Feasted at the great feast of ${h.name}`);
      h.giftPrestige = (h.giftPrestige || 0) + 0.06; P.renown += 3; houseNote(W, `${h.name} held a great feast for all the clans of the ${t.name}.`);
      return { title: 'A great feast', text: `For days the clans of the ${t.name} eat, sing and dance at ${h.name}'s expense. They will remember ${h.sex === 'F' ? 'her' : 'his'} generosity.` };
    }
    if (id === 'walk') { const tg = A.targets[k]; if (!tg) return null; return walkStory(W, tg.ref); }
    if (id === 'hunt') { const tg = A.targets[k]; if (!tg || !tg.ref.alive) return { title: 'Too late', text: 'It is already gone.' }; if (c.shun && c.shun.id === tg.ref.id) c.shun = null; return beastHuntPlayer(W, tg.ref, tg.led, tg.p); }
    if (DEED_RULES[id]) return ruleDeed(W, id, A);
    if (id === 'challengeClan') {
      const ch = c.head, p = clanChallengeOdds(W, c, h);
      if (W.rand() < p) { c.favored = h; c.head = h; P.renown += 3; if (ch.fam && h.fam) affect(W, ch.fam, h.fam, -15, `${h.name} pushed ${ch.name} aside`, 5); note(W, c, `${h.name} of the House of ${P.house} took the headship from ${ch.name}.`); houseNote(W, `${h.name} became head of the ${c.name} clan, pushing aside ${ch.name}.`); return { title: 'Head of the clan', text: `The families of the ${c.name} rally behind ${h.name}. ${ch.name} steps aside, bitterly.` }; }
      if (ch.fam && h.fam) affect(W, ch.fam, h.fam, -25, `${h.name} tried to unseat ${ch.name}`, 10); P.renown -= 2; houseNote(W, `${h.name} challenged ${ch.name} for the clan and failed.`);
      { const wy = standingWhy(ch, h); return { title: 'The challenge fails', text: `The families stand by ${ch.name}. ${h.name} is humbled, and ${ch.name}'s household will not forget.<br><br>The chance was about ${Math.round(p * 100)}%: ${ch.name}'s standing is ${prestige(ch).toFixed(2)} against ${h.name}'s ${prestige(h).toFixed(2)}${wy.length ? ' (' + wy.join('; ') + ')' : ''}. Gifts and feasts, children, and friends among the clan's households all raise the odds.` }; }
    }
    if (id === 'challenge') { const ev = { type: 'challenge', data: { tribe: t, rival: t.headman }, options: [] }; W.pending.push(ev); W.lastResult = null; resolve(W, ev, 0); const R = W.lastResult; W.lastResult = null; return R || { title: 'Nothing came of it', text: '' }; }
    if (id === 'crown') { const f = A.data; newConfed(W, t, h, f); P.renown += 15; houseNote(W, `${h.name} united ${[t, ...f].map(o => 'the ' + o.name).join(', ')} and was raised as high chief.`); return { title: 'The tribes are united', text: `${h.name} is raised as high chief of ${t.confed.name}. At first the tribes follow you and not the seat, so the confederacy would end with you. After five years you can try to bind them to the seat.` }; }
    if (id === 'bindseat' || id === 'bloodseat' || id === 'kingdom' || id === 'leaverealm') return realmDeed(W, id, h, t, A);
    if (id === 'endwar') { const o = A.targets[k] && A.targets[k].ref, cf = t.confed; if (!o || !cf || !cf.wars.has(o.id)) return null; warOver(W, cf, o.id); P.renown -= 3; affect(W, o, cf.capital, 5, `The ${rulerWord(cf).toLowerCase()} called off the war`);
      const tx = `${rulerWord(cf)} ${h.name} called off the war on the ${o.name}.`; logEvent(W, tx, cf, 'king'); note(W, cf, tx); note(W, o, tx); houseNote(W, tx); return { title: 'The war is called off', text: `${tx} The host goes home. The ${o.name} are glad of it; our house loses 3 renown.` }; }
    if (id === 'war') { const o = A.targets[k] && A.targets[k].ref; if (!o) return null; const cf = t.confed; if (!realmWarList(W, cf).ok.some(x => x.o === o)) return { title: 'No war', text: `The host cannot march on the ${o.name} now.` }; cf.wars.set(o.id, 0); o.warLosses = 0; warBegin(W, cf, o); realmWarAllies(W, cf, o); logEvent(W, `⚔ ${rulerWord(cf)} ${h.name} of ${cf.name} goes to war to subjugate the ${o.name}.`, cf, 'blood'); houseNote(W, `${rulerWord(cf)} ${h.name} went to war against the ${o.name}.`); return { title: 'War', text: `${h.name}'s warriors march against the ${o.name}. Battles will be fought each year until they submit — or you give up.` }; }
    if (id === 'settle') {
      if (t.stage >= 2) { c.live = 'farm'; if (place) settleClan(W, c, true); else if (!settleClan(W, c, false, true)) settleClan(W, c, true); if (place) { c.tx = place.x; c.ty = place.y; } c.holdUntil = 0; t.dom = Math.min(0.6, t.dom + 0.05);
        const km = Math.round(Math.hypot(c.tx - c.x, c.ty - c.y) / 1000); P.renown += 2; houseNote(W, `${h.name} led the ${c.name} clan to build a permanent village.`);
        return { title: km > 2 ? 'The clan sets out' : 'A village is founded', text: km > 2 ? `The ${c.name} clan pack up and walk ${km} km to the chosen ground. The village will stand as soon as they arrive, in a few weeks. After that they wander no more: stores that last the winter, many more children, and a place raiders know where to find.${landWarn(W, t, c.tx, c.ty) ? '<br><br>' + landWarn(W, t, c.tx, c.ty) : ''}` : `The ${c.name} clan begin to build where they stand. They will wander no more: stores that last the winter, many more children, and a place raiders know where to find.${landWarn(W, t, c.tx, c.ty) ? '<br><br>' + landWarn(W, t, c.tx, c.ty) : ''}` }; }
      else { c.settled = true; c.live = 'fishing'; c.settledAt = W.week; c.village = freshName(W, c.tribe, 'haven'); c.tx = place ? place.x : c.x; c.ty = place ? place.y : c.y; logEvent(W, `🏘 The ${c.name} clan (${t.name}) build a permanent fishing village: ${c.village}.`, c, 'settle'); }
      P.renown += 2; houseNote(W, `${h.name} led the ${c.name} clan to build a permanent village.`);
      return { title: 'A village is founded', text: `The ${c.name} clan will wander no more. Expect stores that last the winter, many more children — and a place raiders know where to find.${landWarn(W, t, c.tx, c.ty) ? '<br><br>' + landWarn(W, t, c.tx, c.ty) : ''}` };
    }
  }
  function houseFollowers(W, c, h) {
    const fams = familiesOf(c), mine = new Set();
    for (const f of fams) if (f.head && (f.head === h || f.head.dyn || (h.fam && opinion(f, h.fam) > 25))) mine.add(f);
    if (h.fam) mine.add(h.fam);
    return c.people.filter(q => mine.has(q.fam) || q === h || (q.slave && q.owner && (q.owner === h || mine.has(q.owner.fam))));
  }
  function leadClanAway(W, c, d) {
    const P = W.player, h = P.head, old = c.tribe;
    let t = old;
    if (old.clans.length > 1) {
      t = newTribe(W, null, (old.hue + 60 + W.rand() * 120) % 360, old.id);
      old.clans.splice(old.clans.indexOf(c), 1); t.clans.push(c); c.tribe = t;
      for (const f of ['dom', 'stage', 'boats', 'metal', 'bronzeAge', 'flintW', 'copperArms']) t[f] = old[f]; t.culture = Object.assign({}, old.culture);
      // kin clans who love your clan may follow
      for (const o of [...old.clans]) if (t.clans.length < 3 && opinion(o, c) > 35 && W.rand() < 0.5) { old.clans.splice(old.clans.indexOf(o), 1); t.clans.push(o); o.tribe = t; }
      affect(W, t, old, 20, `The ${c.name} clan left in peace to found the ${t.name}`);
      t.favored = h; t.headman = h;
      if (!old.clans.length) { W.tribes.splice(W.tribes.indexOf(old), 1); kill(W, old); }
    }
    t.home = [d.x, d.y]; t.migrating = W.week;
    { const L = Math.hypot(d.x - c.x, d.y - c.y); for (let s2 = 0; s2 <= L; s2 += 12000) reveal(W, c.x + (d.x - c.x) * s2 / Math.max(1, L), c.y + (d.y - c.y) * s2 / Math.max(1, L), 14000); reveal(W, d.x, d.y, 30000); }
    for (const o of t.clans) { const a = W.rand() * 6.283, r = o === c ? 0 : 8000 + W.rand() * 12000; o.tx = clamp(d.x + Math.cos(a) * r, 3000, WORLD - 3000); o.ty = clamp(d.y + Math.sin(a) * r, 3000, WORLD - 3000); if (!W.land[cellAt(o.tx, o.ty)]) { o.tx = d.x; o.ty = d.y; } o.settled = false; o.founding = false; o.toSettle = false; o.atGathering = false; wear(W, o.x, o.y, o.tx, o.ty, o.people.length / 15); }
    if (t.stage === 3) for (const o of t.clans) o.live = o.live === 'fishing' ? null : o.live;
    P.renown += t !== old ? 6 : 2;
    const across = W.comp[cellAt(d.x, d.y)] !== W.comp[cellAt(c.x, c.y)];
    if (across) for (const o of t.clans) o.sailing = W.week;
    const txt = t !== old ? `${h.name} leads the ${c.name} clan${t.clans.length > 1 ? ` and ${t.clans.length - 1} kin clan${t.clans.length > 2 ? 's' : ''}` : ''} away from the ${old.alive ? old.name : 'old tribe'} to found a new people, the ${t.name}, ${d.km} km ${d.dir}${across ? ' across the sea' : ''}.` : `${h.name} leads the ${t.name} to new lands ${d.km} km ${d.dir}${across ? ' across the sea' : ''}.`;
    houseNote(W, txt); note(W, t, txt); logEvent(W, `🧭 ${txt}`, t, 'big');
    return { title: t !== old ? `The ${t.name} are born` : 'A new homeland', text: `${txt}<br><br>They will reach the new lands within weeks. ${h.name} now leads them.` };
  }

  // ----- big interrupting events -----
  function playerEvents(W) {
    const P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan || W.pending.length) return;
    const h = P.head, c = h.clan, t = c.tribe, r = W.rand();
    // scouts report rich, empty land
    if (c.head === h && !c.settled && r < 0.006 && W.week - (P.lastScout || -1e9) > yrs(18)) {
      const d = destinations(W, c).sort((a, b) => b.desc.includes('no one else') - a.desc.includes('no one else'))[0];
      if (d) { P.lastScout = W.week; pushEvent(W, { type: 'scouts', key: W.week, title: 'Scouts return', text: `Young men of the ${c.name} clan return from a long journey ${d.km} km ${d.dir}${d.label === 'Across the sea' ? ', across the sea' : ''}. They tell of ${d.desc}. Some say the clan should go there.`, data: { d }, options: [{ label: 'Lead the clan there', hint: t.clans.length > 1 ? `Found a new tribe with ${h.name} as headman` : 'Move the whole tribe' }, { label: 'Stay where we are' }] }); return; }
    }
    // a weakened enemy nearby
    if (r > 0.994 && W.week - (P.lastOpp || -1e9) > yrs(6)) {
      const weak = nearClans(W, c.x, c.y, 60000).find(o => o.tribe !== t && !sameConfed(t, o.tribe) && !peaceHeld(W, t, o.tribe) && opinion(t, o.tribe) < -15 && (o.cond < 0.75 || o.people.length < 15));
      if (weak) { P.lastOpp = W.week; pushEvent(W, { type: 'opportunity', key: weak.id, title: 'An enemy laid low', text: `Word comes that the ${weak.name} ${weak.settled ? 'village' : 'camp'} of the ${weak.tribe.name} — no friends of yours — is ${weak.cond < 0.75 ? 'starving' : 'down to a handful of people'}. Their stores and valuables are poorly guarded.`, data: { weak }, options: [{ label: 'Strike now', hint: `Lead a raid while they are weak: about ${Math.round(raidChance(W, c, weak, 1.5) * 100)}% to win` }, { label: 'Send them food', hint: 'Turn an enemy into a friend' }, { label: 'Leave them be' }] }); return; }
    }
    // sickness
    if (r > 0.4 && r < 0.4 + (c.settled ? 0.004 : 0.0015) && c.people.length > 15) {
      pushEvent(W, { type: 'sickness', key: W.week, title: 'Sickness in the ' + (c.settled ? 'village' : 'camp'), text: `A wasting fever spreads through the ${c.name} clan. The old and the very young are dying. The healers argue over what to do.`, data: { c }, options: [{ label: c.settled ? 'Leave the village for a season' : 'Break camp and scatter', hint: `Fewest deaths (about ${Math.max(1, Math.round(c.people.length * 0.03))}), but most of the stored food is left behind to spoil` }, { label: 'Stay and tend the sick', hint: `Most deaths (about ${Math.max(2, Math.round(c.people.length * 0.08))}), but the stores are kept, the other clans honour your care, and you gain renown` }, { label: 'Find the sorcerer who cursed us', hint: `About ${Math.max(1, Math.round(c.people.length * 0.05))} deaths and the stores kept, but one house of your own clan is accused and will hate yours` }] });
    }
  }
  const foundList = found => { const m = new Map(); for (const d of found) { const k = d.type + '|' + d.note; if (!m.has(k)) m.set(k, { d, n: 0 }); m.get(k).n++; } return [...m.values()].map(({ d, n }) => `${DEPOSITS[d.type].icon} ${DEPOSITS[d.type].name}${n > 1 ? ' ×' + n : ''} (${d.note})`).join('; '); };
  function sicknessToll(W, c, frac) {
    if (c.ward && c.ward.kind === 'fever' && c.ward.until > W.week) frac *= 0.5;
    const want = Math.max(0, Math.round(c.people.length * frac + (W.rand() - 0.5) * 1.2)), pool = c.people.filter(q => q.alive).map(q => ({ q, w: (q.age < 5 || q.age > 55 ? 5 : 1) * (0.5 + W.rand()) })).sort((x, y) => y.w - x.w); let n = 0;
    for (const { q } of pool.slice(0, want)) { die(W, c, q, 'a wasting fever'); n++; }
    c.people = c.people.filter(q => q.alive); if (n >= 3) remember(W, c.tribe, 'plague', { n }); return n;
  }

  // =====================================================================
  //  FOG OF WAR — the House only knows the lands its people have walked, heard of from trading partners
  //  and allies, seen at gatherings, or explored on expeditions.
  // =====================================================================
  function reveal(W, x, y, r) {
    const P = W.player; if (!P || !P.known) return 0;
    const g0 = Math.max(0, Math.floor((x - r) / CELL)), g1 = Math.min(N - 1, Math.floor((x + r) / CELL)), h0 = Math.max(0, Math.floor((y - r) / CELL)), h1 = Math.min(N - 1, Math.floor((y + r) / CELL));
    let n = 0;
    for (let gy = h0; gy <= h1; gy++) for (let gx = g0; gx <= g1; gx++) {
      const i = gy * N + gx; if (P.known[i]) continue;
      if (Math.hypot((gx + 0.5) * CELL - x, (gy + 0.5) * CELL - y) <= r) { P.known[i] = 1; n++; }
    }
    if (n) P.knownVer = (P.knownVer || 0) + 1;
    return n;
  }
  const knows = (W, x, y) => { const P = W.player; if (!P || P.over || !P.known) return true; const gx = clamp(Math.floor(x / CELL), 0, N - 1), gy = clamp(Math.floor(y / CELL), 0, N - 1); return !!P.known[gy * N + gx]; };
  const knowsTribe = (W, t) => { const P = W.player; if (!P || P.over || !P.known) return true; const mine = P.head.clan && P.head.clan.tribe; return t === mine || (mine && mine.rel.has(t.id)) || t.clans.some(c => knows(W, c.x, c.y)); };
  function fogMonth(W) {
    const P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan) return;
    if (!P.known) { P.known = new Uint8Array(N * N); for (const c of P.head.clan.tribe.clans) reveal(W, c.x, c.y, 70000); }
    const t = P.head.clan.tribe;
    for (const c of t.clans) {
      reveal(W, c.x, c.y, 22000);
      // hunters, foragers and wanderers range further every season: the known world creeps outward
      if (W.rand() < 0.35 + Math.min(0.4, c.people.length / 100)) { const a = W.rand() * 6.283, r = 25000 + W.rand() * 60000, x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r; if (x > 0 && y > 0 && x < WORLD && y < WORLD && W.land[cellAt(x, y)]) reveal(W, x, y, 9000 + W.rand() * 6000); }
      // strangers seen near our camps
      for (const o of nearClans(W, c.x, c.y, 40000)) if (o.tribe !== t) reveal(W, o.x, o.y, 9000);
    }
    // boatmen learn the coasts
    if (t.boats >= 0.3 && W.rand() < 0.5) { const c = t.clans[Math.floor(W.rand() * t.clans.length)]; if (c && c.coastal) { const a = W.rand() * 6.283, r = 20000 + W.rand() * (t.boats >= 0.6 ? 60000 : 30000); reveal(W, c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, 10000); } }
  }
  // ---- what a people knows, and who may learn it ----
  // Only the House keeps a map, but every people knows its own country. The rule is: the ruling tribe of a realm learns what
  // its subjects know (the whole of it: land, camps, old villages, the ways they tread, and where the peoples they know live), and what its
  // freely joined allies hold (their land and the country round their camps, not the peoples they know); and a tribe that is only a member
  // learns the land and camps of its ruler. It is applied when the learner is the House's tribe, since only the House has a map.
  function tribeKnown(W, t, peoples) {
    const cells = new Uint8Array(N * N), mark = (x, y, r) => {
      const g0 = Math.max(0, Math.floor((x - r) / CELL)), g1 = Math.min(N - 1, Math.floor((x + r) / CELL)), h0 = Math.max(0, Math.floor((y - r) / CELL)), h1 = Math.min(N - 1, Math.floor((y + r) / CELL));
      for (let gy = h0; gy <= h1; gy++) for (let gx = g0; gx <= g1; gx++) if (Math.hypot((gx + 0.5) * CELL - x, (gy + 0.5) * CELL - y) <= r) cells[gy * N + gx] = 1;
    };
    if (W.claim) for (let i = 0; i < N * N; i++) if (W.claim[i] === t.id) cells[i] = 1; // the land it holds
    for (const c of t.clans) mark(c.x, c.y, 40000); // the country round each camp, as far as hunters and foragers range
    for (const [, rec] of W.places) if (rec.tribe === t && rec.x != null) mark(rec.x, rec.y, 12000); // old and present village sites
    for (const m of W.monuments || []) if (m.tribe === t.id && m.alive !== false) mark(m.x, m.y, 12000);
    if (W.roads) for (const [k, v] of W.roads) if (v > 3) { const a = Math.floor(k / 40000), b = k % 40000; if (cells[a] || cells[b]) { cells[a] = 1; cells[b] = 1; } } // the ways they use lead a step beyond
    const tribes = [];
    if (peoples) for (const id of t.rel.keys()) { const o = W.ents.get(id); if (!o || !o.alive || !o.clans || !o.clans.length || o === t) continue; tribes.push(o); for (const c of o.clans) mark(c.x, c.y, 9000); }
    return { cells, tribes };
  }
  // the learner (the House's tribe) takes in what `from` knows; returns the peoples newly learned of
  function sightShare(W, from, full) {
    const P = W.player; if (!P || P.over || !P.known || !P.head || !P.head.alive || !P.head.clan) return null;
    const mine = P.head.clan.tribe, K = tribeKnown(W, from, full), fresh = K.tribes.filter(o => o !== mine && !knowsTribe(W, o));
    let n = 0; for (let i = 0; i < N * N; i++) if (K.cells[i] && !P.known[i]) { P.known[i] = 1; n++; }
    if (n) P.knownVer = (P.knownVer || 0) + 1;
    return { n, fresh };
  }
  const sightNames = fresh => { const w = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'], sh = fresh.slice(0, 5).map(o => 'the ' + o.name), more = fresh.length - sh.length; if (more > 0) sh.push(`${more} more`); return `${fresh.length <= 10 ? w[fresh.length] : fresh.length} ${fresh.length === 1 ? 'people' : 'peoples'} beyond it: ${sh.length > 1 ? sh.slice(0, -1).join(', ') + ' and ' + sh[sh.length - 1] : sh[0]}`; };
  function sightLearn(W, cf, t, status, first) {
    const P = W.player; if (!P || P.over || !P.known || !P.head || !P.head.clan) return;
    const mine = P.head.clan.tribe;
    if (cf.capital === mine && t !== mine) { // the House rules: it learns what the others know
      const r = sightShare(W, t, status === 'subject'); if (!r) return;
      P.sightIds = P.sightIds || []; r.fresh = r.fresh.filter(o => !P.sightIds.includes(o.id)); for (const o of r.fresh) P.sightIds.push(o.id); // each new people is told of once
      if (status === 'subject' && (first || r.fresh.length)) houseNote(W, `The ${t.name}, ${first ? 'now ' : ''}${isHead(W, cf.king) ? 'our subjects' : 'subjects of ' + cf.king.name}, told us of their country${r.fresh.length ? ' and of ' + sightNames(r.fresh) : ''}.`);
      return r;
    }
    if (t === mine && cf.capital !== mine) sightShare(W, cf.capital, false); // a member of someone else's realm sees its ruler's land and camps, nothing more
  }
  function sightYear(W) {
    for (const cf of W.confeds) if (cf.alive) for (const t of confedTribes(W, cf)) { const m = cf.members.get(t.id); if (m && m.status !== 'core') sightLearn(W, cf, t, m.status, false); }
  }
  function sightJoin(W, cf, t, status) {
    const P = W.player; if (!P || !P.known) return;
    const r = sightLearn(W, cf, t, status, true);
    const my = P.head && P.head.alive && P.head.clan && !P.over ? P.head.clan.tribe : null;
    if (status === 'subject' && my && my !== t && cf.members.has(my.id)) {
      const K = cf.king;
      if (isHead(W, K)) { const told = !P.sightTold; P.sightTold = true; notice(W, `The ${t.name} submit`, `The ${t.name} bow to you and must pay tribute.${told && r ? ' What they know of the land is now yours, and shows on your map.' : ''}`); }
      else notice(W, `The ${t.name} submit`, `The ${t.name} bow to ${K.name}, ${rulerOf(cf, K)}, and must pay tribute.`);
    }
  }
  // signs of peoples beyond the fog, found by our own hunters: yearly, for the player's tribe only (the world's peoples have no fog of war)
  function addSign(P, s) { P.signs = [s].concat((P.signs || []).filter(q => q.t !== s.t)).slice(0, 8); }
  function keptSigns(W) { const P = W.player; if (!P || !P.signs) return []; return P.signs.filter(s => { const o = W.tribes.find(x => x.id === s.t); return o && o.clans.length && !knowsTribe(W, o); }); }
  // signs shown to the player: not older than ten years (an old one is kept only so the same news is not told again)
  function liveSigns(W) { return keptSigns(W).filter(s => W.week - s.w < 520); }
  // is there already a sign for this people from the last ten years, or any sign that says the same (direction and days)?
  const signTold = (W, P, o, d, dir) => (P.signs || []).some(s => s.t === o.id && (W.week - s.w < 520 || (s.dir === dir && daysWalk(s.km * 1000) === daysWalk(d))));
  function signsYear(W) {
    const P = W.player; if (!P || P.over || !P.known || !P.head.alive || !P.head.clan) return;
    const mine = P.head.clan.tribe; if (P.signs) P.signs = keptSigns(W);
    const best = new Map(); // tribe -> nearest hidden camp to our own clan (the one the explore route measures from)
    { const c = P.head.clan; for (const o of signCamps(W, c)) { const d = Math.hypot(o.x - c.x, o.y - c.y), b = best.get(o.tribe); if (!b || d < b.d) best.set(o.tribe, { d, c, o }); } }
    const list = [...best.entries()].filter(([o, b]) => !knowsTribe(W, o) && !signTold(W, P, o, b.d, compass(b.o.x - b.c.x, b.o.y - b.c.y))).sort((a, b) => a[1].d - b[1].d);
    for (const [o, b] of list) {
      const p = b.d < 80000 ? 0.5 : b.d < 180000 ? 0.3 : 0.15;
      if (W.rand() < p) { const dir = compass(b.o.x - b.c.x, b.o.y - b.c.y); addSign(P, { t: o.id, dir, km: Math.round(b.d / 1000), w: W.week, kind: 'track' });
        houseNote(W, `Hunters of the ${b.c.name} clan came on a sign: ${signSentence(b.d, dir)}. Someone lives there.`); break; }
    }
  }
  // a trader of ours reaches a village: the hosts tell of peoples they have dealings with that we do not know
  function traderTale(W, r) {
    const P = W.player; if (!P || P.over || !P.known || !P.head.clan || r.home.tribe !== P.head.clan.tribe) return;
    const mine = P.head.clan.tribe; let best = null;
    for (const id of r.to.tribe.rel.keys()) { const o = W.tribes.find(x => x.id === id); if (!o || o === mine || !o.clans.length || knowsTribe(W, o)) continue;
      for (const oc of o.clans) { const c = P.head.clan, d = Math.hypot(oc.x - c.x, oc.y - c.y); if (d <= SIGN_R && (!best || d < best.d) && !signTold(W, P, o, d, compass(oc.x - c.x, oc.y - c.y))) best = { d, o, c, oc }; } }
    if (!best) return;
    const dir = compass(best.oc.x - best.c.x, best.oc.y - best.c.y);
    addSign(P, { t: best.o.id, dir, km: Math.round(best.d / 1000), w: W.week, kind: 'tale', name: best.o.name });
    houseNote(W, `At ${r.to.village || r.to.name} our trader heard tell of the ${best.o.name}, who live to the ${dir}, ${walkWord(best.d)}.`);
  }
  function fogYear(W) {
    const P = W.player; if (!P || P.over || !P.known || !P.head.alive || !P.head.clan) return;
    const t = P.head.clan.tribe;
    for (const o of W.tribes) if (o !== t) {
      const r = t.rel.get(o.id); if (!r) continue;
      const tell = isAllied(t, o) ? 16000 : r.trade > 0 || r.kin > 0 ? 10000 : 0; // allies, kin and trading partners tell of their lands
      if (tell) for (const c of o.clans) if (W.rand() < (isAllied(t, o) ? 0.7 : 0.35)) reveal(W, c.x, c.y, tell);
    }
  }
  // what other clans at a gathering talk about: their camps, and the way there
  function fogGathering(W, st, clans) {
    const P = W.player; if (!P || !P.known || !P.head.clan || !clans.some(c => c.tribe === P.head.clan.tribe)) return;
    reveal(W, st.x, st.y, 30000);
    for (const c of clans) { reveal(W, c.home ? c.home[0] : c.x, c.home ? c.home[1] : c.y, 12000); }
  }

  // ---- expeditions ----
  const EXP_GOODS = { flint: 4, axe: 2, amber: 3, ochre: 3, salt: 3, copper: 3, tin: 2, clay: 4 };
  // ---- word of peoples beyond the fog: signs reach as far as an expedition can walk (SIGN_R), and say how far ----
  const SIGN_R = 340000, SIGN_NEAR = 150000, DAY_M = 25000; // a party walks about 25 km a day; one helper turns metres into days
  const daysWalk = d => Math.max(1, Math.round(d / DAY_M));
  const walkWord = d => { const n = daysWalk(d); return n === 1 ? "a day's walk" : `some ${n} days' walk`; };
  // expedition danger per man: on land, across the sea, and if they meet a hostile people; the leader risks LEADER_RISK of that
  const EXP_RISK = 0.03, EXP_RISK_SEA = 0.06, EXP_RISK_FOE = 0.18, LEADER_RISK = 0.6;
  const expLeader = h => h.age >= 16 && h.age < 58 && h.sex === 'M'; // the head goes and risks his own life only in these years
  const riskPct = v => Math.round(v * 1000) / 10;
  // the chance that the head who leads a raid falls: shown in the choice, rolled in the deed
  const raidHeadRisk = (won, n) => (won ? 0.04 : 0.15) / Math.sqrt(Math.max(1, n / 8));
  // the camps of other peoples that lie on land the house has not seen, within SIGN_R of the clan's camp
  // hidden camps of peoples we do not know that a party could really walk to: what signs and sign routes are about
  const signCamps = (W, c) => hiddenCamps(W, c).filter(o => !knowsTribe(W, o.tribe) && W.land[cellAt(o.x, o.y)] && !W.lake[cellAt(o.x, o.y)] && canReach(W, c, o.x, o.y));
  function hiddenCamps(W, c) { return nearClans(W, c.x, c.y, SIGN_R).filter(o => o.tribe !== c.tribe && o.people.length > 3 && !knows(W, o.x, o.y)); }
  // what an explorer finds of them, by true distance: smoke of near camps, tracks of the middle ones, worked flint of the far ones
  function signText(d, dir) { return d < 80000 ? `the smoke of camps was seen far to the ${dir}` : d < 180000 ? `tracks and old hearths of strangers lead ${dir}` : `worked flint of a strange make was found; it came from the ${dir}, from far off`; }
  const signSentence = (d, dir) => `${signText(d, dir)}, ${walkWord(d)}`;
  const capFirst = x => x[0].toUpperCase() + x.slice(1);
  // after a journey: camps of other peoples within 70 km of the path or its end, not met, that the party would have seen the smoke of
  function smokeSeen(W, c, pts, ex, ey) {
    const seen = []; for (const o of W.clans) { if (o.tribe === c.tribe || !o.people.length || knows(W, o.x, o.y)) continue; if (pts.every(([px, py]) => Math.hypot(o.x - px, o.y - py) > 25000) && pts.some(([px, py]) => Math.hypot(o.x - px, o.y - py) <= 70000) && Math.hypot(o.x - c.x, o.y - c.y) <= 190000) seen.push(o); }
    if (!seen.length) return '';
    const dirs = [...new Set(seen.map(o => compass(o.x - ex, o.y - ey)))].slice(0, 2);
    return `From the high ground they saw smoke far to the ${dirs.join(' and the ')}: someone lives there.`;
  }
  function exploreRoutes(W, c) {
    // head for the nearest unknown land in each of eight directions
    const best = new Array(8).fill(null), P = W.player;
    for (let gy = 1; gy < N; gy += 2) for (let gx = 1; gx < N; gx += 2) {
      const i = gy * N + gx; if (!W.land[i] || W.lake[i] || (P.known && P.known[i])) continue;
      const x = (gx + 0.5) * CELL, y = (gy + 0.5) * CELL, d = Math.hypot(x - c.x, y - c.y); if (d < 30000 || d > 320000) continue;
      const sec = ((Math.round(Math.atan2(y - c.y, x - c.x) / (Math.PI / 4)) % 8) + 8) % 8;
      if (best[sec] && best[sec].d <= d) continue;
      if (!canReach(W, c, x, y)) continue;
      best[sec] = { x, y, d };
    }
    const out = [];
    for (const b of best) if (b) {
      const L = Math.min(b.d + 50000, 340000), ux = (b.x - c.x) / b.d, uy = (b.y - c.y) / b.d, pts = [];
      let ex = b.x, ey = b.y;
      for (let d = 10000; d <= L; d += 10000) { const px = clamp(c.x + ux * d, 2000, WORLD - 2000), py = clamp(c.y + uy * d, 2000, WORLD - 2000); pts.push([px, py]); if (W.land[cellAt(px, py)]) { ex = px; ey = py; } }
      let unk = 0, tot = 0; for (const [px, py] of pts) for (let s2 = 0; s2 < 6; s2++) { const qx = px + Math.cos(s2) * 15000, qy = py + Math.sin(s2) * 15000; if (!W.land[cellAt(qx, qy)]) continue; tot++; if (!knows(W, qx, qy)) unk++; }
      const across = W.comp[cellAt(b.x, b.y)] !== W.comp[cellAt(c.x, c.y)];
      out.push({ pts, x: ex, y: ey, dir: compass(ux, uy), km: Math.round(b.d / 1000), unk: unk / Math.max(1, tot), across });
    }
    // routes aimed straight at a hidden camp: the nearest in each of the eight sectors, nearest first, come before the unknown-land routes
    const sr = [], nearest = new Array(8).fill(null);
    // a party follows signs to camps near enough to see them by (within SIGN_NEAR), or to peoples our hunters or traders have already come on signs of
    const known = new Set(liveSigns(W).map(s => s.t));
    const nearT = new Map(); // people -> its nearest camp, so one people makes one route
    for (const o of signCamps(W, c)) { const d = Math.hypot(o.x - c.x, o.y - c.y), b = nearT.get(o.tribe); if (d > 0 && (!b || d < b.d)) nearT.set(o.tribe, { o, d }); }
    for (const { o } of nearT.values()) { const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy), sec = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8; if (d > SIGN_NEAR && !known.has(o.tribe.id)) continue; if (d > 0 && (!nearest[sec] || nearest[sec].d > d)) nearest[sec] = { o, d, dx, dy }; }
    for (let sec = 0; sec < 8; sec++) { const n = nearest[sec]; if (!n) continue;
      const ci = cellAt(n.o.x, n.o.y); if (!W.land[ci] || W.lake[ci] || !canReach(W, c, n.o.x, n.o.y)) continue;
      const across = W.comp[ci] !== W.comp[cellAt(c.x, c.y)], L = Math.min(n.d + 30000, 340000), ux = n.dx / n.d, uy = n.dy / n.d, pts = [];
      let ex = n.o.x, ey = n.o.y, ok = true;
      for (let d = 10000; d <= L; d += 10000) { const px = clamp(c.x + ux * d, 2000, WORLD - 2000), py = clamp(c.y + uy * d, 2000, WORLD - 2000); pts.push([px, py]); const ok2 = W.land[cellAt(px, py)]; if (!ok2 && d <= n.d + 5000 && !across) ok = false; if (ok2) { ex = px; ey = py; } }
      if (!ok) continue;
      let unk = 0, tot = 0; for (const [px, py] of pts) for (let s2 = 0; s2 < 6; s2++) { const qx = px + Math.cos(s2) * 15000, qy = py + Math.sin(s2) * 15000; if (!W.land[cellAt(qx, qy)]) continue; tot++; if (!knows(W, qx, qy)) unk++; }
      sr.push({ pts, x: ex, y: ey, dir: compass(ux, uy), km: Math.round(n.d / 1000), unk: unk / Math.max(1, tot), across, signed: true, d: n.d, sign: capFirst(signSentence(n.d, compass(ux, uy))) });
    }
    sr.sort((p, q) => p.d - q.d);
    const taken = new Set(sr.map(r => r.dir));
    return sr.slice(0, 4).concat(out.filter(r => r.unk > 0.06 && !taken.has(r.dir)).sort((p, q) => q.unk - p.unk)).slice(0, 4);
  }
  function expeditionTargets(W, c) {
    return W.deposits.filter(d => EXP_GOODS[d.type] && knows(W, d.x, d.y) && Math.hypot(d.x - c.x, d.y - c.y) < 260000 && canReach(W, c, d.x, d.y))
      .map(d => ({ d, km: Math.round(Math.hypot(d.x - c.x, d.y - c.y) / 1000), guard: nearClans(W, d.x, d.y, 25000).filter(o => o.tribe !== c.tribe) })).filter(sameSpot(c))
      .sort((a, b) => a.km - b.km).slice(0, 7);
  }
  function expeditionRisk(W, c, h, leader, others, risk) {
    // the head himself goes if he is able; otherwise young men go for him
    let lost = 0, headFell = false;
    const men = c.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 45 && q !== h);
    for (const q of men.slice(0, 4)) if (W.rand() < risk) { die(W, c, q, others ? `killed by the ${others.name} on an expedition` : 'lost on an expedition'); lost++; }
    if (leader && h.alive && W.rand() < risk * LEADER_RISK) { die(W, c, h, others ? `killed by the ${others.name} on an expedition` : 'lost on an expedition'); headFell = true; }
    c.people = c.people.filter(q => q.alive);
    return { lost, headFell };
  }
  function doExplore(W, c, h, route) {
    const P = W.player, leader = expLeader(h), before = new Set(W.deposits.filter(d => knows(W, d.x, d.y)));
    let n = 0; for (const [px, py] of route.pts) n += reveal(W, px, py, 25000);
    wear(W, c.x, c.y, route.x, route.y, 0.4);
    const found = W.deposits.filter(d => !before.has(d) && knows(W, d.x, d.y));
    const met = W.tribes.filter(o => o !== c.tribe && o.clans.some(oc => route.pts.some(([px, py]) => Math.hypot(oc.x - px, oc.y - py) < 25000)));
    let hostile = null;
    for (const o of met) { const r = c.tribe.rel.get(o.id); if (!r) { affect(W, c.tribe, o, 4, `First met on an expedition led by ${h.name}`); affect(W, o, c.tribe, W.rand() < 0.7 ? 3 : -8, 'Strangers came through our land'); } if (opinion(o, c.tribe) < -15 && !hostile) hostile = o; }
    const R = expeditionRisk(W, c, h, leader, hostile, hostile ? EXP_RISK_FOE : route.across ? EXP_RISK_SEA : EXP_RISK);
    for (const d of found) { if (EXP_GOODS[d.type] || d.type === 'grain') c.tribe.seen.add(d.type); }
    P.renown += 1 + found.length;
    const who = leader ? h.name : `Young men sent by ${h.name}`;
    const txt = `${who} ${leader ? 'leads an' : 'go on an'} expedition ${route.km} km ${route.dir}${route.across ? ', across the sea' : ''}, mapping some ${Math.round(n * CELL * CELL / 1e6).toLocaleString()} km² of new land.`;
    houseNote(W, txt + (found.length ? ` Found: ${[...new Set(found.map(d => DEPOSITS[d.type].name.toLowerCase()))].join(', ')}.` : ''));
    for (const d of found) logEvent(W, `🧭 The ${c.tribe.name} learn of ${DEPOSITS[d.type].name.toLowerCase()} — ${d.note}.`, c.tribe, 'trade');
    const smoke = met.length ? '' : smokeSeen(W, c, route.pts, route.x, route.y);
    return { title: found.length || met.length ? 'The explorers return' : smoke ? 'Smoke on the far hills' : 'Empty lands', text: `${txt}<br><br>${found.length ? `<b>They found:</b> ${foundList(found)}. You can now send an expedition to gather from these.<br>` : 'They found nothing of special value.<br>'}${met.length ? `They met ${met.map(o => 'the ' + o.name).join(', ')}.` : 'They met no one.'}${smoke ? ' ' + smoke : ''}${hostile ? ` The ${hostile.name} were not friendly.` : ''}${R.lost ? ` ${R.lost} of our men did not come back.` : ''}${R.headFell ? ` <b>${h.name} never returned.</b>` : ''}` };
  }
  function doExpedition(W, c, h, tg) {
    const P = W.player, d = tg.d, leader = expLeader(h), t = c.tribe;
    let amount = EXP_GOODS[d.type], risk = 0.02, note2 = '';
    const guards = tg.guard; let hostile = null;
    if (guards.length) {
      const gt = guards[0].tribe, op = opinion(gt, t);
      if (isAllied(gt, t) || op > 15) { note2 = ` The ${gt.name}, who hold that land, welcomed them.`; affect(W, gt, t, 3, 'Let them gather in our land'); }
      else if (op < -15) { hostile = gt; risk = 0.2; if (W.rand() < 0.5) { amount = Math.ceil(amount / 3); note2 = ` The ${gt.name} caught them and drove them off.`; } else note2 = ` They slipped past the ${gt.name}.`; affect(W, gt, t, -10, 'Took from our land without leave', 5); }
      else { if (W.rand() < 0.5) { c.store *= 0.6; note2 = ` The ${gt.name} demanded food as the price of passage.`; } else { note2 = ` The ${gt.name} grumbled at strangers taking from their land.`; affect(W, gt, t, -5, 'Took from our land'); } }
    }
    const R = expeditionRisk(W, c, h, leader, hostile, risk);
    c.goods[d.type] = (c.goods[d.type] || 0) + amount;
    if (d.type === 'flint') c.tool = Math.max(c.tool, d.q); if (d.type === 'axe') c.tool = Math.max(c.tool, 0.95 * d.q);
    if (!t.seen.has(d.type)) { t.seen.add(d.type); t.sources = t.sources || new Set(); t.sources.add(d.type); }
    wear(W, c.x, c.y, d.x, d.y, 1.2); reveal(W, d.x, d.y, 18000);
    P.renown += 1;
    const who = leader ? h.name : `Young men sent by ${h.name}`;
    houseNote(W, `${who} brought back ${amount} ${GOOD_NAMES[d.type].toLowerCase()} from ${tg.km} km away.`);
    const sm = smokeSeen(W, c, [[c.x, c.y], [(c.x + d.x) / 2, (c.y + d.y) / 2], [d.x, d.y]], d.x, d.y); if (sm) houseNote(W, sm.replace('From the high ground they saw', 'On the road to the ' + DEPOSITS[d.type].name.toLowerCase() + ' they saw'));
    return { title: 'The expedition returns', text: `${who} ${leader ? 'leads' : 'make'} the ${tg.km} km journey to the ${DEPOSITS[d.type].name.toLowerCase()} (${d.note}) and bring${leader ? 's' : ''} back <b>${amount} ${GOOD_NAMES[d.type].toLowerCase()}</b>.${note2}${R.lost ? ` ${R.lost === 1 ? 'One of our men was' : R.lost + ' of our men were'} lost.` : ''}${R.headFell ? ` <b>${h.name} was killed.</b>` : ''}${sm ? ' ' + sm : ''}${d.type === 'copper' || d.type === 'tin' ? ' Ore is only worked by settled peoples who know the smith\'s craft — or it can be traded to them.' : ''}` };
  }

  // =====================================================================
  //  CAPTIVES & SLAVES — taken in raids (mostly women and children). A slave belongs to a man, not to the
  //  clan: he works and eats with his owner's household, does not count toward the clan's or tribe's size
  //  (so does not push them to split), cannot fight, marry or lead, and passes to the owner's heir on his death.
  //  Some escape back to their own people, especially when their people camp nearby.
  // =====================================================================
  function slaveHeir(W, o) {
    const c = o.clan && o.clan.alive ? o.clan : null, all = c ? c.people : [];
    const free = q => q.alive && !q.slave && q !== o;
    return all.filter(q => free(q) && q.father === o && q.sex === 'M' && q.age >= 12).sort((a, b) => b.age - a.age)[0]
      || all.filter(q => free(q) && o.father && q.father === o.father && q.sex === 'M' && q.age >= 14).sort((a, b) => b.age - a.age)[0]
      || all.filter(q => free(q) && q.father === o).sort((a, b) => b.age - a.age)[0]
      || (o.fam && o.fam.alive && o.fam.head && free(o.fam.head) && o.fam.head.clan === c ? o.fam.head : null)
      || (c && c.head && free(c.head) ? c.head : null);
  }
  function enslave(W, q, from, to, owner) {
    const hw = W.player && !W.player.over && W.player.head.alive && !q.dyn && q.spouse === W.player.head; if (hw) houseNote(W, `${q.name}, ${q.sex === 'F' ? 'wife' : 'husband'} of ${W.player.head.name}, was carried off as a captive by the ${to.name} clan of the ${to.tribe.name}.`);
    from.people.splice(from.people.indexOf(q), 1); to.people.push(q); q.clan = to;
    if (q.spouse) { const s = q.spouse; if (s.spouse === q) s.spouse = null; q.spouse = null; if (s.wives) s.wives = Math.max(0, s.wives - 1); }
    for (const w of from.people) if (w.spouse === q) w.spouse = null;
    q.slave = true; q.owner = owner; q.origin = from.tribe; q.originClan = from; q.taken = W.week; q.fam = null; q.reserved = false;
    if (q.dyn && W.player && !W.player.over && houseNear(W, q)) { const hc = W.player.head.clan, ours = hc && from.tribe === hc.tribe; houseNote(W, ours ? `${q.name} of our blood was carried off as a captive by the ${to.name} clan of the ${to.tribe.name}.` : `${q.name}, of our blood among the ${from.tribe.name}, was taken captive by the ${to.name} clan of the ${to.tribe.name}.`); }
  }
  function takeCaptives(W, att, def, n, owner) {
    const pool = def.people.filter(q => !q.slave && q !== def.head && ((q.sex === 'F' && q.age >= 12 && q.age < 36) || (q.age >= 5 && q.age < 13)));
    const got = [];
    for (let k = 0; k < n && pool.length; k++) { const q = pool.splice(Math.floor(W.rand() * pool.length), 1)[0];
      if (kinOfHouse(W, q, att)) { // of the house's own blood, taken by the house's own kin: she comes home free
        def.people.splice(def.people.indexOf(q), 1); att.people.push(q); q.clan = att; q.fam = att.head && att.head.fam && att.head.fam.alive ? att.head.fam : null; q.reserved = false; q.freedByRaid = W.week; got.push(q);
        houseNote(W, `${q.name}, of our blood among the ${def.tribe.name}, was found among the captives and came home free with the raiders.`); continue; }
      enslave(W, q, def, att, owner); got.push(q); W.nCaptured = (W.nCaptured || 0) + 1; }
    if (got.some(q => q.slave)) affect(W, def, att, -15 * got.filter(q => q.slave).length, `Carried off ${got.filter(q => q.slave).length} of our people as slaves`, 15 * got.filter(q => q.slave).length);
    return got;
  }
  function slaveMonth(W) {
    const P = W.player, inh = new Map();
    const slaveList = c => { const L = c.people; for (let i = 0; i < L.length; i++) if (L[i].slave) return [...L]; return []; }; // a clan with no slave is not copied
    for (const c of W.clans) for (const q of slaveList(c)) {
      if (!q.slave) continue;
      let o = q.owner;
      if (!o || !o.alive || !o.clan || !o.clan.alive) {
        const heir = o ? slaveHeir(W, o) : null;
        if (!heir) { if (o && o.dyn && P && !P.over && houseNear(W, o)) houseNote(W, `${q.name}, who was ${o.name}'s slave, was taken into the ${c.name} clan as a free person: ${o.name} left no heir.`); q.slave = false; q.owner = null; q.fam = c.head && c.head.fam && c.head.fam.alive ? c.head.fam : q.fam; continue; } // no heir: the clan takes them in as its own
        if (o && o.dyn && P && heir.dyn) inh.set(heir, (inh.get(heir) || 0) + 1); else if (o && o.dyn && P && !P.over && houseNear(W, o)) houseNote(W, `${q.name}, a slave of ${o.name}, passed to ${heir.name}, who is not of our house.`);
        q.owner = o = heir;
      }
      if (o.clan !== c && o.clan.alive) { c.people.splice(c.people.indexOf(q), 1); o.clan.people.push(q); q.clan = o.clan; if (o.dyn && P && !P.over && houseNear(W, o)) houseNote(W, `${q.name}, a slave of ${o.name}, went with ${o.sex === 'F' ? 'her' : 'him'} to the ${o.clan.name} clan.`); }
      // escape: easier when one's own people are close
      const home = q.originClan && q.originClan.alive ? q.originClan : q.origin && q.origin.alive && q.origin.clans[0];
      const near = home && Math.hypot(home.x - q.clan.x, home.y - q.clan.y) < 50000;
      if (q.age >= 12 && W.rand() < (near ? 0.01 : 0.002)) {
        const cl = q.clan; cl.people.splice(cl.people.indexOf(q), 1);
        if (home) { home.people.push(q); q.clan = home; q.slave = false; q.owner = null; q.fam = home.head && home.head.fam && home.head.fam.alive ? home.head.fam : null; affect(W, cl, home, -3, `${q.name} escaped from us`); }
        else { q.alive = false; q.cause = 'fled into the wilds'; q.died = W.week; }
        if (o.dyn && P && !P.over && houseNear(W, o)) houseNote(W, `${q.name}, a slave of ${o.name}, escaped${home ? ` back to the ${home.tribe.name}` : ' into the wilds'}.`);
        continue;
      }
      // after many years, a captive taken as a child may be adopted into the clan
      if (q.taken != null && W.week - q.taken > 52 * 18 && W.rand() < 0.004) { q.slave = false; q.owner = null; q.fam = o.fam && o.fam.alive ? o.fam : null; if (o.dyn && P && houseNear(W, o)) houseNote(W, `${q.name}, long a slave of the house, was adopted into the ${c.name} clan.`); }
    }
    for (const [heir, n] of inh) if (houseNear(W, heir)) houseNote(W, `${heir.name} inherited ${n} slave${n > 1 ? 's' : ''}.`);
    // keep households consistent: anyone whose household lives in another clan joins a kinsman's household here
    for (const c of W.clans) for (const q of c.people) {
      if (q.fam && q.fam.alive && q.fam.clan !== c) {
        const k = [q.spouse, q.mother, q.father].find(o => o && o.alive && o.clan === c && o.fam && o.fam.alive && o.fam.clan === c);
        q.fam = k ? k.fam : (c.head && c.head.fam && c.head.fam.alive && c.head.fam.clan === c ? c.head.fam : q.fam);
      }
      q.nSlaves = 0;
    }
    for (const c of W.clans) for (const q of c.people) if (q.slave && q.owner) q.owner.nSlaves = (q.owner.nSlaves || 0) + 1;
  }
  const houseSlaves = W => { const out = []; for (const c of W.clans) for (const q of c.people) if (q.slave && q.owner && q.owner.dyn) out.push(q); return out; };

  // ---- claimed sources: the house's household works a quarry, salt pan or ore vein it has claimed ----
  const CLAIM_YIELD = { flint: 2, axe: 1, amber: 1, ochre: 1, salt: 1, copper: 1, tin: 1, clay: 2 }, CLAIM_CAP = { flint: 10, axe: 5, amber: 6, ochre: 6, salt: 6, copper: 8, tin: 5, clay: 6 };
  const sameSpot = c => (e, i, a) => !a.some((f, j) => f !== e && f.d.type === e.d.type && f.km === e.km && compass(f.d.x - c.x, f.d.y - c.y) === compass(e.d.x - c.x, e.d.y - c.y) && (f.d.q > e.d.q || f.d.q === e.d.q && j < i));
  function claimTargets(W, c) {
    const P = W.player, have = new Set((P.claims || []).map(k => k.d));
    return W.deposits.filter(d => CLAIM_YIELD[d.type] && !have.has(d) && knows(W, d.x, d.y) && Math.hypot(d.x - c.x, d.y - c.y) < 180000 && canReach(W, c, d.x, d.y))
      .map(d => ({ d, km: Math.round(Math.hypot(d.x - c.x, d.y - c.y) / 1000), guard: nearClans(W, d.x, d.y, 20000).filter(o => o.tribe !== c.tribe) })).filter(sameSpot(c)).sort((a, b) => a.km - b.km).slice(0, 7);
  }
  function claimsYear(W) {} // (kept for save compatibility)
  function claimsTrips(W) {
    const P = W.player; if (!P || P.over || !P.claims || !P.claims.length || !P.head.alive || !P.head.clan) return;
    const c = P.head.clan, t = c.tribe;
    for (const k of [...P.claims]) {
      const d = k.d, km = Math.hypot(d.x - c.x, d.y - c.y);
      if (km > 220000 || !canReach(W, c, d.x, d.y)) { P.claims.splice(P.claims.indexOf(k), 1); houseNote(W, `The house's claim to the ${DEPOSITS[d.type].name.toLowerCase()} (${d.note}) lapsed — it is too far from our camp now.`); continue; }
      if (c.atGathering) continue;
      const g = nearClans(W, d.x, d.y, 20000).filter(o => o.tribe !== t), gt = g[0] && g[0].tribe;
      if (gt && !isAllied(gt, t) && opinion(gt, t) < -15 && W.rand() < 0.3) { // the locals drive our men off
        const men = c.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 40 && q !== P.head);
        if (men.length && W.rand() < 0.35) { const v = pick(men, W.rand); die(W, c, v, `killed by the ${gt.name} at the ${DEPOSITS[d.type].name.toLowerCase()}`, g[0]); c.people = c.people.filter(q => q.alive); }
        affect(W, gt, t, -6, `Took from our ${DEPOSITS[d.type].name.toLowerCase()} without leave`, 4); k.trouble = (k.trouble || 0) + 1;
        if (!k.warned || W.week - k.warned > 104) { k.warned = W.week; houseNote(W, `The ${gt.name} drove our work party away from the ${DEPOSITS[d.type].name.toLowerCase()}.`); }
        continue;
      }
      if (gt && !isAllied(gt, t) && opinion(gt, t) < 15) affect(W, gt, t, -1, `Work parties of the House of ${P.house} take from our land`);
      const rvs = W.clans.filter(o => o.claim === d && o !== c), rv = rvs.length, shared = rvs.every(o => dealWith(W, o) === 'share'), y0 = (rv ? Math.max(1, Math.round(CLAIM_YIELD[d.type] / (1 + rv * (shared ? 0.4 : 0.8)))) : CLAIM_YIELD[d.type]) + (hasTrait(W.player.head, 'shrewd') && W.rand() < 0.35 ? 1 : 0);
      if (rv && !shared && W.rand() < 0.25) continue; // unwelcome rivals got there first
      c.goods[d.type] = Math.min(CLAIM_CAP[d.type], (c.goods[d.type] || 0) + y0); k.got = (k.got || 0) + y0;
      if (d.type === 'flint') c.tool = Math.max(c.tool, d.q); if (d.type === 'axe') c.tool = Math.max(c.tool, 0.95 * d.q);
      wear(W, c.x, c.y, d.x, d.y, 1.0); reveal(W, d.x, d.y, 12000);
    }
  }
  // ---- sea voyages: canoes follow the coast (dugouts) or strike out across open water (seagoing canoes) ----
  function voyageRoutes(W, c) {
    const t = c.tribe; if (t.boats < 0.3) return [];
    const maxSteps = t.boats >= 0.6 ? 50 : 18, okSea = i => !W.land[i] && W.shelf[i] && (W.shelf[i] === 1 || t.boats >= 0.6);
    // launch from the nearest shore
    let start = -1, sd = 1e9; const g0 = Math.floor(c.x / CELL), h0 = Math.floor(c.y / CELL);
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const gx = g0 + dx, gy = h0 + dy; if (gx < 0 || gy < 0 || gx >= N || gy >= N) continue; const i = gy * N + gx; if (okSea(i)) { const d = dx * dx + dy * dy; if (d < sd) { sd = d; start = i; } } }
    if (start < 0) return [];
    const dist = new Int16Array(N * N).fill(-1), par = new Int32Array(N * N).fill(-1), q = [start]; dist[start] = 0;
    for (let h = 0; h < q.length; h++) { const i = q[h]; if (dist[i] >= maxSteps) continue; const x = i % N, y = (i / N) | 0;
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = x + ax, ny = y + ay; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (dist[j] >= 0 || !okSea(j)) continue; dist[j] = dist[i] + 1; par[j] = i; q.push(j); } }
    // in each direction, the farthest point of the voyage with unknown coast nearby
    const best = new Array(8).fill(null);
    for (const i of q) { const x = (i % N + 0.5) * CELL, y = (((i / N) | 0) + 0.5) * CELL, d = Math.hypot(x - c.x, y - c.y); if (d < 20000) continue;
      if (knows(W, x, y) && knows(W, x + 12000, y) && knows(W, x - 12000, y) && knows(W, x, y + 12000) && knows(W, x, y - 12000)) continue;
      const sec = ((Math.round(Math.atan2(y - c.y, x - c.x) / (Math.PI / 4)) % 8) + 8) % 8;
      if (!best[sec] || dist[i] > best[sec].steps) best[sec] = { i, steps: dist[i], x, y }; }
    const out = [];
    for (const b of best) if (b) {
      const path = []; for (let i = b.i; i >= 0; i = par[i]) path.push([(i % N + 0.5) * CELL, (((i / N) | 0) + 0.5) * CELL]);
      path.reverse(); let unk = 0; for (const [x, y] of path) if (!knows(W, x, y)) unk++;
      const landAhead = W.comp[cellAt(b.x, b.y)] === 0 && W.tribes; // (always sea)
      out.push({ path, x: b.x, y: b.y, km: Math.round(b.steps * CELL / 1000), dir: compass(b.x - c.x, b.y - c.y), unk: unk / path.length, open: path.some(([x, y]) => W.shelf[cellAt(x, y)] === 2) });
    }
    return out.filter(r => r.unk > 0.05).sort((a, b) => b.unk * b.km - a.unk * a.km).slice(0, 4);
  }
  function doVoyage(W, c, h, r) {
    const P = W.player, t = c.tribe, leader = h.sex === 'M' && h.age >= 16 && h.age < 58, before = new Set(W.deposits.filter(d => knows(W, d.x, d.y)));
    let n = 0; for (let k = 0; k < r.path.length; k += 2) n += reveal(W, r.path[k][0], r.path[k][1], 16000);
    const found = W.deposits.filter(d => !before.has(d) && knows(W, d.x, d.y));
    const met = W.tribes.filter(o => o !== t && o.clans.some(oc => r.path.some(([x, y]) => Math.hypot(oc.x - x, oc.y - y) < 20000)));
    for (const o of met) if (!t.rel.has(o.id)) { affect(W, t, o, 4, `Met by canoe on a voyage led by ${h.name}`); affect(W, o, t, W.rand() < 0.7 ? 4 : -6, 'Strangers came by canoe'); }
    const lands = [...new Set(r.path.map(([x, y]) => W.comp[cellAt(x, y)]).filter(Boolean))];
    const otherIsle = W.landIdx.some ? null : null;
    const risk = r.open ? 0.08 : 0.03, R2 = expeditionRisk(W, c, h, leader, null, risk);
    P.renown += 1 + found.length; t.boats = Math.min(1, t.boats + 0.02); // seamanship grows with every voyage
    const who = leader ? h.name : `Young men sent by ${h.name}`;
    const txt = `${who} ${leader ? 'leads' : 'make'} a voyage ${r.km} km ${r.dir} by canoe${r.open ? ', out on the open sea' : ' along the coast'}, charting about ${Math.round(n * CELL * CELL / 1e6).toLocaleString()} km² of sea and shore.`;
    houseNote(W, txt + (found.length ? ` Found: ${[...new Set(found.map(d => DEPOSITS[d.type].name.toLowerCase()))].join(', ')}.` : ''));
    for (const d of found) logEvent(W, `⛵ The ${t.name} learn of ${DEPOSITS[d.type].name.toLowerCase()} — ${d.note}.`, t, 'sea');
    return { title: 'The canoes return', text: `${txt}<br><br>${found.length ? `<b>They found:</b> ${foundList(found)}.<br>` : 'They found nothing of special value on these shores.<br>'}${met.length ? `They met ${met.map(o => 'the ' + o.name).join(', ')}.` : 'They saw no one.'}${R2.lost ? ` ${R2.lost === 1 ? 'One man was' : R2.lost + ' men were'} lost to the sea.` : ''}${R2.headFell ? ` <b>${h.name} was lost at sea.</b>` : ''}` };
  }
  // the house learns what a new craft means for it
  function milestone(W, t, title, text) {
    const P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan || P.head.clan.tribe !== t) return;
    houseNote(W, title + '.'); pushEvent(W, { type: 'milestone', key: title + W.week, title, text, options: [{ label: 'Continue' }] });
  }
  function landNear(W, x, y) {
    const g0 = clamp(Math.floor(x / CELL), 0, N - 1), h0 = clamp(Math.floor(y / CELL), 0, N - 1);
    for (let r = 0; r <= 12; r++) { let best = null, bd = 1e18;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const gx = g0 + dx, gy = h0 + dy; if (gx < 0 || gy < 0 || gx >= N || gy >= N) continue; const i = gy * N + gx; if (!W.land[i] || W.lake[i]) continue; const px = W.px ? W.px[i] : (gx + 0.5) * CELL, py = W.py ? W.py[i] : (gy + 0.5) * CELL, d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = [px, py]; } }
      if (best) return best; }
    return [x, y];
  }

  // =====================================================================
  //  CULTURE & RELIGION — who rules, how descent runs, and what the people hold sacred.
  //  Drawn from the classic anthropology of tribal religion: animism and the shaman's trance (Eliade),
  //  totemic clan ancestors (Durkheim), the earth-and-fertility Mother of the early farmers, veneration of
  //  ancestors in long barrows, and later the sky-father and sun cults of the stone circles and bronze-age chiefs.
  //  Matrilineal peoples are led by clan mothers (husbands move to the wife's clan, daughters inherit);
  //  patrilineal peoples by men, with shamans or priests as the keepers of the sacred.
  // =====================================================================
  const FAITHS = {
    spirits: { name: 'Spirits of the land', icon: '🜁', leader: 'shaman', short: 'Animism & shamans',
      desc: 'Every river, rock and beast has a spirit. The shaman drums himself into trance to travel to the spirit world, to heal the sick and to ask the Master of Animals for game.',
      boon: 'Shamans heal and call the game: fewer deaths from illness, better hunting.', rite: 'a great trance-journey of the shaman' },
    totem: { name: 'Totem ancestors', icon: '🦌', leader: 'totem-keeper', short: 'Totemism',
      desc: 'Each clan descends from an animal ancestor — the Deer, the Wolf, the Salmon — whose flesh it may not eat. Kin of one totem must marry outside it, and clan bonds are sacred.',
      boon: 'Sacred clan bonds: clans rarely split in anger, and settle feuds more readily.', rite: 'the totem feast, where the clans dance their ancestors' },
    mother: { name: 'The Great Mother', icon: '♀', leader: 'priestess', short: 'Earth & fertility cult',
      desc: 'The Mother gives birth to grain, beasts and children and takes the dead back into her body. Her figurines stand by every hearth; her rites follow sowing and harvest.',
      boon: 'The Mother\'s favour: grain is tamed faster, and more children are born.', rite: 'the Mother\'s festival of sowing and birth' },
    ancestors: { name: 'The ancestors', icon: '⌓', leader: 'elders', short: 'Ancestor veneration',
      desc: 'The bones of the founders lie in the long barrow, and the dead watch over the living and the land. Offerings at the tomb bind the lineage to its fields.',
      boon: 'The dead guard their land: villages defend themselves fiercely.', rite: 'offerings at the tomb of the founders' },
    sky: { name: 'Sky-father & the sun', icon: '☉', leader: 'priest-chief', short: 'Sky & sun cult',
      desc: 'A thunder-wielding father of the sky and the sun he drives across the heavens. Stone circles mark midsummer and midwinter; chiefs and kings rule by his favour.',
      boon: 'Divine rule and warrior glory: fiercer warriors, and rulers who hold their realms together.', rite: 'the midsummer sun rite at the stones' },
  };
  const FAITH_KEYS = Object.keys(FAITHS);
  const isMatri = t => !!(t && t.culture && t.culture.matri);
  const faithOf = t => (t && t.culture && t.culture.faith) || 'spirits';
  const leaderSex = t => isMatri(t) ? 'F' : 'M';
  function newCulture(rand, faith) {
    const f = faith || pick(['spirits', 'spirits', 'totem', 'mother'], rand);
    const matri = rand() < (f === 'mother' ? 0.75 : f === 'totem' ? 0.4 : f === 'spirits' ? 0.15 : 0.1); return { faith: f, matri, patri: matri ? 0.2 : 0.8 };
  }
  const cultureName = t => `${isMatri(t) ? 'Matrilineal · ruled by clan mothers' : 'Patrilineal · ruled by men'} · ${FAITHS[faithOf(t)].name}`;
  // a blessing from a rite lasts a few years
  const blessed = t => t && t.blessing && t.blessing.until > (t._W ? t._W.week : 0);
  function cultureYear(W) {
    for (const t of W.tribes) {
      t._W = W; if (!t.culture) t.culture = newCulture(W.rand);
      const cu = t.culture, old = cu.faith, oldM = cu.matri;
      // farmers turn to the Mother, settled lineages to their ancestors; bronze and kings bring the sky-father
      if (t.stage >= 2 && cu.faith === 'spirits' && W.rand() < 0.02) cu.faith = 'mother';
      if (t.stage === 3 && cu.faith !== 'ancestors' && cu.faith !== 'sky' && t.clans.some(c => c.settled && W.week - (c.settledAt || W.week) > 52 * 40) && W.rand() < 0.012) cu.faith = 'ancestors';
      if ((t.bronzeAge || (t.confed && t.confed.capital === t)) && cu.faith !== 'sky' && W.rand() < 0.03) cu.faith = 'sky';
      // the slow drift from mother-right to father-right: settled fields, herds, metal wealth and war pass to sons
      if (cu.patri == null) cu.patri = cu.matri ? 0.2 : 0.8;
      { const sc = t.clans.length ? t.clans.filter(c => c.settled).length / t.clans.length : 0, f = cu.faith;
        let d = 0.004 * sc + (t.stage === 3 ? 0.0015 : 0) + (t.metal >= 0.3 ? 0.003 : 0) + (t.bronzeAge ? 0.002 : 0) + (tribeSize(t) > 150 ? 0.0015 : 0)
          + Math.min(0.003, (t.warYr || 0) * 0.0005) + (f === 'sky' ? 0.004 : f === 'ancestors' ? 0.0015 : f === 'mother' ? -0.002 : 0)
          + (!sc && t.stage < 2 ? (cu.patri < 0.5 ? -0.001 : 0.001) : 0) + (W.rand() - 0.5) * 0.004;
        t.warYr = 0;
        const before = cu.patri; cu.patri = clamp(before + d, 0, 1);
        if (before < 0.35 && cu.patri >= 0.35) { note(W, t, 'Men gained a stronger voice in the councils of the clan mothers.'); logEvent(W, `The ${t.name}: fields and herds pass more and more to sons — men gain a voice in the councils of the clan mothers.`, t, 'info'); }
        if (before < 0.5 && cu.patri >= 0.5 && cu.matri) { note(W, t, 'Bride-price began to replace bride-service; wives started to move to their husbands.'); logEvent(W, `The ${t.name}: bride-price replaces bride-service — some wives now move to their husbands' clans.`, t, 'info'); }
        if (cu.matri && cu.patri >= 0.6) cu.matri = false;
        else if (!cu.matri && cu.patri <= 0.4) cu.matri = true;
      }
      // neighbours, in-laws and overlords carry their gods with them
      if (W.rand() < 0.15) {
        let best = null, bs = 0;
        for (const o of W.tribes) { if (o === t || faithOf(o) === cu.faith) continue; const r = t.rel.get(o.id); if (!r) continue;
          const pull = (r.kin * 0.4 + (r.allied ? 2 : 0) + (t.confed && o.confed === t.confed && t.confed.capital === o ? 4 : 0) + Math.max(0, r.op) / 30) * Math.sqrt(tribeSize(o) / Math.max(20, tribeSize(t)));
          if (pull > bs) { bs = pull; best = o; } }
        if (best && W.rand() < Math.min(0.25, bs / 30)) cu.faith = faithOf(best);
      }
      if (cu.faith !== old) {
        const F = FAITHS[cu.faith];
        note(W, t, `Turned from ${FAITHS[old].name.toLowerCase()} to ${F.name.toLowerCase()}.`);
        logEvent(W, `${F.icon} The ${t.name} turn to a new faith: ${F.name.toLowerCase()} — ${F.short.toLowerCase()}.`, t, 'info');
        const P = W.player; if (P && !P.over && P.head.alive && P.head.clan && P.head.clan.tribe === t) { houseNote(W, `The ${t.name} turned to ${F.name.toLowerCase()}.`); pushEvent(W, { type: 'milestone', key: 'faith' + W.week, title: `A new faith: ${F.name}`, text: `${F.desc}<br><br><b>${F.boon}</b>`, options: [{ label: 'Continue' }] }); }
      }
      if (cu.matri !== oldM) milestone(W, t, cu.matri ? 'The rule of the clan mothers' : 'The rule of fathers', cu.matri ? `Among the ${t.name}, descent now runs through mothers. Clan mothers lead the clans, husbands go to live with their wives' clans, and daughters inherit.` : `Over generations, fields, herds and metal wealth have come to pass from fathers to sons. Among the ${t.name}, men now lead the clans, wives go to live with their husbands' clans, and sons inherit.`);
      if (cu.matri !== oldM) logEvent(W, `The ${t.name} ${cu.matri ? 'come to reckon descent through the mothers; clan mothers now lead' : 'abandon the rule of the clan mothers; men now lead and descent runs through fathers'}.`, t, 'info');
    }
    monumentsYear(W);
  }
  // monuments: barrows, stone circles, sacred groves and Mother shrines rise where settled peoples gather
  const MON = { ancestors: ['long barrow', '⌓'], sky: ['stone circle', '◎'], mother: ['shrine of the Mother', '♀'], spirits: ['sacred grove', '♣'], totem: ['totem pole', '𐌉'] };
  function monumentsYear(W) {
    W.monuments = W.monuments || [];
    for (const t of W.tribes) {
      const f = faithOf(t), settled = t.clans.filter(c => c.settled), mine = W.monuments.filter(m => m.tribe === t.id && m.alive !== false).length;
      const p = (settled.length ? 0.012 * Math.min(3, settled.length) : f === 'spirits' || f === 'totem' ? 0.004 : 0) * (f === 'ancestors' || f === 'sky' ? 1.6 : 1) / (1 + mine * 2);
      if (!t.clans.length || W.rand() > p) continue;
      const c = settled.length ? pick(settled, W.rand) : t.clans[0], site = t.site && Math.hypot(t.site.x - c.x, t.site.y - c.y) < 40000 ? t.site : null;
      const x = site ? site.x : c.x + (W.rand() - 0.5) * 6000, y = site ? site.y : c.y + (W.rand() - 0.5) * 6000; if (!W.land[cellAt(x, y)]) continue;
      buildMonument(W, t, f, x, y, null);
    }
  }
  function buildMonument(W, t, f, x, y, by) {
    const [kind] = MON[f], m = { x, y, faith: f, kind, tribe: t.id, tribeName: t.name, built: W.week, name: `${nameIn(t.kult, W.rand, 2)} ${kind === 'long barrow' ? 'Barrow' : kind === 'stone circle' ? 'Stones' : kind === 'sacred grove' ? 'Grove' : kind === 'totem pole' ? 'Pole' : 'Shrine'}`, by };
    W.monuments.push(m); if (t.site) t.site.prestige = (t.site.prestige || 0) + 8;
    if (t.headman) t.headman.giftPrestige = (t.headman.giftPrestige || 0) + 0.05;
    for (const a of t.clans) for (const b of t.clans) if (a.id < b.id) affect(W, a, b, 4);
    logEvent(W, `${MON[f][1]} The ${t.name} raise a ${kind}: ${m.name}${by ? `, built at the word of ${by}` : ''}.`, t, 'info');
    return m;
  }

  // =====================================================================
  //  RIVALRY WITHIN THE TRIBE — clans compete for quarries, hunting grounds and the leadership
  // =====================================================================
  function aiClaims(W) {
    const P = W.player, pc = P && !P.over && P.head.alive ? P.head.clan : null;
    const houseClaims = new Map(); if (P && P.claims) for (const k of P.claims) houseClaims.set(k.d, k);
    for (const c of W.clans) {
      if (c === pc || c.people.length < 8) continue;
      if (c.claim && (Math.hypot(c.claim.x - c.x, c.claim.y - c.y) > 80000 || !canReach(W, c, c.claim.x, c.claim.y))) c.claim = null;
      if (!c.claim && W.rand() < 0.3) { // take up a source near the camp
        let best = null, bd = 50000; for (const d of W.deposits) { if (!CLAIM_YIELD[d.type] || (c.barred && c.barred.d === d && c.barred.until > W.week)) continue; const dd = Math.hypot(d.x - c.x, d.y - c.y); if (dd < bd && canReach(W, c, d.x, d.y) && (c.goods[d.type] || 0) < 3) { bd = dd; best = d; } }
        if (best) c.claim = best;
      }
      const d = c.claim; if (!d) continue;
      // others working the same source: the stronger clan gets the better of it
      const rivals = W.clans.filter(o => o !== c && o.claim === d), hk = houseClaims.get(d);
      let share = 1 / (1 + rivals.length + (hk ? 1 : 0));
      for (const o of rivals) { if (W.rand() < 0.3) affect(W, c, o, -1.5, `Quarrels at the ${DEPOSITS[d.type].name.toLowerCase()}`); if (warriorsOf(c) > warriorsOf(o) * 1.5) share = Math.min(1, share * 1.6); }
      if (hk && pc) { const nm = DEPOSITS[d.type].name.toLowerCase(); hk.rivals = (hk.rivals || 0) + 1;
        if (dealWith(W, c) === 'share') { hk.sh = hk.sh || {}; if (!hk.sh[c.id]) { hk.sh[c.id] = 1; affect(W, c, pc, 6, `The House of ${P.house} lets us work their ${nm}`); houseNote(W, `The ${c.name} clan${c.tribe !== pc.tribe ? ` of the ${c.tribe.name}` : ''} now work the ${nm} alongside your house.`); } }
        else { if (hk.sh) delete hk.sh[c.id]; if (!hk.lastDrive || W.week - hk.lastDrive > 52 * 3) { hk.lastDrive = W.week; const r = driveOff(W, hk, c); notice(W, r.win ? 'Rivals driven off' : 'Beaten back at the source', r.txt); } }
        if (!c.claim) continue; }
      if (W.rand() < share * 1.5) c.goods[d.type] = Math.min(CLAIM_CAP[d.type], (c.goods[d.type] || 0) + 1);
      if (d.type === 'flint' && c.goods.flint > 0) c.tool = Math.max(c.tool, d.q * 0.95);
    }
  }
  // the house learns that others work its source, and decides what to do
  function k_contest(W, k, rival) {
    const P = W.player; k.rivals = (k.rivals || 0) + 1;
    if (k.lastAsk && W.week - k.lastAsk < 52 * 4) return; k.lastAsk = W.week;
    const d = k.d, same = rival.tribe === P.head.clan.tribe;
    pushEvent(W, { type: 'quarry', key: d.x + ':' + d.y, title: `Rivals at the ${DEPOSITS[d.type].name.toLowerCase()}`, text: `Men of the ${rival.name} clan${same ? ', of our own tribe,' : ` of the ${rival.tribe.name}`} are working the ${DEPOSITS[d.type].name.toLowerCase()} (${d.note}) that your house has claimed. They have ${warriorsOf(rival)} fighting men; your clan has ${warriorsOf(P.head.clan)}.`, data: { k, rival },
      options: [{ label: 'Share it', hint: 'Less for us, but goodwill' }, { label: 'Drive them off', hint: same ? 'Blood between kin clans — the tribe will remember' : 'A fight, and a grudge' }, { label: 'Give up our claim', hint: 'Let them have it' }] });
  }
  function rivalryYear(W) {
    const P = W.player, pc = P && !P.over && P.head.alive ? P.head.clan : null;
    for (const t of W.tribes) {
      if (t.clans.length < 2) continue;
      const wealth = c => GIFTABLE.reduce((s, g) => s + (c.goods[g] || 0), 0) + c.people.length / 8 + (c.grain / Math.max(1, needsWeek(c))) / 6;
      for (const a of t.clans) for (const b of t.clans) {
        if (a === b) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        // crowding on the same hunting grounds
        if (d < 15000 && !a.settled && !b.settled) affect(W, a, b, a.cond < 0.85 ? -2 : -0.7, a.cond < 0.85 ? `Hungry, and the ${b.name} hunt our grounds` : null);
        // envy of the rich and the many
        const wa = wealth(a), wb = wealth(b); if (wb > wa * 1.6 && wb - wa > 3) affect(W, a, b, -1.2 * (b === pc ? 1.3 : 1), `Envy of the ${b.name}'s wealth`);
      }
      // a rival clan head may contest the house's hold on the tribe
      if (pc && pc.tribe === t && t.headman === P.head && !(t.confed && t.confed.king === P.head) && t.clans.length >= 3 && W.week - (P.lastRivalAsk || -1e9) > 52 * 6) {
        let sup = 0, n = 0; for (const o of t.clans) if (o !== pc) { sup += opinion(o, pc); n++; } sup = n ? sup / n : 0;
        const rival = t.clans.filter(o => o !== pc && o.head && o.head.sex === leaderSex(t)).sort((x, y) => prestige(y.head) * (1 + y.people.length / 40) - prestige(x.head) * (1 + x.people.length / 40))[0];
        if (rival && (sup < 10 || prestige(rival.head) > prestige(P.head) * 0.9) && W.rand() < 0.35) {
          P.lastRivalAsk = W.week;
          pushEvent(W, { type: 'rivalry', key: rival.id, title: `${rival.head.name} wants to lead the ${t.name}`, text: `${rival.head.name} of the ${rival.name} clan (${freeCount(rival)} people) says the House of ${P.house} has grown too proud.<br><br>${tallyLine(headshipTally(W, t, P.head, rival.head, false), rival.head, keepChance(W, t, P.head, rival.head))}${keepLine(W, t, P.head, rival.head)}`, data: { rival, t },
            options: [{ label: 'Face the challenge', hint: 'Every clan backs one of you: friendship, standing and kin decide' }, { label: 'Buy their support', hint: 'Gifts to every clan first (valuables and half your food), then the clans choose' }, { label: 'Step aside', hint: `${rival.head.name} leads; peace among the clans` }] });
        }
      }
    }
  }

  // =====================================================================
  //  TRADERS — once there are villages and craft goods, men make a living carrying goods between them
  // =====================================================================
  function traderMonth(W) {
    W.traders = W.traders || []; const P = W.player;
    // set out: a settled clan with a surplus sends a trader to a village that lacks it
    if (W.settlements && W.settlements.length >= 2) for (const c of W.clans) {
      if (!c.settled || c.people.length < 15 || W.rand() > 0.05) continue;
      if (W.traders.filter(r => r.home === c).length >= 2) continue;
      const surplus = TRADEABLE.concat(['copper', 'tin', 'bronze']).filter(g => (c.goods[g] || 0) >= 3); if (!surplus.length && c.grain < needsWeek(c) * 20) continue;
      let best = null, bs = 0;
      for (const o of W.clans) {
        if (o === c || !o.settled) continue; const km = Math.hypot(o.x - c.x, o.y - c.y) / 1000; if (km > 260 || km < 15 || !canReach(W, c, o.x, o.y)) continue; // the near-enough test first (it is cheap)
        if (o.tribe !== c.tribe && opinion(o.tribe, c.tribe) < -20) continue;
        const want = surplus.filter(g => !(o.goods[g] > 0)).length + (o.cond < 0.8 && c.grain > 0 ? 1 : 0), offer = TRADEABLE.concat(['copper', 'tin', 'bronze']).filter(g => (o.goods[g] || 0) >= 2 && !(c.goods[g] > 0)).length;
        const sc = (want + offer) / (1 + km / 80); if (sc > bs) { bs = sc; best = o; }
      }
      if (!best || bs < 0.5) continue;
      const pack = {}; for (const g of surplus) { if (best.goods[g] > 0) continue; const n = Math.min(2, c.goods[g] - 1); if (n > 0) { pack[g] = n; c.goods[g] -= n; } }
      const food = c.grain > needsWeek(c) * 20 ? needsWeek(c) * 2 : 0; c.grain -= food;
      if (!Object.keys(pack).length && !food) continue;
      const by = W.comp[cellAt(best.x, best.y)] !== W.comp[cellAt(c.x, c.y)];
      W.traders.push({ id: (W.trId = (W.trId || 0) + 1), home: c, to: best, x: c.x, y: c.y, pack, food, back: null, leg: 0, by, name: nameIn(c.tribe.kult, W.rand, 2) });
      if (!c.tribe.tradersSeen) { c.tribe.tradersSeen = true; logEvent(W, `🎒 Traders of the ${c.tribe.name} set out from ${c.village || c.name} with ${Object.keys(pack).map(g => GOOD_NAMES[g].toLowerCase()).join(', ') || 'grain'} — the first traders on the isles' paths.`, c.tribe, 'trade'); }
    }
    // travel, trade, come home
    for (const r of [...W.traders]) {
      const dest = r.leg === 0 ? r.to : r.home;
      if (!dest.alive) { W.traders.splice(W.traders.indexOf(r), 1); continue; }
      const dx = dest.x - r.x, dy = dest.y - r.y, d = Math.hypot(dx, dy), step = 100000; // about 25 km a week
      if (d > step) { const nx = r.x + dx / d * step, ny = r.y + dy / d * step; wear(W, r.x, r.y, nx, ny, 0.6); r.x = nx; r.y = ny;
        // bandits: hostile camps along the way
        for (const o of nearClans(W, r.x, r.y, 12000)) if (o.tribe !== r.home.tribe && o.tribe !== r.to.tribe && opinion(o.tribe, r.home.tribe) < -25 && W.rand() < 0.15) {
          for (const g in r.pack) o.goods[g] = (o.goods[g] || 0) + r.pack[g]; o.store += r.food; r.pack = {}; r.food = 0; affect(W, r.home.tribe, o.tribe, -10, `Robbed our traders`, 8);
          if (P && P.head.clan && (r.home.tribe === P.head.clan.tribe)) houseNote(W, `Traders of the ${r.home.name} were robbed by the ${o.name} clan.`);
          break; }
        if (P && P.known && P.head.clan && (r.home.tribe === P.head.clan.tribe || r.to.tribe === P.head.clan.tribe)) reveal(W, r.x, r.y, 8000);
        continue; }
      r.x = dest.x; r.y = dest.y;
      if (r.leg === 0) { // at the market
        const o = r.to; for (const g in r.pack) o.goods[g] = (o.goods[g] || 0) + r.pack[g]; o.grain += r.food;
        const back = {}; for (const g of TRADEABLE.concat(['copper', 'tin', 'bronze'])) if ((o.goods[g] || 0) >= 2 && !(r.home.goods[g] > 0)) { back[g] = 1; o.goods[g]--; }
        if (!Object.keys(back).length && o.grain > needsWeek(o) * 4) { r.food = needsWeek(r.home); o.grain -= r.food; } else r.food = 0;
        r.gave = r.pack; r.pack = back; r.leg = 1;
        affect(W, o, r.home, 5, `Traders came from ${r.home.village || r.home.name}`); if (o.tribe !== r.home.tribe) { affect(W, o.tribe, r.home.tribe, 4, 'Trade'); rel(o.tribe, r.home.tribe).trade++; }
        traderTale(W, r);
        // crafts travel with the goods
        if (r.home.tribe.metal >= 0.3 && o.tribe.metal < 0.3 && o.settled && W.rand() < 0.1) o.tribe.metal = Math.max(o.tribe.metal, 0.12);
      } else { // home again
        for (const g in r.pack) r.home.goods[g] = (r.home.goods[g] || 0) + r.pack[g]; r.home.grain += r.food;
        W.traders.splice(W.traders.indexOf(r), 1);
        if (P && P.head.clan === r.home) { const got = Object.keys(r.pack).map(g => GOOD_NAMES[g].toLowerCase()); if (got.length) houseNote(W, `${r.player ? 'Our trader' : 'A trader sent out by the clan,'} ${r.name} came back from ${r.to.village || r.to.name} with ${got.join(', ')}.`); }
      }
    }
  }
  function sendTrader(W, c, o, h) {
    const surplus = TRADEABLE.concat(['copper', 'tin', 'bronze']).filter(g => (c.goods[g] || 0) >= 2);
    const pack = {}; for (const g of surplus) { const n = Math.min(2, c.goods[g] - 1); if (n > 0) { pack[g] = n; c.goods[g] -= n; } }
    const food = c.grain > needsWeek(c) * 6 ? needsWeek(c) * 2 : 0; c.grain -= food;
    W.traders = W.traders || []; W.traders.push({ id: (W.trId = (W.trId || 0) + 1), home: c, to: o, x: c.x, y: c.y, pack, food, leg: 0, name: h ? h.name : makeName(W.rand, 2), player: true });
    return { pack, food };
  }

  // =====================================================================
  //  DEALINGS — standing orders. The house says once how it answers a killing, a sworn vengeance, raiders,
  //  and who may share its sources; the game then acts on that by itself and reports what happened.
  // =====================================================================
  function pol(W) { const P = W.player; if (!P.pol) P.pol = { blood: 'comp', threat: 'guard', raid: 'ask', quarrel: 'ask', deal: {} }; if (!P.pol.quarrel) P.pol.quarrel = 'ask'; for (const k of ROUTINE_KEYS) if (!P.pol[k]) P.pol[k] = 'ask'; return P.pol; }
  const AUTOKEY = { blood: 'blood', vengeance: 'threat', raided: 'raid', quarrel: 'quarrel', gathering: 'gather', omen: 'omen', toobig: 'split', friendneed: 'friend', sickness: 'sick', exiles: 'exiles', oath: 'oath', foundling: 'found' }, AUTOIX = { blood: { revenge: 0, comp: 1, forgive: 2 }, threat: { comp: 0, guard: 1, ignore: 2 }, raid: { fight: 0, pay: 1, flee: 2 }, quarrel: { peace: 0, stand: 1, fight: 2 },
    gather: { gifts: 0, trade: 1, keep: 2 }, omen: { offer: 0, quiet: 1, sign: 2 }, split: { letgo: 0, hold: 1 }, friend: { give: 0, send: 1 }, sick: { scatter: 0, tend: 1 }, exiles: { place: 0, feed: 1, turn: 2 }, oath: { swear: 0, friendship: 1, refuse: 2 }, found: { take: 0, other: 1, refuse: 2 } };
  // routine matters the house may answer by standing order; they are answered quietly (a house note, no notice) so skipping ahead runs on
  const ROUTINE_KEYS = ['gather', 'omen', 'split', 'friend', 'sick', 'exiles', 'oath', 'found'], ROUTINE = new Set(['gathering', 'omen', 'toobig', 'friendneed', 'sickness', 'exiles', 'oath', 'foundling']);
  function notice(W, title, text) { (W.notices = W.notices || []).push({ title, text }); if (W.notices.length > 5) W.notices.shift(); }
  // sharing: an explicit choice for a clan, or automatic — own tribe, allies and anyone not hostile may share
  function dealWith(W, o) {
    const P = W.player, c = P.head.clan, m = pol(W).deal[o.id]; if (m === 'share' || m === 'keep') return m;
    return o.tribe === c.tribe || isAllied(o.tribe, c.tribe) || opinion(c.tribe, o.tribe) > -30 ? 'share' : 'keep';
  }
  function runAuto(W) {
    const q = W.autoQ; if (!q || !q.length) return; W.autoQ = [];
    for (const [ev, k] of q) {
      const P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan) break;
      const last = P.hist[P.hist.length - 1]; W.lastResult = null; ev.id = -1;
      resolve(W, ev, k);
      if (ROUTINE.has(ev.type)) { const lr = W.lastResult; W.lastResult = null; { const li = last ? P.hist.lastIndexOf(last) : -1; if (lr && lr.text && (li >= 0 || !last) && P.hist.length - li - 1 === 1) P.hist.pop(); } const sh = lr && lr.text ? lr.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '', sn = sh.length > 140 ? (sh.slice(0, 140).replace(/[^.!?]*$/, '').trim() || sh.slice(0, 137).replace(/\s\S*$/, '') + '...') : sh; const ol = ev.options[k] && ev.options[k].label; houseNote(W, `By standing order: ${ev.title}${ol ? ' (' + ol + ')' : ''}${lr && lr.title ? ' — ' + lr.title : ''}.${sn ? ' ' + sn : ''}`); continue; }
      const added = P.hist.slice(P.hist.lastIndexOf(last) + 1).map(e => e.t); W.lastResult = null;
      if (ev.type === 'vengeance') { const av = ev.data.c; notice(W, 'Vengeance sworn', `The ${av.name} clan swore to avenge their dead on us. ${added.join(' ') || 'We did nothing.'}`); }
      else if (ev.type === 'blood') notice(W, ev.title, added.join(' ') || `The ${ev.data.byClan.name} clan owe us blood.`);
      else notice(W, ev.title, added.join(' ') || (W.lastResult && W.lastResult.text ? W.lastResult.text.replace(/<[^>]+>/g, ' ') : 'It is settled.'));
    }
  }
  function driveOff(W, kk, rival) {
    const P = W.player, h = P.head, c = h.clan, nm = DEPOSITS[kk.d.type].name.toLowerCase();
    const mine = warriorsOf(c), theirs = warriorsOf(rival), win = W.rand() < mine / (mine + theirs + 0.01) * 1.15; let dead = '';
    if (W.rand() < 0.2) { const side = win ? rival : c, men = side.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50 && q !== h && !q.dyn); if (men.length) { const v = pick(men, W.rand); die(W, side, v, `killed in a fight over the ${nm}`); side.people = side.people.filter(q => q.alive); dead = ` ${v.name} of ${side === c ? 'our clan' : 'the ' + rival.name} was killed.`; if (side === rival) affect(W, rival, c, -8, `${v.name} was killed at the ${nm}`, 10); } }
    affect(W, rival, c, -15, `Driven from the ${nm} by the House of ${P.house}`);
    if (win) { rival.claim = null; rival.barred = { d: kk.d, until: W.week + 52 * 10 }; }
    const txt = win ? `Our men drove the ${rival.name} clan from the ${nm}.${dead}` : `The ${rival.name} clan would not be driven from the ${nm}.${dead}`;
    houseNote(W, txt); return { win, txt };
  }
  function dealings(W) {
    const P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan) return null;
    const c = P.head.clan, t = c.tribe, claims = P.claims || [], out = [], seen = new Set();
    const add = o => { if (!o || o === c || seen.has(o) || !o.alive || o.kind !== 'clan') return; seen.add(o); const r = o.rel.get(c.id), mine = c.rel.get(o.id);
      out.push({ clan: o, same: o.tribe === t, op: opinion(o, c), theirGrudge: r ? r.grudge : 0, ourGrudge: mine ? mine.grudge : 0, at: claims.filter(k => o.claim === k.d).map(k => k.d.type), set: pol(W).deal[o.id] || 'auto', mode: dealWith(W, o), km: Math.round(Math.hypot(o.x - c.x, o.y - c.y) / 1000) }); };
    for (const o of t.clans) add(o);
    for (const o of W.clans) { if (o.claim && claims.some(k => k.d === o.claim)) add(o); const r = o.rel.get(c.id); if (r && r.grudge >= 12) add(o); }
    for (const [oid, r] of c.rel) if (r.grudge >= 12) add(W.ents.get(oid));
    for (const o of nearClans(W, c.x, c.y, 70000)) if (knows(W, o.x, o.y)) add(o);
    const rank = d => (d.at.length ? 0 : 1) * 4 + (d.theirGrudge >= 12 || d.ourGrudge >= 12 ? 0 : 1) * 2 + (d.same ? 0 : 1);
    return out.sort((a, b) => rank(a) - rank(b) || a.km - b.km).slice(0, 30);
  }
  function settleFeud(W, id, forgive) {
    const P = W.player, c = P.head.clan, o = W.ents.get(id); if (!o || !o.alive) return null;
    if (forgive) { const r = rel(c, o); r.grudge = 0; r.op += 8; clearWrong(c, o); affect(W, o, c, 6, `The House of ${P.house} forgave us our killing`); houseNote(W, `${P.head.name} forgave the ${o.name} clan the blood they owed.`); return { title: 'Forgiven', text: `The blood the ${o.name} clan owed is forgiven.` }; }
    W.lastResult = null; const ev = { type: 'vengeance', id: -1, data: { c: o, o: c }, options: [] }; resolve(W, ev, 0); const r = W.lastResult; W.lastResult = null; return r;
  }

  // =====================================================================
  //  PEOPLES & TONGUES — every founding people has its own language and its own style of making things.
  //  Speech drifts with distance and time: first a dialect, then a daughter tongue. Peoples who cannot
  //  understand each other trade, marry and ally less easily; small peoples take up a great neighbour's speech.
  // =====================================================================
  const PHON = [
    { on: ['k', 'l', 'm', 'r', 't', 'n', 's', 'b', 'd', 'y', 'w', 'h', 'p', 'v', 'z', 'g'], nu: ['a', 'u', 'i', 'o', 'e'], co: [''], long: 0.4, tribe: ['i', 'a', 'ans', 'u', 'ek', 'ori'], vill: ['-by', 'stead', 'ham', 'thorp', 'wick', 'ton'], haven: ['mouth', 'haven', 'wick', 'sand', 'ness', 'holm'] },
    { on: ['th', 'dr', 'g', 'k', 'br', 'sk', 'h', 'v', 'gr', 't', 'f', 'st', 'sv', 'r'], nu: ['a', 'o', 'u', 'ei', 'y', 'e'], co: ['r', 'n', 'k', 'ld', 'g', '', '', ''], long: 0.08, tribe: ['ingar', 'ar', 'ir', 'ungar', 'lings'], vill: ['gard', 'heim', 'stad', 'holt', 'thveit', 'by'], haven: ['vik', 'nes', 'sund', 'ey', 'havn', 'fjord'] },
    { on: ['t', 'q', 'ch', 'ts', 'n', 'm', 'x', 'l', 'p', 'w', 'k'], nu: ['a', 'aa', 'i', 'u', 'ai', 'ee'], co: ['', '', 'q', 'tl', 'n', 'sh', 'k'], long: 0.2, tribe: ['tin', 'aq', 'miut', 'wa', 'lan'], vill: ['pan', 'tlan', 'co', 'mul', 'naq', 'wik'], haven: ['miut', 'tuq', 'pa', 'lik', 'suk'] },
    { on: ['c', 'gw', 'll', 'rh', 'm', 'n', 'd', 'b', 'f', 't', 'p', 'br'], nu: ['a', 'e', 'y', 'wy', 'ae', 'o', 'i'], co: ['', 'n', 'dd', 'th', 'r', 'ch', 's', ''], long: 0.12, tribe: ['ii', 'ones', 'antes', 'wyr', 'on'], vill: ['dun', 'tre', 'caer', 'llan', 'magos', 'briga'], haven: ['aber', 'mor', 'porth', 'ynys', 'traeth'] },
    { on: ['z', 'sh', 'b', 'g', 'd', 'kh', 'm', 'n', 'r', 'h', 'ur'], nu: ['a', 'u', 'i', 'e', 'aa'], co: ['', 'r', 'sh', 'm', 'g', 'k', 'n'], long: 0.15, tribe: ['im', 'aya', 'ites', 'u', 'ani'], vill: ['bad', 'kar', 'tepe', 'ur', 'dar', 'shan'], haven: ['bandar', 'mar', 'sahil', 'kum'] },
  ];
  const SHIFTS = [['k', 'g'], ['t', 'd'], ['p', 'b'], ['s', 'h'], ['a', 'o'], ['u', 'o'], ['r', 'l'], ['i', 'e'], ['th', 'd'], ['b', 'v'], ['g', 'y'], ['e', 'i'], ['d', 't'], ['o', 'u'], ['m', 'n'], ['ch', 'sh']];
  const STYLE = {
    pot: ['cord-marked', 'comb-impressed', 'grooved', 'finger-pinched', 'spiral-painted', 'bell-shaped', 'lattice-incised'],
    motif: ['spirals', 'cup-and-ring marks', 'chevrons and zigzags', 'antlered figures', 'boats and sun-wheels', 'handprints in red ochre', 'rings within rings', 'running deer'],
    adorn: ['amber beads', 'shell necklaces', 'boar-tusk pendants', 'red ochre body paint', 'tattooed faces', 'feathered cloaks', 'toggles of jet and bone'],
    tale: ['the hunter who married the sea', 'the twins who stole fire', 'the flood and the raven', 'the bear mother', 'the first sowing', 'the stag who carries the sun in his antlers', 'the old woman who made the hills'],
  };
  const mkSyl = (P, rand) => pick(P.on, rand) + pick(P.nu, rand) + pick(P.co, rand);
  function nameIn(K, rand, n) {
    if (!K) return makeName(rand, n);
    n = n || 2 + (rand() < PHON[K.ph].long ? 1 : 0); let s = '';
    let last = null; for (let k = 0; k < n; k++) { let y = pick(K.syl, rand); if (y === last) y = pick(K.syl, rand); s += y; last = y; }
    s = s.replace(/(.)\1\1+/g, '$1$1').replace(/([^aeiouy]{3})[^aeiouy]+/g, '$1'); if (s.length > 10 && n > 2) return nameIn(K, rand, 2);
    return s[0].toUpperCase() + s.slice(1);
  }
  function newKult(W, ph, parent, hue) {
    const rand = W.rand; W.kults = W.kults || [];
    const K = { id: (W.kultId = (W.kultId || 0) + 1), ph: parent ? parent.ph : ph % PHON.length, parent: parent ? parent.id : null, parentName: parent ? parent.name : null, born: W.week, hearth: null, n: 0, tribes: 0 };
    // every people marks its work in its own way: take a style no living people uses, while there are any left
    const fresh = key => { const used = new Set(W.kults.filter(o => !o.dead).map(o => o.style[key])), un = STYLE[key].filter(v => !used.has(v)); return pick(un.length ? un : STYLE[key].filter(v => !parent || v !== parent.style[key]), rand); };
    const P = PHON[K.ph]; K.fam = parent ? parent.fam : K.id; K.famName = parent ? parent.famName : null;
    if (parent) {
      const sh = []; while (sh.length < 2) { const s = pick(SHIFTS, rand); if (!sh.includes(s) && parent.syl.some(y => y.includes(s[0]))) sh.push(s); else if (rand() < 0.05) break; }
      K.shifts = sh.map(s => s[0] + ' became ' + s[1]);
      const turn = s => { for (const [a, b] of sh) s = s.split(a).join(b); return s; };
      const syl = [...new Set(parent.syl.map(turn))]; for (let k = 0; k < 5; k++) syl[Math.floor(rand() * syl.length)] = mkSyl(P, rand);
      K.syl = [...new Set(syl)];
      K.ends = { tribe: parent.ends.tribe.slice(), vill: parent.ends.vill.slice(), haven: parent.ends.haven.slice() };
      for (const k of ['tribe', 'vill', 'haven']) { const i = Math.floor(rand() * K.ends[k].length); K.ends[k][i] = turn(K.ends[k][i]); }
      K.style = { ...parent.style }; const key = pick(['pot', 'motif', 'motif', 'adorn', 'tale'], rand); K.style[key] = fresh(key);
      K.hue = (parent.hue + (rand() < 0.5 ? -1 : 1) * (24 + rand() * 22) + 360) % 360;
    } else {
      const set = new Set(); let guard = 0; while (set.size < 26 && guard++ < 400) set.add(mkSyl(P, rand)); K.syl = [...set];
      K.ends = { tribe: P.tribe.slice(), vill: P.vill.slice(), haven: P.haven.slice() };
      K.style = { pot: fresh('pot'), motif: fresh('motif'), adorn: fresh('adorn'), tale: fresh('tale') };
      K.hue = hue == null ? rand() * 360 : hue;
    }
    for (let k = 0; k < 12 && !K.name; k++) { let nm = nameIn(K, rand, 2).replace(/[aeiouy-]+$/, ''); if (nm.length < 3) continue; nm += pick(['ic', 'ish', 'an', 'ar', 'ic'], rand); if (!W.kults.some(o => o.name === nm)) K.name = nm; }
    K.name = K.name || nameIn(K, rand, 3) + 'ic'; if (!parent) K.famName = K.name;
    W.kults.push(K); return K;
  }
  function tribeNameIn(W, K) {
    for (let k = 0; k < 8; k++) { const nm = nameIn(K, W.rand, 2) + pick(K.ends.tribe, W.rand); if (!W.tribes.some(t => t.name === nm)) return nm; }
    return nameIn(K, W.rand, 3) + pick(K.ends.tribe, W.rand);
  }
  const nameInUse = (W, n) => W.places.has(n) || W.clans.some(c => c.alive !== false && c.village === n);
  const freshName = (W, t, kind) => { let n; for (let i = 0; i < 10; i++) { n = placeNameIn(W, t, kind); if (!nameInUse(W, n)) break; } return n; };
  // a clan that carries a village name keeps it when no other settled clan holds that name (the village has moved as a whole) or one of them lies within the grouping distance (it is joining that village); otherwise the name is held by a village elsewhere and this is a new place
  const villageAt = (W, c, t, kind) => {
    const n = c.village; if (n) { let held = false; for (const o of W.clans) if (o !== c && o.alive !== false && o.settled && o.village === n) { if (Math.hypot(o.x - c.x, o.y - c.y) < 9000) return n; held = true; } if (!held) return n; }
    return freshName(W, t, kind);
  };
  const placeNameIn = (W, t, kind) => { const K = t && t.kult, e = K && pick(K.ends[kind], W.rand); return K ? nameIn(K, W.rand, e.length >= 4 && W.rand() < 0.6 ? 1 : 2) + e : makeName(W.rand, 2) + pick(kind === 'haven' ? HAVEN_END : VILLAGE_END, W.rand); };
  // how well two tribes understand each other, 0..1: shared tongue, kindred tongues, and what long contact has taught them
  function und(a, b) {
    if (!a || !b || a === b) return 1; const A = a.kult, B = b.kult; if (!A || !B) return 1;
    let base = 0;
    if (A === B) base = 1 - Math.min(0.35, Math.abs((a.drift || 0) - (b.drift || 0)) / 200);
    else if (A.parent === B.id || B.parent === A.id || (A.parent && A.parent === B.parent)) base = 0.45;
    else if (A.fam === B.fam) base = 0.2;
    const r = a.rel.get(b.id), learned = r ? Math.min(0.4, r.kin * 0.03 + r.trade * 0.02 + r.feasts * 0.03 + (r.allied ? 0.15 : 0)) : 0;
    return clamp(base + learned * (1 - base), 0, 1);
  }
  const speechWord = u => u >= 0.85 ? 'the same speech' : u >= 0.6 ? 'a dialect, easily followed' : u >= 0.35 ? 'kindred speech, half understood' : u >= 0.15 ? 'a few shared words and signs' : 'no common speech';
  const centreOf = t => { const c = tribeCenter(t); return c && c[0] === c[0] ? c : t.home || [0, 0]; };
  function splitKult(W, t) {
    const K = t.kult, old = K.hearth, K2 = newKult(W, K.ph, K), a = centreOf(t), hc = old ? centreOf(old) : a, moved = [t];
    K2.hearth = t; t.kult = K2; t.drift = 0;
    for (const o of W.tribes) if (o !== t && o !== old && o.kult === K && (o.drift || 0) >= 35) { const c = centreOf(o); if (Math.hypot(c[0] - a[0], c[1] - a[1]) < Math.hypot(c[0] - hc[0], c[1] - hc[1])) { o.kult = K2; o.drift = Math.max(0, o.drift - 45); moved.push(o); } }
    const who = moved.map(o => 'the ' + o.name).join(', ');
    for (const o of moved) note(W, o, `Our speech became its own tongue, ${K2.name}, grown out of ${K.name}.`);
    logEvent(W, `A new tongue: ${who} no longer speak as the ${K.name} peoples do. Their speech is now ${K2.name}${K2.shifts && K2.shifts.length ? ` (${K2.shifts.join(', ')})` : ''}, and their makers favour ${K2.style.motif}.`, t, 'big');
    for (const o of moved) milestone(W, o, `A tongue of our own: ${K2.name}`, `Generations apart have changed the speech of the ${o.name}. What was once a dialect of ${K.name} is now a tongue of its own, <b>${K2.name}</b>${K2.shifts && K2.shifts.length ? ` — in our mouths ${K2.shifts.join(' and ')}` : ''}.<br><br>Children are now named in the new speech. The ${K.name} peoples still half understand us, but strangers of other tongues understand nothing: trade, marriage and friendship come easier with those who share our words.`);
  }
  function kultYear(W) {
    const rand = W.rand; W.kults = W.kults || [];
    for (const K of W.kults) {
      const sp = W.tribes.filter(t => t.kult === K && t.clans.length); K.n = sp.reduce((s, t) => s + tribeSize(t), 0); K.tribes = sp.length;
      if (!sp.length) { if (!K.dead) { K.dead = W.week; if (W.week > 52) logEvent(W, `The ${K.name} tongue falls silent — no people speaks it any more.`, null, 'info'); } continue; }
      if (!K.hearth || !K.hearth.alive || K.hearth.kult !== K) K.hearth = sp.sort((a, b) => tribeSize(b) - tribeSize(a))[0];
    }
    for (const t of [...W.tribes]) {
      if (!t.alive || !t.clans.length || !t.kult) continue; const K = t.kult, h = K.hearth; if (t.drift == null) t.drift = 0;
      if (h && h !== t) {
        const a = centreOf(t), b = centreOf(h), km = Math.hypot(a[0] - b[0], a[1] - b[1]) / 1000, r = t.rel.get(h.id);
        const sea = W.comp[cellAt(a[0], a[1])] !== W.comp[cellAt(b[0], b[1])];
        const contact = (r ? r.kin * 0.5 + r.trade * 0.3 + r.feasts * 0.5 + (r.allied ? 2 : 0) : 0) + (sameConfed(t, h) ? 3 : 0);
        const before = t.drift; t.drift = clamp(before + 0.06 + Math.min(0.45, km / 450) + (sea ? 0.2 : 0) - Math.min(0.4, contact * 0.04) + (rand() - 0.5) * 0.1, 0, 100);
        if (before < 30 && t.drift >= 30) { note(W, t, `Our speech has grown apart from that of the ${h.name}.`); logEvent(W, `The ${t.name} now speak a dialect of ${K.name} that the ${h.name} find strange.`, t, 'info'); }
        if (t.drift >= 60) {
          // a kindred daughter tongue already spoken nearby draws them in; otherwise their speech becomes a tongue of its own
          let near = null, nd = Math.min(160, km);
          for (const K2 of W.kults) { if (K2.dead || K2.parent !== K.id || !K2.hearth || !K2.hearth.alive) continue; const c2 = centreOf(K2.hearth), d2 = Math.hypot(a[0] - c2[0], a[1] - c2[1]) / 1000; if (d2 < nd) { nd = d2; near = K2; } }
          if (near) { t.kult = near; t.drift = 15; note(W, t, `Our speech fell in with that of the ${near.hearth.name}: ${near.name}.`); logEvent(W, `The ${t.name} now speak ${near.name}, like their neighbours the ${near.hearth.name}.`, t, 'info'); milestone(W, t, `We now speak ${near.name}`, `The speech of the ${t.name} has drifted far from old ${K.name}, and fallen in with that of our neighbours the ${near.hearth.name}. We now speak <b>${near.name}</b>, a daughter tongue of ${K.name}.`); }
          else splitKult(W, t);
          continue;
        }
      } else t.drift = Math.max(0, t.drift - 1);
      // a small people in the shadow of a greater one takes up its speech and ways
      let best = null, bs = 0; const size = tribeSize(t);
      for (const o of W.tribes) {
        if (o === t || o.kult === K || !o.kult || tribeSize(o) < size * 1.3) continue; const r = t.rel.get(o.id); if (!r) continue;
        const pull = (Math.min(10, r.kin) * 0.4 + (r.allied ? 2 : 0) + (t.confed && o.confed === t.confed && t.confed.capital === o ? 5 : 0) + Math.min(10, r.trade) * 0.15 + Math.max(0, r.op) / 30) * Math.sqrt(tribeSize(o) / Math.max(20, size));
        if (pull > bs) { bs = pull; best = o; }
      }
      if (best && bs > 5) {
        if (!t.assim || t.assim.k !== best.kult) t.assim = { k: best.kult, v: 0 };
        t.assim.v += Math.min(4, bs * 0.25);
        if (t.assim.v >= 100) {
          const K2 = best.kult; t.kult = K2; t.drift = 25; t.assim = null;
          note(W, t, `We took up the speech of the ${best.name}: ${K2.name}.`);
          logEvent(W, `The ${t.name} give up ${K.name} for the speech of their greater neighbours the ${best.name}: they now speak ${K2.name}.`, t, 'big');
          milestone(W, t, `We now speak ${K2.name}`, `Marriage, trade and the long shadow of the ${best.name} have done their work. The children of the ${t.name} answer in <b>${K2.name}</b>, and the old ${K.name} speech is heard only from grandmothers.<br><br>We are now one people with the ${K2.name} speakers: they trust us more readily, and the ways of their makers become ours.`);
        }
      } else if (t.assim) { t.assim.v -= 1; if (t.assim.v <= 0) t.assim = null; }
    }
    // fellow-feeling among those who share a tongue; wariness of those whose speech means nothing
    for (const a of W.tribes) for (const [oid, r] of a.rel) {
      if (oid <= a.id) continue; const b = W.ents.get(oid); if (!b || b.kind !== 'tribe') continue;
      const u = und(a, b); if (a.kult === b.kult) { if (r.op < 25) r.op += 0.5; } else if (u < 0.15 && r.op > -20) r.op -= 0.4;
    }
  }
  function kultInfo(W, t, me) {
    const K = t.kult; if (!K) return null;
    const par = K.parent ? (W.kults || []).find(o => o.id === K.parent) : null, kin = (W.kults || []).filter(o => o !== K && o.fam === K.fam && !o.dead).map(o => o.name);
    return { name: K.name, hue: K.hue, fam: K.famName, parent: par ? par.name : K.parentName, kin, tribes: K.tribes, n: K.n, dialect: K.hearth && K.hearth !== t && (t.drift || 0) >= 30 ? K.hearth.name : null,
      style: K.style, pots: !!(t.craft && t.craft.pot >= 1), carve: !!(t.craft && t.craft.art >= 1), born: K.born, u: me && me !== t ? und(me, t) : null, word: me && me !== t ? speechWord(und(me, t)) : null, assim: t.assim && t.assim.v > 30 ? t.assim.k.name : null };
  }

  // =====================================================================
  //  CRAFTS — once a village has stood a few years and eats well, some hands leave the fields:
  //  potters (where there is clay), tanners, carvers, smiths. Their work changes how the village lives.
  // =====================================================================
  const JOBS = { potter: { name: 'potter', good: 'pots', does: 'shapes and fires pots' }, tanner: { name: 'tanner', good: 'leather', does: 'cures hides into leather' }, carver: { name: 'carver', good: 'art', does: 'carves bone, antler, amber and stone' }, smith: { name: 'smith', good: null, does: 'works copper and bronze' } };
  const nearDeposit = (W, c, type, r) => W.deposits.some(d => d.type === type && Math.abs(d.x - c.x) <= r && Math.hypot(d.x - c.x, d.y - c.y) <= r);
  const hasClay = (W, c) => (c.goods.clay || 0) > 0 || nearDeposit(W, c, 'clay', 15000);
  const potF = c => Math.min(1, (c.goods.pots || 0) / Math.max(3, c.people.length / 6));
  const keepG = c => 0.995 + (c.works && c.works.gran ? 0.003 : 0) + 0.001 * potF(c);
  const jobsOf = c => { const m = {}; for (const q of c.people) if (q.job) m[q.job] = (m[q.job] || 0) + 1; return m; };
  const RANKS = ['Camp', 'Hamlet', 'Village', 'Large village', 'Town'];
  function rankOf(c) {
    if (!c.settled) return 0; const n = c.people.length, kinds = Object.keys(jobsOf(c)).length, w = c.works || {};
    return n >= 110 && kinds >= 3 && (w.hall || w.gran) ? 4 : n >= 65 && kinds >= 2 ? 3 : n >= 28 && kinds >= 1 ? 2 : 1;
  }
  const SOCIETY = ['Wandering bands', 'Settled hamlets', 'Craft villages', 'Walled villages', 'Chiefdom towns'];
  function societyOf(t) { let s = 0; for (const c of t.clans) { if (!c.settled) continue; s = Math.max(s, 1); if (c.people.some(q => q.job)) s = Math.max(s, 2); if (c.works && c.works.pal) s = Math.max(s, 3); if (rankOf(c) >= 4) s = 4; } return s; }
  const chance = (x, rand) => Math.floor(x) + (rand() < x - Math.floor(x) ? 1 : 0);
  function craftsYear(W) {
    const rand = W.rand, P = W.player, pc = P && !P.over && P.head.alive ? P.head.clan : null;
    for (const t of W.tribes) {
      const cr = t.craft || (t.craft = { pot: 0, tan: 0, art: 0 }), settled = t.clans.filter(c => c.settled); if (!settled.length) continue;
      const K = t.kult, st = K ? K.style : { pot: 'plain', motif: 'spirals' }, held = t.clans.some(c => c.goods.pots > 0);
      const adv = (k, d, text, title, body) => { if (cr[k] >= 1 || d <= 0) return; cr[k] = Math.min(1, cr[k] + d); if (cr[k] < 1) return; note(W, t, text); logEvent(W, `The ${t.name}: ${text[0].toLowerCase() + text.slice(1)}`, t, 'trade'); if (title) milestone(W, t, title, body); };
      adv('tan', 0.07, 'Tanners began curing hides in pits of oak bark — real leather for straps, bags and shields.');
      adv('pot', Math.min(0.1, settled.filter(c => hasClay(W, c)).length * 0.035) + (t.seen.has('pots') && settled.some(c => hasClay(W, c)) ? 0.12 : 0), held ? `The ${t.name} learned to fire their own pots: ${st.pot} ware.` : `The first pots were fired: ${st.pot} ware.`, held ? 'Pots of our own' : 'The first pots',
        (held ? `The ${t.name} have long had pots, but only from others, got in trade. Now someone among them has learned to make them: a clay-lined basket was left too near the fire, and turned to stone.` : `Someone among the ${t.name} left a clay-lined basket too near the fire, and found it had turned to stone.`) + ` Now the village fires <b>${st.pot} pots</b>.<br><br><b>What this changes:</b><br>• Food stored in pots keeps longer — less is lost to damp, mice and rot<br>• Villages near clay can spare a potter or two; villages without clay must trade for pots or fetch clay<br>• Pots are goods: traders carry them, and they can be given as gifts`);
      adv('art', 0.04 + ((W.monuments || []).some(m => m.tribe === t.id) ? 0.03 : 0), `Carvers began to work bone, antler and stone with ${st.motif}.`);
    }
    for (const c of W.clans) {
      const g = c.goods; for (const k of ['clay', 'pots', 'leather', 'art']) if (!(g[k] >= 0)) g[k] = 0;
      g.pots = Math.max(0, g.pots - chance(g.pots * 0.22, rand)); g.leather = Math.max(0, g.leather - chance(g.leather * 0.15, rand)); if (g.art > 0 && rand() < 0.06) g.art--; // pots break, leather wears, treasures go into graves
      checkWorks(W, c);
      if (!c.settled) { for (const q of c.people) if (q.job) q.job = null; c.rank = 0; continue; }
      const t = c.tribe, cr = t.craft || (t.craft = { pot: 0, tan: 0, art: 0 }), ys = (W.week - (c.settledAt || W.week)) / 52, wk = c.works || {};
      const adults = c.people.filter(q => !q.slave && q.age >= 16 && q.age < 62 && q !== c.head), fed = c.last ? c.last.fed : 1;
      const share = ys < 2 ? 0 : clamp((fed - 0.8) / 0.15, 0, 1) * ((c.live === 'farm' ? 0.1 : 0.07) + (wk.gran ? 0.04 : 0) + (wk.hall ? 0.03 : 0) + Math.min(0.04, ys / 1000));
      const slots = Math.floor(adults.length * share + 0.35), clay = hasClay(W, c), byClay = nearDeposit(W, c, 'clay', 15000);
      const can = []; if (cr.pot >= 1 && clay) can.push('potter'); if (cr.tan >= 1) can.push('tanner'); if (cr.art >= 1) can.push('carver'); if (metalStage(t) && g.copper + g.metal + g.bronze > 0) can.push('smith');
      let hold = c.people.filter(q => q.job);
      for (const q of hold) if (q.age >= 66 || q.slave || !can.includes(q.job)) q.job = null;
      hold = hold.filter(q => q.job); while (hold.length > slots) hold.pop().job = null;
      if (can.length) while (hold.length < slots) {
        const free = adults.filter(q => !q.job); if (!free.length) break;
        // the craft with the fewest hands takes the next apprentice: a craftsman's child if there is one, else the cleverest hands
        const cnt = j => hold.filter(q => q.job === j).length, job = can.slice().sort((a, b) => cnt(a) - cnt(b))[0];
        const q = free.find(x => (x.mother && x.mother.job === job) || (x.father && x.father.job === job)) || free.sort((a, b) => b.skill - a.skill)[0];
        q.job = job; hold.push(q);
        if (q.dyn && P && !P.over && P.head.alive && ((q.fam && q.fam === P.head.fam) || q.mother === P.head || q.father === P.head || q === P.head)) houseNote(W, `${q.name} of our house became a ${job}.`); // only the head's household and children
        if (!c.firstJob) { c.firstJob = W.week; note(W, c, `${q.name} became the first ${job} of ${c.village || 'the village'}.`); if (c === pc) notice(W, `A ${job} in ${c.village || 'the village'}`, `${q.name} now ${JOBS[job].does} instead of working the land. Craftsmen appear when a village has stood a few years and eats well.`); }
      }
      for (const q of hold) {
        const out = 0.6 + q.skill;
        if (q.job === 'potter') { if (!byClay) { if (g.clay > 0) g.clay--; else continue; } g.pots = Math.min(14, g.pots + chance(1.5 * out, rand)); t.seen.add('pots'); }
        else if (q.job === 'tanner') { g.leather = Math.min(10, g.leather + chance(1.2 * out, rand)); t.seen.add('leather'); }
        else if (q.job === 'carver') { const fine = g.amber + g.ochre + g.shells + g.axe > 0; g.art = Math.min(8, g.art + chance((fine ? 0.8 : 0.5) * out, rand)); t.seen.add('art');
          if (!c.rockArt && rand() < 0.04) { const x = c.x + (rand() - 0.5) * 9000, y = c.y + (rand() - 0.5) * 9000; if (W.land[cellAt(x, y)] && !W.lake[cellAt(x, y)]) { c.rockArt = true; const motif = t.kult ? t.kult.style.motif : 'spirals';
            (W.monuments = W.monuments || []).push({ x, y, faith: null, kind: 'carved rocks', tribe: t.id, tribeName: t.name, built: W.week, name: `${nameIn(t.kult, rand, 2)} Rocks`, by: q.name, motif });
            if (!t.rockArt || c === pc) logEvent(W, `${q.name}, carver of ${c.village || 'the ' + c.name}, cuts ${motif} into the living rock — a mark of the ${t.kult ? t.kult.name : t.name} people that will outlast them.`, t, 'info'); t.rockArt = true; } } }
      }
      if (c.head && g.art > 0) c.head.giftPrestige = Math.min(0.6, (c.head.giftPrestige || 0) + 0.004 * Math.min(6, g.art));
      const rk = rankOf(c);
      if (rk > (c.rank || 0) && rk >= 2 && rk > (c.topRank || 1)) { c.topRank = rk; const nm = c.village || c.name; note(W, c, `${nm} grew into a ${RANKS[rk].toLowerCase()}.`); if (rk >= 3) logEvent(W, `${nm} of the ${t.name} has grown into a ${RANKS[rk].toLowerCase()}: ${c.people.length} people, with ${Object.entries(jobsOf(c)).map(([j, n]) => `${n} ${j}${n > 1 ? 's' : ''}`).join(', ')}.`, t, rk >= 4 ? 'big' : 'info'); if (c === pc) notice(W, `${nm} is now a ${RANKS[rk].toLowerCase()}`, `${c.people.length} people live here.`); }
      c.rank = rk;
    }
    worksYear(W);
  }

  // =====================================================================
  //  VILLAGE WORKS — palisade, ditch and bank, granary, great hall
  // =====================================================================
  const WORKS = {
    pal: { name: 'Palisade', a: 'a palisade', cost: 3, min: 25, timber: true, hint: 'A wall of sharpened oak posts. Raiders fight at a great disadvantage, and carry off far less if they break in' },
    ditch: { name: 'Ditch and bank', a: 'a ditch and bank', cost: 4, min: 55, needs: 'pal', hint: 'A deep ditch and an earthen bank outside the palisade. The village becomes very hard to storm' },
    gran: { name: 'Granary and storage pits', a: 'granaries and storage pits', cost: 1.5, min: 20, hint: 'Raised granaries and lined pits. Stored grain keeps far longer, raiders find less of it, and more hands are free for crafts' },
    hall: { name: 'Great hall', a: 'a great hall', cost: 2.5, min: 45, timber: true, hint: 'A long hall for feasts and councils. Renown for its builder, the clan holds together as it grows, and craftsmen gather round it' },
  };
  function hasTimber(W, c) { let ok = false; forageCells(W, c.x, c.y, i => { if (W.biome[i] >= 3 && W.biome[i] <= 5) ok = true; }); return ok; }
  // Timber: from woodland in the village's own range, or hauled from woodland up to 40 km off at a cost in food.
  // Returns null (none within reach), or { km: 0 (in range), weeks: 0 } or { km, weeks: weeks of the village's food the hauling costs }.
  const TIMBER_FAR = 40000;
  function timberHaul(W, c, k) {
    if (!WORKS[k] || !WORKS[k].timber || hasTimber(W, c)) return { km: 0, weeks: 0 };
    let bd = 1e12; const cx = Math.floor(c.x / CELL), cy = Math.floor(c.y / CELL), r = Math.ceil(TIMBER_FAR / CELL) + 1;
    for (let yy = Math.max(0, cy - r); yy <= Math.min(N - 1, cy + r); yy++) for (let xx = Math.max(0, cx - r); xx <= Math.min(N - 1, cx + r); xx++) {
      const i = yy * N + xx; if (!W.land[i] || W.biome[i] < 3 || W.biome[i] > 5) continue;
      const d = Math.hypot(W.px[i] - c.x, W.py[i] - c.y); if (d < bd) bd = d; }
    if (bd > TIMBER_FAR) return null;
    const km = Math.max(13, Math.round(bd / 1000)); return { km, weeks: Math.max(0.5, Math.round((km - 10) / 10 * 5) / 10) }; // half a week of food for each 10 km beyond the village's range
  }
  const haulDays = (c, th) => Math.round(th.weeks * 7);
  // what each work not yet built is held up by: [{ k, why }] (why is '' when it can be raised now)
  function worksStatus(W, c) { return Object.keys(WORKS).filter(k => !(c.works && c.works[k])).map(k => ({ k, why: canBuild(W, c, k), th: WORKS[k].timber ? timberHaul(W, c, k) : null })); }
  function canBuild(W, c, k) {
    const D = WORKS[k], w = c.works || {};
    if (!c.settled) return 'Only a settled village can build';
    if (w[k]) return 'Already built';
    if (D.needs && !w[D.needs]) return `Needs ${WORKS[D.needs].a} first`;
    if (freeCount(c) < D.min) return `Needs ${D.min} people (you have ${freeCount(c)})`;
    const th = D.timber ? timberHaul(W, c, k) : null;
    if (D.timber && !th) return `No woodland within ${TIMBER_FAR / 1000} km of the village for the timber`;
    const hw = th ? th.weeks : 0;
    if (c.store + c.grain < needsWeek(c) * (D.cost + 3 + hw) && !(c.last && c.last.fed >= 0.97 && c.cond > 0.85)) return `Needs ${Math.round((D.cost + 3 + hw) * 7)} days of food in store, or a well-fed year behind you — the builders must eat`;
    return '';
  }
  function build(W, c, k, by) {
    const D = WORKS[k], t = c.tribe, nm = c.village || 'the ' + c.name + ' village';
    c.works = c.works || {}; c.works[k] = W.week; c.worksAt = [c.x, c.y];
    const th = timberHaul(W, c, k); let cost = needsWeek(c) * (D.cost + (th ? th.weeks : 0)); const fromG = Math.min(c.grain, cost); c.grain -= fromG; cost -= fromG; if (cost > c.store) c.cond = Math.max(0.6, c.cond - 0.04); eatStore(c, cost);
    note(W, c, `${nm}: ${D.a} was built${by ? ` at the word of ${by.name}` : ''}${th && th.km ? `, with timber hauled from ${th.km} km away` : ''}.`);
    { const bk = t.builtKinds || (t.builtKinds = {}), P = W.player, mine = P && !P.over && P.head.alive && P.head.clan && P.head.clan.tribe === t; // the chronicle records a tribe's first of each work, and all of your own tribe's
      if (!bk[k] || mine) logEvent(W, `The ${t.name} at ${nm} build ${D.a}${by ? ` at the word of ${by.name}` : ''}.`, t, k === 'pal' || k === 'ditch' ? 'conflict' : 'info'); bk[k] = 1; }
    if (k === 'hall') { for (const a of familiesOf(c)) for (const b of familiesOf(c)) if (a.id < b.id) affect(W, a, b, 5); if (c.head) c.head.giftPrestige = (c.head.giftPrestige || 0) + 0.06; }
    if (k === 'pal' && !t.walled) { t.walled = true; milestone(W, t, 'Walls of oak', `For the first time a village of the ${t.name} stands behind a wall: ${nm} is ringed with sharpened oak posts, with one gate that is barred at night.<br><br><b>What this changes:</b><br>• Defenders behind a palisade fight far harder than their numbers<br>• Raiders who do break in carry off less food and fewer captives<br>• War parties prefer open villages — but a village that loses badly may see its wall burned<br>• A ditch and bank can be dug outside it once the village is large enough`); }
  }
  // works stand where they were built: a village that moves, or goes back to wandering, leaves them behind
  function checkWorks(W, c) {
    const w = c.works; if (!w || !Object.keys(w).length) return;
    if (c.settled && c.worksAt && Math.hypot(c.x - c.worksAt[0], c.y - c.worksAt[1]) < 4000) return;
    if (c.toSettle && c.worksAt && Math.hypot(c.x - c.worksAt[0], c.y - c.worksAt[1]) < 4000) return;
    c.works = null; note(W, c, 'The old village and all that was built there were left behind.');
    const P = W.player; if (P && !P.over && P.head.alive && P.head.clan === c) houseNote(W, 'We left our old village, its walls and halls behind.');
  }
  const walls = c => { const w = c.settled && c.works; return !w ? 1 : (w.pal ? 1.4 : 1) * (w.ditch ? 1.25 : 1); };
  function worksYear(W) {
    const rand = W.rand, P = W.player, ph = P && !P.over && P.head.alive ? P.head : null;
    for (const c of W.clans) {
      if (!c.settled || (ph && c.head === ph)) continue; // the player decides for a village they lead
      const n = freeCount(c), ys = (W.week - (c.settledAt || W.week)) / 52, t = c.tribe, w = c.works || {};
      const threat = (c.raidedAt && W.week - c.raidedAt < 52 * 15) || t.atWar.size > 0;
      let k = null;
      if (!w.pal && (threat ? rand() < 0.18 : n >= 70 && rand() < 0.04)) k = 'pal';
      else if (!w.gran && c.live === 'farm' && ys >= 4 && rand() < 0.07) k = 'gran';
      else if (!w.hall && ys >= 10 && rand() < 0.05) k = 'hall';
      else if (w.pal && !w.ditch && threat && rand() < 0.07) k = 'ditch';
      if (!k || canBuild(W, c, k)) continue;
      build(W, c, k, c.head);
      if (ph && ph.clan === c) { houseNote(W, `${c.head ? c.head.name : 'The clan'} had ${WORKS[k].a} built at ${c.village || 'our village'}.`); notice(W, WORKS[k].name + ' built', `${c.head ? c.head.name : 'The clan head'} set the village to work: ${c.village || 'our village'} now has ${WORKS[k].a}.`); }
    }
  }
  function villageInfo(W, c) {
    const w = c.works || {}, j = jobsOf(c);
    return { rank: rankOf(c), rankName: RANKS[rankOf(c)], works: Object.keys(WORKS).filter(k => w[k]).map(k => ({ k, name: WORKS[k].name, year: Math.floor(w[k] / 52) })), jobs: j, walls: walls(c), clay: c.settled && hasClay(W, c), pots: potF(c),
      people: c.people.filter(q => q.job).map(q => ({ q, job: q.job })) };
  }

  // =====================================================================
  //  WHO LEADS, AND WHY — standing explained; when two contend, the clans choose one by one
  // =====================================================================
  function standingParts(q) {
    const a = q.age, ageF = a < 25 ? 0 : a < 45 ? (a - 25) / 20 : a < 65 ? 1 : Math.max(0, 1 - (a - 65) / 15), g = q.clan && q.clan.goods;
    return { ageF, years: ageF * (0.4 + q.skill) * (1.1 - q.temper * 0.4), kids: q.kids * 0.03, gifts: q.giftPrestige || 0, slaves: Math.min(0.3, (q.nSlaves || 0) * 0.03), wealth: g ? (g.amber * 0.04 + g.axe * 0.03 + g.metal * 0.04 + g.bronze * 0.06) * ageF : 0 };
  }
  // the plainest reasons a outranks b
  function standingWhy(a, b) {
    const A = standingParts(a), B = standingParts(b), out = [];
    if (A.years - B.years > 0.06) out.push([A.years - B.years, B.ageF < A.ageF - 0.12 ? (b.age < 45 ? `${b.name} is only ${Math.floor(b.age)}, and standing grows until 45` : `${b.name} is ${Math.floor(b.age)}, past the years of full standing`) : a.skill > b.skill + 0.08 ? `${a.name} is the more skilled` : `${a.name} is the cooler head`]);
    if (A.kids - B.kids > 0.05) out.push([A.kids - B.kids, `${a.name} has more children (${a.kids} against ${b.kids || 0})`]);
    if (A.gifts - B.gifts > 0.04) out.push([A.gifts - B.gifts, `${a.name} has given more gifts and feasts`]);
    if (A.slaves - B.slaves > 0.04) out.push([A.slaves - B.slaves, `${a.name} owns more slaves`]);
    if (a.clan !== b.clan && A.wealth - B.wealth > 0.04) out.push([A.wealth - B.wealth, `the ${a.clan.name} clan holds more amber, fine axes and metal`]);
    return out.sort((x, y) => y[0] - x[0]).slice(0, 3).map(x => x[1]);
  }
  // a tribe follows the clan head with the greatest standing, and a big clan adds weight
  const leadWeight = q => prestige(q) * (1 + (q.clan ? q.clan.people.length : 0) / 60);
  function headmanWhy(a, b) {
    const r = standingWhy(a, b), na = a.clan.people.length, nb = b.clan.people.length;
    if (na > nb * 1.12) r.unshift(`the ${a.clan.name} clan is larger (${na} people against ${nb})`);
    return r.length ? r.slice(0, 3).join('; ') : 'there was little between them';
  }
  const kinIn = (q, o) => { let n = 0; for (const x of o.people) if (x !== q && closeKin(q, x)) n++; return Math.min(6, n); };
  // every clan of the tribe backs one of the two: its own head, old friendships and grudges, the greater standing, kin
  function headshipTally(W, t, a, b, roll) {
    const ca = a.clan, cb = b.clan, sa = prestige(a), sb = prestige(b), rows = []; let wa = 0, wb = 0;
    for (const o of t.clans) {
      const n = freeCount(o); let side, why, s0 = 0;
      if (o === ca && o === cb) { side = sa >= sb ? 'a' : 'b'; why = 'their own clan, split between the two, went with the greater standing'; }
      else if (o === ca) { side = 'a'; why = `${a.name}'s own clan`; }
      else if (o === cb) { side = 'b'; why = `${b.name}'s own clan`; }
      else {
        const oa = opinion(o, ca), ob = opinion(o, cb), op = oa - ob, st = (sa - sb) * 40 + (hasTrait(a, 'silver') ? 12 : 0) - (hasTrait(b, 'silver') ? 12 : 0), kin = (kinIn(a, o) - kinIn(b, o)) * 4, s = op + st + kin + (roll ? (W.rand() - 0.5) * 16 : 0);
        s0 = op + st + kin; side = s >= 0 ? 'a' : 'b'; const sg = side === 'a' ? 1 : -1;
        const terms = [[op * sg, sg > 0 ? (ob < -10 ? `they bear the ${cb.name} clan ill will` : `they are better friends with the ${ca.name} clan`) : (oa < -10 ? `they bear the ${ca.name} clan ill will` : `they are better friends with the ${cb.name} clan`)],
          [st * sg, `${sg > 0 ? a.name : b.name} has the greater standing`], [kin * sg, `${sg > 0 ? a.name : b.name} has close kin among them`]].sort((x, y) => y[0] - x[0]);
        why = terms[0][0] > 0 ? terms[0][1] : 'it was a near thing';
      }
      rows.push({ clan: o, n, side, why, pa: o === ca && o === cb ? (sa >= sb ? 1 : 0) : o === ca ? 1 : o === cb ? 0 : clamp((s0 + 8) / 16, 0, 1) }); if (side === 'a') wa += n; else wb += n;
    }
    return { rows, wa, wb, sa, sb, win: wa > wb || (wa === wb && sa >= sb) };
  }
  function tallyHTML(T, a, b) {
    const li = side => T.rows.filter(r => r.side === side).map(r => `the ${r.clan.name} clan (${r.n}): ${r.why}`).join('<br>• ');
    const hi = T.sa >= T.sb ? [a, b] : [b, a], why = standingWhy(hi[0], hi[1]);
    return `<b>Standing:</b> ${a.name} ${T.sa.toFixed(2)}, ${b.name} ${T.sb.toFixed(2)}${why.length ? ` (${why.join('; ')})` : ''}.<br><br><b>For ${a.name}, ${T.wa} people:</b>${T.wa ? '<br>• ' + li('a') : ' no clan'}<br><br><b>For ${b.name}, ${T.wb} people:</b>${T.wb ? '<br>• ' + li('b') : ' no clan'}`;
  }
  const tallyLine = (T, b, p) => { if (p == null) p = tallyChance(T); return `As things stand, clans with ${T.wa} people would stand with you and ${T.wb} with ${b.name}${p >= 0.7 ? ': the clans lean your way' : p <= 0.3 ? ': the clans lean against you' : ': it could go either way'}.`; };
  const LOSE_ADVICE = 'To do better next time, win over the clans that stood against you: gifts and shared feasts at the gatherings, marriages into them, and settling old grudges under Dealings. Standing itself grows with age (to 45), children, gifts given and the clan\'s treasures.';
  // where the wild grain is for this clan: in range, a summer walk away, known but too far, or unknown
  function grainInfo(W, c) {
    const t = c.tribe; if (t.stage >= 3) return { state: 'farm' }; if (t.dom >= 0.3) return { state: 'sown' };
    if (grainAccess(W, c) > 0.04) return { state: 'at' };
    let best = null, bd = 1e12;
    for (const d of grainDeposits(W)) { if (!knows(W, d.x, d.y)) continue; const dist = Math.hypot(d.x - c.x, d.y - c.y); if (dist < bd) { bd = dist; best = d; } }
    if (!best) return { state: 'none' };
    return { state: bd < GRAIN_TRIP && canReach(W, c, best.x, best.y) ? 'trip' : 'far', km: Math.round(bd / 1000), dir: compass(best.x - c.x, best.y - c.y), reach: canReach(W, c, best.x, best.y) };
  }

  // =====================================================================
  //  THE CLAN'S NUMBERS — who came and went in the house's clan each year, so a shrinking clan can be understood
  // =====================================================================
  // how many people a clan can hold before the younger houses break away
  function splitCap(W, c, noHold) { const base = c.settled ? 60 + (c.works ? (c.works.hall ? 45 : 0) + (c.works.pal ? 15 : 0) + (c.works.gran ? 15 : 0) : 0) : 42; return Math.round(base * (!noHold && c.holdTogether && W.week - c.holdTogether < 52 * 8 ? 1.4 : 1)); }
  function houseFlow(W) {
    const P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan) return;
    const c = P.head.clan, now = new Set(c.people);
    if (P.flowClan === c && P.flowSnap) {
      const f = { y: Math.floor(W.week / 52), born: 0, died: 0, infants: 0, killed: 0, marriedIn: 0, marriedOut: 0, split: 0, joined: 0, left: 0, captured: 0, slaves: 0, n: c.people.length }, outs = [];
      for (const q of P.flowSnap) if (!now.has(q)) { if (!q.alive) { f.died++; if (q.age < 3) f.infants++; if (/kill|raid|slain|battle/.test(q.cause || '')) f.killed++; } else if (q.slave && q.clan !== c) f.captured++; else outs.push(q); }
      const by = new Map(); for (const q of outs) { const k = q.clan ? q.clan.id : 0; by.set(k, (by.get(k) || 0) + 1); }
      for (const q of outs) { if (by.get(q.clan ? q.clan.id : 0) >= 5 && q.clan && W.week - q.clan.founded < 60) f.split++; else if (q.spouse && q.spouse.alive && q.spouse.clan === q.clan) f.marriedOut++; else f.left++; }
      for (const q of now) if (!P.flowSnap.has(q)) { if (q.age < 1.1) f.born++; else if (q.slave) f.slaves++; else if (q.spouse && q.spouse.clan === c) f.marriedIn++; else f.joined++; }
      (P.flows = P.flows || []).push(f); if (P.flows.length > 30) P.flows.shift();
    } else P.flows = [];
    P.flowClan = c; P.flowSnap = now;
  }
  function clanFlow(W, years) {
    const P = W.player, fl = (P && P.flows || []).slice(-(years || 10)), s = { years: fl.length, born: 0, died: 0, infants: 0, killed: 0, marriedIn: 0, marriedOut: 0, split: 0, joined: 0, left: 0, captured: 0, slaves: 0 };
    for (const f of fl) for (const k in s) if (k !== 'years') s[k] += f[k];
    const c = P && P.head.clan; if (c) { s.women = c.people.filter(q => q.sex === 'F' && !q.slave && q.age >= 16 && q.age < 45).length; s.wives = c.people.filter(q => q.sex === 'F' && !q.slave && q.age >= 16 && q.age < 45 && q.spouse && q.spouse.alive).length; s.splitAt = splitCap(W, c); s.free = freeCount(c); }
    return s;
  }
  // households the house could invite to come and live with its clan: friendly, of our own tribe, from clans that can spare them
  function inviteTargets(W, c) {
    const out = [];
    const pool = c.tribe.clans.concat(nearClans(W, c.x, c.y, 80000).filter(o => o.tribe !== c.tribe && opinion(o.tribe, c.tribe) > 20 && und(o.tribe, c.tribe) >= 0.3)), room = splitCap(W, c) - 2 - freeCount(c);
    for (const o of pool) {
      if (o === c || freeCount(o) < 16 || opinion(o, c) < 0) continue;
      for (const f of familiesOf(o)) { const mem = famMembers(f).filter(q => !q.slave); if (mem.length < 3 || mem.length > Math.min(9, room) || mem.includes(o.head) || mem.includes(c.tribe.headman) || mem.some(q => q.dyn)) continue;
        if (freeCount(o) - mem.length < 12) continue; out.push({ f, o, n: mem.length, op: opinion(f, c.head && c.head.fam ? c.head.fam : c) + opinion(o, c) * 0.5, women: mem.filter(q => q.sex === 'F' && q.age >= 14 && q.age < 40).length, kids: mem.filter(q => q.age < 14).length }); }
    }
    return out.sort((a, b) => b.women * 3 + b.n + b.op / 10 - (a.women * 3 + a.n + a.op / 10)).slice(0, 5);
  }
  function moveFamily(W, f, to) {
    const from = f.clan, mem = from.people.filter(q => q.fam === f || (q.slave && q.owner && q.owner.fam === f));
    from.people = from.people.filter(q => !mem.includes(q)); for (const q of mem) { q.clan = to; to.people.push(q); } f.clan = to;
    const share = from.store * mem.length / Math.max(1, mem.length + from.people.length) * 0.5; from.store -= share; to.store += share; return mem.length;
  }

  // =====================================================================
  //  SAVE AND RESUME — the land is rebuilt from its seed; everything that has changed since is written out
  // =====================================================================
  const isNums = v => Array.isArray(v) && v.length > 2000 && typeof v[0] === 'number';
  function checksum(a) { let s = a.length | 0; for (let i = 0; i < a.length; i++) s = (Math.imul(s, 31) + ((a[i] * 1024) | 0)) | 0; return s; }
  function stampWorld(W) { const g = {}; for (const k of Object.keys(W)) { const v = W[k]; if (ArrayBuffer.isView(v) || isNums(v)) g[k] = checksum(v); } W._sig = g; }
  const toB64 = v => { const u = new Uint8Array(v.buffer, v.byteOffset, v.byteLength); if (typeof Buffer !== 'undefined') return Buffer.from(u).toString('base64'); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const fromB64 = (s, T) => { let u; if (typeof Buffer !== 'undefined') u = new Uint8Array(Buffer.from(s, 'base64')); else { const b = atob(s); u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); } const C = { Uint8Array, Int8Array, Uint16Array, Int16Array, Int32Array, Uint32Array, Float32Array, Float64Array }[T] || Uint8Array; return new C(u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength)); };
  const isPerson = v => v && v.sex !== undefined && v.age !== undefined && v.alive !== undefined;
  function saveGame(W) {
    const queue = [], ids = new Map(), keep = new Set();
    // the long dead are written as names only; the living, and two generations of their forebears, are kept whole
    for (const c of W.clans) for (const q of c.people) { keep.add(q); for (const p of [q.father, q.mother]) if (p) { keep.add(p); if (p.father) keep.add(p.father); if (p.mother) keep.add(p.mother); } }
    if (W.player && W.player.head) keep.add(W.player.head);
    const ref = v => {
      if (v === null || v === undefined) return null; const t = typeof v;
      if (t === 'number') return Number.isFinite(v) ? v : { $n: String(v) };
      if (t === 'string' || t === 'boolean') return v; if (t === 'function') return null;
      if (v === W) return { $W: 1 };
      let id = ids.get(v); if (id == null) { id = queue.length; ids.set(v, id); queue.push(v); } return { $r: id };
    };
    const shallow = v => {
      if (ArrayBuffer.isView(v)) return { $t: v.constructor.name, d: toB64(v) };
      if (Array.isArray(v)) return { $a: v.map(ref) };
      if (v instanceof Map) { const m = []; for (const [k, x] of v) { if (v === W.ents && x && x.kind === 'family' && x.alive === false) continue; m.push([ref(k), ref(x)]); } return { $m: m }; }
      if (v instanceof Set) return { $s: [...v].map(ref) };
      const o = {};
      if (isPerson(v) && !v.alive && !keep.has(v)) { for (const k of ['name', 'sex', 'age', 'alive', 'id', 'dyn', 'cause', 'died', 'kids', 'skill', 'temper', 'adopted']) if (v[k] !== undefined) o[k] = ref(v[k]); o.gone = true; return o; }
      for (const k in v) { const x = v[k]; if (x === undefined || typeof x === 'function') continue; o[k] = ref(x); }
      return o;
    };
    const top = {}, objs = [];
    for (const k of Object.keys(W)) { const v = W[k]; if (k[0] === '_' || typeof v === 'function') continue; if ((ArrayBuffer.isView(v) || isNums(v)) && W._sig && W._sig[k] === checksum(v)) continue; top[k] = ref(v); }
    for (let i = 0; i < queue.length; i++) objs.push(shallow(queue[i]));
    const P = W.player;
    return JSON.stringify({ v: 1, seed: W.seed, week: W.week, house: P ? P.house : null, head: P && P.head ? P.head.name : null, over: !!(P && P.over), top, objs });
  }
  function saveInfo(str) { try { const m = /^\{"v":1,"seed":(-?\d+),"week":(\d+),"house":("[^"]*"|null),"head":("[^"]*"|null)/.exec(str.slice(0, 300)); return m ? { seed: +m[1], year: Math.floor(+m[2] / 52), house: JSON.parse(m[3]), head: JSON.parse(m[4]) } : null; } catch (e) { return null; } }
  function loadGame(str) {
    const D = JSON.parse(str); if (!D || D.v !== 1) throw new Error('This is not a saved game of The Isles.');
    const W = createWorld(D.seed); stampWorld(W);
    const objs = D.objs, out = new Array(objs.length);
    for (let i = 0; i < objs.length; i++) { const o = objs[i]; out[i] = o.$t ? fromB64(o.d, o.$t) : o.$a ? [] : o.$m ? new Map() : o.$s ? new Set() : (o.pp !== undefined && o.kids !== undefined && o.temper !== undefined && o.born !== undefined ? personShell() : {}); }
    const dec = e => e === null || typeof e !== 'object' ? e : e.$r != null ? out[e.$r] : e.$W ? W : e.$n !== undefined ? Number(e.$n) : e;
    for (let i = 0; i < objs.length; i++) { const o = objs[i], t = out[i];
      if (o.$t) continue;
      if (o.$a) { for (let k = 0; k < o.$a.length; k++) t.push(dec(o.$a[k])); }
      else if (o.$m) { for (const [k, x] of o.$m) t.set(dec(k), dec(x)); }
      else if (o.$s) { for (const x of o.$s) t.add(dec(x)); }
      else for (const k in o) t[k] = dec(o[k]); }
    for (const k in D.top) W[k] = dec(D.top[k]);
    W.rand = mulberry32(((D.seed | 0) * 7919 + (W.week | 0) * 104729) | 0);
    PX = W.px; PY = W.py;
    return W;
  }

  // =====================================================================
  //  TRAITS — each head of the house has a bent that changes what they are good at
  // =====================================================================
  const TRAITS = {
    bold: { name: 'the Bold', does: 'Raids led in person strike 15% harder' },
    generous: { name: 'the Open-handed', does: 'Gifts at the gatherings win half as much goodwill again' },
    silver: { name: 'Silver-tongue', does: 'Clans, clan leaders, households and other peoples listen more readily' },
    shrewd: { name: 'the Shrewd', does: 'Sources the house has claimed yield a third more' },
    pious: { name: 'the Devout', does: 'Rites keep their blessing eight years instead of five' },
    wanderer: { name: 'the Far-walker', does: 'Expeditions can set out twice as often' },
  };
  const hasTrait = (q, k) => !!(q && q.traits && q.traits.includes(k));
  function giveTraits(W, q) {
    if (q.traits) return; const r = W.rand, w = { bold: 0.6 + q.temper, generous: 1, silver: 0.5 + q.skill, shrewd: 0.5 + q.skill, pious: 0.9, wanderer: 0.8 }, pickOne = () => { let tot = 0; for (const k in w) tot += w[k]; let x = r() * tot; for (const k in w) { x -= w[k]; if (x <= 0) { delete w[k]; return k; } } };
    q.traits = [pickOne()]; if (r() < 0.3) q.traits.push(pickOne());
  }
  const epithet = q => q && q.traits && q.traits.length ? TRAITS[q.traits[0]].name : '';

  // =====================================================================
  //  AMBITIONS — three things each head of the house sets out to do; renown for each one done
  // =====================================================================
  const bloodIn = c => c.people.filter(q => q.dyn && !q.slave).length;
  const knownOthers = (W, t) => W.tribes.filter(o => o !== t && o.clans.length && knowsTribe(W, o));
  const AMBS = {
    clanhead: { r: 8, text: (n, h, c) => `Lead the ${c.name} clan`, ok: (W, P, h, c, t) => c.head !== h && h.sex === leaderSex(t), done: (W, P, h, c) => c.head === h },
    headman: { r: 12, text: (n, h, c, t) => `Lead the ${t.name}`, ok: (W, P, h, c, t) => c.head === h && t.headman !== h && t.clans.length > 1, done: (W, P, h, c, t) => t.headman === h },
    village: { r: 8, text: () => 'Found a village', ok: (W, P, h, c) => !c.settled, done: (W, P, h, c) => !!c.settled },
    works: { r: 8, text: () => 'Raise a palisade or a great hall', ok: (W, P, h, c) => c.settled && !(c.works && (c.works.pal || c.works.hall)), done: (W, P, h, c) => !!(c.works && (c.works.pal || c.works.hall)) },
    blood: { r: 8, n: (W, P, h, c) => Math.max(5, bloodIn(c) + 4), text: n => `See ${n} of the blood living in your clan`, ok: () => true, done: (W, P, h, c, t, n) => bloodIn(c) >= n },
    clan: { r: 8, n: (W, P, h, c) => Math.ceil((freeCount(c) + 10) / 5) * 5, text: n => `Bring the clan to ${n} people`, ok: () => true, done: (W, P, h, c, t, n) => freeCount(c) >= n },
    renown: { r: 6, n: (W, P) => Math.round((P.renown * 1.3 + 60) / 10) * 10, text: n => `Win ${n} renown`, ok: () => true, done: (W, P, h, c, t, n) => P.renown >= n },
    claim: { r: 5, text: () => 'Claim a source for the house', ok: (W, P) => !(P.claims && P.claims.length), done: (W, P) => !!(P.claims && P.claims.length) },
    ally: { r: 10, text: () => 'Make an ally of another people', ok: (W, P, h, c, t) => knownOthers(W, t).length > 0 && !W.tribes.some(o => o !== t && isAllied(t, o)), done: (W, P, h, c, t) => W.tribes.some(o => o !== t && isAllied(t, o)) },
    farm: { r: 10, text: () => 'See your people sow their first fields', ok: (W, P, h, c, t) => t.stage < 2 && ['at', 'trip', 'far'].includes(grainInfo(W, c).state), done: (W, P, h, c, t) => t.stage >= 2 },
    crown: { r: 25, text: () => 'Be raised over the tribes', ok: (W, P, h, c, t) => t.headman === h && !t.confed && W.tribes.some(o => o !== t && isAllied(t, o)), done: (W, P, h, c, t) => !!(t.confed && t.confed.king === h) },
    find: { r: 5, text: () => 'Find another people', ok: (W, P, h, c, t) => knownOthers(W, t).length === 0 && !(P.amb || []).some(a => a.id === 'find' && a.done), done: (W, P, h, c, t) => knownOthers(W, t).length > 0 },
  };
  function addAmbition(W) {
    const P = W.player, h = P.head, c = h.clan, t = c.tribe; P.amb = P.amb || [];
    const open = Object.keys(AMBS).filter(id => !P.amb.some(a => a.id === id && !a.done) && AMBS[id].ok(W, P, h, c, t)); if (!open.length) return;
    // not what is already true
    const cand = open.filter(id => { const A = AMBS[id], n = A.n ? A.n(W, P, h, c, t) : 0; return !A.done(W, P, h, c, t, n); }); if (!cand.length) return;
    const id = pick(cand, W.rand), A = AMBS[id], n = A.n ? A.n(W, P, h, c, t) : 0;
    P.amb.push({ id, n, text: A.text(n, h, c, t), done: false, since: W.week, r: A.r });
  }
  function headSetup(W) {
    const P = W.player, h = P.head; giveTraits(W, h);
    const hd = P.heads[P.heads.length - 1]; if (hd && !hd.epithet) { hd.epithet = epithet(h); hd.traits = h.traits.slice(); }
    P.amb = (P.amb || []).filter(a => a.done); // the old head's unfinished ambitions die with them
    for (let k = 0; k < 3; k++) addAmbition(W);
    if (P.headsSeen) notice(W, `${h.name} ${epithet(h)}`, `${h.traits.map(k => TRAITS[k].does).join('. ')}. ${h.sex === 'F' ? 'Her' : 'His'} ambitions: ${P.amb.filter(a => !a.done).map(a => a.text.toLowerCase()).join('; ')}.`);
    P.headsSeen = (P.headsSeen || 0) + 1;
  }
  function ambitionCheck(W) {
    const P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan) return; const h = P.head, c = h.clan, t = c.tribe;
    if (P.setupFor !== h) { P.setupFor = h; headSetup(W); }
    for (const a of P.amb || []) { if (a.done) continue; const A = AMBS[a.id]; if (!A || !A.done(W, P, h, c, t, a.n)) continue;
      const again = (P.amb || []).some(x => x !== a && x.id === a.id && x.done && x.at != null && W.week - x.at < 52 * 12); // the same sort of ambition won again within twelve years: the renown is paid, but the house is not told the same thing every few years
      a.done = true; a.at = W.week; a.by = h.name; P.renown += a.r; P.ambDone = (P.ambDone || 0) + 1; if (again) continue;
      houseNote(W, `${h.name} fulfilled an ambition: ${a.text[0].toLowerCase() + a.text.slice(1)}.`); notice(W, 'An ambition fulfilled', `${a.text}. ${h.name} wins ${a.r} renown, and sets ${h.sex === 'F' ? 'her' : 'his'} mind on something new.`);
      }
    if ((P.amb || []).filter(a => !a.done).length < 3 && W.week % 104 === 0) addAmbition(W);
  }
  // what the house will be remembered for
  function legacy(W) {
    const P = W.player; if (!P) return null; const years = Math.floor(((P.over ? P.heads[P.heads.length - 1].to || W.week : W.week) - P.heads[0].from) / 52);
    const titles = new Set(); for (const hd of P.heads) for (const x of hd.titles || []) titles.add(x);
    if (!P.over && P.head && P.head.alive) for (const x of titlesOf(P.head)) titles.add(x);
    const parts = [['Years the house has stood', years, years], ['Renown', Math.round(P.renown), Math.round(P.renown)], ['Heads of the house', P.heads.length, P.heads.length * 10], ['Ambitions fulfilled', P.ambDone || 0, (P.ambDone || 0) * 15],
      ['Led a clan', titles.has('clan head') ? 'yes' : 'no', titles.has('clan head') ? 15 : 0], ['Led a tribe', titles.has('headman') ? 'yes' : 'no', titles.has('headman') ? 30 : 0], ['Ruled over many tribes', titles.has('king') ? 'yes' : 'no', titles.has('king') ? 80 : 0]];
    const score = parts.reduce((s, p) => s + p[2], 0);
    return { score, parts, rank: score >= 900 ? 'a name sung for a thousand years' : score >= 600 ? 'a great house of the isles' : score >= 350 ? 'a house of note' : score >= 180 ? 'remembered by its own people' : 'a few lines in the memory of the old', heads: P.heads.map(hd => ({ name: hd.name, epithet: hd.epithet || '', from: Math.floor(hd.from / 52), to: hd.to != null ? Math.floor(hd.to / 52) : null, titles: (hd.titles || []).map(x => x === 'king' ? (hd.rw || 'ruler') : x) })), amb: (P.amb || []).filter(a => a.done).map(a => ({ text: a.text, by: a.by, y: Math.floor(a.at / 52) })) };
  }
  const legacyHTML = L => `<b>Legacy ${L.score}</b>: ${L.rank}.<br><br>${L.parts.map(p => `${p[0]}: ${p[1]}`).join('<br>')}<br><br><b>The line of the house</b><br>${L.heads.map(hd => `${hd.name}${hd.epithet ? ' ' + hd.epithet : ''}, years ${hd.from}–${hd.to == null ? '' : hd.to}${hd.titles.length ? ' (' + hd.titles.join(', ') + ')' : ''}`).join('<br>')}`;

  // =====================================================================
  //  COUNSEL — the one most useful thing to do now
  // =====================================================================
  function advice(W) {
    const P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan) return null; const h = P.head, c = h.clan, t = c.tribe, fd = foodDays(c);
    const A = playerActions(W), can = id => { const a = A.find(x => x.id === id); return a && a.ok ? a : null; }, g = grainInfo(W, c);
    if (!c.people.some(q => q.dyn && q !== h && !q.slave)) return can('recall') ? { text: 'No one of your blood lives in your clan. Call one of the blood home before the house ends with its head.', deed: 'recall' } : can('adopt') ? { text: 'No one of your blood lives in your clan. Adopt a child of the clan as your heir.', deed: 'adopt' } : { text: 'No one of your blood lives in your clan: the house would end with its head. Marry, and keep your children near.' };
    if (c.cond < 0.8 && !c.settled && can('movecamp')) return { text: `The clan is going hungry (${fd} days of food). Move camp to richer ground: the shore, a river mouth, or the wild grain.`, deed: 'movecamp' };
    const fw = c.people.filter(q => q.sex === 'F' && !q.slave && q.age >= 16 && q.age < 45).length;
    if (fw <= 2 && freeCount(c) < 30 && can('invite')) return { text: `Only ${fw} wom${fw === 1 ? 'a' : 'e'}n of childbearing age in the clan. Invite a household to join you.`, deed: 'invite' };
    if (can('settle')) return { text: t.stage >= 2 ? 'Your people sow grain. Found a village: it stores food, has more children and can grow far larger than a camp.' : 'These waters could feed a village. Founding one lets the clan grow well past the size of a camp.', deed: 'settle' };
    if (t.stage < 2 && (g.state === 'trip' || g.state === 'far') && g.reach !== false && !c.settled && can('movecamp')) return { text: `Wild grain grows ${g.km} km ${g.dir}. Camp beside it and your people will learn to sow much sooner.`, deed: 'movecamp' };
    if (c.settled && !(c.works && c.works.pal) && c.raidedAt && W.week - c.raidedAt < 52 * 12 && can('build')) return { text: 'Raiders have struck the village. A palisade makes defenders fight far harder and raiders think twice.', deed: 'build' };
    if (c.settled && freeCount(c) >= splitCap(W, c) - 6 && !(c.works && c.works.hall) && can('build')) return { text: `The village is near the size at which it splits (${freeCount(c)} of ${splitCap(W, c)}). A great hall lets it hold together past a hundred.`, deed: 'build' };
    if (!(P.claims && P.claims.length) && can('claim')) { const a = can('claim'); return { text: `${a.targets[0].label.replace(/^\\S+\\s/, '')} lies unclaimed. Claim it and your household brings goods home every season.`, deed: 'claim' }; }
    if (c.head !== h && h.sex === leaderSex(t) && h.age >= 25 && c.head && prestige(h) > prestige(c.head) * 0.95 && can('challengeClan')) return { text: `Your standing (${prestige(h).toFixed(2)}) matches that of ${c.head.name} (${prestige(c.head).toFixed(2)}), who leads the clan. You could challenge.`, deed: 'challengeClan' };
    if (!knownOthers(W, t).length && can('explore')) { const sg = (can('explore').targets || []).find(x => x.ref && x.ref.signed); return { text: sg ? `You know of no other people. Follow the signs to the ${sg.ref.dir}, ${walkWord(sg.ref.d)}: neighbours mean trade, marriages and allies.` : 'You know of no other people. Send an expedition: neighbours mean trade, marriages and allies.', deed: 'explore' }; }
    if (t.headman === h && can('ally')) return { text: 'A friendly people would take your hand. Propose an alliance.', deed: 'ally' };
    if (c.settled && can('build')) return { text: 'The village has stores to spare. Set it to build: a granary, a hall or a palisade.', deed: 'build' };
    const am = (P.amb || []).find(a => !a.done); if (am) return { text: `${h.name} has set ${h.sex === 'F' ? 'her' : 'his'} heart on this: ${am.text.toLowerCase()}.` };
    return null;
  }

  // =====================================================================
  //  DEALINGS BETWEEN PEOPLES — alliance, trade pact, tribute, peace
  // =====================================================================
  const likely = p => { const n = Math.round(p * 100); return n > 70 ? 'likely to agree' : n > 45 ? 'may agree' : n > 25 ? 'unlikely to agree' : n > 10 ? 'will most likely refuse' : 'will almost surely refuse'; }; // judged on the figure shown, so one shown figure always gets one word
  function envoyOdds(W, kind, t, o, h) {
    const op = opinion(o, t), u = und(t, o), r = t.rel.get(o.id), kin = r ? Math.min(6, r.kin) : 0, sv = hasTrait(h, 'silver') ? 0.15 : 0, wr = warriors(t) / Math.max(1, warriors(o));
    if (kind === 'ally') return clamp(0.05 + op / 70 + u * 0.2 + kin * 0.04 + sv, 0.03, 0.95);
    if (kind === 'pact') return clamp(0.3 + op / 80 + u * 0.25 + sv, 0.05, 0.97);
    if (kind === 'tribute') return clamp(0.15 + (wr - 1.5) * 0.35 - op / 250 + sv * 0.5, 0.03, 0.9);
    return clamp(0.45 + op / 150 + u * 0.15 + sv + (wr > 1 ? 0.1 : 0), 0.1, 0.95); // peace
  }
  function diplomacyYear(W) {
    for (const a of W.tribes) for (const [oid, r] of a.rel) {
      if (oid <= a.id) continue; const b = W.ents.get(oid); if (!b || b.kind !== 'tribe' || !b.alive || !a.clans.length || !b.clans.length) { if (r.pact) r.pact = 0; if (r.tribute) r.tribute = null; continue; }
      aiPact(W, a, b, r);
      if (r.pact && !r.allied && r.op > 35 && r.pact - W.week < 52 * 16 && !a.atWar.has(b.id) && W.rand() < 0.06) { const P0 = W.player, pt = P0 && !P0.over && P0.head.clan ? P0.head.clan.tribe : null, nAl = x => { let n = 0; for (const [, q] of x.rel) if (q.allied) n++; return n; }; if (a !== pt && b !== pt && nAl(a) < 3 && nAl(b) < 3) formAlliance(W, a, b); }
      if (r.pact) { if (W.week > r.pact || r.op < -25 || a.atWar.has(b.id)) { r.pact = 0; note(W, a, `The trade pact with the ${b.name} lapsed.`); note(W, b, `The trade pact with the ${a.name} lapsed.`); }
        else { let n = 0; for (const ca of a.clans) { const cb = b.clans.slice().sort((x, y) => Math.hypot(x.x - ca.x, x.y - ca.y) - Math.hypot(y.x - ca.x, y.y - ca.y))[0]; if (cb && Math.hypot(cb.x - ca.x, cb.y - ca.y) < 200000 && n < 3 && exchange(W, ca, cb)) n++; } r.trade += 1; if (r.op < 40) r.op += 1.5; } }
      if (r.tribute) { const to = W.ents.get(r.tribute.to), from = to === a ? b : a;
        if (!to || W.week > r.tribute.until || warriors(from) > warriors(to) * 1.1) { r.tribute = null; if (to) { note(W, from, `We pay the ${to.name} no more tribute.`); note(W, to, `The ${from.name} pay us tribute no longer.`); const P = W.player; if (P && !P.over && P.head.alive && P.head.clan && P.head.clan.tribe === to) { { if (P.told) { delete P.told['trib' + from.id]; } houseNote(W, `The ${from.name} stopped paying tribute.`); } notice(W, 'The tribute ends', `The ${from.name} pay your people tribute no longer. ${warriors(from) > warriors(to) * 1.1 ? 'They have grown too strong to be made to.' : 'The ten years are over.'}`); } } }
        else { const rc = to.headman && to.headman.clan ? to.headman.clan : to.clans[0], gv = from.clans.slice().sort((x, y) => y.store + y.grain - x.store - x.grain)[0]; if (rc && gv) { const amt = Math.min(gv.store * 0.25, needsWeek(rc) * 4); gv.store -= amt; rc.store += amt; const tr = GIFTABLE.find(g => gv.goods[g] > 1); if (tr) { gv.goods[tr]--; rc.goods[tr] = (rc.goods[tr] || 0) + 1; } const P = W.player; if (P && !P.over && P.head.alive && P.head.clan && P.head.clan.tribe === to) { const dd = Math.round(amt / Math.max(1, needsWeek(rc) / 7)); houseNoteChanged(W, 'trib' + from.id, amt > 0 || tr ? dd : -1, amt > 0 || tr ? `The ${from.name} sent tribute to the ${rc.name} clan: ${dd > 0 ? 'food for ' + dd + ' days' : amt > 0 ? 'a little food' : ''}${amt > 0 && tr ? ' and ' : ''}${tr ? 'some ' + GOOD_NAMES[tr].toLowerCase() : ''}.` : `The ${from.name} sent no tribute this year; they had nothing to spare.`); } } r.op -= 2; } }
    }
  }
  // =====================================================================
  //  PEOPLE IN YOUR LIFE — every head of the house has an enemy and a friend among the houses of the tribe,
  //  and now and then they come to the fire: a friend in need, an enemy's insult, a child of the house coming of age
  // =====================================================================
  function castYear(W) {
    const P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan) return; const h = P.head, f = h.fam, c = h.clan, t = c.tribe; if (!f) return;
    const cast = P.cast || (P.cast = {}), gone = q => !q || !q.alive || !q.clan || q.clan.tribe !== t || !q.fam;
    if (cast.rival && gone(cast.rival)) { if (cast.rival && !cast.rival.alive) houseNote(W, `${cast.rival.name}, old enemy of the house, is dead.`); cast.rival = null; }
    if (cast.friend && gone(cast.friend)) { if (cast.friend && !cast.friend.alive) houseNote(W, `${cast.friend.name}, friend of the house, is dead.`); cast.friend = null; }
    let rv = null, rs = -22, fr = null, fs = 28;
    for (const o of t.clans) for (const g of familiesOf(o)) { if (g === f || !g.head || !g.head.alive || g.head.dyn || g.head.age < 18) continue; const op = opinion(g, f); if (op < rs) { rs = op; rv = g.head; } if (op > fs) { fs = op; fr = g.head; } }
    const why = g => { const r = f.rel.get(g.id), e = r && r.hist && r.hist.length ? r.hist[r.hist.length - 1] : null; return e && e.t ? ` (${e.t})` : ''; };
    if (rv && !cast.rival && (!cast.friend || rv !== cast.friend)) { cast.rival = rv; cast.rivalSince = W.week; houseNote(W, `${rv.name} of the ${rv.clan.name} clan has become an enemy of ${h.name}${why(rv.fam)}.`); notice(W, `An enemy: ${rv.name}`, `${rv.name}, head of a house of the ${rv.clan.name} clan, bears ${h.name} ill will${why(rv.fam)}. Enemies speak against you when the clans choose a leader, and quarrels with them turn ugly. Gifts, a feast or a marriage between the houses can mend it.`); }
    if (fr && !cast.friend && fr !== cast.rival) { cast.friend = fr; cast.friendSince = W.week; houseNote(W, `${fr.name} of the ${fr.clan.name} clan has become a friend of ${h.name}${why(fr.fam)}.`); notice(W, `A friend: ${fr.name}`, `${fr.name}, head of a house of the ${fr.clan.name} clan, is now a friend of ${h.name}${why(fr.fam)}. Friends stand with you when the clans choose, and their households will come if you invite them.`); }
    if (cast.rival && cast.rival.fam && opinion(cast.rival.fam, f) > 5) { houseNote(W, `The quarrel with ${cast.rival.name} is mended.`); cast.rival = null; }
    if (cast.friend && cast.friend.fam && opinion(cast.friend.fam, f) < 5) { houseNote(W, `${cast.friend.name} is a friend of the house no longer.`); cast.friend = null; }
    // a child of the head comes of age: the house chooses what they will become
    if (!W.pending.some(e => e.type === 'path')) { const heir = clanHeir(W, c, h), kid = c.people.find(q => q.dyn && !q.slave && !q.pathAsked && q.age >= 15 && q.age < 18 && (q.father === h || q.mother === h) && (q === heir || W.week - (P.lastPath || -9999) > 52 * 9));
      if (kid) { kid.pathAsked = true; P.lastPath = W.week; const he = kid.sex === 'F' ? 'she' : 'he', her = kid.sex === 'F' ? 'her' : 'his';
        pushEvent(W, { type: 'path', key: kid.id, title: `${kid.name} comes of age`, text: `${kid.name}, ${relWord(kid, h)}, is ${Math.floor(kid.age)} and no longer a child. The clan watches to see what ${he} will make of ${kid.sex === 'F' ? 'herself' : 'himself'}. What will you raise ${kid.sex === 'F' ? 'her' : 'him'} to be? If ${he} ever leads the house, this is the bent ${he} will bring to it.`, data: { kid },
          options: [{ label: 'A hunter and a fighter', hint: TRAITS.bold.name + ': ' + TRAITS.bold.does.toLowerCase() }, { label: 'A speaker at the fires', hint: TRAITS.silver.name + ': ' + TRAITS.silver.does.toLowerCase() }, { label: 'A keeper of the rites', hint: TRAITS.pious.name + ': ' + TRAITS.pious.does.toLowerCase() }, { label: 'A maker and a trader', hint: TRAITS.shrewd.name + ': ' + TRAITS.shrewd.does.toLowerCase() }] }); } }
    // now and then, friend and enemy come to the fire
    if (W.week - (P.lastTale || -9999) < 52 * 5 || W.rand() > 0.3 || W.pending.length) return;
    if (cast.friend && (cast.friend.clan.cond < 0.9 || W.rand() < 0.4)) { P.lastTale = W.week; const q = cast.friend;
      pushEvent(W, { type: 'friendneed', key: q.id, title: `${q.name} comes to your fire`, text: `${q.name} of the ${q.clan.name} clan, your friend ${(n => n < 2 ? 'this past year' : 'these ' + n + ' years')(Math.floor(W.week / 52) - Math.floor((cast.friendSince || W.week) / 52))}, sits down at your fire and will not meet your eye. ${(F => q.clan.cond < 0.9 ? `${F ? 'Her' : 'His'} people are hungry, and ${F ? 'her' : 'his'} children thin.` : `${F ? 'She' : 'He'} must give a bride-gift for ${F ? 'her' : 'his'} son and has nothing worthy to give.`)(q.sex === 'F')} ${q.sex === 'F' ? 'She' : 'He'} does not ask. ${q.sex === 'F' ? 'She' : 'He'} does not need to.`, data: { q },
        options: [{ label: `Give ${q.sex === 'F' ? 'her what she' : 'him what he'} needs`, hint: q.clan.cond < 0.9 ? `About ${Math.round(7 * 1.5)} days of your clan's food. ${q.sex === 'F' ? 'She' : 'He'} will not forget it` : `Something of value, or food if you have none. ${q.sex === 'F' ? 'She' : 'He'} will not forget it` }, { label: `Send ${q.sex === 'F' ? 'her' : 'him'} away with kind words`, hint: 'It costs nothing, and the friendship will cool' }] }); return; }
    if (cast.rival) { P.lastTale = W.week; const q = cast.rival, tr = GIFTABLE.find(g => c.goods[g] > 0);
      pushEvent(W, { type: 'slight', key: q.id, title: `${q.name} mocks you before the clans`, text: `At the evening fire, with half the tribe listening, ${q.name} of the ${q.clan.name} clan asks loudly whether the house of ${P.house} still remembers how to hunt, or only how to talk. People laugh, and wait to see what ${h.name} will do.`, data: { q },
        options: [{ label: 'Shame him with open hands', hint: tr ? `Give ${GOOD_NAMES[tr].toLowerCase()} to the poorest house there. Your standing rises and his laughter dies` : 'You have nothing of value to give: a feast from your stores instead' }, { label: 'Answer him in kind', hint: `A contest of words${h.age < 50 ? ', then of wrestling' : ''}: skill and a cool head win it. The winner gains renown, the loser is laughed at` }, { label: 'Let it pass', hint: 'No risk. Some will call it weakness' }] }); }
  }
  // =====================================================================
  //  MYTH — what a people believes about itself. Nothing here is true; all of it is acted on.
  //  A creation tale from the first day; real leaders become legends a generation after they die;
  //  real events (the first sowing, a plague, a burned village) harden into stories; and now and then a sign
  //  appears that the elders read, and the house must choose whether to heed it.
  // =====================================================================
  const CREATION = {
    mother: ['The isles are the body of the Great Mother, who lay down in the sea to rest. The rivers are her milk and the grasses her hair, and the dead go back into her.', 'In the beginning there was only the sea, and the Mother swimming in it. She grew tired, and where she lay down the isles rose under her. Every spring she turns in her sleep, and that is the thaw.', 'The Mother shaped the first people from river clay and breathed on them to dry them. That breath is still in everyone, and goes back to her at the end.'],
    spirits: ['Before there were people every rock, tree and river had a voice, and they all spoke at once. The first shaman taught them to take turns, and that is why the world can be listened to.', 'At first the world was fog, and nothing had an edge. The spirits grew bored and gave each thing a shape and a name, and they are still jealous of the names.', 'The world lay shut inside a mussel shell until a raven pried it open out of hunger. The spirits came out first, and people last, blinking.'],
    totem: ['The first people were animals who took off their skins to dance. Those who danced too long could not find their skins again, and they became the clans.', 'Each clan was dreamed by a beast asleep under a hill. When the beast wakes the clan will end, so no one hunts near the hill or raises their voice there.', 'In the first winter the animals drew lots for who would feed the people. The losers gave their flesh, and the winners gave their names to the clans.'],
    ancestors: ['The first father and the first mother walked out of the western sea carrying fire in a shell. The dead walk back the same way, and watch from the far shore.', 'The first people climbed out of a barrow that no one had built. They sealed it behind them, and ever since the living have been building it again for the dead.', 'There were two sisters at the beginning, and one died. The other would not leave the grave, and from her waiting came the first hearth, the first house and the first village.'],
    sky: ['The sun is a hunter and the moon his quarry. People are the sparks struck when his spear glanced off the mountains.', 'The sky was once so low that people walked bent double. A tall woman pushed it up with her digging stick, and the holes she made are the stars.', 'Thunder and the sea quarrelled over who was the stronger, and what they broke between them became the isles. People live in the wreckage and try to keep the two from starting again.'],
  };
  const FEATS = ['wrestled the sea for three days and won the tides from it', 'was suckled by a she-bear and could not be cut by flint', 'talked the winter into leaving early', 'brought fire back from the island of the dead', 'ran down a stag on foot and then let it go', 'sang so that the seals came ashore to listen', 'could see by night, and was never once lost', 'outwitted the fever-spirit and shut it in a pot', 'walked across the strait on the backs of salmon', 'was born with a full set of teeth and spoke on the first day', 'traded a shadow to the north wind for a good harvest', 'slept a whole winter under the snow and woke knowing the names of all the stars', 'carried a river in cupped hands to where the people were thirsty', 'was never beaten at any game, not even by the dead', 'taught the wolves to keep away from the children', 'split a hill with one blow to let the herds through'];
  const freshFeat = (t, rand) => { const used = (t.myths || []).map(m => m.text).join(' '); const free = FEATS.filter(f => !used.includes(f)); return pick(free.length ? free : FEATS, rand); };
  const BYNAMES = ['the Tall', 'Long-arm', 'the Grey', 'Twice-born', 'Deer-foot', 'the Singer', 'Far-seer', 'the Unsleeping'];
  const OMENS = ['A white stag was seen standing at the edge of the camp at dawn, and it did not run.', 'The moon rose red as ochre, three nights running.', 'A whale came ashore below the camp and died there, though the sea was calm.', 'A child was born with a caul over its face.', 'The sun went dark at midday, and the birds fell silent.', 'An owl called by day from the roof-pole of your own house.', 'A star with a tail hung over the hills for nine nights.', 'The spring ran cloudy, and frogs were found dead around it.', 'The tide went out further than anyone living had seen, and stayed out half a day.', 'Lightning split the old tree in the middle of the camp out of a clear sky.', 'Bees swarmed on the door-post of the oldest house and would not be smoked off.', 'All the dogs howled through one night, facing the same way.', 'A fawn with two heads was found in the reeds, alive.'];
  const QUIET = ['raid', 'explore', 'expedition', 'voyage', 'migrate', 'trader', 'claim', 'movecamp', 'movevillage', 'foundvillage', 'landdrive'];
  const READING = { mother: 'The elders say the Mother is asking for something back.', spirits: 'The shaman says the spirits are uneasy and want quiet.', totem: 'The elders say the clan-beast is warning its children.', ancestors: 'The elders say the dead are hungry and have been forgotten.', sky: 'The seers say the sky hunter has marked your people.' };
  function addMyth(W, t, m) {
    t.myths = t.myths || []; m.y = Math.floor(W.week / 52); t.myths.push(m);
    while (t.myths.length > 9) { const i = t.myths.findIndex(x => x.kind !== 'creation'); t.myths.splice(i < 0 ? 0 : i, 1); } // old stories are forgotten, never the first one
    logEvent(W, `A story is now told at the fires of the ${t.name}: “${m.title}”. ${m.text}`, t, 'info'); note(W, t, `We began to tell the story of ${m.title}.`);
    const P = W.player; if (P && !P.over && P.head.alive && P.head.clan && P.head.clan.tribe === t && !m.silent) { houseNote(W, `A new story is told at our fires: ${m.title}.`); notice(W, `A new story: ${m.title}`, m.text + (m.note ? ' ' + m.note : '')); }
  }
  function creationMyth(W, t) { const f = faithOf(t), K = t.kult; t.myths = [{ kind: 'creation', title: 'How the world began', text: CREATION[f][K ? (K.cv != null ? K.cv : (K.cv = Math.floor(W.rand() * 3))) : 0] + (K && K.style ? ` And they tell of ${K.style.tale}.` : ''), y: Math.floor(W.week / 52) }]; }
  const remember = (W, t, kind, data) => { if (!t || !t.alive) return; (t.memory = t.memory || []).push({ kind, w: W.week, ...data }); if (t.memory.length > 12) t.memory.shift(); };
  // what the chronicle records, the people later turn into story
  function mythHook(W, text, e) {
    const t = e && e.kind === 'tribe' ? e : e && e.tribe ? e.tribe : null; if (!t) return; let m;
    const lead = t.headman, ch = e.kind === 'clan' ? e.head : null;
    if (/build (the village of|a permanent fishing village:) /.test(text) && ch) credit(ch, 'village', e.village);
    else if (/kill a whale/.test(text)) credit(ch, 'whale');
    else if (/smelt copper/.test(text)) credit(lead, 'copper');
    else if (/^The .* migrate \d+ km/.test(text)) credit(lead, 'trek');
    else if (/^A new tribe: /.test(text)) credit(lead || (t.clans[0] && t.clans[0].head), 'founder');
    else if (/^Alliance: |make peace\.$|^Peace: /.test(text)) credit(lead, 'peace');
    else if (/ build (a palisade|a ditch)/.test(text)) credit(lead, 'walls');
    if (/begin to sow/.test(text)) { remember(W, t, 'grain', {}); credit(lead, 'grain'); }
    else if (/seagoing canoes/.test(text)) { remember(W, t, 'sea', {}); credit(lead, 'sea'); }
    else if ((m = /raise (?:a|an) [^:]+: ([^.,]+)[.,]/.exec(text))) { remember(W, t, 'stones', { name: m[1] }); credit(lead, 'built', m[1]); }
    else if ((m = /The palisade of (.+?) is burned by the (.+?)\./.exec(text))) remember(W, t, 'burning', { name: m[1], by: m[2] });
    else if (/is going hungry|^The .* (go hungry|are starving)|Hunger in/.test(text)) { remember(W, t, 'hunger', {}); credit(ch || lead, 'hunger'); }
  }
  const credit = (q, key, val) => { if (!q || !q.alive) return; const d = q.did || (q.did = {}); d[key] = val != null ? val : (d[key] || 0) + 1; };
  const WHEN = ['in the time of the grandfathers', 'when the old ones were young', 'in the years of the long winters', 'in the days the grandmothers tell of', 'in a year no two tellers agree on'];
  // what a leader really did, as the fires now tell it: a true kernel, grown tall in the telling
  function legendOf(W, t, hr, rand) {
    const d = hr.did || {}, F = hr.sex === 'F', he = F ? 'she' : 'he', his = F ? 'her' : 'his', him = F ? 'her' : 'him', f = faithOf(t);
    const power = f === 'mother' ? 'the Mother' : f === 'ancestors' ? 'the dead' : f === 'sky' ? 'the sky' : f === 'totem' ? 'the clan-beast' : 'the spirits';
    const K = [];
    if (d.walked) K.push(['Story-walker', `walked the story of “${d.walked}” before the whole people, and came back changed`]);
    if (d.beast && BEASTS[d.beast.kind]) K.push([BEASTS[d.beast.kind].slayer, `killed ${d.beast.name}${/^a /.test(d.beast.name) ? '' : `, the ${BEASTS[d.beast.kind].n}`}${d.beast.kills ? ` that had taken ${d.beast.kills === 1 ? 'one' : d.beast.kills} of the people` : /^a /.test(d.beast.name) ? '' : ' that no one before had come near'}, and wore its ${BEASTS[d.beast.kind].trophy} ever after`]);
    if (hr.king) K.push(['the Binder', `bound the peoples into one, and they say ${power} raised ${him} over them all`]);
    if (d.founder || d.trek || d.p_migrate) K.push(['the Far-walker', `walked ahead of the people to this land, and they say the rivers moved aside for ${him}`]);
    if (d.village) K.push(['the Founder', `drove the first post of ${d.village} with ${his} own hands, and they say the post took root and is a tree now`]);
    if (d.built) K.push(['Stone-raiser', `raised ${d.built}, and some say ${he} did it alone, in one night`]);
    if (d.grain) K.push(['the Sower', `was the first to put seed in the ground, having been shown how in a dream`]);
    if (d.sea) K.push(['Wave-rider', `built the first great canoe and paddled it past the place where the sea ends`]);
    if (d.copper) K.push(['Fire-tamer', `drew the first copper out of a stone by singing to it`]);
    if (d.whale) K.push(['Whale-caller', `killed a whale with one spear and begged its pardon afterwards`]);
    if ((d.raids || 0) + (d.p_raid || 0) >= 2) K.push(['Red-spear', `never came home from a raid empty-handed, and ${his} spear is said to have gone hunting by itself`]);
    if (d.peace || d.p_peace || d.p_ally || d.p_pact) K.push(['Peace-weaver', `ended an old quarrel by eating from the same bowl as ${his} enemy`]);
    if ((d.p_feast || 0) + (d.p_gifts || 0) >= 3) K.push(['Open-hand', `gave away everything ${he} owned three times over, and was never the poorer for it`]);
    if (d.hunger) K.push(['the Provider', `fed the whole people through a starving winter from one basket that was never empty`]);
    if (d.walls) K.push(['the Wall-builder', `ringed ${hr.village || 'the village'} with stakes that no enemy has ever managed to count`]);
    if ((d.p_explore || 0) + (d.p_voyage || 0) >= 2) K.push(['Far-seer', `walked to the edge of the world, looked over, and would never say what ${he} saw`]);
    if ((d.p_trader || 0) >= 3) K.push(['the Welcome', `had a friend at every fire under the sky, and never once paid for a meal`]);
    if ((hr.kids || 0) >= 11) K.push([F ? 'Mother of Many' : 'Father of Many', `had so many children that half the people now claim ${him} as a forebear`]);
    const titles = (t.myths || []).filter(m => m.kind === 'hero').map(m => m.title).join(' | '), texts = (t.myths || []).map(m => m.text).join(' ');
    const freeK = K.filter(k => !titles.includes(k[0]) && !texts.includes(k[1].slice(0, 24))), k = freeK.length ? (d.beast && freeK[0][1].startsWith('killed ') ? freeK[0] : freeK[Math.floor(rand() * Math.min(3, freeK.length))]) : null;
    const tn = hr.traits && hr.traits.length ? TRAITS[hr.traits[0]].name : null, freeB = BYNAMES.filter(b => !titles.includes(b));
    const by = k ? k[0] : tn && !titles.includes(tn) ? tn : pick(freeB.length ? freeB : BYNAMES, rand);
    const usedW = WHEN.filter(w => !texts.includes(w)), when = pick(usedW.length ? usedW : WHEN, rand);
    const role = hr.king && k && k[0] === 'the Binder' ? `was of the ${t.name}` : hr.lead ? `led the ${t.name}` : `was of the ${hr.clan} clan`;
    let text = `${hr.name} ${by}, who ${role} ${when}, ${k ? k[1] : freshFeat(t, rand)}.`;
    if (k && rand() < 0.5) text += ` They also say ${he} ${freshFeat(t, rand)}.`;
    text += /killed by /.test(hr.cause) ? ` They say ${he} and ${hr.cause.slice(10)} killed each other, and that the two of them still fight in the hills when it thunders.` : /kill|raid/.test(hr.cause) ? ` They say ${he} did not die at all, and still walks the shore on moonless nights with ${his} spear.` : hr.age >= 65 ? (o => o ? ' ' + o : '')([`They say ${he} lived a hundred winters and never told a lie.`, `They say ${he} was so old at the end that ${he} remembered the hills being made.`, `They say death came for ${him} three times and was sent away twice.`].find(o => !texts.includes(o.slice(12)))) : hr.age < 40 && !texts.includes('out of jealousy') ? ` They say ${power} took ${him} young, out of jealousy.` : '';
    return { title: `${hr.name} ${by}`, text, true: k ? k[0] : null };
  }
  function heroCandidate(W, q, c) {
    const t = c && c.tribe; if (!t || !t.alive || q.age < 25) return; const P = W.player, mine = P && !P.over && P.head === q, first = mine && P.heads && P.heads.length === 1, lead = t.headman === q, king = t.confed && t.confed.king === q;
    if (!(lead || king || first || (mine && P.renown > 40) || (c.head === q && prestige(q) > 1.3))) return;
    (t.heroes = t.heroes || []).push({ name: q.name, sex: q.sex, died: W.week, age: Math.floor(q.age), traits: q.traits ? q.traits.slice() : null, dyn: !!q.dyn, first: !!first, did: q.did ? { ...q.did } : null, kids: q.kids || 0, king: !!king, lead: !!lead, cause: q.cause || '', clan: c.name, village: c.village || null });
    if (t.heroes.length > 8) t.heroes.shift();
  }
  function mythYear(W) {
    const rand = W.rand, P = W.player, pt = P && !P.over && P.head.alive && P.head.clan ? P.head.clan.tribe : null;
    for (const t of W.tribes) {
      if (!t.alive || !t.clans.length) continue; if (!t.myths) creationMyth(W, t);
      // a generation after their death, the great are no longer remembered as they were
      for (const hr of (t.heroes || []).slice()) { const age = (W.week - hr.died) / 52; if (age < (hr.dyn ? 12 : 18)) continue; t.heroes.splice(t.heroes.indexOf(hr), 1);
        const hs = (t.myths || []).filter(m => m.kind === 'hero');
        if (age > 40 || (hr.dyn ? hs.filter(m => m.dyn).length >= 3 : hs.length >= 4) || rand() > (hr.first ? 1 : hr.king ? 0.95 : hr.dyn ? 0.8 : hr.lead ? 0.6 : 0.35)) continue;
        const L = legendOf(W, t, hr, rand);
        { const hc = t.clans.find(x => x.name === hr.clan) || t.clans[0]; if (hc && rand() < 0.5) addTreasure(W, hc, `${pick(['the spear', 'the cloak-pin', 'the drinking horn', 'the staff', 'the amber bead'], rand)} of ${hr.name}`, `kept in memory of ${hr.name}, who died in year ${Math.floor(hr.died / 52)}; first shown`); }
        addMyth(W, t, { kind: 'hero', hero: hr.name, dyn: hr.dyn, title: L.title, text: L.text, note: hr.dyn && t === pt ? `${hr.name} was of your own house. Every one of the blood now stands higher among the ${t.name} for it.` : '' }); }
      // and what happened to the people becomes what the people say happened
      for (const mem of (t.memory || []).slice()) { const age = (W.week - mem.w) / 52; if (age < 15) continue; t.memory.splice(t.memory.indexOf(mem), 1); if (rand() > 0.75 || (t.myths || []).some(m => m.kind === mem.kind)) continue;
        const f = faithOf(t), who = f === 'mother' ? 'the Mother' : f === 'ancestors' ? 'the first mother' : f === 'sky' ? 'the sky hunter' : f === 'totem' ? 'the clan-beast' : 'a spirit of the river';
        if (mem.kind === 'grain') addMyth(W, t, { kind: 'grain', title: 'The Gift of the Grain', text: `They say ${who} found a woman of the ${t.name} weeping over a starving child, and where the tears fell the first grain came up. That is why the first sheaf is never eaten.` });
        else if (mem.kind === 'sea') addMyth(W, t, { kind: 'sea', title: 'The Whale Who Agreed', text: `They say the first great canoe was a whale who agreed to be hollowed out, on the promise that its bones would be sung to. Boatbuilders of the ${t.name} still sing as they work.` });
        else if (mem.kind === 'stones') addMyth(W, t, { kind: 'stones', title: `The Raising of ${mem.name}`, text: /Barrow|Mound|Cairn/.test(mem.name) ? `They say the dead themselves carried the first baskets of earth to ${mem.name}, and that on the longest night you can still hear them at work.` : /Shrine|Grove|House/.test(mem.name) ? `They say ${mem.name} was never built at all: the people woke one morning and it was there, and they only swept it.` : `They say the stones of ${mem.name} walked there by themselves in a single night, and the people only stood them upright in the morning.` });
        else if (mem.kind === 'burning') addMyth(W, t, { kind: 'burning', title: `The Burning of ${mem.name}`, text: `They say the ${mem.by} came in the night like wolves, and that the smoke of ${mem.name} could be seen from the far isle. Children of the ${t.name} are taught the names of the dead before they are taught to count.` });
        else if (mem.kind === 'hunger') addMyth(W, t, { kind: 'hunger', title: 'The Hungry Moon', text: `They say there was a winter when the moon itself grew thin, and that the people ate their sandals. No one of the ${t.name} will throw food on a fire.` });
        else if (mem.kind === 'plague') addMyth(W, t, { kind: 'plague', title: 'The Stranger\'s Shadow', text: `They say a stranger brought the fever in his shadow, and that it would not leave until ${mem.n || 'many'} had gone away with it. The ${t.name} do not let a stranger's shadow fall across a sleeping child.` }); }
    }
    // the blood of a legend stands higher among those who tell the legend
    if (pt) { const n = (pt.myths || []).filter(m => m.kind === 'hero' && m.dyn).length, b = Math.min(0.45, n * 0.15); for (const c of W.clans) for (const q of c.people) if (q.dyn) q.lineage = c.tribe === pt ? b : 0; P.lineage = b; P.lineageOf = (pt.myths || []).filter(m => m.kind === 'hero' && m.dyn).map(m => m.title); }
    // a sign, and what the elders make of it
    if (pt && !W.pending.length && W.week - (P.lastOmen || -9999) > 52 * 11 && rand() < 0.25) { P.lastOmen = W.week; const h = P.head, c = h.clan, f = faithOf(pt), seen = P.omensSeen || (P.omensSeen = []), fresh = OMENS.map((_, i) => i).filter(i => !seen.includes(i)), oi = pick(fresh.length ? fresh : (seen.length = 0, OMENS.map((_, i) => i)), rand), om = c.settled ? OMENS[oi].replace(/\bcamp\b/g, 'village') : OMENS[oi], tr = GIFTABLE.find(g => c.goods[g] > 0); seen.push(oi);
      pushEvent(W, { type: 'omen', key: W.week, title: 'A sign', text: `${om} ${READING[f]} The whole clan is talking of nothing else, and looking at ${h.name}.`, data: { om },
        options: [{ label: 'Make the offering', hint: `${tr ? 'Something of value (' + GOOD_NAMES[tr].toLowerCase() + ')' : 'A week of the clan\'s food'} is given up. The people are reassured, and nothing more is said` }, { label: 'Keep the quiet', hint: 'For two years no raid, expedition, voyage, trading journey, migration or new claim. It costs nothing but time, and the other clans approve (+2)' }, { label: 'Say it is only a sign', hint: 'Nothing is given up. If a bad year follows within three years (many deaths, hunger or killings in the clan), they will blame you: −10 with the other clans, and standing lost. If three years pass quietly: renown +4' }] }); }
    if (pt && P.omenIgnored) { const c = P.head.clan, o = P.omenIgnored;
      if (W.week - (o.at != null ? o.at : o.until - 156) >= 52 && c.last && (c.last.deaths >= Math.max(4, Math.ceil(c.people.length * 0.08)) || c.last.starv >= 2 || c.last.killed >= 2)) { for (const x of pt.clans) if (x !== c) affect(W, x, c, -10, `${o.by} scoffed at a sign, and it came true`); for (const fm of familiesOf(c)) if (P.head.fam && fm !== P.head.fam) affect(W, fm, P.head.fam, -8, `${o.by} scoffed at a sign`); P.head.giftPrestige = Math.max(0, (P.head.giftPrestige || 0) - 0.06); P.renown -= 3; P.omenIgnored = null;
        houseNote(W, `The clan suffered, and people say it is because ${o.by} scoffed at the sign.`); notice(W, 'They say it was the sign', `${c.last.deaths} of the clan died this year${c.last.starv >= 2 ? ', some of hunger' : c.last.killed >= 2 ? ', some by the spear' : ''}. Nobody can show it had anything to do with the sign ${o.by} waved away, and everybody believes it did. The other clans think less of yours (−10), and the house's standing falls.`); }
      else if (W.week >= o.until - 30) { P.renown += 4; P.omenIgnored = null; houseNote(W, `Three quiet years have passed since ${o.by} scoffed at the sign. People say the house is not easily frightened.`); notice(W, 'Nothing came of it', `Three years have passed since the sign and no harm has come. People now say the house of ${P.house} is not easily frightened. Renown +4.`); } }
  }
  // =====================================================================
  //  GREAT BEASTS: one animal that will not die gets a name, and the name becomes a story
  // =====================================================================
  const BEASTS = {
    bear: { a: 'a great bear', n: 'bear', biomes: [3, 4, 5], odds: 0.3, kill: 0.11, meat: 4, life: [14, 26], trophy: 'hide', tv: 'is', slayer: 'Bear-slayer', names: ['Old Scar-face', 'Grandfather Black', 'the Honey Thief', 'One-Ear', 'the Hill That Walks'], lore: 'Mothers hush their children with its name.' },
    boar: { a: 'a great boar', n: 'boar', biomes: [4, 5], odds: 0.38, kill: 0.09, meat: 3, life: [8, 16], trophy: 'tusks', tv: 'are', slayer: 'Boar-slayer', names: ['the Red Tusker', 'Split-lip', 'Old Bristle', 'the Root-breaker'], lore: 'Its tusks are said to be as long as a forearm, and it has broken every spear set against it.' },
    aurochs: { a: 'a great wild bull', n: 'bull', biomes: [5, 6], odds: 0.33, kill: 0.1, meat: 6, life: [10, 18], trophy: 'horns', tv: 'are', slayer: 'Bull-slayer', names: ['the Black Bull', 'Thunder-hoof', 'the Horned Night', 'Old Earth-shaker'], lore: 'When it runs the ground is said to shake as far as the shore.' },
    wolf: { a: 'a great wolf', n: 'wolf', biomes: [2, 3, 7], odds: 0.42, kill: 0.08, meat: 1, life: [7, 13], trophy: 'pelt', tv: 'is', slayer: 'Wolf-slayer', names: ['the Grey Widow-maker', 'Three-toes', 'the Winter Dog', 'Pale-eye'], lore: 'It is said to open door-flaps with its teeth, and to count the sleepers.' },
    stag: { a: 'a white stag', n: 'stag', biomes: [4, 5, 7], odds: 0.1, kill: 0, meat: 3, life: [10, 20], trophy: 'antlers', tv: 'are', slayer: 'Stag-taker', names: ['the White Stag', 'the Sun-bearer', 'Crown-of-Branches', 'the Morning One'], lore: 'Whoever sees it at dawn will have a good year, and whoever looses an arrow at it will have none.' },
    whale: { a: 'a great whale', n: 'whale', sea: true, odds: 0.22, kill: 0.1, meat: 12, life: [30, 60], trophy: 'jawbones', tv: 'are', slayer: 'Whale-slayer', names: ['the Pale One', 'Old Barnacle', 'the Island That Swims', 'Grandmother Deep'], lore: 'It is said to be as long as a village and grey with barnacles, with a thicket of broken harpoons in its back. Canoes that follow it are found in pieces.' },
  };
  const beastR = b => BEASTS[b.kind].sea ? 75000 : 45000;
  const beastNm = b => b.name || BEASTS[b.kind].a;
  const beastNear = (W, b, c) => Math.hypot(b.x - c.x, b.y - c.y) < beastR(b) && (!BEASTS[b.kind].sea || boatStage(c.tribe) >= 1);
  const beastToll = (b, past) => b.kills > 1 ? (past ? `${b.kills} hunters went after it and did not come home.` : `${b.kills} hunters have gone after it and not come home.`) : b.kills === 1 ? (past ? 'It took one hunter.' : 'It has already taken one hunter.') : (past ? "No one ever came within a spear's cast of it." : "No one has come within a spear's cast of it.");
  // what the people say it really is depends on what the people believe
  function beastTale(W, t, b) {
    const B = BEASTS[b.kind], f = faithOf(t);
    const what = B.sea ? { mother: "the Mother's eldest daughter, who went down into the sea and would not come back", spirits: 'a spirit of the deep that swallowed the first canoe and has wanted another ever since', totem: 'the eldest of all the sea-beasts, older than the clans', ancestors: 'a headman of the old days who was given to the sea without his rites', sky: 'a star that fell into the sea and is still looking for the way up' }[f] : (L => L[b.id % L.length])({ mother: ["the Mother's own hound, sent to take back what is owed", 'a child the Mother bore before she bore people, and never named', "the Mother's anger, walking about on four legs"], spirits: ['a spirit that put on a skin and forgot how to take it off', 'a hunger the winter left behind when it went', 'a spirit that was promised a gift once and never given it'], totem: ['the eldest of the clan-beasts, come to see whether its children keep the old ways', 'the first of its kind, which has never died and does not mean to'], ancestors: ['a headman of the old days who was buried without his rites', 'a hunter of the old days who swore not to come home without meat, and has not'], sky: ['a beast the sky hunter wounded and could not kill', "a beast that fell out of the sky hunter's pack and is looking for the way back"] }[f]);
    const open = `They say ${b.name}${b.back && (t.myths || []).some(x => x.beast === b.id && x.back) ? ', who has come back,' : ''} ${b.alive ? 'is' : 'was'} no ${B.n} at all but ${what}.`;
    if (b.slain) { const s = b.slain; return `${open} ${beastToll(b, true)} Then ${s.by} of the ${s.clan} clan killed it${s.led ? ` with ${s.sex === 'F' ? 'her' : 'his'} own hand` : ''}, and its ${B.trophy} ${B.tv} kept by the ${s.clan} to this day.` + (f === 'sky' ? ' They say the sky hunter set it among the stars for its courage, and it circles the pole still.' : f === 'ancestors' ? ' They say the dead man inside it thanked the one who freed him.' : [' Some say what was killed was only its skin.', ' The old ones say another will come when the people forget.', ' They say no one who ate of it was ever lost in the dark again.'][b.id % 3]); }
    if (b.gone) return `${open} ${beastToll(b, true)} ${b.driven ? 'The fields came, and no one has seen it since.' : 'No one has seen it for many winters.'} They say it is not dead but asleep ${B.sea ? 'under the sea' : 'under the hills'}, and will wake when the people forget its name.`;
    return `${open} ${beastToll(b, false)} ${B.lore}`;
  }
  // the tale is told wherever the beast is known, and changes as the beast does
  function beastStory(W, b) {
    if (!b.name) return;
    if (b.back && b.was != null) for (const t of W.tribes) { const om = (t.myths || []).find(x => x.kind === 'beast' && x.beast === b.was); if (om) { om.beast = b.id; om.back = true; } } // the old story is the same beast, told on
    for (const t of W.tribes) { if (!t.alive || !t.clans.length) continue; const m = (t.myths || []).find(x => x.kind === 'beast' && x.beast === b.id);
      if (m) m.text = beastTale(W, t, b);
      else if (b.alive && t.myths && t.clans.some(c => beastNear(W, b, c))) { const bm = t.myths.filter(x => x.kind === 'beast'); if (bm.length >= 2) { const old = bm.find(x => { const o = W.beasts.find(z => z.id === x.beast); return (!o || !o.alive) && W.week / 52 - x.y > 30; }); if (!old) continue; t.myths.splice(t.myths.indexOf(old), 1); }
        const P = W.player, pc = P && !P.over && P.head.alive ? P.head.clan : null; addMyth(W, t, { kind: 'beast', beast: b.id, title: b.name, text: beastTale(W, t, b), silent: !!(pc && pc.tribe === t && !b.asked && beastNear(W, b, pc)) }); } }
  }
  function beastKill(W, b, c) {
    const P = W.player, men = c.people.filter(q => q.alive && !q.slave && q.sex === 'M' && q.age >= 16 && q.age < 50 && !(P && P.head === q)); if (men.length < 3) return null;
    const q = pick(men, W.rand); if (q.dyn && P && !P.over && c.people.filter(x => x.dyn && x.alive).length < 4) return null; // never the last of the blood
    die(W, c, q, `killed by ${beastNm(b)}`); c.people = c.people.filter(x => x.alive); b.kills++; b.last = W.week;
    note(W, c, `${q.name} was killed by ${beastNm(b)}.`); return q;
  }
  function beastNaming(W, b) {
    const B = BEASTS[b.kind], near = W.clans.filter(c => c.alive && beastNear(W, b, c)).sort((x, y) => Math.hypot(b.x - x.x, b.y - x.y) - Math.hypot(b.x - y.x, b.y - y.y)); if (!near.length) return;
    const t = near[0].tribe, living = W.beasts.filter(x => x.alive && x.name).map(x => x.name), fresh = B.names.filter(n => !W.beasts.some(x => x.name === n)), old = B.names.filter(n => !living.includes(n));
    if (fresh.length) b.name = pick(fresh, W.rand); else if (old.length) { b.name = pick(old, W.rand); const ob = W.beasts.filter(x => x !== b && x.name === b.name && !x.alive).pop(); if (ob) { b.back = true; b.was = ob.id; ob.returned = b.id; } } else return;
    b.named = W.week; b.by = t.name;
    logEvent(W, `The ${t.name} have a name for ${B.a} ${B.sea ? 'in their waters' : 'in their hunting grounds'}: ${b.name}.${b.back && (t.myths || []).some(x => x.kind === 'beast' && x.beast === b.was) ? ' The old people say it is the same one, come back.' : ''} ${beastToll(b, false)}`, t, 'info');
    beastStory(W, b);
    const P = W.player; if (P && !P.over && P.head.alive && P.head.clan && beastNear(W, b, P.head.clan)) beastEvent(W, b);
  }
  function beastOdds(W, b, c, led, h) { const B = BEASTS[b.kind]; return clamp(B.odds + (c.ward && c.ward.kind === 'hunt' && c.ward.until > W.week ? 0.15 : 0) + (arms(c) - 1) * 0.3 + (led ? 0.12 : 0) + (led && hasTrait(h, 'bold') ? 0.1 : 0) - Math.min(5, b.kills) * 0.015 + (B.sea ? (boatStage(c.tribe) >= 2 ? 0.1 : -0.1) : 0), 0.05, 0.85); }
  // one hunt: the beast dies, or it does not, and someone may not come home
  function beastHunt(W, b, c, led, h, p0) {
    const B = BEASTS[b.kind], rand = W.rand, p = p0 != null ? p0 : beastOdds(W, b, c, led, h); b.hunts++; b.last = W.week;
    if (rand() < p) {
      const men = c.people.filter(q => q.alive && !q.slave && q.sex === 'M' && q.age >= 16 && q.age < 50), who = led ? h : (c.head && c.head.sex === 'M' && c.head.age < 55 ? c.head : pick(men, rand) || c.head || h);
      b.alive = false; b.slain = { by: who.name, sex: who.sex, clan: c.name, tribe: c.tribe.name, y: Math.floor(W.week / 52), led: !!led };
      c.store += needsWeek(c) * B.meat; if (b.kind === 'bear' || b.kind === 'wolf') c.goods.furs = (c.goods.furs || 0) + 2;
      credit(who, 'beast', { name: b.name || B.a, kind: b.kind, kills: b.kills }); if (b.name) addTreasure(W, c, `the ${B.trophy} of ${b.name}`, `taken by ${who.name} from the great ${B.n}`);
      who.giftPrestige = (who.giftPrestige || 0) + (led ? 0.1 : 0.04);
      for (const o of c.tribe.clans) if (o !== c) affect(W, o, c, led ? 8 : 4, `Killed ${beastNm(b)}`);
      note(W, c, `${who.name} killed ${beastNm(b)}.`);
      logEvent(W, `${who.name} of the ${c.name} clan (${c.tribe.name}) kills ${beastNm(b)}${b.name ? ', the great ' + B.n : ''}${b.kills ? ` that had taken ${b.kills} ${b.kills === 1 ? 'life' : 'lives'}` : ''}.`, c, 'big');
      beastStory(W, b); return { win: true, who, p };
    }
    let dead = null, headDied = false;
    if (B.kill > 0) { if (led && rand() < 0.1) { die(W, c, h, `killed by ${beastNm(b)}`); c.people = c.people.filter(x => x.alive); b.kills++; headDied = true; dead = h; } else if (rand() < 0.35) dead = beastKill(W, b, c); }
    beastStory(W, b); return { win: false, dead, headDied, p };
  }
  function beastHuntPlayer(W, b, led, p0) {
    const P = W.player, h = P.head, c = h.clan, B = BEASTS[b.kind], nm = beastNm(b), kills = b.kills, R = beastHunt(W, b, c, led, h, p0), pc = Math.round(R.p * 100);
    if (R.win) { const gain = led ? 10 + Math.min(6, kills * 2) : 4; P.renown += gain;
      houseNote(W, led ? `${h.name} killed ${nm} with ${h.sex === 'F' ? 'her' : 'his'} own hand.` : `Hunters of our clan killed ${nm}.`);
      return { title: `${nm[0].toUpperCase() + nm.slice(1)} is dead`, text: `${led ? `${h.name} comes home carrying the ${B.trophy}` : `${R.who.name} and the hunters come home carrying the ${B.trophy}`}. There is meat for ${B.meat} weeks, and the other clans of the tribe think better of yours (+${led ? 8 : 4}). Renown +${gain}.${led ? ` ${h.name} will be remembered for this: when the stories are told, ${h.sex === 'F' ? 'she' : 'he'} will be the ${B.slayer}.` : ''}<br><br>The chance was about ${pc}%.` }; }
    P.renown -= 1;
    if (R.headDied) return { title: `${h.name} does not come home`, text: `The hunters carry ${h.name} back on a litter of spears. ${nm[0].toUpperCase() + nm.slice(1)} is still out there, and its story has grown.` };
    houseNote(W, `We hunted ${nm} and it escaped${R.dead ? `, killing ${R.dead.name}` : ''}.`);
    return { title: 'It escapes', text: `${B.kill ? `The hunters find it, and wish they had not.` : `The hunters see it once, far off, and never again.`} ${R.dead ? `${R.dead.name} does not come home. ` : 'No one is hurt. '}${nm[0].toUpperCase() + nm.slice(1)} is still out there, and the story has grown. Renown −1.<br><br>The chance was about ${pc}%. Better weapons (flint, copper, bronze), a bold leader at the head of the hunt${B.sea ? ', and seagoing canoes' : ''} all raise it.` };
  }
  const beastWhere = (b, c) => { const km = Math.round(Math.hypot(b.x - c.x, b.y - c.y) / 1000), d = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(Math.atan2(b.y - c.y, b.x - c.x) / (Math.PI / 4)) % 8) + 8) % 8]; return BEASTS[b.kind].sea ? `in the waters ${km} km ${d} of your ${c.settled ? 'village' : 'camp'}` : `${km} km ${d} of your ${c.settled ? 'village' : 'camp'}`; };
  function beastEvent(W, b) {
    const P = W.player, h = P.head, c = h.clan, B = BEASTS[b.kind]; if (b.asked || W.pending.some(e => e.type === 'beast')) return; b.asked = true;
    const can = h.age >= 16 && h.age < 62, q0 = beastOdds(W, b, c, false, h), q1 = beastOdds(W, b, c, true, h), p0 = Math.round(q0 * 100), p1 = Math.round(q1 * 100);
    pushEvent(W, { type: 'beast', key: b.id, title: b.name, text: `There is ${B.a} ${beastWhere(b, c)}, and the people have given it a name: ${b.name}.${b.back && (c.tribe.myths || []).some(x => x.beast === b.id && x.back) ? ' The old ones say it is the same beast their grandfathers feared, come back.' : ''} ${beastToll(b, false)} ${B.lore}<br><br>The hunters of the ${c.name} look to ${h.name}.`, data: { b, p: [q0, q1] },
      options: [{ label: 'Send the best hunters', hint: `About ${p0}% to kill it. ${B.kill ? 'If they fail, one of them may not come home' : 'No one is in danger from it'}` },
        { label: 'Lead the hunt yourself', off: !can, hint: can ? `About ${p1}%. If ${h.name} kills it: great renown, and a place in the stories. ${B.kill ? `If the hunt fails, there is about one chance in ten that ${h.name} does not come home` : 'No one is in danger from it'}` : `${h.name} is too ${h.age < 16 ? 'young' : 'old'} to lead a hunt` },
        { label: b.kind === 'stag' ? 'Let it be: it is a sign' : 'Forbid its ground', hint: b.kind === 'stag' ? 'No one of the clan may hunt it. The other clans approve (+3), and the story grows' : 'For five years no one of the clan goes where it hunts, and no one dies to it. Hunting is a little poorer (a week of food), and the story grows' }] });
  }
  function beastYear(W) {
    const rand = W.rand, P = W.player, pc = P && !P.over && P.head.alive ? P.head.clan : null; W.beasts = W.beasts || []; W.beastN = W.beastN || 1;
    for (const b of W.beasts) { if (!b.alive) continue; const B = BEASTS[b.kind];
      if (W.week > b.dieAt) { b.alive = false; b.gone = true; beastStory(W, b); continue; }
      const near = W.clans.filter(c => c.alive && beastNear(W, b, c));
      for (const c of near) {
        if (c.shun && c.shun.id === b.id && W.week < c.shun.until) continue;
        if (B.kill && c.people.length >= 10 && rand() < B.kill * (c.settled && c.live === 'farm' ? 0.4 : 1)) { const q = beastKill(W, b, c); if (q && c === pc && b.name && !q.dyn) houseNote(W, `${q.name} of our clan was killed by ${b.name}.`); }
        else if (rand() < 0.14) b.seen++;
        if (b.alive && c !== pc && b.name && b.kind !== 'stag' && W.week - b.named > 104 && faithOf(c.tribe) !== 'totem' && rand() < 0.035) { const R = beastHunt(W, b, c, false, c.head); if (R.win && pc && beastNear(W, b, pc) && b.name) notice(W, `${b.name} is dead`, `${R.who.name} of the ${c.name} clan (${c.tribe.name}) has killed ${b.name}. The ${c.name} will be telling of it for a hundred years.`); }
        if (!b.alive) break;
      }
      if (!b.alive) continue;
      if (!b.name && b.kills * 2 + b.hunts + b.seen >= 3) beastNaming(W, b); else if (b.name) { beastStory(W, b); if (pc && !b.asked && beastNear(W, b, pc)) beastEvent(W, b); }
    }
    if (W.beasts.length > 40) W.beasts = W.beasts.filter(b => b.alive || W.tribes.some(t => (t.myths || []).some(m => m.beast === b.id)));
    // a new beast makes itself known by what it does
    const live = W.beasts.filter(b => b.alive); if (live.length >= beastCap(W) || rand() > beastChance(W)) return;
    const cs = W.clans.filter(c => c.alive && c.people.length >= 10); if (!cs.length) return; const c = pc && pc.people.length >= 10 && rand() < 0.3 ? pc : pick(cs, rand), t = c.tribe;
    if (live.some(b => Math.hypot(b.x - c.x, b.y - c.y) < 140000)) return;
    const bi = W.biome[cellAt(c.x, c.y)], wd = boatStage(t) >= 1 ? W.deposits.find(d => d.type === 'whale' && Math.hypot(d.x - c.x, d.y - c.y) < 70000) : null;
    const kinds = Object.keys(BEASTS).filter(k => BEASTS[k].sea ? !!wd : BEASTS[k].biomes.includes(bi)); if (!kinds.length) return;
    const kind = pick(kinds, rand), B = BEASTS[kind]; let x, y;
    if (B.sea) { x = wd.x; y = wd.y; } else { for (let i = 0; i < 10 && x == null; i++) { const a = rand() * Math.PI * 2, r = 8000 + rand() * 22000, px = c.x + Math.cos(a) * r, py = c.y + Math.sin(a) * r; if (px < 0 || py < 0 || px >= WORLD || py >= WORLD) continue; const j = cellAt(px, py); if (W.land[j] && !W.lake[j] && wildFar(W, px, py)) { x = px; y = py; } } if (x == null) return; }
    const b = { id: W.beastN++, kind, name: null, x, y, born: W.week, dieAt: W.week + 52 * Math.round(B.life[0] + rand() * (B.life[1] - B.life[0])), kills: 0, hunts: 0, seen: 0, alive: true };
    W.beasts.push(b);
    if (B.kill && rand() < 0.6) { if (!beastKill(W, b, c)) b.seen++; } else b.seen++;
    if (c === pc) houseNote(W, b.kills ? `A hunter of our clan was killed by ${B.a}.` : `Our hunters saw ${B.a} ${beastWhere(b, c)}.`);
  }
  // =====================================================================
  //  THE RING: the people around the head of the house, each with a voice of their own
  // =====================================================================
  const VOICES = {
    hearth: { title: 'Speaks for the hearth', say: ['We have children to feed.', 'Think of the house first.'] },
    lore: { title: 'Keeps the old ways', say: ['The old ones had an answer for this.', 'There is a right way to do it.'] },
    spear: { title: 'Speaks for the spears', say: ['Enough talk.', 'They will think us weak otherwise.'] },
    young: { title: 'Your heir', say: ['Let them see what our house is.', 'We will not get this chance twice.'] },
    ally: { title: 'A friend of the house', say: ['The other clans are watching.', 'Think how it will be told at the gathering.'] },
  };
  // which answer each voice leans to, by the kind of decision
  const LEAN = {
    challenge: { spear: 0, young: 0, hearth: 1, lore: 1, ally: 1 }, quarrel: { hearth: 0, lore: 0, ally: 0, young: 1, spear: 2 }, vengeance: { hearth: 0, lore: 0, ally: 0, young: 1, spear: 2 },
    toobig: { lore: 0, ally: 0, hearth: 1, young: 1, spear: 1 }, badblood: { hearth: 0, lore: 0, ally: 0, spear: 1, young: 1 }, raided: { spear: 0, young: 0, lore: 0, hearth: 1, ally: 1 },
    gathering: { ally: 'Give lavish', young: 'Give lavish', lore: 'Feast', hearth: 'Trade', spear: 'Keep to' }, crown: { young: 0, spear: 0, hearth: 1, lore: 1, ally: 1 }, war: { spear: 0, young: 0, hearth: 1, lore: 1, ally: 1 },
    famine: { spear: 'Raid', young: 'Move', hearth: 'Beg', lore: 'Move', ally: 'Beg' }, blood: { spear: 0, young: 0, lore: 1, ally: 1, hearth: 2 }, grain: { hearth: 0, young: 0, ally: 0, lore: 1, spear: 1 },
    quarry: { ally: 0, hearth: 0, lore: 0, spear: 1, young: 1 }, rivalry: { spear: 0, young: 0, ally: 1, lore: 1, hearth: 2 }, friendneed: { ally: 0, lore: 0, young: 0, hearth: 1, spear: 1 },
    slight: { ally: 0, young: 0, spear: 1, hearth: 2, lore: 2 }, omen: { lore: 0, ally: 0, hearth: 1, spear: 2, young: 2 }, beast: { ally: 0, spear: 1, young: 1, hearth: 2, lore: 2 },
    opportunity: { spear: 0, young: 0, ally: 1, lore: 1, hearth: 2 }, foundling: { hearth: 0, lore: 0, ally: 1, young: 1, spear: 2 }, foundback: { lore: 0, hearth: 2, ally: 1, spear: 2, young: 0 }, exiles: { spear: 0, young: 0, lore: 1, hearth: 1, ally: 2 }, exilesback: { spear: 0, lore: 0, young: 0, hearth: 1, ally: 1 }, oath: { spear: 0, young: 0, lore: 0, ally: 0, hearth: 1 }, oathback: { spear: 0, lore: 0, young: 0, ally: 0, hearth: 1 }, scouts: { young: 0, spear: 0, hearth: 1, lore: 1, ally: 1 },
  };
  function ring(W) {
    const P = W.player; if (!P || P.over || !P.head || !P.head.alive || !P.head.clan) return [];
    const h = P.head, c = h.clan, out = [], used = new Set([h]), add = (q, role) => { if (q && q.alive && !used.has(q)) { used.add(q); out.push({ q, role, title: VOICES[role].title }); } };
    const sp = h.sex === 'M' ? (h.spouse && h.spouse.alive ? h.spouse : c.people.find(w => w.spouse === h)) : h.spouse;
    add(sp && sp.age >= 14 ? sp : c.people.filter(q => q.fam === h.fam && q.sex === 'F' && q.age >= 16 && q !== h).sort((a, b) => b.age - a.age)[0], 'hearth');
    add(c.people.filter(q => q.age >= 45 && !q.slave).sort((a, b) => b.age - a.age)[0], 'lore');
    add(c.people.filter(q => q.sex === 'M' && q.age >= 16 && q.age < 46 && !q.slave).sort((a, b) => (b.skill || 0) - (a.skill || 0))[0], 'spear');
    const heir = clanHeir(W, c, h); add(heir && heir.age >= 10 ? heir : null, 'young');
    const fr = P.cast && P.cast.friend; add(fr && fr.alive ? fr : null, 'ally');
    return out;
  }
  // what each of them says about the decision in front of you
  function ringSay(W, ev) {
    const L = LEAN[ev.type], R = ring(W); if (!L) return R.map(r => ({ ...r, k: -1, text: '' }));
    return R.map((r, i) => { let k = L[r.role]; if (typeof k === 'string') k = ev.options.findIndex(o => o.label.startsWith(k)); const o = ev.options[k]; if (!o || o.off) return { ...r, k: -1, text: '' };
      const v = VOICES[r.role].say[(r.q.id + (ev.key | 0) + i) % 2], lab = o.label.replace(/\.$/, '');
      return { ...r, k, text: `${v} ${lab}.` }; });
  }
  // =====================================================================
  //  CLAIMS: the land a people calls its own. It grows with their numbers, and it outlasts them.
  // =====================================================================
  let _rivK = null, _rivSeed = null;
  function claimsYear(W, init) {
    const n = N * N;
    if (!W.claim || W.claim.length !== n) { W.claim = new Int32Array(n).fill(-1); W.claimS = new Uint8Array(n); init = true; }
    if (!_rivK || _rivSeed !== W.seed) { _rivK = new Float32Array(n); _rivSeed = W.seed; let mx = 0; for (let i = 0; i < n; i++) if (W.land[i] && W.acc[i] > mx) mx = W.acc[i]; const ref = Math.sqrt(mx) * 0.5 || 1; for (let i = 0; i < n; i++) if (W.land[i]) _rivK[i] = Math.min(1, Math.sqrt(W.acc[i]) / ref); }
    const riverK = _rivK, src = [], byId = new Map();
    // how far a people reaches depends on how many they are: a camp of forty holds a valley, three hundred hold a country
    for (const t of W.tribes) { if (!t.alive || !t.clans.length) continue; byId.set(t.id, t); const size = tribeSize(t); t.homeR = HOME_R * clamp(Math.sqrt(size / 80), 1, 2.1);
      const hm = t.home && t.home[0] === t.home[0] ? t.home : tribeCenter(t);
      if (hm && hm[0] === hm[0]) src.push([t.id, hm[0], hm[1], HOME_R * 1.04 * clamp(Math.sqrt(size / 45), 0.6, 2.4)]);
      for (const c of t.clans) if (c.settled) src.push([t.id, c.x, c.y, FORAGE_R * 2.2 * clamp(Math.sqrt(c.people.length / 30), 0.7, 2)]); }
    // what each people can actually hold this year: spread outward over the country, slowed by steep and high ground, stopped by rivers and the sea
    const held = new Int32Array(n).fill(-1), best = new Float32Array(n).fill(Infinity), hc = [], hi = [], ht = [], hs = [];
    const push = (c, i, t, sc) => { let k = hc.length; hc.push(c); hi.push(i); ht.push(t); hs.push(sc); while (k > 0) { const p = (k - 1) >> 1; if (hc[p] <= c) break; hc[k] = hc[p]; hi[k] = hi[p]; ht[k] = ht[p]; hs[k] = hs[p]; k = p; } hc[k] = c; hi[k] = i; ht[k] = t; hs[k] = sc; };
    const pop = () => { const r = [hc[0], hi[0], ht[0], hs[0]], c = hc.pop(), i = hi.pop(), t = ht.pop(), sc = hs.pop(), m = hc.length; if (m) { let k = 0; for (;;) { let ch = 2 * k + 1; if (ch >= m) break; if (ch + 1 < m && hc[ch + 1] < hc[ch]) ch++; if (hc[ch] >= c) break; hc[k] = hc[ch]; hi[k] = hi[ch]; ht[k] = ht[ch]; hs[k] = hs[ch]; k = ch; } hc[k] = c; hi[k] = i; ht[k] = t; hs[k] = sc; } return r; };
    const dry = i => W.land[i] && !W.lake[i];
    for (const [id, x, y, bud] of src) { let gx = clamp(Math.floor(x / CELL), 0, N - 1), gy = clamp(Math.floor(y / CELL), 0, N - 1), i = gy * N + gx;
      if (!dry(i)) { let f = -1, fd = 99; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = gx + dx, yy = gy + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx, d = Math.hypot(dx, dy); if (dry(j) && d < fd) { fd = d; f = j; } } if (f < 0) continue; i = f; }
      push(0, i, id, CELL / bud); }
    while (hc.length) { const [c0, i, id, sc] = pop(); if (c0 >= best[i]) continue; best[i] = c0; held[i] = id;
      const x = i % N, y = (i / N) | 0, e0 = W.elev[i], r0 = riverK[i];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx; if (!dry(j)) continue;
        let step = (dx && dy ? 1.414 : 1) * (1 + Math.min(3, Math.abs(W.elev[j] - e0) / 150) + Math.min(3, Math.max(0, W.elev[j] - 450) / 250));
        if (riverK[j] > 0.35 && r0 <= 0.35) step += 1 + 3 * riverK[j];
        const c1 = c0 + step * sc; if (c1 < 1 && c1 < best[j]) push(c1, j, id, sc); } }
    // claims: land held is claimed and the claim hardens; a claim nobody walks any more fades over a generation; a claim another people now holds is worn away and then taken
    const flips = [], press = new Map(), cl = W.claim, cs = W.claimS, hf = W._held && W._held.length === n ? W._held : (W._held = new Uint8Array(n));
    for (const t of W.tribes) { t.landC = 0; t.landH = 0; }
    for (let i = 0; i < n; i++) { if (!W.land[i]) continue; const h = held[i], o = cl[i]; let s = cs[i]; hf[i] = 0;
      if (h >= 0) { const H = byId.get(h);
        if (o === h || o < 0) { cl[i] = h; s = init ? 255 : Math.min(255, s + 50); hf[i] = 1; }
        else { const O = byId.get(o), young = W.week - H.founded < 156 && H.parent === o; s -= !O ? 90 : young ? 255 : 36; if (O && !young) { const k = o + ':' + h; press.set(k, (press.get(k) || 0) + 1); }
          if (s <= 0) { if (O && O.seized && O.seized.length) flips.push(i, o, h); cl[i] = h; s = 70; hf[i] = 1; if (O && !young) { const k = 'w' + o + ':' + h; press.set(k, (press.get(k) || 0) + 1); } } } }
      else if (o >= 0) { s -= byId.has(o) ? 10 : 40; if (s <= 0) { cl[i] = -1; s = 0; } }
      cs[i] = s; const T = cl[i] >= 0 ? byId.get(cl[i]) : null; if (T) { T.landC++; if (hf[i]) T.landH++; } }
    W.claimVer = (W.claimVer || 0) + 1;
    for (let k = 0; k < flips.length; k += 3) { const i = flips[k], O = byId.get(flips[k + 1]); if (!O) continue; // a cell a village's people took from O joins the record, if it lies within 40 km of the village
      for (const r of O.seized) if (r.t === flips[k + 2] && r.cells.length < 200 && Math.hypot((i % N + 0.5) * CELL - r.x, ((i / N | 0) + 0.5) * CELL - r.y) <= LAND_R) r.cells.push(i); }
    if (init) return;
    // pressing on another people's land sours things between them; taking a good piece of it is remembered
    const P = W.player, pt = P && !P.over && P.head.alive && P.head.clan ? P.head.clan.tribe : null;
    for (const [k, cnt] of press) { const won = k[0] === 'w', [o, h] = (won ? k.slice(1) : k).split(':').map(Number), O = byId.get(o), H = byId.get(h); if (!O || !H) continue;
      if (!won) { if (cnt >= 8) affect(W, O, H, -Math.min(2.5, 0.5 + cnt / 12), 'They press on our lands'); continue; }
      if (cnt < 8) continue; const pk = 'lnd' + h; if (O[pk] && W.week - O[pk] < 520) continue; O[pk] = W.week;
      logEvent(W, `The ${H.name} now hold land the ${O.name} long called their own.`, H, 'conflict');
      if (pt === O) notice(W, 'Our land is taken', `The ${H.name} have grown into country the ${O.name} claimed, and our people no longer go there. About ${cnt * 25} km² is theirs now.`);
      else if (pt === H) notice(W, 'New land', `The ${H.name} have grown into country the ${O.name} once claimed. About ${cnt * 25} km² is ours now, and the ${O.name} have not forgotten it.`); }
  }
  // =====================================================================
  //  LAND TAKEN BY A VILLAGE: a village raised on ground another people holds is remembered (O.seized); the owner may bid the village leave,
  //  or drive it out; the world's peoples do the same by the same rules (landYear), and the player answers for his own people (cards, deeds)
  // =====================================================================
  const LAND_YEARS = 25, LAND_R = 40000;
  const playerClan = W => { const P = W.player; return P && !P.over && P.head.alive && P.head.clan || null; };
  // the living people that holds cell i firmly (claim 100 or more) and is not t, else null
  function foreignHeld(W, t, i) {
    const o = W.claim ? W.claim[i] : -1; if (o < 0 || o === t.id || W.claimS[i] < 100) return null;
    const O = W.ents.get(o); return O && O.alive && O.kind === 'tribe' && O.clans.length ? O : null;
  }
  // a much stronger people at odds with the owner may take ground anyway
  const landGrab = (W, t, O) => warriors(t) >= 1.5 * warriors(O) && opinion(t, O) < -10;
  // true if people t may not site a village on cell i (memo: a Map to spare the counting of men)
  function landBlocked(W, t, i, memo) {
    const O = foreignHeld(W, t, i); if (!O) return false;
    let g = memo ? memo.get(O.id) : undefined; if (g === undefined) { g = landGrab(W, t, O); if (memo) memo.set(O.id, g); }
    return !g;
  }
  const villageScore = (W, c, x, y) => { let crowd = 0; for (const o of nearClans(W, x, y, 9000)) if (o !== c && o.settled) crowd++; return farmSuit(W, x, y) / (1 + crowd); };
  // how a village that must go is said to go: walking to ground, or wandering when there is none free
  const landGoes = (d, beyond) => d.wander ? `pull down their houses and take to the road as wanderers${d.km >= 2 ? `, ${d.km} km ${d.dir}` : ''}` : `take down their houses and walk ${d.km} km ${d.dir}${beyond}`;
  const landV = c => c.village || `the ${c.name} clan's village`;
  // goodwill the land deeds change: [what is added to the opinion, the grudge added]; the opinion falls by both, so the texts quote the total
  const LAND_AFF = { askNo: [-10, 5], askYes: [-8, 0], won: [-30, 20], lost: [-15, 5], refuse: [-15, 5], leave: [10, 0] };
  const landAff = (W, a, b, k, text) => affect(W, a, b, LAND_AFF[k][0], text, LAND_AFF[k][1]);
  const landGw = k => { const n = LAND_AFF[k][0] - LAND_AFF[k][1]; return `${n < 0 ? '−' : '+'}${Math.abs(n)}`; };
  // a clan sent off a people's land keeps off every cell that people claims for 10 years
  function landKeepOff(W, c, i) { const f = c.landFrom || null; return f != null && c.landOut != null && W.week - c.landOut < 520 && !!W.claim && W.claim[i] === f; }
  // the village's fighting men, and the muster the chance is rolled with (the village and half the men of its kin near)
  const landMen = (W, x) => { const a = warriorsOf(x), m = warMuster(W, x.tribe, x, playerClan(W)); return `${a} fighting ${a === 1 ? 'man' : 'men'}${m > a ? ` (about ${m} with their kin near)` : ''}`; };
  // any cell claimed by a people other than t within m metres of (x,y)
  function landNearOther(W, t, x, y, m) {
    const gx = clamp(Math.floor(x / CELL), 0, N - 1), gy = clamp(Math.floor(y / CELL), 0, N - 1), k = Math.ceil(m / CELL);
    for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) { const xx = gx + dx, yy = gy + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const o = W.claim[yy * N + xx]; if (o >= 0 && o !== t.id) return true; }
    return false;
  }
  function claimNear(W, O, x, y, m) {
    const gx = clamp(Math.floor(x / CELL), 0, N - 1), gy = clamp(Math.floor(y / CELL), 0, N - 1), k = Math.ceil(m / CELL), lim = (m / CELL + 0.3) * (m / CELL + 0.3);
    for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) { const xx = gx + dx, yy = gy + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N || dx * dx + dy * dy > lim) continue; if (W.claim[yy * N + xx] === O.id) return true; }
    return false;
  }
  // the records against O that still stand: the village is there, and under 25 years old (the rest are dropped)
  function landLive(W, O) {
    const L = O.seized; if (!L || !L.length) return [];
    const out = [];
    for (let k = L.length - 1; k >= 0; k--) { const r = L[k], c = W.ents.get(r.c);
      if (W.week - r.w > 52 * LAND_YEARS || !c || c.kind !== 'clan' || !c.alive || !c.settled || !c.people.length || !c.tribe || c.tribe === O || Math.hypot(c.x - r.x, c.y - r.y) > 3000) { L.splice(k, 1); continue; }
      if (isAllied(O, c.tribe)) continue; // allies and peoples of one realm do not bid each other go: the record waits, and counts again if the bond ends
      r.t = c.tribe.id; out.unshift(r); }
    return out;
  }
  // land lines the chronicle keeps: all that touch the player's people, and of the rest at most two in a year, so they do not drown the other news
  function landLog(W, text, e, kind, a, b) {
    const pc = playerClan(W), pt = pc && pc.tribe; if (!(pt && (pt === a || pt === b))) { const y = Math.floor(W.week / 52); if (W.landLogY !== y) { W.landLogY = y; W.landLogN = 0; } if (++W.landLogN > 2) return; }
    logEvent(W, text, e, kind);
  }
  const landEnd = (O, r) => { O.seized = (O.seized || []).filter(x => x !== r); };
  const landLostNow = (W, r) => { let n = 0; for (const i of r.cells || []) if (W.claim[i] === r.t) n++; return n; };
  function landWhere(W, t, x, y) {
    let nv = null, nd = Infinity; for (const o of t.clans) if (o.settled) { const d = Math.hypot(o.x - x, o.y - y); if (d < nd) { nd = d; nv = o; } }
    if (!nv) nv = playerClan(W) && playerClan(W).tribe === t ? playerClan(W) : t.clans[0]; if (!nv) return { km: 0, dir: 'east', from: 'our lands' };
    return { km: Math.round(Math.hypot(x - nv.x, y - nv.y) / 1000), dir: compass(x - nv.x, y - nv.y), from: nv.settled && nv.village ? nv.village : `the ${nv.name} camp` };
  }
  // the village is seen to stand on another people's claim at the moment it is raised or moved (claims change only in claimsYear): a record, and a card for the player
  function landScan(W) {
    if (!W.landInit) { W.landInit = 1; for (const c of W.clans) if (c.alive && c.settled) { c.vx = c.x; c.vy = c.y; } return; }
    for (const c of W.clans) {
      if (!c.alive || !c.settled || !c.tribe || !c.people.length) continue;
      if (Math.hypot(c.tx - c.x, c.ty - c.y) >= 1500) continue; // still on the road
      if (c.vx != null && Math.hypot(c.vx - c.x, c.vy - c.y) < 3000) continue;
      c.vx = c.x; c.vy = c.y; landSeized(W, c);
    }
  }
  function landSeized(W, c) {
    for (const T of W.tribes) if (T.seized && T.seized.length) T.seized = T.seized.filter(r => r.c !== c.id);
    const t = c.tribe, o = W.claim ? W.claim[cellAt(c.x, c.y)] : -1; if (o < 0 || o === t.id) return;
    const O = W.ents.get(o); if (!O || !O.alive || O.kind !== 'tribe' || !O.clans.length || isAllied(O, t)) return;
    const r = { c: c.id, t: t.id, w: W.week, x: c.x, y: c.y, cells: [] };
    (O.seized = O.seized || []).push(r); if (O.seized.length > 12) O.seized.shift();
    W.nLandSeize = (W.nLandSeize || 0) + 1;
    landLog(W, `The ${t.name} raise ${landV(c)} on land the ${O.name} call their own.`, t, 'conflict', t, O);
    const pc = playerClan(W); if (pc && pc.tribe === O && t !== O) { W.nLandSeizeP = (W.nLandSeizeP || 0) + 1; landTakenCard(W, O, r, c); }
  }
  // ---- the odds, one helper each: the card, the deed and the roll all call these ----
  const landOdds = r => r <= 0 ? 0 : clamp(1 - (1 / r - 0.6) / 0.8, 0, 1); // the fight is won when ratio * (0.6 + 0.8 u) > 1
  function driveRatio(W, att, F, def) { return (F.n * vigor(att)) / Math.max(1, warMuster(W, def.tribe, def, playerClan(W)) * vigor(def) * walls(def) * 1.35); }
  const driveOutOdds = (W, ourClan, theirClan, F) => landOdds(driveRatio(W, ourClan, F, theirClan));
  function leaveOdds(W, ourTribe, theirClan, F, h) {
    const wr = F.n / Math.max(1, warMuster(W, theirClan.tribe, theirClan, playerClan(W))), op = opinion(theirClan.tribe, ourTribe);
    return clamp(0.10 + (wr - 1) * 0.40 + op / 200 + (hasTrait(h, 'silver') ? 0.10 : 0), 0.03, 0.85);
  }
  // ---- the outcomes ----
  // the clan leaves its village and walks to the best village site at least 10 km outside the land of O (within 60 km); if there is none, 30 to 60 km away from O's nearest village
  function landExpel(W, c, O) {
    const t = c.tribe, fish = c.live === 'fishing', memo = new Map(); let best = null, bs = -Infinity, wander = false, away = null;
    if (!c.alive || !c.people.length) return null;
    for (let k = 0; k < 40; k++) {
      const a = W.rand() * 6.283, r = 8000 + W.rand() * 52000, x = clamp(c.x + Math.cos(a) * r, 3000, WORLD - 3000), y = clamp(c.y + Math.sin(a) * r, 3000, WORLD - 3000), i = cellAt(x, y);
      if (!W.land[i] || W.lake[i] || !sameIsland(W, c, x, y) || (fish && W.seaDist[i] > 2) || claimNear(W, O, x, y, 10000) || landBlocked(W, t, i, memo) || landNearOther(W, t, x, y, 10000)) continue; // not on, nor within 10 km of, anyone's claim: no sooner there than moved on again
      if (nearClans(W, x, y, 6000).some(o => o !== c && o.settled)) continue;
      const sc = villageScore(W, c, x, y); if (sc > bs) { bs = sc; best = [x, y]; }
    }
    if (!best) {
      let nv = null, nd = Infinity; for (const o of O.clans) if (o.settled) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (d < nd) { nd = d; nv = o; } }
      const base = nv ? Math.atan2(c.y - nv.y, c.x - nv.x) : W.rand() * 6.283; away = compass(Math.cos(base), Math.sin(base));
      for (let pass = 0; pass < 2 && !best; pass++) for (let j = 0; j < 12 && !best; j++) { const a = base + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 0.5, r = 30000 + W.rand() * 30000, x = clamp(c.x + Math.cos(a) * r, 3000, WORLD - 3000), y = clamp(c.y + Math.sin(a) * r, 3000, WORLD - 3000), i = cellAt(x, y);
        if (W.land[i] && !W.lake[i] && sameIsland(W, c, x, y) && !landBlocked(W, t, i, memo) && W.claim[i] !== O.id) best = [x, y]; } // both passes keep off ground another people holds, and off every cell of the owner at any strength
      if (!best) { wander = true; // third pass: any land of the island, whoever holds it; the clan goes as wanderers
        for (let pass = 0; pass < 2 && !best; pass++) for (let j = 0; j < 12 && !best; j++) { const a = base + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 0.5, r = 30000 + W.rand() * 30000, x = clamp(c.x + Math.cos(a) * r, 3000, WORLD - 3000), y = clamp(c.y + Math.sin(a) * r, 3000, WORLD - 3000), i = cellAt(x, y);
          if (W.land[i] && !W.lake[i] && sameIsland(W, c, x, y)) best = [x, y]; }
        if (!best) best = [c.x, c.y]; } // a tiny island: they pull down their houses and wander from where they stand
    }
    const km = Math.round(Math.hypot(best[0] - c.x, best[1] - c.y) / 1000), dir = km < 1 && away ? away : compass(best[0] - c.x, best[1] - c.y);
    c.settled = false; c.founding = false; c.tx = best[0]; c.ty = best[1]; c.vx = null; c.vy = null; c.landOut = W.week; c.landFrom = O.id; c.works = null; c.worksAt = null; // the wall and works are left behind
    c.toSettle = !wander && !fish && (t.stage === 3 || playerClan(W) === c); if (fish) { c.live = null; c.fishYears = 0; } // a fishing village goes back to wandering
    W.nLandExpel = (W.nLandExpel || 0) + 1;
    if (wander) W.nLandExpelWander = (W.nLandExpelWander || 0) + 1;
    return wander ? { x: best[0], y: best[1], km, dir, wander: true } : { x: best[0], y: best[1], km, dir };
  }
  // the cells the village took come back to O at once
  function landGiveBack(W, O, r) {
    let n = 0, nh = 0; for (const i of r.cells || []) if (W.claim[i] === r.t) { W.claim[i] = O.id; W.claimS[i] = 120; n++; if (W._held && W._held[i]) { nh++; W._held[i] = 0; } }
    if (n) { W.claimVer = (W.claimVer || 0) + 1; W.nLandCells = (W.nLandCells || 0) + n; O.landC = (O.landC || 0) + n; const T = W.ents.get(r.t); if (T && T.kind === 'tribe') { T.landC = Math.max(0, (T.landC || 0) - n); T.landH = Math.min(Math.max(0, (T.landH || 0) - nh), T.landC); } } // the tribe's land figures are counted at year end: keep them true meanwhile
    return n;
  }
  // the men who fall: in a won fight 10-20% of the village's men of fighting age and 3-7% of the owner's; in a lost one 8-15% of the owner's and 3-6% of theirs
  function landLosses(W, att, n, def, won) {
    const rand = W.rand, P = W.player, PH = P && !P.over && P.head, pick = (lo, hi) => lo + (hi - lo) * rand();
    const pd = won ? pick(0.10, 0.20) : pick(0.03, 0.06), pa = won ? pick(0.03, 0.07) : pick(0.08, 0.15);
    const dm = def.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50 && q !== PH && !kinOfHouse(W, q, att));
    const kd = Math.min(dm.length, Math.max(won ? 1 : 0, Math.round(warriorsOf(def) * pd))); let ka = Math.max(won || n < 1 ? 0 : 1, Math.round(n * pa)), killedA = 0, killedD = 0; // a fight leaves someone dead on the losing side at least
    for (let k = 0; k < kd; k++) { const v = dm.splice(Math.floor(rand() * dm.length), 1)[0]; die(W, def, v, `killed defending ${landV(def)} against the ${att.tribe.name}`, att); def.yr.killed++; killedD++; }
    const pool = [att, ...att.tribe.clans.filter(o => o !== att && o.alive && Math.hypot(o.x - att.x, o.y - att.y) < 60000)];
    for (const cl of pool) { if (killedA >= ka) break; const am = cl.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50 && q !== PH);
      while (killedA < ka && am.length) { const v = am.splice(Math.floor(rand() * am.length), 1)[0]; die(W, cl, v, `killed driving the ${def.tribe.name} from ${landV(def)}`, def); cl.yr.killed++; killedA++; } cl.people = cl.people.filter(q => q.alive); }
    def.people = def.people.filter(q => q.alive);
    return { killedA, killedD };
  }
  // one fight over a village: att (the owner's clan, n men behind it) against the village clan def. The same ratio gives the chance shown and the roll.
  function landFight(W, O, r, att, n, def, ratio0) {
    const pc = playerClan(W), ratio = ratio0 != null ? ratio0 : driveRatio(W, att, { n }, def), won = ratio * (0.6 + 0.8 * W.rand()) > 1, H = def.tribe, v = landV(def);
    const res = { won, ratio, p: landOdds(ratio), killedA: 0, killedD: 0, food: 0, grain: 0, back: 0, dest: null, worksLost: false };
    W.nLandDrive = (W.nLandDrive || 0) + 1;
    const L = landLosses(W, att, n, def, won); res.killedA = L.killedA; res.killedD = L.killedD;
    if (won) {
      W.nLandDriveWon = (W.nLandDriveWon || 0) + 1;
      res.worksLost = !!(def.works && Object.keys(def.works).length); def.works = null; def.worksAt = null;
      res.food = def.store * 0.5; res.grain = (def.grain || 0) * 0.5; def.store -= res.food; def.grain -= res.grain; att.store += res.food; att.grain = (att.grain || 0) + res.grain;
      res.back = landGiveBack(W, O, r); res.dest = landExpel(W, def, O); if (res.dest) landEnd(O, r); // the land comes back first: the clan then looks for ground with it already the owner's
      landAff(W, H, O, 'won', `The ${att.name} clan drove us from ${v}`);
      def.wrong = { c: att.id, t: O.id, w: W.week, km: Math.round(Math.hypot(att.x - def.x, att.y - def.y) / 1000) };
      note(W, def, `${res.dest ? 'Driven from' : 'Beaten at'} ${v} by the ${O.name}${L.killedD ? `; ${L.killedD} of ours fell` : ''}.`); note(W, att, `${res.dest ? 'Drove the ' + def.name + ' clan of the ' + H.name + ' from ' + v + ', off our land' : 'Beat the ' + def.name + ' clan of the ' + H.name + ' at ' + v + ', but they had nowhere to go'}${L.killedA ? `, losing ${L.killedA}` : ''}.`);
      landLog(W, res.dest ? `The ${O.name} drive the ${def.name} clan of the ${H.name} from ${v}, which stood on their land.` : `The ${O.name} beat the ${def.name} clan of the ${H.name} at ${v}, but the clan find no ground to go to.`, O, 'blood', O, H);
    } else {
      landAff(W, H, O, 'lost', `The ${att.name} clan came against ${v} and were beaten`);
      note(W, def, `Beat off the ${O.name}, who came to drive us from ${v}.`); note(W, att, `Failed to drive the ${def.name} clan from ${v}${L.killedA ? `, losing ${L.killedA}` : ''}.`);
      landLog(W, `The ${O.name} come against ${v} of the ${H.name}, and are driven back.`, O, 'blood', O, H);
    }
    if (pc && pc === def) { const P = W.player; P.renown += won ? -2 : 1; houseNote(W, won ? `The ${O.name} ${res.dest ? 'drove us from' : 'beat us at'} ${v}; ${L.killedD} of ours fell.` : `We beat off the ${O.name} at ${v}; ${L.killedD} of ours and ${L.killedA} of theirs fell.`); }
    return res;
  }
  // an envoy bids the village leave: the same odds shown and rolled
  function landAsk(W, O, r, def, n, h, p0) {
    const p = p0 != null ? p0 : leaveOdds(W, O, def, { n }, h), H = def.tribe, v = landV(def), res = { p, yes: W.rand() < p, dest: null, back: 0 }, pc = playerClan(W);
    W.nLandAsk = (W.nLandAsk || 0) + 1;
    if (res.yes) {
      W.nLandAskYes = (W.nLandAskYes || 0) + 1; res.back = landGiveBack(W, O, r); res.dest = landExpel(W, def, O); landEnd(O, r);
      landAff(W, H, O, 'askYes', `Bidden to leave ${v}`); note(W, def, `Left ${v} when the ${O.name} bade us, and ${res.dest && res.dest.wander ? 'took to the road as wanderers' : 'walked beyond their land'}.`);
      landLog(W, `The ${def.name} clan of the ${H.name} leave ${v} when the ${O.name} bid them go.`, O, 'conflict', O, H);
      if (pc && pc.tribe === O) { const P = W.player; P.renown += 2; houseNote(W, `The ${H.name} left ${v} when we bade them go${res.back ? `; ${res.back * 25} km² of our land is ours again` : ''}.`); }
    } else {
      landAff(W, H, O, 'askNo', `Bidden to leave ${v}`); r.refused = W.week; note(W, def, `The ${O.name} bade us leave ${v}; we would not.`);
      if (pc && (pc.tribe === O || pc.tribe === H)) logEvent(W, `The ${O.name} bid the ${def.name} clan of the ${H.name} leave ${v}, and are refused.`, O, 'conflict');
      if (pc && pc.tribe === O) houseNote(W, `The ${H.name} would not leave ${v} when we bade them.`);
    }
    return res;
  }
  // the village walks away at the owner's demand, as a clan told to go
  function landLeave(W, O, r, def) {
    const back = landGiveBack(W, O, r), dest = landExpel(W, def, O); if (dest) landEnd(O, r);
    return { dest, back };
  }
  // ---- the player's side ----
  const landForce0 = (W, c, h, id) => { const F = raidForces(W, c, h); return F.length ? (F.find(f => f.id === id) || F.reduce((a, b) => b.n > a.n ? b : a)) : { id: 'clan', n: myWarriors(c), short: 'warriors of the clan', label: `The ${c.name} clan's warriors`, mix: `${myWarriors(c)} of the clan`, hint: '' }; };
  const landTargets = (W, t) => landLive(W, t).map(r => ({ r, c: W.ents.get(r.c) })).filter(x => x.c);
  const landWarn = (W, t, x, y) => { const O = foreignHeld(W, t, cellAt(x, y)); return O ? `This is land of the ${O.name}. They may demand that you leave.` : ''; };
  // why the head may not send the demand / lead the drive now ('' if he may); the card, the deed and the answer all ask this
  function landAskWhy(W, c, h) { const P = W.player, cd = P.cool || {};
    if (!(c.head === h || c.tribe.headman === h)) return 'Only a clan head or the leader of the tribe can send the demand';
    return cd.landask != null && W.week - cd.landask < yrs(2) ? 'You asked not long ago' : ''; }
  function landDriveWhy(W, c, h) { const P = W.player, cd = P.cool || {};
    if (!(h.age >= 16 && h.age < 62)) return 'Your head is too young or too old to lead men';
    if (!raidForces(W, c, h).length) return 'Too few warriors will follow you';
    if (cd.landdrive != null && W.week - cd.landdrive < yrs(3)) return 'Your warriors need rest';
    return P.quietUntil && W.week < P.quietUntil ? 'The clan is keeping the quiet after the sign' : ''; }
  function landTakenCard(W, O, r, c) {
    const P = W.player, h = P.head, pc = h.clan, H = c.tribe, wh = landWhere(W, O, c.x, c.y), reach = FORAGE_R * 2.2 * clamp(Math.sqrt(c.people.length / 30), 0.7, 2); let at = 0;
    { const k = Math.ceil(reach / CELL), gx = Math.floor(c.x / CELL), gy = Math.floor(c.y / CELL); for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) { const xx = gx + dx, yy = gy + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N || Math.hypot(dx, dy) * CELL > reach) continue; if (W.claim[yy * N + xx] === O.id) at++; } }
    const Fa = landForce0(W, pc, h), Fd = Fa, who = Fa.id === 'tribe' ? ' (the tribe called up)' : Fa.id === 'realm' ? ' (the realm called up)' : '', pa = leaveOdds(W, O, c, Fa, h), ratio = driveRatio(W, pc, Fd, c), pd = landOdds(ratio), wa = landAskWhy(W, pc, h), wd = landDriveWhy(W, pc, h), wk = !!(c.works && Object.keys(c.works).length);
    pushEvent(W, { type: 'landtaken', key: String(c.id), title: 'Our land is taken', data: { cid: c.id, oid: O.id, pa, ratio, n: Fa.n, fid: Fa.id },
      text: `The ${c.name} clan of the ${H.name} have raised a village, ${landV(c)}, ${wh.km} km ${wh.dir} of ${wh.from}, on ground we hold. ${at ? `Up to about ${at * 25} km² of our land lies near it; part of it will pass to them, most of it after seven or eight years, if they stay.` : 'Little of our land lies within its reach.'} What will ${h.name} do?`,
      options: [{ label: 'Demand that they leave', hint: `Chance that they go: about ${Math.round(pa * 100)}% (${likely(pa)}), with ${Fa.n} of ours${who} behind your envoy. If they go, renown +2 and goodwill ${landGw('askYes')}; if they will not, goodwill ${landGw('askNo')}${wa ? '. ' + wa : ''}`, off: !!wa },
        { label: 'Drive them out', hint: `About ${Math.round(pd * 100)}% to win with ${Fd.n} of ours${who} against their ${landMen(W, c)}${walls(c) > 1 ? ' behind a wall' : ''}. You may fall: about ${riskPct(raidHeadRisk(true, Fd.n))}% if you win, ${riskPct(raidHeadRisk(false, Fd.n))}% if you lose. A win costs us 3 to 7 of every 100 of our men, them 10 to 20; we take half their food, ${wk ? 'their wall and works burn, ' : ''}the land is ours again (renown +4, goodwill ${landGw('won')}). A loss costs us 8 to 15 of every 100 (renown −2, goodwill ${landGw('lost')})${wd ? '. ' + wd : ''}`, off: !!wd },
        { label: 'Let them be', hint: 'Part of the land may pass to them. For 25 years you may still bid them go or drive them out, under Act' }] });
  }
  // the deed or the card: our clan bids the village leave
  function landDoAsk(W, r, cl, F, p0) {
    const P = W.player, h = P.head, c = h.clan, O = c.tribe, H = cl.tribe, v = landV(cl); W.nLandPAsk = (W.nLandPAsk || 0) + 1;
    const res = landAsk(W, O, r, cl, F.n, h, p0);
    if (res.yes) { W.nLandPAskYes = (W.nLandPAskYes || 0) + 1;
      return { title: 'They leave', text: `${h.name}'s envoy goes to ${v} with ${F.n} of ours standing behind ${h.sex === 'F' ? 'her' : 'him'}. The ${cl.name} clan hear that the ground is ours, ${res.dest ? landGoes(res.dest, ', beyond our land') : 'go'}. ${res.back ? `${res.back * 25} km² of our land is ours again. ` : ''}The ${H.name} think the less of us for it (goodwill ${landGw('askYes')}). Renown +2. The chance was about ${Math.round(res.p * 100)}%.` }; }
    return { title: 'They refuse', text: `The ${cl.name} clan hear the envoy and stay. They will not forget that we asked (goodwill ${landGw('askNo')}). The chance was about ${Math.round(res.p * 100)}%. You may try again in two years, or take spears to ${v}.` };
  }
  function landDoDrive(W, r, cl, F, ratio0) {
    const P = W.player, h = P.head, c = h.clan, O = c.tribe, H = cl.tribe, v = landV(cl), res = landFight(W, O, r, c, F.n, cl, ratio0);
    W.nLandPDrive = (W.nLandPDrive || 0) + 1; if (res.won) W.nLandPDriveWon = (W.nLandPDriveWon || 0) + 1;
    let headFell = false; if (h.alive && W.rand() < raidHeadRisk(res.won, F.n)) { die(W, c, h, `killed driving the ${H.name} from ${v}`); c.people = c.people.filter(q => q.alive); headFell = true; }
    P.renown += res.won ? 4 : -2; houseNote(W, `${h.name} ${res.won ? (res.dest ? 'drove the ' + H.name + ' from ' : 'beat the ' + H.name + ' at ') + v : 'failed to drive the ' + H.name + ' from ' + v}: ${res.killedD} of theirs fell, ${res.killedA + (headFell ? 1 : 0)} of ours${headFell ? `, and ${h.name} ${h.sex === 'F' ? 'herself' : 'himself'} was slain` : ''}.`);
    const fd = Math.round((res.food + res.grain) / Math.max(1, needsWeek(c) / 7)); // as foodDays measures it
    return { title: res.won ? (res.dest ? 'They are driven out' : 'They are beaten') : 'The attack fails', text: `${F.n} of ours (${F.mix || F.label.replace(/^Call up /, '')}) went against ${v}. ${res.killedD} of theirs fell and ${res.killedA + (headFell ? 1 : 0)} of ours.${res.won ? (res.dest ? ` The ${cl.name} clan are driven out${res.dest.wander ? ', and ' + landGoes(res.dest, '') : ' and walk ' + res.dest.km + ' km ' + res.dest.dir}.` : ` The ${cl.name} clan are beaten, but find no ground to go to, and stay in ${v}.`) : ''}${res.won ? `${res.worksLost ? ' Their wall and works are burned.' : ''}${fd >= 1 ? ` We take food and grain for ${fd} day${fd === 1 ? '' : 's'}.` : ''}${res.dest ? ` ${res.back ? res.back * 25 + ' km² of our land is ours again.' : 'The land is ours again.'}` : ''} The ${H.name} will not forget it (goodwill ${landGw('won')}), and the ${cl.name} may come for payment. Renown +4.` : ` They held the village. The ${H.name} think the less of us (goodwill ${landGw('lost')}). Renown −2.`} The chance of winning was about ${Math.round(res.p * 100)}%.${headFell ? ` <b>${h.name} was killed in the fighting.</b>` : ''}` };
  }
  // the world's own peoples answer a seizure by the same rules as the player (not against the player's own people, who answer by card)
  // the owner's muster for a village: its leader's clan, and half the men of its other clans within 40 km of the village
  function landMuster(W, O, lead, cl) { let n = warriorsOf(lead); for (const o of O.clans) if (o !== lead && o.alive && Math.hypot(o.x - cl.x, o.y - cl.y) < 40000) n += Math.floor(warriorsOf(o) * 0.5); return n; }
  function landYear(W) {
    const pc = playerClan(W), pt = pc ? pc.tribe : null;
    for (const O of W.tribes) {
      if (!O.alive || !O.seized || !O.seized.length || O === pt) continue;
      for (const r of landLive(W, O)) {
        const cl = W.ents.get(r.c); if (!cl || W.week - (r.lt != null ? r.lt : -1e9) < 52 * 2 || W.week - (cl.landOut || -1e9) < 52 * 6) continue; // a clan just sent away is left to settle
        const lead = O.headman && O.headman.alive && O.headman.clan && O.headman.clan.tribe === O ? O.headman.clan : O.clans.slice().sort((a, b) => b.people.length - a.people.length)[0]; if (!lead) continue;
        const mine = landMuster(W, O, lead, cl), theirs = warMuster(W, cl.tribe, cl, pc), strong = mine >= 1.2 * theirs && opinion(O, cl.tribe) < 20;
        if (W.rand() >= 0.5) continue;
        if (cl === pc && (r.n || 0) >= 2) { landEnd(O, r); continue; } // two tries are enough: they let it be
        r.lt = W.week; r.n = (r.n || 0) + 1;
        if (cl === pc) { landWorldCard(W, O, r, cl, lead, mine, strong); continue; }
        const h = O.headman;
        if (strong) { const res = landFight(W, O, r, lead, mine, cl); if (!res.won && r.n >= 2) landEnd(O, r); }
        else { const res = landAsk(W, O, r, cl, mine, h); if (!res.yes && r.n >= 2) landEnd(O, r); }
      }
    }
  }
  // against the player's own village the world's demand is a card
  function landWorldCard(W, O, r, cl, lead, mine, strong) {
    const P = W.player, h = P.head, v = landV(cl), ratio = driveRatio(W, lead, { n: mine }, cl), p = landOdds(ratio), mm = warriorsOf(cl);
    const wk = !!(cl.works && Object.keys(cl.works).length), leave = { label: strong ? 'Leave before blood is shed' : 'Leave', hint: `The village walks to ground outside their land, or takes to the road as wanderers if no ground is free${wk ? '; its wall and works are left behind' : ''}${cl.live === 'fishing' ? '; a fishing village goes back to wandering' : ''}. Renown −1; they think the better of us (goodwill ${landGw('leave')})` };
    if (!strong) pushEvent(W, { type: 'landdemand', key: String(cl.id), title: `The ${O.name} demand that ${v} leave their land`, data: { cid: cl.id, oid: O.id, rid: r.w }, text: `Envoys of the ${O.name} come to ${v}. They say the ground it stands on is theirs, and bid the ${cl.name} clan take down their houses and go. What will ${h.name} do?`,
      options: [leave, { label: 'Refuse', hint: `They will hold it against us (goodwill ${landGw('refuse')}), and may come again with spears` }] });
    else pushEvent(W, { type: 'landattack', key: String(cl.id), title: `The ${O.name} come to drive us from ${v}`, data: { cid: cl.id, oid: O.id, rid: r.w, n: mine, ratio }, text: `${mine} warrior${mine === 1 ? '' : 's'} of the ${O.name} come to drive the ${cl.name} clan from ${v}, which they say stands on their land. We have ${mm} fighting ${mm === 1 ? 'man' : 'men'}${walls(cl) > 1 ? ' behind a wall' : ''}. What will ${h.name} do?`,
      options: [{ label: 'Stand and fight', hint: `About ${Math.round((1 - p) * 100)}% to hold the village. A defeat costs the village${wk ? ', its wall' : ''} and half its stores, and 10 to 20 of every 100 of our men (renown −2); a victory costs us 3 to 6 of every 100 (renown +1)` }, leave] });
  }
  // the answers to the cards; the village is looked up again by id, for it may have changed since the card was raised
  function landCardResolve(W, ev, k) {
    const P = W.player, h = P.head, c = h && h.clan, O = W.ents.get(ev.data.oid), cl = W.ents.get(ev.data.cid); if (!O || !cl || !c) return;
    const r = landLive(W, O).find(x => x.c === cl.id);
    if (ev.type === 'landtaken') {
      if (k === 2) { houseNote(W, `${h.name} let the ${cl.tribe.name} be at ${landV(cl)}.`); return; }
      if (!r) { W.lastResult = cl.alive && cl.settled && cl.tribe && isAllied(c.tribe, cl.tribe) ? { title: 'Not now', text: `The ${cl.tribe.name} are bound to us now. We do not bid friends go.` } : { title: 'They are gone', text: `The ${cl.name} clan have already left ${landV(cl)}.` }; return; }
      const cd = P.cool || (P.cool = {}), why = k === 0 ? landAskWhy(W, c, h) : landDriveWhy(W, c, h); // asked again: the head may have changed since the card
      if (why) { W.lastResult = { title: 'Not possible now', text: why + '.' }; return; }
      const F0 = landForce0(W, c, h, ev.data.fid), F = { ...F0, n: ev.data.n != null ? ev.data.n : F0.n }; // the force and the chance are those the card showed
      if (k === 0) { cd.landask = W.week; W.lastResult = landDoAsk(W, r, cl, F, ev.data.pa); }
      else { cd.landdrive = W.week; W.lastResult = landDoDrive(W, r, cl, F, ev.data.ratio); }
      return;
    }
    if (!r || cl !== c) return;
    const leaveNow = () => { const res = landLeave(W, O, r, cl); landAff(W, O, c.tribe, 'leave', `${landV(cl)} left at our bidding`); P.renown -= 1; houseNote(W, `${landV(cl)} left the ${O.name}'s land at their bidding.`); logEvent(W, `The ${cl.name} clan leave ${landV(cl)} at the bidding of the ${O.name}.`, O, 'conflict');
      W.lastResult = { title: 'The village moves', text: res.dest ? `The ${cl.name} clan ${landGoes(res.dest, ', beyond the land of the ' + O.name)}. The ${O.name} are glad of it (goodwill ${landGw('leave')}). Renown −1.` : `The ${cl.name} clan cannot find ground to go to, and stay for now.` }; };
    if (ev.type === 'landdemand') {
      if (k === 0) leaveNow();
      else { landAff(W, O, c.tribe, 'refuse', `${landV(cl)} would not leave`); houseNote(W, `We would not leave ${landV(cl)} when the ${O.name} bade us.`); logEvent(W, `The ${cl.name} clan refuse the ${O.name}, who bid them leave ${landV(cl)}.`, O, 'conflict'); W.lastResult = { title: 'You refuse', text: `The envoys go home. The ${O.name} will hold it against you (goodwill ${landGw('refuse')}), and may come again.` }; }
      return;
    }
    if (ev.type === 'landattack') {
      if (k === 1) { leaveNow(); return; }
      const att = (O.headman && O.headman.alive && O.headman.clan && O.headman.clan.tribe === O ? O.headman.clan : O.clans.slice().sort((a, b) => b.people.length - a.people.length)[0]); if (!att) return;
      const res = landFight(W, O, r, att, ev.data.n, cl, ev.data.ratio);
      W.lastResult = res.won ? { title: res.dest ? 'They drive us out' : 'They beat us', text: `${res.killedD} of ours and ${res.killedA} of theirs fell. The ${O.name} take half our stores${res.worksLost ? ' and burn the wall and works' : ''}. ${res.dest ? `The ${cl.name} clan ${res.dest.wander ? landGoes(res.dest, '') : 'walk ' + res.dest.km + ' km ' + res.dest.dir + ', beyond their land'}.` : `The ${cl.name} clan find no ground to go to, and stay in ${landV(cl)}.`} Renown −2.` }
        : { title: 'They are beaten off', text: `${res.killedD} of ours and ${res.killedA} of theirs fell. The ${O.name} go home, and think the less of themselves for it. Renown +1.` };
    }
  }
  // =====================================================================
  //  TRIAL 1: WALKING A STORY. The head of the house re-enacts one of the people's own stories, at some risk, for what the story promises.
  // =====================================================================
  const WALK = {
    creation: { boon: 'the whole tribe is renewed: every clan thinks better of yours, and the people are blessed for five years', does: (W, P, h, c, t) => { for (const o of t.clans) if (o !== c) affect(W, o, c, 10, `${h.name} walked the first story`); t.blessing = { type: faithOf(t), until: W.week + 52 * 5 }; t._W = W; P.renown += 6; } },
    hero: { boon: 'the old leader stands behind you: your standing rises, and more if the legend is of your own house', does: (W, P, h, c, t, m) => { h.giftPrestige = (h.giftPrestige || 0) + (m.dyn ? 0.16 : 0.1); P.renown += m.dyn ? 12 : 7; } },
    grain: { boon: 'the first sheaf is honoured: the stores fill for six weeks and the fields grow richer', does: (W, P, h, c) => { c.store += needsWeek(c) * 6; if (c.settled) c.soil = Math.min(1.15, (c.soil || 1) + 0.12); P.renown += 4; } },
    sea: { boon: 'the sea remembers the bargain: six weeks of food from the water, and the canoes are ready to sail again', does: (W, P, h, c) => { c.store += needsWeek(c) * 6; if (P.cool) { P.cool.voyage = 0; P.cool.expedition = 0; } P.renown += 4; } },
    stones: { boon: 'the clan stands as the stones stand: it will not break apart for eight years', does: (W, P, h, c) => { c.holdTogether = W.week; c.peaceMade = W.week; P.renown += 6; } },
    burning: { boon: 'the fire is answered: your fighting men stand firmer for five years', does: (W, P, h, c) => { c.ward = { kind: 'war', until: W.week + 260 }; P.renown += 5; } },
    hunger: { boon: 'the hungry moon is fed: the stores fill for eight weeks', does: (W, P, h, c) => { c.store += needsWeek(c) * 8; P.renown += 4; } },
    plague: { boon: 'the stranger is turned from the door: for five years a fever takes half as many', does: (W, P, h, c) => { c.ward = { kind: 'fever', until: W.week + 260 }; P.renown += 5; } },
    beast: { boon: 'the hunters lose their fear: for five years a hunt for a great beast is likelier to succeed', does: (W, P, h, c) => { c.ward = { kind: 'hunt', until: W.week + 260 }; P.renown += 5; } },
  };
  function walkOdds(W, h, c, t, m) { const P = W.player, lore = ring(W).find(r => r.role === 'lore'); return clamp(0.42 + Math.min(0.15, P.renown / 400) + (lore && lore.q.age >= 55 ? 0.08 : lore ? 0.04 : 0) + (hasTrait(h, 'pious') ? 0.1 : 0) + (m.kind === 'hero' && m.dyn ? 0.08 : 0) + (blessed(t) ? 0.06 : 0) - (m.kind === 'creation' ? 0.1 : 0), 0.2, 0.85); }
  function walkStory(W, m) {
    const P = W.player, h = P.head, c = h.clan, t = c.tribe, K = WALK[m.kind] || WALK.hero, p = walkOdds(W, h, c, t, m), r = W.rand(), pc = Math.round(p * 100);
    eatStore(c, needsWeek(c) * 2);
    if (r < p) { K.does(W, P, h, c, t, m); credit(h, 'walked', m.title); P.walks = (P.walks || 0) + 1;
      houseNote(W, `${h.name} walked the story of “${m.title}” and came back.`); logEvent(W, `${h.name} of the ${t.name} walks the story of “${m.title}” before the whole people.`, t, 'culture');
      return { title: 'The story is walked', text: `For three nights ${h.name} is not ${h.name} but the one the story tells of, and the people watch it happen again. When it is done, ${K.boon}.<br><br>The chance was about ${pc}%.` }; }
    if (r > 1 - 0.07) { const heirN = clanHeir(W, c, h); die(W, c, h, 'lost walking a story'); c.people = c.people.filter(q => q.alive);
      return { title: `${h.name} does not come back`, text: `On the third night ${h.name} walks out past the fires as the story requires, and is not seen again. The elders say the story kept ${h.sex === 'F' ? 'her' : 'him'}.${heirN ? ` ${heirN.name} must lead the house now.` : ''}` }; }
    P.renown = Math.max(0, P.renown - 3); h.giftPrestige = (h.giftPrestige || 0) - 0.04; for (const o of t.clans) if (o !== c) affect(W, o, c, -3, `${h.name} stumbled in the story`);
    houseNote(W, `${h.name} tried to walk the story of “${m.title}” and lost the thread of it.`);
    return { title: 'The story slips away', text: `${h.name} begins well, and then a word comes out wrong, or a step, and everyone feels it go. Nothing is gained. The other clans think a little less of yours (−3), and your standing slips. Renown −3.<br><br>The chance was about ${pc}%. An old keeper of the ways on your ring, a pious head, renown, and a legend of your own house all raise it.` };
  }
  // =====================================================================
  //  TRIAL 2: STORIES THAT COME BACK. A choice made now is answered years later.
  // =====================================================================
  const exileMem = (c, f, ids, hd) => c.people.filter(q => q !== hd && q !== c.head && (ids ? ids.includes(q.id) || (q.fam === f && q.age < 15 && !q.dyn) : q.fam === f && !q.dyn));
  const chainDue = (P, type, data, years) => { (P.chains = P.chains || []).push({ type, due: 0, data }); P.chains[P.chains.length - 1].due = years; };
  function chainsYear(W) {
    const P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan) return; const h = P.head, c = h.clan, t = c.tribe, rand = W.rand, yr = Math.floor(W.week / 52);
    P.chains = P.chains || []; P.chainAt = P.chainAt || {};
    // ---- what comes back ----
    for (const ch of P.chains.slice()) { if (W.week < ch.due) continue; P.chains.splice(P.chains.indexOf(ch), 1); const d = ch.data;
      if (ch.type === 'foundling') { const q = d.q; if (!q.alive || q.clan !== c) { houseNote(W, `${q.name}, the child we took in, ${q.alive ? 'grew up and went to another clan' : 'did not live to grow up'}. No one came asking for ${q.sex === 'F' ? 'her' : 'him'}.`); continue; } const O = d.from != null ? W.ents.get(d.from) : null;
        if (O && O.alive && O.clans.length && O !== t) pushEvent(W, { type: 'foundback', key: q.id, title: `They have come for ${q.name}`, text: `${q.name}, the child your house took in ${yr - d.y} years ago, is ${Math.floor(q.age)} now. Today strangers stand at the edge of the ${c.settled ? 'village' : 'camp'}: people of the ${O.name}. They say the child was theirs, lost in a bad year, and of a good house. They want ${q.sex === 'F' ? 'her' : 'him'} home.`, data: { q, O },
          options: [{ label: `Let ${q.name} choose`, hint: `${q.sex === 'F' ? 'She' : 'He'} may go or stay. Either way the ${O.name} will remember that you were fair` }, { label: 'Send the child home with gifts', hint: `You lose ${q.name}, and gain the friendship of the ${O.name} (+25)` }, { label: `${q.name} is ours`, hint: `${q.name} stays. The ${O.name} leave angry (−25)` }] });
        else { q.skill = Math.max(q.skill || 0, 0.85); q.dyn = q.dyn || false; affect(W, q.fam || c, h.fam || c, 40, 'Raised by the house'); P.renown += 4;
          notice(W, `${q.name} comes of age`, `${q.name}, the child your house took in ${yr - d.y} years ago, has grown into the best ${q.sex === 'F' ? 'hand' : 'hunter'} in the clan, and will hear no word against the house that raised ${q.sex === 'F' ? 'her' : 'him'}. Renown +4.`); houseNote(W, `${q.name}, the foundling, came of age among us.`); } }
      else if (ch.type === 'exiles') { const f = d.fam, O = W.ents.get(d.from), mem = exileMem(c, f, d.ids, h), eh = d.ids && c.people.find(q => q.alive && d.ids.includes(q.id) && q.name === d.name), on = O ? `the ${O.name}` : 'their own people';
        if (!mem.length || (d.ids && !eh) || !O || !O.alive || !O.clans.length || O === t) { houseNote(W, !mem.length ? `${d.name}'s household, whom we sheltered, is no longer among us. ${on[0].toUpperCase() + on.slice(1)} never came for blood.` : (d.ids && !eh) ? `${d.name}, whom we sheltered, is dead or gone. The blood owed died with ${d.sex === 'F' ? 'her' : 'him'}.` : O === t ? `${d.name}'s old people and ours are one tribe now. The blood owed was forgotten.` : `${on[0].toUpperCase() + on.slice(1)}, who wanted ${d.name} for a killing, are scattered. No one came for blood.`); continue; }
        pushEvent(W, { type: 'exilesback', key: f.id, title: `The ${O.name} want them back`, text: `Men of the ${O.name} come with spears held low. They name ${d.name}, who has lived among your people these ${yr - d.y} years with ${Math.max(0, mem.length - (mem.includes(eh) ? 1 : 0))} of ${d.sex === 'F' ? 'her' : 'his'} kin, and say there is blood still owed. Hand them over, they say, and there is no quarrel with the ${c.name}.`, data: { f, O, name: d.name, ids: d.ids },
          options: [{ label: 'They are under our roof', hint: `Refuse. The ${O.name} will not forgive it (−30) and may come back armed; ${d.name}'s household is bound to yours for good` }, { label: 'Pay what is owed for them', hint: `Four weeks of food and something of value if you have any. The matter ends, and both sides think well of you` }, { label: 'Hand them over', hint: `You lose ${mem.length} people. The ${O.name} are satisfied (+15), and your own people remember that you gave up a guest (renown −8)` }] }); }
      else if (ch.type === 'oath') { const o = d.q, os = o.sex === 'F' ? 'her' : 'his'; if (!o.alive || !o.clan || !o.clan.alive || o.clan.tribe !== t || o.clan === c) { const ot = d.tr != null && d.tr !== t.id ? W.ents.get(d.tr) : null; houseNote(W, !o.alive ? `${o.name}, to whom ${d.by} swore, died. The oath was never called.` : (!o.clan || !o.clan.alive) ? `${o.name}, to whom ${d.by} swore, is gone, and ${os} clan with ${o.sex === 'F' ? 'her' : 'him'}. The oath was never called.` : o.clan === c ? `${o.name}, to whom ${d.by} swore, now lives in our own clan. The oath was never called.` : ot ? `${d.by} swore to ${o.name}, and then the ${c.name} left the ${ot.name}. The oath was never called.` : `${o.name}, to whom ${d.by} swore, went away with ${os} clan. The oath was never called.`); continue; } const men = myWarriors(c);
        pushEvent(W, { type: 'oathback', key: o.id, title: `${o.name} calls in your oath`, text: `${yr - d.y} years ago ${d.by}${d.by === h.name ? '' : ', who led the house then,'} swore to stand with ${o.name} of the ${o.clan.name} when called. Now ${o.name} is calling. ${o.sex === 'F' ? 'She' : 'He'} means to settle an old score with a neighbouring people and wants your spears beside ${o.sex === 'F' ? 'hers' : 'his'}.`, data: { o },
          options: [{ label: 'Keep the oath', hint: `${Math.min(6, men)} of your men go. Some may not come home; ${o.name}'s clan will stand by yours for a generation (+35), and it is told well of you (renown +8)` }, { label: 'Send food and excuses', hint: `Four weeks of food. ${o.name} is not fooled (−12), but it is not quite a broken oath` }, { label: 'Break the oath', hint: `No one goes. ${o.name}'s clan turns against yours (−40), and the whole tribe hears of it (renown −12)` }] }); } }
    // ---- what begins ----
    const gap = k => yr - (P.chainAt[k] || -99), can = W.pending.length === 0 && yr >= 8 && yr - (P.chainLast || -99) >= 6;
    if (!can) return;
    if (gap('foundling') > 30 && h.fam && rand() < 0.05) { const O = pick(W.tribes.filter(o => o !== t && o.alive && o.clans.length && Math.hypot(o.home[0] - c.x, o.home[1] - c.y) < 200000), rand);
      P.chainAt.foundling = yr; P.chainLast = yr; pushEvent(W, { type: 'foundling', key: yr, title: 'A child at the edge of the firelight', text: `The dogs find a child of four or five winters asleep under a windfall near the ${c.settled ? 'village' : 'camp'}, thin, wearing a shell bead on a cord of a kind nobody here makes. The child will not say where it came from, or cannot.`, data: { from: O ? O.id : null },
        options: [{ label: 'Take the child into your own house', hint: 'One more mouth now. What the child becomes, and who may come asking, is years away' }, { label: 'Let another household raise it', hint: 'The child lives, and it is no concern of yours' }, { label: 'This is not our child', hint: 'The clan moves on. Some will say it was ill done' }] }); return; }
    if (gap('exiles') > 25 && rand() < 0.07) { const cs = nearClans(W, c.x, c.y, 120000).filter(o => o.tribe !== t && freeCount(o) >= 22 && familiesOf(o).length >= 3), oc = pick(cs, rand); if (oc) { const fams = familiesOf(oc).filter(f => f.head && f.head !== oc.head && f.head.alive && !f.head.dyn), f = pick(fams, rand); const n = f ? oc.people.filter(q => q.fam === f).length : 0;
      if (f && n >= 2 && n <= 8 && freeCount(c) + n <= splitCap(W, c)) { P.chainAt.exiles = yr; P.chainLast = yr; pushEvent(W, { type: 'exiles', key: yr, title: 'Strangers ask for shelter', text: `${f.head.name} of the ${oc.tribe.name} comes to your fire with ${n - 1} of ${f.head.sex === 'F' ? 'her' : 'his'} household, all they own on their backs. There was a killing, ${f.head.sex === 'F' ? 'she' : 'he'} says, and it was not murder, but the dead man's kin do not see it so. They ask to live among the ${c.name}.`, data: { f, oc },
        options: [{ label: 'Give them a place at the fire', hint: `${n} people join your clan, with ${(m => m === 1 ? 'one fighting man' : m + ' fighting men')(oc.people.filter(q => q.fam === f && q.sex === 'M' && q.age >= 16 && q.age < 50).length)}. The ${oc.tribe.name} will not like it (−15), and may not let it rest` }, { label: 'Feed them and send them on', hint: 'A week of food. No one can say you were hard, and no one owes you anything' }, { label: 'Turn them away', hint: 'Nothing is risked. Nothing is gained' }] }); return; } } }
    if (gap('oath') > 20 && t.clans.length > 1 && c.head === h && rand() < 0.14) { const o = pick(t.clans.filter(k => k !== c && k.head && k.head.alive && k.head.age < 50).map(k => k.head), rand);
      if (o) { P.chainAt.oath = yr; P.chainLast = yr; pushEvent(W, { type: 'oath', key: yr, title: `${o.name} asks for your oath`, text: `At the fire ${o.name} of the ${o.clan.name} clan puts a hand on your arm. "There are men who will come for me one day," ${o.sex === 'F' ? 'she' : 'he'} says. "Swear that when I call, the ${c.name} will come. I will swear the same to you."`, data: { o },
        options: [{ label: 'Swear it', hint: `The ${o.clan.name} think better of yours at once (+15), and ${o.name} speaks for you in the tribe. One day the oath will be called in` }, { label: 'Promise friendship, not spears', hint: `A small kindness (+4), and nothing owed` }, { label: 'Refuse', hint: `${o.name} is stung (−8)` }] }); } }
  }
  function chainResolve(W, ev, k) {
    const P = W.player, h = P.head, c = h.clan, t = c.tribe, yr = Math.floor(W.week / 52), d = ev.data, R = (title, text) => { W.lastResult = { title, text }; };
    switch (ev.type) {
      case 'foundling': if (k === 0) { const q = makePerson(W, W.rand() < 0.5 ? 'F' : 'M', 4 + W.rand() * 1.5, null, null); q.clan = c; q.fam = h.fam; q.foundling = true; c.people.push(q); chainDue(P, 'foundling', { q, from: d.from, y: yr }, W.week + 52 * (11 + Math.floor(W.rand() * 5)));
          houseNote(W, `${h.name} took in a child found near the ${c.settled ? 'village' : 'camp'}, and named ${q.sex === 'F' ? 'her' : 'him'} ${q.name}.`); return R('A child of the house', `The child is given a place by your fire and a name, ${q.name}. Whatever ${q.sex === 'F' ? 'she' : 'he'} was before, ${q.sex === 'F' ? 'she' : 'he'} is of the ${c.name} now.`); }
        if (k === 1) { P.renown += 1; return R('The child is taken in', 'A household with room takes the child. It is not spoken of again.'); }
        for (const o of t.clans) if (o !== c) affect(W, o, c, -2, 'Left a child in the woods'); return R('The clan moves on', 'No one speaks of it on the walk home. Some will speak of it later.');
      case 'foundback': { const q = d.q, O = d.O;
        if (k === 0) { affect(W, O, t, 12, `${h.name} let the lost child choose`); if (W.rand() < 0.55) { affect(W, q.fam || c, h.fam || c, 40, 'Chose the house that raised them'); affect(W, O, t, 10, 'One of ours lives among them'); rel(O, t).kin++; P.renown += 5; q.skill = Math.max(q.skill || 0, 0.8); houseNote(W, `${q.name} chose to stay with the house that raised ${q.sex === 'F' ? 'her' : 'him'}.`); return R(`${q.name} stays`, `${q.name} looks a long time at the strangers, and then comes and stands by your fire. The ${O.name} go home without ${q.sex === 'F' ? 'her' : 'him'}, but not as enemies: one of their blood lives among you now (+22). Renown +5.`); }
          c.people.splice(c.people.indexOf(q), 1); const oc = O.clans[0]; oc.people.push(q); q.clan = oc; q.fam = null; affect(W, O, t, 14, 'Our child came home'); houseNote(W, `${q.name} went home to the ${O.name}.`); return R(`${q.name} goes home`, `${q.name} weeps, and goes. The ${O.name} will not forget who kept their child alive (+26).`); }
        if (k === 1) { c.people.splice(c.people.indexOf(q), 1); const oc = O.clans[0]; oc.people.push(q); q.clan = oc; q.fam = null; affect(W, O, t, 25, `${h.name} sent our child home with gifts`); rel(O, t).trade++; houseNote(W, `${h.name} sent ${q.name} home to the ${O.name} with gifts.`); return R('Sent home with gifts', `${q.name} leaves on a stranger's shoulders, looking back. The ${O.name} call your house generous (+25).`); }
        affect(W, O, t, -25, `${h.name} kept our child`); affect(W, q.fam || c, h.fam || c, 20); houseNote(W, `${h.name} would not give ${q.name} up to the ${O.name}.`); return R(`${q.name} is ours`, `The strangers leave before dark. ${q.name} watches them go and says nothing. The ${O.name} will remember this (−25).`); }
      case 'exiles': { const f = d.f, oc = d.oc, n = oc.people.filter(q => q.fam === f).length;
        if (k === 0) { const nm = f.head.name, sx = f.head.sex, ids = oc.people.filter(q => q.fam === f).map(q => q.id); moveFamily(W, f, c); affect(W, oc.tribe, t, -15, `Sheltered ${nm}, who is wanted for a killing`); affect(W, f, h.fam || c, 35, 'Gave us shelter'); chainDue(P, 'exiles', { fam: f, from: oc.tribe.id, name: nm, sex: sx, y: yr, ids }, W.week + 52 * (5 + Math.floor(W.rand() * 5)));
          houseNote(W, `${h.name} gave shelter to ${nm} of the ${oc.tribe.name} and ${n - 1} of ${sx === 'F' ? 'her' : 'his'} kin.`); return R('A place at the fire', `${nm} and ${sx === 'F' ? 'her' : 'his'} people put down their loads. ${n} more live among the ${c.name}. The ${oc.tribe.name} will hear where they went (−15).`); }
        if (k === 1) { eatStore(c, needsWeek(c)); P.renown += 1; return R('Fed and sent on', 'They eat, sleep one night, and are gone before the mist lifts.'); }
        return R('Turned away', 'They go without a word. It is a cold night for it.'); }
      case 'exilesback': { const f = d.f, O = d.O, mem = exileMem(c, f, d.ids, h);
        if (k === 0) { affect(W, O, t, -30, `${h.name} would not give up ${d.name}`); affect(W, f, h.fam || c, 60, 'Stood between us and the spears'); P.renown += 6; t.threat = Math.max(t.threat || 0, 0.3); houseNote(W, `${h.name} refused to hand ${d.name} over to the ${O.name}.`); return R('Under our roof', `"They are under our roof," ${h.name} says, and that is the end of the talk. The ${O.name} go (−30). ${d.name}'s household would die for yours now. Renown +6.`); }
        if (k === 1) { eatStore(c, needsWeek(c) * 4); const g = GIFTABLE.find(x => c.goods[x] > 0); if (g) c.goods[g]--; affect(W, O, t, 12, `${h.name} paid the blood-price for ${d.name}`); affect(W, f, h.fam || c, 40, 'Paid our blood-price'); P.renown += 3; houseNote(W, `${h.name} paid the blood-price for ${d.name}.`); return R('The price is paid', `Food${g ? ' and ' + GOOD_NAMES[g].toLowerCase() : ''} change hands, and the ${O.name} say the matter is closed (+12). ${d.name} owes your house everything. Renown +3.`); }
        const oc = O.clans[0], nf = mem.length ? newFamily(W, oc, mem.slice().sort((a, b) => b.age - a.age)[0]) : null;
        for (const q of mem) { // those of the clan who married them stay, and the marriage is ended
          if (q.sex === 'M') { let kept = null; for (const w2 of c.people) if (w2.spouse === q) { if (mem.includes(w2)) kept = kept || w2; else { w2.spouse = null; w2.widowed = W.week; } } q.spouse = kept; q.wives = kept ? 1 : 0; }
          else if (q.spouse && !mem.includes(q.spouse)) { const m2 = q.spouse; if (m2.spouse === q) m2.spouse = c.people.find(w2 => w2 !== q && w2.alive && w2.spouse === m2) || null; m2.wives = Math.max(0, (m2.wives || 1) - 1); if (!m2.spouse) m2.widowed = W.week; q.spouse = null; } }
        for (const q of mem) { c.people.splice(c.people.indexOf(q), 1); oc.people.push(q); q.clan = oc; q.fam = nf; } affect(W, O, t, 15, `${h.name} handed over ${d.name}`); P.renown = Math.max(0, P.renown - 8); for (const o of t.clans) if (o !== c) affect(W, o, c, -4, 'Gave up a guest'); houseNote(W, `${h.name} handed ${d.name} over to the ${O.name}.`); return R('Handed over', `${d.name} does not look at you as they are led away. The ${O.name} are satisfied (+15). Your own people will not say so to your face, but they remember it. Renown −8.`); }
      case 'oath': { const o = d.o;
        if (k === 0) { affect(W, o.clan, c, 15, `${h.name} swore to stand with ${o.name}`); chainDue(P, 'oath', { q: o, by: h.name, y: yr, tr: t.id }, W.week + 52 * (6 + Math.floor(W.rand() * 8))); houseNote(W, `${h.name} swore an oath to stand with ${o.name} of the ${o.clan.name}.`); return R('Sworn', `You clasp arms over the fire. The ${o.clan.name} think better of yours (+15). It is a good night. The oath will keep.`); }
        if (k === 1) { affect(W, o.clan, c, 4); return R('Friendship', `${o.name} nods, and lets go of your arm.`); }
        affect(W, o.clan, c, -8, `${h.name} would not swear`); return R('Refused', `${o.name} laughs it off. Not well.`); }
      case 'oathback': { const o = d.o, oc = o.clan;
        if (k === 0) { const men = c.people.filter(q => q.sex === 'M' && !q.slave && q.age >= 16 && q.age < 50 && q !== h); let lost = 0; for (const q of men.slice(0, 6)) if (W.rand() < 0.12 && !(q.dyn && c.people.filter(x => x.dyn).length < 4)) { die(W, c, q, `killed keeping ${h.name}'s oath`); lost++; } c.people = c.people.filter(q => q.alive);
          affect(W, oc, c, 35, `${h.name} kept the oath`); P.renown += 8; credit(h, 'oath'); houseNote(W, `${h.name} kept the oath to ${o.name}${lost ? `; ${lost} of ours did not come home` : ''}.`); return R('The oath is kept', `Your men go with ${o.name}'s. ${lost ? `${lost} of them ${lost === 1 ? 'does' : 'do'} not come home.` : 'All of them come home.'} The ${oc.name} will stand by the ${c.name} for a generation (+35), and it is told at every fire that ${h.name}'s word holds. Renown +8.`); }
        if (k === 1) { eatStore(c, needsWeek(c) * 4); affect(W, oc, c, -12, `${h.name} sent food where spears were owed`); return R('Food and excuses', `${o.name} takes the food and says nothing. That is worse than if ${o.sex === 'F' ? 'she' : 'he'} had shouted (−12).`); }
        affect(W, oc, c, -40, `${h.name} broke an oath`); P.renown = Math.max(0, P.renown - 12); for (const x of t.clans) if (x !== c && x !== oc) affect(W, x, c, -8, `${h.name} broke an oath`); credit(h, 'oathbreak'); houseNote(W, `${h.name} broke the oath to ${o.name}.`); return R('The oath is broken', `No one goes. By the next gathering every clan of the ${t.name} knows it (−8 with each, −40 with the ${oc.name}). Renown −12.`); }
    }
  }
  // =====================================================================
  //  TRIAL 3: TREASURES. Things with names and histories: won, given, carried off, remembered.
  // =====================================================================
  function addTreasure(W, c, name, how) { c.treasures = c.treasures || []; if (c.treasures.length >= 6) return null; const tr = { id: (W.trN = (W.trN || 0) + 1), name, made: Math.floor(W.week / 52), hist: [`${how} (year ${Math.floor(W.week / 52)})`] }; c.treasures.push(tr); const P = W.player; if (P && !P.over && P.head.alive && P.head.clan === c) houseNote(W, `The clan now keeps ${name}.`); return tr; }
  const treasureStanding = c => Math.min(0.15, 0.05 * ((c && c.treasures) ? c.treasures.length : 0));
  function treasureTaken(W, att, def) { if (!def.treasures || !def.treasures.length || W.rand() > 0.5) return null; const tr = def.treasures.splice(Math.floor(W.rand() * def.treasures.length), 1)[0]; att.treasures = att.treasures || []; if (att.treasures.length >= 6) att.treasures.shift(); att.treasures.push(tr);
    tr.hist.push(`carried off by the ${att.name} clan of the ${att.tribe.name} (year ${Math.floor(W.week / 52)})`); affect(W, def.tribe, att.tribe, -15, `They carried off ${tr.name}`); logEvent(W, `The ${att.name} clan (${att.tribe.name}) carry off ${tr.name} from the ${def.name}.`, def, 'conflict');
    const P = W.player, pc = P && !P.over && P.head.alive ? P.head.clan : null; if (pc === def) notice(W, 'A treasure is taken', `The raiders carried off ${tr.name}. It is with the ${att.name} clan of the ${att.tribe.name} now. Getting it back would be a thing worth telling.`); else if (pc === att) notice(W, 'A treasure is won', `Your men carried off ${tr.name} from the ${def.name}. It is yours now, and they will want it back.`); return tr; }
  function decayRelations(W) {
    for (const e of W.ents.values()) for (const [oid, r] of e.rel) {
      if (!W.ents.has(oid)) { e.rel.delete(oid); continue; }
      if (r.t === W.week) continue; r.t = W.week;
      r.op *= 0.985; r.grudge *= 0.965;
      // forget faded acquaintances to keep memory small
      if (Math.abs(r.op) < 2 && r.grudge < 1 && !r.allied && !r.kin && !r.feasts && !r.trade && !r.pact && !r.tribute && !(r.peaceUntil > W.week)) { e.rel.delete(oid); const o = W.ents.get(oid); if (o) o.rel.delete(e.id); }
    }
  }

  function yearEnd(W) {
    seenYear(W);
    for (const c of W.clans) { c.last = { ...c.yr, size: c.people.length, fed: c.yr.need ? c.yr.intake / c.yr.need : 1 }; c.yr = { births: 0, deaths: 0, starv: 0, infD: 0, killed: 0, intake: 0, need: 0 }; }
    let tot = 0; for (const c of W.clans) tot += c.people.length;
    let allies = 0; for (const a of W.tribes) for (const b of W.tribes) if (a.id < b.id && isAllied(a, b)) allies++;
    for (const st of W.sites) st.prestige *= 0.97;
    for (const t of W.tribes) { t.popHist.push(tribeSize(t)); if (t.popHist.length > 200) t.popHist.shift(); }
    houseSummary(W);
    playerYear(W);
    fogYear(W); signsYear(W);
    houseFlow(W);
    fieldsYear(W); mythYear(W); beastYear(W); landScan(W); claimsYear(W); landYear(W); chainsYear(W);
    diplomacyYear(W);
    cultureYear(W);
    kultYear(W);
    craftsYear(W);
    rivalryYear(W);
    metalYear(W);
    roadsYear(W);
    W.history.push({ year: W.week / 52, pop: tot, bands: W.clans.length, tribes: W.tribes.length, allies, confeds: W.confeds.length, game: sum(W.game) / W.landIdx.length });
  }

  function step(W) {
    const P = PROF.on; if (P) PT = pnow();
    PX = W.px; PY = W.py;
    stepEnv(W); if (P) pm('stepEnv');
    rebuildBuckets(W); if (P) pm('rebuildBuckets');
    const wk = W.week % 52;
    if (wk === DENS_WEEK) for (const c of W.clans) { let n = 0; for (const o of nearClans(W, c.x, c.y, 25000)) n += o.people.length; c.dens = n / DENS_AREA; }
    for (const c of W.clans) stepPop(W, c);
    if (P) pm('loop');
    if (wk === GATHER_PLAN) { planGatherings(W); W.gathering = true; if (P) pm('planGatherings'); }
    if (wk === GATHER_END) { endGatherings(W); W.gathering = false; if (P) pm('endGatherings'); }
    if (wk === 33) { harvest(W); if (P) pm('harvest'); }
    if (W.week % 4 === 2) { gameCap(W); if (P) pm('gameCap'); }
    if (W.week % 4 === 0) {
      for (const c of W.clans) { acquireGoods(W, c); if (P) pm('acquireGoods'); procure(W, c); if (P) pm('procure'); }
      farmingMonth(W); if (P) pm('farmingMonth');
      foundingMonth(W); if (P) pm('foundingMonth');
      landScan(W); if (P) pm('landScan');
      seaMonth(W); if (P) pm('seaMonth');
      playerEvents(W); if (P) pm('playerEvents');
      fogMonth(W); if (P) pm('fogMonth');
      slaveMonth(W); if (P) pm('slaveMonth');
      warParties(W); if (P) pm('warParties');
      paybackMonth(W); if (P) pm('paybackMonth');
      if (W.week % 12 === 0) { claimsTrips(W); if (P) pm('claimsTrips'); aiClaims(W); if (P) pm('aiClaims'); }
      traderMonth(W); if (P) pm('traderMonth');
      updateSettlements(W); if (P) pm('updateSettlements');
      for (const c of W.clans) { procureOre(W, c); if (P) pm('procureOre'); }
      playerMonth(W); if (P) pm('playerMonth');
      for (const t of [...W.tribes]) {
        if (!t.alive) continue; updateLeaders(W, t); if (P) pm('updateLeaders'); marriages(W, t); if (P) pm('marriages'); seekSpouses(W, t); if (P) pm('seekSpouses'); households(W, t); if (P) pm('households'); disputes(W, t); if (P) pm('disputes'); sharing(W, t); if (P) pm('sharing');
        if (t.clans.length > 1) { const a = pick(t.clans, W.rand), b = pick(t.clans, W.rand); if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < 60000) exchange(W, a, b); if (P) pm('exchange'); }
      }
      revenge(W); if (P) pm('revenge'); interTribe(W); if (P) pm('interTribe');
      for (const t of [...W.tribes]) { if (!t.alive) continue; clanFission(W, t); if (P) pm('clanFission'); clanMerge(W, t); if (P) pm('clanMerge'); }
      for (const t of [...W.tribes]) { if (t.alive) { tribeFission(W, t); if (P) pm('tribeFission'); } }
      for (const t of [...W.tribes]) { if (t.alive) { tribeMerge(W, t); if (P) pm('tribeMerge'); } }
      for (const c of [...W.clans]) { if (c.alive) { decideMove(W, c); if (P) pm('decideMove'); } if (c.alive && !c.people.length) { removeClan(W, c); if (P) pm('removeClan'); } }
      if (W.week % 8 === 0) { decayRelations(W); if (P) pm('decayRelations'); }
    }
    if (W.week % 52 === 40) { for (const t of [...W.tribes]) if (t.alive) { tribeHomeUpdate(W, t); if (P) pm('tribeHomeUpdate'); } confedYear(W); if (P) pm('confedYear'); ruleYear(W); if (P) pm('ruleYear'); sightYear(W); if (P) pm('sightYear'); }
    W.week++;
    runAuto(W); if (P) pm('runAuto');
    if (W.week % 52 === 0) { yearEnd(W); if (P) pm('yearEnd'); }
    if (P) { PROF.win.ticks++; if (PROF.win.ticks >= PROF.every) profFlush(W); }
  }

  return { bondWord, tribeKnown, liveSigns, walkWord, SIGN_R, N, CELL, WORLD, HA, FORAGE_R, TRIBE_MAX, tribeMax, BIOMES, GROVES, DEPOSITS, GOOD_NAMES, createWorld, seedFirstPop, step, clanSize, tribeSize, battleOdds, warSides, warBegin, realmWarcall, familiesOf, famMembers, needsWeek, opinion, prestige, isAllied, sameConfed, tribeCenter, roadLevel, pactRoute, playerActions, doAction, dealings, settleFeud, policy: W => pol(W), setPolicy: (W, k, v) => { const p = pol(W); if (k === 'deal' || !(k in p) || (v !== 'ask' && !(AUTOIX[k] && v in AUTOIX[k]))) return; p[k] = v; }, setDeal: (W, id, v) => { if (v === 'auto') delete pol(W).deal[id]; else pol(W).deal[id] = v; }, dealMode: (W, o) => dealWith(W, o), clanHeir, FAITHS, isMatri, faithOf, cultureName, MON, checkPlace, und, speechWord, kultInfo, grainInfo, clanFlow, HOME_R, CREATION, claimsYear, foreignHeld, landLive, landScan, landYear, driveOutOdds, leaveOdds, landTargets, ring, ringSay, BEASTS, beastNm, beastTale, beastOdds, beastWhere, beastToll, beastNear, saveGame, loadGame, saveInfo, ruleInfo, advice, legacy, legacyHTML, TRAITS, epithet, hasTrait, leadWeight, standingWhy, villageInfo, RANKS, SOCIETY, societyOf, rankOf, WORKS, JOBS, walls, canBuild, releaseClaim: (W, i) => { const P = W.player; if (P && P.claims && P.claims[i]) { houseNote(W, `The house gave up its claim to the ${DEPOSITS[P.claims[i].d.type].name.toLowerCase()}.`); P.claims.splice(i, 1); } }, weaponsName, houseSlaves, slaveCount, freeCount, knows, knowsTribe, foodDays, GIFTABLE, STAGES, BOAT_STAGES, METAL_STAGES, boatStage, metalStage, arms, canReach, houseCandidates, choosePlayer, resolve, dynMembers, bloodCount, titlesOf, relWord, vigor, tribeVigor, statureCm, farmSuit, fieldInfo, potential, cellFood, foodBreakdown, kingshipBid, warriors, tribeWealth, confedTribes, confedPeople, newConfed, joinConfed, leaveConfed, formAlliance, kinOf, rulerWord, realmWord, realmInfo, realmHeir, realmRisk, realmPutDown, realmWarList, realmRiseOdds, realmStay, realmNext, realmKingdomNeeds, succession, confedYear,
    seasonOf, seasonName, tempOffset, cellAt, lifeStage, siler, fecund, makePerson, stepPop, prof: PROF };
})();
if (typeof module !== 'undefined') module.exports = SIM;
