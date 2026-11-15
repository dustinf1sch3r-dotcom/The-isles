# The Isles: brief for engineers

"The Isles" is an emergent stone-age-to-bronze-age world simulation in one self-contained HTML page (plain JavaScript, Canvas 2D, no libraries). Societies, cultures, crafts and politics grow bottom-up on a map of two large islands. The player leads one house (a dynasty) inside a clan inside a tribe, across generations: the sim runs by itself and stops for decisions; under "Act" the head of the house can do deeds. The owner plays it on a phone.

Three engineers are each fixing one group of bugs at the same time, in separate copies of the code. The copies will be merged by applying each engineer's patch to the same base, so **keep every change small, local and additive**, and never reformat or rename existing code.

## Your folder
You have your own folder under <your work folder>/ (named in your task). Work only inside it.

| File | What it is |
|---|---|
| `soc.js` | the simulation's society code (one long closure, about 460 KB) |
| `geo.js` | world generation (do not edit) |
| `ui.js` | the interface: map drawing, panels, tabs, decision cards, deeds sheet (about 180 KB) |
| `art.js` | sprites, portraits and plates, drawn in code in an ink-and-wash style |
| `shell.html` | page shell: CSS and the help text (`/*SIM*/` and `/*UI*/` are filled in by the build) |
| `base/` | untouched copies of all of the above. Never edit these. |
| `chunks/` | put long blocks of new code here as separate `.js` files (see "Patch") |
| `./build.sh` | builds `sim.js` (geo + soc, for node) and `game.html` (the whole game), and syntax-checks both. Run after every edit. |
| `fuzz.js` | randomised play: `node fuzz.js 1,2,3 120` (seeds, years). Must end with `errors 0` and print no `BAD TEXT` lines. |
| `balance.js` | unattended play: `node balance.js 5,8,11,14 120`. Prints how many houses died out, the share of years the player's clan was under 14 people, and world population at the end. |

The machine is shared with three other engineers running tests, so runs are slower than the times quoted; give long runs a generous timeout and do not run more than two at once.

## Reading the code
Lines are very long (often a whole function on one line). Do not print whole lines: use `grep -n "thing" soc.js | cut -c1-400`, or `grep -o "thing.\{0,300\}" soc.js`. To read a region, `sed -n 1318,1360p soc.js | cut -c1-700`.

### The sim (soc.js), exported as `SIM` in the page and by `require('./sim.js')` in node
- Time is in weeks: `W.week`; 52 weeks a year. `W.rand()` is the seeded random number; always use it (never Math.random) in the sim.
- World grid: `N` cells a side (200), each `CELL` metres (5000). Cell index `i = y*N + x`; `cellAt(x, y)` from metres. Per-cell arrays on `W`: `land, elev, slope, biome, forest, lake, coast, isRiver, game` (game animals, kg per hectare), `edible, farm` (0..1, share of the cell under crops), `claim` (tribe id holding the cell), `claimS` (strength). `W.landIdx` lists land cells.
- People: `{id, name, sex, age, alive, clan, fam, spouse, mother, father, dyn, slave, traits}`. `dyn` means of the blood of the player's house.
- Clans (`W.clans`): `{id, name, people[], head, tribe, x, y, store, grain, goods{}, settled, village, live ('farm'|'fishing'|...), soil, works{}, cond}`. Tribes (`W.tribes`): `{id, name, clans[], headman, stage (0..3; 2 = sowing grain, 3 = settled villages), dom, rel (Map of relations), confed, myths, kult (culture), atWar}`. Confederacies (`W.confeds`): `{id, name, capital (a tribe), king (a person), kings[], members (Map tribeId -> {status: 'core'|'ally'|'subject', joined}), wars, hue, founded}`.
- Entities are made with `ent(W, kind, props)` and found with `W.ents.get(id)`. `note(W, entity, text)` writes to an entity's own chronicle; `logEvent(W, text, entity, kind)` writes to the world chronicle.
- Standing and feelings: `prestige(person)`, `opinion(a, b)` (how a feels about b; clans, tribes or households), `affect(W, a, b, delta, why)`, `rel(a, b)` (the relation record between two tribes: `op, allied, pact, tribute, trade, kin`), `isAllied(a, b)`, `sameConfed(a, b)`.
- Leaders: `updateLeaders` (near line 270) chooses clan heads (`c.head`) and tribal leaders (`t.headman`) by standing; `leaderSex(t)` is the sex that leads among that people; `isMatri(t)`.
- The player: `W.player` (P): `{head, heads[], house, hist[] (house notes), renown, cool{} (cooldowns in weeks), over}`. `houseNote(W, text)` writes a house note; `notice(W, title, text)` shows the player a small notice; `pushEvent(W, {type, key, title, text, data, options:[{label, hint, off}]})` queues a decision card, answered in `resolve(W, ev, k)` (a big `switch (ev.type)`), which may set `W.lastResult = {title, text}` to show a result card. `milestone(W, t, title, text)` announces a first for a tribe.
- Deeds: `playerActions(W)` builds the list: each `{id, icon, label, hint, ok, why, targets:[{label, hint, ref}], forces, data}`; a deed that cannot be done now must still be listed with `ok: false` and a short true `why`. `doAction0(W, id, k, f, place)` carries one out and returns `{title, text}`. Cooldowns use the local helpers `ready(key, years)` and `left(key, years)` inside `playerActions`, and `cd[id] = W.week` when done. Any odds shown in a hint must be the same number that is rolled.
- Yearly and monthly work is called from `step(W)` near the end of soc.js (look for `roadsYear(W)`, `confedYear(W)`, `beastYear`, `claimsYear`).
- Saving: `saveGame(W)` / `loadGame(str)` (near the end of soc.js) turn the world into JSON and back, replacing object references by ids. **Read them before adding fields.** A new plain field (number, string, boolean, array of numbers) on a person, clan, tribe, confederacy or the player normally survives; references to other objects, Maps, Sets and typed arrays need explicit handling there. Saves made before your change must still load, so read every new field with a fallback (`c.rule || 0`).
- The function exported at the very end (`return { N, CELL, ... }`) is the `SIM` API the interface uses; add to it what the interface needs.

