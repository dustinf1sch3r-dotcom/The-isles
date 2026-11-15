// proves two sims give identical worlds: SIM_A=base/sim.js SIM_B=build/sim.js node tools/same.js 5,11,14 [years]
const path=require('path');const A=require(path.resolve(process.env.SIM_A)),B=require(path.resolve(process.env.SIM_B||path.join(__dirname,'..','build','sim.js')));
const seeds=(process.argv[2]||'5,11,14').split(',').map(Number),YEARS=+(process.argv[3]||60);const crypto=require('crypto');
const h=s=>crypto.createHash('sha1').update(s).digest('hex').slice(0,12);
function mk(S,seed){const W=S.createWorld(seed);S.seedFirstPop(W);const cs=S.houseCandidates(W);S.choosePlayer(W,cs[seed%Math.min(5,cs.length)].head);return W;}
function yr(S,W){for(let w=0;w<52;w++){S.step(W);while(W.pending.length)S.resolve(W,W.pending[0],0);}}
if(YEARS<10)console.log('years < 10: nothing is compared (the check runs every 10 years)');
let bad=0;
for(const seed of seeds){const a=mk(A,seed),b=mk(B,seed);
 for(let y=1;y<=YEARS;y++){yr(A,a);yr(B,b);if(y%10===0){const ha=h(A.saveGame(a)),hb=h(B.saveGame(b));console.log('seed',seed,'year',y,ha,hb,ha===hb?'same':'DIFFERENT');if(ha!==hb){bad++;break;}}}}
console.log(bad?'NOT identical':'identical');
