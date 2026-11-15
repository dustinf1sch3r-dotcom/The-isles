// unattended play, always answering option 0: prints how many houses ended, how often the clan was dangerously small, world population at the end.
// usage: node balance.js 5,8,11,14 120   (about 25 s per seed per 120 years when the machine is quiet)
const S=require(require('path').join(__dirname,'..','build','sim.js'));let over=0,n=0,low=0,ys=0,ya=0,pops=[],met=[],pop=0,nq=0;const cnt={},end=[];
const seeds=(process.argv[2]||'5,8,11,14').split(',').map(Number),YEARS=+(process.argv[3]||120);
for(const seed of seeds){const W=S.createWorld(seed);S.seedFirstPop(W);const cs=S.houseCandidates(W);S.choosePlayer(W,cs[seed%Math.min(5,cs.length)].head);const P=W.player;let y=1,minN=999,firstMet=null;
for(;y<=YEARS&&!P.over;y++){for(let w=0;w<52;w++){S.step(W);while(W.pending.length){const e=W.pending[0];cnt[e.type]=(cnt[e.type]||0)+1;S.resolve(W,e,0);}if(W.notices){nq+=W.notices.length;W.notices.length=0;}}
 if(P.over||!P.head.alive||!P.head.clan)continue;const c=P.head.clan;minN=Math.min(minN,c.people.length);ya++;if(c.people.length<14)ys++;
 if(firstMet==null&&W.tribes.some(t=>t!==c.tribe&&S.knowsTribe(W,t)&&Math.hypot(S.tribeCenter(t)[0]-c.x,S.tribeCenter(t)[1]-c.y)<160000))firstMet=y;pop++;}
n++;if(P.over){over++;end.push(seed+':Y'+y+' '+(P.hist.slice(-2)[0]||{}).t.slice(0,90));}if(minN<12)low++;met.push(firstMet);pops.push(W.clans.reduce((s,c)=>s+c.people.length,0));}
console.log('house ended',over,'/',n,'| clan fell below 12 in',low,'games | share of years clan<14:',(ys/ya).toFixed(3),'| world pop at end',pops.join(','),'| first known tribe within 160km (year):',met.join(','));
console.log('popups per year',(Object.values(cnt).reduce((a,b)=>a+b,0)/pop).toFixed(2),JSON.stringify(cnt),'notices/yr',(nq/pop).toFixed(2));console.log(end.join('\n'));
