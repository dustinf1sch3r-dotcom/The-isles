#!/bin/sh
# Builds the game: src/geo.js + src/soc.js -> build/sim.js (the simulation, also usable from node),
# src/art.js + src/ui.js -> build/uiall.js, both substituted into src/shell.html -> index.html (the page GitHub Pages serves).
set -e
cd "$(dirname "$0")"
mkdir -p build
cat src/geo.js src/soc.js > build/sim.js
cat src/art.js src/ui.js > build/uiall.js
python3 -c "s=open('src/shell.html').read().replace('/*SIM*/',open('build/sim.js').read()).replace('/*UI*/',open('build/uiall.js').read());open('index.html','w').write(s)"
node -e "require('./build/sim.js')"
node --check build/uiall.js
echo built
