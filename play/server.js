// A text front-end to The Isles so the game can be played turn by turn from a shell.
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const http = require('http'), fs = require('fs');
const LOGS = process.env.ISLES_LOGS || require('path').join(__dirname, '..', 'build', 'playlogs'); fs.mkdirSync(LOGS, { recursive: true });
const S = require(process.env.ISLES_SIM || require('path').join(__dirname, '..', 'build', 'sim.js'));
const games = {};
const strip = s => String(s || '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
const yr = w => Math.floor(w / 52), SEAS = ['Winter', 'Spring', 'Summer', 'Autumn'];
const season = w => SEAS[Math.floor(((w % 52) + 4) / 13) % 4];
const DIRS = { E: [1, 0], SE: [1, 1], S: [0, 1], SW: [-1, 1], W: [-1, 0], NW: [-1, -1], N: [0, -1], NE: [1, -1] };
const compass = (dx, dy) => ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
function snapshot(G) {
  const W = G.W, P = W.player; if (!P || P.over || !P.head.alive || !P.head.clan) return;
  const c = P.head.clan, t = c.tribe, y = yr(W.week);
  if (G.timeline.length && G.timeline[G.timeline.length - 1].y === y) return;
  const ppl = c.people, kin = W.clans.reduce((s, o) => s + o.people.filter(q => q.dyn).length, 0);
  G.timeline.push({ y, clan: c.name, clanN: ppl.length, free: S.freeCount(c), kids: ppl.filter(q => q.age < 16).length, womenFertile: ppl.filter(q => q.sex === 'F' && q.age >= 16 && q.age < 45 && !q.slave).length, men: ppl.filter(q => q.sex === 'M' && q.age >= 16 && q.age < 55 && !q.slave).length,
    births: c.last ? c.last.births : 0, deaths: c.last ? c.last.deaths : 0, starv: c.last ? c.last.starv : 0, infD: c.last ? c.last.infD : 0, killed: c.last ? c.last.killed : 0, fed: c.last ? +c.last.fed.toFixed(2) : 1, foodDays: S.foodDays(c), settled: !!c.settled, live: c.live, tribe: t.name, tribeN: S.tribeSize(t), tribeClans: t.clans.length, kin, head: P.head.name, headAge: Math.floor(P.head.age), isClanHead: c.head === P.head, stage: t.stage });
}
function drain(G) { const W = G.W, out = []; while (W.notices && W.notices.length) { const n = W.notices.shift(); out.push(`  * ${n.title}: ${strip(n.text)}`); } return out; }
function newNotes(G) { const P = G.W.player, out = []; if (!P) return out; for (const e of P.hist) if (e.w > G.lastNoteW || (e.w === G.lastNoteW && !G.seen.has(e))) { if (!G.seen.has(e)) { out.push(`  y${yr(e.w)}: ${strip(e.t)}`); G.seen.add(e); } } G.lastNoteW = G.W.week; return out.slice(-25); }
function pendingText(G) {
  const W = G.W, ev = W.pending[0]; if (!ev) return '';
  return `\n>>> DECISION NEEDED (${ev.type}): ${strip(ev.title)}\n${strip(ev.text)}\n` + ev.options.map((o, k) => `   [${k}] ${strip(o.label)}${o.hint ? ' — ' + strip(o.hint) : ''}${o.off ? ' (unavailable)' : ''}`).join('\n') + (S.ringSay ? '\n   Your ring: ' + (S.ringSay(W, ev).filter(r => r.text).map(r => `${r.q.name} (${r.title.toLowerCase()}, ${Math.floor(r.q.age)}): "${r.text}"`).join(' | ') || 'silent on this') : '') + `\n(answer with: choose <number>)`;
}
function state(G, brief) {
  const W = G.W, P = W.player, L = [];
  L.push(`== Game ${G.id} · seed ${G.seed} · ${season(W.week)}, year ${yr(W.week)} ==`);
  if (!P.over && (!P.head.alive || !P.head.clan)) { L.push(`${P.head.name}, head of the house, has just died (${P.head.cause || 'unknown'}). The succession will be settled within the month: advance time.`); return L.join('\n'); }
  if (P.over) { L.push(`THE HOUSE OF ${P.house} HAS ENDED. ${P.hist.length ? strip(P.hist[P.hist.length - 1].t) : ''}`); L.push(`It lasted ${yr(W.week) - G.startY} years, ${P.heads.length} head(s), final renown ${Math.round(P.renown)}.`); return L.join('\n'); }
  const h = P.head, c = h.clan, t = c.tribe, ppl = c.people;
  const heir = S.clanHeir ? S.clanHeir(W, c, h) : null;
  L.push(`House of ${P.house}: head ${h.name} (${h.sex}, ${Math.floor(h.age)})${S.titlesOf(h).length ? ', ' + S.titlesOf(h).map(x => x === 'king' && S.rulerWord && h.clan.tribe.confed ? S.rulerWord(h.clan.tribe.confed, h).toLowerCase() : x === 'headman' && h.sex === 'F' ? 'headwoman' : x === 'clan head' && h.sex === 'F' ? 'clan mother' : x).join(' & ') : ''}. Renown ${Math.round(P.renown)}. Heads so far: ${P.heads.length}. Heir: ${heir ? `${heir.name} (${heir.sex}, ${Math.floor(heir.age)})` : 'NONE'}. Living members of the house (the blood): ${W.clans.reduce((s, o) => s + o.people.filter(q => q.dyn).length, 0)}.`);
  const kids = ppl.filter(q => q.age < 16).length, fw = ppl.filter(q => q.sex === 'F' && q.age >= 16 && q.age < 45 && !q.slave).length, men = ppl.filter(q => q.sex === 'M' && q.age >= 16 && q.age < 55 && !q.slave).length, old = ppl.filter(q => q.age >= 55).length;
  L.push(`Clan ${c.name}: ${ppl.length} people (${men} men of fighting age, ${fw} women of childbearing age, ${kids} children, ${old} elders, ${ppl.filter(q => q.slave).length} slaves). Clan head: ${c.head ? c.head.name : 'none'}${c.head === h ? ' (you)' : ' (NOT you; standing ' + (c.head ? S.prestige(c.head).toFixed(2) : '-') + ' vs yours ' + S.prestige(h).toFixed(2) + ')'}.`);
  const V = c.settled ? S.villageInfo(W, c) : null;
  L.push(`  Lives as: ${c.settled ? `${V.rankName} "${c.village || ''}" (${c.live || 'mixed'})${V.works.length ? ', works: ' + V.works.map(w => w.name).join(', ') : ''}${Object.keys(V.jobs).length ? ', craftsmen: ' + Object.entries(V.jobs).map(([j, n]) => n + ' ' + j).join(', ') : ''}` : (c.toSettle ? 'a camp on its way to settle' : 'a moving camp of foragers')}. Food in store: ${S.foodDays(c)} day${S.foodDays(c) === 1 ? '' : 's'}. Fed last year: ${c.last ? Math.round(c.last.fed * 100) : 100}%. Health ${(c.cond * 100).toFixed(0)}%. Last year in the clan: ${c.last ? `${c.last.births} births, ${c.last.deaths} deaths (${c.last.infD} infants, ${c.last.starv} hunger, ${c.last.killed} killed)` : 'n/a'}.`);
  const gs = Object.entries(c.goods).filter(([k, v]) => v > 0).map(([k, v]) => `${S.GOOD_NAMES[k] || k} ${v}`).join(', ');
  L.push(`  Goods: ${gs || 'none'}. Weapons: ${S.weaponsName ? S.weaponsName(t) : ''}.`);
  const g = S.grainInfo(W, c);
  L.push(`Tribe ${t.name}: ${S.tribeSize(t)} people in ${t.clans.length} clans (${t.clans.map(o => `${o.name} ${S.freeCount ? S.freeCount(o) : o.people.length}`).join(', ')}). Leader: ${t.headman ? t.headman.name + ' of the ' + t.headman.clan.name : 'none'}${t.headman === h ? ' (you)' : ''}. Way of life: ${S.STAGES[t.stage]} (${Math.round(Math.min(1, t.dom / 0.55) * 100)}% toward farming; grain: ${g.state}${g.km ? ' ' + g.km + ' km ' + g.dir : ''}). ${S.cultureName ? S.cultureName(t) : ''}. Speaks ${t.kult ? t.kult.name : '?'}. ${t.confed ? 'Part of a realm.' : ''}`);
  if (!brief) {
    const near = W.deposits.filter(d => S.knows(W, d.x, d.y)).map(d => ({ d, km: Math.hypot(d.x - c.x, d.y - c.y) / 1000 })).filter(o => o.km < 120).sort((a, b) => a.km - b.km).slice(0, 8);
    L.push(`Known resources nearby: ${near.map(o => `${S.DEPOSITS[o.d.type].name} ${Math.round(o.km)} km ${compass(o.d.x - c.x, o.d.y - c.y)}`).join('; ') || 'none known'}.`);
    const others = W.tribes.filter(o => o !== t && S.knowsTribe(W, o)).map(o => ({ o, km: Math.hypot(S.tribeCenter(o)[0] - c.x, S.tribeCenter(o)[1] - c.y) / 1000 })).sort((a, b) => a.km - b.km).slice(0, 6);
    L.push(`Neighbouring tribes: ${others.map(({ o, km }) => `${o.name} (${S.tribeSize(o)} people, ${Math.round(km)} km ${compass(S.tribeCenter(o)[0] - c.x, S.tribeCenter(o)[1] - c.y)}, opinion ${Math.round(S.opinion(t, o))}${S.isAllied(t, o) ? ', ' + S.bondWord(W, t, o).replace(/^your /, '').toUpperCase() : ''}${t.atWar && t.atWar.has(o.id) ? ', AT WAR' : ''}, ${S.speechWord(S.und(t, o))})`).join('; ') || 'none known'}.`);
  }
  return L.join('\n');
}
function deedsText(G) {
  const A = S.playerActions(G.W); G.acts = A;
  return 'DEEDS (use: deed <id> <target#> [force#] or for map places: deed <id> <target#> <DIR> <km>):\n' + A.map(a => `- ${a.id}: ${strip(a.label)} — ${strip(a.hint)}\n    ${a.ok ? 'AVAILABLE' : 'not now: ' + strip(a.why)}${a.forces && a.ok ? '\n    forces: ' + a.forces.map((f, i) => `[${i}] ${f.n} ${f.short}`).join(', ') : ''}${a.ok && a.targets ? '\n' + a.targets.slice(0, 9).map((t, k) => `    [${k}] ${strip(t.label)}${t.hint ? ' — ' + strip(t.hint) : ''}${t.pick ? ` (pick a place: give DIR and km, max ${t.pick.maxKm || '?'} km)` : ''}`).join('\n') : ''}`).join('\n');
}
function cmd(G, line) {
  const W = G.W, P = W.player, a = line.trim().split(/\s+/), op = (a[0] || '').toLowerCase(), out = [];
  const over = () => P.over;
  if (op === 'state') return state(G) + pendingText(G);
  if (op === 'treasures') { if (over() || !P.head.clan) return 'No clan.'; const c = P.head.clan; return `Treasures of the ${c.name}: ` + ((c.treasures || []).map(t => `${t.name} [${t.hist.join('; ')}]`).join(' || ') || 'none') + '\nTreasures elsewhere in your tribe: ' + (c.tribe.clans.filter(x => x !== c).flatMap(x => (x.treasures || []).map(t => `${t.name} (${x.name})`)).join(', ') || 'none'); }
  if (op === 'beasts') { if (over() || !P.head.clan) return 'No clan.'; const c = P.head.clan; return 'Great beasts known: ' + ((W.beasts || []).filter(b => b.alive && (b.name || b.kills)).map(b => `${S.beastNm(b)} (${S.BEASTS[b.kind].a}; killed ${b.kills}, ${b.hunts} failed hunts; ${Math.round(Math.hypot(b.x - c.x, b.y - c.y) / 1000)} km from you)`).join(' | ') || 'none') + '\nSlain or gone: ' + ((W.beasts || []).filter(b => !b.alive && b.name && (b.slain || !b.returned)).map(b => `${b.name} ${b.slain ? 'slain by ' + b.slain.by + ' y' + b.slain.y : 'vanished'}`).join(', ') || 'none'); }
  if (op === 'land') { if (over() || !P.head.clan) return 'No clan.'; const t = P.head.clan.tribe; return `The ${t.name}: ${S.tribeSize(t)} people in ${t.clans.length} clans; claims ${(t.landC || 0) * 25} km2, holds ${(t.landH || 0) * 25} km2; home range ${Math.round((t.homeR || 45000) / 1000)} km. Others: ` + W.tribes.filter(o => o !== t && o.clans.length && S.knowsTribe && S.knowsTribe(W, o)).map(o => `${o.name} ${S.tribeSize(o)}p claims ${(o.landC || 0) * 25} holds ${(o.landH || 0) * 25}`).join('; '); }
  if (op === 'myths') { if (over() || !P.head.clan) return 'The house has ended or the head has just died.'; const t = P.head.clan.tribe; return `Stories the ${t.name} tell (none need be true; all are believed):\n` + (t.myths || []).map(m => `- y${m.y} "${m.title}"${m.kind === 'hero' && m.dyn ? ' [OF YOUR HOUSE]' : ''}: ${strip(m.text)}`).join('\n') + `\nStanding your blood gains from its legends: +${(P.lineage || 0).toFixed(2)}${P.lineageOf && P.lineageOf.length ? ' (' + P.lineageOf.join(', ') + ')' : ''}`; }
  if (op === 'counsel') { const A = S.advice(W); return 'Counsel: ' + (A ? strip(A.text) + (A.deed ? ` (deed: ${A.deed})` : '') : 'nothing pressing.') + '\nAmbitions of this head: ' + ((P.amb || []).map(a => strip(a.text) + (a.done ? ' [DONE]' : '')).join('; ') || 'none') + '\nTraits: ' + ((P.head.traits || []).map(id => S.TRAITS[id] ? S.TRAITS[id].name + ' — ' + S.TRAITS[id].does : id).join('; ') || 'none'); }
  if (op === 'legacy') { return strip(S.legacyHTML(S.legacy(W))); }
  if (op === 'realm') { if (over() || !P.head.clan) return 'No clan.'; const t = P.head.clan.tribe, cf = t.confed; if (!cf) { const b = S.kingshipBid(W, t); return `The ${t.name} belong to no confederacy.` + (b ? ` Bid to unite the tribes: ${b.total.toFixed(1)} of ${b.need.toFixed(1)} needed (${Object.entries(b.parts).map(([k, v]) => k + ' ' + v.toFixed(1)).join(', ')}); allied tribes that would count: ${b.allies.map(o => o.name).join(', ') || 'none'}.` : '') + ` Allies: ${W.tribes.filter(o => o !== t && S.isAllied(t, o)).map(o => o.name).join(', ') || 'none'}. Realms in the world: ${W.confeds.map(c => `${c.name} (${c.members.size} tribes${c.kingdom ? ', kingdom' : ''})`).join('; ') || 'none'}.`; }
    const R = S.realmInfo(W, cf); return `${R.name}: ${R.kingdomSince ? `a kingdom since year ${yr(R.kingdomSince)} (a confederacy from year ${yr(R.since)})` : `a ${R.kind} since year ${yr(R.since)}`}. ${R.rulerWord} ${R.ruler.name} (${R.ruler.sex}, ${Math.floor(R.ruler.age)})${R.ruler === P.head ? ' (YOU)' : ''}, ruling since year ${yr(R.ruledSince)}. Ruling tribe: ${cf.capital.name}.\nHow it is held: ${R.ruleName}. ${R.ruleText}\nIf the ruler died today: ${R.heir ? `${R.heir.who ? R.heir.who.name + ' (' + R.heir.who.sex + ', ' + Math.floor(R.heir.who.age) + ')' : 'nobody'} would follow, ${R.heir.how}${R.heir.child ? ' (a child)' : ''}` : 'no one would follow; the realm would end'}.\nNext step: ${R.next ? `${R.next.label} [deed ${R.next.id}] chance ${R.next.odds == null ? '?' : Math.round(R.next.odds * 100) + '%'}; needs: ${R.next.needs.map(n => (n.ok ? '[met] ' : '[NOT YET] ') + n.text).join('; ')}` : 'none'}\nA kingdom needs: ${R.kingdomNeeds ? R.kingdomNeeds.map(n => (n.ok ? '[met] ' : '[NOT YET] ') + n.text).join('; ') : '(it is a kingdom)'}\nTribes:\n${R.tribes.map(x => `  ${x.t.name}: ${x.statusWord}, ${x.people} people, ${x.warriors} warriors, leader ${x.leader ? x.leader.name : 'none'}, joined y${yr(x.joined)}, feeling toward the ruling tribe ${Math.round(x.feeling)}, ${x.stayWord} (${Math.round(x.stay * 100)}%)`).join('\n')}\nWars: ${R.wars.map(o => o.name).join(', ') || 'none'}. Earlier rulers: ${R.past.join(', ') || 'none'}.`; }
  if (op === 'rule') { if (over() || !P.head.clan) return 'No clan.'; const c = P.head.clan, t = c.tribe; return [c, t].map(e => { const I = S.ruleInfo(W, e); return `${e === c ? 'Clan ' + c.name : 'Tribe ' + t.name}: ${I.name}${I.since != null ? ` (since year ${yr(I.since)})` : ''}. ${strip(I.text)}${I.heir ? ` Would follow today: ${I.heir.who.name}, ${I.heir.how}.` : ''}`; }).join('\n'); }
  if (op === 'known') { let n = 0; for (let i = 0; i < P.known.length; i++) if (P.known[i]) n++; return `Known land and sea: ${n} of ${P.known.length} cells. Peoples known: ${W.tribes.filter(o => S.knowsTribe(W, o)).map(o => o.name).join(', ')}.`; }
  if (op === 'testsetup') { // TEST SET-UP, not part of the game: puts the house in a position to try the late game
    if (over() || !P.head.clan) return 'No clan.'; const h = P.head, c = h.clan, t = c.tribe, near = W.tribes.filter(o => o !== t && o.alive && o.clans.length).sort((x, y) => Math.hypot(S.tribeCenter(x)[0] - c.x, S.tribeCenter(x)[1] - c.y) - Math.hypot(S.tribeCenter(y)[0] - c.x, S.tribeCenter(y)[1] - c.y));
    if (a[1] === 'leader') { c.head = h; c.favored = h; t.headman = h; t.favored = h; return `TEST SET-UP: ${h.name} is now head of the ${c.name} clan and leader of the ${t.name}.`; }
    if (a[1] === 'allies') { const k = +a[2] || 2, got = []; for (const o of near.filter(o => !S.isAllied(t, o)).slice(0, k)) { S.formAlliance(W, t, o); const r = t.rel.get(o.id); if (r) r.op = Math.max(r.op, 45); const r2 = o.rel.get(t.id); if (r2) r2.op = Math.max(r2.op, 45); got.push(o.name); } return `TEST SET-UP: alliances sworn with ${got.join(', ') || 'nobody'}.`; }
    if (a[1] === 'confed') { if (t.confed) return 'Already in a realm.'; c.head = h; c.favored = h; t.headman = h; t.favored = h; const os = near.filter(o => !o.confed).slice(0, +a[2] || 3); const cf = S.newConfed(W, t, h, os); return `TEST SET-UP: ${cf.name} founded with ${os.map(o => o.name).join(', ')}; ${h.name} rules it.`; }
    if (a[1] === 'rule') { const cf = t.confed; if (!cf) return 'No realm.'; cf.rule = clampN(+a[2], 0, 2); cf.ruleSince = W.week - 52 * 12; cf.rulerSince = W.week - 52 * 12; return `TEST SET-UP: the realm's rule is now ${cf.rule}, as if for twelve years.`; }
    if (a[1] === 'village') { t.stage = 3; t.dom = Math.max(t.dom || 0, 0.5); c.settled = true; c.live = 'farm'; c.village = c.village || (c.name + 'stead'); c.soil = c.soil || 1; c.works = c.works || {}; c.works.hall = c.works.hall || W.week; c.grain = (c.grain || 0) + S.needsWeek(c) * 40; return `TEST SET-UP: the ${c.name} clan now lives in a farming village with a great hall and forty weeks of grain.`; }
    if (a[1] === 'age') { h.age = +a[2] || 90; return `TEST SET-UP: ${h.name} is now ${Math.floor(h.age)} years old.`; }
    if (a[1] === 'food') { c.grain = (c.grain || 0) + S.needsWeek(c) * (+a[2] || 30); return 'TEST SET-UP: food added.'; }
    return 'testsetup leader | allies [n] | confed [n] | rule <0|1|2> | village | age <years> | food [weeks]   (TEST SET-UP only: none of this is part of the game; say in your report when you used it)';
  }
  if (op === 'deeds') return over() ? 'The house has ended.' : deedsText(G);
  if (op === 'log') return P.hist.slice(-(+a[1] || 20)).map(e => `y${yr(e.w)}: ${strip(e.t)}`).join('\n');
  if (op === 'chronicle') return W.events.slice(-(+a[1] || 15)).map(e => `y${yr(e.week)}: ${strip(e.text)}`).join('\n');
  if (op === 'family') { if (over() || !P.head.clan) return 'The house has ended or the head has just died.'; const h = P.head, c = h.clan, heir = S.clanHeir(W, c, h), d = q => `${q.name} ${q.sex} ${Math.floor(q.age)}`, here = c.people.filter(q => q !== h && !q.slave);
    const ch = q => q.father === h || q.mother === h, sib = q => !!((h.father && q.father === h.father) || (h.mother && q.mother === h.mother));
    return `Head: ${d(h)} (person id ${h.id}), clan ${c.name} of the ${c.tribe.name}. Heads so far: ${P.heads.map(x => x.name).join(' > ')}\n` +
      `Spouse(s): ${here.filter(q => q.spouse === h || h.spouse === q).map(d).join(', ') || 'none'}\nHeir: ${heir ? d(heir) + ' — ' + S.relWord(heir, h) : 'NONE'}\n` +
      `Household of the head (${h.fam ? 'headed by ' + (h.fam.head ? h.fam.head.name : '?') : 'none'}): ${c.people.filter(q => q.fam === h.fam).map(d).join(', ')}\n` +
      `Children in clan: ${here.filter(ch).map(d).join(', ') || 'none'}\nParents in clan: ${here.filter(q => q === h.father || q === h.mother).map(d).join(', ') || 'none'}\nSiblings in clan: ${here.filter(sib).map(d).join(', ') || 'none'}\n` +
      `Others of the blood in clan: ${here.filter(q => q.dyn && !ch(q) && !sib(q) && q !== h.father && q !== h.mother).map(d).join(', ') || 'none'}\nBlood living in other clans: ${W.clans.reduce((n, o) => n + (o === c ? 0 : o.people.filter(q => q.dyn).length), 0)}`; }
  if (op === 'people') { if (over() || !P.head.clan) return 'The house has ended or the head has just died.'; const c = P.head.clan; return c.people.slice().sort((x, y) => y.age - x.age).map(q => `${q.name} ${q.sex} ${Math.floor(q.age)}${q.dyn ? ' [house]' : ''}${q.slave ? ' [slave]' : ''}${q.job ? ' [' + q.job + ']' : ''}${q.spouse && q.spouse.alive ? ' married' : ''}${q.preg > 0 ? ' pregnant' : ''}${q === c.head ? ' CLAN HEAD' : ''}`).join('\n'); }
  if (op === 'policy') { if (!a[1]) return JSON.stringify(S.policy(W)) + '\nblood: revenge|comp|forgive|ask · threat: comp|guard|ignore|ask · raid: fight|pay|flee|ask · quarrel: peace|stand|fight|ask'; S.setPolicy(W, a[1], a[2]); return 'Standing orders: ' + JSON.stringify(S.policy(W)); }
  if (op === 'auto') { if (a[1]) { if (a[2] === 'off') delete G.auto[a[1]]; else G.auto[a[1]] = +a[2]; } return 'Auto-answers by decision type: ' + JSON.stringify(G.auto); }
  if (op === 'timeline') return G.timeline.filter((r, i) => i % (+a[1] || 5) === 0).map(r => `y${r.y} clan ${r.clanN} (kids ${r.kids}, fertile women ${r.womenFertile}, men ${r.men}) fed ${r.fed} tribe ${r.tribeN}/${r.tribeClans} clans kin ${r.kin}`).join('\n') + '\n(use `flow [years]` for who came and went)';
  if (op === 'flow') { const F = S.clanFlow(W, +a[1] || 10); return `Your clan over the last ${F.years} years — IN: ${F.born} born, ${F.marriedIn} married in, ${F.joined} joined, ${F.slaves} slaves taken. OUT: ${F.died} died (${F.infants} infants, ${F.killed} killed), ${F.marriedOut} married out, ${F.split} left to found a new clan, ${F.left} moved away, ${F.captured} carried off. Now ${F.women} women of childbearing age (${F.wives} married). The clan splits when it passes ${F.splitAt} people.`; }
  if (op === 'choose') {
    const ev = W.pending[0]; if (!ev) return 'No decision is waiting.'; const k = +a[1]; if (!(k >= 0 && k < ev.options.length)) return 'Choose a number from the list.' + pendingText(G);
    W.lastResult = null; S.resolve(W, ev, k); G.choices.push({ y: yr(W.week), type: ev.type, k });
    if (W.lastResult) { out.push(`RESULT — ${strip(W.lastResult.title)}: ${strip(W.lastResult.text)}`); W.lastResult = null; }
    out.push(...newNotes(G), ...drain(G)); return (out.join('\n') || 'Done.') + pendingText(G);
  }
  if (op === 'deed') {
    if (over()) return 'The house has ended.'; if (W.pending.length) return 'Answer the waiting decision first.' + pendingText(G);
    const A = S.playerActions(W), act = A.find(x => x.id === a[1]); if (!act) return 'No such deed. Type: deeds'; if (!act.ok) return `Not possible now: ${strip(act.why)}`;
    if (a[2] != null && !/^\d+$/.test(a[2])) return `The target must be a number from the deeds list (you gave "${a[2]}").`; if (act.targets && act.targets.length && +a[2] >= act.targets.length) return `There is no target ${a[2]} for that deed.`;
    const k = +a[2] || 0, tg = act.targets && act.targets[k]; let f = 0, place = null;
    if (tg && tg.pick) { const d = DIRS[(a[3] || '').toUpperCase()], km = +a[4]; if (!d || !(km > 0)) return 'This deed needs a place: deed ' + act.id + ' ' + k + ' <N|NE|E|SE|S|SW|W|NW> <km>'; const n = Math.hypot(d[0], d[1]), c = P.head.clan; place = { x: c.x + d[0] / n * km * 1000, y: c.y + d[1] / n * km * 1000 }; const err = S.checkPlace(W, act.id, place.x, place.y); if (err) return 'That place will not do: ' + strip(err); }
    else f = +a[3] || 0;
    const R = S.doAction(W, act.id, k, f, place); G.deeds.push({ y: yr(W.week), id: act.id });
    out.push(R ? `RESULT — ${strip(R.title)}: ${strip(R.text)}` : 'Nothing happened.'); out.push(...newNotes(G), ...drain(G)); return out.join('\n') + pendingText(G);
  }
  if (op === 'adv') {
    if (over()) return state(G); if (W.pending.length) return 'Answer the waiting decision first.' + pendingText(G);
    const weeks = Math.round(Math.min(20, +a[1] || 1) * 52); let n = 0;
    for (; n < weeks && !over(); n++) {
      S.step(W); if (W.week % 52 === 1) snapshot(G);
      while (W.pending.length && G.auto[W.pending[0].type] != null) { const ev = W.pending[0], k = Math.min(G.auto[ev.type], ev.options.length - 1); W.lastResult = null; S.resolve(W, ev, k); out.push(`  (auto-answered ${ev.type} "${strip(ev.title)}" with [${k}] ${strip(ev.options[k].label)}${W.lastResult ? ' → ' + strip(W.lastResult.title) : ''})`); W.lastResult = null; }
      if (W.pending.length) break;
    }
    fs.writeFileSync(require('path').join(LOGS, `g${G.id}.json`), JSON.stringify({ seed: G.seed, timeline: G.timeline, choices: G.choices, deeds: G.deeds, over: over(), endY: yr(W.week), hist: P.hist.map(e => ({ y: yr(e.w), t: strip(e.t) })) }));
    const notes = newNotes(G), nts = drain(G);
    return `Advanced ${(n / 52).toFixed(1)} years.\n` + (out.length ? out.join('\n') + '\n' : '') + (notes.length ? 'House notes:\n' + notes.join('\n') + '\n' : '') + (nts.length ? 'Notices:\n' + nts.slice(-12).join('\n') + '\n' : '') + state(G, true) + pendingText(G);
  }
  return 'Commands: state | adv <years> | choose <n> | deeds | deed <id> <target#> [force# | DIR km] | people | log [n] | chronicle [n] | timeline [step] | flow [years] | policy [key value] | auto <decisionType> <n|off> | myths | counsel | legacy | treasures | beasts | land | family | realm | rule | known | testsetup ...';
}
function newGame(id, seed, pick) {
  const W = S.createWorld(seed); S.seedFirstPop(W, 4); const cands = S.houseCandidates(W);
  const idx = Math.min(cands.length - 1, Math.max(0, pick || 0)); S.choosePlayer(W, cands[idx].head);
  const G = games[id] = { id, seed, W, auto: {}, timeline: [], choices: [], deeds: [], lastNoteW: -1, seen: new Set(), startY: yr(W.week) }; snapshot(G);
  return `New world (seed ${seed}). You play the house of ${cands[idx].head.name}, picked from ${cands.length} founding households (index ${idx}).\n` + state(G) + '\n\n' + cmd(G, 'help');
}
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), id = u.searchParams.get('g') || '1', c = u.searchParams.get('c') || 'state'; let out;
  try {
    const parts = c.split(';').map(s => s.trim()).filter(Boolean), outs = [];
    for (const p of parts) { const a = p.split(/\s+/);
      if (a[0] === 'new') outs.push(newGame(id, +a[1] || 1, +a[2] || 0)); else if (!games[id]) outs.push(`No game ${id} yet. Start one with: new <seed> [household#]`); else outs.push(cmd(games[id], p)); }
    out = outs.join('\n\n');
  } catch (e) { out = 'ERROR: ' + (e && e.stack || e); fs.appendFileSync(require('path').join(LOGS, 'errors.log'), `${id} ${c}\n${e && e.stack}\n\n`); }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(out + '\n');
}).listen(+(process.env.ISLES_PORT || 7717), '127.0.0.1', () => console.log('isles server on ' + (process.env.ISLES_PORT || 7717)));
