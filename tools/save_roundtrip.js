const S=require(require('path').join(__dirname,'..','build','sim.js'));const zlib=require('zlib');
const W=S.createWorld(9);S.seedFirstPop(W);S.choosePlayer(W,S.houseCandidates(W)[0].head);
const run=(W,y)=>{for(let i=0;i<52*y;i++){S.step(W);while(W.pending.length)S.resolve(W,W.pending[0],0);if(W.notices)W.notices.length=0;}};
const stat=W=>`week ${W.week} pop ${W.clans.reduce((s,c)=>s+c.people.length,0)} clans ${W.clans.length} tribes ${W.tribes.length} house ${W.player.house} head ${W.player.head.name} over ${W.player.over} renown ${Math.round(W.player.renown)}`;
for(const Y of [40,110]){run(W,Y===40?40:70);let t0=Date.now();const str=S.saveGame(W);const t1=Date.now();const gz=zlib.gzipSync(str);
console.log('Y'+Y,stat(W));console.log('  save',(str.length/1e6).toFixed(2),'MB json,',(gz.length/1e6).toFixed(2),'MB gzip,',t1-t0,'ms; info',JSON.stringify(S.saveInfo(str)));
t0=Date.now();const W2=S.loadGame(str);console.log('  load',Date.now()-t0,'ms',stat(W2));
const c1=W.player.head.clan,c2=W2.player.head.clan;console.log('  clan same?',c1.name===c2.name,c1.people.length===c2.people.length,'deposits',W.deposits.length===W2.deposits.length,'known',W.player.known.reduce((a,b)=>a+b,0)===W2.player.known.reduce((a,b)=>a+b,0),'acts',S.playerActions(W2).length);
run(W2,25);console.log('  after 25 more years on the loaded world:',stat(W2));
const str2=S.saveGame(W2);const W3=S.loadGame(str2);run(W3,3);console.log('  second generation load ok',stat(W3));}
