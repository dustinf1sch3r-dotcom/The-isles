# The Isles: five testers on unification and war

---

## Tester A

# war_A report: unifying the tribes by honest play (port 7751)

No `testsetup` command was used in either game. Every year was advanced one at a time (`adv 1`), never more than 5.
I used `auto` only for routine decision types: gathering, milestone, friendneed, foundling, omen, quarrel, beast, marriage, sickness, path, scouts, grain, exiles, toobig, oath. In game 2 I also set `auto oathback 0`. I never used it for war, rivalry, challenge or succession, except that in game 1 I answered `succession` decisions with 0 (the only option). In game 2 my helper script answered "war of conquest?" with 1 (peace); that decision did not come up in game 2.

## Summary

### Game 1: seed 5 (house Gagrar, tribe Ragbugites), played to year 200
Nothing was found at all until year 77. Exploring is slow: 75 km a trip, the scouts rest 2-3 years, and about 50% of the first trips die or lose a man (one expedition killed the head's son in year 7). Moving camp NW and W helped.

| Step | Year |
|---|---|
| First neighbour known | y77 (Gehuek, 115 km N). Peoples known only reached 6 after y100. |
| First gift | y78 |
| First pact | y78 (Gehuek). I had become clan head the same year. |
| First alliance | y88 (Gehuek). I had just won the tribal leadership by `challenge` at about 92%. |
| Second alliance | y107 (Behoa) |
| Leader of the tribe | Gagrar y3, lost at her death y10. Murrag y34, lost y17-20 to the larger Khenmur clan. Hiurik y82, lost within 2 years to a rival (see Bug 4). Regained y88. Urikshish y107 and held. |
| Bid high enough | 4.2 of 4.2 at y88 and 5.8 of 4.2 at y107. At y84 the bid already read 4.3 with no allies; `crown` then said "You need at least 2 allied tribes". |
| Confederacy founded | y107 (Ragbugites, Gehuek, Behoa) |
| Bound to the seat | y112 (chance 81%, the first year it was allowed; it varied 85, 83, 65, 81 as feelings changed) |
| By blood | y122 (60%, as stated) |
| Kingdom | Never. See Bug 1. |

What happened after the founding:
- **Conquest:** I made war on Kiroek (y107), Hagbaagim (y119, y124), Ridoi, Nuqmiqwa and Suleans, and the Skeigfanlings war was inconclusive. Each of those wars ended in 1-2 years and the tribe became a subject.
- **Subjects:** At every ruler's death the subject tribes broke away. The two allies stayed through the first three deaths.
- **Ruler deaths:** Urikshish died y123, Khenbug y171, Rarmun y174 and Mergag y190. By blood held each time. On the y190 death the Gehuek (130 people, stay chance shown 89%) broke away.
- **Collapse of the ruling tribe:** Our own tribe broke up (y119 to y126). Ragbugites fell from 134 people in 3 clans to 37 in 1 clan, and the realm fell from about 350 to 107 people.
- **Reaching 400:** The realm passed 400 people only briefly, at y160-170 (412-469 people), through conquests. The only kingdom need unmet then was the great hall.
- **At y200:** the realm was the Ragbugites plus Behoa, held by blood, 209 people, no kingdom.

### Game 2: seed 21 (house Nunnun, tribe Uranuraakim), played to year 200
I tried the other approach: moved camp, kept gifts and a pact going, swore oaths and attended gatherings. I did not marry out or trade: marriage offered only same-tribe matches, and the trade deed asked for villages.

| Step | Year |
|---|---|
| First neighbour known | y40 (Rastenungar, 138 km N). Another camp was only reached by moving camp 4 times. |
| First gift | y45 |
| First pact | y47 (Rastenungar) |
| First alliance | y47 was refused ("Not yet ... More goodwill is needed") although `deeds` said "likely to agree". Sworn y70, after I became tribal leader again. |
| Second alliance | y73 (Stagroar) |
| Leader of the tribe | Nunnun y6, lost y49 at 76. Uranraag y65. After her, Gaaknaan, Burkhag and others, not my house. |
| Bid high enough | 4.5 of 4.2 at y73 |
| Confederacy founded | y73 (Uranuraakim, Rastenungar, Stagroar). It was reached 34 years sooner than in game 1 because two friendly neighbours were close. |
| Bound to the seat | y78 (85% as stated) |
| By blood | Never by my house. See Bug 5. |
| Kingdom | Never. |

What happened after the founding:
- **Ruler dies:** Uranraag died at 79 in y85. The seat passed by the "tribes choose" rule to Gaaknaan, not of my house. The realm held together.
- **Seat leaves my tribe:** The Uranuraakim tribe fragmented (y115, y119, y135). The Rastenungar leader took the seat y116. Rastenungar leaders made it pass by blood (y121, y127) and the seat bounced back and forth. It returned to the Uranuraakim y128.
- **Realm breaks:** At the y169 succession "our people broke away". The league became a Rastenungar one (9 tribes by y200). My tribe ended with no alliances.
- **Missed chance:** A 75% `challenge` for the tribal leadership was available in y147, but its holder died and a new head took over (house heads in this game were weak, and my head died while it sat).
- **At y200:** no confederacy, 6 clans, 162 people, 21% farming.

## Bugs, most severe first

**1. The great hall can never be built; a kingdom is unreachable (wrong outcome / blocks the game).**
Game 1, seed 5, y112 to y165. `realm` says "A kingdom needs: ... [NOT YET] A great hall in the ruler's village". `deeds` shows only:
```
- build: Build for the village — A palisade against raiders, granaries, a great hall
    not now: Palisade: No woodland within a day's walk for the timber
```
- **What it lists:** The only option ever offered is "Granary and storage pits" (AVAILABLE, with "[0] Granary"). After it is built, `build` shows only the palisade reason.
- **No hall entry:** A great hall is never listed as an option, and no reason is given for it.
- **Commands tried:** `deed build 0`, `1`, `2` and `3`, and the granary at y107 and y161.
- **Village moves:** I moved the village twice, 35 km W (y122) and 40 km E (y146), to look for woodland. Neither site had any, and every move locks the village for 8 years.
- **Terrain:** There is no way to see where woodland is.
- **Effect:** By y160-170 the realm had 6 tribes, 400+ people, by-blood succession and a settled village. The great hall was the only unmet need for the kingdom.
- **Expected:** a hall option, or a stated reason, or a way to find a site.
- **Confidence:** high that it is blocked in this game. I could not tell whether it is blocked for every seed.

**2. The `bloodseat` and `kingdom` conditions disagree about a hall (misleading text).**
Game 1, y112, before I raised any shrine.
- **Claim:** `bloodseat` said "[met] A great hall or a monument in the ruler's village" when I had neither. It stayed "[met]" before and after I raised Shikgaak Shrine (y112).
- **Kingdom side:** `kingdom` needs a great hall only. A shrine did not count.
- **Game 2:** The same line read "[NOT YET]" with no shrine, and the Uranuraakim were nomads who could not raise one ("Only settled peoples can raise great monuments").
- **Confidence:** medium. The "[met]" may be reading an old monument I did not know of.

**3. The "hold the clan together" decision repeats every year and its numbers contradict (wrong outcome / misleading text).**
Game 2, seed 21, y77 to y84, clan Nunkhag; same pattern in game 1 y147 and y155.
- **Repeat:** After `choose 1` ("Your word keeps them for eight years"), the `toobig` decision came back at the next `adv 1`, at y77, y80, y81, y82 and y83.
- **Number mismatch:** Prompt: "Hold the clan together — ... up to 83 people". Result: "For eight years your word holds the Nunkhag as one clan, up to 59 people. Beyond that even you cannot keep them." The clan then had 67 people, already above the stated cap.
- **Log:** The log says "Uranraag held the Nunkhag clan together." four times in y83 and again in y84.
- **Expected:** one ask per eight years, the same cap in the prompt and the result, one log line.
- **Confidence:** high.

**4. "Buy their support" bought nothing and cost the gifts (wrong outcome / misleading text).**
Game 1, y84, `rivalry` decision from Daagkhen (my first leadership, held 2 years).
- **Command:** `choose 1`.
- **Output:** "The gifts: before them, 76 people stood with Hiurik and 79 with Daagkhen. After them, 76 and 79. No clan changed sides."
- **Cost and result:** The decision promised "valuables and half your food". I lost the seat anyway.
- **Chance shown:** The prompt said "it could go either way" with "Your chance of keeping the seat is about 0%". At 76 against 79 that is incompatible.
- **Related:** At y102 in game 2 I took a `challenge` shown as 75%. The standing was 1.51 against 1.24 and the vote 173 to 79, yet the result was "The challenge fails". That may be a single 25% roll, but the screen reports it as a loss despite the majority. I could not repeat it (an 8-year wait follows).
- **Confidence:** the first is high for the contradictory numbers; the 75% loss is low.

**5. The "ruler dies today" forecast contradicts who is the strongest tribe (misleading text).**
Game 2, y78, y115 and y140.
- **y78:** Uranuraakim 160 people / 27 warriors; Rastenungar 96 / 18. The forecast said "Grokog (M, 62) would follow, leader of the strongest tribe, the Rastenungar". In fact Uranuraakim carried the seat on the death (y85).
- **y115:** Uranuraakim 310 / 62; Rastenungar 197 / 45. It still said "Steingy ... the Rastenungar".
- **Pattern:** The forecast flips between tribes from year to year. It is unreliable for planning succession.
- **Related:** y125 forecast: "Bugash (M, 26) would follow, his son". At y127 the chronicle says "Toldsein, no heir of the blood", with no mention of Bugash dying.
- **Confidence:** medium-high for the first two, low for the last.

**6. A realm held by blood is lost by the house that built it (wrong outcome, design issue).**
Game 2, y85 onward. After Uranraag died, my house was no longer clan or tribe head, so the throne went to a different house. The realm I founded became a Rastenungar one, with the seat passing to Rastenungar leaders, and finally "our people broke away" (y169). There was no deed to claim the seat back.
- **Compare game 1:** In game 1 the house stayed head of the clan and tribe, so the realm stayed mine.
- **Expected:** a warning or a deed to secure the house's claim (for example `clanblood` before the first death).
- **Confidence:** this is a design problem more than a bug, but it makes the late steps unreachable for many runs.

**7. Duplicate messages (cosmetic).**
- Game 1: "The Hagbaagim, now our subjects, told us of their country" at y120, y125, y126 and y128. "The Suleans submit" at y160 and again y163. "The Nuqmiqwa ... told us of one people beyond it: the Mashneektin" at y168 and y169.
- Game 1: "Ridoi (...ALLY)" in the `state` neighbours list while it is a subject at -30 opinion.
- Game 2: `realm` reads "Allies: Rastenungar" with "allied tribes that would count: none" (they are in another realm); this is acceptable but odd. The league the Uranuraakim had left is still called "the League of the Uranuraakim (7 tribes)", and it was then Rastenungar-led.

**8. Walk targets reorder, so `deed walk <n>` hits the wrong story (misleading).**
Game 1, y84 and y102. When a new story is added the list is reordered. `deed walk 1` fired "The Whale Who Agreed" (65%) instead of "Gagrar Far-seer" (73%) as listed before. I used `deed walk 0` at y102 and got "The Stranger's Shadow" rather than a leadership story. Not a bug in the strict sense, but easy to misfire: indexes should be stable.

**9. Smaller points (cosmetic / low confidence).**
- Game 1, y124: "A son, Bugdan, was born to Khenbug and Khenbug." and "Khenbug (speaks for the hearth, 24)" and heir Khenbug appear together; names are reused, so parent and head collide.
- Game 1, y10 onward: "heir Bugurur (27)" when the head was 37, so the heir was aged 10 at birth. Probably a sister or niece, but the label says "heir".
- Game 1, y122: "We left our old village, its walls and halls behind" when the old village had only granaries.
- Game 1, y96: "A neighbouring people" in an oath-call at y70 when `known` listed no neighbour. Probably fine (it can name unseen peoples).
- `crown` blocked text read "Your bid is 4.2 of 4.2" (game 2, y73). It was probably 4.19, a rounding artefact.
- Realm tribe lines: `would leave (0%)` next to "If the ruler died today: ... the realm would end". The label is ambiguous. After a bind it reads `would stay (95%)`.

## Checked and found working
- Gift cost and effect: 2 valuables gave opinion 5 to 29 in game 1, and `ally` showed "likely to agree" as it rose.
- Leadership `challenge` chances: 92% won (g1 y88), 75% won (g1 y107), 75% lost (g2 y102). The sample is too small to judge. `challengeClan` at 35%, 50%, 66% and 64% won every time.
- `crown`: "needs at least 2 allied tribes" then AVAILABLE with a bid of 5.8 and founded at once. `realm` then listed the member tribes and rules as described.
- `bindseat` chance (85, 83, 81 on the display) matched; result "The chance was about 81%". `bloodseat` 60%, the same.
- `realm` agrees with `chronicle` on ruler deaths and tribes leaving: g1 y123 ("the Kiroek, the Hagbaagim break away"), y171, y190; g2 y85, y116, y169.
- "Following" realm ends with the ruler: in neither game did the ruler die in that state, so this branch was never tested.
- By-blood heir takes over as stated: Khenbug (daughter) y123, Rarmun y171, Mergag y174, Khenbug (son) y190.
- Allies stood with the realm in 3 of 4 successions and never raided me. The one defection was Gehuek at y190, at 89% stay.
- War: a decision came, a realm tribe was declared on, the wars ended in 1-2 years, the tribe became a subject and `known` expanded ("told us of ... peoples beyond").
- `bindseat` and `bloodseat` waits ("Five years since the last try") shown correctly.

## Could not test, and why
- Death of a ruler under a "following" (before `bindseat`): the rulers lived long enough in both games. I did not use `testsetup age`.
- Death under "tribes choose" in game 1: it was already by blood by the first death.
- Kingdom: blocked in both games (Bug 1). Raising the kingdom, a king or queen's title, and tribute never appeared.
- Marrying out to other tribes: marriage options only listed same-tribe matches.
- Trade as an approach in game 2: needs a village. Trade pacts alone (y47) did not help.
- Peace after a war, a war that fails, tribute and treasure gifts: I did not try them.

## How it plays
- Finding neighbours is the real wall. In game 1 nobody was met for 77 years (about 20 expeditions, each going 70-150 km from camp). Walking the camp toward unexplored land was the only thing that worked. No clue is given of where to go.
- Becoming tribal leader and keeping it is hard. Your clan is outnumbered by a larger clan, and the clan mother age rule (30) keeps young heads out. `clanlife` refused at 58-64%. Succession is a lottery.
- Once leader, unity is quick: gift, pact, alliance, crown took 1-3 years. The five-year wait for `bindseat` and ten-year wait for `bloodseat` are well signposted by `realm`.
- The big threat is not war but clan and tribe fission. Ragbugites lost clan after clan (3 clans, then 1), and the ruling tribe shrank until the realm was tiny. A great hall is stated as the cure ("lets a village hold together past 100") but cannot be built.
- War is easy and cheap (1-2 years, few losses). Conquered subjects leave at every succession, so conquest only gives temporary people for the kingdom count. I could not tell whether the 400 people are meant to be reachable without a hall.
- Several decisions repeat every year (clan too big, oath asks) and bury the log. `auto` helps but the `toobig` one should not need it.
- The game gives plenty of numbers (chances, feeling, would stay %) and they were mostly honest; the exceptions are the forecast and the 0% on the rival decision.

---

## Tester B

# War B: wars of conquest by a ruler (tester report, port 7752)

## Summary

Games used (I reused game numbers after restarts; "run" says which):

- **Game 1, seed 8.** Honest play to year 60 (blind routine answers), then `testsetup leader`, `testsetup confed 2` at y60. Played on to y73, `deed bindseat` succeeded (81%).
  - **No war was ever possible.** Only three peoples exist in reach: my own tribe, the Liwians and the Sohaek. `confed 2` swallowed both.
  - `deed war` says "Not possible now: No tribes within reach" from y60 to y73. I explored about 14 years more and found nobody new.
  - So the war, subject and kingdom steps could not be tested here.
- **Game 3, seed 17.** Honest play to y80. My first run reached y95 and the whole house died out, because I answered routine decisions blindly. I restarted the same seed and stopped at y80 in the second run.
  - Used `testsetup leader` and `testsetup allies 2`. I did **not** use `testsetup confed`.
  - `deed crown` worked at y81 once the bid really exceeded the need (see bug 9). I founded the confederacy myself.
  - Wars: Yanaori (y81), Gruldruningar (y85), Murkhaanu (y90), Tordreingar (y92) and Zeseek (y110, from a "war of conquest?" decision). All ended in submission.
  - `bindseat` at y90 succeeded (75%). The ruler died of old age at 75 in y118 with the seat bound but not by blood. I played on to y147.
- **Game 2, seed 33.** Run 1 (game "2"): honest play to y100, `testsetup leader` and `testsetup confed 3`. I made war on the Nenii at once. The ruler died at 47 ("injury") in y101, with the unbound confederacy and the war in progress.
  - Run 2 (game "4", same seed, deterministic) played to y100 again and used the same two set-up commands.
  - I waited a year, then made war on the Nenii (y102), Yonoori (y107), Newaek (y109) and Ureshnerani (y112, from a decision).
  - `bindseat` at y106 (85%), `bloodseat` at y116 (60%), then `testsetup village` (said here: hall, villages and grain) and `deed kingdom` at y116. As queen I made war on the Dwyddlirwyr (y116), Misdonones (y118, by a decision I answered by accident), Gwwynmiswyr (y121), Dwyddlirwyr again (y150) and Beurugaya (y154).
  - The first queen died y121 at 68. The next queen's death at y126 was reported in game 4. I also used `testsetup age 78` once (y121) to try to force a death during a war. It did not produce one.

Test set-up commands used: `testsetup leader` (games 1, 2, 3), `confed 2` (game 1), `confed 3` (game 2, both runs), `allies 2` (game 3), `village` (game 2 run 2), `age 78` (game 2 run 2). I never used `testsetup rule`.

## Bugs, most severe first

**1. A conquered tribe is shown as an ALLY and AT WAR while it is a subject. (misleading text, probably wrong state; games 3 and 4 and game 2 run 2; confidence high)**
- Game 3, y82: `chronicle` says "y82: The Yanaori submit to high chief Bekzesh and must pay tribute to the Khakzeshites Confederacy." The next line is "y82: War breaks out between the Khakzeshites and the Yanaori."
- The same pattern follows every conquest in the three runs: Gruldruningar y86, Murkhaanu y91, Tordreingar y92, Nenii y103, Yonoori y107, Newaek y110.
- `realm` says "Yanaori: subject" and "Wars: none". But `state` says "Yanaori (89 people, 175 km N, opinion -62, ALLY, AT WAR...". It stays like this for years: Gruldruningar and Yanaori at y90, Nenii at y105 and so on.
- The `deeds` list offers `peace` with a subject: "[0] the Yanaori ... hostile ... will almost surely refuse". `deed peace 0` at y92 gave "RESULT — No peace: The Yanaori keep the gift and their anger. The dead on both sides are too fresh." That is ten years after the war, and it costs a gift.
- Expected: no "war breaks out" line after a submission, no ALLY/AT WAR flags on a subject, and no `peace` offer to a subject.

**2. Subject tribes' revolt and instant resubmission is a pointless loop that is reported only in the world chronicle. (wrong outcome / misleading; games 3 and 4; confidence high)**
- Game 3: Gruldruningar y138, 139, 140, 141, 144, 145 each have "Revolt! The Gruldruningar throw off high chief Murme's rule." followed by "The Gruldruningar submit to high chief Murme..." in the same year. Skurdreigungar y134, y140 and y141 do the same.
- Game 4: Nenii y115 and Yonoori y117 ("Revolt! The Yonoori throw off Queen Shashnaash's rule." then "...submit to Queen Shashnaash...").
- No war, no decision and no house note. The only effect is that "joined yNNN" is reset in `realm`. A rising should either cost the ruler something to answer, or end in a real war or a loss of the subject.
- Related: `realm` shows "feeling toward the ruling tribe -89 ... would stay (94%)" for the Yanaori (game 3 y110), so strong hatred has almost no effect on leaving.

**3. Tribute from conquered subjects is never reported and cannot be seen arriving. (wrong outcome or misleading; games 3 and 4; confidence medium)**
- Game 3, y82–y90 (confederacy of followers, then bound): eight years with 1–3 subjects. The `log` has no tribute line. Goods stay "Furs 3/5, Shell beads 5, Copper ore 6, Leather 1", and food is 0–12 days.
- Contrast with tribute I demanded with `deed tribute` (game 4, y106). The log says "y107: The Yonoori sent tribute to the Hurshash clan: food for 1 days and some bronze." That works and is announced.
- Contrast again with the kingdom (y116): "Tribute came to the Hurshash clan from 5 tribes of the Kingdom of the Nernanaya: food for 1 day."
- So the war text "must pay tribute" is true only for kingdoms, or at least it is invisible. I would expect a yearly note for confederacy subjects.
- Side effect: when I made war on a tribe already paying me demanded tribute (Yonoori, game 4 y107), both flows then ran at once. The game allows that.

**4. The player is told "bow to you" and "our subjects" when the player is not the ruler. (misleading text; game 3 y136–y145; confidence high)**
- After the ruler's death the seat passed to Dikhush, then Murme. `realm` line 1 has no "(YOU)", and I am clan head Urikdi of the Zeshbek.
- Yet 18 notices read "The Gruldruningar submit: The Gruldruningar bow to you and must pay tribute." The `log` has "y139: The Gruldruningar, now our subjects, told us of their country."
- Expected: no such text for a non-ruler. Perhaps "the high chief's subjects".

**5. A female ruler is called "king" in the house title. (misleading text; games 2, 3, 4, 1; confidence high)**
- `state`: "House of Urindek: head Shashnaash (F, 47), clan head & headman & king." This is in a confederacy, where the title is "high chief".
- It is also still "king" after the kingdom is made and `realm` says "Queen Shashnaash": game 4 y116, "head Shashnaash (F, 62), clan head & headman & king".
- Game 1: "Zaakmish (F, 30), clan head & headman & king."

**6. `deed war` takes junk as target 0. (wrong outcome; game 4 y150; confidence high)**
- `deed war x` gave "RESULT — War: Menurin's warriors march against the Dwyddlirwyr..." and a war began. It parsed "x" as target 0.
- `deed war 9` correctly gives "Nothing happened." (no target). The text for that is poor.

**7. War results do not match the losses, and many wars have no battle report. (misleading text; games 2–4; confidence medium-low)**
- "Battle: High chief Bekzesh's warriors defeat the Yanaori (4 dead to 1)." does not say which number is ours.
- Several wars show house members "killed in battle" in `log` with no "Battle:" line in `chronicle` at all. Examples: Tordreingar y92 (it just "submits"), Yonoori y107, Dwyddlirwyr y151, Gwwynmiswyr y122, Beurugaya y154.
  - At y154 five of my blood died: "Bishnaash of our house died at 27 (killed in battle)", plus "Bundek ... killed in battle" and three of our blood among the Beurugaya.
- At game 4 y102 the line "Battle: the Nenii repel high chief Shashnaash's warriors (7 attackers dead)." was then followed by "y103: The Nenii submit". A war can be lost on the field and still be won. If that is intended, it needs a sentence.
- Losses do not obviously match the reports. Murkhaanu went 63 to 57 against "2 dead to 1". There is no total casualty line. I could not check the numbers properly.

**8. The `war` target list is hard to explain. (misleading / maybe wrong; games 3 and 2; confidence medium)**
- Game 3, y81: the only target offered is "the Yanaori — 101 people · 26 warriors". Yanaori was not in `known` ("Peoples known: Khakzeshites, Tordreingar, Tipui, Murkhaanu, Shenurikaya") or in the neighbours list. The nearer Murkhaanu (56 people, 185 km, same speech) was not offered, nor was the Tordreingar (200 people).
- Game 2: the Yonoori (44 people, 259 km) were not offered while the Nenii (135, 261 km) were. After the Nenii were beaten, both were offered.
- Game 3 y85 shows "No tribes within reach" for the same distances that were fine at y81.
- No reason is ever stated. A war on a much stronger tribe was never offered, so I could not test it.

**9. The unify bid refuses at "4.2 of 4.2 needed". (misleading text; game 3 y80–81; confidence medium)**
- `realm`: "Bid to unite the tribes: 4.2 of 4.2 needed (prestige 1.1, wealth 0.3, kin 0.4, clans 1.0, tribe 0.4, allies 1.0...)" and `deed crown` gave "Not possible now: Your bid is 4.2 of 4.2: renown, warriors, allies and gifts given all raise it".
- It worked only after the bid showed 4.3. The display rounds, so the player cannot tell the shortfall.

**10. The "clan has outgrown its home" decision keeps coming back after "Hold the clan together". (wrong outcome; games 3 and 4; confidence medium)**
- Option text: "Your word keeps them for eight years, up to 83 people."
- Game 3, y112–113: after `choose 1`, `adv 1` advanced only 0.1 years and the same decision returned. `log` shows "y113: Bekzesh held the Zeshbek clan together." twice in y113, and the same happened at y105/y106.
- The clan was at 81 of an 83-person cap, so it may be a cap effect. If so the text is misleading.

**11. The `realm` "kingdom needs" text contradicts itself. (cosmetic; game 3 y90; confidence medium)**
- For the blood-seat step: "[met] A great hall or a monument in the ruler's village". But the ruler's clan is "a moving camp of foragers" with no village.
- The kingdom line says "[NOT YET] Settled villages for the ruling tribe; [NOT YET] A great hall in the ruler's village".

**12. After the ruler's death, "If the ruler died today" names the wrong leader. (misleading text; game 3 y118; confidence low-medium)**
- `realm`: "High chief Dikhush (F, 66), ruling since year 118" and "If the ruler died today: Begdi (F, 57) would follow, leader of the strongest tribe, the Khakzeshites." But the tribe's leader is Dikhush, by the chronicle ("Dikhush, leader of the strongest tribe, the Khakzeshites, takes the seat").

**13. The end of a war and of a confederacy is not reported as such. (misleading text; game 2 run 1, y101; confidence medium)**
- The ruler died at 47 (injury) during the Nenii war. The chronicle says "The Nernanaya Confederacy falls apart — High chief Shashnaash died, and the tribes had followed her person and not the seat".
- There is no line saying the Nenii war ended.
- `realm` then says "Allies: none". The three alliances sworn for the unification are gone too. The player must rebuild them from scratch for the next bid. That may be harsh, but it is not stated.

## Checked and found working

- `deed crown` (found by deed) works once the bid is truly over: "The tribes are united: Bekzesh is raised as high chief" (game 3 y81).
- `deed war` while already at war: "Not possible now: You are already at war" (game 3 y85).
- Realm warriors match: `realm` warriors 18+36+23+26+39+31+12 = 185, and the decision says "Your realm has 185 warriors" (game 3 y110). Also 112 in game 4 y112.
- Submission is shown in `realm` as "subject" (all runs), in `chronicle` and in a Notice.
- `known` grows after submissions: 2153 to 2696 to 3103 cells in game 3. The log says "The Yanaori, now our subjects, told us of their country." A new people (Gruldruningar, Shaandiim) appears in `known`.
- Subjects' camps are not raidable (the `raid` list has none of them). `tribute` is refused for anyone not weak enough.
- `deed tribute` works and is announced: "The Yonoori agreed to pay us tribute." "...sent tribute to the Hurshash clan: food for 1 days and some bronze." The end is reported: "The tribute ends: The Yonoori pay your people tribute no longer. The ten years are over."
- `bindseat` works (75% and 85%). With it, after the ruler's death (game 3 y118) the strongest tribe took the seat. Four subjects broke away, named in the chronicle, and the Yanaori stayed ("would leave (35%)"). I did not check what happens to subjects' tribute.
- A kingdom by blood keeps everything: the queen died y121 and "the tribes hold together" (all 7 subjects stayed). The second change of queen (y126) lost the Dwyddlirwyr, who "break away", with a child-heir type of case.
- `bloodseat` and `kingdom` work: "Nernanaya Confederacy is now the Kingdom of the Nernanaya". Stay chance for subjects rose (Newaek wavering 66% to would stay 89%), and kingdom tribute began the same year.
- War decisions that arrive unprompted ("A war of conquest?") agree with `realm` strength. Answering "Make war" starts a war and "Keep the peace" does nothing.
- Wars ended in submission in all 12 tries, in 1–2 years.

## Could not test, and why

- Another tribe making war on me (answering fight, submit or pay): no such decision came up in about 60 years across games 3 and 4. My watcher stops at any unknown decision type, and none was a war on me.
- A war on a tribe of another realm: no second realm ever existed ("Realms in the world: none"). A war on an ally outside the confederacy: `deed ally` with the Shaandiim failed ("Not yet ... More goodwill is needed"), so I had no such ally. Game 1 offered no targets at all.
- A war on a tribe much stronger than I am: the list only ever offers weaker ones, and the decision text says "weaker than your realm".
- Wars still in progress when a ruler dies: only run 1 of game 2 (unbound, so everything ended). In game 4 the war ended within a year before the queen died, even with `testsetup age 78`.
- Calling up the realm's warriors for a `war`: the `war` deed has no force choice, so I could not check numbers beyond the realm total. The `raid` deed lists "232 warriors of the realm" as a force, and I did not run a raid.
- Game 1: see Summary. Game 2 was not run to year 100 only once: the first run was lost to an early death, so I replayed.

## How it plays

- Wars are very easy: all 12 ended in submission in a year or two. There was no way to lose, give up or fail, and the player never sees strengths beyond "N people · N warriors".
- Conquest is the best way to a kingdom: subjects count as tribes, people and warriors for the kingdom needs. Only the kingdom makes them pay (bug 3).
- Subjects have no cost for the ruler: they revolt and resubmit for free, and their hatred has no effect (bug 2). A subject that is never at risk makes the kingdom step feel the same as before.
- The confederacy dies with the ruler if unbound, and when bound the subjects mostly leave. That is a good lesson, but nothing warns the player before the death. The kingdom needs `testsetup village` unless the ruler lives about 30 years as a farmer.
- Seed 8 has only two neighbours, so `testsetup confed 2` leaves nobody to fight. A seed check, or a word that "confed N" eats every neighbour, would help testers.
- The yearly "outgrown its home" decision, gatherings and omens are too many for a 60-year run. An `auto` for them would help.

---

## Tester C

# QA report: succession at every level (tester C, port 7753)

## Summary

All games were played honestly (choose 0 on routine decisions, `adv 20` loops) to about year 70-72 before any set-up command. Runs with the same seed and the same choices came out identical, so one seed gives the same year-70 position every time.

Seed 12 and seed 13 had neighbours by year 70. Seed 11 did not (`Neighbouring tribes: none known`), but `testsetup allies 3` and `confed 3` still worked there.

| Game | Seed | Reached | Case and result | Set-up commands used |
|---|---|---|---|---|
| 102 | 13 | y71-72 | Case 1, confederacy as a following. Ended at the ruler's death as foretold. | `testsetup allies 3; confed 3; age 95` (`leader` not needed, I was already leader) |
| 101 | 12 | y70 | Case 2, bound to the seat (seed 12). Case 7 backup. | `confed 3; rule 1; age 95` |
| 103 | 13 | y71, then y88 | Case 2 (seed 13), then case 7 played 17 years as a member. | `confed 3; rule 1; age 95` |
| 122 | 11 | y72-76 | Case 2 (seed 11). | `allies 3; confed 3; rule 1; age 95` |
| 104 | 13 | y71-74 | Case 3 (grown heir, by blood). Also a short-lived war then a death (case 9). | `confed 3; rule 2; age 95` (twice) |
| 201 | 12 | y0-8 | Cases 4 and 5, played from year 0 so the heir was a child. | `leader; confed 3; rule 2; age 95` (four times, one per ruler) |
| 105 | 13 | y71-81 | Case 6 (kingdom), with a war already running at the queen's death. | `leader; village; allies 4; confed 4; rule 2; age 95` (twice) |
| 106 | 13 | y71-83 | Case 9, confederacy at war. The war ended before the death. | `confed 3; rule 2; age 95` |
| 100, 121, 123, 301 | 11 | y72-99 | Case 8, clan and tribe rules. | `age 95` or `age 69` only |
| 112, 113 | 12 | y70 | Tried to arrange a war. Nothing was within reach. | `confed 2` or `confed 1; rule 1` |

Not reached: a death during a confederacy war (case 9), a death while the clan is being raided (case 9), a male king (case 6), and the tribe-by-blood rule (case 8). Details are under "Could not test".

## Bugs (most severe first)

### B1. A confederacy's ruler, and a queen, is called "king" in `state` and `legacy` (wrong title)
Severity: wrong text. Confidence: high.

Seen in games 102, 103, 104, 105, 106 and 201, every time the head rules a confederacy or kingdom:
- Game 102 (seed 13, y71), right after `testsetup confed 3`. The head is Rhipath (F). `realm` says "High chief Rhipath (F, 73) (YOU)", but `state` says:
  `House of Maenbreth: head Rhipath (F, 73), clan head & headman & king.`
- Game 104, same wording after the ruler's death:
  `House of Maenbreth: head Minmidd (F, 42), headman & king.`
  `legacy`: `Rhipath the Bold, years 21–71 (clan head, headman, king)`.
- Game 201 (y0): `head Lannuq (F, 33), clan head & headman & king`. Later `head Wancha (F, 13), headman & king`.
- Game 105, after the kingdom was founded: `realm` says `Queen Braethri (F, 20) (YOU)`, `state` says `head Braethri (F, 20), headman & king`. `legacy`: `Minmidd the Open-handed, years 71–77 (headman, king)`.

Expected:
- A confederacy's ruler is "high chief", and `state` and `legacy` should not say king.
- A kingdom's ruler is "queen" or "king" to match sex.

The task brief says never "king" for a confederacy, and a woman is never "king". `realm`, `log` and `chronicle` use the right words. Only `state` and `legacy` use the wrong one.

### B2. No heir of the blood: the realm foretold a successor, but the confederacy dissolved (wrong outcome and misleading text)
Severity: wrong outcome. Confidence: medium-high. It may only happen because the player's house ended, but nothing says so.

Game 201, seed 12, y5-8, rule 2. The ruler was Xunqun (M, 6), the last of the house.
- `realm` before the death:
  `If the ruler died today: Waixaaq (F, 40) would follow, no heir of the blood; leader of the strongest tribe, the Taashpeeshlan.`
  `How it is held: By blood. ... with no heir at all the tribes choose.`
- After the death (`chronicle`):
  `y8: Succession quarrel among the Taashpeeshlan: the Tsuwan clan resents Waixaaq's rise.`
  `y8: The Kagu Confederacy falls apart — High chief Xunqun died and the tribes went their own ways.`

The tribes did not choose Waixaaq. The realm simply ended. The reason given ("tribes went their own ways") is the text for a following. At the time only two tribes were left (3 had become 2 after two breakaways). If a two-tribe realm cannot survive a death, the realm text should say so.

Also noted: the player's house ended with it (`DECISION NEEDED (end)`), so the game is over. Case 5 therefore cannot be played on.

### B3. Heir aged 15: the forecast says "grown", the outcome says "still a child"; a 97%-stay tribe broke away (misleading, inconsistent)
Severity: misleading text. Confidence: medium-high.

Game 105, seed 13, y77, kingdom, rule 2.
- Before the death, `realm`: `If the ruler died today: Braethri (F, 15) would follow, her daughter.` There was no "(a child)" tag, which case 4 shows for ages 9 and 12. Stay chances were `would stay (97%)` for Goldgaldir, Meektsutltin and Gerkogir, and 98% for Bybrethones.
- After the death, the decision text: `Braethri, her daughter, aged 15, now leads the House of Maenbreth — still a child, guided by the elders of the clan.`
- `chronicle`: `y77: Queen Minmidd of the Kingdom of the Braethmiddwyr is dead. Braethri, her daughter, takes the seat as queen — but the Goldgaldir break away.`

The kingdom text promises "Tribes then seldom leave when a grown heir follows". The forecast and the outcome use different age thresholds for "child". A player cannot plan around the stated 97%.

### B4. Under "a leading house", the clan seat left the old head at age 95, before her death, with a "passed over" note (misleading text, contradicts the rule text)
Severity: misleading text. Confidence: medium. A 95-year-old is an artefact of `testsetup age`, but it shows the code path.

Game 301, seed 11, y98. After `clanblood`, `rule` said: `A leading house (since year 94). When the clan mother dies, the seat goes to the clan mother's grown daughter...`

After `testsetup age 95`, the same year, before she died, the log said:
`y98: Foddboch became head of our clan, not Gwynrhidd: Foddboch is the head of the house that holds the seat of the Fafodd clan.`
It came before `y98: Gwynrhidd died (old age) at 95. Foddboch, her daughter, now leads the house.`

Problems:
- The seat moved while the head of the house was still alive, although the rule says "when the clan mother dies".
- The note has the "not Gwynrhidd" phrasing, which is the passed-over wording the task says should be absent.
- It calls Foddboch "head of the house" while she was still only the heir.
- The decision after the death was `Foddboch, her daughter, aged 30, now leads the House of Paemy`, and `state` showed her as clan head. The end state is right.

### B5. `state` shows the head with the higher standing, yet the clan seat went to the lower one, with no warning (misleading)
Severity: misleading text. Confidence: medium.

Game 121, seed 11, y79, after `testsetup age 69` under "head for life". `rule` says: `When it falls open, the clan chooses whoever stands highest.`
- `state`: `Clan head: Gwyncach (NOT you; standing 1.23 vs yours 1.66)`.
- Log: `y79: Gwyncach became head of our clan, not Gwynrhidd: Gwynrhidd is 70, past the years of full standing.`

The age penalty is stated in the log but not in the standing numbers, so "highest standing" looks wrong.

### B6. `rule` still says "Leader for life" after the leader was removed at 70 and then won the seat back (cosmetic)
Severity: cosmetic. Confidence: low-medium.

Game 121, y79:
- Log: `y79: Gwynrhidd won the leadership of the Pwyrgwynii from Rhathbo: clans with 117 people stood with us, 47 against.`
- `rule`: `Tribe Pwyrgwynii: Leader for life (since year 78). The leader keeps the seat until death, the age of 70...`

She is 70 and regained the seat by a challenge. Unclear whether she is still "for life".

### B7. Smaller text issues (cosmetic)
- `realm` in a kingdom says `a kingdom since year 71, kingdom since year 77` (game 105). It should read "confederacy since 71".
- `realm` right after setup says `a confederacy since year 70 ... ruling since year 58` (game 101). With `confed` at year 0 (game 201) it says `ruling since year -12`. This is the "twelve years" set-up showing through.
- A non-ruler member still sees the ruler-only line `Next step: Make the seat pass by blood [deed bloodseat] chance 38%; needs...` (game 103, y71, after Tyngold took the seat).
- The forecast `Ludu (F, 61) would follow, leader of the strongest tribe, the Zoluu` (game 101, y70) was shown while Gudako (F, 65) was both the ruler and the Zoluu's leader. Ludu is not the leader now.
- `family` lists the spouse again under "Others of the blood in clan". Examples: Taashwan (M, 37) in game 101; Paikitl (F, 27) twice in Cheeknaa's household and blood list.
- After the house ends, `adv` repeats `THE HOUSE OF Lannuq HAS ENDED...` many times (game 201).
- `testsetup age 95`: "an old head dies within a year or two". Actual: died after 0.2-0.4 years (games 102, 104, 105, 106), but after 3 years in game 201 (Lannuq, 95 to 98) and after 4 years in game 122 (95 to 99).

## Checked and found working

- **Case 1 (game 102, y71).**
  - `realm` said: `If the ruler died today: no one would follow; the realm would end.`
  - The log said: `The Realm of the Braethmiddwyr falls apart — High chief Rhipath died, and the tribes had followed her person and not the seat, so each went its own way.`
  - `state` afterwards: `Meektsutltin ... ALLY`, `Bybrethones ... ALLY`, `Goldgaldir ... ALLY`. The three alliances were kept.
  - `realm` afterwards: `bid 5.8 of 4.2 needed`. The bid is open again.
  - The new head Minmidd was not clan head (standing 1.25 vs Braethmyth 1.39), so the `crown` deed is absent. She must first win the clan (`challengeClan`, 28%, failed), then the tribe.
- **Case 2 (three seeds), foretold against actual.**
  - Seed 12, game 101: forecast Gudako of the Zoluu. Actual: `Gudako, leader of the strongest tribe, the Zoluu, now holds the seat`. Ruling tribe became Zoluu.
  - Seed 13, game 103: forecast Tyngold of the Goldgaldir. Actual: Tyngold, ruling tribe Goldgaldir.
  - Seed 11, game 122: forecast Rhathbo (F, 62-65). Actual: Twychmach (M, 42) of the Pwyrgwynii. The last forecast I saw was one year before the death (y73), so this is not a clear mismatch.
  - Tribes leaving, rule 1: stated stay chances were 88/88/90, 95/95/95 and 95/95/95. All 9 tribes stayed; a stay-all result is expected about 70%, 86% and 86% of the time.
  - Tribes leaving, rule 2 and kingdom, grown heir (games 104 and 106, stay 95%): all stayed.
- **Case 3 (game 104).** `Minmidd, her daughter, now holds the seat`. `realm` showed `High chief Minmidd (F, 42) (YOU)`. The chronicle said `takes the seat as high chief and the tribes hold together`. The state title was wrong (B1); the other titles were right.
- **Case 4 (game 201), child heir.**
  - Decision text: `Wancha, her daughter, aged 13, now leads the House of Lannuq — still a child, guided by the elders of the clan.`
  - Tribes leaving: Zoluu broke away (60% stay) while Rodryrlings and Shemuim stayed. Later Rodryrlings broke away (62% stay) while Shemuim stayed. That is 2 leavers out of 5 chances, against the stated about 40% leave each time.
  - Chronicle: `takes the seat as high chief — but the Zoluu break away.`
  - Gap: the house `log` does not name the departing tribe; only `chronicle` does.
- **Brother heirs.** `Xaaqcheek (M, 16), her brother` took the seat as `High chief Xaaqcheek (M, 16)`. The realm text switched to "his heir".
- **Case 6 (game 105).**
  - `deed kingdom 0` worked once the needs were met. Cost and "no dice" matched.
  - `Queen Minmidd (F, 48)`, then `Queen Minmidd of the Kingdom of the Braethmiddwyr died. Braethri, her daughter, now holds the seat.`
  - No "high chief" or "king" in `realm`, `log` or `chronicle` after the founding. Afterwards: `The Brollynii submit to Queen Braethri`, `Revolt! The Brollynii throw off Queen Braethri's rule.`
  - What I had to set up: `testsetup leader; village; allies 4; confed 4; rule 2`.
  - Needs, step by step:
    - Population was 391 of 400. It reached 400 after a year of play.
    - "Fifteen years standing, or one ruler succeeded" needed one real death first (case 3 again).
    - `A great hall in the ruler's village` vanished after `y72: We left our old village, its walls and halls behind.`
    - Building another hall needed Braethmyth, the clan head, to agree (`deed build 2`). She said no at y73 and yes at y77.
- **War and succession (game 105).** A war ongoing at the queen's death carried on under the new queen. The queen was named correctly.
- **Case 7 (game 103), y71 to y88, as a member.**
  - The house log reported each ruler change: `y79: High chief Tyngold ... died. Greildhei, his son, now holds the seat.` and `y87: ... Gurgald, his son, now holds the seat.`
  - The chronicle reported `y76: High chief Tyngold made the seat pass by blood`.
  - `Earlier rulers: Rhipath, Tyngold, Greildhei` matched.
  - A member has no deed to leave, rise, make war or claim the seat. Only `clanlife` and `tribelife` exist.
  - My head Llengwis became clan head and headman by y88, and `realm` forecast Llengwis would follow "no heir of the blood" if Gurgald died.
- **Case 8 (clan "head for life", natural death, game 100).**
  - `clanlife` at y72: stated 75%. At y78: 81%, 81% and 82% in three games, all succeeded.
  - `tribelife`: stated 90%, succeeded twice, and 90% again in game 301.
  - Game 100 head died at 57 under "head for life". Reason given: `Dinmaer became head of our clan, not Brorhath: Brorhath is only 39, and standing grows until 45; Dinmaer has more children (9 against 7)`. That fits the rule ("chooses whoever stands highest").
  - The `rivalry` decision text said `Your chance of keeping the seat is about 100% (the Pwyrgwynii hold their leader for life...)`. I chose "Face the challenge" and it held (`You still lead`).
  - `clanblood` gate: 15 years of life, then a great hall or granary. Stated 81%, 88%, then 90%; it succeeded at y94 in game 301.
  - `rule` then showed `A leading house (since year 94)... Would follow today: Foddboch, her daughter`, and the seat went to Foddboch (see B4 for the note).
- **Consistency checks.**
  - I never saw the head of the house change while the old head was alive. The clan seat did move at 95 or 70, once, under "head for life" (B4, B5).
  - No dead ruler was named a year later. I checked games 122, 104, 105, 102 and 100 after two more years.
  - No double successions: each death had one house line and one realm line.
  - Titles and pronouns in `realm`, `log` and `chronicle` fit sex: "her daughter", "his brother", "Queen Braethri".

## Could not test, and why

- **Case 8, tribe "by blood" (`tribeblood`).** The deed stays closed: `The tribe needs at least 180 people (it has 101)` (game 301, y98). Tribes in seeds 11-13 stay near 100-140, so I could not reach it. Neither of the other two rule shapes for the tribe ("for life" and "by standing") ended in a death under test conditions.
- **Case 8, death of a tribe head under "for life".** `testsetup age 95` pushes the head past the age-70 limit, so the seat is already open (game 123: `Rhiddpae of the Mymyr clan was chosen to lead the Pwyrgwynii`). I only saw a natural death for the clan (game 100), not for the tribe.
- **Case 9, death while the confederacy is at war.**
  - Wars against a nearby tribe finished within the same advance. In game 106 they ended before the death, and game 104's war submitted in the same year.
  - The only live case was game 105, where the war was left running by accident. I answered `choose 0` to `A war of conquest?` while stepping through decisions. That was a kingdom, not a confederacy.
  - Wars need a tribe "within reach" (`No tribes within reach` in games 102, 112, 113), which only appeared late in seeds 13 and 12.
- **Case 9, death while the clan is being raided.** No raid on my clan occurred, and I have no way to cause one.
- **Case 6, king (male).** All heads were female or minor males; a kingdom with a male heir needs 400 people and a long male line. I never reached it. The `kingdom` deed text always read "with you as queen", even for a confederacy led by a woman only. I could not check the wording for a man.
- **Case 7, winning the seat back.** The member's deed list never offered a way (see "Checked"). I did not try to win the ruling tribe's seat by war or crown.
- **Case 4 and 5 under honest play.** I used year 0 (heirs are children there). A normal-age run might differ. I did not find a natural child heir at year 70.

## How it plays

- The set-up commands (`confed`, `rule`, `age 95`) are fast, but the first realm death happens almost at once, so the "five years as ruler" gate of `bindseat` and the "fifteen years" gate of `kingdom` are only crossed by waiting, or by one death. Honest play to a kingdom would take a very long time.
- Breakaway chances are readable and mostly credible. In seed 13, a tribe at 97% stay still left because the heir counted as a child (B3).
- Losing the clan seat right after a ruler's death is common. The new head is usually under 45 (standing is still growing) or under 30 (the clan mother minimum). The new head therefore cannot use `crown` or `war` and must first climb back (`challengeClan` at 24-35% and a 5-year wait). The member's future in a realm is nearly passive: no leave, no rise, no seat-back.
- A kingdom depends on the clan head's village. If the clan head (not you) moves the village, the hall disappears and you must beg for a new one. That felt arbitrary and could block the kingdom for years.
- Children as heirs make realms shed 1-2 tribes per generation at 60% stay. That is harsh but readable.
- Seeds 11 and 12 had few or no neighbours at year 70. `Neighbouring tribes: none known` meant exploring cost several years (3-year rests), so unification by honest play is slow there.

---

## Tester D

# War D report: general warfare below the level of realms (port 7754)

## Summary

| Game | Seed | Reached | Test set-up used |
|---|---|---|---|
| 1 | 14 (House of Seru, Kadoori) | year 180 | none |
| 2 | 47 (House of Matlci, Leeshteenaq) | about year 110 | none |
| 3 | 29 (House of Fythby, Dwyrconwyr) | about year 99 | `testsetup leader` once, at year 61 (not 60), as allowed |

I did not reach year 180 in games 2 and 3. Reaching a neighbour at all was slow: `raid` is only offered once an exploring party has met a camp, and that took 16 years in game 1.

Approximate tallies. Counts are from the log and the raid results I saw. The log is truncated in places, so treat them as ±3.

| | Game 1 | Game 2 | Game 3 |
|---|---|---|---|
| Raids made | about 42 | about 25 | about 14 |
| Won | about 34 | about 17 | about 11 |
| Lost ("driven off") | about 8 | about 8 (6 in a row against the strongest village) | about 3 |
| Our dead | about 20 | about 14 | about 8 |
| Their dead | about 90 | about 45 | about 30 |
| Captives | about 30 | about 20 | about 12 |
| Heads killed on a raid | 2 (y56, y81) | 3 (Teenleesh y30, Matltaan y93, Waiqteen y96) | 0 (Niddmy, 53, killed y54 was a brother of the head) |
| Treasures taken | 1 named (spear of Kobu, y134), plus about 15 "valuable things" | "valuable things" only | "valuable things" only |
| Times raided by anyone | **0** | **0** | **0** |
| Feuds | about 8 killings answered (one clan feud, "Haaggug" y110) | 0 | 4 |

- **Feuds begun and ended.** In every case the killer was in a clan of my own tribe or house, or the exiles' tribe. Details are under "Checked and found working" and in bugs 1 and 2.
- **Tribute.** Demanded 5 times (game 1: Zushinu y17 and y45; game 3: Brekdregungar y61, Braerrhoddon y69; Styhykir refused y65).
- **Peace.** Made 3 times.

## Bugs, most severe first

### 1. Blood revenge can kill the avenger's own house member, or the avenger himself (wrong outcome)
- **Games and seeds:** game 3 (seed 29) y54 and y87; game 1 (seed 14) y137.
- **Game 3, y54.** Commands: `choose 0` on "Niddmy has been killed ... killed in a raid by the Dwyrconwyr. The Mwybwyth clan of the Dwyrconwyr owes your house blood". My own raid had just killed him. Output:
  - `y54: Bithcon of our house died at 22 (killed in revenge by Bithcon).`
  - `y54: Bithcon avenged the house, killing Bithcon of the Mwybwyth clan.`
  - The killer and victim have the same name and are both "of our house", so this looks like a suicide.
  - My own clan Mwybwyth was named as the owing party for a death caused by my raid.
- **Game 3, y87.** `choose 0` on "Bybwyth has been killed" gave `Tethbith of our house, living with the Broddfych clan, died at 17 (killed in revenge by Bybwyter).` and `Bybwyter avenged the house, killing Tethbith of the Broddfych clan.`
- **Game 1, y137.** `choose 0` gave `Vaturu of our house died at 20 (killed in revenge by Kavaku).` and `Kavaku avenged the house, killing Vaturu of the Pakaa clan.` Kavaku is also tagged `[house]` in `people`.
- **Expected:** revenge should hit a man of the other clan who is not of the house.
- **Confidence:** high.

### 2. The "blood owed" decision names the wrong party, or my own clan or house, as the debtor (wrong outcome / misleading text)
- **Game 3, y86.** "Braermoch of your house (42, her brother) was killed in a raid by the Dwyrconwyr. The Mochcaen clan of the Dwyrconwyr owes your house blood."
  - The log says he lived "among the Bwyterantes". My own raid that year hit Braerrhoddon.
  - The debtor, Mochcaen, is a clan of my own tribe.
  - `choose 1` did pay: food rose 226 to 297 days.
- **Game 3, y90.** After a quarrel (`choose 2`, "Fight"): "Rhaerbith of your house (24, her son) was killed by Bycon. The Mwybwyth clan ... owes". Rhaerbith lived with the Mochcaen clan, and the quarrel was with a Mochcaen house. `choose 1` answered `The Mwybwyth, our own clan, made amends for the killing; no goods passed.`
- **Game 1, y133.** "Likaba of your house was killed by Situ. The Pakaa clan owes" (my own clan). `choose 1` answered "The Pakaa, our own clan, made amends; no goods passed." So demanding compensation is a no-op, and the heir can be the killer.
- **Game 1, y158.** "Biwi (her sister's son) was killed by Kawi", who was my heir `[house]`. Then "Kawi has been killed by Haagshin" the same year. I answered `choose 2` "forgive", then `choose 0` "revenge". The revenge came out as `Rupo went to avenge the house on the Pakaa, but was driven off.`
- **Expected:** the debtor should be the killer's clan, not me or my own house. A decision that asks me to demand blood from myself should not appear.
- **Confidence:** high that the attribution is wrong. Medium on exactly why.

### 3. `raid` shows no chance of success, and the party size does not match the clan (misleading text)
- The `deeds` raid block never shows a chance, which the task says it should. Example: `- raid: ... you can call 8 clan warriors` then `forces: [0] 8 clan warriors` and `[0] the Darzag camp of the Zushinu — 27 people · 5 fighting men`.
- I cannot check any chance against outcomes. Only the number of enemy fighting men is shown.
- The party also exceeds the clan's fighting men. In game 1 at y16 it was "8 clan warriors" while `state` showed "5 men of fighting age". In game 1 at y41 the tribal force was 17.
- The outcomes are far more lopsided than the party/defender numbers suggest:
  - Game 1: wins against 5-man camps with 0 losses, repeatedly.
  - Game 2: six failures in a row with 6-14 warriors against a 12-man village.
- **Confidence:** high for "no chance shown".

### 4. Two raid-ability and state-display problems (misleading text)
- **Raid availability is tied to knowing the camp, not to distance.**
  - Game 1, y23-24: `state` listed Zushinu at "158 km N" and then "89 km N" after I moved camp. `deeds` still said `not now: No camps of strangers you know of within 160 km — explore to find some`, and `deed raid 0 0` failed with that.
  - After `deed explore 1` ("They met the Zushinu") the raid was offered again.
  - A tribe listed under "Neighbouring tribes" with a distance is therefore not necessarily a legal raid target.
  - The reason is not stated, and the knowledge lapses over time.
- **Stale state right after a move.**
  - After `deed migrate 2 N 120` (game 1, y74), `state` still showed the old surroundings: "Kadoori (70 people, 1 km W)" and Zushinu at 168 km.
  - After one `adv 1` it showed Kadoori at 118 km and Zushinu at 51 km. It was right after a year passed.
  - `movecamp` behaves the same way.
- **Confidence:** medium.

### 5. A friendly clan I have just raided, and a friend's blood, are offered as targets; raids kill and enslave my own blood (wrong outcome)
- **Game 1, y78.** The `raid` list offered "the Tuza village of the Kadoori — They count you as friends: a raid ends that". I raided it (a driver mistake, but the game allowed it).
  - Result: `Kobipo, of our blood among the Kadoori, died at 49 (killed in a raid by the Paruu).`
- **Game 1, y101.** A raid on the Kawu produced `Biko, of our blood among the Kadoori, was taken captive by the Pakaa clan of the Paruu.` `people` then showed `Biko M 6 [house] [slave]`, a slave who is of my own house.
- **Game 1, y180.** The "opportunity" strike killed three "of our blood among the Xunpeewa".
- **Why this is a bug:** once the house is large (game 1 had 431 blood), nearly every raid kills or enslaves my own kin, with no text about it beyond the log line. This is wrong or at least undesigned.
- **Confidence:** medium (design versus bug).

### 6. Slaves vanish without a note, and a captured slave's "[house]" ownership is odd (misleading text)
- **Game 1, y28.** Seru died holding 5 slaves (Wiluqmaq, Zuzag, Gakzu, Daagdesh, Muggak). The next `state` showed "0 slaves". The only log line was `Zuzag, a slave of Seru, escaped back to the Zushinu` (y27). The other four were never mentioned.
- **Game 1, y28.** Dezaru "married Wiluqmaq of the Paka clan" the same year, so some may have been adopted. Nothing says so.
- **Game 1, y33-y38.** Dunmug (F 27, slave) was in `people` at y33. At y38 a different "Dunmug M 6" was captured and the first Dunmug was gone, with no log line.
- **Game 1, y38-y41.** Zuzag F 33 "[slave] pregnant" was in `people` at y38 and gone at y41. `log` (y38-41) contains no line about her.
- Other cases were reported (`... escaped back to the Zushinu`, `adopted into the Waishweetl clan`, `Zabo inherited 1 slave`), so the unreported ones look like omissions.
- **Confidence:** medium.

### 7. "Peace" chance label does not match results (misleading text, low confidence)
- **Game 1, y51.** `peace` listed the Zushinu as "will almost surely refuse". It succeeded on the first try: `Peace: Gifts are exchanged and the dead are named aloud one last time.`
- **Game 3, y61.** `peace` listed the Braerrhoddon as "unlikely to agree". It also succeeded on the first try (opinion -41 to -8).
- The only refusal was game 1 y20, with "will almost surely refuse" and "The dead on both sides are too fresh."
- Two of three attempts against "unlikely" or "almost surely refuse" odds succeeded, which is more than "almost surely refuse" suggests.
- **Confidence:** low.

### 8. "Lead for life" claim made by the tribe, then another leader chosen a year later (low confidence)
- **Game 2.** `y72: The Leeshteenaq agree that Waiqqu shall lead for life.` Then `y73: Kaiqpaish of the Weetlwaatl clan was chosen to lead the Leeshteenaq, not our clan: Kaiqpaish has given more gifts and feasts; Kaiqpaish is the cooler head.`
- Waiqqu was the head of the Waishweetl clan and may not have been the tribe's leader. If she was, a "for life" seat was lost in a year with no death and no "thrown down" note.
- `rule` in game 2 shows "Leader for life (since year 72)" for a tribe whose leader changed.
- **Confidence:** low. I could not tell who held the tribe seat.

### 9. Minor
- **Migration targets change per call.** `deeds` shows different "Nearby/Far away" migrate targets on every call at the same year (game 1, y9-y16). It looks random per call. Cosmetic.
- **Tribute reports the wrong clan.** "The Zushinu sent tribute to the Paka clan" went to the clan even while I led the tribe (game 1, y43). Plausible by design.
- **Foundling and oath results are opaque.** Oath calls (`oathback`) say "All of them come home" or "1 of them does not come home" but never say whom the men fought.
- **`Dealings` / blood owed never appeared in `state`.** In all feuds I looked for it and never saw it. See "Could not test".

## Checked and found working
- **Raids:**
  - Food carried off matches `state`. Game 1 y88: "You carried off 87 days of food" and food 460 to 547. Game 2 y81: 124 days and 377 to 490, with 2 extra mouths.
  - Dead on both sides match the tribe counts. Game 1 y16: Zushinu 27 to 24 (3 dead). Game 1 y19: 26 to 20 (3 dead + 3 captives).
  - Captives appear as slaves once each (`3 slaves` and 3 `[slave]` lines).
  - Treasures taken appear under the clan in `treasures` with "carried off by the Pakaa clan of the Paruu (year 134)".
- **Tribute:**
  - It is paid every year for ten years and reported in the log. Game 1: y18 to y27, ended y28. Game 3: Brekdregungar y62 to y71, Braerrhoddon y70 to y79.
  - Goods arrive: furs 5 to 9 in game 3.
  - The end is announced: "The tribute ends: The Zushinu pay your people tribute no longer. The ten years are over."
  - Refusal works: `The Styhykir refused us tribute` (goodwill -22), followed by a 4-year cooldown. The cooldown applies to every target.
- **Blood-price:**
  - Game 1 y102 `exilesback` `choose 1`: food 570 to 542 (4 weeks), 1 carving taken, opinion +12 as promised.
  - Game 1 y138 `choose 1` on a killing by another tribe's clan: `The Pasi paid 2 amber in compensation.` Amber went from 1 to 3.
  - Game 3 y86 `choose 1`: food 226 to 297.
- **Head killed on a raid and succession:**
  - The text matches: "Gakono died (killed leading a raid on the Zishmug) at 23. Vagawo, her brother, now leads the house."
  - Game 1 y56, y81; game 2 y30, y93, y96. The heir took over each time.
  - A head also died on an expedition: "Weetltiq died (lost on an expedition)".
- **Rule deeds:**
  - `clanlife` (71%) and `tribelife` (80%) each succeeded on one try, and `rule` showed "Head for life".
  - `challengeClan` showed "about 10%" and failed with the chance explained.
  - A `rivalry` decision showed "chance of keeping the seat ... about 100%" and I kept it.
  - The shown standings are consistent.
- **Peace:** `peace` raised opinion (-41 to -8). It does not stop my own raids, which still list the tribe as "strangers".
- **Decisions:** oath, exiles, foundback and quarrel decisions all resolved and did not repeat.

## Could not test, and why
- **Being raided (`raided` decision, "A war party!", pay or flee):** it never happened, so I could not test fight, pay, flee or how soon a clan returns.
  - Across 3 games and about 330 game-years nobody raided my clan. In game 2 I raided one 12-man village 8 times, and in game 1 I raided the Haaggug and the Zushinu repeatedly. I also stood next to hostile tribes in game 1 after `migrate`.
  - The only retaliation was a "Blood vengeance sworn" decision (game 1 y110, Haaggug), which I answered "Let them come". No attack followed in 20 years.
  - AI war parties exist (chronicle "A war party of the Leeshteenaq ... sets out", "Mugzaani ... Bakuek") but none was aimed at me.
- **Feud from first blood to its end across several decisions, with "Dealings" clearing:** `state` never showed a "Dealings" or blood-owed line. Feuds with other clans ended in one decision (paid or forgiven), or the clan split. I could not follow one for years.
- **Allies in a fight:** none. `ally` always said no one thought well enough of me, and the task forbade `testsetup allies`.
- **`clanblood` and `tribeblood`:** `clanblood` was "not now: The village needs a great hall or a granary". `tribeblood` needed more years than I played after `tribelife`.
- **Challenge deeds against a for-life head:** I was under 30 (clan mother minimum) when it mattered, so I only saw the "three quarters" text.
- **Years 100-180 in games 2 and 3.**

## How it plays
- **No sense of risk.** The raid screen gives no odds, so risk is invisible until a head dies. Weak targets can be hit every 3 years forever with almost no cost.
- **Finding someone to raid is the hardest part.** `raid` is only available once an expedition has met a camp. It took 16 years in game 1 and the knowledge lapses.
- **Raiding is almost free.** Retaliation never came. A 3-year cooldown, 5 years of cooldown after a failed tribute, and the loss of a head are the main costs.
- **Tribute is easy.** One deed, ten years of small payments (a day or two of food and some furs). It is harmless and weak as a reward.
- **Peace is cheap.** It undoes a war you started, and I could raid the same tribe the next day. Peace should probably mean something for your own raids.
- **Feuds are mostly decisions about my own clan.** They felt generated from my own house (bugs 1 and 2) rather than from real enemies.
- **The same decisions repeat.** Marriage, gathering, omen, friendneed and exiles dominate the stops. The `auto` option helps, but each type has different option numbers each time, so `auto` is fragile (for example `marriage` had `Not yet` as option 2, then 1).

---

## Tester E

# war_E: the long game among other peoples' realms (tester E, port 7755)

Per-20-year records (state top lines, `realm`, `known`, chronicle tail, `adv 5` timing) were saved by script in /home/claude/play/rec_51.txt, rec_52.txt, rec_53.txt and rec_54.txt. Several 20-year points were skipped in early years, when nothing of interest existed, because my driver advanced in 5-year steps and stopped only on decisions. Drivers: /home/claude/play/drv.py.

## Summary

| Game | Seed | Reached | Test set-up used | Outcome |
|---|---|---|---|---|
| 51 (game 1) | `new 5` | year 263, house alive | none | House of Gagrar, Ragbugites. Tribe leader at y56-76 and y90-110. Never led a realm. Silently became a subject of the Kingdom of the Urururiaya (about y239-245) and was dropped again when the king died (y262). |
| 52 (game 2) | `new 3` | year 288, house alive | none | House of Ledele, Zigei. Silently subjected to the Realm of the Dabai (y185). Later my clan collapsed under raids and ended up inside a different tribe (see Bug 9). |
| 53 (game 3, first try) | `new 5` | about y240 | `testsetup leader`, `testsetup allies 3` at y154, then `deed crown` | Founded the Gagragites Confederacy at y154. `bindseat` worked at y163 (85%). I let the driver run on and the ruler died (about y190) before I made the seat pass by blood. That was my error, not a bug. The realm survived as a blood-held confederacy under successors. I used the rest of this game as an ordinary house in a confederacy. |
| 54 (game 3, redo) | `new 5` | year 243 | `testsetup leader`, `testsetup allies 3` at y160 and again at y191, `deed crown` both times | First realm: `bindseat` failed twice (y167, y190; stated chance 85% each time). The ruler died at y191 and the realm "falls apart ... the tribes had followed her person". Re-founded at y191. `bindseat` worked y198, `bloodseat` worked y209 (60%). The seat then passed by blood at y213 and y239. Lived beside other realms to y243. |

Realm timeline observed:
- Game 52 world: first realm (Realm of the Dabai, 3 founding tribes) at y159.
- Game 51 world: first realm seen was the Orlu Confederacy (5 tribes) at y207 (it had formed earlier; the formation line fell outside the chronicle window). The League of the Suleans formed at y231. The League of the Urururiaya became the Kingdom of the Urururiaya at y244.
- Game 54 and game 53 worlds had no realm before my own at y154-160, but other realms (Cheeshteetlwa, Neya, Zelu, Hoyeori) existed by y190-240.
- By y263-288 the worlds held 4-6 realms with 5-14 tribes each, not one merged realm.
- One kingdom (the Urururiaya, y244) formed by itself in game 51, "rarely" as the brief says. It raised the League by blood to a kingdom with Bagra as queen.

`adv 5` timings (seconds):

| Game | y90-119 | y148 | y168 | y173 | y212 | y246 | y288 |
|---|---|---|---|---|---|---|---|
| 51 | ~2 | 6.3 | **18.5** | **21.9** | 10.3 | 3.9 | n/a |
| 52 | 1.8 (y137) | n/a | 0.3 (y162) | n/a | 0.6 (y204) | n/a | **11.5** |

Games 53 and 54 stayed at 0.6-4.4 s.
- Game 52 at y283: 10.9 s.
- Game 51 at y263: ~8 s.
- Turns get slow around y165-175 in game 51 (about 10x the early cost) and again in game 52 after y270, then recover.

## Bugs (most severe first)

1. **"king" used for a confederacy ruler, including a woman** — misleading text, games 53 and 54 (seed 5), y154, y160, y191, y241.
   - Commands: `testsetup leader; testsetup allies 3; deed crown 0; state`.
   - Output: `House of Gagrar: head Hagrashish (F, 42), clan head & headman & king.` (game 53, y154).
   - Output: `House of Gagrar: head Urushurik (F, 52), clan head & headman & king.` (game 54, y167).
   - Output: `House of Gagrar: head Shishurush (M, 48), headman & king.` (game 54, y243, a confederacy).
   - `realm` correctly says "High chief". Expected "high chief" for a confederacy, and never "king" for a woman. Confidence: certain. Seen on every state line while ruling.

2. **Tribe shown as both ALLY and AT WAR; subjects listed as hostile enemies; `realm` says no wars** — misleading, game 51, y246.
   - Output in `state`: `Munzashani (83 people, 47 km S, opinion -37, ALLY, AT WAR, the same speech); ... Urururiaya (279 people, 76 km S, opinion -103, ALLY, AT WAR, ...)`.
   - `realm` in the same game, same year: `Wars: none.`, and `Munzashani: ally ... Urururiaya: founding tribe`. These are my own realm's ruling tribe and member.
   - `deed gifts` lists `the Urururiaya — 279 people · now hostile · allies`.
   - `deed peace` offers my own ruling tribe: `the Urururiaya ... will almost surely refuse`.
   - Game 54, y243: `deed peace` lists my own new subject `the Khukmunani ... hostile`. Answer: `RESULT — No peace: The Khukmunani keep the gift and their anger.`
   - Game 54 `state` shows `AT WAR` with Daagshikani, Daagurushites, Ragbugites and Mururikim while `realm` says `Wars: none` (realm-level war only). These may be tribe-level wars that the realm view does not show.
   - Expected: war and alliance not both true of the same pair, or the contradiction explained. Confidence: medium-high that it is misleading.

3. **The kingdom step "Food for a great feast" can never be met by a fishing village; `fields` and `feast` are also closed** — impossible step, games 52, 53 and 54 (clan village type "fishing").
   - Games 53 and 54 `state`: `Large village "Khenurushkum" (fishing) ... Food in store: 0 days.` Game 52: `Pihumouth (fishing) ... Food in store: 0 days / 2 days / 6 days`.
   - Game 53 `realm` at y201: every kingdom need `[met]` except `[NOT YET] Food for a great feast: eight weeks of the clan's food`. Game 54 `realm` at y221: same, and still unmet at y243.
   - Games 52 and 54: `deed fields` → `not now: Only a farming village can clear new fields`, although `state` says `Tribe ... Way of life: Farmers (100% toward farming; grain: farm)`.
   - In these three games the village was founded without any choice from me. Log text in game 52: `y30: We could found a village now.`, then `y37: Ledele fulfilled an ambition: found a village.`
   - In game 51 (farm village, "Food in store: 551-664 days") the farming side worked.
   - Expected: a way to farm, or to store food, in a village the player can reach. A clan that never farms can never found a kingdom or hold a feast. Confidence: medium. I did not find the cause, and I could not test `movevillage` because I was not clan head at that point.

4. **Chronicle claims a realm "fails to make the seat pass by blood" when it is already held by blood** — contradictory text, game 53, y221 and y226.
   - Output: `y221: High chief Rarurik of the Gagragites Confederacy fails to make the seat pass by blood.`
   - Output: `y226: High chief Ururbag of the Gagragites Confederacy fails to make the seat pass by blood.`
   - `realm` at y236 says `How it is held: By blood.`, and it said the same at y201.
   - Possibly the hold resets at each succession and the realm line is stale. Confidence: medium.

5. **Realm dates and states contradict each other** — misleading text, game 51.
   - `realm`: `the Kingdom of the Urururiaya: a kingdom since year 226, kingdom since year 244.` Duplicate phrase. The chronicle says it was a League until y244. The "since year 226" is its confederacy date.
   - The Ragbugites are listed `subject ... joined y245`, but the log at y244 already reads `The Ragbugites sent tribute to Queen Bagra: food for 1 day.`
   - y245 chronicle: `King Hagmur... takes the seat as king and the tribes hold together.`, then `Revolt! The Ragbugites throw off King Hagmur's rule.` and `The Ragbugites submit to King Hagmur and must pay tribute...`. All three are in one year, with no decision for me.
   - Expected: one coherent story, or notice lines for when a tribe was first subjected. Confidence: medium-high for the duplicate phrase, medium for the others.

6. **Log floods with noise** — cosmetic or numbers-running-away, games 51 and 52.
   - Game 51 `log 400` covers only about 2 years. It held 46 `X of our house became a tanner/potter/carver` lines per year (y262, y263) for a clan of 66 people with 5 craftsmen, plus hundreds of `of our blood among the <other tribe> died ...`, `a slave of ... escaped back to ...` and `was taken captive` lines.
   - Counts: blood 1,141 (y163), 2,547 (y212), 3,155 (y225), 4,431 (y246), 6,059 (y263). Game 52: 6,241 (y283).
   - Game 51 y146: `Blood living in other clans: 735` for a tribe of 306 people (blood in other tribes is not separated out).
   - Renown reaches 17,541 (game 51 y263) and 16,026 (game 52 y283).
   - The house's real news (leaving the realm, being raided) is buried in the log. Confidence: certain that it is noisy. Whether the totals are "wrong" is unclear.

7. **Silent change of membership; no decision, no log line, no way to leave** — wrong outcome or missing feature, games 51 and 52 (as a non-leader house).
   - I answered every decision that came. No decision of type join, submit, invite or resist ever arrived in games 51 or 52. The `auto` list never held a realm type.
   - Game 51: `state` changed to `... Part of a realm.` at y239 with no announcement. `realm` then showed me as `subject ... would leave (19%)`. The only trace was the tribute line `The Ragbugites sent tribute to Queen Bagra: food for 1 day.`
   - Game 52: `realm` at y204 listed `Zigei: subject ... joined y185`.
   - `deeds` offers no deed to rise, leave or pay less. Tribute stayed trivial ("food for 1 day", "a little food"). When the king died at y262 (game 51) the line `King Hibaag of the Kingdom of the Urururiaya ... the Ragbugites ... break away` was the only exit.
   - I never held the tribe seat while a realm leaned on us, so I could not test "resist" vs "give way". Please check whether a leader gets a decision.
   - Confidence: certain that nothing reached the house as a decision. Design opinion on whether that is intended.

8. **Slow turns** — performance, game 51 (and game 52 late).
   - `adv 5` took 21.9 s at y173, 18.5 s at y168 and 10.3 s at y212 in game 51, against 1-2 s at y90-120. Game 52: 11.5 s at y288 and 10.9 s at y283.
   - Cause unknown; the slow stretch coincided with many tribes and clans splitting. Confidence: certain that it is slow.

9. **A clan raided to death, then silently moved to another tribe** — wrong outcome, game 52, y246-283.
   - I auto-chose `Stand and fight` for 20 years. The same village was raided about 25 times (decision type `raided`). Examples: `Warriors of the Pukidu clan (Raneori) are coming for the Bayera village — 27 of them against your 19`, y246; `... 35 of them against your 1`, y254; `... 14 of them against your 0`, y260 (a "fight" option with 0 defenders).
   - Clan Bayera went from 94 people (y162) to 20 (y283). Then `state` says `Tribe Kostoir: 128 people in 6 clans ... Foragers (0% toward farming) ... Speaks Sveigyeigish`, and my village is a `Hamlet`.
   - The y264 challenge text reads `Vowura of the Bayera clan is set to lead the Zigei`. The y276 text reads `... ahead of Dapuze of your clan: ... lead the Kostoir`.
   - I got no decision, notice or log line explaining how the clan changed tribes, language and way of life. Some of the raiders (Raneori submitted to the Realm of the Dabai at y227) may have been fellow members of my realm; I could not confirm my own membership at y246.
   - The repeated losing `raided` prompts are my fault, but a clan with 0 fighters has no real answer and the realm does not step in.
   - Confidence: medium that the unexplained tribe change is a bug.

10. **Player trade pacts do not mention the way between the two places** — missing text, games 51 (y99, Shishzashites) and 52 (y98, Duvoi).
    - After `deed pact`, `log` shows only `y98: Taki agreed a trade pact with the Duvoi.`, and the chronicle has nothing for it.
    - AI pacts do: `y84: The Nashteeqlan and the Duvoi agree a trade pact for twenty years. A way is being trodden between Xinchuntuq and Wuduham...`
    - `state` has no way mention either. The `Flint reaches the Zigei for the first time, traded from the Duvoi` line came at y104. Confidence: medium (the way may form silently).

11. **Same seed gives different worlds** — low-confidence, game 51 vs 53/54 (`new 5`).
    - Game 51: tribe `Ragbugites`, clans Ramer 13, Urururi 15, Khenmur 10.
    - Games 53 and 54: tribe `Gagragites`, clans Ramer and Khenmur only. Probably the game number enters the seed.

12. **Smaller text slips**
    - Game 54 y191: a freshly crowned realm shows `Next step: ... [NOT YET] Five years since the last try (5 more)` although the failed `bindseat` belonged to the previous, dead realm.
    - Game 54: `bindseat` failed twice in a row at the stated 85% (y167, y190). Expected about 2%; I note it, not conclusive.
    - A new realm shows its ruling tribe `would leave (0%)` (games 53 and 54, y154 and y160), including the ruler's own tribe.
    - Clan names recur across tribes, for example `Higag` in the Urururiaya and the Ragbugites, and `Gaakkhen` as Danmunites clan vs village. This makes raid lines ambiguous.
    - Game 51 y246: `Tribe Ragbugites: 106 people in 1 clans (Ramer 106)`, a one-clan tribe after four clans left it in one year.

## Checked and found working

- Tribe leadership `challenge` decision, with a stated 100% chance, was won (game 51 y56).
- `settle` deed founded a farm village (game 51 y56).
- `fields` deed in game 51 (clan head, farm village): worked at y63 and y68. Results: `Another 2 stretches are cleared ... It cost three weeks of the clan's food.` The soil wear went from 100% to 80% to 67%. Refused afterwards with the reason `Murra leads the clan, and clears new fields when the clan is short of grain` once I was not clan head.
- `pact` then `ally` with a neighbour (game 51 y99, game 54 y243) worked, and the ally persisted for 100+ years.
- Oath-calling decision (`oathback`): `Keep the oath` cost 1 man, with +35 and +8 renown as stated (game 51 y119).
- `crown`, `bindseat` and `bloodseat` worked as designed once the needs were met (games 53 and 54). The `realm` "Next step" and "A kingdom needs" lines were accurate against my history.
- Chronicle ruler-death lines were consistent with `realm` in games 51, 52 and 54. Examples: `High chief Gaabug ... is dead. Shishurush, of his blood, takes the seat as high chief and the tribes hold together.`; `Hagmur, her grandson, takes the seat as king and the tribes hold together.`; `High chief Lihu ... is dead. Leku ... takes the seat as high chief — but the Danurushites, the Gaakuriim, the Gurvaungar, the Ururshishani break away.`
- Titles: `King Hagmur` and `Queen Bagra` for the kingdom; `High chief` for confederacies and leagues in the chronicle; no "high chief" for the kingdom.
- `deed war` as ruler (game 54 y241, the Khukmunani): `Wars: Khukmunani` appeared in `realm`. The Khukmunani submitted in 2 years (y243: `The Khukmunani submit to high chief Shishurush and must pay tribute to the Gagragites Confederacy.`).
- Alliance with an unlisted outside tribe worked in 2 years (Khengaaku, y243).
- No dead people in `people` (game 51 check), and no tribe-name duplicates in `known` across the four games.
- A great beast (Red Tusker) was killed by my hunters at y90 (game 51), with the tusks kept.

## Could not test, and why

- Resist vs give way when pressed to join or submit: nothing was ever offered to me (see Bug 7). A tribe leader may get such a decision.
- What I pay and what I can do inside a realm: I saw only tribute lines ("food for 1 day", "a little food") and the Ragbugites' own revolt/submit lines, so exact cost per ruler death is unmeasured. I could not test raiding or pacts as a subject beyond listing the deeds, which stayed all AVAILABLE except raids against members.
- Making my seat the realm's ruling seat or challenging inside another realm: no deed or decision exists for it.
- Do realms ally with each other or make peace: no realm-level deed exists. Only tribe-level `peace` and `ally` are listed. I saw an AI `The Ragbugites and the Gagragites make peace` (y242) and my own alliance with Khengaaku.
- A hostile realm warring on mine: in game 54 y191-243 no realm declared war on me. My members left (see below) and ordinary tribes raided me (Daagurushites y238-241).
- Why members left my realm in game 54: the Urikhukim and the Ururmerites went between y213 and y241 and I did not see a notice. The 300-line chronicle window could not reach back to it.
- Great beasts "driven off by `fields`": not seen. Only one beast event (the Red Tusker) happened in game 51, and it was a hunt.
- `fields` cost against `state`: I did not capture `state` before and after in game 51; I have only the "three weeks of the clan's food" text. In games 52 to 54 `fields` was never open (fishing villages).
- `movevillage` on a fishing village: not clan head when I looked.

## How it plays

- Silent subjugation is the biggest gap. A house that is not the tribe leader can be moved into someone else's kingdom and out of it again, with the only evidence a `state` suffix and a one-line tribute notice.
- Realms in other worlds are good to watch: first confederacy y159, kingdom y244 in one world, 4-6 realms at y260-290, none merged into one. They bind seats and pass them by blood as designed. Revolts and re-submissions repeat ("Revolt!" then "submit" next year), which reads like a loop rather than a story.
- Ruling your own realm is smooth until the ruler dies. Binding and blood each need 5-10 years, and a failed 85% roll can cost the window (game 54). Nothing tells you the window is closing. I lost one realm by letting the driver run on.
- A realm with a child ruler or a short-lived by-blood line sheds members quickly (game 54: four tribes to two). Kingdom is out of reach if the ruler's village is a fishing village with no stored food.
- Wars against realm subjects are easy for a ruler (game 54: won in 2 years) and the other realm never responded.
- Late game is long and noisy: the log is unusable after y200, and turns take up to 22 s in a stretch of game 51.
- Farming is too dependent on where a village was founded. Three games out of four never offered `fields`.