### The interface (ui.js)
- `draw()` paints the map each frame (terrain is cached; `drawOwnership` paints tribal lands from `W.claim`; roads from `W.roads` via `SIM.roadLevel`; `herds()` places wildlife marks; villages, camps, labels).
- `renderPanel()` builds the side panel as an HTML string by `panel` kind (`'house'`, `'tribe'`, `'clan'`, `'confed'`, `'person'`, ...). The house panel has tabs in `houseTab` (`overview, deal, family, clan, tribe, story`); the tribe panel has `tribeTab`. Helpers there: `tile(k, v, sub)`, `link(entity, text)`, `esc`, `bar`, `yr(week)`, `titleWord`.
- `showActions(openId)` is the deeds sheet; decision cards are drawn from `W.pending`. Deeds and decisions need no interface work unless you want a picture: `ART.scene(kind, sub)` chooses the plate for a card.
- `window.__dbg.W` is the live world, for tests in the browser.
- The look is parchment and ink: CSS variables in `shell.html` (`--paper`, `--ink`, ...); reuse existing classes (`tile`, `row2`, `k sec`, `muted`, `tabs2`, `bid`); no new fonts, no emoji in new text, no bright colours.

## Testing in a browser
`<your work folder>/shot_example.py` shows how: it opens your `game.html` in headless Chrome at phone size, picks a house, runs the sim forward inside the page, opens a panel tab and saves a screenshot. Copy it and adapt it. Always look at your screenshots (Read tool) before you call interface work done, and check the console error list it prints is empty. The owner plays on a phone: 390 px wide is the size that matters.

## Rules
1. **Emergent first.** The world's own tribes and clans must use the new thing by themselves, by the same rules as the player. The player gets a deed or a decision on top.
2. **Voice.** Player-facing text is plain, short and in period: no modern words ("centralization", "infrastructure", "economy", "upgrade", "level", "unlock", "bonus", "stats"). Say what a thing is and what it does. Look at nearby text and match it.
3. **Honest numbers.** A hint that says "about 60%" must use the number that is rolled. A cost that is stated must be the cost that is charged (`eatStore(c, kcal)` takes food; `needsWeek(c)` is a week of the clan's food).
4. **Balance.** Do not make the game easier or harder overall. After your change `node balance.js 5,8,11,14 120` should stay close to the base (run it on `base/` first by building a base sim: `cat base/geo.js base/soc.js > /tmp/<you>_base_sim.js`, and compare), and no more houses should die out.
5. **The house rule.** The head of the player's house never changes while alive, never leaves the clan by marrying, and a head who marries keeps the household. Do not touch that logic.
6. **Old saves load.** See "Saving" above. Prove it: make a save with the base sim after 60 years, load it with yours, run 30 more years.
7. **Performance.** The map must still draw smoothly on a phone: nothing per-frame that walks all cells or all people; cache by a version number the way `W.roadsVer` and `W.claimVer` are used.
8. Do not start other agents. Do not edit anything outside your folder.

## Patch (what you hand in)
1. `patch.py` in your folder, in exactly this form (see `<your work folder>/patch_example.py`): it takes a folder, and every replacement asserts how many times its anchor occurs. Anchors must be as short as is still unique; replacements as small as possible. Long new blocks of code go in `chunks/<name>.js` and are inserted by `ins(...)`, so that they are not buried in Python strings.
   Prove it reproduces your work exactly:
   `rm -rf /tmp/<you>_check && cp -r base /tmp/<you>_check && cp -r chunks /tmp/<you>_check/ && python3 patch.py /tmp/<you>_check && for f in soc.js ui.js art.js shell.html; do cmp /tmp/<you>_check/$f $f; done`
   (no output from `cmp` means identical).
2. `./build.sh` prints `built`; `node fuzz.js <three seeds> 120` ends with `errors 0`; the save check in rule 6 passes; `balance.js` compared with base.
3. Screenshots of every new or changed screen, saved in your folder as `shot_*.png`.
4. `report.md` in your folder (write it with a shell heredoc if a file tool refuses): what you built, the rules of it in plain words (every threshold and every chance), the new fields and where they are saved, how the world's own tribes use it and how often it happens in 150 years on three seeds, the commands you ran with their output, what you did not finish, and anything a reviewer should look at twice. Your final message is the text of that report.

## For bug fixing (this round)
- Test reports go in docs/ (the last round is docs/war-test-reports.md). Testers play through the text front-end, play/server.js, driven by ./play/isles; its commands are in docs/TESTER.md. Run your own copy on a free port to reproduce a bug as a tester did: `ISLES_SIM=<path to build/sim.js> ISLES_PORT=<port> node play/server.js &` then `ISLES_PORT=<port> ./play/isles 1 "new 17; adv 5; ..."`. If a reported bug is only in that front-end, say so with the line to change.
- For each bug: reproduce it first (with a script against your `sim.js`, or the front-end), find the cause, fix the cause, and show the same reproduction passing. If you cannot reproduce it after an honest effort, say so and do not guess.
- Report each item as FIXED / NOT A GAME BUG / NOT REPRODUCED / LEFT (with the reason), with the cause in two or three sentences and the before-and-after evidence.
