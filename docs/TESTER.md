# The Isles: brief for testers

"The Isles" is an emergent world simulation game. You play one house (a dynasty) inside a clan inside a tribe, from the stone age into the bronze age, across generations. The world runs by itself; the game stops for decisions, and the head of your house can do deeds. You play through a text front-end from the shell. You are hunting bugs and judging whether the war and unification parts of the game work and can be played. Do not read or edit any source code: treat the game as a black box.

## How to play
Your own game server is already running on the port named in your task. Every command line needs the port:

    ISLES_PORT=<port> ./play/isles <game#> "<command>[; <command>...]"

`<game#>` is any number you choose; each number is a separate game. Start one with `new <seed>`. Commands:

- `state` (where things stand, and any decision waiting), `adv <years>` (advance up to 20 years; it stops early when a decision needs answering), `choose <n>` (answer the waiting decision).
- `deeds` (every deed, with AVAILABLE or the reason it cannot be done now, and numbered targets), `deed <id> <target#> [force# | DIR km]` (do one; for example `deed raid 0 1`, `deed gifts 2`, `deed movecamp 0 N 30`).
- `people`, `family`, `log [n]` (your house's notes), `chronicle [n]` (the world's), `timeline`, `flow [years]`, `myths`, `counsel`, `legacy`, `treasures`, `beasts`, `land`.
- `realm` (the confederacy or kingdom your tribe belongs to: how it is held, who would follow, each member tribe and whether it would stay; or, if none, your bid to unite the tribes and your allies), `rule` (how your clan and your tribe choose their leaders), `known` (how much of the map you know, and which peoples).
- `auto <decisionType> <n|off>` answers a kind of decision by itself from then on (the decision's type is printed with it). Use it for routine ones so you can move through the years, but never for decisions about war, raids, rivals, succession, or anything your task is about.
- `policy` shows standing orders.

**Test set-up commands (not part of the game).** Reaching the late game by honest play takes a long time, so the front-end can put you there. Use these only as your task says, and say in your report every time you did:
`testsetup leader` (your head becomes clan head and leader of the tribe), `testsetup allies [n]` (alliances with the n nearest tribes), `testsetup war` (like confed with the nearest tribe only, and every people known so the `war` deed lists targets), `testsetup warcall` (another realm marches on your tribe, led by another clan: the `warcall` card comes), `testsetup confed [n]` (found a confederacy of your tribe and the n nearest, with you as ruler), `testsetup rule <0|1|2>` (set how the confederacy is held, as if for twelve years), `testsetup village` (your clan becomes a farming village with a great hall and grain), `testsetup age <years>` (set your head's age; an old head dies within a year or two of play, not at once), `testsetup food [weeks]`.

## How unification is meant to work (so you know what to try)
- Tribes come to know each other, trade, send gifts, agree trade pacts and swear alliances (deeds `gifts`, `pact`, `ally`; some need you to be leader of your tribe, which you win by standing, by the `challenge` deeds, or by decisions).
- A tribal leader with enough standing and at least two allied tribes can unite them into a confederacy (deed `crown`, "Unite the tribes"); `realm` shows the bid. The ruler is a high chief.
- A new confederacy is "a following": it ends when its ruler dies. The ruler can "Bind the tribes to the seat" (deed `bindseat`; then the tribes choose the next ruler, and the strongest tribe carries it) and then "Make the seat pass by blood" (deed `bloodseat`; then the ruler's heir follows). A confederacy held by blood, with three tribes, 400 people, settled villages and a great hall, can be raised to a kingdom (deed `kingdom`); its ruler is a king or queen.
- A ruler can make war on a neighbouring tribe to force it to submit (deed `war`); subject tribes pay tribute, may rise, and tell their ruler what they know of the land (`known`). The war deed shows each battle's chance as things stand; a ruler can call a war off (deed `endwar`, costs 3 renown). When a realm marches on the tribe of a house whose head is not its leader, a `warcall` card asks whether the clan's men stand with the tribe or stay at home; answer it by hand.
- Clans and tribes have their own three steps for how the leader is chosen (`rule`; deeds `clanlife`, `clanblood`, `tribelife`, `tribeblood`).
- Below the level of realms there is raiding (`raid`), being raided, feuds and blood-price, tribute demanded from a weaker tribe (`tribute`), peace (`peace`), captives and treasures.

## What counts as a bug
- A reply that starts with ERROR (quote the command and the whole error), or text containing "undefined", "NaN", "null", "[object Object]", or an absurd number.
- A decision that comes straight back after being answered; a deed listed AVAILABLE that then fails; a result that contradicts what `state`, `realm`, `people`, `log` or `chronicle` then show; a stated chance or cost that does not match what happens (check costs against `state` before and after; judge chances only over several tries).
- Wrong names, sexes, titles or relations in text (a queen called king, a dead person acting, a tribe named as its own enemy).
- Anything that makes a part of the game impossible or pointless to play: a step that can never be reached, a war that can never end, a realm that falls apart for no stated reason.
- Not bugs: singular/plural slips in the `state` screen itself, `adv 0` advancing a year, odd wording of the front-end's own labels. Design opinions are welcome but go in their own short section at the end, separate from bugs.

## Your report
Write it to the file named in your task. Sections: **Summary** (each game: seed, how far it got, what you achieved, which test set-up commands you used); **Bugs**, most severe first, each with a short title, severity (crash / wrong outcome / misleading text / cosmetic), game, seed, year, the exact commands and exact quoted output lines that show it, what you expected, and your confidence it is a real bug; **Checked and found working** (one line of evidence each); **Could not test, and why**; **How it plays** (at most ten lines: what was unclear, tedious, too easy or too hard about unifying tribes and making war). Quote exact output as evidence. Do not pad the bug list. Your final message is the text of the report.
