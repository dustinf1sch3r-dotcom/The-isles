# The Isles

Read `HANDOFF.md` first: it explains the game, the code layout, the rules the game keeps, the owner's design wishes, what is open, and how to test and publish.

- Edit `src/`. Never edit `index.html` by hand: run `./build.sh`, which rebuilds it.
- Before committing: `./build.sh` prints `built`; `node tools/fuzz.js 2,7,14 130` ends with `errors 0` and no `BAD TEXT`; `node tools/save_roundtrip.js` passes; for rule changes compare `node tools/balance.js 5,8,11,14 120` before and after.
- `src/soc.js` has very long lines: search with `grep -n ... | cut -c1-400`, never print whole lines.
- Keep the house rule: the head of the player's house never changes while alive and never leaves the clan by marrying.
- Player-facing text: plain, short, in period, no modern words. Chances shown must be the chances rolled.
- The owner plays on an iPhone (home-screen web app from GitHub Pages): check new screens at 390 px wide.
- Working style the owner wants: the strongest model plans and reviews; cheaper subagents build from a precise brief and play-test; check their work (run it, read their patches) before reporting, and say what was and was not verified.
