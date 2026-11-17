// proves the world is the same apart from the roads: SIM_A=base/sim.js node tools/same_but_roads.js 5,11,14 [years]
// W.roads, W.roadsVer and the player's fog (P.known, P.knownVer) are swapped for empty stand-ins while each save string is taken, then put back.
// The fog is always left out of the hash. The sentence a trade pact adds about its way depends on the route found, so WAYTXT cuts it out too.
const path=require('path');const A=require(path.resolve(process.env.SIM_A)),B=require(path.resolve(process.env.SIM_B||path.join(__dirname,'..','build','sim.js')));
const seeds=(process.argv[2]||'5,11,14').split(',').map(Number),YEARS=+(process.argv[3]||120);const crypto=require('crypto');
const h=s=>crypto.createHash('sha1').update(s).digest('hex').slice(0,12);
function mk(S,seed){const W=S.createWorld(seed);S.seedFirstPop(W);const cs=S.houseCandidates(W);S.choosePlayer(W,cs[seed%Math.min(5,cs.length)].head);return W;}
function yr(S,W){for(let w=0;w<52;w++){S.step(W);while(W.pending.length)S.resolve(W,W.pending[0],0);}}
// the sentence a pact signing adds about its way depends on the route found (sea or land), so it is a text that may differ: it is left out
const WAYTXT=/ (The sea lies between [^.]*?\.|A way is being trodden between [^.]*?\. Keep the pact[^.]*?\.|No way could be traced between [^.]*?\.|[^.]*? lie too close for a way to show[^.]*?\.)/g;
function snap(S,W){const P=W.player,r=W.roads,v=W.roadsVer,k=P&&P.known,kv=P&&P.knownVer;W.roads=new Map();W.roadsVer=0;if(P){P.known=null;P.knownVer=0;}
 const s=S.saveGame(W).replace(WAYTXT,' <way>');W.roads=r;W.roadsVer=v;if(P){P.known=k;P.knownVer=kv;}return s;}
const fogH=(W)=>{const k=W.player&&W.player.known;return k?h(Buffer.from(k).toString('latin1')):'none';};
let bad=0;
for(const seed of seeds){const a=mk(A,seed),b=mk(B,seed);let fogDiff=0;
 for(let y=1;y<=YEARS;y++){yr(A,a);yr(B,b);if(y%10===0){const ha=h(snap(A,a)),hb=h(snap(B,b)),fa=fogH(a),fb=fogH(b);if(fa!==fb)fogDiff++;
  console.log('seed',seed,'year',y,ha,hb,ha===hb?'same':'DIFFERENT','| fog',fa===fb?'same':'differs');if(ha!==hb){bad++;break;}}}
 if(fogDiff)console.log('seed',seed,'fog differed at',fogDiff,'checks');}
console.log(bad?'NOT identical':'identical (roads and fog left out)');
