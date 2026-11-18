# The Isles: handoff

The Isles is an emergent world simulation game. The world is two islands of about 1,000 km on a side, with northern-European country. Stone-age peoples grow up on them from a few founding households: families, clans, tribes, crafts, farming, metal, myths, wars and realms. None of it is scripted.

The player leads one house (a dynasty) inside a clan inside a tribe, generation after generation. The world runs by itself. It stops for decisions (cards with two to four choices), and the head of the house can do deeds under Act. The look is ink and watercolour on parchment, in the spirit of King of Dragon Pass but original. The owner, Dustin, plays it on an iPhone as a home-screen web app.

- Play: https://dustinf1sch3r-dotcom.github.io/The-isles/ (capital T)
- Repository: https://github.com/dustinf1sch3r-dotcom/The-isles

## Layout

| Path | What it is |
|---|---|
| `src/geo.js` | World generation: terrain, biomes, rivers, deposits, game animals, the weekly environment step. About 30 KB. |
| `src/soc.js` | The society simulation and all game rules. One long closure, about 590 KB. Most work happens here. |
| `src/art.js` | Sprites, portraits and plates, drawn in code in an ink-and-wash style. |
| `src/ui.js` | The interface: map drawing, panels and tabs, decision cards, the deeds sheet, saving. |
| `src/shell.html` | Page shell: CSS, help text, home-screen app tags. `/*SIM*/` and `/*UI*/` are filled in by the build. |
| `build.sh` | Builds `build/sim.js` (usable from node) and `index.html` (the page GitHub Pages serves), and syntax-checks both. |
| `index.html` | **Built output, committed**, because GitHub Pages serves it. Always rebuild before committing. Never edit it by hand. |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | Make it installable on the home screen and playable offline. `sw.js` fetches network-first and falls back to its cache, so a new `index.html` reaches the phone the next time it is opened online. |
| `tools/fuzz.js` | Randomised play: random answers, random deeds. `node tools/fuzz.js 2,7,14 130` (seeds, years) must end with `errors 0` and print no `BAD TEXT` lines. |
| `tools/balance.js` | Unattended play, always option 0. `node tools/balance.js 5,8,11,14 120` prints houses that died out, the share of years the player's clan was dangerously small, and world population. Compare before and after any rule change. |
| `tools/save_roundtrip.js` | Save, load and play on. |
| `tools/head_swap.js` | Ten games: counts head changes while the old head lives, heads moving clan, and heads changing household (a child head fostered after the household breaks up is expected). |
| `tools/discovery.js`, `raids.js`, `wars.js`, `stops.js` | Feature measures: how soon a house meets another people (passive and exploring), raids and paybacks in raid-every-chance play, realm wars and their outcomes, cards that stop play by type. Each takes `ISLES_SIM=<path to a sim.js>` to measure another build (for example the one before a change). `balance.js`, `fuzz.js` and `head_swap.js` always use `../build/sim.js`. |
| `tools/roads.js`, `tools/same_but_roads.js` | Roads: `node tools/roads.js 2,7,21,33 200` prints km of track, path and road and the cells they touch every 50 years. `SIM_A=<old sim.js> node tools/same_but_roads.js 5,11,14` proves a road change alters nothing but the roads. |
| `tools/land.js` | Land taken by a village: `node tools/land.js` (seeds 2,7,21,33,5,14, 200 years) counts villages raised on another people's claim, the land that passes, demands and drives by the world and their outcomes, villages sent off (and how often they had to go as wanderers). |
| `tools/map_shots.js`, `tools/map_speed.js` | The map in a browser at phone size (Playwright). `node tools/map_shots.js <index.html> <outdir> <save.sav>` shoots the same spots and zooms on any build (the house's village, a fishing village, a walled village with a hall and ditch, a village with a palisade only, camps, a gathering place, the whole isles) so two builds can be compared shot by shot. `node tools/map_speed.js <save.sav> old=<index.html> new=<index.html>` times the map draw over a zoom sweep and a pan, builds interleaved; run it twice, the noise is 5 to 10%. Use a late-game save (many villages); saves are made with Save to file in the game menu. |
| `tools/profile.js`, `tools/profile_map.js`, `SIM.prof` | Time each system of the simulation. `SIM.prof` (soc.js, module scope, off by default: one boolean test per timed spot when off) laps every call in `step()` and the three parts of `stepPop` (movement, food, births/deaths) into systems: movement, food, births/deaths, social/clan, conflict, trade/goods, environment, bookkeeping, and rendering in the page. Every 100 ticks it prints ms per tick and share per system. `node tools/profile.js <save.sav|seed> <ticks> [--triple] [--save <path>] [--every 100]` runs it in node (`--triple` adds two copies of every clan but the player's, for a 3x world); `node tools/profile_map.js` plays the page at 16x with `?prof` and splits rendering from simulation (the browser clock ticks in 0.1 ms, so take the per-system split from node). In the game, open the page with `?prof` and read the console. |
| `tools/same.js` | `SIM_A=<sim.js> SIM_B=<sim.js> node tools/same.js 5,11,14` proves two builds give bit-identical worlds (for speed work that must not change results). |
| `play/server.js`, `play/isles` | A text front-end for play-testing from a shell: `node play/server.js &` then `./play/isles 1 "new 5; adv 5; state; deeds"`. `docs/TESTER.md` documents its commands. It also has `testsetup` commands that jump to the late game for testing. |
| `docs/` | Briefs used for agent engineers and testers, and the last test reports. |

## Reading the code

Lines are very long, often a whole function on one line. Do not print whole files or lines: use `grep -n "name" src/soc.js | cut -c1-400`, or `sed -n 1300,1340p src/soc.js | cut -c1-600`.

**Core model:**
- Time is in weeks (`W.week`, 52 a year).
- `W.rand()` is the seeded random number. Never use `Math.random` in the sim.
- The map is a grid of `N` x `N` cells (200, each 5 km), with index `i = y*N + x`.
- People: `{name, sex, age, alive, clan, fam (household), spouse, mother, father, dyn (of the player's blood), slave}`.
- Clans: `{people, head, tribe, x, y, store, grain, goods, settled, village, live, works, rule}`.
- Tribes: `{clans, headman, stage (0 to 3, 2 sows grain, 3 settled villages), rel (Map of relations), confed, myths, rule}`.
- Realms: `W.confeds`, each `{capital, king, members (Map of tribe id to status core/ally/subject), rule 0/1/2, kingdom}`.

**The player:**
- `W.player` (P) has `{head, heads, hist (house notes), known (fog of war), cool (cooldowns)}`.
- `houseNote`, `notice` and `pushEvent` report to the player.
- `resolve(W, ev, k)` answers decisions.
- `playerActions(W)` lists deeds, each with `{id, label, hint, ok, why, targets}`.
- `doAction0` carries a deed out.

**Saving:**
- `saveGame` / `loadGame` serialise the world.
- New fields must be optional, read with a fallback, so old saves still load.

**The interface:**
- `draw()` paints the map from caches keyed on version numbers (`W.claimVer`, `W.roadsVer`, `P.knownVer`, `W.farmVer`). Nothing per-frame may walk all cells or all people.
- `renderPanel()` builds the side panel.
- `window.__dbg` exposes the world for browser tests.

**Main systems:**

| System | Where to look |
|---|---|
| Families and marriage | `marry`, `uxorilocal` |
| Clans splitting and merging | `clanFission`, `clanMerge` |
| Leaders | `updateLeaders`, plus clan and tribe `rule` (by standing, for life, by blood) |
| Tribal lands | `claimsYear` |
| Raids, feuds, blood-price | `raid`, `raidCore` |
| Confederacies and kingdoms | the section "CONFEDERATIONS & KINGS"; `realm*` functions; `succession`; `confedYear` |
| Subjects sharing their map | `sight*` |
| Roads and trade-pact roads | `roadsYear`, `pactRoads`, `routeCells` (A* that prefers ways already trodden) |
| Land taken by a village | the section "LAND TAKEN BY A VILLAGE": `landScan`, `landYear`, `landAsk`, `landFight`, `landExpel`, `landGiveBack`, the deeds `landask` and `landdrive` |
| Farming and clearing fields | `fieldsYear` |
| Crafts | `craftsYear` |
| Great beasts | `beast*` |
| Myths, legends, omens | `mythYear`, `legendOf` |
| Stories that come back | `chains*` |
| Treasures | `addTreasure` |
| Walking a story | `walk` |
| Fog of war | `reveal`, `fogMonth` |
| Villages, camps and fires on the map | ui.js `draw()`: `vplace` and `vlayout` (houses, ring, gate, kept per village in `VC`, a WeakMap, so no drawing cache is ever saved), `palRuns`, `palGate`, `palLintel`, `palEnd` (palisade), `drawDitch` and `ditchFlush` (ditch and bank), `shoreProf` and `shoreAt` (how far dry land runs from a village along 48 rays, measured once in world units through the map's warp and kept in `VC`; the ground, ditch and wall are pulled in to it at every zoom), `seaDir` (which way the sea lies), `roadIndex` and the gate's way out (kept in `VC` per roads version); art.js sprites `vhouse`, `vlong`, `vhall`, `vhut`, `vcanoe`, `vtent`, `vhearth`, and `vpal`, `vditch` for the legend |

## Rules the game keeps (do not break)

1. **Emergent first.** The world's own clans and tribes use every feature by the same rules as the player. The player gets a deed or a decision on top.
2. **The house rule.** The head of the player's house never changes while alive, never leaves the clan by marrying, and a head who marries keeps the household. This was a real bug once; the head-swap check in the testing section guards it.
3. **Honest numbers.** A chance shown in a hint is the number rolled, and a cost stated is the cost charged (`eatStore`).
4. **Voice.** Player-facing text is plain, short and in period. No modern words ("economy", "bonus", "unlock", "level"). The ruler of a confederacy is a "high chief"; only a kingdom has a king or queen (`rulerWord`).
5. **Balance.** `tools/balance.js` should not show more houses dying out or a big shift in population after a change.
6. **Phone first.** Check new screens at 390 px wide, and keep panning smooth.
7. **Old saves load.**

## Dustin's design wishes so far
- **Look:** like King of Dragon Pass, but not a copy. Tribal borders are firm, update, follow the coast and rivers, and do not spill into the sea.
- **Lands:** nothing drifts around inside a tribe's lands. Tribes reach 300 to 400 people. Borders follow population and lingering claims.
- **Realms:** a confederacy has its own clear outline round all member and subject lands, while the tribes inside keep their own borders.
- **Fog:** the fog of war is opaque parchment.
- **Story:** mythology the tribes treat as true, and legends from people and from great beasts.
- **Marriage:** marrying must never switch the player's family.
- **Late game:** confederacies move from a following, to the tribes choosing, to the seat passing by blood, and then to kingdoms. Clans and tribes have the same three steps.
- **Roads and farming:** trade pacts make roads. Clearing fields shows on the map and drives beasts off, and wildlife thins as the land fills.
- **Roads (#12):** fewer ways; people use the ones that exist.
- **Land (#13):** a people whose land is taken by another's village can bid it leave or drive it out by war; the world's tribes do the same.
- **Villages, camps and fires (#15):** drawn like the map's own trees: small houses, tents and hearths in the map's ink and wash, part of the map and not stickers on it. Colour stays with the borders. Names on the map carry no head counts (a tap shows them). Palisade, ditch and hall stay visible: the palisade is a ring of posts standing round the houses (back half behind them, front half in front, a gate), the ditch and bank is hatched like the hills. Zoomed out and zoomed in get equal care. Dustin chose this look from three drafts shown side by side (dark plan blocks, pale plan roofs, pictures like the trees); a first try in plan view read as a heap of logs and was dropped.
- **Way of working:** Dustin likes the strongest model to plan and check, with cheaper agents building and play-testing, and every claim checked before it is reported.

## Where things stand (18 November 2026)
Latest round: timing only, nothing changed in the game (`same.js` finds identical worlds with the profiler off and on; saves are byte-identical). Measured on the year-300 save (10,409 people, 344 clans), 1000 ticks, node, three runs each:
- **1x:** 25 to 27 ms per tick. Social/clan 5.7 ms (22%), food 5.3 (21%), environment 5.2 (21%), bookkeeping 2.4, conflict 2.2, trade/goods 2.0, births/deaths 1.8, movement 0.5.
- **3x** (clans tripled, 31,077 people, 1,030 clans): 79 ms per tick (3.1x). Social/clan 23.3 ms (4.1x), food 16.1 (3.0x), conflict 10.8 (4.9x), bookkeeping 8.9 (3.7x), trade/goods 7.6, environment 5.4 (flat), births/deaths 4.4 (2.4x), movement 2.4.
- **What grows faster than the people:** `marriages` (1.3 to 8.9 ms, 6.6x): for every eligible woman it scores every bachelor in the tribe and nearby friendly tribes, so it goes with the square of a tribe's size. Also `interTribe` 6.7x, `tribeFission` 5.9x, `seekSpouses` 5.8x, `aiClaims` 5.6x, `decideMove` 9.8x (small), `yearEnd` 4.1x. Food's cost is stepPop's per-person pass and is linear; environment follows the land, not the people.
- **Natural growth:** the population does not level off: from the year-300 save it reaches 3.1x by year 100 and 4.9x by year 150 (over 200 ms per tick by then). A naturally grown 3x world costs the same as the tripled one (78 ms per tick), with social/clan the largest at 34%.
- **Rendering** (headless Chromium, 16x speed): 7.7 ms per frame at 1x, 11.8 at 3x (1.5x). Its share of frame time (63% and 74%) mostly reflects the frame loop's sim budget: when a tick costs more, the same tick is drawn more times.
- Found on the way and fixed since (#21): soc.js declared `landNear` twice, the later (a yes/no test of claims) shadowing the point search `stepPop` needs, so clans whose target lay on water lost it and stood still (8 clans, 722 clan-weeks in 10 years from the year-300 save). The claims test is now `claimNear`.

Latest round (issue #19, "huts clip through the palisade"):
- **The front wall stands clear of the houses.** The front half of the palisade is drawn over the houses' feet and its posts rise `ph` (5k) above the ring line, so with the old 2.5k margin it hid the lower part of most front houses (115 to 140 of about 250 houses in walled villages on the year-301 save). The fit now counts the post height in the footprint box (`pP` in `vlayout`), and the corner check tests the front corners at the foot plus `pP`, with its cap raised from 1.15 to 1.3. Measured: 0 houses under a front post at zooms 0.0016, 0.0031, 0.009 and 0.016.
- **Where the shore pulls the front wall in, that stretch is drawn behind the houses** (`palSplit`, the `mid` pass, `V.fs`, `V.hm`, `V.gm`), so a hut at the water stands over the wall instead of the wall cutting across it.
- **A village's own name starts below its real wall and ditch** (`V.nb`), with the old spot as a last fallback; the name boxes keep the old figures, so no other name moves. Checked: none of the 151 names in 20 standard shots lost.
- The wall kept is within 0.4 to 2.6 points of the old build; no village loses more than 2 of its 24 sectors. Close neighbours touch a little more at the far zooms. Zooming and panning stay within about 0 to 10% of the old build.
- What did not work, for whoever tries again: centring the ring on the houses, hugging it to them per sector, dropping sectors where the shore would cut a house, and moving huts inland. Walls broke apart and zooming got 40% slower (see the notes on issue #19).

## Earlier round (18 November 2026, the palisade)
Issue #19, below.

## Earlier round (17 November 2026, walls and gates)
Issue #17, the open items of #15; built by agent engineers from briefs, each round checked in enlarged crops against the live build and timed with `map_speed.js`):
- **The wall fits the houses** (the ring is sized on the house footprints, so a fishing village crowded on the shore has no bare ring of ground).
- **The gate faces the way out:** toward the strongest road that leaves through the ring, else the land side, else the front. A trodden track runs out through it unless a road already does. A gate on the back half is a gap in the back wall; its posts take the wall's own ink and stand only a little over it, and far out it is only the gap. A front gate's posts ease from 1.9 to 1.35 times the wall's height as you zoom in.
- **The shore:** each village's shore is measured once (48 rays, world units, through the warp) and reused at every zoom; the wall, ditch, trodden ground and the village's edge are pulled in to it, so nothing stands in the sea and a wall closes against the shore with an end post. Each ring's 24 sector shares are solved directly against the profile (a quadratic, refined once; the old bisection only as a guard) and kept in `VC(S).shc` while the ring's world shape holds (size to 5%, centre to half a cell). Below zoom 5.3 there is no shore fit (a plain ellipse, as before).
- **Speed:** `map_speed.js` on the year-301 save, three runs against the live build: zooming 0 to 9% slower (at most about 0.5 ms a frame), panning no slower. Villages are laid out again every few frames while zooming (`vplace` key), in the live build too; that is where the remaining cost is.
- **Villages sharing a name** (`src/soc.js`): new names are fresh (`freshName`); a clan carrying a name keeps it when the village moves as a whole or rejoins it, and takes a fresh name only when that name is still held by a village elsewhere (`villageAt`); `updateSettlements` renames the later of two groups that still meet on one name (the player's village is never renamed) with a short note in its chronicle, and never lists a record twice. Old saves with a twice-listed record are put right on the next update. `tools/places.js` (seeds, years; `SIM=` another build) counts places, twice-listed records, orphaned clans, shared names and renames every 25 years; `tools/places_moves.js` checks that moving villages keep their names.

Still open:
- At the default zoom (0.0016) a village is about 40 px across and its gate is a gap of two or three px: the wall reads, the gate only from about 0.003 inward.
- The gate's way out is kept (`VC(S).gc`) while the roads and the ring's size (to about 90%) hold, so a village with two roads can show its gate on one road when you open the map close in and on the other when you pinch in from far out. Both are on a road.
- The direct sector solve differs from the old bisection by more than 0.03 in about 5% of sectors, mostly rounding; a handful flip at the share thresholds (a sector of ditch kept or dropped). No visible fault was found in the shots.
- Luwick at 0.009: a lone end post at the far left of a faint stretch of wall (the live build has a similar stub).

## Earlier round (17 November 2026, villages, camps and fires)
Issue #15, the look of villages, camps and gathering fires; three drafts built by agent engineers and shown to Dustin side by side, the chosen one finished, each round checked by a visual critic and a code skeptic):
- **Villages** are huddles of little thatched houses, longhouses and a great hall in the map's ink and wash, in a ring or along a lane; fishing huts face the shore with a canoe at the water's edge. The trodden ground and the ditch and bank lie under the land tint; houses and the palisade stand over it. The ring, ditch and name are centred on the houses, not on the bare village point.
- **Palisade** (`works.pal`): a band of pointed oak posts on the ground ellipse, back half drawn lighter before the houses, front half after them, a gate with taller posts and a lintel; where the sea cuts the ring a taller post ends each run. **Ditch and bank** (`works.ditch`): a band of darker earth with an inked bank and hachures, a causeway at the gate, never on the sea.
- **Camps** are hide tents (no flags, no tribe colour), **gathering places** a ring of stones with a small flame; the hungry ring is red-ochre. The whole-isles view keeps one mark per people (three houses, or one to three tents). Names: villages and camps without head counts; a group of camps reads "N camps". Legend: new pictures, plus Palisade and Ditch and bank.
- Speed: the map draw is cached per village and batched; the nearest-village search runs along a sorted row. Two clean runs of `map_speed.js` on a 150-village save: see the PR for #15.
- Checks on the final build: fuzz 0 errors and no BAD TEXT; save_roundtrip passes; taps on a village, a gathering place and a camp give the same results as before; a save made with the new build reloads and draws; screenshots at 390 px at every zoom.

Its open items (the gate far out, bare ground in shore villages, villages sharing a name) were taken up in #17, above.

## Earlier round (17 November 2026, roads and land)
Issues #12 and #13, built by agent engineers from briefs, each checked by skeptics, then play-tested on the combined build:
- **Roads (#12).** Routes are found by A* that prefers road over path over track (`routeSearch`), so traffic follows the ways that exist; faint tracks fade faster; the whole-isles view draws only paths and roads. Over four seeds at year 200: about 20,000 km of ways against 37,000 before, on 3,400 cells against 5,900. Speed unchanged.
- **Land taken by a village (#13).** When another people's village stands on a tribe's claim, a record is kept for 25 years (`O.seized`). The player gets a card ("Our land is taken": demand they leave, drive them out, let them be) and two deeds under Act (`landask` once in 2 years, `landdrive` once in 3), with the chances rolled shown. The card counts the strongest force the head can call (a tribe's leader calls up the tribe); under Act the player picks the force. The world's tribes demand and drive too (`landYear`), and the player's own village on held ground can be bidden to leave. A village that goes always goes: to free ground beyond the land, or as wanderers if none is free; the land comes back before it leaves; it leaves its wall and works; it keeps off that people's land for 10 years (`c.landFrom`). The settle deed's "Let the elders choose" keeps off other peoples' land. A record against a people who have since become allies, or joined the same realm, is set aside (no demands or drives between friends) and counts again if the bond ends. Every goodwill figure in the land texts comes from `LAND_AFF`, so the text and the charge cannot drift.
- Checks on the combined build: fuzz 0 errors; saves and a save from before this round load; head_swap 0; balance on eight seeds: no house ended, world population within 1% of before; the chance shown was the chance rolled in every case checked, and over about 33 tries in play the outcomes matched the chances.

Still open from this round:
- The world's demands rarely succeed (about 1 in 14): the chance is honest but low, so most land is won back by war.
- Late in long games the same peoples keep seizing and losing ground (on seed 2 about 470 land lines in 260 years, down from 500).
- Moving the player's village onto held ground warns only after the spot is picked.

## Earlier round (15 November 2026)

This round (GitHub issues #1 to #3, built by agent engineers from briefs, each checked by two skeptics, then play-tested on the combined build):
- **Signs of other peoples (#1).** Signs reach 340 km; hunters find them yearly and traders bring tales; the explore deed follows a sign straight to a people (camps within 150 km, or peoples the house has a sign of). First contact when exploring: 5.5 years on average over eight seeds (was 25).
- **War with risk (#2).** A raided clan may strike back within six years (`c.wrong`, `paybackMonth`); the raiders' card, the raid deed (including the head's own risk) and the realm war deed show the chances they roll; a peace binds both sides; a ruler can call off a war; a house whose tribe is attacked while it does not lead gets a card (send the men or keep them home). Subjects are no longer called allies.
- **Quieter late game (#3).** Standing orders for eight routine card types, set from the card; renown counts only the blood in the house's tribe (at most 200); a note when a child head is fostered; a cheaper `stepEnv` (bit-identical); the realm outline widens when zoomed out.
- Checks on the combined build: fuzz 0 errors; saves and a save from before this round load; head_swap 0; balance on eight seeds: no house ended, world population 2.6% above the old game in total.

Still open or worth doing next:
- The map shows less the farther out you zoom (#5) and keeps its names tidy (#8): a name only beside a mark that is drawn and seen, never over fog, under the controls or over marks; at most 8 tribe and 3 realm names at whole-isles zoom. On a crowded island the whole-isles view can show little more than the house's own tribe name; realm names appear when zoomed in. Fields are drawn under rivers and kept off them (#9).
- New deed "Found a daughter village" (#10, `foundvillage`, `foundSites`, `siteWhy`, `spareHouses` in soc.js): a clan head or the tribe's leader sends a quarter to a third of a crowded village to raise a village 12-50 km away; world villages that split for size do the same. `tools/villages.js` counts villages.
- A realm only marches on a people at most 1/1.6 of its strength and within 90 km of its host, so the "send our men or keep them home" card nearly always shows about 0% both ways, and the player's own war deed is rarely reachable in honest play. Realm wars need a rule that makes them closer and more common.
- Late game is slow: about 1.2 seconds a year at year 250 on seed 2 in the text front-end, growing faster than population (per-month loops over all tribes and clans: `kultYear`, `marriages`, `revenge`, `traderMonth`, `slaveMonth`). `stepEnv` was made cheaper but saves only a few percent.
- Seeds whose nearest people is beyond 340 km or across the sea without boats still get no sign (seed 6 met no one by year 19).
- Raiding every chance now costs the house about three times the dead it did (paybacks); no house ended in the tests.
- No world kingdom arose by itself in the tests. The kingdom needs 400 people and a great hall.
- A tribe's leader-for-life can be replaced in one edge case (a woman who led only because no eligible man existed).
- Late-game population runs higher than before, partly from richer fields.

## Testing a change
Do all of these before committing:

- **Build:** `./build.sh` (must print `built`).
- **Fuzz:** `node tools/fuzz.js 2,7,14 130`.
- **Saves:** `node tools/save_roundtrip.js`.
- **Balance:** `node tools/balance.js 5,8,11,14 120` and `node tools/balance.js 2,7,21,33 120`, compared with the result from before the change. Single seeds swing by chance (a change that adds any `W.rand()` call reorders every later roll), so judge the eight together.
- **Old saves:** make a save with the build from before the change (seed 9, year 60, always option 0), load it with the new build and play 30 more years.
- **Interface changes:** load `index.html` at phone size with Playwright (Chromium), and look at the screenshots: `tools/map_shots.js` for the map (old and new build, same save, compare shot by shot), and `tools/map_speed.js` to keep panning and zooming as fast as before.
- **Family or succession changes:** `node tools/head_swap.js` counts head changes while the old head is alive over ten games. It must say 0.

## Publishing
1. Commit `src/`, the rebuilt `index.html`, and any tools.
2. Push to `main`. GitHub Pages republishes within a minute or two.
3. On Dustin's iPhone, the home-screen app picks up the new version the next time it opens with a connection. If it looks stale, he should close it fully and reopen it.
