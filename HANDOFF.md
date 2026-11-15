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
| Roads and trade-pact roads | `roadsYear`, `pactRoads` |
| Farming and clearing fields | `fieldsYear` |
| Crafts | `craftsYear` |
| Great beasts | `beast*` |
| Myths, legends, omens | `mythYear`, `legendOf` |
| Stories that come back | `chains*` |
| Treasures | `addTreasure` |
| Walking a story | `walk` |
| Fog of war | `reveal`, `fogMonth` |

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
- **Way of working:** Dustin likes the strongest model to plan and check, with cheaper agents building and play-testing, and every claim checked before it is reported.

## Where things stand (15 November 2026)
This round (GitHub issues #1 to #3, built by agent engineers from briefs, each checked by two skeptics, then play-tested on the combined build):
- **Signs of other peoples (#1).** Signs reach 340 km; hunters find them yearly and traders bring tales; the explore deed follows a sign straight to a people (camps within 150 km, or peoples the house has a sign of). First contact when exploring: 5.5 years on average over eight seeds (was 25).
- **War with risk (#2).** A raided clan may strike back within six years (`c.wrong`, `paybackMonth`); the raiders' card, the raid deed (including the head's own risk) and the realm war deed show the chances they roll; a peace binds both sides; a ruler can call off a war; a house whose tribe is attacked while it does not lead gets a card (send the men or keep them home). Subjects are no longer called allies.
- **Quieter late game (#3).** Standing orders for eight routine card types, set from the card; renown counts only the blood in the house's tribe (at most 200); a note when a child head is fostered; a cheaper `stepEnv` (bit-identical); the realm outline widens when zoomed out.
- Checks on the combined build: fuzz 0 errors; saves and a save from before this round load; head_swap 0; balance on eight seeds: no house ended, world population 2.6% above the old game in total.

Still open or worth doing next:
- The map now shows less the farther out you zoom (issue #5): one mark per people and realm names at whole-isles zoom, joined camps in the middle, everything close in, and an "Every camp" layer switch for the old view. At whole-isles zoom in a big world only a handful of peoples get a name; tap a mark to see which people it is.
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
- **Interface changes:** load `index.html` at phone size with Playwright (Chromium), and look at the screenshots.
- **Family or succession changes:** `node tools/head_swap.js` counts head changes while the old head is alive over ten games. It must say 0.

## Publishing
1. Commit `src/`, the rebuilt `index.html`, and any tools.
2. Push to `main`. GitHub Pages republishes within a minute or two.
3. On Dustin's iPhone, the home-screen app picks up the new version the next time it opens with a connection. If it looks stale, he should close it fully and reopen it.
