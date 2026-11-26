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
| `old/index.html` | **A frozen copy of the game as it was before plots (#35) and the phone layout (#36)**, built from main 31ac484, so the owner can trial the new version against it at https://dustinf1sch3r-dotcom.github.io/The-isles/old/. Changed from the built page only so the two copies never share a save: its saves go to IndexedDB `the-isles-old` and localStorage `the-isles-old.*`, its title is "The Isles (old)" (home-screen name "Isles (old)"), it has no manifest link (the manifest would launch the new copy) and it uses `../icon-180.png` and `../sw.js`. `build.sh` never touches it. A game moves between the copies only by Save to a file and Load from a file. Delete the folder when the owner no longer needs it. |
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
- **People:** the population levels off where the land puts it (about 4x the year-300 world, different in each world), by hunting-ground pressure and crowding sickness; no crash (#24).
- **Speed (#26):** make the game faster without changing who marries whom: the same chances, proven, not just similar figures.
- **Tribute (#31):** a head chief receives tribute in food and goods from every tribe of the confederacy. A free member pays a third of a subject's share, at a little goodwill cost, and the same rule holds for everyone, the player paying and receiving alike.
- **Farming (#30):** when a farming tribe joins a tribe that does not sow, the host learns to sow first (the first-fields card, as usual), and settling for good comes with time, as for any tribe. A tribe that chose to keep to the old ways learns nothing: the joined farmers leave their fields and live as their new people do.
- **Fishing villages (#32):** once their people sow, fishing villages keep small fields by the shore (half a farming village's) and keep their catch, everywhere in the world; and the head may turn the village to full farming by a deed, one way, with its real trade stated.
- **Politics (#35):** more internal politics and coups inside the tribe, "without increasing popups": the house plots quietly through deeds, the world's clan heads plot too, and the player hears of it through notices, house notes, the advisor and the Seat list, not new cards.
- **Phone (#36):** the game is played on an iPhone: controls within thumb reach, quiet notices, the house at a glance, deeds in groups, lighter cards, 44 px targets. Desktop stays as it was.
- **Way of working:** Dustin likes the strongest model to plan and check, with cheaper agents building and play-testing, and every claim checked before it is reported.

## Where things stand (25 November 2026), read this first
Main and the live site carry everything up to plots for the seat (#35) and the phone layout (#36), below, after the farming fixes (#30, #32). A frozen copy of the game from before #35 and #36 is at `/old/` (`old/index.html`, its own save slot) so the owner can compare; delete it when no longer wanted. Nothing is in progress.

### Shipped: issue #35, plots for the seat (internal politics without more cards)
Code: the section "PLOTS FOR THE SEAT" in `soc.js` (search `PLOT_TALK`), `seatBlock`/`seatLean` in `ui.js`, help h3 "Plots and the seat".
- **The house's plot** (deed `plot`, Your tribe): for the clan's seat (for the head of the house or one of the blood) or, for a clan head, the tribe's. Each month talk may win one more clan (tribe seat) or household (clan seat): `clamp(PLOT_WIN_BASE + friend + kin + feeling, FLOOR, CAP)` in `playerPlotMonth`. A won clan gets `PLOT_TALK` in `headshipTally`; a won household `PLOT_HOUSE` in `clanChallengeOdds`, so the hint and the roll use one tally. The talk may be heard (then the target's house holds a grudge, and the plot serves about six months more). The house head's own household is never a target to win. A plot ends after `PLOT_YEARS`.
- **Strike** (deed `strike`): the roll for the seat, with the same cooldown as the open challenge; while a plot runs the open challenge for that seat is closed ("Your plot is under way"), so there is one roll per seat.
- **Court a clan** (deed `court`): a gift or two weeks of food, +8 feeling, once a year per clan; the targets show how each clan leans today.
- **The world's plots** (`worldPlotsYear`, `worldPlotsMonth`, `worldStrike`): clan heads plot against headmen (start chance 0.08 a year, `PLOT_VS_START` 0.14 against the player's headman). Old saves ramp up over ten years (`W.plotsFrom`). A plot against the house is hidden until heard: the tribe and clan histories say nothing until then (a won clan's feeling toward you drops with the reason "Talk at the fires"), and the advisor may whisper "Something is said at the X fires". Once heard: the notice "Talk against you", a house note, a rumour line in the Seat list, and a season (13 weeks) before the plotter can move; the house may court the clans or confront (deed `confront`: the clans choose now). The strike brings the old rivalry card (`rivalryText`; `SIM.freshCard` works its chance out again when the card is shown, so the chance shown is the one rolled). The old yearly random rivalry card is gone.
- **The Seat list** (`SIM.seatInfo`, top of House > Tribe, and a lean line on each clan card): who leads, your chance today, who leans which way and why, the rumour and your plot. It is worked out fresh at each call (0.1 to 0.4 ms), with no cache, so it never goes stale.
- **Standing orders** (Dealings): seat, slight, oathback, exback, foundback (`AUTOKEY`, `AUTOIX`, `ROUTINE_POL`).
- **Also fixed on the way:** 'The village of null stands' (a `//` comment in `playerMonth`'s settle line swallowed `c.village = ...`; on main too); a favoured headman of 70 or more steps down when the tribe or clan keeps a custom; `giftPrestige` floor on a failed world strike.
- **How it was made:** three rounds on local branch `feat/plots`, built by a Sonnet builder from a precise brief, each checked by two independent reviewers (world rules measured over 16 to 20 runs of 120 years; the player's view played by touch at 390 px); the last two must-fixes (a hidden plot told in the histories, a stale Seat list after Forgive in Dealings) and the card timing were fixed by the planner and re-run on the reviewers' own reproductions.
- **Balance** (main 3cef7ca against the joined build, 120 years): seeds 5,8,11,14: house ended 0/4 both; clan fell below 12 in 3 games against 2; share of years under 14: 0.033 against 0.015; popups per year 0.51 both; notices 0.42 against 0.38; world population 1014,902,1040,1104 against 1326,874,1514,871. Seeds 2,7,21,33: 0/4, 0 games and 0.002 on both; popups 0.47 against 0.53; notices 0.28 against 0.36; population 1016,1224,1181,928 against 1253,964,1234,1189.
- **Plot speed** (scripted tribe-seat plots with no courting, 79 plots on 5 saves, start chance 8 to 24%): the chance first reaches 50% with at least one clan won after a median of 9 months, counting plots that never got there in 5 years as never (6 among the 64 that did). Clan-seat plots climb by a few points per household and are often heard first.
- **What the owner should hear:** see the PR for #35 and #36. In short: world coups happen about once per tribe-century; plots against the house come about once in 20 to 35 years as headman, about 60% are heard at some point and about half before they strike, and they strike only when the plotter is likely to win (the card's keep chance is usually low: the warning is the time to act); one won or courted clan can swing the seat, because the tally is decided clan by clan (see follow-ups).
- **Follow-ups:**
  - The seat tally is a step, not a climb: `headshipTally` turns feeling into a clan's side over a 16-point band, so one won clan (PLOT_TALK + feeling) can move the chance from about 10% to 100%. A wider band or a lower PLOT_TALK would give a climb, but it changes every challenge in the game; measure before changing.
  - A plot against the house strikes at a plotter's chance of 0.55 (0.4 after three years), so the card usually comes at a keep chance under 45%. Lever: the strike thresholds in `worldPlotsMonth`.
  - The old 'challenge' card from `updateLeaders` still works its chance out when pushed, mid-step; it can differ by a point or two from the roll at the answer, as the rivalry card did before `freshCard`. Give it the same treatment.
  - World clans do not court and do not plot for clan seats. A headman who won his seat by plot holds it for life where the tribe keeps no custom (about 15% of tribes of 3+ clans at any time, against 4.5% before).
  - A plot for the clan's seat has no Seat view of its own: the Seat list and the clan cards' lean lines are for the tribe's seat; the clan plot shows as one plot line (chance and households won), and the Clan tab's household cards keep only the feeling bar.

### Shipped: issue #36, the phone layout
Code: the `max-width:819px` block in `shell.html`, and in `ui.js` `setSpeed`, `toast`/`NOTE_LOG`/`clearNotes`, `foodState`/`houseStrip`, the sheet stops (`setSheet`: peek, half, mid 62vh, full), `GROUPS`/`DEED_GROUP`, `ROUTINE_CARDS`; `SIM.foodWhy` and `SIM.foodLimits` in `soc.js` (read state only, no `W.rand`).
- **Thumb reach:** play, speed and skip are 48 px circles at the bottom left, above the panel; speed opens a row of four.
- **Quiet notices:** on the phone a notice is a chip (tap to read, swipe or cross to dismiss, gone after 7 s, at most 3); the bell in the top bar keeps the last 30, cleared on a new world or a load. Short results of routine cards (`ROUTINE_CARDS`) come as a chip, not a card.
- **Safe areas:** `--sab`/`--sat`/`--sal`/`--sar` from `env()`; with no inset every value is as before.
- **The house at a glance** (top of House > Overview): food in store and grain, how the clan eats and why food is short (`foodWhy`: the range, too few hands, no grain; right for 244 of 247 hungry clans checked against `stepPop`), the seat line from `seatInfo`, and the advisor's first sentence (tap for more).
- **Act in groups:** Your house, Your clan, Your tribe, Other peoples, Faith and lore, Land and villages; deeds that cannot be done now fold into "Not now (N)". Desktop keeps the flat list.
- **Lighter cards:** a compact advisor row; "From now on" is a full-width 44 px row.
- **Targets of 44 px**, a first screen with Load a game and How to play, help with contents, a map menu strip with More, text no smaller than 12 px.
- **Checked:** two independent reviews (phone by touch at 390x844 and 375x667 with simulated safe areas; code, desktop pixel diffs at 1280 and 1024, frame rates, listener counts); `tools/same.js` shows the simulation unchanged by this branch.
- **Follow-ups:** no real iPhone test (safe areas simulated, frame rates headless); landscape on a phone uses the desktop layout; inline name links under about 35 px wide are narrower than 44 px; a chip under the finger is dragged instead of the map. Pre-existing, not from this branch: drawing House > Overview draws on `W.rand` (`advice` -> `playerActions` -> `destinations`, about 700 draws a redraw), so in the browser the world depends on how often the panel is redrawn.

### Shipped: issues #30 and #32, farming fixes and fishing villages that sow
The owner reported that after moving the village the grain stopped (fixed in #28), and then (#30) asked for the farming rules to be made sound; and (#32) "I founded a fishing village, but could never grow grain." The owner chose: a joining farming tribe teaches the host to sow first, and settling for good comes with time; a tribe keeping to the old ways learns nothing; fishing villages both sow small fields and may turn to full farming by a deed.
- **Merge** (`tribeMerge` ~1153, and `farmingMonth` for old saves): when a farming tribe joins a tribe that does not sow, the host's `dom` rises to at most 0.3, the start of stage 2 ("first fields"). The player's tribe gets the first-fields card as usual. Settling for good (stage 3) then comes by the ordinary stage-2 growth (+0.0001 a month per clan, up to 3 clans, more with wild grain): 25 to 65 years. A host that keeps to the old ways learns nothing, and a farm village in a tribe below stage 2 becomes a camp ("Left the fields of X: our people do not sow"). An old save whose stage-0/1 tribe already has a farm village (from the old merge bug) learns to sow the same way at the first farming month.
- **Keep to the old ways** names the cost when villages stand: "...; the farming village goes back to a camp" (or villages, camps).
- **Ground** (`groundAt`, `pickLine` in ui.js): while placing a village (move, settle, daughter village), a tap marks the spot and shows how good the ground is (Rich, Good, Fair, Thin, and an honest share against the present fields); "Build here" re-checks the place and builds. The line is redrawn once a month while a mark stands.
- **Shore** (`checkPlace`, `W.inland`): shore and coast tests read the land's distance from the coast; a fishing village can only be moved along the shore ("On the shore, within 40 km"), checked also inside `doAction`.
- **Walking on** (`walkOn`): a clan led to new lands that finds the ground held walks on 20 to 60 km to free ground a farmer can use. A clan led far now walks all the way before it builds (the stage-3 loop skips a clan of a tribe that moved in the last 5 years while it is more than 5 km from its target); before, it built on the road at the next farming month (100 km short of a 250 km lead). This hardly changes the world's own migrations, which run after the farming month and are short.
- **Worn-out villages of a sowing people rebuild** (`buildArrived`, shared by the stage-2 and stage-3 steps of `farmingMonth`): a worn-out farm village moves 8 to 25 km and is rebuilt when the clan arrives, at stage 2 as at stage 3. Stage 2 never starts a new village. The player's own clan is built by `playerMonth`, with its notice. The player now hears when the fields wear out ("The fields are worn out") and when the village stands again on fresh ground.
- **#32, fishing villages that sow** (`harvest`, `FISH_FIELDS` 0.5): a settled fishing village of a people at stage 2 or more keeps small fields by the shore, half a farming village's, and keeps its catch, everywhere in the world. No field levels; soil wears 0.006 a year (half the farm rate) down to 0.5; it never makes the worn-out move. A fishing camp reaps nothing.
- **Take up farming** (deed `takefarming`, for the head of a settled fishing village whose people sow; one confirm step, "Turn the village to the plough"): the village becomes a farming village, one way. Its hint and result card state the real trade, each line checked against the code: about twice the grain; it may clear fields; the boats still fish while it stands by the shore and it may move inland; stored food keeps less well; women conceive more readily but babies are no longer weaned on fish; no furs in good years and more of the game driven off; fewer killed by beasts and the village no longer gives up when the waters fail. When the soil is under 60% the hint and the card say how many more harvests it will bear before the village must move. The deed is named in the Fields tile, `fieldWhy` and the stage-2 card only where the player can use it (`canTakeFarming`).
- **Weaning floor**: fish and porridge both wean babies sooner, but no sooner than porridge at its fullest (the factor never goes below 0.6, a farm village's best). Before, sowing fishing villages stacked both and had the shortest birth spacing in the game.
- **How it was made:** five rounds on local branch `feat/farming`, each built by a Sonnet builder from a precise brief and checked by independent reviewers (world rules measured, the player's view played by touch at 390 px, code and old saves), then joined to the session branch. Each review's must-fix items were fixed in the next round.
- **Checked on the joined build:** `./build.sh` built; `node tools/fuzz.js 2,7,14 130` errors 0, no BAD TEXT (reviewers also ran 3,9,21 160; 4,11,23 140; 4,11,25 140; 6,17,40 130: all clean); `node tools/save_roundtrip.js` passes; `node tools/head_swap.js` 45 head changes, 0 while the old head lived, 0 moving clan, 3 "new household" lines: seed 17 year 2 (also on main), seed 14 year 76 and seed 26 year 106, both a child head (14 and 15) taken in by kin when no grown-up was left in the household, which is allowed. Old saves (year 110, 200, 220, 300, 600 and others) load and play 5 years with no error and no NaN.
- **Balance** (main 95d65ee against the joined build, 120 years): seeds 5,8,11,14: house ended 0/4 both; clan fell below 12 in 2 games against 3; share of years under 14: 0.025 against 0.033; world population 885,1188,735,1007 against 1014,902,1040,1104. Seeds 2,7,21,33: 0/4, 0 games and 0.002 on both; population 1176,1026,907,991 against 1016,1224,1181,928. The farming rounds traced the one seed-8 swing to chaos from a changed build step (7 of 8 more seeds identical).
- **My own check of the world** (year-300 save, 100 years, two luck shifts, main against the joined build): population 26,729 / 26,689 against 28,344 / 29,068; stage-3 tribes 32 / 44 against 77 / 62; stage-2 13 / 5 against 49 / 90; farm villages 111 / 154 against 240 / 200; sowing fishing villages 0 against 70 / 87; camps 646 / 631 against 553 / 648; clans stuck walking to build 0 on both; no errors, no NaN.
- **What the owner should hear (the world):** farming now spreads by people joining. On the year-300 save after 100 years, more than twice as many tribes are settled farmers as before (mean 97 at stage 3 over five luck shifts, 77 to 132, against 30 to 49 on the old build), with about 58 more at the first fields (old 0 to 12), about twice the farm villages (299 against 142), 9% more people and about a quarter fewer deaths from hunger. Most of it comes from the owner's choice: a host lifted to sowing (dom 0.3) reaches stage 3 by ordinary growth in 25 to 65 years, and splits of such hosts inherit it. Played on to year 460 the gap grows (measured on round 3's build: 215 settled tribes against 50, +24% people). In fresh worlds to year 200 there is no difference beyond chance (few merges happen by then). If the late world should stay closer to the old one, the lever is the stage-2 growth rule (`farmingMonth`: +0.0001 a month per clan with no wild grain), not the merge cap.
- **Sowing fishing villages are a lot of food:** on the year-300 save they reap 11 to 14% of all grain; their births per woman-year sit just under farm villages' after the weaning floor. Take up farming gives about twice the grain but not more people (measured over 15 years: 1.9 times the grain, births per woman-year 0.262 against 0.269).
- **Not done / follow-ups:**
  - `migrateTribe` (hunger and crowding migrations, splits) moves settled villages 30 to 180 km without unsettling them, so about 30% of fishing villages stand inland, in old and new builds alike; with #32 those now sow small fields.
  - `settleClan` can pick tundra within 20 km.
  - The elders' automatic fishing spot has no shore test.
  - A clan's village name stays the same after it moves (and differs from the shared settlement's name on the map).
  - `realmFeastNeed` lets a fishing clan pay a feast with a lean season and a farm village not; the Take up farming card does not say so (minor).
  - `tools/fuzz.js` never reaches Take up farming (it needs a settled fishing head of a sowing people); it was tested by script and by touch.
  - The worn-out notice and the house story's older line "We left our old village, its walls and halls behind" arrive some weeks apart.

### Shipped: issue #31, tribute to the high chief from the whole confederacy
The owner asked that a head chief receive tribute in food and goods from the tribes of the confederacy. Before, only subjects paid (and, in a kingdom, every tribe sent part of a week's food). The owner chose: a third of a subject's weight, a little goodwill cost, and the same rule for everyone, the player both paying and receiving.
- **The rule** (`realmShare`, called from `confedYear` right after the +3 "Feasting under the high chief"): every member that is not a subject, other than the ruler's own tribe (`cf.capital`), pays every year at every stage of the realm.
  - A tribe whose clans' mean condition is below 0.85 (`tribeHungry`, also used by `realmTribute`) sends nothing.
  - Otherwise one clan, drawn by lot, gives the ruler's clan a twentieth (`REALM_ALLY` 0.05) of its store and of its grain.
  - Each of amber, axes, salt, ochre and flint it holds goes, one piece, at one chance in six (`REALM_ALLY_GOOD`).
  - Goodwill toward the ruler's tribe falls by 1, only when something was sent.
- **Subjects** (`realmPay`) now give 15% of their grain as well as their store (half when lightly bound), so the ally's twentieth is truly a third of a subject's share. Before, a farming ally would have paid far more food than a farming subject, because the subject's share left grain alone.
- **Goods cap:** a ruling clan that already holds ten of a good takes no more of it; the piece stays with the payer. Before, a clan holding more than ten (from trade or raids) was cut down to ten.
- **Notes:** one house note a year. The head chief hears from subjects and free tribes together (the kingdom's food, `REALM_SENT`, is folded into the same note); a paying member hears what it sent, and nothing in a year it sent nothing. Texts changed: the ally invitation card (with a kingdom line), the join hint and result, the subject's joining note, the realm panel and the House Realm tab ("sends a light tribute" / "pays tribute"), the leave hint, the kingdom deed hint and the help.
- **Checked:**
  - Notes against what moved: an instrumented copy of the sim recorded every clan's store, grain and goods around each tribute call, in seven player scenarios on the year-300 save (head chief with and without a kingdom, a farming ally, a founding member, an ally in a kingdom, a subject). 0 mismatches, and the food the ruler gained always equalled what the payers lost.
  - Year-300 save over 100 years, old build against new, four luck shifts each:
    - World population at year 400: 25,973 to 27,330 new, 25,737 to 26,803 old.
    - Subjects' mean condition: the same.
    - Subjects leaving per run: 91 to 114 new, 61 to 100 old. The new runs also ended with more subjects.
    - Nothing beyond chance.
  - Balance on both seed sets: byte-identical, since those games never reach a confederacy.
  - The invitation card at 390 px.
- **Not done:** no notice when the player's tribe becomes a paying founding member because the seat moved away (the yearly note tells it).

### Shipped: issue #28, PR #29, live on the site
On the owner's iPhone the date, food and grain stopped changing after moving the village, while the game ran on (the pause button showed ❚❚ and the map moved), and the "A new site" card never showed.
- **Cause:** `frame()` in `src/ui.js` refreshed the top bar (`updateTop`, which writes the date and food) and the side panel only while a flag said no finger was on the panel. A touch on the panel set it; only a lift or leave on the panel cleared it. A phone may send neither after a scroll (it sends a cancel), so the flag could stay set for good. Chromium sends a leave after the cancel, so headless tests never froze.
- **Fix:** the top bar always refreshes. The panel waits only until 2 s after the last press, move or scroll on it (`panelTouchAt`), so nothing can hold it longer.
- **Also fixed:** on a touchscreen, the click that follows the tap placing the village landed on the new result card's backdrop and closed it at once. A card now ignores a backdrop click in its first 0.6 s (`cardAt`).
- **Checked** in a 390 px touch browser, old page against new:
  - With a finger left on the panel (no lift or leave sent), the old page showed 2 dates in 143 weeks of play and the new one 9.
  - The move's result card stayed up on the new page and vanished within 0.1 s on the old.
  - While the panel was scrolled, it was not redrawn on the new page; the old one redrew it mid-scroll.
## Earlier round (19 November 2026, faster marriage matching)
Latest round (issue #26): marriage matching is about five times cheaper once the people reach their ceiling, with the same matches and the same chances.
- **What changed:**
  - **`marriages`:** a tribe gathers its bachelors only in a month when one of its women looks (a fifth of them do). Before, every month it walked its own clans and every friendly clan within 40 km, and that walk was 97% of the cost at the ceiling. No one marries before the first woman looks, so she sees the same men. The friendly-tribe men are gathered by `friendlyMen`, each still taken with chance 0.5 (an ally) or 0.2 (a friend).
  - **Passing over hopeless men:** in `marriages` and `marriagesAt`, a man who could not beat the best score so far even with the largest luck draw (12, or 14 at a gathering) is passed over before the kin check and the draw. The score is summed in the same order as before, so it is the same to the last bit.
  - **`nearClans`:** compares squared distances and uses the exact `Math.hypot` only within a millionth of the rim. It returns the same clans in the same order (a negative reach returns nothing, as before).
  - **`seekSpouses`:** builds each clan's set of mothers of children under 13 once, and runs its cheap tests before `closeKin`.
- **The same matches:**
  - In copies of the old and new builds, the draws whose number or order changed were replaced by a hash of (week, woman or tribe, man, kind). These are the luck in both matchers, the 0.7 same-clan skip at gatherings and the friendly-tribe draws. The worlds then stay identical: seeds 5, 11 and 14 for 150 years; the year-300 save for 40 years; a tripled world for 10; the year-600 ceiling world for 20.
  - A copy whose bound was one point too tight was caught within the first year on the ceiling world and by year 5 on the year-300 save. In 60 years on two fresh seeds it was not caught: few matches there come that close. So the big saves are the sharp test.
  - `nearClans` and `seekSpouses` alone change nothing at all: identical worlds with real luck, 3 seeds, 150 years.
  - With real luck the draws fall differently, so the worlds part, but the marriage figures agree within chance.
    - Six 50-year runs of each build from the year-300 save, about 13,000 marriages each, old then new: 19.4 and 19.3 marriages per 1,000 people a year; age gap 3.8 and 3.8 years; same clan 13.5% and 13.3%; second wives 41.3% and 41.1%; across tribes 15.7% and 15.5%; husband moves to her clan 12.6% and 12.9%.
    - Ten fresh worlds over 150 years agree as closely as the old build does with its own luck shifted.
    - Balance (`balance.js`, eight seeds, 120 years): no house ended in either build, and world population was 3% higher in total.
- **Speed** (`tools/profile.js`, 1000 ticks, two runs each, alone; ms per week):

  | World | People | `marriages` old, new | Whole week old, new |
  |---|---|---|---|
  | Year-300 save | 10,409 | 1.08, 0.38 | 18.6, 17.8 |
  | Tripled | 31,077 | 7.35, 1.94 | 64.2, 55.5 |
  | Grown naturally | 43,322 | 17.3, 4.16 | 111.5, 94.9 |
  | Ceiling, year 600 | 37,954 | 16.0, 3.34 | 99.7, 88.0 |

  `marriagesAt` runs inside `endGatherings` (under 1 ms everywhere). `seekSpouses` is about the same as before (about 1.3 ms at the ceiling): its own 160 km search dominates it.
- **Not reached:** at the ceiling, marriages still cost about 9 times what they cost on the year-300 save. What is left is walking the friendly clans' people in the months someone looks, and the `nearClans` searches, both of which grow with the people round about. Going lower without changing the chances would need a ceiling on `prestige`, and it has none (`giftPrestige`).
- **Tried and dropped:** a list of each clan's unmarried men, kept for the month and shared by every tribe that looks at the clan. It saved 0.1 to 0.2 ms a week at the ceiling, but it would quietly go wrong if anything ever moved a man between clans during the monthly round.
- **The next costliest at the ceiling** (main, ms per week): `yearEnd` 11, `interTribe` 5, `clanFission` 3.4, `aiClaims` 3.1.

## Earlier round (18 November 2026, the population ceiling)
Issue #24: the people level off where the land puts them, instead of growing until the game is hunted out and then crashing.
- **Hunting-ground pressure** (`stepPop`, constants `GP_*`, `GMIN`):
  - Each week a clan weighs how much game stands on its hunting ground against what the land could carry (`W._gKe`, a table of the game ceiling made monthly in `gameCap`, not saved). Past 35% thinned, and fully at 70%, births fall by up to half and hunger deaths rise (they count as hunger).
  - A clan living on its own grain feels it less (times `1 - cereal`).
  - Game is never hunted below 40% of what the land carries; the food not got is taken off the clan's store.
- **Crowding sickness** (constants `DENS_*`):
  - At week 12 each year every clan counts the people of all clans within 25 km (`c.dens`, per km², saved).
  - Above 0.12 a km² everyone in it, farmers too, carries an added hazard that grows with the crowding, three times for children under 5.
  - Its deaths read "(a spreading fever)" in the chronicle, for example: "Wideeq, a slave of Hinasu, died at 32 (a spreading fever)."
- **Where it levels:**
  - The year-300 save plays on to about 38,000 people by year 500 and holds there to year 600; the worst 25-year fall is 0.9%. Game stands at about 74% of its ceiling. Hunger deaths are about 5 per 1,000 a year and fever deaths about 6.5.
  - The old build, from the same save, overshot to about 45,000, the game fell to 9% of its ceiling, and the people fell 37% in 25 years.
  - Fresh worlds level at about 37,000 (seed 5, by year 650), 43,000 (seed 11, by year 575) and 43,000 (seed 21, by year 500), with no 25-year fall over 3%.
  - In a fresh world the first 300 years are as before: hunger under 1 per 1,000, no fever, game above 90% of its ceiling.
- **Early game:** balance on eight seeds (120 years): no house ended, small-clan figures the same, world population 1.5% below the old build in total (seed 21 alone is 10% lower, in both builds of the ceiling; not looked into).
- **Speed:** within noise of the old build on the year-300 save (18.3 against 18.5 ms per tick, two runs each).
- **Not done:** farming still has no land limit of its own; the farm share at the plateau is about the same as in the old build at the same population (it swings from run to run).

Earlier round: timing only, nothing changed in the game (`same.js` finds identical worlds with the profiler off and on; saves are byte-identical). Measured on the year-300 save (10,409 people, 344 clans), 1000 ticks, node, three runs each:
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

## Trade round (issue #39, simulation half; the screens are a separate piece)

Goods have a worth, set by scarcity near the tribe, and trade is a swap by worth. All in `src/soc.js`, section "goods and worth" (before `acquireGoods`), then `exchange`, the trader block before DEALINGS, `claimTargets`/`expeditionTargets`/`aiClaims`.

- **Worth** (`BASE_WORTH`, `worthMap`, `worth(W, t, g)`, `worthWord`): base worth times `clamp(0.6 / (0.1 + share), 0.5, 6)` (cap 6: at 4, bronze, amber, axes and metal were scarce in every tribe, so they never moved), where share is the part of the living clans within 150 km of the tribe's centre that hold 2 or more of the good (for grain: more than 8 weeks of their own need). The brief gave `1.6 / (0.4 + share)`; that never falls to 0.8 (share would have to be 1.6), so "plenty" could never show. `0.6 / (0.1 + share)` gives the base worth at half the clans, "scarce" (2 or more) under a fifth and "plenty" (0.8 or less) from two thirds. Cached in `W._worth` (not saved), each tribe's entry rebuilt once a year; no `W.rand`. Cold cost for all 98 tribes of `after_real7`: 21 ms.
- **Fix round 1**: `RECV_CAP` 8 and `room(c, g)`: a clan takes no more of a good in swaps, grain-buying, trader loads and pay-backs, or gathering barter once it holds 8 (gifts, tribute, loot, kin rule and ore rule are not capped). Salt is used a year only from a clan holding 2 or more. In `giftFrom` a piece counts at least 1 toward the need (`worth` is that counted sum; `one` says the text is a single thing, for "goes"/"go"). Result texts show the effect as applied (rounded by `met`). The trader hint promises a worth and "likely" goods, not exact goods. Clay hints show no worth. The Our goods switch reads Kept or Spare; the spring trader order sits under Our goods (Send / Ask me).
- **Grain** is traded in units, `GRAIN_UNIT` = 20 x 7 x 2,700 kcal (a week of food for 20 grown people).
- **Gifts**: `giftFrom(W, c, need, forced, {food, to, keep, dry})` spends the cheapest goods by the giver's worth until the need is met (2 a small gift, 3 an offering or an envoy, 4 a blood-price), tops up with food as each site did, and returns `{spent, worth, food, met, text}`. Every `GIFTABLE.find` site uses it. The player's Kept goods are skipped unless `forced` and nothing else is held. `realmPay`/`realmShare` (the realm's chance-per-good tribute) were left as they were.
- **Keep**: `P.keep` (absent = bronze, copper tools, amber, axes kept); `SIM.kept(W, g)`, `SIM.setKeep(W, g, on)`. `P.pol.trader` is `'ask'` or `'send'` (`springTrader`, first month of spring, same test as the deed, a house note and no card).
- **Swaps** (`exchange`): between tribes up to two swaps a call at 50% each (`swapOffer`), a hungry clan buys grain (`buyGrain`); the same-tribe kin rule is as it was. `interTribe` falls back to the gift exchange when no swap is worth making, so neighbours still meet.
- **Traders**: `traderLoad` (up to `LOAD_WORTH` 10, dearest-there first, grain units), `payPlan` (the partner pays 0.85 of the load, from stock as it stands; the deed shows this same function's answer), `tradeScore`/`tradeGain` (partner choice, also used by `aiPact`), `roadLevelAt` and `traderStep` (130 km a month on a path, 160 on a road), `robberChance` (the deed hint). `SIM.traderRows(W, c)` gives the deed's rows.
- **Uses**: flint (or an axe) sharpens a tool under 0.6 in `acquireGoods`; salt cuts the store's weekly loss by 5% a measure up to three and adds to `keepG`, and a measure is used a year (`craftsYear`). `SIM.goodUse(g)` is the one-line use.
- **Sources**: one row per kind of source, dearest a year first; claim and expedition hints show the yield that will be given (under the cap) and its worth; expeditions clamp at the deed.
- **Coveting**: `covets` (a good the other's tribe finds scarce and holds none of) in `interTribe`; raid wealth is the sum of goods by the raider's worth; `tribeWealth` stays on fixed numbers.

## Testing a change
Do all of these before committing:

- **Build:** `./build.sh` (must print `built`).
- **Fuzz:** `node tools/fuzz.js 2,7,14 130`.
- **Saves:** `node tools/save_roundtrip.js`.
- **Balance:** `node tools/balance.js 5,8,11,14 120` and `node tools/balance.js 2,7,21,33 120`, compared with the result from before the change. Single seeds swing by chance (a change that adds any `W.rand()` call reorders every later roll), so judge the eight together.
- **Old saves:** make a save with the build from before the change (seed 9, year 60, always option 0), load it with the new build and play 30 more years.
- **Interface changes:** load `index.html` at phone size with Playwright (Chromium), and look at the screenshots: `tools/map_shots.js` for the map (old and new build, same save, compare shot by shot), and `tools/map_speed.js` to keep panning and zooming as fast as before.
- **Family or succession changes:** `node tools/head_swap.js` counts head changes while the old head is alive over ten games. It must say 0. Its "same head, new household" column can count a child head taken in by kin when no grown-up is left in the household ("Young ... now lives in the household of ..."). That is allowed: check what each case is.
- **Speed-ups that must change nothing:**
  - If no `W.rand()` call is added, skipped or moved, build the old sim into a scratch folder. Then `SIM_A=<old sim.js> SIM_B=build/sim.js node tools/same.js 5,11,14 150` must say identical, and so must `node tools/same_save.js <old sim.js> build/sim.js <save> 20 5` on a big save.
  - If draws are skipped or reordered (as in #26), first replace those draws, in copies of both sims, with the same fixed function of what they are drawn for. For example, a small integer hash of the week and the ids, mapped to [0, 1). Then run the same two checks.
  - Also make a copy that is wrong on purpose, to show the check would catch it. Fresh seeds are a weak test of rare paths; the big saves are sharp.

## Publishing
1. Commit `src/`, the rebuilt `index.html`, and any tools.
2. Push to `main`. GitHub Pages republishes within a minute or two.
3. On Dustin's iPhone, the home-screen app picks up the new version the next time it opens with a connection. If it looks stale, he should close it fully and reopen it.
